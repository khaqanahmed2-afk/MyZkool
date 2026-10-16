import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Briefcase,
  GraduationCap,
  Settings,
  X,
  HelpCircle,
  IndianRupee,
  Shield,
  Bus,
  Lock,
  Globe,
  ChevronDown,
  UserPlus,
  Award,
  MessageSquare,
  BookOpen,
  Package,
  School as SchoolIcon,
} from "lucide-react";
import { MyZkoolLogo } from "../common/MyZkoolLogo";
import type { School } from "../../types/school";
import { useAuth } from "../../hooks/useAuth";
import { getPendingCount } from "../../services/approvalService";
import { checkSchoolFeature } from "../../middleware/features";
import { SchoolSelector } from "./SchoolSelector";

interface SubNavItem {
  label: string;
  href: string;
  exact?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  featureKey?: string;
  badgeKey?: string;
  children?: SubNavItem[];
}

interface SidebarProps {
  school: School | null;
  isOpen: boolean;
  onClose: () => void;
}

const NAVIGATION: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Admissions", href: "/admin/students/new", icon: UserPlus },
  { label: "Academics", href: "/admin/academics", icon: GraduationCap },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
  { label: "Examinations", href: "/admin/exams", icon: Award },
  {
    label: "Fees",
    href: "/admin/fees",
    icon: IndianRupee,
    children: [
      { label: "Overview", href: "/admin/fees", exact: true },
      { label: "Fee Structures", href: "/admin/fees/setup/structures" },
      { label: "Invoices", href: "/admin/fees/invoices" },
      { label: "Collections", href: "/admin/fees/collections" },
      { label: "Discounts & Concessions", href: "/admin/fees/setup/concessions" },
      { label: "Dues & Reminders", href: "/admin/fees/reminders" },
      { label: "Reports", href: "/admin/fees/reports" },
    ],
  },
  { label: "Transport", href: "/admin/transport", icon: Bus, featureKey: "transport" },
  { label: "Communication", href: "/admin/communication", icon: MessageSquare },
  { label: "Library", href: "/admin/library", icon: BookOpen },
  { label: "Inventory", href: "/admin/inventory", icon: Package },
  { label: "Staff", href: "/admin/staff", icon: Briefcase },
  { label: "Settings", href: "/admin/settings/classes", icon: Settings },
];

export function Sidebar({ school, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [hasTransport, setHasTransport] = useState<boolean>(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!school?.id) return;
    checkSchoolFeature(school.id, "transport").then(setHasTransport).catch(() => setHasTransport(false));
    getPendingCount(school.id).then((count) => setPendingApprovals(count)).catch(() => {});
    const timer = setInterval(() => {
      getPendingCount(school.id).then((count) => setPendingApprovals(count)).catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [school?.id]);

  // Auto-expand sections when on a child route
  useEffect(() => {
    const expanded = new Set<string>();
    for (const item of NAVIGATION) {
      if (
        item.children &&
        item.href !== "/admin" &&
        location.pathname.startsWith(item.href)
      ) {
        expanded.add(item.href);
      }
    }
    setExpandedSections(expanded);
  }, [location.pathname]);

  const toggleSection = (href: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const isChildActive = (child: SubNavItem): boolean => {
    if (child.href === "/admin/fees") {
      return (
        location.pathname === "/admin/fees" ||
        location.pathname === "/admin/fees/dashboard"
      );
    }
    if (child.href === "/admin/fees/collections") {
      return (
        location.pathname === "/admin/fees/collections" ||
        location.pathname === "/admin/fees/collect"
      );
    }
    if (child.href === "/admin/fees/reminders" || child.href === "/admin/fees/defaulters") {
      return (
        location.pathname === "/admin/fees/reminders" ||
        location.pathname === "/admin/fees/dues-report" ||
        location.pathname === "/admin/fees/defaulters"
      );
    }
    if (child.exact) {
      return (
        location.pathname === child.href ||
        location.pathname === "/admin/fees/dashboard"
      );
    }
    return location.pathname.startsWith(child.href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#E6EAF3] z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-lg md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#E6EAF3] shrink-0">
          <Link to="/admin" className="flex items-center" onClick={() => onClose()}>
            <MyZkoolLogo size={28} showText={true} />
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 md:hidden text-[#5B6478] hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* School Identity Selector */}
        <SchoolSelector variant="sidebar" />

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-200">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            const hasChildren = !!(item.children && item.children.length > 0);
            const isExpanded = expandedSections.has(item.href);
            const parentOnRoute =
              item.href !== "/admin" && location.pathname.startsWith(item.href);
            const exactActive =
              !hasChildren &&
              (location.pathname === item.href ||
                (item.href !== "/admin" && location.pathname.startsWith(item.href)));
            const badge =
              item.badgeKey === "approvals" && pendingApprovals > 0 ? pendingApprovals : 0;

            return (
              <div key={item.href}>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      parentOnRoute
                        ? "bg-blue-50 text-[#2158E0] font-semibold"
                        : "text-[#5B6478] hover:bg-gray-50 hover:text-[#141A2E]"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        parentOnRoute
                          ? "text-[#2158E0]"
                          : "text-[#5B6478]"
                      }`}
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      } ${
                        parentOnRoute
                          ? "text-[#2158E0]"
                          : "text-[#94A3B8]"
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      exactActive
                        ? "bg-[#2158E0] text-white shadow-sm"
                        : "text-[#5B6478] hover:bg-[#F0F5FE] hover:text-[#2158E0]"
                    }`}
                    onClick={() => { if (window.innerWidth < 768) onClose(); }}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${exactActive ? "text-white" : "text-[#5B6478]"}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.featureKey === "transport" && !hasTransport && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1 shrink-0">
                        <Lock className="w-2.5 h-2.5" /> PRO
                      </span>
                    )}
                    {badge > 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ${exactActive ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                )}

                {/* Sub-items */}
                {hasChildren && isExpanded && (
                  <div className="ml-3.5 mt-0.5 mb-1 border-l-2 border-blue-100 pl-3 space-y-0.5">
                    {item.children!.map((child) => {
                      const childActive = isChildActive(child);
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={`flex items-center px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                            childActive
                              ? "bg-blue-50 text-[#2158E0] font-bold"
                              : "text-[#5B6478] hover:bg-slate-50 hover:text-[#141A2E]"
                          }`}
                          onClick={() => { if (window.innerWidth < 768) onClose(); }}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom */}
        <div className="p-3.5 border-t border-[#E6EAF3] shrink-0 space-y-1.5">
          <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 rounded-lg transition-colors">
            <HelpCircle className="w-4 h-4" />
            Help & Support
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 bg-[#F8FAFC] rounded-lg border border-[#E6EAF3]/60">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
              {profile?.full_name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#141A2E] truncate">{profile?.full_name || "Admin User"}</p>
              <p className="text-[10px] text-[#5B6478] capitalize truncate">
                {profile?.role?.replace(/_/g, " ") || "School Admin"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
