import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { MasterAdminSidebar } from "./MasterAdminSidebar";
import { MasterAdminHeader } from "./MasterAdminHeader";

export interface MasterAdminOutletContext {
  dateRange: string;
  setDateRange: (range: string) => void;
  startDate?: string;
  endDate?: string;
  setCustomRange: (start: string, end: string) => void;
}

export const MasterAdminShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState("30d");
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  const handleCustomRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setDateRange("custom");
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased">
      {/* ── Persistent Navigation Sidebar ──────────────────────────── */}
      <MasterAdminSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* ── Main Viewport Content ─────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? "pl-20" : "pl-64"
        }`}
      >
        <MasterAdminHeader
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          startDate={startDate}
          endDate={endDate}
          onCustomRangeChange={handleCustomRange}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet
            context={{
              dateRange,
              setDateRange,
              startDate,
              endDate,
              setCustomRange: handleCustomRange,
            }}
          />
        </main>
      </div>
    </div>
  );
};
