import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  X,
  Loader2,
  Check,
  FileText,
  Sliders,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { getFeeSettings } from "../../../services/feeSetupService";
import type { FeeSettings, ReceiptTheme } from "../../../types/fees";
import {
  generateReceiptHTML,
  RECEIPT_THEMES,
  DEFAULT_RECEIPT_TERMS,
} from "../../../lib/receiptTemplate";

const SAMPLE_PREVIEW_RECEIPT: any = {
  id: "preview-receipt-id",
  receipt_no: "MZ/2026-27/000124",
  student_id: "preview-student-id",
  academic_year_id: "2026-27",
  receipt_date: new Date().toISOString().split("T")[0],
  total_paise: 1000000, // ₹10,000.00 paid
  status: "active",
  source: "counter",
  collected_by: "Accounts Desk (P. Roy)",
  remarks: "Q1 Academic Fees Cleared (Partial Payment). Thank you!",
  print_count: 0,
};

const SAMPLE_PREVIEW_ITEMS: any[] = [
  { id: "item-1", fee_head_id: "Transport Fee", fee_head_name: "Transport Fee", gross_paise: 90000, concession_paise: 0, net_paise: 90000, amount_paise: 90000, outstanding_paise: 0, balance_paise: 0, invoice_no: "INV-2026-001" },
  { id: "item-2", fee_head_id: "Development Fee", fee_head_name: "Development Fee", gross_paise: 100000, concession_paise: 0, net_paise: 100000, amount_paise: 100000, outstanding_paise: 0, balance_paise: 0, invoice_no: "INV-2026-001" },
  { id: "item-3", fee_head_id: "Admission Fee", fee_head_name: "Admission Fee", gross_paise: 500000, concession_paise: 0, net_paise: 500000, amount_paise: 500000, outstanding_paise: 0, balance_paise: 0, invoice_no: "INV-2026-001" },
  { id: "item-4", fee_head_id: "Exam Fee", fee_head_name: "Exam Fee", gross_paise: 80000, concession_paise: 0, net_paise: 80000, amount_paise: 80000, outstanding_paise: 0, balance_paise: 0, invoice_no: "INV-2026-001" },
  { id: "item-5", fee_head_id: "Annual Charges", fee_head_name: "Annual Charges", gross_paise: 100000, concession_paise: 0, net_paise: 100000, amount_paise: 100000, outstanding_paise: 0, balance_paise: 0, invoice_no: "INV-2026-001" },
  { id: "item-6", fee_head_id: "Tuition Fee", fee_head_name: "Tuition Fee", gross_paise: 130000, concession_paise: 0, net_paise: 130000, amount_paise: 130000, outstanding_paise: 0, balance_paise: 0, invoice_no: "INV-2026-001" },
  { id: "item-7", fee_head_id: "Activity & Lab Charges", fee_head_name: "Activity & Lab Charges", gross_paise: 70000, concession_paise: 0, net_paise: 70000, amount_paise: 0, outstanding_paise: 70000, balance_paise: 70000, invoice_no: "INV-2026-001" },
];

const SAMPLE_PREVIEW_PAYMENTS: any[] = [
  {
    id: "pay-1",
    mode: "upi",
    amount_paise: 1000000, // ₹10,000.00
    reference_no: "UPI-4289017265",
    bank_name: "HDFC Bank",
  },
];

