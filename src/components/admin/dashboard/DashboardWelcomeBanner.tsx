import React from "react";
import { Sparkles, Calendar, Clock, Crown } from "lucide-react";
import type { School } from "../../../types/school";

interface DashboardWelcomeBannerProps {
  school: School | null;
  adminName: string;
  academicYearLabel?: string;
}

export function DashboardWelcomeBanner({
  school,
  adminName,
  academicYearLabel = "2026 – 2027",
}: DashboardWelcomeBannerProps) {
  // Determine greeting based on current local hour
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Formatted date (e.g., Sat, Nov 7, 2026)
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const schoolName = school?.name || "Peace Convent School";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#DCE6F8] bg-gradient-to-r from-[#EEF4FF] via-[#F2F7FF] to-[#E2EDFE] p-4 sm:p-6 lg:p-7 shadow-xs">
      {/* Decorative campus architecture on the right */}
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 lg:w-2/5 pointer-events-none opacity-25 sm:opacity-90 overflow-hidden hidden sm:flex items-center justify-end">
        <img
          src="/dashboard-school-hero.jpg"
          alt="School Campus"
          className="h-full w-full object-cover object-right"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 45%, black 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 45%, black 100%)",
          }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl">
        {/* Role Pill Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-white/95 px-3 py-1 text-xs font-bold text-[#2158E0] shadow-2xs">
          <Crown className="w-3.5 h-3.5 text-[#2158E0]" />
          <span>School Admin</span>
        </div>

        {/* Heading */}
        <h1 className="mt-2.5 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#141A2E] font-heading break-words">
          {greeting}, {adminName} 👋
        </h1>

        {/* Subtitle */}
        <p className="mt-1 text-xs sm:text-sm lg:text-base text-[#5B6478] break-words">
          Here&apos;s what&apos;s happening at{" "}
          <span className="font-semibold text-[#141A2E]">{schoolName}</span> today.
        </p>

        {/* Info Badges */}
        <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/60 bg-white/90 px-2.5 sm:px-3 py-1 sm:py-1.5 font-semibold text-[#475569] shadow-2xs text-[11px] sm:text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#2158E0] shrink-0" />
            <span className="truncate">{formattedDate}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/60 bg-white/90 px-2.5 sm:px-3 py-1 sm:py-1.5 font-semibold text-[#475569] shadow-2xs text-[11px] sm:text-xs">
            <Clock className="w-3.5 h-3.5 text-[#2158E0] shrink-0" />
            <span className="truncate">Academic Year: {academicYearLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
