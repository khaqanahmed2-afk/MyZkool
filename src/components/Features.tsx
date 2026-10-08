import React from "react";
import {
  Users,
  UserCheck,
  CreditCard,
  Smartphone,
  ClipboardList,
  Globe,
  ChevronRight,
  CircleCheckBig,
  IndianRupee,
  CalendarCheck,
  Bell,
  FileText,
  ArrowRight,
} from "lucide-react";

export const Features: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-[#F6F8FC] border-b border-[#E6EAF3]" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2158E0]/10 border border-[#2158E0]/20 text-[#2158E0] text-xs font-bold tracking-widest uppercase mb-4">
            One Platform. Every School Operation.
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#141A2E] tracking-tight leading-tight">
            Everything Your School Needs to Run Smoothly
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B6478] leading-relaxed max-w-2xl mx-auto">
            From student records and attendance to fees, admissions and parent communication, MyZkool brings your school's daily operations together in one simple platform.
          </p>
        </div>

        {/* Row 1: 2 Large Featured Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Card 1: Student Management (Large) */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2158E0]/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5 text-[#2158E0]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-[#141A2E] leading-tight">Student Management</h3>
                  <p className="text-xs text-[#5B6478] mt-0.5">Profiles, records & documents</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[#2158E0] bg-blue-50 border border-blue-100 px-2 py-1 rounded-full shrink-0">Core Module</span>
            </div>
            <p className="text-sm text-[#5B6478] leading-relaxed mb-5">
              Keep student profiles, parent details and documents organized in one secure place.
            </p>

            {/* Student Table UI Preview */}
            <div className="flex-1 bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#E6EAF3] bg-white">
                <span className="text-[11px] font-bold text-[#141A2E]">Student Directory</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#5B6478] bg-[#F1F5F9] px-2 py-0.5 rounded-full">1,248 students</span>
                  <CircleCheckBig className="w-3 h-3 text-emerald-600" />
                </div>
              </div>
              {/* Table Header */}
              <div className="grid grid-cols-4 px-3 py-1.5 bg-[#F1F5F9] text-[9px] font-bold text-[#5B6478] uppercase tracking-wide">
                <span>Student</span>
                <span>Class</span>
                <span>Status</span>
                <span>Fees</span>
              </div>
              {/* Table Rows */}
              {[
                { init: "AK", name: "Student A", cls: "Class 6B", status: "Active", statusColor: "text-emerald-700 bg-emerald-50", fees: "Paid", feesColor: "text-emerald-700" },
                { init: "RJ", name: "Student B", cls: "Class 7A", status: "Active", statusColor: "text-emerald-700 bg-emerald-50", fees: "Due", feesColor: "text-amber-600" },
                { init: "PM", name: "Student C", cls: "Class 9C", status: "Active", statusColor: "text-emerald-700 bg-emerald-50", fees: "Paid", feesColor: "text-emerald-700" },
              ].map((row) => (
                <div key={row.init} className="grid grid-cols-4 items-center px-3 py-2 border-b border-[#F1F5F9] last:border-0 hover:bg-blue-50/30 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#2158E0]/10 text-[#2158E0] text-[8px] font-bold flex items-center justify-center shrink-0">{row.init}</div>
                    <span className="text-[10px] font-medium text-[#141A2E] truncate">{row.name}</span>
                  </div>
                  <span className="text-[10px] text-[#5B6478]">{row.cls}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full w-fit ${row.statusColor}`}>{row.status}</span>
                  <span className={`text-[10px] font-bold ${row.feesColor}`}>{row.fees}</span>
                </div>
              ))}
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[9px] text-[#5B6478]">Showing 3 of 1,248</span>
                <span className="text-[9px] text-[#2158E0] font-semibold flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></span>
              </div>
            </div>
          </div>

          {/* Card 2: Fee Management (Large) */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5 text-[#2158E0]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-[#141A2E] leading-tight">Fee Management</h3>
                  <p className="text-xs text-[#5B6478] mt-0.5">Collection, dues & receipts</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[#2158E0] bg-blue-50 border border-blue-100 px-2 py-1 rounded-full shrink-0">Core Module</span>
            </div>
            <p className="text-sm text-[#5B6478] leading-relaxed mb-5">
              Create fee structures, track dues, record offline payments and accept online payments.
            </p>

            {/* Fee Ledger UI Preview */}
            <div className="flex-1 bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] overflow-hidden">
              {/* Summary Bar */}
              <div className="grid grid-cols-3 border-b border-[#E6EAF3]">
                {[
                  { label: "Collected", value: "₹18.4L", color: "text-emerald-700", bg: "bg-emerald-50" },
                  { label: "Pending", value: "₹1.8L", color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Students", value: "142 due", color: "text-[#2158E0]", bg: "bg-blue-50" },
                ].map((s) => (
                  <div key={s.label} className={`flex flex-col items-center py-2.5 px-2 ${s.bg} border-r border-[#E6EAF3] last:border-0`}>
                    <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                    <span className="text-[9px] text-[#5B6478] font-medium mt-0.5">{s.label}</span>
                  </div>
                ))}
              </div>
              {/* Fee Rows */}
              <div className="px-3 py-2 border-b border-[#E6EAF3] bg-white">
                <div className="grid grid-cols-4 text-[9px] font-bold text-[#5B6478] uppercase tracking-wide pb-1.5 border-b border-[#F1F5F9]">
                  <span>Student</span><span>Head</span><span>Amount</span><span>Status</span>
                </div>
                {[
                  { s: "Student A", h: "Tuition", a: "₹4,200", st: "Paid", sc: "text-emerald-700" },
                  { s: "Student B", h: "Transport", a: "₹1,800", st: "Due", sc: "text-amber-600" },
                  { s: "Student C", h: "Tuition", a: "₹4,200", st: "Paid", sc: "text-emerald-700" },
                ].map((r, i) => (
                  <div key={i} className="grid grid-cols-4 items-center py-1.5 text-[10px] border-b border-[#F1F5F9] last:border-0">
                    <span className="text-[#141A2E] font-medium truncate">{r.s}</span>
                    <span className="text-[#5B6478]">{r.h}</span>
                    <span className="text-[#141A2E] font-semibold">{r.a}</span>
                    <span className={`font-bold ${r.sc}`}>{r.st}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <IndianRupee className="w-3 h-3 text-[#2158E0]" />
                <span className="text-[9px] text-[#5B6478]">Online and offline payments automatically reconciled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: 4 Smaller Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Card 3: Smart Attendance */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold font-heading text-[#141A2E] mb-1.5">Smart Attendance</h3>
            <p className="text-xs text-[#5B6478] leading-relaxed mb-4">
              Mark attendance quickly from mobile and keep parents informed about absences.
            </p>

            {/* Attendance Roster UI */}
            <div className="flex-1 bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E6EAF3] bg-white">
                <span className="text-[10px] font-bold text-[#141A2E]">Class 8A</span>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">96% Present</span>
              </div>
              <div className="p-2 space-y-1">
                {[
                  { label: "Student 1", p: true },
                  { label: "Student 2", p: true },
                  { label: "Student 3", p: false },
                  { label: "Student 4", p: true },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 border border-[#E6EAF3]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#2158E0]/10 text-[7px] font-bold text-[#2158E0] flex items-center justify-center">{s.label[0]}</div>
                      <span className="text-[10px] text-[#141A2E] font-medium">{s.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.p ? "text-emerald-700 bg-emerald-50" : "text-rose-600 bg-rose-50"}`}>
                      {s.p ? "P" : "A"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-2 flex items-center gap-1">
                <Bell className="w-2.5 h-2.5 text-[#5B6478]" />
                <span className="text-[8px] text-[#5B6478]">Parents notified on absence</span>
              </div>
            </div>
          </div>

          {/* Card 4: Parent App */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Smartphone className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <h3 className="text-base font-bold font-heading text-[#141A2E] mb-1.5">Parent App</h3>
            <p className="text-xs text-[#5B6478] leading-relaxed mb-4">
              Give every parent one simple place to check attendance, fees, notices and school updates.
            </p>

            {/* Mini Mobile Dashboard UI */}
            <div className="flex-1 flex justify-center">
              <div className="w-full bg-[#1A1F36] rounded-2xl p-1.5 shadow-inner">
                {/* Phone header */}
                <div className="bg-[#2158E0] rounded-xl px-2.5 pt-2 pb-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] font-bold text-blue-200 tracking-widest uppercase">MyZkool</span>
                    <div className="flex items-center gap-1">
                      <Bell className="w-2.5 h-2.5 text-white" />
                      <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">P</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-white font-bold text-[9px]">Good Morning 👋</p>
                  <div className="mt-1.5 bg-white/15 rounded-lg px-2 py-1.5 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"><span className="text-[7px] text-white font-bold">MC</span></div>
                    <div>
                      <p className="text-[8px] font-bold text-white leading-none">My Child</p>
                      <p className="text-[7px] text-blue-200">Class 6 • 94% Attendance</p>
                    </div>
                  </div>
                </div>
                {/* App body */}
                <div className="bg-[#F7F9FC] rounded-xl mt-1 p-1.5 grid grid-cols-2 gap-1">
                  {[
                    { icon: CalendarCheck, label: "Attendance", val: "94%", color: "text-emerald-600", bg: "bg-emerald-50" },
                    { icon: CreditCard, label: "Fees", val: "Due", color: "text-rose-500", bg: "bg-rose-50" },
                    { icon: Bell, label: "Notices", val: "2 New", color: "text-amber-600", bg: "bg-amber-50" },
                    { icon: FileText, label: "Updates", val: "3 New", color: "text-[#2158E0]", bg: "bg-blue-50" },
                  ].map(({ icon: Icon, label, val, color, bg }) => (
                    <div key={label} className={`${bg} rounded-lg p-1.5 flex flex-col`}>
                      <Icon className={`w-3 h-3 ${color} mb-0.5`} />
                      <p className="text-[8px] font-semibold text-[#141A2E] leading-none">{label}</p>
                      <p className={`text-[8px] font-bold ${color} mt-0.5`}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Online Admissions */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ClipboardList className="w-4.5 h-4.5 text-violet-600" />
            </div>
            <h3 className="text-base font-bold font-heading text-[#141A2E] mb-1.5">Online Admissions</h3>
            <p className="text-xs text-[#5B6478] leading-relaxed mb-4">
              Collect applications online, verify documents and move applicants through the admission process.
            </p>

            {/* Admissions Pipeline UI */}
            <div className="flex-1 bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] overflow-hidden">
              {/* Pipeline stages */}
              <div className="grid grid-cols-3 border-b border-[#E6EAF3] text-center">
                {[
                  { label: "Applied", count: 38, color: "text-[#2158E0]", bg: "bg-blue-50" },
                  { label: "Review", count: 19, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Enrolled", count: 14, color: "text-emerald-700", bg: "bg-emerald-50" },
                ].map((s) => (
                  <div key={s.label} className={`py-2 ${s.bg} border-r border-[#E6EAF3] last:border-0`}>
                    <p className={`text-sm font-bold ${s.color}`}>{s.count}</p>
                    <p className="text-[9px] text-[#5B6478] font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Applications */}
              <div className="p-2 space-y-1">
                {[
                  { label: "Applicant A", cls: "Class 1", status: "Documents OK", color: "text-emerald-700 bg-emerald-50" },
                  { label: "Applicant B", cls: "Class 5", status: "Interview Set", color: "text-amber-700 bg-amber-50" },
                  { label: "Applicant C", cls: "Class 8", status: "Enrolled", color: "text-[#2158E0] bg-blue-50" },
                ].map((a) => (
                  <div key={a.label} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 border border-[#E6EAF3]">
                    <div>
                      <p className="text-[10px] font-semibold text-[#141A2E] leading-none">{a.label}</p>
                      <p className="text-[8px] text-[#5B6478]">{a.cls}</p>
                    </div>
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${a.color}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 6: School Website */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Globe className="w-4.5 h-4.5 text-sky-600" />
            </div>
            <h3 className="text-base font-bold font-heading text-[#141A2E] mb-1.5">School Website</h3>
            <p className="text-xs text-[#5B6478] leading-relaxed mb-4">
              Create and publish a professional school website with admissions built in.
            </p>

            {/* Website Builder Preview */}
            <div className="flex-1 bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] overflow-hidden">
              {/* Fake browser bar */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white border-b border-[#E6EAF3]">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 bg-[#F1F5F9] rounded px-1.5 py-0.5 flex items-center gap-1">
                  <Globe className="w-2 h-2 text-[#5B6478]" />
                  <span className="text-[8px] text-[#5B6478] truncate">yourschool.myzkool.in</span>
                </div>
                <span className="text-[8px] text-emerald-700 font-bold bg-emerald-50 px-1 rounded">Live</span>
              </div>
              {/* Website content preview */}
              <div className="p-2 space-y-1.5">
                {/* Hero banner */}
                <div className="h-8 bg-[#2158E0] rounded-lg flex items-center justify-between px-2">
                  <span className="text-[8px] text-white font-bold">Admissions Open 2026 / 2027</span>
                  <span className="text-[7px] text-white bg-white/20 px-1.5 py-0.5 rounded-full">Apply Now</span>
                </div>
                {/* Section tiles */}
                <div className="grid grid-cols-3 gap-1">
                  {["About School", "Academics", "Admissions"].map((t) => (
                    <div key={t} className="h-6 bg-white border border-[#E6EAF3] rounded text-[7px] text-[#5B6478] flex items-center justify-center text-center font-medium">{t}</div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] text-[#5B6478]">No developer needed</span>
                  <span className="text-[8px] text-[#2158E0] font-semibold flex items-center gap-0.5">Publish <ArrowRight className="w-2 h-2" /></span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom value proposition bar */}
        <div className="mt-10 bg-white border border-[#E6EAF3] rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="font-heading font-bold text-[#141A2E] text-base sm:text-lg leading-tight">
              MyZkool replaces scattered tools with one connected platform.
            </p>
            <p className="text-sm text-[#5B6478] mt-1">All modules share the same student database. No duplicate entry. No gaps.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {["Students", "Fees", "Attendance", "Admissions", "Parents"].map((tag) => (
              <span key={tag} className="hidden sm:block text-[10px] font-semibold text-[#2158E0] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full whitespace-nowrap">{tag}</span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};