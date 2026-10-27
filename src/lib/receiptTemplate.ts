/**
 * Receipt Template Generator (Production-Ready Fee & Receipt Engine)
 * Generates print/PDF HTML for A4 portrait (standard school format), A5 portrait, and 80 mm thermal receipts.
 *
 * Supports exactly 3 predefined themes:
 * 1. MyZkool Blue (Default SaaS style)
 * 2. Mint Pastel (Deep teal & soft mint)
 * 3. Lavender Pastel (Deep purple & soft lavender)
 *
 * Professional Layout includes:
 * - Phase 1: Redesigned School letterhead (proportional logo/emblem, right-aligned contact info, subtle divider)
 * - Clean "Official Fee Receipt" banner with payment status badge and non-contradictory copy indicator
 * - Balanced two-column metadata grid with zero text clipping or overlapping fields
 * - Phase 2: Full Invoice-wise "Line Items Breakdown" table (Fee Particulars, Gross, Concession, Net, Amount Paid, Outstanding)
 * - Three clearly aligned financial summary cards (Previous Dues, Amount Paid, Remaining Balance)
 * - Amount in Words box (Indian System) & remarks box
 * - Terms & Conditions and refund policy note
 * - Symmetrical footer with Cashier Signature, Official School Seal, and Authorized Signatory
 * - Computer-generated receipt disclaimer with no QR code
 * - Multi-page safety with repeating table headers and page-break-inside protection
 */

import { amountInWords, formatPaise } from "./amountInWords";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../types/collection";
import type { FeeSettings, ReceiptTheme } from "../types/fees";

export interface ReceiptStudentDetails {
  student_name: string;
  admission_no: string;
  roll_no?: string;
  class_name?: string;
  section_name?: string;
  father_name?: string;
  guardian_name?: string;
  parent_name?: string;
  applicable_month?: string;
  academic_year_label?: string;
  balance_remaining_paise?: number;
  previous_balance_paise?: number;
}

export interface ReceiptSchoolDetails {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  affiliation_no?: string;
  logo_url?: string;
  theme?: ReceiptTheme;
  signature_url?: string | null;
  signatory_name?: string | null;
  signatory_designation?: string | null;
  terms?: string[] | null;
  footer?: string | null;
  refund_policy_note?: string | null;
}

export interface ReceiptThemeConfig {
  id: ReceiptTheme;
  name: string;
  subtitle: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accentBg: string;
  accentBorder: string;
  textDark: string;
  badgeBg: string;
  badgeText: string;
  tableHeaderBg: string;
  tableBorder: string;
}

export const RECEIPT_THEMES: Record<ReceiptTheme, ReceiptThemeConfig> = {
  myzkool_blue: {
    id: "myzkool_blue",
    name: "MyZkool Blue",
    subtitle: "Professional, clean SaaS-style receipt",
    primary: "#2158E0",
    primaryDark: "#1D4ED8",
    primaryLight: "#3B82F6",
    accentBg: "#EFF6FF",
    accentBorder: "#BFDBFE",
    textDark: "#1E293B",
    badgeBg: "#EFF6FF",
    badgeText: "#1D4ED8",
    tableHeaderBg: "#2B3B82",
    tableBorder: "#CBD5E1",
  },
  mint_pastel: {
    id: "mint_pastel",
    name: "Mint Pastel",
    subtitle: "Clear payment status & financial summaries",
    primary: "#0F766E",
    primaryDark: "#115E59",
    primaryLight: "#14B8A6",
    accentBg: "#F0FDF4",
    accentBorder: "#A7F3D0",
    textDark: "#132E27",
    badgeBg: "#F0FDF4",
    badgeText: "#0F766E",
    tableHeaderBg: "#0F766E",
    tableBorder: "#99F6E4",
  },
  lavender_pastel: {
    id: "lavender_pastel",
    name: "Lavender Pastel",
    subtitle: "Minimal, elegant receipt layout",
    primary: "#6B21A8",
    primaryDark: "#581C87",
    primaryLight: "#8B5CF6",
    accentBg: "#FAF5FF",
    accentBorder: "#DDD6FE",
    textDark: "#26153B",
    badgeBg: "#FAF5FF",
    badgeText: "#6B21A8",
    tableHeaderBg: "#6B21A8",
    tableBorder: "#E9D5FF",
  },
};

export const DEFAULT_RECEIPT_TERMS = [
  "Fee once paid is non-refundable.",
  "Please retain this receipt for your records.",
  "In case of any discrepancy, contact the school office within 7 days.",
];

export interface ReceiptLineItemBreakdown {
  fee_particulars: string;
  gross_paise: number;
  concession_paise: number;
  net_paise: number;
  amount_paid_paise: number;
  outstanding_paise: number;
  invoice_no?: string;
  due_date?: string;
  term_name?: string;
}

export interface ReceiptExtraOptions {
  lineItemsBreakdown?: ReceiptLineItemBreakdown[];
  totalInvoicePaise?: number;
  invoiceNo?: string;
  discrepancyNote?: string;
  copyType?: "student" | "duplicate" | "school" | "office";
  advanceAmountPaise?: number;
  payments?: FeePayment[];
  applicableMonth?: string;
  notes?: string;
  collectedByName?: string;
  collectorRole?: string;
  balanceUnverified?: boolean;
}

