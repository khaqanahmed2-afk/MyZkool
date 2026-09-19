import React from "react";
import { Users, UserCheck, Calendar, FileText } from "lucide-react";

interface SummaryData {
  totalEnrolled: number;
  girlsCount: number;
  boysCount: number;
  admittedThisYear: number;
  documentsPending: number;
}

interface StudentSummaryStripProps {
  data: SummaryData;
  activeFilter?: string;
  onFilterClick: (filterKey: string) => void;
}

export function StudentSummaryStrip({ data, activeFilter, onFilterClick }: StudentSummaryStripProps) {
  return (
    <div className="bg-white border border-[#E6EAF3] rounded-xl p-3 shadow-xs mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-[#E6EAF3]">
        {/* Total Enrolled */}
        <button
          type="button"
          onClick={() => onFilterClick("all")}
          className={`flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer hover:bg-slate-50 ${
            activeFilter === "all" ? "bg-blue-50/70 ring-1 ring-[#2158E0]" : ""
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total enrolled</div>
            <div className="text-xl font-bold text-slate-900 font-display">{data.totalEnrolled}</div>
          </div>
        </button>

        {/* Gender Breakdown */}
        <button
          type="button"
          onClick={() => onFilterClick("girls")}
          className={`flex items-center gap-3 p-2 pt-3 md:pt-2 md:pl-4 rounded-lg text-left transition-colors cursor-pointer hover:bg-slate-50 ${
            activeFilter === "girls" || activeFilter === "boys" ? "bg-blue-50/70 ring-1 ring-[#2158E0]" : ""
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#1FAE7A] flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Girls / Boys</div>
            <div className="text-xl font-bold text-slate-900 font-display">
              <span className="text-pink-600">{data.girlsCount}</span>
              <span className="text-slate-400 font-normal mx-1">/</span>
              <span className="text-blue-600">{data.boysCount}</span>
            </div>
          </div>
        </button>

        {/* Admitted this year */}
        <button
          type="button"
          onClick={() => onFilterClick("new_admissions")}
          className={`flex items-center gap-3 p-2 pt-3 md:pt-2 md:pl-4 rounded-lg text-left transition-colors cursor-pointer hover:bg-slate-50 ${
            activeFilter === "new_admissions" ? "bg-blue-50/70 ring-1 ring-[#2158E0]" : ""
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Admitted this year</div>
            <div className="text-xl font-bold text-slate-900 font-display">{data.admittedThisYear}</div>
          </div>
        </button>

        {/* Documents pending */}
        <button
          type="button"
          onClick={() => onFilterClick("docs_pending")}
          className={`flex items-center gap-3 p-2 pt-3 md:pt-2 md:pl-4 rounded-lg text-left transition-colors cursor-pointer hover:bg-slate-50 ${
            activeFilter === "docs_pending" ? "bg-amber-50/70 ring-1 ring-amber-500" : ""
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Documents pending</div>
            <div className="text-xl font-bold text-amber-700 font-display">{data.documentsPending}</div>
          </div>
        </button>
      </div>
    </div>
  );
}

