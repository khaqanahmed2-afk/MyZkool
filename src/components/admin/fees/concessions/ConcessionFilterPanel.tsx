import React from "react";
import { Search, ChevronDown, RotateCcw } from "lucide-react";
import type { ConcessionFilters } from "../../../../types/fees";

interface ConcessionFilterPanelProps {
  filters: ConcessionFilters;
  onChange: (filters: ConcessionFilters) => void;
  academicYears: { id: string; label: string }[];
  classes: { id: string; name: string }[];
}

const CHIP_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "scheduled", label: "Scheduled" },
  { id: "expired", label: "Expired" },
  { id: "sibling", label: "Sibling" },
  { id: "merit", label: "Merit" },
  { id: "financial_aid", label: "Financial Aid" },
  { id: "staff_ward", label: "Staff Ward" },
  { id: "management", label: "Management" },
  { id: "other", label: "Other" },
];

export function ConcessionFilterPanel({
  filters,
  onChange,
  academicYears,
  classes,
}: ConcessionFilterPanelProps) {
  const activeChip = filters.chipFilter || "all";

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, academicYearId: e.target.value });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, classId: e.target.value });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, concessionType: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, status: e.target.value });
  };

  const handleChipClick = (chipId: string) => {
    onChange({ ...filters, chipFilter: chipId });
  };

  const handleClearFilters = () => {
    onChange({
      search: "",
      academicYearId: "all",
      classId: "all",
      concessionType: "all",
      status: "all",
      chipFilter: "all",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#E6EAF3] p-4 shadow-sm space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search || ""}
          onChange={handleSearchChange}
          placeholder="Search by student name, admission no., concession type or reason..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-[#E6EAF3] rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A] transition-all text-slate-800"
        />
      </div>

      {/* Selectors Row */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Academic Year */}
          <div className="relative min-w-[140px]">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Academic Year
            </label>
            <div className="relative">
              <select
                value={filters.academicYearId || "all"}
                onChange={handleYearChange}
                className="w-full appearance-none pl-3 pr-8 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] cursor-pointer"
              >
                <option value="all">All Academic Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Class */}
          <div className="relative min-w-[130px]">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Class
            </label>
            <div className="relative">
              <select
                value={filters.classId || "all"}
                onChange={handleClassChange}
                className="w-full appearance-none pl-3 pr-8 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] cursor-pointer"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Concession Type */}
          <div className="relative min-w-[140px]">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Concession Type
            </label>
            <div className="relative">
              <select
                value={filters.concessionType || "all"}
                onChange={handleTypeChange}
                className="w-full appearance-none pl-3 pr-8 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="sibling">Sibling Discount</option>
                <option value="merit">Merit Scholarship</option>
                <option value="financial_aid">Financial Aid</option>
                <option value="staff_ward">Staff Ward</option>
                <option value="management">Management</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status */}
          <div className="relative min-w-[130px]">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Status
            </label>
            <div className="relative">
              <select
                value={filters.status || "all"}
                onChange={handleStatusChange}
                className="w-full appearance-none pl-3 pr-8 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="self-end pb-0.5">
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-[#E6EAF3] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

      {/* Chips Filter Row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
        {CHIP_OPTIONS.map((chip) => {
          const isSelected = activeChip === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleChipClick(chip.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#03543F] text-white shadow-sm font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
