import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Printer,
  Edit2,
  Calendar,
  CreditCard,
  Bus,
  Users,
  Clock,
  Shield,
  FileText,
  Activity,
  History,
  AlertCircle,
  AlertTriangle,
  Save,
  X,
  Eye,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  Upload,
  Trash2,
  RefreshCw,
  FileCheck,
  FileWarning,
  Stethoscope,
  UserCheck,
  Download,
  Search,
  Plus,
  ExternalLink,
  GraduationCap,
  Home,
  MapPin,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import type {
  StudentProfile,
  StudentEvent,
  StudentDocument,
  StudentMedical,
  StudentMedicalInput,
  StudentPermissionKey,
  StudentSibling,
} from "../../../types/students";
import {
  getStudentProfile,
  updateStudent,
  revealStudentAadhaar,
  getStudentMedical,
  updateStudentMedical,
  uploadStudentDocument,
  verifyStudentDocument,
  replaceStudentDocument,
  deleteStudentDocument,
  STUDENT_ROLE_PERMISSIONS,
  getPermissionsForRole,
  getStudentSiblings,
  linkStudentSibling,
  unlinkStudentSibling,
  searchStudentsForSibling,
  getStudentActivityTimeline,
  type StudentTimelineItem,
} from "../../../services/studentService";
import { getStudentLedgerDetails } from "../../../services/studentFeeLedgerService";
import type { StudentLedgerDetails } from "../../../types/studentFeeLedger";
import { formatPaise } from "../../../lib/amountInWords";
import {
  reAdmitStudent,
  exportStudentData,
} from "../../../services/studentOperationsService";
import TransferCertificateModal from "./TransferCertificateModal";
import { DeleteStudentModal } from "./DeleteStudentModal";
import StudentLedgerTab from "../../../components/admin/fees/StudentLedgerTab";
import { AssignTransportDrawer } from "../transport/AssignTransportDrawer";
import {
  getStudentTransportDetails,
  stopAssignment,
  recordAbsence,
} from "../../../services/transportAssignmentService";
import type { EnrichedStudentTransport, TransportAssignment } from "../../../types/transport";



import { PrintAdmissionForm } from "./wizard/PrintAdmissionForm";

type ProfileTab = "overview" | "personal" | "family" | "academics" | "fees" | "transport" | "documents" | "medical" | "timeline";

