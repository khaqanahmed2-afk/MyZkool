import React, { useState } from "react";
import { MessageSquare, Users, Download, Printer, FileCheck, X } from "lucide-react";
import { NOTIFICATION_TEMPLATES } from "../../../workers/notificationWorker";

interface StudentBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSendWhatsApp: (templateKey: string) => void;
  onAssignSection: () => void;
  onExportSelected: () => void;
  onPrintIdCards: () => void;
  onMarkDocumentsRequested: () => void;
}

export function StudentBulkActions({
  selectedCount,
  onClearSelection,
  onSendWhatsApp,
  onAssignSection,
  onExportSelected,
  onPrintIdCards,
  onMarkDocumentsRequested,
}: StudentBulkActionsProps) {
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
        <span className="w-6 h-6 rounded-full bg-[#2158E0] text-xs font-bold flex items-center justify-center">
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-slate-200">selected</span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-400 hover:text-white p-1 rounded-sm cursor-pointer ml-1"
          title="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* WhatsApp message picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {showTemplatePicker && (
            <div className="absolute bottom-full mb-2 left-0 w-64 bg-white text-slate-900 border border-[#E6EAF3] rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                Select message template
              </div>
              <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                {NOTIFICATION_TEMPLATES.map(tmpl => (
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

        {/* Assign Section */}
        <button
          type="button"
          onClick={onAssignSection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>Assign section</span>
        </button>

        {/* Export selected */}
        <button
          type="button"
          onClick={onExportSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export</span>
        </button>

        {/* Print ID cards */}
        <button
          type="button"
          onClick={onPrintIdCards}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>ID cards</span>
        </button>

        {/* Mark documents requested */}
        <button
          type="button"
          onClick={onMarkDocumentsRequested}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <FileCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Request docs</span>
        </button>
      </div>
    </div>
  );
}

