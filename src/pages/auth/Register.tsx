import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated, profile, loading } = useAuth();

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to onboarding or admin
  if (isAuthenticated && !loading) {
    const destination = profile?.onboarding_completed
      ? "/admin"
      : profile?.current_onboarding_step || "/onboarding/school";
    return <Navigate to={destination} replace />;
  }

  const validateForm = (): string | null => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      return "Please enter your full name (minimum 2 characters).";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return "Please enter a valid school email address.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match. Please re-enter your password.";
    }
    if (!agreeTerms) {
      return "You must agree to the Terms of Service and Privacy Policy to create a school account.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signUp(email, password, fullName);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create account. Please try again.");
        return;
      }

      // If email verification is required by Supabase
      if (res.needsEmailVerification) {
        navigate(`/verify?email=${encodeURIComponent(email.trim())}`);
      } else {
        // Direct session created -> route to onboarding step 1
        navigate("/onboarding/school");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register your institution as School Administrator to begin setup."
      badgeText="School Administrator Registration"
      leftHeadline="One modern platform for your entire school community."
      leftSubtext="Replace fragmented software with an all-in-one ERP that automates admissions, fee collection, report cards, and instant WhatsApp updates."
      leftHighlights={[
        "CBSE, ICSE, and State Board academic setups ready in minutes",
        "Direct-to-parent WhatsApp notices without SMS gatekeeper costs",
        "Automated fee collection via UPI, cards, and net banking with 0% reconciliation delays",
        "Separate role permissions for Trustees, Principals, Teachers, and Accountants",
      ]}
      footerLink={{
        text: "Already have a school account?",
        linkText: "Sign in here",
        href: "/login",
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Full Name Field */}
        <div>
          <label
            htmlFor="full-name"
            className="block text-xs font-semibold uppercase tracking-wider text-[#333E59] mb-1.5"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
              <User className="w-4 h-4" />
            </div>
            <input
              id="full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Sharma"
              disabled={isSubmitting}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#FBFDFF] border border-[#D5DDEB] rounded-xl text-sm text-[#141A2E] placeholder-[#9BA5B7] focus:bg-white focus:border-[#2158E0] focus:ring-4 focus:ring-[#2158E0]/10 outline-hidden transition-all"
            />
          </div>
        </div>

        {/* Email Address Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-[#333E59] mb-1.5"
          >
            School Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
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
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-[#333E59] mb-1.5"
          >
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
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

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="confirm-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[#333E59] mb-1.5"
          >
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type your password"
              disabled={isSubmitting}
              className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-[#FBFDFF] border border-[#D5DDEB] rounded-xl text-sm text-[#141A2E] placeholder-[#9BA5B7] focus:bg-white focus:border-[#2158E0] focus:ring-4 focus:ring-[#2158E0]/10 outline-hidden transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8A94A6] hover:text-[#141A2E] transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Terms of Service & Privacy Agreement */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 mt-0.5 rounded border-[#C8D2E2] text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
            />
            <span className="text-xs text-[#5B6478] leading-relaxed">
              I agree to the{" "}
              <a
                href="#terms"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Terms of Service: By registering, you confirm you are authorized to represent your school or educational institution on MyZkool.");
                }}
                className="text-[#2158E0] font-medium hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#privacy"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Privacy Policy: Student and institutional records remain isolated under strict tenant protection and are never monetized or sold.");
                }}
                className="text-[#2158E0] font-medium hover:underline"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>
        </div>

        {/* Primary CTA Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 rounded-xl bg-[#2158E0] hover:bg-[#1a4ec4] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#2158E0]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating your school account...</span>
            </>
          ) : (
            <span>Create School Account</span>
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
          label="Sign up with Google"
          disabled={isSubmitting}
          onError={(err) => setErrorMessage(err)}
        />
      </form>
    </AuthLayout>
  );
}
