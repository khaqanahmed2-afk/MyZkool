import React from "react";
import { Link } from "react-router-dom";
import { MyZkoolLogo } from "../common/MyZkoolLogo";
import {
  ShieldCheck,
  Check,
  ArrowLeft,
  Sparkles,
  School,
  CheckCircle2,
} from "lucide-react";

export interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badgeText?: string;
  leftHeadline?: React.ReactNode;
  leftSubtext?: string;
  leftHighlights?: string[];
  tagline?: string;
  footerLink?: {
    text: string;
    linkText: string;
    href: string;
  };
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  badgeText = "School Staff & Administrator Portal",
  leftHeadline,
  leftSubtext = "Manage your entire school ecosystem — admissions, attendance, fees, exams, and parent communications — in one intuitive cloud ERP.",
  leftHighlights = [
    "Real-time attendance registers with instant parent SMS/WhatsApp sync.",
    "Digital fee collection receipts with zero manual ledger reconciliation.",
    "Role-scoped access for Principals, Teachers, and Accountants.",
    "Zero setup hardware required; runs in any modern browser on phone or PC.",
  ],
  footerLink,
}) => {
  // Highlight badge color mapping for the 4 key benefits
  const checkColors = [
    "bg-emerald-500 text-white shadow-emerald-500/20",
    "bg-[#1E5AF6] text-white shadow-blue-500/20",
    "bg-indigo-600 text-white shadow-indigo-500/20",
    "bg-sky-600 text-white shadow-sky-500/20",
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#EDF4FF] via-[#F3F8FE] to-[#E1EDFD] text-[#0F172A] font-sans antialiased flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* ─── Ambient Decorative Background Accents ─── */}
      <div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-blue-200/40 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-sky-200/40 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 left-1/4 w-72 h-72 bg-indigo-100/35 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* ─── MAIN CENTERED TWO-COLUMN CARD ─── */}
      <div className="w-full max-w-5xl xl:max-w-6xl bg-white rounded-3xl lg:rounded-[32px] shadow-2xl shadow-blue-950/10 border-4 sm:border-[6px] border-white/95 overflow-hidden relative flex flex-col lg:flex-row my-auto z-10 transition-all duration-300">
        
        {/* ─── LEFT BRANDING PANEL (Approx 45% Width, Pale Blue Gradient) ─── */}
        <div className="w-full lg:w-[45%] xl:w-[44%] bg-gradient-to-b from-[#F2F7FF] via-[#EBF3FE] to-[#DFEEFD] p-6 sm:p-8 xl:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-blue-100/80 relative overflow-hidden">
          {/* Subtle decorative background ring */}
          <div
            className="absolute -right-20 -bottom-20 w-64 h-64 border-40 border-blue-200/30 rounded-full pointer-events-none"
            aria-hidden="true"
          />

          {/* Top: Logo & Portal Badge */}
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/"
                className="inline-flex items-center group transition-transform duration-200 hover:scale-[1.02]"
                title="Return to MyZkool Home"
              >
                <MyZkoolLogo size={36} showText={true} textColor="dark" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-white/90 text-[#1E5AF6] border border-blue-200/80 shadow-2xs backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E5AF6] animate-pulse" />
                {badgeText}
              </span>
            </div>

            {/* Main Heading & Subtitle */}
            <div className="mt-6 sm:mt-8">
              <h1 className="text-2xl sm:text-[26px] xl:text-[28px] font-extrabold font-heading text-[#0F172A] tracking-tight leading-snug">
                {leftHeadline || (
                  <>
                    Academic oversight, admissions, and records at{" "}
                    <span className="text-[#1E5AF6]">your fingertips.</span>
                  </>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed font-normal">
                {leftSubtext}
              </p>
            </div>
          </div>

          {/* Middle: ERP Device Preview & Features Card */}
          <div className="relative z-10 my-6 space-y-4">
            {/* Visual ERP Laptop Mockup Showcase */}
            <div className="relative rounded-2xl overflow-hidden border border-white/90 shadow-md bg-white/60 p-2 group hover:shadow-lg transition-shadow duration-300">
              <div className="relative overflow-hidden rounded-xl bg-slate-900">
                <img
                  src="/hero-laptop.png"
                  alt="MyZkool School ERP Dashboard & Mobile App Preview"
                  className="w-full h-auto object-cover transform group-hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                />
              </div>

              {/* Floating Built for modern Indian schools pill */}
              <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md border border-blue-100 rounded-full px-3 py-1 text-[11px] font-semibold text-[#0F172A] shadow-md flex items-center gap-1.5 pointer-events-none">
                <School className="w-3.5 h-3.5 text-[#1E5AF6]" />
                <span>Built for modern Indian schools</span>
              </div>
            </div>

            {/* Feature Highlights Card (White with colorful circular check icons) */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                Key Platform Capabilities
              </p>
              <ul className="space-y-2.5">
                {leftHighlights.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-snug">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                        checkColors[idx % checkColors.length]
                      }`}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span className="font-medium text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar: 256-Bit SSL Encrypted & Back to Home Link */}
          <div className="relative z-10 pt-4 border-t border-blue-200/60 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-[#1E5AF6] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>

        {/* ─── RIGHT FORM PANEL (Approx 55% Width, Clean White Background) ─── */}
        <div className="w-full lg:w-[55%] xl:w-[56%] bg-white p-6 sm:p-10 xl:p-12 flex flex-col justify-between relative">
          
          {/* Top-Right Handwritten Tagline (Matches Reference Image) */}
          <div className="hidden sm:flex absolute top-6 right-6 lg:top-8 lg:right-10 flex-col items-end pointer-events-none select-none z-10">
            <div className="relative text-right pr-2 pt-1">
              {/* Blue spark doodle markings on both sides */}
              <div className="absolute -top-2 left-0 text-[#1E5AF6] flex flex-col gap-0.5 -translate-x-3">
                <span className="w-2.5 h-0.5 bg-[#1E5AF6] rounded-full rotate-45 origin-right" />
                <span className="w-2 h-0.5 bg-[#1E5AF6] rounded-full" />
              </div>
              <div className="absolute -top-2 right-0 text-[#1E5AF6] flex flex-col gap-0.5 translate-x-2">
                <span className="w-2.5 h-0.5 bg-[#1E5AF6] rounded-full -rotate-45 origin-left" />
                <span className="w-2 h-0.5 bg-[#1E5AF6] rounded-full" />
              </div>

              {/* Handwritten text lines */}
              <p className="font-handwritten text-xl xl:text-2xl font-bold text-[#1E5AF6] leading-none tracking-wide -rotate-3">
                Modern Education
              </p>
              <p className="font-handwritten text-xl xl:text-2xl font-bold text-[#1E5AF6] leading-none tracking-wide -rotate-3 mt-0.5">
                Brighter Future
              </p>

              {/* Hand-drawn golden accent arrow */}
              <svg
                className="w-7 h-7 text-[#F59E0B] -rotate-12 translate-x-3 -translate-y-1"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M 12,8 Q 32,10 28,30"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 22,25 L 28,30 L 33,23"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          {/* Form Content Wrapper */}
          <div className="w-full max-w-md mx-auto my-auto py-2 sm:py-4">
            {/* Header: Title & Subtitle */}
            <div className="mb-6 sm:mb-8 text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0F172A] tracking-tight">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Injected Form Body */}
            <div>{children}</div>

            {/* Footer Switching Link */}
            {footerLink && (
              <div className="mt-8 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
                <span>{footerLink.text}</span>{" "}
                <Link
                  to={footerLink.href}
                  className="font-semibold text-[#1E5AF6] hover:text-[#1849D6] hover:underline transition-colors ml-1 inline-flex items-center gap-1"
                >
                  <span>{footerLink.linkText}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            )}
          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 text-center text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} MyZkool Platform · Enterprise School Management</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
