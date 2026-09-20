import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  requestParentPayOTP,
  verifyParentPayOTP,
  getParentPayContext,
  createOnlinePaymentOrder,
  finaliseOnlineOrderCapture,
} from "../../services/onlinePaymentService";
import type { ParentPayContext } from "../../types/onlinePayment";
import {
  School as SchoolIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Languages,
  Check,
} from "lucide-react";

type Lang = "en" | "hi";

const I18N = {
  en: {
    title: "School Fee Payment",
    securePortal: "Secure Payment Portal",
    otpTitle: "Verify your identity",
    otpDesc: "A 6-digit one-time code was sent to your WhatsApp number",
    otpPlaceholder: "••••••",
    verifyBtn: "Verify and view dues",
    verifyingBtn: "Verifying code...",
    resendBtn: "Resend code",
    resendIn: "Resend code in",
    duesTitle: "Outstanding fee dues",
    overdue: "Overdue",
    currentTerm: "Current term",
    selectDues: "Select dues to pay",
    noDues: "No pending dues found for your children.",
    convenienceFee: "Gateway convenience fee",
    totalPayable: "Total payable amount",
    payBtn: "Proceed to pay",
    processingBtn: "Processing payment...",
    successTitle: "Payment successful",
    successDesc: "Your fee payment was processed successfully and official receipts generated.",
    whatsappNotice: "A copy of your payment receipt has also been dispatched to your WhatsApp.",
    receiptNo: "Receipt number",
    downloadReceipt: "Download receipt",
    doneBtn: "Done",
    failedTitle: "Payment could not be completed",
    failedDesc: "Your transaction was not completed. If any amount was deducted from your account, it will be automatically refunded by your bank within 3 to 5 business days.",
    tryAgainBtn: "Try again",
    sessionExpired: "Your session has expired. Please verify with a new code.",
  },
  hi: {
    title: "स्कूल शुल्क भुगतान",
    securePortal: "सुरक्षित भुगतान पोर्टल",
    otpTitle: "अपनी पहचान सत्यापित करें",
    otpDesc: "आपके व्हाट्सएप नंबर पर 6 अंकों का सत्यापन कोड भेजा गया है",
    otpPlaceholder: "••••••",
    verifyBtn: "सत्यापित करें और बकाया देखें",
    verifyingBtn: "सत्यापित हो रहा है...",
    resendBtn: "कोड पुनः भेजें",
    resendIn: "पुनः भेजें",
    duesTitle: "बकाया स्कूल शुल्क",
    overdue: "अतिदेय (Overdue)",
    currentTerm: "चालू सत्र",
    selectDues: "भुगतान हेतु शुल्क चुनें",
    noDues: "आपके बच्चों के लिए कोई बकाया शुल्क नहीं है।",
    convenienceFee: "गेटवे सुविधा शुल्क",
    totalPayable: "कुल देय राशि",
    payBtn: "भुगतान करें",
    processingBtn: "भुगतान संसाधित हो रहा है...",
    successTitle: "भुगतान सफल रहा",
    successDesc: "आपका शुल्क भुगतान सफलतापूर्वक स्वीकार कर लिया गया है और रसीद जारी कर दी गई है।",
    whatsappNotice: "रसीद की प्रति आपके व्हाट्सएप नंबर पर भी भेज दी गई है।",
    receiptNo: "रसीद संख्या",
    downloadReceipt: "रसीद डाउनलोड करें",
    doneBtn: "पूर्ण",
    failedTitle: "भुगतान पूरा नहीं हो सका",
    failedDesc: "आपका लेनदेन पूरा नहीं हुआ। यदि आपके खाते से राशि कट गई है, तो वह 3 से 5 कार्य दिवसों में आपके बैंक द्वारा स्वतः वापस कर दी जाएगी।",
    tryAgainBtn: "पुनः प्रयास करें",
    sessionExpired: "आपका सत्र समाप्त हो गया है। कृपया नए कोड से पुनः सत्यापित करें।",
  },
};

