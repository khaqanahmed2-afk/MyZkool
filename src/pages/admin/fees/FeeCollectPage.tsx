/**
 * FeeCollectPage — /admin/fees/collect
 * Dedicated Full-Page Fee Collection Counter
 *
 * Implements:
 * 1. Full-page layout within AdminShell (no cramped drawer)
 * 2. Header with title, subtitle, back navigation, student change action
 * 3. 4-step horizontal stepper: Student -> Invoices -> Payment -> Receipt
 * 4. Compact Student Summary card with parent/guardian details & dues
 * 5. Full-width Invoice Selection Table with checkboxes, particulars, due dates, status badges, amounts
 * 6. Real-time Collection Summary (Selected Count, Total Billed, Previously Paid, Outstanding, Selected Collection, Advance)
 * 7. Payment method selection, partial payment validation, cheque/UPI instrument fields, confirmation modal
 * 8. Official receipt issuance, live A4 theme preview with NO QR code, print and PDF download
 * 9. Content-aligned sticky footer with bottom padding to prevent content overlap
 * 10. Responsive layout for desktop, laptop, tablet, and mobile screens
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  CheckSquare,
  Printer,
  Download,
  Share2,
  RotateCcw,
  RefreshCw,
  Calendar,
  User,
  Users,
  DollarSign,
  Clock,
  ChevronDown,
  Filter,
  Plus,
  Receipt,
  Phone,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useCollectFeeDrawer } from "../../../components/admin/fees/useCollectFeeDrawer";
import { formatPaise, amountInWords } from "../../../lib/amountInWords";
import { PaymentReviewModal } from "../../../components/admin/fees/CollectFeeDrawerComponents";
import type { PaymentMode } from "../../../types/collection";
import type { OutstandingInvoiceItem } from "../../../services/feeCollectionsQueryService";

// Helper for avatar initials
function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Payment modes with icons and labels
const PAYMENT_MODES: Array<{ id: PaymentMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "upi", label: "UPI / QR", icon: Smartphone },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "cheque", label: "Cheque", icon: CheckSquare },
  { id: "card", label: "Card (POS)", icon: CreditCard },
  { id: "bank_transfer", label: "Bank Transfer (NEFT/RTGS)", icon: Building2 },
];

export default function FeeCollectPage() {
  const { schoolId, school } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Query parameter for initial student (e.g. /admin/fees/collect?student=xyz)
  const initialStudentId = searchParams.get("student") || searchParams.get("studentId") || undefined;
  const academicYearParam = searchParams.get("academicYearId") || undefined;

  // Filter & Search inside invoices table (Step 2)
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"all" | "overdue" | "partial" | "pending">("all");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");

  // Cash tender calculator state (Step 3 helper)
  const [cashTendered, setCashTendered] = useState<string>("");

  // Hook managing the 4-step workflow, database state, calculations, and payment recording
  const {
    step,
    setStep,
    goToStep,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    selectedStudent,
    classesList,
    selectedClassId,
    selectedSectionId,
    availableSections,
    isLoadingClasses,
    handleClassChange,
    setSelectedSectionId,
    handleSelectStudent,
    handleResetFilters,
    handleChangeStudent,
    invoices,
    selectedInvoiceIds,
    invoicesLoading,
    invoiceLoadError,
    handleRetryLoadInvoices,
    selectedInvoicesTotalPaise,
    toggleInvoice,
    selectAllInvoices,
    deselectAllInvoices,
    amountRupees,
    setAmountRupees,
    enteredPaise,
    isAdvancePayment,
    setIsAdvancePayment,
    handleToggleAdvancePayment,
    paymentMethod,
    setPaymentMethod,
    referenceNo,
    setReferenceNo,
    chequeNo,
    setChequeNo,
    bankName,
    setBankName,
    chequeDate,
    setChequeDate,
    branchName,
    setBranchName,
    paymentDate,
    setPaymentDate,
    notes,
    setNotes,
    invoiceAllocations,
    isReviewOpen,
    setIsReviewOpen,
    isSubmitting,
    errorMessage,
    setErrorMessage,
    generatedReceipt,
    notificationToast,
    buildCurrentReceiptHTML,
    handleProceedToInvoices,
    handleProceedToPayment,
    handleBackToStudent,
    handleBackToInvoices,
    handleSubmitPayment,
    handlePrintReceipt,
    handleDownloadReceipt,
    handleSendToParent,
    handleCollectAnother,
  } = useCollectFeeDrawer({
    isOpen: true,
    initialStudentId,
    academicYearId: academicYearParam,
    onSuccess: (receiptNo) => {
      // payment recorded
    },
  });

  // Calculate change for cash payment
  const cashChangePaise = useMemo(() => {
    if (paymentMethod !== "cash" || !cashTendered) return 0;
    const tenderedPaise = Math.round((parseFloat(cashTendered.replace(/,/g, "")) || 0) * 100);
    return Math.max(0, tenderedPaise - enteredPaise);
  }, [paymentMethod, cashTendered, enteredPaise]);

  // Filter invoices for Step 2 table
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (invoiceStatusFilter !== "all") {
        if (invoiceStatusFilter === "overdue" && !inv.is_overdue && inv.status !== "overdue") return false;
        if (invoiceStatusFilter === "partial" && inv.status !== "partial") return false;
        if (invoiceStatusFilter === "pending" && inv.status !== "pending") return false;
      }
      // Text search
      if (invoiceSearchQuery.trim()) {
        const q = invoiceSearchQuery.toLowerCase().trim();
        const matchesNo = inv.invoice_number.toLowerCase().includes(q);
        const matchesTerm = inv.term_name.toLowerCase().includes(q);
        const matchesPart = inv.particulars.some((p) => p.toLowerCase().includes(q));
        if (!matchesNo && !matchesTerm && !matchesPart) return false;
      }
      return true;
    });
  }, [invoices, invoiceStatusFilter, invoiceSearchQuery]);

  // Numerical summary metrics (strictly calculated from financial paise data)
  const collectionSummary = useMemo(() => {
    const selectedList = invoices.filter((inv) => selectedInvoiceIds.has(inv.id));
    const selectedCount = isAdvancePayment ? 0 : selectedList.length;
    const totalBilledPaise = selectedList.reduce((acc, curr) => acc + curr.total_paise, 0);
    const previouslyPaidPaise = selectedList.reduce((acc, curr) => acc + curr.paid_paise, 0);
    const outstandingPaise = selectedList.reduce((acc, curr) => acc + curr.balance_paise, 0);
    const selectedCollectionPaise = enteredPaise;
    const advanceAmountPaise = isAdvancePayment
      ? enteredPaise
      : Math.max(0, enteredPaise - selectedInvoicesTotalPaise);

    return {
      selectedCount,
      totalBilledPaise,
      previouslyPaidPaise,
      outstandingPaise,
      selectedCollectionPaise,
      advanceAmountPaise,
    };
  }, [invoices, selectedInvoiceIds, enteredPaise, isAdvancePayment, selectedInvoicesTotalPaise]);

  // Stepper definition
  const STEPS = [
    { num: 1 as const, title: "Student", desc: "Select Student" },
    { num: 2 as const, title: "Invoices", desc: "Review & Select Dues" },
    { num: 3 as const, title: "Payment", desc: "Mode & Details" },
    { num: 4 as const, title: "Receipt", desc: "Official Receipt" },
  ];

  // Offline status tracking
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

      // Escape to reset/close
      if (e.key === "Escape") {
        if (isReviewOpen) {
          setIsReviewOpen(false);
          return;
        }
        if (step === 3) {
          handleBackToInvoices();
        } else if (step === 2) {
          handleBackToStudent();
        } else if (step === 1) {
          setSearchQuery("");
        }
        return;
      }

      // Ctrl+Enter to collect / submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (step === 1 && selectedStudent) {
          handleProceedToInvoices();
        } else if (step === 2 && ((selectedInvoiceIds.size > 0 || isAdvancePayment) && enteredPaise > 0)) {
          handleProceedToPayment();
        } else if (step === 3 && enteredPaise > 0 && !isSubmitting) {
          if (isReviewOpen) {
            handleSubmitPayment();
          } else {
            setIsReviewOpen(true);
          }
        }
        return;
      }

      // Input field guard for single-character shortcuts
      if (isInput) return;

      // '/' to focus search
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById(step === 2 ? "invoice-search-input" : "student-search-input");
        searchInput?.focus();
        return;
      }

      // 'a' to select all overdue / invoices
      if ((e.key === "a" || e.key === "A") && step === 2) {
        e.preventDefault();
        selectAllInvoices();
        return;
      }

      // Alt+1...6 for payment modes
      if (e.altKey) {
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= 5) {
          e.preventDefault();
          const modes: PaymentMode[] = ["upi", "cash", "cheque", "card", "bank_transfer"];
          if (modes[keyNum - 1]) {
            setPaymentMethod(modes[keyNum - 1]);
          }
        }
        return;
      }

      // Receipt screen shortcuts: 'p' for Print, 'n' for Next student
      if (step === 4) {
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          handlePrintReceipt();
        } else if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          handleCollectAnother();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    step,
    isReviewOpen,
    selectedStudent,
    selectedInvoiceIds,
    isAdvancePayment,
    enteredPaise,
    isSubmitting,
    selectAllInvoices,
    handleProceedToInvoices,
    handleProceedToPayment,
    handleBackToInvoices,
    handleBackToStudent,
    handleSubmitPayment,
    handlePrintReceipt,
    handleCollectAnother,
    setPaymentMethod,
    setSearchQuery,
    setIsReviewOpen,
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 text-center sticky top-0 z-50">
          You are offline. Fee collection needs a connection to sync transactions.
        </div>
      )}

      {/* ── 1. Top Bar & Page Header ── */}
      <div className="bg-white border-b border-[#E6EAF3] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (step > 1 && step < 4) {
                    goToStep((step - 1) as 1 | 2 | 3);
                  } else {
                    navigate("/admin/fees/collections");
                  }
                }}
                className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                title="Go Back"
                aria-label="Back to Previous Page"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium truncate">
                  <Link to="/admin/fees" className="hover:text-[#2563EB]">Fees</Link>
                  <span>/</span>
                  <Link to="/admin/fees/collections" className="hover:text-[#2563EB]">Collections</Link>
                  <span>/</span>
                  <span className="text-gray-800 font-semibold">Counter</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-[#141A2E] tracking-tight flex items-center gap-2">
                  <span>Fee Collection Counter</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                    Full-Page Desk
                  </span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Record payments and issue official school receipts.
                </p>
              </div>
            </div>

            {/* Header Right Action Area */}
            <div className="flex items-center gap-2.5 shrink-0">
              {selectedStudent && step !== 1 && step !== 4 && (
                <button
                  type="button"
                  onClick={handleChangeStudent}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6EAF3] hover:border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                >
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span>Change Student</span>
                </button>
              )}

              <Link
                to="/admin/fees/collections"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6EAF3] hover:border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
              >
                <Receipt className="w-3.5 h-3.5 text-gray-500" />
                <span className="hidden sm:inline">All Collections</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 2. Horizontal Responsive Stepper ── */}
        <div className="bg-[#F8FAFC] border-t border-[#E6EAF3] px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between relative">
              {/* Connecting background bar */}
              <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-gray-200 -translate-y-1/2 z-0 hidden sm:block" />

              {STEPS.map((s, idx) => {
                const isCompleted = step > s.num;
                const isCurrent = step === s.num;
                const canNavigate = isCompleted || (s.num === 2 && Boolean(selectedStudent));

                return (
                  <button
                    key={s.num}
                    type="button"
                    disabled={!canNavigate && !isCurrent}
                    onClick={() => {
                      if (canNavigate) {
                        goToStep(s.num);
                      }
                    }}
                    className={`flex items-center gap-2.5 sm:flex-col sm:items-center relative z-10 transition-all ${
                      canNavigate ? "cursor-pointer group" : "cursor-default"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isCompleted
                          ? "bg-[#2563EB] text-white ring-4 ring-blue-100 group-hover:bg-[#1D4ED8]"
                          : isCurrent
                          ? "bg-[#2563EB] text-white ring-4 ring-blue-100 ring-offset-1"
                          : "bg-white border-2 border-gray-300 text-gray-400"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                    </div>

                    <div className="text-left sm:text-center">
                      <p
                        className={`text-xs font-bold leading-tight transition-colors ${
                          isCompleted
                            ? "text-[#2563EB] group-hover:underline"
                            : isCurrent
                            ? "text-[#141A2E]"
                            : "text-gray-400"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="text-[10px] text-gray-400 hidden sm:block font-medium">
                        {s.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Scrollable Content Container (pb-32 ensures sticky footer never hides content) ── */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-32 flex-1 space-y-6">
        {/* Error / Alert notification banner */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-medium rounded-xl flex items-center gap-2.5 animate-in fade-in duration-200 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 text-red-400 hover:text-red-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success toast message */}
        {notificationToast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2.5 animate-in fade-in duration-200 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">{notificationToast}</div>
          </div>
        )}

        {/* ── STEP 1: SELECT STUDENT ── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search and Filters Card */}
            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#141A2E]">Step 1: Select Student for Fee Collection</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Search by student name or admission number, or filter by class and section.
                </p>
              </div>

              {/* Main Search Input */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="student-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type student name or admission number (e.g. Aarav, ADM-2024-001)..."
                  className="w-full pl-11 pr-10 py-3 bg-white border border-[#E6EAF3] rounded-xl text-sm font-medium text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search query"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Class & Section Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label htmlFor="counter-class-select" className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Class Filter
                  </label>
                  <select
                    id="counter-class-select"
                    value={selectedClassId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    disabled={isLoadingClasses}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="all">All Classes</option>
                    {classesList.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="counter-section-select" className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Section Filter
                  </label>
                  <select
                    id="counter-section-select"
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    disabled={selectedClassId === "all" || availableSections.length === 0}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="all">
                      {selectedClassId === "all"
                        ? "All Sections"
                        : availableSections.length === 0
                        ? "No Sections"
                        : "All Sections"}
                    </option>
                    {availableSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="w-full py-2 px-3 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Results Grid / List */}
            <div className="bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E6EAF3] flex items-center justify-between bg-[#F8FAFC]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {isSearching
                    ? "Searching Students..."
                    : searchResults.length > 0
                    ? `Matching Students (${searchResults.length})`
                    : "Student Search Results"}
                </h3>
              </div>

              {isSearching ? (
                <div className="py-16 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
                  <span>Searching student records...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-[#E6EAF3]">
                  {searchResults.map((std) => {
                    const isSelected = selectedStudent?.id === std.id;
                    return (
                      <div
                        key={std.id}
                        onClick={() => handleSelectStudent(std)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectStudent(std);
                          }
                        }}
                        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50/40 transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50/70 border-l-4 border-l-[#2563EB]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-full bg-[#EBF2FE] text-[#2563EB] font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-blue-100">
                            {getInitials(std.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-[#141A2E]">{std.name}</h4>
                              <span className="font-mono text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {std.admission_no}
                              </span>
                              <span className="text-xs text-gray-600 font-medium">
                                Class: {std.class_name || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                              {std.guardian_name && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{std.guardian_name}</span>
                                </span>
                              )}
                              {std.guardian_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{std.guardian_phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">
                              Outstanding Dues
                            </span>
                            <span
                              className={`text-sm font-extrabold ${
                                (std.balance_paise || 0) > 0 ? "text-amber-700" : "text-emerald-700"
                              }`}
                            >
                              {formatPaise(std.balance_paise || 0)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectStudent(std);
                            }}
                            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                          >
                            Select & Continue
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400 px-4">
                  <User className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
                  <p className="text-sm font-semibold text-gray-700">No students found</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Type a student name or admission number in the search box above to select a student for payment collection.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: INVOICES SELECTION ── */}
        {step === 2 && selectedStudent && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Compact Student Summary Card (Requirement 4) */}
            <div className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/40 via-white to-white">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#EBF2FE] text-[#2563EB] font-black text-base flex items-center justify-center shrink-0 ring-4 ring-blue-50">
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-[#141A2E]">{selectedStudent.name}</h2>
                    <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                      {selectedStudent.admission_no}
                    </span>
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                      Class {selectedStudent.class_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 flex-wrap">
                    {selectedStudent.guardian_name ? (
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>Guardian: {selectedStudent.guardian_name}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">Guardian info not recorded</span>
                    )}
                    {selectedStudent.guardian_phone && (
                      <span className="flex items-center gap-1 font-medium">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{selectedStudent.guardian_phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 justify-between md:justify-end">
                <div className="text-left md:text-right">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Total Dues Balance
                  </p>
                  <p className="text-base sm:text-lg font-black text-amber-700">
                    {formatPaise(selectedStudent.balance_paise || 0)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleChangeStudent}
                  className="px-3.5 py-2 bg-white border border-[#E6EAF3] hover:border-gray-300 text-xs font-bold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                >
                  Change Student
                </button>
              </div>
            </div>

            {/* Collection Summary Section (Requirement 6 - Strict numeric calculation) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Selected Count */}
              <div className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs">
                <p className="text-[11px] font-semibold text-gray-500">Selected Invoices</p>
                <p className="text-lg font-black text-[#141A2E] mt-1">
                  {collectionSummary.selectedCount} {collectionSummary.selectedCount === 1 ? "inv" : "invs"}
                </p>
              </div>

              {/* Total Invoice Amount */}
              <div className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs">
                <p className="text-[11px] font-semibold text-gray-500">Total Billed</p>
                <p className="text-lg font-bold text-gray-700 mt-1">
                  {formatPaise(collectionSummary.totalBilledPaise)}
                </p>
              </div>

              {/* Previously Paid */}
              <div className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs">
                <p className="text-[11px] font-semibold text-gray-500">Previously Paid</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">
                  {formatPaise(collectionSummary.previouslyPaidPaise)}
                </p>
              </div>

              {/* Outstanding Balance */}
              <div className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs">
                <p className="text-[11px] font-semibold text-gray-500">Outstanding Due</p>
                <p className="text-lg font-black text-amber-700 mt-1">
                  {formatPaise(collectionSummary.outstandingPaise)}
                </p>
              </div>

              {/* Selected Collection Amount */}
              <div className="bg-[#EBF2FE] border border-blue-200 rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold text-[#2563EB]">Collection Amount</p>
                <p className="text-lg font-black text-[#2563EB] mt-1">
                  {formatPaise(collectionSummary.selectedCollectionPaise)}
                </p>
              </div>

              {/* Advance Amount */}
              <div className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
                <p className="text-[11px] font-semibold text-gray-500">Advance Credit</p>
                <p className="text-lg font-bold text-purple-700 mt-1">
                  {formatPaise(collectionSummary.advanceAmountPaise)}
                </p>
              </div>
            </div>

            {/* Advance Payment Banner / Toggle */}
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="advance-payment-checkbox"
                  checked={isAdvancePayment}
                  onChange={(e) => handleToggleAdvancePayment(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                />
                <label htmlFor="advance-payment-checkbox" className="font-semibold text-purple-900 cursor-pointer">
                  Advance Fee Payment Mode
                  <span className="block font-normal text-purple-700 text-[11px]">
                    Check this option to accept an advance deposit without selecting outstanding invoices.
                  </span>
                </label>
              </div>

              {isAdvancePayment && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-900 text-xs">Amount: ₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter advance amount"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="w-36 px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              )}
            </div>

            {/* Invoice Selection Table (Requirement 5) */}
            <div className="bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs overflow-hidden">
              {/* Table Action Bar */}
              <div className="px-5 py-4 border-b border-[#E6EAF3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-[#141A2E]">
                    Outstanding Term Invoices ({filteredInvoices.length})
                  </h3>
                  {invoices.length > 0 && !isAdvancePayment && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllInvoices}
                        className="text-[#2563EB] font-bold hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={deselectAllInvoices}
                        className="text-gray-500 font-semibold hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter and search controls inside invoices */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Status pills */}
                  <div className="flex items-center gap-1 bg-white border border-[#E6EAF3] rounded-xl p-0.5">
                    {(["all", "overdue", "partial", "pending"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setInvoiceStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                          invoiceStatusFilter === st
                            ? "bg-[#2563EB] text-white shadow-2xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* Search inside invoices */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="invoice-search-input"
                      type="text"
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      placeholder="Filter invoices..."
                      className="w-36 sm:w-44 pl-8 pr-2 py-1.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Table Container with Horizontal Scroll on mobile/small screens */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] text-gray-500 font-bold border-b border-[#E6EAF3]">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          aria-label="Select all invoices"
                          checked={
                            invoices.length > 0 &&
                            selectedInvoiceIds.size === invoices.length &&
                            !isAdvancePayment
                          }
                          onChange={(e) => {
                            if (e.target.checked) selectAllInvoices();
                            else deselectAllInvoices();
                          }}
                          disabled={isAdvancePayment || invoices.length === 0}
                          className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] border-gray-300 cursor-pointer disabled:opacity-40"
                        />
                      </th>
                      <th className="py-3 px-4 font-bold text-gray-700">Invoice No.</th>
                      <th className="py-3 px-4 font-bold text-gray-700">Billing Month / Term</th>
                      <th className="py-3 px-4 font-bold text-gray-700">Fee Particulars</th>
                      <th className="py-3 px-4 font-bold text-gray-700">Due Date</th>
                      <th className="py-3 px-4 font-bold text-gray-700">Status</th>
                      <th className="py-3 px-4 text-right font-bold text-gray-700">Invoice Amount</th>
                      <th className="py-3 px-4 text-right font-bold text-gray-700">Paid Amount</th>
                      <th className="py-3 px-4 text-right font-bold text-gray-700">Outstanding Balance</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E6EAF3]">
                    {invoicesLoading ? (
                      <tr>
                        <td colSpan={9} className="py-14 text-center text-gray-400">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
                            <span>Loading student invoices...</span>
                          </div>
                        </td>
                      </tr>
                    ) : invoiceLoadError ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-red-600">
                          <p className="text-xs font-semibold">{invoiceLoadError}</p>
                          <button
                            type="button"
                            onClick={handleRetryLoadInvoices}
                            className="mt-2 text-xs font-bold text-[#2563EB] underline cursor-pointer"
                          >
                            Retry Loading
                          </button>
                        </td>
                      </tr>
                    ) : filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-14 text-center text-gray-400 px-4">
                          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                          <p className="text-sm font-bold text-gray-700">
                            {invoices.length === 0 ? "No Outstanding Invoices" : "No invoices match the filter"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                            {invoices.length === 0
                              ? "This student has no pending dues or invoices. You can record an advance fee payment."
                              : "Try resetting your search query or status filter to view invoices."}
                          </p>
                          {invoices.length === 0 && !isAdvancePayment && (
                            <button
                              type="button"
                              onClick={() => handleToggleAdvancePayment(true)}
                              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Enable Advance Fee Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const isChecked = selectedInvoiceIds.has(inv.id);
                        return (
                          <tr
                            key={inv.id}
                            tabIndex={0}
                            onClick={() => toggleInvoice(inv.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleInvoice(inv.id);
                              }
                            }}
                            className={`transition-colors cursor-pointer focus:outline-none focus:bg-blue-50/40 ${
                              isChecked
                                ? "bg-blue-50/50 hover:bg-blue-50/80"
                                : "hover:bg-gray-50/70"
                            }`}
                          >
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                aria-label={`Select invoice ${inv.invoice_number}`}
                                checked={isChecked}
                                onChange={() => toggleInvoice(inv.id)}
                                className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] border-gray-300 cursor-pointer"
                              />
                            </td>

                            {/* Invoice Number */}
                            <td className="py-3 px-4 font-mono font-bold text-gray-900">
                              {inv.invoice_number}
                            </td>

                            {/* Term & Billing Period */}
                            <td className="py-3 px-4">
                              <p className="font-semibold text-gray-900">{inv.term_name}</p>
                              {inv.billing_period && (
                                <p className="text-[11px] text-gray-500 mt-0.5">{inv.billing_period}</p>
                              )}
                            </td>

                            {/* Fee Particulars */}
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {inv.particulars && inv.particulars.length > 0 ? (
                                  inv.particulars.map((p, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700"
                                    >
                                      {p}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </td>

                            {/* Due Date */}
                            <td className="py-3 px-4 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span className={inv.is_overdue ? "text-rose-600 font-bold" : "text-gray-700"}>
                                  {inv.due_date || "—"}
                                </span>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-4">
                              {inv.is_overdue || inv.status === "overdue" ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Overdue
                                </span>
                              ) : inv.status === "partial" ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Partially Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Pending
                                </span>
                              )}
                            </td>

                            {/* Invoice Amount */}
                            <td className="py-3 px-4 text-right font-medium text-gray-700 tabular-nums">
                              {formatPaise(inv.total_paise)}
                            </td>

                            {/* Paid Amount */}
                            <td className="py-3 px-4 text-right font-medium text-emerald-700 tabular-nums">
                              {formatPaise(inv.paid_paise)}
                            </td>

                            {/* Outstanding Balance */}
                            <td className="py-3 px-4 text-right font-black text-[#141A2E] tabular-nums text-sm">
                              {formatPaise(inv.balance_paise)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: PAYMENT DETAILS ── */}
        {step === 3 && selectedStudent && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Student Summary Top Strip */}
            <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EBF2FE] text-[#2563EB] font-bold text-sm flex items-center justify-center">
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#141A2E]">{selectedStudent.name}</h3>
                  <p className="text-xs text-gray-500">
                    Adm: {selectedStudent.admission_no} • Class {selectedStudent.class_name || "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleBackToInvoices}
                className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                Edit Invoices
              </button>
            </div>

            {/* Selected Invoices Allocation Breakdown Table */}
            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#141A2E]">Payment Allocation Breakdown</h3>
                <span className="text-xs text-gray-500 font-medium">
                  Auto-allocated oldest invoice first
                </span>
              </div>

              {invoiceAllocations.lines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-gray-500 font-bold border-b border-[#E6EAF3]">
                      <tr>
                        <th className="py-2.5 px-3">Invoice No.</th>
                        <th className="py-2.5 px-3">Term Period</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-right">Allocated Amount</th>
                        <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6EAF3]">
                      {invoiceAllocations.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{line.invoice_number}</td>
                          <td className="py-2.5 px-3 text-gray-600">{line.billing_period || "Term Fee"}</td>
                          <td className="py-2.5 px-3 text-right text-gray-600 tabular-nums">{formatPaise(line.balance_before_paise)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-nums">
                            {formatPaise(line.allocated_paise)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-gray-900 tabular-nums">
                            {formatPaise(line.balance_after_paise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-purple-700 italic py-2">
                  Advance fee collection: Entire amount will be credited to student's advance account.
                </p>
              )}

              {invoiceAllocations.advancePaise > 0 && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs font-semibold flex items-center justify-between">
                  <span>Excess payment credited as Advance:</span>
                  <span className="text-sm font-black">{formatPaise(invoiceAllocations.advancePaise)}</span>
                </div>
              )}
            </div>

            {/* Payment Form (2-column layout on desktop, single column on mobile) */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column: Payment Details */}
              <div className="flex-1 min-w-0 bg-white border border-[#E6EAF3] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
                <h3 className="text-sm font-bold text-[#141A2E]">Payment Configuration</h3>

                {/* Amount Input */}
                <div>
                  <label htmlFor="collection-amount-input" className="text-xs font-bold text-gray-700 block mb-1.5">
                    Collection Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">₹</span>
                    <input
                      id="collection-amount-input"
                      type="number"
                      min="1"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-base font-extrabold text-[#141A2E] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  {enteredPaise > 0 && enteredPaise < selectedInvoicesTotalPaise && !isAdvancePayment && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-1">
                      Partial payment: Remaining ₹{((selectedInvoicesTotalPaise - enteredPaise) / 100).toLocaleString("en-IN")} will remain due.
                    </p>
                  )}
                </div>

                {/* Payment Method Selector Cards */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-2">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PAYMENT_MODES.map((pm) => {
                      const Icon = pm.icon;
                      const isSelected = paymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#2563EB] bg-blue-50/70 text-[#2563EB] ring-2 ring-blue-100 font-bold shadow-2xs"
                              : "border-[#E6EAF3] bg-[#F8FAFC] text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#2563EB]" : "text-gray-500"}`} />
                          <span className="text-xs leading-tight">{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Fields based on method */}
                {paymentMethod === "upi" && (
                  <div>
                    <label htmlFor="upi-reference" className="text-xs font-semibold text-gray-700 block mb-1">
                      UPI Reference No. / UTR / Transaction ID
                    </label>
                    <input
                      id="upi-reference"
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="e.g. 423985729183"
                      className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                )}

                {paymentMethod === "cheque" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl">
                    <div>
                      <label htmlFor="cheque-number" className="text-xs font-bold text-gray-800 block mb-1">
                        Cheque Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="cheque-number"
                        type="text"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        placeholder="e.g. 000142"
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label htmlFor="cheque-bank" className="text-xs font-bold text-gray-800 block mb-1">
                        Bank Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="cheque-bank"
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label htmlFor="cheque-date" className="text-xs font-semibold text-gray-700 block mb-1">
                        Cheque Date
                      </label>
                      <input
                        id="cheque-date"
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label htmlFor="cheque-branch" className="text-xs font-semibold text-gray-700 block mb-1">
                        Branch Name
                      </label>
                      <input
                        id="cheque-branch"
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. MG Road Branch"
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === "cash" && (
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                    <div>
                      <label htmlFor="cash-tendered-input" className="text-xs font-bold text-gray-700 block mb-1">
                        Cash Tendered (Helper)
                      </label>
                      <input
                        id="cash-tendered-input"
                        type="number"
                        placeholder="e.g. 5000"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    {cashChangePaise > 0 && (
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                        <span>Change to Return:</span>
                        <span className="text-sm">{formatPaise(cashChangePaise)}</span>
                      </div>
                    )}
                  </div>
                )}

                {(paymentMethod === "card" || paymentMethod === "bank_transfer") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="payment-ref-other" className="text-xs font-semibold text-gray-700 block mb-1">
                        Transaction / Reference No.
                      </label>
                      <input
                        id="payment-ref-other"
                        type="text"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="e.g. TXN987291"
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label htmlFor="payment-bank-other" className="text-xs font-semibold text-gray-700 block mb-1">
                        Bank Name
                      </label>
                      <input
                        id="payment-bank-other"
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                )}

                {/* Payment Date & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="receipt-date-input" className="text-xs font-semibold text-gray-700 block mb-1">
                      Receipt Date
                    </label>
                    <input
                      id="receipt-date-input"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label htmlFor="payment-notes" className="text-xs font-semibold text-gray-700 block mb-1">
                      Internal Remarks / Notes
                    </label>
                    <input
                      id="payment-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional remarks"
                      className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Review Card (w-full lg:w-96) */}
              <div className="w-full lg:w-96 space-y-4 shrink-0">
                <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-4">
                  <h3 className="text-sm font-bold text-[#141A2E] border-b border-[#E6EAF3] pb-2.5">
                    Collection Confirmation Summary
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Student:</span>
                      <span className="font-bold text-gray-900">{selectedStudent.name}</span>
                    </div>

                    <div className="flex justify-between items-center text-gray-600">
                      <span>Admission No:</span>
                      <span className="font-mono font-semibold text-gray-800">{selectedStudent.admission_no}</span>
                    </div>

                    <div className="flex justify-between items-center text-gray-600">
                      <span>Class & Section:</span>
                      <span className="text-gray-800 font-semibold">{selectedStudent.class_name || "—"}</span>
                    </div>

                    <div className="flex justify-between items-center text-gray-600">
                      <span>Payment Method:</span>
                      <span className="font-bold text-[#2563EB] uppercase">{paymentMethod.replace("_", " ")}</span>
                    </div>

                    <div className="flex justify-between items-center text-gray-600">
                      <span>Date:</span>
                      <span className="text-gray-800 font-medium">{paymentDate}</span>
                    </div>

                    <div className="flex justify-between items-center text-gray-600 border-t border-gray-100 pt-2.5">
                      <span>Selected Invoices:</span>
                      <span className="font-bold text-gray-900">
                        {isAdvancePayment ? "Advance Only" : `${selectedInvoiceIds.size} term invoices`}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline border-t border-gray-200 pt-3">
                      <span className="text-sm font-bold text-gray-800">Total Payable:</span>
                      <span className="text-2xl font-black text-[#2563EB]">
                        {formatPaise(enteredPaise)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={enteredPaise <= 0 || isSubmitting}
                    onClick={() => setIsReviewOpen(true)}
                    className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Review & Issue Official Receipt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: RECEIPT CONFIRMATION ── */}
        {step === 4 && generatedReceipt && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Success Card */}
            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0B7B49] flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>

              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                  Payment Recorded & Posted to Ledger
                </span>
                <h2 className="text-2xl font-black text-[#141A2E]">Official Fee Receipt Generated!</h2>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Receipt <span className="font-mono font-bold text-[#2563EB]">#{generatedReceipt.receipt_no}</span> has been issued and the student dues updated.
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E6EAF3] hover:border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-gray-500" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendToParent}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E6EAF3] hover:border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-gray-500" />
                  <span>Send to Parent</span>
                </button>

                <button
                  type="button"
                  onClick={handleCollectAnother}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Collect Another Fee</span>
                </button>
              </div>
            </div>

            {/* Live Receipt Document Preview Card */}
            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-[#141A2E] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  <span>Official Receipt Preview (Formatted using School Theme)</span>
                </h3>
                <span className="text-xs text-gray-400">Zero QR Codes • Institutional Grade</span>
              </div>

              {/* Sandboxed iframe preview for perfect A4 rendering */}
              <div className="w-full border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex justify-center p-4">
                <iframe
                  title="Receipt Preview"
                  srcDoc={buildCurrentReceiptHTML()}
                  className="w-full max-w-3xl min-h-[580px] bg-white shadow-md border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Content-Aligned Sticky Footer Actions (Requirement 8) ── */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-[#E6EAF3] py-3.5 px-4 sm:px-6 lg:px-8 z-20 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Back Action or Summary */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {step === 1 ? (
              <Link
                to="/admin/fees/collections"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </Link>
            ) : step === 2 ? (
              <button
                type="button"
                onClick={handleBackToStudent}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Student</span>
              </button>
            ) : step === 3 ? (
              <button
                type="button"
                onClick={handleBackToInvoices}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Invoices</span>
              </button>
            ) : (
              <Link
                to="/admin/fees/collections"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-gray-500" />
                <span>Back to All Collections</span>
              </Link>
            )}

            {/* Summary Text on Step 2 and 3 */}
            {(step === 2 || step === 3) && (
              <div className="sm:pl-3 border-l border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 block">
                  {step === 2 ? "Selected Amount" : "Total Collection"}
                </span>
                <span className="text-base font-extrabold text-[#2563EB]">
                  {formatPaise(enteredPaise)}
                </span>
              </div>
            )}
          </div>

          {/* Right: Step-specific primary action */}
          <div className="w-full sm:w-auto flex justify-end">
            {step === 1 && (
              <button
                type="button"
                disabled={!selectedStudent}
                onClick={handleProceedToInvoices}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Continue to Invoices</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={
                  (selectedInvoiceIds.size === 0 && !isAdvancePayment) ||
                  enteredPaise <= 0
                }
                onClick={handleProceedToPayment}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={enteredPaise <= 0 || isSubmitting}
                onClick={() => setIsReviewOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Record Payment & Issue Receipt</span>
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleCollectAnother}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Collect Another Fee</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Confirmation / Review Modal ── */}
      <PaymentReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleSubmitPayment}
        isSubmitting={isSubmitting}
        studentName={selectedStudent?.name}
        admissionNo={selectedStudent?.admission_no}
        invoicesCount={
          invoices.filter((inv) => selectedInvoiceIds.has(inv.id)).length
        }
        paymentMethod={paymentMethod}
        referenceNo={referenceNo}
        chequeNo={chequeNo}
        bankName={bankName}
        paymentDate={paymentDate}
        amountRupees={amountRupees}
      />
    </div>
  );
}
