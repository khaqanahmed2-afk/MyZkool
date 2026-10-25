/**
 * FeeSettingsPage — Fee & Receipt Settings
 *
 * Professional SaaS Settings module for MyZkool:
 * 1. Compact page header with zero redundant breadcrumbs or oversized banners.
 * 2. 3 Grouped Settings Categories:
 *    - Receipt Design (Receipt Theme, Branding & Signatures, Terms & Footer)
 *    - Billing Configuration (Invoice Numbering, Receipt Rules, Payment Rules)
 *    - Security (Owner PIN)
 * 3. 3 Predefined Receipt Themes with crisp color swatches, descriptive notes, and compact visual thumbnails.
 * 4. School Branding (Logo upload/replace/remove, Signatory Name & Designation, transparent PNG signature).
 * 5. Reorderable receipt terms, refund policy note, and computer-generated footer disclaimer.
 * 6. Sequential invoice & receipt numbering rules with live preview badges.
 * 7. Payment collection rules (partial payments, advance credits, auto-allocation, day-close reconciliation).
 * 8. Owner PIN override protection with secure PBKDF2 backend persistence.
 * 9. Standalone "Preview Receipt" action in a separate browser tab (zero permanent preview sidebar!).
 * 10. Single consistent bottom action bar with dirty tracking, reset confirmation, and real persistence.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Save,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  RotateCcw,
  Printer,
  FileText,
  Palette,
  Building2,
  Stamp,
  Sliders,
  ShieldCheck,
  Image as ImageIcon,
  Check,
  CreditCard,
  FileSignature,
  ExternalLink,
} from "lucide-react";
import {
  getFeeSettings,
  updateFeeSettings,
  uploadSchoolSignature,
  uploadSchoolLogo,
  DEFAULT_FEE_SETTINGS,
} from "../../../services/feeSetupService";
import type { FeeSettings, FeeSettingsInput, ReceiptTheme } from "../../../types/fees";
import {
  RECEIPT_THEMES,
  DEFAULT_RECEIPT_TERMS,
} from "../../../lib/receiptTemplate";
import { useAuth } from "../../../hooks/useAuth";

type SettingsGroup = "receipt_design" | "billing_config" | "security";
type SettingsSection = "theme" | "branding" | "terms" | "invoice" | "receipt" | "payment" | "security";

interface ThemeMeta {
  desc: string;
  palette: string[];
}

const THEME_METAS: Record<ReceiptTheme, ThemeMeta> = {
  myzkool_blue: {
    desc: "Crisp corporate blue palette. Authoritative, high-clarity layout standard for CBSE and state-board institutions.",
    palette: ["#2158E0", "#EFF6FF", "#BFDBFE", "#1E293B"],
  },
  mint_pastel: {
    desc: "Soft deep-teal and mint hues. Calm, modern financial aesthetic with high-contrast emphasis on paid amounts.",
    palette: ["#0F766E", "#F0FDF4", "#A7F3D0", "#132E27"],
  },
  lavender_pastel: {
    desc: "Refined purple and lavender tones. Distinguished layout favored by premium academies and private schools.",
    palette: ["#6B21A8", "#FAF5FF", "#DDD6FE", "#26153B"],
  },
};

/**
 * Compact visual receipt thumbnail showing theme styling
 */
function ReceiptMiniThumbnail({ themeKey, isSelected }: { themeKey: ReceiptTheme; isSelected: boolean }) {
  const t = RECEIPT_THEMES[themeKey];
  return (
    <div
      className="w-full h-24 rounded-lg p-2.5 flex flex-col justify-between transition-all border select-none overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: isSelected ? t.primary : "#E2E8F0",
        boxShadow: isSelected ? "0 2px 8px -2px rgba(33, 88, 224, 0.15)" : "0 1px 2px rgba(0, 0, 0, 0.03)",
      }}
    >
      {/* Mini Letterhead Band */}
      <div className="flex items-center gap-2 pb-1.5 border-b" style={{ borderColor: t.accentBorder }}>
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black shrink-0"
          style={{ backgroundColor: t.accentBg, color: t.primary, border: `1px solid ${t.primary}` }}
        >
          S
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: t.primary }} />
          <div className="h-1 w-10 bg-slate-200 rounded-full mt-1" />
        </div>
        <div
          className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0"
          style={{ backgroundColor: t.badgeBg, color: t.badgeText, border: `0.5px solid ${t.accentBorder}` }}
        >
          PAID
        </div>
      </div>

      {/* Mini Metadata & Line Items */}
      <div className="space-y-1 my-auto">
        <div className="flex justify-between items-center text-[7px] text-slate-400">
          <span>RC-2026-001</span>
          <span>Class 10-A</span>
        </div>
        <div
          className="rounded px-1.5 py-1 flex justify-between items-center text-[8px] font-medium"
          style={{ backgroundColor: t.tableHeaderBg }}
        >
          <span className="truncate" style={{ color: t.textDark }}>Tuition Fee</span>
          <span className="font-bold shrink-0" style={{ color: t.primary }}>₹12,000</span>
        </div>
      </div>

      {/* Mini Footer Seal & Sign */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[7px]">
        <span className="text-slate-400">Authorized Signatory</span>
        <div className="w-8 h-1 rounded-full" style={{ backgroundColor: t.accentBorder }} />
      </div>
    </div>
  );
}

