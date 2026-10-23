import React, { useState } from "react";
import { ShieldCheck, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatAadhaarInput, validateAadhaar, maskAadhaar, cleanAadhaar } from "../../../../utils/aadhaarValidation";

interface Step5Props {
  aadhaarNumber?: string;
  existingAadhaarLast4?: string | null;
  onChange: (val: string) => void;
}

export const StudentWizardStep5Sensitive: React.FC<Step5Props> = ({
  aadhaarNumber,
  existingAadhaarLast4,
  onChange,
}) => {
  const [displayValue, setDisplayValue] = useState(
    aadhaarNumber ? formatAadhaarInput(aadhaarNumber) : ""
  );
  const [touched, setTouched] = useState(false);

  const clean = cleanAadhaar(displayValue);
  const validation = clean.length > 0 ? validateAadhaar(clean) : { valid: true };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatAadhaarInput(raw);
    setDisplayValue(formatted);
    onChange(cleanAadhaar(formatted));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 5: Sensitive Identity (Aadhaar)</h2>
        <p className="text-sm text-slate-500 mt-1">
          Aadhaar is voluntary and strictly optional. Stored with AES-256-GCM encryption.
        </p>
      </div>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
        <div className="flex items-center gap-2 font-bold text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Supreme Court of India & UIDAI Compliance:</span>
        </div>
        <p className="text-slate-700 leading-relaxed">
          Schools cannot mandate Aadhaar as a condition of admission. If provided voluntarily by the parent, the number is encrypted at rest using AES-256-GCM, and indexed using a one-way HMAC-SHA-256 cryptographic hash. Raw numbers are masked by default across all dashboards and printable reports.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm max-w-xl">
        {existingAadhaarLast4 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600 font-medium">Saved Aadhaar on file:</span>
              <span className="font-mono font-bold text-slate-900 tracking-wider">•••• •••• {existingAadhaarLast4}</span>
            </div>
            <span className="text-[11px] text-slate-500 italic">Leave input below blank to keep existing</span>
          </div>
        )}
        <div>
          <label htmlFor="student-aadhaar-input" className="block text-xs font-semibold text-slate-700 mb-1">
            {existingAadhaarLast4 ? "Update 12-Digit Aadhaar Number (Optional)" : "Student 12-Digit Aadhaar Number (Optional)"}
          </label>
          <div className="relative">
            <input
              id="student-aadhaar-input"
              type="text"
              value={displayValue}
              onChange={handleInputChange}
              onBlur={() => setTouched(true)}
              placeholder="0000 0000 0000"
              maxLength={14} // 12 digits + 2 spaces
              className={`w-full px-3 py-2.5 text-base font-mono rounded-lg border bg-white focus:outline-none focus:ring-2 tracking-widest ${
                touched && !validation.valid
                  ? "border-red-400 focus:ring-red-300"
                  : clean.length === 12 && validation.valid
                  ? "border-emerald-400 focus:ring-emerald-300"
                  : "border-slate-300 focus:ring-[#2158E0]"
              }`}
            />
            {clean.length === 12 && validation.valid && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </div>

          {touched && !validation.valid && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{validation.error}</span>
            </p>
          )}

          {clean.length === 12 && validation.valid && (
            <p className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Valid Verhoeff checksum. Encrypted at rest as {maskAadhaar(clean)}.</span>
            </p>
          )}
        </div>

        {/* Masked Preview */}
        {clean.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Default Masked Display:
            </span>
            <span className="font-mono font-bold text-slate-900">
              {maskAadhaar(clean)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
