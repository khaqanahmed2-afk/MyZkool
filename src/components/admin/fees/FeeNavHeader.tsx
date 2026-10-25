import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  PlusCircle,
  CreditCard,
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
  Plus,
} from "lucide-react";

interface NavDropdownItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const SETUP_LINKS: NavDropdownItem[] = [
  { label: "Setup Checklist", href: "/admin/fees/setup", icon: CheckSquare, desc: "Step-by-step setup guide" },
  { label: "Fee Categories / Heads", href: "/admin/fees/setup/heads", icon: Layers, desc: "Tuition, Exam, Transport, etc." },
  { label: "Billing Cycles / Terms", href: "/admin/fees/setup/terms", icon: Calendar, desc: "Monthly, quarterly, annual schedules" },
  { label: "Class Fee Structures", href: "/admin/fees/setup/structures", icon: Grid3X3, desc: "Class-wise amounts per term" },
  { label: "Discounts & Concessions", href: "/admin/fees/setup/concessions", icon: Percent, desc: "Sibling, RTE, staff-ward rules" },
  { label: "Late Fee Rules", href: "/admin/fees/setup/late-fees", icon: Clock, desc: "Daily, monthly, percent penalties" },
  { label: "Fee & Receipt Settings", href: "/admin/fees/setup/settings", icon: Sliders, desc: "Branding, themes, receipt & invoice rules" },
];

const MORE_LINKS: NavDropdownItem[] = [
  { label: "Cheque Register", href: "/admin/fees/cheques", icon: CheckSquare, desc: "Deposit, clear, or bounce cheques" },
  { label: "Day Close", href: "/admin/fees/day-close", icon: Lock, desc: "Daily cash & collection reconciliation" },
  { label: "Refunds", href: "/admin/fees/refunds", icon: Undo2, desc: "Refund approval and register" },
];

const SECONDARY_MENU_ACTIONS: NavDropdownItem[] = [
  { label: "Assign Dues", href: "/admin/fees/dues", icon: PlusCircle, desc: "Assign dues and fee structure" },
  { label: "Generate Class Fees", href: "/admin/fees/dues", icon: FileCheck2, desc: "Generate class fees in bulk" },
  { label: "Fee Structures", href: "/admin/fees/setup/structures", icon: Grid3X3, desc: "Configure class fee matrix" },
  { label: "Day Close", href: "/admin/fees/day-close", icon: Lock, desc: "Daily cash & collection reconciliation" },
  { label: "Refunds Register", href: "/admin/fees/refunds", icon: Undo2, desc: "Process fee refunds" },
  { label: "Fee & Receipt Settings", href: "/admin/fees/setup/settings", icon: Settings, desc: "Configure billing preferences, receipt templates, school branding, and payment options." },
];

interface FeeNavDropdownProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerText: string;
  items: NavDropdownItem[];
  isOpen: boolean;
  isActive?: boolean;
  onToggle: () => void;
  onClose: () => void;
  pathname: string;
  align?: "left" | "right";
  buttonStyle?: "tab" | "button";
}

