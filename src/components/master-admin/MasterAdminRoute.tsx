import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type { PlatformRoleSlug } from "../../types/masterAdmin";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface MasterAdminRouteProps {
  children: React.ReactNode;
  requiredRole?: PlatformRoleSlug | PlatformRoleSlug[];
  requiredPermission?: string;
}

export const MasterAdminRoute: React.FC<MasterAdminRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
}) => {
  const { isAuthenticated, loading, admin, hasRole, hasPermission } = useMasterAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
            M
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Verifying Master Admin authorization...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated as Master Admin -> Redirect to dedicated Master Admin login
  if (!isAuthenticated || !admin) {
    return (
      <Navigate
        to={`/master-admin/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // Role verification
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Insufficient Role Privileges</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Your current platform role (<span className="font-semibold text-slate-700">{admin.role?.name || "None"}</span>) does not have authorization to view this management module.
          </p>
          <a
            href="/master-admin/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Return to Master Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Granular permission verification
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Permission Denied</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            You require the <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono">{requiredPermission}</code> permission to execute this operation.
          </p>
          <a
            href="/master-admin/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Return to Master Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

