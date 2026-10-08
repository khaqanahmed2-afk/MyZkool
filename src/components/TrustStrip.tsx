import React from "react";
import { CheckCircle2, ShieldCheck, Users, School, Sparkles } from "lucide-react";

export const TrustStrip: React.FC = () => {
  const claims = [
    {
      title: "One platform",
      detail: "website + ERP + WhatsApp",
      icon: School,
    },
    {
      title: "No IT team required",
      detail: "zero technical burden",
      icon: Users,
    },
    {
      title: "Setup with our team",
      detail: "guided, not a manual",
      icon: ShieldCheck,
    },
    {
      title: "Built for Indian school workflows",
      detail: "CBSE, ICSE & State Boards",
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="py-8 bg-white border-b border-[#E6EAF3]" id="trust-strip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Qualitative Claims Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {claims.map((claim, idx) => {
            const Icon = claim.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-[#E6EAF3] hover:border-[#2158E0]/30 hover:bg-[#F1F6FF] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E6EAF3] flex items-center justify-center text-[#2158E0] shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#141A2E] leading-snug group-hover:text-[#2158E0] transition-colors">
                    {claim.title}
                  </div>
                  <div className="text-xs text-[#5B6478] truncate">
                    {claim.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Board & Regional Trust Strip */}
        <div className="mt-6 pt-5 border-t border-[#F1F5F9] flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 text-xs text-[#5B6478]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#141A2E] shrink-0">Supported Curriculums:</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-[#141A2E] font-medium text-xs">
              CBSE
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-[#141A2E] font-medium text-xs">
              ICSE / ISC
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-[#141A2E] font-medium text-xs">
              State Boards (UP, MP, MH, RJ, BR, etc.)
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-100/90 text-[#2158E0] text-xs font-semibold self-start md:self-auto shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#2158E0]" aria-hidden="true" />
            <span>Built for modern Indian schools</span>
          </div>
        </div>
      </div>
    </section>
  );
};
