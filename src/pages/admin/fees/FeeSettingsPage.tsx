/**
 * InvoiceSettingsPage (FeeSettingsPage) — Production-Grade Invoice & Receipt Settings
 *
 * Implements Desktop-First Document Settings with Three Clean Tabs:
 * 1. Invoice Settings (School header, student & invoice details, fee breakdown, dues, summary, footer, signature, PIN)
 * 2. Payment Receipt Settings (School header, receipt & student info, payment mode, fee allocation, balance, cashier, signatory)
 * 3. Print Settings (A4 / 80mm thermal / A5 paper, themes, font size, margins, orientation, Indian/International formatting)
 *
 * Authoritative School Profile Integration:
 * - Single source of truth from `schools` table / school profile
 * - Edit modal updates centrally with validation
 * - No duplicated school data
 *
 * Live Document Preview:
 * - Live toggle between Invoice and Receipt preview
 * - Live toggle between A4 Sheet and 80 mm Thermal layouts
 * - Sample document switcher + live document selector
 * - Functional Download PDF and Print actions
 * - Unsaved changes warning with discard option
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Save,
  Loader2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Download,
  Printer,
  ChevronDown,
  Info,
  Lock,
  Building,
  Phone,
  Mail,
  MapPin,
  X,
  FileText,
  Receipt,
  RotateCcw,
  Check,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getFeeSettings,
  updateFeeSettings,
  uploadSchoolSignature,
  uploadSchoolLogo,
  DEFAULT_FEE_SETTINGS,
} from "../../../services/feeSetupService";
import { updateCentralSchoolInfo } from "../../../services/schoolService";
import type { FeeSettings, FeeSettingsInput, ReceiptTheme, StudentInvoice } from "../../../types/fees";
import type { FeeReceipt, FeeReceiptItem } from "../../../types/collection";
import {
  generateInvoiceHTML,
  downloadInvoicePDF,
  printInvoiceHTML,
} from "../../../lib/invoiceTemplate";
import {
  generateReceiptA4Html,
  downloadReceiptPDF,
  printReceiptA4,
  RECEIPT_THEMES,
  type ReceiptStudentDetails,
  type ReceiptSchoolDetails,
} from "../../../lib/receiptTemplate";
import { getSchoolInvoices, getInvoiceById } from "../../../services/invoiceService";
import { getReceipts, getReceiptById } from "../../../services/collectionService";

// Built-in realistic sample receipt for instant live preview
const SAMPLE_RECEIPT: FeeReceipt = {
  id: "rcpt-sample-001",
  school_id: "sample-school",
  receipt_no: "RCP-2025-00123",
  receipt_date: "2025-10-15",
  student_id: "std-aarav-sharma",
  academic_year_id: "ay-2025-26",
  total_paise: 1050000, // ₹10,500.00
  status: "active",
  source: "counter",
  payment_group_id: null,
  collected_by: "Mr. R. Verma (Cashier)",
  remarks: "Fee payment for October 2025.",
  idempotency_key: null,
  print_count: 0,
  whatsapp_sent_at: null,
  cancelled_by: null,
  cancelled_at: null,
  cancel_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SAMPLE_RECEIPT_ITEMS: FeeReceiptItem[] = [
  {
    id: "rcpt-item-1",
    receipt_id: "rcpt-sample-001",
    due_id: "due-item-1",
    fee_head_id: "head-tuition",
    fee_head_name: "Tuition Fee",
    amount_paise: 800000,
    gross_paise: 800000,
    concession_paise: 0,
    net_paise: 800000,
    balance_paise: 0,
    term_name: "October 2025",
  } as any,
  {
    id: "rcpt-item-2",
    receipt_id: "rcpt-sample-001",
    due_id: "due-item-2",
    fee_head_id: "head-transport",
    fee_head_name: "Transport Fee",
    amount_paise: 200000,
    gross_paise: 200000,
    concession_paise: 0,
    net_paise: 200000,
    balance_paise: 0,
    term_name: "October 2025",
  } as any,
  {
    id: "rcpt-item-3",
    receipt_id: "rcpt-sample-001",
    due_id: "due-item-3",
    fee_head_id: "head-exam",
    fee_head_name: "Exam Fee",
    amount_paise: 50000,
    gross_paise: 50000,
    concession_paise: 0,
    net_paise: 50000,
    balance_paise: 0,
    term_name: "October 2025",
  } as any,
];

const SAMPLE_STUDENT_DETAILS: ReceiptStudentDetails = {
  student_name: "Aarav Sharma",
  admission_no: "A1234",
  roll_no: "12",
  class_name: "6",
  section_name: "A",
  father_name: "Rajesh Sharma",
  guardian_name: "Rajesh Sharma",
  parent_name: "Rajesh Sharma",
  applicable_month: "October 2025",
  academic_year_label: "2025–2026",
  previous_balance_paise: 500000, // ₹5,000 carried forward
  balance_remaining_paise: 500000, // ₹5,000 remaining
};

export default function FeeSettingsPage() {
  const { school: authSchool, schoolId: authSchoolId } = useAuth() as any;
  const activeSchoolId = authSchool?.id || authSchoolId || "default-school";

  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Settings Category Tabs: 'invoice' | 'receipt' | 'print'
  const [activeSettingsTab, setActiveSettingsTab] = useState<"invoice" | "receipt" | "print">("invoice");

  // Live Preview States
  const [previewDocType, setPreviewDocType] = useState<"invoice" | "receipt">("invoice");
  const [previewPaper, setPreviewPaper] = useState<"a4" | "thermal80">("a4");

  // Invoices for preview selector
  const [invoicesList, setInvoicesList] = useState<StudentInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("sample");
  const [activeInvoice, setActiveInvoice] = useState<StudentInvoice | null>(null);

  // Receipts for preview selector
  const [receiptsList, setReceiptsList] = useState<FeeReceipt[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>("sample");
  const [activeReceipt, setActiveReceipt] = useState<FeeReceipt | null>(SAMPLE_RECEIPT);
  const [activeReceiptItems, setActiveReceiptItems] = useState<FeeReceiptItem[]>(SAMPLE_RECEIPT_ITEMS);

  // Edit School Info Modal State (Central Authoritative Profile)
  const [isEditSchoolModalOpen, setIsEditSchoolModalOpen] = useState(false);
  const [schoolEditForm, setSchoolEditForm] = useState({
    name: authSchool?.name || "Peace Convent School",
    address: authSchool?.address || "Near Main Road, Mawai, Uttar Pradesh - 222001",
    phone: authSchool?.contact_phone || authSchool?.phone || "+91 98765 43210",
    email: authSchool?.official_email || authSchool?.email || "info@peaceconvent.edu.in",
    logo_url: authSchool?.logo_url || null,
  });
  const [savingSchoolInfo, setSavingSchoolInfo] = useState(false);

  // Signature Upload State
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Advanced section collapse
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ownerPin, setOwnerPin] = useState("");

  // Warn before discarding unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  // Load Settings, Invoices and Receipts
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ settings: fetchedSettings }, { invoices }, { receipts }] = await Promise.all([
        getFeeSettings(activeSchoolId),
        getSchoolInvoices(activeSchoolId, { pageSize: 50 }).catch(() => ({ invoices: [] })),
        getReceipts(activeSchoolId).catch(() => ({ receipts: [] })),
      ]);

      const mergedSettings: FeeSettings = {
        ...DEFAULT_FEE_SETTINGS,
        ...fetchedSettings,
        school_id: activeSchoolId,
      };

      setSettings(mergedSettings);
      setInitialSettings(mergedSettings);
      setInvoicesList(invoices || []);
      setReceiptsList(receipts || []);

      if (mergedSettings.receipt_paper === "thermal80") {
        setPreviewPaper("thermal80");
      } else {
        setPreviewPaper("a4");
      }

      // Initialize authoritative school profile form
      setSchoolEditForm({
        name: authSchool?.name || "Peace Convent School",
        address: authSchool?.address || "Near Main Road, Mawai, Uttar Pradesh - 222001",
        phone: authSchool?.contact_phone || authSchool?.phone || "+91 98765 43210",
        email: authSchool?.official_email || authSchool?.email || "info@peaceconvent.edu.in",
        logo_url: authSchool?.logo_url || fetchedSettings.logo_url || null,
      });

      // Load sample or selected invoice
      const sampleRes = await getInvoiceById(activeSchoolId, "sample-invoice");
      setActiveInvoice(sampleRes.invoice);
    } catch (e: any) {
      setError(e.message || "Failed to load fee and document settings");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, authSchool]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle invoice selection change
  const handleSelectInvoice = async (invId: string) => {
    setSelectedInvoiceId(invId);
    if (invId === "sample") {
      const res = await getInvoiceById(activeSchoolId, "sample-invoice");
      setActiveInvoice(res.invoice);
    } else {
      const found = invoicesList.find((i) => i.id === invId);
      if (found) {
        const full = await getInvoiceById(activeSchoolId, found.id);
        setActiveInvoice(full.invoice || found);
      }
    }
  };

  // Handle receipt selection change
  const handleSelectReceipt = async (rcptId: string) => {
    setSelectedReceiptId(rcptId);
    if (rcptId === "sample") {
      setActiveReceipt(SAMPLE_RECEIPT);
      setActiveReceiptItems(SAMPLE_RECEIPT_ITEMS);
    } else {
      const found = receiptsList.find((r) => r.id === rcptId);
      if (found) {
        const full = await getReceiptById(activeSchoolId, found.id);
        setActiveReceipt(full.receipt || found);
        setActiveReceiptItems(full.items || []);
      }
    }
  };

  // Setting updater
  const updateSetting = <K extends keyof FeeSettings>(key: K, value: FeeSettings[K]) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [key]: value };
      setDirty(true);
      return updated;
    });
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (initialSettings) {
      setSettings({ ...initialSettings });
      setDirty(false);
      setOwnerPin("");
      setError(null);
    }
  };

  // Save Settings to Supabase
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const input: FeeSettingsInput = {
        ...settings,
        receipt_paper: previewPaper === "thermal80" ? "thermal80" : (settings.receipt_paper === "thermal80" ? "a4" : settings.receipt_paper),
        new_pin: ownerPin.trim() ? ownerPin.trim() : undefined,
      };

      const res = await updateFeeSettings(activeSchoolId, input);
      if (res.error) {
        setError(res.error);
      } else if (res.settings) {
        setSettings(res.settings);
        setInitialSettings(res.settings);
        setDirty(false);
        setOwnerPin("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (e: any) {
      setError(e.message || "Failed to save settings to database");
    } finally {
      setSaving(false);
    }
  };

  // Signature Upload Handler
  const handleSignatureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSignature(true);
    setError(null);
    try {
      const res = await uploadSchoolSignature(activeSchoolId, file);
      if (res.error) {
        setError(res.error);
      } else if (res.url) {
        updateSetting("signature_url", res.url);
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload signature image.");
    } finally {
      setUploadingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    }
  };

  // Logo Upload in Edit School Modal
  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const res = await uploadSchoolLogo(activeSchoolId, file);
      if (res.error) {
        setError(res.error);
      } else if (res.url) {
        setSchoolEditForm((prev) => ({ ...prev, logo_url: res.url || null }));
        updateSetting("logo_url", res.url);
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload logo.");
    }
  };

  // Save School Info Modal
  const handleSaveSchoolInfo = async () => {
    setSavingSchoolInfo(true);
    setError(null);
    try {
      const res = await updateCentralSchoolInfo(activeSchoolId, schoolEditForm);
      if (res.error) {
        setError(res.error);
      } else {
        updateSetting("logo_url", schoolEditForm.logo_url);
        setIsEditSchoolModalOpen(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update school profile information.");
    } finally {
      setSavingSchoolInfo(false);
    }
  };

  // Authoritative School details for templates
  const schoolBranding = useMemo(() => {
    return {
      name: schoolEditForm.name || authSchool?.name || "PEACE CONVENT SCHOOL",
      address: schoolEditForm.address || authSchool?.address || "Behind Abdul Hameed Memorial Inter College, Mawai, Ayodhya, Uttar Pradesh – 224117, India",
      phone: schoolEditForm.phone || authSchool?.contact_phone || "8400404002",
      email: schoolEditForm.email || authSchool?.official_email || "myzkool.official@gmail.com",
      logo_url: settings?.logo_url || schoolEditForm.logo_url || authSchool?.logo_url || null,
      signature_url: settings?.signature_url || null,
      signatory_name: settings?.signatory_name || "Principal",
      signatory_designation: settings?.signatory_designation || "Principal",
      upi_id: "peaceconvent@upi",
    };
  }, [schoolEditForm, authSchool, settings]);

  // Generated HTML for Live Document Preview
  const previewHTML = useMemo(() => {
    if (!settings) return "";
    const effectivePaper = previewPaper;

    if (previewDocType === "invoice") {
      if (!activeInvoice) return "";
      return generateInvoiceHTML(activeInvoice, schoolBranding, effectivePaper, settings);
    } else {
      // Payment Receipt Preview
      const receiptToRender = activeReceipt || SAMPLE_RECEIPT;
      const receiptItemsToRender = activeReceiptItems.length > 0 ? activeReceiptItems : SAMPLE_RECEIPT_ITEMS;

      const schoolDetailsForReceipt: ReceiptSchoolDetails = {
        name: schoolBranding.name,
        address: schoolBranding.address,
        phone: schoolBranding.phone,
        email: schoolBranding.email,
        logo_url: schoolBranding.logo_url || undefined,
        theme: (settings.receipt_theme || "myzkool_blue") as ReceiptTheme,
        signature_url: settings?.signature_url || schoolBranding.signature_url,
        signatory_name: settings.signatory_name || "Principal",
        signatory_designation: settings.signatory_designation || "Principal",
        terms: settings.receipt_terms,
        footer: settings.receipt_footer,
      };

      const studentDetailsForReceipt: ReceiptStudentDetails = {
        student_name: activeInvoice?.student_name || SAMPLE_STUDENT_DETAILS.student_name,
        admission_no: activeInvoice?.admission_no || SAMPLE_STUDENT_DETAILS.admission_no,
        roll_no: activeInvoice?.roll_no || SAMPLE_STUDENT_DETAILS.roll_no,
        class_name: activeInvoice?.class_name ? `Class ${activeInvoice.class_name}` : SAMPLE_STUDENT_DETAILS.class_name,
        section_name: activeInvoice?.section_name ? `Section ${activeInvoice.section_name}` : SAMPLE_STUDENT_DETAILS.section_name,
        father_name: activeInvoice?.guardian_name || SAMPLE_STUDENT_DETAILS.father_name,
        guardian_name: activeInvoice?.guardian_name || SAMPLE_STUDENT_DETAILS.guardian_name,
        parent_name: activeInvoice?.guardian_name || SAMPLE_STUDENT_DETAILS.parent_name,
        applicable_month: SAMPLE_STUDENT_DETAILS.applicable_month,
        academic_year_label: activeInvoice?.academic_year_name || SAMPLE_STUDENT_DETAILS.academic_year_label,
        previous_balance_paise: activeInvoice?.previous_dues_paise || SAMPLE_STUDENT_DETAILS.previous_balance_paise,
        balance_remaining_paise: activeInvoice?.balance_paise || SAMPLE_STUDENT_DETAILS.balance_remaining_paise,
      };

      const settingsWithPaper: FeeSettings = {
        ...settings,
        receipt_paper: effectivePaper,
      };

      return generateReceiptA4Html(
        receiptToRender,
        receiptItemsToRender,
        studentDetailsForReceipt,
        schoolDetailsForReceipt,
        settingsWithPaper,
        {
          copyType: "student",
          invoiceNo: activeInvoice?.invoice_no || "INV-2025-00123",
          applicableMonth: "October 2025",
          advanceAmountPaise: 0,
          payments: [
            {
              id: "pay-sample-01",
              school_id: activeSchoolId,
              receipt_id: receiptToRender.id,
              mode: "upi",
              amount_paise: receiptToRender.total_paise,
              reference_no: "UPI1234567890",
              bank_name: null,
              instrument_no: null,
              instrument_date: null,
              cheque_status: null,
              gateway_order_id: null,
              gateway_payment_id: null,
              created_at: new Date().toISOString(),
            } as any,
          ],
        }
      );
    }
  }, [
    settings,
    previewDocType,
    previewPaper,
    activeInvoice,
    activeReceipt,
    activeReceiptItems,
    schoolBranding,
  ]);

  // Handle Download PDF
  const handleDownloadPDF = () => {
    if (!previewHTML) return;
    if (previewDocType === "invoice") {
      const docNo = activeInvoice?.invoice_no || "invoice";
      downloadInvoicePDF(docNo, previewHTML);
    } else {
      const docNo = activeReceipt?.receipt_no || "receipt";
      downloadReceiptPDF(docNo, previewHTML);
    }
  };

  // Handle Print
  const handlePrint = () => {
    if (!previewHTML) return;
    if (previewDocType === "invoice") {
      printInvoiceHTML(previewHTML);
    } else {
      printReceiptA4(previewHTML);
    }
  };

  // Scroll to preview on small screens
  const previewRef = useRef<HTMLDivElement>(null);
  const handleScrollToPreview = () => {
    previewRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading && !settings) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading Document Settings...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1640px] mx-auto space-y-6">
      {/* ─── PAGE HEADER & ACTIONS ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoice & Receipt Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure how student invoices and payment receipts look, print, and download.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {dirty && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Unsaved changes
              </span>
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Discard unsaved edits"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Discard</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleScrollToPreview}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer lg:hidden"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Saving Settings..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">Document settings saved successfully to school database!</span>
        </div>
      )}

      {/* ─── AUTHORITATIVE SCHOOL PROFILE BANNER (Central Source of Truth) ──── */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl border border-blue-200 bg-white shadow-xs flex items-center justify-center overflow-hidden shrink-0">
              {schoolBranding.logo_url ? (
                <img
                  src={schoolBranding.logo_url}
                  alt={schoolBranding.name}
                  className="max-h-full max-w-full object-contain p-1"
                />
              ) : (
                <div className="w-full h-full bg-blue-600 text-white font-black text-lg flex items-center justify-center">
                  {(schoolBranding.name || "MZ").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  Authoritative School Profile
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-[11px] text-slate-500 font-medium">Shared across Invoices & Receipts</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 truncate mt-0.5">{schoolBranding.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{schoolBranding.address}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{schoolBranding.phone}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{schoolBranding.email}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditSchoolModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer self-start sm:self-center"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Edit School Profile</span>
          </button>
        </div>
      </div>

      {/* ─── TWO-COLUMN WORKSPACE: SETTINGS TABS (LEFT) & LIVE PREVIEW (RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 3 MAIN SETTINGS TABS (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Document Settings Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setActiveSettingsTab("invoice");
                setPreviewDocType("invoice");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === "invoice"
                  ? "bg-white text-blue-700 shadow-sm shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Invoice Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSettingsTab("receipt");
                setPreviewDocType("receipt");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === "receipt"
                  ? "bg-white text-emerald-700 shadow-sm shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Payment Receipt Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSettingsTab("print")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === "print"
                  ? "bg-white text-purple-700 shadow-sm shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Printer className="w-4 h-4 text-purple-600" />
              <span>Print Settings</span>
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: INVOICE SETTINGS                                                */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {activeSettingsTab === "invoice" && (
            <div className="space-y-4">
              {/* Invoice Section 1: School Header on Invoice */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">School Header on Invoice</h3>
                    <p className="text-[11px] text-slate-500">Configure visibility of official school letterhead elements.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show school logo"
                    checked={settings?.show_school_logo ?? true}
                    onChange={(v) => updateSetting("show_school_logo", v)}
                  />
                  <ToggleRow
                    label="Show school name"
                    checked={settings?.show_school_name ?? true}
                    onChange={(v) => updateSetting("show_school_name", v)}
                  />
                  <ToggleRow
                    label="Show address"
                    checked={settings?.show_address ?? true}
                    onChange={(v) => updateSetting("show_address", v)}
                  />
                  <ToggleRow
                    label="Show phone number"
                    checked={settings?.show_phone ?? true}
                    onChange={(v) => updateSetting("show_phone", v)}
                  />
                  <ToggleRow
                    label="Show email"
                    checked={settings?.show_email ?? true}
                    onChange={(v) => updateSetting("show_email", v)}
                  />
                  <ToggleRow
                    label="Repeat header on multi-page invoices"
                    checked={settings?.repeat_header_on_pages ?? true}
                    onChange={(v) => updateSetting("repeat_header_on_pages", v)}
                  />
                </div>
              </div>

              {/* Invoice Section 2: Student & Invoice Identification */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Student & Invoice Identification</h3>
                    <p className="text-[11px] text-slate-500">Control student identification and billing period fields.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show student details (Name, Class, Adm No)"
                    checked={settings?.show_student_details ?? true}
                    onChange={(v) => updateSetting("show_student_details", v)}
                  />
                  <ToggleRow
                    label="Show parent / guardian name"
                    checked={settings?.show_parent_name ?? true}
                    onChange={(v) => updateSetting("show_parent_name", v)}
                  />
                  <ToggleRow
                    label="Show invoice number & issue date"
                    checked={settings?.show_invoice_number_date ?? true}
                    onChange={(v) => updateSetting("show_invoice_number_date", v)}
                  />
                  <ToggleRow
                    label="Show academic year & billing period"
                    checked={settings?.show_billing_period ?? true}
                    onChange={(v) => updateSetting("show_billing_period", v)}
                  />
                </div>
              </div>

              {/* Invoice Section 3: Fee Breakdown & Concessions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Fee Breakdown & Concessions</h3>
                    <p className="text-[11px] text-slate-500">Itemized table layout and concession displays.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show fee particulars table"
                    checked={settings?.show_fee_breakdown ?? true}
                    onChange={(v) => updateSetting("show_fee_breakdown", v)}
                  />
                  <ToggleRow
                    label="Show line item descriptions"
                    checked={settings?.show_description ?? true}
                    onChange={(v) => updateSetting("show_description", v)}
                  />
                  <ToggleRow
                    label="Show approved concessions"
                    checked={settings?.show_discount ?? true}
                    onChange={(v) => updateSetting("show_discount", v)}
                  />
                  <ToggleRow
                    label="Show concession breakdown details"
                    checked={settings?.show_concession_breakdown ?? true}
                    onChange={(v) => updateSetting("show_concession_breakdown", v)}
                  />
                </div>
              </div>

              {/* Invoice Section 4: Financial Summary & Dues */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Financial Summary & Dues</h3>
                    <p className="text-[11px] text-slate-500">Totals card, previous balance, and overdue highlights.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show Total Fees"
                    checked={settings?.show_total_fee ?? true}
                    onChange={(v) => updateSetting("show_total_fee", v)}
                  />
                  <ToggleRow
                    label="Show Previous Balance (earlier periods)"
                    checked={settings?.show_previous_dues ?? true}
                    onChange={(v) => updateSetting("show_previous_dues", v)}
                  />
                  <ToggleRow
                    label="Show Overdue Amount (informational)"
                    checked={settings?.show_overdues ?? true}
                    onChange={(v) => updateSetting("show_overdues", v)}
                  />
                  <ToggleRow
                    label="Show Amount Received"
                    checked={settings?.show_received_amount ?? true}
                    onChange={(v) => updateSetting("show_received_amount", v)}
                  />
                  <ToggleRow
                    label="Show Balance Due"
                    checked={settings?.show_balance_amount ?? true}
                    onChange={(v) => updateSetting("show_balance_amount", v)}
                  />
                  <ToggleRow
                    label="Show current student account balance"
                    checked={settings?.show_current_student_balance ?? true}
                    onChange={(v) => updateSetting("show_current_student_balance", v)}
                  />
                  <ToggleRow
                    label="Show Amount in Words"
                    checked={settings?.show_amount_in_words ?? true}
                    onChange={(v) => updateSetting("show_amount_in_words", v)}
                  />
                  <ToggleRow
                    label="Show payment mode & scan QR"
                    checked={settings?.show_payment_mode ?? true}
                    onChange={(v) => updateSetting("show_payment_mode", v)}
                  />
                  <ToggleRow
                    label="Show tax / GST details (if configured)"
                    checked={settings?.show_tax_details ?? false}
                    onChange={(v) => updateSetting("show_tax_details", v)}
                  />
                </div>
              </div>

              {/* Invoice Section 5: Footer & Signature */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Footer & Authorized Signature</h3>
                    <p className="text-[11px] text-slate-500">Invoice terms, cashier acknowledgement, and signatory.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <ToggleRow
                      label="Show terms & conditions"
                      checked={settings?.show_terms_and_conditions ?? true}
                      onChange={(v) => updateSetting("show_terms_and_conditions", v)}
                    />
                    <ToggleRow
                      label="Show received by / cashier info"
                      checked={settings?.show_received_by ?? true}
                      onChange={(v) => updateSetting("show_received_by", v)}
                    />
                    <ToggleRow
                      label="Show page numbers"
                      checked={settings?.show_page_numbers ?? true}
                      onChange={(v) => updateSetting("show_page_numbers", v)}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Upload Signature Image</label>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-10 border border-slate-200 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {settings?.signature_url ? (
                            <img
                              src={settings.signature_url}
                              alt="Signature"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No image</span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={uploadingSignature}
                          onClick={() => signatureInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                        >
                          {uploadingSignature ? "Uploading..." : "Change"}
                        </button>
                        {settings?.signature_url && (
                          <button
                            type="button"
                            onClick={() => updateSetting("signature_url", null)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Remove signature"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <input
                          ref={signatureInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={handleSignatureFile}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signatory Title</label>
                      <input
                        type="text"
                        value={settings?.signatory_designation || ""}
                        onChange={(e) => updateSetting("signatory_designation", e.target.value)}
                        placeholder="Principal / Authorized Signatory"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Section 6: Advanced Collection Rules & Security PIN */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((p) => !p)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span>Advanced Collection Rules & Owner PIN Security</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </button>

                {showAdvanced && (
                  <div className="p-5 border-t border-slate-200 space-y-4 bg-white text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                        <input
                          type="text"
                          value={settings?.invoice_prefix || "INV"}
                          onChange={(e) => updateSetting("invoice_prefix", e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Payment Due Days</label>
                        <input
                          type="number"
                          value={settings?.invoice_due_days || 15}
                          onChange={(e) => updateSetting("invoice_due_days", parseInt(e.target.value, 10))}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Default Invoice Notes / Terms</label>
                        <textarea
                          rows={2}
                          value={settings?.invoice_notes || ""}
                          onChange={(e) => updateSetting("invoice_notes", e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                          placeholder="Payment due within 15 days of issue."
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Set / Change Owner PIN</label>
                        <input
                          type="password"
                          maxLength={8}
                          value={ownerPin}
                          onChange={(e) => setOwnerPin(e.target.value)}
                          placeholder="4–8 digit override PIN"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <ToggleRow
                          label="Allow partial payments"
                          checked={settings?.allow_partial ?? true}
                          onChange={(v) => updateSetting("allow_partial", v)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: PAYMENT RECEIPT SETTINGS                                        */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {activeSettingsTab === "receipt" && (
            <div className="space-y-4">
              {/* Receipt Section 1: School Header on Receipt */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">School Header on Receipt</h3>
                    <p className="text-[11px] text-slate-500">Letterhead and contact visibility on printed receipts.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show school logo on receipt"
                    checked={settings?.show_receipt_school_logo ?? true}
                    onChange={(v) => updateSetting("show_receipt_school_logo", v)}
                  />
                  <ToggleRow
                    label="Show school name on receipt"
                    checked={settings?.show_receipt_school_name ?? true}
                    onChange={(v) => updateSetting("show_receipt_school_name", v)}
                  />
                  <ToggleRow
                    label="Show campus address on receipt"
                    checked={settings?.show_receipt_address ?? true}
                    onChange={(v) => updateSetting("show_receipt_address", v)}
                  />
                  <ToggleRow
                    label="Show phone number on receipt"
                    checked={settings?.show_receipt_phone ?? true}
                    onChange={(v) => updateSetting("show_receipt_phone", v)}
                  />
                  <ToggleRow
                    label="Show email on receipt"
                    checked={settings?.show_receipt_email ?? true}
                    onChange={(v) => updateSetting("show_receipt_email", v)}
                  />
                </div>
              </div>

              {/* Receipt Section 2: Receipt & Student Identification */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Receipt & Student Identification</h3>
                    <p className="text-[11px] text-slate-500">Receipt number, date, and student enrollment information.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show receipt number & payment date"
                    checked={settings?.show_receipt_number_date ?? true}
                    onChange={(v) => updateSetting("show_receipt_number_date", v)}
                  />
                  <ToggleRow
                    label="Show student details (Name, Class, Adm No)"
                    checked={settings?.show_receipt_student_details ?? true}
                    onChange={(v) => updateSetting("show_receipt_student_details", v)}
                  />
                  <ToggleRow
                    label="Show parent / guardian name"
                    checked={settings?.show_receipt_parent_name ?? true}
                    onChange={(v) => updateSetting("show_receipt_parent_name", v)}
                  />
                </div>
              </div>

              {/* Receipt Section 3: Payment & Transaction Details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Payment & Transaction Details</h3>
                    <p className="text-[11px] text-slate-500">Payment mode, reference / UTR number, and cashier.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show payment method (Cash, UPI, Card, NetBanking)"
                    checked={settings?.show_receipt_payment_mode ?? true}
                    onChange={(v) => updateSetting("show_receipt_payment_mode", v)}
                  />
                  <ToggleRow
                    label="Show transaction / reference / UTR number"
                    checked={settings?.show_receipt_transaction_ref ?? true}
                    onChange={(v) => updateSetting("show_receipt_transaction_ref", v)}
                  />
                  <ToggleRow
                    label="Show cashier / collector name"
                    checked={settings?.show_receipt_cashier ?? true}
                    onChange={(v) => updateSetting("show_receipt_cashier", v)}
                  />
                </div>
              </div>

              {/* Receipt Section 4: Fee Allocation & Balances */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Fee Allocation & Balances</h3>
                    <p className="text-[11px] text-slate-500">Breakdown of obligations covered by this payment.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show fee particulars allocation table"
                    checked={settings?.show_receipt_fee_allocation ?? true}
                    onChange={(v) => updateSetting("show_receipt_fee_allocation", v)}
                  />
                  <ToggleRow
                    label="Show Amount Paid in summary card"
                    checked={settings?.show_receipt_amount_received ?? true}
                    onChange={(v) => updateSetting("show_receipt_amount_received", v)}
                  />
                  <ToggleRow
                    label="Show Amount in Words"
                    checked={settings?.show_receipt_amount_in_words ?? true}
                    onChange={(v) => updateSetting("show_receipt_amount_in_words", v)}
                  />
                  <ToggleRow
                    label="Show Remaining Balance after payment"
                    checked={settings?.show_receipt_balance_remaining ?? true}
                    onChange={(v) => updateSetting("show_receipt_balance_remaining", v)}
                  />
                  <ToggleRow
                    label="Show Advance Credit available (if unallocated)"
                    checked={settings?.show_receipt_advance_credit ?? true}
                    onChange={(v) => updateSetting("show_receipt_advance_credit", v)}
                  />
                </div>
              </div>

              {/* Receipt Section 5: Receipt Footer & Signatures */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Receipt Footer & Signatures</h3>
                    <p className="text-[11px] text-slate-500">Official seal, authorized signature, terms, and computer disclaimer.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  <ToggleRow
                    label="Show authorized signatory box"
                    checked={settings?.show_receipt_signatory ?? true}
                    onChange={(v) => updateSetting("show_receipt_signatory", v)}
                  />
                  <ToggleRow
                    label="Show receipt terms & refund policy"
                    checked={settings?.show_receipt_terms ?? true}
                    onChange={(v) => updateSetting("show_receipt_terms", v)}
                  />
                  <ToggleRow
                    label="Show computer generated disclaimer"
                    checked={settings?.show_receipt_acknowledgement ?? true}
                    onChange={(v) => updateSetting("show_receipt_acknowledgement", v)}
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Upload Authorized Signatory Signature</label>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-12 border border-slate-200 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        {settings?.signature_url ? (
                          <img
                            src={settings.signature_url}
                            alt="Authorized Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No image</span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={uploadingSignature}
                        onClick={() => signatureInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                      >
                        {uploadingSignature ? "Uploading..." : settings?.signature_url ? "Change" : "Upload"}
                      </button>
                      {settings?.signature_url && (
                        <button
                          type="button"
                          onClick={() => updateSetting("signature_url", null)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Remove signature"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signatory Title</label>
                    <input
                      type="text"
                      value={settings?.signatory_name || ""}
                      onChange={(e) => updateSetting("signatory_name", e.target.value)}
                      placeholder="e.g. Principal / Authorized Signatory"
                      className="w-full max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: PRINT SETTINGS                                                  */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {activeSettingsTab === "print" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                  🖨️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Print & Formatting Preferences</h3>
                  <p className="text-[11px] text-slate-500">Configure paper dimensions, theme colors, and Indian currency formatting.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Color Theme</label>
                  <div className="relative">
                    <select
                      value={settings?.receipt_theme || "myzkool_blue"}
                      onChange={(e) => updateSetting("receipt_theme", e.target.value as ReceiptTheme)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 appearance-none focus:outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="myzkool_blue">MyZkool Blue (Professional Classic)</option>
                      <option value="mint_pastel">Mint Pastel (Modern Teal)</option>
                      <option value="lavender_pastel">Lavender Pastel (Royal Purple)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Paper Size</label>
                  <div className="relative">
                    <select
                      value={settings?.receipt_paper || "a4"}
                      onChange={(e) => {
                        const v = e.target.value as any;
                        updateSetting("receipt_paper", v);
                        setPreviewPaper(v === "thermal80" ? "thermal80" : "a4");
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 appearance-none focus:outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="a4">A4 Sheet (210 × 297 mm)</option>
                      <option value="a5">A5 Sheet (148 × 210 mm)</option>
                      <option value="thermal80">80 mm Thermal POS Roll</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Print Text Size</label>
                  <div className="relative">
                    <select
                      value={settings?.print_text_size || "medium"}
                      onChange={(e) => updateSetting("print_text_size", e.target.value as any)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 appearance-none focus:outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="small">Small (Dense)</option>
                      <option value="medium">Medium (Standard)</option>
                      <option value="large">Large (High Contrast)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Print Orientation</label>
                  <div className="relative">
                    <select
                      value={settings?.print_orientation || "portrait"}
                      onChange={(e) => updateSetting("print_orientation", e.target.value as any)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 appearance-none focus:outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Page Margins</label>
                  <div className="relative">
                    <select
                      value={settings?.print_margins || "normal"}
                      onChange={(e) => updateSetting("print_margins", e.target.value as any)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 appearance-none focus:outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="compact">Compact (Narrow Margins)</option>
                      <option value="normal">Normal (Standard 18mm)</option>
                      <option value="wide">Wide (Spacious 24mm)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Indian Currency Format</label>
                  <div className="relative">
                    <select
                      value={settings?.amount_format || "indian"}
                      onChange={(e) => updateSetting("amount_format", e.target.value as any)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 appearance-none focus:outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="indian">Indian (e.g. ₹ 1,00,000.00)</option>
                      <option value="international">International (e.g. ₹ 100,000.00)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Decimal Places</label>
                  <div className="relative">
                    <select
                      value={settings?.decimal_places ?? 2}
                      onChange={(e) => updateSetting("decimal_places", parseInt(e.target.value, 10))}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 appearance-none focus:outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="2">2 Decimals (e.g. ₹ 500.00)</option>
                      <option value="0">0 Decimals (e.g. ₹ 500)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <ToggleRow
                    label="Show page numbers on multi-page"
                    checked={settings?.show_page_numbers ?? true}
                    onChange={(v) => updateSetting("show_page_numbers", v)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: STICKY LIVE DOCUMENT PREVIEW (5 COLS)                   */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div ref={previewRef} className="lg:col-span-5 lg:sticky lg:top-6 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            {/* Top Row: Document Type Pill & Paper Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              {/* Document Type Selector (Invoice vs Receipt) */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setPreviewDocType("invoice")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewDocType === "invoice"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocType("receipt")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewDocType === "receipt"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Receipt
                </button>
              </div>

              {/* Layout Switcher (A4 vs Thermal) */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setPreviewPaper("a4")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewPaper === "a4"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  A4 Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPaper("thermal80")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewPaper === "thermal80"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  80mm Thermal
                </button>
              </div>
            </div>

            {/* Second Row: Specific Document Picker + Actions */}
            <div className="flex items-center justify-between gap-2">
              {/* Document Selector */}
              <div className="relative flex-1 min-w-0">
                {previewDocType === "invoice" ? (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleSelectInvoice(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer truncate"
                  >
                    <option value="sample">Sample Student Invoice</option>
                    {invoicesList.slice(0, 15).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_no} — {inv.student_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedReceiptId}
                    onChange={(e) => handleSelectReceipt(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer truncate"
                  >
                    <option value="sample">Sample Payment Receipt</option>
                    {receiptsList.slice(0, 15).map((rcpt) => (
                      <option key={rcpt.id} value={rcpt.id}>
                        {rcpt.receipt_no} (₹{((rcpt.total_paise || (rcpt as any).total_amount_paise || 0) / 100).toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Actions: Print and Download */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Print Document"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  title="Download Document"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>

            {/* Live Document Frame */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-slate-100/60 shadow-inner max-h-[820px] overflow-y-auto">
              <iframe
                title="Document Live Preview Frame"
                srcDoc={previewHTML}
                className="w-full border-0 min-h-[760px] bg-white transition-opacity duration-150"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── EDIT SCHOOL INFO MODAL (Centrally Updates School Profile) ─────── */}
      {isEditSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Edit School Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditSchoolModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official School Name *</label>
                <input
                  type="text"
                  value={schoolEditForm.name}
                  onChange={(e) => setSchoolEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campus Address & Location *</label>
                <input
                  type="text"
                  value={schoolEditForm.address}
                  onChange={(e) => setSchoolEditForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={schoolEditForm.phone}
                    onChange={(e) => setSchoolEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={schoolEditForm.email}
                    onChange={(e) => setSchoolEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official School Logo</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {schoolEditForm.logo_url ? (
                      <img
                        src={schoolEditForm.logo_url}
                        alt="School Logo"
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <Building className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Upload New Logo
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">PNG, JPG or WebP (max 3 MB)</p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleLogoFile}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditSchoolModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSchoolInfo}
                onClick={handleSaveSchoolInfo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {savingSchoolInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Save School Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable accessible toggle row component with clean pastel switch.
 */
function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-slate-700 select-none leading-relaxed">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
