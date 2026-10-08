import React, { useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Users,
  School,
  Sparkles,
  Zap,
  ShieldCheck,
  Target,
  Linkedin,
  Github,
  Instagram,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import type { LegalDocType } from "../components/LegalModal";

// Lazy-load modals for performance
const DemoModal = lazy(() =>
  import("../components/DemoModal").then((m) => ({ default: m.DemoModal }))
);
const LoginModal = lazy(() =>
  import("../components/LoginModal").then((m) => ({ default: m.LoginModal }))
);
const LegalModal = lazy(() =>
  import("../components/LegalModal").then((m) => ({ default: m.LegalModal }))
);

export default function AboutPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>("privacy");

  const handleOpenDemo = () => setIsDemoModalOpen(true);
  const handleOpenLegal = (doc: LegalDocType = "privacy") => {
    setActiveLegalDoc(doc);
    setIsLegalModalOpen(true);
  };

  const founders = [
    {
      name: "Khaqan Ahmad",
      role: "Founder & Product Lead",
      badge: "Founder",
      image: "/Khaqan%20Ahmad.jpg",
      description:
        "Handles product strategy, feature planning, subscription model and overall direction of MyZkool.",
      linkedin: "https://www.linkedin.com/in/khaqan-ahmad-91299b40a",
      github: "https://github.com/khaqanahmed2-afk",
      instagram: "https://www.instagram.com/khaqanlife",
    },
    {
      name: "Ahiri Naskar",
      role: "Co Founder, Business & Growth",
      badge: "Co Founder",
      image: "/Ahiri%20Naskar.png",
      description:
        "Manages online presence, research, marketing, and business development.",
      linkedin: "https://www.linkedin.com/in/ahiri-naskar-769900347/",
      github: undefined,
      instagram: "https://www.instagram.com/ahiri_naskar12",
    },
    {
      name: "Aqsa Ibrahim",
      role: "Co Founder, Product & Tech",
      badge: "Co Founder",
      image: "/Aqsa%20Ibrahim.jpg",
      description:
        "Builds the product with me, handles development and technical execution.",
      linkedin: "https://www.linkedin.com/in/aqsa-ibrahim-0bb7b2434/",
      github: "https://github.com/aqsaibrahim139-sketch",
      instagram: "https://www.instagram.com/aqsa_ibrahim783",
    },
  ];

  const beliefs = [
    {
      number: "01",
      icon: Zap,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      title: "Simple",
      text: "Easy to use tools designed for school administrators, teachers and parents.",
    },
    {
      number: "02",
      icon: Users,
      iconColor: "text-[#2158E0]",
      iconBg: "bg-blue-50",
      title: "Connected",
      text: "Bring schools, teachers, students and parents onto one connected platform.",
    },
    {
      number: "03",
      icon: ShieldCheck,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      title: "Built for Schools",
      text: "Purpose built features for the everyday needs of modern schools.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#141A2E] font-body selection:bg-blue-100 selection:text-[#2158E0]">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <Navbar
        onOpenDemo={handleOpenDemo}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <main id="main-content">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 1. HERO / ABOUT MYZKOOL                                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          className="relative pt-12 pb-20 md:pt-16 md:pb-24 lg:pt-20 lg:pb-28 overflow-hidden bg-white"
          aria-label="About MyZkool Hero"
        >
          {/* Subtle background glows */}
          <div
            className="absolute top-0 right-0 w-[550px] h-[550px] rounded-full pointer-events-none blur-3xl opacity-50"
            style={{
              background:
                "radial-gradient(circle, rgba(33,88,224,0.08) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-10 -left-20 w-[450px] h-[450px] rounded-full pointer-events-none blur-3xl opacity-50"
            style={{
              background:
                "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 xl:gap-14 items-center">
              {/* ── LEFT: Story & Philosophy ───────────────────────────────── */}
              <div className="lg:col-span-6 space-y-6 lg:space-y-7">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-[#2158E0]/20 text-[#2158E0] text-xs font-bold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2158E0] animate-pulse" />
                  ABOUT MYZKOOL
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.85rem] xl:text-[3.25rem] font-extrabold font-heading text-[#0F172A] leading-[1.12] tracking-tight">
                  Built by Students.
                  <br />
                  <span className="text-[#2158E0]">Designed for Schools.</span>
                </h1>

                {/* Supporting paragraph */}
                <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-xl">
                  MyZkool is an all in one school management and digital platform
                  designed to help schools manage their everyday operations,
                  connect with parents and teachers, and build a stronger digital
                  presence, all from one place.
                </p>

                {/* Highlighted Information Card */}
                <div className="bg-[#EEF4FF] border border-[#D5E3FC] rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#2158E0] flex items-center justify-center text-white shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <h2 className="text-base sm:text-lg font-bold font-heading text-[#0F172A]">
                      Built by 17 year old students
                    </h2>
                  </div>
                  <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
                    MyZkool is being built by a team of young students who
                    wanted to create something meaningful for schools. Instead
                    of waiting for the future, we decided to start building it
                    ourselves, learning, experimenting, and solving real
                    problems along the way.
                  </p>
                </div>

                {/* Text below card */}
                <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-xl">
                  We believe school technology should not make education more
                  complicated. MyZkool brings essential school operations
                  together in a simple, affordable and easy to use platform
                  built for modern schools.
                </p>
              </div>

              {/* ── RIGHT: Product Ecosystem Visual ────────────────────────── */}
              <div className="lg:col-span-6 relative flex items-center justify-center pt-8 pb-6 lg:py-0">
                <div className="relative w-full max-w-[560px]">
                  {/* Subtle ambient halo */}
                  <div
                    className="absolute inset-0 rounded-3xl pointer-events-none -z-10 blur-3xl opacity-40"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 50%, rgba(33,88,224,0.18) 0%, transparent 70%)",
                    }}
                    aria-hidden="true"
                  />

                  {/* ── Floating Ecosystem Cards (Connected) ─────────────── */}
                  {/* Card 1: Teachers (Top-Left) */}
                  <div className="absolute -top-6 -left-2 sm:-left-6 z-20 bg-white/95 backdrop-blur-xs rounded-xl p-3 border border-slate-200/90 shadow-lg shadow-black/5 flex items-center gap-2.5 hover:-translate-y-0.5 transition-transform">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A] leading-tight">
                        Teachers
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Manage classes, assessments &amp; more
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Students (Top-Right) */}
                  <div className="absolute -top-4 -right-2 sm:-right-6 z-20 bg-white/95 backdrop-blur-xs rounded-xl p-3 border border-slate-200/90 shadow-lg shadow-black/5 flex items-center gap-2.5 hover:-translate-y-0.5 transition-transform">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A] leading-tight">
                        Students
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Track progress, attendance &amp; growth
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Parents (Bottom-Left) */}
                  <div className="absolute -bottom-6 -left-2 sm:-left-6 z-20 bg-white/95 backdrop-blur-xs rounded-xl p-3 border border-slate-200/90 shadow-lg shadow-black/5 flex items-center gap-2.5 hover:-translate-y-0.5 transition-transform">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A] leading-tight">
                        Parents
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Stay connected &amp; get real time updates
                      </p>
                    </div>
                  </div>

                  {/* Card 4: School Management (Bottom-Right) */}
                  <div className="absolute -bottom-6 -right-2 sm:-right-6 z-20 bg-white/95 backdrop-blur-xs rounded-xl p-3 border border-slate-200/90 shadow-lg shadow-black/5 flex items-center gap-2.5 hover:-translate-y-0.5 transition-transform">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <School className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A] leading-tight">
                        School Management
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Admissions, fees, reports &amp; more
                      </p>
                    </div>
                  </div>

                  {/* ── Main Devices Composition ─────────────────────────── */}
                  <div className="relative z-10 py-8 px-4 sm:px-6">
                    {/* Primary Laptop Mockup */}
                    <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.14)] border border-slate-200/80 bg-white">
                      <img
                        src="/hero-laptop.png"
                        alt="MyZkool School Management System Dashboard"
                        className="w-full h-auto object-contain block"
                        width={1517}
                        height={1037}
                        loading="eager"
                        decoding="async"
                      />
                    </div>

                    {/* Secondary Parent Mobile Mockup overlapping gracefully */}
                    <div className="absolute -bottom-2 right-4 sm:right-8 w-[28%] sm:w-[26%] z-20 drop-shadow-[0_20px_35px_rgba(15,23,42,0.22)]">
                      <img
                        src="/myzkoolp.png"
                        alt="MyZkool Parent Mobile App"
                        className="w-full h-auto object-contain block select-none pointer-events-none"
                        width={1024}
                        height={1536}
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 2. FOUNDERS SECTION                                              */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 lg:py-28 bg-[#F6F9FE] border-t border-b border-[#E2ECFC]"
          aria-label="Meet the Founders"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
              {/* Left Side: Header & Vision Story */}
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#2158E0]/25 text-[#2158E0] text-xs font-bold tracking-widest uppercase shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2158E0]" />
                  MEET THE FOUNDERS
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#0F172A] leading-tight">
                  Three Students.
                  <br />
                  <span className="text-[#2158E0]">One Big Vision.</span>
                </h2>

                <p className="text-base sm:text-lg text-[#475569] leading-relaxed">
                  We are three students who came together with a shared goal:
                  to build a better, simpler and smarter school management
                  system for India.
                </p>

                <p className="text-sm sm:text-base text-[#5B6478] leading-relaxed">
                  Different skills. Same vision. We bring our unique strengths
                  together to turn ideas into real solutions.
                </p>

                {/* Handwritten-style accent callout */}
                <div className="pt-2">
                  <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-[#D8E4F8] shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2158E0]" />
                    <span className="text-sm font-heading font-semibold italic text-[#2158E0]">
                      &ldquo;Young minds. Real impact.&rdquo;
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: 3 Founder Cards */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                  {founders.map((founder) => (
                    <div
                      key={founder.name}
                      className="bg-white rounded-2xl p-6 border border-[#E6EAF3] shadow-xs hover:shadow-lg hover:border-[#2158E0]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div>
                        {/* Founder Photo Container */}
                        <div className="relative mb-5 flex items-center justify-center">
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-slate-200/90 shadow-md group-hover:border-[#2158E0] transition-colors bg-slate-100 shrink-0">
                            <img
                              src={founder.image}
                              alt={founder.name}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-700 shadow-2xs">
                            {founder.badge}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="text-center pt-1 mb-3">
                          <h3 className="text-lg font-bold font-heading text-[#0F172A] leading-snug">
                            {founder.name}
                          </h3>
                          <p className="text-xs font-semibold text-[#2158E0] mt-1 leading-tight">
                            {founder.role}
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-[#5B6478] leading-relaxed text-center mb-5">
                          {founder.description}
                        </p>
                      </div>

                      {/* Social & Action Links */}
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        {/* Icons */}
                        <div className="flex items-center justify-center gap-3">
                          {founder.linkedin && (
                            <a
                              href={founder.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${founder.name} LinkedIn`}
                              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-[#2158E0] border border-slate-200/80 flex items-center justify-center transition-colors"
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {founder.github && (
                            <a
                              href={founder.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${founder.name} GitHub`}
                              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-[#0F172A] border border-slate-200/80 flex items-center justify-center transition-colors"
                            >
                              <Github className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {founder.instagram && (
                            <a
                              href={founder.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${founder.name} Instagram`}
                              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 flex items-center justify-center transition-colors"
                            >
                              <Instagram className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Action Text Links */}
                        <div className="flex flex-col gap-1 text-center pt-1 min-h-[44px] justify-center">
                          {founder.linkedin && (
                            <a
                              href={founder.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-[#2158E0] hover:text-[#1A47B8] flex items-center justify-center gap-1 transition-colors"
                            >
                              <span>Connect on LinkedIn</span>
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                          {founder.github && (
                            <a
                              href={founder.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition-colors"
                            >
                              <span>View GitHub</span>
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 3. WHAT WE BELIEVE                                               */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 lg:py-24 bg-white"
          aria-label="What We Believe"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2158E0]">
                OUR CORE PRINCIPLES
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#0F172A] mt-2">
                What We Believe
              </h2>
              <p className="text-base text-[#5B6478] mt-3">
                The core convictions shaping every feature we create at MyZkool.
              </p>
            </div>

            {/* 3-Card Horizontal Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {beliefs.map((belief) => {
                const Icon = belief.icon;
                return (
                  <div
                    key={belief.title}
                    className="bg-white rounded-2xl p-7 sm:p-8 border border-[#E2ECFC] shadow-xs hover:shadow-md hover:border-[#2158E0]/30 transition-all relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Numbered Indicator & Icon */}
                      <div className="flex items-center justify-between mb-6">
                        <div
                          className={`w-12 h-12 rounded-xl ${belief.iconBg} flex items-center justify-center ${belief.iconColor} shadow-2xs`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-extrabold font-heading text-[#2158E0] tracking-wider px-2.5 py-1 rounded-md bg-blue-50/70 border border-blue-100">
                          {belief.number}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold font-heading text-[#0F172A] mb-3">
                        {belief.title}
                      </h3>

                      {/* Text */}
                      <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
                        {belief.text}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-[#2158E0]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Built for everyday excellence</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 4. OUR VISION BANNER                                             */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section className="py-8 bg-white" aria-label="Our Vision">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-gradient-to-r from-[#10172A] via-[#1A3886] to-[#2158E0] text-white p-8 sm:p-12 lg:p-14 shadow-xl overflow-hidden">
              {/* Subtle radial decorative glow */}
              <div
                className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-white/10 blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left: Large Target/Vision Icon */}
                <div className="lg:col-span-3 flex items-center justify-start lg:justify-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
                    <Target className="w-10 h-10 sm:w-12 sm:h-12 text-blue-200 stroke-[1.75]" />
                  </div>
                </div>

                {/* Right: Vision Statement */}
                <div className="lg:col-span-9 space-y-3">
                  <span className="inline-block text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-blue-200 font-heading">
                    OUR VISION
                  </span>
                  <p className="text-2xl sm:text-3xl lg:text-[2.25rem] font-bold font-heading leading-tight text-white max-w-3xl">
                    &ldquo;To make powerful school technology accessible,
                    simple and affordable for every school.&rdquo;
                  </p>
                  <p className="text-sm sm:text-base text-blue-100/80 pt-1">
                    Every student, teacher, and administrator deserves digital
                    tools that work quietly in the background without friction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 5. FINAL CTA                                                     */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 lg:py-28 bg-white text-center"
          aria-label="Join MyZkool"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-[#0F172A] tracking-tight">
              Be part of the MyZkool journey.
            </h2>
            <p className="text-base sm:text-lg text-[#5B6478] max-w-xl mx-auto leading-relaxed">
              Whether you are an ambitious school leader, a curious educator, or
              a parent looking for better school connectivity, we would love to
              connect with you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-[#2158E0] hover:bg-[#1A47B8] rounded-xl shadow-lg shadow-[#2158E0]/25 hover:shadow-xl hover:shadow-[#2158E0]/35 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span>Explore MyZkool</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <button
                onClick={handleOpenDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#2158E0] bg-white border-2 border-[#2158E0] hover:bg-blue-50/60 rounded-xl active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span>Talk to Us</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <Footer onOpenLegal={handleOpenLegal} />

      {/* ── Interactive Modals (Code-Split) ─────────────────────────────── */}
      <Suspense fallback={null}>
        {isDemoModalOpen && (
          <DemoModal
            isOpen={isDemoModalOpen}
            onClose={() => setIsDemoModalOpen(false)}
            onOpenPrivacy={() => handleOpenLegal("privacy")}
          />
        )}

        {isLoginModalOpen && (
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onOpenDemo={handleOpenDemo}
          />
        )}

        {isLegalModalOpen && (
          <LegalModal
            isOpen={isLegalModalOpen}
            initialDoc={activeLegalDoc}
            onClose={() => setIsLegalModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
