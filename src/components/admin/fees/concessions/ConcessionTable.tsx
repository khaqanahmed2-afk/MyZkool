import React, { useState } from "react";
import {
  Download,
  MoreHorizontal,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Ban,
  FileText,
} from "lucide-react";
import type { StudentConcession, StudentConcessionStatus } from "../../../../types/fees";

interface ConcessionTableProps {
  concessions: StudentConcession[];
  loading?: boolean;
  onViewDetails: (concession: StudentConcession) => void;
  onEdit: (concession: StudentConcession) => void;
  onApprove: (concession: StudentConcession) => void;
  onReject: (concession: StudentConcession) => void;
  onRevoke: (concession: StudentConcession) => void;
  onDelete: (concession: StudentConcession) => void;
  onExport: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// ─── Helpers: Initials Avatar ──────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-teal-100 text-teal-800",
    "bg-blue-100 text-blue-800",
    "bg-indigo-100 text-indigo-800",
    "bg-purple-100 text-purple-800",
    "bg-rose-100 text-rose-800",
    "bg-emerald-100 text-emerald-800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ─── Format Concession Type Badge ──────────────────────────────────────────
function renderTypeBadge(typeStr: string) {
  const norm = (typeStr || "other").toLowerCase().replace(/[\s_-]+/g, "");
  if (norm.includes("sibling")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]">
        Sibling Discount
      </span>
    );
  }
  if (norm.includes("merit")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3]">
        Merit Scholarship
      </span>
    );
  }
  if (norm.includes("staff")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
        Staff Ward
      </span>
    );
  }
  if (norm.includes("financial") || norm.includes("aid") || norm.includes("ews")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E0E7FF] text-[#4338CA] border border-[#C7D2FE]">
        Financial Aid
      </span>
    );
  }
  if (norm.includes("management")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
        Management
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
      {typeStr || "Other"}
    </span>
  );
}

// ─── Format Status Badge ───────────────────────────────────────────────────
function renderStatusBadge(status: StudentConcessionStatus) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
          Active
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
          Pending
        </span>
      );
    case "scheduled":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DBEAFE] text-[#1D4ED8] border border-[#93C5FD]">
          Scheduled
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]">
          Expired
        </span>
      );
    case "revoked":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
          Revoked
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          {status}
        </span>
      );
  }
}

// ─── Format Validity Date Range ────────────────────────────────────────────
function formatValidity(validFrom?: string | null, validTo?: string | null): string {
  if (!validFrom && !validTo) return "Full Year";
  const parseMonthYear = (dStr?: string | null) => {
    if (!dStr) return "";
    const [y, m] = dStr.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString("en-US", { month: "short", year: "numeric" });
  };
  const from = parseMonthYear(validFrom);
  const to = parseMonthYear(validTo);
  if (from && to) return `${from} – ${to}`;
  return from || to || "Full Year";
}

// ─── Format Applicable Fee Components ──────────────────────────────────────
function formatApplicableHeads(c: StudentConcession): string {
  const count = (c.fee_head_ids || []).length;
  if (count === 0) return "All Fee Heads";
  if (count === 1) {
    const norm = (c.concession_type || "").toLowerCase();
    if (norm.includes("transport")) return "Transport Fee";
    return "Tuition Fee";
  }
  if (count === 2) return "Tuition + Transport";
  return `Tuition + ${count - 1} heads`;
}

