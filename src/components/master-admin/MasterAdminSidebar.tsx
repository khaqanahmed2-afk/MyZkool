import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import {
  LayoutDashboard,
  School,
  Users,
  CreditCard,
  Receipt,
  Headphones,
  Megaphone,
  BarChart3,
  Activity,
  Database,
  ShieldCheck,
  Settings,
  Palette,
  Share2,
  ToggleLeft,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MoreVertical,
} from "lucide-react";

interface MasterAdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const MasterAdminSidebar: React.FC<MasterAdminSidebarProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  const location = useLocation();
  const { admin, logout } = useMasterAdminAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => {
    if (path === "/master-admin/dashboard" && location.pathname === "/master-admin") {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  const navItemClass = (path: string) => `
    flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative
    ${
      isActive(path)
        ? "bg-[#2158E0] text-white shadow-md shadow-[#2158E0]/30"
        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
    }
  `;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 bg-[#0A1024] border-r border-slate-800/80 flex flex-col transition-all duration-300 select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* ── Brand Header ────────────────────────────────────────────── */}
      <div className="py-4 px-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <Link to="/master-admin/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#2158E0] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-[#2158E0]/40 shrink-0">
              M
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white tracking-tight">MyZkool</span>
                </div>
                <p className="text-[11px] font-medium text-slate-400">Master Admin</p>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors mx-auto cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="mt-2.5 pl-13">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/70 text-[10px] font-bold text-amber-300">
              👑 Super Admin
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation Items ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {/* Group: Overview */}
        <div>
          {!collapsed && (
            <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Overview
            </h3>
          )}
          <nav className="space-y-1">
            <Link to="/master-admin/dashboard" className={navItemClass("/master-admin/dashboard")}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Dashboard</span>}
            </Link>
          </nav>
        </div>

        {/* Group: Platform Management */}
        <div>
          {!collapsed && (
            <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Platform Management
            </h3>
          )}
          <nav className="space-y-1">
            <Link to="/master-admin/schools" className={navItemClass("/master-admin/schools")}>
              <School className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">Schools & Institutions</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Link>
            <Link to="/master-admin/users" className={navItemClass("/master-admin/users")}>
              <Users className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">Users & Roles</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Link>
            <Link to="/master-admin/subscriptions" className={navItemClass("/master-admin/subscriptions")}>
              <CreditCard className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">Subscription Plans</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Link>
            <Link to="/master-admin/billing" className={navItemClass("/master-admin/billing")}>
              <Receipt className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">Billing & Payments</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Link>
            <Link to="/master-admin/support" className={navItemClass("/master-admin/support")}>
              <Headphones className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">Support Center</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Link>
          </nav>
        </div>

        {/* Group: Operations */}
        <div>
          {!collapsed && (
            <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Operations
            </h3>
          )}
          <nav className="space-y-1">
            <Link to="/master-admin/announcements" className={navItemClass("/master-admin/announcements")}>
              <Megaphone className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Announcements</span>}
            </Link>
            <Link to="/master-admin/reports" className={navItemClass("/master-admin/reports")}>
              <BarChart3 className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Reports & Analytics</span>}
            </Link>
            <Link to="/master-admin/monitoring" className={navItemClass("/master-admin/monitoring")}>
              <Activity className="w-4 h-4 shrink-0" />
              {!collapsed && <span>System Monitoring</span>}
            </Link>
            <Link to="/master-admin/database" className={navItemClass("/master-admin/database")}>
              <Database className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Database & Backups</span>}
            </Link>
            <Link to="/master-admin/audit-logs" className={navItemClass("/master-admin/audit-logs")}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Security & Audit Logs</span>}
            </Link>
          </nav>
        </div>

        {/* Group: Platform Settings */}
        <div>
          {!collapsed && (
            <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Platform Settings
            </h3>
          )}
          <nav className="space-y-1">
            <Link to="/master-admin/settings" className={navItemClass("/master-admin/settings")}>
              <Settings className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Global Settings</span>}
            </Link>
            <Link to="/master-admin/branding" className={navItemClass("/master-admin/branding")}>
              <Palette className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Website & Branding</span>}
            </Link>
            <Link to="/master-admin/integrations" className={navItemClass("/master-admin/integrations")}>
              <Share2 className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Integrations (WhatsApp, Email)</span>}
            </Link>
            <Link to="/master-admin/feature-flags" className={navItemClass("/master-admin/feature-flags")}>
              <ToggleLeft className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Feature Flags</span>}
            </Link>
            <Link to="/master-admin/policies" className={navItemClass("/master-admin/policies")}>
              <FileText className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Terms & Policies</span>}
            </Link>
          </nav>
        </div>
      </div>

      {/* ── Manage All Schools Promo Capsule (from mockup) ──────────── */}
      {!collapsed && (
        <div className="mx-3 my-2 p-3 rounded-2xl bg-gradient-to-b from-[#1C244B] to-[#121838] border border-indigo-500/20 shadow-md text-center">
          <div className="w-10 h-10 mx-auto mb-1.5 rounded-xl bg-indigo-600/20 flex items-center justify-center text-xl">
            🏫
          </div>
          <h4 className="text-xs font-bold text-white mb-0.5">Manage All Schools</h4>
          <p className="text-[10px] text-slate-300 leading-tight">
            Control institutions, subscriptions, access and usage from one place.
          </p>
        </div>
      )}

      {/* ── User Footer ────────────────────────────────────────────── */}
      <div className="p-3 border-t border-slate-800/80 relative">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-850 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
              KA
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {admin?.full_name || "Khaqan Ahmad"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">Master Administrator</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs text-white font-medium">{admin?.email || "khaqan@myzkool.com"}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{admin?.role?.name || "Super Admin"}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

