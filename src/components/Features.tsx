import React from "react";
import { 
  Globe, 
  UserPlus, 
  CreditCard, 
  UserCheck, 
  FileSpreadsheet, 
  CalendarDays, 
  MessageSquare, 
  Users, 
  Bus,
  CheckCircle,
  ExternalLink,
  Smartphone,
  Sparkles,
  QrCode,
  Download
} from "lucide-react";

export const Features: React.FC = () => {
  return (
    <section className="py-20 bg-[#F6F8FC] border-b border-[#E6EAF3]" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#2158E0] text-xs font-bold tracking-wide uppercase mb-3">
            Full Feature Set
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#141A2E] tracking-tight">
            Everything Your School Needs to Run Smoothly
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5B6478]">
            Nine powerful modules built to talk to each other seamlessly. No duplicated data, no disjointed software.
          </p>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* 1. Website Builder */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-[#141A2E] mb-2">
                Website Builder
              </h3>
              <p className="text-sm text-[#5B6478] leading-relaxed mb-6">
                A ready-made, editable school website. No developer, no hosting to manage: go live in days.
              </p>
            </div>
            {/* Mockup Thumbnail */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] p-3 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-2 mb-2 text-[10px] text-[#5B6478]">
                <span className="font-semibold text-[#141A2E]">School Homepage Editor</span>
                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Published</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-6 bg-blue-100/70 rounded flex items-center px-2 text-[10px] text-[#2158E0] font-medium justify-between">
                  <span>Admissions Open 2026-27 Banner</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="h-9 bg-white border border-[#E6EAF3] rounded p-1 text-[8px] text-center text-[#5B6478]">Principal's Desk</div>
                  <div className="h-9 bg-white border border-[#E6EAF3] rounded p-1 text-[8px] text-center text-[#5B6478]">Campus Tour</div>
                  <div className="h-9 bg-white border border-[#E6EAF3] rounded p-1 text-[8px] text-center text-[#5B6478]">Board Results</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Admissions */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-[#141A2E] mb-2">
                Admissions
              </h3>
              <p className="text-sm text-[#5B6478] leading-relaxed mb-6">
                Online enquiry forms feed straight into a trackable admissions pipeline, from enquiry to enrolled.
              </p>
            </div>
            {/* Mockup Thumbnail */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] p-3 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-[#5B6478] mb-2 font-medium">
                <span>Enquiry (38)</span>
                <span>Document (19)</span>
                <span className="text-purple-600 font-bold">Enrolled (14)</span>
              </div>
              <div className="space-y-1.5">
                <div className="p-1.5 bg-white border border-[#E6EAF3] rounded text-[10px] flex items-center justify-between">
                  <span className="font-semibold text-[#141A2E]">Ananya Verma (Class 1)</span>
                  <span className="text-[9px] text-emerald-600 font-medium">Fee Paid</span>
                </div>
                <div className="p-1.5 bg-white border border-[#E6EAF3] rounded text-[10px] flex items-center justify-between">
                  <span className="font-semibold text-[#141A2E]">Kartik Singh (Class 5)</span>
                  <span className="text-[9px] text-amber-600 font-medium">Interview Set</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Fees & Payments (HIGHLIGHTED CARD: Solid Brand Blue #2158E0 with White Text) */}
          <div className="bg-[#2158E0] text-white rounded-2xl border border-[#1d4ecc] p-6 shadow-xl shadow-[#2158E0]/20 flex flex-col justify-between transform lg:-translate-y-2 group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white tracking-wide uppercase">
                  Featured Core
                </span>
              </div>
              <h3 className="text-xl font-bold font-heading text-white mb-2">
                Fees &amp; Payments
              </h3>
              <p className="text-sm text-blue-100 leading-relaxed mb-6">
                Collect fees online, track dues in real time, and send automatic WhatsApp reminders before they're late.
              </p>
            </div>
            {/* Mockup Thumbnail inside blue card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-3 overflow-hidden text-white">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-blue-100">Term 1 Dues Pending</span>
                <span className="font-bold text-amber-300">₹1,42,000</span>
              </div>
              <div className="p-2 rounded bg-black/20 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/90">Auto WhatsApp Reminder:</span>
                  <span className="text-emerald-300 font-semibold">Active</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-blue-100">
                  <QrCode className="w-3 h-3 text-white" />
                  <span>UPI, NetBanking, Debit/Credit Card auto-reconciliation</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Attendance */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#1FAE7A] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-[#141A2E] mb-2">
                Attendance
              </h3>
              <p className="text-sm text-[#5B6478] leading-relaxed mb-6">
                Mark daily attendance in seconds; parents see it the same day, automatically.
              </p>
            </div>
            {/* Mockup Thumbnail */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] p-3 overflow-hidden">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#141A2E] mb-2">
                <span>Class 8-A (42 Students)</span>
                <span className="text-[#1FAE7A] bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">95% Present</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="p-1.5 bg-white border border-[#E6EAF3] rounded flex items-center justify-between">
                  <span>Priya Sharma</span>
                  <span className="text-emerald-600 font-bold">P</span>
                </div>
                <div className="p-1.5 bg-white border border-[#E6EAF3] rounded flex items-center justify-between">
                  <span>Aman Khan</span>
                  <span className="text-red-500 font-bold">A</span>
                </div>
              </div>
              <div className="mt-2 text-[9px] text-[#5B6478] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1FAE7A]" />
                <span>Absence WhatsApp ping sent to Aman's parents at 8:40 AM</span>
              </div>
            </div>
          </div>

          {/* 5. Exams & Report Cards */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-[#141A2E] mb-2">
                Exams &amp; Report Cards
              </h3>
              <p className="text-sm text-[#5B6478] leading-relaxed mb-6">
                Enter marks once, generate printable report cards with no more spreadsheets at term-end.
              </p>
            </div>
            {/* Mockup Thumbnail */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] p-3 overflow-hidden">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#141A2E] mb-1.5">
                <span>CBSE Format Term 1 Card</span>
                <Download className="w-3.5 h-3.5 text-[#2158E0]" />
              </div>
              <div className="bg-white p-2 rounded border border-[#E6EAF3] space-y-1 text-[9px] text-[#5B6478]">
                <div className="flex justify-between border-b border-neutral-100 pb-1 font-medium text-[#141A2E]">
                  <span>Subject</span>
                  <span>Marks (100)</span>
                  <span>Grade</span>
                </div>
                <div className="flex justify-between">
                  <span>Mathematics</span>
                  <span>92</span>
                  <span className="text-emerald-600 font-bold">A1</span>
                </div>
                <div className="flex justify-between">
                  <span>Science</span>
                  <span>88</span>
                  <span className="text-emerald-600 font-bold">A2</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Timetable */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-[#141A2E] mb-2">
                Timetable
              </h3>
              <p className="text-sm text-[#5B6478] leading-relaxed mb-6">
                Build and publish class and teacher timetables in minutes, visible to staff and parents.
              </p>
            </div>
            {/* Mockup Thumbnail */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] p-3 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-[#5B6478] mb-1.5 font-medium">
                <span>Zero Conflict Master Schedule</span>
                <span className="text-indigo-600 font-bold">Class 9</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[8px] text-center">
                <div className="p-1.5 bg-blue-50 text-blue-800 rounded border border-blue-100 font-medium">09:00 - English</div>
                <div className="p-1.5 bg-purple-50 text-purple-800 rounded border border-purple-100 font-medium">10:00 - Physics</div>
                <div className="p-1.5 bg-amber-50 text-amber-800 rounded border border-amber-100 font-medium">11:00 - Math</div>
              </div>
              <div className="mt-2 text-[9px] text-[#5B6478] text-right">Instant substitution alerts included</div>
            </div>
          </div>

          {/* 7. Communication (WhatsApp-first) */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#1FAE7A] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-[#141A2E] mb-2">
                Communication (WhatsApp-first)
              </h3>
              <p className="text-sm text-[#5B6478] leading-relaxed mb-6">
                Notices, reminders, emergency alerts and PTM updates delivered where parents actually check.
              </p>
            </div>
            {/* Mockup Thumbnail */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] p-3 overflow-hidden">
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <span>Broadcast: School Winter Timings Notice</span>
                </div>
                <p className="text-[9px] text-emerald-800">
                  Delivered to 840 parent WhatsApp numbers with verified green badge.
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] text-[#5B6478]">
                <span>Read Rate: 98.4%</span>
                <span className="text-[#1FAE7A] font-semibold">Zero app downloads</span>
              </div>
            </div>
          </div>

          {/* 8. Staff & Student Records */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-[#141A2E] mb-2">
                Staff &amp; Student Records
              </h3>
              <p className="text-sm text-[#5B6478] leading-relaxed mb-6">
                One central record for every student and staff member, accessible to the right people only.
              </p>
            </div>
            {/* Mockup Thumbnail */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] p-3 overflow-hidden">
              <div className="flex items-center gap-2 p-1.5 bg-white border border-[#E6EAF3] rounded mb-1.5">
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 font-bold text-[10px] flex items-center justify-center">
                  RS
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#141A2E]">Rohan Sharma • Roll #14</div>
                  <div className="text-[8px] text-[#5B6478]">Aadhar, Blood Group, Parent Contacts linked</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[9px] text-[#5B6478]">
                <span>Role-based privacy lock</span>
                <span className="text-cyan-700 font-medium">Safe &amp; Encrypted</span>
              </div>
            </div>
          </div>

          {/* 9. Transport Tracking */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Bus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-[#141A2E] mb-2">
                Transport Tracking
              </h3>
              <p className="text-sm text-[#5B6478] leading-relaxed mb-6">
                Live bus tracking and route management for parents and transport staff.
              </p>
            </div>
            {/* Mockup Thumbnail */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E6EAF3] p-3 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-[#5B6478] mb-1.5">
                <span className="font-semibold text-[#141A2E]">Bus Route #4 (Civil Lines)</span>
                <span className="text-emerald-600 font-bold">On Route</span>
              </div>
              <div className="h-7 bg-white border border-[#E6EAF3] rounded flex items-center px-2 text-[9px] text-[#5B6478] justify-between">
                <span>Next Stop: Gandhi Chowk (ETA 4 min)</span>
                <span className="text-[#2158E0] font-semibold">Live GPS</span>
              </div>
              <div className="mt-2 text-[9px] text-[#5B6478] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Parents notified when bus is 2 stops away</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
