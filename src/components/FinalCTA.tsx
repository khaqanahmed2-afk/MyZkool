import React from "react";
import { ArrowRight, CheckCircle2, PhoneCall, ShieldCheck } from "lucide-react";

interface FinalCTAProps {
  onOpenDemo: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onOpenDemo }) => {
  return (
    <section className="py-20 lg:py-24 bg-[#141A2E] text-white relative overflow-hidden" id="final-cta">
      {/* Soft gradient background accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#2158E0]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-200 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4 text-[#1FAE7A]" />
          <span>Zero risk • Guided onboarding • No setup charges</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-heading text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Ready to Bring Your School Online, Properly?
        </h2>

        <p className="mt-6 text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Join schools across Tier-2 and Tier-3 India simplifying their websites, fee collections, and parent communication in one modern login.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onOpenDemo}
            id="final-cta-btn"
            className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-full shadow-xl shadow-[#2158E0]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <span>Book a Free Demo</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Reassurance points */}
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-neutral-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1FAE7A]" />
            <span>30-minute tailored walkthrough</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1FAE7A]" />
            <span>Dedicated setup specialist</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1FAE7A]" />
            <span>Migration from paper / Excel</span>
          </div>
        </div>

      </div>
    </section>
  );
};
