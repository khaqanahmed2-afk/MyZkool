import React, { useState, useEffect } from "react";
import {
  X,
  SlidersHorizontal,
  Bookmark,
  Check,
  ChevronDown,
  Bus,
  CreditCard,
  FileText,
  ShieldAlert,
} from "lucide-react";
import type { StudentStatus, StudentGender, StudentCategory } from "../../../types/students";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";

export interface StudentFilterState {
  class_id?: string;
  section_id?: string;
  status?: StudentStatus;
  gender?: StudentGender;
  category?: StudentCategory;
  admission_type?: string;
  is_rte?: boolean;
  documents_pending?: boolean;
  has_dues?: boolean;
  uses_transport?: boolean;
  saved_view?: string;
}

interface StudentFilterChipsProps {
  filters: StudentFilterState;
  classes: SchoolClass[];
  sections: SchoolSection[];
  onFilterChange: (newFilters: StudentFilterState) => void;
  onClearFilters: () => void;
  savedView: string;
  onSelectSavedView: (viewKey: string) => void;
}

export const SAVED_VIEWS = [
  { key: "all_students", label: "All Students" },
  { key: "active", label: "Active" },
  { key: "new_admissions", label: "New Admissions" },
  { key: "docs_pending", label: "Documents Pending" },
  { key: "fee_pending", label: "Fee Pending" },
  { key: "transport", label: "Transport Students" },
  { key: "left_school", label: "Left School" },
];

