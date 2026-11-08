import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { MasterAdminSidebar } from "./MasterAdminSidebar";
import { MasterAdminHeader } from "./MasterAdminHeader";

export const MasterAdminShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState("30d");

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
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet context={{ dateRange }} />
        </main>
      </div>
    </div>
  );
};

