import React, { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Loader2, AlertCircle, Tag } from "lucide-react";
import {
  getConcessionRules, createConcessionRule, updateConcessionRule,
} from "../../../services/feeSetupService";
import type { ConcessionRule, ConcessionRuleInput, ConcessionBasis, ConcessionType } from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";

const BASIS_LABELS: Record<ConcessionBasis, string> = {
  sibling: "Sibling",
  staff_ward: "Staff Ward",
  rte: "RTE",
  ews: "EWS",
  merit: "Merit",
  management: "Management",
  other: "Other",
};

const DEFAULT_RULES: Array<Partial<ConcessionRuleInput> & { note: string }> = [
  { name: "Sibling Concession", basis: "sibling", type: "percent", value: 10, sibling_from_rank: 2, auto_apply: false, note: "Second and later children, percent on tuition" },
  { name: "RTE Concession", basis: "rte", type: "percent", value: 100, auto_apply: true, note: "100% on heads flagged RTE waivable, applied automatically" },
  { name: "Staff Ward", basis: "staff_ward", type: "percent", value: 25, auto_apply: false, note: "25% concession for children of staff" },
];

export default function ConcessionRulesPage() {
  const { school: authSchool, schoolId: authSchoolId, loading: authLoading } = useAuth() as any;
  const activeSchoolId = authSchool?.id || authSchoolId || null;
  const school = authSchool || (activeSchoolId ? { id: activeSchoolId } : null);

  const [rules, setRules] = useState<ConcessionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDefaults, setShowDefaults] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; rule?: ConcessionRule }>({ open: false });
  const [form, setForm] = useState<ConcessionRuleInput>({
    name: "", basis: "other", type: "percent", value: 0, auto_apply: false, needs_approval: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!activeSchoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { rules: r, error: e } = await getConcessionRules(activeSchoolId);
      setRules(r || []);
      setError(e ?? null);
    } catch (err: any) {
      setError(err.message || "Failed to load concession rules.");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, authLoading]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ name: "", basis: "other", type: "percent", value: 0, auto_apply: false, needs_approval: false });
    setFormError(null);
    setDrawer({ open: true });
  }
  function openEdit(rule: ConcessionRule) {
    setForm({ name: rule.name, basis: rule.basis, type: rule.type, value: rule.value, sibling_from_rank: rule.sibling_from_rank ?? undefined, auto_apply: rule.auto_apply, needs_approval: rule.needs_approval });
    setFormError(null);
    setDrawer({ open: true, rule });
  }

  async function handleSave() {
    if (!form.name.trim() || form.value <= 0) { setFormError("Name and a positive value are required."); return; }
    setSaving(true);
    if (drawer.rule) {
      const { error: e } = await updateConcessionRule(school.id, drawer.rule.id, form);
      if (e) { setFormError(e); setSaving(false); return; }
    } else {
      const { error: e } = await createConcessionRule(school.id, form);
      if (e) { setFormError(e); setSaving(false); return; }
    }
    await load();
    setSaving(false);
    setDrawer({ open: false });
  }

  async function addDefaults(idx: number) {
    setSaving(true);
    const r = DEFAULT_RULES[idx];
    await createConcessionRule(school.id, {
      name: r.name!, basis: r.basis!, type: r.type!, value: r.value!,
      sibling_from_rank: r.sibling_from_rank, auto_apply: r.auto_apply ?? false,
    });
    await load();
    setSaving(false);
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <FeeNavHeader
        title="Discounts & Concessions"
        subtitle="Sibling, RTE, staff-ward, merit, and category concessions."
        action={
          <div className="flex gap-2">
            {rules.length === 0 && (
              <button
                onClick={() => setShowDefaults(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E6EAF3] bg-white rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Defaults</span>
              </button>
            )}
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rule</span>
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#5B6478]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{error}</div>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-[#E6EAF3] rounded-xl py-16 text-center">
          <Tag className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-[#141A2E] font-medium mb-1">No concession rules yet</p>
          <p className="text-[#5B6478] text-sm mb-4">Add defaults to get started quickly</p>
          <button onClick={() => setShowDefaults(true)} className="px-6 py-2.5 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1a46b8]">
            Add Default Rules
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E6EAF3] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6EAF3] bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs text-[#5B6478] font-medium">Name</th>
                <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Basis</th>
                <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Discount</th>
                <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">Auto-apply</th>
                <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">Needs approval</th>
                <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">Active</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-[#141A2E]">{rule.name}</td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {BASIS_LABELS[rule.basis]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#141A2E]">
                    {rule.type === "percent" ? `${rule.value}%` : `₹${rule.value / 100}`}
                    {rule.sibling_from_rank ? ` (from rank ${rule.sibling_from_rank})` : ""}
                  </td>
                  <td className="px-3 py-3 text-center">{rule.auto_apply ? "✓" : "—"}</td>
                  <td className="px-3 py-3 text-center">{rule.needs_approval ? "✓" : "—"}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${rule.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => openEdit(rule)} className="p-1.5 text-[#5B6478] hover:text-[#2158E0] rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Drawer */}
      {drawer.open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawer({ open: false })} />
          <div className="w-96 bg-white h-full shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-[#E6EAF3]">
              <h2 className="text-base font-bold text-[#141A2E]">{drawer.rule ? "Edit Rule" : "Add Concession Rule"}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formError}</div>}
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Name *</label>
                <input className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Basis</label>
                <select className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={form.basis} onChange={e => setForm(f => ({ ...f, basis: e.target.value as ConcessionBasis }))}>
                  {Object.entries(BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#141A2E] mb-1">Type</label>
                  <select className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                    value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ConcessionType }))}>
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-[#141A2E] mb-1">Value *</label>
                  <input type="number" min={0} className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                    value={form.value} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              {form.basis === "sibling" && (
                <div>
                  <label className="block text-xs font-medium text-[#141A2E] mb-1">Apply from sibling rank</label>
                  <input type="number" min={1} className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                    value={form.sibling_from_rank ?? 2} onChange={e => setForm(f => ({ ...f, sibling_from_rank: parseInt(e.target.value) || 2 }))} />
                  <p className="text-xs text-[#5B6478] mt-1">e.g. 2 = second and later children get the concession</p>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.auto_apply ?? false} onChange={e => setForm(f => ({ ...f, auto_apply: e.target.checked }))} className="w-4 h-4 accent-[#2158E0]" />
                <span className="text-sm text-[#141A2E]">Apply automatically</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.needs_approval ?? false} onChange={e => setForm(f => ({ ...f, needs_approval: e.target.checked }))} className="w-4 h-4 accent-[#2158E0]" />
                <span className="text-sm text-[#141A2E]">Needs owner approval</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-[#E6EAF3] flex gap-3">
              <button onClick={() => setDrawer({ open: false })} className="flex-1 px-4 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478]">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defaults modal */}
      {showDefaults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-[#E6EAF3]">
              <h2 className="text-base font-bold text-[#141A2E]">Default Concession Rules</h2>
              <p className="text-xs text-[#5B6478] mt-0.5">All are off until you turn them on</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              {DEFAULT_RULES.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[#E6EAF3]">
                  <div>
                    <p className="text-sm font-medium text-[#141A2E]">{r.name}</p>
                    <p className="text-xs text-[#5B6478] mt-0.5">{r.note}</p>
                  </div>
                  <button onClick={() => addDefaults(i)} disabled={saving}
                    className="shrink-0 px-3 py-1.5 text-xs bg-[#2158E0] text-white rounded-lg hover:bg-[#1a46b8] disabled:opacity-60">
                    Add
                  </button>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-[#E6EAF3]">
              <button onClick={() => setShowDefaults(false)} className="w-full px-4 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

