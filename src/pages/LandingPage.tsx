import React, { useState, lazy, Suspense } from "react";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { TrustStrip } from "../components/TrustStrip";
import { Philosophy } from "../components/Philosophy";
import { Features } from "../components/Features";
import { Roadmap } from "../components/Roadmap";
import { HowItWorks } from "../components/HowItWorks";
import { WhatsAppSpotlight } from "../components/WhatsAppSpotlight";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { FinalCTA } from "../components/FinalCTA";
import { Footer } from "../components/Footer";
import type { LegalDocType } from "../components/LegalModal";

// ── Lazy-load heavy modals and AI widget (not needed for first paint) ──────────
const DemoModal = lazy(() =>
  import("../components/DemoModal").then((m) => ({ default: m.DemoModal }))
);
const LoginModal = lazy(() =>
  import("../components/LoginModal").then((m) => ({ default: m.LoginModal }))
);
const LegalModal = lazy(() =>
  import("../components/LegalModal").then((m) => ({ default: m.LegalModal }))
);
const AiSchoolAdvisor = lazy(() =>
  import("../components/AiSchoolAdvisor").then((m) => ({ default: m.AiSchoolAdvisor }))
);

export default function LandingPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>("privacy");
  const [selectedPlanForDemo, setSelectedPlanForDemo] = useState<string | undefined>(undefined);
  // Delay mounting the AI advisor until user has scrolled past hero
  const [showAdvisor, setShowAdvisor] = useState(false);

  const handleOpenDemo = (plan?: string) => {
    setSelectedPlanForDemo(plan);
    setIsDemoModalOpen(true);
  };

  const handleCloseDemo = () => {
    setIsDemoModalOpen(false);
    setSelectedPlanForDemo(undefined);
  };

  const handleOpenLegal = (doc: LegalDocType = "privacy") => {
    setActiveLegalDoc(doc);
    setIsLegalModalOpen(true);
  };

  // Mount the AI advisor after idle — it is non-critical for initial render
  React.useEffect(() => {
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
        onOpenLogin={() => setIsLoginModalOpen(true)}
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
            onClose={() => setIsLoginModalOpen(false)}
            onOpenDemo={() => handleOpenDemo()}
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

      {/* AI School Advisor — deferred until browser is idle */}
      {showAdvisor && (
        <Suspense fallback={null}>
          <AiSchoolAdvisor />
        </Suspense>
      )}
    </div>
  );
}