export default function FeeSettingsPage() {
  const { school: authSchool, schoolId: authSchoolId, loading: authLoading } = useAuth() as any;
  const activeSchoolId = authSchool?.id || authSchoolId || null;

  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Grouped Navigation State
  const [activeGroup, setActiveGroup] = useState<SettingsGroup>("receipt_design");
  const [activeSection, setActiveSection] = useState<SettingsSection>("theme");

  // Form State
  const [theme, setTheme] = useState<ReceiptTheme>("myzkool_blue");
  const [form, setForm] = useState<FeeSettingsInput>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatoryName, setSignatoryName] = useState("Authorized Signatory");
  const [signatoryDesignation, setSignatoryDesignation] = useState("Accounts Officer");
  const [headerTitle, setHeaderTitle] = useState("Official Fee Receipt");
  const [terms, setTerms] = useState<string[]>(DEFAULT_RECEIPT_TERMS);
  const [newTermText, setNewTermText] = useState("");
  const [footerText, setFooterText] = useState("This is a computer generated receipt and does not require a physical signature unless stamped.");
  const [refundNote, setRefundNote] = useState("Refunds are processed in accordance with school management policies and audited ledger reconciliation.");

  // Upload progress & states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Owner PIN State
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Load Settings
  const load = useCallback(async () => {
    if (authLoading) return;
    if (!activeSchoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { settings: s } = await getFeeSettings(activeSchoolId);
      setSettings(s);
      setTheme(s.receipt_theme || "myzkool_blue");
      setLogoUrl(s.logo_url || authSchool?.logo_url || null);
      setSignatureUrl(s.signature_url || null);
      setSignatoryName(s.signatory_name || "Authorized Signatory");
      setSignatoryDesignation(s.signatory_designation || "Accounts Officer");
      setHeaderTitle(s.receipt_header_title || "Official Fee Receipt");
      setTerms(Array.isArray(s.receipt_terms) && s.receipt_terms.length > 0 ? s.receipt_terms : DEFAULT_RECEIPT_TERMS);
      setFooterText(s.receipt_footer ?? DEFAULT_FEE_SETTINGS.receipt_footer ?? "");
      setRefundNote(s.refund_policy_note ?? DEFAULT_FEE_SETTINGS.refund_policy_note ?? "");

      setForm({
        receipt_theme: s.receipt_theme || "myzkool_blue",
        invoice_prefix: s.invoice_prefix || "INV",
        invoice_due_days: s.invoice_due_days ?? 15,
        invoice_notes: s.invoice_notes ?? "Payment due within 15 days of issue.",
        receipt_prefix: s.receipt_prefix || "MZ",
        receipt_paper: s.receipt_paper || "a4",
        receipt_language: s.receipt_language || "en",
        allow_partial: s.allow_partial ?? true,
        min_partial_paise: s.min_partial_paise ?? 0,
        allow_advance: s.allow_advance ?? true,
        allocation_mode: s.allocation_mode || "auto_oldest_first",
        round_to_rupee: s.round_to_rupee ?? true,
        backdate_days_limit: s.backdate_days_limit ?? 0,
        discount_approval_threshold_percent: s.discount_approval_threshold_percent ?? 10,
        auto_assign_fee_on_admission: s.auto_assign_fee_on_admission ?? true,
        auto_late_fee: s.auto_late_fee ?? false,
        cheque_receipt_timing: s.cheque_receipt_timing || "on_receipt",
        parent_pay_enabled: s.parent_pay_enabled ?? false,
        gateway_fee_bearer: s.gateway_fee_bearer || "school",
        auto_print_receipt: s.auto_print_receipt ?? false,
        enable_cash_reconciliation: s.enable_cash_reconciliation ?? true,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load fee & receipt settings.");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, authLoading, authSchool?.logo_url]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived Preview Strings
  const receiptPrefixVal = form.receipt_prefix?.trim() || "MZ";
  const receiptPreviewNo = `${receiptPrefixVal}/2026-27/000124`;
  const invoicePrefixVal = form.invoice_prefix?.trim() || "INV";
  const invoicePreviewNo = `${invoicePrefixVal}-2026-001`;

  // Detect Unsaved Changes (Dirty Tracking)
  const isDirty = useMemo(() => {
    if (!settings) return false;
    if (theme !== (settings.receipt_theme || "myzkool_blue")) return true;
    if (logoUrl !== (settings.logo_url || null)) return true;
    if (signatureUrl !== (settings.signature_url || null)) return true;
    if (signatoryName !== (settings.signatory_name || "Authorized Signatory")) return true;
    if (signatoryDesignation !== (settings.signatory_designation || "Accounts Officer")) return true;
    if (headerTitle !== (settings.receipt_header_title || "Official Fee Receipt")) return true;
    if (footerText !== (settings.receipt_footer ?? "")) return true;
    if (refundNote !== (settings.refund_policy_note ?? "")) return true;
    if (newPin.length > 0) return true;

    // Compare terms arrays
    const initialTerms = Array.isArray(settings.receipt_terms) && settings.receipt_terms.length > 0
      ? settings.receipt_terms
      : DEFAULT_RECEIPT_TERMS;
    if (JSON.stringify(terms) !== JSON.stringify(initialTerms)) return true;

    // Compare form fields
    if ((form.invoice_prefix ?? "INV") !== (settings.invoice_prefix ?? "INV")) return true;
    if ((form.invoice_due_days ?? 15) !== (settings.invoice_due_days ?? 15)) return true;
    if ((form.invoice_notes ?? "") !== (settings.invoice_notes ?? "")) return true;
    if ((form.receipt_prefix ?? "MZ") !== (settings.receipt_prefix ?? "MZ")) return true;
    if ((form.receipt_paper ?? "a4") !== (settings.receipt_paper ?? "a4")) return true;
    if ((form.receipt_language ?? "en") !== (settings.receipt_language ?? "en")) return true;
    if ((form.allow_partial ?? true) !== (settings.allow_partial ?? true)) return true;
    if ((form.min_partial_paise ?? 0) !== (settings.min_partial_paise ?? 0)) return true;
    if ((form.allow_advance ?? true) !== (settings.allow_advance ?? true)) return true;
    if ((form.round_to_rupee ?? true) !== (settings.round_to_rupee ?? true)) return true;
    if ((form.enable_cash_reconciliation ?? true) !== (settings.enable_cash_reconciliation ?? true)) return true;
    if ((form.allocation_mode ?? "auto_oldest_first") !== (settings.allocation_mode ?? "auto_oldest_first")) return true;
    if ((form.cheque_receipt_timing ?? "on_receipt") !== (settings.cheque_receipt_timing ?? "on_receipt")) return true;
    if ((form.discount_approval_threshold_percent ?? 10) !== (settings.discount_approval_threshold_percent ?? 10)) return true;
    if ((form.backdate_days_limit ?? 0) !== (settings.backdate_days_limit ?? 0)) return true;
    if ((form.auto_print_receipt ?? false) !== (settings.auto_print_receipt ?? false)) return true;

    return false;
  }, [settings, theme, logoUrl, signatureUrl, signatoryName, signatoryDesignation, headerTitle, footerText, refundNote, newPin, terms, form]);

  // Open Preview in Separate Tab with Current (including unsaved) Preferences
  const handleOpenPreviewInNewTab = useCallback(() => {
    const previewData = {
      theme,
      logoUrl,
      signatureUrl,
      signatoryName,
      signatoryDesignation,
      headerTitle,
      terms,
      footerText,
      refundNote,
      receiptPrefix: form.receipt_prefix || "MZ",
      receiptPaper: form.receipt_paper || "a4",
      invoicePrefix: form.invoice_prefix || "INV",
      school: {
        name: authSchool?.name || "Khaqan Public School",
        address: authSchool?.address || "124 Knowledge Park, Education District",
        phone: authSchool?.contact_phone || "+91 95559 54854",
        email: authSchool?.official_email || "accounts@myzkool.in",
        affiliation_no: authSchool?.affiliation_board ? `CBSE / ${authSchool.affiliation_board}` : "CBSE / AFF-2026-892",
      },
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem("myzkool_receipt_preview_data", JSON.stringify(previewData));
      localStorage.setItem("myzkool_receipt_preview_data", JSON.stringify(previewData));
    } catch (e) {
      console.warn("Storage quota or access error", e);
    }

    window.open("/admin/fees/receipt-preview", "_blank");
  }, [theme, logoUrl, signatureUrl, signatoryName, signatoryDesignation, headerTitle, terms, footerText, refundNote, form, authSchool]);

  // Handle Logo Upload
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeSchoolId) return;
    setUploadError(null);
    setUploadingLogo(true);
    try {
      const res = await uploadSchoolLogo(activeSchoolId, file);
      if (res.error) {
        setUploadError(res.error);
      } else if (res.url) {
        setLogoUrl(res.url);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  // Handle Signature Upload (PNG transparency enforced)
  async function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeSchoolId) return;
    setUploadError(null);
    setUploadingSignature(true);
    try {
      const res = await uploadSchoolSignature(activeSchoolId, file);
      if (res.error) {
        setUploadError(res.error);
      } else if (res.url) {
        setSignatureUrl(res.url);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload signature image.");
    } finally {
      setUploadingSignature(false);
      e.target.value = "";
    }
  }

  // Terms Operations
  function addTerm() {
    if (!newTermText.trim()) return;
    setTerms([...terms, newTermText.trim()]);
    setNewTermText("");
  }

  function removeTerm(index: number) {
    setTerms(terms.filter((_, i) => i !== index));
  }

  function moveTermUp(index: number) {
    if (index === 0) return;
    const copy = [...terms];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setTerms(copy);
  }

  function moveTermDown(index: number) {
    if (index === terms.length - 1) return;
    const copy = [...terms];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setTerms(copy);
  }

  function updateTerm(index: number, val: string) {
    const copy = [...terms];
    copy[index] = val;
    setTerms(copy);
  }

  // Save Settings
  async function handleSave() {
    if (!activeSchoolId) return;
    setSaving(true);
    setError(null);
    setPinError(null);
    setUploadError(null);
    setSuccess(false);

    try {
      const payload: FeeSettingsInput = {
        ...form,
        receipt_theme: theme,
        logo_url: logoUrl,
        signature_url: signatureUrl,
        signatory_name: signatoryName.trim() || "Authorized Signatory",
        signatory_designation: signatoryDesignation.trim() || "Accounts Officer",
        receipt_header_title: headerTitle.trim() || "Official Fee Receipt",
        receipt_terms: terms,
        receipt_footer: footerText.trim(),
        refund_policy_note: refundNote.trim(),
      };

      if (newPin) {
        if (newPin !== confirmPin) {
          setPinError("PINs do not match.");
          setSaving(false);
          return;
        }
        if (!/^\d{4,8}$/.test(newPin)) {
          setPinError("Owner PIN must be between 4 and 8 digits.");
          setSaving(false);
          return;
        }
        payload.new_pin = newPin;
      }

      const { settings: updated, error: e } = await updateFeeSettings(activeSchoolId, payload);
      if (e) {
        setError(e);
      } else {
        setSuccess(true);
        setNewPin("");
        setConfirmPin("");
        if (updated) setSettings(updated);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  // Reset to Defaults
  function handleResetToDefaults() {
    if (window.confirm("Are you sure you want to reset all receipt formatting and fee preferences to default values? Historical student transactions and recorded receipts will not be modified.")) {
      setTheme("myzkool_blue");
      setTerms(DEFAULT_RECEIPT_TERMS);
      setFooterText(DEFAULT_FEE_SETTINGS.receipt_footer || "");
      setRefundNote(DEFAULT_FEE_SETTINGS.refund_policy_note || "");
      setSignatoryName("Authorized Signatory");
      setSignatoryDesignation("Accounts Officer");
      setHeaderTitle("Official Fee Receipt");
      setForm({
        ...DEFAULT_FEE_SETTINGS,
      });
      setNewPin("");
      setConfirmPin("");
      setPinError(null);
    }
  }

  // Switching navigation group
  function selectGroup(group: SettingsGroup) {
    setActiveGroup(group);
    if (group === "receipt_design") {
      setActiveSection("theme");
    } else if (group === "billing_config") {
      setActiveSection("invoice");
    } else if (group === "security") {
      setActiveSection("security");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] text-gray-500">
        <Loader2 className="w-7 h-7 animate-spin text-[#2158E0] mb-3" />
        <p className="text-xs font-medium">Loading Fee & Receipt Settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-5 px-4 sm:px-6 space-y-5">
      {/* 1. Compact Page Title Area (Oversized header, breadcrumbs, actions dropdown completely removed) */}
      <div className="border-b border-gray-200/80 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight font-display">
            Fee & Receipt Settings
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure school receipts, billing preferences, and payment rules.
          </p>
        </div>

        {/* Quick Preview Action in Header */}
        <button
          type="button"
          onClick={handleOpenPreviewInNewTab}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          title="Open a full-page print preview of the receipt in a separate tab"
        >
          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
          <span>Preview Receipt</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}
      {uploadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 font-medium">{uploadError}</div>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Settings saved successfully. All future receipts and invoices will reflect these preferences.</span>
        </div>
      )}

      {/* 2. Settings Navigation System */}
      <div className="space-y-3">
        {/* Tier 1: Group Selector */}
        <div className="flex items-center gap-1 border-b border-gray-200/90 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => selectGroup("receipt_design")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              activeGroup === "receipt_design"
                ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Receipt Design</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-600 font-medium">3</span>
          </button>

          <button
            type="button"
            onClick={() => selectGroup("billing_config")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              activeGroup === "billing_config"
                ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Billing Configuration</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-600 font-medium">3</span>
          </button>

          <button
            type="button"
            onClick={() => selectGroup("security")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              activeGroup === "security"
                ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security</span>
            {settings?.owner_pin_hash && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Owner PIN active" />
            )}
          </button>
        </div>

        {/* Tier 2: Sub-section Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeGroup === "receipt_design" && (
            <>
              {[
                { id: "theme", label: "Receipt Theme & Appearance", icon: Palette },
                { id: "branding", label: "Branding & Signatures", icon: Building2 },
                { id: "terms", label: "Terms & Footer", icon: FileText },
              ].map((sub) => {
                const Icon = sub.icon;
                const isCurrent = activeSection === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSection(sub.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-gray-900 text-white shadow-2xs"
                        : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {activeGroup === "billing_config" && (
            <>
              {[
                { id: "invoice", label: "Invoice Numbering", icon: Sliders },
                { id: "receipt", label: "Receipt Rules", icon: Stamp },
                { id: "payment", label: "Payment Rules", icon: CreditCard },
              ].map((sub) => {
                const Icon = sub.icon;
                const isCurrent = activeSection === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSection(sub.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-gray-900 text-white shadow-2xs"
                        : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {activeGroup === "security" && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white shadow-2xs cursor-default"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Owner Security PIN</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Settings Content Area (Permanent Side Preview is completely removed!) */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 sm:p-6 shadow-2xs">
        {/* SECTION 1: Receipt Theme & Appearance */}
        {activeSection === "theme" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#2158E0]" />
                  <span>Approved Receipt Themes</span>
                </h3>
                <span className="text-xs text-gray-400">3 Themes Available</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select an official receipt styling theme. Use the Preview button below or at the bottom to verify the template in a new tab.
              </p>
            </div>

            {/* 3 Equal-Width Theme Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(RECEIPT_THEMES) as ReceiptTheme[]).map((tKey) => {
                const t = RECEIPT_THEMES[tKey];
                const meta = THEME_METAS[tKey];
                const isSelected = theme === tKey;

                return (
                  <div
                    key={tKey}
                    onClick={() => setTheme(tKey)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3.5 ${
                      isSelected
                        ? "border-[#2158E0] bg-blue-50/20 shadow-xs ring-2 ring-blue-500/20"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    <div>
                      {/* Top: Swatch & Selection Indicator */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5">
                          {meta.palette.map((color, idx) => (
                            <span
                              key={idx}
                              className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                              style={{ backgroundColor: color }}
                              title={`Color: ${color}`}
                            />
                          ))}
                        </div>

                        {isSelected ? (
                          <span className="w-4 h-4 rounded-full bg-[#2158E0] text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-gray-300" />
                        )}
                      </div>

                      {/* Theme Name & Meaningful Description */}
                      <h4 className="text-xs font-bold text-gray-900">{t.name}</h4>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                        {meta.desc}
                      </p>
                    </div>

                    {/* Compact Receipt-Style Visual Thumbnail */}
                    <div className="pt-2 border-t border-gray-100">
                      <ReceiptMiniThumbnail themeKey={tKey} isSelected={isSelected} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Receipt Appearance Controls */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider text-gray-500">
                Receipt Appearance Preferences
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="theme-paper-size" className="block text-xs font-semibold text-gray-700 mb-1">
                    Default Paper Format
                  </label>
                  <select
                    id="theme-paper-size"
                    value={form.receipt_paper ?? "a4"}
                    onChange={(e) => setForm((f) => ({ ...f, receipt_paper: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                  >
                    <option value="a4">A4 (Standard School Sheet 210 × 297 mm)</option>
                    <option value="a5">A5 (Half Sheet 148 × 210 mm)</option>
                    <option value="thermal80">Thermal POS (80 mm Roll)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Sets default layout for student receipts and downloads</p>
                </div>

                <div>
                  <label htmlFor="theme-receipt-title" className="block text-xs font-semibold text-gray-700 mb-1">
                    Receipt Banner Title
                  </label>
                  <input
                    id="theme-receipt-title"
                    type="text"
                    value={headerTitle}
                    onChange={(e) => setHeaderTitle(e.target.value)}
                    placeholder="Official Fee Receipt"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Printed prominently across the top letterhead</p>
                </div>
              </div>

              {/* Informational preview banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between gap-3 text-xs text-[#2158E0]">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2158E0]" />
                  <span className="truncate">
                    Current active theme: <strong>{RECEIPT_THEMES[theme]?.name}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPreviewInNewTab}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 text-[#2158E0] hover:bg-blue-50 rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Receipt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Branding & Signatures */}
        {activeSection === "branding" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2158E0]" />
                <span>School Branding & Signatures</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure school logo, signatory details, and upload transparent signature files for automated receipt stamping.
              </p>
            </div>

            {/* School Profile Information (Read-Only context verification) */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">School Profile Letterhead</span>
                <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">From School Settings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400 text-[11px] block">Official Name</span>
                  <span className="font-semibold text-gray-900">{authSchool?.name || "Khaqan Public School"}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Affiliation Board / Reg. No.</span>
                  <span>{authSchool?.affiliation_board ? `CBSE / ${authSchool.affiliation_board}` : "CBSE / AFF-2026-892"}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Official Email</span>
                  <span>{authSchool?.official_email || "accounts@myzkool.in"}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Contact Phone</span>
                  <span>{authSchool?.contact_phone || "+91 95559 54854"}</span>
                </div>
              </div>
            </div>

            {/* Logo Card */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Official School Logo</h4>
                  <p className="text-[11px] text-gray-500">Printed in letterhead header (PNG, JPG, or WebP up to 3MB)</p>
                </div>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer">
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>{logoUrl ? "Replace Logo" : "Upload School Logo"}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Square or horizontal aspect ratio with clean background is recommended.
                  </p>
                </div>
              </div>
            </div>

            {/* Authorized Signature Card */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-blue-600" />
                    <span>Authorized Signatory Signature</span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Upload transparent PNG signature to auto-stamp on official fee receipts
                  </p>
                </div>
                {signatureUrl && (
                  <button
                    type="button"
                    onClick={() => setSignatureUrl(null)}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-28 h-16 rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center overflow-hidden shrink-0 p-1 shadow-2xs">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Signature Preview" className="max-h-14 max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-gray-400 italic text-center px-1">No Signature Uploaded</span>
                  )}
                </div>

                <div className="flex-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer">
                    {uploadingSignature ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading PNG…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>{signatureUrl ? "Replace Signature PNG" : "Upload PNG Signature"}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={handleSignatureUpload}
                      disabled={uploadingSignature}
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Must be transparent PNG file (max 2 MB). If omitted, a clean placeholder line is rendered.
                  </p>
                </div>
              </div>
            </div>

            {/* Signatory Name & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="signatory-name-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Signatory Name
                </label>
                <input
                  id="signatory-name-input"
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="e.g. Dr. Anand Sharma"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Printed below the signature block</p>
              </div>

              <div>
                <label htmlFor="signatory-desig-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Signatory Designation
                </label>
                <input
                  id="signatory-desig-input"
                  type="text"
                  value={signatoryDesignation}
                  onChange={(e) => setSignatoryDesignation(e.target.value)}
                  placeholder="e.g. Principal / Accounts Officer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Official title or office designation</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Terms & Footer */}
        {activeSection === "terms" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2158E0]" />
                  <span>Terms, Notes, and Legal Disclaimer</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Manage standard school receipt terms, refund conditions, and legal disclaimer text.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTerms(DEFAULT_RECEIPT_TERMS)}
                className="text-xs text-[#2158E0] hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Terms</span>
              </button>
            </div>

            {/* Terms Reorderable List */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">Receipt Terms & Conditions</label>
              {terms.map((term, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg group hover:bg-white transition-colors"
                >
                  <span className="w-5 text-center text-xs font-bold text-gray-400 shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => updateTerm(idx, e.target.value)}
                    className="flex-1 bg-transparent text-xs text-gray-800 outline-none"
                  />
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveTermUp(idx)}
                      disabled={idx === 0}
                      title="Move Up"
                      className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTermDown(idx)}
                      disabled={idx === terms.length - 1}
                      title="Move Down"
                      className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTerm(idx)}
                      title="Delete Term"
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Term Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newTermText}
                  onChange={(e) => setNewTermText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTerm();
                    }
                  }}
                  placeholder="Type new term and click Add..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                />
                <button
                  type="button"
                  onClick={addTerm}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 cursor-pointer shadow-2xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Term</span>
                </button>
              </div>
            </div>

            {/* Refund Policy Note */}
            <div>
              <label htmlFor="refund-note-textarea" className="block text-xs font-semibold text-gray-700 mb-1">
                Refund Policy Informational Text
              </label>
              <textarea
                id="refund-note-textarea"
                rows={2}
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="e.g. Refunds are processed in accordance with school policies..."
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Printed below the terms list on receipts</p>
            </div>

            {/* Computer Generated Legal Footer Disclaimer */}
            <div>
              <label htmlFor="footer-legal-textarea" className="block text-xs font-semibold text-gray-700 mb-1">
                Computer-Generated Legal Disclaimer Footer
              </label>
              <textarea
                id="footer-legal-textarea"
                rows={2}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g. This is a computer generated receipt..."
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Printed at the very bottom of every receipt</p>
            </div>
          </div>
        )}

        {/* SECTION 4: Invoice Numbering */}
        {activeSection === "invoice" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#2158E0]" />
                <span>Invoice Numbering & Due Windows</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Set unique invoice prefixes and default payment due days for term billings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-prefix-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Invoice Prefix
                </label>
                <input
                  id="inv-prefix-input"
                  type="text"
                  maxLength={8}
                  value={form.invoice_prefix ?? "INV"}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_prefix: e.target.value.toUpperCase() }))}
                  placeholder="INV"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none uppercase font-semibold"
                />
                <p className="text-[10px] text-gray-400 mt-1">Up to 8 alphanumeric characters</p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1">Next Invoice Number Preview</span>
                <div className="border border-blue-200 bg-blue-50/50 rounded-lg px-3 py-2 text-xs text-[#2158E0] font-mono font-bold">
                  {invoicePreviewNo}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-due-days-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Default Due Window (Days)
                </label>
                <input
                  id="inv-due-days-input"
                  type="number"
                  min={1}
                  max={90}
                  value={form.invoice_due_days ?? 15}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_due_days: Number(e.target.value) || 15 }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Days before an issued term invoice is marked overdue</p>
              </div>

              <div>
                <label htmlFor="inv-notes-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Default Invoice Footer Notes
                </label>
                <input
                  id="inv-notes-input"
                  type="text"
                  value={form.invoice_notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_notes: e.target.value }))}
                  placeholder="e.g. Payment due within 15 days of issue"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Printed on student dues bills and invoices</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: Receipt Rules */}
        {activeSection === "receipt" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Stamp className="w-4 h-4 text-[#2158E0]" />
                <span>Receipt Numbering & Print Layout</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure gap-free sequential receipt numbering, default paper sizes, and print triggers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rec-prefix-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Receipt Prefix
                </label>
                <input
                  id="rec-prefix-input"
                  type="text"
                  maxLength={6}
                  value={form.receipt_prefix ?? "MZ"}
                  onChange={(e) => setForm((f) => ({ ...f, receipt_prefix: e.target.value.toUpperCase() }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none font-semibold uppercase"
                />
                <p className="text-[10px] text-gray-400 mt-1">Prefix for all fee collection receipts</p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1">Receipt Number Preview</span>
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg px-3 py-2 text-xs text-emerald-800 font-mono font-bold">
                  {receiptPreviewNo}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rec-paper-select" className="block text-xs font-semibold text-gray-700 mb-1">
                  Default Paper Format
                </label>
                <select
                  id="rec-paper-select"
                  value={form.receipt_paper ?? "a4"}
                  onChange={(e) => setForm((f) => ({ ...f, receipt_paper: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                >
                  <option value="a4">A4 (Standard School 210 × 297 mm)</option>
                  <option value="a5">A5 (Half Sheet 148 × 210 mm)</option>
                  <option value="thermal80">Thermal POS (80 mm roll)</option>
                </select>
              </div>

              <div>
                <label htmlFor="rec-lang-select" className="block text-xs font-semibold text-gray-700 mb-1">
                  Language Format
                </label>
                <select
                  id="rec-lang-select"
                  value={form.receipt_language ?? "en"}
                  onChange={(e) => setForm((f) => ({ ...f, receipt_language: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                >
                  <option value="en">English (Default)</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="both">Bilingual (English + Hindi)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={form.auto_print_receipt ?? false}
                onChange={(e) => setForm((f) => ({ ...f, auto_print_receipt: e.target.checked }))}
                className="w-4 h-4 accent-[#2158E0]"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 block">Auto-print receipt after collection</span>
                <p className="text-[11px] text-gray-500">Automatically trigger browser print dialog right after fee collection</p>
              </div>
            </label>
          </div>
        )}

        {/* SECTION 6: Payment Rules */}
        {activeSection === "payment" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2158E0]" />
                <span>Payment & Collection Preferences</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure partial payments, advance credits, daily cash close rules, and allocation policies.
              </p>
            </div>

            {/* Partial Payments */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allow_partial ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, allow_partial: e.target.checked }))}
                  className="w-4 h-4 accent-[#2158E0]"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Allow partial fee collections</span>
                  <p className="text-[11px] text-gray-500">Parents can pay in installments against open invoice dues</p>
                </div>
              </label>

              {form.allow_partial && (
                <div className="pl-7">
                  <label htmlFor="min-partial-input" className="block text-xs font-medium text-gray-700 mb-1">
                    Minimum partial payment (₹, 0 = no minimum)
                  </label>
                  <input
                    id="min-partial-input"
                    type="number"
                    min={0}
                    value={Number.isNaN(form.min_partial_paise) ? "" : (form.min_partial_paise ?? 0) / 100}
                    onChange={(e) => {
                      const val = e.currentTarget.valueAsNumber;
                      setForm((f) => ({ ...f, min_partial_paise: Number.isFinite(val) ? val * 100 : 0 }));
                    }}
                    className="w-full sm:w-64 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                  />
                </div>
              )}
            </div>

            {/* Advance Payments & Rupee Rounding */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allow_advance ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, allow_advance: e.target.checked }))}
                  className="w-4 h-4 accent-[#2158E0]"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Allow advance payments</span>
                  <p className="text-[11px] text-gray-500">Excess collections are stored as student credit balance</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.round_to_rupee ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, round_to_rupee: e.target.checked }))}
                  className="w-4 h-4 accent-[#2158E0]"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Round concessions & late fees to nearest Rupee</span>
                  <p className="text-[11px] text-gray-500">Eliminates paise fractions from ledger calculations</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enable_cash_reconciliation ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, enable_cash_reconciliation: e.target.checked }))}
                  className="w-4 h-4 accent-[#2158E0]"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Enforce daily cash close & reconciliation</span>
                  <p className="text-[11px] text-gray-500">Requires daily cash drawer closing before subsequent sessions</p>
                </div>
              </label>
            </div>

            {/* Allocation Mode & Cheque Timing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="alloc-mode-select" className="block text-xs font-semibold text-gray-700 mb-1">
                  Dues Allocation Mode
                </label>
                <select
                  id="alloc-mode-select"
                  value={form.allocation_mode ?? "auto_oldest_first"}
                  onChange={(e) => setForm((f) => ({ ...f, allocation_mode: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                >
                  <option value="auto_oldest_first">Auto — Oldest dues first (Recommended)</option>
                  <option value="manual">Manual — Cashier selects dues explicitly</option>
                </select>
              </div>

              <div>
                <label htmlFor="cheque-timing-select" className="block text-xs font-semibold text-gray-700 mb-1">
                  Cheque Receipt Timing
                </label>
                <select
                  id="cheque-timing-select"
                  value={form.cheque_receipt_timing ?? "on_receipt"}
                  onChange={(e) => setForm((f) => ({ ...f, cheque_receipt_timing: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                >
                  <option value="on_receipt">On receipt (Instrument received at desk)</option>
                  <option value="on_clearance">On clearance (Bank clearing confirmation)</option>
                </select>
              </div>
            </div>

            {/* Concession Approval Threshold & Backdating */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="disc-thresh-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Concession Approval Threshold (%)
                </label>
                <input
                  id="disc-thresh-input"
                  type="number"
                  min={0}
                  max={100}
                  value={Number.isNaN(form.discount_approval_threshold_percent) ? "" : (form.discount_approval_threshold_percent ?? 10)}
                  onChange={(e) => {
                    const val = e.currentTarget.valueAsNumber;
                    setForm((f) => ({ ...f, discount_approval_threshold_percent: Number.isFinite(val) ? val : 0 }));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Concessions above this % require owner approval</p>
              </div>

              <div>
                <label htmlFor="backdate-limit-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Backdate Days Limit
                </label>
                <input
                  id="backdate-limit-input"
                  type="number"
                  min={0}
                  value={Number.isNaN(form.backdate_days_limit) ? "" : (form.backdate_days_limit ?? 0)}
                  onChange={(e) => {
                    const val = e.currentTarget.valueAsNumber;
                    setForm((f) => ({ ...f, backdate_days_limit: Number.isFinite(val) ? Math.trunc(val) : 0 }));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">0 = requires owner PIN override for each case</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: Owner Security PIN */}
        {activeSection === "security" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2158E0]" />
                  <span>Owner Security PIN</span>
                </h3>
                {settings?.owner_pin_hash ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PIN Active & Protected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    No PIN Set
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The Owner PIN authorizes high concessions, counter fee waivers, and backdated receipt entries without logging out cashiers.
              </p>
            </div>

            {pinError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
                {pinError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label htmlFor="owner-pin-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  {settings?.owner_pin_hash ? "New Security PIN" : "Set Security PIN"}
                </label>
                <input
                  id="owner-pin-input"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="4–8 numeric digits"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2.5 top-7 text-gray-400 hover:text-gray-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <p className="text-[10px] text-gray-400 mt-1">Leave blank to keep existing PIN</p>
              </div>

              <div>
                <label htmlFor="owner-pin-confirm" className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm PIN
                </label>
                <input
                  id="owner-pin-confirm"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Re-enter security PIN"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Small, Consistent Bottom Action Bar */}
      <div className="bg-white border border-[#E6EAF3] rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-2xs">
        {/* Reset to Defaults (Secondary Action) */}
        <button
          type="button"
          onClick={handleResetToDefaults}
          className="text-xs text-gray-500 hover:text-red-600 font-semibold cursor-pointer transition-colors"
        >
          Reset to Defaults
        </button>

        {/* Right Actions: Dirty Indicator, Preview Receipt, Save Settings */}
        <div className="flex items-center gap-2.5">
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium mr-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved changes</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleOpenPreviewInNewTab}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer transition-colors"
            title="Open receipt preview in a separate browser tab"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Preview Receipt</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#2158E0] text-white rounded-xl text-xs font-bold hover:bg-[#1A46B8] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm transition-all"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
