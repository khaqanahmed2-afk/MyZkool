import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import { LegalModal, LegalDocType } from "../../components/ui/LegalModal";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Check,
} from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated, profile, loading } = useAuth();

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Legal Modal State
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalDoc, setLegalModalDoc] = useState<LegalDocType>("terms");

  // If already logged in, redirect to onboarding or admin
  if (isAuthenticated && !loading) {
    const destination = profile?.onboarding_completed
      ? "/admin"
      : profile?.current_onboarding_step || "/onboarding/school";
    return <Navigate to={destination} replace />;
  }

  // Password Strength Calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength(password);
  const getStrengthLabel = (score: number) => {
    if (score <= 1) return { label: "Weak", color: "bg-red-500", text: "text-red-600" };
    if (score === 2) return { label: "Fair", color: "bg-amber-500", text: "text-amber-600" };
    if (score === 3) return { label: "Good", color: "bg-blue-500", text: "text-blue-600" };
    return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-600" };
  };

  const validateForm = (): string | null => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      return "Please enter your full name (minimum 2 characters).";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return "Please enter a valid school email address.";
    }

    // Phone validation: clean 10-digit Indian mobile number
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length > 0) {
      const normalizedPhone =
        cleanPhone.length === 12 && cleanPhone.startsWith("91")
          ? cleanPhone.slice(2)
          : cleanPhone;

      if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
        return "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.";
      }
    } else {
      return "Please enter your contact mobile number for administrative verification.";
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
    if (isSubmitting) return;

    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : phone.trim();

      const res = await signUp(email, password, fullName, formattedPhone);

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

  const openLegalModal = (doc: LegalDocType) => {
    setLegalModalDoc(doc);
    setIsLegalModalOpen(true);
  };

  return (
    <>
      <AuthLayout
        title="Register your school"
        subtitle="Set up your digital campus workspace in under 2 minutes."
        badgeText="School Staff & Administrator Portal"
        footerLink={{
          text: "Already registered your school?",
          linkText: "Sign in to workspace",
          href: "/login",
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Full Name Field */}
          <div>
            <label
              htmlFor="full-name"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="full-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#1E5AF6] focus:ring-4 focus:ring-[#1E5AF6]/10 outline-hidden transition-all duration-150 disabled:bg-slate-50 disabled:cursor-not-allowed shadow-2xs"
              />
            </div>
          </div>

          {/* School Email Address Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              School Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourschool.edu.in"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#1E5AF6] focus:ring-4 focus:ring-[#1E5AF6]/10 outline-hidden transition-all duration-150 disabled:bg-slate-50 disabled:cursor-not-allowed shadow-2xs"
              />
            </div>
          </div>

          {/* Mobile Number Field */}
          <div>
            <label
              htmlFor="phone"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 98765 43210"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#1E5AF6] focus:ring-4 focus:ring-[#1E5AF6]/10 outline-hidden transition-all duration-150 disabled:bg-slate-50 disabled:cursor-not-allowed shadow-2xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Used for instant WhatsApp alerts, OTPs, and school onboarding verification.
            </p>
          </div>

          {/* Password Fields (2 Column Grid on sm+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-9 py-2.5 sm:py-3 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#1E5AF6] focus:ring-4 focus:ring-[#1E5AF6]/10 outline-hidden transition-all duration-150 disabled:bg-slate-50 disabled:cursor-not-allowed shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Confirm <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-9 py-2.5 sm:py-3 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#1E5AF6] focus:ring-4 focus:ring-[#1E5AF6]/10 outline-hidden transition-all duration-150 disabled:bg-slate-50 disabled:cursor-not-allowed shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Password strength:</span>
                <span className={`font-semibold ${getStrengthLabel(passwordStrength).text}`}>
                  {getStrengthLabel(passwordStrength).label}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 rounded-full transition-all duration-200 ${
                      passwordStrength >= step
                        ? getStrengthLabel(passwordStrength).color
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Match Indicator */}
          {confirmPassword.length > 0 && (
            <p
              className={`text-[11px] flex items-center gap-1 font-medium ${
                password === confirmPassword ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {password === confirmPassword ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Passwords match
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match yet
                </>
              )}
            </p>
          )}

          {/* Terms & Privacy Agreement */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#1E5AF6] focus:ring-[#1E5AF6] cursor-pointer"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => openLegalModal("terms")}
                  className="text-[#1E5AF6] font-semibold hover:underline cursor-pointer"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => openLegalModal("privacy")}
                  className="text-[#1E5AF6] font-semibold hover:underline cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </span>
            </label>
          </div>

          {/* Prominent Create Account Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1E5AF6] to-[#0D44D9] hover:from-[#184FD8] hover:to-[#0A3AB8] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating school account...</span>
              </>
            ) : (
              <>
                <span>Create School Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">
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

      {/* Terms & Privacy Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialDoc={legalModalDoc}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </>
  );
}
