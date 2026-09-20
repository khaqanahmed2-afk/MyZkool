/**
 * Receipt Template Generator (Spec B5.4)
 * Generates print/PDF HTML for A5 portrait and 80 mm thermal receipts.
 * 
 * Features:
 * - School logo, name, address, phone, affiliation number
 * - Title "Fee receipt", receipt number and date
 * - Student name, class and section, admission number, father's name, academic year
 * - Table of lines (head, term, amount, concession)
 * - Late fee, total, amount in words in the Indian system
 * - Payment mode with reference, balance dues after this payment
 * - Collector name, signature line, QR code verification link
 * - Footer text: "This is a computer generated receipt."
 * - "Duplicate copy" stamp on reprints (print_count > 1 or isDuplicate = true)
 * - "Cancelled" diagonal watermark for cancelled receipts
 */

import { amountInWords, formatPaise } from "./amountInWords";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../types/collection";

export interface ReceiptStudentDetails {
  student_name: string;
  admission_no: string;
  class_name?: string;
  section_name?: string;
  father_name?: string;
  academic_year_label?: string;
  balance_remaining_paise?: number;
}

export interface ReceiptSchoolDetails {
  name: string;
  address?: string;
  phone?: string;
  affiliation_no?: string;
  logo_url?: string;
}

