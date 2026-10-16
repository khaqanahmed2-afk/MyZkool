import React, { useState } from "react";
import {
  initiateRazorpayCheckout,
  VerifyPaymentResponse,
  VerifyPaymentRequest,
} from "../../services/razorpayService";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmountPaise?: number;
  studentName?: string;
  receiptNumber?: string;
  onSuccess?: (result: VerifyPaymentResponse, data: VerifyPaymentRequest) => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  onClose,
  defaultAmountPaise = 10000, // ₹100
  studentName = "Arjun Sharma (Class 8-A)",
  receiptNumber,
  onSuccess,
}) => {
  const [amountPaise, setAmountPaise] = useState<number>(defaultAmountPaise);
  const [customAmountRupees, setCustomAmountRupees] = useState<string>(
    String(defaultAmountPaise / 100)
  );
  const [parentName, setParentName] = useState<string>("Rajesh Sharma");
  const [parentEmail, setParentEmail] = useState<string>("rajesh.sharma@example.com");
  const [parentPhone, setParentPhone] = useState<string>("9876543210");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    result: VerifyPaymentResponse;
    data: VerifyPaymentRequest;
  } | null>(null);

  if (!isOpen) return null;

  const presets = [
    { label: "₹1 Test", paise: 100 },
    { label: "₹100 Fee", paise: 10000 },
    { label: "₹500 Fee", paise: 50000 },
    { label: "₹1,500 Fee", paise: 150000 },
  ];

  const handleSelectPreset = (paise: number) => {
    setAmountPaise(paise);
    setCustomAmountRupees(String(paise / 100));
    setErrorMessage(null);
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmountRupees(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAmountPaise(Math.round(num * 100));
    } else {
      setAmountPaise(0);
    }
    setErrorMessage(null);
  };

  const handlePayNow = async () => {
    if (amountPaise < 100) {
      setErrorMessage("Minimum payment amount is ₹1.00 (100 paise).");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessData(null);

    try {
      await initiateRazorpayCheckout({
        amount: amountPaise,
        currency: "INR",
        receipt: receiptNumber || `RCPT_${Date.now()}`,
        name: "MyZkool School ERP",
        description: `School Fee - ${studentName}`,
        notes: {
          student_name: studentName,
          school_domain: "demo.myzkool.in",
          module: "standard_checkout_v1",
        },
        prefill: {
          name: parentName,
          email: parentEmail,
          contact: parentPhone,
        },
        themeColor: "#2158E0",
        onSuccess: (result, data) => {
          setIsLoading(false);
          setSuccessData({ result, data });
          onSuccess?.(result, data);
        },
        onError: (errMsg) => {
          setIsLoading(false);
          setErrorMessage(errMsg || "Payment could not be completed.");
        },
        onDismiss: () => {
          setIsLoading(false);
        },
      });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || "Failed to initialize payment.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#173894] to-[#2158E0] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Razorpay Standard Checkout</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-400 text-slate-900 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Live Test
                </span>
              </div>
              <p className="text-xs text-blue-100">Official Web Integration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 space-y-5">
          {successData ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Payment Verified!</h4>
                <p className="text-sm text-slate-600 mt-1">
                  HMAC-SHA256 signature verified by server backend.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left font-mono text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-semibold text-slate-800">
                    {successData.data.razorpay_order_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment ID:</span>
                  <span className="font-semibold text-emerald-700">
                    {successData.data.razorpay_payment_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-semibold text-slate-800">
                    ₹{(amountPaise / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-semibold text-emerald-600 uppercase">
                    Captured &amp; Verified
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setErrorMessage(null);
                  }}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Make Another Payment
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-[#2158E0] hover:bg-[#1A46B8] text-white"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Amount (or enter custom)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {presets.map((p) => {
                    const isSelected = amountPaise === p.paise;
                    return (
                      <button
                        key={p.paise}
                        type="button"
                        onClick={() => handleSelectPreset(p.paise)}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                          isSelected
                            ? "bg-[#2158E0] text-white border-[#2158E0] shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount in Rupees (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={customAmountRupees}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                    {amountPaise} paise
                  </span>
                </div>
              </div>

              {/* Payer Details */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Parent / Payer Name
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-700 font-medium block">
                    Total Payable:
                  </span>
                  <span className="text-lg font-extrabold text-[#2158E0]">
                    ₹{(amountPaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-medium block">Gateway</span>
                  <span className="text-xs font-bold text-slate-700">Razorpay Standard</span>
                </div>
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Checkout Error</p>
                    <p className="mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handlePayNow}
                disabled={isLoading || amountPaise < 100}
                className="w-full py-3.5 px-4 bg-[#2158E0] hover:bg-[#1A46B8] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Contacting Razorpay...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Proceed to Pay ₹{(amountPaise / 100).toFixed(2)}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
