import React, { useState } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin";

  const { signIn, resetPassword, isAuthenticated, profile, loading } = useAuth();

  // Mode: "login" or "forgot_password"
  const [viewMode, setViewMode] = useState<"login" | "forgot_password">("login");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);

  // If already logged in, redirect smoothly
  if (isAuthenticated && !loading) {
    const destination =
      redirectTarget && redirectTarget.startsWith("/")
        ? redirectTarget
        : profile?.onboarding_completed
        ? "/admin"
        : profile?.current_onboarding_step || "/onboarding/school";

    return <Navigate to={destination} replace />;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your school email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signIn(email, password);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to sign in. Please verify your credentials.");
        return;
      }

      // Successful sign-in
      const destination =
        redirectTarget && redirectTarget.startsWith("/")
          ? redirectTarget
          : profile?.onboarding_completed
          ? "/admin"
          : profile?.current_onboarding_step || "/onboarding/school";

      navigate(destination);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage("Please enter a valid school email address to receive recovery instructions.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await resetPassword(email);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to send reset instructions. Please try again.");
        return;
      }

      setResetSentEmail(email.trim());
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // FORGOT PASSWORD VIEW
  if (viewMode === "forgot_password") {
    return (
      <AuthLayout
        title="Reset your password"
        subtitle="Enter the verified email linked to your school account."
        badgeText="Account Recovery"
        leftHeadline="Fast, secure account recovery for school staff."
        leftSubtext="We will email you a secure, time-sensitive verification link to reset your administrator credentials."
        leftHighlights={[
          "End-to-end encrypted password recovery links",
          "Links expire automatically after 1 hour for tenant safety",
          "Maintains active 2FA and multi-factor school security policies",
        ]}
        footerLink={{
          text: "Remember your password?",
          linkText: "Back to sign in",
          href: "/login",
        }}
      >
        {resetSentEmail ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#1FAE7A] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141A2E]">
              Password Reset Link Sent
            </h3>
            <p className="text-xs text-[#5B6478] leading-relaxed max-w-sm mx-auto">
              If an account is associated with{" "}
              <strong className="text-[#141A2E]">{resetSentEmail}</strong>, you will receive an email shortly with instructions to reset your password.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setResetSentEmail(null);
                  setViewMode("login");
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-[#1a4ec4] transition-colors"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#333E59] mb-1.5"
              >
                School Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourschool.edu.in"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-[#FBFDFF] border border-[#D5DDEB] rounded-xl text-sm text-[#141A2E] placeholder-[#9BA5B7] focus:bg-white focus:border-[#2158E0] focus:ring-4 focus:ring-[#2158E0]/10 outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-[#2158E0] hover:bg-[#1a4ec4] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#2158E0]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode("login");
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-[#5B6478] hover:text-[#141A2E] pt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        )}
      </AuthLayout>
    );
  }

  // STANDARD LOGIN VIEW
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your school management workspace."
      badgeText="School Staff &amp; Administrator Portal"
      leftHeadline="Academic oversight, admissions, and records at your fingertips."
      leftSubtext="Join hundreds of school leaders and educators streamlining daily school operations with MyZkool."
      leftHighlights={[
        "Real-time attendance registers with instant parent SMS/WhatsApp sync",
        "Digital fee collection receipts with zero manual ledger reconciliation",
        "Role-scoped access for Principals, Teachers, and Accountants",
        "Zero setup hardware required: runs in any modern browser on phone or PC",
      ]}
      footerLink={{
        text: "Don't have an account yet?",
        linkText: "Register your school",
        href: "/register",
      }}
    >
      <form onSubmit={handleLoginSubmit} className="space-y-4">
        {/* Error Alert Message */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Email Address Field */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold uppercase tracking-wider text-[#333E59] mb-1.5"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourschool.edu.in"
              disabled={isSubmitting}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#FBFDFF] border border-[#D5DDEB] rounded-xl text-sm text-[#141A2E] placeholder-[#9BA5B7] focus:bg-white focus:border-[#2158E0] focus:ring-4 focus:ring-[#2158E0]/10 outline-hidden transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-wider text-[#333E59]"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode("forgot_password");
              }}
              className="text-xs font-medium text-[#2158E0] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isSubmitting}
              className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-[#FBFDFF] border border-[#D5DDEB] rounded-xl text-sm text-[#141A2E] placeholder-[#9BA5B7] focus:bg-white focus:border-[#2158E0] focus:ring-4 focus:ring-[#2158E0]/10 outline-hidden transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8A94A6] hover:text-[#141A2E] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Primary Sign In Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 rounded-xl bg-[#2158E0] hover:bg-[#1a4ec4] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#2158E0]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Signing in to school portal...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-[#E6EAF3]" />
          <span className="bg-white px-3 text-[11px] font-semibold text-[#8A94A6] uppercase tracking-wider absolute">
            Or continue with
          </span>
        </div>

        {/* Google OAuth Button */}
        <GoogleAuthButton
          label="Sign in with Google"
          disabled={isSubmitting}
          onError={(err) => setErrorMessage(err)}
        />
      </form>
    </AuthLayout>
  );
}
