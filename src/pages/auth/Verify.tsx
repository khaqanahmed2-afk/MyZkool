import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { MailCheck, RefreshCw, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, resendVerificationEmail, profile, refreshSession } = useAuth();

  const [email, setEmail] = useState<string>(
    searchParams.get("email") || user?.email || ""
  );
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Check if verification has succeeded (either user confirmed or hash present)
  const isHashConfirmed =
    window.location.hash.includes("access_token") ||
    window.location.search.includes("type=signup") ||
    Boolean(user?.email_confirmed_at);

  useEffect(() => {
    // If URL contains confirmation tokens, refresh session to detect confirmation
    if (window.location.hash.includes("access_token") || window.location.search.includes("type=signup")) {
      refreshSession();
    }
  }, [refreshSession]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleResend = async () => {
    if (cooldownSeconds > 0 || !email) return;

    try {
      setIsResending(true);
      setResendStatus("idle");
      setResendMessage(null);

      const res = await resendVerificationEmail(email);

      if (!res.success) {
        setResendStatus("error");
        setResendMessage(res.error || "Failed to resend confirmation email. Please try again.");
      } else {
        setResendStatus("sent");
        setResendMessage("Verification email has been resent! Please check your spam folder if it doesn't appear.");
        setCooldownSeconds(60);
      }
    } catch (err: any) {
      setResendStatus("error");
      setResendMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setIsResending(false);
    }
  };

  // 1. SUCCESS STATE: Verified
  if (isHashConfirmed) {
    return (
      <AuthLayout
        title="Email verified"
        subtitle="Your school administrator account has been successfully verified."
        badgeText="Verification Complete"
        leftHeadline="Welcome to the MyZkool educator network."
        leftSubtext="Your email is confirmed and your administrator account is active. Let's proceed to set up your school profile and academic structure."
        leftHighlights={[
          "Account verified with full administrative privileges",
          "Proceed directly to School Onboarding (Step 1 of 8)",
          "You can invite co-administrators and staff at any time",
        ]}
      >
        <div className="text-center py-6 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#1FAE7A] mx-auto flex items-center justify-center shadow-xs border border-emerald-100">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#141A2E]">
              Email Verified Successfully!
            </h3>
            <p className="text-xs text-[#5B6478] leading-relaxed max-w-sm mx-auto">
              Your administrator credentials are now active. Continue to the school onboarding wizard to configure your academic sessions and classes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(profile?.current_onboarding_step || "/onboarding/school")}
            className="w-full py-3.5 px-6 rounded-xl bg-[#2158E0] hover:bg-[#1a4ec4] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#2158E0]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue to School Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </AuthLayout>
    );
  }

  // 2. AWAITING VERIFICATION STATE
  return (
    <AuthLayout
      title="Verify your school email"
      subtitle="We have sent a verification link to confirm your administrator account."
      badgeText="Action Required"
      leftHeadline="Ensuring secure school governance."
      leftSubtext="Email verification confirms institutional authority and protects student and financial records from unauthorized access."
      leftHighlights={[
        "Single-click confirmation link sent to your inbox",
        "Protects your school domain and student records",
        "Link remains active for 24 hours",
      ]}
      footerLink={{
        text: "Need to use a different email?",
        linkText: "Register again",
        href: "/register",
      }}
    >
      <div className="text-center py-4 space-y-5">
        {/* Verification Icon Box */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2158E0] mx-auto flex items-center justify-center border border-blue-100 shadow-xs">
          <MailCheck className="w-8 h-8" />
        </div>

        {/* Informative Copy */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-[#141A2E]">
            Check your inbox
          </h3>
          <p className="text-xs text-[#5B6478] leading-relaxed max-w-sm mx-auto">
            Click the link we sent to:
          </p>
          <div className="inline-block px-3.5 py-1.5 rounded-lg bg-[#F0F4FD] border border-blue-100 text-xs font-semibold text-[#2158E0] max-w-full truncate">
            {email || "your registered email"}
          </div>
        </div>

        {/* Resend Feedback Alerts */}
        {resendStatus === "sent" && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{resendMessage}</span>
          </div>
        )}

        {resendStatus === "error" && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{resendMessage}</span>
          </div>
        )}

        {/* Resend Action */}
        <div className="pt-2 border-t border-[#EDF2F7] space-y-3">
          <p className="text-xs text-[#8A94A6]">
            Did not receive the email? Check your spam/junk folder or resend.
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldownSeconds > 0}
            className="w-full py-2.5 px-4 rounded-xl border border-[#D5DDEB] bg-white hover:bg-[#F8FAFC] active:bg-[#EDF2F7] text-xs font-semibold text-[#141A2E] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
            <span>
              {cooldownSeconds > 0
                ? `Resend available in ${cooldownSeconds}s`
                : isResending
                ? "Resending email..."
                : "Resend Verification Email"}
            </span>
          </button>
        </div>

        {/* Back to Login */}
        <div className="pt-1">
          <Link
            to="/login"
            className="text-xs font-semibold text-[#2158E0] hover:underline"
          >
            Already verified? Sign in to your account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
