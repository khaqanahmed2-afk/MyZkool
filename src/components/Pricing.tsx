import React, { useState } from "react";
import { Check, X, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { ComparisonRow } from "../types";

interface PricingProps {
  onOpenDemo: (selectedPlan?: string) => void;
}

export const Pricing: React.FC<PricingProps> = ({ onOpenDemo }) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "6month" | "12month">("monthly");

  const comparisonData: ComparisonRow[] = [
    { feature: "Website Builder", basic: true, pro: true, custom: true },
    { feature: "Admissions Pipeline", basic: true, pro: true, custom: true },
    { feature: "Fees & Payments", basic: true, pro: true, custom: true },
    { feature: "Attendance & Roll-Call", basic: true, pro: true, custom: true },
    { feature: "WhatsApp Communication", basic: true, pro: true, custom: true },
    { feature: "Exams & Report Cards", basic: false, pro: true, custom: true },
    { feature: "Timetable & Schedule", basic: false, pro: true, custom: true },
    { feature: "Staff & Student Records", basic: false, pro: true, custom: true },
    { feature: "Transport Tracking", basic: false, pro: true, custom: true },
    { feature: "Priority Support", basic: false, pro: true, custom: true },
    { feature: "Multi-branch Management", basic: false, pro: false, custom: true },
    { feature: "Dedicated Onboarding", basic: false, pro: false, custom: true },
    { feature: "Custom Reporting", basic: false, pro: false, custom: true },
    { feature: "Student capacity", basic: "Up to 800", pro: "Up to 1,800", custom: "1,800+" },
  ];

  return (
    <section className="py-20 bg-white border-b border-[#E6EAF3]" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#2158E0] text-xs font-bold tracking-wide uppercase mb-3">
            Clear, Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#141A2E] tracking-tight">
            Fair Plans for Indian Schools
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B6478]">
            No unexpected setup charges. Upgrade or downgrade anytime as your admissions grow.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="mt-8 inline-flex items-center p-1.5 bg-[#F1F5F9] rounded-full border border-[#E6EAF3] max-w-md w-full justify-between">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-[#141A2E] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("6month")}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-1 ${
                billingCycle === "6month"
                  ? "bg-white text-[#2158E0] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              <span>6 Months</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">5% off</span>
            </button>
            <button
              onClick={() => setBillingCycle("12month")}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-1 ${
                billingCycle === "12month"
                  ? "bg-white text-[#2158E0] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              <span>12 Months</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">10% off</span>
            </button>
          </div>
        </div>

        {/* 3-Tier Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-20">
          
          {/* 1. Basic Plan */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-[#E6EAF3] p-7 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold font-heading text-[#141A2E]">Basic</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-200/70 text-[#5B6478]">
                  Up to 800 students
                </span>
              </div>

              {/* Price display */}
              <div className="mb-6">
                {billingCycle === "monthly" && (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-heading text-[#141A2E]">₹999</span>
                      <span className="text-sm text-[#5B6478]">/ month</span>
                    </div>
                    <div className="text-xs text-[#5B6478] mt-1">Billed monthly</div>
                  </div>
                )}
                {billingCycle === "6month" && (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-heading text-[#141A2E]">₹949</span>
                      <span className="text-sm text-[#5B6478]">/ month</span>
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold mt-1">
                      ₹5,694 total billed every 6 months (5% off)
                    </div>
                  </div>
                )}
                {billingCycle === "12month" && (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-heading text-[#141A2E]">₹899</span>
                      <span className="text-sm text-[#5B6478]">/ month</span>
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold mt-1">
                      ₹10,789 total billed annually (10% off)
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pb-6 border-t border-[#E6EAF3] pt-5 text-sm text-[#141A2E]">
                <div className="font-semibold text-xs text-[#5B6478] uppercase tracking-wider">Includes:</div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>Website Builder</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>Admissions Pipeline</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>Fees &amp; Payments</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>Attendance</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>WhatsApp Communication</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenDemo("Basic")}
              className="w-full py-3.5 px-4 rounded-full border border-[#E6EAF3] bg-white text-[#141A2E] hover:border-[#2158E0] hover:text-[#2158E0] font-semibold text-sm transition-all cursor-pointer shadow-xs"
            >
              Choose Basic
            </button>
          </div>

          {/* 2. Pro Plan (HIGHLIGHTED in solid brand-blue #2158E0) */}
          <div className="bg-[#2158E0] text-white rounded-2xl border-2 border-[#1a4ec4] p-7 flex flex-col justify-between shadow-2xl shadow-[#2158E0]/30 transform lg:-translate-y-3 relative">
            {/* Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1FAE7A] text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
              Most Schools Pick This
            </div>

            <div>
              <div className="flex justify-between items-center mb-4 mt-1">
                <h3 className="text-xl font-bold font-heading text-white">Pro</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  Up to 1,800 students
                </span>
              </div>

              {/* Price display */}
              <div className="mb-6">
                {billingCycle === "monthly" && (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-heading text-white">₹1,799</span>
                      <span className="text-sm text-blue-100">/ month</span>
                    </div>
                    <div className="text-xs text-blue-100 mt-1">Billed monthly</div>
                  </div>
                )}
                {billingCycle === "6month" && (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-heading text-white">₹1,709</span>
                      <span className="text-sm text-blue-100">/ month</span>
                    </div>
                    <div className="text-xs text-emerald-300 font-semibold mt-1">
                      ₹10,254 total billed every 6 months (5% off)
                    </div>
                  </div>
                )}
                {billingCycle === "12month" && (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-heading text-white">₹1,619</span>
                      <span className="text-sm text-blue-100">/ month</span>
                    </div>
                    <div className="text-xs text-emerald-300 font-semibold mt-1">
                      ₹19,429 total billed annually (10% off)
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pb-6 border-t border-white/20 pt-5 text-sm text-white">
                <div className="font-semibold text-xs text-blue-100 uppercase tracking-wider">
                  Everything in Basic, plus:
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Exams &amp; Report Cards</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Timetable &amp; Schedules</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Staff &amp; Student Records</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Transport Tracking</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Priority WhatsApp Support</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenDemo("Pro")}
              className="w-full py-3.5 px-4 rounded-full bg-white text-[#2158E0] hover:bg-blue-50 font-bold text-sm transition-all cursor-pointer shadow-md shadow-black/10 active:scale-[0.98]"
            >
              Choose Pro Plan
            </button>
          </div>

          {/* 3. Custom Plan */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-[#E6EAF3] p-7 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold font-heading text-[#141A2E]">Custom</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-200/70 text-[#5B6478]">
                  Above 1,800 students
                </span>
              </div>

              {/* Price display */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold font-heading text-[#141A2E]">Custom Quote</span>
                </div>
                <div className="text-xs text-[#5B6478] mt-1">Multi-branch or large institutions</div>
              </div>

              <div className="space-y-3 pb-6 border-t border-[#E6EAF3] pt-5 text-sm text-[#141A2E]">
                <div className="font-semibold text-xs text-[#5B6478] uppercase tracking-wider">
                  Everything in Pro, plus:
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>Multi-branch Management</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>Dedicated Onboarding Specialist</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>Custom Analytics &amp; Reporting</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span>Tailored Server Isolation</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenDemo("Custom")}
              className="w-full py-3.5 px-4 rounded-full border border-[#E6EAF3] bg-white text-[#141A2E] hover:border-[#2158E0] hover:text-[#2158E0] font-semibold text-sm transition-all cursor-pointer shadow-xs"
            >
              Contact Us for a Quote
            </button>
          </div>

        </div>

        {/* Pricing Footnote & Transparency Bar */}
        <div className="mb-16 max-w-3xl mx-auto space-y-2 text-center">
          <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E6EAF3] text-xs sm:text-sm text-[#141A2E] font-medium flex flex-wrap items-center justify-center gap-2">
            <span>Prepay for 6 or 12 months and save 5% or 10%.</span>
            <span className="text-[#2158E0] font-semibold">Zero setup fee • No hidden charges.</span>
          </div>
          <div className="text-[11px] sm:text-xs text-[#5B6478] space-y-1">
            <p>
              * Prices are exclusive of 18% GST. B2B GST tax invoice with Input Tax Credit (ITC) provided for registered trusts/societies.
            </p>
            <p>
              <strong>Accepted Payments:</strong> UPI (PhonePe, GPay, Paytm), RuPay, Debit/Credit Cards, NetBanking &amp; NEFT/RTGS. Includes a 30-day money-back satisfaction guarantee and pro-rata refunds for prepaid plans.
            </p>
          </div>
        </div>

        {/* Complete Feature Comparison Table */}
        <div className="mt-12 bg-white rounded-3xl border border-[#E6EAF3] shadow-sm overflow-hidden" id="comparison-table">
          <div className="p-6 sm:p-8 bg-[#F8FAFC] border-b border-[#E6EAF3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold font-heading text-[#141A2E]">
                Detailed Feature Comparison
              </h3>
              <p className="text-sm text-[#5B6478] mt-1">
                A clear, itemized breakdown of what is enabled across every tier.
              </p>
            </div>
            <button
              onClick={() => onOpenDemo()}
              className="text-xs font-semibold px-4 py-2 bg-[#2158E0] text-white rounded-full hover:bg-[#1a4ec4] transition-all cursor-pointer"
            >
              Get Free Consultation
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-white text-[#141A2E]">
                  <th className="py-4 px-6 font-bold text-base">Feature</th>
                  <th className="py-4 px-6 font-bold text-base text-center w-36 sm:w-44">Basic</th>
                  <th className="py-4 px-6 font-bold text-base text-center w-36 sm:w-44 bg-blue-50/50 text-[#2158E0]">
                    Pro (Popular)
                  </th>
                  <th className="py-4 px-6 font-bold text-base text-center w-36 sm:w-44">Custom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3]">
                {comparisonData.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-[#F8FAFC] transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#FAFBFD]"}`}
                  >
                    <td className="py-3.5 px-6 font-medium text-[#141A2E]">
                      {row.feature}
                    </td>
                    
                    {/* Basic cell */}
                    <td className="py-3.5 px-6 text-center">
                      {typeof row.basic === "boolean" ? (
                        row.basic ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 text-neutral-400">
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        )
                      ) : (
                        <span className="font-semibold text-xs text-[#5B6478]">{row.basic}</span>
                      )}
                    </td>

                    {/* Pro cell */}
                    <td className="py-3.5 px-6 text-center bg-blue-50/30">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 text-neutral-400">
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        )
                      ) : (
                        <span className="font-bold text-xs text-[#2158E0]">{row.pro}</span>
                      )}
                    </td>

                    {/* Custom cell */}
                    <td className="py-3.5 px-6 text-center">
                      {typeof row.custom === "boolean" ? (
                        row.custom ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 text-neutral-400">
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        )
                      ) : (
                        <span className="font-semibold text-xs text-[#141A2E]">{row.custom}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
};