export function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

export function sanitizeCollectorName(
  collectedBy?: string | null,
  collectorNameOption?: string | null,
  collectorRole?: string | null
): string | null {
  if (collectorNameOption && !isUUID(collectorNameOption)) {
    return collectorNameOption.trim();
  }
  if (collectedBy && !isUUID(collectedBy)) {
    return collectedBy.trim();
  }
  if (isUUID(collectedBy)) {
    if (collectorRole === "admin" || collectorRole === "school_admin") {
      return "School Admin";
    }
    return "Authorized Staff";
  }
  return null;
}

function escapeHtml(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateReceiptHTML(
  receipt: FeeReceipt,
  items: FeeReceiptItem[],
  payments: FeePayment[],
  studentDetails: ReceiptStudentDetails,
  schoolDetails: ReceiptSchoolDetails,
  paper: "a4" | "a5" | "thermal80" = "a4",
  isDuplicate: boolean = false,
  settings?: Partial<FeeSettings> | null,
  options?: ReceiptExtraOptions
): string {
  const isA4 = paper === "a4";
  const isThermal = paper === "thermal80";
  const isA5 = paper === "a5";
  const maxW = isThermal ? "80mm" : isA4 ? "210mm" : "148mm";
  const isCancelled = receipt.status === "cancelled";
  const showDuplicateStamp = !isCancelled && (isDuplicate || (receipt.print_count ?? 0) > 0);

  // Formatting helper adhering to Indian or International currency format & decimal settings
  const fmtPaise = (paise: number) => {
    const fmt = settings?.amount_format || "indian";
    const dec = settings?.decimal_places ?? 2;
    const units = (paise || 0) / 100;
    if (fmt === "international") {
      return "₹" + units.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    return "₹" + units.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  // Receipt Visibility Flags
  const showLogo = settings?.show_receipt_school_logo ?? true;
  const showSchoolName = settings?.show_receipt_school_name ?? true;
  const showAddress = settings?.show_receipt_address ?? true;
  const showPhone = settings?.show_receipt_phone ?? true;
  const showEmail = settings?.show_receipt_email ?? true;
  const showNumberDate = settings?.show_receipt_number_date ?? true;
  const showStudentDetails = settings?.show_receipt_student_details ?? true;
  const showParentName = settings?.show_receipt_parent_name ?? true;
  const showPaymentMode = settings?.show_receipt_payment_mode ?? true;
  const showTransactionRef = settings?.show_receipt_transaction_ref ?? true;
  const showFeeAllocation = settings?.show_receipt_fee_allocation ?? true;
  const showAmountReceived = settings?.show_receipt_amount_received ?? true;
  const showAmountInWords = settings?.show_receipt_amount_in_words ?? true;
  const showBalanceRemaining = settings?.show_receipt_balance_remaining ?? true;
  const showAdvanceCredit = settings?.show_receipt_advance_credit ?? false;
  const showCashier = settings?.show_receipt_cashier ?? true;
  const showSignatory = settings?.show_receipt_signatory ?? true;
  const showTerms = settings?.show_receipt_terms ?? true;
  const showAcknowledgement = settings?.show_receipt_acknowledgement ?? true;

  // Theme resolution (priority: settings.receipt_theme -> schoolDetails.theme -> default "myzkool_blue")
  const themeKey: ReceiptTheme = (settings?.receipt_theme || schoolDetails.theme || "myzkool_blue") as ReceiptTheme;
  const theme = RECEIPT_THEMES[themeKey] || RECEIPT_THEMES.myzkool_blue;

  // School branding & signature resolution
  const logoUrl = settings?.logo_url || schoolDetails.logo_url;
  const signatureUrl = settings?.signature_url || schoolDetails.signature_url;
  const signatoryName = settings?.signatory_name || schoolDetails.signatory_name || "Authorized Signatory";
  const signatoryDesignation = settings?.signatory_designation || schoolDetails.signatory_designation || "Accounts Officer";
  const headerTitle = settings?.receipt_header_title || "Official Fee Receipt";
  const termsList: string[] = settings?.receipt_terms && settings.receipt_terms.length > 0
    ? settings.receipt_terms
    : schoolDetails.terms && schoolDetails.terms.length > 0
    ? schoolDetails.terms
    : DEFAULT_RECEIPT_TERMS;
  const footerNote = settings?.receipt_footer || schoolDetails.footer || "This is a computer generated receipt and does not require a physical signature unless stamped.";
  const refundNote = settings?.refund_policy_note || schoolDetails.refund_policy_note;

  const words = amountInWords(receipt.total_paise);
  const totalAmtFormatted = fmtPaise(receipt.total_paise);
  const advanceAmountPaise = options?.advanceAmountPaise || 0;
  const advanceCreditFormatted = fmtPaise(advanceAmountPaise);

  const resolvedCollector = sanitizeCollectorName(
    receipt.collected_by,
    options?.collectedByName,
    options?.collectorRole
  );

  // 1. Prepare Line Items Breakdown rows
  let breakdownRows: ReceiptLineItemBreakdown[] = [];

  if (options?.lineItemsBreakdown && options.lineItemsBreakdown.length > 0) {
    breakdownRows = options.lineItemsBreakdown.map((r) => {
      const gross = r.gross_paise ?? r.net_paise ?? 0;
      const concession = r.concession_paise ?? 0;
      const net = r.net_paise ?? Math.max(0, gross - concession);
      const paid = r.amount_paid_paise ?? 0;
      const outstanding = r.outstanding_paise ?? Math.max(0, net - paid);
      return {
        fee_particulars: r.fee_particulars,
        gross_paise: gross,
        concession_paise: concession,
        net_paise: net,
        amount_paid_paise: paid,
        outstanding_paise: outstanding,
        invoice_no: r.invoice_no,
        due_date: r.due_date,
        term_name: r.term_name,
      };
    });
  } else if (items && items.length > 0) {
    breakdownRows = items.map((item) => {
      const gross = (item as any).gross_paise !== undefined
        ? (item as any).gross_paise
        : ((item.amount_paise || 0) + (item.concession_paise || 0));
      const concession = item.concession_paise || 0;
      const net = (item as any).net_paise !== undefined
        ? (item as any).net_paise
        : Math.max(0, gross - concession);
      const paid = (item as any).paid_paise !== undefined
        ? (item as any).paid_paise
        : (item.amount_paise || 0);
      const outstanding = (item as any).outstanding_paise !== undefined
        ? (item as any).outstanding_paise
        : ((item as any).balance_paise !== undefined
            ? (item as any).balance_paise
            : Math.max(0, net - paid));
      const name = (item as any).fee_head_name || item.fee_head_id || "Fee Item";

      return {
        fee_particulars: name,
        gross_paise: gross,
        concession_paise: concession,
        net_paise: net,
        amount_paid_paise: paid,
        outstanding_paise: outstanding,
        invoice_no: (item as any).invoice_no,
      };
    });
  }

  // Calculate totals from breakdown rows
  const sumGross = breakdownRows.reduce((s, r) => s + r.gross_paise, 0);
  const sumConcessions = breakdownRows.reduce((s, r) => s + r.concession_paise, 0);
  const sumNet = breakdownRows.reduce((s, r) => s + r.net_paise, 0);
  const sumPaid = breakdownRows.reduce((s, r) => s + r.amount_paid_paise, 0);
  const sumOutstanding = breakdownRows.reduce((s, r) => s + r.outstanding_paise, 0);

  // Check if an explicit totalInvoicePaise is passed that differs from sumNet (e.g. historical invoice with unallocated charges)
  const totalInvoicePaise = options?.totalInvoicePaise ?? (sumNet > 0 ? sumNet : receipt.total_paise);
  const invoiceDiscrepancyPaise = Math.max(0, totalInvoicePaise - sumNet);

  // Reconciled overall totals
  const totalGrossReconciled = sumGross + invoiceDiscrepancyPaise;
  const totalConcessionReconciled = sumConcessions;
  const totalNetReconciled = totalInvoicePaise;
  const totalPaidReconciled = receipt.total_paise;
  const totalOutstandingReconciled = sumOutstanding + invoiceDiscrepancyPaise;

  // Derive payment modes & references
  const primaryPayment = payments[0];
  const primaryMode = (primaryPayment?.mode || "cash").toUpperCase();
  const primaryRef = primaryPayment?.reference_no || (primaryPayment as any)?.instrument_no || "—";
  const primaryBank = (primaryPayment as any)?.bank_name || "";

  const balanceRemaining = studentDetails.balance_remaining_paise !== undefined
    ? studentDetails.balance_remaining_paise
    : totalOutstandingReconciled;
  const balanceAfterFormatted = fmtPaise(balanceRemaining);
  const prevBalanceFormatted = studentDetails.previous_balance_paise !== undefined
    ? fmtPaise(studentDetails.previous_balance_paise)
    : fmtPaise(0);

  // Determine payment status badge
  let statusBadgeLabel = "PAID";
  let statusBadgeBg = "#DCFCE7";
  let statusBadgeText = "#15803D";
  let statusBadgeBorder = "#86EFAC";

  if (isCancelled) {
    statusBadgeLabel = "CANCELLED";
    statusBadgeBg = "#FEE2E2";
    statusBadgeText = "#B91C1C";
    statusBadgeBorder = "#FCA5A5";
  } else if (balanceRemaining > 0 && receipt.total_paise > 0) {
    statusBadgeLabel = "PARTIAL";
    statusBadgeBg = "#FEF3C7";
    statusBadgeText = "#B45309";
    statusBadgeBorder = "#FCD34D";
  } else if (receipt.total_paise === 0) {
    statusBadgeLabel = "DUE";
    statusBadgeBg = "#F1F5F9";
    statusBadgeText = "#475569";
    statusBadgeBorder = "#CBD5E1";
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DEDICATED 80MM THERMAL RECEIPT TEMPLATE (Narrow ESC/POS Layout)
  // ──────────────────────────────────────────────────────────────────────────
  if (isThermal) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${escapeHtml(receipt.receipt_no)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      padding: 4mm 2.5mm;
      width: 80mm;
      margin: 0 auto;
    }
    @page { size: 80mm auto; margin: 0; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .right { text-align: right; }
    .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th, td { padding: 3px 1px; }
    .badge { border: 1px solid #000; padding: 2px 6px; display: inline-block; font-size: 10px; margin-top: 3px; font-weight: bold; }
  </style>
</head>
<body onload="if(window.location.search.includes('print=true')) window.print();">
  <div class="center">
    ${showLogo && logoUrl ? `<img src="${escapeHtml(logoUrl)}" style="max-height: 38px; margin-bottom: 4px;" alt="Logo" /><br/>` : ""}
    ${showSchoolName ? `<div class="bold" style="font-size: 13px;">${escapeHtml(schoolDetails.name || "School")}</div>` : ""}
    ${showAddress && schoolDetails.address ? `<div>${escapeHtml(schoolDetails.address)}</div>` : ""}
    ${showPhone && schoolDetails.phone ? `<div>Tel: ${escapeHtml(schoolDetails.phone)}</div>` : ""}
    <div class="bold" style="margin-top: 4px; font-size: 12px;">${escapeHtml(headerTitle.toUpperCase())}</div>
    <div class="badge">${statusBadgeLabel} ${showDuplicateStamp ? '- DUPLICATE' : ''}</div>
  </div>
  <div class="divider"></div>

  ${showNumberDate ? `
  <div>Receipt #: <span class="bold">${escapeHtml(receipt.receipt_no)}</span></div>
  <div>Date: ${escapeHtml(receipt.receipt_date)}</div>
  ` : ""}

  ${showStudentDetails ? `
  <div class="divider"></div>
  <div>Student: <span class="bold">${escapeHtml(studentDetails.student_name)}</span></div>
  <div>Adm #: ${escapeHtml(studentDetails.admission_no)} | Class: ${escapeHtml(studentDetails.class_name || "—")} ${studentDetails.section_name ? `(${escapeHtml(studentDetails.section_name)})` : ""}</div>
  ${showParentName && (studentDetails.guardian_name || studentDetails.father_name) ? `<div>Parent: ${escapeHtml(studentDetails.guardian_name || studentDetails.father_name)}</div>` : ""}
  ` : ""}

  ${(showPaymentMode || showTransactionRef) ? `
  <div class="divider"></div>
  ${showPaymentMode ? `<div>Mode: <span class="bold">${escapeHtml(primaryMode)}</span>${primaryBank ? ` (${escapeHtml(primaryBank)})` : ""}</div>` : ""}
  ${showTransactionRef && primaryRef && primaryRef !== "—" ? `<div>Ref: ${escapeHtml(primaryRef)}</div>` : ""}
  ` : ""}

  ${showFeeAllocation && breakdownRows.length > 0 ? `
  <div class="double-divider"></div>
  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th style="text-align: left;">Particulars</th>
        <th class="right">Paid</th>
        <th class="right">Bal</th>
      </tr>
    </thead>
    <tbody>
      ${breakdownRows.map(r => `
      <tr>
        <td>${escapeHtml(r.fee_particulars)}</td>
        <td class="right">${fmtPaise(r.amount_paid_paise)}</td>
        <td class="right">${fmtPaise(r.outstanding_paise)}</td>
      </tr>
      `).join("")}
    </tbody>
  </table>
  ` : ""}

  <div class="double-divider"></div>
  <table>
    ${showAmountReceived ? `
    <tr class="bold" style="font-size: 12px;">
      <td>AMOUNT RECEIVED:</td>
      <td class="right">${fmtPaise(receipt.total_paise)}</td>
    </tr>
    ` : ""}
    ${showBalanceRemaining && balanceRemaining > 0 ? `
    <tr style="font-size: 11px;">
      <td>Remaining Balance:</td>
      <td class="right">${fmtPaise(balanceRemaining)}</td>
    </tr>
    ` : ""}
  </table>

  ${showAmountInWords ? `
  <div class="divider"></div>
  <div style="font-size: 9.5px;">Amount in Words: ${escapeHtml(words)}</div>
  ` : ""}

  <div class="divider"></div>
  <div class="center" style="font-size: 9px; margin-top: 6px;">
    ${showCashier && resolvedCollector ? `<div>Collected by: ${escapeHtml(resolvedCollector)}</div>` : ""}
    ${showSignatory && signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" style="max-height: 28px; margin: 4px 0; object-fit: contain;" onerror="this.style.display='none';" /><br/>` : ""}
    ${showSignatory ? `<div class="bold">${escapeHtml(signatoryName)} (${escapeHtml(signatoryDesignation)})</div>` : ""}
    ${showAcknowledgement && footerNote ? `<div style="margin-top: 4px; font-size: 8.5px;">${escapeHtml(footerNote)}</div>` : ""}
  </div>
</body>
</html>`;
  }

  // Helpers for A4 Fee Payment Receipt
  const deriveMonth = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      }
    } catch {}
    return "";
  };

  const applicableMonthStr =
    options?.applicableMonth ||
    studentDetails.applicable_month ||
    breakdownRows.find((r) => r.term_name)?.term_name ||
    deriveMonth(receipt.receipt_date) ||
    "October 2025";

  const classSectionStr = [
    studentDetails.class_name ? String(studentDetails.class_name).replace(/^Class\s+/i, "") : "",
    studentDetails.section_name ? String(studentDetails.section_name).replace(/^Section\s+/i, "") : "",
  ].filter(Boolean).join(" - ") || "—";

  const parentGuardianStr =
    studentDetails.guardian_name ||
    studentDetails.parent_name ||
    studentDetails.father_name ||
    "—";

  const isCash = primaryMode === "CASH";
  const hasRef = primaryRef && primaryRef !== "—" && primaryRef.trim() !== "";
  const showRef = showTransactionRef && (!isCash ? hasRef : (hasRef && primaryPayment?.reference_no && primaryPayment.reference_no !== "—"));

  // Generate 4-column Fee Allocation Table Rows:
  // # | Fee Particulars | Applicable Month | Amount Paid (₹)
  let tableRowsHtml = breakdownRows.map((row, idx) => {
    const isTransport = (row.fee_particulars || "").toLowerCase().includes("transport");
    const transportBadge = isTransport
      ? `<span style="background: #E0E7FF; color: #3730A3; font-size: 9.5px; font-weight: 600; padding: 2px 7px; border-radius: 9999px; margin-left: 8px; vertical-align: middle;">Transport</span>`
      : "";
    const period = row.term_name || applicableMonthStr;

    return `
      <tr>
        <td style="padding: 9px 12px; text-align: center; color: #475569; font-size: 11px; border-bottom: 1px solid #E2E8F0;">${idx + 1}</td>
        <td style="padding: 9px 12px; font-weight: 700; color: #0F172A; font-size: 11.5px; border-bottom: 1px solid #E2E8F0;">
          ${escapeHtml(row.fee_particulars)} ${transportBadge}
          ${row.concession_paise > 0 ? `<div style="font-size: 9.5px; color: #047857; font-weight: 500;">(Concession: -${fmtPaise(row.concession_paise)})</div>` : ''}
        </td>
        <td style="padding: 9px 12px; color: #334155; font-size: 11px; border-bottom: 1px solid #E2E8F0;">${escapeHtml(period)}</td>
        <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #0F172A; font-variant-numeric: tabular-nums; font-size: 12px; border-bottom: 1px solid #E2E8F0;">${fmtPaise(row.amount_paid_paise)}</td>
      </tr>
    `;
  }).join('');

  if (!tableRowsHtml) {
    tableRowsHtml = `
      <tr>
        <td style="padding: 9px 12px; text-align: center; color: #475569; font-size: 11px; border-bottom: 1px solid #E2E8F0;">1</td>
        <td style="padding: 9px 12px; font-weight: 700; color: #0F172A; font-size: 11.5px; border-bottom: 1px solid #E2E8F0;">Fee Payment</td>
        <td style="padding: 9px 12px; color: #334155; font-size: 11px; border-bottom: 1px solid #E2E8F0;">${escapeHtml(applicableMonthStr)}</td>
        <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #0F172A; font-variant-numeric: tabular-nums; font-size: 12px; border-bottom: 1px solid #E2E8F0;">${totalAmtFormatted}</td>
      </tr>
    `;
  }

  const discrepancyRowHtml = invoiceDiscrepancyPaise > 0 ? `
    <tr style="background: #FFFBEB; border-bottom: 1px solid #FDE68A;">
      <td style="padding: 9px 12px; text-align: center; color: #B45309; font-weight: 700;">*</td>
      <td style="padding: 9px 12px; font-weight: 600; color: #92400E; font-size: 11.5px;">
        Unallocated / Historical Adjustment
        <div style="font-size: 9.5px; color: #B45309; font-weight: normal;">
          ${escapeHtml(options?.discrepancyNote || 'Adjustment from invoice reconciliation')}
        </div>
      </td>
      <td style="padding: 9px 12px; color: #92400E; font-size: 11px;">${escapeHtml(applicableMonthStr)}</td>
      <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #B45309; font-variant-numeric: tabular-nums; font-size: 12px;">
        ${fmtPaise(invoiceDiscrepancyPaise)}
      </td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Fee Receipt - ${escapeHtml(receipt.receipt_no)}</title>
  <style>
    :root {
      --theme-primary: ${theme.primary};
      --theme-accent-bg: ${theme.accentBg};
      --theme-accent-border: ${theme.accentBorder};
      --table-header-bg: ${theme.tableHeaderBg};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${isA4 ? '11.5px' : '10.5px'};
      line-height: 1.45;
      color: #0F172A;
      background: #F8FAFC;
    }
    .receipt-page {
      width: 100%;
      max-width: ${maxW};
      margin: 20px auto;
      padding: ${isA4 ? '12mm 15mm' : '8mm 10mm'};
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      position: relative;
    }

    /* 1. School Header */
    .receipt-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 12px;
    }
    .school-header-left {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      flex: 1;
    }
    .school-logo {
      max-height: 60px;
      max-width: 130px;
      object-fit: contain;
    }
    .school-logo-placeholder {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: ${theme.accentBg};
      color: ${theme.primary};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      border: 2px solid ${theme.primary};
      flex-shrink: 0;
    }
    .school-header-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .school-title {
      font-size: ${isA4 ? '20px' : '17px'};
      font-weight: 800;
      color: #1E293B;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }
    .school-addr {
      font-size: 11px;
      color: #475569;
      line-height: 1.35;
      max-width: 440px;
    }
    .school-contacts {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #1E293B;
      margin-top: 3px;
    }
    .contact-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .contact-divider {
      color: #CBD5E1;
      font-weight: 300;
    }

    /* Right Header Fee Payment Receipt Box */
    .receipt-title-box {
      border: 1.5px solid ${theme.accentBorder};
      background: ${theme.accentBg};
      padding: 10px 16px;
      border-radius: 8px;
      text-align: left;
      flex-shrink: 0;
      min-width: 230px;
    }
    .receipt-main-title {
      color: ${theme.tableHeaderBg === '#2B3B82' ? '#1E3A8A' : theme.primary};
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1.2;
    }
    .receipt-sub-title {
      color: #475569;
      font-size: 11px;
      margin-top: 3px;
    }

    .header-divider {
      border-bottom: 1.5px solid #E2E8F0;
      margin: 12px 0 16px 0;
    }

    /* 2. Receipt & Student Identification (2-Column Grid) */
    .meta-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 18px;
      margin-bottom: 16px;
      background: #FFFFFF;
    }
    .meta-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-right: 20px;
    }
    .meta-col-right {
      padding-right: 0;
      padding-left: 20px;
      border-left: 1px solid #E2E8F0;
    }
    .meta-row {
      display: flex;
      align-items: baseline;
      font-size: 11.5px;
    }
    .meta-label {
      width: 120px;
      color: #475569;
      font-weight: 500;
      flex-shrink: 0;
    }
    .meta-sep {
      width: 14px;
      color: #64748B;
      flex-shrink: 0;
      text-align: center;
    }
    .meta-val {
      font-weight: 700;
      color: #0F172A;
      flex: 1;
      word-break: break-word;
    }

    /* 3. Fee Allocation Table */
    table.receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
    }
    table.receipt-table thead tr {
      background: ${theme.tableHeaderBg};
      color: #FFFFFF;
    }
    table.receipt-table th {
      padding: 9px 12px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: none;
    }
    table.receipt-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #E2E8F0;
    }
    .total-row {
      background: ${theme.accentBg};
    }
    .total-label {
      padding: 10px 12px;
      font-weight: 700;
      font-size: 13px;
      color: #1E293B;
      border: none;
    }
    .total-amount {
      padding: 10px 12px;
      text-align: right;
      font-weight: 800;
      font-size: 15px;
      color: ${theme.tableHeaderBg === '#2B3B82' ? '#1E3A8A' : theme.primary};
      border: none;
      font-variant-numeric: tabular-nums;
    }

    /* 4. Summary Cards */
    .summary-cards-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 14px 0;
    }
    .summary-card-item {
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .card-header-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .card-amount-line {
      font-size: 18px;
      font-weight: 800;
      margin-top: 4px;
      font-variant-numeric: tabular-nums;
    }

    /* 5. Words & Remarks */
    .words-card, .remarks-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 9px 14px;
      margin: 10px 0;
      font-size: 11.5px;
      line-height: 1.4;
    }
    .words-title, .remarks-title {
      color: #0F172A;
      font-weight: 700;
      margin-right: 6px;
    }
    .words-text, .remarks-text {
      color: #334155;
    }

    /* 6. 3 Bottom Info Columns */
    .info-columns-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
      margin-top: 16px;
    }
    .info-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 10.5px;
    }
    .info-col-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .info-col-sub {
      color: #64748B;
      font-size: 10px;
    }
    .info-col-line {
      color: #334155;
      font-weight: 500;
    }
    .info-terms-list {
      margin: 0;
      padding-left: 14px;
      color: #475569;
      line-height: 1.4;
      font-size: 10px;
    }
    .info-refund-note {
      font-size: 9.5px;
      color: #64748B;
      font-style: italic;
      margin-top: 3px;
    }

    /* 7. Signatures */
    .signatures-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 24px;
      padding: 0 10px;
    }
    .sig-box {
      width: 220px;
      text-align: center;
    }
    .sig-space {
      height: 40px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sig-img {
      max-height: 48px;
      max-width: 170px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .sig-line {
      border-top: 1.5px solid #0F172A;
      padding-top: 5px;
      font-weight: 600;
      font-size: 11px;
      color: #0F172A;
    }

    /* 8. Disclaimer */
    .disclaimer-text {
      text-align: center;
      font-size: 9.5px;
      color: #94A3B8;
      margin-top: 18px;
    }

    .cancelled-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 64px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.14);
      pointer-events: none;
      z-index: 50;
      white-space: nowrap;
      border: 4px solid rgba(220, 38, 38, 0.18);
      padding: 8px 24px;
      border-radius: 8px;
    }

    @media print {
      body {
        background: #FFFFFF;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .receipt-page {
        margin: 0;
        padding: 0;
        border: none;
        box-shadow: none;
        max-width: 100%;
        width: 100%;
      }
      @page {
        size: ${isA5 ? 'A5 portrait' : 'A4 portrait'};
        margin: ${isA5 ? '6mm 8mm' : '8mm 10mm'};
      }
    }
  </style>
