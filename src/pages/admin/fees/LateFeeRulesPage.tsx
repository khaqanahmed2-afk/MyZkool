import React, { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Loader2, AlertCircle, Clock } from "lucide-react";
import {
  getLateFeeRules, createLateFeeRule, describeLateFeeRule,
} from "../../../services/feeSetupService";
import type { LateFeeRule, LateFeeRuleInput, LateFeeMethod } from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";

const METHOD_LABELS: Record<LateFeeMethod, string> = {
  flat_once: "Flat (once)",
  per_day: "Per Day",
  per_week: "Per Week",
  per_month: "Per Month",
  percent_once: "Percent (once)",
};

export default function LateFeeRulesPage() {
  const { school, schoolId, loading: authLoading } = useAuth() as any;
  const activeSchoolId = school?.id || schoolId || null;

  const [rules, setRules] = useState<LateFeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; rule?: LateFeeRule }>({ open: false });
  const [form, setForm] = useState<LateFeeRuleInput>({
    name: "", method: "flat_once", value: 0, grace_days: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!activeSchoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { rules: r, error: e } = await getLateFeeRules(activeSchoolId);
      setRules(r || []);
      setError(e ?? null);
    } catch (err: any) {
      setError(err.message || "Failed to load late fee rules.");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, authLoading]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ name: "", method: "flat_once", value: 0, grace_days: 0 });
    setFormError(null);
    setDrawer({ open: true });
  }

  /** Live preview of a rule */
  function previewRule(f: LateFeeRuleInput): string {
    if (!f.value || f.value <= 0) return "Enter a value to see the description.";
    const dummy: LateFeeRule = {
      id: "x", school_id: "x", name: f.name, fee_head_ids: f.fee_head_ids ?? null,
      method: f.method, value: f.value, grace_days: f.grace_days ?? 0,
      max_cap_paise: f.max_cap_paise ?? null, is_active: true,
      created_at: "", updated_at: "",
    };
    return describeLateFeeRule(dummy);
  }

  async function handleSave() {
    if (!form.name.trim() || form.value <= 0) { setFormError("Name and a positive value are required."); return; }
    setSaving(true);
    if (!activeSchoolId) { setFormError("School ID missing."); setSaving(false); return; }
    const { error: e } = await createLateFeeRule(activeSchoolId, form);
    if (e) { setFormError(e); setSaving(false); return; }
    await load();
    setSaving(false);
    setDrawer({ open: false });
  }

  const preview = previewRule(form);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <FeeNavHeader
        title="Late Fee Rules"
        subtitle="Configure penalties for overdue dues and grace periods."
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#5B6478]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{error}</div>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-[#E6EAF3] rounded-xl py-16 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-[#141A2E] font-medium mb-1">No late fee rules yet</p>
          <p className="text-[#5B6478] text-sm mb-4">Optional — most schools start without late fees</p>
          <button onClick={openAdd} className="px-6 py-2.5 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1a46b8]">Add First Rule</button>
        </div>
      ) : (
        <div className="bg-white border border-[#E6EAF3] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6EAF3] bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs text-[#5B6478] font-medium">Name</th>
                <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Description</th>
                <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">Active</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-[#141A2E]">{rule.name}</td>
                  <td className="px-3 py-3 text-[#5B6478] text-xs">{describeLateFeeRule(rule)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${rule.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  </td>
                  <td className="px-5 py-3">
                    <button className="p-1.5 text-[#5B6478] hover:text-[#2158E0] rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {drawer.open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawer({ open: false })} />
          <div className="w-96 bg-white h-full shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-[#E6EAF3]">
              <h2 className="text-base font-bold text-[#141A2E]">Add Late Fee Rule</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formError}</div>}
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Name *</label>
                <input className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Late Fee" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Method</label>
                <select className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as LateFeeMethod }))}>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#141A2E] mb-1">
                    {form.method === "percent_once" ? "Percent (%)" : "Amount (₹)"} *
                  </label>
                  <input type="number" min={0} step={form.method === "percent_once" ? 0.1 : 1}
                    className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                    value={form.value} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-[#141A2E] mb-1">Grace Days</label>
                  <input type="number" min={0} className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                    value={form.grace_days ?? 0} onChange={e => setForm(f => ({ ...f, grace_days: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Maximum cap (₹, optional)</label>
                <input type="number" min={0} className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={form.max_cap_paise ? form.max_cap_paise / 100 : ""}
                  onChange={e => setForm(f => ({ ...f, max_cap_paise: e.target.value ? parseFloat(e.target.value) * 100 : undefined }))}
                  placeholder="No cap" />
              </div>
              {/* Preview */}
              {form.value > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
                  <span className="font-medium">Preview: </span>{preview}
                </div>
              )}
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
    </div>
  );
}

