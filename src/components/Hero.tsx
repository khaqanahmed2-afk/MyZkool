import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  UserPlus,
  Users,
  CalendarCheck,
  CreditCard,
  MessageSquare,
  BarChart3,
  Globe,
  Check,
  ChevronRight,
} from "lucide-react";

interface HeroProps {
  onOpenDemo: () => void;
}

/* ─────────────────────────────────────────────────────────── */
/* Feature Pills                                                */
/* ─────────────────────────────────────────────────────────── */
const featurePills = [
  { label: "Admissions", icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Students", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Attendance", icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Fees", icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50" },
  { label: "Communication", icon: MessageSquare, color: "text-violet-600", bg: "bg-violet-50" },
  { label: "Reports", icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "School Website", icon: Globe, color: "text-teal-600", bg: "bg-teal-50" },
];

/* ─────────────────────────────────────────────────────────── */
/* Feature Strip Data                                           */
/* ─────────────────────────────────────────────────────────── */
const featureStripItems = [
  {
    num: "01",
    icon: Users,
    title: "Student Management",
    desc: "Keep all student data, documents and profiles in one place.",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    num: "02",
    icon: CalendarCheck,
    title: "Attendance",
    desc: "Track attendance easily for students and staff.",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    num: "03",
    icon: CreditCard,
    title: "Fee Management",
    desc: "Automate fees, send reminders and track payments.",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
  },
  {
    num: "04",
    icon: MessageSquare,
    title: "Parent Communication",
    desc: "Stay connected with parents in real time.",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
  },
  {
    num: "05",
    icon: Globe,
    title: "School Website",
    desc: "Create a beautiful, professional website for your school.",
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
  },
];

/* ─────────────────────────────────────────────────────────── */
/* Main Component                                               */
/* ─────────────────────────────────────────────────────────── */
export const Hero: React.FC<HeroProps> = ({ onOpenDemo }) => {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Subtle initial reveal
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const scrollToFeatures = () => {
    const el = document.getElementById("features") || document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section
        ref={heroRef}
        className="relative pt-10 pb-12 md:pt-14 md:pb-16 lg:pt-16 lg:pb-20 overflow-hidden bg-white"
        aria-label="Hero"
      >
        {/* ── Subtle dot-grid background ─────────────────────── */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(#2158E0 0.8px, transparent 0.8px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* ── Subtle blue glow for depth ─────────────────────── */}
        <div
          className="absolute -top-20 -left-24 w-[480px] h-[440px] rounded-full pointer-events-none blur-3xl opacity-60"
          aria-hidden="true"
          style={{ background: "radial-gradient(circle, rgba(33,88,224,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/4 right-0 w-[550px] h-[550px] rounded-full pointer-events-none blur-3xl opacity-60"
          aria-hidden="true"
          style={{ background: "radial-gradient(circle, rgba(33,88,224,0.08) 0%, transparent 65%)" }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">

            {/* ══════════════════════════════════════════════════ */}
            {/* LEFT — Marketing Content (45–50%)                  */}
            {/* ══════════════════════════════════════════════════ */}
            <div
              className={`lg:col-span-5 xl:col-span-5 space-y-6 lg:space-y-7 transition-all duration-700 ease-out ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              {/* Badge */}
              <div
                id="hero-eyebrow"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#2158E0]/25 text-[#2158E0] text-xs sm:text-[13px] font-semibold shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full bg-[#2158E0] animate-pulse" aria-hidden="true" />
                Complete School Management &amp; Website Platform
              </div>

              {/* Headline */}
              <h1
                id="hero-headline"
                className="text-[2.25rem] sm:text-5xl lg:text-[2.75rem] xl:text-[3.25rem] font-extrabold font-heading leading-[1.12] tracking-tight text-[#0F172A]"
              >
                One Platform.
                <br />
                Your Entire School,
                <br />
                <span className="text-[#2158E0]">Simplified.</span>
              </h1>

              {/* Supporting text */}
              <p
                id="hero-subhead"
                className="text-base sm:text-[17px] text-[#475569] leading-[1.75] max-w-[480px]"
              >
                Manage your school, connect with parents, and grow your digital presence, all from one powerful platform.
              </p>

              {/* Core Module Pills */}
              <div className="space-y-2.5">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Core Modules
                </p>
                <div className="flex flex-wrap gap-2" id="hero-feature-pills" role="list">
                  {featurePills.map((pill) => {
                    const Icon = pill.icon;
                    return (
                      <div
                        key={pill.label}
                        role="listitem"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs hover:border-[#2158E0]/40 hover:shadow-xs transition-all cursor-default"
                      >
                        <span className={`${pill.bg} p-0.5 rounded-full`}>
                          <Icon className={`w-3 h-3 ${pill.color} shrink-0`} aria-hidden="true" />
                        </span>
                        {pill.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={onOpenDemo}
                  id="hero-primary-cta"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[15px] font-semibold text-white bg-[#2158E0] hover:bg-[#1A47B8] rounded-xl shadow-md shadow-[#2158E0]/20 hover:shadow-lg hover:shadow-[#2158E0]/30 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
                >
                  Book a Demo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </button>

                <button
                  onClick={scrollToFeatures}
                  id="hero-secondary-cta"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[15px] font-semibold text-[#2158E0] bg-white border-2 border-[#2158E0] hover:bg-[#2158E0]/5 rounded-xl active:scale-[0.98] transition-all duration-200 cursor-pointer group"
                >
                  Explore MyZkool
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </button>
              </div>

              {/* Trust points */}
              <div className="flex flex-wrap items-center gap-y-2.5 gap-x-5 text-[13px] text-[#475569] font-medium">
                {["No setup fee", "Easy to use", "Dedicated support"].map((point) => (
                  <div key={point} className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" aria-hidden="true" />
                    </span>
                    {point}
                  </div>
                ))}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════ */}
            {/* RIGHT — Product Showcase Image (50–55%)            */}
            {/* ══════════════════════════════════════════════════ */}
            <div
              className={`lg:col-span-7 xl:col-span-7 flex items-center justify-center lg:justify-end transition-all duration-700 ease-out delay-150 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <div className="relative w-full max-w-[720px] xl:max-w-[780px] flex items-center justify-center">
                {/* Clean soft ambient glow behind the mockup */}
                <div
                  className="absolute inset-0 rounded-3xl pointer-events-none -z-10 blur-3xl opacity-50 scale-95"
                  style={{
                    background: "radial-gradient(ellipse at 50% 50%, rgba(33,88,224,0.12) 0%, rgba(99,102,241,0.04) 50%, transparent 70%)",
                  }}
                  aria-hidden="true"
                />

                {/* Main Generated MyZkool Product Mockup Image */}
                <img
                  src="/hero-laptop.png"
                  alt="MyZkool School Management Platform and Parent App preview"
                  className="w-full h-auto object-contain drop-shadow-[0_20px_45px_rgba(15,23,42,0.12)] rounded-xl select-none"
                  width={1517}
                  height={1037}
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* FEATURE STRIP                                            */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="w-full bg-[#EEF3FD] border-t border-[#D8E4F8] border-b" aria-label="Core feature overview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[#C8D8F2]">
            {featureStripItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.num}
                  className="flex flex-col gap-3 px-5 py-7 group hover:bg-[#E4ECFB] transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-4.5 h-4.5 ${item.iconColor}`} aria-hidden="true" />
                    </div>
                    <span className="text-[11px] font-bold text-[#2158E0] tracking-wider">{item.num}</span>
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">{item.title}</h3>
                    <p className="text-[12px] text-[#475569] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
