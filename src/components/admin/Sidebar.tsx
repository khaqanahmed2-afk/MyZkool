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
  Bus,
  Lock,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Award,
  MessageSquare,
  BookOpen,
  Package,
  BarChart3,
  LogOut,
} from "lucide-react";
import { MyZkoolLogo } from "../common/MyZkoolLogo";
import type { School } from "../../types/school";
import { useAuth } from "../../hooks/useAuth";
import { getPendingCount } from "../../services/approvalService";
import { checkSchoolFeature } from "../../middleware/features";
import { SchoolSelector } from "./SchoolSelector";

export interface SubNavItem {
  label: string;
  href: string;
  exact?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  featureKey?: string;
  badgeKey?: string;
  children?: SubNavItem[];
  exact?: boolean;
}

export interface NavGroup {
  groupTitle?: string;
  items: NavItem[];
}

export interface SidebarProps {
  school: School | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    groupTitle: "School Management",
    items: [
      { label: "Students", href: "/admin/students", icon: Users, exact: true },
      { label: "Admissions", href: "/admin/students/new", icon: UserPlus, exact: true },
      { label: "Academics", href: "/admin/settings/classes", icon: GraduationCap, exact: true },
      { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck, exact: true },
      { label: "Examinations", href: "/admin/exams", icon: Award, exact: true },
    ],
  },
  {
    groupTitle: "Fees & Accounts",
    items: [
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
      { label: "Staff & HR", href: "/admin/staff", icon: Briefcase, exact: true },
    ],
  },
  {
    groupTitle: "School Operations",
    items: [
      { label: "Communication", href: "/admin/communication", icon: MessageSquare, exact: true },
      { label: "Library", href: "/admin/library", icon: BookOpen, exact: true },
      { label: "Inventory", href: "/admin/inventory", icon: Package, exact: true },
    ],
  },
  {
    groupTitle: "Reports & Settings",
    items: [
      { label: "Reports & Analytics", href: "/admin/fees/reports", icon: BarChart3, exact: true },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        children: [
          { label: "Classes & Sections", href: "/admin/settings/classes" },
          { label: "Data Purge & Privacy", href: "/admin/settings/privacy" },
        ],
      },
    ],
  },
];

export const ALL_NAV_HREFS = NAVIGATION_GROUPS.flatMap((g) => g.items.map((i) => i.href));

export function normalizePath(path: string): string {
  const withoutHash = path.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed || "/";
}

export function isNavItemActive(
  item: NavItem,
  currentPath: string,
  allHrefs: string[] = ALL_NAV_HREFS
): boolean {
  if (item.children && item.children.length > 0) {
    return false;
  }

  const current = normalizePath(currentPath);
  const target = normalizePath(item.href);

  // Exact match always activates
  if (current === target) {
    return true;
  }

  // Exact route matching: if item explicitly requires exact (or defaults to exact),
  // non-exact match will not activate.
  if (item.exact !== false) {
    return false;
  }

  // When exact is explicitly false, allow prefix match on path segment boundaries
  if (!current.startsWith(target + "/")) {
    return false;
  }

  // Avoid parent/nested route conflicts:
  // If another nav item is an exact match or a longer/more specific match for currentPath,
  // the parent item must NOT be active.
  const hasConflict = allHrefs.some((otherHref) => {
    const otherTarget = normalizePath(otherHref);
    if (otherTarget === target) return false;
    if (otherTarget === current) return true;
    if (
      current.startsWith(otherTarget + "/") &&
      otherTarget.startsWith(target + "/")
    ) {
      return true;
    }
    return false;
  });

  return !hasConflict;
}

