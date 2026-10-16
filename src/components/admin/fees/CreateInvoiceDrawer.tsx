import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Search,
  Calendar,
  Check,
  ChevronRight,
  ArrowLeft,
  FileText,
  Printer,
  Download,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  Loader2,
  Bus,
} from "lucide-react";
import { formatPaise } from "../../../lib/amountInWords";
import { generateInvoiceHTML } from "../../../lib/invoiceTemplate";
import {
  searchStudentsForInvoice,
  getStudentInvoiceFormData,
  createSingleStudentInvoice,
  sendInvoiceToParent,
} from "../../../services/invoiceService";
import type { StudentInvoice, FeeTerm } from "../../../types/fees";

interface CreateInvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolBranding: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    affiliation_no?: string;
  };
  academicYears: any[];
  selectedYearId: string;
  onInvoiceCreated: (newInvoice: StudentInvoice) => void;
  onViewInvoiceDetails?: (invoiceId: string) => void;
}

export function CreateInvoiceDrawer({
  isOpen,
  onClose,
  schoolId,
  schoolBranding,
  academicYears,
  selectedYearId,
  onInvoiceCreated,
  onViewInvoiceDetails,
}: CreateInvoiceDrawerProps) {
  // Stepper State: 1 = Student, 2 = Fee Details, 3 = Review, 4 = Generate (Success)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Student Search & Selection
  const [studentQuery, setStudentQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Step 2: Fee Details
  const [terms, setTerms] = useState<FeeTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  });

  // Fee Components Checkboxes
  const [tuitionChecked, setTuitionChecked] = useState(true);
  const [tuitionAmount, setTuitionAmount] = useState(1200000); // in paise (₹12,000)

  const [transportChecked, setTransportChecked] = useState(false);
  const [transportAmount, setTransportAmount] = useState(200000); // in paise (₹2,000)

  const [admissionChecked, setAdmissionChecked] = useState(false);
  const [admissionAmount, setAdmissionAmount] = useState(0);

  const [otherChecked, setOtherChecked] = useState(false);
  const [otherAmount, setOtherAmount] = useState(0);

  // Concession & Notes
  const [concessionsList, setConcessionsList] = useState<any[]>([]);
  const [selectedConcessionId, setSelectedConcessionId] = useState("none");
  const [notes, setNotes] = useState("");

  // Step 4: Submission & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<StudentInvoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Search input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setStudentQuery("");
      setSearchResults([]);
      setSelectedStudent(null);
      setErrorMessage(null);
      setCreatedInvoice(null);
      setWhatsappSent(false);
      setNotes("");
      setSelectedConcessionId("none");

      // Pre-load default student list for fast browsing
      searchStudentsForInvoice(schoolId, "", selectedYearId).then((res) => {
        setSearchResults(res || []);
      });
    }
  }, [isOpen, schoolId, selectedYearId]);

  // Handle student search typing
  useEffect(() => {
    if (!isOpen || selectedStudent) return;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const res = await searchStudentsForInvoice(schoolId, studentQuery, selectedYearId);
      setSearchResults(res || []);
      setSearchLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [studentQuery, schoolId, selectedYearId, isOpen, selectedStudent]);

  // When a student is selected, load fee structure, transport status, terms, and concessions
  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchLoading(true);
    setErrorMessage(null);

    try {
      const formData = await getStudentInvoiceFormData(schoolId, student.id, selectedYearId);
      setTerms(formData.terms);
      setConcessionsList(formData.concessions);

      // Select default term
      const defaultTerm = formData.terms[0];
      if (defaultTerm) {
        setSelectedTermId(defaultTerm.id);
        setDueDate(defaultTerm.due_date || "2026-04-10");
      }

      // Check student transport
      if (student.has_transport) {
        setTransportChecked(true);
        setTransportAmount(student.transport_monthly_paise || 200000);
      } else {
        setTransportChecked(false);
        setTransportAmount(200000);
      }

      setTuitionChecked(true);
      setTuitionAmount(1200000); // ₹12,000 as in reference image
    } catch (err: any) {
      console.error("Failed to load student invoice data", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // When term changes, update due date
  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    const found = terms.find((t) => t.id === termId);
    if (found && found.due_date) {
      setDueDate(found.due_date);
    }
  };

  // Calculations
  const subtotalPaise = useMemo(() => {
    let sum = 0;
    if (tuitionChecked) sum += tuitionAmount;
    if (transportChecked) sum += transportAmount;
    if (admissionChecked) sum += admissionAmount;
    if (otherChecked) sum += otherAmount;
    return sum;
  }, [tuitionChecked, tuitionAmount, transportChecked, transportAmount, admissionChecked, admissionAmount, otherChecked, otherAmount]);

  const discountPaise = useMemo(() => {
    if (selectedConcessionId === "none" || subtotalPaise === 0) return 0;
    const conc = concessionsList.find((c) => c.id === selectedConcessionId);
    if (!conc) return 0;
    if (conc.discount_type === "percent") {
      return Math.round((subtotalPaise * conc.discount_value) / 100);
    }
    return Math.min(subtotalPaise, conc.discount_value * 100);
  }, [selectedConcessionId, subtotalPaise, concessionsList]);

  const totalAmountPaise = useMemo(() => {
    return Math.max(0, subtotalPaise - discountPaise);
  }, [subtotalPaise, discountPaise]);

  // Validation before proceeding
  const handleProceedToReview = () => {
    setErrorMessage(null);
    if (!selectedStudent) {
      setErrorMessage("Please select a student first.");
      setCurrentStep(1);
      return;
    }
    if (!selectedTermId) {
      setErrorMessage("Please select a valid fee period.");
      return;
    }
    if (!dueDate) {
      setErrorMessage("Please select a due date.");
      return;
    }
    if (subtotalPaise <= 0) {
      setErrorMessage("Please select at least one fee component with an amount.");
      return;
    }

    setCurrentStep(3);
  };

  // Execute Invoice Generation
  const handleGenerateInvoice = async () => {
    if (!selectedStudent || !selectedTermId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const termObj = terms.find((t) => t.id === selectedTermId);
    const concObj = concessionsList.find((c) => c.id === selectedConcessionId);

    const componentsToInclude = [];
    if (tuitionChecked && tuitionAmount > 0) {
      componentsToInclude.push({
        name: "Tuition Fee",
        amount_paise: tuitionAmount,
        fee_head_id: "head-tuition",
        is_transport: false,
      });
    }
    if (transportChecked && transportAmount > 0) {
      componentsToInclude.push({
        name: "Transport Fee",
        amount_paise: transportAmount,
        fee_head_id: "head-transport",
        is_transport: true,
      });
    }
    if (admissionChecked && admissionAmount > 0) {
      componentsToInclude.push({
        name: "Admission Fee",
        amount_paise: admissionAmount,
        fee_head_id: "head-admission",
        is_transport: false,
      });
    }
    if (otherChecked && otherAmount > 0) {
      componentsToInclude.push({
        name: "Other Fees",
        amount_paise: otherAmount,
        fee_head_id: "head-other",
        is_transport: false,
      });
    }

    const res = await createSingleStudentInvoice(schoolId, {
      studentId: selectedStudent.id,
      academicYearId: selectedYearId,
      termId: selectedTermId,
      billingPeriod: termObj?.name || "Apr 2026",
      invoiceDate,
      dueDate,
      feeComponents: componentsToInclude,
      concessionId: selectedConcessionId !== "none" ? selectedConcessionId : undefined,
      concessionRuleName: concObj ? concObj.name : undefined,
      concessionPaise: discountPaise,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.invoice) {
      setCreatedInvoice(res.invoice);
      setCurrentStep(4);
      onInvoiceCreated(res.invoice);
    } else {
      setErrorMessage(res.error || "Failed to create fee invoice.");
    }
  };

  // Action handlers in Step 4
  const handlePrint = (inv: StudentInvoice) => {
    const html = generateInvoiceHTML(inv, {
      name: schoolBranding.name || "School",
      address: schoolBranding.address,
      phone: schoolBranding.phone,
      email: schoolBranding.email,
      logo_url: schoolBranding.logo_url,
      affiliation_no: schoolBranding.affiliation_no,
    });
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  };

  const handleSendWhatsApp = async (inv: StudentInvoice) => {
    setWhatsappLoading(true);
    const res = await sendInvoiceToParent(schoolId, inv.id, "whatsapp");
    setWhatsappLoading(false);
    if (res.success) {
      setWhatsappSent(true);
    } else {
      alert(res.error || "Failed to dispatch WhatsApp notice.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200">
          {/* 1. Drawer Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
            <h2 className="text-base font-bold text-slate-900">Create Invoice</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Stepper Progress */}
          <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/70 shrink-0">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {/* Step 1 */}
              <div
                onClick={() => setCurrentStep(1)}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                  currentStep >= 1 ? "text-slate-900" : "text-slate-400"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === 1
                      ? "bg-[#047857] text-white ring-4 ring-emerald-100 shadow-xs"
                      : currentStep > 1
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "1"}
                </div>
                <span className={`text-[11px] font-semibold ${currentStep === 1 ? "text-[#047857]" : "text-slate-600"}`}>
                  Student
                </span>
              </div>

              <div className={`flex-1 h-0.5 mx-2 ${currentStep > 1 ? "bg-emerald-500" : "bg-slate-200"}`} />

              {/* Step 2 */}
              <div
                onClick={() => {
                  if (selectedStudent) setCurrentStep(2);
                }}
                className={`flex flex-col items-center gap-1 ${
                  selectedStudent ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === 2
                      ? "bg-[#047857] text-white ring-4 ring-emerald-100 shadow-xs"
                      : currentStep > 2
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "2"}
                </div>
                <span className={`text-[11px] font-semibold ${currentStep === 2 ? "text-[#047857]" : "text-slate-500"}`}>
                  Fee Details
                </span>
              </div>

              <div className={`flex-1 h-0.5 mx-2 ${currentStep > 2 ? "bg-emerald-500" : "bg-slate-200"}`} />

              {/* Step 3 */}
              <div
                onClick={() => {
                  if (selectedStudent) setCurrentStep(3);
                }}
                className={`flex flex-col items-center gap-1 ${
                  selectedStudent ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === 3
                      ? "bg-[#047857] text-white ring-4 ring-emerald-100 shadow-xs"
                      : currentStep > 3
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {currentStep > 3 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "3"}
                </div>
                <span className={`text-[11px] font-semibold ${currentStep === 3 ? "text-[#047857]" : "text-slate-500"}`}>
                  Review
                </span>
              </div>

              <div className={`flex-1 h-0.5 mx-2 ${currentStep > 3 ? "bg-emerald-500" : "bg-slate-200"}`} />

              {/* Step 4 */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === 4
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  4
                </div>
                <span className={`text-[11px] font-semibold ${currentStep === 4 ? "text-emerald-700" : "text-slate-500"}`}>
                  Generate
                </span>
              </div>
            </div>
          </div>

          {/* 3. Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ──────── STEP 1 & 2: Interactive Combined Form matching reference ──────── */}
            {(currentStep === 1 || currentStep === 2) && (
              <>
                {/* 1. Select Student Section */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">
                    1. Select Student
                  </label>

                  {!selectedStudent ? (
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search by name or admission no..."
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                        autoFocus
                      />

                      {/* Dropdown Results */}
                      {searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20 divide-y divide-slate-100">
                          {searchResults.map((std) => (
                            <button
                              key={std.id}
                              type="button"
                              onClick={() => handleSelectStudent(std)}
                              className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                                  {std.name
                                    ? std.name.slice(0, 2).toUpperCase()
                                    : "ST"}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-slate-900">{std.name}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {std.admission_no} • {std.class_name}-{std.section_name}
                                  </div>
                                </div>
                              </div>
                              {std.has_transport && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <Bus className="w-3 h-3" />
                                  Bus Opted
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Selected Student Card (Exact match of Reference Image) */
                    <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#D1FAE5] text-[#065F46] font-bold text-xs flex items-center justify-center shrink-0">
                          {selectedStudent.first_name && selectedStudent.last_name
                            ? `${selectedStudent.first_name[0]}${selectedStudent.last_name[0]}`.toUpperCase()
                            : selectedStudent.name?.slice(0, 2).toUpperCase() || "AS"}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{selectedStudent.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {selectedStudent.admission_no} | Class {selectedStudent.class_name}-{selectedStudent.section_name}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(null)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
                        title="Remove student"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Fee Details Section */}
                <div className="space-y-4 pt-1">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
                    2. Fee Details
                  </label>

                  {/* Fee Period & Due Date Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Fee Period <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedTermId}
                        onChange={(e) => handleTermChange(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      >
                        {terms.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Fee Components Checkbox List */}
                  <div>
                    <span className="block text-xs font-semibold text-slate-900 mb-2">Fee Components</span>
                    <div className="space-y-2 border border-slate-200/80 rounded-xl p-3 bg-white">
                      {/* Tuition Fee */}
                      <label className="flex items-center justify-between py-1 px-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={tuitionChecked}
                            onChange={(e) => setTuitionChecked(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-slate-800">Tuition Fee</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {formatPaise(tuitionAmount)}
                        </span>
                      </label>

                      {/* Transport Fee */}
                      <label className="flex items-center justify-between py-1 px-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={transportChecked}
                            onChange={(e) => setTransportChecked(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-800">Transport Fee</span>
                            {selectedStudent?.has_transport && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded">Active</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {formatPaise(transportAmount)}
                        </span>
                      </label>

                      {/* Admission Fee */}
                      <label className="flex items-center justify-between py-1 px-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={admissionChecked}
                            onChange={(e) => setAdmissionChecked(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-slate-800">Admission Fee</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatPaise(admissionAmount)}
                        </span>
                      </label>

                      {/* Other Fees */}
                      <label className="flex items-center justify-between py-1 px-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={otherChecked}
                            onChange={(e) => setOtherChecked(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-slate-800">Other Fees</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatPaise(otherAmount)}
                        </span>
                      </label>
                    </div>

                    {/* Subtotal, Discount & Total Box */}
                    <div className="mt-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-800">{formatPaise(subtotalPaise)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Discount (if any)</span>
                        <span className="font-semibold text-emerald-700">- {formatPaise(discountPaise)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-900">Total Amount</span>
                        <span className="font-bold text-slate-900 text-base">{formatPaise(totalAmountPaise)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Additional Options Section */}
                <div className="space-y-3 pt-1">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
                    3. Additional Options
                  </label>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Apply Concession</label>
                    <select
                      value={selectedConcessionId}
                      onChange={(e) => setSelectedConcessionId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      {concessionsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Notes (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Add internal notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ──────── STEP 3: REVIEW BREAKDOWN ──────── */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Review Summary</span>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Please verify the fee breakdown and student information before generating this invoice.
                  </p>
                </div>

                {/* Student Info Card */}
                {selectedStudent && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Student Details</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                        {selectedStudent.first_name?.[0]}
                        {selectedStudent.last_name?.[0] || ""}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{selectedStudent.name}</div>
                        <div className="text-xs text-slate-500">
                          Adm No: <span className="font-medium text-slate-700">{selectedStudent.admission_no}</span> • Class {selectedStudent.class_name}-{selectedStudent.section_name}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fee Cycle & Due Date */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Billing Period</span>
                    <span className="font-bold text-slate-900">
                      {terms.find((t) => t.id === selectedTermId)?.name || "Apr 2026"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Payment Due Date</span>
                    <span className="font-bold text-rose-700">{dueDate}</span>
                  </div>
                </div>

                {/* Itemized Line Items */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    Itemized Components
                  </div>
                  <div className="divide-y divide-slate-100 text-xs p-2">
                    {tuitionChecked && (
                      <div className="flex items-center justify-between py-2 px-2">
                        <span className="text-slate-800">Tuition & Academic Fee</span>
                        <span className="font-semibold text-slate-900">{formatPaise(tuitionAmount)}</span>
                      </div>
                    )}
                    {transportChecked && (
                      <div className="flex items-center justify-between py-2 px-2">
                        <span className="text-slate-800">Transport & Bus Facility</span>
                        <span className="font-semibold text-slate-900">{formatPaise(transportAmount)}</span>
                      </div>
                    )}
                    {admissionChecked && admissionAmount > 0 && (
                      <div className="flex items-center justify-between py-2 px-2">
                        <span className="text-slate-800">Admission Fee</span>
                        <span className="font-semibold text-slate-900">{formatPaise(admissionAmount)}</span>
                      </div>
                    )}
                    {otherChecked && otherAmount > 0 && (
                      <div className="flex items-center justify-between py-2 px-2">
                        <span className="text-slate-800">Other Institutional Fees</span>
                        <span className="font-semibold text-slate-900">{formatPaise(otherAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-800">{formatPaise(subtotalPaise)}</span>
                    </div>
                    {discountPaise > 0 && (
                      <div className="flex items-center justify-between text-emerald-700">
                        <span>
                          Concession ({concessionsList.find((c) => c.id === selectedConcessionId)?.name || "Applied"})
                        </span>
                        <span className="font-semibold">- {formatPaise(discountPaise)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                      <span>Net Total Payable</span>
                      <span className="text-base text-emerald-800">{formatPaise(totalAmountPaise)}</span>
                    </div>
                  </div>
                </div>

                {notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    <span className="font-semibold text-slate-700 block mb-1">Internal Notes:</span>
                    <p className="italic">{notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ──────── STEP 4: GENERATION SUCCESS STATE ──────── */}
            {currentStep === 4 && createdInvoice && (
              <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">Invoice Generated!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Student invoice demand has been created and logged in the school fee ledger.
                  </p>
                </div>

                {/* Generated Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Invoice Number</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {createdInvoice.invoice_no}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Student</span>
                    <span className="font-bold text-slate-900">{createdInvoice.student_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Due Date</span>
                    <span className="font-semibold text-slate-800">{createdInvoice.due_date}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900">Amount Due</span>
                    <span className="font-bold text-emerald-800 text-base">{formatPaise(createdInvoice.total_paise)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handlePrint(createdInvoice)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print Invoice</span>
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp(createdInvoice)}
                    disabled={whatsappLoading || whatsappSent}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {whatsappLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : whatsappSent ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{whatsappSent ? "Sent to Parent" : "WhatsApp Notice"}</span>
                  </button>
                </div>

                {onViewInvoiceDetails && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewInvoiceDetails(createdInvoice.id);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline block mx-auto cursor-pointer"
                  >
                    View Complete Invoice Details & Ledger Entry →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. Drawer Footer Buttons */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
            {currentStep === 1 || currentStep === 2 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 cursor-pointer transition-colors shadow-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : currentStep === 3 ? (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateInvoice}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Invoice...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      <span>Confirm & Generate</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 cursor-pointer transition-colors shadow-xs"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
