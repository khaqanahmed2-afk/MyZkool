import React from "react";
import { HeartPulse, Lock, ShieldAlert } from "lucide-react";
import { StudentMedicalInput } from "../../../../types/students";

interface Step6Props {
  medical?: StudentMedicalInput;
  canWriteMedical: boolean;
  onChange: (fields: Partial<StudentMedicalInput>) => void;
}

export const StudentWizardStep6Medical: React.FC<Step6Props> = ({
  medical = {} as StudentMedicalInput,
  canWriteMedical,
  onChange,
}) => {
  if (!canWriteMedical) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Step 6: Medical Information</h2>
          <p className="text-sm text-slate-500 mt-1">
            Emergency health instructions, allergies, and special conditions.
          </p>
        </div>

        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Medical Details Permission Required</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You do not have the <code className="text-blue-600">students.medical.write</code> permission. Medical details can be added later by authorised staff or the school owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 6: Medical Information</h2>
        <p className="text-sm text-slate-500 mt-1">
          All fields are optional. Used strictly by authorised health staff and during emergencies.
        </p>
      </div>

      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Confidential:</strong> Only the owner and staff authorised with <code>students.medical.read</code> can see this record.
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Allergies</label>
            <input
              type="text"
              value={medical.allergies || ""}
              onChange={(e) => onChange({ allergies: e.target.value })}
              placeholder="e.g. Peanuts, Penicillin, Dust"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Chronic Conditions</label>
            <input
              type="text"
              value={medical.conditions || ""}
              onChange={(e) => onChange({ conditions: e.target.value })}
              placeholder="e.g. Asthma, Diabetes"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Medications</label>
            <input
              type="text"
              value={medical.medications || ""}
              onChange={(e) => onChange({ medications: e.target.value })}
              placeholder="e.g. Inhaler as needed"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Vision / Hearing Aids</label>
            <input
              type="text"
              value={medical.vision_hearing_aids || ""}
              onChange={(e) => onChange({ vision_hearing_aids: e.target.value })}
              placeholder="e.g. Wears spectacles"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Instructions</label>
          <textarea
            rows={2}
            value={medical.emergency_instructions || ""}
            onChange={(e) => onChange({ emergency_instructions: e.target.value })}
            placeholder="Special steps for first aid or emergency contact"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Family Doctor Name</label>
            <input
              type="text"
              value={medical.doctor_name || ""}
              onChange={(e) => onChange({ doctor_name: e.target.value })}
              placeholder="Dr. Sharma"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Phone</label>
            <input
              type="tel"
              value={medical.doctor_phone || ""}
              onChange={(e) => onChange({ doctor_phone: e.target.value })}
              placeholder="10-digit number"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Hospital</label>
            <input
              type="text"
              value={medical.preferred_hospital || ""}
              onChange={(e) => onChange({ preferred_hospital: e.target.value })}
              placeholder="e.g. City Hospital"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
