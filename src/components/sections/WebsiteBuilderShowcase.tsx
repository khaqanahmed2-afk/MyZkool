import React from "react";
import {
  Globe,
  LayoutTemplate,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export interface WebsiteBuilderShowcaseProps {
  onOpenDemo?: () => void;
}

export const WebsiteBuilderShowcase: React.FC<WebsiteBuilderShowcaseProps> = ({
  onOpenDemo,
}) => {
  return (
    <section
      className="py-16 md:py-24 bg-white border-b border-[#E6EAF3]"
      id="website-builder"
      aria-label="School Website Builder Showcase"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-[#2158E0]/20 text-[#2158E0] text-xs font-bold tracking-widest uppercase mb-3">
            <Globe className="w-3.5 h-3.5 text-[#2158E0]" />
            <span>Built-in School Website Builder</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#0F172A] tracking-tight leading-tight">
            A Modern, Beautiful Website for Your School
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-[#5B6478] leading-relaxed max-w-2xl mx-auto">
            Give prospective parents an inspiring first impression. Launch a fast, mobile-friendly school website with online admissions forms without hiring an external agency.
          </p>
        </div>

        {/* 2-Column Split: Mockup Screen on Left + Feature Highlights on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Interactive School Website Live Preview Frame */}
          <div className="lg:col-span-7">
            <div className="bg-[#FAFBFD] rounded-2xl sm:rounded-3xl border border-[#CBD5E1] shadow-lg overflow-hidden">
              {/* Browser chrome header */}
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-3 px-3 py-1 bg-white border border-slate-200 rounded-full flex items-center gap-2 text-[11px] text-slate-600 font-mono">
                    <Search className="w-3 h-3 text-slate-400" />
                    <span>https://stmarylucknow.myzkool.in</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  SSL Secure
                </span>
              </div>

              {/* School Website Mockup Content */}
              <div className="p-4 sm:p-6 space-y-4">
                {/* School Header Banner */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#2158E0] text-white flex items-center justify-center font-bold text-sm">
                      SM
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                        St. Mary Public School
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Affiliated to CBSE, New Delhi (Affiliation # 2130842)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onOpenDemo}
                    className="hidden sm:inline-flex px-3 py-1.5 text-[11px] font-bold bg-[#2158E0] text-white rounded-lg hover:bg-[#1A47B8] transition"
                  >
                    Admissions 2026-27
                  </button>
                </div>

                {/* Hero Showcase Card */}
                <div className="bg-gradient-to-r from-blue-900 to-[#2158E0] text-white p-6 rounded-2xl relative overflow-hidden">
                  <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
                    Admissions Open for Playgroup to Class 12
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold font-heading mt-2 max-w-md">
                    Nurturing Curiosity, Character, and Academic Excellence
                  </h3>
                  <p className="text-xs text-blue-100 mt-2 max-w-sm">
                    Modern smart classrooms, extensive sports grounds, science laboratories, and experienced educators.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={onOpenDemo}
                      className="px-4 py-2 text-xs font-bold bg-white text-[#2158E0] rounded-lg shadow-sm"
                    >
                      Fill Online Enquiry
                    </button>
                    <button
                      onClick={onOpenDemo}
                      className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg"
                    >
                      Virtual Campus Tour
                    </button>
                  </div>
                </div>

                {/* 3 Interactive Section Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <p className="text-xs font-bold text-[#0F172A]">CBSE Disclosures</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Mandatory documents, fee table &amp; safety certificates</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <p className="text-xs font-bold text-[#0F172A]">Online Admissions</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Direct parent enquiries connected to ERP pipeline</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <p className="text-xs font-bold text-[#0F172A]">Events &amp; Notices</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Download circulars, holiday list &amp; exam timetable</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Why School Principals Love It */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                  <LayoutTemplate className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    No Developers, No WordPress Plugins
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B6478] mt-1 leading-relaxed">
                    Update school notices, admission announcements, and photos right from your master dashboard without touching any code.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    CBSE and ICSE Mandatory Disclosures
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B6478] mt-1 leading-relaxed">
                    Pre built compliance pages for affiliation letters, managing committee details, fire safety certificates, and annual reports.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Mobile Responsive for Parents
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B6478] mt-1 leading-relaxed">
                    Over 80% of parents browse school websites on their phones. MyZkool websites load in under 1.5 seconds on mobile 4G networks.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Instant Online Admission Pipeline
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B6478] mt-1 leading-relaxed">
                    Every parent inquiry submitted on your website immediately appears in your admissions desk with WhatsApp follow up links.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onOpenDemo}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-[#2158E0] hover:bg-[#1A47B8] rounded-xl shadow-sm transition cursor-pointer"
              >
                <span>Preview a Live School Website</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebsiteBuilderShowcase;

