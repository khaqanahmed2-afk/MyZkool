import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  WalletCards,
  Briefcase,
  CalendarDays,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Settings,
  X,
  HelpCircle,
  IndianRupee,
  Shield,
  Bus,
  Lock,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  CreditCard,
  Receipt,
  Bell,
  Layers,
  FileCheck2,
} from "lucide-react";
import { MyZkoolLogo } from "../MyZkoolLogo";
import type { School } from "../../types/school";
import { useAuth } from "../../hooks/useAuth";
import { getPendingCount } from "../../services/approvalService";
import { checkSchoolFeature } from "../../middleware/features";

interface SidebarProps {
  school: School | null;
  isOpen: boolean;
  onClose: () => void;
}

const NAVIGATION = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
  { label: "Fees", href: "/admin/fees", icon: IndianRupee },
  { label: "Transport", href: "/admin/transport", icon: Bus, featureKey: "transport" },
  { label: "Staff", href: "/admin/staff", icon: Briefcase },
  { label: "Timetable", href: "/admin/timetable", icon: CalendarDays },
  { label: "Exams & Results", href: "/admin/exams", icon: GraduationCap },
  { label: "Communication", href: "/admin/communication", icon: MessageSquare },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Approvals", href: "/admin/approvals", icon: Shield, badgeKey: "approvals" },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar({ school, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [hasTransport, setHasTransport] = useState<boolean>(true);
  const [feesExpanded, setFeesExpanded] = useState<boolean>(() => location.pathname.startsWith("/admin/fees"));

  useEffect(() => {
    if (location.pathname.startsWith("/admin/fees")) {
      setFeesExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!school?.id) return;
    checkSchoolFeature(school.id, "transport").then(setHasTransport).catch(() => setHasTransport(false));
    getPendingCount(school.id).then(count => setPendingApprovals(count)).catch(() => {});
    const timer = setInterval(() => {
      getPendingCount(school.id).then(count => setPendingApprovals(count)).catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [school?.id]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#E6EAF3] z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-lg md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E6EAF3] shrink-0">
          <Link
            to="/admin"
            className="flex items-center"
            onClick={() => onClose()}
          >
            <MyZkoolLogo size={28} showText={true} />
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 md:hidden text-[#5B6478] hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* School Identity */}
        <div className="p-4 border-b border-[#E6EAF3]/60 shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            {school?.logo_url ? (
              <img
                src={school.logo_url}
                alt={school.name}
                className="w-10 h-10 rounded-lg object-cover border border-[#E6EAF3]"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#F0F5FE] text-[#2158E0] flex items-center justify-center font-bold text-sm border border-blue-100 shrink-0">
                {school?.name?.charAt(0) || "S"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2
                className="text-sm font-bold text-[#141A2E] truncate"
                title={school?.name || "School Name"}
              >
                {school?.name || "Loading School..."}
              </h2>
              <p className="text-[11px] text-[#5B6478] truncate">
                {school?.subdomain
                  ? `${school.subdomain}.myzkool.com`
                  : "Setup pending"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
          {NAVIGATION.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/admin" &&
                location.pathname.startsWith(item.href));
            const Icon = item.icon;
            const badge = (item as any).badgeKey === "approvals" && pendingApprovals > 0
              ? pendingApprovals : 0;
            const isFeeItem = item.href === "/admin/fees";

            return (
              <React.Fragment key={item.href}>
                <div className="flex items-center">
                  <Link
                    to={item.href}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#2158E0] text-white shadow-sm"
                        : "text-[#5B6478] hover:bg-[#F0F5FE] hover:text-[#2158E0]"
                    }`}
                    onClick={() => {
                      if (isFeeItem) {
                        setFeesExpanded(true);
                      }
                      if (window.innerWidth < 768) {
                        onClose();
                      }
                    }}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-white" : "text-[#5B6478]"}`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {(item as any).featureKey === "transport" && !hasTransport && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1 shrink-0">
                        <Lock className="w-2.5 h-2.5" />
                        PRO
                      </span>
                    )}
                    {badge > 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ${isActive ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                  {isFeeItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFeesExpanded(!feesExpanded);
                      }}
                      className={`p-2 rounded-lg text-xs ml-1 transition-colors ${
                        isActive
                          ? "text-[#2158E0] hover:bg-[#F0F5FE]"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                      title={feesExpanded ? "Collapse sub-menu" : "Expand sub-menu"}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          feesExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Submenu for Fees */}
                {isFeeItem && feesExpanded && (
                  <div className="ml-5 pl-2.5 my-1 border-l-2 border-blue-100 space-y-0.5 animate-in fade-in-50 duration-150">
                    <Link
                      to="/admin/fees"
                      onClick={() => window.innerWidth < 768 && onClose()}
                      className={`block px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/fees" || location.pathname === "/admin/fees/dashboard"
                          ? "bg-blue-50 text-[#2158E0] font-semibold"
                          : "text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50"
                      }`}
                    >
                      Overview Dashboard
                    </Link>

                    {/* Setup Header & Sub-links */}
                    <div className="pt-1">
                      <Link
                        to="/admin/fees/setup"
                        onClick={() => window.innerWidth < 768 && onClose()}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          location.pathname === "/admin/fees/setup"
                            ? "bg-blue-50 text-[#2158E0] font-semibold"
                            : "text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50"
                        }`}
                      >
                        <span>Fee Setup Hub</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-100/70 text-blue-700 rounded font-semibold">Start</span>
                      </Link>

                      <div className="ml-2 pl-2 border-l border-slate-200 space-y-0.5 mt-0.5">
                        <Link
                          to="/admin/fees/setup/heads"
                          onClick={() => window.innerWidth < 768 && onClose()}
                          className={`block px-2 py-1 rounded text-[11px] transition-colors ${
                            location.pathname === "/admin/fees/setup/heads"
                              ? "text-[#2158E0] font-bold bg-blue-50/50"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          • Categories (Heads)
                        </Link>
                        <Link
                          to="/admin/fees/setup/terms"
                          onClick={() => window.innerWidth < 768 && onClose()}
                          className={`block px-2 py-1 rounded text-[11px] transition-colors ${
                            location.pathname === "/admin/fees/setup/terms"
                              ? "text-[#2158E0] font-bold bg-blue-50/50"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          • Billing Cycles (Terms)
                        </Link>
                        <Link
                          to="/admin/fees/setup/structures"
                          onClick={() => window.innerWidth < 768 && onClose()}
                          className={`block px-2 py-1 rounded text-[11px] transition-colors ${
                            location.pathname === "/admin/fees/setup/structures"
                              ? "text-[#2158E0] font-bold bg-blue-50/50"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          • Fee Structures
                        </Link>
                        <Link
                          to="/admin/fees/setup/concessions"
                          onClick={() => window.innerWidth < 768 && onClose()}
                          className={`block px-2 py-1 rounded text-[11px] transition-colors ${
                            location.pathname === "/admin/fees/setup/concessions"
                              ? "text-[#2158E0] font-bold bg-blue-50/50"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          • Discounts
                        </Link>
                        <Link
                          to="/admin/fees/setup/late-fees"
                          onClick={() => window.innerWidth < 768 && onClose()}
                          className={`block px-2 py-1 rounded text-[11px] transition-colors ${
                            location.pathname === "/admin/fees/setup/late-fees"
                              ? "text-[#2158E0] font-bold bg-blue-50/50"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          • Late Fees
                        </Link>
                        <Link
                          to="/admin/fees/setup/settings"
                          onClick={() => window.innerWidth < 768 && onClose()}
                          className={`block px-2 py-1 rounded text-[11px] transition-colors ${
                            location.pathname === "/admin/fees/setup/settings"
                              ? "text-[#2158E0] font-bold bg-blue-50/50"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          • Receipt & Settings
                        </Link>
                      </div>
                    </div>

                    <Link
                      to="/admin/fees/dues"
                      onClick={() => window.innerWidth < 768 && onClose()}
                      className={`block px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/fees/dues" || location.pathname === "/admin/fees/assign" || location.pathname === "/admin/fees/invoices"
                          ? "bg-blue-50 text-[#2158E0] font-semibold"
                          : "text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50"
                      }`}
                    >
                      Assign & Invoices
                    </Link>

                    <Link
                      to="/admin/fees/collect"
                      onClick={() => window.innerWidth < 768 && onClose()}
                      className={`block px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/fees/collect"
                          ? "bg-blue-50 text-[#2158E0] font-semibold"
                          : "text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50"
                      }`}
                    >
                      Collect Fee
                    </Link>

                    <Link
                      to="/admin/fees/receipts"
                      onClick={() => window.innerWidth < 768 && onClose()}
                      className={`block px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/fees/receipts"
                          ? "bg-blue-50 text-[#2158E0] font-semibold"
                          : "text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50"
                      }`}
                    >
                      Receipts Register
                    </Link>

                    <Link
                      to="/admin/fees/defaulters"
                      onClick={() => window.innerWidth < 768 && onClose()}
                      className={`block px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/fees/defaulters" || location.pathname === "/admin/fees/dues-report"
                          ? "bg-blue-50 text-[#2158E0] font-semibold"
                          : "text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50"
                      }`}
                    >
                      Reminders & Defaulters
                    </Link>

                    <Link
                      to="/admin/fees/reports"
                      onClick={() => window.innerWidth < 768 && onClose()}
                      className={`block px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/fees/reports"
                          ? "bg-blue-50 text-[#2158E0] font-semibold"
                          : "text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50"
                      }`}
                    >
                      Fee Reports
                    </Link>
                  </div>
                )}
              </React.Fragment>
            );
          })}

        </div>

        {/* Bottom Area */}
        <div className="p-4 border-t border-[#E6EAF3] shrink-0 space-y-2">
          <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 rounded-lg transition-colors">
            <HelpCircle className="w-4 h-4" />
            Help & Support
          </button>

          <div className="flex items-center gap-3 px-3 py-2 mt-2 bg-[#F8FAFC] rounded-lg border border-[#E6EAF3]/60">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
              {profile?.full_name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#141A2E] truncate">
                {profile?.full_name || "Admin User"}
              </p>
              <p className="text-[10px] text-[#5B6478] uppercase tracking-wide truncate">
                {profile?.role || "School Admin"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
