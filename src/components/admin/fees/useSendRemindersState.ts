import { useState, useMemo } from "react";
import type {
  DuesReminderRow,
  ReminderTemplate,
  SendRemindersPayload,
  SendRemindersResult,
} from "../../../types/duesReminders";
import { interpolateTemplate, sendBulkReminders } from "../../../services/duesRemindersService";

export interface UseSendRemindersStateProps {
  rows: DuesReminderRow[];
  templates: ReminderTemplate[];
  schoolId: string;
  schoolName: string;
  preSelectedRowIds?: string[];
  onSuccess: (result: SendRemindersResult) => void;
  onClose: () => void;
  onOpenTemplates: () => void;
}

function filterStudentRow(
  r: DuesReminderRow,
  dueStatus: string,
  className: string,
  sectionName: string,
  period: string,
  overdueSince: string
): boolean {
  if (r.balancePaise <= 0 || r.status === "paid") return false;

  if (dueStatus !== "all" && r.status !== dueStatus) {
    if (dueStatus === "due_soon" && r.status === "due_soon") {
      // match
    } else {
      return false;
    }
  }

  if (className !== "all" && r.className !== className) return false;
  if (sectionName !== "all" && r.sectionName !== sectionName) return false;
  if (period !== "all" && r.billingPeriod !== period) return false;

  if (overdueSince !== "all") {
    const minDays = Number(overdueSince);
    if (!Number.isNaN(minDays) && r.daysOverdue < minDays) return false;
  }

  return true;
}

function searchStudentRow(r: DuesReminderRow, query: string): boolean {
  if (r.balancePaise <= 0) return false;
  if (!query) return true;
  return (
    r.studentName.toLowerCase().includes(query) ||
    r.admissionNo.toLowerCase().includes(query) ||
    r.invoiceNo.toLowerCase().includes(query) ||
    r.parentPhone.includes(query)
  );
}

const EMPTY_TEMPLATES: ReminderTemplate[] = [];
const EMPTY_ROW_IDS: string[] = [];

