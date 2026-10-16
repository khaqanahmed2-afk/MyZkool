import React, { useState } from "react";
import {
  initiateRazorpayCheckout,
  VerifyPaymentResponse,
  VerifyPaymentRequest,
} from "../../services/razorpayService";
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export interface RazorpayCheckoutButtonProps {
  amountPaise: number; // in paise (e.g. 10000 = ₹100.00)
  currency?: string;
  receipt?: string;
  name?: string;
  description?: string;
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  buttonText?: string;
  className?: string;
  onPaymentSuccess?: (result: VerifyPaymentResponse, paymentData: VerifyPaymentRequest) => void;
  onPaymentFailure?: (error: string) => void;
  onModalDismiss?: () => void;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amountPaise,
  currency = "INR",
  receipt,
  name = "MyZkool School ERP",
  description,
  notes,
  prefill,
  buttonText,
  className = "",
  onPaymentSuccess,
  onPaymentFailure,
  onModalDismiss,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
    paymentId?: string;
  } | null>(null);

  const formattedAmount = (amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handlePay = async () => {
    if (isLoading) return;

    if (amountPaise < 100) {
      const err = "Amount must be at least ₹1.00 (100 paise).";
      setStatusMessage({ type: "error", text: err });
      onPaymentFailure?.(err);
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      await initiateRazorpayCheckout({
        amount: amountPaise,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        name,
        description: description || `Fee Payment of ₹${formattedAmount}`,
        notes: notes || {
          source: "myzkool_standard_web_checkout",
        },
        prefill,
        themeColor: "#2158E0",
        onSuccess: (verifyResult, paymentData) => {
          setIsLoading(false);
          setStatusMessage({
            type: "success",
            text: "Payment completed & verified successfully!",
            paymentId: paymentData.razorpay_payment_id,
          });
          onPaymentSuccess?.(verifyResult, paymentData);
        },
        onError: (errorMsg) => {
          setIsLoading(false);
          setStatusMessage({
            type: "error",
            text: errorMsg || "Payment could not be completed.",
          });
          onPaymentFailure?.(errorMsg);
        },
        onDismiss: () => {
          setIsLoading(false);
          setStatusMessage({
            type: "info",
            text: "Payment window was closed by user.",
          });
          onModalDismiss?.();
        },
      });
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || "Failed to launch Razorpay checkout modal.";
      setStatusMessage({ type: "error", text: msg });
      onPaymentFailure?.(msg);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={isLoading}
        className={
          className ||
          "inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-[#2158E0] hover:bg-[#1A46B8] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Processing order...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{buttonText || `Pay ₹${formattedAmount} with Razorpay`}</span>
          </>
        )}
      </button>

      {statusMessage && (
        <div
          className={`text-xs p-2.5 rounded-lg flex items-start gap-2 border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : statusMessage.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-slate-50 text-slate-700 border-slate-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">{statusMessage.text}</p>
            {statusMessage.paymentId && (
              <p className="font-mono text-[11px] mt-0.5 text-emerald-700">
                Payment ID: {statusMessage.paymentId}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