export default function ParentPayPage() {
  const { token } = useParams<{ token: string }>();

  const [lang, setLang] = useState<Lang>("en");
  const t = I18N[lang];

  // State machine: 'otp' | 'dues' | 'success' | 'failed'
  const [step, setStep] = useState<"otp" | "dues" | "success" | "failed">("otp");

  // OTP State
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [otpInput, setOtpInput] = useState<string>("");
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(60);

  // Session & Context State
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [context, setContext] = useState<ParentPayContext | null>(null);
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Checkout State
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [successReceiptIds, setSuccessReceiptIds] = useState<string[]>([]);
  const [paidTotalPaise, setPaidTotalPaise] = useState<number>(0);

  // 1. Initial Load: Request OTP for token
  useEffect(() => {
    if (!token) return;

    let mounted = true;
    async function initOtp() {
      setOtpLoading(true);
      setOtpError(null);
      try {
        const res = await requestParentPayOTP(token!);
        if (!mounted) return;
        if (res.success) {
          setMaskedPhone(res.masked_phone);
          setResendCooldown(60);
        } else {
          setOtpError(res.error || "Unable to request OTP.");
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : "Connection failed.";
          setOtpError(msg);
        }
      } finally {
        if (mounted) setOtpLoading(false);
      }
    }

    initOtp();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // 2. Verify OTP Action
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !otpInput.trim()) return;

    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await verifyParentPayOTP(token, otpInput.trim());
      if (res.success && res.session_token) {
        setSessionToken(res.session_token);

        // Load dues context
        const ctxRes = await getParentPayContext(res.session_token);
        if (ctxRes.success && ctxRes.context) {
          setContext(ctxRes.context);

          // Default: select overdue dues and current term dues
          const defaultDueIds: string[] = [];
          for (const s of ctxRes.context.students) {
            for (const d of s.dues) {
              if (d.is_overdue || d.is_current_term) {
                defaultDueIds.push(d.due_id);
              }
            }
          }
          setSelectedDueIds(defaultDueIds);
          if (ctxRes.context.students.length > 0) {
            setExpandedStudentId(ctxRes.context.students[0].student_id);
          }
          setStep("dues");
        } else {
          setOtpError(ctxRes.error || "Failed to load fee records.");
        }
      } else {
        setOtpError(res.error || "Verification failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification error occurred.";
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Toggle selection of a single due
  const handleToggleDue = (dueId: string) => {
    setSelectedDueIds((prev) =>
      prev.includes(dueId) ? prev.filter((id) => id !== dueId) : [...prev, dueId]
    );
  };

  // Toggle all dues for a student
  const handleToggleStudentDues = (studentDues: { due_id: string }[]) => {
    const ids = studentDues.map((d) => d.due_id);
    const allSelected = ids.every((id) => selectedDueIds.includes(id));
    if (allSelected) {
      setSelectedDueIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedDueIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  // Compute selected totals live
  const computedTotals = useMemo(() => {
    if (!context) return { subtotalPaise: 0, convenienceFeePaise: 0, totalPaise: 0 };

    let subtotal = 0;
    for (const st of context.students) {
      for (const d of st.dues) {
        if (selectedDueIds.includes(d.due_id)) {
          subtotal += d.balance_paise;
        }
      }
    }

    let convenience = 0;
    if (context.who_bears_charges === "parent" && context.convenience_fee_percent > 0) {
      convenience = Math.round((subtotal * context.convenience_fee_percent) / 100);
    }

    return {
      subtotalPaise: subtotal,
      convenienceFeePaise: convenience,
      totalPaise: subtotal + convenience,
    };
  }, [context, selectedDueIds]);

  // 3. Initiate Checkout
  const handleCheckout = async () => {
    if (!sessionToken || selectedDueIds.length === 0 || !context) return;

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      // 1. Create online order on server (server recomputes amounts from DB)
      const orderRes = await createOnlinePaymentOrder(sessionToken, selectedDueIds);

      if (!orderRes.success || !orderRes.order) {
        setCheckoutError(orderRes.error || "Order creation failed.");
        setIsCheckingOut(false);
        return;
      }

      // 2. Gateway execution (mock adapter auto-captures for dev/tests)
      const captureRes = await finaliseOnlineOrderCapture(
        context.school_id,
        orderRes.gateway_order_id!,
        `pay_${crypto.randomUUID().slice(0, 10)}`
      );

      if (captureRes.success) {
        setSuccessReceiptIds(captureRes.receipt_ids);
        setPaidTotalPaise(orderRes.total_paise || computedTotals.totalPaise);
        setStep("success");
      } else {
        setStep("failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment execution failed.";
      setCheckoutError(msg);
      setStep("failed");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141A2E] flex flex-col font-sans">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-[#E6EAF3] py-3.5 px-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2158E0] text-white flex items-center justify-center font-bold">
              <SchoolIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">
                {context?.school_name || "MyZkool"}
              </h1>
              <span className="text-[10px] text-[#5B6478] flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> {t.securePortal}
              </span>
            </div>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#E6EAF3] bg-[#F8FAFC] hover:bg-white transition-colors"
          >
            <Languages className="w-3.5 h-3.5 text-[#2158E0]" />
            <span>{lang === "en" ? "हिन्दी" : "English"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto p-4 sm:p-5 flex flex-col">
        {/* STEP 1: OTP Verification */}
        {step === "otp" && (
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 sm:p-6 shadow-xs my-auto space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2158E0] mx-auto flex items-center justify-center mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold">{t.otpTitle}</h2>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                {t.otpDesc} {maskedPhone ? <strong className="text-[#141A2E]">{maskedPhone}</strong> : ""}.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder={t.otpPlaceholder}
                  className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] focus:bg-white focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden transition-all"
                  autoFocus
                  required
                />
              </div>

              {otpError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{otpError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={otpLoading || otpInput.length < 6}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.verifyingBtn}</span>
                  </>
                ) : (
                  <span>{t.verifyBtn}</span>
                )}
              </button>

              <div className="text-center pt-2">
                {resendCooldown > 0 ? (
                  <span className="text-[11px] text-[#94A3B8]">
                    {t.resendIn} {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!token) return;
                      setOtpLoading(true);
                      await requestParentPayOTP(token);
                      setResendCooldown(60);
                      setOtpLoading(false);
                    }}
                    className="text-xs font-semibold text-[#2158E0] hover:underline"
                  >
                    {t.resendBtn}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Dues Selection & Checkout */}
        {step === "dues" && context && (
          <div className="space-y-4 pb-28">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#141A2E]">{t.duesTitle}</h2>
                <span className="text-[11px] text-[#5B6478]">
                  {context.parent_name} ({context.students.length} {context.students.length === 1 ? "Child" : "Children"})
                </span>
              </div>
            </div>

            {checkoutError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{checkoutError}</span>
              </div>
            )}

            {context.students.map((student) => {
              const isExpanded = expandedStudentId === student.student_id;
              const studentDueIds = student.dues.map((d) => d.due_id);
              const selectedCount = studentDueIds.filter((id) => selectedDueIds.includes(id)).length;

              return (
                <div
                  key={student.student_id}
                  className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs overflow-hidden"
                >
                  {/* Student Header Accordion */}
                  <div
                    onClick={() => setExpandedStudentId(isExpanded ? null : student.student_id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold text-xs">
                        {student.student_name[0]}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#141A2E]">
                          {student.student_name}
                        </h3>
                        <p className="text-[11px] text-[#5B6478]">
                          {student.class_name} {student.section_name ? `· Sec ${student.section_name}` : ""} · Adm #{student.admission_no}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="block text-xs font-bold text-[#141A2E]">
                          ₹{(student.total_due_paise / 100).toLocaleString("en-IN")}
                        </span>
                        <span className="block text-[10px] text-[#5B6478]">
                          {selectedCount}/{student.dues.length} selected
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Dues Checklist */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-[#F1F5F9] space-y-2.5">
                      <div className="flex items-center justify-between pt-3 pb-1 text-[11px]">
                        <span className="text-[#5B6478] font-medium">{t.selectDues}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleStudentDues(student.dues)}
                          className="text-[#2158E0] font-semibold hover:underline"
                        >
                          {selectedCount === student.dues.length ? "Deselect all" : "Select all"}
                        </button>
                      </div>

                      {student.dues.map((due) => {
                        const isSelected = selectedDueIds.includes(due.due_id);

                        return (
                          <div
                            key={due.due_id}
                            onClick={() => handleToggleDue(due.due_id)}
                            className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? "bg-blue-50/40 border-[#2158E0]/40"
                                : "bg-white border-[#E6EAF3] hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Handled by container
                                className="w-4 h-4 mt-0.5 rounded text-[#2158E0] border-[#CBD5E1] focus:ring-[#2158E0]/20 pointer-events-none"
                              />
                              <div>
                                <span className="block text-xs font-semibold text-[#141A2E]">
                                  {due.fee_head_name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {due.term_name && (
                                    <span className="text-[10px] text-[#64748B]">
                                      {due.term_name} ·
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[#64748B]">
                                    Due: {due.due_date}
                                  </span>
                                  {due.is_overdue && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                                      {t.overdue}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span className="text-xs font-bold text-[#141A2E] shrink-0">
                              ₹{(due.balance_paise / 100).toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sticky Bottom Summary Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6EAF3] p-4 shadow-lg z-20">
              <div className="max-w-lg mx-auto space-y-3">
                <div className="space-y-1 text-xs">
                  {computedTotals.convenienceFeePaise > 0 && (
                    <div className="flex justify-between text-[#5B6478]">
                      <span>{t.convenienceFee}</span>
                      <span>₹{(computedTotals.convenienceFeePaise / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#141A2E]">
                    <span>{t.totalPayable}</span>
                    <span>₹{(computedTotals.totalPaise / 100).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <button
                  type="button"
                  id="parent-pay-btn"
                  onClick={handleCheckout}
                  disabled={isCheckingOut || selectedDueIds.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t.processingBtn}</span>
                    </>
                  ) : (
                    <span>
                      {t.payBtn} (₹{(computedTotals.totalPaise / 100).toLocaleString("en-IN")})
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Payment Success */}
        {step === "success" && (
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-xs text-center my-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-emerald-900">{t.successTitle}</h2>
              <p className="text-xs text-[#5B6478] mt-1">{t.successDesc}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5B6478]">Amount Paid:</span>
                <strong className="font-bold text-[#141A2E]">
                  ₹{(paidTotalPaise / 100).toLocaleString("en-IN")}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6478]">Receipts Issued:</span>
                <strong className="font-mono text-[#141A2E]">
                  {successReceiptIds.length}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-[#5B6478]">{t.whatsappNotice}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors"
            >
              {t.doneBtn}
            </button>
          </div>
        )}

        {/* STEP 4: Payment Failed */}
        {step === "failed" && (
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-xs text-center my-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-bold text-red-900">{t.failedTitle}</h2>
              <p className="text-xs text-[#5B6478] mt-2 leading-relaxed">{t.failedDesc}</p>
            </div>

            <button
              type="button"
              onClick={() => setStep("dues")}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors"
            >
              {t.tryAgainBtn}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

