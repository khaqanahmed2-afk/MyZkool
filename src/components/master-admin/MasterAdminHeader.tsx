import React, { useState } from "react";
import { Search, Bell, HelpCircle, Calendar, ChevronDown } from "lucide-react";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";

interface MasterAdminHeaderProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  onSearchClick?: () => void;
}

export const MasterAdminHeader: React.FC<MasterAdminHeaderProps> = ({
  dateRange,
  onDateRangeChange,
  onSearchClick,
}) => {
  const { admin } = useMasterAdminAuth();
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dateOptions = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
    { label: "Last 6 Months", value: "6m" },
    { label: "Last 1 Year", value: "1y" },
  ];

  const currentLabel = dateOptions.find((o) => o.value === dateRange)?.label || "Last 30 Days";

  return (
    <header className="h-20 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* ── Left: Greeting ─────────────────────────────────────────── */}
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 truncate font-heading">
          Welcome back, {admin?.full_name?.split(" ")[0] || "Khaqan"} {admin?.full_name?.split(" ")[1] || "Ahmad"} 👋
        </h1>
        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
          Here's what's happening across the MyZkool platform today.
        </p>
      </div>

      {/* ── Right: Search, Date Filter & Quick Actions ──────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Search input with Ctrl+K shortcut */}
        <div className="relative hidden md:block w-72 lg:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={onSearchClick}
            placeholder="Search schools, users, tickets, invoices..."
            className="w-full pl-10 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
              Ctrl + K
            </kbd>
          </div>
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{currentLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showDateDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onDateRangeChange(opt.value);
                    setShowDateDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left transition-colors flex items-center justify-between ${
                    dateRange === opt.value
                      ? "bg-blue-50 text-blue-600 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{opt.label}</span>
                  {dateRange === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon with Badge */}
        <button
          className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Platform Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Help Icon */}
        <button
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Platform Documentation & Support"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Avatar Circle */}
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20">
          KA
        </div>
      </div>
    </header>
  );
};

