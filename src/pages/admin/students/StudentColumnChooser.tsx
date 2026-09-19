import React, { useState, useRef, useEffect } from "react";
import { Columns3, Check } from "lucide-react";

export interface ColumnVisibility {
  gender: boolean;
  dob: boolean;
  category: boolean;
  admission_date: boolean;
  house: boolean;
  sr_no: boolean;
}

interface StudentColumnChooserProps {
  columns: ColumnVisibility;
  onChange: (columns: ColumnVisibility) => void;
}

const AVAILABLE_COLUMNS: { key: keyof ColumnVisibility; label: string }[] = [
  { key: "gender", label: "Gender" },
  { key: "dob", label: "Date of birth" },
  { key: "category", label: "Category" },
  { key: "admission_date", label: "Admission date" },
  { key: "house", label: "House" },
  { key: "sr_no", label: "SR number" },
];

export function StudentColumnChooser({ columns, onChange }: StudentColumnChooserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (key: keyof ColumnVisibility) => {
    onChange({
      ...columns,
      [key]: !columns[key],
    });
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
      >
        <Columns3 className="w-3.5 h-3.5 text-slate-500" />
        <span>Columns</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#E6EAF3] rounded-xl shadow-lg p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Toggle columns
          </div>
          <div className="space-y-0.5 mt-1">
            {AVAILABLE_COLUMNS.map(col => (
              <button
                key={col.key}
                type="button"
                onClick={() => toggleColumn(col.key)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <span>{col.label}</span>
                {columns[col.key] ? (
                  <Check className="w-3.5 h-3.5 text-[#2158E0]" />
                ) : (
                  <span className="w-3.5 h-3.5 border border-slate-300 rounded-sm" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
