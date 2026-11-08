import React, { useState, useEffect, lazy, Suspense } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Hero } from "../components/sections/Hero";
import { DashboardPreview } from "../components/sections/DashboardPreview";
import { TrustStrip } from "../components/sections/TrustStrip";
import { Philosophy } from "../components/sections/Philosophy";
import { Features } from "../components/sections/Features";
import { WebsiteBuilderShowcase } from "../components/sections/WebsiteBuilderShowcase";
import { AcademicsShowcase } from "../components/sections/AcademicsShowcase";
import { WhatsAppSpotlight } from "../components/sections/WhatsAppSpotlight";
import { HowItWorks } from "../components/sections/HowItWorks";
import { Roadmap } from "../components/sections/Roadmap";
import { Pricing } from "../components/sections/Pricing";
import { FAQ } from "../components/sections/FAQ";
import { FinalCTA } from "../components/sections/FinalCTA";
import { Footer } from "../components/layout/Footer";
import { useLandingModals } from "../hooks/useLandingModals";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { FAQS } from "../data/landingData";

// ── Lazy-load heavy modals and AI widget (not needed for first paint) ──────────
const DemoModal = lazy(() =>
  import("../components/ui/DemoModal").then((m) => ({ default: m.DemoModal }))
);
const LoginModal = lazy(() =>
  import("../components/ui/LoginModal").then((m) => ({ default: m.LoginModal }))
);
const LegalModal = lazy(() =>
  import("../components/ui/LegalModal").then((m) => ({ default: m.LegalModal }))
);
const AiSchoolAdvisor = lazy(() =>
  import("../components/sections/AiSchoolAdvisor").then((m) => ({ default: m.AiSchoolAdvisor }))
);

export default function LandingPage() {
  const {
    isDemoModalOpen,
    isLoginModalOpen,
    isLegalModalOpen,
    activeLegalDoc,
    selectedPlanForDemo,
    handleOpenDemo,
    handleCloseDemo,
    handleOpenLegal,
    handleCloseLegal,
    handleOpenLogin,
    handleCloseLogin,
  } = useLandingModals();

  usePageMetadata({
    title: "MyZkool, School Website Builder and Management ERP with WhatsApp",
    description:
      "One unified platform for school websites, fee collections, attendance, report cards, and automated WhatsApp parent notifications. Zero IT team required.",
    canonical: "https://myzkool.in/",
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://myzkool.in/#website",
          "url": "https://myzkool.in/",
          "name": "MyZkool",
          "description": "School website builder and cloud ERP management platform with WhatsApp for Indian K-12 schools."
        },
        {
          "@type": "FAQPage",
          "@id": "https://myzkool.in/#faq",
          "mainEntity": FAQS.map((faq) => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer,
            },
          })),
        },
      ],
    },
  });

  // Delay mounting the AI advisor until browser is idle / after initial paint
  const [showAdvisor, setShowAdvisor] = useState(false);

  useEffect(() => {
    const id = requestIdleCallback
      ? requestIdleCallback(() => setShowAdvisor(true), { timeout: 3000 })
      : window.setTimeout(() => setShowAdvisor(true), 2000);
    return () => {
      if (requestIdleCallback) cancelIdleCallback(id as number);
      else clearTimeout(id as number);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#141A2E] font-body selection:bg-blue-100 selection:text-[#2158E0]">
      {/* 1. Professional Navigation Bar */}
      <Navbar
        onOpenDemo={() => handleOpenDemo()}
        onOpenLogin={handleOpenLogin}
      />

      {/* Main Page Flow following the 17-section structure */}
      <main id="main-content">
        {/* 2. Hero Section with Value Proposition */}
        <Hero onOpenDemo={() => handleOpenDemo()} />

        {/* 3. Product Dashboard Preview */}
        <DashboardPreview onOpenDemo={() => handleOpenDemo()} />

        {/* 4. Trust & Product Highlights */}
        <TrustStrip />

        {/* 5. Problems MyZkool Solves for Schools */}
        <Philosophy />

        {/* 6, 8, 9. Core ERP Features, Fee Management & Smart Attendance */}
        <Features />

        {/* 7. School Website Builder Showcase */}
        <WebsiteBuilderShowcase onOpenDemo={() => handleOpenDemo()} />

        {/* 10. Staff, Examinations and Academic Management */}
        <AcademicsShowcase onOpenDemo={() => handleOpenDemo()} />

        {/* 11. Parent Communication and Mobile App */}
        <WhatsAppSpotlight onOpenDemo={() => handleOpenDemo()} />

        {/* 12. How MyZkool Works (4-Step Onboarding) */}
        <HowItWorks />

        {/* Innovation Pipeline: Product Roadmap */}
        <Roadmap />

        {/* 13 & 14. Pricing Plans & Feature Comparison Table */}
        <Pricing onOpenDemo={(plan) => handleOpenDemo(plan)} />

        {/* 15. Frequently Asked Questions */}
        <FAQ />

        {/* 16. Strong Conversion Section */}
        <FinalCTA onOpenDemo={() => handleOpenDemo()} />
      </main>

      {/* 17. Professional Footer */}
      <Footer onOpenLegal={handleOpenLegal} />

      {/* Interactive Modals: only mount JS bundle when actually opened */}
      <Suspense fallback={null}>
        {isDemoModalOpen && (
          <DemoModal
            isOpen={isDemoModalOpen}
            onClose={handleCloseDemo}
            defaultPlan={selectedPlanForDemo}
            onOpenPrivacy={() => handleOpenLegal("privacy")}
          />
        )}

        {isLoginModalOpen && (
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={handleCloseLogin}
            onOpenDemo={() => handleOpenDemo()}
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

      {/* AI School Advisor: deferred until browser is idle */}
      {showAdvisor && (
        <Suspense fallback={null}>
          <AiSchoolAdvisor />
        </Suspense>
      )}
    </div>
  );
}
