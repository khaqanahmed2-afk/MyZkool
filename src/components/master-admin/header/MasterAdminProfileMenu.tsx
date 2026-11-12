import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Shield, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

interface MasterAdminProfileMenuProps {
  admin: { full_name?: string | null; email?: string | null; role?: { name?: string } } | null;
  onLogout: () => void;
}

export const MasterAdminProfileMenu: React.FC<MasterAdminProfileMenuProps> = ({
  admin,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={profileMenuRef}>
      <button
        type="button"
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label="Admin account menu"
        aria-expanded={showProfileMenu}
        aria-haspopup="true"
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
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
