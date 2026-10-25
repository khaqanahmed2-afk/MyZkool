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
    tableHeaderBg: "#F1F5F9",
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
    tableHeaderBg: "#F0FDF4",
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
    tableHeaderBg: "#FAF5FF",
    tableBorder: "#E9D5FF",
  },
};

export const DEFAULT_RECEIPT_TERMS = [
  "Fee once paid is non-refundable except refundable security deposit.",
  "Please retain this official computer-generated receipt for your records and tax purposes.",
  "Any discrepancy must be reported to the accounts department within 7 business days.",
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
  const totalAmtFormatted = formatPaise(receipt.total_paise);

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
  const balanceAfterFormatted = formatPaise(balanceRemaining);
  const prevBalanceFormatted = studentDetails.previous_balance_paise !== undefined
    ? formatPaise(studentDetails.previous_balance_paise)
    : "₹0.00";

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

  // Generate table rows for items
  const tableRowsHtml = breakdownRows.map((row, idx) => {
    if (isThermal) {
      return `
        <tr>
          <td style="padding: 3px 2px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: ${theme.textDark};">
            ${row.fee_particulars}
          </td>
          <td style="padding: 3px 2px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums;">
            ${formatPaise(row.net_paise)}
          </td>
          <td style="padding: 3px 2px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: ${theme.primary};">
            ${formatPaise(row.amount_paid_paise)}
          </td>
          <td style="padding: 3px 2px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; color: ${row.outstanding_paise > 0 ? '#DC2626' : '#16A34A'};">
            ${formatPaise(row.outstanding_paise)}
          </td>
        </tr>
      `;
    }

    if (isA5) {
      return `
        <tr>
          <td style="padding: 5px 6px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">
            ${idx + 1}
          </td>
          <td style="padding: 5px 6px; border-bottom: 1px solid #E2E8F0;">
            <strong style="color: ${theme.textDark}; font-size: 11px;">${row.fee_particulars}</strong>
            ${row.invoice_no ? `<span style="font-size: 9px; color: ${theme.primary}; margin-left: 4px; font-family: monospace;">(${row.invoice_no})</span>` : ''}
          </td>
          <td style="padding: 5px 6px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; color: #475569;">
            ${formatPaise(row.gross_paise)}
          </td>
          ${totalConcessionReconciled > 0 ? `
          <td style="padding: 5px 6px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; color: ${row.concession_paise > 0 ? '#047857' : '#94A3B8'};">
            ${row.concession_paise > 0 ? `-${formatPaise(row.concession_paise)}` : '—'}
          </td>` : ''}
          <td style="padding: 5px 6px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; color: #1E293B; font-weight: 600;">
            ${formatPaise(row.net_paise)}
          </td>
          <td style="padding: 5px 6px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: ${theme.primary};">
            ${formatPaise(row.amount_paid_paise)}
          </td>
          <td style="padding: 5px 6px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: ${row.outstanding_paise > 0 ? '#DC2626' : '#16A34A'};">
            ${formatPaise(row.outstanding_paise)}
          </td>
        </tr>
      `;
    }

    // Default A4 full breakdown
    return `
      <tr>
        <td style="padding: 7px 6px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">
          ${idx + 1}
        </td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0;">
          <strong style="color: ${theme.textDark}; font-size: 12px;">${row.fee_particulars}</strong>
          ${row.invoice_no ? `<span style="font-size: 9.5px; color: ${theme.primary}; margin-left: 6px; font-family: monospace;">(${row.invoice_no})</span>` : ''}
        </td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; color: #475569;">
          ${formatPaise(row.gross_paise)}
        </td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; color: ${row.concession_paise > 0 ? '#047857' : '#94A3B8'};">
          ${row.concession_paise > 0 ? `-${formatPaise(row.concession_paise)}` : '—'}
        </td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; color: #1E293B; font-weight: 600;">
          ${formatPaise(row.net_paise)}
        </td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: ${theme.primary};">
          ${formatPaise(row.amount_paid_paise)}
        </td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: ${row.outstanding_paise > 0 ? '#DC2626' : '#16A34A'};">
          ${formatPaise(row.outstanding_paise)}
        </td>
      </tr>
    `;
  }).join('');

  // Explicit Discrepancy / Unassigned row if historical records lack fee head breakdown for part of invoice total
  const discrepancyRowHtml = invoiceDiscrepancyPaise > 0 ? `
    <tr style="background: #FFFBEB; border-bottom: 1px solid #FDE68A;">
      <td style="padding: 6px 8px; text-align: center; color: #B45309; font-weight: 800;">*</td>
      <td style="padding: 6px 8px;">
        <strong style="color: #92400E; font-size: 11.5px;">Unallocated / Historical Invoice Difference</strong>
        <div style="font-size: 9px; color: #B45309;">
          ${options?.discrepancyNote || 'Amount persisted on invoice but unassigned in historical line-item table'}
        </div>
      </td>
      <td style="padding: 6px 8px; text-align: right; color: #92400E; font-variant-numeric: tabular-nums;">
        ${formatPaise(invoiceDiscrepancyPaise)}
      </td>
      <td style="padding: 6px 8px; text-align: right; color: #94A3B8;">—</td>
      <td style="padding: 6px 8px; text-align: right; color: #92400E; font-weight: 600; font-variant-numeric: tabular-nums;">
        ${formatPaise(invoiceDiscrepancyPaise)}
      </td>
      <td style="padding: 6px 8px; text-align: right; color: #94A3B8;">₹0.00</td>
      <td style="padding: 6px 8px; text-align: right; color: #B45309; font-weight: 700; font-variant-numeric: tabular-nums;">
        ${formatPaise(invoiceDiscrepancyPaise)}
      </td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Fee Receipt - ${receipt.receipt_no}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${isThermal ? '11px' : isA4 ? '12px' : '11px'};
      line-height: 1.45;
      color: #0F172A;
      background: #F8FAFC;
    }
    .receipt-page {
      width: 100%;
      max-width: ${maxW};
      margin: ${isThermal ? '0 auto' : '20px auto'};
      padding: ${isThermal ? '4mm 3mm' : isA4 ? '12mm 15mm' : '8mm 10mm'};
      background: #FFFFFF;
      border: ${isThermal ? 'none' : '1px solid #E2E8F0'};
      border-radius: ${isThermal ? '0' : '8px'};
      box-shadow: ${isThermal ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)'};
      position: relative;
    }

    /* 1. School Header */
    .school-letterhead {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1.5px solid #E2E8F0;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .school-logo {
      max-height: ${isA4 ? '56px' : '44px'};
      max-width: 130px;
      object-fit: contain;
      border-radius: 6px;
    }
    .school-emblem-placeholder {
      width: ${isA4 ? '52px' : '42px'};
      height: ${isA4 ? '52px' : '42px'};
      border-radius: 50%;
      background: ${theme.accentBg};
      color: ${theme.primary};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${isA4 ? '18px' : '15px'};
      font-weight: 800;
      border: 2px solid ${theme.primary};
      flex-shrink: 0;
    }
    .school-text {
      flex: 1;
      text-align: ${isThermal ? 'center' : 'left'};
      min-width: 0;
    }
    .school-name {
      font-size: ${isThermal ? '14px' : isA4 ? '19px' : '16px'};
      font-weight: 800;
      color: ${theme.textDark};
      margin: 0;
      line-height: 1.2;
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }
    .school-details {
      font-size: ${isThermal ? '9px' : isA4 ? '10.5px' : '9.5px'};
      color: #64748B;
      margin-top: 3px;
      line-height: 1.4;
    }

    /* 2. Receipt Title & Status Bar */
    .receipt-header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 6px 12px;
      background: ${theme.accentBg};
      border: 1px solid ${theme.accentBorder};
      border-radius: 6px;
    }
    .receipt-badge-title {
      font-size: ${isA4 ? '13px' : '11.5px'};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${theme.primary};
    }
    .status-badge {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${statusBadgeBg};
      color: ${statusBadgeText};
      border: 1px solid ${statusBadgeBorder};
    }
    .copy-type-tag {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      background: #FFFFFF;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #CBD5E1;
      text-transform: uppercase;
    }
    .duplicate-stamp {
      display: inline-block;
      border: 1.5px solid #DC2626;
      background: #FEF2F2;
      color: #DC2626;
      padding: 2px 8px;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 4px;
    }
    .cancelled-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: ${isThermal ? '42px' : '64px'};
      font-weight: 900;
      color: rgba(220, 38, 38, 0.14);
      pointer-events: none;
      z-index: 50;
      white-space: nowrap;
      border: 4px solid rgba(220, 38, 38, 0.18);
      padding: 8px 24px;
      border-radius: 8px;
    }

    /* 3. Student and Receipt Details Grid */
    .details-card {
      display: grid;
      grid-template-columns: ${isThermal ? '1fr' : '1fr 1fr'};
      gap: 10px 24px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: ${isThermal ? '10px' : '11.5px'};
    }
    .details-col {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .details-label {
      color: #64748B;
      font-weight: 500;
      white-space: nowrap;
    }
    .details-val {
      font-weight: 700;
      color: #1E293B;
      text-align: right;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* 4. Financial Table & Breakdown */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${theme.primary};
      margin: 10px 0 6px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 12px 0;
      font-size: ${isThermal ? '10px' : isA4 ? '11.5px' : '10.5px'};
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background: ${theme.tableHeaderBg};
      color: ${theme.textDark};
      padding: ${isThermal ? '4px 2px' : isA4 ? '7px 8px' : '5px 6px'};
      border-top: 1px solid ${theme.tableBorder};
      border-bottom: 2px solid ${theme.tableBorder};
      font-weight: 700;
      text-transform: uppercase;
      font-size: ${isThermal ? '9px' : '10px'};
      letter-spacing: 0.04em;
    }

    /* 5. Financial Summary Cards */
    .summary-cards-grid {
      display: grid;
      grid-template-columns: ${isThermal ? '1fr' : 'repeat(3, 1fr)'};
      gap: 10px;
      margin: 12px 0;
      page-break-inside: avoid;
    }
    .summary-card {
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 9px 12px;
      text-align: center;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .summary-card .card-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748B;
      margin-bottom: 2px;
    }
    .summary-card .card-val {
      font-size: ${isA4 ? '15px' : '13px'};
      font-weight: 800;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
    }
    .card-neutral .card-val {
      color: #334155;
    }
    .card-warning {
      background: #FEF2F2;
      border-color: #FECACA;
    }
    .card-warning .card-title {
      color: #991B1B;
    }
    .card-warning .card-val {
      color: #DC2626;
    }
    .card-success {
      background: #F0FDF4;
      border-color: #BBF7D0;
    }
    .card-success .card-title {
      color: #166534;
    }
    .card-success .card-val {
      color: #15803D;
    }

    /* 6. Supporting Sections */
    .amount-words-box {
      background: ${theme.accentBg};
      border: 1px dashed ${theme.accentBorder};
      padding: 7px 12px;
      border-radius: 6px;
      font-size: ${isA4 ? '11px' : '10px'};
      color: ${theme.textDark};
      margin: 10px 0;
      line-height: 1.4;
    }
    .remarks-box {
      font-size: 10.5px;
      color: #475569;
      margin: 8px 0;
      padding: 6px 10px;
      background: #F8FAFC;
      border-radius: 4px;
      border: 1px solid #E2E8F0;
    }
    .terms-box {
      margin: 10px 0 6px 0;
      padding: 7px 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      font-size: 9.5px;
      color: #475569;
      page-break-inside: avoid;
    }
    .terms-box .title {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.05em;
      color: #334155;
      margin-bottom: 3px;
    }
    .terms-list {
      margin: 0;
      padding-left: 14px;
      line-height: 1.4;
    }
    .footer-signatures {
      margin-top: ${isA4 ? '22px' : '16px'};
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5px;
      color: #475569;
      page-break-inside: avoid;
    }
    .sign-box {
      text-align: center;
      width: 140px;
    }
    .sign-line {
      border-top: 1px solid #475569;
      margin-top: 4px;
      padding-top: 3px;
      font-weight: 600;
    }
    .seal-box {
      width: 50px;
      height: 50px;
      border: 1.5px dashed ${theme.primary};
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 8px;
      font-weight: 800;
      color: ${theme.primary};
      margin: 0 auto;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .footer-note {
      text-align: center;
      font-size: 9px;
      color: #94A3B8;
      margin-top: 12px;
      border-top: 1px dashed #CBD5E1;
      padding-top: 5px;
      page-break-inside: avoid;
    }

    @media print {
      body {
        background: #FFFFFF;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .receipt-page {
        margin: 0;
        padding: ${isThermal ? '2mm' : isA5 ? '6mm 8mm' : '8mm 10mm'};
        border: none;
        box-shadow: none;
        max-width: 100%;
        width: 100%;
      }
      @page {
        size: ${isThermal ? '80mm auto' : isA5 ? 'A5 portrait' : 'A4 portrait'};
        margin: ${isThermal ? '2mm' : isA5 ? '6mm' : '8mm'};
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-page">
    ${isCancelled ? '<div class="cancelled-watermark">CANCELLED</div>' : ''}

    <!-- 1. School Header -->
    <div class="school-letterhead">
      ${logoUrl ? `
        <img src="${logoUrl}" alt="School Logo" class="school-logo" />
      ` : `
        <div class="school-emblem-placeholder">
          ${(schoolDetails.name || "MZ").slice(0, 2).toUpperCase()}
        </div>
      `}
      <div class="school-text">
        <h1 class="school-name">${schoolDetails.name || "MyZkool Partner School"}</h1>
        <div class="school-details">
          ${schoolDetails.address ? `<span>${schoolDetails.address}</span>` : '<span>Main Campus, Education District</span>'}
          ${schoolDetails.phone ? ` • <span>Phone: ${schoolDetails.phone}</span>` : ''}
          ${schoolDetails.email ? ` • <span>Email: ${schoolDetails.email}</span>` : ''}
          ${schoolDetails.affiliation_no ? `<br/><span>Affiliation / Recognition No: <strong>${schoolDetails.affiliation_no}</strong></span>` : ''}
        </div>
      </div>
    </div>

    <!-- 2. Receipt Title & Status Bar -->
    <div class="receipt-header-banner">
      <div class="receipt-badge-title">${headerTitle}</div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="status-badge">${statusBadgeLabel}</span>
        ${showDuplicateStamp
          ? '<span class="duplicate-stamp">DUPLICATE COPY</span>'
          : '<span class="copy-type-tag">STUDENT COPY</span>'}
      </div>
    </div>

    <!-- 3. Student and Receipt Details Grid (2-Column Balanced) -->
    <div class="details-card">
      <div class="details-col">
        <div class="details-row">
          <span class="details-label">Receipt Number:</span>
          <span class="details-val mono" style="color: ${theme.primary};">${receipt.receipt_no}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Receipt Date:</span>
          <span class="details-val">${receipt.receipt_date}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Academic Year:</span>
          <span class="details-val">${studentDetails.academic_year_label || '2026–2027'}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Payment Method:</span>
          <span class="details-val">${primaryMode}${primaryBank ? ` (${primaryBank})` : ''}</span>
        </div>
        ${primaryRef && primaryRef !== "—" ? `
        <div class="details-row">
          <span class="details-label">Reference / UTR / Cheque:</span>
          <span class="details-val mono">${primaryRef}</span>
        </div>` : ''}
      </div>

      <div class="details-col">
        <div class="details-row">
          <span class="details-label">Student Name:</span>
          <span class="details-val" style="color: ${theme.textDark};">${studentDetails.student_name}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Admission Number:</span>
          <span class="details-val mono">${studentDetails.admission_no}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Class & Section:</span>
          <span class="details-val">${studentDetails.class_name || '—'} ${studentDetails.section_name ? `(${studentDetails.section_name})` : ''}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Parent / Guardian:</span>
          <span class="details-val">${studentDetails.guardian_name || studentDetails.father_name || 'Guardian'}</span>
        </div>
        ${options?.invoiceNo ? `
        <div class="details-row">
          <span class="details-label">Invoice Ref:</span>
          <span class="details-val mono" style="color: ${theme.primary};">${options.invoiceNo}</span>
        </div>` : ''}
      </div>
    </div>

    <!-- 4. Line Items Breakdown Table -->
    <div class="section-title">Line Items Breakdown</div>
    <table>
      <thead>
        ${isThermal ? `
        <tr>
          <th style="text-align: left;">Particulars</th>
          <th style="text-align: right; width: 60px;">Net</th>
          <th style="text-align: right; width: 60px;">Paid</th>
          <th style="text-align: right; width: 60px;">Bal</th>
        </tr>
        ` : isA5 ? `
        <tr>
          <th style="width: 28px; text-align: center;">#</th>
          <th style="text-align: left;">Fee Particulars</th>
          <th style="width: 75px; text-align: right;">Gross</th>
          ${totalConcessionReconciled > 0 ? '<th style="width: 70px; text-align: right;">Concession</th>' : ''}
          <th style="width: 75px; text-align: right;">Net Amount</th>
          <th style="width: 80px; text-align: right;">Amount Paid</th>
          <th style="width: 80px; text-align: right;">Outstanding</th>
        </tr>
        ` : `
        <tr>
          <th style="width: 32px; text-align: center;">#</th>
          <th style="text-align: left;">Fee Particulars</th>
          <th style="width: 95px; text-align: right;">Gross Amount</th>
          <th style="width: 85px; text-align: right;">Concession</th>
          <th style="width: 95px; text-align: right;">Net Amount</th>
          <th style="width: 105px; text-align: right;">Amount Paid</th>
          <th style="width: 105px; text-align: right;">Outstanding</th>
        </tr>
        `}
      </thead>
      <tbody>
        ${tableRowsHtml}
        ${discrepancyRowHtml}
        <!-- Clearly distinguished total row -->
        <tr style="font-weight: 800; border-top: 2px solid ${theme.primary}; background: ${theme.accentBg}; border-bottom: 2px solid ${theme.primary};">
          ${isThermal ? `
            <td style="padding: 6px 2px; color: ${theme.textDark};">TOTAL</td>
            <td style="padding: 6px 2px; text-align: right; font-variant-numeric: tabular-nums;">${formatPaise(totalNetReconciled)}</td>
            <td style="padding: 6px 2px; text-align: right; font-variant-numeric: tabular-nums; color: ${theme.primary}; font-weight: 800;">${totalAmtFormatted}</td>
            <td style="padding: 6px 2px; text-align: right; font-variant-numeric: tabular-nums; color: ${totalOutstandingReconciled > 0 ? '#DC2626' : '#16A34A'};">${formatPaise(totalOutstandingReconciled)}</td>
          ` : isA5 ? `
            <td style="padding: 7px 6px; text-align: center;"></td>
            <td style="padding: 7px 6px; color: ${theme.textDark};">TOTAL</td>
            <td style="padding: 7px 6px; text-align: right; font-variant-numeric: tabular-nums;">${formatPaise(totalGrossReconciled)}</td>
            ${totalConcessionReconciled > 0 ? `<td style="padding: 7px 6px; text-align: right; font-variant-numeric: tabular-nums; color: #047857;">-${formatPaise(totalConcessionReconciled)}</td>` : ''}
            <td style="padding: 7px 6px; text-align: right; font-variant-numeric: tabular-nums;">${formatPaise(totalNetReconciled)}</td>
            <td style="padding: 7px 6px; text-align: right; font-variant-numeric: tabular-nums; color: ${theme.primary}; font-size: 12.5px;">${totalAmtFormatted}</td>
            <td style="padding: 7px 6px; text-align: right; font-variant-numeric: tabular-nums; color: ${totalOutstandingReconciled > 0 ? '#DC2626' : '#16A34A'};">${formatPaise(totalOutstandingReconciled)}</td>
          ` : `
            <td style="padding: 8px 6px; text-align: center;"></td>
            <td style="padding: 8px 8px; color: ${theme.textDark}; font-size: 12px;">TOTAL</td>
            <td style="padding: 8px 8px; text-align: right; font-variant-numeric: tabular-nums; color: #334155;">${formatPaise(totalGrossReconciled)}</td>
            <td style="padding: 8px 8px; text-align: right; font-variant-numeric: tabular-nums; color: #047857;">${totalConcessionReconciled > 0 ? `-${formatPaise(totalConcessionReconciled)}` : '—'}</td>
            <td style="padding: 8px 8px; text-align: right; font-variant-numeric: tabular-nums; color: #0F172A;">${formatPaise(totalNetReconciled)}</td>
            <td style="padding: 8px 8px; text-align: right; font-variant-numeric: tabular-nums; color: ${theme.primary}; font-size: 13px;">${totalAmtFormatted}</td>
            <td style="padding: 8px 8px; text-align: right; font-variant-numeric: tabular-nums; color: ${totalOutstandingReconciled > 0 ? '#DC2626' : '#16A34A'};">${formatPaise(totalOutstandingReconciled)}</td>
          `}
        </tr>
      </tbody>
    </table>

    <!-- 5. Amount in Words Box -->
    <div class="amount-words-box">
      <strong>Amount in Words:</strong> ${words}
    </div>

    <!-- 6. Financial Summary Cards (Previous Dues, Amount Paid, Remaining Balance) -->
    <div class="summary-cards-grid">
      <div class="summary-card card-neutral">
        <div class="card-title">Previous Dues</div>
        <div class="card-val">${prevBalanceFormatted}</div>
      </div>
      <div class="summary-card card-primary" style="background: ${theme.accentBg}; border-color: ${theme.accentBorder};">
        <div class="card-title" style="color: ${theme.primary};">Amount Paid</div>
        <div class="card-val" style="color: ${theme.primary};">${totalAmtFormatted}</div>
      </div>
      <div class="summary-card ${balanceRemaining > 0 ? 'card-warning' : 'card-success'}">
        <div class="card-title">Remaining Balance</div>
        <div class="card-val">${balanceAfterFormatted}</div>
      </div>
    </div>

    ${receipt.remarks ? `
    <div class="remarks-box">
      <strong>Notes / Remarks:</strong> ${receipt.remarks}
    </div>` : ''}

    <!-- 7. Terms & Conditions and Refund Notice -->
    ${termsList.length > 0 ? `
    <div class="terms-box">
      <div class="title">Terms & Conditions</div>
      <ul class="terms-list">
        ${termsList.map(t => `<li>${t}</li>`).join('')}
      </ul>
      ${refundNote ? `
      <div style="margin-top: 3px; font-style: italic; color: #64748B;">
        <strong>Refund Policy:</strong> ${refundNote}
      </div>` : ''}
    </div>` : ''}

    <!-- 8. Signatures & Official School Seal (Zero QR code) -->
    <div class="footer-signatures">
      <div class="sign-box">
        <div style="font-size: 9px; color: #64748B;">Collected by</div>
        <div style="height: 36px; display: flex; align-items: flex-end; justify-content: center;">
          <strong style="color: #1E293B;">${receipt.collected_by || 'Accounts Desk'}</strong>
        </div>
        <div class="sign-line">Cashier Signature</div>
      </div>

      <div style="text-align: center;">
        <div class="seal-box">
          <span>SEAL</span>
        </div>
        <span style="font-size: 7.5px; color: #64748B; margin-top: 2px; display: block; font-weight: 600;">Official School Seal</span>
      </div>

      <div class="sign-box">
        <div style="font-size: 9px; color: #64748B;">Authorized Signatory</div>
        <div style="height: 36px; display: flex; align-items: flex-end; justify-content: center;">
          ${signatureUrl ? `
            <img src="${signatureUrl}" alt="Authorized Signature" style="max-height: 34px; max-width: 120px; object-fit: contain;" />
          ` : `
            <span style="color: #94A3B8; font-style: italic; font-size: 8.5px;">(Signature on File)</span>
          `}
        </div>
        <div class="sign-line">
          <div>${signatoryName}</div>
          <div style="font-size: 8px; color: #64748B; font-weight: normal;">${signatoryDesignation}</div>
        </div>
      </div>
    </div>

    <!-- 9. Computer Generated Disclaimer -->
    <div class="footer-note">
      ${footerNote}
    </div>
  </div>
</body>
</html>`;
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
