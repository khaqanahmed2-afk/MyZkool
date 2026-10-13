import React, { useState } from "react";
import {
  Monitor,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Building2,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
  Users,
  Calendar,
  Image as ImageIcon,
  Quote,
  Shield,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
} from "lucide-react";
import type {
  HomePageContent,
  WebsiteColorPreset,
} from "../../../types/website";
import type { School } from "../../../types/school";

interface WebsiteLivePreviewProps {
  school: School;
  siteName: string;
  tagline: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  aboutText: string;
  homeContent: HomePageContent;
  published: boolean;
}

export const WebsiteLivePreview: React.FC<WebsiteLivePreviewProps> = ({
  school,
  siteName,
  tagline,
  logoUrl,
  primaryColor,
  secondaryColor,
  accentColor,
  aboutText,
  homeContent,
  published,
}) => {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const websiteUrl = `https://${school.subdomain}.myzkool.com`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(websiteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Section visibility lookup
  const isSectionEnabled = (key: string) => {
    const s = homeContent.sections?.find((sec) => sec.key === key);
    return s ? s.isEnabled : true;
  };

  return (
    <div className="w-full xl:w-[460px] 2xl:w-[500px] shrink-0 space-y-3 sticky top-20">
      {/* Top Preview Controls Bar */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] p-3 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("desktop")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "desktop"
                ? "bg-white text-[#141A2E] shadow-xs"
                : "text-[#5B6478] hover:text-[#141A2E]"
            }`}
            title="Desktop preview mode"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("mobile")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "mobile"
                ? "bg-white text-[#141A2E] shadow-xs"
                : "text-[#5B6478] hover:text-[#141A2E]"
            }`}
            title="Mobile preview mode"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              published
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {published ? "Live / Published" : "Draft (Unpublished)"}
          </span>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-[#5B6478] hover:text-[#141A2E] transition-colors cursor-pointer"
            title="Refresh preview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Browser Mockup Container */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-md overflow-hidden flex flex-col">
        {/* Address Bar */}
        <div className="bg-slate-100 px-3.5 py-2 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>

          <div className="flex-1 max-w-[260px] bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-0.5 flex items-center justify-between text-[11px] text-[#5B6478] truncate font-mono">
            <span className="truncate">{school.subdomain}.myzkool.com</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-[#2158E0] hover:text-[#1a4ec4] ml-1 shrink-0 cursor-pointer"
              title="Copy URL"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <span className="text-[10px] uppercase font-bold text-[#94A3B8]">
            {viewMode}
          </span>
        </div>

        {/* Scrollable Realistic Website Preview Frame */}
        <div
          className={`overflow-y-auto max-h-[640px] bg-white transition-all ${
            viewMode === "mobile"
              ? "max-w-[340px] mx-auto border-x border-[#E2E8F0] my-2 rounded-xl shadow-xs"
              : "w-full"
          }`}
        >
          {/* 1. Header / Navigation */}
          <header
            className="sticky top-0 z-10 text-white px-4 py-3 shadow-sm transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={siteName}
                    className="w-7 h-7 rounded-md object-contain bg-white/20 p-0.5 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate leading-tight">
                    {siteName || school.name}
                  </h4>
                  {tagline && (
                    <p className="text-[10px] text-white/80 truncate leading-tight">
                      {tagline}
                    </p>
                  )}
                </div>
              </div>

              {viewMode === "desktop" ? (
                <nav className="flex items-center gap-2 text-[10px] font-medium text-white/90">
                  <span>Home</span>
                  <span>About</span>
                  <span>Academics</span>
                  <span>Facilities</span>
                  <span>Contact</span>
                  <span
                    className="px-2 py-0.5 rounded-full font-semibold text-white shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    Admissions
                  </span>
                </nav>
              ) : (
                <div className="w-6 h-6 rounded flex items-center justify-center bg-white/10 text-white">
                  <span className="text-xs">☰</span>
                </div>
              )}
            </div>
          </header>

          {/* 2. Hero Section */}
          {isSectionEnabled("hero") && (
            <section
              className="relative text-white p-6 sm:p-8 transition-colors overflow-hidden"
              style={{
                backgroundColor: secondaryColor,
                backgroundImage: homeContent.hero?.backgroundImageUrl
                  ? `linear-gradient(rgba(20, 26, 46, 0.75), rgba(20, 26, 46, 0.85)), url(${homeContent.hero.backgroundImageUrl})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="space-y-3 max-w-sm">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Sparkles className="w-3 h-3" /> CBSE Affiliated
                </span>
                <h1 className="text-base sm:text-lg font-extrabold leading-tight tracking-tight">
                  {homeContent.hero?.headline || `Welcome to ${siteName || school.name}`}
                </h1>
                <p className="text-xs text-white/85 leading-relaxed line-clamp-3">
                  {homeContent.hero?.description ||
                    "Committed to academic rigor, character development, and future-ready excellence."}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-opacity"
                    style={{ backgroundColor: accentColor }}
                  >
                    <span>{homeContent.hero?.ctaText || "Apply for Admission"}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/90 bg-white/15 hover:bg-white/20 transition-colors"
                  >
                    Explore Campus
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 3. Key Statistics Bar */}
          {isSectionEnabled("stats") && homeContent.stats?.length > 0 && (
            <section className="bg-slate-50 border-y border-[#E2E8F0] py-3 px-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {homeContent.stats.map((st) => (
                  <div key={st.id} className="p-1">
                    <div
                      className="text-sm font-extrabold"
                      style={{ color: primaryColor }}
                    >
                      {st.value}
                    </div>
                    <div className="text-[10px] text-[#5B6478] font-medium leading-tight">
                      {st.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. About the School */}
          {isSectionEnabled("about") && (
            <section className="p-5 border-b border-[#F1F5F9] space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141A2E]">
                  About Our Institution
                </h3>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                {aboutText ||
                  homeContent.hero?.description ||
                  `${siteName || school.name} provides premier educational foundations focusing on holistic student growth and academic distinction.`}
              </p>
            </section>
          )}

          {/* 5. Principal's Message */}
          {isSectionEnabled("principal") && (
            <section className="p-5 bg-slate-50/70 border-b border-[#E2E8F0] space-y-3">
              <div className="flex items-start gap-3">
                {homeContent.principal?.photoUrl ? (
                  <img
                    src={homeContent.principal.photoUrl}
                    alt={homeContent.principal.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <Quote className="w-5 h-5 text-white/80" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-[#141A2E]">
                    {homeContent.principal?.name || "Principal's Desk"}
                  </h4>
                  <p className="text-[10px] text-[#5B6478]">
                    {homeContent.principal?.title || "Head of School"}
                  </p>
                  <blockquote className="mt-1.5 text-xs text-[#5B6478] italic leading-relaxed">
                    "{homeContent.principal?.message}"
                  </blockquote>
                </div>
              </div>
            </section>
          )}

          {/* 6. Academic Programs */}
          {isSectionEnabled("academics") && (
            <section className="p-5 border-b border-[#F1F5F9] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#141A2E]">
                    Academic Programs
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-[#5B6478]">
                  CBSE / State Curriculum
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white">
                  <div className="text-[11px] font-bold text-[#141A2E]">Primary Wing</div>
                  <div className="text-[10px] text-[#5B6478] mt-0.5">Grades 1 – 5</div>
                  <div className="text-[9px] text-[#94A3B8] mt-1">Foundational literacy & numeracy</div>
                </div>
                <div className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white">
                  <div className="text-[11px] font-bold text-[#141A2E]">Middle School</div>
                  <div className="text-[10px] text-[#5B6478] mt-0.5">Grades 6 – 8</div>
                  <div className="text-[9px] text-[#94A3B8] mt-1">Exploratory STEM & Humanities</div>
                </div>
                <div className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white">
                  <div className="text-[11px] font-bold text-[#141A2E]">Secondary Wing</div>
                  <div className="text-[10px] text-[#5B6478] mt-0.5">Grades 9 – 10</div>
                  <div className="text-[9px] text-[#94A3B8] mt-1">Board examination readiness</div>
                </div>
              </div>
            </section>
          )}

          {/* 7. Campus Facilities */}
          {isSectionEnabled("facilities") && homeContent.facilities?.length > 0 && (
            <section className="p-5 border-b border-[#F1F5F9] space-y-3">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141A2E]">
                  Campus Infrastructure
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {homeContent.facilities.map((fac) => (
                  <div
                    key={fac.id}
                    className="p-2.5 rounded-xl border border-[#E2E8F0] bg-slate-50/50 flex items-start gap-2"
                  >
                    {fac.imageUrl ? (
                      <img
                        src={fac.imageUrl}
                        alt={fac.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-[#141A2E] truncate">
                        {fac.title}
                      </h4>
                      <p className="text-[10px] text-[#5B6478] line-clamp-2 mt-0.5">
                        {fac.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 8. Photo Gallery */}
          {isSectionEnabled("gallery") && homeContent.gallery?.length > 0 && (
            <section className="p-5 border-b border-[#F1F5F9] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#141A2E]">
                    Campus Photo Gallery
                  </h3>
                </div>
                <span className="text-[10px] text-[#94A3B8]">
                  {homeContent.gallery.length} photos
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {homeContent.gallery.map((img) => (
                  <div
                    key={img.id}
                    className="aspect-square rounded-lg bg-slate-100 overflow-hidden border border-[#E2E8F0]"
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.title || "Campus Gallery"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 9. Admissions Call to Action */}
          {isSectionEnabled("admission_cta") && (
            <section
              className="p-5 text-white text-center space-y-2 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              <h4 className="text-xs sm:text-sm font-bold">
                Join the {siteName || school.name} Family
              </h4>
              <p className="text-[11px] text-white/80 max-w-xs mx-auto">
                Admissions for the upcoming academic session are now open. Register your interest today.
              </p>
              <button
                type="button"
                className="mt-1 px-4 py-1.5 rounded-full text-xs font-bold text-[#141A2E] bg-white hover:bg-slate-100 shadow-xs transition-colors"
              >
                Inquire Online
              </button>
            </section>
          )}

          {/* 10. Footer / Contact */}
          {isSectionEnabled("contact_footer") && (
            <footer
              className="p-5 text-white space-y-4 transition-colors"
              style={{ backgroundColor: secondaryColor }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-white/80" />
                  <span className="text-xs font-bold">{siteName || school.name}</span>
                </div>
                <div className="space-y-1 text-[10px] text-white/70">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>
                      {school.address || "Main Campus Road"},{" "}
                      {school.city || "District"}, {school.state || "India"} -{" "}
                      {school.pin_code || ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{school.contact_phone || "Contact phone"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span>{school.official_email || "admissions@school.edu"}</span>
                  </div>
                </div>
              </div>

              {/* Social icons */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
                <span>© {new Date().getFullYear()} {siteName || school.name}.</span>
                <div className="flex items-center gap-2 text-white/70">
                  {homeContent.socialLinks?.facebook && <Facebook className="w-3 h-3" />}
                  {homeContent.socialLinks?.twitter && <Twitter className="w-3 h-3" />}
                  {homeContent.socialLinks?.instagram && <Instagram className="w-3 h-3" />}
                  {homeContent.socialLinks?.youtube && <Youtube className="w-3 h-3" />}
                  {homeContent.socialLinks?.linkedin && <Linkedin className="w-3 h-3" />}
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
};
