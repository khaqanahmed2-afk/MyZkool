import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";

interface AdminProfileDropdownProps {
  profile: { full_name?: string | null; email?: string | null } | null;
  initials: string;
  onSignOut: () => void;
}

export function AdminProfileDropdown({
  profile,
  initials,
  onSignOut,
}: AdminProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-gray-50 p-1 pr-1.5 rounded-full transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-slate-200 text-[#141A2E] flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
        <ChevronDown className="w-3 h-3 text-[#5B6478] hidden sm:block" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E6EAF3] py-1 z-40 animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-[#141A2E]">
                {profile?.full_name || "Rashid Khan"}
              </p>
              <p className="text-xs text-[#5B6478] truncate">
                {profile?.email || "admin@peaceconvent.edu"}
              </p>
            </div>
            <div className="py-1">
              <Link
                to="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-gray-50 hover:text-[#141A2E]"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4" /> Profile & Account
              </Link>
              <Link
                to="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-gray-50 hover:text-[#141A2E]"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4" /> School Settings
              </Link>
            </div>
            <div className="pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
