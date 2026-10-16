import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Calendar,
  Clock,
  User,
  CreditCard,
  Ban,
  FileText,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { formatPaise } from "../../../lib/amountInWords";
import { generateReceiptHTML } from "../../../lib/receiptTemplate";
import { cancelReceipt, getReceiptById } from "../../../services/collectionService";
import { useAuth } from "../../../context/AuthContext";
import type { EnrichedTransaction } from "../../../services/feeCollectionsQueryService";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../../../types/collection";

interface ReceiptDetailsModalProps {
  transaction: EnrichedTransaction | null;
  onClose: () => void;
  onCancelled?: () => void;
  initialCancelOpen?: boolean;
}

export function ReceiptDetailsModal({
  transaction,
  onClose,
  onCancelled,
  initialCancelOpen = false,
}: ReceiptDetailsModalProps) {
  const { schoolId, user, school } = useAuth();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(initialCancelOpen);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Real database items and payments
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [realReceipt, setRealReceipt] = useState<FeeReceipt | null>(null);
  const [realItems, setRealItems] = useState<FeeReceiptItem[]>([]);
  const [realPayments, setRealPayments] = useState<FeePayment[]>([]);

  useEffect(() => {
    setIsCancelConfirmOpen(initialCancelOpen);
    setCancelReason("");
    setCancelError(null);
  }, [initialCancelOpen, transaction?.id]);

  useEffect(() => {
    if (!schoolId || !transaction?.receipt_id) return;
    let isMounted = true;
    setIsLoadingDetails(true);

    getReceiptById(schoolId, transaction.receipt_id)
      .then((res) => {
        if (!isMounted) return;
        if (res.receipt) setRealReceipt(res.receipt);
        if (res.items) setRealItems(res.items);
        if (res.payments) setRealPayments(res.payments);
      })
      .catch((err) => {
        console.warn("Failed to load real receipt items:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [schoolId, transaction?.receipt_id]);

  if (!transaction) return null;

  const isCancelled = transaction.status === "refunded" || realReceipt?.status === "cancelled";

  const handlePrint = () => {
    const receiptToUse: FeeReceipt = realReceipt || {
      id: transaction.receipt_id,
      school_id: schoolId || "",
      receipt_no: transaction.receipt_no,
      student_id: transaction.student_id,
      academic_year_id: transaction.academic_year_id || "2026-2027",
      receipt_date: transaction.receipt_date,
      total_paise: transaction.amount_paise,
      status: isCancelled ? "cancelled" : "active",
      source: transaction.payment_method === "online" ? "online" : "counter",
      payment_group_id: null,
      collected_by: transaction.collected_by_name || null,
      remarks: transaction.remarks || null,
      idempotency_key: null,
      print_count: 1,
      whatsapp_sent_at: null,
      cancelled_by: null,
      cancelled_at: null,
      cancel_reason: null,
      created_at: transaction.created_at,
      updated_at: transaction.created_at,
    };

    const itemsToUse: FeeReceiptItem[] =
      realItems.length > 0
        ? realItems
        : transaction.invoice_numbers.map((inv, idx) => ({
            id: `it-${idx}`,
            receipt_id: transaction.receipt_id,
            due_id: `due-${idx}`,
            fee_head_id: "Tuition / Term Fee",
            amount_paise: Math.round(transaction.amount_paise / (transaction.invoice_numbers.length || 1)),
            concession_paise: 0,
          }));

    const paymentsToUse: FeePayment[] =
      realPayments.length > 0
        ? realPayments
        : [
            {
              id: `pay-${transaction.id}`,
              school_id: schoolId || "",
              receipt_id: transaction.receipt_id,
              mode: transaction.payment_method,
              amount_paise: transaction.amount_paise,
              reference_no: transaction.reference_no || null,
              bank_name: null,
              instrument_no: null,
              instrument_date: null,
              cheque_status: null,
              gateway_order_id: null,
              gateway_payment_id: null,
              created_at: transaction.created_at,
            },
          ];

    const html = generateReceiptHTML(
      receiptToUse,
      itemsToUse,
      paymentsToUse,
      {
        student_name: transaction.student_name,
        admission_no: transaction.admission_no,
        class_name: transaction.class_name,
      },
      {
        name: school?.name || "Peace Convent School",
        address: school?.address || "Main Campus, Education City",
        phone: school?.contact_phone || "+91 98765 43210",
      },
      "a5"
    );

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 350);
    }
  };

  const handleDownload = () => {
    const content = `========================================
FEE RECEIPT: ${transaction.receipt_no}
========================================
School: ${school?.name || "Sunrise International School"}
Date: ${transaction.formatted_date_time}
Status: ${transaction.status.toUpperCase()}

Student: ${transaction.student_name}
Admission No: ${transaction.admission_no}
Class: ${transaction.class_name}

Linked Invoice(s): ${transaction.invoice_numbers.join(", ")}
Payment Method: ${transaction.payment_method.toUpperCase()}
Reference No: ${transaction.reference_no || "N/A"}

Total Amount Paid: ${transaction.formatted_amount}
========================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt_${transaction.receipt_no}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancelReceipt = async () => {
    if (!schoolId) return;
    if (cancelReason.trim().length < 10) {
      setCancelError("Reason must be at least 10 characters long.");
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelReceipt(
        schoolId,
        transaction.receipt_id,
        { reason: cancelReason.trim() },
        user?.id
      );
      setIsCancelConfirmOpen(false);
      onCancelled?.();
      onClose();
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel receipt.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF3] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-[#141A2E]">{transaction.receipt_no}</h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isCancelled
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-[#E8F7EE] text-[#0B7B49] border border-emerald-200"
                }`}
              >
                {isCancelled ? "Cancelled" : "Received"}
              </span>
            </div>
            <p className="text-xs text-[#5B6478] mt-0.5">{transaction.formatted_date_time}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Student Profile Card */}
          <div className="p-4 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#E8F7EE] text-[#0B7B49] font-black text-sm flex items-center justify-center shrink-0">
              {transaction.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#141A2E] truncate">{transaction.student_name}</p>
              <p className="text-xs text-[#5B6478] truncate">
                {transaction.admission_no} • Class {transaction.class_name}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
              <span className="text-gray-400 block mb-1">Amount Received</span>
              <span className="text-base font-extrabold text-[#0B7B49]">
                {transaction.formatted_amount}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
              <span className="text-gray-400 block mb-1">Payment Method</span>
              <span className="text-sm font-bold uppercase text-gray-800">
                {transaction.payment_method}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
              <span className="text-gray-400 block mb-1">Linked Invoices</span>
              <span className="text-xs font-bold text-gray-800">
                {transaction.invoice_numbers.join(", ") || "—"}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
              <span className="text-gray-400 block mb-1">Reference No / UTR</span>
              <span className="text-xs font-medium text-gray-700 truncate block">
                {transaction.reference_no || "N/A"}
              </span>
            </div>
          </div>

          {/* Fee Items Breakdown */}
          {realItems.length > 0 && (
            <div className="bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Line Items Breakdown
              </span>
              <div className="space-y-1.5 divide-y divide-gray-100">
                {realItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between pt-1.5 text-xs">
                    <span className="font-medium text-gray-700">{item.fee_head_id}</span>
                    <span className="font-bold text-gray-900">{formatPaise(item.amount_paise)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transaction.remarks && (
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs">
              <span className="text-gray-500 font-semibold block mb-0.5">Notes:</span>
              <p className="text-gray-700">{transaction.remarks}</p>
            </div>
          )}

          {/* Cancel Warning if user wants to cancel */}
          {isCancelConfirmOpen && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-800">Cancel / Reverse Receipt</h4>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    Cancelling this receipt will reverse all dues allocations and ledger entries. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Reason for Cancellation (min. 10 chars)
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why this receipt is being cancelled..."
                  className="w-full p-2 bg-white border border-red-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>

              {cancelError && <p className="text-xs text-red-700">{cancelError}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCancelConfirmOpen(false)}
                  className="flex-1 py-1.5 bg-white border border-gray-200 text-xs font-semibold rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleCancelReceipt}
                  className="flex-1 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between">
          {!isCancelled && !isCancelConfirmOpen ? (
            <button
              type="button"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel Receipt</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0B7B49] text-white rounded-xl text-xs font-bold hover:bg-[#09663c]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
