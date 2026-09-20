import React, { useEffect, useState, useCallback } from "react";
import { Save, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { getFeeSettings, updateFeeSettings } from "../../../services/feeSetupService";
import type { FeeSettings, FeeSettingsInput } from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";

export default function FeeSettingsPage() {
  const { school } = useAuth() as any;
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FeeSettingsInput>({});
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    const { settings: s } = await getFeeSettings(school.id);
    setSettings(s);
    setForm({
      receipt_prefix: s.receipt_prefix,
      receipt_paper: s.receipt_paper,
      receipt_language: s.receipt_language,
      allow_partial: s.allow_partial,
      min_partial_paise: s.min_partial_paise,
      allow_advance: s.allow_advance,
      allocation_mode: s.allocation_mode,
      round_to_rupee: s.round_to_rupee,
      backdate_days_limit: s.backdate_days_limit,
      discount_approval_threshold_percent: s.discount_approval_threshold_percent,
      auto_assign_fee_on_admission: s.auto_assign_fee_on_admission,
      auto_late_fee: s.auto_late_fee,
      cheque_receipt_timing: s.cheque_receipt_timing,
      parent_pay_enabled: s.parent_pay_enabled,
      gateway_fee_bearer: s.gateway_fee_bearer,
      auto_print_receipt: s.auto_print_receipt,
    });
    setLoading(false);
  }, [school?.id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setPinError(null);
    setSuccess(false);
    const payload: FeeSettingsInput = { ...form };
    if (newPin) {
      if (newPin !== confirmPin) { setPinError("PINs don't match."); setSaving(false); return; }
      if (!/^\d{4,8}$/.test(newPin)) { setPinError("PIN must be 4–8 digits."); setSaving(false); return; }
      payload.new_pin = newPin;
    }
    const { error: e } = await updateFeeSettings(school.id, payload);
    if (e) setError(e);
    else { setSuccess(true); setNewPin(""); setConfirmPin(""); await load(); setTimeout(() => setSuccess(false), 3000); }
    setSaving(false);
  }

  const receiptPreview = `${form.receipt_prefix || "MZ"}/2026-27/000001`;

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-[#5B6478]">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#141A2E]">Receipt & Settings</h1>
          <p className="text-[#5B6478] text-sm mt-0.5">Configure receipt format, payment options, and owner PIN.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-[#2158E0] text-white rounded-lg hover:bg-[#1a46b8] disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">✓ Settings saved successfully.</div>}

      <div className="space-y-6">
        {/* Receipt */}
        <section className="bg-white border border-[#E6EAF3] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#141A2E] border-b border-[#E6EAF3] pb-2 mb-3">Receipt</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#141A2E] mb-1">Receipt Prefix</label>
              <input className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                value={form.receipt_prefix ?? ""} onChange={e => setForm(f => ({ ...f, receipt_prefix: e.target.value.toUpperCase() }))} maxLength={6} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#141A2E] mb-1">Preview</label>
              <div className="border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm text-[#5B6478] bg-gray-50 font-mono">{receiptPreview}</div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#141A2E] mb-1">Paper Size</label>
              <select className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                value={form.receipt_paper ?? "a5"} onChange={e => setForm(f => ({ ...f, receipt_paper: e.target.value as any }))}>
                <option value="a5">A5 (148×210mm)</option>
                <option value="thermal80">Thermal 80mm</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#141A2E] mb-1">Language</label>
              <select className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                value={form.receipt_language ?? "en"} onChange={e => setForm(f => ({ ...f, receipt_language: e.target.value as any }))}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.auto_print_receipt ?? false} onChange={e => setForm(f => ({ ...f, auto_print_receipt: e.target.checked }))} className="w-4 h-4 accent-[#2158E0]" />
            <span className="text-sm text-[#141A2E]">Auto-print receipt after collection</span>
          </label>
        </section>

        {/* Payment */}
        <section className="bg-white border border-[#E6EAF3] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#141A2E] border-b border-[#E6EAF3] pb-2 mb-3">Payment Options</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.allow_partial ?? true} onChange={e => setForm(f => ({ ...f, allow_partial: e.target.checked }))} className="w-4 h-4 accent-[#2158E0]" />
            <span className="text-sm text-[#141A2E]">Allow partial payments</span>
          </label>
          {form.allow_partial && (
            <div>
              <label className="block text-xs font-medium text-[#141A2E] mb-1">Minimum partial payment (₹, 0 = no minimum)</label>
              <input type="number" min={0} className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                value={(form.min_partial_paise ?? 0) / 100} onChange={e => setForm(f => ({ ...f, min_partial_paise: (parseFloat(e.target.value) || 0) * 100 }))} />
            </div>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.allow_advance ?? true} onChange={e => setForm(f => ({ ...f, allow_advance: e.target.checked }))} className="w-4 h-4 accent-[#2158E0]" />
            <span className="text-sm text-[#141A2E]">Allow advance payments (excess stored as credit)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.round_to_rupee ?? true} onChange={e => setForm(f => ({ ...f, round_to_rupee: e.target.checked }))} className="w-4 h-4 accent-[#2158E0]" />
            <span className="text-sm text-[#141A2E]">Round concessions and late fees to nearest rupee</span>
          </label>
          <div>
            <label className="block text-xs font-medium text-[#141A2E] mb-1">Allocation mode</label>
            <select className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
              value={form.allocation_mode ?? "auto_oldest_first"} onChange={e => setForm(f => ({ ...f, allocation_mode: e.target.value as any }))}>
              <option value="auto_oldest_first">Auto — oldest dues first (recommended)</option>
              <option value="manual">Manual — counter selects dues explicitly</option>
            </select>
          </div>
        </section>

        {/* Thresholds */}
        <section className="bg-white border border-[#E6EAF3] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#141A2E] border-b border-[#E6EAF3] pb-2 mb-3">Thresholds</h2>
          <div>
            <label className="block text-xs font-medium text-[#141A2E] mb-1">Discount approval threshold (%)</label>
            <input type="number" min={0} max={100} className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
              value={form.discount_approval_threshold_percent ?? 10} onChange={e => setForm(f => ({ ...f, discount_approval_threshold_percent: parseFloat(e.target.value) || 0 }))} />
            <p className="text-xs text-[#5B6478] mt-1">Concessions above this % need owner approval</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#141A2E] mb-1">Backdate limit (days, 0 = owner approval per case)</label>
            <input type="number" min={0} className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
              value={form.backdate_days_limit ?? 0} onChange={e => setForm(f => ({ ...f, backdate_days_limit: parseInt(e.target.value) || 0 }))} />
          </div>
        </section>

        {/* Automation */}
        <section className="bg-white border border-[#E6EAF3] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#141A2E] border-b border-[#E6EAF3] pb-2 mb-3">Automation</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.auto_assign_fee_on_admission ?? true} onChange={e => setForm(f => ({ ...f, auto_assign_fee_on_admission: e.target.checked }))} className="w-4 h-4 accent-[#2158E0]" />
            <div>
              <span className="text-sm text-[#141A2E]">Auto-assign fee structure on admission</span>
              <p className="text-xs text-[#5B6478]">New admissions automatically get dues generated</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.auto_late_fee ?? false} onChange={e => setForm(f => ({ ...f, auto_late_fee: e.target.checked }))} className="w-4 h-4 accent-[#2158E0]" />
            <div>
              <span className="text-sm text-[#141A2E]">Apply late fee automatically (nightly job)</span>
              <p className="text-xs text-[#5B6478]">Off by default — enable only after setting late fee rules</p>
            </div>
          </label>
          <div>
            <label className="block text-xs font-medium text-[#141A2E] mb-1">Cheque receipt timing</label>
            <select className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
              value={form.cheque_receipt_timing ?? "on_receipt"} onChange={e => setForm(f => ({ ...f, cheque_receipt_timing: e.target.value as any }))}>
              <option value="on_receipt">On receipt (before clearance)</option>
              <option value="on_clearance">On clearance</option>
            </select>
          </div>
        </section>

        {/* Owner PIN */}
        <section className="bg-white border border-[#E6EAF3] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#141A2E] border-b border-[#E6EAF3] pb-2 mb-3">Owner PIN</h2>
          <p className="text-xs text-[#5B6478]">
            The owner PIN is used for approvals at the counter without logging in. Enter 4–8 digits.
            {settings?.owner_pin_hash ? " A PIN is currently set." : " No PIN is set yet."}
          </p>
          {pinError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{pinError}</div>}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <label className="block text-xs font-medium text-[#141A2E] mb-1">{settings?.owner_pin_hash ? "New PIN" : "Set PIN"}</label>
              <input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={8}
                className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none pr-10"
                value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="4–8 digits" />
              <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-7 text-gray-400">
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#141A2E] mb-1">Confirm PIN</label>
              <input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={8}
                className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))} placeholder="Repeat PIN" />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-sm px-6 py-2.5 bg-[#2158E0] text-white rounded-lg hover:bg-[#1a46b8] disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}

