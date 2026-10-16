/**
 * Invoice Template Generator
 * Generates print/PDF HTML for official School Fee Invoices.
 * 
 * Features:
 * - Professional header with school branding, affiliation, contact
 * - Student and parent credentials (Admission No, Class, Section, Guardian)
 * - Clear separation of Tuition/Academic fees and Transport fees
 * - Itemized fee components, concessions, late fee adjustments
 * - Payment history with linked receipt references
 * - Amount in words (Indian numbering system)
 * - Watermarks for status (PAID, OVERDUE, VOID)
 * - Print-optimized CSS (@media print)
 */

import { amountInWords, formatPaise } from './amountInWords';
import type { StudentInvoice } from '../types/fees';

export interface SchoolInvoiceBranding {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  affiliation_no?: string;
  logo_url?: string;
  bank_details?: {
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    upi_id?: string;
  };
}

export function generateInvoiceHTML(
  invoice: StudentInvoice,
  school: SchoolInvoiceBranding
): string {
  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue';
  const isCancelled = invoice.status === 'cancelled';
  const isPartial = invoice.status === 'partial';

  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const invoiceDateStr = formattedDate(invoice.invoice_date);
  const dueDateStr = formattedDate(invoice.due_date);

  // Group line items: Tuition/Academic vs Transport vs Late Fee
  const academicItems = invoice.line_items.filter(i => !i.is_transport && i.source !== 'late_fee');
  const transportItems = invoice.line_items.filter(i => i.is_transport);
  const lateFeeItems = invoice.line_items.filter(i => i.source === 'late_fee');

  const statusBadgeColor = isPaid
    ? { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', label: 'PAID' }
    : isOverdue
    ? { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'OVERDUE' }
    : isCancelled
    ? { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db', label: 'CANCELLED / VOID' }
    : isPartial
    ? { bg: '#fffbeb', text: '#92400e', border: '#fde68a', label: 'PARTIALLY PAID' }
    : { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', label: 'UNPAID' };

  let watermarkText = '';
  if (isCancelled) watermarkText = 'VOID / CANCELLED';
  else if (isPaid) watermarkText = 'PAID IN FULL';
  else if (isOverdue) watermarkText = 'OVERDUE';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${invoice.invoice_no}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #1e293b;
      background: #f8fafc;
      -webkit-font-smoothing: antialiased;
    }
    .print-sheet {
      width: 100%;
      max-width: 210mm;
      margin: 20px auto;
      padding: 28px 36px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .print-sheet {
        margin: 0;
        padding: 16mm 18mm;
        border: none;
        box-shadow: none;
        max-width: 100%;
        width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }

    /* Watermark */
    .watermark {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 54px;
      font-weight: 800;
      letter-spacing: 4px;
      text-transform: uppercase;
      opacity: 0.07;
      pointer-events: none;
      user-select: none;
      z-index: 1;
      white-space: nowrap;
      color: ${isCancelled ? '#000' : isPaid ? '#10b981' : '#ef4444'};
    }

    /* Header */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .school-info {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .school-logo {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      object-fit: cover;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .school-name {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .school-meta {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }
    .invoice-title-block {
      text-align: right;
    }
    .invoice-main-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: ${statusBadgeColor.bg};
      color: ${statusBadgeColor.text};
      border: 1px solid ${statusBadgeColor.border};
    }

    /* Meta Details Grid */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .details-col h4 {
      margin: 0 0 8px 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
    }
    .details-row {
      display: flex;
      margin-bottom: 4px;
      font-size: 12.5px;
    }
    .details-label {
      width: 120px;
      color: #64748b;
      font-weight: 500;
      flex-shrink: 0;
    }
    .details-value {
      color: #0f172a;
      font-weight: 600;
    }

    /* Line Items Table */
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      margin: 18px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title span.tag {
      font-size: 10px;
      padding: 2px 6px;
      background: #e2e8f0;
      border-radius: 4px;
      color: #475569;
      font-weight: 600;
    }
    table.invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.invoice-table th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-size: 11.5px;
      font-weight: 600;
      text-transform: uppercase;
      color: #475569;
      text-align: left;
    }
    table.invoice-table td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      font-size: 12.5px;
      color: #1e293b;
    }
    table.invoice-table tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .num { font-variant-numeric: tabular-nums; }

    /* Totals Summary */
    .summary-wrap {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 14px;
      gap: 20px;
    }
    .words-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .words-title {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .words-content {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.4;
    }
    .calc-box {
      width: 280px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      font-size: 12.5px;
      border-bottom: 1px solid #f1f5f9;
    }
    .calc-row.total-row {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      font-size: 13.5px;
      border-bottom: none;
    }
    .calc-row.paid-row {
      background: #f0fdf4;
      color: #166534;
      font-weight: 600;
    }
    .calc-row.due-row {
      background: #fef2f2;
      color: #991b1b;
      font-weight: 700;
      font-size: 14px;
    }

    /* Payments History Table */
    .payment-history-wrap {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
    }

    /* Footer & Signatures */
    .footer-section {
      margin-top: 36px;
      padding-top: 18px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .terms-box {
      max-width: 58%;
      font-size: 11px;
      color: #64748b;
      line-height: 1.45;
    }
    .terms-box ol {
      margin: 4px 0 0 16px;
      padding: 0;
    }
    .signature-box {
      text-align: center;
      width: 180px;
    }
    .signature-line {
      border-bottom: 1px solid #334155;
      height: 40px;
      margin-bottom: 6px;
    }
    .signature-label {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
    }

    .print-bar {
      max-width: 210mm;
      margin: 16px auto 0 auto;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #1e293b;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: #2563eb;
      color: #fff;
      border-color: #1d4ed8;
    }
  </style>
</head>
<body>

  <div class="print-bar no-print">
    <button class="btn" onclick="window.close()">Close</button>
    <button class="btn btn-primary" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      Print / Save PDF
    </button>
  </div>

  <div class="print-sheet">
    ${watermarkText ? `<div class="watermark">${watermarkText}</div>` : ''}

    <!-- Header -->
    <div class="header-row">
      <div class="school-info">
        ${school.logo_url ? `<img src="${school.logo_url}" alt="${school.name}" class="school-logo" />` : ''}
        <div>
          <h1 class="school-name">${school.name || 'School Name'}</h1>
          <p class="school-meta">
            ${school.affiliation_no ? `Affiliation / Reg: <strong>${school.affiliation_no}</strong> • ` : ''}
            ${school.phone ? `Phone: ${school.phone}` : ''}
          </p>
          ${school.address ? `<p class="school-meta">${school.address}</p>` : ''}
        </div>
      </div>
      <div class="invoice-title-block">
        <h2 class="invoice-main-title">FEE INVOICE</h2>
        <span class="badge">${statusBadgeColor.label}</span>
      </div>
    </div>

    <!-- Details Grid -->
    <div class="details-grid">
      <div class="details-col">
        <h4>Student Information</h4>
        <div class="details-row">
          <span class="details-label">Student Name:</span>
          <span class="details-value">${invoice.student_name}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Admission No:</span>
          <span class="details-value">${invoice.admission_no}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Class & Section:</span>
          <span class="details-value">${invoice.class_name} ${invoice.section_name ? `(${invoice.section_name})` : ''}</span>
        </div>
        ${invoice.guardian_name ? `
        <div class="details-row">
          <span class="details-label">Parent / Guardian:</span>
          <span class="details-value">${invoice.guardian_name}</span>
        </div>` : ''}
        ${invoice.guardian_phone ? `
        <div class="details-row">
          <span class="details-label">Contact:</span>
          <span class="details-value">${invoice.guardian_phone}</span>
        </div>` : ''}
      </div>

      <div class="details-col">
        <h4>Invoice Metadata</h4>
        <div class="details-row">
          <span class="details-label">Invoice No:</span>
          <span class="details-value" style="color: #2563eb;">${invoice.invoice_no}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Billing Period:</span>
          <span class="details-value">${invoice.billing_period || 'Regular Term'}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Invoice Date:</span>
          <span class="details-value">${invoiceDateStr}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Due Date:</span>
          <span class="details-value" style="${isOverdue ? 'color: #dc2626;' : ''}">${dueDateStr}</span>
        </div>
        ${invoice.academic_year_name ? `
        <div class="details-row">
          <span class="details-label">Academic Year:</span>
          <span class="details-value">${invoice.academic_year_name}</span>
        </div>` : ''}
      </div>
    </div>

    <!-- Academic Fee Components Table -->
    <div class="section-title">
      Tuition & Academic Fee Components
      <span class="tag">${academicItems.length} heads</span>
    </div>
    <table class="invoice-table">
      <thead>
        <tr>
          <th style="width: 36px;" class="text-center">#</th>
          <th>Fee Head</th>
          <th style="width: 110px;" class="text-right">Gross (₹)</th>
          <th style="width: 110px;" class="text-right">Concession (₹)</th>
          <th style="width: 120px;" class="text-right">Net Payable (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${academicItems.length === 0 ? `
          <tr>
            <td colspan="5" class="text-center" style="color: #64748b; padding: 12px;">No academic fee components.</td>
          </tr>
        ` : academicItems.map((item, idx) => `
          <tr>
            <td class="text-center num">${idx + 1}</td>
            <td>
              <strong>${item.fee_head_name}</strong>
              ${item.description ? `<div style="font-size: 11px; color: #64748b;">${item.description}</div>` : ''}
            </td>
            <td class="text-right num">${formatPaise(item.gross_paise)}</td>
            <td class="text-right num" style="color: #16a34a;">${item.concession_paise ? `(${formatPaise(item.concession_paise)})` : '—'}</td>
            <td class="text-right num" style="font-weight: 600;">${formatPaise(item.net_paise)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Transport Fee Table (Separated as required by Rule 6) -->
    ${transportItems.length > 0 ? `
      <div class="section-title" style="margin-top: 20px;">
        Transport Charges (Route & Bus Facility)
        <span class="tag" style="background: #fef3c7; color: #92400e;">Transport Line Item</span>
      </div>
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width: 36px;" class="text-center">#</th>
            <th>Service Details / Route Assignment</th>
            <th style="width: 110px;" class="text-right">Gross (₹)</th>
            <th style="width: 110px;" class="text-right">Concession (₹)</th>
            <th style="width: 120px;" class="text-right">Net Payable (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${transportItems.map((item, idx) => `
            <tr>
              <td class="text-center num">${idx + 1}</td>
              <td>
                <strong>${item.fee_head_name}</strong>
                <div style="font-size: 11px; color: #64748b;">
                  ${item.description || 'Assigned school route pick-up & drop service'}
                </div>
              </td>
              <td class="text-right num">${formatPaise(item.gross_paise)}</td>
              <td class="text-right num" style="color: #16a34a;">${item.concession_paise ? `(${formatPaise(item.concession_paise)})` : '—'}</td>
              <td class="text-right num" style="font-weight: 600;">${formatPaise(item.net_paise)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Late Fee Item if present -->
    ${lateFeeItems.length > 0 ? `
      <div class="section-title" style="margin-top: 14px; color: #b91c1c;">
        Applicable Late Fine / Arrears
      </div>
      <table class="invoice-table">
        <tbody>
          ${lateFeeItems.map((item, idx) => `
            <tr>
              <td class="text-center num" style="width: 36px;">${idx + 1}</td>
              <td><strong>${item.fee_head_name}</strong></td>
              <td class="text-right num" style="width: 110px;">${formatPaise(item.gross_paise)}</td>
              <td class="text-right num" style="width: 110px;">—</td>
              <td class="text-right num" style="width: 120px; font-weight: 600; color: #b91c1c;">${formatPaise(item.net_paise)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Summary Box & In Words -->
    <div class="summary-wrap">
      <div class="words-box">
        <div class="words-title">Amount In Words</div>
        <div class="words-content">
          ${amountInWords(invoice.balance_paise > 0 ? invoice.balance_paise : invoice.total_paise)} only
        </div>
        ${invoice.balance_paise > 0 && invoice.paid_paise > 0 ? `
          <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
            (Words describe remaining balance due)
          </div>
        ` : ''}
      </div>

      <div class="calc-box">
        <div class="calc-row">
          <span>Gross Total:</span>
          <span class="num">${formatPaise(invoice.gross_paise)}</span>
        </div>
        ${invoice.concession_paise > 0 ? `
        <div class="calc-row" style="color: #16a34a;">
          <span>Concessions / Waivers:</span>
          <span class="num">- ${formatPaise(invoice.concession_paise)}</span>
        </div>` : ''}
        ${invoice.transport_paise > 0 ? `
        <div class="calc-row" style="color: #92400e; font-size: 12px;">
          <span>Included Transport Fee:</span>
          <span class="num">${formatPaise(invoice.transport_paise)}</span>
        </div>` : ''}
        ${invoice.late_fee_paise > 0 ? `
        <div class="calc-row" style="color: #b91c1c;">
          <span>Late Fees / Fines:</span>
          <span class="num">+ ${formatPaise(invoice.late_fee_paise)}</span>
        </div>` : ''}
        <div class="calc-row total-row">
          <span>Total Invoiced:</span>
          <span class="num">${formatPaise(invoice.total_paise)}</span>
        </div>
        <div class="calc-row paid-row">
          <span>Total Paid:</span>
          <span class="num">${formatPaise(invoice.paid_paise)}</span>
        </div>
        <div class="calc-row due-row">
          <span>Balance Due:</span>
          <span class="num">${formatPaise(invoice.balance_paise)}</span>
        </div>
      </div>
    </div>

    <!-- Payments History / Receipts Section -->
    ${invoice.payments.length > 0 ? `
      <div class="payment-history-wrap">
        <div class="section-title">
          Linked Payment Receipts
          <span class="tag" style="background: #dcfce7; color: #15803d;">${invoice.payments.length} payment(s) recorded</span>
        </div>
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Date</th>
              <th>Payment Mode</th>
              <th>Collector</th>
              <th class="text-right">Amount Paid (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.payments.map(p => `
              <tr>
                <td><strong style="color: #2563eb;">${p.receipt_no}</strong></td>
                <td>${formattedDate(p.receipt_date)}</td>
                <td style="text-transform: capitalize;">${p.payment_mode || 'Cash'}</td>
                <td>${p.collected_by_name || 'Accounts Desk'}</td>
                <td class="text-right num" style="font-weight: 600; color: #166534;">${formatPaise(p.amount_paise)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- Footer & Terms -->
    <div class="footer-section">
      <div class="terms-box">
        <strong>Terms & Payment Instructions:</strong>
        <ol>
          <li>Please remit the balance fee on or before the due date (${dueDateStr}) to avoid late fine.</li>
          <li>Fees once paid are non-refundable unless covered by specific school refund policies.</li>
          <li>This is a computer-generated invoice and requires no physical seal if digitally authenticated.</li>
        </ol>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Authorized Signatory / Accounts</div>
      </div>
    </div>

  </div>

</body>
</html>`;
}
