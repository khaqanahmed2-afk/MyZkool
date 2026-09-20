import React, { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, AlertCircle, Calendar } from "lucide-react";
import {
  getFeeTerms, createFeeTerms, updateFeeTerm, generateTermPreset,
} from "../../../services/feeSetupService";
import type { FeeTerm, FeeTermInput, TermPreset } from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";

const PRESETS: { value: TermPreset; label: string; desc: string }[] = [
  { value: "monthly",     label: "Monthly (12 terms)",   desc: "April through March, due on the 10th" },
  { value: "quarterly",   label: "Quarterly (4 terms)",  desc: "Q1–Q4, due on the 10th of first month" },
  { value: "three_term",  label: "Three Terms",          desc: "Term 1, 2, 3 — roughly 4 months each" },
  { value: "half_yearly", label: "Half-Yearly (2 terms)", desc: "Apr–Sep, Oct–Mar" },
  { value: "yearly",      label: "Annual (1 term)",      desc: "Single annual payment" },
  { value: "custom",      label: "Custom",               desc: "Add terms one by one" },
];

export default function FeeTermsPage() {
  const { school } = useAuth() as any;
  const [terms, setTerms] = useState<FeeTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yearId, setYearId] = useState<string | null>(null);
  const [yearStart, setYearStart] = useState<string>("");
  const [presetMode, setPresetMode] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TermPreset>("quarterly");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    // Get current academic year from localStorage
    const years = typeof localStorage !== "undefined"
      ? JSON.parse(localStorage.getItem(`myzkool_academic_years_${school.id}`) || "[]")
      : [];
    const currentYear = years.find((y: any) => y.is_current);
    if (!currentYear) { setLoading(false); setError("No current academic year found. Please set up academic years first."); return; }
    setYearId(currentYear.id);
    setYearStart(currentYear.start_date || `${currentYear.start_year}-04-01`);
    const { terms: t, error: e } = await getFeeTerms(school.id, currentYear.id);
    setTerms(t);
    setError(e ?? null);
    setLoading(false);
  }, [school?.id]);

  useEffect(() => { load(); }, [load]);

  async function applyPreset() {
    if (!school?.id || !yearId || !yearStart) return;
    setSaving(true);
    const inputs = generateTermPreset(yearId, school.id, selectedPreset, yearStart);
    const { terms: t, error: e } = await createFeeTerms(school.id, yearId, inputs);
    if (e) { setError(e); } else { setTerms(t); }
    setSaving(false);
    setPresetMode(false);
  }

  async function handleInlineEdit(term: FeeTerm, field: keyof FeeTerm, value: string | number) {
    const updated = { ...term, [field]: value };
    setTerms(prev => prev.map(t => t.id === term.id ? updated as FeeTerm : t));
    await updateFeeTerm(school.id, term.id, { [field]: value } as Partial<FeeTermInput>);
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#141A2E]">Fee Terms</h1>
          <p className="text-[#5B6478] text-sm mt-0.5">Payment schedule for the academic year.</p>
        </div>
        {!presetMode && (
          <div className="flex gap-2">
            {terms.length === 0 && (
              <button
                onClick={() => setPresetMode(true)}
                className="flex items-center gap-2 text-sm px-4 py-2 border border-[#E6EAF3] bg-white rounded-lg text-[#5B6478] hover:bg-gray-50"
              >
                <Calendar className="w-4 h-4" /> Choose Preset
              </button>
            )}
            <button
              onClick={async () => {
                if (!yearId) return;
                const t: FeeTermInput = {
                  name: `Term ${terms.length + 1}`, due_date: new Date().toISOString().split("T")[0],
                  late_grace_days: 0, sort_order: terms.length,
                };
                setSaving(true);
                const { terms: newTerms } = await createFeeTerms(school.id, yearId, [t]);
                setTerms(prev => [...prev, ...newTerms]);
                setSaving(false);
              }}
              disabled={saving}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-[#2158E0] text-white rounded-lg hover:bg-[#1a46b8]"
            >
              <Plus className="w-4 h-4" /> Add Term
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#5B6478]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      ) : presetMode ? (
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-6">
          <h2 className="text-base font-semibold text-[#141A2E] mb-4">Choose a payment schedule</h2>
          <div className="space-y-3 mb-6">
            {PRESETS.map(p => (
              <label key={p.value} className="flex items-start gap-3 p-3 rounded-lg border border-[#E6EAF3] cursor-pointer hover:border-[#2158E0]/30 hover:bg-[#F0F5FE]/30">
                <input type="radio" name="preset" value={p.value} checked={selectedPreset === p.value}
                  onChange={() => setSelectedPreset(p.value)} className="mt-0.5 accent-[#2158E0]" />
                <div>
                  <p className="text-sm font-medium text-[#141A2E]">{p.label}</p>
                  <p className="text-xs text-[#5B6478]">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPresetMode(false)} className="flex-1 px-4 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478]">Cancel</button>
            <button
              onClick={applyPreset}
              disabled={saving || selectedPreset === "custom"}
              className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate Terms
            </button>
          </div>
        </div>
      ) : terms.length === 0 ? (
        <div className="bg-white border border-[#E6EAF3] rounded-xl py-16 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-[#141A2E] font-medium mb-1">No terms yet</p>
          <p className="text-[#5B6478] text-sm mb-4">Start with a preset or add terms manually</p>
          <button
            onClick={() => setPresetMode(true)}
            className="px-6 py-2.5 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1a46b8]"
          >
            Choose Preset
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E6EAF3] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6EAF3] bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs text-[#5B6478] font-medium">#</th>
                <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Term Name</th>
                <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Due Date</th>
                <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Grace Days</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term, i) => (
                <tr key={term.id} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-[#5B6478]">{i + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full border border-transparent hover:border-[#E6EAF3] focus:border-[#2158E0] rounded px-2 py-1 text-sm text-[#141A2E] outline-none bg-transparent"
                      value={term.name}
                      onBlur={e => handleInlineEdit(term, "name", e.target.value)}
                      onChange={e => setTerms(prev => prev.map(t => t.id === term.id ? { ...t, name: e.target.value } : t))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      className="border border-transparent hover:border-[#E6EAF3] focus:border-[#2158E0] rounded px-2 py-1 text-sm text-[#141A2E] outline-none bg-transparent"
                      value={term.due_date}
                      onBlur={e => handleInlineEdit(term, "due_date", e.target.value)}
                      onChange={e => setTerms(prev => prev.map(t => t.id === term.id ? { ...t, due_date: e.target.value } : t))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-20 border border-transparent hover:border-[#E6EAF3] focus:border-[#2158E0] rounded px-2 py-1 text-sm text-[#141A2E] outline-none bg-transparent"
                      value={term.late_grace_days}
                      onBlur={e => handleInlineEdit(term, "late_grace_days", parseInt(e.target.value) || 0)}
                      onChange={e => setTerms(prev => prev.map(t => t.id === term.id ? { ...t, late_grace_days: parseInt(e.target.value) || 0 } : t))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

