import React, { useState } from "react";
import { X, Ban, AlertCircle, Loader2 } from "lucide-react";
import { formatPaise } from "../../../lib/amountInWords";
import type { StudentInvoice } from "../../../types/fees";

interface CancelInvoiceModalProps {
  invoice: StudentInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (invoiceId: string, reason: string) => Promise<void>;
}

export function CancelInvoiceModal({
  invoice,
  isOpen,
  onClose,
  onConfirmCancel,
}: CancelInvoiceModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handleConfirm = async () => {
    if (!reason || reason.trim().length < 5) {
      setErrorMessage("Please provide a cancellation reason with at least 5 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onConfirmCancel(invoice.id, reason.trim());
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Void / Cancel Invoice</h3>
              <p className="text-[11px] text-slate-500">Invoice #{invoice.invoice_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Student:</span>
              <span className="font-bold text-slate-900">{invoice.student_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Admission No:</span>
              <span className="font-semibold text-slate-800">{invoice.admission_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Period:</span>
              <span className="font-semibold text-slate-800">{invoice.billing_period}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500">Invoiced Amount:</span>
              <span className="font-bold text-slate-900">{formatPaise(invoice.total_paise)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Generated under incorrect fee structure, concession revised, student withdrew..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 resize-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              This cancellation will be logged in the immutable fee audit ledger.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || reason.trim().length < 5}
              className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Voiding Invoice...</span>
                </>
              ) : (
                <span>Confirm Void</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
