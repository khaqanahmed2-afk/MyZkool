import React, { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  Eye,
  Edit3,
  CreditCard,
  FileText,
  DollarSign,
  CalendarCheck,
  Bus,
  Sparkles,
  FileBadge,
  Trash2,
  Phone,
  MessageSquare,
} from "lucide-react";
import type { StudentListItem } from "../../../types/students";

interface StudentRowActionsProps {
  student: StudentListItem;
  onView: (student: StudentListItem) => void;
  onEdit: (student: StudentListItem) => void;
  onGenerateIdCard: (student: StudentListItem) => void;
  onViewDocuments: (student: StudentListItem) => void;
  onViewFees: (student: StudentListItem) => void;
  onViewAttendance: (student: StudentListItem) => void;
  onViewTransport: (student: StudentListItem) => void;
  onPromote: (student: StudentListItem) => void;
  onTransfer: (student: StudentListItem) => void;
  onDeactivate: (student: StudentListItem) => void;
}

export function StudentRowActions({
  student,
  onView,
  onEdit,
  onGenerateIdCard,
  onViewDocuments,
  onViewFees,
  onViewAttendance,
  onViewTransport,
  onPromote,
  onTransfer,
  onDeactivate,
}: StudentRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleAction = (actionFn: (s: StudentListItem) => void, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    actionFn(student);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
        aria-label={`Actions for ${student.first_name} ${student.last_name}`}
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1 w-52 bg-white border border-[#E6EAF3] rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left text-xs font-medium text-slate-700 divide-y divide-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Primary View / Edit Group */}
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onView, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>View Student Profile</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onEdit, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Student</span>
            </button>
          </div>

          {/* Quick Academic & Finance Actions */}
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onGenerateIdCard, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>Generate ID Card</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onViewDocuments, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>View Documents</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onViewFees, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span>View Fees & Ledger</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onViewAttendance, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>View Attendance</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onViewTransport, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              <Bus className="w-3.5 h-3.5 text-slate-500" />
              <span>View Transport</span>
            </button>
          </div>

          {/* Lifecycle & Promotions */}
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onPromote, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-blue-600 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Promote Student</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onTransfer, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              <FileBadge className="w-3.5 h-3.5 text-slate-500" />
              <span>Transfer / Issue TC</span>
            </button>
          </div>

          {/* Destructive Deactivate / Delete Group (Visually separated) */}
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction(onDeactivate, e)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Deactivate / Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