export default function StudentProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { schoolId: authSchoolId, profile: currentUserProfile, school } = useAuth();

  useEffect(() => {
    if (searchParams.get("edit") === "true" && id) {
      navigate(`/admin/students/${id}/edit`, { replace: true });
    }
  }, [searchParams, id, navigate]);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPrintAdmissionOpen, setIsPrintAdmissionOpen] = useState(false);

  // Inline editing state for Personal tab
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    gender: "male",
    blood_group: "",
    category: "general",
    religion: "",
    mother_tongue: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Aadhaar reveal modal & countdown
  const [showAadhaarModal, setShowAadhaarModal] = useState(false);
  const [aadhaarReason, setAadhaarReason] = useState("");
  const [revealedAadhaar, setRevealedAadhaar] = useState<string | null>(null);
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);
  const [isRevealingAadhaar, setIsRevealingAadhaar] = useState(false);
  const [aadhaarCountdown, setAadhaarCountdown] = useState(30);
  const [aadhaarCopied, setAadhaarCopied] = useState(false);

  // Medical state
  const [medicalData, setMedicalData] = useState<StudentMedical | null>(null);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [medicalError, setMedicalError] = useState<string | null>(null);
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState<StudentMedicalInput>({});
  const [isSavingMedical, setIsSavingMedical] = useState(false);

  // Documents state
  const [docsList, setDocsList] = useState<StudentDocument[]>([]);
  const [selectedDocPreview, setSelectedDocPreview] = useState<StudentDocument | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("birth_certificate");
  const [uploadFileName, setUploadFileName] = useState("");
  const [docOperationError, setDocOperationError] = useState<string | null>(null);

  // Timeline events
  const [timelineEvents, setTimelineEvents] = useState<StudentEvent[]>([]);

  const schoolId = authSchoolId || "";
  const rawRole = (currentUserProfile?.role || "admin").toLowerCase().trim().replace(/[\s-]+/g, "_");
  const userRole = rawRole;
  const userPermissions: StudentPermissionKey[] = useMemo(() => getPermissionsForRole(userRole), [userRole]);
  const canReadMedical = userRole === "owner" || userRole === "super_admin" || userPermissions.includes("students.medical.read");
  const canWriteMedical = userRole === "owner" || userRole === "super_admin" || userPermissions.includes("students.medical.write");

  // Re-admission state
  const [isReAdmitModalOpen, setIsReAdmitModalOpen] = useState(false);
  const [reAdmitForm, setReAdmitForm] = useState({
    academic_year_id: "ay-2026",
    class_id: "",
    section_id: "",
    admission_date: new Date().toISOString().split("T")[0],
    reason: "",
    roll_no: "",
  });
  const [reAdmitLoading, setReAdmitLoading] = useState(false);
  const [reAdmitError, setReAdmitError] = useState<string | null>(null);

  // Export state
  const [isExportingData, setIsExportingData] = useState(false);

  // Sibling linking state
  const [siblingsList, setSiblingsList] = useState<StudentSibling[]>([]);
  const [isLinkSiblingModalOpen, setIsLinkSiblingModalOpen] = useState(false);
  const [siblingSearchQuery, setSiblingSearchQuery] = useState("");
  const [siblingSearchResults, setSiblingSearchResults] = useState<any[]>([]);
  const [isSearchingSiblings, setIsSearchingSiblings] = useState(false);
  const [selectedSiblingToLink, setSelectedSiblingToLink] = useState<any | null>(null);
  const [isLinkingSibling, setIsLinkingSibling] = useState(false);
  const [unlinkSiblingTarget, setUnlinkSiblingTarget] = useState<StudentSibling | null>(null);
  const [isUnlinkingSibling, setIsUnlinkingSibling] = useState(false);

  // Fee Status state
  const [feeLedgerSummary, setFeeLedgerSummary] = useState<StudentLedgerDetails | null>(null);
  const [feeLedgerLoading, setFeeLedgerLoading] = useState(false);

  // Activity Timeline state
  const [activityTimeline, setActivityTimeline] = useState<StudentTimelineItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>("all");

  // Transport state
  const [transportInfo, setTransportInfo] = useState<EnrichedStudentTransport | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [isEditingTransport, setIsEditingTransport] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopReason, setStopReason] = useState("");
  const [stopEffectiveDate, setStopEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceFrom, setAbsenceFrom] = useState(() => new Date().toISOString().split("T")[0]);
  const [absenceTo, setAbsenceTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [absenceReason, setAbsenceReason] = useState("");
  const [transportOpLoading, setTransportOpLoading] = useState(false);
  const [transportOpError, setTransportOpError] = useState<string | null>(null);

  const loadTransport = useCallback(async () => {
    if (!id || !schoolId) return;
    setTransportLoading(true);
    try {
      const data = await getStudentTransportDetails(schoolId, id);
      setTransportInfo(data);
    } catch (e) {
      console.error("Failed to load transport details", e);
    } finally {
      setTransportLoading(false);
    }
  }, [schoolId, id]);

  const loadMedical = useCallback(async () => {
    if (!id || !schoolId || !canReadMedical) return;
    setMedicalLoading(true);
    setMedicalError(null);
    try {
      const res = await getStudentMedical(schoolId, id, userPermissions);
      if (res.error) {
        setMedicalError(res.error);
      } else {
        setMedicalData(res.medical || null);
        if (res.medical) {
          setMedicalForm({
            allergies: res.medical.allergies || "",
            conditions: res.medical.conditions || "",
            medications: res.medical.medications || "",
            special_needs: res.medical.special_needs || "",
            vision_hearing_aids: res.medical.vision_hearing_aids || "",
            emergency_instructions: res.medical.emergency_instructions || "",
            doctor_name: res.medical.doctor_name || "",
            doctor_phone: res.medical.doctor_phone || "",
            preferred_hospital: res.medical.preferred_hospital || "",
          });
        }
      }
    } catch (err: any) {
      setMedicalError(err.message || "Failed to load medical records");
    } finally {
      setMedicalLoading(false);
    }
  }, [schoolId, id, canReadMedical, userPermissions]);

  const handleTabChange = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    if (tab === "medical") {
      loadMedical();
    } else if (tab === "transport") {
      loadTransport();
    }
  }, [loadMedical, loadTransport]);

  const handleExecuteReAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !schoolId) return;

    if (!reAdmitForm.class_id) {
      setReAdmitError("Please select a target class");
      return;
    }

    setReAdmitLoading(true);
    setReAdmitError(null);

    try {
      const actorId = currentUserProfile?.id || "admin";
      await reAdmitStudent(
        schoolId,
        id,
        actorId,
        {
          academic_year_id: reAdmitForm.academic_year_id,
          class_id: reAdmitForm.class_id,
          section_id: reAdmitForm.section_id || null,
          admission_date: reAdmitForm.admission_date,
          reason: reAdmitForm.reason,
          roll_no: reAdmitForm.roll_no || null,
        },
        userRole
      );

      setIsReAdmitModalOpen(false);
      // Reload profile
      const res = await getStudentProfile(schoolId, id);
      if (res.profile) {
        setProfile(res.profile);
        setTimelineEvents(res.profile.events || []);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setReAdmitError(err.message || "Failed to re-admit student");
    } finally {
      setReAdmitLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!profile || !id) return;
    try {
      setIsExportingData(true);
      const actorId = currentUserProfile?.id || "admin";
      const data = await exportStudentData(schoolId, id, actorId, userRole);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `student_${profile.admission_no}_export.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(`Export failed: ${err.message || err}`);
    } finally {
      setIsExportingData(false);
    }
  };

  useEffect(() => {
    if (!id || !schoolId) return;

    setLoading(true);
    setError(null);
    getStudentProfile(schoolId, id)
      .then(res => {
        if (res.error) {
          setError(res.error);
        } else if (res.profile) {
          setProfile(res.profile);
          setDocsList(res.profile.documents || []);
          setTimelineEvents(res.profile.events || []);
          setSiblingsList(res.profile.siblings || []);
          setPersonalForm({
            first_name: res.profile.first_name,
            last_name: res.profile.last_name,
            dob: res.profile.dob,
            gender: res.profile.gender,
            blood_group: res.profile.blood_group || "",
            category: res.profile.category || "general",
            religion: res.profile.religion || "",
            mother_tongue: res.profile.mother_tongue || "",
          });
        }
      })
      .finally(() => setLoading(false));

    // Load fresh siblings
    getStudentSiblings(schoolId, id)
      .then(sibsRes => {
        if (sibsRes.siblings) setSiblingsList(sibsRes.siblings);
      })
      .catch(err => console.warn("Failed to load siblings:", err));

    // Load actual fee ledger summary
    setFeeLedgerLoading(true);
    getStudentLedgerDetails(schoolId, id)
      .then(ledger => setFeeLedgerSummary(ledger))
      .catch(err => console.warn("Failed to load student fee ledger:", err))
      .finally(() => setFeeLedgerLoading(false));

    // Load comprehensive activity timeline
    setActivityLoading(true);
    getStudentActivityTimeline(schoolId, id)
      .then(items => setActivityTimeline(items))
      .catch(err => console.warn("Failed to load student activity timeline:", err))
      .finally(() => setActivityLoading(false));
  }, [id, schoolId]);

  // Debounced search for linking siblings
  useEffect(() => {
    if (!siblingSearchQuery.trim() || !id || !schoolId) {
      setSiblingSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingSiblings(true);
      try {
        const res = await searchStudentsForSibling(schoolId, id, siblingSearchQuery);
        const linkedIds = new Set(siblingsList.map(s => s.sibling_id));
        const filtered = (res.students || []).filter(s => !linkedIds.has(s.id) && s.id !== id);
        setSiblingSearchResults(filtered);
      } catch (e) {
        console.warn("Failed to search siblings:", e);
      } finally {
        setIsSearchingSiblings(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [siblingSearchQuery, id, schoolId, siblingsList]);

  // Handle linking sibling
  const handleConfirmLinkSibling = async () => {
    if (!selectedSiblingToLink || !id || !schoolId) return;
    setIsLinkingSibling(true);
    try {
      const res = await linkStudentSibling(schoolId, id, selectedSiblingToLink.id, currentUserProfile?.id || "admin");
      if (!res.success) {
        alert(res.error || "Failed to link sibling");
        return;
      }
      const updatedSibs = await getStudentSiblings(schoolId, id);
      if (updatedSibs.siblings) setSiblingsList(updatedSibs.siblings);

      const updatedActivities = await getStudentActivityTimeline(schoolId, id);
      setActivityTimeline(updatedActivities);

      setIsLinkSiblingModalOpen(false);
      setSelectedSiblingToLink(null);
      setSiblingSearchQuery("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to link sibling");
    } finally {
      setIsLinkingSibling(false);
    }
  };

  // Handle unlinking sibling
  const handleConfirmUnlinkSibling = async () => {
    if (!unlinkSiblingTarget || !id || !schoolId) return;
    setIsUnlinkingSibling(true);
    try {
      const res = await unlinkStudentSibling(schoolId, id, unlinkSiblingTarget.sibling_id, currentUserProfile?.id || "admin");
      if (!res.success) {
        alert(res.error || "Failed to unlink sibling");
        return;
      }
      const updatedSibs = await getStudentSiblings(schoolId, id);
      if (updatedSibs.siblings) setSiblingsList(updatedSibs.siblings);

      const updatedActivities = await getStudentActivityTimeline(schoolId, id);
      setActivityTimeline(updatedActivities);

      setUnlinkSiblingTarget(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to unlink sibling");
    } finally {
      setIsUnlinkingSibling(false);
    }
  };

  // Derived real fee ledger metrics
  const totalAssignedPaise = feeLedgerSummary?.metrics?.total_charges_paise ?? 0;
  const totalPaidPaise = feeLedgerSummary?.metrics?.total_payments_paise ?? 0;
  const outstandingBalancePaise = feeLedgerSummary?.metrics?.closing_balance_paise ?? 0;
  const overdueAmountPaise = feeLedgerSummary?.metrics?.overdue_balance_paise ?? 0;
  const nextDueDate = feeLedgerSummary?.student?.next_due_date ?? null;

  const latestPaymentDate = useMemo(() => {
    if (feeLedgerSummary?.payments && feeLedgerSummary.payments.length > 0) {
      const sorted = [...feeLedgerSummary.payments].sort(
        (a, b) => new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime()
      );
      return sorted[0].receipt_date;
    }
    return null;
  }, [feeLedgerSummary]);

  const feeStatusBadge = useMemo(() => {
    if (feeLedgerLoading) {
      return { label: "Loading...", bgColor: "bg-slate-100", textColor: "text-slate-600", borderColor: "border-slate-200" };
    }
    if (overdueAmountPaise > 0) {
      return { label: "Overdue", bgColor: "bg-red-50", textColor: "text-red-700", borderColor: "border-red-200" };
    }
    if (outstandingBalancePaise > 0) {
      return { label: "Partially Paid", bgColor: "bg-amber-50", textColor: "text-amber-700", borderColor: "border-amber-200" };
    }
    if (totalAssignedPaise > 0 && outstandingBalancePaise <= 0) {
      return { label: "Paid in Full", bgColor: "bg-emerald-50", textColor: "text-emerald-700", borderColor: "border-emerald-200" };
    }
    return { label: "No Dues", bgColor: "bg-blue-50", textColor: "text-blue-700", borderColor: "border-blue-200" };
  }, [feeLedgerLoading, overdueAmountPaise, outstandingBalancePaise, totalAssignedPaise]);

  // Relative or formatted date helper
  const formatRelativeOrDate = useCallback((dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  }, []);


  // Aadhaar auto-mask countdown timer
  useEffect(() => {
    if (!revealedAadhaar) return;

    setAadhaarCountdown(30);
    const interval = setInterval(() => {
      setAadhaarCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [revealedAadhaar]);

  useEffect(() => {
    if (aadhaarCountdown === 0 && revealedAadhaar) {
      setRevealedAadhaar(null);
      setShowAadhaarModal(false);
    }
  }, [aadhaarCountdown, revealedAadhaar]);

  const handleRevealAadhaar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !schoolId || !aadhaarReason.trim()) {
      setAadhaarError("A valid justification reason is mandatory under DPDP Act 2023");
      return;
    }

    setIsRevealingAadhaar(true);
    setAadhaarError(null);
    const actorId = currentUserProfile?.id || "user-admin";

    const res = await revealStudentAadhaar(
      schoolId,
      id,
      aadhaarReason.trim(),
      actorId,
      userRole,
      userPermissions
    );

    setIsRevealingAadhaar(false);
    if (res.error) {
      setAadhaarError(res.error);
    } else if (res.aadhaar) {
      setRevealedAadhaar(res.aadhaar);
    }
  };

  const handleCopyAadhaar = () => {
    if (!revealedAadhaar) return;
    navigator.clipboard.writeText(revealedAadhaar.replace(/\s+/g, ""));
    setAadhaarCopied(true);
    setTimeout(() => setAadhaarCopied(false), 2000);
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile) return;

    setIsSaving(true);
    try {
      const actorId = currentUserProfile?.id || "user-admin";
      const actorRole = currentUserProfile?.role || "admin";

      const res = await updateStudent(
        schoolId,
        id,
        {
          first_name: personalForm.first_name,
          last_name: personalForm.last_name,
          dob: personalForm.dob,
          gender: personalForm.gender as any,
          blood_group: personalForm.blood_group || undefined,
          category: personalForm.category as any,
          religion: personalForm.religion || undefined,
          mother_tongue: personalForm.mother_tongue || undefined,
        },
        actorId,
        actorRole
      );

      if (res.error) {
        alert(`Failed to save changes: ${res.error}`);
      } else if (res.student) {
        setProfile(prev => (prev ? { ...prev, ...res.student } : null));
        setIsEditingPersonal(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !schoolId) return;

    setIsSavingMedical(true);
    try {
      const actorId = currentUserProfile?.id || "user-admin";

      const res = await updateStudentMedical(
        schoolId,
        id,
        medicalForm,
        actorId,
        userRole,
        userPermissions
      );

      if (res.error) {
        alert(`Failed to update medical details: ${res.error}`);
      } else if (res.medical) {
        setMedicalData(res.medical);
        setIsEditingMedical(false);
      }
    } finally {
      setIsSavingMedical(false);
    }
  };

  // Document Vault handlers
  const handleVerifyDoc = async (docId: string) => {
    const actorId = currentUserProfile?.id || "user-admin";
    const res = await verifyStudentDocument(schoolId, docId, "verify", actorId);
    if (res.error) {
      setDocOperationError(res.error);
    } else if (res.document) {
      setDocsList(prev => prev.map(d => (d.id === docId ? res.document! : d)));
    }
  };

  const handleRejectDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDocId || !rejectReason.trim()) return;

    const actorId = currentUserProfile?.id || "user-admin";
    const res = await verifyStudentDocument(schoolId, rejectingDocId, "reject", actorId, rejectReason.trim());
    if (res.error) {
      setDocOperationError(res.error);
    } else if (res.document) {
      setDocsList(prev => prev.map(d => (d.id === rejectingDocId ? res.document! : d)));
      setRejectingDocId(null);
      setRejectReason("");
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    const actorId = currentUserProfile?.id || "user-admin";
    const res = await deleteStudentDocument(schoolId, docId, actorId);
    if (!res.success) {
      alert(res.error || "Failed to delete document");
    } else {
      setDocsList(prev => prev.filter(d => d.id !== docId));
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !uploadFileName.trim()) return;

    const actorId = currentUserProfile?.id || "user-admin";
    const res = await uploadStudentDocument(
      schoolId,
      id,
      {
        doc_type: uploadDocType,
        file_name: uploadFileName.trim(),
        mime: uploadFileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        size_bytes: 1024 * 350,
        status: "uploaded",
      },
      actorId
    );

    if (res.error) {
      alert(res.error);
    } else if (res.document) {
      setDocsList(prev => [...prev, res.document!]);
      setUploadModalOpen(false);
      setUploadFileName("");
    }
  };

  if (loading || (!schoolId && !error)) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="animate-pulse flex items-center gap-4 bg-white p-6 rounded-2xl border border-[#E6EAF3]">
          <div className="w-20 h-20 rounded-full bg-slate-200" />
          <div className="space-y-2 flex-1">
            <div className="w-48 h-5 bg-slate-200 rounded-sm" />
            <div className="w-32 h-4 bg-slate-100 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Student not found</h2>
        <p className="text-xs text-slate-500">{error || "Could not retrieve student record."}</p>
        <button
          type="button"
          onClick={() => navigate("/admin/students")}
          className="px-4 py-2 bg-[#2158E0] text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Back to students
        </button>
      </div>
    );
  }

  const primaryParent = profile.parents.find(p => p.is_primary_contact) || profile.parents[0];
  const initials = `${profile.first_name[0] || ""}${profile.last_name[0] || ""}`.toUpperCase();

  const computeAge = (dob: string) => {
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 w-full">
      {/* Back button */}
      <div>
        <Link
          to="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#2158E0] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to students
        </Link>
      </div>

      {/* Header Card (Spec A4.3) */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Photo Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-50 border-2 border-[#E6EAF3] text-[#2158E0] flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0 overflow-hidden shadow-2xs relative group">
              {profile.photo_path ? (
                <img src={profile.photo_path} alt={profile.first_name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                  {profile.first_name} {profile.middle_name ? `${profile.middle_name} ` : ""}{profile.last_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                  {profile.status.replace("_", " ")}
                </span>
                {profile.is_rte && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    RTE quota
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 font-medium flex-wrap">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-semibold">
                  {profile.admission_no}
                </span>
                {profile.class_name && (
                  <>
                    <span>•</span>
                    <span className="bg-blue-50 text-[#2158E0] px-2 py-0.5 rounded-md font-semibold">
                      Class {profile.class_name}{profile.section_name ? ` - ${profile.section_name}` : ""}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Age: {computeAge(profile.dob)} years</span>
                <span>•</span>
                <span>Admitted: {profile.admission_date}</span>
              </div>

              {primaryParent && (
                <div className="flex items-center gap-3 text-xs text-slate-600 pt-0.5 flex-wrap">
                  <span>Parent: <strong>{primaryParent.full_name}</strong></span>
                  <a
                    href={`tel:${primaryParent.phone}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono"
                  >
                    <Phone className="w-3 h-3" /> {primaryParent.phone}
                  </a>
                  <a
                    href={`https://wa.me/91${primaryParent.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold"
                  >
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {profile.status !== "enrolled" && (
              <button
                type="button"
                onClick={() => setIsReAdmitModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" /> Re-admit student
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/admin/students/${profile.id}/edit?step=1`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/fees/collect?student=${profile.id}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" /> Collect fee
            </button>

            <button
              type="button"
              onClick={() => setIsStatusModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-700" /> Status / TC
            </button>
            <button
              type="button"
              onClick={() => setIsPrintAdmissionOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" /> Print Admission Form
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/students/id-cards?studentId=${profile.id}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print ID
            </button>
            <button
              type="button"
              onClick={handleExportData}
              disabled={isExportingData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> {isExportingData ? "Exporting..." : "Export Data"}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              title="Delete student and all associated data"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete
            </button>
          </div>
        </div>
      </div>

      {isStatusModalOpen && profile && (
        <TransferCertificateModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          student={profile}
          schoolId={schoolId}
          actorId={currentUserProfile?.id || "admin"}
          actorRole={currentUserProfile?.role || "admin"}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Re-admission Modal (Spec A5.4, 1.5, Decision) */}
      {isReAdmitModalOpen && profile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-lg">Re-admit Student</h3>
              </div>
              <button aria-label="Close"
                type="button"
                onClick={() => setIsReAdmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Re-admission Policy (Spec A5.4, Decision):</p>
              <p>
                The student's original admission number <strong>{profile.admission_no}</strong> will be retained. A new enrollment record will be created for the selected class and academic year.
              </p>
            </div>

            {reAdmitError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Cannot Re-admit</p>
                  <p>{reAdmitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleExecuteReAdmission} className="mt-4 space-y-4">
              <div>
                <label htmlFor="studentprofile-academic-year" className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select id="studentprofile-academic-year" aria-label="Academic Year"
                  value={reAdmitForm.academic_year_id}
                  onChange={(e) => setReAdmitForm({ ...reAdmitForm, academic_year_id: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#2158E0]"
                  required
                >
                  <option value="ay-2026">AY 2026-2027 (Current)</option>
                  <option value="ay-2025">AY 2025-2026</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="studentprofile-target-class" className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Class <span className="text-red-500">*</span>
                  </label>
                  <select id="studentprofile-target-class" aria-label="Target Class"
                    value={reAdmitForm.class_id}
                    onChange={(e) => setReAdmitForm({ ...reAdmitForm, class_id: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#2158E0]"
                    required
                  >
                    <option value="">Select Class</option>
                    <option value="Class 1">Class 1</option>
                    <option value="Class 2">Class 2</option>
                    <option value="Class 3">Class 3</option>
                    <option value="Class 4">Class 4</option>
                    <option value="Class 5">Class 5</option>
                    <option value="Class 6">Class 6</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="studentprofile-section-optional" className="block text-xs font-semibold text-slate-700 mb-1">
                    Section (Optional)
                  </label>
                  <select id="studentprofile-section-optional" aria-label="Section (Optional)"
                    value={reAdmitForm.section_id}
                    onChange={(e) => setReAdmitForm({ ...reAdmitForm, section_id: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#2158E0]"
                  >
                    <option value="">No Section (Class level)</option>
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                    <option value="Section C">Section C</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="studentprofile-re-admission-date" className="block text-xs font-semibold text-slate-700 mb-1">
                    Re-admission Date <span className="text-red-500">*</span>
                  </label>
                  <input id="studentprofile-re-admission-date" aria-label="Re-admission Date"
                    type="date"
                    value={reAdmitForm.admission_date}
                    onChange={(e) => setReAdmitForm({ ...reAdmitForm, admission_date: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="studentprofile-roll-no-optional" className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll No (Optional)
                  </label>
                  <input id="studentprofile-roll-no-optional"
                    type="text"
                    value={reAdmitForm.roll_no}
                    onChange={(e) => setReAdmitForm({ ...reAdmitForm, roll_no: e.target.value })}
                    placeholder="e.g. 15"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="studentprofile-reason-for-re-admission" className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Re-admission
                </label>
                <textarea id="studentprofile-reason-for-re-admission"
                  value={reAdmitForm.reason}
                  onChange={(e) => setReAdmitForm({ ...reAdmitForm, reason: e.target.value })}
                  placeholder="e.g. Relocated back to town; completed medical treatment"
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReAdmitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reAdmitLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {reAdmitLoading ? "Processing..." : "Confirm Re-admission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          Changes saved successfully and logged in audit history.
        </div>
      )}

      {/* Tabs Navigation (Spec A4.3) */}
      <div className="flex items-center gap-1 border-b border-[#E6EAF3] overflow-x-auto scrollbar-none">
        {[
          { id: "overview", label: "Overview", icon: Activity, visible: true },
          { id: "personal", label: "Personal", icon: Edit2, visible: true },
          { id: "family", label: "Family", icon: Shield, visible: true },
          { id: "academics", label: "Academics", icon: Calendar, visible: true },
          { id: "documents", label: `Documents (${docsList.length})`, icon: FileText, visible: true },
          { id: "medical", label: "Medical", icon: Stethoscope, visible: canReadMedical },
          { id: "timeline", label: "Timeline", icon: History, visible: true },
          { id: "fees", label: "Fees", icon: CreditCard, visible: true },
          { id: "transport", label: "Transport", icon: Bus, visible: true },
        ]
          .filter(t => t.visible)
          .map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as ProfileTab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
                  isActive
                    ? "border-[#2158E0] text-[#2158E0]"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {/* TAB CONTENT */}
      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main Column: Key Facts & Recent Activity */}
          <div className="md:col-span-2 space-y-5">
            {/* Key Facts Card */}
            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2158E0]" />
                  <h3 className="text-sm font-bold text-slate-900 font-display">Key Facts</h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/students/${profile.id}/edit?step=1`)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Date of Birth</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{profile.dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Gender</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block capitalize">{profile.gender}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Category</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block uppercase">{profile.category || "General"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Blood Group</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{profile.blood_group || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Nationality</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{profile.nationality}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Mother Tongue</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{profile.mother_tongue || "—"}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2158E0]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">Recent Activity</h3>
                    <p className="text-[11px] text-slate-500">Chronological history of transactions, updates & events</p>
                  </div>
                </div>
                {activityTimeline.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange("timeline")}
                    className="text-xs font-semibold text-[#2158E0] hover:underline cursor-pointer"
                  >
                    View All ({activityTimeline.length}) →
                  </button>
                )}
              </div>

              {activityLoading ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loading activity history...
                </div>
              ) : activityTimeline.length > 0 ? (
                <div className="space-y-3">
                  {activityTimeline.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 text-xs pb-3.5 border-b border-slate-100 last:border-b-0 last:pb-0"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          event.category === "fee_payment"
                            ? "bg-emerald-50 text-emerald-600"
                            : event.category === "fee_invoice"
                            ? "bg-amber-50 text-amber-600"
                            : event.category === "status"
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-blue-50 text-[#2158E0]"
                        }`}
                      >
                        {event.category === "fee_payment" ? (
                          <CreditCard className="w-4 h-4" />
                        ) : event.category === "fee_invoice" ? (
                          <FileText className="w-4 h-4" />
                        ) : event.category === "status" ? (
                          <Activity className="w-4 h-4" />
                        ) : (
                          <GraduationCap className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-xs">{event.summary}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatRelativeOrDate(event.created_at)}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{event.description}</p>
                        )}
                        {event.financial && (
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-semibold">
                              {event.financial.amountFormatted}
                            </span>
                            {event.financial.receiptNo && (
                              <span className="text-slate-500">
                                Receipt: <strong className="text-slate-700 font-mono">#{event.financial.receiptNo}</strong>
                              </span>
                            )}
                            {event.financial.paymentMode && (
                              <span className="text-slate-600 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                {event.financial.paymentMode}
                              </span>
                            )}
                            {event.financial.status && (
                              <span className="capitalize text-slate-500 font-medium">
                                Status: {event.financial.status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : timelineEvents.length > 0 ? (
                <div className="space-y-3">
                  {timelineEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-b-0 last:pb-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{event.summary}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-4 text-center">
                  No activity events recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Side Column: Fee Status & Siblings */}
          <div className="space-y-5">
            {/* Real Fee Status Card */}
            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">Fee Status</h3>
                    <p className="text-[11px] text-slate-500">Live ledger obligations & receipts</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${feeStatusBadge.bgColor} ${feeStatusBadge.textColor} border ${feeStatusBadge.borderColor}`}
                >
                  {feeStatusBadge.label}
                </span>
              </div>

              {/* Outstanding Balance Banner */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 mb-3.5 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">Outstanding Balance</span>
                  <span
                    className={`text-xl font-bold font-mono tracking-tight ${
                      outstandingBalancePaise > 0 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {formatPaise(outstandingBalancePaise)}
                  </span>
                </div>
                {overdueAmountPaise > 0 && (
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-red-600 block">Overdue Amount</span>
                    <span className="text-base font-bold font-mono text-red-600">
                      {formatPaise(overdueAmountPaise)}
                    </span>
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Total Assigned</span>
                  <span className="font-semibold text-slate-800 font-mono text-xs">
                    {formatPaise(totalAssignedPaise)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Total Paid</span>
                  <span className="font-semibold text-emerald-600 font-mono text-xs">
                    {formatPaise(totalPaidPaise)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Next Due Date</span>
                  <span className="font-medium text-slate-800 text-xs">
                    {nextDueDate || "None scheduled"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Latest Payment</span>
                  <span className="font-medium text-slate-800 text-xs">
                    {latestPaymentDate || "No payments yet"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleTabChange("fees")}
                  className="flex-1 text-center py-2 px-3 text-xs font-semibold text-[#2158E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  View Detailed Ledger →
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/fees/collect?student=${profile.id}`)}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Collect Fee
                </button>
              </div>
            </div>

            {/* Siblings in School Card */}
            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">Siblings in School</h3>
                    <p className="text-[11px] text-slate-500">
                      {siblingsList.length > 0
                        ? `${siblingsList.length} linked sibling${siblingsList.length > 1 ? "s" : ""}`
                        : "Family student connections"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLinkSiblingModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#2158E0] bg-blue-50 hover:bg-blue-100/80 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Link Sibling
                </button>
              </div>

              {siblingsList.length > 0 ? (
                <div className="space-y-2">
                  {siblingsList.map((sib) => (
                    <div
                      key={sib.sibling_id}
                      className="p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/admin/students/${sib.sibling_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") navigate(`/admin/students/${sib.sibling_id}`);
                        }}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-[#2158E0] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {sib.sibling_photo_path ? (
                            <img src={sib.sibling_photo_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                            `${sib.sibling_first_name[0] || ""}${sib.sibling_last_name[0] || ""}`.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 group-hover:text-[#2158E0] transition-colors truncate">
                            {sib.sibling_first_name} {sib.sibling_last_name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {sib.sibling_admission_no} • {sib.sibling_class_name ? `Class ${sib.sibling_class_name}` : "Enrolled"}
                            {sib.sibling_section_name ? ` - ${sib.sibling_section_name}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/students/${sib.sibling_id}`)}
                          className="p-1.5 text-slate-400 hover:text-[#2158E0] hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="View student profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnlinkSiblingTarget(sib)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Unlink sibling"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No siblings detected in school</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Link brothers or sisters studying in this school to view consolidated family records and manage shared information.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsLinkSiblingModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2158E0] bg-white border border-[#E6EAF3] hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Link a Sibling
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSONAL TAB (With inline editing and Audited Aadhaar reveal) */}
      {activeTab === "personal" && (
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 font-display">Personal details & identity</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/admin/students/${profile.id}/edit?step=1`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/50 text-xs font-semibold text-[#2158E0] hover:bg-blue-100/70 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit in Wizard
              </button>
              {!isEditingPersonal ? (
                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Quick Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(false)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSavePersonal} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="studentprofile-first-name" className="text-xs font-semibold text-slate-700 block mb-1">First name</label>
                {isEditingPersonal ? (
                  <input id="studentprofile-first-name" aria-label="First name"
                    type="text"
                    value={personalForm.first_name}
                    onChange={e => setPersonalForm({ ...personalForm, first_name: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                    required
                  />
                ) : (
                  <div className="text-xs font-medium text-slate-900 p-2 bg-slate-50 rounded-lg">{profile.first_name}</div>
                )}
              </div>

              <div>
                <label htmlFor="studentprofile-last-name" className="text-xs font-semibold text-slate-700 block mb-1">Last name</label>
                {isEditingPersonal ? (
                  <input id="studentprofile-last-name" aria-label="Last name"
                    type="text"
                    value={personalForm.last_name}
                    onChange={e => setPersonalForm({ ...personalForm, last_name: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                    required
                  />
                ) : (
                  <div className="text-xs font-medium text-slate-900 p-2 bg-slate-50 rounded-lg">{profile.last_name}</div>
                )}
              </div>

              <div>
                <label htmlFor="studentprofile-date-of-birth" className="text-xs font-semibold text-slate-700 block mb-1">Date of birth</label>
                {isEditingPersonal ? (
                  <input id="studentprofile-date-of-birth" aria-label="Date of birth"
                    type="date"
                    value={personalForm.dob}
                    onChange={e => setPersonalForm({ ...personalForm, dob: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                    required
                  />
                ) : (
                  <div className="text-xs font-medium text-slate-900 p-2 bg-slate-50 rounded-lg">{profile.dob}</div>
                )}
              </div>

              <div>
                <label htmlFor="studentprofile-gender" className="text-xs font-semibold text-slate-700 block mb-1">Gender</label>
                {isEditingPersonal ? (
                  <select id="studentprofile-gender" aria-label="Gender"
                    value={personalForm.gender}
                    onChange={e => setPersonalForm({ ...personalForm, gender: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <div className="text-xs font-medium text-slate-900 p-2 bg-slate-50 rounded-lg capitalize">{profile.gender}</div>
                )}
              </div>

              <div>
                <label htmlFor="studentprofile-category" className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                {isEditingPersonal ? (
                  <select id="studentprofile-category" aria-label="Category"
                    value={personalForm.category}
                    onChange={e => setPersonalForm({ ...personalForm, category: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  >
                    <option value="general">General</option>
                    <option value="obc">OBC</option>
                    <option value="sc">SC</option>
                    <option value="st">ST</option>
                    <option value="ews">EWS</option>
                  </select>
                ) : (
                  <div className="text-xs font-medium text-slate-900 p-2 bg-slate-50 rounded-lg uppercase">{profile.category || "General"}</div>
                )}
              </div>

              <div>
                <label htmlFor="studentprofile-blood-group" className="text-xs font-semibold text-slate-700 block mb-1">Blood group</label>
                {isEditingPersonal ? (
                  <input id="studentprofile-blood-group"
                    type="text"
                    value={personalForm.blood_group}
                    onChange={e => setPersonalForm({ ...personalForm, blood_group: e.target.value })}
                    placeholder="e.g. B+"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                ) : (
                  <div className="text-xs font-medium text-slate-900 p-2 bg-slate-50 rounded-lg">{profile.blood_group || "—"}</div>
                )}
              </div>
            </div>

            {/* Aadhaar Reveal Row (Spec A4.3) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Aadhaar Number (Masked by default)
                </span>
                <span className="text-[11px] text-slate-500 font-normal">Encrypted AES-256-GCM • DPDP Act compliant</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-slate-800 tracking-wider">
                  •••• •••• {profile.aadhaar_last4 || "XXXX"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/students/${profile.id}/edit?step=5`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-semibold text-[#2158E0] hover:bg-blue-50 cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Aadhaar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAadhaarModal(true);
                      setAadhaarReason("");
                      setAadhaarError(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" /> Reveal plaintext
                  </button>
                </div>
              </div>
            </div>

            {isEditingPersonal && (
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save changes & audit"}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 3. FAMILY TAB */}
      {activeTab === "family" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 font-display">Linked parents and guardians</h3>
            <button
              type="button"
              onClick={() => navigate(`/admin/students/${profile.id}/edit?step=2`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-[#2158E0] hover:bg-blue-50 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Family & Guardian
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.parents.map(parent => (
              <div key={parent.id} className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{parent.full_name}</h4>
                    <span className="text-xs text-slate-500 capitalize">{parent.relation}</span>
                  </div>
                  {parent.is_primary_contact && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-[#2158E0] rounded-md border border-blue-200">
                      Primary contact
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>Phone: <strong className="font-mono">{parent.phone}</strong></div>
                  {parent.email && <div>Email: {parent.email}</div>}
                  {parent.occupation && <div>Occupation: {parent.occupation}</div>}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={`tel:${parent.phone}`}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                  <span className="text-slate-300">•</span>
                  <a
                    href={`https://wa.me/91${parent.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Residential & Permanent Addresses */}
          {profile.addresses && profile.addresses.length > 0 && (
            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#2158E0]" />
                  <h4 className="font-bold text-slate-900 text-sm">Residential & Permanent Address</h4>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/students/${profile.id}/edit?step=2`)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#2158E0] hover:underline cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Edit Address
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {profile.addresses.map((addr) => (
                  <div key={addr.id || addr.kind} className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 capitalize text-xs">
                        {addr.kind === "current" ? "Current Residential Address" : "Permanent Address"}
                      </span>
                      {addr.kind === "current" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 text-[#2158E0] rounded border border-blue-200">
                          Residential
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ""}
                      {addr.landmark ? `, Near ${addr.landmark}` : ""}
                    </p>
                    <div className="text-slate-600 space-y-0.5 text-[11px]">
                      <div>
                        <span className="text-slate-500">City / District:</span> {addr.city}{addr.district ? `, ${addr.district}` : ""}
                      </div>
                      <div>
                        <span className="text-slate-500">State:</span>{" "}
                        <strong className="text-slate-800 font-semibold">{addr.state || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">PIN Code:</span> <span className="font-mono">{addr.pin || "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ACADEMICS TAB */}
      {activeTab === "academics" && (
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 font-display">Enrollment history</h3>
            <button
              type="button"
              onClick={() => navigate(`/admin/students/${profile.id}/edit?step=3`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-[#2158E0] hover:bg-blue-50 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Academic Details
            </button>
          </div>
          {profile.enrollments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {profile.enrollments.map(enr => (
                <div key={enr.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">Academic year enrollment</div>
                    <div className="text-slate-500">Roll number: {enr.roll_no || "Not assigned"}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2158E0] font-medium capitalize">
                    {enr.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">No formal enrollment records found.</div>
          )}
        </div>
      )}

      {/* 5. DOCUMENTS TAB (Document Vault - Spec A4.4) */}
      {activeTab === "documents" && (
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Document Vault</h3>
              <p className="text-xs text-slate-500">Verified documents cannot be deleted; they can only be superseded.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/admin/students/${profile.id}/edit?step=4`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-600" /> Manage in Wizard
              </button>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Upload document
              </button>
            </div>
          </div>

          {docOperationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
              <span>{docOperationError}</span>
              <button aria-label="Close" type="button" onClick={() => setDocOperationError(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {docsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docsList.map(doc => {
                const isVerified = doc.status === "verified";
                const isRejected = doc.status === "rejected";
                const isPending = doc.status === "pending";

                return (
                  <div
                    key={doc.id}
                    className="border border-[#E6EAF3] rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow bg-slate-50/50"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 font-bold">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 capitalize">
                              {doc.doc_type.replace(/_/g, " ")}
                            </h4>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                              {doc.file_name || "Attachment"}
                            </span>
                          </div>
                        </div>

                        {/* Status Chip */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                            isVerified
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isRejected
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>

                      {isPending && doc.expected_on && (
                        <div className="text-[11px] text-amber-700 bg-amber-50/80 p-1.5 rounded-md">
                          Expected by: {doc.expected_on}
                        </div>
                      )}

                      {isRejected && doc.rejection_reason && (
                        <div className="text-[11px] text-rose-700 bg-rose-50/80 p-1.5 rounded-md">
                          Reason: {doc.rejection_reason}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                        {doc.verified_at && ` • Verified: ${new Date(doc.verified_at).toLocaleDateString()}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setSelectedDocPreview(doc)}
                        className="text-[#2158E0] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>

                      <div className="flex items-center gap-2">
                        {!isVerified && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleVerifyDoc(doc.id)}
                              className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                              title="Verify document"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingDocId(doc.id);
                                setRejectReason("");
                              }}
                              className="text-rose-600 hover:text-rose-800 cursor-pointer"
                              title="Reject document"
                            >
                              <FileWarning className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete (unverified only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isVerified && (
                          <button
                            type="button"
                            onClick={async () => {
                              const newName = prompt("Enter new document file name to supersede this record:");
                              if (newName) {
                                const actorId = currentUserProfile?.id || "user-admin";
                                try {
                                  const res = await replaceStudentDocument(
                                    schoolId,
                                    doc.id,
                                    {
                                      doc_type: doc.doc_type,
                                      file_name: newName,
                                      mime: newName.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
                                      status: "uploaded",
                                    },
                                    actorId
                                  );
                                  if (res.document) {
                                    setDocsList(prev => prev.map(d => (d.id === doc.id ? res.document! : d)));
                                  }
                                } catch (err) {
                                  console.error("Failed to replace document:", err);
                                }
                              }
                            }}
                            className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                            title="Replace / Supersede verified document"
                          >
                            <RefreshCw className="w-3 h-3" /> Supersede
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <div className="text-xs font-medium">No documents uploaded yet</div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="text-xs text-[#2158E0] font-semibold hover:underline cursor-pointer"
              >
                Upload student documents
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. MEDICAL TAB (Permission gated: students.medical.read) */}
      {activeTab === "medical" && canReadMedical && (
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Confidential Medical Record</h3>
                <span className="text-[11px] text-slate-500">
                  Visible only to authorised medical/admin staff (isolated in student_medical table)
                </span>
              </div>
            </div>

            {canWriteMedical && !isEditingMedical && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/students/${profile.id}/edit?step=6`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/40 text-xs font-semibold text-rose-700 hover:bg-rose-100/50 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit in Wizard
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingMedical(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Quick Edit
                </button>
              </div>
            )}
          </div>

          {medicalError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{medicalError}</span>
            </div>
          )}

          {medicalLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
            </div>
          ) : isEditingMedical ? (
            <form onSubmit={handleSaveMedical} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="studentprofile-known-allergies" className="text-xs font-semibold text-slate-700 block mb-1">Known Allergies</label>
                  <input id="studentprofile-known-allergies"
                    type="text"
                    value={medicalForm.allergies || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, allergies: e.target.value })}
                    placeholder="e.g. Peanuts, Penicillin, Dust"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label htmlFor="studentprofile-chronic-conditions" className="text-xs font-semibold text-slate-700 block mb-1">Chronic Conditions</label>
                  <input id="studentprofile-chronic-conditions"
                    type="text"
                    value={medicalForm.conditions || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, conditions: e.target.value })}
                    placeholder="e.g. Asthma, Diabetes, Epilepsy"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label htmlFor="studentprofile-current-medications" className="text-xs font-semibold text-slate-700 block mb-1">Current Medications</label>
                  <input id="studentprofile-current-medications"
                    type="text"
                    value={medicalForm.medications || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, medications: e.target.value })}
                    placeholder="e.g. Inhaler twice daily"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label htmlFor="studentprofile-vision-hearing-aids" className="text-xs font-semibold text-slate-700 block mb-1">Vision / Hearing Aids</label>
                  <input id="studentprofile-vision-hearing-aids"
                    type="text"
                    value={medicalForm.vision_hearing_aids || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, vision_hearing_aids: e.target.value })}
                    placeholder="e.g. Spectacles (-2.5), Hearing aid left ear"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label htmlFor="studentprofile-family-doctor-name" className="text-xs font-semibold text-slate-700 block mb-1">Family Doctor Name</label>
                  <input id="studentprofile-family-doctor-name"
                    type="text"
                    value={medicalForm.doctor_name || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, doctor_name: e.target.value })}
                    placeholder="Dr. Sharma"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label htmlFor="studentprofile-doctor-phone" className="text-xs font-semibold text-slate-700 block mb-1">Doctor Phone</label>
                  <input id="studentprofile-doctor-phone"
                    type="tel"
                    value={medicalForm.doctor_phone || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, doctor_phone: e.target.value })}
                    placeholder="10-digit number"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="studentprofile-preferred-hospital-emergency-c" className="text-xs font-semibold text-slate-700 block mb-1">Preferred Hospital / Emergency Contact</label>
                  <input id="studentprofile-preferred-hospital-emergency-c"
                    type="text"
                    value={medicalForm.preferred_hospital || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, preferred_hospital: e.target.value })}
                    placeholder="e.g. Apollo Hospital, Main Street Branch"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="studentprofile-emergency-care-instructions" className="text-xs font-semibold text-slate-700 block mb-1">Emergency Care Instructions</label>
                  <textarea id="studentprofile-emergency-care-instructions"
                    rows={2}
                    value={medicalForm.emergency_instructions || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, emergency_instructions: e.target.value })}
                    placeholder="Immediate actions for staff during medical emergency..."
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingMedical(false)}
                  className="px-3 py-1.5 border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMedical}
                  className="px-4 py-1.5 bg-[#2158E0] text-white rounded-lg text-xs font-semibold hover:bg-[#1A46B8] cursor-pointer"
                >
                  {isSavingMedical ? "Saving..." : "Save Medical Record"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Known Allergies</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {medicalData?.allergies || "None reported"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Chronic Conditions</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {medicalData?.conditions || "None reported"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Current Medications</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {medicalData?.medications || "None"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Vision / Hearing Aids</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {medicalData?.vision_hearing_aids || "None"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Emergency Doctor</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {medicalData?.doctor_name ? `${medicalData.doctor_name} (${medicalData.doctor_phone || "No phone"})` : "Not specified"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Preferred Hospital</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {medicalData?.preferred_hospital || "Nearest Hospital"}
                </span>
              </div>
              {medicalData?.emergency_instructions && (
                <div className="md:col-span-2 p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-rose-900">
                  <span className="font-bold block mb-1">Emergency Care Instructions:</span>
                  <p>{medicalData.emergency_instructions}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. TIMELINE TAB */}
      {activeTab === "timeline" && (
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Student Activity & Events Timeline</h3>
              <p className="text-xs text-slate-500">Comprehensive chronological audit of admissions, fee collections, updates & records</p>
            </div>
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all", label: "All Events" },
                { id: "fee_payment", label: "Payments" },
                { id: "fee_invoice", label: "Invoices" },
                { id: "admission", label: "Admissions" },
                { id: "status", label: "Status & TC" },
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActivityCategoryFilter(chip.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activityCategoryFilter === chip.id
                      ? "bg-[#2158E0] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {activityTimeline.filter(item => activityCategoryFilter === "all" || item.category === activityCategoryFilter).length > 0 ? (
              activityTimeline
                .filter(item => activityCategoryFilter === "all" || item.category === activityCategoryFilter)
                .map(event => (
                  <div key={event.id} className="flex items-start gap-4 text-xs pb-4 border-b border-slate-100 last:border-b-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      event.category === "fee_payment" ? "bg-emerald-50 text-emerald-600" :
                      event.category === "fee_invoice" ? "bg-amber-50 text-amber-600" :
                      event.category === "status" ? "bg-indigo-50 text-indigo-600" :
                      "bg-blue-50 text-[#2158E0]"
                    }`}>
                      {event.category === "fee_payment" ? <CreditCard className="w-4 h-4" /> :
                       event.category === "fee_invoice" ? <FileText className="w-4 h-4" /> :
                       event.category === "status" ? <Activity className="w-4 h-4" /> :
                       <GraduationCap className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-bold text-slate-900 text-sm">{event.summary}</div>
                        <div className="text-slate-400 text-xs font-medium">
                          {new Date(event.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      {event.description && (
                        <div className="text-slate-600 text-xs mt-1">
                          {event.description}
                        </div>
                      )}
                      {event.financial && (
                        <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3 flex-wrap text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px] block">Amount</span>
                            <span className="font-bold font-mono text-emerald-600">{event.financial.amountFormatted}</span>
                          </div>
                          {event.financial.receiptNo && (
                            <div>
                              <span className="text-slate-500 text-[11px] block">Receipt / Ref #</span>
                              <span className="font-mono font-semibold text-slate-800">{event.financial.receiptNo}</span>
                            </div>
                          )}
                          {event.financial.paymentMode && (
                            <div>
                              <span className="text-slate-500 text-[11px] block">Payment Method</span>
                              <span className="uppercase font-semibold text-slate-700 text-[11px]">{event.financial.paymentMode}</span>
                            </div>
                          )}
                          {event.financial.status && (
                            <div>
                              <span className="text-slate-500 text-[11px] block">Status</span>
                              <span className="capitalize font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                {event.financial.status}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] uppercase font-semibold shrink-0">
                      {event.category.replace("_", " ")}
                    </span>
                  </div>
                ))
            ) : timelineEvents.length > 0 ? (
              timelineEvents.map(event => (
                <div key={event.id} className="flex items-start gap-4 text-xs pb-4 border-b border-slate-100 last:border-b-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 font-bold">
                    •
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{event.summary}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-medium">
                    {event.kind}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No activity events found for the selected filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. FEES TAB */}
      {activeTab === "fees" && profile && (
        <StudentLedgerTab
          studentId={profile.id}
          studentName={`${profile.first_name} ${profile.last_name}`.trim()}
        />
      )}

      {/* 9. TRANSPORT TAB (Spec C5.1, C5.3, C7) */}
      {activeTab === "transport" && (
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Transport & Bus Route
                </h3>
                <p className="text-xs text-slate-500">
                  {transportInfo?.assignment
                    ? `Assigned to ${transportInfo.assignment.route_name}`
                    : "No active transport assignment"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => navigate(`/admin/students/${profile.id}/edit?step=7`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-600" /> Edit Transport
              </button>
              {transportInfo?.assignment ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTransport(true);
                      setShowAssignDrawer(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Change route or stop
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAbsenceModal(true)}
                    className="px-3 py-1.5 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Mark not travelling
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStopModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Stop transport
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTransport(false);
                    setShowAssignDrawer(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  Add transport
                </button>
              )}
            </div>
          </div>

          {transportLoading ? (
            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-12 text-center text-slate-400 text-xs shadow-2xs">
              Loading transport details...
            </div>
          ) : transportInfo?.assignment ? (
            <div className="space-y-6">
              {/* Sibling Chip */}
              {transportInfo.siblings_on_route && transportInfo.siblings_on_route.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Sibling <strong>{transportInfo.siblings_on_route[0].student_name}</strong> ({transportInfo.siblings_on_route[0].class_name}) also travels on this route!
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700">Shares stop</span>
                </div>
              )}

              {/* Active Assignment Card */}
              <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-4">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Current Route
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 font-display">
                      {transportInfo.assignment.route_name}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Monthly Fee
                    </span>
                    <div className="text-base font-bold text-emerald-700 font-mono">
                      ₹{(transportInfo.assignment.monthly_fee_paise / 100).toLocaleString("en-IN")}/mo
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Pickup */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-[#E6EAF3] space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Pickup Stop
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {transportInfo.assignment.pickup_stop_name || "Assigned Stop"}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {transportInfo.assignment.pickup_time || "Morning"}
                    </div>
                  </div>

                  {/* Drop */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-[#E6EAF3] space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Drop Stop
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {transportInfo.assignment.drop_stop_name || transportInfo.assignment.pickup_stop_name || "Assigned Stop"}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {transportInfo.assignment.drop_time || "Afternoon"}
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-[#E6EAF3] space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500">Service: </span>
                      <span className="font-semibold text-slate-800 capitalize">
                        {transportInfo.assignment.service_type.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Effective: </span>
                      <span className="font-semibold text-slate-800">
                        {transportInfo.assignment.effective_from}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Handover: </span>
                      <span className="font-semibold text-slate-800">
                        {transportInfo.assignment.requires_guardian_handover
                          ? "Required at drop"
                          : "Standard release"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Absences / Not Travelling */}
              {transportInfo.absences && transportInfo.absences.length > 0 && (
                <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Scheduled Absences (Not Travelling)
                  </h4>
                  <div className="divide-y divide-[#E6EAF3]">
                    {transportInfo.absences.map((ab) => (
                      <div key={ab.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {ab.date_from} to {ab.date_to}
                          </span>
                          {ab.reason && <span className="text-slate-500">— {ab.reason}</span>}
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          Driver Notified
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment History */}
              {transportInfo.history && transportInfo.history.length > 1 && (
                <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Assignment History
                  </h4>
                  <div className="divide-y divide-[#E6EAF3] text-xs">
                    {transportInfo.history
                      .filter((h) => h.id !== transportInfo.assignment?.id)
                      .map((h) => (
                        <div key={h.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {h.route_name || "Route"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {h.effective_from} to {h.effective_to || "Ended"} • Reason: {h.end_reason || "Changed"}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Ended
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-12 text-center space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bus className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 font-display">
                  No Transport Assigned
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  This student does not have an active school bus or van route assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTransport(false);
                  setShowAssignDrawer(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                Add transport
              </button>
            </div>
          )}

          {/* Stop Modal */}
          {showStopModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E6EAF3] space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-display">Stop Transport</h3>
                    <p className="text-xs text-slate-500">
                      Unpaid future dues will be cancelled. Paid future dues become credit for owner review.
                    </p>
                  </div>
                  <button aria-label="Close"
                    type="button"
                    onClick={() => setShowStopModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label htmlFor="studentprofile-effective-date" className="font-semibold text-slate-700">Effective Date</label>
                    <input id="studentprofile-effective-date" aria-label="Effective Date"
                      type="date"
                      value={stopEffectiveDate}
                      onChange={(e) => setStopEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="studentprofile-reason-required" className="font-semibold text-slate-700">Reason (Required)</label>
                    <input id="studentprofile-reason-required"
                      type="text"
                      placeholder="e.g. Relocated closer to school / Parent opted out"
                      value={stopReason}
                      onChange={(e) => setStopReason(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E6EAF3] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStopModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={transportOpLoading || !stopReason.trim()}
                    onClick={async () => {
                      if (!transportInfo?.assignment) return;
                      setTransportOpLoading(true);
                      try {
                        const res = await stopAssignment(schoolId, transportInfo.assignment.id, {
                          effective_date: stopEffectiveDate,
                          reason: stopReason,
                        });
                        if (!res.success) {
                          alert(res.error || "Failed to stop transport");
                          return;
                        }
                        setShowStopModal(false);
                        setStopReason("");
                        loadTransport();
                      } finally {
                        setTransportOpLoading(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                  >
                    {transportOpLoading ? "Stopping..." : "Confirm stop"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Absence Modal */}
          {showAbsenceModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E6EAF3] space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-display">Mark Not Travelling</h3>
                    <p className="text-xs text-slate-500">
                      Alerts driver and attendant app so they do not wait at the stop.
                    </p>
                  </div>
                  <button aria-label="Close"
                    type="button"
                    onClick={() => setShowAbsenceModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="studentprofile-from-date" className="font-semibold text-slate-700">From Date</label>
                      <input id="studentprofile-from-date" aria-label="From Date"
                        type="date"
                        value={absenceFrom}
                        onChange={(e) => setAbsenceFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="studentprofile-to-date" className="font-semibold text-slate-700">To Date</label>
                      <input id="studentprofile-to-date" aria-label="To Date"
                        type="date"
                        value={absenceTo}
                        onChange={(e) => setAbsenceTo(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="studentprofile-reason" className="font-semibold text-slate-700">Reason</label>
                    <input id="studentprofile-reason"
                      type="text"
                      placeholder="e.g. Out of station / Sick"
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E6EAF3] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAbsenceModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={transportOpLoading}
                    onClick={async () => {
                      if (!profile) return;
                      setTransportOpLoading(true);
                      try {
                        const res = await recordAbsence(schoolId, {
                          student_id: profile.id,
                          date_from: absenceFrom,
                          date_to: absenceTo,
                          reason: absenceReason,
                        });
                        if (!res.success) {
                          alert(res.error || "Failed to record absence");
                          return;
                        }
                        setShowAbsenceModal(false);
                        setAbsenceReason("");
                        loadTransport();
                      } finally {
                        setTransportOpLoading(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#2158E0] text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {transportOpLoading ? "Saving..." : "Save absence"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assign / Change Drawer */}
          {showAssignDrawer && profile && (
            <AssignTransportDrawer
              isOpen={showAssignDrawer}
              onClose={() => setShowAssignDrawer(false)}
              schoolId={schoolId}
              studentId={profile.id}
              studentName={`${profile.first_name} ${profile.last_name || ""}`.trim()}
              className={profile.class_name}
              isPrePrimary={profile.class_name?.toLowerCase().includes("kg") || profile.class_name?.toLowerCase().includes("nursery")}
              academicYearId={profile.academic_year_id || undefined}
              existingAssignment={isEditingTransport ? transportInfo?.assignment : null}
              onSuccess={() => {
                setShowAssignDrawer(false);
                loadTransport();
              }}
            />
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* AADHAAR REVEAL MODAL */}
      {showAadhaarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E6EAF3] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">Audited Aadhaar Reveal</h3>
                  <span className="text-[11px] text-slate-500">DPDP Act 2023 Compliance Gate</span>
                </div>
              </div>
              <button aria-label="Close"
                type="button"
                onClick={() => {
                  setShowAadhaarModal(false);
                  setRevealedAadhaar(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {revealedAadhaar ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                    Plaintext Aadhaar Number
                  </div>
                  <div className="text-2xl font-mono font-bold text-slate-900 tracking-widest">
                    {revealedAadhaar}
                  </div>
                  <div className="text-xs text-emerald-700 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Reveal logged to audit trail
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                  <span>Auto-masking in: <strong>{aadhaarCountdown}s</strong></span>
                  <button
                    type="button"
                    onClick={handleCopyAadhaar}
                    className="flex items-center gap-1 font-semibold text-[#2158E0] hover:underline cursor-pointer"
                  >
                    {aadhaarCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {aadhaarCopied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRevealedAadhaar(null);
                    setShowAadhaarModal(false);
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Mask and Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRevealAadhaar} className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  Aadhaar reveal requires permission (<code>students.reveal_sensitive</code>) and a mandatory justification. Every reveal is recorded with your user ID and timestamp.
                </div>

                {aadhaarError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{aadhaarError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="studentprofile-reason-for-revealing-aadhaar" className="text-xs font-bold text-slate-700 block mb-1">
                    Reason for Revealing Aadhaar <span className="text-rose-500">*</span>
                  </label>
                  <textarea id="studentprofile-reason-for-revealing-aadhaar"
                    rows={2}
                    required
                    value={aadhaarReason}
                    onChange={e => setAadhaarReason(e.target.value)}
                    placeholder="e.g. Government scholarship verification, Board exam registration..."
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAadhaarModal(false)}
                    className="px-3 py-2 border border-[#E6EAF3] text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRevealingAadhaar || !aadhaarReason.trim()}
                    className="px-4 py-2 bg-[#2158E0] hover:bg-[#1A46B8] disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                  >
                    {isRevealingAadhaar ? "Verifying & Decrypting..." : "Reveal Plaintext"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* REJECT DOCUMENT MODAL */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E6EAF3] space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 font-display">Reject Document</h3>
            <p className="text-xs text-slate-500">
              Provide a clear reason for rejecting this document. This reason will be communicated to the parent.
            </p>

            <form onSubmit={handleRejectDoc} className="space-y-4">
              <div>
                <label htmlFor="studentprofile-rejection-reason" className="text-xs font-semibold text-slate-700 block mb-1">Rejection Reason</label>
                <textarea id="studentprofile-rejection-reason"
                  rows={2}
                  required
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Document is blurred, expired date, wrong student name..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E6EAF3] focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingDocId(null)}
                  className="px-3 py-1.5 border border-[#E6EAF3] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Reject Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E6EAF3] space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 font-display">Upload Student Document</h3>

            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div>
                <label htmlFor="studentprofile-document-type" className="text-xs font-semibold text-slate-700 block mb-1">Document Type</label>
                <select id="studentprofile-document-type" aria-label="Document Type"
                  value={uploadDocType}
                  onChange={e => setUploadDocType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                >
                  <option value="birth_certificate">Birth Certificate</option>
                  <option value="previous_tc">Transfer Certificate (TC)</option>
                  <option value="report_card">Previous Report Card</option>
                  <option value="address_proof">Address Proof</option>
                  <option value="passport_photo">Passport Photo</option>
                  <option value="aadhaar_copy">Aadhaar Copy</option>
                  <option value="category_certificate">Category Certificate</option>
                  <option value="income_certificate">Income Certificate</option>
                  <option value="immunisation_record">Immunisation Record</option>
                </select>
              </div>

              <div>
                <label htmlFor="studentprofile-file-name" className="text-xs font-semibold text-slate-700 block mb-1">File Name</label>
                <input id="studentprofile-file-name"
                  type="text"
                  required
                  value={uploadFileName}
                  onChange={e => setUploadFileName(e.target.value)}
                  placeholder="e.g. birth_cert_official.pdf"
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E6EAF3] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFileName.trim()}
                  className="px-4 py-1.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW OVERLAY */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E6EAF3] space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2158E0]" />
                <h3 className="text-sm font-bold text-slate-900 font-display capitalize">
                  {selectedDocPreview.doc_type.replace(/_/g, " ")} Preview
                </h3>
              </div>
              <button aria-label="Close"
                type="button"
                onClick={() => setSelectedDocPreview(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-64 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-2">
              <FileCheck className="w-12 h-12 text-[#2158E0]" />
              <div className="text-sm font-semibold text-slate-800">{selectedDocPreview.file_name}</div>
              <div className="text-xs text-slate-400 font-mono">{selectedDocPreview.storage_path}</div>
              <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md uppercase font-medium">
                Signed URL Secure Stream Preview
              </span>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDocPreview(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT ADMISSION FORM MODAL */}
      {isPrintAdmissionOpen && profile && (
        <PrintAdmissionForm
          isOpen={isPrintAdmissionOpen}
          onClose={() => setIsPrintAdmissionOpen(false)}
          profile={profile}
          school={school}
        />
      )}

      {/* LINK SIBLING MODAL */}
      {isLinkSiblingModalOpen && profile && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E6EAF3] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">Link Sibling</h3>
                  <p className="text-xs text-slate-500">Connect a brother or sister to {profile.first_name}'s family</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLinkSiblingModalOpen(false);
                  setSiblingSearchQuery("");
                  setSelectedSiblingToLink(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Search Student
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={siblingSearchQuery}
                  onChange={(e) => setSiblingSearchQuery(e.target.value)}
                  placeholder="Search by student name, admission number, parent phone..."
                  className="w-full pl-9 pr-9 py-2 border border-[#E6EAF3] rounded-xl text-xs focus:ring-2 focus:ring-[#2158E0] focus:border-transparent outline-none"
                  autoFocus
                />
                {isSearchingSiblings && (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {siblingSearchQuery.trim() === "" ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Type a student name, admission number, or parent mobile to search.
                </div>
              ) : isSearchingSiblings ? (
                <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Searching students...
                </div>
              ) : siblingSearchResults.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No matching students found in this school.
                </div>
              ) : (
                siblingSearchResults.map((candidate) => {
                  const isSelected = selectedSiblingToLink?.id === candidate.id;
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => setSelectedSiblingToLink(candidate)}
                      className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400"
                          : "bg-white border-slate-200 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2158E0] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {candidate.photo_path ? (
                            <img src={candidate.photo_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                            `${candidate.first_name[0] || ""}${candidate.last_name[0] || ""}`.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {candidate.first_name} {candidate.last_name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Adm: {candidate.admission_no} • {candidate.class_name ? `Class ${candidate.class_name}` : "Enrolled"}
                            {candidate.section_name ? ` - ${candidate.section_name}` : ""}
                          </div>
                          {candidate.parent_name && (
                            <div className="text-[10px] text-slate-400 truncate">
                              Parent: {candidate.parent_name} {candidate.parent_phone ? `(${candidate.parent_phone})` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            isSelected ? "bg-[#2158E0] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedSiblingToLink && (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Ready to link <strong>{selectedSiblingToLink.first_name} {selectedSiblingToLink.last_name}</strong> as sibling of <strong>{profile.first_name}</strong>.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsLinkSiblingModalOpen(false);
                  setSiblingSearchQuery("");
                  setSelectedSiblingToLink(null);
                }}
                className="px-4 py-2 border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSiblingToLink || isLinkingSibling}
                onClick={handleConfirmLinkSibling}
                className="px-4 py-2 bg-[#2158E0] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLinkingSibling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Linking...
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" /> Confirm Sibling Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNLINK SIBLING CONFIRMATION MODAL */}
      {unlinkSiblingTarget && profile && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E6EAF3] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Unlink Sibling</h3>
                <p className="text-xs text-slate-500">Confirm disconnection of sibling records</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to unlink <strong>{unlinkSiblingTarget.sibling_first_name} {unlinkSiblingTarget.sibling_last_name}</strong> ({unlinkSiblingTarget.sibling_admission_no}) as a sibling of <strong>{profile.first_name} {profile.last_name}</strong>?
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              This will disconnect their shared sibling profile view. Both student records will remain fully intact in their respective classes.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnlinkSiblingTarget(null)}
                className="px-4 py-2 border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnlinkingSibling}
                onClick={handleConfirmUnlinkSibling}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUnlinkingSibling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Unlinking...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Unlink Sibling
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE STUDENT MODAL */}
      {isDeleteModalOpen && profile && (
        <DeleteStudentModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          schoolId={schoolId}
          student={{
            id: profile.id,
            name: `${profile.first_name} ${profile.last_name}`,
            admission_no: profile.admission_no,
            class_name: profile.class_name || undefined,
          }}
          onSuccess={() => {
            navigate("/admin/students");
          }}
        />
      )}
    </div>
  );
}

