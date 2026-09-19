import React from "react";
import { X, SlidersHorizontal, Bookmark } from "lucide-react";
import type { StudentStatus, StudentGender, StudentCategory } from "../../../types/students";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";

export interface StudentFilterState {
  class_id?: string;
  section_id?: string;
  status?: StudentStatus;
  gender?: StudentGender;
  category?: StudentCategory;
  is_rte?: boolean;
  documents_pending?: boolean;
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

const SAVED_VIEWS = [
  { key: "all_active", label: "All active" },
  { key: "docs_pending", label: "Documents pending" },
  { key: "new_this_month", label: "New this month" },
  { key: "left_this_year", label: "Left this year" },
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
  const hasActiveFilters =
    Boolean(filters.class_id) ||
    Boolean(filters.section_id) ||
    (filters.status && filters.status !== "enrolled") ||
    Boolean(filters.gender) ||
    Boolean(filters.category) ||
    filters.is_rte !== undefined ||
    Boolean(filters.documents_pending);

  const availableSections = filters.class_id
    ? sections.filter(s => s.class_id === filters.class_id)
    : sections;

  return (
    <div className="space-y-3 mb-4">
      {/* Saved Views row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm scrollbar-none">
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0">
          <Bookmark className="w-3.5 h-3.5" /> Views:
        </span>
        {SAVED_VIEWS.map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => onSelectSavedView(v.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              savedView === v.key
                ? "bg-[#2158E0] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filter chips bar */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0 mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
        </span>

        {/* Class Filter */}
        <select
          value={filters.class_id || ""}
          onChange={e =>
            onFilterChange({
              ...filters,
              class_id: e.target.value || undefined,
              section_id: undefined, // reset section if class changes
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
        >
          <option value="">All classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Section Filter */}
        <select
          value={filters.section_id || ""}
          onChange={e =>
            onFilterChange({
              ...filters,
              section_id: e.target.value || undefined,
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
        >
          <option value="">All sections</option>
          {availableSections.map(s => (
            <option key={s.id} value={s.id}>
              Section {s.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || "enrolled"}
          onChange={e =>
            onFilterChange({
              ...filters,
              status: (e.target.value || undefined) as StudentStatus,
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
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
          onChange={e =>
            onFilterChange({
              ...filters,
              gender: (e.target.value || undefined) as StudentGender,
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
        >
          <option value="">All genders</option>
          <option value="male">Boys (Male)</option>
          <option value="female">Girls (Female)</option>
          <option value="other">Other</option>
        </select>

        {/* Category Filter */}
        <select
          value={filters.category || ""}
          onChange={e =>
            onFilterChange({
              ...filters,
              category: (e.target.value || undefined) as StudentCategory,
            })
          }
          className="bg-white border border-[#E6EAF3] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
        >
          <option value="">All categories</option>
          <option value="general">General</option>
          <option value="obc">OBC</option>
          <option value="sc">SC</option>
          <option value="st">ST</option>
          <option value="ews">EWS</option>
        </select>

        {/* RTE Toggle Chip */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              ...filters,
              is_rte: filters.is_rte ? undefined : true,
            })
          }
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            filters.is_rte
              ? "bg-blue-50 border-[#2158E0] text-[#2158E0]"
              : "bg-white border-[#E6EAF3] text-slate-600 hover:bg-slate-50"
          }`}
        >
          RTE quota
        </button>

        {/* Documents Pending Chip */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              ...filters,
              documents_pending: filters.documents_pending ? undefined : true,
            })
          }
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            filters.documents_pending
              ? "bg-amber-50 border-amber-500 text-amber-700"
              : "bg-white border-[#E6EAF3] text-slate-600 hover:bg-slate-50"
          }`}
        >
          Docs pending
        </button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 cursor-pointer transition-colors ml-auto"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

