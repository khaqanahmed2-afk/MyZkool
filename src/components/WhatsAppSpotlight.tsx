import React from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  FileText,
  Calendar,
} from "lucide-react";

interface WhatsAppSpotlightProps {
  onOpenDemo: () => void;
}

export const WhatsAppSpotlight: React.FC<WhatsAppSpotlightProps> = ({ onOpenDemo }) => {
  return (
    <section
      className="py-20 lg:py-28 bg-[#F0F4FF] relative overflow-hidden"
      id="parent-app"
      aria-label="MyZkool Parent App"
    >
      {/* Decorative background ambient glows */}
      <div
        className="absolute top-0 right-0 w-[540px] h-[540px] rounded-full bg-[#2158E0]/8 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[460px] h-[460px] rounded-full bg-indigo-200/25 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-20 items-center">

          {/* ══════════════════════════════════════════════════ */}
          {/* Left Column: Value Proposition & Copy              */}
          {/* ══════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 space-y-7">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2158E0]/10 border border-[#2158E0]/20 text-[#2158E0] text-xs font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2158E0] animate-pulse" aria-hidden="true" />
              The MyZkool Parent App
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#141A2E] leading-tight">
              One App for{" "}
              <span className="text-[#2158E0]">Every Parent.</span>
            </h2>

            {/* Supporting text */}
            <p className="text-base sm:text-lg text-[#5B6478] leading-relaxed max-w-lg">
              Attendance, fees, notices and important school updates, all in
              one simple app designed for busy parents.
            </p>

            {/* Benefits list (4 feature bullets) */}
            <ul className="space-y-3.5 pt-1">
              {[
                "Check your child's attendance anytime",
                "View and pay school fees online",
                "Get important school notices instantly",
                "Manage multiple children from one account",
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#2158E0]/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2158E0]" aria-hidden="true" />
                  </span>
                  <span className="text-sm sm:text-base text-[#3A4460] font-medium">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="pt-2 space-y-3">
              <button
                onClick={onOpenDemo}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm sm:text-base font-semibold text-white bg-[#2158E0] hover:bg-[#1A47C8] rounded-full shadow-lg shadow-[#2158E0]/25 active:scale-[0.98] transition-all cursor-pointer group"
              >
                Explore the Parent App
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </button>
              <p className="text-xs text-[#8A94A8] pl-1 font-medium">
                Simple for parents. Powerful for schools.
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════ */}
          {/* Right Column: myzkoolp.png with Floating Badges    */}
          {/* ══════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 flex justify-center items-center py-10 sm:py-12 lg:py-6">
            <div className="relative w-full max-w-[520px] sm:max-w-[580px] lg:max-w-[620px] flex items-center justify-center">

              {/* Soft Ambient Glow */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none -z-10 blur-3xl opacity-45 scale-75"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(33,88,224,0.18) 0%, transparent 70%)",
                }}
                aria-hidden="true"
              />

              {/* Attendance Badge — Upper Left */}
              <div
                className="
                  absolute
                  top-[8%]
                  left-[0%]
                  sm:left-[-4%]
                  lg:left-[-6%]
                  z-20
                  flex items-center gap-2.5
                  bg-white/95 backdrop-blur-sm
                  rounded-2xl
                  px-3.5 py-2.5
                  shadow-[0_12px_30px_rgba(15,23,42,0.10)]
                  border border-slate-100
                  select-none
                  animate-[pulse_5s_ease-in-out_infinite]
                "
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#141A2E] leading-tight">
                    Attendance Updated
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                    96% Present &bull; Just now
                  </p>
                </div>
              </div>

              {/* Notice Badge — Upper Right */}
              <div
                className="
                  absolute
                  top-[28%]
                  right-[0%]
                  sm:right-[-4%]
                  lg:right-[-6%]
                  z-20
                  flex items-center gap-2.5
                  bg-white/95 backdrop-blur-sm
                  rounded-2xl
                  px-3.5 py-2.5
                  shadow-[0_12px_30px_rgba(15,23,42,0.10)]
                  border border-slate-100
                  select-none
                  animate-[pulse_6s_ease-in-out_infinite]
                "
              >
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#141A2E] leading-tight">
                    New Notice
                  </p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                    Sports Day circular
                  </p>
                </div>
              </div>

              {/* Fee Badge — Lower Left */}
              <div
                className="
                  absolute
                  bottom-[12%]
                  left-[0%]
                  sm:left-[-4%]
                  lg:left-[-6%]
                  z-20
                  flex items-center gap-2.5
                  bg-white/95 backdrop-blur-sm
                  rounded-2xl
                  px-3.5 py-2.5
                  shadow-[0_12px_30px_rgba(15,23,42,0.10)]
                  border border-slate-100
                  select-none
                  animate-[pulse_5.5s_ease-in-out_infinite]
                "
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#2158E0]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#141A2E] leading-tight">
                    Fee Receipt Available
                  </p>
                  <p className="text-[10px] text-[#2158E0] font-semibold mt-0.5">
                    Instant download &bull; ₹12,000
                  </p>
                </div>
              </div>

              {/* MAIN PHONE IMAGE */}
              <img
                src="/myzkoolp.png"
                alt="MyZkool Parent Mobile App preview"
                className="
                  relative
                  z-10
                  w-[72%]
                  sm:w-[70%]
                  lg:w-[68%]
                  h-auto
                  object-contain
                  drop-shadow-[0_24px_50px_rgba(15,23,42,0.16)]
                  select-none
                  pointer-events-none
                "
                width={1024}
                height={1536}
                loading="eager"
                decoding="async"
              />

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};