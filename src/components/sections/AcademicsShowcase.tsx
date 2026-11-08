import React from "react";
import {
  GraduationCap,
  Award,
  FileCheck2,
  Calendar,
  Users2,
  CheckCircle2,
  Download,
  Share2,
  ArrowRight,
} from "lucide-react";

export interface AcademicsShowcaseProps {
  onOpenDemo?: () => void;
}

export const AcademicsShowcase: React.FC<AcademicsShowcaseProps> = ({ onOpenDemo }) => {
  return (
    <section
      className="py-16 md:py-24 bg-white border-b border-[#E6EAF3]"
      id="academics"
      aria-label="Staff, Examinations and Academic Management"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-[#2158E0]/20 text-[#2158E0] text-xs font-bold tracking-widest uppercase mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic &amp; Examination Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#0F172A] tracking-tight leading-tight">
            Effortless Examinations, Grading, and Report Cards
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-[#5B6478] leading-relaxed max-w-2xl mx-auto">
            From teacher subject allocation to final CBSE and ICSE report card generation, MyZkool removes calculation errors and weeks of manual paperwork.
          </p>
        </div>

        {/* 2-Column Split: Value Highlights Left + Realistic Report Card Card Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Key Academic Features */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    CBSE, ICSE, and State Board Grading
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B6478] mt-1 leading-relaxed">
                    Custom grade scales, scholastic and co-scholastic grading, attendance percentages, and teacher remarks calculate automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                  <FileCheck2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    1-Click Printable Report Card PDFs
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B6478] mt-1 leading-relaxed">
                    Generate beautiful, print-ready student marksheets with your school logo, watermarked background, and digital signature space.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100">
                  <Users2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Staff Subject Allocation &amp; Workload
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B6478] mt-1 leading-relaxed">
                    Assign teachers to specific classes and subjects with role-based permissions so teachers only edit marks for their assigned sections.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 border border-amber-100">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Exam Scheduling &amp; Date Sheets
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B6478] mt-1 leading-relaxed">
                    Create exam timetables for Unit Tests, Mid-Terms, and Finals, and broadcast the date sheet directly to parents on WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onOpenDemo}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-[#2158E0] bg-blue-50 hover:bg-blue-100/80 rounded-xl transition cursor-pointer"
              >
                <span>Request Sample Report Cards for Your Board</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Realistic Marks & Report Card UI Preview */}
          <div className="lg:col-span-6">
            <div className="bg-[#FAFBFD] rounded-2xl border border-[#CBD5E1] p-5 sm:p-6 shadow-md relative overflow-hidden">
              {/* Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2158E0] text-white flex items-center justify-center text-xs font-bold">
                    M
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A]">Term 1 Assessment Report</h4>
                    <p className="text-[10px] text-slate-500">Student: Aryan Sharma • Class 9A • Roll #14</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Rank 3 / 42
                </span>
              </div>

              {/* Marks Table */}
              <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                <div className="grid grid-cols-5 px-3 py-2 bg-slate-50 font-bold text-slate-600 text-[10px] uppercase border-b border-slate-200">
                  <span className="col-span-2">Subject</span>
                  <span className="text-center">Max</span>
                  <span className="text-center">Marks</span>
                  <span className="text-center">Grade</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { sub: "English Communicative", max: 100, obt: 92, grade: "A1", color: "text-emerald-700" },
                    { sub: "Mathematics", max: 100, obt: 96, grade: "A1", color: "text-emerald-700" },
                    { sub: "Science & Technology", max: 100, obt: 88, grade: "A2", color: "text-emerald-700" },
                    { sub: "Social Science", max: 100, obt: 84, grade: "B1", color: "text-blue-700" },
                    { sub: "Hindi Course A", max: 100, obt: 90, grade: "A1", color: "text-emerald-700" },
                  ].map((row) => (
                    <div key={row.sub} className="grid grid-cols-5 px-3 py-2 items-center text-[11px]">
                      <span className="col-span-2 font-medium text-[#0F172A]">{row.sub}</span>
                      <span className="text-center text-slate-500">{row.max}</span>
                      <span className="text-center font-bold text-[#0F172A]">{row.obt}</span>
                      <span className={`text-center font-bold ${row.color}`}>{row.grade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Bottom Bar */}
              <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Total Score:</span>
                  <span className="font-bold text-[#0F172A] ml-1.5">450 / 500 (90.0%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200">
                    Result: Passed (A1)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px]">Teacher remarks verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenDemo}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-700 transition"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>PDF Marksheet</span>
                  </button>
                  <button
                    onClick={onOpenDemo}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>WhatsApp Parent</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AcademicsShowcase;

