import React from "react";
import { motion } from "motion/react";
import { 
  ArrowRight, 
  Sparkles, 
  Globe, 
  CreditCard, 
  UserCheck, 
  FileSpreadsheet, 
  MessageSquare, 
  CheckCheck, 
  TrendingUp, 
  Calendar,
  Users,
  Bell,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

interface HeroProps {
  onOpenDemo: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDemo }) => {
  const scrollToSteps = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Orbiting chips config
  const orbitChips = [
    { label: "Website", icon: Globe, angle: 0, delay: 0, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "Fees", icon: CreditCard, angle: 72, delay: 0.2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "Attendance", icon: UserCheck, angle: 144, delay: 0.4, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { label: "Exams", icon: FileSpreadsheet, angle: 216, delay: 0.6, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "WhatsApp", icon: MessageSquare, angle: 288, delay: 0.8, color: "text-[#1FAE7A] bg-emerald-50 border-emerald-300" },
  ];

  return (
    <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-gradient-to-b from-[#EAF1FF] via-[#F1F6FF] to-[#F7FAFF] border-b border-[#E6EAF3]">
      {/* Soft radial blue-to-violet gradient glow behind hero visual */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[850px] h-[500px] rounded-full pointer-events-none opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(33,88,224,0.22) 0%, rgba(139,92,246,0.12) 50%, rgba(255,255,255,0) 80%)"
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Centered Hero Header */}
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow Pill */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-[#2158E0]/20 shadow-sm shadow-[#2158E0]/5 text-[#2158E0] text-xs sm:text-sm font-semibold mb-6"
            id="hero-eyebrow"
          >
            <span className="w-2 h-2 rounded-full bg-[#2158E0] animate-pulse" />
            <span>Built for Tier 2 & Tier 3 schools across India</span>
          </motion.div>

          {/* Headline: "One Login" (brand blue) for Your Entire School: Website, Fees, Attendance & WhatsApp Updates */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.18] text-[#141A2E]"
            id="hero-headline"
          >
            <span className="text-[#2158E0] inline-block mr-2 sm:mr-3">One Login</span>
            <span>for Your Entire School: Website, Fees, Attendance &amp; WhatsApp Updates</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg lg:text-xl text-[#5B6478] leading-relaxed max-w-3xl mx-auto"
            id="hero-subhead"
          >
            MyZkool replaces five disconnected tools with one simple, affordable platform so your staff spend less time on software, and parents get every update where they already check: WhatsApp.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4"
          >
            <button
              onClick={onOpenDemo}
              id="hero-primary-cta"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-[#2158E0] hover:bg-[#1a47b8] rounded-full shadow-lg shadow-[#2158E0]/30 hover:shadow-xl hover:shadow-[#2158E0]/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Book a Free Demo</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={scrollToSteps}
              id="hero-ghost-cta"
              className="w-full sm:w-auto px-7 py-4 text-base font-semibold text-[#141A2E] bg-white/90 hover:bg-white hover:text-[#2158E0] border border-[#E6EAF3] rounded-full shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>See How It Works</span>
              <ChevronRight className="w-4 h-4 text-[#5B6478]" />
            </button>
          </motion.div>
        </div>

        {/* Hero Visual Zone: Two overlapping browser-style dashboard mockup screens + Orbiting Chips */}
        <div className="mt-14 lg:mt-20 relative max-w-5xl mx-auto">
          {/* Subtle Orbiting Arc Path Outline */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[340px] sm:w-[580px] lg:w-[720px] h-[340px] sm:h-[480px] lg:h-[540px] rounded-full border border-[#2158E0]/15 border-dashed" />
          </div>

          {/* Floating Orbiting Chips (Top, Sides, Bottom) */}
          <div className="relative w-full min-h-[460px] sm:min-h-[540px] lg:min-h-[580px] flex items-center justify-center">
            {/* Primary Browser Mockup 1: Admin Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 6 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="relative w-full max-w-3xl rounded-2xl bg-white border border-[#E6EAF3] shadow-[0_24px_50px_rgba(33,88,224,0.12)] overflow-hidden z-10"
              style={{ transform: "perspective(1000px) rotateX(1deg) rotateY(-1deg)" }}
              id="hero-admin-mockup"
            >
              {/* Browser chrome header */}
              <div className="h-10 bg-[#F8FAFC] border-b border-[#E6EAF3] px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
                  <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
                  <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
                </div>
                <div className="bg-white px-3 sm:px-4 py-1 rounded-md border border-[#E6EAF3] text-[10px] sm:text-[11px] text-[#5B6478] font-mono flex items-center gap-1.5 shadow-xs truncate max-w-[200px] sm:max-w-none">
                  <Globe className="w-3 h-3 text-[#2158E0] shrink-0" />
                  <span>https://stmarys-academy.myzkool.in/admin</span>
                </div>
                <div className="text-[10px] text-[#2158E0] font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <span>Sample Dashboard Preview</span>
                </div>
              </div>

              {/* Inside Dashboard Content */}
              <div className="p-4 sm:p-6 bg-white">
                {/* School Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2158E0] font-bold text-lg font-heading">
                      SM
                    </div>
                    <div>
                      <h3 className="font-heading text-base font-bold text-[#141A2E] leading-tight">
                        St. Mary's Higher Secondary School
                      </h3>
                      <p className="text-xs text-[#5B6478]">CBSE Affiliation #213084 • Session 2026-27</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Website Live
                    </span>
                  </div>
                </div>

                {/* Dashboard Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E6EAF3]">
                    <div className="flex items-center justify-between text-[#5B6478] mb-1">
                      <span className="text-[11px] font-medium">Total Students</span>
                      <Users className="w-3.5 h-3.5 text-[#2158E0]" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#141A2E] font-heading">1,248</div>
                    <span className="text-[10px] text-emerald-600 font-medium">100% Enrolled</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E6EAF3]">
                    <div className="flex items-center justify-between text-[#5B6478] mb-1">
                      <span className="text-[11px] font-medium">Today's Attendance</span>
                      <UserCheck className="w-3.5 h-3.5 text-[#1FAE7A]" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#141A2E] font-heading">94.8%</div>
                    <span className="text-[10px] text-[#5B6478]">1,183 present</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E6EAF3]">
                    <div className="flex items-center justify-between text-[#5B6478] mb-1">
                      <span className="text-[11px] font-medium">Quarter 1 Fees</span>
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#141A2E] font-heading">₹18.4L</div>
                    <span className="text-[10px] text-emerald-600 font-medium">+14% vs last term</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E6EAF3]">
                    <div className="flex items-center justify-between text-[#5B6478] mb-1">
                      <span className="text-[11px] font-medium">WhatsApp Delivery</span>
                      <MessageSquare className="w-3.5 h-3.5 text-[#1FAE7A]" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#1FAE7A] font-heading">99.6%</div>
                    <span className="text-[10px] text-[#5B6478]">Instant double-tick</span>
                  </div>
                </div>

                {/* Mini Activity Row */}
                <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2158E0]" />
                    <p className="text-xs text-[#141A2E]">
                      <span className="font-semibold">Automatic WhatsApp Trigger:</span> Q1 Fee due reminder sent to 142 parents with UPI payment link.
                    </p>
                  </div>
                  <span className="text-[11px] text-[#2158E0] font-semibold whitespace-nowrap">
                    ₹68,400 collected today
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Overlapping Secondary Browser Mockup 2: WhatsApp Chat & Fee Receipt (HubTub angled style) */}
            <motion.div
              initial={{ opacity: 0, x: 50, y: 60 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="absolute -bottom-6 -right-2 sm:-right-6 lg:-right-10 w-[270px] sm:w-[320px] rounded-2xl bg-white border border-[#E6EAF3] shadow-[0_25px_60px_rgba(31,174,122,0.18)] overflow-hidden z-20 hidden xs:block sm:block"
              style={{ transform: "rotate(3deg)" }}
              id="hero-whatsapp-mockup"
            >
              {/* WhatsApp Header */}
              <div className="bg-[#075E54] text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                    SM
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">St. Mary's School</div>
                    <div className="text-[9px] text-emerald-200">Verified School Account ✓</div>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-100">Today</div>
              </div>

              {/* WhatsApp Chat Messages */}
              <div className="p-3 bg-[#EFEAE2] space-y-2.5 text-xs">
                <div className="bg-white p-2.5 rounded-lg rounded-tl-none shadow-xs border border-neutral-200/60 max-w-[90%]">
                  <div className="text-[10px] text-neutral-500 font-semibold mb-1">St. Mary's Accounts</div>
                  <p className="text-[#141A2E] text-[11px]">
                    Dear Parent, Term 1 fee for <b>Rohan Sharma (Class 6-B)</b> of ₹4,200 is due on 15th Sept.
                  </p>
                  <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-[10px] text-[#2158E0] font-bold">Tap to pay via UPI / Cards</span>
                    <span className="text-[9px] text-neutral-400">10:14 AM</span>
                  </div>
                </div>

                <div className="bg-[#DCF8C6] p-2 rounded-lg rounded-tr-none shadow-xs ml-auto max-w-[85%]">
                  <p className="text-[#141A2E] text-[11px]">Paid via Google Pay, thank you! 🙏</p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[9px] text-neutral-500">10:19 AM</span>
                    <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg rounded-tl-none shadow-xs border border-neutral-200/60 max-w-[90%]">
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <span>Receipt #SMS-2026-8942 Issued</span>
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-1">
                    Instant fee receipt saved to your parent portal.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Orbiting Floating Chips (Positioned with smooth float animations) */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-5 -left-2 sm:left-4 z-30 bg-white/95 backdrop-blur-sm border border-blue-200 px-3.5 py-1.5 rounded-full shadow-md shadow-blue-500/10 flex items-center gap-2 text-xs font-semibold text-blue-800"
            >
              <Globe className="w-4 h-4 text-[#2158E0]" />
              <span>School Website Builder</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
              className="absolute -top-6 right-8 sm:right-16 z-30 bg-white/95 backdrop-blur-sm border border-emerald-200 px-3.5 py-1.5 rounded-full shadow-md shadow-emerald-500/10 flex items-center gap-2 text-xs font-semibold text-emerald-800"
            >
              <MessageSquare className="w-4 h-4 text-[#1FAE7A]" />
              <span>Direct WhatsApp Alerts</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-8 left-6 sm:left-14 z-30 bg-white/95 backdrop-blur-sm border border-indigo-200 px-3.5 py-1.5 rounded-full shadow-md shadow-indigo-500/10 flex items-center gap-2 text-xs font-semibold text-indigo-900"
            >
              <TrendingUp className="w-4 h-4 text-[#2158E0]" />
              <span>Online Fee Collection</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
