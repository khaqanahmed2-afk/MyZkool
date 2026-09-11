import React from "react";
import { Link } from "react-router-dom";
import { MyZkoolLogo } from "../MyZkoolLogo";
import { ShieldCheck, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badgeText?: string;
  leftHeadline?: string;
  leftSubtext?: string;
  leftHighlights?: string[];
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
  badgeText = "School Administration",
  leftHeadline = "The modern operating system for forward-thinking schools.",
  leftSubtext = "From instant admissions and automated fee receipts to WhatsApp parent broadcasts, everything your school needs in one unified workspace.",
  leftHighlights = [
    "Complete CBSE, ICSE, and State Board academic compliance",
    "Direct WhatsApp alerts with zero per-message surcharges",
    "Multi-user roles for Principals, Teachers, and Accountants",
    "ISO 27001 grade encrypted data privacy & tenant isolation",
  ],
  footerLink,
}) => {
  return (
    <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-body text-[#141A2E]">
      {/* Centered Two-Panel Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-[#E6EAF3] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT PANEL: Brand, Value Proposition & Educational Visual */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#F0F5FE] via-[#EDF3FD] to-[#E7F0FC] p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E2E8F4] relative overflow-hidden">
          {/* Subtle decorative background circles */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-200/30 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-indigo-200/25 blur-3xl pointer-events-none" />

          {/* Top Brand Bar */}
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
                <MyZkoolLogo size={36} showText={true} />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-white/80 text-[#2158E0] border border-blue-100 shadow-xs">
                <Sparkles className="w-3 h-3 text-[#2158E0]" />
                {badgeText}
              </span>
            </div>

            {/* Headline and Narrative */}
            <div className="mt-8 lg:mt-10">
              <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold font-heading text-[#141A2E] leading-tight">
                {leftHeadline}
              </h2>
              <p className="text-sm text-[#5B6478] mt-3 leading-relaxed">
                {leftSubtext}
              </p>
            </div>
          </div>

          {/* Visual Showcase Card with Educational Highlights */}
          <div className="relative z-10 my-6 lg:my-8 bg-white/85 backdrop-blur-xs rounded-2xl p-5 border border-white shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#2158E0] mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2158E0]" />
              Enterprise School Grade
            </div>
            <ul className="space-y-2.5">
              {leftHighlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-[#333E59] font-medium leading-normal">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1FAE7A] shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Security & Back Link */}
          <div className="relative z-10 pt-2 flex items-center justify-between border-t border-blue-100/80 text-xs text-[#5B6478]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1FAE7A] animate-pulse" />
              Secure 256-Bit SSL
            </span>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-[#2158E0] hover:underline font-medium"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Home
            </Link>
          </div>
        </div>

        {/* RIGHT PANEL: The Form Interface */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto">
            {/* Form Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[28px] font-bold font-heading text-[#141A2E] tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-[#5B6478] mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Form Slot */}
            {children}

            {/* Bottom Footer Switch Link */}
            {footerLink && (
              <div className="mt-6 pt-5 border-t border-[#EDF2F7] text-center text-xs text-[#5B6478]">
                {footerLink.text}{" "}
                <Link
                  to={footerLink.href}
                  className="font-semibold text-[#2158E0] hover:text-[#1a4ec4] hover:underline transition-colors ml-1"
                >
                  {footerLink.linkText}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
