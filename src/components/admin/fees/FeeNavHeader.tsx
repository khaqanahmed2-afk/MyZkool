import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  PlusCircle,
  CreditCard,
  Receipt,
  Bell,
  BarChart3,
  ChevronDown,
  Layers,
  Calendar,
  Grid3X3,
  Percent,
  Clock,
  Sliders,
  CheckSquare,
  FileCheck2,
  Undo2,
  Lock,
} from "lucide-react";

interface FeeNavHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function FeeNavHeader({ title, subtitle, action }: FeeNavHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [setupDropdownOpen, setSetupDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const setupRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const pathname = location.pathname;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (setupRef.current && !setupRef.current.contains(event.target as Node)) {
        setSetupDropdownOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isOverview = pathname === "/admin/fees" || pathname === "/admin/fees/dashboard";
  const isSetup = pathname.startsWith("/admin/fees/setup");
  const isDues = pathname === "/admin/fees/dues" || pathname === "/admin/fees/invoices" || pathname === "/admin/fees/assign";
  const isCollect = pathname === "/admin/fees/collect";
  const isReceipts = pathname === "/admin/fees/receipts";
  const isDefaulters = pathname === "/admin/fees/defaulters" || pathname === "/admin/fees/dues-report";
  const isReports = pathname === "/admin/fees/reports";
  const isCheques = pathname === "/admin/fees/cheques";
  const isDayClose = pathname === "/admin/fees/day-close";
  const isRefunds = pathname === "/admin/fees/refunds";
  const isMore = isCheques || isDayClose || isRefunds;

  const setupLinks = [
    { label: "Setup Checklist", href: "/admin/fees/setup", icon: CheckSquare, desc: "Step-by-step setup guide" },
    { label: "Fee Categories / Heads", href: "/admin/fees/setup/heads", icon: Layers, desc: "Tuition, Exam, Transport, etc." },
    { label: "Billing Cycles / Terms", href: "/admin/fees/setup/terms", icon: Calendar, desc: "Monthly, quarterly, annual schedules" },
    { label: "Class Fee Structures", href: "/admin/fees/setup/structures", icon: Grid3X3, desc: "Class-wise amounts per term" },
    { label: "Discounts & Concessions", href: "/admin/fees/setup/concessions", icon: Percent, desc: "Sibling, RTE, staff-ward rules" },
    { label: "Late Fee Rules", href: "/admin/fees/setup/late-fees", icon: Clock, desc: "Daily, monthly, percent penalties" },
    { label: "Fee & Receipt Settings", href: "/admin/fees/setup/settings", icon: Sliders, desc: "Prefixes, paper size, PIN policy" },
  ];

  const moreLinks = [
    { label: "Cheque Register", href: "/admin/fees/cheques", icon: CheckSquare, desc: "Deposit, clear, or bounce cheques" },
    { label: "Day Close", href: "/admin/fees/day-close", icon: Lock, desc: "Daily cash & collection reconciliation" },
    { label: "Refunds", href: "/admin/fees/refunds", icon: Undo2, desc: "Refund approval and register" },
  ];

  return (
    <div className="bg-white border-b border-[#E6EAF3] -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6 px-4 sm:px-6 pt-5 pb-0 shadow-2xs">
      {/* Top Title & Quick Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#5B6478] mb-1">
            <Link to="/admin" className="hover:text-[#2158E0] transition-colors">Admin</Link>
            <span>/</span>
            <Link to="/admin/fees" className="hover:text-[#2158E0] transition-colors">Fees</Link>
            {title && (
              <>
                <span>/</span>
                <span className="text-[#141A2E] font-semibold">{title}</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#141A2E] font-display">
            {title || "Fee Operations"}
          </h1>
          {subtitle && <p className="text-xs text-[#5B6478] mt-0.5">{subtitle}</p>}
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {action}

          {/* Quick Setup Button */}
          <Link
            to="/admin/fees/setup"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${isSetup
                ? "bg-blue-50 border-blue-200 text-[#2158E0]"
                : "border-[#E6EAF3] bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-200"
              }`}
          >
            <Settings className="w-3.5 h-3.5 text-[#2158E0]" />
            <span>Fee Setup</span>
          </Link>

          {/* Assign Dues / Invoices Button */}
          <Link
            to="/admin/fees/dues"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${isDues
                ? "bg-blue-50 border-blue-200 text-[#2158E0]"
                : "border-[#E6EAF3] bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-200"
              }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Assign Dues</span>
          </Link>

          {/* Collect Fee Button (Primary Action) */}
          <Link
            to="/admin/fees/collect"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-[#1A46B8] transition-colors cursor-pointer shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Collect Fee</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-[#E6EAF3]/70 pt-1 -mb-px">
        {/* Overview Tab */}
        <Link
          to="/admin/fees"
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${isOverview
              ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
              : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
            }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Overview</span>
        </Link>

        {/* Setup Tab with Dropdown */}
        <div className="relative shrink-0" ref={setupRef}>
          <button
            type="button"
            onClick={() => setSetupDropdownOpen(!setupDropdownOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${isSetup
                ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
              }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Fee Setup</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${setupDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {setupDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[#E6EAF3] rounded-xl shadow-lg z-50 p-1.5 animate-in fade-in-50 zoom-in-95">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Configuration & Rules
              </div>
              {setupLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSetupDropdownOpen(false)}
                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${active
                        ? "bg-blue-50 text-[#2158E0] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-[#2158E0]" : "text-slate-400"}`} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Assign & Invoices Tab */}
        <Link
          to="/admin/fees/dues"
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${isDues
              ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
              : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
            }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Assign & Invoices</span>
        </Link>

        {/* Collect Fee Tab */}
        <Link
          to="/admin/fees/collect"
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${isCollect
              ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
              : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
            }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Collect Fee</span>
        </Link>

        {/* Receipts Tab */}
        <Link
          to="/admin/fees/receipts"
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${isReceipts
              ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
              : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
            }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Receipts</span>
        </Link>

        {/* Reminders & Defaulters Tab */}
        <Link
          to="/admin/fees/defaulters"
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${isDefaulters
              ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
              : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
            }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Reminders & Defaulters</span>
        </Link>

        {/* Reports Tab */}
        <Link
          to="/admin/fees/reports"
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${isReports
              ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
              : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
            }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Fee Reports</span>
        </Link>

        {/* More Actions Dropdown */}
        <div className="relative shrink-0" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${isMore
                ? "border-[#2158E0] text-[#2158E0] bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
              }`}
          >
            <span>More</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${moreDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {moreDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-[#E6EAF3] rounded-xl shadow-lg z-50 p-1.5 animate-in fade-in-50 zoom-in-95">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Financial Operations
              </div>
              {moreLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMoreDropdownOpen(false)}
                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${active
                        ? "bg-blue-50 text-[#2158E0] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-[#2158E0]" : "text-slate-400"}`} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