export default function ReceiptPreviewPage() {
  const navigate = useNavigate();
  const { school: authSchool, schoolId: authSchoolId, loading: authLoading } = useAuth() as any;
  const activeSchoolId = authSchool?.id || authSchoolId || null;

  const [loading, setLoading] = useState(true);
  const [paperSize, setPaperSize] = useState<"a4" | "a5" | "thermal80">("a4");
  const [previewConfig, setPreviewConfig] = useState<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // 1. Try reading stored preview payload from session/local storage (contains unsaved changes)
    let stored: any = null;
    try {
      const rawSession = sessionStorage.getItem("myzkool_receipt_preview_data");
      const rawLocal = localStorage.getItem("myzkool_receipt_preview_data");
      if (rawSession) {
        stored = JSON.parse(rawSession);
      } else if (rawLocal) {
        stored = JSON.parse(rawLocal);
      }
    } catch (e) {
      console.warn("Could not read preview data from storage", e);
    }

    if (stored) {
      setPreviewConfig(stored);
      if (stored.receiptPaper) {
        setPaperSize(stored.receiptPaper);
      }
      setLoading(false);
      return;
    }

    // 2. Fallback: Fetch persisted settings for active school
    if (!authLoading && activeSchoolId) {
      getFeeSettings(activeSchoolId)
        .then(({ settings }) => {
          setPreviewConfig({
            theme: settings.receipt_theme || "myzkool_blue",
            logoUrl: settings.logo_url || authSchool?.logo_url || null,
            signatureUrl: settings.signature_url || null,
            signatoryName: settings.signatory_name || "Authorized Signatory",
            signatoryDesignation: settings.signatory_designation || "Accounts Officer",
            headerTitle: settings.receipt_header_title || "Official Fee Receipt",
            terms: settings.receipt_terms || DEFAULT_RECEIPT_TERMS,
            footerText: settings.receipt_footer || "",
            refundNote: settings.refund_policy_note || "",
            receiptPrefix: settings.receipt_prefix || "MZ",
            receiptPaper: settings.receipt_paper || "a4",
            school: {
              name: authSchool?.name || "Khaqan Public School",
              address: authSchool?.address || "124 Knowledge Park, Education District",
              phone: authSchool?.contact_phone || "+91 95559 54854",
              email: authSchool?.official_email || "accounts@myzkool.in",
              affiliation_no: authSchool?.affiliation_board ? `CBSE / ${authSchool.affiliation_board}` : "CBSE / AFF-2026-892",
            },
          });
          if (settings.receipt_paper) {
            setPaperSize(settings.receipt_paper as any);
          }
        })
        .catch((err) => {
          console.error("Failed to load settings for preview", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!authLoading && !activeSchoolId) {
      setLoading(false);
    }
  }, [activeSchoolId, authLoading, authSchool]);

  const activeThemeKey: ReceiptTheme = (previewConfig?.theme as ReceiptTheme) || "myzkool_blue";
  const themeDetails = RECEIPT_THEMES[activeThemeKey] || RECEIPT_THEMES.myzkool_blue;

  const receiptHtml = useMemo(() => {
    if (!previewConfig) return "";

    const receiptNo = `${previewConfig.receiptPrefix || "MZ"}/2026-27/000124`;
    const mockReceipt = {
      ...SAMPLE_PREVIEW_RECEIPT,
      receipt_no: receiptNo,
    };

    return generateReceiptHTML(
      mockReceipt,
      SAMPLE_PREVIEW_ITEMS,
      SAMPLE_PREVIEW_PAYMENTS,
      {
        student_name: "Aarav Sharma",
        admission_no: "ADM-2026-042",
        class_name: "Class 10",
        section_name: "Section A",
        academic_year_label: "2026–2027",
        balance_remaining_paise: 70000, // ₹700.00 remaining balance
        previous_balance_paise: 0,
      },
      {
        name: previewConfig.school?.name || authSchool?.name || "Khaqan Public School",
        address: previewConfig.school?.address || authSchool?.address || "124 Knowledge Park, Education District",
        phone: previewConfig.school?.phone || authSchool?.contact_phone || "+91 95559 54854",
        email: previewConfig.school?.email || authSchool?.official_email || "accounts@myzkool.in",
        affiliation_no: previewConfig.school?.affiliation_no || (authSchool?.affiliation_board ? `CBSE / ${authSchool.affiliation_board}` : "CBSE / AFF-2026-892"),
        logo_url: previewConfig.logoUrl || undefined,
        signature_url: previewConfig.signatureUrl || undefined,
        signatory_name: previewConfig.signatoryName || "Authorized Signatory",
        signatory_designation: previewConfig.signatoryDesignation || "Accounts Officer",
        terms: previewConfig.terms || DEFAULT_RECEIPT_TERMS,
        footer: previewConfig.footerText,
        refund_policy_note: previewConfig.refundNote,
        theme: activeThemeKey,
      },
      paperSize,
      false,
      {
        receipt_theme: activeThemeKey,
        logo_url: previewConfig.logoUrl,
        signature_url: previewConfig.signatureUrl,
        signatory_name: previewConfig.signatoryName,
        signatory_designation: previewConfig.signatoryDesignation,
        receipt_header_title: previewConfig.headerTitle || "Official Fee Receipt",
        receipt_terms: previewConfig.terms,
        receipt_footer: previewConfig.footerText,
        refund_policy_note: previewConfig.refundNote,
        receipt_paper: paperSize,
      } as Partial<FeeSettings>,
      {
        totalInvoicePaise: 1070000,
        invoiceNo: "INV-2026-001",
      }
    );
  }, [previewConfig, activeThemeKey, paperSize, authSchool]);

  function handlePrint() {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  }

  function handleClose() {
    if (window.opener) {
      window.close();
    } else {
      navigate("/admin/fees/setup/settings");
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-medium">Loading receipt preview…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 shadow-md">
        {/* Left: Navigation and Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Back to Fee & Receipt Settings"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight truncate">
                Receipt Preview
              </span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: themeDetails.accentBg,
                  color: themeDetails.primaryDark,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: themeDetails.primary }}
                />
                {themeDetails.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {previewConfig?.school?.name || authSchool?.name || "Official School Receipt"} · Sample Transaction
            </p>
          </div>
        </div>

        {/* Center: Paper Size Selector */}
        <div className="hidden sm:flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setPaperSize("a4")}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              paperSize === "a4"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            A4 Standard
          </button>
          <button
            type="button"
            onClick={() => setPaperSize("a5")}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              paperSize === "a5"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            A5 Half Sheet
          </button>
          <button
            type="button"
            onClick={() => setPaperSize("thermal80")}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              paperSize === "thermal80"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Thermal 80mm
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Preview Container */}
      <main className="flex-1 overflow-auto bg-slate-900/60 p-4 sm:p-8 flex justify-center items-start">
        <div
          className="w-full transition-all duration-200"
          style={{
            maxWidth: paperSize === "thermal80" ? "380px" : paperSize === "a5" ? "640px" : "860px",
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700/50">
            <iframe
              ref={iframeRef}
              title="Receipt Preview"
              srcDoc={receiptHtml}
              className="w-full bg-white border-0"
              style={{
                height: paperSize === "thermal80" ? "880px" : paperSize === "a5" ? "920px" : "1160px",
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full theme styling & custom signatures applied</span>
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Format: {paperSize.toUpperCase()} · Print-Ready
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
