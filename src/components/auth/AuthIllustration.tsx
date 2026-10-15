import React from "react";
import {
  CheckCircle2,
  TrendingUp,
  MessageCircle,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  Bell,
  Sparkles,
} from "lucide-react";

export const AuthIllustration: React.FC = () => {
  return (
    <div className="relative w-full max-w-md mx-auto select-none" aria-hidden="true">
      {/* Ambient background glows */}
      <div className="absolute -top-10 -left-10 w-44 h-44 bg-[#1E5AF6]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#00D2FF]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic School ERP Dashboard Card */}
      <div className="relative z-10 bg-gradient-to-b from-white/[0.12] to-white/[0.04] backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-2xl shadow-black/30 text-white">
        {/* Card Header: School Badge */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E5AF6] to-[#0A38B8] flex items-center justify-center text-white shadow-md shadow-[#1E5AF6]/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-bold text-sm tracking-tight text-white">
                  St. Xavier&apos;s Academy
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              </div>
              <p className="text-[11px] text-slate-300">
                CBSE Affiliated · 1,480 Students
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
            Term Active
          </span>
        </div>

        {/* 3 Metric Tiles Grid */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="bg-white/[0.06] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-medium">Attendance</span>
              <Users className="w-3 h-3 text-[#60A5FA]" />
            </div>
            <div className="mt-1.5">
              <span className="text-base font-bold font-heading text-white">
                98.4%
              </span>
              <p className="text-[9px] text-[#34D399] flex items-center gap-0.5 mt-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Synced
              </p>
            </div>
          </div>

          <div className="bg-white/[0.06] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-medium">Fee Collected</span>
              <CreditCard className="w-3 h-3 text-[#34D399]" />
            </div>
            <div className="mt-1.5">
              <span className="text-base font-bold font-heading text-white">
                ₹8.4L
              </span>
              <p className="text-[9px] text-[#60A5FA] flex items-center gap-0.5 mt-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> +14% vs Q1
              </p>
            </div>
          </div>

          <div className="bg-white/[0.06] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-medium">Parent Sync</span>
              <MessageCircle className="w-3 h-3 text-[#25D366]" />
            </div>
            <div className="mt-1.5">
              <span className="text-base font-bold font-heading text-white">
                100%
              </span>
              <p className="text-[9px] text-[#25D366] flex items-center gap-0.5 mt-0.5">
                WhatsApp Live
              </p>
            </div>
          </div>
        </div>

        {/* Live Activity Row: Instant WhatsApp Dispatch */}
        <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#25D366]/20 text-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-3 h-3" />
              </div>
              <span className="font-medium text-white">Daily Attendance Broadcast</span>
            </div>
            <span className="text-[10px] text-slate-400">08:45 AM</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-[#1E5AF6] to-[#25D366] h-full rounded-full w-[94%]" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>1,392 notices delivered to parent mobile</span>
            <span className="text-[#34D399] font-medium">Delivered</span>
          </div>
        </div>

        {/* Floating Mini Badge */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#60A5FA]" />
            End-to-End Encrypted Data
          </span>
          <span className="flex items-center gap-1 text-[#60A5FA] font-medium">
            <Sparkles className="w-3 h-3" /> Zero IT Staff Needed
          </span>
        </div>
      </div>

      {/* Decorative Floating Sub-Card: Real-time Fee Receipt */}
      <div className="absolute -bottom-4 -left-3 sm:-left-4 z-20 bg-[#0F224A]/90 backdrop-blur-md border border-[#2158E0]/40 rounded-xl px-3.5 py-2.5 shadow-xl flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#10B981]/20 text-[#10B981] flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-white">
            Fee Receipt #REC-8491
          </p>
          <p className="text-[10px] text-slate-400">
            ₹14,500 via UPI · Auto-reconciled
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthIllustration;
