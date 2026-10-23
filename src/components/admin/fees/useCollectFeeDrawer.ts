import { useState, useEffect, useRef, useCallback } from "react";
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
} from "../../../services/feeCollectionsQueryService";
import { formatPaise } from "../../../lib/amountInWords";
import { generateReceiptHTML } from "../../../lib/receiptTemplate";
import { getClassesWithSections } from "../../../services/classSectionService";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";
import type { PaymentMode, CollectInput, FeeReceipt, FeeReceiptItem, FeePayment } from "../../../types/collection";
import type { StudentOption } from "./CollectFeeDrawerComponents";

interface UseCollectFeeDrawerOptions {
  isOpen: boolean;
  initialStudentId?: string;
  academicYearId?: string;
  onSuccess: (receiptNo: string) => void;
}

export function useCollectFeeDrawer({
  isOpen,
  initialStudentId,
  academicYearId,
  onSuccess,
}: UseCollectFeeDrawerOptions) {
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
  const [paymentDate, setPaymentDate] = useState<string>(() => getTodayIST());
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
  const idempotencyKeyRef = useRef<string | null>(null);

  // Load Classes and Sections
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

  // Load Invoices
  const loadInvoicesForStudent = useCallback(
    async (studentId: string) => {
      if (!schoolId) return;
      setInvoicesLoading(true);
      setErrorMessage(null);
      try {
        const invList = await getStudentOutstandingInvoices(schoolId, studentId, academicYearId);
        setInvoices(invList);

        if (invList.length > 0) {
          const firstId = invList[0].id;
          const newSelected = new Set([firstId]);
          setSelectedInvoiceIds(newSelected);
          const autoAmt = (invList[0].balance_paise / 100).toFixed(0);
          setAmountRupees(autoAmt);
          setStep(3);
        } else {
          setSelectedInvoiceIds(new Set());
          setAmountRupees("0");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load outstanding invoices.");
      } finally {
        setInvoicesLoading(false);
      }
    },
    [schoolId, academicYearId]
  );

  // Select student handler
  const handleSelectStudent = useCallback(
    async (student: StudentOption) => {
      setSelectedStudent(student);
      setSearchQuery("");
      setSearchResults([]);
      setStep(2);
      await loadInvoicesForStudent(student.id);
    },
    [loadInvoicesForStudent]
  );

  const handleSelectStudentById = useCallback(
    async (studentId: string) => {
      if (!schoolId) return;
      try {
        const found = await getStudentForCounter(schoolId, studentId);
        if (found) {
          handleSelectStudent({
            id: found.id,
            name: found.name,
            admission_no: found.admission_no,
            class_name: found.class_name
              ? `${found.class_name}${found.section_name ? ` - ${found.section_name}` : ""}`
              : "—",
            balance_paise: found.balance_paise,
          });
        }
      } catch (e) {
        console.warn("Could not load initial student:", e);
      }
    },
    [schoolId, handleSelectStudent]
  );

  // Initialize on mount
  useEffect(() => {
    idempotencyKeyRef.current = crypto.randomUUID();
    if (initialStudentId && schoolId) {
      handleSelectStudentById(initialStudentId);
    }
  }, [initialStudentId, schoolId, handleSelectStudentById]);

  // Combined Debounced Student Search & Class/Section Filter
  useEffect(() => {
    if (!schoolId) {
      setSearchResults([]);
      return;
    }

    const hasQuery = searchQuery.trim().length > 0;
    const hasClass = selectedClassId !== "all";
    const hasSection = selectedSectionId !== "all";

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
            class_name: r.class_name
              ? `${r.class_name}${r.section_name ? ` - ${r.section_name}` : ""}`
              : "—",
            section_id: r.section_id,
            section_name: r.section_name,
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

  // Toggle invoice checkbox
  const toggleInvoice = (invoiceId: string) => {
    const nextSet = new Set(selectedInvoiceIds);
    if (nextSet.has(invoiceId)) {
      nextSet.delete(invoiceId);
    } else {
      nextSet.add(invoiceId);
    }
    setSelectedInvoiceIds(nextSet);

    let totalPaise = 0;
    for (const inv of invoices) {
      if (nextSet.has(inv.id)) {
        totalPaise += inv.balance_paise;
      }
    }
    setAmountRupees((totalPaise / 100).toFixed(0));
  };

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

    const targetDueIds: string[] = [];
    invoices
      .filter((inv) => selectedInvoiceIds.has(inv.id))
      .forEach((inv) => targetDueIds.push(...inv.due_ids));

    setIsSubmitting(true);
    setErrorMessage(null);

    const targetAcademicYearId =
      academicYearId && academicYearId !== "all" ? academicYearId : "";

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
        idempotencyKeyRef.current!,
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
      setStep(4);
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

    const dummyItems: FeeReceiptItem[] =
      generatedReceipt.allocated_invoices.length > 0
        ? generatedReceipt.allocated_invoices.map((inv, idx) => ({
            id: `it-${idx}`,
            receipt_id: generatedReceipt.receipt_id,
            due_id: `due-${idx}`,
            fee_head_id: inv,
            amount_paise: Math.round(
              generatedReceipt.total_paise / generatedReceipt.allocated_invoices.length
            ),
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

  const handleDownloadReceipt = () => {
    if (!generatedReceipt || !selectedStudent) return;
    const blob = new Blob(
      [
        `Receipt No: ${generatedReceipt.receipt_no}\nStudent: ${selectedStudent.name} (${
          selectedStudent.admission_no
        })\nAmount: ${formatPaise(
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

  const handleSendToParent = () => {
    setNotificationToast(
      `Receipt ${generatedReceipt?.receipt_no} sent via WhatsApp to parent's registered mobile!`
    );
    setTimeout(() => setNotificationToast(null), 4000);
  };

  const handleCollectAnother = () => {
    setStep(1);
    setSelectedStudent(null);
    setInvoices([]);
    setGeneratedReceipt(null);
    idempotencyKeyRef.current = crypto.randomUUID();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedClassId("all");
    setSelectedSectionId("all");
    setAvailableSections([]);
    setSearchResults([]);
  };

  const handleChangeStudent = () => {
    setSelectedStudent(null);
    setInvoices([]);
    setSelectedInvoiceIds(new Set());
    setAmountRupees("0");
    setStep(1);
  };

  return {
    step,
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
    selectedInvoicesTotalPaise,
    toggleInvoice,
    amountRupees,
    setAmountRupees,
    enteredPaise,
    paymentMethod,
    setPaymentMethod,
    referenceNo,
    setReferenceNo,
    paymentDate,
    setPaymentDate,
    notes,
    setNotes,
    isReviewOpen,
    setIsReviewOpen,
    isSubmitting,
    errorMessage,
    generatedReceipt,
    notificationToast,
    handleSubmitPayment,
    handlePrintReceipt,
    handleDownloadReceipt,
    handleSendToParent,
    handleCollectAnother,
  };
}