const FeeNavDropdown: React.FC<FeeNavDropdownProps> = ({
  label,
  icon: Icon,
  headerText,
  items,
  isOpen,
  isActive = false,
  onToggle,
  onClose,
  pathname,
  align = "left",
  buttonStyle = "tab",
}) => {
  const isTab = buttonStyle === "tab";
  const dropdownAlignClass = align === "right" ? "right-0" : "left-0";

  return (
    <>
      {isTab ? (
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            isActive
              ? "border-[#2563EB] text-[#2563EB] bg-blue-50/40 rounded-t-lg"
              : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
          }`}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          <span>{label}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
          aria-label="More actions"
        >
          <span>{label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {isOpen && (
        <div
          className={`absolute top-full ${dropdownAlignClass} mt-1 w-60 bg-white border border-[#E6EAF3] rounded-xl shadow-lg z-50 p-1.5 animate-in fade-in-50 zoom-in-95`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {headerText}
          </div>
          {items.map((item) => {
            const ItemIcon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                  active
                    ? "bg-blue-50 text-[#2563EB] font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ItemIcon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-[#2563EB]" : "text-slate-400"}`} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
};

interface FeeNavTitleBarProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  actionsRef: React.RefObject<HTMLDivElement | null>;
  actionsMenuOpen: boolean;
  onToggleActions: () => void;
  onCloseActions: () => void;
  pathname: string;
}

const FeeNavTitleBar: React.FC<FeeNavTitleBarProps> = ({
  title,
  subtitle,
  action,
  actionsRef,
  actionsMenuOpen,
  onToggleActions,
  onCloseActions,
  pathname,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#5B6478] mb-1">
          <Link to="/admin" className="hover:text-[#2563EB] transition-colors">Admin</Link>
          <span>/</span>
          <Link to="/admin/fees" className="hover:text-[#2563EB] transition-colors">Fees</Link>
          {title && title !== "Fees" && (
            <>
              <span>/</span>
              <span className="text-[#141A2E] font-semibold">{title}</span>
            </>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#141A2E] font-display">
          {title || "Fees"}
        </h1>
        {subtitle && <p className="text-xs text-[#5B6478] mt-0.5">{subtitle}</p>}
      </div>

      {/* Header Action Area: Secondary Action Menu + Primary Collect Fee */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {action}

        {/* Secondary Action Menu Dropdown */}
        <div className="relative" ref={actionsRef}>
          <FeeNavDropdown
            label="Actions"
            headerText="Quick Management"
            items={SECONDARY_MENU_ACTIONS}
            isOpen={actionsMenuOpen}
            onToggle={onToggleActions}
            onClose={onCloseActions}
            pathname={pathname}
            align="right"
            buttonStyle="button"
          />
        </div>

        {/* Primary Action: Collect Fee */}
        <Link
          to="/admin/fees/collect"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Collect Fee</span>
        </Link>
      </div>
    </div>
  );
};

interface FeeNavTabBarProps {
  pathname: string;
  setupRef: React.RefObject<HTMLDivElement | null>;
  setupDropdownOpen: boolean;
  onToggleSetup: () => void;
  onCloseSetup: () => void;
  moreRef: React.RefObject<HTMLDivElement | null>;
  moreDropdownOpen: boolean;
  onToggleMore: () => void;
  onCloseMore: () => void;
}

const FeeNavTabBar: React.FC<FeeNavTabBarProps> = ({
  pathname,
  setupRef,
  setupDropdownOpen,
  onToggleSetup,
  onCloseSetup,
  moreRef,
  moreDropdownOpen,
  onToggleMore,
  onCloseMore,
}) => {
  const isOverview = pathname === "/admin/fees" || pathname === "/admin/fees/dashboard";
  const isSetup = pathname.startsWith("/admin/fees/setup");
  const isDues = pathname === "/admin/fees/dues" || pathname === "/admin/fees/invoices" || pathname === "/admin/fees/assign";
  const isCollect = pathname === "/admin/fees/collect" || pathname === "/admin/fees/collections";
  const isDefaulters =
    pathname === "/admin/fees/reminders" ||
    pathname === "/admin/fees/defaulters" ||
    pathname === "/admin/fees/dues-report";
  const isReports = pathname === "/admin/fees/reports";
  const isCheques = pathname === "/admin/fees/cheques";
  const isDayClose = pathname === "/admin/fees/day-close";
  const isRefunds = pathname === "/admin/fees/refunds";
  const isMore = isCheques || isDayClose || isRefunds;

  const tabClass = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
      isActive
        ? "border-[#2563EB] text-[#2563EB] bg-blue-50/40 rounded-t-lg"
        : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
    }`;

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-[#E6EAF3]/70 pt-1 -mb-px">
      {/* 1. Overview Tab */}
      <Link to="/admin/fees" className={tabClass(isOverview)}>
        <LayoutDashboard className="w-3.5 h-3.5" />
        <span>Overview</span>
      </Link>

      {/* 2. Fee Setup Tab with Dropdown */}
      <div className="relative shrink-0" ref={setupRef}>
        <FeeNavDropdown
          label="Fee Setup"
          icon={Settings}
          headerText="Configuration & Rules"
          items={SETUP_LINKS}
          isOpen={setupDropdownOpen}
          isActive={isSetup}
          onToggle={onToggleSetup}
          onClose={onCloseSetup}
          pathname={pathname}
          align="left"
          buttonStyle="tab"
        />
      </div>

      {/* 3. Invoices Tab */}
      <Link to="/admin/fees/invoices" className={tabClass(isDues)}>
        <FileCheck2 className="w-3.5 h-3.5" />
        <span>Invoices</span>
      </Link>

      {/* 4. Collect Fee Tab */}
      <Link to="/admin/fees/collect" className={tabClass(isCollect)}>
        <CreditCard className="w-3.5 h-3.5" />
        <span>Collect Fee</span>
      </Link>

      {/* 5. Defaulters & Reminders Tab */}
      <Link to="/admin/fees/reminders" className={tabClass(isDefaulters)}>
        <Bell className="w-3.5 h-3.5" />
        <span>Dues & Reminders</span>
      </Link>

      {/* 6. Reports Tab */}
      <Link to="/admin/fees/reports" className={tabClass(isReports)}>
        <BarChart3 className="w-3.5 h-3.5" />
        <span>Reports</span>
      </Link>

      {/* 7. More Actions Dropdown */}
      <div className="relative shrink-0" ref={moreRef}>
        <FeeNavDropdown
          label="More"
          headerText="Financial Operations"
          items={MORE_LINKS}
          isOpen={moreDropdownOpen}
          isActive={isMore}
          onToggle={onToggleMore}
          onClose={onCloseMore}
          pathname={pathname}
          align="right"
          buttonStyle="tab"
        />
      </div>
    </div>
  );
};

interface FeeNavHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function FeeNavHeader({ title, subtitle, action }: FeeNavHeaderProps) {
  const location = useLocation();
  const [setupDropdownOpen, setSetupDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  const setupRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

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
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white border-b border-[#E6EAF3] -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6 px-4 sm:px-6 pt-5 pb-0 shadow-2xs">
      <FeeNavTitleBar
        title={title}
        subtitle={subtitle}
        action={action}
        actionsRef={actionsRef}
        actionsMenuOpen={actionsMenuOpen}
        onToggleActions={() => setActionsMenuOpen((prev) => !prev)}
        onCloseActions={() => setActionsMenuOpen(false)}
        pathname={pathname}
      />
      <FeeNavTabBar
        pathname={pathname}
        setupRef={setupRef}
        setupDropdownOpen={setupDropdownOpen}
        onToggleSetup={() => setSetupDropdownOpen((prev) => !prev)}
        onCloseSetup={() => setSetupDropdownOpen(false)}
        moreRef={moreRef}
        moreDropdownOpen={moreDropdownOpen}
        onToggleMore={() => setMoreDropdownOpen((prev) => !prev)}
        onCloseMore={() => setMoreDropdownOpen(false)}
      />
    </div>
  );
}
