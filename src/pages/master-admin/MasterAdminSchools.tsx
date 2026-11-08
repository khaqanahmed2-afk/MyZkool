import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type { MasterAdminSchoolSummary } from "../../services/masterAdminSchoolService";
import {
  School,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export default function MasterAdminSchools() {
  const { token, hasPermission } = useMasterAdminAuth();

  const [schools, setSchools] = useState<MasterAdminSchoolSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Suspend/Reactivate modal state
  const [selectedSchool, setSelectedSchool] = useState<MasterAdminSchoolSummary | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        search,
        status: statusFilter,
        board: boardFilter,
      });

      const res = await fetch(`/api/master-admin/schools?${params}`, {
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
      });

      const json = await res.json();
      if (json.success) {
        setSchools(json.data || []);
        setTotal(json.meta?.total || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch schools list:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, boardFilter, token]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleStatusChange = async () => {
    if (!selectedSchool || !actionReason.trim()) return;
    setIsSubmittingAction(true);

    const targetStatus = selectedSchool.status === "suspended" ? "active" : "suspended";

    try {
      const res = await fetch(`/api/master-admin/schools/${selectedSchool.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: targetStatus,
          reason: actionReason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSelectedSchool(null);
        setActionReason("");
        fetchSchools();
      } else {
        alert(json.error || "Failed to update school status.");
      }
    } catch (err: any) {
      alert(err.message || "Request failed.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
            Schools & Institutions
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage educational institutions, multi-tenant onboarding, and active subscriptions.
          </p>
        </div>

        {hasPermission("schools.create") && (
          <Link
            to="/master-admin/schools/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register New School</span>
          </Link>
        )}
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school name, subdomain, city..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Status Filters */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {["all", "active", "pending", "suspended"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  statusFilter === st ? "bg-white text-blue-600 shadow-2xs font-bold" : "hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Board Filter */}
          <select
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Boards</option>
            <option value="cbse">CBSE</option>
            <option value="icse">ICSE</option>
            <option value="state_board">State Board</option>
          </select>
        </div>
      </div>

      {/* ── School Directory Table ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">School & Subdomain</th>
                <th className="py-3.5 px-4">Affiliation</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Students / Staff</th>
                <th className="py-3.5 px-4">Subscription Plan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading institutions...
                  </td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No schools matching current filter criteria.
                  </td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {school.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{school.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{school.subdomain}.myzkool.in</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 uppercase font-semibold text-slate-600">
                      {school.affiliation_board || "CBSE"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {school.city}, {school.state}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {school.student_count.toLocaleString("en-IN")} students · {school.staff_count} staff
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] uppercase border border-blue-200/60">
                        {school.current_plan_slug}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            school.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              : school.status === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                              : "bg-rose-50 text-rose-700 border border-rose-200/80"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              school.status === "active"
                                ? "bg-emerald-500"
                                : school.status === "pending"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {school.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {school.onboarding_completed ? "Onboarded" : `Step ${school.onboarding_step} pending`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/master-admin/schools/${school.id}`}
                          className="px-2.5 py-1 text-slate-600 hover:text-blue-600 font-semibold bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          View Details
                        </Link>
                        {hasPermission("schools.suspend") && (
                          <button
                            onClick={() => setSelectedSchool(school)}
                            className={`px-2.5 py-1 font-semibold rounded-lg transition-colors cursor-pointer ${
                              school.status === "suspended"
                                ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                : "text-rose-700 bg-rose-50 hover:bg-rose-100"
                            }`}
                          >
                            {school.status === "suspended" ? "Reactivate" : "Suspend"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Suspend / Reactivate Modal ───────────────────────────────── */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedSchool.status === "suspended"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {selectedSchool.status === "suspended" ? "Reactivate Institution" : "Suspend Institution"}
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{selectedSchool.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedSchool.status === "suspended"
                ? "Reactivating this institution will immediately restore access to the school ERP, online fee links, and parent notifications."
                : "Suspending this institution will block all teacher and administrator logins to the ERP. A mandatory audit log reason is required."}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operational Justification / Reason *
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Annual renewal payment cleared by bank transfer."
                rows={3}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSchool(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction || actionReason.trim().length < 5}
                onClick={handleStatusChange}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer ${
                  selectedSchool.status === "suspended"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmittingAction
                  ? "Processing..."
                  : selectedSchool.status === "suspended"
                  ? "Confirm Reactivation"
                  : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

