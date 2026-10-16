import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Check,
  ChevronRight,
  ArrowRight,
  Printer,
  Download,
  Share2,
  Calendar,
  AlertCircle,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  CheckSquare,
  Sparkles,
  RefreshCw,
  FileCheck,
  User,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  searchStudentsForCounter,
  getStudentForCounter,
  collectFees,
  getTodayIST,
} from "../../../services/collectionService";
import {
  getStudentOutstandingInvoices,
  OutstandingInvoiceItem,
  getInitials,
} from "../../../services/feeCollectionsQueryService";
import { formatPaise } from "../../../lib/amountInWords";
import { generateReceiptHTML } from "../../../lib/receiptTemplate";
import { getClassesWithSections } from "../../../services/classSectionService";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";
import type { PaymentMode, CollectInput, FeeReceipt, FeeReceiptItem, FeePayment } from "../../../types/collection";

interface CollectFeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receiptNo: string) => void;
  initialStudentId?: string;
  academicYearId?: string;
}

interface StudentOption {
  id: string;
  name: string;
  admission_no: string;
  class_id?: string;
  class_name?: string;
  section_id?: string;
  section_name?: string;
  balance_paise?: number;
}

export function CollectFeeDrawer({
  isOpen,
  onClose,
  onSuccess,
  initialStudentId,
  academicYearId,
}: CollectFeeDrawerProps) {
  const { schoolId, user, profile, school } = useAuth();

  // Stepper state: 1: Student, 2: Invoices, 3: Payment, 4: Receipt
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Student Search & Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);

  // Class & Section Filters
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [availableSections, setAvailableSections] = useState<SchoolSection[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  // Outstanding Invoices
  const [invoices, setInvoices] = useState<OutstandingInvoiceItem[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Payment Form
  const [amountRupees, setAmountRupees] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>("upi");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>(getTodayIST());
  const [notes, setNotes] = useState("");

  // Submission & Confirmation state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedReceipt, setGeneratedReceipt] = useState<{
    receipt_no: string;
    receipt_id: string;
    total_paise: number;
    advance_paise: number;
    allocated_invoices: string[];
  } | null>(null);

  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  // Load Classes and Sections for the school/academic year
  useEffect(() => {
    if (!isOpen || !schoolId) return;
    let isMounted = true;
    setIsLoadingClasses(true);

    getClassesWithSections(schoolId, academicYearId)
      .then((res) => {
        if (!isMounted) return;
        setClassesList(res.classes || []);
      })
      .catch((err) => {
        console.warn("Failed to load classes in CollectFeeDrawer:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingClasses(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, schoolId, academicYearId]);

  // Handle Class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    if (classId === "all") {
      setAvailableSections([]);
      setSelectedSectionId("all");
    } else {
      const cls = classesList.find((c) => c.id === classId);
      const secs = cls?.sections || [];
      setAvailableSections(secs);
      setSelectedSectionId("all");
    }
  };

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      idempotencyKeyRef.current = crypto.randomUUID();
      setErrorMessage(null);
      setNotificationToast(null);

      if (initialStudentId && schoolId) {
        handleSelectStudentById(initialStudentId);
      }
    } else {
      // Clear on close
      setStep(1);
      setSelectedStudent(null);
      setSelectedClassId("all");
      setSelectedSectionId("all");
      setAvailableSections([]);
      setSearchQuery("");
      setSearchResults([]);
      setInvoices([]);
      setSelectedInvoiceIds(new Set());
      setAmountRupees("0");
      setReferenceNo("");
      setNotes("");
      setGeneratedReceipt(null);
      setIsReviewOpen(false);
    }
  }, [isOpen, initialStudentId, schoolId]);

  // Combined Debounced Student Search & Class/Section Filter
  useEffect(() => {
    if (!schoolId) {
      setSearchResults([]);
      return;
    }

    const hasQuery = searchQuery.trim().length > 0;
    const hasClass = selectedClassId !== "all";
    const hasSection = selectedSectionId !== "all";

    // If no query and no class/section filter selected, clear results
    if (!hasQuery && !hasClass && !hasSection) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStudentsForCounter(schoolId, searchQuery.trim(), {
          classId: selectedClassId,
          sectionId: selectedSectionId,
          academicYearId,
          limit: 50,
        });
        setSearchResults(
          results.map((r) => ({
            id: r.id,
            name: r.name,
            admission_no: r.admission_no,
            class_id: r.class_id,
            class_name: r.class_name ? `${r.class_name}${r.section_name ? ` - ${r.section_name}` : ""}` : "—",
            section_id: r.section_id,
            balance_paise: r.balance_paise,
          }))
        );
      } catch (err) {
        console.error("Search error in CollectFeeDrawer:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedClassId, selectedSectionId, schoolId, academicYearId]);

  // Select student handler
  const handleSelectStudent = async (student: StudentOption) => {
    setSelectedStudent(student);
    setSearchQuery("");
    setSearchResults([]);
    setStep(2); // move to invoices
    await loadInvoicesForStudent(student.id);
  };

  const handleSelectStudentById = async (studentId: string) => {
    if (!schoolId) return;
    try {
      const found = await getStudentForCounter(schoolId, studentId);
      if (found) {
        handleSelectStudent({
          id: found.id,
          name: found.name,
          admission_no: found.admission_no,
          class_name: found.class_name ? `${found.class_name}${found.section_name ? ` - ${found.section_name}` : ""}` : "—",
          balance_paise: found.balance_paise,
        });
      }
    } catch (e) {
      console.warn("Could not load initial student:", e);
    }
  };

  // Load Invoices
  const loadInvoicesForStudent = async (studentId: string) => {
    if (!schoolId) return;
    setInvoicesLoading(true);
    setErrorMessage(null);
    try {
      const invList = await getStudentOutstandingInvoices(schoolId, studentId, academicYearId);
      setInvoices(invList);

      if (invList.length > 0) {
        // Auto-select the first / oldest invoice
        const firstId = invList[0].id;
        const newSelected = new Set([firstId]);
        setSelectedInvoiceIds(newSelected);
        const autoAmt = (invList[0].balance_paise / 100).toFixed(0);
        setAmountRupees(autoAmt);
        setStep(3); // Invoices & Payment ready
      } else {
        setSelectedInvoiceIds(new Set());
        setAmountRupees("0");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load outstanding invoices.");
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Toggle invoice checkbox
  const toggleInvoice = (invoiceId: string) => {
    const nextSet = new Set(selectedInvoiceIds);
    if (nextSet.has(invoiceId)) {
      nextSet.delete(invoiceId);
    } else {
      nextSet.add(invoiceId);
    }
    setSelectedInvoiceIds(nextSet);

    // Recompute total amount based on selected invoices
    let totalPaise = 0;
    for (const inv of invoices) {
      if (nextSet.has(inv.id)) {
        totalPaise += inv.balance_paise;
      }
    }
    setAmountRupees((totalPaise / 100).toFixed(0));
  };

  // Parse amount in paise
  const enteredPaise = Math.round((parseFloat(amountRupees.replace(/,/g, "")) || 0) * 100);
  const selectedInvoicesTotalPaise = invoices
    .filter((inv) => selectedInvoiceIds.has(inv.id))
    .reduce((s, inv) => s + inv.balance_paise, 0);

  // Submit payment
  const handleSubmitPayment = async () => {
    if (!schoolId || !selectedStudent) return;
    if (enteredPaise <= 0) {
      setErrorMessage("Please enter a valid payment amount greater than zero.");
      return;
    }

    // Collect all due IDs from selected invoices
    const targetDueIds: string[] = [];
    invoices
      .filter((inv) => selectedInvoiceIds.has(inv.id))
      .forEach((inv) => targetDueIds.push(...inv.due_ids));

    setIsSubmitting(true);
    setErrorMessage(null);

    const targetAcademicYearId = (academicYearId && academicYearId !== "all")
      ? academicYearId
      : "";

    const collectInput: CollectInput = {
      student_id: selectedStudent.id,
      academic_year_id: targetAcademicYearId,
      receipt_date: paymentDate,
      selected_due_ids: targetDueIds.length > 0 ? targetDueIds : undefined,
      payments: [
        {
          mode: paymentMethod,
          amount_paise: enteredPaise,
          reference_no: referenceNo.trim() || undefined,
        },
      ],
      remarks: notes.trim() || undefined,
      source: paymentMethod === "online" ? "online" : "counter",
    };

    try {
      const result = await collectFees(
        schoolId,
        collectInput,
        idempotencyKeyRef.current,
        user?.id || profile?.id
      );

      setGeneratedReceipt({
        receipt_no: result.receipt_no,
        receipt_id: result.receipt_id,
        total_paise: result.total_paise,
        advance_paise: result.advance_paise,
        allocated_invoices: invoices
          .filter((inv) => selectedInvoiceIds.has(inv.id))
          .map((i) => i.invoice_number),
      });

      setIsReviewOpen(false);
      setStep(4); // Move to Step 4 (Receipt)
      onSuccess(result.receipt_no);
    } catch (err: any) {
      setErrorMessage(err.message || "Payment collection failed. Please verify amounts.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print Receipt handler
  const handlePrintReceipt = () => {
    if (!generatedReceipt || !selectedStudent) return;
    const dummyReceipt: FeeReceipt = {
      id: generatedReceipt.receipt_id,
      school_id: schoolId || "",
      receipt_no: generatedReceipt.receipt_no,
      student_id: selectedStudent.id,
      academic_year_id: academicYearId || "",
      receipt_date: paymentDate,
      total_paise: generatedReceipt.total_paise,
      status: "active",
      source: paymentMethod === "online" ? "online" : "counter",
      payment_group_id: null,
      collected_by: profile?.full_name || "School Office",
      remarks: notes || null,
      idempotency_key: idempotencyKeyRef.current,
      print_count: 1,
      whatsapp_sent_at: null,
      cancelled_by: null,
      cancelled_at: null,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const dummyItems: FeeReceiptItem[] = generatedReceipt.allocated_invoices.length > 0
      ? generatedReceipt.allocated_invoices.map((inv, idx) => ({
          id: `it-${idx}`,
          receipt_id: generatedReceipt.receipt_id,
          due_id: `due-${idx}`,
          fee_head_id: inv,
          amount_paise: Math.round(generatedReceipt.total_paise / generatedReceipt.allocated_invoices.length),
          concession_paise: 0,
        }))
      : [
          {
            id: "it-adv",
            receipt_id: generatedReceipt.receipt_id,
            due_id: "advance",
            fee_head_id: "Advance Fee Payment",
            amount_paise: generatedReceipt.total_paise,
            concession_paise: 0,
          },
        ];

    const dummyPayments: FeePayment[] = [
      {
        id: "pay-1",
        school_id: schoolId || "",
        receipt_id: generatedReceipt.receipt_id,
        mode: paymentMethod,
        amount_paise: generatedReceipt.total_paise,
        reference_no: referenceNo || null,
        bank_name: null,
        instrument_no: null,
        instrument_date: null,
        cheque_status: null,
        gateway_order_id: null,
        gateway_payment_id: null,
        created_at: new Date().toISOString(),
      },
    ];

    const html = generateReceiptHTML(
      dummyReceipt,
      dummyItems,
      dummyPayments,
      {
        student_name: selectedStudent.name,
        admission_no: selectedStudent.admission_no,
        class_name: selectedStudent.class_name,
        balance_remaining_paise: Math.max(0, selectedInvoicesTotalPaise - enteredPaise),
      },
      {
        name: school?.name || "School ERP",
        address: school?.address || "",
        phone: school?.contact_phone || "",
      },
      "a5"
    );

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 350);
    }
  };

  // Download PDF / HTML handler
  const handleDownloadReceipt = () => {
    if (!generatedReceipt || !selectedStudent) return;
    const blob = new Blob(
      [
        `Receipt No: ${generatedReceipt.receipt_no}\nStudent: ${selectedStudent.name} (${selectedStudent.admission_no})\nAmount: ${formatPaise(
          generatedReceipt.total_paise
        )}\nMethod: ${paymentMethod.toUpperCase()}\nDate: ${paymentDate}\nStatus: RECEIVED\nSchool: ${
          school?.name || "Sunrise International School"
        }`,
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt_${generatedReceipt.receipt_no}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Send to parent simulation
  const handleSendToParent = () => {
    setNotificationToast(
      `Receipt ${generatedReceipt?.receipt_no} sent via WhatsApp to parent's registered mobile!`
    );
    setTimeout(() => setNotificationToast(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E6EAF3] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#141A2E]">Collect Fee</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Indicator */}
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

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {notificationToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{notificationToast}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 4: RECEIPT CONFIRMATION VIEW */}
            {step === 4 && generatedReceipt && (
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
                    <span className="font-bold text-[#0B7B49]">{generatedReceipt.receipt_no}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
                    <span className="text-gray-500">Student</span>
                    <span className="font-semibold text-[#141A2E]">{selectedStudent?.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
                    <span className="text-gray-500">Admission No.</span>
                    <span className="text-gray-700">{selectedStudent?.admission_no}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
                    <span className="text-gray-500">Payment Method</span>
                    <span className="font-semibold uppercase text-gray-800">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between items-center text-base pt-1">
                    <span className="font-bold text-gray-800">Total Received</span>
                    <span className="font-extrabold text-xl text-[#0B7B49]">
                      {formatPaise(generatedReceipt.total_paise)}
                    </span>
                  </div>
                </div>

                {/* Receipt Actions */}
                <div className="w-full grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#E6EAF3] text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
                  >
                    <Printer className="w-4 h-4 text-gray-500" />
                    <span>Print Receipt</span>
                  </button>

                  <button
                    onClick={handleDownloadReceipt}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#E6EAF3] text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-gray-500" />
                    <span>Download</span>
                  </button>
                </div>

                <button
                  onClick={handleSendToParent}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-[#0B7B49] font-semibold rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send to Parent via WhatsApp</span>
                </button>

                <div className="w-full flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setStep(1);
                      setSelectedStudent(null);
                      setInvoices([]);
                      setGeneratedReceipt(null);
                      idempotencyKeyRef.current = crypto.randomUUID();
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Collect Another
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-[#0B7B49] text-white text-sm font-semibold hover:bg-[#09663c]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* STEPS 1-3 WORKFLOW */}
            {step < 4 && (
              <>
                {/* 1. SEARCH & FILTERS / SELECTED STUDENT */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#141A2E] uppercase tracking-wider block">
                      Select Student
                    </label>
                    {!selectedStudent && (searchQuery.trim().length > 0 || selectedClassId !== "all" || selectedSectionId !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedClassId("all");
                          setSelectedSectionId("all");
                          setAvailableSections([]);
                          setSearchResults([]);
                        }}
                        className="text-[11px] font-semibold text-[#0B7B49] hover:underline cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {!selectedStudent ? (
                    <div className="space-y-3">
                      {/* Search Input (Full width) */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by student name or admission no..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49] transition-all"
                          autoFocus
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Class and Section Dropdowns (2 columns) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Class Dropdown */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                            Select Class
                          </label>
                          <select
                            value={selectedClassId}
                            onChange={(e) => handleClassChange(e.target.value)}
                            disabled={isLoadingClasses}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49] transition-all"
                          >
                            <option value="all">All Classes</option>
                            {classesList.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Section Dropdown */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                            Select Section
                          </label>
                          <select
                            value={selectedSectionId}
                            onChange={(e) => setSelectedSectionId(e.target.value)}
                            disabled={selectedClassId === "all" || availableSections.length === 0}
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

                      {/* Matching Students List or Empty State */}
                      <div className="pt-1">
                        {isSearching ? (
                          <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2 bg-gray-50/50 rounded-xl border border-gray-100">
                            <RefreshCw className="w-4 h-4 animate-spin text-[#0B7B49]" />
                            <span>Loading matching students...</span>
                          </div>
                        ) : searchResults.length > 0 ? (
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
                                  onClick={() => handleSelectStudent(std)}
                                  className="w-full p-3 text-left bg-white hover:bg-emerald-50/40 border border-[#E6EAF3] hover:border-emerald-300 rounded-xl flex items-center justify-between transition-all group shadow-2xs hover:shadow-xs cursor-pointer"
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
                        ) : searchQuery.trim().length > 0 || selectedClassId !== "all" || selectedSectionId !== "all" ? (
                          <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4">
                            <User className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                            <p className="text-xs font-semibold text-gray-700">No students found</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              No active students match the selected class, section, or search term.
                            </p>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-gray-400 text-xs bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-4">
                            <p className="font-medium text-gray-500">Search or filter students</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Enter a name or admission number, or pick a class and section to browse students.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Selected Student Card (Matches Reference Image) */
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
                        onClick={() => {
                          setSelectedStudent(null);
                          setInvoices([]);
                          setSelectedInvoiceIds(new Set());
                          setAmountRupees("0");
                          setStep(1);
                        }}
                        className="text-xs font-semibold text-[#0B7B49] hover:underline px-2 py-1 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. OUTSTANDING INVOICES SECTION */}
                {selectedStudent && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#141A2E] uppercase tracking-wider block">
                        Outstanding Invoices
                      </label>
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
                      /* Invoices Table (Matches Reference Image) */
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
                                  onClick={() => toggleInvoice(inv.id)}
                                  className={`cursor-pointer transition-colors ${
                                    isChecked ? "bg-emerald-50/40" : "hover:bg-gray-50"
                                  }`}
                                >
                                  <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleInvoice(inv.id)}
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
                )}

                {/* 3. PAYMENT DETAILS FORM */}
                {selectedStudent && (
                  <div className="space-y-4 pt-2 border-t border-[#E6EAF3]">
                    <h3 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider block">
                      Payment Details
                    </h3>

                    {/* Amount & Method */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                            ₹
                          </span>
                          <input
                            type="text"
                            value={amountRupees}
                            onChange={(e) => setAmountRupees(e.target.value.replace(/[^0-9.]/g, ""))}
                            placeholder="0"
                            className="w-full pl-8 pr-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm font-bold text-[#141A2E] focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Payment Method <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMode)}
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
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Reference No. <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          placeholder="Transaction ID / Cheque No. / UTR"
                          className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Notes <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes..."
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-sm text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49] resize-none"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Drawer Footer */}
          {step < 4 && (
            <div className="p-5 border-t border-[#E6EAF3] bg-white flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 font-medium">Total Amount</p>
                <p className="text-2xl font-black text-[#0B7B49]">
                  ₹{Number(amountRupees || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!selectedStudent || enteredPaise <= 0 || isSubmitting}
                  onClick={() => setIsReviewOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#0B7B49] text-white text-sm font-bold hover:bg-[#09663c] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next: Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* REVIEW CONFIRMATION MODAL */}
          {isReviewOpen && (
            <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-base font-bold text-[#141A2E]">Confirm Fee Collection</h3>
                  <button onClick={() => setIsReviewOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs text-gray-600">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Student:</span>
                    <span className="font-bold text-gray-800">{selectedStudent?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Admission No:</span>
                    <span className="font-medium text-gray-700">{selectedStudent?.admission_no}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Payment Method:</span>
                    <span className="font-bold uppercase text-gray-800">{paymentMethod}</span>
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
                    <span className="text-[#0B7B49] text-base">₹{Number(amountRupees || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsReviewOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitPayment}
                    className="flex-1 py-2.5 rounded-xl bg-[#0B7B49] text-white text-sm font-bold hover:bg-[#09663c] disabled:opacity-50 flex items-center justify-center gap-2"
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
          )}
        </div>
      </div>
    </div>
  );
}
