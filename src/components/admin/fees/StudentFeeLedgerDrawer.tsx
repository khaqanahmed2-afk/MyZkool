import React, { useEffect } from "react";
import { StudentFeeLedgerView } from "./studentLedger/StudentFeeLedgerView";

interface StudentFeeLedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  schoolId: string;
  schoolName: string;
  onCollectPayment: (studentId: string) => void;
}

/**
 * Slide-over Drawer for Student Fee Ledger Experience
 *
 * Implements a clean, responsive slide-over drawer that hosts the production-ready
 * StudentFeeLedgerView with full accounting reconciliation, tab navigation,
 * and integrated payment collection workflow.
 */
export function StudentFeeLedgerDrawer({
  isOpen,
  onClose,
  studentId,
  schoolId,
  schoolName,
  onCollectPayment,
}: StudentFeeLedgerDrawerProps) {
  // Listen for Escape key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !studentId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Student Fee Ledger Drawer"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl lg:max-w-5xl bg-white shadow-2xl h-full flex flex-col transform transition-transform ease-out duration-300 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <StudentFeeLedgerView
          studentId={studentId}
          schoolId={schoolId}
          schoolName={schoolName}
          onCollectPayment={onCollectPayment}
          mode="drawer"
          showHeader={true}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export default StudentFeeLedgerDrawer;