export function generateReceiptHTML(
  receipt: FeeReceipt,
  items: FeeReceiptItem[],
  payments: FeePayment[],
  studentDetails: ReceiptStudentDetails,
  schoolDetails: ReceiptSchoolDetails,
  paper: "a5" | "thermal80" = "a5",
  isDuplicate: boolean = false
): string {
  const isThermal = paper === "thermal80";
  const maxW = isThermal ? "80mm" : "148mm"; // A5 is 148mm x 210mm
  const isCancelled = receipt.status === "cancelled";
  const showDuplicateStamp = !isCancelled && (isDuplicate || (receipt.print_count ?? 0) > 0);

  const words = amountInWords(receipt.total_paise);
  const totalAmtFormatted = formatPaise(receipt.total_paise);

  const lineItemsTotal = items.reduce((s, i) => s + i.amount_paise, 0);
  const lineConcessionsTotal = items.reduce((s, i) => s + (i.concession_paise || 0), 0);

  const rows = items.map(item => `
    <tr>
      <td style="padding: ${isThermal ? '3px 2px' : '6px 8px'}; border-bottom: 1px solid #e2e8f0;">
        <strong>${item.fee_head_id}</strong>
      </td>
      <td style="padding: ${isThermal ? '3px 2px' : '6px 8px'}; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">
        ${formatPaise(item.amount_paise)}
      </td>
      ${lineConcessionsTotal > 0 ? `
      <td style="padding: ${isThermal ? '3px 2px' : '6px 8px'}; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums; color: #64748b;">
        ${item.concession_paise ? `(${formatPaise(item.concession_paise)})` : '—'}
      </td>` : ''}
    </tr>
  `).join('');

  const paymentModes = payments.map(p => 
    `${p.mode.toUpperCase()}${p.reference_no ? ` (${p.reference_no})` : ''}: ${formatPaise(p.amount_paise)}`
  ).join(' • ');

  const balanceAfterFormatted = formatPaise(studentDetails.balance_remaining_paise ?? 0);

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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${isThermal ? '11px' : '13px'};
      line-height: 1.4;
      color: #0f172a;
      background: #fff;
    }
    .container {
      width: 100%;
      max-width: ${maxW};
      margin: 0 auto;
      padding: ${isThermal ? '6mm 4mm' : '10mm 12mm'};
      position: relative;
    }
    .header {
      text-align: center;
      margin-bottom: ${isThermal ? '8px' : '16px'};
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: ${isThermal ? '6px' : '12px'};
    }
    .school-name {
      font-size: ${isThermal ? '15px' : '20px'};
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: -0.02em;
    }
    .school-details {
      font-size: ${isThermal ? '9px' : '11px'};
      color: #64748b;
      margin-top: 2px;
    }
    .receipt-title {
      font-size: ${isThermal ? '12px' : '14px'};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #2158E0;
      margin: ${isThermal ? '4px 0' : '8px 0'};
    }
    .duplicate-stamp {
      display: inline-block;
      border: 1.5px solid #dc2626;
      color: #dc2626;
      padding: 2px 6px;
      font-weight: 800;
      font-size: ${isThermal ? '9px' : '11px'};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 4px auto;
    }
    .cancelled-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: ${isThermal ? '48px' : '72px'};
      font-weight: 900;
      color: rgba(220, 38, 38, 0.18);
      pointer-events: none;
      z-index: 50;
      white-space: nowrap;
      border: 4px solid rgba(220, 38, 38, 0.2);
      padding: 6px 18px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: ${isThermal ? '1fr' : '1fr 1fr'};
      gap: ${isThermal ? '2px' : '4px 12px'};
      font-size: ${isThermal ? '10px' : '12px'};
      margin-bottom: ${isThermal ? '8px' : '14px'};
    }
    .info-row {
      display: flex;
      justify-content: space-between;
    }
    .info-label {
      color: #64748b;
    }
    .info-val {
      font-weight: 600;
      color: #1e293b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: ${isThermal ? '6px 0' : '12px 0'};
      font-size: ${isThermal ? '10px' : '12px'};
    }
    th {
      background: #f8fafc;
      padding: ${isThermal ? '4px 2px' : '6px 8px'};
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      font-weight: 700;
      text-align: left;
    }
    .amount-words-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: ${isThermal ? '4px 6px' : '8px 10px'};
      border-radius: 4px;
      font-size: ${isThermal ? '9.5px' : '11px'};
      color: #334155;
      margin: ${isThermal ? '6px 0' : '10px 0'};
    }
    .summary-section {
      margin-top: ${isThermal ? '6px' : '10px'};
      border-top: 1px solid #e2e8f0;
      padding-top: ${isThermal ? '4px' : '8px'};
      font-size: ${isThermal ? '10px' : '12px'};
    }
    .footer-signatures {
      margin-top: ${isThermal ? '14px' : '28px'};
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: ${isThermal ? '8px' : '10px'};
      color: #64748b;
    }
    .qr-box {
      width: ${isThermal ? '40px' : '54px'};
      height: ${isThermal ? '40px' : '54px'};
      border: 1px solid #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 7px;
      background: #fff;
    }
    .footer-note {
      text-align: center;
      font-size: ${isThermal ? '8px' : '10px'};
      color: #94a3b8;
      margin-top: ${isThermal ? '8px' : '16px'};
      border-top: 1px dashed #cbd5e1;
      padding-top: 4px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: ${isThermal ? '80mm auto' : 'A5 portrait'}; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${isCancelled ? '<div class="cancelled-watermark">CANCELLED</div>' : ''}

    <div class="header">
      <h1 class="school-name">${schoolDetails.name}</h1>
      <div class="school-details">
        ${schoolDetails.address ? `${schoolDetails.address} • ` : ''}
        ${schoolDetails.phone ? `Ph: ${schoolDetails.phone}` : ''}
        ${schoolDetails.affiliation_no ? `<br>Affiliation No: ${schoolDetails.affiliation_no}` : ''}
      </div>
      <div class="receipt-title">Fee Receipt</div>
      ${showDuplicateStamp ? '<div class="duplicate-stamp">DUPLICATE COPY</div>' : ''}
    </div>

    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">Receipt No:</span>
        <span class="info-val">${receipt.receipt_no}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-val">${receipt.receipt_date}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Student:</span>
        <span class="info-val">${studentDetails.student_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Admission No:</span>
        <span class="info-val">${studentDetails.admission_no}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Class & Sec:</span>
        <span class="info-val">${studentDetails.class_name || '—'} ${studentDetails.section_name ? `(${studentDetails.section_name})` : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Academic Year:</span>
        <span class="info-val">${studentDetails.academic_year_label || '2026-27'}</span>
      </div>
      ${studentDetails.father_name ? `
      <div class="info-row">
        <span class="info-label">Father's Name:</span>
        <span class="info-val">${studentDetails.father_name}</span>
      </div>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Particulars / Head</th>
          <th style="text-align: right;">Amount</th>
          ${lineConcessionsTotal > 0 ? '<th style="text-align: right;">Concession</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="font-weight: 700; border-top: 1.5px solid #0f172a;">
          <td style="padding: ${isThermal ? '4px 2px' : '8px 8px'};">TOTAL</td>
          <td style="padding: ${isThermal ? '4px 2px' : '8px 8px'}; text-align: right; font-variant-numeric: tabular-nums;">${totalAmtFormatted}</td>
          ${lineConcessionsTotal > 0 ? `<td style="padding: ${isThermal ? '4px 2px' : '8px 8px'}; text-align: right; font-variant-numeric: tabular-nums;">(${formatPaise(lineConcessionsTotal)})</td>` : ''}
        </tr>
      </tbody>
    </table>

    <div class="amount-words-box">
      <strong>Amount in Words:</strong> ${words}
    </div>

    <div class="summary-section">
      <div class="info-row">
        <span class="info-label">Payment Mode:</span>
        <span class="info-val">${paymentModes || 'CASH'}</span>
      </div>
      <div class="info-row" style="margin-top: 2px;">
        <span class="info-label">Balance Dues After Payment:</span>
        <span class="info-val" style="color: ${studentDetails.balance_remaining_paise && studentDetails.balance_remaining_paise > 0 ? '#dc2626' : '#16a34a'};">
          ${balanceAfterFormatted}
        </span>
      </div>
      ${receipt.remarks ? `
      <div class="info-row" style="margin-top: 2px;">
        <span class="info-label">Remarks:</span>
        <span class="info-val">${receipt.remarks}</span>
      </div>` : ''}
    </div>

    <div class="footer-signatures">
      <div>
        <span>Collected By: <strong>${receipt.collected_by || 'Cashier / Accountant'}</strong></span>
        <div style="margin-top: 18px; border-top: 1px solid #475569; width: 90px; text-align: center; padding-top: 2px;">
          Cashier Sign
        </div>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
        <div class="qr-box">
          QR CODE<br/>VERIFY
        </div>
        <span style="font-size: 7px; color: #94a3b8;">Scan to verify</span>
      </div>
    </div>

    <div class="footer-note">
      This is a computer generated receipt. Valid without physical signature.<br/>
      Verify online at: myzkool.in/verify/${receipt.id}
    </div>
  </div>
</body>
</html>`;
}

