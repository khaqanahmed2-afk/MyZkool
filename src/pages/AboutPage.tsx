import React, { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  School,
  BookOpen,
  GraduationCap,
  Users,
  Linkedin,
  Github,
  CheckCircle2,
  ExternalLink,
  Target,
  Sparkles,
  MapPin,
  Calendar,
  Building2,
  Compass,
} from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { useLandingModals } from "../hooks/useLandingModals";
import {
  FOUNDERS,
  CORE_PRINCIPLES,
  STAKEHOLDER_PILLARS,
} from "../data/aboutData";
import { usePageMetadata } from "../hooks/usePageMetadata";

// Lazy-load interactive modals for zero-overhead initial bundle
const DemoModal = lazy(() =>
  import("../components/ui/DemoModal").then((m) => ({ default: m.DemoModal }))
);
const LoginModal = lazy(() =>
  import("../components/ui/LoginModal").then((m) => ({ default: m.LoginModal }))
);
const LegalModal = lazy(() =>
  import("../components/ui/LegalModal").then((m) => ({ default: m.LegalModal }))
);

/**
 * Avatar image component with fallback support for neutral placeholder
 */
function FounderAvatar({
  image,
  fallbackImage,
  name,
  isPlaceholder,
}: {
  image: string;
  fallbackImage?: string;
  name: string;
  isPlaceholder?: boolean;
}) {
  const [imgSrc, setImgSrc] = React.useState(image);
  const [hasError, setHasError] = React.useState(false);

  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-md group-hover:border-[#2158E0] group-hover:shadow-lg transition-all duration-300 bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center shrink-0">
      {!hasError ? (
        <picture className="w-full h-full flex items-center justify-center">
          {!isPlaceholder && (
            <source
              srcSet={imgSrc.replace(/\.(png|jpg|jpeg)$/i, ".webp")}
              type="image/webp"
            />
          )}
          <img
            src={imgSrc}
            alt={`${name} — MyZkool`}
            className={`w-full h-full ${
              isPlaceholder
                ? "object-contain p-2"
                : "object-cover object-center group-hover:scale-105"
            } transition-transform duration-300`}
            width={128}
            height={128}
            loading="lazy"
            decoding="async"
            onError={() => {
              if (fallbackImage && imgSrc !== fallbackImage) {
                setImgSrc(fallbackImage);
              } else {
                setHasError(true);
              }
            }}
          />
        </picture>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2158E0] font-heading font-bold text-lg flex items-center justify-center">
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AboutPage() {
  const {
    isDemoModalOpen,
    isLoginModalOpen,
    isLegalModalOpen,
    activeLegalDoc,
    handleOpenDemo,
    handleCloseDemo,
    handleOpenLogin,
    handleCloseLogin,
    handleOpenLegal,
    handleCloseLegal,
  } = useLandingModals();

  usePageMetadata({
    title: "About MyZkool | School Management & Education Technology",
    description:
      "Discover MyZkool, an integrated school management and digital platform helping educational institutions simplify operations, improve communication, and build their digital presence.",
    canonical: "https://myzkool.in/about",
    ogImage: "https://myzkool.in/hero-laptop.png",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About MyZkool",
      description:
        "Discover MyZkool, an integrated school management and digital platform helping educational institutions simplify operations, improve communication, and build their digital presence.",
      url: "https://myzkool.in/about",
      mainEntity: {
        "@type": "Organization",
        name: "MyZkool Technologies",
        url: "https://myzkool.in",
        foundingLocation: {
          "@type": "Place",
          name: "Lucknow, Uttar Pradesh, India",
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Lucknow",
          addressRegion: "Uttar Pradesh",
          addressCountry: "India",
        },
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://myzkool.in/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "About MyZkool",
            item: "https://myzkool.in/about",
          },
        ],
      },
    },
  });

  return (
    <div className="min-h-screen bg-white text-[#141A2E] font-body selection:bg-blue-100 selection:text-[#2158E0]">
      {/* ── Global Header / Navigation ──────────────────────────────────── */}
      <Navbar onOpenDemo={handleOpenDemo} onOpenLogin={handleOpenLogin} />

      <main id="main-content">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 1. HERO / ABOUT MYZKOOL                                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          className="relative pt-12 pb-16 md:pt-16 md:pb-24 lg:pt-20 lg:pb-28 overflow-hidden bg-gradient-to-b from-[#F9FBFF] via-white to-white border-b border-slate-100"
          aria-label="About MyZkool Hero"
        >
          {/* Subtle ambient corporate radial glows */}
          <div
            className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none blur-3xl opacity-40 -z-10"
            style={{
              background:
                "radial-gradient(circle, rgba(33,88,224,0.10) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-0 w-[450px] h-[450px] rounded-full pointer-events-none blur-3xl opacity-30 -z-10"
            style={{
              background:
                "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 xl:gap-14 items-center">
              {/* ── LEFT: Value Proposition ────────────────────────────────── */}
              <div className="lg:col-span-6 space-y-6 lg:space-y-7">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-[#2158E0]/20 text-[#2158E0] text-xs font-bold tracking-widest uppercase shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2158E0]" />
                  ABOUT MYZKOOL
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] xl:text-[3.25rem] font-extrabold font-heading text-[#0F172A] leading-[1.12] tracking-tight">
                  Empowering Schools <br className="hidden sm:inline" />
                  <span className="text-[#2158E0]">Through Technology.</span>
                </h1>

                {/* Subheadings & Core Narrative */}
                <div className="space-y-4 text-base sm:text-lg text-[#475569] leading-relaxed">
                  <p>
                    MyZkool is an integrated school management and digital
                    platform designed to simplify institutional operations,
                    improve communication, and strengthen the digital presence
                    of educational institutions.
                  </p>
                  <p className="text-sm sm:text-base text-[#5B6478]">
                    From admissions and student records to fee management,
                    attendance, academics, and school websites, MyZkool brings
                    essential school operations together in one connected
                    ecosystem.
                  </p>
                </div>

                {/* Goal Highlight Card */}
                <div className="bg-[#F8FAFF] border border-[#D5E3FC] rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
                  <div className="flex items-start gap-3.5">
                    <span className="w-8 h-8 rounded-lg bg-[#2158E0] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2158E0] mb-1">
                        Our Mission
                      </p>
                      <p className="text-sm sm:text-[15px] font-medium text-[#1E293B] leading-relaxed">
                        Our goal is simple: make modern school technology
                        accessible, practical, and affordable for educational
                        institutions across India.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons & Headquarters Tag */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <button
                    onClick={() => handleOpenDemo()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm sm:text-base font-semibold text-white bg-[#2158E0] hover:bg-[#1A47B8] rounded-xl shadow-md shadow-[#2158E0]/20 hover:shadow-lg hover:shadow-[#2158E0]/30 active:scale-[0.99] transition cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book a Free Demo</span>
                  </button>

                  <a
                    href="#ecosystem"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm sm:text-base font-semibold text-[#1E293B] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                  >
                    <span>Explore Platform</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </a>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#64748B] pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2158E0] shrink-0" />
                  <span>
                    MyZkool Technologies &bull; Lucknow, Uttar Pradesh, India
                  </span>
                </div>
              </div>

              {/* ── RIGHT: Product Ecosystem Mockup ────────────────────────── */}
              <div className="lg:col-span-6 relative flex items-center justify-center pt-4 lg:pt-0">
                <div className="relative w-full max-w-[560px]">
                  {/* Subtle ambient halo */}
                  <div
                    className="absolute inset-0 rounded-3xl pointer-events-none -z-10 blur-3xl opacity-30"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 50%, rgba(33,88,224,0.18) 0%, transparent 70%)",
                    }}
                    aria-hidden="true"
                  />

                  {/* Floating Pillar Badges */}
                  <div className="hidden sm:flex absolute -top-4 -left-3 z-20 bg-white/95 backdrop-blur-xs rounded-xl px-3.5 py-2.5 border border-slate-200/90 shadow-md shadow-black/5 items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0">
                      <School className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A] leading-tight">
                        Admissions &amp; ERP
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Centralized Operations
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex absolute -bottom-4 -right-3 z-20 bg-white/95 backdrop-blur-xs rounded-xl px-3.5 py-2.5 border border-slate-200/90 shadow-md shadow-black/5 items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A] leading-tight">
                        Parent &amp; Teacher Portal
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Instant Communication
                      </p>
                    </div>
                  </div>

                  {/* Device Composition */}
                  <div className="relative z-10 py-6 px-3 sm:px-6">
                    {/* Primary Laptop Mockup */}
                    <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.12)] border border-slate-200/90 bg-white">
                      <picture>
                        <source srcSet="/hero-laptop.webp" type="image/webp" />
                        <img
                          src="/hero-laptop.png"
                          alt="MyZkool Integrated School Management Dashboard"
                          className="w-full h-auto object-contain block"
                          width={1517}
                          height={1037}
                          loading="eager"
                          decoding="async"
                        />
                      </picture>
                    </div>

                    {/* Overlapping Mobile App */}
                    <div className="absolute -bottom-3 right-5 sm:right-9 w-[28%] sm:w-[26%] z-20 drop-shadow-[0_20px_35px_rgba(15,23,42,0.20)]">
                      <picture>
                        <source srcSet="/myzkoolp.webp" type="image/webp" />
                        <img
                          src="/myzkoolp.png"
                          alt="MyZkool Connected Parent Mobile Experience"
                          className="w-full h-auto object-contain block select-none pointer-events-none"
                          width={1024}
                          height={1536}
                          loading="lazy"
                          decoding="async"
                        />
                      </picture>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 2. ONE PLATFORM. EVERY ESSENTIAL SCHOOL OPERATION                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          id="ecosystem"
          className="py-16 md:py-24 bg-white"
          aria-label="One Platform Every Essential School Operation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2158E0] px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                INTEGRATED ECOSYSTEM
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-heading text-[#0F172A] mt-4 tracking-tight">
                One Platform. Every Essential School Operation.
              </h2>
              <p className="text-base text-[#475569] mt-3 max-w-2xl mx-auto">
                Designed to unify institutional administration, classroom
                learning, student records, and parent engagement into a single,
                cohesive digital infrastructure.
              </p>
            </div>

            {/* 4-Stakeholder Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STAKEHOLDER_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.id}
                    className="group bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#2158E0]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top bar with icon & badge */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-[#2158E0] text-[#2158E0] group-hover:text-white flex items-center justify-center transition-colors duration-300 shadow-2xs">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full">
                          {pillar.badge}
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <h3 className="text-lg font-bold font-heading text-[#0F172A] mb-1">
                        {pillar.title}
                      </h3>
                      <p className="text-xs font-semibold text-[#2158E0] mb-3">
                        {pillar.tagline}
                      </p>

                      {/* Main Description */}
                      <p className="text-sm text-[#475569] leading-relaxed mb-5">
                        {pillar.description}
                      </p>
                    </div>

                    {/* Highlights Checklist */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      {pillar.highlights.map((highlight, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-[#334155]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2158E0] shrink-0" />
                          <span>{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 3. MEET THE TEAM                                                 */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 lg:py-28 bg-[#F8FAFD] border-t border-b border-[#E2ECFC]"
          aria-label="Meet the Team"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="max-w-3xl mb-14 md:mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#2158E0]/25 text-[#2158E0] text-xs font-bold tracking-widest uppercase shadow-2xs mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2158E0]" />
                MEET THE TEAM
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold font-heading text-[#0F172A] tracking-tight leading-tight">
                The People Behind MyZkool.
              </h2>

              <p className="text-base sm:text-lg text-[#475569] mt-4 leading-relaxed">
                MyZkool is driven by a team combining product development,
                technology, business strategy, and user experience.
              </p>

              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-[#5B6478]">
                <p>
                  We work together to understand the everyday challenges faced by
                  educational institutions and translate those challenges into
                  practical technology solutions.
                </p>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2158E0] bg-blue-50/80 px-3.5 py-1.5 rounded-lg border border-blue-100">
                <span>
                  Different areas of expertise &bull; One shared objective:
                  building a better digital experience for schools.
                </span>
              </div>
            </div>

            {/* Founder Cards: Khaqan Ahmad, Zikra Rahman, Aqsa Ibrahim */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {FOUNDERS.map((founder, index) => (
                <div
                  key={founder.name}
                  className="bg-white rounded-2xl p-7 border border-[#E2ECFC] shadow-2xs hover:shadow-lg hover:border-[#2158E0]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Top Order Badge & Role category */}
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[11px] font-bold text-slate-400 font-heading">
                        0{index + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-[#2158E0] bg-blue-50 px-3 py-1 rounded-full border border-blue-100/60">
                        {founder.badge}
                      </span>
                    </div>

                    {/* Avatar Container */}
                    <div className="flex items-center justify-center mb-6">
                      <FounderAvatar
                        image={founder.image}
                        fallbackImage={founder.fallbackImage}
                        name={founder.name}
                        isPlaceholder={founder.isPlaceholderImage}
                      />
                    </div>

                    {/* Name & Title */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold font-heading text-[#0F172A] leading-snug">
                        {founder.name}
                      </h3>
                      <p className="text-sm font-semibold text-[#2158E0] mt-1">
                        {founder.role}
                      </p>
                    </div>

                    {/* Executive Bio */}
                    <p className="text-sm text-[#475569] leading-relaxed text-center mb-6">
                      {founder.description}
                    </p>
                  </div>

                  {/* Social and Action Links */}
                  <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    {founder.linkedin && (
                      <a
                        href={founder.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Connect with ${founder.name} on LinkedIn`}
                        className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 text-[#2158E0] hover:text-[#1A47B8] border border-blue-200/60 text-xs font-semibold transition-colors duration-200"
                      >
                        <Linkedin className="w-3.5 h-3.5 text-[#0A66C2] shrink-0" />
                        <span>Connect on LinkedIn</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </a>
                    )}

                    {founder.github && (
                      <a
                        href={founder.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${founder.name} GitHub profile`}
                        className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#334155] hover:text-[#0F172A] border border-slate-200/90 text-xs font-semibold transition-colors duration-200"
                      >
                        <Github className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                        <span>View GitHub</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 4. OUR CORE PRINCIPLES                                           */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 lg:py-24 bg-white"
          aria-label="Our Core Principles"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2158E0] px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                OUR CORE PRINCIPLES
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-heading text-[#0F172A] mt-4 tracking-tight">
                What Drives Our Product.
              </h2>
              <p className="text-base text-[#475569] mt-3 max-w-2xl mx-auto leading-relaxed">
                Every decision we make is guided by the needs of the institutions
                and people who use our platform.
              </p>
            </div>

            {/* 5 Principles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {CORE_PRINCIPLES.map((principle) => {
                const Icon = principle.icon;
                return (
                  <div
                    key={principle.number}
                    className="bg-white rounded-2xl p-7 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#2158E0]/40 transition duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Number & Icon Row */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="w-12 h-12 rounded-xl bg-blue-50/80 group-hover:bg-[#2158E0] text-[#2158E0] group-hover:text-white flex items-center justify-center transition-colors duration-300 shadow-2xs">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-extrabold font-heading text-[#2158E0] tracking-wider px-2.5 py-1 rounded-md bg-blue-50/80 border border-blue-100">
                          {principle.number}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold font-heading text-[#0F172A] mb-3">
                        {principle.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-[#475569] leading-relaxed">
                        {principle.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        {principle.badgeText}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-[#2158E0]" />
                    </div>
                  </div>
                );
              })}

              {/* Summary / Commitment Card to balance 5 items elegantly in a 3-col grid */}
              <div className="bg-gradient-to-br from-[#10172A] to-[#1E293B] text-white rounded-2xl p-7 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-blue-300">
                      <Compass className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-blue-300 px-2.5 py-1 rounded-md bg-white/10">
                      Standard
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-heading text-white mb-3">
                    Institutional Standard
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    We maintain strict data privacy, enterprise-grade uptime,
                    and responsive support for every school on the MyZkool
                    network.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-blue-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Purpose-built for Indian schools</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 5. OUR VISION                                                    */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section className="py-12 bg-white" aria-label="Our Vision">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-[#0F172A] text-white p-8 sm:p-12 lg:p-16 shadow-xl overflow-hidden border border-slate-800">
              {/* Subtle radial decorative background glow */}
              <div
                className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none blur-3xl opacity-20"
                style={{
                  background:
                    "radial-gradient(circle, rgba(33,88,224,0.3) 0%, transparent 70%)",
                }}
                aria-hidden="true"
              />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left: Vision Emblem */}
                <div className="lg:col-span-3 flex items-center justify-start lg:justify-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-[#2158E0] shadow-inner">
                    <Target className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400 stroke-[1.75]" />
                  </div>
                </div>

                {/* Right: Vision Copy */}
                <div className="lg:col-span-9 space-y-4">
                  <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-blue-400 font-heading">
                    OUR VISION
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-bold font-heading leading-tight text-white max-w-3xl">
                    Making School Technology Accessible to Every Institution.
                  </h2>

                  <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                    We envision a future where every school, regardless of its
                    size or resources, has access to reliable digital
                    infrastructure.
                  </p>

                  <div className="pt-2 text-sm sm:text-base text-slate-400 space-y-2 border-t border-slate-800/80">
                    <p>
                      Our mission is to reduce operational complexity, improve
                      institutional connectivity, and help schools embrace
                      technology with confidence.
                    </p>
                    <p className="text-blue-300 font-medium">
                      We are building MyZkool to make that vision practical.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 6. FINAL CTA                                                     */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 lg:py-28 bg-[#F8FAFD] border-t border-slate-200/80 text-center"
          aria-label="Let's Build Better Schools Together"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
            <span className="text-xs font-bold uppercase tracking-widest text-[#2158E0] px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100">
              JOIN THE PLATFORM
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-[#0F172A] tracking-tight">
              Let&apos;s Build Better Schools, Together.
            </h2>

            <div className="max-w-2xl mx-auto space-y-3">
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed">
                Whether you are a school administrator exploring digital
                transformation or an educational institution looking for a more
                connected way to operate, MyZkool is designed to help.
              </p>
              <p className="text-sm sm:text-base font-medium text-[#2158E0]">
                Discover how one integrated platform can simplify your
                school&apos;s everyday operations.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#1E293B] bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer group"
              >
                <span>Explore MyZkool</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <button
                onClick={() => handleOpenDemo()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-[#2158E0] hover:bg-[#1A47B8] rounded-xl shadow-lg shadow-[#2158E0]/25 hover:shadow-xl hover:shadow-[#2158E0]/35 active:scale-[0.99] transition cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Book a Free Demo</span>
              </button>
            </div>

            {/* Enterprise Footnote */}
            <div className="pt-8 flex flex-col items-center justify-center gap-1.5 text-xs text-[#64748B]">
              <div className="flex items-center gap-2 font-semibold text-[#1E293B]">
                <Building2 className="w-4 h-4 text-[#2158E0]" />
                <span>MyZkool Technologies</span>
                <span>&bull;</span>
                <span>Lucknow, Uttar Pradesh, India</span>
              </div>
              <p className="text-slate-500">
                One platform for your school&apos;s website, ERP, and parent
                communication. Designed for educational institutions across India.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Shared Footer ────────────────────────────────────────────────── */}
      <Footer onOpenLegal={handleOpenLegal} />

      {/* ── Interactive Modals (Code-Split) ─────────────────────────────── */}
      <Suspense fallback={null}>
        {isDemoModalOpen && (
          <DemoModal
            isOpen={isDemoModalOpen}
            onClose={handleCloseDemo}
            onOpenPrivacy={() => handleOpenLegal("privacy")}
          />
        )}

        {isLoginModalOpen && (
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={handleCloseLogin}
            onOpenDemo={handleOpenDemo}
          />
        )}

        {isLegalModalOpen && (
          <LegalModal
            isOpen={isLegalModalOpen}
            initialDoc={activeLegalDoc}
            onClose={handleCloseLegal}
          />
        )}
      </Suspense>
    </div>
  );
}
