import React from "react";
import { School, Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface SchoolsPageHeaderProps {
  canCreate: boolean;
}

export const SchoolsPageHeader: React.FC<SchoolsPageHeaderProps> = ({ canCreate }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
          <School className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-heading">
            Schools & Institutions
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage educational institutions, multi-tenant onboarding, and active subscriptions.
          </p>
        </div>
      </div>

      {canCreate && (
        <Link
          to="/master-admin/schools/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Institution</span>
        </Link>
      )}
    </div>
  );
};
