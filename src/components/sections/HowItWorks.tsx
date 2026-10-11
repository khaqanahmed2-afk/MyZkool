import React from "react";
import { CheckCircle2 } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "../../data/landingData";

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-20 bg-[#F6F8FC] border-b border-[#E6EAF3]" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#2158E0] text-xs font-bold tracking-wide uppercase mb-3">
            Simple 4 Step Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#141A2E] tracking-tight">
            From Sign Up to Live School, Without the Learning Curve
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B6478]">
            We don't hand you an empty account and an instruction manual. We configure it with you.
          </p>
        </div>

        {/* 4-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md hover:border-[#2158E0]/40 transition-all flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#2158E0] border border-blue-100">
                      {step.tag}
                    </span>
                    <span className="text-3xl font-black font-heading text-neutral-200 group-hover:text-[#2158E0]/20 transition-colors">
                      {step.number}
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#E6EAF3] flex items-center justify-center text-[#2158E0] mb-4 group-hover:scale-105 group-hover:bg-blue-50 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-bold font-heading text-[#141A2E] mb-2 leading-snug">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[#5B6478] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Guided by our team</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
