import React from "react";
import {
  X,
  Search,
  Check,
  ChevronRight,
  Printer,
  Download,
  Share2,
  RefreshCw,
  User,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";
import type { PaymentMode } from "../../../types/collection";
import type { OutstandingInvoiceItem } from "../../../services/feeCollectionsQueryService";
import { formatPaise } from "../../../lib/amountInWords";
import { getInitials } from "../../../services/feeCollectionsQueryService";

export interface StudentOption {
  id: string;
  name: string;
  admission_no: string;
  class_id?: string;
  class_name?: string;
  section_id?: string;
  section_name?: string;
  balance_paise?: number;
  guardian_name?: string;
  guardian_phone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STEP PROGRESS INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
interface StepProgressProps {
  step: 1 | 2 | 3 | 4;
}

export const StepProgress: React.FC<StepProgressProps> = ({ step }) => {
  const steps = [
    { num: 1, label: "Student" },
    { num: 2, label: "Invoices" },
    { num: 3, label: "Payment" },
    { num: 4, label: "Receipt" },
  ];

  return (
    <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E6EAF3]">
      <div className="flex items-center justify-between relative max-w-md mx-auto">
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />

        {steps.map((s) => {
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div key={s.num} className="flex flex-col items-center relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? "bg-[#2563EB] text-white ring-4 ring-blue-50"
                    : isCurrent
                    ? "bg-[#2563EB] text-white ring-4 ring-blue-50"
                    : "bg-white border-2 border-gray-300 text-gray-400"
                }`}
              >
                {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
              </div>
              <span
                className={`text-[11px] font-semibold mt-1 transition-colors ${
                  isDone
                    ? "text-[#2563EB]"
                    : isCurrent
                    ? "text-[#2563EB] font-bold"
                    : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. RECEIPT SUCCESS STEP (STEP 4)
// ─────────────────────────────────────────────────────────────────────────────
interface ReceiptSuccessStepProps {
  receiptNo: string;
  totalPaise: number;
  studentName?: string;
  admissionNo?: string;
  className?: string;
  paymentMethod: PaymentMode;
  allocatedInvoices?: string[];
  paymentDate?: string;
  onPrint: () => void;
  onDownload: () => void;
  onSendToParent: () => void;
  onCollectAnother: () => void;
  onClose: () => void;
}

export const ReceiptSuccessStep: React.FC<ReceiptSuccessStepProps> = ({
  receiptNo,
  totalPaise,
  studentName,
  admissionNo,
  className,
  paymentMethod,
  allocatedInvoices = [],
  paymentDate,
  onPrint,
  onDownload,
  onSendToParent,
  onCollectAnother,
  onClose,
}) => {
  return (
    <div className="py-4 flex flex-col items-center text-center space-y-4 animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0B7B49] flex items-center justify-center shadow-inner">
        <Check className="w-9 h-9 stroke-[3]" />
      </div>

      <div>
        <h3 className="text-xl font-bold text-[#141A2E]">Payment Collected Successfully!</h3>
        <p className="text-xs text-[#5B6478] mt-1">
          Fee receipt #{receiptNo} has been generated and posted to the school ledger.
        </p>
      </div>

      <div className="w-full bg-[#F8FAFC] border border-[#E6EAF3] rounded-2xl p-5 text-left space-y-2.5 text-xs">
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
          <span className="text-gray-500 font-medium">Receipt Number</span>
          <span className="font-mono font-bold text-sm text-[#2563EB]">{receiptNo}</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
          <span className="text-gray-500 font-medium">Student</span>
          <span className="font-semibold text-gray-900">{studentName || "—"}</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
          <span className="text-gray-500 font-medium">Admission / Class</span>
          <span className="text-gray-700">
            {admissionNo || "—"} {className ? `• ${className}` : ""}
          </span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
          <span className="text-gray-500 font-medium">Payment Date & Method</span>
          <span className="font-medium text-gray-800 uppercase">
            {paymentDate || "Today"} • {paymentMethod.replace("_", " ")}
          </span>
        </div>
        {allocatedInvoices.length > 0 && (
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-gray-500 font-medium">Invoices Allocated</span>
            <span className="font-medium text-gray-800 text-right">
              {allocatedInvoices.join(", ")}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm pt-1">
          <span className="font-bold text-gray-800">Total Received</span>
          <span className="font-extrabold text-xl text-[#2563EB]">
            {formatPaise(totalPaise)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#E6EAF3] text-gray-800 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer text-xs"
        >
          <Printer className="w-4 h-4 text-[#2563EB]" />
          <span>Print A4 Receipt</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#E6EAF3] text-gray-800 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer text-xs"
        >
          <Download className="w-4 h-4 text-[#2563EB]" />
          <span>Download PDF</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onSendToParent}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-[#0B7B49] font-semibold rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer text-xs"
      >
        <Share2 className="w-4 h-4" />
        <span>Send to Parent via WhatsApp</span>
      </button>

      <div className="w-full flex gap-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onCollectAnother}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Collect Another Fee
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] cursor-pointer shadow-xs"
        >
          Done
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. STUDENT SEARCH RESULTS LIST
// ─────────────────────────────────────────────────────────────────────────────
interface StudentSearchResultsListProps {
  isSearching: boolean;
  searchResults: StudentOption[];
  hasActiveFilters: boolean;
  onSelectStudent: (student: StudentOption) => void;
}

export const StudentSearchResultsList: React.FC<StudentSearchResultsListProps> = ({
  isSearching,
  searchResults,
  hasActiveFilters,
  onSelectStudent,
}) => {
  if (isSearching) {
    return (
      <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2 bg-gray-50/50 rounded-xl border border-gray-100">
        <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
        <span>Searching matching students...</span>
      </div>
    );
  }

  if (searchResults.length > 0) {
    return (
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
        <div className="flex items-center justify-between px-1 pb-1 text-[11px] font-semibold text-gray-500">
          <span>Matching Students ({searchResults.length})</span>
          <span>Click to select student</span>
        </div>
        {searchResults.map((std) => {
          const hasDues = (std.balance_paise || 0) > 0;
          return (
            <button
              key={std.id}
              type="button"
              onClick={() => onSelectStudent(std)}
              className="w-full p-3 text-left bg-white hover:bg-blue-50/40 border border-[#E6EAF3] hover:border-blue-300 rounded-xl flex items-center justify-between transition-colors group shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#EBF2FE] text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(std.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#141A2E] truncate group-hover:text-[#2563EB] transition-colors">
                    {std.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {std.admission_no} • Class {std.class_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pl-2">
                {hasDues ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Due: {formatPaise(std.balance_paise || 0)}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    No Dues
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#2563EB] transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (hasActiveFilters) {
    return (
      <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4">
        <User className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
        <p className="text-xs font-semibold text-gray-700">No students found</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          No active students match the selected class, section, or search term.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6 text-center text-gray-400 text-xs bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-4">
      <p className="font-medium text-gray-600">Search or filter students</p>
      <p className="text-[11px] text-gray-400 mt-0.5">
        Search by student name or admission number, or pick a class to browse students.
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. STUDENT SEARCH & SELECTION SECTION (STEP 1)
// ─────────────────────────────────────────────────────────────────────────────
interface StudentSearchSectionProps {
  selectedStudent: StudentOption | null;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedClassId: string;
  onClassChange: (classId: string) => void;
  selectedSectionId: string;
  onSectionChange: (sectionId: string) => void;
  classesList: SchoolClass[];
  availableSections: SchoolSection[];
  isLoadingClasses: boolean;
  isSearching: boolean;
  searchResults: StudentOption[];
  onSelectStudent: (student: StudentOption) => void;
  onResetFilters: () => void;
  onChangeStudent: () => void;
}

export const StudentSearchSection: React.FC<StudentSearchSectionProps> = ({
  selectedStudent,
  searchQuery,
  onSearchQueryChange,
  selectedClassId,
  onClassChange,
  selectedSectionId,
  onSectionChange,
  classesList,
  availableSections,
  isLoadingClasses,
  isSearching,
  searchResults,
  onSelectStudent,
  onResetFilters,
  onChangeStudent,
}) => {
  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedClassId !== "all" || selectedSectionId !== "all";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#141A2E]">Step 1: Select Student</h3>
          <p className="text-xs text-gray-500">
            Find the student by name, admission number, or class to collect fees.
          </p>
        </div>
        {!selectedStudent && hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {!selectedStudent ? (
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <label htmlFor="collect-fee-student-search" className="sr-only">
              Search student
            </label>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="collect-fee-student-search"
              type="text"
              placeholder="Search by student name or admission number..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Class and Section Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="collect-fee-class-select" className="text-[11px] font-semibold text-gray-500 block mb-1">
                Filter by Class
              </label>
              <select
                id="collect-fee-class-select"
                value={selectedClassId}
                onChange={(e) => onClassChange(e.target.value)}
                disabled={isLoadingClasses}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2158E0] transition-colors"
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
              <label htmlFor="collect-fee-section-select" className="text-[11px] font-semibold text-gray-500 block mb-1">
                Filter by Section
              </label>
              <select
                id="collect-fee-section-select"
                value={selectedSectionId}
                onChange={(e) => onSectionChange(e.target.value)}
                disabled={selectedClassId === "all" || availableSections.length === 0}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2158E0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>

          {/* Results List Component */}
          <div className="pt-1">
            <StudentSearchResultsList
              isSearching={isSearching}
              searchResults={searchResults}
              hasActiveFilters={hasActiveFilters}
              onSelectStudent={onSelectStudent}
            />
          </div>
        </div>
      ) : (
        /* Selected Student Card */
        <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#EBF2FE] text-[#2563EB] font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-blue-100">
              {getInitials(selectedStudent.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#141A2E]">{selectedStudent.name}</p>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                  Selected
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Adm: <span className="font-semibold text-gray-900">{selectedStudent.admission_no}</span> • Class {selectedStudent.class_name || "—"}
              </p>
              {selectedStudent.balance_paise !== undefined && (
                <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                  Outstanding Dues: {formatPaise(selectedStudent.balance_paise)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onChangeStudent}
            className="text-xs font-semibold text-[#2563EB] bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
          >
            Change Student
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. OUTSTANDING INVOICES (STEP 2)
// ─────────────────────────────────────────────────────────────────────────────
interface InvoicesStepProps {
  student: StudentOption;
  invoices: OutstandingInvoiceItem[];
  selectedInvoiceIds: Set<string>;
  invoicesLoading: boolean;
  invoiceLoadError?: string | null;
  onRetry?: () => void;
  selectedInvoicesTotalPaise: number;
  amountRupees: string;
  onAmountChange: (amt: string) => void;
  isAdvancePayment: boolean;
  onToggleAdvancePayment: (val: boolean) => void;
  onToggleInvoice: (invoiceId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onChangeStudent: () => void;
}

export const InvoicesStep: React.FC<InvoicesStepProps> = ({
  student,
  invoices,
  selectedInvoiceIds,
  invoicesLoading,
  invoiceLoadError,
  onRetry,
  selectedInvoicesTotalPaise,
  amountRupees,
  onAmountChange,
  isAdvancePayment,
  onToggleAdvancePayment,
  onToggleInvoice,
  onSelectAll,
  onDeselectAll,
  onChangeStudent,
}) => {
  return (
    <div className="space-y-4">
      {/* Student Summary Top Strip */}
      <div className="p-3 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#141A2E]">{student.name}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">{student.admission_no}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">{student.class_name}</span>
        </div>
        <button
          type="button"
          onClick={onChangeStudent}
          className="text-[11px] font-semibold text-[#2158E0] hover:underline cursor-pointer"
        >
          Change
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#141A2E]">Step 2: Select Invoices</h3>
          <p className="text-xs text-gray-500">
            Choose which outstanding term invoices to collect or record advance payment.
          </p>
        </div>
        {invoices.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[#2563EB] font-semibold hover:underline cursor-pointer"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-gray-500 font-medium hover:underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {invoicesLoading ? (
        <div className="py-10 text-center text-gray-400 text-xs flex items-center justify-center gap-2 bg-gray-50/50 rounded-xl border border-gray-100">
          <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
          <span>Loading outstanding term invoices...</span>
        </div>
      ) : invoiceLoadError ? (
        <div className="p-6 bg-red-50/70 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div>
            <p className="text-xs font-bold text-red-900">Failed to load invoices</p>
            <p className="text-[11px] text-red-700 mt-0.5">{invoiceLoadError}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold hover:bg-[#1D4ED8] transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Loading Invoices</span>
            </button>
          )}
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-6 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">No Outstanding Invoices</p>
            <p className="text-xs text-gray-500 mt-0.5">
              This student currently has zero pending dues on file. All invoices are fully cleared.
            </p>
          </div>

          <div className="pt-1 max-w-md mx-auto">
            <label className="flex items-start gap-3 p-3.5 bg-white border border-[#E6EAF3] rounded-xl text-left cursor-pointer hover:border-blue-300 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={isAdvancePayment}
                onChange={(e) => onToggleAdvancePayment(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-[#141A2E]">Collect as Advance Fee Payment</span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Record an advance payment to credit the student's fee ledger for upcoming fee dues.
                </p>
              </div>
            </label>

            {isAdvancePayment && (
              <div className="mt-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-left space-y-2 animate-in fade-in duration-150">
                <label htmlFor="advance-amount-input" className="text-xs font-bold text-[#141A2E] block">
                  Advance Amount to Collect (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                  <input
                    id="advance-amount-input"
                    type="text"
                    value={amountRupees === "0" ? "" : amountRupees}
                    onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="Enter advance amount (e.g. 5000)"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-blue-300 rounded-lg text-sm font-bold text-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-blue-700 font-medium">
                  Advance fee will be held as unallocated credit on student ledger and applied automatically to future fees.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border border-[#E6EAF3] rounded-xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] text-gray-600 font-bold border-b border-[#E6EAF3]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Select</th>
                    <th className="py-2.5 px-3">Invoice / Term</th>
                    <th className="py-2.5 px-3">Fee Particulars</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => {
                    const isChecked = selectedInvoiceIds.has(inv.id);
                    return (
                      <tr
                        key={inv.id}
                        className={`transition-colors ${
                          isChecked ? "bg-blue-50/40" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleInvoice(inv.id)}
                            aria-label={`Select invoice ${inv.invoice_number}`}
                            className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] border-gray-300 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-bold text-[#141A2E]">{inv.invoice_number}</p>
                          <p className="text-[11px] text-gray-500">{inv.billing_period}</p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {inv.particulars && inv.particulars.length > 0 ? (
                              inv.particulars.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-medium truncate max-w-[180px]"
                                  title={p}
                                >
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-gray-400">Regular Fees</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-gray-700">{inv.due_date}</span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {inv.status === "overdue" && (
                            <span className="inline-block text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold uppercase">
                              Overdue
                            </span>
                          )}
                          {inv.status === "partial" && (
                            <span className="inline-block text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase">
                              Partial
                            </span>
                          )}
                          {inv.status === "pending" && (
                            <span className="inline-block text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold uppercase">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600 whitespace-nowrap font-medium">
                          {formatPaise(inv.total_paise)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 whitespace-nowrap font-medium">
                          {inv.paid_paise > 0 ? formatPaise(inv.paid_paise) : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#2563EB] whitespace-nowrap">
                          {formatPaise(inv.balance_paise)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Partial payment editable amount card */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-gray-800">Payment Amount (₹)</p>
              <p className="text-[11px] text-gray-500">
                Defaults to selected balance ({formatPaise(selectedInvoicesTotalPaise)}). Adjust for partial payment.
              </p>
            </div>
            <div className="relative w-full sm:w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                ₹
              </span>
              <input
                type="text"
                value={amountRupees}
                onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-sm font-bold text-[#2563EB] text-right focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. PAYMENT DETAILS FORM (STEP 3)
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentDetailsStepProps {
  student: StudentOption;
  amountRupees: string;
  onAmountChange: (amount: string) => void;
  paymentMethod: PaymentMode;
  onPaymentMethodChange: (mode: PaymentMode) => void;
  referenceNo: string;
  onReferenceNoChange: (ref: string) => void;
  chequeNo: string;
  onChequeNoChange: (val: string) => void;
  bankName: string;
  onBankNameChange: (val: string) => void;
  chequeDate: string;
  onChequeDateChange: (val: string) => void;
  branchName: string;
  onBranchNameChange: (val: string) => void;
  paymentDate: string;
  onPaymentDateChange: (date: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  invoiceAllocations: {
    lines: Array<{
      id: string;
      invoice_number: string;
      billing_period: string;
      due_date: string;
      balance_before_paise: number;
      allocated_paise: number;
      balance_after_paise: number;
    }>;
    advancePaise: number;
  };
}

export const PaymentDetailsStep: React.FC<PaymentDetailsStepProps> = ({
  student,
  amountRupees,
  onAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  referenceNo,
  onReferenceNoChange,
  chequeNo,
  onChequeNoChange,
  bankName,
  onBankNameChange,
  chequeDate,
  onChequeDateChange,
  branchName,
  onBranchNameChange,
  paymentDate,
  onPaymentDateChange,
  notes,
  onNotesChange,
  invoiceAllocations,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[#141A2E]">Step 3: Payment Details</h3>
        <p className="text-xs text-gray-500">
          Enter collection method, transaction references, and verify invoice allocations.
        </p>
      </div>

      {/* Amount and Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="collect-fee-amount" className="text-xs font-semibold text-gray-700 block mb-1">
            Collection Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
              ₹
            </span>
            <input
              id="collect-fee-amount"
              type="text"
              value={amountRupees}
              onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm font-bold text-[#2563EB] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="collect-fee-payment-method" className="text-xs font-semibold text-gray-700 block mb-1">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <select
            id="collect-fee-payment-method"
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMode)}
            className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-medium text-[#141A2E] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="upi">UPI / QR Code</option>
            <option value="cash">Cash Counter</option>
            <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
            <option value="cheque">Cheque / Demand Draft</option>
            <option value="online">Online Gateway</option>
          </select>
        </div>
      </div>

      {/* Cheque Specific Fields */}
      {paymentMethod === "cheque" && (
        <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <Building2 className="w-4 h-4 text-amber-700" />
            <span>Cheque Instrument Particulars</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cheque-number" className="text-[11px] font-semibold text-gray-700 block mb-1">
                Cheque Number <span className="text-red-500">*</span>
              </label>
              <input
                id="cheque-number"
                type="text"
                value={chequeNo}
                onChange={(e) => onChequeNoChange(e.target.value)}
                placeholder="e.g. 000452"
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-mono font-semibold text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="cheque-bank" className="text-[11px] font-semibold text-gray-700 block mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                id="cheque-bank"
                type="text"
                value={bankName}
                onChange={(e) => onBankNameChange(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="cheque-date" className="text-[11px] font-semibold text-gray-700 block mb-1">
                Cheque Date
              </label>
              <input
                id="cheque-date"
                type="date"
                value={chequeDate}
                onChange={(e) => onChequeDateChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="cheque-branch" className="text-[11px] font-semibold text-gray-700 block mb-1">
                Branch Name / Location
              </label>
              <input
                id="cheque-branch"
                type="text"
                value={branchName}
                onChange={(e) => onBranchNameChange(e.target.value)}
                placeholder="e.g. Main Road Branch"
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reference & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="collect-fee-reference-no" className="text-xs font-semibold text-gray-700 block mb-1">
            Reference / UTR No.{" "}
            {paymentMethod !== "cash" && paymentMethod !== "cheque" ? (
              <span className="text-gray-400 font-normal">(Recommended)</span>
            ) : (
              <span className="text-gray-400 font-normal">(Optional)</span>
            )}
          </label>
          <input
            id="collect-fee-reference-no"
            type="text"
            value={referenceNo}
            onChange={(e) => onReferenceNoChange(e.target.value)}
            placeholder={
              paymentMethod === "upi"
                ? "UPI Transaction ID / UTR"
                : paymentMethod === "bank_transfer"
                ? "NEFT / RTGS Reference Number"
                : "Receipt / Counter Reference"
            }
            className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>

        <div>
          <label htmlFor="collect-fee-payment-date" className="text-xs font-semibold text-gray-700 block mb-1">
            Payment Date <span className="text-red-500">*</span>
          </label>
          <input
            id="collect-fee-payment-date"
            type="date"
            value={paymentDate}
            onChange={(e) => onPaymentDateChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="collect-fee-notes" className="text-xs font-semibold text-gray-700 block mb-1">
          Remarks / Note <span className="text-gray-400 font-normal">(Optional)</span>
        </label>
        <textarea
          id="collect-fee-notes"
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add any cashier notes or special authorization remarks..."
          className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] resize-none"
        />
      </div>

      {/* Selected Invoice Allocation Summary */}
      <div className="bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-800">Invoice Allocation Summary</span>
          <span className="text-gray-500">
            {invoiceAllocations.lines.length} invoice{invoiceAllocations.lines.length === 1 ? "" : "s"} selected
          </span>
        </div>

        {invoiceAllocations.lines.length > 0 ? (
          <div className="space-y-1.5">
            {invoiceAllocations.lines.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 text-[11px]"
              >
                <div>
                  <span className="font-bold text-gray-900">{item.invoice_number}</span>
                  <span className="text-gray-500 ml-1.5">({item.billing_period})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#2563EB]">
                    +{formatPaise(item.allocated_paise)}
                  </span>
                  <span className="text-gray-400 ml-2">
                    Remaining: {formatPaise(item.balance_after_paise)}
                  </span>
                </div>
              </div>
            ))}

            {invoiceAllocations.advancePaise > 0 && (
              <div className="flex items-center justify-between p-2 bg-blue-50/70 rounded-lg border border-blue-100 text-[11px]">
                <span className="font-semibold text-blue-900">Advance Fee Credit</span>
                <span className="font-bold text-blue-700">
                  +{formatPaise(invoiceAllocations.advancePaise)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>Advance Fee Payment Mode</span>
              <span className="text-[#2563EB] font-black">₹{Number(amountRupees || 0).toLocaleString("en-IN")}</span>
            </div>
            <p className="text-[11px] text-blue-700">
              No outstanding invoices selected. This amount will be credited to the student's ledger as an unallocated advance credit and will automatically offset future fees.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONFIRMATION REVIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  studentName?: string;
  admissionNo?: string;
  invoicesCount: number;
  paymentMethod: PaymentMode;
  referenceNo?: string;
  chequeNo?: string;
  bankName?: string;
  paymentDate: string;
  amountRupees: string;
}

export const PaymentReviewModal: React.FC<PaymentReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  studentName,
  admissionNo,
  invoicesCount,
  paymentMethod,
  referenceNo,
  chequeNo,
  bankName,
  paymentDate,
  amountRupees,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">Confirm Fee Collection</h3>
          <p className="text-xs text-gray-500 mt-1">
            Please verify payment details before recording.
          </p>
        </div>

        <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Student:</span>
            <span className="font-semibold text-gray-800">
              {studentName} ({admissionNo})
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Invoices Selected:</span>
            <span className="font-medium text-gray-700">
              {invoicesCount} {invoicesCount === 1 ? "invoice" : "invoices"}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Payment Mode:</span>
            <span className="font-semibold uppercase text-gray-800">{paymentMethod.replace("_", " ")}</span>
          </div>
          {paymentMethod === "cheque" && chequeNo && (
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Cheque No:</span>
              <span className="font-mono font-medium text-gray-700">
                {chequeNo} ({bankName})
              </span>
            </div>
          )}
          {referenceNo && (
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Reference No:</span>
              <span className="font-medium text-gray-700">{referenceNo}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Payment Date:</span>
            <span className="font-medium text-gray-700">{paymentDate}</span>
          </div>
          <div className="flex justify-between py-2 text-sm font-bold">
            <span className="text-gray-800">Total Collection:</span>
            <span className="text-[#2563EB] text-base">
              ₹{Number(amountRupees || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Confirm & Collect</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
