import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  HelpCircle,
  Calendar,
  ChevronDown,
  LogOut,
  User,
  Shield,
  ExternalLink,
  BookOpen,
  Mail,
  AlertTriangle,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import { MasterAdminDateRangeDropdown } from "./header/MasterAdminDateRangeDropdown";
import { MasterAdminNotificationsMenu } from "./header/MasterAdminNotificationsMenu";
import { MasterAdminProfileMenu } from "./header/MasterAdminProfileMenu";
import { MasterAdminSearchModal } from "./header/MasterAdminSearchModal";
import { MasterAdminHelpModal } from "./header/MasterAdminHelpModal";

interface MasterAdminHeaderProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  startDate?: string;
  endDate?: string;
  onCustomRangeChange?: (start: string, end: string) => void;
  onSearchClick?: () => void;
}

export const MasterAdminHeader: React.FC<MasterAdminHeaderProps> = ({
  dateRange,
  onDateRangeChange,
  startDate,
  endDate,
  onCustomRangeChange,
}) => {
  const { admin, logout } = useMasterAdminAuth();
  const navigate = useNavigate();

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Custom date picker states
  const [customStartInput, setCustomStartInput] = useState(startDate || "");
  const [customEndInput, setCustomEndInput] = useState(endDate || "");
  const [isCustomMode, setIsCustomMode] = useState(dateRange === "custom");

  const dateMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      } else if (e.key === "Escape") {
        setShowSearchModal(false);
        setShowHelpModal(false);
        setShowDateDropdown(false);
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const dateOptions = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
    { label: "This Year", value: "this_year" },
    { label: "All Time", value: "all_time" },
    { label: "Custom Range...", value: "custom" },
  ];

  const currentLabel =
    dateRange === "custom"
      ? customStartInput && customEndInput
        ? `${customStartInput} to ${customEndInput}`
        : "Custom Range"
      : dateOptions.find((o) => o.value === dateRange)?.label || "Last 30 Days";

  const handleApplyCustomDates = () => {
    if (customStartInput && customEndInput && onCustomRangeChange) {
      onCustomRangeChange(customStartInput, customEndInput);
      onDateRangeChange("custom");
      setShowDateDropdown(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/master-admin/login");
    } catch {
      navigate("/master-admin/login");
    }
  };

  // Mock quick navigation items for Global Search
  const quickSearchItems = [
    { title: "Peace Convent School", category: "School", url: "/master-admin/schools/b70261ef-37f1-46c8-a148-2c496a9d33a8" },
    { title: "Khaqan Public School", category: "School", url: "/master-admin/schools" },
    { title: "Abdul Hamed Memorial Enter College", category: "Pending School", url: "/master-admin/schools?status=pending" },
    { title: "Pro Subscription Plan", category: "Pricing Plan", url: "/master-admin/subscriptions" },
    { title: "Basic Subscription Plan", category: "Pricing Plan", url: "/master-admin/subscriptions" },
    { title: "Pending School Subscription Invoices", category: "Billing", url: "/master-admin/billing" },
    { title: "Open Support Tickets Queue", category: "Support", url: "/master-admin/support" },
    { title: "Platform Audit Logs", category: "Security", url: "/master-admin/audit-logs" },
  ];

  const filteredSearch = quickSearchItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="h-20 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none shadow-2xs">
        {/* ── Left: Greeting ─────────────────────────────────────────── */}
        {/* Left: Greeting */}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 truncate font-heading">
            Welcome back, {admin?.full_name?.split(" ")[0] || "Super"} {admin?.full_name?.split(" ")[1] || "Admin"} 👋
          </h1>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
            Here's what's happening across the MyZkool platform today.
          </p>
        </div>

        {/* ── Right: Search, Date Filter & Quick Actions ──────────────── */}
        {/* Right: Search, Date Filter & Quick Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search Trigger Button */}
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="relative hidden md:flex items-center w-64 lg:w-80 px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-400 cursor-pointer transition-colors shadow-2xs text-left"
            aria-label="Open search dialog"
          >
            <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <span className="truncate">Search schools, plans, tickets...</span>
            <kbd className="ml-auto inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
              Ctrl + K
            </kbd>
          </button>

          {/* Date Filter Dropdown */}
          <div className="relative" ref={dateMenuRef}>
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{currentLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          <MasterAdminDateRangeDropdown
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            startDate={startDate}
            endDate={endDate}
            onCustomRangeChange={onCustomRangeChange}
          />

            {showDateDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 mb-1">
                  Time Period
                </div>
                <div className="space-y-0.5">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (opt.value === "custom") {
                          setIsCustomMode(true);
                        } else {
                          setIsCustomMode(false);
                          onDateRangeChange(opt.value);
                          setShowDateDropdown(false);
                        }
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left rounded-lg transition-colors flex items-center justify-between ${
                        dateRange === opt.value && !isCustomMode
                          ? "bg-blue-50 text-blue-600 font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {dateRange === opt.value && !isCustomMode && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Subform */}
                {isCustomMode && (
                  <div className="mt-3 pt-3 border-t border-slate-100 px-2 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700">Custom Date Boundaries</p>
                    <div className="space-y-1.5">
                      <div>
                        <label htmlFor="custom-date-start" className="text-[10px] text-slate-400 font-medium block mb-0.5">Start Date</label>
                        <input
                          id="custom-date-start"
                          name="startDate"
                          type="date"
                          value={customStartInput}
                          onChange={(e) => setCustomStartInput(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="custom-date-end" className="text-[10px] text-slate-400 font-medium block mb-0.5">End Date</label>
                        <input
                          id="custom-date-end"
                          name="endDate"
                          type="date"
                          value={customEndInput}
                          onChange={(e) => setCustomEndInput(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleApplyCustomDates}
                      disabled={!customStartInput || !customEndInput}
                      className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Apply Filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notifications Popover */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Platform Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            </button>
          <MasterAdminNotificationsMenu />

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900">Notifications</h4>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    3 Pending
                  </span>
                </div>

                <div className="space-y-2.5">
                  <Link
                    to="/master-admin/schools?status=pending"
                    onClick={() => setShowNotifications(false)}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                        1 School registration pending
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Abdul Hamed Memorial Enter College awaiting onboarding approval
                      </p>
                    </div>
                  </Link>

                  <Link
                    to="/master-admin/subscriptions"
                    onClick={() => setShowNotifications(false)}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                        Trial subscription active
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Peace Convent School 14-day trial period underway
                      </p>
                    </div>
                  </Link>

                  <Link
                    to="/master-admin/billing"
                    onClick={() => setShowNotifications(false)}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                        SaaS Payment gateway active
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Razorpay production checkout integration online
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Platform Documentation & Help"
            aria-label="Platform Documentation and Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20">
                {admin?.full_name ? admin.full_name.slice(0, 2).toUpperCase() : "KA"}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="pb-3 border-b border-slate-100 mb-2">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {admin?.full_name || "Khaqan Ahmad"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {admin?.email || "myzkool.official@gmail.com"}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60">
                    <Shield className="w-3 h-3" />
                    <span>{admin?.role?.name || "Super Admin"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Link
                    to="/master-admin/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Platform Settings</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <MasterAdminProfileMenu admin={admin} onLogout={handleLogout} />
        </div>
      </header>

      {/* ── GLOBAL SEARCH MODAL (Ctrl+K) ─────────────────────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                id="master-admin-search-dialog"
                name="globalSearchQuery"
                aria-label="Search schools, subscriptions, invoices, tickets"
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schools, subscriptions, invoices, tickets..."
                className="flex-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
      {/* Global Search Command Palette Modal */}
      <MasterAdminSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />

            <div className="max-h-80 overflow-y-auto p-2">
              {filteredSearch.length > 0 ? (
                <div className="space-y-1">
                  {filteredSearch.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setShowSearchModal(false);
                        navigate(item.url);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          {item.category}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching records found for "{searchQuery}"
                </div>
              )}
            </div>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Press ESC to close</span>
              <span>Use ↑ ↓ to navigate</span>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENTATION & HELP MODAL ────────────────────────────────────── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Master Admin Guidance & Docs</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>Welcome to the MyZkool Platform Control Plane.</strong> As a Super Administrator, you have
                exclusive visibility and administrative governance across all registered educational institutions.
              </p>

              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800">Quick Operational Guide:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>
                    <strong>Onboard Schools:</strong> Navigate to Schools &gt; New to provision an institutional tenant.
                  </li>
                  <li>
                    <strong>Subscription Tiers:</strong> Basic (₹999/mo), Pro (₹1,799/mo), Custom (&gt;1,800 students).
                  </li>
                  <li>
                    <strong>Cross-Tenant Privacy:</strong> Student biometric and personal identifiers remain isolated
                    under DPDP Act governance.
                  </li>
                  <li>
                    <strong>Direct Support:</strong> Contact engineering via support@myzkool.com or +91 8400404002.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="mailto:support@myzkool.com"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold text-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Engineering Desk</span>
                </a>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Documentation & Help Modal */}
      <MasterAdminHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </>
  );
};