export function ConcessionTable({
  concessions,
  loading,
  onViewDetails,
  onEdit,
  onApprove,
  onReject,
  onRevoke,
  onDelete,
  onExport,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ConcessionTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const totalCount = concessions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const currentConcessions = concessions.slice(startIndex, endIndex);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(currentConcessions.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected =
    currentConcessions.length > 0 &&
    currentConcessions.every((c) => selectedIds.has(c.id));

  return (
    <div className="bg-white rounded-xl border border-[#E6EAF3] overflow-hidden shadow-sm">
      {/* Table Top Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E6EAF3]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            Concession Records ({totalCount})
          </h2>
          {selectedIds.size > 0 && (
            <span className="text-xs text-slate-500 font-medium">
              ({selectedIds.size} selected)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E6EAF3] rounded-lg transition-colors cursor-pointer shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/75 border-b border-[#E6EAF3] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3">Student</th>
              <th className="px-3 py-3">Class</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Applicable To</th>
              <th className="px-3 py-3">Validity</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-4 py-3 text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EAF3]">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-emerald-200 border-t-[#00875A] rounded-full animate-spin mx-auto mb-2"></div>
                  Loading concessions...
                </td>
              </tr>
            ) : currentConcessions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No concession records found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try adjusting your filters or click "Add Concession" above.
                  </p>
                </td>
              </tr>
            ) : (
              currentConcessions.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const isMenuOpen = menuOpenId === c.id;
                const studentName = c.student_name || "Unknown Student";
                const initials = getInitials(studentName);
                const avatarBg = getAvatarColor(studentName);
                const discountDisplay =
                  c.type === "percent" ? `${c.value}%` : `₹${Number(c.value).toLocaleString("en-IN")}`;

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(c.id)}
                        className="rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarBg}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p
                            onClick={() => onViewDetails(c)}
                            className="text-xs sm:text-sm font-semibold text-slate-900 truncate hover:text-[#00875A] cursor-pointer"
                          >
                            {studentName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {c.admission_no || "ADM-2023-000"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="px-3 py-3 text-slate-700 font-medium">
                      {c.class_name ? c.class_name.replace("Class ", "") : "-"}
                      {c.section_name ? `-${c.section_name}` : ""}
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3">{renderTypeBadge(c.concession_type || "other")}</td>

                    {/* Discount */}
                    <td className="px-3 py-3 font-bold text-slate-900">
                      {discountDisplay}
                    </td>

                    {/* Applicable To */}
                    <td className="px-3 py-3 text-slate-600">
                      {formatApplicableHeads(c)}
                    </td>

                    {/* Validity */}
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                      {formatValidity(c.valid_from, c.valid_to)}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">{renderStatusBadge(c.status)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(isMenuOpen ? null : c.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div className="absolute right-4 top-10 w-44 bg-white rounded-xl shadow-lg border border-[#E6EAF3] py-1 z-30 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onViewDetails(c);
                              }}
                              className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onEdit(c);
                              }}
                              className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit Concession</span>
                            </button>

                            {c.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    onApprove(c);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Approve Request</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    onReject(c);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Reject Request</span>
                                </button>
                              </>
                            )}

                            {(c.status === "active" || c.status === "scheduled") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  onRevoke(c);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5 text-amber-600" />
                                <span>Revoke / Cancel</span>
                              </button>
                            )}

                            <div className="border-t border-slate-100 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onDelete(c);
                              }}
                              className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete Record</span>
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Pagination & Page Size */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 border-t border-[#E6EAF3] gap-3 text-xs text-slate-500">
        <div>
          {totalCount > 0 ? (
            <span>
              Showing <strong className="text-slate-800">{startIndex + 1}</strong> to{" "}
              <strong className="text-slate-800">{endIndex}</strong> of{" "}
              <strong className="text-slate-800">{totalCount}</strong> concessions
            </span>
          ) : (
            <span>0 concessions</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded border border-[#E6EAF3] text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              // Show pages around current
              if (
                p === 1 ||
                p === totalPages ||
                (p >= page - 1 && p <= page + 1)
              ) {
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`w-6 h-6 rounded text-xs font-semibold cursor-pointer ${
                      p === page
                        ? "border border-[#00875A] text-[#00875A] bg-emerald-50/50"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                );
              }
              if (p === page - 2 || p === page + 2) {
                return (
                  <span key={p} className="px-1 text-slate-400">
                    …
                  </span>
                );
              }
              return null;
            })}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded border border-[#E6EAF3] text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rows per page dropdown */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none pl-2.5 pr-6 py-1 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#00875A] cursor-pointer"
            >
              <option value={8}>8 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
