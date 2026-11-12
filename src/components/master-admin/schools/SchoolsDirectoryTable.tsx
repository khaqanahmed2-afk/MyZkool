import React, { useState } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  ArrowUpCircle,
  Clock,
  CalendarPlus,
  ShieldAlert,
  ShieldCheck,
  Users,
  Layers,
  Activity,
  History,
  CheckSquare,
  Square,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Props {
  schools: MasterAdminSchoolSummary[];
  total: number;
  page: number;
  limit: number;
  search: string;
  planFilter: string;
  statusFilter: string;
  stateFilter: string;
  joinedFilter: string;
  onSearchChange: (val: string) => void;
  onPlanChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onStateChange: (val: string) => void;
  onJoinedChange: (val: string) => void;
  onPageChange: (p: number) => void;
  onLimitChange: (lim: number) => void;
  onSelectSchool: (school: MasterAdminSchoolSummary) => void;
  selectedSchoolId?: string | null;
  onAction: (school: MasterAdminSchoolSummary, action: string) => void;
  onExport: () => void;
  onBulkAction?: (selectedSchools: MasterAdminSchoolSummary[]) => void;
  loading?: boolean;
}

export const SchoolsDirectoryTable: React.FC<Props> = ({
  schools,
  total,
  page,
  limit,
  search,
  planFilter,
  statusFilter,
  stateFilter,
  joinedFilter,
  onSearchChange,
  onPlanChange,
  onStatusChange,
  onStateChange,
  onJoinedChange,
  onPageChange,
  onLimitChange,
  onSelectSchool,
  selectedSchoolId,
  onAction,
  onExport,
  onBulkAction,
  loading,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / limit) || 1;
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const toggleSelectAll = () => {
    if (selectedIds.length === schools.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(schools.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getPlanPill = (school: MasterAdminSchoolSummary) => {
    if (school.subscription_status === "trialing" || school.current_plan_name.toLowerCase().includes("trial")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
          Trial
        </span>
      );
    }
    if (school.current_plan_slug === "basic") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Basic
        </span>
      );
    }
    if (school.current_plan_slug === "custom") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          Custom
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
        Pro
      </span>
    );
  };

  const getSubscriptionDisplay = (school: MasterAdminSchoolSummary) => {
    const isExpired =
      school.subscription_status === "expired" ||
      school.subscription_status === "past_due" ||
      new Date(school.subscription_valid_till).getTime() < Date.now();

    if (isExpired) {
      return (
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Expired
          </span>
          <p className="text-[10px] text-slate-500 font-medium">
            {school.subscription_valid_till_formatted}
          </p>
        </div>
      );
    }

    if (school.subscription_status === "trialing" || school.trial_days_left) {
      return (
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
            <Clock className="w-3 h-3 text-amber-500" />
            {school.trial_days_left ? `${school.trial_days_left} days left` : "Trialing"}
          </span>
          <p className="text-[10px] text-slate-500 font-medium">Active</p>
        </div>
      );
    }

    return (
      <div>
        <p className="text-[11px] font-bold text-slate-800">
          {school.subscription_valid_till_formatted}
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      </div>
    );
  };

  const getStatusPill = (status: string) => {
    if (status === "suspended") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Suspended
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Active
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* ── Directory Header (matches mockup) ────────────────────────── */}
      <div className="p-5 border-b border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-slate-900 tracking-tight font-heading">
                Schools Directory
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {total} Institutions
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              All registered educational institutions on MyZkool.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            <div className="relative">
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    alert("Please select institutions using checkboxes to perform bulk actions.");
                  } else if (onBulkAction) {
                    const targeted = schools.filter((s) => selectedIds.includes(s.id));
                    onBulkAction(targeted);
                  }
                }}
              >
                <span>Bulk Actions</span>
                {selectedIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {selectedIds.length}
                  </span>
                )}
                <span className="text-[10px] text-slate-400">▼</span>
              </button>
            </div>

            <button
              onClick={() => {
                onSearchChange("");
                onPlanChange("all");
                onStatusChange("all");
                onStateChange("all");
                onJoinedChange("all");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Reset filters"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* ── Filter Controls Row ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-4">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="schools-directory-search-input"
              name="schoolsSearch"
              aria-label="Search by school name, ID, or email"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by school name, ID, email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Plan Filter */}
          <div>
            <select
              id="schools-directory-plan-select"
              name="schoolsPlanFilter"
              aria-label="Filter schools by plan"
              value={planFilter}
              onChange={(e) => onPlanChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">Plan: All Plans</option>
              <option value="pro">Pro Plan</option>
              <option value="basic">Basic Plan</option>
              <option value="custom">Custom Enterprise</option>
              <option value="trial">Free Trial</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="schools-directory-status-select"
              name="schoolsStatusFilter"
              aria-label="Filter schools by status"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* State Filter */}
          <div>
            <select
              id="schools-directory-state-select"
              name="schoolsStateFilter"
              aria-label="Filter schools by state"
              value={stateFilter}
              onChange={(e) => onStateChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">State: All</option>
              {Array.from(new Set([...schools.map((s) => s.state).filter(Boolean), "Uttar Pradesh", "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Haryana"])).sort().map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Joined Date Filter */}
          <div>
            <select
              id="schools-directory-joined-select"
              name="schoolsJoinedFilter"
              aria-label="Filter schools by joined date"
              value={joinedFilter}
              onChange={(e) => onJoinedChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">Joined: Any Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-3 px-4 w-10 text-center">
                <button onClick={toggleSelectAll} className="cursor-pointer text-slate-400 hover:text-slate-600">
                  {selectedIds.length > 0 && selectedIds.length === schools.length ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-4">School / Institution</th>
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Admin (Principal/Owner)</th>
              <th className="py-3 px-4 text-center">Students</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Subscription</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Joined</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 animate-pulse">
                  Loading institutions from Supabase...
                </td>
              </tr>
            ) : schools.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center">
                  <p className="text-sm font-semibold text-slate-700">No institutions match the current filters.</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the search or filter criteria.</p>
                </td>
              </tr>
            ) : (
              schools.map((school) => {
                const isSelected = selectedSchoolId === school.id;
                const isChecked = selectedIds.includes(school.id);

                return (
                  <tr
                    key={school.id}
                    tabIndex={0}
                    onClick={() => onSelectSchool(school)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectSchool(school);
                      }
                    }}
                    className={`hover:bg-indigo-50/40 transition-colors cursor-pointer group focus:outline-none focus:bg-indigo-50/60 ${
                      isSelected ? "bg-indigo-50/70" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectOne(school.id, e)}
                        className="cursor-pointer text-slate-400 hover:text-indigo-600"
                        aria-label={`Select ${school.name}`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* School / Institution (Emblem + Name + Location) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-indigo-700 shadow-2xs">
                          {school.logo_url ? (
                            <img
                              src={school.logo_url}
                              alt={school.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            school.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight truncate">
                            {school.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                            <span>{school.city}, {school.state}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Institution ID */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 text-[11px]">
                      {school.institution_code}
                    </td>

                    {/* Admin (Principal/Owner) */}
                    <td className="py-3.5 px-4">
                      <div className="min-w-[170px]">
                        <p className="font-semibold text-slate-800 text-[11px]">
                          {school.principal_name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {school.principal_email}
                        </p>
                      </div>
                    </td>

                    {/* Students */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {school.student_count.toLocaleString("en-IN")}
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      {getPlanPill(school)}
                    </td>

                    {/* Subscription */}
                    <td className="py-3.5 px-4">
                      {getSubscriptionDisplay(school)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusPill(school.status)}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 text-slate-600 text-[11px] font-medium whitespace-nowrap">
                      {new Date(school.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-4 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === school.id ? null : school.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu (matches all 11 mockup items) */}
                      {activeMenuId === school.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }}
                          />
                          <div className="absolute right-4 top-10 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl py-1.5 z-50 text-left divide-y divide-slate-100">
                            {/* Section 1: Inspection & Editing */}
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onSelectSchool(school);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>View Details</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onAction(school, "edit");
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit Institution</span>
                              </button>
                            </div>

                            {/* Section 2: Subscription Controls */}
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onAction(school, "change_plan");
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Change / Upgrade Plan</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onAction(school, "extend_trial");
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                <span>Extend Free Trial</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onAction(school, "extend_subscription");
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Extend Subscription</span>
                              </button>
                            </div>

                            {/* Section 3: Lifecycle Controls */}
                            <div className="py-1">
                              {school.status === "suspended" ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    onAction(school, "reactivate");
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Reactivate Institution</span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    onAction(school, "suspend");
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>Suspend Institution</span>
                                </button>
                              )}
                            </div>

                            {/* Section 4: Modules & Users */}
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onAction(school, "manage_users");
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                <span>Manage Users</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onAction(school, "manage_modules");
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Layers className="w-3.5 h-3.5 text-slate-500" />
                                <span>Manage Modules</span>
                              </button>
                            </div>

                            {/* Section 5: Logs & Ledger */}
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onAction(school, "activity_logs");
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Activity className="w-3.5 h-3.5 text-slate-500" />
                                <span>View Activity Logs</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onAction(school, "subscription_history");
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5 text-slate-500" />
                                <span>Subscription History</span>
                              </button>
                            </div>
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

      {/* ── Table Footer & Pagination (matches mockup) ───────────────── */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 select-none">
        <div>
          Showing <span className="font-bold text-slate-700">{startItem}</span>–
          <span className="font-bold text-slate-700">{endItem}</span> of{" "}
          <span className="font-bold text-slate-700">{total}</span> institutions
        </div>

        <div className="flex items-center gap-3">
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              const isActive = p === page;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="schools-directory-limit-select" className="text-[11px] text-slate-500 font-medium">Rows per page:</label>
            <select
              id="schools-directory-limit-select"
              name="schoolsLimit"
              aria-label="Rows per page"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

