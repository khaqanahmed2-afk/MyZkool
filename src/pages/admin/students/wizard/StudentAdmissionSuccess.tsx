import React from "react";
import { CheckCircle2, User, Printer, Plus, Users, Bus, CreditCard, ArrowRight } from "lucide-react";
import { Student } from "../../../../types/students";
import { useNavigate } from "react-router-dom";

interface SuccessProps {
  student: Student;
  className?: string;
  sectionName?: string;
  onAddAnother: () => void;
  onAddSibling: () => void;
}

export const StudentAdmissionSuccess: React.FC<SuccessProps> = ({
  student,
  className,
  sectionName,
  onAddAnother,
  onAddSibling,
}) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      {/* Success Banner */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900">Student Admitted Successfully!</h1>
        <p className="text-sm text-slate-500">
          Permanent student record created and admission confirmation message queued.
        </p>
      </div>

      {/* Admitted Student Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
          {student.photo_path ? (
            <img
              src={student.photo_path}
              alt={student.first_name}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
              {student.first_name[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {student.first_name} {student.last_name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
              <span>Adm No: <strong>{student.admission_no}</strong></span>
              <span>•</span>
              <span>Class {className || "Assigned"} {sectionName ? `(${sectionName})` : ""}</span>
            </div>
          </div>
        </div>

        {/* Next Actions Grid */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Recommended Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/students/${student.id}`)}
              className="p-3.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-left transition flex items-center justify-between text-blue-900 group"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-[#2158E0]" />
                <span className="text-xs font-semibold">View Student Profile</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#2158E0] group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onAddSibling}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex items-center justify-between text-slate-800 group"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">Add a Sibling</span>
              </div>
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex items-center justify-between text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold">Print Admission Form</span>
              </div>
            </button>

            <button
              type="button"
              onClick={onAddAnother}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex items-center justify-between text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold">Admit Another Student</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
