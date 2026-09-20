import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  getTransportStaff,
  createTransportStaff,
  deleteTransportStaff,
  generateDriverAppInvite,
  maskIdProof,
} from "../../../services/transportCoreService";
import type {
  EnrichedStaff,
  StaffType,
  TransportStaff,
} from "../../../types/transport";
import { useAuth } from "../../../hooks/useAuth";
import { checkSchoolFeature } from "../../../middleware/features";
import { TransportLockedPreview } from "./TransportLockedPreview";

export function TransportStaffPage() {
  const { schoolId } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [staffList, setStaffList] = useState<EnrichedStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Add staff modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [staffType, setStaffType] = useState<StaffType>("driver");
  const [phone, setPhone] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseExpiresOn, setLicenseExpiresOn] = useState("");
  const [badgeNo, setBadgeNo] = useState("");
  const [policeVerifiedOn, setPoliceVerifiedOn] = useState("");
  const [medicalFitOn, setMedicalFitOn] = useState("");
  const [idProofLast4, setIdProofLast4] = useState("");
  const [addError, setAddError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setAddError("");
    setIsSubmitting(true);

    const res = await createTransportStaff(schoolId, {
      staff_type: staffType,
      full_name: fullName.trim(),
      phone: phone.trim(),
      license_no: staffType === "driver" ? licenseNo.trim() || null : null,
      license_expires_on: staffType === "driver" ? licenseExpiresOn || null : null,
      badge_no: badgeNo.trim() || null,
      police_verified_on: policeVerifiedOn || null,
      medical_fit_on: medicalFitOn || null,
      id_proof_type: "Aadhaar",
      id_proof_last4: idProofLast4.slice(-4) || null,
      joined_on: new Date().toISOString().split("T")[0],
      status: "active",
    });

    setIsSubmitting(false);
    if (!res.success) {
      setAddError(res.error || "Failed to register transport staff.");
      return;
    }

    setShowAddModal(false);
    setFullName("");
    setPhone("");
    setLicenseNo("");
    setLicenseExpiresOn("");
    setBadgeNo("");
    setPoliceVerifiedOn("");
    setMedicalFitOn("");
    setIdProofLast4("");
    loadStaff();
  }

  async function handleDelete(s: EnrichedStaff) {
    if (!schoolId) return;
    if (!confirm(`Are you sure you want to deactivate ${s.full_name}?`)) return;
    const res = await deleteTransportStaff(schoolId, s.id);
    if (!res.success) {
      alert(res.error || "Failed to deactivate staff member.");
      return;
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
            Drivers & Attendants
          </h1>
          <p className="text-xs text-[#5B6478]">
            Manage driver licenses, police verification dates, and app invites
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-colors"
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
                        {s.assigned_routes.length > 0 && (
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
                          {s.staff_type}
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
                            {s.police_verified_on}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#5B6478]">
                        {maskIdProof(s.id_proof_last4)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleInvite(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-green-50 hover:bg-green-100 text-green-700 font-bold transition-colors text-[11px]"
                            title="Invite to Driver App"
                          >
                            <Share2 className="w-3 h-3" />
                            Invite
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#E6EAF3]">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <h2 className="text-base font-bold text-[#141A2E]">Register Driver / Attendant</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Role</label>
                  <select
                    value={staffType}
                    onChange={(e) => setStaffType(e.target.value as StaffType)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
                  >
                    <option value="driver">Bus Driver</option>
                    <option value="attendant">Bus Attendant / Conductor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Mobile Phone (WhatsApp login)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Aadhaar Last 4 Digits (Masked)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 5678"
                    value={idProofLast4}
                    onChange={(e) => setIdProofLast4(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-mono font-bold"
                  />
                </div>
              </div>

              {staffType === "driver" && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div>
                    <label className="block text-[#5B6478] mb-1 font-semibold">License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. DL-1420110012345"
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white uppercase font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#5B6478] mb-1 font-semibold">License Expiry Date</label>
                    <input
                      type="date"
                      value={licenseExpiresOn}
                      onChange={(e) => setLicenseExpiresOn(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white font-medium"
                      required
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
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
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
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E6EAF3]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2158E0] text-white font-bold hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Staff Member"}
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
              <button onClick={() => setInviteResult(null)} className="text-gray-400 hover:text-gray-600">
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
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold"
              >
                Close
              </button>
              <a
                href={inviteResult.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm transition-colors"
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
