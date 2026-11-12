import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#5B6478] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        aria-label="View notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-2xs">
          3
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E6EAF3] py-2 z-40 animate-in fade-in zoom-in-95">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#141A2E]">Notifications</span>
                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                  3 new
                </span>
              </div>
              <button
                type="button"
                className="text-[11px] text-[#2158E0] font-semibold cursor-pointer hover:underline bg-transparent border-none p-0"
                onClick={() => {}}
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#141A2E]">
                    Fee payment of ₹12,000 received
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Class IX • Ayaan Khan • 5 min ago
                  </p>
                </div>
              </div>

              <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#141A2E]">
                    New student admission verified
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Class VI • Admission No. 2026/089 • 18 min ago
                  </p>
                </div>
              </div>

              <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#141A2E]">
                    PTM notice scheduled
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Parent notification queued for 15 Nov 2026 • 42 min ago
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-2 border-t border-slate-100 text-center">
              <Link
                to="/admin/reports"
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-[#2158E0] hover:underline"
              >
                View all activity logs →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
