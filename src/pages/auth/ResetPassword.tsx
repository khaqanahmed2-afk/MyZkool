import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, refreshSession } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // If URL contains recovery access tokens, refresh session so client can update credentials
    if (window.location.hash.includes("access_token") || window.location.search.includes("type=recovery")) {
      refreshSession();
    }
  }, [refreshSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify your entries.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updatePassword(password);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update password. Please try requesting a new reset link.");
        return;
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while resetting password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your new credentials have been safely applied."
        badgeText="Security Updated"
      >
        <div className="text-center py-6 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#1FAE7A] mx-auto flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#141A2E]">
              Password Reset Complete
            </h3>
            <p className="text-xs text-[#5B6478] leading-relaxed max-w-sm mx-auto">
              You can now sign in to your school management portal with your new password.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full py-3.5 px-6 rounded-xl bg-[#2158E0] hover:bg-[#1a4ec4] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#2158E0]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In to School Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a secure password for your school administrator account."
      badgeText="Account Recovery"
      leftHeadline="Guarding your school's digital records."
      leftSubtext="Ensure your new password uses at least 8 characters with numbers and symbols to keep your institution's records safe."
      leftHighlights={[
        "Minimum 8 characters length recommended",
        "Immediately revokes all prior temporary recovery tokens",
        "Applies instantly across all administrative sessions",
      ]}
      footerLink={{
        text: "Remembered your credentials?",
        linkText: "Back to sign in",
        href: "/login",
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* New Password */}
        <div>
          <label
            htmlFor="new-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[#333E59] mb-1.5"
          >
            New Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="new-password"
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

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirm-new-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[#333E59] mb-1.5"
          >
            Confirm New Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirm-new-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              disabled={isSubmitting}
              className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-[#FBFDFF] border border-[#D5DDEB] rounded-xl text-sm text-[#141A2E] placeholder-[#9BA5B7] focus:bg-white focus:border-[#2158E0] focus:ring-4 focus:ring-[#2158E0]/10 outline-hidden transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8A94A6] hover:text-[#141A2E] transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 rounded-xl bg-[#2158E0] hover:bg-[#1a4ec4] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#2158E0]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <span>Update Password</span>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
