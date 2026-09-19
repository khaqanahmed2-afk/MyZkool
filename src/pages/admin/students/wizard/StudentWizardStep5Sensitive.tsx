import React, { useState } from "react";
import { ShieldCheck, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatAadhaarInput, validateAadhaar, maskAadhaar, cleanAadhaar } from "../../../../utils/aadhaarValidation";

interface Step5Props {
  aadhaarNumber?: string;
  onChange: (val: string) => void;
}

export const StudentWizardStep5Sensitive: React.FC<Step5Props> = ({
  aadhaarNumber,
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
          Aadhaar is strictly optional. All sensitive numbers are encrypted at rest with AES-GCM-256.
        </p>
      </div>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Supreme Court & UIDAI Compliance:</span>
        </div>
        <p>
          Optional. Schools cannot mandate Aadhaar for admission. If provided, Aadhaar is encrypted at rest using AES-GCM-256 and indexed via an irreversible HMAC-SHA-256 search hash. Raw numbers are never returned in standard profile or list views.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm max-w-xl">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Student 12-Digit Aadhaar Number (Optional)
          </label>
          <div className="relative">
            <input
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
            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{validation.error}</span>
            </p>
          )}

          {clean.length === 12 && validation.valid && (
            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Valid Verhoeff checksum. Will be encrypted at rest as {maskAadhaar(clean)}.</span>
            </p>
          )}
        </div>

        {/* Masked Preview */}
        {clean.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Default Masked Display:
            </span>
            <span className="font-mono font-semibold text-slate-800">
              {maskAadhaar(clean)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
