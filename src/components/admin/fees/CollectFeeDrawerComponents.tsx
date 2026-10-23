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
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STEP PROGRESS INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
interface StepProgressProps {
  step: 1 | 2 | 3 | 4;
}

export const StepProgress: React.FC<StepProgressProps> = ({ step }) => {
  return (
    <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E6EAF3]">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />

        {/* Step 1 */}
        <div className="flex flex-col items-center relative z-10">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= 1
                ? "bg-[#0B7B49] text-white ring-4 ring-emerald-50"
                : "bg-white border-2 border-gray-300 text-gray-400"
            }`}
          >
            {step > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : "1"}
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 ${
              step >= 1 ? "text-[#0B7B49]" : "text-gray-400"
            }`}
          >
            Student
          </span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center relative z-10">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= 2
                ? "bg-[#0B7B49] text-white ring-4 ring-emerald-50"
                : "bg-white border-2 border-gray-300 text-gray-400"
            }`}
          >
            {step > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : "2"}
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 ${
              step >= 2 ? "text-[#0B7B49]" : "text-gray-400"
            }`}
          >
            Invoices
          </span>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center relative z-10">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= 3
                ? "bg-[#0B7B49] text-white ring-4 ring-emerald-50"
                : "bg-white border-2 border-gray-300 text-gray-400"
            }`}
          >
            {step > 3 ? <Check className="w-4 h-4 stroke-[3]" /> : "3"}
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 ${
              step >= 3 ? "text-[#0B7B49]" : "text-gray-400"
            }`}
          >
            Payment
          </span>
        </div>

        {/* Step 4 */}
        <div className="flex flex-col items-center relative z-10">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === 4
                ? "bg-[#0B7B49] text-white ring-4 ring-emerald-50"
                : "bg-white border-2 border-gray-300 text-gray-400"
            }`}
          >
            4
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 ${
              step === 4 ? "text-[#0B7B49]" : "text-gray-400"
            }`}
          >
            Receipt
          </span>
        </div>
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
  paymentMethod: PaymentMode;
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
  paymentMethod,
  onPrint,
  onDownload,
  onSendToParent,
  onCollectAnother,
  onClose,
}) => {
  return (
    <div className="py-6 flex flex-col items-center text-center space-y-5 animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0B7B49] flex items-center justify-center shadow-inner">
        <Check className="w-9 h-9 stroke-[3]" />
      </div>

      <div>
        <h3 className="text-xl font-bold text-[#141A2E]">Payment Collected Successfully!</h3>
        <p className="text-sm text-[#5B6478] mt-1">
          Receipt has been generated and recorded in the system.
        </p>
      </div>

      <div className="w-full bg-[#F8FAFC] border border-[#E6EAF3] rounded-2xl p-5 text-left space-y-3">
        <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
          <span className="text-gray-500">Receipt No.</span>
          <span className="font-bold text-[#0B7B49]">{receiptNo}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
          <span className="text-gray-500">Student</span>
          <span className="font-semibold text-[#141A2E]">{studentName}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
          <span className="text-gray-500">Admission No.</span>
          <span className="text-gray-700">{admissionNo}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
          <span className="text-gray-500">Payment Method</span>
          <span className="font-semibold uppercase text-gray-800">{paymentMethod}</span>
        </div>
        <div className="flex justify-between items-center text-base pt-1">
          <span className="font-bold text-gray-800">Total Received</span>
          <span className="font-extrabold text-xl text-[#0B7B49]">
            {formatPaise(totalPaise)}
          </span>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onPrint}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#E6EAF3] text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
        >
          <Printer className="w-4 h-4 text-gray-500" />
          <span>Print Receipt</span>
        </button>

        <button
          onClick={onDownload}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#E6EAF3] text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
        >
          <Download className="w-4 h-4 text-gray-500" />
          <span>Download</span>
        </button>
      </div>

      <button
        onClick={onSendToParent}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-[#0B7B49] font-semibold rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
      >
        <Share2 className="w-4 h-4" />
        <span>Send to Parent via WhatsApp</span>
      </button>

      <div className="w-full flex gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={onCollectAnother}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Collect Another
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-[#0B7B49] text-white text-sm font-semibold hover:bg-[#09663c] cursor-pointer"
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
        <RefreshCw className="w-4 h-4 animate-spin text-[#0B7B49]" />
        <span>Loading matching students...</span>
      </div>
    );
  }

  if (searchResults.length > 0) {
    return (
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5 scrollbar-thin">
        <div className="flex items-center justify-between px-1 pb-1 text-[11px] font-semibold text-gray-500">
          <span>Matching Students ({searchResults.length})</span>
          <span>Click to select</span>
        </div>
        {searchResults.map((std) => {
          const hasDues = (std.balance_paise || 0) > 0;
          return (
            <button
              key={std.id}
              type="button"
              onClick={() => onSelectStudent(std)}
              className="w-full p-3 text-left bg-white hover:bg-emerald-50/40 border border-[#E6EAF3] hover:border-emerald-300 rounded-xl flex items-center justify-between transition-colors group shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#0B7B49] font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(std.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#141A2E] truncate group-hover:text-[#0B7B49] transition-colors">
                    {std.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {std.admission_no} • {std.class_name}
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
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#0B7B49] transition-colors" />
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
      <p className="font-medium text-gray-500">Search or filter students</p>
      <p className="text-[11px] text-gray-400 mt-0.5">
        Enter a name or admission number, or pick a class and section to browse students.
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#141A2E] uppercase tracking-wider block">
          Select Student
        </span>
        {!selectedStudent && hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] font-semibold text-[#0B7B49] hover:underline cursor-pointer"
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
              placeholder="Search by student name or admission no..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49] transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Class and Section Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="collect-fee-class-select" className="text-[11px] font-semibold text-gray-500 block mb-1">
                Select Class
              </label>
              <select
                id="collect-fee-class-select"
                value={selectedClassId}
                onChange={(e) => onClassChange(e.target.value)}
                disabled={isLoadingClasses}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49] transition-colors"
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
                Select Section
              </label>
              <select
                id="collect-fee-section-select"
                value={selectedSectionId}
                onChange={(e) => onSectionChange(e.target.value)}
                disabled={selectedClassId === "all" || availableSections.length === 0}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="p-3.5 bg-white border border-[#E6EAF3] rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#E8F7EE] text-[#0B7B49] font-bold text-sm flex items-center justify-center shrink-0">
              {getInitials(selectedStudent.name)}
            </div>
            <div>
              <p className="text-sm font-bold text-[#141A2E]">{selectedStudent.name}</p>
              <p className="text-xs text-[#5B6478]">
                {selectedStudent.admission_no} | Class {selectedStudent.class_name || "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onChangeStudent}
            className="text-xs font-semibold text-[#0B7B49] hover:underline px-2 py-1 cursor-pointer"
          >
            Change
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
  invoices: OutstandingInvoiceItem[];
  selectedInvoiceIds: Set<string>;
  invoicesLoading: boolean;
  selectedInvoicesTotalPaise: number;
  onToggleInvoice: (invoiceId: string) => void;
}

export const InvoicesStep: React.FC<InvoicesStepProps> = ({
  invoices,
  selectedInvoiceIds,
  invoicesLoading,
  selectedInvoicesTotalPaise,
  onToggleInvoice,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#141A2E] uppercase tracking-wider block">
          Outstanding Invoices
        </span>
        <span className="text-xs text-gray-500 font-medium">
          Total Balance: {formatPaise(selectedInvoicesTotalPaise)}
        </span>
      </div>

      {invoicesLoading ? (
        <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#0B7B49]" />
          <span>Loading outstanding invoices...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-500">
          No outstanding invoices found for this student.
        </div>
      ) : (
        <div className="border border-[#E6EAF3] rounded-xl overflow-hidden shadow-2xs bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-gray-500 font-semibold border-b border-[#E6EAF3]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Select</th>
                <th className="py-2.5 px-3 font-semibold text-gray-600">Invoice</th>
                <th className="py-2.5 px-3 font-semibold text-gray-600">Due Date</th>
                <th className="py-2.5 px-3 text-right font-semibold text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const isChecked = selectedInvoiceIds.has(inv.id);
                return (
                  <tr
                    key={inv.id}
                    className={`transition-colors ${
                      isChecked ? "bg-emerald-50/40" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleInvoice(inv.id)}
                        aria-label={`Select invoice ${inv.invoice_number}`}
                        className="w-4 h-4 rounded text-[#0B7B49] focus:ring-[#0B7B49] border-gray-300 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#141A2E]">{inv.invoice_number}</p>
                      <p className="text-[11px] text-gray-500">{inv.billing_period}</p>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-700">{inv.due_date}</span>
                        {inv.is_overdue && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.2 rounded font-semibold">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#141A2E]">
                      {formatPaise(inv.balance_paise)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. PAYMENT DETAILS FORM (STEP 3)
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentDetailsStepProps {
  amountRupees: string;
  onAmountChange: (amount: string) => void;
  paymentMethod: PaymentMode;
  onPaymentMethodChange: (mode: PaymentMode) => void;
  referenceNo: string;
  onReferenceNoChange: (ref: string) => void;
  paymentDate: string;
  onPaymentDateChange: (date: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export const PaymentDetailsStep: React.FC<PaymentDetailsStepProps> = ({
  amountRupees,
  onAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  referenceNo,
  onReferenceNoChange,
  paymentDate,
  onPaymentDateChange,
  notes,
  onNotesChange,
}) => {
  return (
    <div className="space-y-4 pt-2 border-t border-[#E6EAF3]">
      <h3 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider block">
        Payment Details
      </h3>

      {/* Amount & Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="collect-fee-amount" className="text-xs font-semibold text-gray-700 block mb-1">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
              ₹
            </span>
            <input
              id="collect-fee-amount"
              type="text"
              value={amountRupees}
              onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm font-bold text-[#141A2E] focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49]"
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
            className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm font-medium text-[#141A2E] focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49]"
          >
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online</option>
          </select>
        </div>
      </div>

      {/* Reference No & Payment Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="collect-fee-reference-no" className="text-xs font-semibold text-gray-700 block mb-1">
            Reference No. <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            id="collect-fee-reference-no"
            type="text"
            value={referenceNo}
            onChange={(e) => onReferenceNoChange(e.target.value)}
            placeholder="Transaction ID / Cheque No. / UTR"
            className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49]"
          />
        </div>

        <div>
          <label htmlFor="collect-fee-payment-date" className="text-xs font-semibold text-gray-700 block mb-1">
            Payment Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="collect-fee-payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => onPaymentDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49]"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="collect-fee-notes" className="text-xs font-semibold text-gray-700 block mb-1">
          Notes <span className="text-gray-400 font-normal">(Optional)</span>
        </label>
        <textarea
          id="collect-fee-notes"
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add any notes..."
          className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49] resize-none"
        />
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
            <span className="font-semibold uppercase text-gray-800">{paymentMethod}</span>
          </div>
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
            <span className="text-[#0B7B49] text-base">
              ₹{Number(amountRupees || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#0B7B49] text-white text-sm font-bold hover:bg-[#09663c] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
