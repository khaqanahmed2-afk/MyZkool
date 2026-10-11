import React, { useState, useEffect, lazy, Suspense } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Hero } from "../components/sections/Hero";
import { TrustStrip } from "../components/sections/TrustStrip";
import { Philosophy } from "../components/sections/Philosophy";
import { Features } from "../components/sections/Features";
import { Roadmap } from "../components/sections/Roadmap";
import { HowItWorks } from "../components/sections/HowItWorks";
import { WhatsAppSpotlight } from "../components/sections/WhatsAppSpotlight";
import { Pricing } from "../components/sections/Pricing";
import { FAQ } from "../components/sections/FAQ";
import { FinalCTA } from "../components/sections/FinalCTA";
import { Footer } from "../components/layout/Footer";
import { useLandingModals } from "../hooks/useLandingModals";

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
      {/* Top Navigation */}
      <Navbar
        onOpenDemo={() => handleOpenDemo()}
        onOpenLogin={handleOpenLogin}
      />

      {/* Main Page Flow */}
      <main id="main-content">
        {/* Section 1: Hero Moment */}
        <Hero onOpenDemo={() => handleOpenDemo()} />

        {/* Section 2: Trust & Qualitative Claims Strip */}
        <TrustStrip />

        {/* Section 3: Core Philosophy (Why MyZkool) */}
        <Philosophy />

        {/* Section 4: Full Feature Set (3-Column Grid) */}
        <Features />

        {/* Section 5: Product Roadmap */}
        <Roadmap />

        {/* Section 6: How It Works (4-Step Onboarding) */}
        <HowItWorks />

        {/* Section 7: WhatsApp Spotlight */}
        <WhatsAppSpotlight onOpenDemo={() => handleOpenDemo()} />

        {/* Section 8: Pricing & Full Comparison Table */}
        <Pricing onOpenDemo={(plan) => handleOpenDemo(plan)} />

        {/* Section 9: FAQ Accordion */}
        <FAQ />

        {/* Section 10: Final High-Impact CTA Band */}
        <FinalCTA onOpenDemo={() => handleOpenDemo()} />
      </main>

      {/* Footer */}
      <Footer onOpenLegal={handleOpenLegal} />

      {/* Interactive Modals — only mount JS bundle when actually opened */}
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

      {/* AI School Advisor — deferred until browser is idle */}
      {showAdvisor && (
        <Suspense fallback={null}>
          <AiSchoolAdvisor />
        </Suspense>
      )}
    </div>
  );
}
