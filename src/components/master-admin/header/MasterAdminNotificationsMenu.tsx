import React, { useState, useRef, useEffect } from "react";
import { Bell, Clock, AlertTriangle, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export const MasterAdminNotificationsMenu: React.FC = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={notifMenuRef}>
      <button
        type="button"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        title="Platform Notifications"
        aria-label="Platform Notifications"
        aria-expanded={showNotifications}
        aria-haspopup="true"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
      </button>

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
  );
};
