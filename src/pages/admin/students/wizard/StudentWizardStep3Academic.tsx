import React from "react";
import { GraduationCap, School, AlertCircle } from "lucide-react";
import { AdmissionWizardPayload, AdmissionType } from "../../../../types/students";

interface Step3Props {
  data: AdmissionWizardPayload["step3_academic"];
  onChange: (fields: Partial<AdmissionWizardPayload["step3_academic"]>) => void;
  errors: Record<string, string>;
  classes: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; class_id: string; name: string }>;
}

export const StudentWizardStep3Academic: React.FC<Step3Props> = ({
  data,
  onChange,
  errors,
  classes,
  sections,
}) => {
  const freshAdmission = !data.previous_school;

  const availableSections = sections.filter((s) => s.class_id === data.class_id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 3: Academic & Class Placement</h2>
        <p className="text-sm text-slate-500 mt-1">
          Assign class, section, admission date, and previous schooling records.
        </p>
      </div>

      {/* Class & Section Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <GraduationCap className="w-4 h-4 text-[#2158E0]" />
          <h3 className="font-semibold text-slate-900 text-sm">Class & Section Placement</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="student-class" className="block text-xs font-semibold text-slate-700 mb-1">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              id="student-class"
              value={data.class_id || ""}
              onChange={(e) => onChange({ class_id: e.target.value, section_id: "" })}
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0] ${
                errors.class_id ? "border-red-400 focus:ring-red-300" : "border-slate-300"
              }`}
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            {errors.class_id && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.class_id}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="student-section" className="block text-xs font-semibold text-slate-700 mb-1">
              Section (Optional)
            </label>
            <select
              id="student-section"
              value={data.section_id || ""}
              onChange={(e) => onChange({ section_id: e.target.value })}
              disabled={!data.class_id}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0] disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Assign later / No section</option>
              {availableSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Section {sec.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Can be assigned or transferred after admission.</p>
          </div>

          <div>
            <label htmlFor="student-roll-no" className="block text-xs font-semibold text-slate-700 mb-1">
              Roll Number (Optional)
            </label>
            <input
              id="student-roll-no"
              type="text"
              value={data.roll_no || ""}
              onChange={(e) => onChange({ roll_no: e.target.value })}
              placeholder="e.g. 101"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
            <p className="text-[11px] text-slate-500 mt-1">Leave empty if roll numbers are allocated after section sorting.</p>
          </div>
        </div>

        {/* Admission Date & Admission Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label htmlFor="student-admission-date" className="block text-xs font-semibold text-slate-700 mb-1">
              Admission Date <span className="text-red-500">*</span>
            </label>
            <input
              id="student-admission-date"
              type="date"
              value={data.admission_date || new Date().toISOString().split("T")[0]}
              onChange={(e) => onChange({ admission_date: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>

          <div>
            <label htmlFor="student-admission-type" className="block text-xs font-semibold text-slate-700 mb-1">
              Admission Type
            </label>
            <select
              id="student-admission-type"
              value={data.admission_type || "new"}
              onChange={(e) => onChange({ admission_type: e.target.value as AdmissionType })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            >
              <option value="new">New Admission</option>
              <option value="re_admission">Re-admission</option>
              <option value="transfer_in">Transfer In</option>
            </select>
          </div>

          <div>
            <label htmlFor="student-medium" className="block text-xs font-semibold text-slate-700 mb-1">
              Medium of Instruction
            </label>
            <select
              id="student-medium"
              value={data.medium || "English"}
              onChange={(e) => onChange({ medium: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Bilingual">Bilingual</option>
            </select>
          </div>
        </div>

        {/* RTE Quota Toggle */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800">Right to Education (RTE) Section 12(1)(c) Quota</p>
            <p className="text-[11px] text-slate-500">
              When enabled, 100% tuition fee waiver is automatically applied by the Fee module during billing.
            </p>
          </div>
          <label htmlFor="student-rte-toggle" className="relative inline-flex items-center cursor-pointer">
            <span className="sr-only">Right to Education (RTE) Quota</span>
            <input
              id="student-rte-toggle"
              type="checkbox"
              aria-label="Right to Education (RTE) Quota"
              checked={data.is_rte || false}
              onChange={(e) => onChange({ is_rte: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:bg-[#2158E0]"></div>
          </label>
        </div>
      </div>

      {/* Previous Schooling */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-[#2158E0]" />
            <h3 className="font-semibold text-slate-900 text-sm">Previous Schooling Details</h3>
          </div>
          <label htmlFor="student-fresh-admission-checkbox" className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
            <input
              id="student-fresh-admission-checkbox"
              type="checkbox"
              checked={freshAdmission}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange({ previous_school: undefined });
                } else {
                  onChange({
                    previous_school: {
                      school_name: "",
                      board: "CBSE",
                    },
                  });
                }
              }}
              className="rounded text-[#2158E0] focus:ring-[#2158E0]"
            />
            <span>Fresh admission (no previous school)</span>
          </label>
        </div>

        {!freshAdmission && (
          <div className="space-y-3 pt-1">
            <div>
              <label htmlFor="previous-school-name" className="block text-xs font-medium text-slate-700 mb-1">
                Previous School Name
              </label>
              <input
                id="previous-school-name"
                type="text"
                value={data.previous_school?.school_name || ""}
                onChange={(e) =>
                  onChange({
                    previous_school: { ...data.previous_school, school_name: e.target.value },
                  })
                }
                placeholder="e.g. St. Joseph Convent School"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="previous-school-board" className="block text-xs font-medium text-slate-700 mb-1">
                  Board of Education
                </label>
                <select
                  id="previous-school-board"
                  value={data.previous_school?.board || "CBSE"}
                  onChange={(e) =>
                    onChange({
                      previous_school: { ...data.previous_school, school_name: data.previous_school?.school_name || "", board: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                >
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="UP Board">UP Board</option>
                  <option value="State Board">Other State Board</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="previous-school-tc" className="block text-xs font-medium text-slate-700 mb-1">
                  Transfer Certificate (TC) Number
                </label>
                <input
                  id="previous-school-tc"
                  type="text"
                  value={data.previous_school?.tc_no || ""}
                  onChange={(e) =>
                    onChange({
                      previous_school: { ...data.previous_school, school_name: data.previous_school?.school_name || "", tc_no: e.target.value },
                    })
                  }
                  placeholder="TC number"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                />
              </div>

              <div>
                <label htmlFor="previous-school-result" className="block text-xs font-medium text-slate-700 mb-1">
                  Last Class Result %
                </label>
                <input
                  id="previous-school-result"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.previous_school?.result_percent !== undefined && !Number.isNaN(data.previous_school.result_percent) ? data.previous_school.result_percent : ""}
                  onChange={(e) =>
                    onChange({
                      previous_school: {
                        ...data.previous_school,
                        school_name: data.previous_school?.school_name || "",
                        result_percent: e.target.value && !isNaN(Number(e.target.value)) ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="e.g. 88.5"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
