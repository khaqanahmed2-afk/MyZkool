import React, { useState } from "react";
import {
  Sparkles,
  CreditCard,
  Download,
  Bus,
  UserCheck,
  MessageSquare,
  X,
  Trash2,
  ChevronUp,
} from "lucide-react";
import { NOTIFICATION_TEMPLATES } from "../../../workers/notificationWorker";

interface StudentBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onPromoteSelected: () => void;
  onGenerateIdCards: () => void;
  onExportSelected: () => void;
  onAssignTransport: () => void;
  onChangeStatus: () => void;
  onSendWhatsApp: (templateKey: string) => void;
  onDeleteSelected?: () => void;
}

export function StudentBulkActions({
  selectedCount,
  onClearSelection,
  onPromoteSelected,
  onGenerateIdCards,
  onExportSelected,
  onAssignTransport,
  onChangeStatus,
  onSendWhatsApp,
  onDeleteSelected,
}: StudentBulkActionsProps) {
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-2.5 border border-slate-700/80 animate-in slide-in-from-bottom-5 duration-200 max-w-[95vw]">
      {/* Selected Counter & Deselect */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <span className="w-6 h-6 rounded-full bg-[#2158E0] text-xs font-bold flex items-center justify-center shadow-xs">
          {selectedCount}
        </span>
        <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
          {selectedCount === 1 ? "student selected" : "students selected"}
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer ml-1"
          title="Clear selection"
          aria-label="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Contextual Bulk Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Promote */}
        <button
          type="button"
          onClick={onPromoteSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Promote</span>
        </button>

        {/* Generate ID Cards */}
        <button
          type="button"
          onClick={onGenerateIdCards}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span>Generate ID Cards</span>
        </button>

        {/* Export */}
        <button
          type="button"
          onClick={onExportSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export</span>
        </button>

        {/* Assign Transport */}
        <button
          type="button"
          onClick={onAssignTransport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <Bus className="w-3.5 h-3.5 text-slate-400" />
          <span>Assign Transport</span>
        </button>

        {/* Change Status */}
        <button
          type="button"
          onClick={onChangeStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Change Status</span>
        </button>

        {/* WhatsApp message picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
            <ChevronUp className="w-3 h-3 opacity-80" />
          </button>

          {showTemplatePicker && (
            <div className="absolute bottom-full mb-2 left-0 w-72 bg-white text-slate-900 border border-[#E6EAF3] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Select message template
              </div>
              <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                {NOTIFICATION_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => {
                      onSendWhatsApp(tmpl.key);
                      setShowTemplatePicker(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                  >
                    <div className="text-slate-900 font-semibold">{tmpl.key.replace(/_/g, " ")}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{tmpl.body}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete selected students */}
        {onDeleteSelected && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold transition-colors cursor-pointer ml-1 shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );
}
