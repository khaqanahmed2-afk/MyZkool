import React from "react";
import {
  Users,
  Briefcase,
  CalendarCheck,
  IndianRupee,
  Plus,
  FileText,
  Send,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useOutletContext } from "react-router-dom";
import type { School } from "../../types/school";

export default function DashboardHome() {
  const { profile } = useAuth();
  const { school } = useOutletContext<{ school: School | null }>();

  const stats = [
    {
      label: "Total Students",
      value: "---",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Staff",
      value: "---",
      icon: Briefcase,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Today's Attendance",
      value: "---",
      icon: CalendarCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pending Fees",
      value: "---",
      icon: IndianRupee,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const quickActions = [
    { label: "Add Student", icon: UserPlus, href: "/admin/students" },
    {
      label: "Mark Attendance",
      icon: CalendarCheck,
      href: "/admin/attendance",
    },
    { label: "Collect Fee", icon: IndianRupee, href: "/admin/fees" },
    { label: "Send Notice", icon: Send, href: "/admin/communication" },
    { label: "Add Staff", icon: Plus, href: "/admin/staff" },
    { label: "View Reports", icon: FileText, href: "/admin/reports" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E6EAF3] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#141A2E] font-heading">
            Good morning, {profile?.full_name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="text-[#5B6478] mt-1">
            Manage {school?.name || "your school"} from one place.
          </p>
        </div>
        <div className="text-sm text-[#5B6478] font-medium">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-[#E6EAF3] shadow-sm flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#5B6478]">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-[#141A2E] mt-0.5">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-[#141A2E] font-heading px-1">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <Link
                  key={idx}
                  to={action.href}
                  className="bg-white p-4 rounded-xl border border-[#E6EAF3] hover:border-[#2158E0] hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F0F5FE] text-[#2158E0] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-[#141A2E]">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#141A2E] font-heading px-1">
            Recent Activity
          </h2>
          <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[250px]">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <CalendarCheck className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-bold text-[#141A2E]">
              No recent activity yet.
            </h3>
            <p className="text-xs text-[#5B6478] mt-1 max-w-[200px]">
              Activity from admissions, fees, and attendance will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
