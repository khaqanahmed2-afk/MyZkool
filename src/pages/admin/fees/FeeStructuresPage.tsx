import React, { useEffect, useState, useCallback, useRef, KeyboardEvent, ClipboardEvent } from "react";
import {
  Plus, Loader2, ChevronDown, Copy, Wand2, CheckCircle2, AlertCircle
} from "lucide-react";
import {
  getFeeStructures, createFeeStructure, updateStructureGrid, getStructureGrid,
  activateStructure, copyStructureToClasses,
} from "../../../services/feeSetupService";
import { getFeeHeads, getFeeTerms } from "../../../services/feeSetupService";
import type { FeeStructure, FeeHead, FeeTerm, FillPattern, StructureAppliesTo } from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";

interface GridCell { headId: string; termId: string; amount: string }

/** Format paise to rupees string for display */
function pToR(paise: number): string {
  return paise === 0 ? "" : String(paise / 100);
}
/** Parse rupee string to paise */
function rToP(v: string): number {
  const n = parseFloat(v.replace(/,/g, ""));
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export default function FeeStructuresPage() {
  const { school, profile } = useAuth() as any;
  const [yearId, setYearId] = useState<string | null>(null);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [terms, setTerms] = useState<FeeTerm[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({}); // headId -> termId -> paise
  const [cellPattern, setCellPattern] = useState<Record<string, FillPattern>>({}); // headId -> pattern
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [showFill, setShowFill] = useState<string | null>(null); // headId
  const [fillAmount, setFillAmount] = useState("");
  const [fillPattern, setFillPattern] = useState<FillPattern>("equal_all_terms");
  const [focusCell, setFocusCell] = useState<{ hi: number; ti: number } | null>(null);
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedStructure = structures.find(s => s.id === selectedStructureId);

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    // Get current academic year
    const years = typeof localStorage !== "undefined"
      ? JSON.parse(localStorage.getItem(`myzkool_academic_years_${school.id}`) || "[]") : [];
    const currentYear = years.find((y: any) => y.is_current);
    if (!currentYear) { setLoading(false); return; }
    setYearId(currentYear.id);

    // Get classes
    const cls = typeof localStorage !== "undefined"
      ? JSON.parse(localStorage.getItem(`myzkool_classes_${school.id}`) || "[]") : [];
    setClasses(cls.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)));

    const [{ heads: h }, { terms: t }, { structures: s }] = await Promise.all([
      getFeeHeads(school.id),
      getFeeTerms(school.id, currentYear.id),
      getFeeStructures(school.id, currentYear.id),
    ]);
    setHeads(h.filter(hd => !hd.is_system));
    setTerms(t);
    setStructures(s);
    if (s.length > 0 && !selectedStructureId) setSelectedStructureId(s[0].id);
    setLoading(false);
  }, [school?.id]);

  useEffect(() => { load(); }, [load]);

  // Load grid when structure changes
  useEffect(() => {
    if (!selectedStructureId || !school?.id) return;
    (async () => {
      const { items, terms: itemTerms } = await getStructureGrid(school.id, selectedStructureId);
      const g: Record<string, Record<string, number>> = {};
      const p: Record<string, FillPattern> = {};
      for (const item of items) {
        g[item.fee_head_id] = {};
        p[item.fee_head_id] = item.pattern;
        for (const it of itemTerms.filter(t => t.item_id === item.id)) {
          g[item.fee_head_id][it.term_id] = it.amount_paise;
        }
      }
      setGrid(g);
      setCellPattern(p);
    })();
  }, [selectedStructureId, school?.id]);

  async function handleCellBlur(headId: string, termId: string, value: string) {
    const paise = rToP(value);
    setGrid(prev => ({ ...prev, [headId]: { ...(prev[headId] ?? {}), [termId]: paise } }));
    if (!selectedStructureId) return;
    setSaving(true);
    const headGrid = { ...grid[headId] ?? {}, [termId]: paise };
    await updateStructureGrid(school.id, {
      structure_id: selectedStructureId,
      fee_head_id: headId,
      pattern: cellPattern[headId] ?? "custom",
      terms: Object.entries(headGrid).map(([tid, amt]) => ({ term_id: tid, amount_paise: amt as number })),
    });
    setSaving(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, hi: number, ti: number) {
    const headCount = heads.length;
    const termCount = terms.length;
    let nhi = hi, nti = ti;
    if (e.key === "ArrowDown") { nhi = Math.min(hi + 1, headCount - 1); }
    else if (e.key === "ArrowUp") { nhi = Math.max(hi - 1, 0); }
    else if (e.key === "ArrowRight" || e.key === "Tab") { nti = ti + 1; if (nti >= termCount) { nti = 0; nhi = Math.min(hi + 1, headCount - 1); } }
    else if (e.key === "ArrowLeft") { nti = Math.max(ti - 1, 0); }
    else if (e.key === "Enter") { nhi = Math.min(hi + 1, headCount - 1); }
    else { return; }
    if (e.key === "Tab") e.preventDefault();
    const key = `${nhi}-${nti}`;
    const ref = cellRefs.current[key];
    if (ref) { ref.focus(); ref.select(); }
  }

  async function handlePaste(e: ClipboardEvent<HTMLInputElement>, hi: number, ti: number) {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const rows = text.split("\n").map(r => r.split("\t"));
    const updates: Array<{ headId: string; termId: string; paise: number }> = [];
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const ni = hi + r, nj = ti + c;
        if (ni >= heads.length || nj >= terms.length) continue;
        const paise = rToP(rows[r][c].trim());
        updates.push({ headId: heads[ni].id, termId: terms[nj].id, paise });
      }
    }
    setGrid(prev => {
      const next = { ...prev };
      for (const u of updates) {
        next[u.headId] = { ...(next[u.headId] ?? {}), [u.termId]: u.paise };
      }
      return next;
    });
    if (!selectedStructureId) return;
    setSaving(true);
    for (const headId of [...new Set(updates.map(u => u.headId))]) {
      const headUpdates = updates.filter(u => u.headId === headId);
      const existing = { ...grid[headId] ?? {} };
      for (const u of headUpdates) existing[u.termId] = u.paise;
      await updateStructureGrid(school.id, {
        structure_id: selectedStructureId, fee_head_id: headId,
        pattern: "custom",
        terms: Object.entries(existing).map(([tid, amt]) => ({ term_id: tid, amount_paise: amt as number })),
      });
    }
    setSaving(false);
  }

  async function applyFill(headId: string) {
    const amount = rToP(fillAmount);
    const newGrid: Record<string, number> = {};
    if (fillPattern === "equal_all_terms") {
      terms.forEach(t => { newGrid[t.id] = amount; });
    } else if (fillPattern === "first_term_only") {
      terms.forEach((t, i) => { newGrid[t.id] = i === 0 ? amount : 0; });
    }
    setGrid(prev => ({ ...prev, [headId]: newGrid }));
    setCellPattern(prev => ({ ...prev, [headId]: fillPattern }));
    if (!selectedStructureId) return;
    setSaving(true);
    await updateStructureGrid(school.id, {
      structure_id: selectedStructureId, fee_head_id: headId, pattern: fillPattern,
      terms: terms.map(t => ({ term_id: t.id, amount_paise: newGrid[t.id] ?? 0 })),
    });
    setSaving(false);
    setShowFill(null);
    setFillAmount("");
  }

  async function handleActivate() {
    if (!selectedStructureId) return;
    setActivating(true);
    const { error: e } = await activateStructure(school.id, selectedStructureId, profile?.id);
    if (e) setError(e);
    else await load();
    setActivating(false);
  }

  async function handleAddStructure() {
    if (!yearId || !classes.length) return;
    const cl = classes[0];
    const { structure } = await createFeeStructure(school.id, {
      class_id: cl.id, name: `${cl.name} Structure`, applies_to: "all", academic_year_id: yearId,
    });
    if (structure) { setStructures(prev => [...prev, structure]); setSelectedStructureId(structure.id); }
  }

  function termTotal(termId: string): number {
    return heads.reduce((sum, h) => sum + (grid[h.id]?.[termId] ?? 0), 0);
  }
  function headTotal(headId: string): number {
    return terms.reduce((sum, t) => sum + (grid[headId]?.[t.id] ?? 0), 0);
  }
  function grandTotal(): number {
    return heads.reduce((sum, h) => sum + headTotal(h.id), 0);
  }

  return (
    <div className="py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#141A2E]">Class Fee Structures</h1>
          <p className="text-[#5B6478] text-sm mt-0.5">Set the amount per head per term for every class.</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-[#5B6478] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>}
          {selectedStructure?.status !== "active" && (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Activate
            </button>
          )}
          {selectedStructure?.status === "active" && (
            <span className="text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              ✓ Active
            </span>
          )}
          <button onClick={handleAddStructure}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-[#2158E0] text-white rounded-lg hover:bg-[#1a46b8]">
            <Plus className="w-4 h-4" /> New Structure
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      <div className="flex gap-4">
        {/* Left: structure list */}
        <div className="w-56 shrink-0 space-y-1">
          {structures.length === 0 && !loading && (
            <p className="text-xs text-[#5B6478] text-center py-6">No structures yet. Click "New Structure" to begin.</p>
          )}
          {structures.map(s => (
            <button key={s.id}
              onClick={() => setSelectedStructureId(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedStructureId === s.id ? "bg-[#2158E0] text-white" : "text-[#5B6478] hover:bg-[#F0F5FE]"}`}
            >
              <div className="font-medium truncate">{s.name}</div>
              <div className={`text-xs mt-0.5 ${selectedStructureId === s.id ? "text-blue-200" : "text-gray-400"}`}>
                {s.applies_to === "all" ? "All students" : s.applies_to === "new_admission" ? "New admissions" : "Existing"} · {s.status}
              </div>
            </button>
          ))}
        </div>

        {/* Right: grid */}
        <div className="flex-1 bg-white border border-[#E6EAF3] rounded-xl overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[#5B6478]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : !selectedStructureId || heads.length === 0 || terms.length === 0 ? (
            <div className="py-16 text-center text-[#5B6478] text-sm">
              {heads.length === 0 && "Add fee heads first."}
              {heads.length > 0 && terms.length === 0 && "Add fee terms first."}
              {heads.length > 0 && terms.length > 0 && !selectedStructureId && "Select or create a structure."}
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs text-[#5B6478] font-medium w-48 min-w-[12rem]">Fee Head</th>
                  {terms.map(t => (
                    <th key={t.id} className="text-right px-3 py-3 text-xs text-[#5B6478] font-medium min-w-[6rem]">
                      <div>{t.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{t.due_date}</div>
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 text-xs text-[#5B6478] font-medium min-w-[6rem]">Total</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {heads.map((head, hi) => (
                  <tr key={head.id} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50/50 group">
                    <td className="px-4 py-2 font-medium text-[#141A2E]">
                      <div>{head.name}</div>
                      <div className="text-xs text-gray-400">{head.code}</div>
                    </td>
                    {terms.map((term, ti) => {
                      const val = grid[head.id]?.[term.id] ?? 0;
                      const key = `${hi}-${ti}`;
                      return (
                        <td key={term.id} className="px-2 py-1">
                          <input
                            ref={el => { cellRefs.current[key] = el; }}
                            type="text"
                            inputMode="decimal"
                            className="w-full text-right border border-transparent hover:border-[#E6EAF3] focus:border-[#2158E0] rounded px-2 py-1.5 text-sm text-[#141A2E] outline-none bg-transparent font-mono"
                            defaultValue={pToR(val)}
                            onBlur={e => handleCellBlur(head.id, term.id, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, hi, ti)}
                            onPaste={e => handlePaste(e, hi, ti)}
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right font-semibold text-[#141A2E] font-mono text-sm">
                      {headTotal(head.id) > 0 ? `₹${(headTotal(head.id) / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-2 py-1">
                      <button
                        onClick={() => { setShowFill(showFill === head.id ? null : head.id); setFillAmount(""); }}
                        className="p-1 text-gray-300 hover:text-[#2158E0] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Fill pattern"
                      >
                        <Wand2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/50 border-t border-[#E6EAF3]">
                  <td className="px-4 py-3 text-xs font-semibold text-[#5B6478]">Term Total</td>
                  {terms.map(t => (
                    <td key={t.id} className="px-3 py-3 text-right text-xs font-semibold text-[#141A2E] font-mono">
                      {termTotal(t.id) > 0 ? `₹${(termTotal(t.id) / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-xs font-bold text-[#2158E0] font-mono">
                    {grandTotal() > 0 ? `₹${(grandTotal() / 100).toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Fill pattern popover */}
      {showFill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-sm font-bold text-[#141A2E] mb-4">Fill Pattern — {heads.find(h => h.id === showFill)?.name}</h3>
            <div className="space-y-2 mb-4">
              {([["equal_all_terms", "Same amount in every term"], ["first_term_only", "First term only, rest ₹0"], ["custom", "Custom (keep existing)"]] as const).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={v} checked={fillPattern === v} onChange={() => setFillPattern(v as FillPattern)} className="accent-[#2158E0]" />
                  <span className="text-sm text-[#141A2E]">{l}</span>
                </label>
              ))}
            </div>
            {fillPattern !== "custom" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Amount (₹)</label>
                <input type="text" className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={fillAmount} onChange={e => setFillAmount(e.target.value)} placeholder="e.g. 1500" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowFill(null)} className="flex-1 px-3 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478]">Cancel</button>
              <button onClick={() => applyFill(showFill)} disabled={fillPattern !== "custom" && !fillAmount}
                className="flex-1 px-3 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium disabled:opacity-60">
                Apply Fill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

