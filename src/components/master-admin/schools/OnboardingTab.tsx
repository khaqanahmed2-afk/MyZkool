import React from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  Rocket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Building,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  schools: MasterAdminSchoolSummary[];
  onSelectSchool: (school: MasterAdminSchoolSummary) => void;
  onReviewSchool?: (school: MasterAdminSchoolSummary) => void;
}

const ONBOARDING_STAGES = [
  { step: 1, name: "Registration Submitted", desc: "Basic school profile and subdomain reserved" },
  { step: 2, name: "Institution Details", desc: "Affiliation board, address, and official contacts" },
  { step: 3, name: "Admin Account Created", desc: "Principal or school owner auth verified" },
  { step: 4, name: "Plan Selected", desc: "Subscription plan & billing cycle chosen" },
  { step: 5, name: "Payment Verified", desc: "Gateway transaction or trial activated" },
  { step: 6, name: "Academic Configuration", desc: "Academic year, classes, and sections established" },
  { step: 7, name: "Initial Data Setup", desc: "Staff & initial student roster imported" },
  { step: 8, name: "Institution Activated", desc: "Fully operational campus ERP tenant" },
];

export const OnboardingTab: React.FC<Props> = ({ schools, onSelectSchool, onReviewSchool }) => {
  const pendingSchools = schools.filter((s) => !s.onboarding_completed);
  const completedSchools = schools.filter((s) => s.onboarding_completed);

  return (
    <div className="space-y-6">
      {/* Onboarding Summary Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Multi-Tenant Onboarding Pipeline
              </h3>
              <p className="text-xs text-slate-500">
                Tracking verification, tenant setup, and onboarding progression across all 8 stages.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <p className="text-xs font-bold text-amber-800">{pendingSchools.length}</p>
            <p className="text-[10px] text-amber-600 font-medium">Pending Setup</p>
          </div>
          <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <p className="text-xs font-bold text-emerald-800">{completedSchools.length}</p>
            <p className="text-[10px] text-emerald-600 font-medium">Fully Activated</p>
          </div>
        </div>
      </div>

      {/* Pending Schools Pipeline Cards */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Institutions Pending Activation ({pendingSchools.length})
        </h4>

        {pendingSchools.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">All registered institutions have completed onboarding!</p>
            <p className="text-[11px] text-slate-400 mt-1">New registrations will automatically queue here.</p>
          </div>
        ) : (
          pendingSchools.map((school) => {
            const currentStep = school.onboarding_step || 1;
            const progressPercent = Math.round((currentStep / 8) * 100);

            return (
              <div
                key={school.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {school.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-slate-900">{school.name}</h5>
                        <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                          {school.institution_code}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                          Step {currentStep} of 8
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {school.city}, {school.state} · Admin: {school.principal_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectSchool(school)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Inspect Profile
                    </button>
                    {onReviewSchool && (
                      <button
                        onClick={() => onReviewSchool(school)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Review & Approve</span>
                      </button>
                    )}
                    <Link
                      to={`/master-admin/schools/${school.id}`}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Manage Setup</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">
                      Current Stage: <strong className="text-slate-900">{ONBOARDING_STAGES[currentStep - 1]?.name}</strong>
                    </span>
                    <span className="text-indigo-600 font-bold">{progressPercent}% Completed</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 8-Stage Tracker Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 pt-1">
                  {ONBOARDING_STAGES.map((st) => {
                    const isDone = st.step < currentStep;
                    const isCurrent = st.step === currentStep;

                    return (
                      <div
                        key={st.step}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isDone
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                            : isCurrent
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <p className="text-[10px] font-bold">Step {st.step}</p>
                        <p className="text-[9px] truncate mt-0.5">{st.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