export function StudentFilterChips({
  filters,
  classes,
  sections,
  onFilterChange,
  onClearFilters,
  savedView,
  onSelectSavedView,
}: StudentFilterChipsProps) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const activeFilterCount =
    (filters.class_id ? 1 : 0) +
    (filters.section_id ? 1 : 0) +
    (filters.status && filters.status !== "enrolled" ? 1 : 0) +
    (filters.gender ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.admission_type ? 1 : 0) +
    (filters.is_rte ? 1 : 0) +
    (filters.documents_pending ? 1 : 0) +
    (filters.has_dues ? 1 : 0) +
    (filters.uses_transport ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const availableSections = filters.class_id
    ? sections.filter((s) => s.class_id === filters.class_id)
    : sections;

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileDrawerOpen]);

  return (
    <div className="space-y-3">
      {/* 1. Saved Views Segmented Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <Bookmark className="w-3.5 h-3.5 text-slate-400" />
          Views:
        </span>
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 overflow-x-auto scrollbar-none">
          {SAVED_VIEWS.map((v) => {
            const isSelected = savedView === v.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => onSelectSavedView(v.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-white text-[#2158E0] font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Desktop Compact Filters Bar (Hidden on Mobile) */}
      <div className="hidden md:flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-100">
        <span className="font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          Filters:
        </span>

        {/* Class Filter */}
        <select
          value={filters.class_id || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              class_id: e.target.value || undefined,
              section_id: undefined,
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Section Filter */}
        <select
          value={filters.section_id || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              section_id: e.target.value || undefined,
            })
          }
          disabled={availableSections.length === 0}
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer disabled:opacity-50"
        >
          <option value="">All Sections</option>
          {availableSections.map((s) => (
            <option key={s.id} value={s.id}>
              Section {s.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || "enrolled"}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              status: (e.target.value || undefined) as StudentStatus,
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer"
        >
          <option value="enrolled">Enrolled</option>
          <option value="inactive">Inactive</option>
          <option value="transferred">Transferred</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="passed_out">Passed out</option>
        </select>

        {/* Gender Filter */}
        <select
          value={filters.gender || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              gender: (e.target.value || undefined) as StudentGender,
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer"
        >
          <option value="">All Genders</option>
          <option value="male">Boys (Male)</option>
          <option value="female">Girls (Female)</option>
          <option value="other">Other</option>
        </select>

        {/* Category Filter */}
        <select
          value={filters.category || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              category: (e.target.value || undefined) as StudentCategory,
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer"
        >
          <option value="">All Categories</option>
          <option value="general">General</option>
          <option value="obc">OBC</option>
          <option value="sc">SC</option>
          <option value="st">ST</option>
          <option value="ews">EWS</option>
        </select>

        {/* Quick Toggles */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              ...filters,
              is_rte: filters.is_rte ? undefined : true,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            filters.is_rte
              ? "bg-blue-50 border-[#2158E0] text-[#2158E0]"
              : "bg-white border-[#E6EAF3] text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ShieldAlert className="w-3 h-3 text-slate-400" />
          <span>RTE</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onFilterChange({
              ...filters,
              documents_pending: filters.documents_pending ? undefined : true,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            filters.documents_pending
              ? "bg-amber-50 border-amber-500 text-amber-700"
              : "bg-white border-[#E6EAF3] text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-3 h-3 text-slate-400" />
          <span>Docs Pending</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onFilterChange({
              ...filters,
              uses_transport: filters.uses_transport ? undefined : true,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            filters.uses_transport
              ? "bg-cyan-50 border-cyan-500 text-cyan-700"
              : "bg-white border-[#E6EAF3] text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Bus className="w-3 h-3 text-slate-400" />
          <span>Transport</span>
        </button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 cursor-pointer transition-colors ml-auto hover:bg-rose-50 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear filters ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {/* 3. Mobile Filter Trigger Button (< 768px) */}
      <div className="flex md:hidden items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            hasActiveFilters
              ? "bg-blue-50 border-[#2158E0] text-[#2158E0]"
              : "bg-white border-[#E6EAF3] text-slate-700 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#2158E0] text-white text-[11px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* 4. Mobile Filter Slide-out Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E6EAF3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#2158E0]" />
                <h3 className="font-bold text-slate-900 text-sm font-display">Filter Students</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Form Fields */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Class */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Class</label>
                <select
                  value={filters.class_id || ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      class_id: e.target.value || undefined,
                      section_id: undefined,
                    })
                  }
                  className="w-full bg-slate-50 border border-[#E6EAF3] rounded-lg px-3 py-2 text-xs text-slate-800 font-medium"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Section</label>
                <select
                  value={filters.section_id || ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      section_id: e.target.value || undefined,
                    })
                  }
                  disabled={availableSections.length === 0}
                  className="w-full bg-slate-50 border border-[#E6EAF3] rounded-lg px-3 py-2 text-xs text-slate-800 font-medium disabled:opacity-50"
                >
                  <option value="">All Sections</option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Student Status</label>
                <select
                  value={filters.status || "enrolled"}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      status: (e.target.value || undefined) as StudentStatus,
                    })
                  }
                  className="w-full bg-slate-50 border border-[#E6EAF3] rounded-lg px-3 py-2 text-xs text-slate-800 font-medium"
                >
                  <option value="enrolled">Enrolled</option>
                  <option value="inactive">Inactive</option>
                  <option value="transferred">Transferred</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="passed_out">Passed out</option>
                </select>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Gender</label>
                <select
                  value={filters.gender || ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      gender: (e.target.value || undefined) as StudentGender,
                    })
                  }
                  className="w-full bg-slate-50 border border-[#E6EAF3] rounded-lg px-3 py-2 text-xs text-slate-800 font-medium"
                >
                  <option value="">All Genders</option>
                  <option value="male">Boys (Male)</option>
                  <option value="female">Girls (Female)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Category</label>
                <select
                  value={filters.category || ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      category: (e.target.value || undefined) as StudentCategory,
                    })
                  }
                  className="w-full bg-slate-50 border border-[#E6EAF3] rounded-lg px-3 py-2 text-xs text-slate-800 font-medium"
                >
                  <option value="">All Categories</option>
                  <option value="general">General</option>
                  <option value="obc">OBC</option>
                  <option value="sc">SC</option>
                  <option value="st">ST</option>
                  <option value="ews">EWS</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-slate-700 font-medium">RTE Quota Only</span>
                  <input
                    type="checkbox"
                    checked={Boolean(filters.is_rte)}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        is_rte: e.target.checked ? true : undefined,
                      })
                    }
                    className="w-4 h-4 rounded text-[#2158E0] focus:ring-[#2158E0]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-slate-700 font-medium">Documents Pending Only</span>
                  <input
                    type="checkbox"
                    checked={Boolean(filters.documents_pending)}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        documents_pending: e.target.checked ? true : undefined,
                      })
                    }
                    className="w-4 h-4 rounded text-[#2158E0] focus:ring-[#2158E0]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-slate-700 font-medium">Transport Students Only</span>
                  <input
                    type="checkbox"
                    checked={Boolean(filters.uses_transport)}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        uses_transport: e.target.checked ? true : undefined,
                      })
                    }
                    className="w-4 h-4 rounded text-[#2158E0] focus:ring-[#2158E0]"
                  />
                </label>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E6EAF3] bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onClearFilters();
                  setIsMobileDrawerOpen(false);
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-xl text-xs font-semibold hover:bg-[#1A46B8] cursor-pointer shadow-xs"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
