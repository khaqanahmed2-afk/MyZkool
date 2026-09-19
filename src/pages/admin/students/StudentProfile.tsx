import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Printer,
  Edit2,
  MoreVertical,
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
  Plus,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import type { StudentProfile, StudentEvent, ParentRelation } from "../../../types/students";
import { getStudentProfile, updateStudent, getStudentSiblings } from "../../../services/studentService";

type ProfileTab = "overview" | "personal" | "family" | "academics" | "fees" | "transport" | "documents" | "medical" | "timeline";

export default function StudentProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schoolId: authSchoolId, profile: currentUserProfile } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

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

  // Timeline event note state
  const [newNote, setNewNote] = useState("");
  const [timelineEvents, setTimelineEvents] = useState<StudentEvent[]>([]);

  const schoolId = authSchoolId || "default-school";

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
          className="px-4 py-2 bg-[#2158E0] text-white rounded-xl text-xs font-semibold"
        >
          Back to students
        </button>
      </div>
    );
  }

  const primaryParent = profile.parents.find(p => p.is_primary_contact) || profile.parents[0];
  const initials = `${profile.first_name[0] || ""}${profile.last_name[0] || ""}`.toUpperCase();

  // Compute age from DOB
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
              onClick={() => alert("Collect fee dialog")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" /> Collect fee
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
          { id: "overview", label: "Overview", icon: Activity },
          { id: "personal", label: "Personal", icon: Edit2 },
          { id: "family", label: "Family", icon: Shield },
          { id: "academics", label: "Academics", icon: Calendar },
          { id: "timeline", label: "Timeline", icon: History },
          { id: "fees", label: "Fees", icon: CreditCard },
          { id: "transport", label: "Transport", icon: Bus },
          { id: "documents", label: "Documents", icon: FileText },
        ].map(tab => {
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
            {/* Key Facts */}
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

            {/* Latest Timeline Events */}
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
            {/* Sibling Cards */}
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

            {/* Fee Summary */}
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

      {/* 2. PERSONAL TAB (With inline editing and audit rows) */}
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

            {/* Aadhaar Reveal row */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Aadhaar number (Masked by default)</span>
                <span className="text-[11px] text-slate-500 font-normal">Protected under DPDP Act 2023</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-slate-800 tracking-wider">
                  •••• •••• {profile.aadhaar_last4 || "XXXX"}
                </span>
                <button
                  type="button"
                  onClick={() => alert("Aadhaar reveal requires 'students.reveal_sensitive' permission and a stated reason. It is audited and auto-masked after 30 seconds.")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" /> Reveal
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
                    <div className="font-semibold text-slate-800">Academic year: 2026–27</div>
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

      {/* 5. TIMELINE TAB */}
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

      {/* 6. PLACEHOLDER TABS (Fees, Transport, Documents) */}
      {(activeTab === "fees" || activeTab === "transport" || activeTab === "documents") && (
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display capitalize">
            {activeTab} module placeholder
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This tab will be fully functional in Stage 3 and subsequent module implementations according to spec D1 boundaries.
          </p>
        </div>
      )}
    </div>
  );
}
