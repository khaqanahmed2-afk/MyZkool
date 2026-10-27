/**
 * Invoice Template Generator (Production-Grade MyZkool Invoicing Engine)
 * Generates print/PDF HTML for A4, A5, and Thermal 80mm formats.
 *
 * Connected seamlessly with public.fee_settings, authoritative school profiles,
 * and the 3 MyZkool themes (MyZkool Blue, Mint Pastel, Lavender Pastel).
 */

import { amountInWords, formatPaise } from "./amountInWords";
import type { StudentInvoice, FeeSettings, ReceiptTheme } from "../types/fees";
import { RECEIPT_THEMES } from "./receiptTemplate";

export interface SchoolInvoiceBranding {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  official_email?: string;
  contact_phone?: string;
  affiliation_no?: string;
  logo_url?: string | null;
  signature_url?: string | null;
  signatory_name?: string | null;
  signatory_designation?: string | null;
  upi_id?: string;
  bank_details?: {
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    upi_id?: string;
  };
}

/**
 * Escapes HTML characters to prevent XSS injection.
 */
function escapeHtml(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Formats currency paise according to Indian or International format and decimal places.
 */
export function formatCurrencyPaise(
  paise: number,
  format: "indian" | "international" = "indian",
  decimals: number = 2
): string {
  const units = paise / 100;
  if (format === "international") {
    return units.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return units.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function generateInvoiceHTML(
  invoice: StudentInvoice,
  school: SchoolInvoiceBranding,
  arg3?: "a4" | "a5" | "thermal80" | Partial<FeeSettings> | null,
  arg4?: Partial<FeeSettings> | "a4" | "a5" | "thermal80" | null
): string {
  let paper: "a4" | "a5" | "thermal80" = "a4";
  let settings: Partial<FeeSettings> | null = null;

  if (typeof arg3 === "string") {
    paper = arg3 as "a4" | "a5" | "thermal80";
    if (arg4 && typeof arg4 === "object") {
      settings = arg4 as Partial<FeeSettings>;
    }
  } else if (arg3 && typeof arg3 === "object") {
    settings = arg3 as Partial<FeeSettings>;
    if (typeof arg4 === "string") {
      paper = arg4 as "a4" | "a5" | "thermal80";
    }
  }

  const isA4 = paper === "a4";
  const isA5 = paper === "a5";
  const isThermal = paper === "thermal80";

  // Visibility and layout flags with fallback to true
  const showLogo = settings?.show_school_logo ?? true;
  const showSchoolName = settings?.show_school_name ?? true;
  const showAddress = settings?.show_address ?? true;
  const showPhone = settings?.show_phone ?? true;
  const showEmail = settings?.show_email ?? true;
  const repeatHeader = settings?.repeat_header_on_pages ?? true;

  const showStudentDetails = settings?.show_student_details ?? true;
  const showParentName = settings?.show_parent_name ?? true;
  const showInvNumDate = settings?.show_invoice_number_date ?? true;
  const showBillingPeriod = settings?.show_billing_period ?? true;
  const showBreakdown = settings?.show_fee_breakdown ?? true;
  const showConcessionBreakdown = settings?.show_concession_breakdown ?? true;
  const showDiscount = settings?.show_discount ?? true;
  const showPrevDues = settings?.show_previous_dues ?? true;
  const showOverdues = settings?.show_overdues ?? true;
  const showReceived = settings?.show_received_amount ?? true;
  const showBalance = settings?.show_balance_amount ?? true;
  const showCurrentBalance = settings?.show_current_student_balance ?? true;

  const showTotalFee = settings?.show_total_fee ?? true;
  const showAmountWords = settings?.show_amount_in_words ?? true;
  const showPaymentMode = settings?.show_payment_mode ?? true;
  const showTaxDetails = settings?.show_tax_details ?? false;

  const amountFormat = settings?.amount_format || "indian";
  const decimalPlaces = settings?.decimal_places ?? 2;

  const showDesc = settings?.show_description ?? true;
  const showTerms = settings?.show_terms_and_conditions ?? true;
  const showReceivedBy = settings?.show_received_by ?? true;
  const showPageNumbers = settings?.show_page_numbers ?? true;

  const textSize = settings?.print_text_size || "medium";
  const orientation = settings?.print_orientation || "portrait";
  const margins = settings?.print_margins || "normal";

  // Theme resolution (priority: settings.receipt_theme -> default myzkool_blue)
  const themeKey: ReceiptTheme = (settings?.receipt_theme || "myzkool_blue") as ReceiptTheme;
  const theme = RECEIPT_THEMES[themeKey] || RECEIPT_THEMES.myzkool_blue;

  // Authoritative logo & signature
  const logoUrl = school.logo_url || settings?.logo_url || null;
  const signatureUrl = settings?.signature_url || school.signature_url || null;
  const signatoryText = settings?.signatory_designation || settings?.signatory_name || school.signatory_designation || school.signatory_name || "Principal";

  // Line items normalization (supports line_items and items)
  const lineItems: any[] = (invoice as any).line_items || (invoice as any).items || [];

  // Financial calculations
  // Previous Balance = unpaid obligations carried forward from earlier periods
  // Overdue Amount = unpaid portion whose due dates have passed (informational subset of balance, NEVER added on top)
  const totalFeesPaise = (invoice as any).gross_paise ?? (invoice as any).total_amount_paise ?? (invoice as any).total_paise ?? 0;
  const discountPaise = (invoice as any).concession_paise || 0;
  const prevDuesPaise = (invoice as any).previous_dues_paise || 0;
  const overduePaise = (invoice as any).overdue_paise || (invoice.status === "overdue" ? ((invoice as any).balance_paise || 0) : 0);
  const netPayablePaise = (invoice as any).net_paise !== undefined
    ? (invoice as any).net_paise
    : ((invoice as any).net_amount_paise !== undefined
        ? (invoice as any).net_amount_paise
        : (totalFeesPaise - discountPaise));
  
  // Rule 3: Overdue is part of outstanding, not an additional amount to add to outstanding.
  const totalWithDuesPaise = netPayablePaise + prevDuesPaise;
  const receivedPaise = (invoice as any).paid_paise ?? (invoice as any).paid_amount_paise ?? 0;
  const balancePaise = (invoice as any).balance_paise !== undefined
    ? (invoice as any).balance_paise
    : Math.max(0, totalWithDuesPaise - receivedPaise);
  const currentStudentBalancePaise = (invoice as any).current_student_balance_paise !== undefined
    ? (invoice as any).current_student_balance_paise
    : balancePaise;

  const fmt = (p: number) => formatCurrencyPaise(p, amountFormat, decimalPlaces);

  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const isCancelled = invoice.status === "cancelled";
  const isPartial = invoice.status === "partial" || (invoice as any).status === "partially_paid";

  const statusLabel = isPaid
    ? "PAID IN FULL"
    : isOverdue
    ? "OVERDUE"
    : isCancelled
    ? "CANCELLED / VOID"
    : isPartial
    ? "PARTIALLY PAID"
    : "UNPAID";

  const statusColor = isPaid
    ? "#16A34A"
    : isOverdue
    ? "#DC2626"
    : isCancelled
    ? "#64748B"
    : isPartial
    ? "#D97706"
    : theme.primary;

  const statusBg = isPaid
    ? "#F0FDF4"
    : isOverdue
    ? "#FEF2F2"
    : isCancelled
    ? "#F8FAFC"
    : isPartial
    ? "#FFFBEB"
    : theme.accentBg;

  const schoolPhone = school.phone || school.contact_phone || "";
  const schoolEmail = school.email || school.official_email || "";
  const upiId = school.upi_id || school.bank_details?.upi_id || "school@upi";

  const formattedInvoiceDate = invoice.invoice_date || new Date().toISOString().split("T")[0];
  const formattedDueDate = invoice.due_date || formattedInvoiceDate;
  const wordsText = amountInWords(totalWithDuesPaise || netPayablePaise);

  // Terms and conditions
  const termsList: string[] = settings?.receipt_terms && settings.receipt_terms.length > 0
    ? settings.receipt_terms
    : [
        "Fees once paid are non-refundable except refundable caution deposit.",
        "Payment should be made on or before the due date to avoid late charges.",
        "Please contact the school administrative office for any fee queries.",
      ];

  const sheetWidth = isThermal ? "80mm" : isA5 ? "148mm" : "210mm";
  const paddingSize = isThermal ? "4mm" : margins === "compact" ? "12mm" : margins === "wide" ? "24mm" : "18mm";
  const baseFontSize = textSize === "small" ? "11px" : textSize === "large" ? "13.5px" : "12.5px";

  // Thermal 80mm layout
  if (isThermal) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${escapeHtml(invoice.invoice_no)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      padding: ${paddingSize};
      width: ${sheetWidth};
      margin: 0 auto;
    }
    @page { size: 80mm auto; margin: 0; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .right { text-align: right; }
    .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th, td { padding: 3px 0; }
    .badge { border: 1px solid #000; padding: 2px 6px; display: inline-block; font-size: 10px; margin-top: 4px; }
  </style>
</head>
<body onload="window.focus();">
  <div class="center">
    ${showLogo && logoUrl ? `<img src="${escapeHtml(logoUrl)}" style="max-height: 40px; margin-bottom: 4px;" alt="Logo" /><br/>` : ""}
    ${showSchoolName ? `<div class="bold" style="font-size: 13px;">${escapeHtml(school.name)}</div>` : ""}
    ${showAddress && school.address ? `<div>${escapeHtml(school.address)}</div>` : ""}
    ${showPhone && schoolPhone ? `<div>Tel: ${escapeHtml(schoolPhone)}</div>` : ""}
    <div class="bold" style="margin-top: 4px; font-size: 12px;">FEE INVOICE</div>
    <div class="badge">${statusLabel}</div>
  </div>
  <div class="divider"></div>

  ${showInvNumDate ? `
  <div>Invoice #: <span class="bold">${escapeHtml(invoice.invoice_no)}</span></div>
  <div>Date: ${escapeHtml(formattedInvoiceDate)} | Due: ${escapeHtml(formattedDueDate)}</div>
  ${showBillingPeriod ? `<div>Period: ${escapeHtml(invoice.billing_period || "Term")}</div>` : ""}
  ` : ""}

  ${showStudentDetails ? `
  <div class="divider"></div>
  <div>Student: <span class="bold">${escapeHtml(invoice.student_name)}</span></div>
  <div>Adm #: ${escapeHtml(invoice.admission_no)} | Class: ${escapeHtml(invoice.class_name)} ${invoice.section_name ? escapeHtml(invoice.section_name) : ""}</div>
  ${(showParentName && invoice.guardian_name) ? `<div>Parent: ${escapeHtml(invoice.guardian_name)}</div>` : ""}
  ` : ""}

  <div class="double-divider"></div>
  ${showBreakdown ? `
  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th style="text-align: left;">Particulars</th>
        <th class="right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems.map((item, idx) => {
        const itemAmount = item.net_paise ?? item.net_amount_paise ?? item.gross_amount_paise ?? 0;
        return `
      <tr>
        <td>${idx + 1}. ${escapeHtml(item.fee_head_name)}</td>
        <td class="right">${fmt(itemAmount)}</td>
      </tr>`;
      }).join("")}
    </tbody>
  </table>
  <div class="divider"></div>
  ` : ""}

  <table>
    ${showTotalFee ? `<tr><td>Total Fees:</td><td class="right">${fmt(totalFeesPaise)}</td></tr>` : ""}
    ${showDiscount && discountPaise > 0 ? `<tr><td>Approved Concessions:</td><td class="right">-${fmt(discountPaise)}</td></tr>` : ""}
    ${showPrevDues && prevDuesPaise > 0 ? `<tr><td>Previous Balance:</td><td class="right">${fmt(prevDuesPaise)}</td></tr>` : ""}
    ${showOverdues && overduePaise > 0 ? `<tr><td style="color: #666;">Overdue Amount (Incl.):</td><td class="right" style="color: #666;">${fmt(overduePaise)}</td></tr>` : ""}
    <tr class="bold" style="font-size: 12px; border-top: 1px solid #000;">
      <td>Amount Payable:</td>
      <td class="right">₹ ${fmt(totalWithDuesPaise)}</td>
    </tr>
    ${showReceived && receivedPaise > 0 ? `<tr><td>Amount Received:</td><td class="right">₹ ${fmt(receivedPaise)}</td></tr>` : ""}
    ${showBalance ? `
    <tr class="bold">
      <td>Balance Due:</td>
      <td class="right">₹ ${fmt(balancePaise)}</td>
    </tr>` : ""}
  </table>

  ${showAmountWords ? `
  <div class="divider"></div>
  <div style="font-size: 9.5px;">Amount in Words: ${escapeHtml(wordsText)}</div>
  ` : ""}

  <div class="divider"></div>
  <div class="center" style="font-size: 9px; margin-top: 6px;">
    ${showDesc ? `<div>${escapeHtml(settings?.invoice_notes || "Payment due within 15 days of issue.")}</div>` : ""}
    ${signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" style="max-height: 28px; margin: 4px 0;" /><br/>` : ""}
    <div class="bold">${escapeHtml(signatoryText)}</div>
    <div style="margin-top: 4px;">Thank you for your cooperation.</div>
  </div>
</body>
</html>`;
  }

  // Standard A4 / A5 Desktop and Print HTML Document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${escapeHtml(invoice.invoice_no)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: ${baseFontSize};
      line-height: 1.45;
      color: #1E293B;
      background: #F8FAFC;
      -webkit-font-smoothing: antialiased;
    }
    .print-sheet {
      width: 100%;
      max-width: ${sheetWidth};
      margin: 16px auto;
      padding: ${paddingSize};
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    @page {
      size: ${paper === "a5" ? "A5" : "A4"} ${orientation};
      margin: ${margins === "compact" ? "8mm" : margins === "wide" ? "18mm" : "12mm"};
    }
    @media print {
      body { background: #FFFFFF; }
      .print-sheet {
        margin: 0;
        padding: 0;
        border: none;
        box-shadow: none;
        max-width: 100%;
        width: 100%;
      }
      .no-print { display: none !important; }
      thead { display: ${repeatHeader ? "table-header-group" : "table-row-group"}; }
      tr { page-break-inside: avoid; }
    }

    /* Watermark for cancelled or overdue invoices */
    ${isCancelled ? `
    .watermark {
      position: absolute;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 48px;
      font-weight: 900;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #94A3B8;
      opacity: 0.12;
      pointer-events: none;
      user-select: none;
      z-index: 10;
      white-space: nowrap;
    }
    ` : ""}

    /* Header */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 2px solid ${theme.primary};
      margin-bottom: 16px;
    }
    .school-info {
      display: flex;
      gap: 14px;
      align-items: center;
    }
    .school-logo {
      width: 58px;
      height: 58px;
      border-radius: 8px;
      object-fit: contain;
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
    }
    .school-name {
      font-size: 19px;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 3px 0;
      letter-spacing: -0.2px;
    }
    .school-meta {
      font-size: 11.5px;
      color: #475569;
      margin: 0;
      line-height: 1.35;
    }
    .invoice-title-block {
      text-align: right;
    }
    .invoice-main-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: ${theme.primary};
      margin: 0 0 3px 0;
    }
    .session-badge {
      font-size: 11px;
      color: #64748B;
      font-weight: 600;
    }

    /* Two-column metadata grid */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 11.5px;
    }
    .meta-row {
      display: flex;
      margin-bottom: 4px;
    }
    .meta-label {
      width: 110px;
      color: #64748B;
      font-weight: 600;
      flex-shrink: 0;
    }
    .meta-sep {
      width: 14px;
      color: #94A3B8;
    }
    .meta-value {
      font-weight: 700;
      color: #0F172A;
    }

    /* Fee Table */
    table.fee-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 11.5px;
    }
    table.fee-table th {
      background: ${theme.tableHeaderBg};
      border-top: 1px solid ${theme.tableBorder};
      border-bottom: 1px solid ${theme.tableBorder};
      padding: 7px 10px;
      font-weight: 700;
      color: ${theme.textDark};
      text-align: left;
    }
    table.fee-table td {
      border-bottom: 1px solid #F1F5F9;
      padding: 8px 10px;
      color: #1E293B;
    }
    table.fee-table tr:nth-child(even) td {
      background: #FAFAFA;
    }
    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }

    /* Totals Summary Grid */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 14px;
    }
    .totals-card {
      width: 280px;
      font-size: 11.5px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      color: #334155;
    }
    .totals-row.payable {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
      border-top: 1.5px solid #CBD5E1;
      border-bottom: 1.5px solid #CBD5E1;
      padding: 6px 0;
      margin: 4px 0;
    }
    .totals-row.received {
      color: #16A34A;
      font-weight: 700;
    }
    .totals-row.balance {
      color: #DC2626;
      font-weight: 800;
      font-size: 12.5px;
    }

    /* Amount in words banner */
    .words-banner {
      background: ${theme.accentBg};
      border: 1px solid ${theme.accentBorder};
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 11px;
      margin-bottom: 14px;
      color: ${theme.textDark};
    }

    /* Payment & QR Section */
    .payment-qr-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .payment-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .qr-box {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Footer & Signature */
    .footer-block {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 12px;
      border-top: 1px solid #E2E8F0;
      margin-top: 14px;
      font-size: 10.5px;
    }
    .terms-block {
      max-width: 65%;
      color: #475569;
      line-height: 1.4;
    }
    .terms-block ol {
      margin: 3px 0 0 14px;
      padding: 0;
    }
    .signature-container {
      text-align: center;
      min-width: 140px;
    }
    .sig-img {
      max-height: 44px;
      margin-bottom: 4px;
      display: inline-block;
    }

    .bottom-disclaimer {
      text-align: center;
      font-size: 9.5px;
      color: #94A3B8;
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px dashed #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body onload="if(window.location.search.includes('print=true')) window.print();">

  <div class="print-sheet">
    ${isCancelled ? `<div class="watermark">VOID / CANCELLED</div>` : ""}

    <!-- Section A: School Header -->
    <div class="header-row">
      <div class="school-info">
        ${showLogo && logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(school.name)}" class="school-logo" />` : ""}
        <div>
          ${showSchoolName ? `<h1 class="school-name">${escapeHtml(school.name || "School Name")}</h1>` : ""}
          ${showAddress && school.address ? `<p class="school-meta">${escapeHtml(school.address)}</p>` : ""}
          <p class="school-meta">
            ${showPhone && schoolPhone ? `<span>📞 ${escapeHtml(schoolPhone)}</span>` : ""}
            ${showPhone && schoolPhone && showEmail && schoolEmail ? ` • ` : ""}
            ${showEmail && schoolEmail ? `<span>✉️ ${escapeHtml(schoolEmail)}</span>` : ""}
          </p>
        </div>
      </div>
      <div class="invoice-title-block">
        <div class="invoice-main-title">INVOICE</div>
        <div class="session-badge">Academic Session ${escapeHtml(invoice.academic_year_name || "2025-26")}</div>
        <div style="margin-top: 4px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}40;">
            ${statusLabel}
          </span>
        </div>
      </div>
    </div>

    <!-- Section B: Invoice & Student Details Grid -->
    <div class="meta-grid">
      <!-- Left: Student Details -->
      <div>
        ${showStudentDetails ? `
        <div class="meta-row">
          <span class="meta-label">Student Name</span>
          <span class="meta-sep">:</span>
          <span class="meta-value">${escapeHtml(invoice.student_name)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Admission No.</span>
          <span class="meta-sep">:</span>
          <span class="meta-value">${escapeHtml(invoice.admission_no)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Class & Section</span>
          <span class="meta-sep">:</span>
          <span class="meta-value">${escapeHtml(invoice.class_name)} ${invoice.section_name ? `- ${escapeHtml(invoice.section_name)}` : ""}</span>
        </div>
        ${showParentName ? `
        <div class="meta-row">
          <span class="meta-label">Parent/Guardian</span>
          <span class="meta-sep">:</span>
          <span class="meta-value">${escapeHtml(invoice.guardian_name || "Parent")}</span>
        </div>` : ""}
        ` : `<div></div>`}
      </div>

      <!-- Right: Invoice Metadata -->
      <div>
        ${showInvNumDate ? `
        <div class="meta-row">
          <span class="meta-label">Invoice No.</span>
          <span class="meta-sep">:</span>
          <span class="meta-value" style="color: ${theme.primary};">${escapeHtml(invoice.invoice_no)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Invoice Date</span>
          <span class="meta-sep">:</span>
          <span class="meta-value">${escapeHtml(formattedInvoiceDate)}</span>
        </div>
        ${showBillingPeriod ? `
        <div class="meta-row">
          <span class="meta-label">Billing Period</span>
          <span class="meta-sep">:</span>
          <span class="meta-value">${escapeHtml(invoice.billing_period || "Monthly")}</span>
        </div>` : ""}
        <div class="meta-row">
          <span class="meta-label">Due Date</span>
          <span class="meta-sep">:</span>
          <span class="meta-value" style="color: ${isOverdue ? '#DC2626' : '#0F172A'};">${escapeHtml(formattedDueDate)}</span>
        </div>
        ` : `<div></div>`}
      </div>
    </div>

    <!-- Line Items Table -->
    ${showBreakdown ? `
    <table class="fee-table">
      <thead>
        <tr>
          <th style="width: 38px;" class="text-center">#</th>
          <th>Fee Head</th>
          ${showBillingPeriod ? `<th>Billing Period</th>` : ""}
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((item, idx) => {
          const itemAmount = item.net_paise ?? item.net_amount_paise ?? item.gross_amount_paise ?? 0;
          return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            <strong>${escapeHtml(item.fee_head_name)}</strong>
            ${item.is_transport ? ` <span style="font-size: 9px; padding: 1px 4px; border-radius: 3px; background: #E0E7FF; color: #3730A3;">Transport</span>` : ""}
            ${showDesc && item.description ? `<br/><span style="font-size: 10px; color: #64748B;">${escapeHtml(item.description)}</span>` : ""}
          </td>
          ${showBillingPeriod ? `<td>${escapeHtml(invoice.billing_period || "Term")}</td>` : ""}
          <td class="text-right" style="font-weight: 600;">${fmt(itemAmount)}</td>
        </tr>`;
        }).join("")}
      </tbody>
    </table>
    ` : ""}

    <!-- Summary Section (Totals & Payment) -->
    <div class="summary-section">
      <div class="totals-card">
        ${showTotalFee ? `
        <div class="totals-row">
          <span>Total Fees</span>
          <span>${fmt(totalFeesPaise)}</span>
        </div>` : ""}
        ${showDiscount && discountPaise > 0 ? `
        <div class="totals-row">
          <span>Approved Concessions</span>
          <span style="color: #16A34A;">-${fmt(discountPaise)}</span>
        </div>` : ""}
        ${showPrevDues && prevDuesPaise > 0 ? `
        <div class="totals-row">
          <span>Previous Balance</span>
          <span>${fmt(prevDuesPaise)}</span>
        </div>` : ""}
        ${showOverdues && overduePaise > 0 ? `
        <div class="totals-row" style="font-size: 11px; color: #DC2626;">
          <span>Overdue Amount (of dues)</span>
          <span style="font-weight: 600;">${fmt(overduePaise)}</span>
        </div>` : ""}
        <div class="totals-row payable">
          <span>Amount Payable</span>
          <span>₹ ${fmt(totalWithDuesPaise)}</span>
        </div>
        ${showReceived ? `
        <div class="totals-row received">
          <span>Amount Received</span>
          <span>${fmt(receivedPaise)}</span>
        </div>` : ""}
        ${showBalance ? `
        <div class="totals-row balance">
          <span>Balance Due</span>
          <span>₹ ${fmt(balancePaise)}</span>
        </div>` : ""}
        ${showCurrentBalance && currentStudentBalancePaise !== balancePaise ? `
        <div class="totals-row" style="font-size: 10.5px; color: #64748B; border-top: 1px dashed #CBD5E1; padding-top: 3px; margin-top: 3px;">
          <span>Current Account Balance</span>
          <span>₹ ${fmt(currentStudentBalancePaise)}</span>
        </div>` : ""}
      </div>
    </div>

    <!-- Amount in Words -->
    ${showAmountWords ? `
    <div class="words-banner">
      <strong>Amount in Words:</strong> ${escapeHtml(wordsText)}
    </div>` : ""}

    <!-- Payment details & Scan to Pay QR -->
    ${showPaymentMode ? `
    <div class="payment-qr-grid">
      <div class="payment-box">
        <div style="font-weight: 700; margin-bottom: 4px; color: #0F172A;">Payment Mode & Receipt Info</div>
        <div>Payment Mode : <strong>${escapeHtml((invoice.payment_mode || "UPI / Counter").toUpperCase())}</strong></div>
        ${invoice.transaction_id ? `<div>Transaction ID : <strong>${escapeHtml(invoice.transaction_id)}</strong></div>` : ""}
        <div>Payment Date : <strong>${escapeHtml(invoice.payment_date || formattedInvoiceDate)}</strong></div>
      </div>
      <div class="qr-box">
        <!-- Compact SVG QR Code Mock Representation -->
        <svg width="48" height="48" viewBox="0 0 100 100" style="flex-shrink: 0;">
          <rect width="100" height="100" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="4" />
          <rect x="10" y="10" width="26" height="26" fill="#0f172a" rx="2" />
          <rect x="15" y="15" width="16" height="16" fill="#ffffff" />
          <rect x="19" y="19" width="8" height="8" fill="#0f172a" />
          <rect x="64" y="10" width="26" height="26" fill="#0f172a" rx="2" />
          <rect x="69" y="15" width="16" height="16" fill="#ffffff" />
          <rect x="73" y="19" width="8" height="8" fill="#0f172a" />
          <rect x="10" y="64" width="26" height="26" fill="#0f172a" rx="2" />
          <rect x="15" y="69" width="16" height="16" fill="#ffffff" />
          <rect x="19" y="73" width="8" height="8" fill="#0f172a" />
          <circle cx="50" cy="50" r="8" fill="#0f172a" />
        </svg>
        <div>
          <div style="font-weight: 700; color: #0F172A;">Scan to Pay</div>
          <div style="font-size: 10px; color: #64748B;">UPI ID: <strong>${escapeHtml(upiId)}</strong></div>
          <div style="font-size: 9.5px; color: #475569; margin-top: 2px;">GPay • PhonePe • Paytm • BHIM</div>
        </div>
      </div>
    </div>` : ""}

    <!-- Footer & Signature Block -->
    <div class="footer-block">
      <div class="terms-block">
        ${showTerms ? `
        <div style="font-weight: 700; color: #0F172A; margin-bottom: 2px;">Terms & Conditions:</div>
        <ol>
          ${termsList.map(t => `<li>${escapeHtml(t)}</li>`).join("")}
        </ol>
        ` : `<div></div>`}
      </div>

      <div class="signature-container">
        ${signatureUrl ? `
          <img src="${escapeHtml(signatureUrl)}" alt="Signature" class="sig-img" /><br/>
        ` : `
          <div style="height: 36px; border-bottom: 1px solid #CBD5E1; margin-bottom: 4px;"></div>
        `}
        <div style="font-weight: 700; color: #0F172A; text-transform: capitalize;">${escapeHtml(signatoryText)}</div>
      </div>
    </div>

    <!-- Bottom Disclaimer -->
    <div class="bottom-disclaimer">
      <span>This is a computer generated invoice.</span>
      ${showPageNumbers ? `<span>Page 1 of 1</span>` : `<span></span>`}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers native browser print preview with configured styles.
 */
export function printInvoiceHTML(html: string): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.warn("Print error:", err);
      }
    }, 350);
  }
}

/**
 * Triggers PDF download using a clean HTML blob document.
 */
export function downloadInvoicePDF(invoiceNo: string, html: string): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.warn("Print trigger notice:", err);
      }
    }, 350);
  }
}
