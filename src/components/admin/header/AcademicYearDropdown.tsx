import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Check } from "lucide-react";

interface AcademicYearDropdownProps {
  activeYearLabel: string;
}

export function AcademicYearDropdown({ activeYearLabel }: AcademicYearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E6EAF3] hover:border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer text-left"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select academic session"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-[#8A94A6] uppercase tracking-wider leading-none">
            Academic Year
          </span>
          <span className="text-xs font-bold text-[#141A2E] leading-tight mt-0.5">
            {activeYearLabel}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#E6EAF3] p-1.5 z-40 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Active Academic Session
            </div>
            <div className="py-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#2158E0] bg-blue-50 rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{activeYearLabel}</span>
                </div>
                <Check className="w-3.5 h-3.5 text-[#2158E0]" />
              </button>
            </div>
            <div className="pt-1 border-t border-slate-100">
              <Link
                to="/admin/settings"
                onClick={() => setIsOpen(false)}
                className="w-full block px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:text-[#141A2E] hover:bg-slate-50 rounded"
              >
                Manage Academic Years →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
