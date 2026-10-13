import React, { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { getSchoolBySubdomain } from "../../services/schoolService";
import {
  getSchoolWebsite,
  getHomePageContent,
  submitAdmissionEnquiry,
  getSubdomainFromHost,
} from "../../services/websiteService";
import { isReservedSubdomain } from "../../constants/subdomains";
import type { School } from "../../types/school";
import type {
  SchoolWebsite,
  HomePageContent,
  FacilityItem,
  GalleryImageItem,
} from "../../types/website";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Calendar,
  Image as ImageIcon,
  Quote,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  X,
  Share2,
} from "lucide-react";

export default function PublicSchoolWebsite() {
  const { subdomain: paramSubdomain } = useParams<{ subdomain: string }>();

  // Resolve subdomain from route parameter or hostname
  const effectiveSubdomain =
    paramSubdomain ||
    (typeof window !== "undefined" && window.location.hostname
      ? getSubdomainFromHost(window.location.hostname) || ""
      : "");

  // If accessed without a school subdomain or on the main application domain, redirect to landing page
  if (!effectiveSubdomain || isReservedSubdomain(effectiveSubdomain)) {
    return <Navigate to="/" replace />;
  }

  const [school, setSchool] = useState<School | null>(null);
  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [content, setContent] = useState<HomePageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Gallery filter and lightbox state
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Admission Enquiry Form State
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [studentGrade, setStudentGrade] = useState("Nursery");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState<string | null>(null);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSchoolData() {
      if (!effectiveSubdomain) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { school: loadedSchool } = await getSchoolBySubdomain(
          effectiveSubdomain
        );

        if (!isMounted) return;

        if (!loadedSchool) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        setSchool(loadedSchool);

        const { website: loadedWeb } = await getSchoolWebsite(loadedSchool.id);
        if (!isMounted) return;

        if (loadedWeb) {
          setWebsite(loadedWeb);
          const richContent = await getHomePageContent(
            loadedWeb.id,
            loadedSchool
          );
          if (isMounted) setContent(richContent);
        }
      } catch (err) {
        console.warn("Error fetching school website:", err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSchoolData();

    return () => {
      isMounted = false;
    };
  }, [effectiveSubdomain]);

  // Handle Enquiry Submit
  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    if (!parentName.trim() || !parentPhone.trim()) {
      setEnquiryError("Please enter your name and contact phone number.");
      return;
    }

    setIsSubmittingEnquiry(true);
    setEnquiryError(null);
    setEnquirySuccess(null);

    try {
      const res = await submitAdmissionEnquiry({
        schoolId: school.id,
        parentName: parentName.trim(),
        phone: parentPhone.trim(),
        email: parentEmail.trim() || undefined,
        classGrade: studentGrade,
        message: enquiryMessage.trim() || undefined,
      });

      if (!res.success) {
        setEnquiryError(res.error || "Failed to submit enquiry. Please try again.");
      } else {
        setEnquirySuccess(
          `Thank you, ${parentName.trim()}! Your admission enquiry has been submitted. Our admissions office will contact you shortly.`
        );
        setParentName("");
        setParentPhone("");
        setParentEmail("");
        setEnquiryMessage("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting enquiry";
      setEnquiryError(msg);
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

  const isSectionEnabled = (key: string) => {
    if (!content?.sections) return true;
    const s = content.sections.find((sec) => sec.key === key);
    return s ? s.isEnabled : true;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#14213d] font-sans">
            Loading school website...
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !school) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6 text-[#14213d]">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#eadfd3] p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-[#14213d]">
            School Not Found
          </h1>
          <p className="text-sm text-[#5b6478]">
            No registered educational institution was found matching the subdomain{" "}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[#2158E0]">
              {effectiveSubdomain}
            </code>
            .
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#14284b] text-white text-xs font-bold hover:bg-[#1f3763] transition-colors"
            >
              Return to MyZkool
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-[#eadfd3] text-[#14213d] text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Register a School
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Theme variables derived from school configuration
  const primaryColor = website?.primary_color || "#2158E0";
  const secondaryColor = website?.secondary_color || "#14284b";
  const accentColor = website?.accent_color || "#10B981";
  const isPublished = website?.published ?? false;

  // Check if current user is admin viewing their draft
  const isAdminPreview = !isPublished;

  return (
    <div
      className="min-h-screen flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900"
      style={
        {
          "--bg": "#fffaf5",
          "--ink": "#14213d",
          "--muted": "#5b6478",
          "--navy": secondaryColor,
          "--or": primaryColor,
          "--card": "#ffffff",
          "--line": "#eadfd3",
          "--soft": "#fdeee2",
        } as React.CSSProperties
      }
    >
      {/* Google Fonts: Fraunces & Nunito Sans */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;800&family=Nunito+Sans:wght@400;600;700&display=swap"
      />

      <style>{`
        .font-fraunces { font-family: 'Fraunces', Georgia, serif; }
        .font-nunito { font-family: 'Nunito Sans', system-ui, sans-serif; }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
      `}</style>

      {/* Admin Draft Banner (Displayed only when unpublished) */}
      {isAdminPreview && (
        <aside
          role="status"
          aria-label="Draft mode banner"
          className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-900 animate-pulse" />
              <span>
                <strong>Draft Preview</strong> — This website is currently unpublished. It is only visible to your school administration.
              </span>
            </div>
            <Link
              to="/onboarding/complete"
              className="px-3 py-1 rounded-full bg-amber-950 text-white text-[11px] font-bold hover:bg-black transition-colors shrink-0"
            >
              Go to Launch to Publish
            </Link>
          </div>
        </aside>
      )}

      {/* 1. Top Utility Bar */}
      <div className="bg-[#14284b] text-white text-xs py-2 px-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 text-white/80 text-[11px]">
            <span>
              {school.address || "Campus Address"}, {school.city}, {school.state} - {school.pin_code}
            </span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">{school.contact_phone}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-white/90">
            <Link to="/login" className="hover:text-amber-300 transition-colors">
              Parent Portal
            </Link>
            <span>|</span>
            <Link to="/login" className="hover:text-amber-300 transition-colors">
              Student Login
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-[#fffaf5]/95 backdrop-blur-md border-b border-[#eadfd3] transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & School Name */}
          <a href="#top" className="flex items-center gap-3 no-underline group">
            {website?.logo_url || school.logo_url ? (
              <img
                src={website?.logo_url || school.logo_url}
                alt={website?.site_name || school.name}
                className="w-10 h-10 rounded-xl object-contain bg-white border border-[#eadfd3] p-1 shadow-2xs"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-fraunces font-bold text-lg shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {(website?.site_name || school.name).charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-fraunces font-bold text-base sm:text-lg text-[#14213d] block leading-tight tracking-tight">
                {website?.site_name || school.name}
              </span>
              {website?.tagline && (
                <span className="text-[11px] text-[#5b6478] block truncate max-w-xs leading-tight">
                  {website.tagline}
                </span>
              )}
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#14213d]">
            <a href="#about" className="hover:opacity-75 transition-opacity">
              About
            </a>
            <a href="#programs" className="hover:opacity-75 transition-opacity">
              Programs
            </a>
            <a href="#campus" className="hover:opacity-75 transition-opacity">
              Campus
            </a>
            <a href="#gallery" className="hover:opacity-75 transition-opacity">
              Gallery
            </a>
            <a href="#news" className="hover:opacity-75 transition-opacity">
              News
            </a>
            <a href="#contact" className="hover:opacity-75 transition-opacity">
              Contact
            </a>
          </nav>

          {/* CTA Enquire Now Button */}
          <a
            href="#admissions"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Enquire now</span>
          </a>
        </div>
      </header>

      {/* Main Content Sections */}
      <main id="top" className="flex-1 bg-[#fffaf5]">
        {/* 3. Hero Section */}
        {isSectionEnabled("hero") && (
          <section className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#fdeee2] text-[#14213d] border border-[#eadfd3]">
                <Sparkles className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                <span>
                  {school.affiliation_board
                    ? `${school.affiliation_board.toUpperCase()} Affiliated`
                    : "Recognized Educational Institution"}
                </span>
              </div>

              <h1 className="font-fraunces font-extrabold text-3xl sm:text-4xl md:text-5xl text-[#14213d] leading-[1.12]">
                {content?.hero?.headline || (
                  <>
                    A brighter tomorrow{" "}
                    <span style={{ color: primaryColor }}>begins here.</span>
                  </>
                )}
              </h1>

              <p className="text-[#5b6478] text-base md:text-lg leading-relaxed max-w-xl">
                {content?.hero?.description ||
                  "A caring school where every child learns with curiosity, builds confidence, and grows into a capable, responsible individual."}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="#admissions"
                  className="px-6 py-3 rounded-full text-white font-bold text-sm shadow-sm hover:opacity-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  {content?.hero?.ctaText || "Apply for admission"}
                </a>
                <a
                  href="#gallery"
                  className="px-6 py-3 rounded-full border-2 border-[#14213d] text-[#14213d] font-bold text-sm hover:bg-[#14213d] hover:text-white transition-colors"
                >
                  See school photos
                </a>
              </div>

              <div className="flex flex-wrap gap-2 pt-3">
                <span className="px-3.5 py-1 rounded-full bg-[#fdeee2] text-xs font-semibold text-[#14213d]">
                  Holistic education
                </span>
                <span className="px-3.5 py-1 rounded-full bg-[#fdeee2] text-xs font-semibold text-[#14213d]">
                  Experienced faculty
                </span>
                <span className="px-3.5 py-1 rounded-full bg-[#fdeee2] text-xs font-semibold text-[#14213d]">
                  Safe campus
                </span>
                <span className="px-3.5 py-1 rounded-full bg-[#fdeee2] text-xs font-semibold text-[#14213d]">
                  Smart classes
                </span>
              </div>
            </div>

            {/* School Hero Image */}
            <div className="relative min-h-[340px] md:min-h-[420px] rounded-3xl overflow-hidden border border-[#eadfd3] shadow-md bg-gradient-to-tr from-[#fdeee2] to-[#eadfd3]">
              {content?.hero?.backgroundImageUrl ? (
                <img
                  src={content.hero.backgroundImageUrl}
                  alt={website?.site_name || school.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[340px] flex flex-col items-center justify-center p-6 text-center text-[#5b6478]">
                  <Building2 className="w-16 h-16 text-[#5b6478]/40 mb-3" />
                  <span className="font-fraunces font-bold text-lg text-[#14213d]">
                    {website?.site_name || school.name}
                  </span>
                  <span className="text-xs text-[#5b6478] mt-1">
                    Campus Grounds & Facilities
                  </span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-tr-2xl text-xs font-bold text-[#14213d] border-t border-r border-[#eadfd3]">
                Campus & Learning Center
              </div>
            </div>
          </section>
        )}

        {/* 4. Statistics Band */}
        {isSectionEnabled("stats") && content?.stats && content.stats.length > 0 && (
          <div
            className="py-8 px-4 text-white transition-colors"
            style={{ backgroundColor: secondaryColor }}
          >
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {content.stats.map((st) => (
                <div key={st.id} className="space-y-1">
                  <span className="font-fraunces text-2xl md:text-3xl font-extrabold text-[#ffb48f] block">
                    {st.value}
                  </span>
                  <span className="text-xs md:text-sm text-white/80 font-medium block">
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. About the School & Principal's Message */}
        {isSectionEnabled("about") && (
          <section id="about" className="py-16 md:py-20 border-b border-[#eadfd3]">
            <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Photo */}
              <div className="relative min-h-[340px] md:min-h-[400px] rounded-3xl overflow-hidden border border-[#eadfd3] shadow-md bg-gradient-to-tr from-[#fdeee2] to-[#eadfd3]">
                {content?.principal?.photoUrl ? (
                  <img
                    src={content.principal.photoUrl}
                    alt={content.principal.name || "Principal"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[340px] flex flex-col items-center justify-center p-6 text-center text-[#5b6478]">
                    <Quote className="w-12 h-12 text-[#5b6478]/40 mb-2" />
                    <span className="font-fraunces font-bold text-base text-[#14213d]">
                      Leadership & Academic Excellence
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-tr-2xl text-xs font-bold text-[#14213d] border-t border-r border-[#eadfd3]">
                  {content?.principal?.title || "Principal & Head of School"}
                </div>
              </div>

              {/* Text & Story */}
              <div className="space-y-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5b6478]">
                  About Our Academy
                </span>
                <h2 className="font-fraunces font-bold text-2xl md:text-3xl text-[#14213d] leading-tight">
                  Nurturing intellectual depth and character
                </h2>
                <p className="text-[#5b6478] text-sm md:text-base leading-relaxed">
                  {website?.about_text ||
                    `${website?.site_name || school.name} is a premier educational institution committed to scholarly rigor, holistic student growth, and ethical leadership in a supportive, modern environment.`}
                </p>

                {content?.principal?.message && (
                  <blockquote className="p-4 rounded-2xl bg-[#fdeee2]/60 border-l-4 border-[#2158E0] text-xs md:text-sm text-[#14213d] italic leading-relaxed">
                    "{content.principal.message}"
                    <footer className="mt-2 text-right not-italic font-bold text-xs text-[#5b6478]">
                      — {content.principal.name || "Principal"}
                    </footer>
                  </blockquote>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white border border-[#eadfd3] font-semibold text-xs text-[#14213d]">
                    Board Curriculum: {school.affiliation_board?.toUpperCase() || "CBSE"}
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#eadfd3] font-semibold text-xs text-[#14213d]">
                    Focused Class Ratios
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#eadfd3] font-semibold text-xs text-[#14213d]">
                    Safe Campus Transport
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#eadfd3] font-semibold text-xs text-[#14213d]">
                    Secure Monitored Campus
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-[#14213d] text-[#14213d] font-bold text-xs hover:bg-[#14213d] hover:text-white transition-colors"
                  >
                    <span>Connect with our administration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 6. Academic Programs Section */}
        {isSectionEnabled("academics") && (
          <section id="programs" className="py-16 md:py-20 bg-[#fdeee2]/50 border-b border-[#eadfd3]">
            <div className="max-w-6xl mx-auto px-4 space-y-10">
              <div className="max-w-xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5b6478]">
                  Academic Journey
                </span>
                <h2 className="font-fraunces font-bold text-2xl md:text-3xl text-[#14213d]">
                  A strong foundation for every stage of development
                </h2>
                <p className="text-sm text-[#5b6478]">
                  Comprehensive educational progression from early childhood to board examinations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl border border-[#eadfd3] overflow-hidden shadow-xs p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-fraunces font-bold text-lg">
                    1
                  </div>
                  <h3 className="font-fraunces font-bold text-base text-[#14213d]">
                    Early Years
                  </h3>
                  <p className="text-xs text-[#5b6478] leading-relaxed">
                    Play, explore, and establish foundational social-emotional confidence.
                  </p>
                  <span className="inline-block text-[11px] font-bold text-[#2158E0] pt-1">
                    Nursery, LKG, UKG
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#eadfd3] overflow-hidden shadow-xs p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-fraunces font-bold text-lg">
                    2
                  </div>
                  <h3 className="font-fraunces font-bold text-base text-[#14213d]">
                    Primary School
                  </h3>
                  <p className="text-xs text-[#5b6478] leading-relaxed">
                    Structured reading, writing, mathematical fluency, and curious exploration.
                  </p>
                  <span className="inline-block text-[11px] font-bold text-[#2158E0] pt-1">
                    Classes I to V
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#eadfd3] overflow-hidden shadow-xs p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-fraunces font-bold text-lg">
                    3
                  </div>
                  <h3 className="font-fraunces font-bold text-base text-[#14213d]">
                    Middle School
                  </h3>
                  <p className="text-xs text-[#5b6478] leading-relaxed">
                    Hands-on laboratory experiments, collaborative projects, and sports clubs.
                  </p>
                  <span className="inline-block text-[11px] font-bold text-[#2158E0] pt-1">
                    Classes VI to VIII
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#eadfd3] overflow-hidden shadow-xs p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-fraunces font-bold text-lg">
                    4
                  </div>
                  <h3 className="font-fraunces font-bold text-base text-[#14213d]">
                    Senior School
                  </h3>
                  <p className="text-xs text-[#5b6478] leading-relaxed">
                    Rigorous curriculum preparation across Science, Commerce, and Humanities.
                  </p>
                  <span className="inline-block text-[11px] font-bold text-[#2158E0] pt-1">
                    Classes IX to XII
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 7. Campus Infrastructure & Facilities */}
        {isSectionEnabled("facilities") && content?.facilities && content.facilities.length > 0 && (
          <section id="campus" className="py-16 md:py-20 border-b border-[#eadfd3]">
            <div className="max-w-6xl mx-auto px-4 space-y-10">
              <div className="max-w-xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5b6478]">
                  Campus Infrastructure
                </span>
                <h2 className="font-fraunces font-bold text-2xl md:text-3xl text-[#14213d]">
                  Safe, modern, and inspiring learning spaces
                </h2>
                <p className="text-sm text-[#5b6478]">
                  Designed to foster curiosity, safety, and physical well-being across all age groups.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {content.facilities.map((fac) => (
                  <div
                    key={fac.id}
                    className="p-5 rounded-2xl bg-white border border-[#eadfd3] shadow-xs space-y-2.5"
                  >
                    {fac.imageUrl ? (
                      <div className="h-36 rounded-xl overflow-hidden mb-3 border border-[#eadfd3]">
                        <img
                          src={fac.imageUrl}
                          alt={fac.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                    )}
                    <h4 className="font-fraunces font-bold text-base text-[#14213d]">
                      {fac.title}
                    </h4>
                    <p className="text-xs text-[#5b6478] leading-relaxed">
                      {fac.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 8. Photo Gallery */}
        {isSectionEnabled("gallery") && content?.gallery && content.gallery.length > 0 && (
          <section id="gallery" className="py-16 md:py-20 bg-[#fdeee2]/40 border-b border-[#eadfd3]">
            <div className="max-w-6xl mx-auto px-4 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5b6478]">
                    Campus Gallery
                  </span>
                  <h2 className="font-fraunces font-bold text-2xl md:text-3xl text-[#14213d]">
                    Moments from school life
                  </h2>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["all", "Campus", "Sports", "Events", "Academics"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGalleryFilter(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        galleryFilter === cat
                          ? "bg-[#14213d] text-white"
                          : "bg-white border border-[#eadfd3] text-[#14213d] hover:bg-slate-50"
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {content.gallery
                  .filter(
                    (img) =>
                      galleryFilter === "all" ||
                      img.category?.toLowerCase() === galleryFilter.toLowerCase()
                  )
                  .map((img) => (
                    <div
                      key={img.id}
                      onClick={() => setLightboxUrl(img.imageUrl)}
                      className="group relative aspect-4/3 rounded-2xl overflow-hidden border border-[#eadfd3] bg-white cursor-pointer shadow-xs hover:shadow-md transition-all"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.title || "Campus Gallery"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {img.title && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white text-xs font-semibold truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {img.title}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* 9. News & Announcements */}
        {isSectionEnabled("news") && content?.announcements && content.announcements.length > 0 && (
          <section id="news" className="py-16 md:py-20 border-b border-[#eadfd3]">
            <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5b6478]">
                    School Circulars
                  </span>
                  <h2 className="font-fraunces font-bold text-2xl md:text-3xl text-[#14213d]">
                    News and upcoming events
                  </h2>
                </div>

                <div className="divide-y divide-[#eadfd3]">
                  {content.announcements.map((ann) => (
                    <div key={ann.id} className="py-4 first:pt-0 flex items-start gap-4">
                      <div className="min-w-[80px] text-xs font-extrabold uppercase font-fraunces" style={{ color: primaryColor }}>
                        {ann.date}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[#14213d]">
                          {ann.title}
                        </h4>
                        <p className="text-xs text-[#5b6478] leading-relaxed">
                          {ann.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 10. Admission Enquiry Form */}
              <div id="admissions" className="bg-white rounded-3xl border border-[#eadfd3] p-6 sm:p-8 shadow-sm space-y-5">
                <div className="space-y-1">
                  <h3 className="font-fraunces font-bold text-xl text-[#14213d]">
                    Admission Enquiry
                  </h3>
                  <p className="text-xs text-[#5b6478]">
                    Submit your details and our academic counselors will get in touch with you.
                  </p>
                </div>

                {enquirySuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{enquirySuccess}</span>
                  </div>
                )}

                {enquiryError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{enquiryError}</span>
                  </div>
                )}

                <form onSubmit={handleEnquirySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Parent's full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#eadfd3] bg-[#fffaf5] text-xs text-[#14213d] focus:border-[#2158E0] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#14213d] mb-1">
                        Phone number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#eadfd3] bg-[#fffaf5] text-xs text-[#14213d] focus:border-[#2158E0] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#14213d] mb-1">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="rajesh@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#eadfd3] bg-[#fffaf5] text-xs text-[#14213d] focus:border-[#2158E0] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Seeking class / grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={studentGrade}
                      onChange={(e) => setStudentGrade(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#eadfd3] bg-[#fffaf5] text-xs text-[#14213d] focus:border-[#2158E0] focus:outline-hidden"
                    >
                      <option value="Nursery">Nursery / Early Years</option>
                      <option value="LKG">LKG</option>
                      <option value="UKG">UKG</option>
                      <option value="Class 1">Class 1</option>
                      <option value="Class 2">Class 2</option>
                      <option value="Class 3">Class 3</option>
                      <option value="Class 4">Class 4</option>
                      <option value="Class 5">Class 5</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="Class 11">Class 11</option>
                      <option value="Class 12">Class 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Message / questions (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={enquiryMessage}
                      onChange={(e) => setEnquiryMessage(e.target.value)}
                      placeholder="Any specific questions about transport, syllabus or facilities..."
                      className="w-full px-3.5 py-2 rounded-xl border border-[#eadfd3] bg-[#fffaf5] text-xs text-[#14213d] focus:border-[#2158E0] focus:outline-hidden resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingEnquiry}
                    className="w-full py-3 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isSubmittingEnquiry ? "Submitting enquiry..." : "Send admission enquiry"}
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* 11. Final Call To Action Banner */}
        <section
          className="py-14 px-4 text-white text-center transition-colors"
          style={{ backgroundColor: secondaryColor }}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="font-fraunces font-extrabold text-2xl md:text-3xl text-white">
              Admissions open for the upcoming session
            </h2>
            <p className="text-white/80 text-sm max-w-lg mx-auto leading-relaxed">
              Experience our classrooms, tour our sports amenities, and meet with our faculty.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#admissions"
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Apply online
              </a>
              <a
                href="#contact"
                className="px-6 py-2.5 rounded-full border border-white text-white text-xs font-bold hover:bg-white hover:text-[#14213d] transition-colors"
              >
                Schedule campus visit
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 12. Full Institutional Footer */}
      <footer id="contact" className="bg-white border-t border-[#eadfd3] pt-12 pb-8 text-[#14213d]">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* School Profile */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                {website?.logo_url || school.logo_url ? (
                  <img
                    src={website?.logo_url || school.logo_url}
                    alt={website?.site_name || school.name}
                    className="w-8 h-8 rounded-lg object-contain bg-white border border-[#eadfd3] p-0.5"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-fraunces font-bold text-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {(website?.site_name || school.name).charAt(0)}
                  </div>
                )}
                <span className="font-fraunces font-bold text-sm">
                  {website?.site_name || school.name}
                </span>
              </div>
              <p className="text-xs text-[#5b6478] leading-relaxed">
                {website?.tagline || "Nurturing today. Leading tomorrow."}
              </p>
              <div className="flex items-center gap-2 text-[#5b6478] pt-2">
                {content?.socialLinks?.facebook && (
                  <a href={content.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-[#2158E0]">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {content?.socialLinks?.twitter && (
                  <a href={content.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-[#2158E0]">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {content?.socialLinks?.instagram && (
                  <a href={content.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-[#2158E0]">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {content?.socialLinks?.youtube && (
                  <a href={content.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-[#2158E0]">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {content?.socialLinks?.linkedin && (
                  <a href={content.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-[#2158E0]">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <h4 className="font-fraunces font-bold text-xs uppercase tracking-wider text-[#14213d]">
                Quick Links
              </h4>
              <ul className="space-y-1.5 text-xs text-[#5b6478]">
                <li><a href="#about" className="hover:text-[#14213d]">About Us</a></li>
                <li><a href="#programs" className="hover:text-[#14213d]">Academic Programs</a></li>
                <li><a href="#campus" className="hover:text-[#14213d]">Infrastructure</a></li>
                <li><a href="#gallery" className="hover:text-[#14213d]">Photo Gallery</a></li>
                <li><a href="#admissions" className="hover:text-[#14213d]">Online Admission</a></li>
              </ul>
            </div>

            {/* Contact Details */}
            <div className="space-y-2">
              <h4 className="font-fraunces font-bold text-xs uppercase tracking-wider text-[#14213d]">
                Contact Campus
              </h4>
              <ul className="space-y-2 text-xs text-[#5b6478]">
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#2158E0]" />
                  <span>
                    {school.address || "Campus Address"}, {school.city}, {school.state} - {school.pin_code}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-[#2158E0]" />
                  <span>{school.contact_phone || "Contact Phone"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-[#2158E0]" />
                  <span>{school.official_email || "admissions@school.edu"}</span>
                </li>
                <li className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Mon to Sat, 8:00 AM – 2:30 PM</span>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="space-y-2">
              <h4 className="font-fraunces font-bold text-xs uppercase tracking-wider text-[#14213d]">
                School Updates
              </h4>
              <p className="text-xs text-[#5b6478]">
                Subscribe for term circulars, admission notices, and events.
              </p>
              {newsletterSuccess ? (
                <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Subscribed successfully!</span>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail) setNewsletterSuccess(true);
                  }}
                  className="flex gap-1.5 pt-1"
                >
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Parent's email"
                    className="flex-1 px-3 py-2 rounded-xl border border-[#eadfd3] text-xs text-[#14213d] bg-[#fffaf5] focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-[#14213d] text-white text-xs font-bold hover:bg-black transition-colors"
                  >
                    Join
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-[#eadfd3] text-center text-xs text-[#5b6478] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              © {new Date().getFullYear()} {website?.site_name || school.name}. All rights reserved.
            </span>
            <span className="text-[11px] text-[#94a3b8]">
              Powered by MyZkool School ERP
            </span>
          </div>
        </div>
      </footer>

      {/* Lightbox Photo Viewer */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-label="Enlarged photo"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="Campus enlargement"
              className="w-full h-full object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
