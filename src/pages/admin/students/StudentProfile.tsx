import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Printer,
  Edit2,
  Calendar,
  CreditCard,
  Bus,
  Shield,
  FileText,
  Activity,
  History,
  AlertCircle,
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
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import type {
  StudentProfile,
  StudentEvent,
  StudentDocument,
  StudentMedical,
  StudentMedicalInput,
  StudentPermissionKey,
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
} from "../../../services/studentService";
import TransferCertificateModal from "./TransferCertificateModal";

type ProfileTab = "overview" | "personal" | "family" | "academics" | "fees" | "transport" | "documents" | "medical" | "timeline";

export default function StudentProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schoolId: authSchoolId, profile: currentUserProfile } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const schoolId = authSchoolId || "default-school";
  const userRole = (currentUserProfile?.role || "admin").toLowerCase();
  const userPermissions: StudentPermissionKey[] =
    STUDENT_ROLE_PERMISSIONS[userRole as keyof typeof STUDENT_ROLE_PERMISSIONS] || [];
  const canReadMedical = userRole === "owner" || userPermissions.includes("students.medical.read");
  const canWriteMedical = userRole === "owner" || userPermissions.includes("students.medical.write");

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
  }, [id, schoolId]);

  // Load medical records if activeTab is medical
  useEffect(() => {
    if (activeTab === "medical" && id && schoolId && canReadMedical) {
      setMedicalLoading(true);
      setMedicalError(null);
      getStudentMedical(schoolId, id, userPermissions)
        .then(res => {
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
        })
        .finally(() => setMedicalLoading(false));
    }
  }, [activeTab, id, schoolId, canReadMedical]);

  // Aadhaar auto-mask countdown timer
  useEffect(() => {
    if (revealedAadhaar) {
      setAadhaarCountdown(30);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setAadhaarCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setRevealedAadhaar(null);
            setShowAadhaarModal(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealedAadhaar]);

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
    setIsSaving(false);
  };

  const handleSaveMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !schoolId) return;

    setIsSavingMedical(true);
    const actorId = currentUserProfile?.id || "user-admin";

    const res = await updateStudentMedical(
      schoolId,
      id,
      medicalForm,
      actorId,
      userRole,
      userPermissions
    );

    setIsSavingMedical(false);
    if (res.error) {
      alert(`Failed to update medical details: ${res.error}`);
    } else if (res.medical) {
      setMedicalData(res.medical);
      setIsEditingMedical(false);
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

  if (loading) {
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/admin/students"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to students
        </Link>
      </div>

      {/* Header Card (Spec A4.3) */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Photo Avatar */}
            <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-slate-200 text-[#2158E0] flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden shadow-xs relative group cursor-pointer">
              {profile.photo_path ? (
                <img src={profile.photo_path} alt={profile.first_name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 font-display">
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

              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                  {profile.admission_no}
                </span>
                <span>•</span>
                <span>Age: {computeAge(profile.dob)} years</span>
                <span>•</span>
                <span>Admitted: {profile.admission_date}</span>
              </div>

              {primaryParent && (
                <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
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
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                  >
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab("personal");
                setIsEditingPersonal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => alert("Fee module dialog")}
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
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print ID
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
                onClick={() => setActiveTab(tab.id as ProfileTab)}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 font-display mb-4">Key facts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Date of birth</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{profile.dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Gender</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block capitalize">{profile.gender}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Category</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block uppercase">{profile.category || "General"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Blood group</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{profile.blood_group || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nationality</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{profile.nationality}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mother tongue</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{profile.mother_tongue || "—"}</span>
                </div>
              </div>
            </div>

            {/* Recent Timeline */}
            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 font-display mb-4">Recent activity</h3>
              {timelineEvents.length > 0 ? (
                <div className="space-y-3">
                  {timelineEvents.slice(0, 3).map(event => (
                    <div key={event.id} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                      <div className="w-2 h-2 rounded-full bg-[#2158E0] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{event.summary}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{new Date(event.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">No timeline events recorded yet.</div>
              )}
            </div>
          </div>

          {/* Right Rail */}
          <div className="space-y-6">
            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 font-display mb-3">Siblings in school</h3>
              {profile.siblings.length > 0 ? (
                <div className="space-y-2">
                  {profile.siblings.map(sib => (
                    <div
                      key={sib.sibling_id}
                      onClick={() => navigate(`/admin/students/${sib.sibling_id}`)}
                      className="p-2.5 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <div className="text-xs font-semibold text-slate-900">
                        {sib.sibling_first_name} {sib.sibling_last_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sib.sibling_admission_no} • {sib.sibling_class_name || "Grade"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">No siblings detected in school.</div>
              )}
            </div>

            <div className="bg-white border border-[#E6EAF3] rounded-xl p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 font-display mb-2">Fee status</h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Balance</span>
                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ₹0 (Paid up)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSONAL TAB (With inline editing and Audited Aadhaar reveal) */}
      {activeTab === "personal" && (
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 font-display">Personal details & identity</h3>
            {!isEditingPersonal ? (
              <button
                type="button"
                onClick={() => setIsEditingPersonal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-[#2158E0] hover:bg-blue-50 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit details
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

          <form onSubmit={handleSavePersonal} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">First name</label>
                {isEditingPersonal ? (
                  <input
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Last name</label>
                {isEditingPersonal ? (
                  <input
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date of birth</label>
                {isEditingPersonal ? (
                  <input
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Gender</label>
                {isEditingPersonal ? (
                  <select
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                {isEditingPersonal ? (
                  <select
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Blood group</label>
                {isEditingPersonal ? (
                  <input
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
        </div>
      )}

      {/* 4. ACADEMICS TAB */}
      {activeTab === "academics" && (
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 font-display">Enrollment history</h3>
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
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Upload document
            </button>
          </div>

          {docOperationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
              <span>{docOperationError}</span>
              <button type="button" onClick={() => setDocOperationError(null)} className="cursor-pointer">
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
                            onClick={() => {
                              const newName = prompt("Enter new document file name to supersede this record:");
                              if (newName) {
                                const actorId = currentUserProfile?.id || "user-admin";
                                replaceStudentDocument(
                                  schoolId,
                                  doc.id,
                                  {
                                    doc_type: doc.doc_type,
                                    file_name: newName,
                                    mime: newName.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
                                    status: "uploaded",
                                  },
                                  actorId
                                ).then(res => {
                                  if (res.document) {
                                    setDocsList(prev => prev.map(d => (d.id === doc.id ? res.document! : d)));
                                  }
                                });
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
              <button
                type="button"
                onClick={() => setIsEditingMedical(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-[#2158E0] hover:bg-blue-50 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit medical details
              </button>
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Known Allergies</label>
                  <input
                    type="text"
                    value={medicalForm.allergies || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, allergies: e.target.value })}
                    placeholder="e.g. Peanuts, Penicillin, Dust"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Chronic Conditions</label>
                  <input
                    type="text"
                    value={medicalForm.conditions || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, conditions: e.target.value })}
                    placeholder="e.g. Asthma, Diabetes, Epilepsy"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Current Medications</label>
                  <input
                    type="text"
                    value={medicalForm.medications || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, medications: e.target.value })}
                    placeholder="e.g. Inhaler twice daily"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Vision / Hearing Aids</label>
                  <input
                    type="text"
                    value={medicalForm.vision_hearing_aids || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, vision_hearing_aids: e.target.value })}
                    placeholder="e.g. Spectacles (-2.5), Hearing aid left ear"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Family Doctor Name</label>
                  <input
                    type="text"
                    value={medicalForm.doctor_name || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, doctor_name: e.target.value })}
                    placeholder="Dr. Sharma"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Doctor Phone</label>
                  <input
                    type="tel"
                    value={medicalForm.doctor_phone || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, doctor_phone: e.target.value })}
                    placeholder="10-digit number"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Preferred Hospital / Emergency Contact</label>
                  <input
                    type="text"
                    value={medicalForm.preferred_hospital || ""}
                    onChange={e => setMedicalForm({ ...medicalForm, preferred_hospital: e.target.value })}
                    placeholder="e.g. Apollo Hospital, Main Street Branch"
                    className="w-full text-xs p-2 rounded-lg border border-[#E6EAF3] focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Emergency Care Instructions</label>
                  <textarea
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
          <h3 className="text-base font-bold text-slate-900 font-display">Student events timeline</h3>

          <div className="space-y-4">
            {timelineEvents.map(event => (
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
            ))}
          </div>
        </div>
      )}

      {/* 8. PLACEHOLDER TABS (Fees, Transport) */}
      {(activeTab === "fees" || activeTab === "transport") && (
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display capitalize">
            {activeTab} module placeholder
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This tab will integrate with Part B and Pro modules according to spec boundaries.
          </p>
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
              <button
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Reason for Revealing Aadhaar <span className="text-rose-500">*</span>
                  </label>
                  <textarea
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Rejection Reason</label>
                <textarea
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Document Type</label>
                <select
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">File Name</label>
                <input
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
              <button
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
    </div>
  );
}

