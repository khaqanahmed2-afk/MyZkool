import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import {
  generateReceiptHTML,
  printReceiptA4,
  downloadReceiptPDF,
  ReceiptLineItemBreakdown,
} from "../../../lib/receiptTemplate";
import { getClassesWithSections } from "../../../services/classSectionService";
import { getFeeSettings } from "../../../services/feeSetupService";
import type { FeeSettings } from "../../../types/fees";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";
import type {
  PaymentMode,
  CollectInput,
  FeeReceipt,
  FeeReceiptItem,
  FeePayment,
} from "../../../types/collection";
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

  // Student Search & Selection (Step 1)
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

  // Outstanding Invoices (Step 2)
  const [invoices, setInvoices] = useState<OutstandingInvoiceItem[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceLoadError, setInvoiceLoadError] = useState<string | null>(null);
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);

  // Payment Form (Step 3)
  const [amountRupees, setAmountRupees] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>("upi");
  const [referenceNo, setReferenceNo] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeDate, setChequeDate] = useState<string>(() => getTodayIST());
  const [branchName, setBranchName] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>(() => getTodayIST());
  const [notes, setNotes] = useState("");

  // Submission & Confirmation state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feeSettings, setFeeSettings] = useState<FeeSettings | null>(null);
  const [generatedReceipt, setGeneratedReceipt] = useState<{
    receipt_no: string;
    receipt_id: string;
    total_paise: number;
    advance_paise: number;
    allocated_invoices: string[];
    allocationLines?: any[];
  } | null>(null);

  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  // Load fee settings for school
  useEffect(() => {
    if (!schoolId) return;
    getFeeSettings(schoolId)
      .then((res) => {
        if (res?.settings) setFeeSettings(res.settings);
      })
      .catch((e) => console.warn("Failed to load fee settings in useCollectFeeDrawer:", e));
  }, [schoolId]);

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

  // Load Invoices for a selected student
  const loadInvoicesForStudent = useCallback(
    async (studentId: string) => {
      if (!schoolId) return;
      setInvoicesLoading(true);
      setInvoiceLoadError(null);
      setErrorMessage(null);
      try {
        const cleanYear = academicYearId && academicYearId !== "all" && academicYearId !== "" ? academicYearId : undefined;
        const invList = await getStudentOutstandingInvoices(schoolId, studentId, cleanYear);
        setInvoices(invList);
        setInvoiceLoadError(null);

        if (invList.length > 0) {
          // Select all outstanding invoices by default for a complete collection
          const allIds = new Set(invList.map((inv) => inv.id));
          setSelectedInvoiceIds(allIds);
          const totalPaise = invList.reduce((acc, curr) => acc + curr.balance_paise, 0);
          setAmountRupees((totalPaise / 100).toFixed(0));
          setIsAdvancePayment(false);
        } else {
          // Student genuinely has 0 outstanding invoices
          setSelectedInvoiceIds(new Set());
          setAmountRupees("0");
          setIsAdvancePayment(false); // DO NOT auto-select advance payment!
        }
      } catch (err: any) {
        const msg = err.message || "Failed to load outstanding invoices.";
        setInvoiceLoadError(msg);
        setErrorMessage(msg);
      } finally {
        setInvoicesLoading(false);
      }
    },
    [schoolId, academicYearId]
  );

  const handleRetryLoadInvoices = useCallback(() => {
    if (selectedStudent) {
      loadInvoicesForStudent(selectedStudent.id);
    }
  }, [selectedStudent, loadInvoicesForStudent]);

  // Select student handler (Step 1 -> Step 2)
  const handleSelectStudent = useCallback(
    async (student: StudentOption) => {
      setSelectedStudent(student);
      setSearchQuery("");
      setSearchResults([]);
      setErrorMessage(null);
      setStep(2); // Progress to Step 2: Select Invoices
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
            guardian_name: found.guardian_name,
            guardian_phone: found.guardian_phone,
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
            guardian_name: (r as any).guardian_name,
            guardian_phone: (r as any).guardian_phone,
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

  // Toggle invoice checkbox in Step 2
  const toggleInvoice = (invoiceId: string) => {
    setIsAdvancePayment(false);
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

  const selectAllInvoices = () => {
    setIsAdvancePayment(false);
    const allIds = new Set(invoices.map((i) => i.id));
    setSelectedInvoiceIds(allIds);
    const totalPaise = invoices.reduce((acc, curr) => acc + curr.balance_paise, 0);
    setAmountRupees((totalPaise / 100).toFixed(0));
  };

  const deselectAllInvoices = () => {
    setSelectedInvoiceIds(new Set());
    setAmountRupees("0");
  };

  const handleToggleAdvancePayment = (val: boolean) => {
    setIsAdvancePayment(val);
    if (val) {
      setSelectedInvoiceIds(new Set());
      setAmountRupees("");
    } else {
      setAmountRupees("0");
    }
  };

  const enteredPaise = Math.round((parseFloat(amountRupees.replace(/,/g, "")) || 0) * 100);
  const selectedInvoicesTotalPaise = invoices
    .filter((inv) => selectedInvoiceIds.has(inv.id))
    .reduce((s, inv) => s + inv.balance_paise, 0);

  // Sequential allocation of payment to selected invoices
  const invoiceAllocations = useMemo(() => {
    let remainingPayment = enteredPaise;
    const lines = invoices
      .filter((inv) => selectedInvoiceIds.has(inv.id))
      .map((inv) => {
        const allocated = Math.min(remainingPayment, inv.balance_paise);
        remainingPayment -= allocated;
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          billing_period: inv.billing_period,
          due_date: inv.due_date,
          balance_before_paise: inv.balance_paise,
          allocated_paise: allocated,
          balance_after_paise: Math.max(0, inv.balance_paise - allocated),
        };
      });

    const advancePaise = Math.max(0, remainingPayment);
    return { lines, advancePaise };
  }, [invoices, selectedInvoiceIds, enteredPaise]);

  // Step transitions
  const handleProceedToInvoices = () => {
    if (!selectedStudent) {
      setErrorMessage("Please select a student first.");
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const handleProceedToPayment = () => {
    if (!selectedStudent) {
      setErrorMessage("Please select a student first.");
      return;
    }
    if (selectedInvoiceIds.size === 0 && !isAdvancePayment) {
      setErrorMessage("Please select at least one invoice to pay, or opt for advance payment.");
      return;
    }
    if (enteredPaise <= 0) {
      setErrorMessage("Please enter an amount greater than zero.");
      return;
    }
    setErrorMessage(null);
    setStep(3); // Progress to Step 3: Payment Details
  };

  const handleBackToStudent = () => {
    setErrorMessage(null);
    setStep(1);
  };

  const handleBackToInvoices = () => {
    setErrorMessage(null);
    setStep(2);
  };

  const handleChangeStudent = () => {
    setSelectedStudent(null);
    setInvoices([]);
    setSelectedInvoiceIds(new Set());
    setAmountRupees("0");
    setErrorMessage(null);
    setStep(1);
  };

  const goToStep = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep === 1) {
      setErrorMessage(null);
      setStep(1);
    } else if (targetStep === 2) {
      if (!selectedStudent) {
        setErrorMessage("Please select a student first.");
        return;
      }
      setErrorMessage(null);
      setStep(2);
    } else if (targetStep === 3) {
      if (!selectedStudent) {
        setErrorMessage("Please select a student first.");
        return;
      }
      if (selectedInvoiceIds.size === 0 && !isAdvancePayment) {
        setErrorMessage("Please select at least one invoice to pay, or opt for advance payment.");
        return;
      }
      if (enteredPaise <= 0) {
        setErrorMessage("Please enter an amount greater than zero.");
        return;
      }
      setErrorMessage(null);
      setStep(3);
    } else if (targetStep === 4) {
      if (generatedReceipt) {
        setErrorMessage(null);
        setStep(4);
      }
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedClassId("all");
    setSelectedSectionId("all");
    setAvailableSections([]);
    setSearchResults([]);
  };

  // Submit payment (Step 3 -> Step 4)
  const handleSubmitPayment = async () => {
    if (!schoolId || !selectedStudent) return;
    if (enteredPaise <= 0) {
      setErrorMessage("Please enter a valid payment amount greater than zero.");
      return;
    }

    if (paymentMethod === "cheque") {
      if (!chequeNo.trim()) {
        setErrorMessage("Cheque number is required for Cheque payments.");
        return;
      }
      if (!bankName.trim()) {
        setErrorMessage("Bank name is required for Cheque payments.");
        return;
      }
    }

    const targetDueIds: string[] = [];
    invoices
      .filter((inv) => selectedInvoiceIds.has(inv.id))
      .forEach((inv) => targetDueIds.push(...inv.due_ids));

    setIsSubmitting(true);
    setErrorMessage(null);

    const targetAcademicYearId =
      academicYearId && academicYearId !== "all" ? academicYearId : "";

    const paymentLine: any = {
      mode: paymentMethod,
      amount_paise: enteredPaise,
      reference_no: referenceNo.trim() || (paymentMethod === "cheque" ? chequeNo.trim() : undefined),
    };

    if (paymentMethod === "cheque") {
      paymentLine.instrument_no = chequeNo.trim();
      paymentLine.bank_name = bankName.trim();
      paymentLine.instrument_date = chequeDate;
    } else if (paymentMethod === "bank_transfer" && bankName.trim()) {
      paymentLine.bank_name = bankName.trim();
    }

    const formattedRemarks = [
      notes.trim(),
      branchName.trim() ? `Branch: ${branchName.trim()}` : "",
      paymentMethod === "cheque" && chequeNo.trim() ? `Chq: ${chequeNo.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const collectInput: CollectInput = {
      student_id: selectedStudent.id,
      academic_year_id: targetAcademicYearId,
      receipt_date: paymentDate,
      selected_due_ids: targetDueIds.length > 0 ? targetDueIds : undefined,
      payments: [paymentLine],
      remarks: formattedRemarks || undefined,
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
        allocationLines: result.lines,
      });

      setIsReviewOpen(false);
      setStep(4); // Successfully moved to Step 4: Receipt Confirmation
      onSuccess(result.receipt_no);
    } catch (err: any) {
      setErrorMessage(err.message || "Payment collection failed. Please verify amounts.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to build receipt HTML for A4
  const buildCurrentReceiptHTML = () => {
    if (!generatedReceipt || !selectedStudent) return "";
    const receipt: FeeReceipt = {
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
      collected_by: profile?.full_name || "Accounts Office",
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

    const feeHeadItems: FeeReceiptItem[] = [];
    const breakdownList: ReceiptLineItemBreakdown[] = [];
    const selectedInvoices = invoices.filter((inv) => selectedInvoiceIds.has(inv.id));
    let invSeq = 0;

    for (const inv of selectedInvoices) {
      if (inv.items && inv.items.length > 0) {
        for (const item of inv.items) {
          invSeq++;
          const allocLine = generatedReceipt.allocationLines?.find(
            (l: any) => l.due_id === item.due_id || l.fee_head_id === item.fee_head_id
          );
          const gross = item.gross_paise ?? item.amount_paise ?? 0;
          const concession = item.concession_paise ?? 0;
          const net = item.net_paise ?? Math.max(0, gross - concession);
          const paid = allocLine
            ? allocLine.allocated_paise
            : Math.min(net, item.amount_paise);
          const outstanding = allocLine
            ? allocLine.balance_after
            : Math.max(0, net - paid);

          const feeItem: FeeReceiptItem = {
            id: `it-${invSeq}`,
            receipt_id: generatedReceipt.receipt_id,
            due_id: item.due_id || `due-${invSeq}`,
            fee_head_id: item.name,
            fee_head_name: item.name,
            gross_paise: gross,
            concession_paise: concession,
            net_paise: net,
            amount_paise: paid,
            outstanding_paise: outstanding,
            balance_paise: outstanding,
            invoice_no: inv.invoice_number,
          };
          feeHeadItems.push(feeItem);

          breakdownList.push({
            fee_particulars: item.name,
            gross_paise: gross,
            concession_paise: concession,
            net_paise: net,
            amount_paid_paise: paid,
            outstanding_paise: outstanding,
            invoice_no: inv.invoice_number,
          });
        }
      } else {
        invSeq++;
        const invAlloc = invoiceAllocations.lines.find((l) => l.id === inv.id);
        const gross = (inv as any).gross_paise || inv.total_paise;
        const net = inv.total_paise;
        const paid = invAlloc ? invAlloc.allocated_paise : 0;
        const outstanding = invAlloc ? invAlloc.balance_after_paise : Math.max(0, net - paid);

        const feeItem: FeeReceiptItem = {
          id: `it-${invSeq}`,
          receipt_id: generatedReceipt.receipt_id,
          due_id: inv.id,
          fee_head_id: inv.particulars?.[0] || inv.invoice_number,
          fee_head_name: inv.particulars?.[0] || inv.invoice_number,
          gross_paise: gross,
          concession_paise: 0,
          net_paise: net,
          amount_paise: paid,
          outstanding_paise: outstanding,
          balance_paise: outstanding,
          invoice_no: inv.invoice_number,
        };
        feeHeadItems.push(feeItem);

        breakdownList.push({
          fee_particulars: inv.particulars?.[0] || inv.invoice_number,
          gross_paise: gross,
          concession_paise: 0,
          net_paise: net,
          amount_paid_paise: paid,
          outstanding_paise: outstanding,
          invoice_no: inv.invoice_number,
        });
      }
    }

    if (feeHeadItems.length === 0) {
      feeHeadItems.push({
        id: "it-adv",
        receipt_id: generatedReceipt.receipt_id,
        due_id: "advance",
        fee_head_id: "Advance Fee Payment",
        fee_head_name: "Advance Fee Payment",
        gross_paise: generatedReceipt.total_paise,
        concession_paise: 0,
        net_paise: generatedReceipt.total_paise,
        amount_paise: generatedReceipt.total_paise,
        outstanding_paise: 0,
        balance_paise: 0,
      });
      breakdownList.push({
        fee_particulars: "Advance Fee Payment",
        gross_paise: generatedReceipt.total_paise,
        concession_paise: 0,
        net_paise: generatedReceipt.total_paise,
        amount_paid_paise: generatedReceipt.total_paise,
        outstanding_paise: 0,
      });
    }

    const payments: FeePayment[] = [
      {
        id: "pay-1",
        school_id: schoolId || "",
        receipt_id: generatedReceipt.receipt_id,
        mode: paymentMethod,
        amount_paise: generatedReceipt.total_paise,
        reference_no: referenceNo || null,
        bank_name: bankName || null,
        instrument_no: chequeNo || null,
        instrument_date: chequeDate || null,
        cheque_status: paymentMethod === "cheque" ? "received" : null,
        gateway_order_id: null,
        gateway_payment_id: null,
        created_at: new Date().toISOString(),
      },
    ];

    const remainingBal = Math.max(0, selectedInvoicesTotalPaise - enteredPaise);

    return generateReceiptHTML(
      receipt,
      feeHeadItems,
      payments,
      {
        student_name: selectedStudent.name,
        admission_no: selectedStudent.admission_no,
        class_name: selectedStudent.class_name,
        balance_remaining_paise: remainingBal,
        previous_balance_paise: 0,
      },
      {
        name: school?.name || feeSettings?.receipt_header_title || "MyZkool Academy",
        address: school?.address || "",
        phone: school?.contact_phone || "",
        logo_url: feeSettings?.logo_url || school?.logo_url,
        signature_url: feeSettings?.signature_url,
        signatory_name: feeSettings?.signatory_name,
        signatory_designation: feeSettings?.signatory_designation,
        terms: feeSettings?.receipt_terms,
        footer: feeSettings?.receipt_footer,
        refund_policy_note: feeSettings?.refund_policy_note,
        theme: feeSettings?.receipt_theme,
      },
      (feeSettings?.receipt_paper || "a4") as any,
      false,
      feeSettings,
      {
        lineItemsBreakdown: breakdownList,
        totalInvoicePaise: selectedInvoicesTotalPaise,
        invoiceNo: selectedInvoices.map((i) => i.invoice_number).join(", "),
      }
    );
  };

  // Print Receipt handler (A4)
  const handlePrintReceipt = () => {
    const html = buildCurrentReceiptHTML();
    if (html) {
      printReceiptA4(html);
    }
  };

  // Download Receipt handler (A4 PDF)
  const handleDownloadReceipt = () => {
    if (!generatedReceipt) return;
    const html = buildCurrentReceiptHTML();
    if (html) {
      downloadReceiptPDF(generatedReceipt.receipt_no, html);
    }
  };

  const handleSendToParent = () => {
    setNotificationToast(
      `Receipt #${generatedReceipt?.receipt_no} sent via WhatsApp to parent's registered mobile!`
    );
    setTimeout(() => setNotificationToast(null), 4000);
  };

  const handleCollectAnother = () => {
    setStep(1);
    setSelectedStudent(null);
    setInvoices([]);
    setSelectedInvoiceIds(new Set());
    setAmountRupees("0");
    setReferenceNo("");
    setChequeNo("");
    setBankName("");
    setBranchName("");
    setNotes("");
    setGeneratedReceipt(null);
    setErrorMessage(null);
    idempotencyKeyRef.current = crypto.randomUUID();
  };

  return {
    step,
    setStep,
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
    goToStep,
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
  };
}
