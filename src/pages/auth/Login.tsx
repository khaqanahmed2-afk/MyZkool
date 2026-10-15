import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const REMEMBER_ME_STORAGE_KEY = "myzkool_remembered_login_email";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin";

  const { signIn, resetPassword, isAuthenticated, profile, loading } = useAuth();

  // Mode: "login" or "forgot_password"
  const [viewMode, setViewMode] = useState<"login" | "forgot_password">("login");

  // Form State
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);

  // Initialize remembered email if previously saved
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(REMEMBER_ME_STORAGE_KEY);
      if (savedEmail) {
        setEmailOrUsername(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Non-fatal
    }
  }, []);

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
    if (isSubmitting) return;

    setErrorMessage(null);

    const identifier = emailOrUsername.trim();
    if (!identifier) {
      setErrorMessage("Please enter your school email address or username.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Handle remember me persistence
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_STORAGE_KEY, identifier);
        } else {
          localStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
        }
      } catch {
        // Non-fatal
      }

      const res = await signIn(identifier, password);

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
    if (isSubmitting) return;

    setErrorMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = emailOrUsername.trim();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage(
        "Please enter a valid school email address to receive password reset instructions."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await resetPassword(cleanEmail);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to send reset instructions. Please try again.");
        return;
      }

      setResetSentEmail(cleanEmail);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── FORGOT PASSWORD VIEW ──────────────────────────────────────────────────
  if (viewMode === "forgot_password") {
    return (
      <AuthLayout
        title="Reset your password"
        subtitle="Enter the verified email address associated with your school account."
        badgeText="Account Recovery"
        footerLink={{
          text: "Remembered your credentials?",
          linkText: "Back to sign in",
          href: "/login",
        }}
      >
        {resetSentEmail ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#10B981] mx-auto flex items-center justify-center border border-emerald-100 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold font-heading text-[#0F172A]">
                Reset Instructions Sent
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                If an account exists for{" "}
                <strong className="text-[#0F172A] font-semibold">{resetSentEmail}</strong>,
                we have dispatched an email with instructions to securely reset your password.
              </p>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  setResetSentEmail(null);
                  setViewMode("login");
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1E5AF6] to-[#0D44D9] hover:from-[#184FD8] hover:to-[#0A3AB8] text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="reset-email"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                School Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="admin@yourschool.edu.in"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#1E5AF6] focus:ring-4 focus:ring-[#1E5AF6]/10 outline-hidden transition-all duration-150 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1E5AF6] to-[#0D44D9] hover:from-[#184FD8] hover:to-[#0A3AB8] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending reset instructions...</span>
                </>
              ) : (
                <>
                  <span>Send Password Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode("login");
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors pt-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        )}
      </AuthLayout>
    );
  }

  // ─── STANDARD LOGIN VIEW (Matches Reference Image) ─────────────────────────
  return (
    <AuthLayout
      title="Welcome back 👋"
      subtitle="Sign in to your school management workspace."
      badgeText="School Staff & Administrator Portal"
      footerLink={{
        text: "Don't have an account yet?",
        linkText: "Register your school",
        href: "/register",
      }}
    >
      <form onSubmit={handleLoginSubmit} className="space-y-4 sm:space-y-5">
        {/* Error Alert Box */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50/95 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Email or Username Field */}
        <div>
          <label
            htmlFor="login-email-username"
            className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2"
          >
            Email or Username <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="login-email-username"
              type="text"
              required
              autoComplete="username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="admin@yourschool.edu.in or username"
              disabled={isSubmitting}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#1E5AF6] focus:ring-4 focus:ring-[#1E5AF6]/10 outline-hidden transition-all duration-150 disabled:bg-slate-50 disabled:cursor-not-allowed shadow-2xs"
            />
          </div>
        </div>

        {/* Password Field with Show/Hide toggle & Forgot Link beside label */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="login-password"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode("forgot_password");
              }}
              className="text-xs font-semibold text-[#1E5AF6] hover:text-[#1849D6] hover:underline cursor-pointer transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isSubmitting}
              className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#1E5AF6] focus:ring-4 focus:ring-[#1E5AF6]/10 outline-hidden transition-all duration-150 disabled:bg-slate-50 disabled:cursor-not-allowed shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded border-slate-300 text-[#1E5AF6] focus:ring-[#1E5AF6] cursor-pointer"
            />
            <span className="text-xs text-slate-600 font-medium">
              Remember me
            </span>
          </label>
        </div>

        {/* Full-Width Blue Gradient Sign In Button with Right-Arrow */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1E5AF6] to-[#0D44D9] hover:from-[#184FD8] hover:to-[#0A3AB8] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Signing in to workspace...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Divider with "OR CONTINUE WITH" */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-slate-200" />
          <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">
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
