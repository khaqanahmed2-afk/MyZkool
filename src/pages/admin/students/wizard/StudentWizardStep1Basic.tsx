import React, { useState } from "react";
import { User, Upload, AlertCircle, X, CheckCircle2, Hash } from "lucide-react";
import { AdmissionWizardPayload, StudentGender, StudentCategory } from "../../../../types/students";

interface Step1Props {
  data: AdmissionWizardPayload["step1_basic"];
  isEditMode?: boolean;
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

export const StudentWizardStep1Basic: React.FC<Step1Props> = ({ data, isEditMode, onChange, errors }) => {
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) return;

    // Validate mime type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setPhotoError("Only JPG, PNG, or WebP images are supported.");
      return;
    }

    // Validate file size (1 MB max)
    if (file.size > 1024 * 1024) {
      setPhotoError("Image size must be less than 1 MB (under 300 KB recommended).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({ photo_path: event.target?.result as string });
    };
    reader.onerror = () => {
      setPhotoError("Failed to read image file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    onChange({ photo_path: undefined });
    setPhotoError(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="relative shrink-0">
          {data.photo_path ? (
            <div className="relative group">
              <img
                src={data.photo_path}
                alt="Student preview"
                className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow-sm"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer"
                title="Remove photo"
                aria-label="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <User className="w-10 h-10 text-blue-500" />
            </div>
          )}
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-3">
            <label
              htmlFor="student-photo-input"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>{data.photo_path ? "Change Photo" : "Upload Photo"}</span>
              <input
                id="student-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
            {data.photo_path && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs text-rose-600 hover:underline font-medium"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Passport-style square photo. Max 1 MB (under 300 KB recommended). JPG, PNG, or WebP.
          </p>
          {photoError && (
            <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {photoError}
            </p>
          )}
        </div>
      </div>

      {/* Pre-assigned or Custom Admission Number */}
      <div className={`p-4 rounded-xl space-y-2 border ${isEditMode ? "bg-slate-50 border-slate-200" : "bg-blue-50/60 border-blue-200/80"}`}>
        <div className="flex items-center justify-between">
          <label htmlFor="student-custom-admission-no" className={`block text-xs font-bold ${isEditMode ? "text-slate-700" : "text-blue-900"}`}>
            {isEditMode ? "Admission Number (Persistent & Immutable)" : "Admission Number (Optional Custom / Manual Entry)"}
          </label>
          <span className={`text-[11px] font-medium ${isEditMode ? "text-slate-500" : "text-blue-700"}`}>
            {isEditMode ? "Cannot be modified in profile edit" : "Leave blank for automatic generation"}
          </span>
        </div>
        <div className="relative max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Hash className="w-4 h-4" />
          </div>
          <input
            id="student-custom-admission-no"
            type="text"
            disabled={isEditMode}
            value={data.admission_no || ""}
            onChange={(e) => onChange({ admission_no: e.target.value.trim() || undefined })}
            placeholder={isEditMode ? "No admission number" : "e.g. ADM-2026-0001 or school manual code"}
            className={`w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg border ${
              isEditMode
                ? "bg-slate-100 border-slate-300 text-slate-700 font-bold cursor-not-allowed"
                : "border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            }`}
          />
        </div>
        <p className="text-[11px] text-slate-500">
          {isEditMode
            ? "This student's admission number is locked to preserve institutional records, audit trails, and financial history."
            : "If your school uses a manual registry or paper admission book, enter the pre-assigned number here. Otherwise, leave empty to automatically assign the next gap-free sequential number upon submission."}
        </p>
      </div>

      {/* Names Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="student-first-name" className="block text-xs font-semibold text-slate-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="student-first-name"
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
          <label htmlFor="student-middle-name" className="block text-xs font-semibold text-slate-700 mb-1">
            Middle Name
          </label>
          <input
            id="student-middle-name"
            type="text"
            value={data.middle_name || ""}
            onChange={(e) => onChange({ middle_name: e.target.value })}
            placeholder="e.g. Kumar"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        <div>
          <label htmlFor="student-last-name" className="block text-xs font-semibold text-slate-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id="student-last-name"
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
          <label htmlFor="student-dob" className="block text-xs font-semibold text-slate-700 mb-1">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            id="student-dob"
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
          <label htmlFor="student-gender" className="block text-xs font-semibold text-slate-700 mb-1">
            Gender <span className="text-red-500">*</span>
          </label>
          <select
            id="student-gender"
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
          <label htmlFor="student-blood-group" className="block text-xs font-semibold text-slate-700 mb-1">
            Blood Group
          </label>
          <select
            id="student-blood-group"
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
          <label htmlFor="student-category" className="block text-xs font-semibold text-slate-700 mb-1">
            Category
          </label>
          <select
            id="student-category"
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
          <label htmlFor="student-religion" className="block text-xs font-semibold text-slate-700 mb-1">
            Religion
          </label>
          <input
            id="student-religion"
            type="text"
            value={data.religion || ""}
            onChange={(e) => onChange({ religion: e.target.value })}
            placeholder="e.g. Hindu / Muslim / Christian"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        <div>
          <label htmlFor="student-nationality" className="block text-xs font-semibold text-slate-700 mb-1">
            Nationality
          </label>
          <input
            id="student-nationality"
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
          <label htmlFor="student-sr-number" className="block text-xs font-semibold text-slate-700 mb-1">
            Scholar Register (SR) Number
          </label>
          <input
            id="student-sr-number"
            type="text"
            value={data.sr_no || ""}
            onChange={(e) => onChange({ sr_no: e.target.value })}
            placeholder="Scholar Register number (optional)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        <div>
          <label htmlFor="student-apaar-id" className="block text-xs font-semibold text-slate-700 mb-1">
            APAAR ID (EduLocker)
          </label>
          <input
            id="student-apaar-id"
            type="text"
            value={data.apaar_id || ""}
            onChange={(e) => onChange({ apaar_id: e.target.value.replace(/\D/g, "").slice(0, 12) })}
            placeholder="12-digit automated permanent student ID"
            maxLength={12}
            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>
      </div>
    </div>
  );
};
