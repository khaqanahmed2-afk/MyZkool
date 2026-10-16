import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Share2,
  ExternalLink,
  ShieldCheck,
  Edit2,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  getTransportStaff,
  createTransportStaff,
  updateTransportStaff,
  deleteTransportStaff,
  generateDriverAppInvite,
  maskIdProof,
  extract10DigitPhone,
} from "../../../services/transportCoreService";
import { encryptSensitive } from "../../../utils/sensitiveCrypto";
import type {
  EnrichedStaff,
  StaffType,
  TransportStaff,
} from "../../../types/transport";
import { useAuth } from "../../../hooks/useAuth";
import { checkSchoolFeature } from "../../../middleware/features";
import { TransportLockedPreview } from "./TransportLockedPreview";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function TransportStaffPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [staffList, setStaffList] = useState<EnrichedStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Safe Back Navigation
  const handleBack = () => {
    if (showModal && (fullName.trim() || phone10.trim() || licenseNo.trim())) {
      if (!window.confirm("You have unsaved staff details. Are you sure you want to discard them and go back?")) {
        return;
      }
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/admin/transport");
    }
  };

  // Add / Edit staff modal state
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<EnrichedStaff | null>(null);
  const [fullName, setFullName] = useState("");
  const [staffType, setStaffType] = useState<StaffType>("driver");
  const [phone10, setPhone10] = useState("");
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseExpiresOn, setLicenseExpiresOn] = useState("");
  const [badgeNo, setBadgeNo] = useState("");
  const [policeVerifiedOn, setPoliceVerifiedOn] = useState("");
  const [medicalFitOn, setMedicalFitOn] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success / error banner
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Invite modal state
  const [inviteResult, setInviteResult] = useState<{
    staffName: string;
    whatsappUrl: string;
    inviteToken: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    checkSchoolFeature(schoolId, "transport").then((enabled) => {
      setHasFeature(enabled);
      if (enabled) loadStaff();
      else setLoading(false);
    });
  }, [schoolId]);

  async function loadStaff() {
    if (!schoolId) return;
    setLoading(true);
    const data = await getTransportStaff(schoolId);
    setStaffList(data);
    setLoading(false);
  }

  function handleOpenAdd() {
    setEditingStaff(null);
    setFullName("");
    setStaffType("driver");
    setPhone10("");
    setAadhaarInput("");
    setLicenseNo("");
    setLicenseExpiresOn("");
    setBadgeNo("");
    setPoliceVerifiedOn("");
    setMedicalFitOn("");
    setFormError("");
    setShowModal(true);
  }

  function handleOpenEdit(staff: EnrichedStaff) {
    setEditingStaff(staff);
    setFullName(staff.full_name);
    setStaffType(staff.staff_type);
    setPhone10(extract10DigitPhone(staff.phone));
    setAadhaarInput(""); // Kept empty so user can leave unchanged or type full 12 digits
    setLicenseNo(staff.license_no || "");
    setLicenseExpiresOn(staff.license_expires_on || "");
    setBadgeNo(staff.badge_no || "");
    setPoliceVerifiedOn(staff.police_verified_on || "");
    setMedicalFitOn(staff.medical_fit_on || "");
    setFormError("");
    setShowModal(true);
  }

  async function handleSaveStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setFormError("");

    const cleanName = fullName.trim();
    if (!cleanName) {
      setFormError("Full Name is required.");
      return;
    }

    const cleanPhone10 = phone10.trim().replace(/\D/g, "");
    if (cleanPhone10.length !== 10) {
      setFormError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    const cleanAadhaar = aadhaarInput.trim().replace(/\D/g, "");
    if (!editingStaff) {
      // Adding: Aadhaar is mandatory and must be exactly 12 digits
      if (cleanAadhaar.length !== 12) {
        setFormError("Aadhaar Number must be exactly 12 numeric digits.");
        return;
      }
    } else {
      // Editing: If user typed any digits, it must be exactly 12 digits
      if (cleanAadhaar.length > 0 && cleanAadhaar.length !== 12) {
        setFormError("Aadhaar Number must be exactly 12 numeric digits.");
        return;
      }
    }

    // Role-specific validations
    if (staffType === "driver") {
      if (!licenseNo.trim()) {
        setFormError("License Number is required for Bus Drivers.");
        return;
      }
      if (!licenseExpiresOn) {
        setFormError("License Expiry Date is required for Bus Drivers.");
        return;
      }
    }

    setIsSubmitting(true);

    if (editingStaff) {
      // Update existing record
      const updatePayload: Partial<TransportStaff> = {
        full_name: cleanName,
        staff_type: staffType,
        phone: `+91${cleanPhone10}`,
        police_verified_on: policeVerifiedOn || null,
        medical_fit_on: medicalFitOn || null,
        badge_no: badgeNo.trim() || null,
        license_no: staffType === "driver" ? licenseNo.trim().toUpperCase() : null,
        license_expires_on: staffType === "driver" ? licenseExpiresOn : null,
      };

      if (cleanAadhaar.length === 12) {
        updatePayload.id_proof_type = "Aadhaar";
        updatePayload.id_proof_last4 = cleanAadhaar.slice(-4);
        try {
          updatePayload.aadhaar_enc = encryptSensitive(cleanAadhaar).packed;
        } catch {
          // If encryption fails in environment, keep clean last4
        }
      }

      const res = await updateTransportStaff(schoolId, editingStaff.id, updatePayload);
      setIsSubmitting(false);

      if (!res.success) {
        setFormError(res.error || "Failed to update staff member.");
        return;
      }

      setShowModal(false);
      setToast({
        type: "success",
        message: `Staff member "${cleanName}" updated successfully.`,
      });
      loadStaff();
    } else {
      // Create new record
      let aadhaarEnc: string | null = null;
      try {
        aadhaarEnc = encryptSensitive(cleanAadhaar).packed;
      } catch {
        aadhaarEnc = null;
      }

      const res = await createTransportStaff(schoolId, {
        staff_type: staffType,
        full_name: cleanName,
        phone: `+91${cleanPhone10}`,
        license_no: staffType === "driver" ? licenseNo.trim().toUpperCase() : null,
        license_expires_on: staffType === "driver" ? licenseExpiresOn : null,
        badge_no: badgeNo.trim() || null,
        police_verified_on: policeVerifiedOn || null,
        medical_fit_on: medicalFitOn || null,
        id_proof_type: "Aadhaar",
        id_proof_last4: cleanAadhaar.slice(-4),
        aadhaar_enc: aadhaarEnc,
        joined_on: new Date().toISOString().split("T")[0],
        status: "active",
      });
      setIsSubmitting(false);

      if (!res.success) {
        setFormError(res.error || "Failed to register transport staff.");
        return;
      }

      setShowModal(false);
      setToast({
        type: "success",
        message: `Staff member "${cleanName}" registered successfully.`,
      });
      loadStaff();
    }
  }

  async function handleDelete(s: EnrichedStaff) {
    if (!schoolId) return;
    if (!confirm(`Are you sure you want to deactivate ${s.full_name}?`)) return;
    const res = await deleteTransportStaff(schoolId, s.id);
    if (!res.success) {
      setToast({
        type: "error",
        message: res.error || "Failed to deactivate staff member.",
      });
      return;
    }
    setToast({
      type: "success",
      message: `Staff member "${s.full_name}" deactivated successfully.`,
    });
    loadStaff();
  }

  function handleInvite(s: EnrichedStaff) {
    const invite = generateDriverAppInvite(s, "MyZkool Academy");
    setInviteResult({
      staffName: s.full_name,
      whatsappUrl: invite.whatsappUrl,
      inviteToken: invite.inviteToken,
      message: invite.message,
    });
  }

  if (hasFeature === false) {
    return <TransportLockedPreview />;
  }

  const filtered = staffList.filter((s) => {
    const q = search.toLowerCase();
    const matchQuery =
      s.full_name.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.license_no && s.license_no.toLowerCase().includes(q));
    const matchRole = roleFilter === "all" || s.staff_type === roleFilter;
    return matchQuery && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            {toast.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-bold text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 shadow-sm transition-all cursor-pointer"
            title="Return to Transport Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#2158E0]" />
            <span>Back to Transport</span>
          </button>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
              Drivers & Attendants
            </h1>
            <p className="text-xs text-[#5B6478]">
              Manage driver licenses, police verification dates, and app invites
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E6EAF3] shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or license number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E6EAF3] text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs font-semibold bg-white"
          >
            <option value="all">All Roles</option>
            <option value="driver">Drivers Only</option>
            <option value="attendant">Attendants Only</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-[#E6EAF3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5B6478]">
            Loading drivers and attendants...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-[#141A2E]">No transport staff found</p>
            <p className="text-xs text-[#5B6478]">
              {search ? "No staff member matches your search." : "Start by registering your first driver or bus attendant."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-[#F8FAFC] text-[#5B6478] font-bold">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">License & Expiry</th>
                  <th className="py-3 px-4">Police Verification</th>
                  <th className="py-3 px-4">ID Proof</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3]">
                {filtered.map((s) => {
                  const lChip = s.license_status;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#141A2E]">
                        {s.full_name}
                        {s.assigned_routes && s.assigned_routes.length > 0 && (
                          <p className="text-[11px] text-[#2158E0] font-semibold">
                            Route {s.assigned_routes.map((r) => r.code).join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            s.staff_type === "driver"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {s.staff_type === "driver" ? "Bus Driver" : "Attendant"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#141A2E]">
                        {s.phone}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.staff_type === "driver" ? (
                          <div className="space-y-1">
                            <span className="font-semibold text-[#141A2E]">
                              {s.license_no || "N/A"}
                            </span>
                            {s.license_expires_on && (
                              <p className="text-[11px] text-[#5B6478]">
                                Exp: {formatDate(s.license_expires_on)}
                              </p>
                            )}
                            {lChip && (
                              <div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    lChip.color === "green"
                                      ? "bg-green-100 text-green-800"
                                      : lChip.color === "red"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {lChip.label}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#5B6478] italic">Not applicable</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.police_verified_on ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {formatDate(s.police_verified_on)}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#5B6478]">
                        {maskIdProof(s.id_proof_last4)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInvite(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-bold transition-colors text-[11px] cursor-pointer"
                            title="Invite to Driver App"
                          >
                            <Share2 className="w-3 h-3" />
                            Invite
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2158E0] font-bold transition-colors text-[11px] cursor-pointer"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Deactivate Staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#E6EAF3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#141A2E]">
                  {editingStaff ? "Edit Staff Member" : "Register Driver / Attendant"}
                </h2>
                <p className="text-[11px] text-[#5B6478]">
                  {editingStaff
                    ? `Updating details for ${editingStaff.full_name}`
                    : "Fill in the required transport staff credentials"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-bold focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={staffType}
                    onChange={(e) => setStaffType(e.target.value as StaffType)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                  >
                    <option value="driver">Bus Driver</option>
                    <option value="attendant">Bus Attendant / Conductor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-[#E6EAF3] bg-gray-50 text-[#5B6478] font-bold text-xs select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      value={phone10}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.startsWith("91") && val.length > 10) {
                          val = val.slice(2);
                        }
                        setPhone10(val.slice(0, 10));
                      }}
                      className="w-full px-3 py-2 rounded-r-lg border border-[#E6EAF3] font-bold focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-[#5B6478] mt-0.5">10-digit Indian number</p>
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Aadhaar Number {editingStaff ? "" : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder={
                      editingStaff && editingStaff.id_proof_last4
                        ? `Current: ${maskIdProof(editingStaff.id_proof_last4)}`
                        : "12-digit number"
                    }
                    value={aadhaarInput}
                    onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                    required={!editingStaff}
                  />
                  <p className="text-[10px] text-[#5B6478] mt-0.5">
                    {editingStaff && editingStaff.id_proof_last4
                      ? "Leave empty to keep existing Aadhaar, or enter 12 digits to update."
                      : "Enter complete 12 numeric digits."}
                  </p>
                </div>
              </div>

              {/* Driver-only fields */}
              {staffType === "driver" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
                    <span>Driver Licensing Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5B6478] mb-1 font-semibold">
                        License Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DL-1420110012345"
                        value={licenseNo}
                        onChange={(e) => setLicenseNo(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white uppercase font-bold focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[#5B6478] mb-1 font-semibold">
                        License Expiry Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={licenseExpiresOn}
                        onChange={(e) => setLicenseExpiresOn(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#5B6478] mb-1 font-semibold">
                      Badge Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BDG-99882"
                      value={badgeNo}
                      onChange={(e) => setBadgeNo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Police Verification Date
                  </label>
                  <input
                    type="date"
                    value={policeVerifiedOn}
                    onChange={(e) => setPoliceVerifiedOn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Medical Fitness Date
                  </label>
                  <input
                    type="date"
                    value={medicalFitOn}
                    onChange={(e) => setMedicalFitOn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E6EAF3]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2158E0] text-white font-bold hover:bg-blue-600 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingStaff
                    ? "Update Staff Member"
                    : "Save Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver App Invite Modal */}
      {inviteResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-[#E6EAF3]">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <h2 className="text-base font-bold text-[#141A2E]">
                Invite to Driver App
              </h2>
              <button onClick={() => setInviteResult(null)} className="text-gray-400 hover:text-gray-600 p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#5B6478]">
                Send this WhatsApp invite link to <span className="font-bold text-[#141A2E]">{inviteResult.staffName}</span>. The driver will sign in directly with their phone number and a one-time OTP code:
              </p>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 font-mono text-[11px] break-words text-gray-700">
                {inviteResult.message}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInviteResult(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold hover:bg-gray-50 cursor-pointer"
              >
                Close
              </button>
              <a
                href={inviteResult.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Send on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TransportStaffPage;
