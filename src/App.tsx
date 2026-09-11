/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { TrustStrip } from "./components/TrustStrip";
import { Philosophy } from "./components/Philosophy";
import { Features } from "./components/Features";
import { Roadmap } from "./components/Roadmap";
import { HowItWorks } from "./components/HowItWorks";
import { WhatsAppSpotlight } from "./components/WhatsAppSpotlight";
import { Pricing } from "./components/Pricing";
import { FAQ } from "./components/FAQ";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";
import { DemoModal } from "./components/DemoModal";
import { LoginModal } from "./components/LoginModal";
import { LegalModal, LegalDocType } from "./components/LegalModal";
import { AiSchoolAdvisor } from "./components/AiSchoolAdvisor";

export default function App() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>("privacy");
  const [selectedPlanForDemo, setSelectedPlanForDemo] = useState<string | undefined>(undefined);

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

      {/* Interactive Modals */}
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={handleCloseDemo}
        defaultPlan={selectedPlanForDemo}
        onOpenPrivacy={() => handleOpenLegal("privacy")}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenDemo={() => handleOpenDemo()}
      />

      <LegalModal
        isOpen={isLegalModalOpen}
        initialDoc={activeLegalDoc}
        onClose={() => setIsLegalModalOpen(false)}
      />

      {/* AI School Advisor Floating Widget (Chat + TTS + Document Analysis) */}
      <AiSchoolAdvisor />
    </div>
  );
}

