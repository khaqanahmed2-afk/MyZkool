import React from "react";
import { Search, Filter, RotateCcw, X } from "lucide-react";
import type { StudentStatus } from "../../../types/students";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";

export interface StudentFilterState {
  class_id?: string;
  section_id?: string;
  status?: StudentStatus;
  has_dues?: boolean;
  is_new_admission?: boolean;
}

interface StudentFilterChipsProps {
  filters: StudentFilterState;
  classes: SchoolClass[];
  sections: SchoolSection[];
  isLoadingSections?: boolean;
  onFilterChange: (newFilters: StudentFilterState) => void;
  onClearFilters: () => void;
  // Tab metrics
  totalCount: number;
  enrolledCount: number;
  feePendingCount: number;
  onHoldCount?: number;
  transferredCount?: number;
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function StudentFilterChips({
  filters,
  classes,
  sections,
  isLoadingSections = false,
  onFilterChange,
  onClearFilters,
  totalCount,
  enrolledCount,
  feePendingCount,
  onHoldCount = 0,
  transferredCount = 0,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: StudentFilterChipsProps) {
  // Derive sections strictly belonging to the selected class
  const classIsSelected = Boolean(filters.class_id);
  const availableSections = classIsSelected
    ? sections.filter((s) => s.class_id === filters.class_id)
    : [];

  const isSectionDisabled =
    !classIsSelected || isLoadingSections || availableSections.length === 0;

  const hasActiveFiltersOrSearch = Boolean(
    searchQuery ||
    filters.class_id ||
    filters.section_id ||
    (filters.status && filters.status !== "enrolled") ||
    filters.has_dues ||
    filters.is_new_admission ||
    activeTab !== "all"
  );

  const tabs = [
    {
      key: "all",
      label: "All Students",
      count: totalCount,
    },
    {
      key: "enrolled",
      label: "Enrolled",
      count: enrolledCount,
    },
    {
      key: "pending_fees",
      label: "Pending Fees",
      count: feePendingCount,
      highlightBadge: true,
    },
    {
      key: "on_hold",
      label: "On Hold",
      count: onHoldCount,
    },
    {
      key: "transferred",
      label: "Transferred",
      count: transferredCount,
    },
  ];

  return (
        <div className="space-y-3">
          {/* 1. Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-2xs ${isActive
                      ? "bg-[#2158E0] text-white shadow-xs"
                      : "bg-white hover:bg-slate-50 text-slate-700 border border-[#E6EAF3] hover:border-slate-300"
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] font-bold ${isActive
                        ? "text-blue-100"
                        : tab.highlightBadge && tab.count > 0
                          ? "text-rose-600"
                          : "text-slate-400"
                      }`}
                  >
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2. Structured Filter Controls Bar */}
          <div className="bg-white border border-[#E6EAF3] rounded-2xl p-3 shadow-2xs">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
              {/* Class Dropdown */}
              <div className="min-w-[140px]">
                <select
                  value={filters.class_id || ""}
                  onChange={(e) => {
                    const newClassId = e.target.value || undefined;
                    onFilterChange({
                      ...filters,
                      class_id: newClassId,
                      section_id: undefined, // Clear section when class changes
                    });
                  }}
                  aria-label="Filter by class"
                  className="w-full bg-slate-50 hover:bg-white border border-[#E6EAF3] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:bg-white cursor-pointer transition-colors"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown (Dependent on Class) */}
              <div className="min-w-[130px]">
                <select
                  value={filters.section_id || ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      section_id: e.target.value || undefined,
                    })
                  }
                  aria-label="Filter by section"
                  disabled={isSectionDisabled}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2158E0] transition-colors ${isSectionDisabled
                      ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                      : "bg-slate-50 hover:bg-white border-[#E6EAF3] text-slate-700 focus:bg-white cursor-pointer"
                    }`}
                >
                  <option value="">All Sections</option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="min-w-[130px]">
                <select
                  value={filters.status || ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      status: e.target.value ? (e.target.value as StudentStatus) : undefined,
                    })
                  }
                  aria-label="Filter by status"
                  className="w-full bg-slate-50 hover:bg-white border border-[#E6EAF3] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:bg-white cursor-pointer transition-colors"
                >
                  <option value="">All Statuses</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="inactive">On Hold / Inactive</option>
                  <option value="transferred">Transferred</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="passed_out">Passed Out</option>
                </select>
              </div>

              {/* Search Bar across name, admission no, roll no, parent phone */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by name, admission no., roll no., phone..."
                  className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-[#E6EAF3] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Action Icon and Reset */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`p-2 rounded-xl border flex items-center justify-center transition-colors ${hasActiveFiltersOrSearch
                      ? "bg-blue-50 border-blue-200 text-[#2158E0]"
                      : "bg-slate-50 border-[#E6EAF3] text-slate-400"
                    }`}
                  title="Filters active"
                >
                  <Filter className="w-4 h-4" />
                </div>

                {hasActiveFiltersOrSearch && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        );
}
