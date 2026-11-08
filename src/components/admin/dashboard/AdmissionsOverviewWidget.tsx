import React from "react";
import { Link } from "react-router-dom";
import {
  UserPlus,
  Inbox,
  Clock,
  CheckCircle2,
  FileCheck,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import type { AdmissionsOverviewData } from "../../../services/adminDashboardService";

interface AdmissionsOverviewWidgetProps {
  data: AdmissionsOverviewData;
  loading?: boolean;
}

export function AdmissionsOverviewWidget({
  data,
  loading = false,
}: AdmissionsOverviewWidgetProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E6EAF3] bg-white p-5 sm:p-6 shadow-2xs h-full animate-pulse flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1.5">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-3 w-52 bg-slate-100 rounded" />
          </div>
          <div className="h-8 w-24 bg-slate-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 my-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-4 w-32 bg-slate-100 rounded pt-2" />
      </div>
    );
  }

  const statCards = [
    {
      label: "New Inquiries",
      count: data.newEnquiries,
      icon: Inbox,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      border: "border-blue-100/80",
      badge: data.newEnquiries > 0 ? "Action Required" : "Up to date",
      badgeColor:
        data.newEnquiries > 0
          ? "bg-blue-100 text-blue-700 font-semibold"
          : "bg-slate-100 text-slate-500",
      href: "/admin/students",
      hint: "Parent enquiry forms",
    },
    {
      label: "Under Review",
      count: data.underReview,
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      border: "border-amber-100/80",
      badge: data.underReview > 0 ? "In Progress" : "Clear",
      badgeColor:
        data.underReview > 0
          ? "bg-amber-100 text-amber-700 font-semibold"
          : "bg-slate-100 text-slate-500",
      href: "/admin/students/new",
      hint: "Draft registrations",
    },
    {
      label: "Approved Admissions",
      count: data.approved,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      border: "border-emerald-100/80",
      badge: "Enrolled",
      badgeColor: "bg-emerald-100 text-emerald-700 font-semibold",
      href: "/admin/students",
      hint: "Current session",
    },
    {
      label: "Pending Verification",
      count: data.pendingDocuments,
      icon: FileCheck,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      border: "border-purple-100/80",
      badge: data.pendingDocuments > 0 ? "Docs Awaiting" : "Verified",
      badgeColor:
        data.pendingDocuments > 0
          ? "bg-purple-100 text-purple-700 font-semibold"
          : "bg-slate-100 text-slate-500",
      href: "/admin/students",
      hint: "Certificates & ID proofs",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 lg:p-6 shadow-2xs flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#141A2E] font-heading truncate">
              Admissions Overview
            </h2>
          </div>
          <Link
            to="/admin/students/new"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#2158E0] text-white hover:bg-[#1748C5] transition-colors shrink-0 shadow-2xs"
          >
            <span>New Admission</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-xs text-[#5B6478]">
          Inquiries, applications & enrollment status
        </p>
      </div>

      {/* 4 Stats Grid (2x2) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-3">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`p-3 rounded-xl border ${item.border} bg-[#F8FAFC]/50 hover:bg-white hover:shadow-xs transition-all duration-200 group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.iconBg} ${item.iconColor} shrink-0`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[85px] text-center ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              </div>

              <div>
                <p className="text-lg sm:text-xl font-extrabold text-[#141A2E] tracking-tight font-heading group-hover:text-[#2158E0] transition-colors">
                  {item.count.toLocaleString("en-IN")}
                </p>
                <p className="text-xs font-semibold text-[#475569] truncate">
                  {item.label}
                </p>
                <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">
                  {item.hint}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#94A3B8]">
        <div className="flex items-center gap-1 truncate">
          <TrendingUp className="w-3.5 h-3.5 text-[#2158E0] shrink-0" />
          <span className="truncate">Active admissions pipeline</span>
        </div>
        <Link
          to="/admin/students"
          className="text-xs font-semibold text-[#2158E0] hover:underline shrink-0"
        >
          View Register →
        </Link>
      </div>
    </div>
  );
}
