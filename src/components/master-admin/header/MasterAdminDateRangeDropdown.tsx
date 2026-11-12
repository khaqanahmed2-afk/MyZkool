import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";

interface MasterAdminDateRangeDropdownProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  startDate?: string;
  endDate?: string;
  onCustomRangeChange?: (start: string, end: string) => void;
}

export const MasterAdminDateRangeDropdown: React.FC<MasterAdminDateRangeDropdownProps> = ({
  dateRange,
  onDateRangeChange,
  startDate,
  endDate,
  onCustomRangeChange,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [customStartInput, setCustomStartInput] = useState(startDate || "");
  const [customEndInput, setCustomEndInput] = useState(endDate || "");
  const [isCustomMode, setIsCustomMode] = useState(dateRange === "custom");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dateOptions = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
    { label: "This Year", value: "this_year" },
    { label: "All Time", value: "all_time" },
    { label: "Custom Range...", value: "custom" },
  ];

  const currentLabel =
    dateRange === "custom"
      ? customStartInput && customEndInput
        ? `${customStartInput} to ${customEndInput}`
        : "Custom Range"
      : dateOptions.find((o) => o.value === dateRange)?.label || "Last 30 Days";

  const handleApplyCustomDates = () => {
    if (customStartInput && customEndInput && onCustomRangeChange) {
      onCustomRangeChange(customStartInput, customEndInput);
      onDateRangeChange("custom");
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
        aria-label="Filter date range"
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
        <Calendar className="w-3.5 h-3.5 text-blue-600" />
        <span>{currentLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 mb-1">
            Time Period
          </div>
          <div className="space-y-0.5">
            {dateOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (opt.value === "custom") {
                    setIsCustomMode(true);
                  } else {
                    setIsCustomMode(false);
                    onDateRangeChange(opt.value);
                    setShowDropdown(false);
                  }
                }}
                className={`w-full px-3 py-1.5 text-xs text-left rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                  dateRange === opt.value && !isCustomMode
                    ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <span>{opt.label}</span>
                {dateRange === opt.value && !isCustomMode && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {isCustomMode && (
            <div className="mt-3 pt-3 border-t border-slate-100 px-2 space-y-2">
              <p className="text-[11px] font-bold text-slate-700">Custom Date Boundaries</p>
              <div className="space-y-1.5">
                <div>
                  <label htmlFor="custom-date-start" className="text-[10px] text-slate-400 font-medium block mb-0.5">
                    Start Date
                  </label>
                  <input
                    id="custom-date-start"
                    name="startDate"
                    type="date"
                    value={customStartInput}
                    onChange={(e) => setCustomStartInput(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="custom-date-end" className="text-[10px] text-slate-400 font-medium block mb-0.5">
                    End Date
                  </label>
                  <input
                    id="custom-date-end"
                    name="endDate"
                    type="date"
                    value={customEndInput}
                    onChange={(e) => setCustomEndInput(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyCustomDates}
                disabled={!customStartInput || !customEndInput}
                className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Apply Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
