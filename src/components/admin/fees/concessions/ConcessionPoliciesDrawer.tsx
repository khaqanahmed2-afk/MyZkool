import React, { useState } from "react";
import {
  X,
  Plus,
  Edit2,
  Sliders,
  Check,
  AlertCircle,
  Tag,
  Loader2,
  Percent,
} from "lucide-react";
import type {
  ConcessionRule,
  ConcessionRuleInput,
  ConcessionBasis,
  FeeHead,
} from "../../../../types/fees";
import {
  createConcessionRule,
  updateConcessionRule,
} from "../../../../services/feeSetupService";

interface ConcessionPoliciesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rules: ConcessionRule[];
  feeHeads: FeeHead[];
  schoolId: string;
  onRefresh: () => Promise<void>;
}

const BASIS_LABELS: Record<ConcessionBasis, string> = {
  sibling: "Sibling Discount",
  staff_ward: "Staff Ward",
  rte: "RTE Waived",
  ews: "EWS Concession",
  merit: "Merit Scholarship",
  management: "Management Quota",
  other: "Other Policy",
};

export function ConcessionPoliciesDrawer({
  isOpen,
  onClose,
  rules,
  feeHeads,
  schoolId,
  onRefresh,
}: ConcessionPoliciesDrawerProps) {
  const [formMode, setFormMode] = useState<"list" | "create" | "edit">("list");
  const [selectedRule, setSelectedRule] = useState<ConcessionRule | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [basis, setBasis] = useState<ConcessionBasis>("sibling");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState(10);
  const [feeHeadIds, setFeeHeadIds] = useState<string[]>([]);
  const [autoApply, setAutoApply] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const openCreate = () => {
    setName("");
    setBasis("sibling");
    setType("percent");
    setValue(10);
    setFeeHeadIds([]);
    setAutoApply(false);
    setNeedsApproval(false);
    setIsActive(true);
    setSelectedRule(null);
    setErrorMsg(null);
    setFormMode("create");
  };

  const openEdit = (rule: ConcessionRule) => {
    setName(rule.name);
    setBasis(rule.basis);
    setType(rule.type);
    setValue(rule.value);
    setFeeHeadIds(rule.fee_head_ids || []);
    setAutoApply(rule.auto_apply);
    setNeedsApproval(rule.needs_approval);
    setIsActive(rule.is_active);
    setSelectedRule(rule);
    setErrorMsg(null);
    setFormMode("edit");
  };

  const handleToggleHead = (headId: string) => {
    setFeeHeadIds((prev) =>
      prev.includes(headId) ? prev.filter((id) => id !== headId) : [...prev, headId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg("Policy name is required.");
      return;
    }
    if (value <= 0) {
      setErrorMsg("Discount value must be greater than zero.");
      return;
    }
    if (type === "percent" && value > 100) {
      setErrorMsg("Percentage discount cannot exceed 100%.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const input: ConcessionRuleInput = {
      name,
      basis,
      type,
      value,
      fee_head_ids: feeHeadIds,
      auto_apply: autoApply,
      needs_approval: needsApproval,
    };

    if (formMode === "edit" && selectedRule) {
      const res = await updateConcessionRule(schoolId, selectedRule.id, {
        ...input,
        is_active: isActive,
      } as any);
      if (res.error) {
        setErrorMsg(res.error);
        setSaving(false);
        return;
      }
    } else {
      const res = await createConcessionRule(schoolId, input);
      if (res.error) {
        setErrorMsg(res.error);
        setSaving(false);
        return;
      }
    }

    await onRefresh();
    setSaving(false);
    setFormMode("list");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6EAF3]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#00875A]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Concession Policies</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard reusable discount rules & eligibility
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {formMode === "list" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Configured Policies ({rules.length})
                </span>
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00875A] text-white rounded-lg text-xs font-semibold hover:bg-[#007048] transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Policy</span>
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No concession policies yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                    Define standard discount rules to simplify student concession assignment.
                  </p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="px-4 py-1.5 bg-[#00875A] text-white rounded-lg text-xs font-semibold"
                  >
                    Create First Policy
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 bg-white border border-[#E6EAF3] rounded-xl hover:border-slate-300 transition-colors shadow-2xs flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rule.is_active ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                            {BASIS_LABELS[rule.basis] || rule.basis}
                          </span>
                          <span className="font-bold text-slate-900">
                            {rule.type === "percent" ? `${rule.value}%` : `₹${rule.value}`}
                          </span>
                          {rule.needs_approval && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold">
                              Needs Approval
                            </span>
                          )}
                          {rule.auto_apply && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                              Auto-Apply
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEdit(rule)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Create / Edit Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900">
                  {formMode === "edit" ? "Edit Policy" : "New Concession Policy"}
                </h3>
                <button
                  type="button"
                  onClick={() => setFormMode("list")}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Policy Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sibling Concession, Merit Scholarship"
                  className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg text-xs focus:outline-none focus:border-[#00875A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Category</label>
                  <select
                    value={basis}
                    onChange={(e) => setBasis(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg text-xs focus:outline-none focus:border-[#00875A]"
                  >
                    <option value="sibling">Sibling Discount</option>
                    <option value="merit">Merit Scholarship</option>
                    <option value="staff_ward">Staff Ward</option>
                    <option value="financial_aid">Financial Aid</option>
                    <option value="management">Management</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg text-xs focus:outline-none focus:border-[#00875A]"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Discount Value *</label>
                <input
                  type="number"
                  min="1"
                  max={type === "percent" ? 100 : 1000000}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg text-xs focus:outline-none focus:border-[#00875A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Eligible Fee Heads
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-[#E6EAF3] rounded-xl max-h-36 overflow-y-auto">
                  {feeHeads.map((head) => (
                    <label key={head.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feeHeadIds.includes(head.id)}
                        onChange={() => handleToggleHead(head.id)}
                        className="rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 w-3.5 h-3.5"
                      />
                      <span className="truncate">{head.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to apply to all fee heads.</p>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsApproval}
                    onChange={(e) => setNeedsApproval(e.target.checked)}
                    className="rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 w-4 h-4"
                  />
                  <span>Require admin approval before discounts take effect</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApply}
                    onChange={(e) => setAutoApply(e.target.checked)}
                    className="rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 w-4 h-4"
                  />
                  <span>Auto-apply to eligible students during fee generation</span>
                </label>

                {formMode === "edit" && (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 w-4 h-4"
                    />
                    <span>Active policy</span>
                  </label>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormMode("list")}
                  className="px-4 py-2 border border-[#E6EAF3] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-5 py-2 bg-[#00875A] hover:bg-[#007048] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Policy</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
