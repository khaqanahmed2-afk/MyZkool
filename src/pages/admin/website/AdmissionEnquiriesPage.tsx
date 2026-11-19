import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  getAdmissionEnquiries,
  updateAdmissionEnquiryStatus,
} from "../../../services/websiteService";
import type { SchoolWebsite, AdmissionEnquiry, AdmissionEnquiryStatus } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import {
  MessageSquare,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  UserPlus,
  Calendar,
  Clock,
  Eye,
  Edit,
  Save,
  X,
  User,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const STATUS_LIST: Array<{ id: string; label: string }> = [
  { id: "all", label: "All Statuses" },
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "follow-up", label: "Follow-up" },
  { id: "converted", label: "Converted" },
  { id: "closed", label: "Closed" },
];

export default function AdmissionEnquiriesPage() {
  const { school, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [enquiries, setEnquiries] = useState<AdmissionEnquiry[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Detail Modal / Drawer State
  const [activeEnquiry, setActiveEnquiry] = useState<AdmissionEnquiry | null>(null);
  const [newStatus, setNewStatus] = useState<AdmissionEnquiryStatus>("new");
  const [internalNotes, setInternalNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const loadEnquiries = useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      let dateRange: { start?: string; end?: string } | undefined;
      const now = new Date();
      if (dateFilter === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        dateRange = { start: start.toISOString() };
      } else if (dateFilter === "7d") {
        const start = new Date();
        start.setDate(now.getDate() - 7);
        dateRange = { start: start.toISOString() };
      } else if (dateFilter === "30d") {
        const start = new Date();
        start.setDate(now.getDate() - 30);
        dateRange = { start: start.toISOString() };
      }

      const [webRes, enqRes] = await Promise.all([
        getSchoolWebsite(school.id),
        getAdmissionEnquiries({
          schoolId: school.id,
          status: selectedStatus === "all" ? undefined : selectedStatus,
          searchTerm: searchTerm || undefined,
          dateRange,
        }),
      ]);

      if (webRes.website) setWebsite(webRes.website);
      if (enqRes.enquiries) setEnquiries(enqRes.enquiries);
    } catch (err) {
      console.warn("Failed to load admission enquiries:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school?.id, selectedStatus, searchTerm, dateFilter]);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  const handleOpenDetail = (enq: AdmissionEnquiry) => {
    setActiveEnquiry(enq);
    setNewStatus((enq.status as AdmissionEnquiryStatus) || "new");
    setInternalNotes(enq.internal_notes || "");
  };

  const handleSaveStatus = async () => {
    if (!school?.id || !activeEnquiry) return;
    setIsUpdating(true);
    setFeedback(null);
    try {
      const res = await updateAdmissionEnquiryStatus({
        schoolId: school.id,
        enquiryId: activeEnquiry.id,
        status: newStatus,
        notes: internalNotes,
        userRole,
      });

      if (res.success) {
        setEnquiries((prev) =>
          prev.map((e) =>
            e.id === activeEnquiry.id
              ? { ...e, status: newStatus, internal_notes: internalNotes }
              : e
          )
        );
        setActiveEnquiry({
          ...activeEnquiry,
          status: newStatus,
          internal_notes: internalNotes,
        });
        setFeedback({ type: "success", message: "Enquiry status & notes updated." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update status." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsUpdating(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (enquiries.length === 0) return;

    const headers = ["Submission Date", "Student Name", "Parent Name", "Contact Phone", "Email", "Seeking Class", "Status", "Message", "Internal Notes"];
    const rows = enquiries.map((e) => [
      new Date(e.created_at).toLocaleDateString("en-IN"),
      e.student_name || "—",
      e.parent_name,
      e.phone,
      e.email || "—",
      `Class ${e.class_grade}`,
      e.status,
      `"${(e.message || "").replace(/"/g, '""')}"`,
      `"${(e.internal_notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `admission_enquiries_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">New</span>;
      case "contacted":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Contacted</span>;
      case "follow-up":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Follow-up</span>;
      case "converted":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Converted</span>;
      case "closed":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">Closed</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Admission Enquiries"
        description="Review, follow up, and manage prospective student enquiries submitted via your public school website."
        website={website}
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={enquiries.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export to CSV
          </button>
        }
      />

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Information Banner: Enquiry vs Enrolled Student Separation */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <strong>Institutional Lead Separation Policy:</strong> Website admission enquiries are prospective marketing leads and remain strictly separate from official student records. To convert an interested family into an enrolled student, initiate the authorized Student Admission Wizard.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {STATUS_LIST.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStatus(st.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedStatus === st.id
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Date Filter & Search */}
        <div className="flex items-center gap-2.5">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search parent, student, phone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Enquiries Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {enquiries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Applicant / Parent</th>
                  <th className="py-3 px-4">Seeking Class</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Applicant & Parent */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {enq.student_name ? (
                            <span>{enq.student_name}</span>
                          ) : (
                            <span>{enq.parent_name}</span>
                          )}
                        </div>
                        {enq.student_name && (
                          <div className="text-xs text-slate-500">
                            Parent: {enq.parent_name}
                          </div>
                        )}
                        {enq.message && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                            "{enq.message}"
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Seeking Class */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                        Class {enq.class_grade}
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a href={`tel:${enq.phone}`} className="hover:text-blue-600">
                            {enq.phone}
                          </a>
                        </div>
                        {enq.email && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <a href={`mailto:${enq.email}`} className="hover:text-blue-600 truncate max-w-[160px]">
                              {enq.email}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div>
                        {new Date(enq.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(enq.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(enq.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(enq)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        View & Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">No Admission Enquiries Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Enquiries submitted through your school's website enquiry form will appear here with instant contact details.
            </p>
          </div>
        )}
      </div>

      {/* DETAIL & STATUS UPDATE MODAL */}
      {activeEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Admission Lead Details
              </h3>
              <button
                type="button"
                onClick={() => setActiveEnquiry(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate & Parent Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Seeking Admission For
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded">
                  Class {activeEnquiry.class_grade}
                </span>
              </div>

              <div className="text-sm font-bold text-slate-900">
                {activeEnquiry.student_name ? (
                  <span>Student: {activeEnquiry.student_name}</span>
                ) : (
                  <span>Parent/Guardian: {activeEnquiry.parent_name}</span>
                )}
              </div>

              {activeEnquiry.student_name && (
                <div className="text-xs text-slate-600">
                  Parent / Guardian: {activeEnquiry.parent_name}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400">Phone: </span>
                  <a
                    href={`tel:${activeEnquiry.phone}`}
                    className="font-mono text-blue-600 font-semibold"
                  >
                    {activeEnquiry.phone}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400">Email: </span>
                  <span className="text-slate-700">
                    {activeEnquiry.email || "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            {/* Parent Message */}
            {activeEnquiry.message && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message from Parent
                </label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                  "{activeEnquiry.message}"
                </div>
              </div>
            )}

            {/* Update Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Update Enquiry Pipeline Status
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(["new", "contacted", "follow-up", "converted", "closed"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNewStatus(st)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg capitalize border transition-all ${
                      newStatus === st
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Notes & Follow-up History
              </label>
              <textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Staff notes (e.g. Called parent on 18th Nov. Campus visit scheduled for Saturday)..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Authorized Admission Conversion Link */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-900">
                  Ready to enroll student?
                </div>
                <div className="text-[11px] text-emerald-700">
                  Launch the official admission wizard with student credentials.
                </div>
              </div>
              <Link
                to="/admin/students/new"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50"
              >
                Admission Wizard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveEnquiry(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleSaveStatus}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-60"
              >
                {isUpdating ? "Saving..." : "Save Status & Notes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
