import React from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  ShieldAlert,
  Inbox,
  FileEdit,
  FileCheck,
  Bus,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import type { PendingTasksData } from "../../../services/adminDashboardService";

interface PendingTasksWidgetProps {
  data: PendingTasksData;
  loading?: boolean;
}

export function PendingTasksWidget({
  data,
  loading = false,
}: PendingTasksWidgetProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E6EAF3] bg-white p-5 sm:p-6 shadow-2xs h-full animate-pulse flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1.5">
            <div className="h-5 w-44 bg-slate-200 rounded" />
            <div className="h-3 w-40 bg-slate-100 rounded" />
          </div>
          <div className="h-4 w-16 bg-slate-100 rounded" />
        </div>
        <div className="space-y-3 my-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-4 w-28 bg-slate-100 rounded pt-2" />
      </div>
    );
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "approval":
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case "admission":
        return <Inbox className="w-4 h-4 text-amber-600" />;
      case "draft":
        return <FileEdit className="w-4 h-4 text-blue-600" />;
      case "document":
        return <FileCheck className="w-4 h-4 text-purple-600" />;
      case "transport":
        return <Bus className="w-4 h-4 text-emerald-600" />;
      default:
        return <CheckSquare className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPriorityBadge = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const hasTasks = data.tasks.length > 0;

  return (
    <div className="rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 lg:p-6 shadow-2xs flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#141A2E] font-heading truncate">
              Pending Tasks & Approvals
            </h2>
          </div>
          <Link
            to="/admin/approvals"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2158E0] hover:underline shrink-0"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-xs text-[#5B6478]">
          Actionable items requiring admin attention
        </p>
      </div>

      {/* Task List or Empty Healthy State */}
      <div className="my-3 min-h-[160px] flex flex-col justify-center">
        {!hasTasks ? (
          <div className="py-6 px-4 text-center rounded-xl bg-[#F8FAFC] border border-dashed border-slate-200 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-[#141A2E]">All Caught Up!</p>
            <p className="text-[11px] text-[#64748B] mt-0.5 max-w-xs">
              No pending approvals, incomplete drafts or document verifications need action right now.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.tasks.slice(0, 4).map((task) => (
              <Link
                key={task.id}
                to={task.href}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-blue-100 bg-[#F8FAFC]/60 hover:bg-white hover:shadow-2xs transition-all group"
              >
                {/* Icon */}
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0">
                  {getTaskIcon(task.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#141A2E] truncate group-hover:text-[#2158E0] transition-colors">
                      {task.title}
                    </p>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${getPriorityBadge(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                    {task.description}
                  </p>
                </div>

                {/* Count badge */}
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 group-hover:bg-[#2158E0] group-hover:text-white transition-colors">
                  {task.count}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#94A3B8]">
        <span>
          {data.totalPendingCount} total pending {data.totalPendingCount === 1 ? "task" : "tasks"}
        </span>
        <Link
          to="/admin/approvals"
          className="text-xs font-semibold text-[#2158E0] hover:underline shrink-0"
        >
          Approvals Dashboard →
        </Link>
      </div>
    </div>
  );
}