export function useSendRemindersState({
  rows,
  templates = EMPTY_TEMPLATES,
  schoolId,
  schoolName,
  preSelectedRowIds = EMPTY_ROW_IDS,
  onSuccess,
  onClose,
  onOpenTemplates,
}: UseSendRemindersStateProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Selection Mode
  const [selectionMode, setSelectionMode] = useState<"filter" | "manual">(() =>
    preSelectedRowIds && preSelectedRowIds.length > 0 ? "manual" : "filter"
  );
  const [filterDueStatus, setFilterDueStatus] = useState<string>("overdue");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterOverdueSince, setFilterOverdueSince] = useState<string>("all");
  const [manualSearch, setManualSearch] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(preSelectedRowIds || [])
  );
  const [showFilterListModal, setShowFilterListModal] = useState<boolean>(false);

  // Step 2: Message Settings
  const defaultTpl = useMemo(() => {
    if (!templates || templates.length === 0) return null;
    return templates.find((t) => t.name?.toLowerCase().includes("default")) || templates[0];
  }, [templates]);

  const [userSelectedTemplateId, setUserSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplateId = userSelectedTemplateId || defaultTpl?.id || defaultTpl?.name || "default_reminder_template";

  const activeTemplate = useMemo(() => {
    return templates.find((t) => (t.id || t.name) === selectedTemplateId) || defaultTpl || templates[0];
  }, [templates, selectedTemplateId, defaultTpl]);

  const [customBody, setCustomBody] = useState<string | null>(null);
  const editedBody = customBody !== null ? customBody : (activeTemplate?.body || "");

  const setEditedBody = (valOrUpdater: string | ((prev: string) => string)) => {
    if (typeof valOrUpdater === "function") {
      setCustomBody(valOrUpdater(editedBody));
    } else {
      setCustomBody(valOrUpdater);
    }
  };

  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [channelWhatsApp, setChannelWhatsApp] = useState<boolean>(true);
  const [channelSMS, setChannelSMS] = useState<boolean>(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState<string>("10:00");

  // Step 4: Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<SendRemindersResult | null>(null);

  const handleTemplateChange = (tplId: string) => {
    setUserSelectedTemplateId(tplId);
    const tpl = templates.find((t) => (t.id || t.name) === tplId);
    if (tpl) {
      setCustomBody(tpl.body);
      setIsEditingTemplate(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return rows.filter((r) =>
      filterStudentRow(
        r,
        filterDueStatus,
        filterClass,
        filterSection,
        filterPeriod,
        filterOverdueSince
      )
    );
  }, [rows, filterDueStatus, filterClass, filterSection, filterPeriod, filterOverdueSince]);

  const filteredOutstandingPaise = useMemo(() => {
    return filteredStudents.reduce((sum, s) => sum + s.balancePaise, 0);
  }, [filteredStudents]);

  const finalRecipientRows = useMemo(() => {
    if (selectionMode === "filter") {
      return filteredStudents;
    }
    return rows.filter((r) => selectedIds.has(r.id) && r.balancePaise > 0);
  }, [selectionMode, filteredStudents, rows, selectedIds]);

  const totalSelectedOutstandingPaise = useMemo(() => {
    return finalRecipientRows.reduce((sum, r) => sum + r.balancePaise, 0);
  }, [finalRecipientRows]);

  const invalidPhoneCount = useMemo(() => {
    return finalRecipientRows.filter((r) => !r.hasValidPhone).length;
  }, [finalRecipientRows]);

  const sampleRow = finalRecipientRows[0] || rows[0];
  const renderedPreview = useMemo(() => {
    if (!sampleRow) return editedBody;
    const formattedAmount = (sampleRow.balancePaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    return interpolateTemplate(editedBody, {
      student_name: sampleRow.studentName,
      parent_name: sampleRow.parentName,
      class_section: sampleRow.classSection,
      amount: formattedAmount,
      invoice_no: sampleRow.invoiceNo,
      due_date: sampleRow.dueDate,
      school_name: schoolName,
    });
  }, [editedBody, sampleRow, schoolName]);

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.className))).filter(Boolean);
  }, [rows]);

  const uniqueSections = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.sectionName))).filter(Boolean);
  }, [rows]);

  const uniquePeriods = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.billingPeriod))).filter(Boolean);
  }, [rows]);

  const manualFilteredRows = useMemo(() => {
    const q = manualSearch.trim().toLowerCase();
    return rows.filter((r) => searchStudentRow(r, q));
  }, [rows, manualSearch]);

  const toggleSelectManual = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllManual = () => {
    if (selectedIds.size === manualFilteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(manualFilteredRows.map((r) => r.id)));
    }
  };

  const handleExecuteSend = async () => {
    if (finalRecipientRows.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload: SendRemindersPayload = {
        selectedRowIds: finalRecipientRows.map((r) => r.id),
        templateId: activeTemplate?.id || "default",
        templateBody: editedBody,
        channels: {
          whatsapp: channelWhatsApp,
          sms: channelSMS,
        },
        scheduleMode,
        scheduledDate: scheduleMode === "later" ? scheduledDate : undefined,
        scheduledTime: scheduleMode === "later" ? scheduledTime : undefined,
        timezone: "Asia/Kolkata",
      };

      const result = await sendBulkReminders(schoolId, payload, schoolName);
      setSubmitResult(result);
      setCurrentStep(4);
      onSuccess(result);
    } catch (err: any) {
      alert(`Error sending reminders: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    currentStep,
    setCurrentStep,
    showFilterListModal,
    setShowFilterListModal,
    filteredStudents,
    submitResult,
    step1Props: {
      finalRecipientCount: finalRecipientRows.length,
      selectionMode,
      setSelectionMode,
      filterDueStatus,
      setFilterDueStatus,
      filterClass,
      setFilterClass,
      filterSection,
      setFilterSection,
      filterPeriod,
      setFilterPeriod,
      filterOverdueSince,
      setFilterOverdueSince,
      uniqueClasses,
      uniqueSections,
      uniquePeriods,
      filteredStudentsCount: filteredStudents.length,
      filteredOutstandingPaise,
      onOpenFilterListModal: () => setShowFilterListModal(true),
      manualSearch,
      setManualSearch,
      selectedIds,
      manualFilteredRows,
      onSelectAllManual: handleSelectAllManual,
      onToggleSelectManual: toggleSelectManual,
    },
    step2Props: {
      templates,
      selectedTemplateId,
      onTemplateChange: handleTemplateChange,
      onOpenTemplates,
      isEditingTemplate,
      setIsEditingTemplate,
      editedBody,
      setEditedBody,
      renderedPreview,
      channelWhatsApp,
      setChannelWhatsApp,
      channelSMS,
      setChannelSMS,
      scheduleMode,
      setScheduleMode,
      scheduledDate,
      setScheduledDate,
      scheduledTime,
      setScheduledTime,
    },
    step3Props: {
      finalRecipientRows,
      totalSelectedOutstandingPaise,
      scheduleMode,
      scheduledDate,
      scheduledTime,
      channelWhatsApp,
      channelSMS,
      invalidPhoneCount,
    },
    footerProps: {
      currentStep,
      onClose,
      onBack: () => setCurrentStep((prev) => (prev - 1) as any),
      onNext: () => setCurrentStep(3),
      onSend: handleExecuteSend,
      canProceed: finalRecipientRows.length > 0,
      isSubmitting,
      scheduleMode,
    },
  };
}
