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
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Sparkles,
  GraduationCap,
  WalletCards,
  Bell,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useOutletContext } from "react-router-dom";
import type { School } from "../../types/school";

export default function DashboardHome() {
  const { profile } = useAuth();
  const { school } = useOutletContext<{ school: School | null }>();

  const firstName = profile?.full_name?.split(" ")[0] || "Admin";

  const stats = [
    {
      label: "Total Students",
      value: "---",
      description: "Currently enrolled",
      icon: Users,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      href: "/admin/students",
    },
    {
      label: "Total Staff",
      value: "---",
      description: "Teaching & non-teaching",
      icon: Briefcase,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      href: "/admin/staff",
    },
    {
      label: "Today's Attendance",
      value: "---",
      description: "Attendance overview",
      icon: CalendarCheck,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      href: "/admin/attendance",
    },
    {
      label: "Pending Fees",
      value: "---",
      description: "Outstanding collection",
      icon: WalletCards,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
      href: "/admin/fees",
    },
  ];

  const quickActions = [
    {
      label: "Add Student",
      description: "Create admission",
      icon: UserPlus,
      href: "/admin/students",
    },
    {
      label: "Mark Attendance",
      description: "Record today's attendance",
      icon: CalendarCheck,
      href: "/admin/attendance",
    },
    {
      label: "Collect Fee",
      description: "Record a payment",
      icon: WalletCards,
      href: "/admin/fees",
    },
    {
      label: "Send Notice",
      description: "Notify parents & staff",
      icon: Send,
      href: "/admin/communication",
    },
    {
      label: "Add Staff",
      description: "Create staff profile",
      icon: Plus,
      href: "/admin/staff",
    },
    {
      label: "View Reports",
      description: "Analytics & reports",
      icon: FileText,
      href: "/admin/reports",
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-8">

      {/* =========================================================
          HEADER / WELCOME
      ========================================================= */}
      <section className="relative overflow-hidden rounded-2xl border border-[#E6EAF3] bg-white shadow-sm">
        {/* Decorative background */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#F0F5FE] to-transparent pointer-events-none" />

        <div className="relative flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6EAF3] bg-[#F8FAFD] px-3 py-1 text-xs font-semibold text-[#5B6478]">
              <Sparkles className="h-3.5 w-3.5 text-[#2158E0]" />
              School Admin
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#141A2E] sm:text-3xl font-heading">
              Good morning, {firstName}
            </h1>

            <p className="mt-1.5 text-sm text-[#5B6478] sm:text-base">
              Here&apos;s what&apos;s happening at{" "}
              <span className="font-semibold text-[#141A2E]">
                {school?.name || "your school"}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#E6EAF3] bg-[#F8FAFD] px-4 py-3">
              <Clock3 className="h-4 w-4 text-[#2158E0]" />

              <span className="text-sm font-medium text-[#5B6478]">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <Link
              to="/admin/students"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2158E0] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1748C5] hover:shadow-md active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Student</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          STATS
      ========================================================= */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-bold text-[#141A2E]">
              School Overview
            </h2>
            <p className="mt-0.5 text-xs text-[#7A8499]">
              Key metrics at a glance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                key={stat.label}
                to={stat.href}
                className="group rounded-2xl border border-[#E6EAF3] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9D6F7] hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <ArrowUpRight
                    className="h-4 w-4 text-[#B1B8C8] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#2158E0] group-hover:opacity-100"
                  />
                </div>

                <div className="mt-5">
                  <p className="text-sm font-medium text-[#5B6478]">
                    {stat.label}
                  </p>

                  <p className="mt-1 text-2xl font-bold tracking-tight text-[#141A2E]">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-xs text-[#8992A5]">
                    {stat.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">

        {/* =======================================================
            QUICK ACTIONS
        ======================================================= */}
        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <h2 className="text-base font-bold text-[#141A2E]">
                Quick Actions
              </h2>

              <p className="mt-0.5 text-xs text-[#7A8499]">
                Common tasks for your school
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  to={action.href}
                  className="group flex items-center gap-4 rounded-2xl border border-[#E6EAF3] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9D6F7] hover:shadow-md"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0F5FE] text-[#2158E0] transition-colors group-hover:bg-[#2158E0] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#141A2E]">
                      {action.label}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-[#7A8499]">
                      {action.description}
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-[#B1B8C8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2158E0]" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* =======================================================
            RECENT ACTIVITY
        ======================================================= */}
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-bold text-[#141A2E]">
                Recent Activity
              </h2>

              <p className="mt-0.5 text-xs text-[#7A8499]">
                Latest school updates
              </p>
            </div>

            <Link
              to="/admin/reports"
              className="text-xs font-semibold text-[#2158E0] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="min-h-[330px] rounded-2xl border border-[#E6EAF3] bg-white p-6 shadow-sm">
            <div className="flex h-full min-h-[282px] flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F5FE] text-[#2158E0]">
                  <Bell className="h-6 w-6" />
                </div>

                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#2158E0]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#141A2E]">
                No recent activity
              </h3>

              <p className="mt-1.5 max-w-[240px] text-xs leading-5 text-[#7A8499]">
                Admissions, fee payments, attendance updates, and other
                important activity will appear here.
              </p>

              <Link
                to="/admin/students"
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#E6EAF3] bg-white px-3.5 py-2 text-xs font-semibold text-[#141A2E] transition-colors hover:border-[#2158E0] hover:text-[#2158E0]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Get started
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================
          BOTTOM SHORTCUTS
      ========================================================= */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link
          to="/admin/students"
          className="group flex items-center gap-4 rounded-2xl border border-[#E6EAF3] bg-white p-4 shadow-sm transition-all hover:border-[#C9D6F7] hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-[#141A2E]">
              Student Management
            </p>
            <p className="text-xs text-[#7A8499]">
              Admissions, profiles & records
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-[#B1B8C8] transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/admin/fees"
          className="group flex items-center gap-4 rounded-2xl border border-[#E6EAF3] bg-white p-4 shadow-sm transition-all hover:border-[#C9D6F7] hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <WalletCards className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-[#141A2E]">
              Fee Management
            </p>
            <p className="text-xs text-[#7A8499]">
              Collections, invoices & dues
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-[#B1B8C8] transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/admin/communication"
          className="group flex items-center gap-4 rounded-2xl border border-[#E6EAF3] bg-white p-4 shadow-sm transition-all hover:border-[#C9D6F7] hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Send className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-[#141A2E]">
              Communication
            </p>
            <p className="text-xs text-[#7A8499]">
              Notices & parent updates
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-[#B1B8C8] transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
  );
}