export function Sidebar({ school, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [hasTransport, setHasTransport] = useState<boolean>(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (!school?.id) return;
    checkSchoolFeature(school.id, "transport").then(setHasTransport).catch(() => setHasTransport(false));
    getPendingCount(school.id).then((count) => setPendingApprovals(count)).catch(() => { });
    const timer = setInterval(() => {
      getPendingCount(school.id).then((count) => setPendingApprovals(count)).catch(() => { });
    }, 30_000);
    return () => clearInterval(timer);
  }, [school?.id]);

  // Auto-expand sections when on a child route
  useEffect(() => {
    const current = normalizePath(location.pathname);
    const expanded = new Set<string>();
    for (const group of NAVIGATION_GROUPS) {
      for (const item of group.items) {
        if (item.children && item.href !== "/admin") {
          const target = normalizePath(item.href);
          if (current === target || current.startsWith(target + "/")) {
            expanded.add(item.href);
          }
        }
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
    const current = normalizePath(location.pathname);
    const target = normalizePath(child.href);

    if (child.href === "/admin/fees") {
      return (
        current === "/admin/fees" ||
        current === "/admin/fees/dashboard"
      );
    }
    if (child.href === "/admin/fees/collections") {
      return (
        current === "/admin/fees/collections" ||
        current === "/admin/fees/collect"
      );
    }
    if (child.href === "/admin/fees/reminders" || child.href === "/admin/fees/defaulters") {
      return (
        current === "/admin/fees/reminders" ||
        current === "/admin/fees/dues-report" ||
        current === "/admin/fees/defaulters"
      );
    }
    if (child.exact) {
      return (
        current === target ||
        current === "/admin/fees/dashboard"
      );
    }
    return current === target || current.startsWith(target + "/");
  };

  // User initials
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "RK";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 md:hidden transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#E6EAF3] z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#E6EAF3] shrink-0">
          <Link to="/admin" className="flex items-center" onClick={() => onClose()}>
            <MyZkoolLogo size={28} showText={true} />
          </Link>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1.5 md:hidden text-[#5B6478] hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* School Identity Selector */}
        <SchoolSelector variant="sidebar" />

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-thin scrollbar-thumb-gray-200">
          {NAVIGATION_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              {group.groupTitle && (
                <div className="px-3 pt-2 pb-1 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                  {group.groupTitle}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = !!(item.children && item.children.length > 0);
                const isExpanded = expandedSections.has(item.href);
                const currentNorm = normalizePath(location.pathname);
                const itemNorm = normalizePath(item.href);
                const parentOnRoute =
                  item.href !== "/admin" &&
                  (currentNorm === itemNorm || currentNorm.startsWith(itemNorm + "/"));
                const exactActive = isNavItemActive(item, location.pathname, ALL_NAV_HREFS);

                const badge =
                  item.badgeKey === "approvals" && pendingApprovals > 0 ? pendingApprovals : 0;

                return (
                  <div key={item.href}>
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleSection(item.href)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                          parentOnRoute
                            ? "bg-blue-50/80 text-[#2158E0]"
                            : "text-[#5B6478] hover:bg-[#F8FAFC] hover:text-[#141A2E]"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            parentOnRoute ? "text-[#2158E0]" : "text-[#64748B]"
                          }`}
                        />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          } ${parentOnRoute ? "text-[#2158E0]" : "text-[#94A3B8]"}`}
                        />
                      </button>
                    ) : (
                      <Link
                        to={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                          exactActive
                            ? "bg-[#2158E0] text-white shadow-xs"
                            : "text-[#5B6478] hover:bg-[#F8FAFC] hover:text-[#141A2E]"
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 768) onClose();
                        }}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            exactActive ? "text-white" : "text-[#64748B]"
                          }`}
                        />
                        <span className="flex-1 truncate">{item.label}</span>

                        {item.featureKey === "transport" && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 shrink-0 ${
                              !hasTransport
                                ? "bg-amber-100 text-amber-800"
                                : "bg-amber-100 text-amber-800 font-extrabold"
                            }`}
                          >
                            {!hasTransport && <Lock className="w-2.5 h-2.5" />} PRO
                          </span>
                        )}

                        {item.label === "Academics" && (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}

                        {badge > 0 && (
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ${
                              exactActive ? "bg-white/20 text-white" : "bg-red-500 text-white"
                            }`}
                          >
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </Link>
                    )}

                    {/* Collapsible Sub-items */}
                    {hasChildren && isExpanded && (
                      <div className="ml-3.5 mt-0.5 mb-1 border-l-2 border-blue-100 pl-3 space-y-0.5">
                        {item.children!.map((child) => {
                          const childActive = isChildActive(child);
                          return (
                            <Link
                              key={child.href}
                              to={child.href}
                              className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                childActive
                                  ? "bg-blue-50 text-[#2158E0] font-bold"
                                  : "text-[#5B6478] hover:bg-slate-50 hover:text-[#141A2E]"
                              }`}
                              onClick={() => {
                                if (window.innerWidth < 768) onClose();
                              }}
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
          ))}
        </div>

        {/* Bottom User Area & Support */}
        <div className="p-3 border-t border-[#E6EAF3] shrink-0 space-y-2 relative">
          <Link
            to="/admin/settings"
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50 rounded-xl transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#64748B]" />
            <span>Help & Support</span>
          </Link>

          {/* User profile card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full flex items-center justify-between p-2 bg-[#F8FAFC] hover:bg-slate-100 rounded-xl border border-[#E6EAF3] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-[#141A2E] flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#141A2E] truncate">
                    {profile?.full_name || "Rashid Khan"}
                  </p>
                  <p className="text-[10px] text-[#64748B] capitalize truncate">
                    {profile?.role?.replace(/_/g, " ") || "School Admin"}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                  isProfileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Dropdown Popup */}
            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  aria-hidden="true"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-[#E6EAF3] rounded-xl shadow-lg p-1 z-40 animate-in fade-in zoom-in-95">
                  <Link
                    to="/admin/settings"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      await signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
