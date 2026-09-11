import React from "react";
import { School, Settings2, Users, MessageSquare, CheckCircle2 } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: "01",
      tag: "Step 1",
      title: "Tell Us About Your School",
      desc: "Name, board, classes and sections: we set your account up around your school, not a generic template.",
      icon: School,
    },
    {
      number: "02",
      tag: "Step 2",
      title: "We Configure Your Website & ERP",
      desc: "Our team sets up your website, fee structure and class lists with you, not for you to figure out alone.",
      icon: Settings2,
    },
    {
      number: "03",
      tag: "Step 3",
      title: "Your Staff Start Using It",
      desc: "Attendance, fees and admissions move onto MyZkool with dedicated support while your team gets comfortable.",
      icon: Users,
    },
    {
      number: "04",
      tag: "Step 4",
      title: "Parents Get Updates on WhatsApp",
      desc: "No app to install. Parents start receiving fee reminders, attendance and notices from day one.",
      icon: MessageSquare,
    },
  ];

  return (
    <section className="py-20 bg-[#F6F8FC] border-b border-[#E6EAF3]" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#2158E0] text-xs font-bold tracking-wide uppercase mb-3">
            Simple 4-Step Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#141A2E] tracking-tight">
            From Sign-Up to Live School, Without the Learning Curve
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B6478]">
            We don't hand you an empty account and an instruction manual. We configure it with you.
          </p>
        </div>

        {/* 4-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
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

                <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
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
