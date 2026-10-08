import React, { useState, useRef, useEffect } from "react";
import { Columns3, Check, RotateCcw } from "lucide-react";

export interface ColumnVisibility {
  roll_no?: boolean;
  gender?: boolean;
  dob?: boolean;
  category?: boolean;
  admission_date?: boolean;
  house?: boolean;
  sr_no?: boolean;
  parent_phone?: boolean;
  fee_status?: boolean;
  documents?: boolean;
  transport?: boolean;
}

interface StudentColumnChooserProps {
  columns: ColumnVisibility;
  onChange: (columns: ColumnVisibility) => void;
}

const AVAILABLE_COLUMNS: { key: keyof ColumnVisibility; label: string; defaultVal: boolean }[] = [
  { key: "roll_no", label: "Roll No.", defaultVal: false },
  { key: "parent_phone", label: "Parent Phone", defaultVal: true },
  { key: "gender", label: "Gender", defaultVal: false },
  { key: "dob", label: "Date of Birth", defaultVal: false },
  { key: "category", label: "Category", defaultVal: false },
  { key: "fee_status", label: "Fee Status", defaultVal: true },
  { key: "documents", label: "Documents", defaultVal: true },
  { key: "transport", label: "Transport Route", defaultVal: true },
  { key: "admission_date", label: "Admission Date", defaultVal: false },
  { key: "house", label: "House", defaultVal: false },
  { key: "sr_no", label: "SR Number", defaultVal: false },
];

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  roll_no: false,
  parent_phone: true,
  gender: false,
  dob: false,
  category: false,
  fee_status: true,
  documents: true,
  transport: true,
  admission_date: false,
  house: false,
  sr_no: false,
};

export function StudentColumnChooser({ columns, onChange }: StudentColumnChooserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleColumn = (key: keyof ColumnVisibility) => {
    onChange({
      ...columns,
      [key]: !columns[key],
    });
  };

  const resetToDefault = () => {
    onChange(DEFAULT_COLUMN_VISIBILITY);
  };

  const activeCount = Object.values(columns).filter(Boolean).length;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        aria-label="Customize visible columns"
        aria-expanded={isOpen}
      >
        <Columns3 className="w-3.5 h-3.5 text-slate-500" />
        <span>Columns</span>
        <span className="text-[11px] font-medium text-slate-400">({activeCount})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E6EAF3] rounded-xl shadow-xl p-2 z-40 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Toggle Columns
            </span>
            <button
              type="button"
              onClick={resetToDefault}
              className="text-[10px] text-[#2158E0] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              title="Reset to defaults"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset
            </button>
          </div>

          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {AVAILABLE_COLUMNS.map((col) => {
              const isChecked = Boolean(columns[col.key]);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumn(col.key)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <span>{col.label}</span>
                  <div
                    className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors ${
                      isChecked
                        ? "bg-[#2158E0] text-white"
                        : "border border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
