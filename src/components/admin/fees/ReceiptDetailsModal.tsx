import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Printer,
  Download,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { formatPaise } from "../../../lib/amountInWords";
import { generateReceiptHTML, isUUID } from "../../../lib/receiptTemplate";
import { cancelReceipt, getReceiptById } from "../../../services/collectionService";
import { getFeeSettings } from "../../../services/feeSetupService";
import { getStudentBalance } from "../../../services/feeDuesService";
import { useAuth } from "../../../context/AuthContext";
import type { EnrichedTransaction } from "../../../services/feeCollectionsQueryService";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../../../types/collection";
import type { FeeSettings } from "../../../types/fees";

// ─────────────────────────────────────────────────────────────────────────────
// 1. RECEIPT STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
interface ReceiptStatusBadgeProps {
  status: string;
  realReceiptStatus?: string;
}

const ReceiptStatusBadge: React.FC<ReceiptStatusBadgeProps> = ({
  status,
  realReceiptStatus,
}) => {
  const isCancelled = status === "cancelled" || realReceiptStatus === "cancelled";
  const isFailed = status === "failed" || realReceiptStatus === "bounced";
  const isRefunded = status === "refunded";
  const isReversed = status === "reversed";
  const isPending = status === "pending";

  let colorClasses = "bg-[#E8F7EE] text-[#0B7B49] border border-emerald-200";
  let label = "Successful";

  if (isCancelled) {
    colorClasses = "bg-gray-100 text-gray-700 border border-gray-300";
    label = "Cancelled";
  } else if (isFailed) {
    colorClasses = "bg-rose-50 text-rose-700 border border-rose-200";
    label = "Failed";
  } else if (isRefunded) {
    colorClasses = "bg-blue-50 text-blue-700 border border-blue-200";
    label = "Refunded";
  } else if (isReversed) {
    colorClasses = "bg-orange-50 text-orange-700 border border-orange-200";
    label = "Reversed";
  } else if (isPending) {
    colorClasses = "bg-amber-50 text-amber-700 border border-amber-200";
    label = "Pending";
  }

  return (
    <span
      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${colorClasses}`}
    >
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CANCEL CONFIRMATION BOX
// ─────────────────────────────────────────────────────────────────────────────
interface ReceiptCancelConfirmBoxProps {
  cancelReason: string;
  setCancelReason: (r: string) => void;
  cancelError: string | null;
  isCancelling: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

const ReceiptCancelConfirmBox: React.FC<ReceiptCancelConfirmBoxProps> = ({
  cancelReason,
  setCancelReason,
  cancelError,
  isCancelling,
  onBack,
  onConfirm,
}) => {
  return (
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
        <label
          htmlFor="receiptdetailsmodal-reason-for-cancellation-min-10"
          className="text-[11px] font-semibold text-gray-700 block mb-1"
        >
          Reason for Cancellation (min. 10 chars)
        </label>
        <textarea
          id="receiptdetailsmodal-reason-for-cancellation-min-10"
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
          onClick={onBack}
          className="flex-1 py-1.5 bg-white border border-gray-200 text-xs font-semibold rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          disabled={isCancelling}
          onClick={onConfirm}
          className="flex-1 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. DETAILS METRICS GRID
// ─────────────────────────────────────────────────────────────────────────────
const ReceiptDetailsGrid: React.FC<{
  transaction: EnrichedTransaction;
  collectorName?: string;
  studentBalancePaise?: number | null;
  balanceLoading?: boolean;
}> = ({ transaction, collectorName, studentBalancePaise, balanceLoading }) => {
  const displayCollector =
    collectorName && !isUUID(collectorName)
      ? collectorName
      : transaction.collected_by_name && !isUUID(transaction.collected_by_name)
      ? transaction.collected_by_name
      : "Authorized Staff";

  return (
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
        <span className="text-gray-400 block mb-1">Amount Received</span>
        <span className="text-base font-extrabold text-[#2563EB]">
          {transaction.formatted_amount}
        </span>
      </div>

      <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
        <span className="text-gray-400 block mb-1">Remaining Balance</span>
        <span className={`text-base font-extrabold ${studentBalancePaise && studentBalancePaise > 0 ? "text-red-600" : "text-emerald-600"}`}>
          {balanceLoading ? (
            <span className="text-xs text-gray-400 font-normal">Checking ledger...</span>
          ) : studentBalancePaise !== null && studentBalancePaise !== undefined ? (
            formatPaise(studentBalancePaise)
          ) : (
            <span className="text-xs text-amber-600 font-normal">Pending Verification</span>
          )}
        </span>
      </div>

      <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
        <span className="text-gray-400 block mb-1">Payment Method</span>
        <span className="text-sm font-bold uppercase text-gray-800">
          {transaction.payment_method}
        </span>
      </div>

      <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
        <span className="text-gray-400 block mb-1">Collected By</span>
        <span className="text-sm font-semibold text-gray-800 truncate block">
          {displayCollector}
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
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. LINE ITEMS & REMARKS BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────
const ReceiptLineItemsBreakdown: React.FC<{
  realItems: FeeReceiptItem[];
  remarks?: string | null;
}> = ({ realItems, remarks }) => {
  return (
    <>
      {realItems.length > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl p-3.5 space-y-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Line Items Breakdown
          </span>
          <div className="space-y-1.5 divide-y divide-gray-100">
            {realItems.map((item) => (
              <div
                key={item.id || `${item.fee_head_id}-${item.amount_paise}`}
                className="flex items-center justify-between pt-1.5 text-xs"
              >
                <span className="font-medium text-gray-700">{item.fee_head_id}</span>
                <span className="font-bold text-gray-900">{formatPaise(item.amount_paise)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {remarks && (
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs">
          <span className="text-gray-500 font-semibold block mb-0.5">Notes:</span>
          <p className="text-gray-700">{remarks}</p>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. FOOTER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
interface ReceiptModalFooterProps {
  canCancel: boolean;
  onOpenCancel: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onClose: () => void;
}

const ReceiptModalFooter: React.FC<ReceiptModalFooterProps> = ({
  canCancel,
  onOpenCancel,
  onPrint,
  onDownload,
  onClose,
}) => {
  return (
    <div className="px-6 py-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between">
      {canCancel ? (
        <button
          type="button"
          onClick={onOpenCancel}
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
          type="button"
          onClick={onPrint}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5 text-gray-500" />
          <span>Print</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          <span>Download</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold hover:bg-[#1D4ED8]"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. HELPER PRINTER & DOWNLOAD UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function executeReceiptPrint(
  transaction: EnrichedTransaction,
  realReceipt: FeeReceipt | null,
  realItems: FeeReceiptItem[],
  realPayments: FeePayment[],
  schoolId: string | null | undefined,
  school: { name?: string; address?: string; contact_phone?: string; logo_url?: string; signature_url?: string } | null,
  isCancelled: boolean,
  feeSettings?: FeeSettings | null,
  studentBalancePaise?: number | null,
  collectorName?: string | null
) {
  const resolvedCollector =
    (!isUUID(collectorName) ? collectorName : null) ||
    (!isUUID(realReceipt?.collected_by) ? realReceipt?.collected_by : null) ||
    (realReceipt as any)?.collected_by_name ||
    (!isUUID(transaction.collected_by_name) ? transaction.collected_by_name : null) ||
    "Authorized Staff";

  const receiptToUse: FeeReceipt = {
    ...(realReceipt || {
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
      collected_by: resolvedCollector,
      remarks: transaction.remarks || null,
      idempotency_key: null,
      print_count: 1,
      whatsapp_sent_at: null,
      cancelled_by: null,
      cancelled_at: null,
      cancel_reason: null,
      created_at: transaction.created_at,
      updated_at: transaction.created_at,
    }),
    collected_by: resolvedCollector,
  };

  const itemsToUse: FeeReceiptItem[] =
    realItems.length > 0
      ? realItems
      : transaction.invoice_numbers.map((_, idx) => ({
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
      section_name: transaction.section_name,
      balance_remaining_paise: typeof studentBalancePaise === "number" ? studentBalancePaise : undefined,
    },
    {
      name: school?.name || feeSettings?.receipt_header_title || "School",
      address: school?.address || "Main Campus",
      phone: school?.contact_phone || "+91 98765 43210",
      logo_url: feeSettings?.logo_url || school?.logo_url,
      signature_url: feeSettings?.signature_url || (school as any)?.signature_url || null,
      signatory_name: feeSettings?.signatory_name,
      signatory_designation: feeSettings?.signatory_designation,
      terms: feeSettings?.receipt_terms,
      footer: feeSettings?.receipt_footer,
      refund_policy_note: feeSettings?.refund_policy_note,
      theme: feeSettings?.receipt_theme,
    },
    (feeSettings?.receipt_paper || "a4") as any,
    isCancelled,
    feeSettings,
    {
      invoiceNo: transaction.invoice_numbers.join(", "),
      collectedByName: resolvedCollector,
      balanceUnverified: studentBalancePaise === null || studentBalancePaise === undefined,
    }
  );

  const printWin = window.open("", "_blank");
  if (printWin) {
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 350);
  }
}

function executeReceiptDownload(
  transaction: EnrichedTransaction,
  realReceipt: FeeReceipt | null,
  realItems: FeeReceiptItem[],
  realPayments: FeePayment[],
  schoolId: string | null | undefined,
  school: { name?: string; address?: string; contact_phone?: string; logo_url?: string; signature_url?: string } | null,
  isCancelled: boolean,
  feeSettings?: FeeSettings | null,
  studentBalancePaise?: number | null,
  collectorName?: string | null
) {
  const resolvedCollector =
    (!isUUID(collectorName) ? collectorName : null) ||
    (!isUUID(realReceipt?.collected_by) ? realReceipt?.collected_by : null) ||
    (realReceipt as any)?.collected_by_name ||
    (!isUUID(transaction.collected_by_name) ? transaction.collected_by_name : null) ||
    "Authorized Staff";

  const receiptToUse: FeeReceipt = {
    ...(realReceipt || {
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
      collected_by: resolvedCollector,
      remarks: transaction.remarks || null,
      idempotency_key: null,
      print_count: 1,
      whatsapp_sent_at: null,
      cancelled_by: null,
      cancelled_at: null,
      cancel_reason: null,
      created_at: transaction.created_at,
      updated_at: transaction.created_at,
    }),
    collected_by: resolvedCollector,
  };

  const itemsToUse: FeeReceiptItem[] =
    realItems.length > 0
      ? realItems
      : transaction.invoice_numbers.map((_, idx) => ({
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
      section_name: transaction.section_name,
      balance_remaining_paise: typeof studentBalancePaise === "number" ? studentBalancePaise : undefined,
    },
    {
      name: school?.name || feeSettings?.receipt_header_title || "School",
      address: school?.address || "Main Campus",
      phone: school?.contact_phone || "+91 98765 43210",
      logo_url: feeSettings?.logo_url || school?.logo_url,
      signature_url: feeSettings?.signature_url || (school as any)?.signature_url || null,
      signatory_name: feeSettings?.signatory_name,
      signatory_designation: feeSettings?.signatory_designation,
      terms: feeSettings?.receipt_terms,
      footer: feeSettings?.receipt_footer,
      refund_policy_note: feeSettings?.refund_policy_note,
      theme: feeSettings?.receipt_theme,
    },
    (feeSettings?.receipt_paper || "a4") as any,
    isCancelled,
    feeSettings,
    {
      invoiceNo: transaction.invoice_numbers.join(", "),
      collectedByName: resolvedCollector,
      balanceUnverified: studentBalancePaise === null || studentBalancePaise === undefined,
    }
  );

  const printWin = window.open("", "_blank");
  if (printWin) {
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 350);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MAIN MODAL CONTENT
// ─────────────────────────────────────────────────────────────────────────────
interface ReceiptDetailsModalProps {
  transaction: EnrichedTransaction | null;
  onClose: () => void;
  onCancelled?: () => void;
  initialCancelOpen?: boolean;
}

const ReceiptDetailsModalContent: React.FC<ReceiptDetailsModalProps> = ({
  transaction,
  onClose,
  onCancelled,
  initialCancelOpen = false,
}) => {
  const { schoolId, user, school } = useAuth();
  const [feeSettings, setFeeSettings] = useState<FeeSettings | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(initialCancelOpen);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Real database items, payments, balance & collector
  const isLoadingDetailsRef = useRef(false);
  const [realReceipt, setRealReceipt] = useState<FeeReceipt | null>(null);
  const [realItems, setRealItems] = useState<FeeReceiptItem[]>([]);
  const realPaymentsRef = useRef<FeePayment[]>([]);
  const [studentBalancePaise, setStudentBalancePaise] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(true);
  const [collectorDisplayName, setCollectorDisplayName] = useState<string>(
    transaction?.collected_by_name && !isUUID(transaction.collected_by_name)
      ? transaction.collected_by_name
      : "Authorized Staff"
  );

  useEffect(() => {
    if (!schoolId) return;
    getFeeSettings(schoolId).then(({ settings }) => {
      setFeeSettings(settings);
    }).catch(() => {});
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !transaction?.receipt_id) return;
    let isMounted = true;
    isLoadingDetailsRef.current = true;
    setBalanceLoading(true);

    getReceiptById(schoolId, transaction.receipt_id)
      .then((res) => {
        if (!isMounted) return;
        if (res.receipt) setRealReceipt(res.receipt);
        if (res.items) setRealItems(res.items);
        if (res.payments) realPaymentsRef.current = res.payments;
        if (res.collectorName) {
          setCollectorDisplayName(res.collectorName);
        } else if (res.receipt?.collected_by && !isUUID(res.receipt.collected_by)) {
          setCollectorDisplayName(res.receipt.collected_by);
        }
        if (typeof res.remainingBalancePaise === "number") {
          setStudentBalancePaise(res.remainingBalancePaise);
          setBalanceLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to load real receipt items:", err);
      })
      .finally(() => {
        if (isMounted) isLoadingDetailsRef.current = false;
      });

    // Authoritative verification against student's dues ledger
    if (transaction?.student_id) {
      getStudentBalance(schoolId, transaction.student_id)
        .then((balRes) => {
          if (!isMounted) return;
          if (balRes && typeof balRes.balance === "number") {
            setStudentBalancePaise(balRes.balance);
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch authoritative student balance:", err);
        })
        .finally(() => {
          if (isMounted) setBalanceLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [schoolId, transaction?.receipt_id, transaction?.student_id]);

  if (!transaction) return null;

  const isCancelled = transaction.status === "cancelled" || realReceipt?.status === "cancelled";
  const isFailed = transaction.status === "failed" || realReceipt?.status === "bounced";
  const isRefunded = transaction.status === "refunded";
  const isReversed = transaction.status === "reversed";
  const canCancel = !isCancelled && !isFailed && !isRefunded && !isReversed && !isCancelConfirmOpen;

  const handlePrint = () => {
    executeReceiptPrint(
      transaction,
      realReceipt,
      realItems,
      realPaymentsRef.current,
      schoolId,
      school,
      isCancelled,
      feeSettings,
      studentBalancePaise,
      collectorDisplayName
    );
  };

  const handleDownload = () => {
    executeReceiptDownload(
      transaction,
      realReceipt,
      realItems,
      realPaymentsRef.current,
      schoolId,
      school,
      isCancelled,
      feeSettings,
      studentBalancePaise,
      collectorDisplayName
    );
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
              <ReceiptStatusBadge
                status={transaction.status}
                realReceiptStatus={realReceipt?.status}
              />
            </div>
            <p className="text-xs text-[#5B6478] mt-0.5">{transaction.formatted_date_time}</p>
          </div>

          <button
            aria-label="Close"
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
            <div className="w-11 h-11 rounded-full bg-[#EBF2FE] text-[#2563EB] font-black text-sm flex items-center justify-center shrink-0">
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
          <ReceiptDetailsGrid
            transaction={transaction}
            collectorName={collectorDisplayName}
            studentBalancePaise={studentBalancePaise}
            balanceLoading={balanceLoading}
          />

          {/* Fee Items Breakdown */}
          <ReceiptLineItemsBreakdown realItems={realItems} remarks={transaction.remarks} />

          {/* Cancel Warning if user wants to cancel */}
          {isCancelConfirmOpen && (
            <ReceiptCancelConfirmBox
              cancelReason={cancelReason}
              setCancelReason={setCancelReason}
              cancelError={cancelError}
              isCancelling={isCancelling}
              onBack={() => setIsCancelConfirmOpen(false)}
              onConfirm={handleCancelReceipt}
            />
          )}
        </div>

        {/* Footer Actions */}
        <ReceiptModalFooter
          canCancel={canCancel}
          onOpenCancel={() => setIsCancelConfirmOpen(true)}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export function ReceiptDetailsModal(props: ReceiptDetailsModalProps) {
  if (!props.transaction) return null;
  return (
    <ReceiptDetailsModalContent
      key={`${props.transaction.id}-${props.initialCancelOpen}`}
      {...props}
      transaction={props.transaction}
    />
  );
}
