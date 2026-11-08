import React, { useState } from "react";
import {
  Users,
  CreditCard,
  CalendarCheck,
  Globe,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Bell,
  ArrowUpRight,
  ChevronRight,
  Smartphone,
  Sparkles,
} from "lucide-react";

export interface DashboardPreviewProps {
  onOpenDemo?: () => void;
}

type TabType = "principal" | "fees" | "attendance" | "website";

export const DashboardPreview: React.FC<DashboardPreviewProps> = ({ onOpenDemo }) => {
  const [activeTab, setActiveTab] = useState<TabType>("principal");

  return (
    <section
      className="py-16 md:py-24 bg-[#F8FAFC] border-b border-[#E6EAF3] relative overflow-hidden"
      id="dashboard-preview"
      aria-label="Product Dashboard Preview"
    >
      {/* Background subtle glowing radial gradients */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none blur-3xl opacity-40 -z-10"
        style={{
          background: "radial-gradient(circle, rgba(33,88,224,0.12) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-[#2158E0]/20 text-[#2158E0] text-xs font-bold tracking-widest uppercase mb-3.5">
            <Sparkles className="w-3.5 h-3.5 text-[#2158E0]" />
            <span>Interactive Platform Preview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#0F172A] tracking-tight leading-tight">
            Designed for Instant Clarity, Built for Easy Action
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-[#5B6478] leading-relaxed max-w-2xl mx-auto">
            Experience how school principals, accountants, and teachers run their daily operations from a single unified workspace.
          </p>

          {/* Interactive Tab Switcher */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 p-1.5 bg-white border border-[#E6EAF3] rounded-2xl sm:rounded-full shadow-xs max-w-2xl mx-auto">
            <button
              onClick={() => setActiveTab("principal")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === "principal"
                  ? "bg-[#2158E0] text-white shadow-sm shadow-[#2158E0]/30"
                  : "text-[#5B6478] hover:text-[#0F172A] hover:bg-slate-50"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Principal Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("fees")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === "fees"
                  ? "bg-[#2158E0] text-white shadow-sm shadow-[#2158E0]/30"
                  : "text-[#5B6478] hover:text-[#0F172A] hover:bg-slate-50"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Fee Counter</span>
            </button>

            <button
              onClick={() => setActiveTab("attendance")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === "attendance"
                  ? "bg-[#2158E0] text-white shadow-sm shadow-[#2158E0]/30"
                  : "text-[#5B6478] hover:text-[#0F172A] hover:bg-slate-50"
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Smart Roll Call</span>
            </button>

            <button
              onClick={() => setActiveTab("website")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === "website"
                  ? "bg-[#2158E0] text-white shadow-sm shadow-[#2158E0]/30"
                  : "text-[#5B6478] hover:text-[#0F172A] hover:bg-slate-50"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>School Website CMS</span>
            </button>
          </div>
        </div>

        {/* Browser Chrome Shell */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#CBD5E1] shadow-xl overflow-hidden transition-all duration-300">
          {/* Top Window Bar */}
          <div className="bg-[#0F172A] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="hidden sm:inline-block ml-3 text-xs font-mono text-slate-400">
                app.myzkool.in / control-panel
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-full text-[11px] text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected: St. Mary Public School, Lucknow</span>
              </div>
              <span className="text-xs bg-[#2158E0] text-white px-2.5 py-1 rounded-full font-semibold">
                Live Data
              </span>
            </div>
          </div>

          {/* Interactive Screen Content */}
          <div className="p-4 sm:p-6 lg:p-8 bg-[#FAFBFD] min-h-[460px]">
            {/* TAB 1: PRINCIPAL OVERVIEW */}
            {activeTab === "principal" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* 4 Core Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Active Students
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0F172A]">
                      1,248
                    </div>
                    <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+38 new admissions this month</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Today's Attendance
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0F172A]">
                      95.4%
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-medium">
                      1,191 present, 57 absent (notified)
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Fee Realization
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0F172A]">
                      ₹18,42,500
                    </div>
                    <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <span>92% collected of monthly target</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        WhatsApp Notices
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0F172A]">
                      412 Sent
                    </div>
                    <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>98.8% instant read rate</span>
                    </div>
                  </div>
                </div>

                {/* Sub-grid: Recent Actions & Live Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Quick Actions & Operational Pipeline */}
                  <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <h4 className="text-sm font-bold text-[#0F172A]">
                        Class-wise Attendance & Collection Pulse
                      </h4>
                      <span className="text-xs text-[#2158E0] font-semibold">Morning Session</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { grade: "Class 10A", total: 42, present: 41, fees: "98% Cleared", badge: "bg-emerald-50 text-emerald-700" },
                        { grade: "Class 8B", total: 38, present: 36, fees: "92% Cleared", badge: "bg-blue-50 text-blue-700" },
                        { grade: "Class 5A", total: 40, present: 39, fees: "95% Cleared", badge: "bg-emerald-50 text-emerald-700" },
                        { grade: "Class 1C", total: 35, present: 33, fees: "88% Cleared", badge: "bg-amber-50 text-amber-700" },
                      ].map((item) => (
                        <div
                          key={item.grade}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-blue-50/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-xs text-[#0F172A]">{item.grade}</span>
                            <span className="text-xs text-slate-500">
                              {item.present}/{item.total} Present
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badge}`}>
                              {item.fees}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Automated WhatsApp Broadcast Queue */}
                  <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-sm font-bold text-[#0F172A]">WhatsApp Dispatches</h4>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Automated
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs">
                          <p className="font-bold text-[#0F172A] mb-1">
                            Daily Absence Notifications (57 Parents)
                          </p>
                          <p className="text-slate-600 leading-relaxed">
                            Dispatched at 08:35 AM with student roll number and helpline callback number.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs">
                          <p className="font-bold text-[#0F172A] mb-1">
                            Term 2 Fee Receipts (184 Parents)
                          </p>
                          <p className="text-slate-600 leading-relaxed">
                            Delivered with instant downloadable PDF receipt and school official stamp.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Zero SMS gateway recharges</span>
                      <span className="font-bold text-[#2158E0]">100% WhatsApp</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FEE COUNTER */}
            {activeTab === "fees" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <span className="text-xs font-semibold text-emerald-800">Total Collected Today</span>
                    <div className="text-2xl font-bold font-heading text-emerald-900 mt-1">₹84,200</div>
                    <span className="text-[11px] text-emerald-700">18 Cash, 14 Online UPI payments</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <span className="text-xs font-semibold text-amber-800">Outstanding Overdue Fees</span>
                    <div className="text-2xl font-bold font-heading text-amber-900 mt-1">₹1,42,000</div>
                    <span className="text-[11px] text-amber-700">62 Students with pending installments</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <span className="text-xs font-semibold text-blue-800">Automated Reminders</span>
                    <div className="text-2xl font-bold font-heading text-blue-900 mt-1">Ready to Send</div>
                    <span className="text-[11px] text-blue-700">Scheduled for parents on WhatsApp</span>
                  </div>
                </div>

                {/* Live Transactions Table */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A] uppercase">Recent Fee Receipts</span>
                    <span className="text-xs text-slate-500">Auto generated PDF with QR verification</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {[
                      { no: "REC-2026-0841", student: "Mohammad Zaid", class: "Class 10A", head: "Tuition + Computer Fee", amt: "₹5,400", mode: "Online UPI", date: "Today, 10:22 AM" },
                      { no: "REC-2026-0840", student: "Ananya Sharma", class: "Class 6B", head: "Quarterly Tuition", amt: "₹4,200", mode: "Cash Counter", date: "Today, 09:50 AM" },
                      { no: "REC-2026-0839", student: "Arjun Verma", class: "Class 8A", head: "Transport + Tuition", amt: "₹6,800", mode: "Online UPI", date: "Today, 09:15 AM" },
                      { no: "REC-2026-0838", student: "Fatima Khan", class: "Class 2C", head: "Quarterly Tuition", amt: "₹3,900", mode: "Bank Transfer", date: "Yesterday" },
                    ].map((tx) => (
                      <div key={tx.no} className="px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-slate-50/70">
                        <div>
                          <div className="font-bold text-[#0F172A] flex items-center gap-2">
                            <span>{tx.student}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {tx.no}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {tx.class} • {tx.head}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#0F172A]">{tx.amt}</span>
                          <span className="text-[10px] bg-blue-50 text-[#2158E0] px-2 py-0.5 rounded-full font-semibold">
                            {tx.mode}
                          </span>
                          <span className="text-[10px] text-slate-400">{tx.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SMART ROLL CALL */}
            {activeTab === "attendance" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">Class 8-A Morning Roll Call</h4>
                      <p className="text-xs text-slate-500">Teacher: Mrs. S. Banerjee • Date: Today</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                        30 Present
                      </span>
                      <span className="text-xs bg-rose-100 text-rose-800 px-3 py-1 rounded-full font-bold">
                        2 Absent
                      </span>
                    </div>
                  </div>

                  {/* Student Roll Call Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                    {[
                      { roll: "01", name: "Aarav Gupta", present: true },
                      { roll: "02", name: "Bushra Siddiqui", present: true },
                      { roll: "03", name: "Divyansh Singh", present: false },
                      { roll: "04", name: "Farhan Ali", present: true },
                      { roll: "05", name: "Gauri Mishra", present: true },
                      { roll: "06", name: "Harsh Vardhan", present: true },
                      { roll: "07", name: "Ishaan Pandey", present: false },
                      { roll: "08", name: "Javeria Noor", present: true },
                    ].map((s) => (
                      <div
                        key={s.roll}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          s.present
                            ? "bg-white border-slate-200"
                            : "bg-rose-50/70 border-rose-200"
                        }`}
                      >
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            #{s.roll}
                          </span>
                          <p className="text-xs font-bold text-[#0F172A] truncate max-w-[110px]">
                            {s.name}
                          </p>
                        </div>
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            s.present
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-500 text-white shadow-xs"
                          }`}
                        >
                          {s.present ? "P" : "A"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[#2158E0] font-semibold">
                      <Bell className="w-4 h-4 shrink-0" />
                      <span>WhatsApp alert sent to Divyansh and Ishaan's parents automatically</span>
                    </div>
                    <span className="text-slate-500 hidden sm:inline">Delivered in 42 seconds</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SCHOOL WEBSITE CMS */}
            {activeTab === "website" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-xs">
                  {/* Website Browser Header */}
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-[#2158E0]" />
                      <span className="font-semibold text-slate-700">stmarylucknow.myzkool.in</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Published
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Custom Domain Ready</span>
                  </div>

                  {/* School Website Preview Mockup */}
                  <div className="p-4 sm:p-6 bg-slate-50 space-y-4">
                    {/* Hero Banner */}
                    <div className="bg-gradient-to-r from-[#2158E0] to-[#1A47B8] text-white p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs bg-white/20 text-white font-semibold px-2.5 py-1 rounded-full">
                          Admissions Open 2026-2027
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold font-heading mt-2">
                          St. Mary Public School, Lucknow
                        </h3>
                        <p className="text-xs sm:text-sm text-blue-100 mt-1">
                          CBSE Affiliated • Nursery to Class 12 • Excellence in Holistic Learning
                        </p>
                      </div>
                      <button
                        onClick={onOpenDemo}
                        className="px-4 py-2 text-xs font-bold bg-white text-[#2158E0] rounded-full shadow-sm hover:bg-blue-50 transition"
                      >
                        Apply Online
                      </button>
                    </div>

                    {/* Quick Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { title: "Principal's Desk", count: "Read Message" },
                        { title: "Mandatory Disclosures", count: "CBSE Compliance" },
                        { title: "Photo & Sports Gallery", count: "14 Albums" },
                        { title: "Online Fee Portal", count: "Parent Login" },
                      ].map((card) => (
                        <div key={card.title} className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                          <p className="text-xs font-bold text-[#0F172A]">{card.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{card.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div className="mt-8 text-center">
          <button
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#2158E0] hover:bg-[#1A47B8] rounded-full shadow-md shadow-[#2158E0]/25 transition cursor-pointer"
          >
            <span>See a Live Walkthrough of Your School Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;

