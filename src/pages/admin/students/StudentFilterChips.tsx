import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import type { StudentStatus } from "../../../types/students";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";

export interface StudentFilterState {
  class_id?: string;
  section_id?: string;
  status?: StudentStatus;
  gender?: any;
  category?: any;
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
  savedView?: string;
  onSelectSavedView?: (viewKey: string) => void;
}

export function StudentFilterChips({
  filters,
  classes,
  sections,
  onFilterChange,
  onClearFilters,
}: StudentFilterChipsProps) {
  const availableSections = filters.class_id
    ? sections.filter((s) => s.class_id === filters.class_id)
    : sections;

  const hasActiveFilters = Boolean(
    filters.class_id ||
    filters.section_id ||
    (filters.status && filters.status !== "enrolled") ||
    filters.has_dues
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
      <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] uppercase tracking-wider shrink-0 mr-1">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span>Filters:</span>
      </div>

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
        aria-label="Filter by class"
        className="bg-white border border-[#E6EAF3] rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer shadow-2xs transition-colors"
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
        aria-label="Filter by section"
        disabled={availableSections.length === 0}
        className="bg-white border border-[#E6EAF3] rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        value={filters.status ?? "all"}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            status: e.target.value === "all" ? undefined : (e.target.value as StudentStatus),
          })
        }
        aria-label="Filter by status"
        className="bg-white border border-[#E6EAF3] rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer shadow-2xs transition-colors"
      >
        <option value="all">All Statuses</option>
        <option value="enrolled">Enrolled / Active</option>
        <option value="inactive">Inactive</option>
        <option value="transferred">Transferred</option>
        <option value="withdrawn">Withdrawn</option>
        <option value="passed_out">Passed out</option>
      </select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
