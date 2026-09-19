import React from "react";
import { User, Upload, AlertCircle } from "lucide-react";
import { AdmissionWizardPayload, StudentGender, StudentCategory } from "../../../../types/students";

interface Step1Props {
  data: AdmissionWizardPayload["step1_basic"];
  onChange: (fields: Partial<AdmissionWizardPayload["step1_basic"]>) => void;
  errors: Record<string, string>;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const CATEGORIES: { value: StudentCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "obc", label: "OBC" },
  { value: "sc", label: "SC" },
  { value: "st", label: "ST" },
  { value: "ews", label: "EWS" },
];

export const StudentWizardStep1Basic: React.FC<Step1Props> = ({ data, onChange, errors }) => {
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({ photo_path: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 1: Student Basic Info</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter legal name, date of birth, gender, and student registry identifiers.
        </p>
      </div>

      {/* Photo Upload Card */}
      <div className="flex items-center space-x-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="relative">
          {data.photo_path ? (
            <img
              src={data.photo_path}
              alt="Student"
              className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <User className="w-10 h-10 text-blue-500" />
            </div>
          )}
        </div>
        <div>
          <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Passport-style square crop. Under 300 KB recommended.
          </p>
        </div>
      </div>

      {/* Names Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.first_name || ""}
            onChange={(e) => onChange({ first_name: e.target.value })}
            placeholder="e.g. Aarav"
            className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0] ${
              errors.first_name ? "border-red-400 focus:ring-red-300" : "border-slate-300"
            }`}
          />
          {errors.first_name && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.first_name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Middle Name
          </label>
          <input
            type="text"
            value={data.middle_name || ""}
            onChange={(e) => onChange({ middle_name: e.target.value })}
            placeholder="e.g. Kumar"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.last_name || ""}
            onChange={(e) => onChange({ last_name: e.target.value })}
            placeholder="e.g. Verma"
            className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0] ${
              errors.last_name ? "border-red-400 focus:ring-red-300" : "border-slate-300"
            }`}
          />
          {errors.last_name && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.last_name}
            </p>
          )}
        </div>
      </div>

      {/* DOB & Gender */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={data.dob || ""}
            onChange={(e) => onChange({ dob: e.target.value })}
            className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0] ${
              errors.dob ? "border-red-400 focus:ring-red-300" : "border-slate-300"
            }`}
          />
          {errors.dob && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.dob}
            </p>
          )}
          <p className="text-[11px] text-slate-500 mt-1">Age must be between 2 and 22 years.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Gender <span className="text-red-500">*</span>
          </label>
          <select
            value={data.gender || "male"}
            onChange={(e) => onChange({ gender: e.target.value as StudentGender })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
          <select
            value={data.blood_group || ""}
            onChange={(e) => onChange({ blood_group: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          >
            <option value="">Select Blood Group</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category, Religion, Nationality */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
          <select
            value={data.category || "general"}
            onChange={(e) => onChange({ category: e.target.value as StudentCategory })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">Used for government reports & concessions.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Religion</label>
          <input
            type="text"
            value={data.religion || ""}
            onChange={(e) => onChange({ religion: e.target.value })}
            placeholder="e.g. Hindu / Muslim / Christian"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
          <input
            type="text"
            value={data.nationality || "Indian"}
            onChange={(e) => onChange({ nationality: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>
      </div>

      {/* Registry IDs: SR Number, APAAR ID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">SR Number</label>
          <input
            type="text"
            value={data.sr_no || ""}
            onChange={(e) => onChange({ sr_no: e.target.value })}
            placeholder="Scholar Register number (optional)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">APAAR ID</label>
          <input
            type="text"
            value={data.apaar_id || ""}
            onChange={(e) => onChange({ apaar_id: e.target.value.replace(/\D/g, "").slice(0, 12) })}
            placeholder="12-digit automated permanent student ID"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>
      </div>
    </div>
  );
};
