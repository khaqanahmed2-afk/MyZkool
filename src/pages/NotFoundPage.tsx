import React from "react";
import { Link } from "react-router-dom";
import {
  Home,
  ArrowRight,
  Compass,
  Sparkles,
  BookOpen,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Phone,
  Mail,
} from "lucide-react";
import { MyZkoolLogo } from "../components/common/MyZkoolLogo";
import { usePageMetadata } from "../hooks/usePageMetadata";

export default function NotFoundPage() {
  usePageMetadata({
    title: "404 Page Not Found",
    description: "The page you are looking for doesn't exist or has been moved.",
    noindex: true,
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141A2E] flex flex-col font-body selection:bg-blue-100 selection:text-[#2158E0]">
      {/* Top Header */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-[#E6EAF3] py-4 px-4 sm:px-8 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group" aria-label="MyZkool Homepage">
            <MyZkoolLogo size={38} showText={true} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:text-[#2158E0] transition-colors"
            >
              School Sign In
            </Link>
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2158E0] hover:bg-[#1A47B8] rounded-full transition-colors shadow-sm shadow-[#2158E0]/20"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 relative overflow-hidden">
        {/* Ambient background glows */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none blur-3xl opacity-40 -z-10"
          style={{
            background: "radial-gradient(circle, rgba(33,88,224,0.12) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="max-w-2xl w-full text-center space-y-8 relative z-10">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-[#2158E0]/20 text-[#2158E0] text-xs font-bold tracking-widest uppercase shadow-2xs">
            <Compass className="w-3.5 h-3.5 animate-spin-slow" />
            <span>ERROR 404 • PAGE NOT FOUND</span>
          </div>

          {/* Big Number & Headline */}
          <div className="space-y-3">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-black font-heading text-[#0F172A] tracking-tight">
              4<span className="text-[#2158E0]">0</span>4
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-[#141A2E]">
              We couldn’t find the page you were looking for.
            </h2>
            <p className="text-sm sm:text-base text-[#5B6478] max-w-lg mx-auto leading-relaxed">
              The address might be misspelled, or the page may have been moved, renamed, or is temporarily unavailable.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#2158E0] hover:bg-[#1A47B8] active:scale-[0.98] rounded-xl shadow-md shadow-[#2158E0]/20 hover:shadow-lg transition"
            >
              <Home className="w-4 h-4" />
              <span>Return to Homepage</span>
            </Link>

            <Link
              to="/about"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#141A2E] bg-white border border-[#E6EAF3] hover:bg-[#F6F8FC] active:scale-[0.98] rounded-xl transition"
            >
              <BookOpen className="w-4 h-4 text-[#5B6478]" />
              <span>About MyZkool</span>
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#2158E0] bg-blue-50/70 border border-blue-200/60 hover:bg-blue-100/70 active:scale-[0.98] rounded-xl transition"
            >
              <span>Portal Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Helpful Navigation Links Grid */}
          <div className="pt-6 border-t border-[#E6EAF3] text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A94A8] text-center mb-4">
              Explore Popular Sections
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/#features"
                className="p-3.5 rounded-xl bg-white border border-[#E6EAF3] hover:border-[#2158E0]/40 hover:shadow-sm transition flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
                    Core Features
                  </h3>
                  <p className="text-[11px] text-[#5B6478]">Websites, ERP, WhatsApp</p>
                </div>
              </Link>

              <Link
                to="/#pricing"
                className="p-3.5 rounded-xl bg-white border border-[#E6EAF3] hover:border-[#2158E0]/40 hover:shadow-sm transition flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
                    Pricing Plans
                  </h3>
                  <p className="text-[11px] text-[#5B6478]">Transparent school plans</p>
                </div>
              </Link>

              <a
                href="https://wa.me/919555954854?text=Hi%2C%20I%20got%20a%20404%20error%20on%20the%20MyZkool%20website"
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-xl bg-white border border-[#E6EAF3] hover:border-[#2158E0]/40 hover:shadow-sm transition flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-emerald-700 transition-colors">
                    Contact Support
                  </h3>
                  <p className="text-[11px] text-[#5B6478]">WhatsApp +91 95559 54854</p>
                </div>
              </a>
            </div>
          </div>

          {/* Need help footer */}
          <div className="pt-2 text-xs text-[#5B6478] flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#2158E0]" />
              Need assistance?
            </span>
            <a href="tel:+919555954854" className="hover:text-[#2158E0] font-medium flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>+91 95559 54854</span>
            </a>
            <span>•</span>
            <a href="mailto:khaqanbuilds@gmail.com" className="hover:text-[#2158E0] font-medium flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span>khaqanbuilds@gmail.com</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#E6EAF3] py-5 px-4 text-center text-xs text-[#5B6478]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2024–{new Date().getFullYear()} MyZkool Technologies. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/" className="hover:underline">Home</Link>
            <span>•</span>
            <Link to="/about" className="hover:underline">About</Link>
            <span>•</span>
            <Link to="/login" className="hover:underline">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
