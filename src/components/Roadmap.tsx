import React from "react";
import { Sparkles, BedDouble, BookOpen, MonitorPlay, Smartphone, BrainCircuit, Users2, Banknote, Building2, Languages } from "lucide-react";

export const Roadmap: React.FC = () => {
  const roadmapItems = [
    { title: "Hostel Management", icon: BedDouble, desc: "Room allocation, mess billing & warden sign-offs" },
    { title: "Library Management", icon: BookOpen, desc: "Barcode book issue, return alerts & fine tracking" },
    { title: "Online Classes / LMS integration", icon: MonitorPlay, desc: "Video lessons, homework submissions & quiz bank" },
    { title: "Native Parent Mobile App", icon: Smartphone, desc: "For parents who prefer a dedicated iOS/Android portal" },
    { title: "AI-based fee-default & attendance-risk predictions", icon: BrainCircuit, desc: "Proactive alerts to avoid student drop-outs & defaults" },
    { title: "Alumni Network", icon: Users2, desc: "Graduating batch directory, fundraisers & reunions" },
    { title: "Payroll & Staff HR", icon: Banknote, desc: "Teacher salary generation, PF slips & biometric sync" },
    { title: "Multi-branch / school-group management", icon: Building2, desc: "Unified dashboard for trust boards with 2+ campuses" },
    { title: "Regional language interface (Hindi & more)", icon: Languages, desc: "Hindi, Marathi, Gujarati, Tamil & Telugu UI toggles" },
  ];

  return (
    <section className="py-20 bg-white border-b border-[#E6EAF3]" id="roadmap">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>On the roadmap</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#141A2E] tracking-tight">
            More Magic On the Way
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B6478]">
            We continuously ship high-impact features built directly from principal and teacher feedback.
          </p>
        </div>

        {/* Roadmap Chips Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {roadmapItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-[#E6EAF3] hover:border-[#2158E0]/30 hover:bg-white hover:shadow-sm transition-all group relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E6EAF3] flex items-center justify-center text-[#2158E0] group-hover:scale-105 transition-transform shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-[#2158E0] border border-blue-200">
                    Coming Soon
                  </span>
                </div>
                <h3 className="text-base font-bold font-heading text-[#141A2E] mb-1 group-hover:text-[#2158E0] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[#5B6478] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
