import React, { useState, useEffect } from "react";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type { PlatformAdmin } from "../../types/masterAdmin";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function MasterAdminUsers() {
  const { token, hasPermission } = useMasterAdminAuth();

  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Admin Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRoleSlug, setInviteRoleSlug] = useState("support_agent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master-admin/users", {
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAdmins(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch platform users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFullName) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/master-admin/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteFullName,
          phone: invitePhone,
          roleSlug: inviteRoleSlug,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteFullName("");
        setInvitePhone("");
        fetchUsers();
      } else {
        alert(json.error || "Failed to create administrator account.");
      }
    } catch (err: any) {
      alert(err.message || "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: PlatformAdmin) => {
    if (admin.role?.slug === "super_admin") {
      alert("Root Super Administrator accounts cannot be deactivated.");
      return;
    }

    try {
      const res = await fetch(`/api/master-admin/users/${admin.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !admin.is_active,
        }),
      });

      const json = await res.json();
      if (json.success) {
        fetchUsers();
      } else {
        alert(json.error || "Status update failed.");
      }
    } catch (err: any) {
      alert(err.message || "Request failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
            Platform Users & Access Management
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage authorized platform operators, support specialists, billing coordinators, and auditors.
          </p>
        </div>

        {hasPermission("users.manage") && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Platform Operator</span>
          </button>
        )}
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Operator Details</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {adm.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{adm.full_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{adm.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        adm.role?.slug === "super_admin"
                          ? "bg-amber-50 text-amber-700 border-amber-200/80"
                          : "bg-blue-50 text-blue-700 border-blue-200/80"
                      }`}
                    >
                      {adm.role?.name || "Support"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {adm.phone || "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        adm.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                          : "bg-rose-50 text-rose-700 border border-rose-200/80"
                      }`}
                    >
                      {adm.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {adm.last_login_at
                      ? new Date(adm.last_login_at).toLocaleDateString("en-IN")
                      : "Never"}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {adm.role?.slug !== "super_admin" && hasPermission("users.manage") && (
                      <button
                        onClick={() => handleToggleStatus(adm)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          adm.is_active
                            ? "text-rose-600 hover:bg-rose-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {adm.is_active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Add Platform Operator
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="Ravi Verma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operator Email *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ravi@myzkool.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Platform Role Assignment *
                </label>
                <select
                  value={inviteRoleSlug}
                  onChange={(e) => setInviteRoleSlug(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="support_agent">Support Agent (Tickets & Inquiries)</option>
                  <option value="billing_manager">Billing Manager (Invoices & Plans)</option>
                  <option value="auditor">Read-Only Compliance Auditor</option>
                  <option value="super_admin">Super Admin (Full Authority)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Provisioning..." : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

