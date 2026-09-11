import React from "react";
import { CheckCheck, TrendingUp, UserCheck, ShieldCheck, HeartHandshake, Zap, ArrowUpRight } from "lucide-react";

export const Philosophy: React.FC = () => {
  return (
    <section className="py-20 bg-white border-b border-[#E6EAF3]" id="philosophy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#2158E0] text-xs font-bold tracking-wide uppercase">
              Why MyZkool
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#141A2E] leading-tight">
              Built for Schools That Don't Have an IT Team
            </h2>

            <p className="text-base sm:text-lg text-[#5B6478] leading-relaxed">
              Most school software is built for large, well-staffed institutions. MyZkool is built the other way around: for the school with one admin office, a principal who wears five hats, and parents who live on WhatsApp. We handle the technical complexity so your school doesn't have to.
            </p>

            {/* Practical highlights */}
            <div className="pt-2 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#141A2E]">One Account Manager on WhatsApp</h4>
                  <p className="text-xs sm:text-sm text-[#5B6478]">
                    No complicated support tickets. Your school coordinator gets a dedicated helpline that answers questions in minutes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2158E0] shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#141A2E]">Registers to Cloud in 48 Hours</h4>
                  <p className="text-xs sm:text-sm text-[#5B6478]">
                    Send us your existing excel files, fee books or paper student registers. Our specialists format and load everything for you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Card Stack (AdElevate Style) */}
          <div className="lg:col-span-6 relative">
            {/* Background decorative gradient container */}
            <div className="relative w-full max-w-lg mx-auto bg-gradient-to-tr from-[#EAF1FF] via-[#F4F7FF] to-white p-6 sm:p-8 rounded-3xl border border-[#E6EAF3] shadow-sm">
              <div className="space-y-4">
                {/* Floating Card 1: Fees Collected Bar Chart */}
                <div className="bg-white p-5 rounded-2xl border border-[#E6EAF3] shadow-lg shadow-[#2158E0]/5 transition-transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-semibold text-[#5B6478] uppercase tracking-wider">Fee Realization</span>
                      <div className="text-xl font-bold font-heading text-[#141A2E] flex items-center gap-2">
                        ₹4,82,500 <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">+18% on-time</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#2158E0]">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Mini visual bar chart */}
                  <div className="flex items-end gap-2 h-16 pt-2">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#E2E8F0] rounded-t-sm h-8" />
                      <span className="text-[10px] text-[#5B6478]">Mon</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#CBD5E1] rounded-t-sm h-11" />
                      <span className="text-[10px] text-[#5B6478]">Tue</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#93C5FD] rounded-t-sm h-9" />
                      <span className="text-[10px] text-[#5B6478]">Wed</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#60A5FA] rounded-t-sm h-13" />
                      <span className="text-[10px] text-[#5B6478]">Thu</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#2158E0] rounded-t-sm h-16" />
                      <span className="text-[10px] font-bold text-[#2158E0]">Today</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] text-[11px] text-[#5B6478] flex items-center justify-between">
                    <span>Automated WhatsApp reminders sent</span>
                    <span className="font-semibold text-[#141A2E]">100% automated</span>
                  </div>
                </div>

                {/* Floating Card 2 & 3 in angled split row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Attendance Today Card */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E6EAF3] shadow-md shadow-[#2158E0]/5 transition-transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#5B6478]">Daily Attendance</span>
                      <UserCheck className="w-4 h-4 text-[#1FAE7A]" />
                    </div>
                    <div className="text-2xl font-bold font-heading text-[#141A2E]">
                      94.2%
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-[#1FAE7A] h-full rounded-full w-[94.2%]" />
                    </div>
                    <p className="text-[11px] text-[#5B6478] mt-2">
                      Parents notified within 5 mins of roll-call.
                    </p>
                  </div>

                  {/* WhatsApp Delivered Card */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E6EAF3] shadow-md shadow-[#2158E0]/5 transition-transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#5B6478]">Parent Channel</span>
                      <CheckCheck className="w-4 h-4 text-[#2158E0]" />
                    </div>
                    <div className="text-lg font-bold font-heading text-[#1FAE7A] flex items-center gap-1.5">
                      <span>WhatsApp Delivered</span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">✓✓</span>
                    </div>
                    <p className="text-[11px] text-[#5B6478] mt-2">
                      98.7% open rate vs 12% on legacy parent apps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