</head>
<body>
  <!-- Official School Seal omitted per A4 specification -->
  <span style="display:none;" data-status="${statusBadgeLabel}">${statusBadgeLabel}</span>
  <div class="receipt-page">
    ${isCancelled ? '<div class="cancelled-watermark">CANCELLED</div>' : ''}

    <!-- 1. School Header -->
    <div class="receipt-header-row">
      <div class="school-header-left">
        ${showLogo ? (logoUrl ? `
          <img src="${logoUrl}" alt="School Logo" class="school-logo" />
        ` : `
          <div class="school-logo-placeholder">
            ${escapeHtml((schoolDetails.name || "MZ").slice(0, 2).toUpperCase())}
          </div>
        `) : ''}

        <div class="school-header-info">
          ${showSchoolName ? `<div class="school-title">${escapeHtml(schoolDetails.name || "Peace Convent School")}</div>` : ''}
          ${(showAddress && schoolDetails.address) ? `<div class="school-addr">${escapeHtml(schoolDetails.address)}</div>` : ''}
          ${(showPhone || showEmail) ? `
            <div class="school-contacts">
              ${(showPhone && schoolDetails.phone) ? `
                <span class="contact-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  ${escapeHtml(schoolDetails.phone)}
                </span>
              ` : ''}
              ${(showPhone && schoolDetails.phone && showEmail && schoolDetails.email) ? `<span class="contact-divider">|</span>` : ''}
              ${(showEmail && schoolDetails.email) ? `
                <span class="contact-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  ${escapeHtml(schoolDetails.email)}
                </span>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Right Header Card -->
      <div class="receipt-title-box">
        <div class="receipt-main-title">
          ${escapeHtml((headerTitle && headerTitle !== "Official Fee Receipt") ? headerTitle.toUpperCase() : "FEE PAYMENT RECEIPT")}
          ${showDuplicateStamp ? '<span style="font-size: 9px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px; vertical-align: middle;">DUPLICATE</span>' : ''}
        </div>
        <div class="receipt-sub-title">Receipt for fee payment received from student.</div>
      </div>
    </div>

    <div class="header-divider"></div>

    <!-- 2. Receipt & Student Identification (2-Column Grid) -->
    <div class="meta-section">
      <div class="meta-col">
        ${showStudentDetails ? `
          <div class="meta-row">
            <span class="meta-label">Student Name</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(studentDetails.student_name)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Admission No.</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(studentDetails.admission_no)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Class & Section</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(classSectionStr)}</span>
          </div>
        ` : ''}
        ${(showParentName && parentGuardianStr && parentGuardianStr !== '—') ? `
          <div class="meta-row">
            <span class="meta-label">Parent / Guardian</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(parentGuardianStr)}</span>
          </div>
        ` : ''}
      </div>

      <div class="meta-col meta-col-right">
        ${showNumberDate ? `
          <div class="meta-row">
            <span class="meta-label">Receipt No.</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(receipt.receipt_no)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Payment Date</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(receipt.receipt_date)}</span>
          </div>
        ` : ''}
        <div class="meta-row">
          <span class="meta-label">Applicable Month</span>
          <span class="meta-sep">:</span>
          <span class="meta-val">${escapeHtml(applicableMonthStr)}</span>
        </div>
        ${showPaymentMode ? `
          <div class="meta-row">
            <span class="meta-label">Payment Method</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(primaryMode)}${primaryBank ? ` (${escapeHtml(primaryBank)})` : ''}</span>
          </div>
        ` : ''}
        ${showRef ? `
          <div class="meta-row">
            <span class="meta-label">Transaction Ref.</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(primaryRef)}</span>
          </div>
        ` : ''}
        ${(showCashier && resolvedCollector) ? `
          <div class="meta-row">
            <span class="meta-label">Collected By</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${escapeHtml(resolvedCollector)}</span>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- 3. Fee Allocation Table -->
    ${showFeeAllocation ? `
    <table class="receipt-table">
      <thead>
        <tr>
          <th style="width: 45px; text-align: center;">#</th>
          <th style="text-align: left;">Fee Particulars</th>
          <th style="width: 160px; text-align: left;">Applicable Month</th>
          <th style="width: 140px; text-align: right;">Amount Paid (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
        ${discrepancyRowHtml}
        <tr class="total-row">
          <td colspan="3" class="total-label">Total Amount Paid</td>
          <td class="total-amount">${totalAmtFormatted}</td>
        </tr>
      </tbody>
    </table>
    ` : ''}

    <!-- 4. Summary Cards Row -->
    <div class="summary-cards-row">
      ${showAmountReceived ? `
      <div class="summary-card-item" style="background: #EFF6FF; border: 1px solid #DBEAFE;">
        <div class="card-header-line" style="color: #1D4ED8;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          AMOUNT PAID
        </div>
        <div class="card-amount-line" style="color: #1E3A8A;">${totalAmtFormatted}</div>
      </div>
      ` : ''}

      ${showBalanceRemaining ? `
      <div class="summary-card-item" style="background: #FEF2F2; border: 1px solid #FEE2E2;">
        <div class="card-header-line" style="color: #DC2626;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          REMAINING BALANCE
        </div>
        <div class="card-amount-line" style="color: #DC2626;">${options?.balanceUnverified ? '<span style="font-size: 13px; color: #94A3B8; font-weight: 600;">Pending Verification</span>' : balanceAfterFormatted}</div>
      </div>
      ` : ''}

      ${(showAdvanceCredit || advanceAmountPaise > 0) ? `
      <div class="summary-card-item" style="background: #F0FDF4; border: 1px solid #DCFCE7;">
        <div class="card-header-line" style="color: #16A34A;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          ADVANCE CREDIT
        </div>
        <div class="card-amount-line" style="color: #16A34A;">${advanceCreditFormatted}</div>
      </div>
      ` : ''}
    </div>

    <!-- 5. Amount in Words Box -->
    ${showAmountInWords ? `
    <div class="words-card">
      <span class="words-title">Amount in Words:</span>
      <span class="words-text">${escapeHtml(words)}</span>
    </div>
    ` : ''}

    <!-- 6. Notes / Remarks Box -->
    ${(receipt.remarks || options?.notes) ? `
    <div class="remarks-card">
      <span class="remarks-title">Notes / Remarks:</span>
      <span class="remarks-text">${escapeHtml(receipt.remarks || options?.notes || '')}</span>
    </div>
    ` : ''}

    <!-- 7. 3 Bottom Info Columns -->
    <div class="info-columns-grid">
      ${(showPhone || showEmail) ? `
      <div class="info-col">
        <div class="info-col-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="info-icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          Questions?
        </div>
        <div class="info-col-sub">Feel free to contact us:</div>
        ${(showPhone && schoolDetails.phone) ? `<div class="info-col-line">${escapeHtml(schoolDetails.phone)}</div>` : ''}
        ${(showEmail && schoolDetails.email) ? `<div class="info-col-line">${escapeHtml(schoolDetails.email)}</div>` : ''}
      </div>
      ` : ''}

      ${(showPaymentMode || showTransactionRef || showCashier) ? `
      <div class="info-col">
        <div class="info-col-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="info-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Payment Info:
        </div>
        ${showPaymentMode ? `<div class="info-col-line">Payment Method: ${escapeHtml(primaryMode)}</div>` : ''}
        ${showRef ? `<div class="info-col-line">Reference No.: ${escapeHtml(primaryRef)}</div>` : ''}
        ${(showCashier && resolvedCollector) ? `<div class="info-col-line">Collected By: ${escapeHtml(resolvedCollector)}</div>` : ''}
      </div>
      ` : ''}

      ${(showTerms && termsList.length > 0) ? `
      <div class="info-col">
        <div class="info-col-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="info-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Terms &amp; Conditions:
        </div>
        <ul class="info-terms-list">
          ${termsList.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
        </ul>
        ${refundNote ? `<div class="info-refund-note">Refund Policy: ${escapeHtml(refundNote)}</div>` : ''}
      </div>
      ` : ''}
    </div>

    <!-- 8. Signatures Area -->
    ${(showCashier || showSignatory) ? `
    <div class="signatures-wrapper">
      ${showCashier ? `
      <div class="sig-box">
        <div class="sig-space"></div>
        <div class="sig-line">Collected By / Cashier</div>
      </div>
      ` : '<div style="flex:1;"></div>'}

      ${showSignatory ? `
      <div class="sig-box">
        <div class="sig-space">
          ${signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" alt="Authorized Signatory Signature" class="sig-img" onerror="this.style.display='none';" />` : ''}
        </div>
        <div class="sig-line">${signatoryName ? (signatoryName.toLowerCase().includes("principal") ? escapeHtml(signatoryName) : `${escapeHtml(signatoryName)} / Principal`) : "Authorized Signatory / Principal"}</div>
      </div>
      ` : '<div style="flex:1;"></div>'}
    </div>
    ` : ''}

    <!-- 9. Computer Generated Disclaimer -->
    ${showAcknowledgement ? `
    <div class="disclaimer-text">
      ${escapeHtml(footerNote || "This is a computer generated receipt and does not require a physical signature unless required by the school.")}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Convenience helper to generate receipt HTML adhering to document settings and paper selection.
 */
export function generateReceiptA4Html(
  receipt: FeeReceipt,
  items: FeeReceiptItem[],
  studentDetails: ReceiptStudentDetails,
  schoolDetails: ReceiptSchoolDetails,
  settings?: Partial<FeeSettings> | null,
  options?: ReceiptExtraOptions
): string {
  const paper = (settings?.receipt_paper || "a4") as any;
  const payments = options?.payments || [];
  const isDuplicate = options?.copyType === "duplicate";
  return generateReceiptHTML(
    receipt,
    items,
    payments,
    studentDetails,
    schoolDetails,
    paper,
    isDuplicate,
    settings,
    options
  );
}

/**
 * Helper to trigger print dialog for A4 receipt in browser
 */
export function printReceiptA4(html: string): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}

/**
 * Helper to trigger PDF download of A4 receipt in browser
 */
export function downloadReceiptPDF(receiptNo: string, html: string): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}
