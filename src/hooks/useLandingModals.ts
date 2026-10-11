import { useState, useCallback } from 'react';
import type { LegalDocType } from '../types/landing';

export function useLandingModals() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>("privacy");
  const [selectedPlanForDemo, setSelectedPlanForDemo] = useState<string | undefined>(undefined);

  const handleOpenDemo = useCallback((plan?: string) => {
    setSelectedPlanForDemo(plan);
    setIsDemoModalOpen(true);
  }, []);

  const handleCloseDemo = useCallback(() => {
    setIsDemoModalOpen(false);
    setSelectedPlanForDemo(undefined);
  }, []);

  const handleOpenLegal = useCallback((doc: LegalDocType = "privacy") => {
    setActiveLegalDoc(doc);
    setIsLegalModalOpen(true);
  }, []);

  const handleCloseLegal = useCallback(() => {
    setIsLegalModalOpen(false);
  }, []);

  const handleOpenLogin = useCallback(() => {
    setIsLoginModalOpen(true);
  }, []);

  const handleCloseLogin = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  return {
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
    setIsLoginModalOpen,
  };
}
