import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Calendar,
  UploadCloud,
  Check,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
} from "lucide-react";
import type {
  StudentConcessionInput,
  ConcessionRule,
  FeeHead,
} from "../../../../types/fees";
import { uploadConcessionDocument } from "../../../../services/concessionService";

interface AddConcessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: StudentConcessionInput) => Promise<boolean>;
  schoolId: string;
  students: any[];
  academicYears: { id: string; label: string }[];
  classes: { id: string; name: string }[];
  feeHeads: FeeHead[];
  concessionRules: ConcessionRule[];
  initialStudent?: any;
}

const CONCESSION_TYPES = [
  { id: "sibling", label: "Sibling Discount" },
  { id: "merit", label: "Merit Scholarship" },
  { id: "financial_aid", label: "Financial Aid" },
  { id: "staff_ward", label: "Staff Ward" },
  { id: "management", label: "Management" },
  { id: "other", label: "Other" },
];

export function AddConcessionDrawer({
  isOpen,
  onClose,
  onSubmit,
  schoolId,
  students,
  academicYears,
  feeHeads,
  concessionRules,
  initialStudent,
}: AddConcessionDrawerProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(initialStudent || null);

  // Form State
  const [concessionType, setConcessionType] = useState("sibling");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [selectedHeadIds, setSelectedHeadIds] = useState<string[]>([]);
  const [validFrom, setValidFrom] = useState("2026-04-01");
  const [validTo, setValidTo] = useState("2027-03-31");
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [academicYearId, setAcademicYearId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Document Upload
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default academic year
  useEffect(() => {
    if (academicYears.length > 0 && !academicYearId) {
      setAcademicYearId(academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  // Set initial default fee head (Tuition Fee)
  useEffect(() => {
    if (feeHeads.length > 0 && selectedHeadIds.length === 0) {
      const tuition = feeHeads.find(
        (h) => h.code === "tuition_fee" || h.name.toLowerCase().includes("tuition")
      );
      if (tuition) {
        setSelectedHeadIds([tuition.id]);
      } else {
        setSelectedHeadIds([feeHeads[0].id]);
      }
    }
  }, [feeHeads, selectedHeadIds]);

  // Sync initial student
  useEffect(() => {
    if (initialStudent) {
      setSelectedStudent(initialStudent);
    }
  }, [initialStudent]);

  if (!isOpen) return null;

  // Filter students based on search
  const filteredStudents = studentSearch.trim()
    ? students
        .filter((s) => {
          const q = studentSearch.toLowerCase().trim();
          const name = [s.first_name, s.last_name].filter(Boolean).join(" ").toLowerCase();
          const adm = (s.admission_no || "").toLowerCase();
          return name.includes(q) || adm.includes(q);
        })
        .slice(0, 6)
    : [];

  const handleSelectStudent = (st: any) => {
    setSelectedStudent(st);
    setStudentSearch("");
    setErrorMsg(null);
  };

  const handleToggleHead = (headId: string) => {
    setSelectedHeadIds((prev) => {
      if (prev.includes(headId)) {
        // Keep at least one or allow empty for all
        return prev.filter((id) => id !== headId);
      }
      return [...prev, headId];
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setErrorMsg(null);
    try {
      const res = await uploadConcessionDocument(schoolId, file);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.url) {
        setUploadedDocUrl(res.url);
        setUploadedDocName(res.name);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!selectedStudent) {
        setErrorMsg("Please select a student to proceed.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!discountValue || discountValue <= 0) {
        setErrorMsg("Please enter a valid positive discount value.");
        return;
      }
      if (discountType === "percent" && discountValue > 100) {
        setErrorMsg("Percentage discount cannot exceed 100%.");
        return;
      }
      if (selectedHeadIds.length === 0) {
        setErrorMsg("Please select at least one applicable fee component.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validFrom || !validTo) {
        setErrorMsg("Please select both Valid From and Valid To dates.");
        return;
      }
      if (validTo < validFrom) {
        setErrorMsg("Valid To date must be on or after Valid From date.");
        return;
      }
      if (!academicYearId) {
        setErrorMsg("Please select an academic year.");
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent) return;
    setSubmitting(true);
    setErrorMsg(null);

    const input: StudentConcessionInput = {
      student_id: selectedStudent.id,
      academic_year_id: academicYearId,
      concession_type: concessionType,
      type: discountType,
      value: discountValue,
      fee_head_ids: selectedHeadIds,
      valid_from: validFrom,
      valid_to: validTo,
      billing_period: billingPeriod,
      reason: reason || "Fee Concession",
      document_url: uploadedDocUrl,
      document_name: uploadedDocName,
      notes: notes,
    };

    const success = await onSubmit(input);
    setSubmitting(false);
    if (success) {
      onClose();
    } else {
      setErrorMsg("Failed to create concession. Please check inputs and try again.");
    }
  };

  const studentFullName = selectedStudent
    ? [selectedStudent.first_name, selectedStudent.last_name].filter(Boolean).join(" ")
    : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6EAF3]">
          <h2 className="text-base font-bold text-slate-900">Add Concession</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Progress Indicator */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between relative">
            {/* Background connecting bar */}
            <div className="absolute left-6 right-6 top-3 h-0.5 bg-slate-200 -z-0" />

            {/* Step 1 */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 1
                    ? "bg-[#00875A] text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : 1}
              </div>
              <span
                className={`text-[11px] font-medium mt-1 ${
                  currentStep >= 1 ? "text-[#00875A] font-semibold" : "text-slate-400"
                }`}
              >
                Student
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 2
                    ? "bg-[#00875A] text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : 2}
              </div>
              <span
                className={`text-[11px] font-medium mt-1 ${
                  currentStep >= 2 ? "text-[#00875A] font-semibold" : "text-slate-400"
                }`}
              >
                Concession
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 3
                    ? "bg-[#00875A] text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : 3}
              </div>
              <span
                className={`text-[11px] font-medium mt-1 ${
                  currentStep >= 3 ? "text-[#00875A] font-semibold" : "text-slate-400"
                }`}
              >
                Details
              </span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 4
                    ? "bg-[#00875A] text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                4
              </div>
              <span
                className={`text-[11px] font-medium mt-1 ${
                  currentStep === 4 ? "text-[#00875A] font-semibold" : "text-slate-400"
                }`}
              >
                Review
              </span>
            </div>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ──────────────── STEP 1: SELECT STUDENT ──────────────── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Select Student
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name or admission no..."
                    className="w-full pl-10 pr-4 py-2 border border-[#E6EAF3] rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#00875A]"
                  />
                </div>

                {/* Instant Student Search Results Dropdown */}
                {filteredStudents.length > 0 && !selectedStudent && (
                  <div className="mt-1.5 bg-white border border-[#E6EAF3] rounded-xl shadow-md overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {filteredStudents.map((st) => {
                      const name = [st.first_name, st.last_name].filter(Boolean).join(" ");
                      return (
                        <div
                          key={st.id}
                          onClick={() => handleSelectStudent(st)}
                          className="px-3.5 py-2.5 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{name}</p>
                            <p className="text-[11px] text-slate-400">{st.admission_no || "-"}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Select
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Student Card */}
              {selectedStudent ? (
                <div className="p-3.5 bg-slate-50 border border-[#E6EAF3] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D1FAE5] text-[#065F46] font-bold text-xs flex items-center justify-center shrink-0">
                      {(selectedStudent.first_name?.[0] || "A") +
                        (selectedStudent.last_name?.[0] || "S")}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{studentFullName}</h4>
                      <p className="text-xs text-slate-500">
                        {selectedStudent.admission_no || "ADM-2023-015"} | Class{" "}
                        {selectedStudent.class_name || "10-A"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium text-slate-500">Search and select a student</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Type a name or admission number above.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ──────────────── STEP 2: CONCESSION CONFIG ──────────────── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Concession Type */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Concession Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={concessionType}
                    onChange={(e) => setConcessionType(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00875A] cursor-pointer"
                  >
                    {CONCESSION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Predefined concession categories help with reporting.
                </p>
              </div>

              {/* Discount Details (2 cols) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Discount Details
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Discount Type <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                        className="w-full appearance-none px-3 py-2 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] cursor-pointer"
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Discount Value <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={discountType === "percent" ? 100 : 1000000}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full pl-3 pr-8 py-2 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00875A]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {discountType === "percent" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Applicable Fee Components */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Applicable Fee Components
                </label>
                <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-xl border border-[#E6EAF3]">
                  {feeHeads.map((head) => {
                    const isChecked = selectedHeadIds.includes(head.id);
                    return (
                      <label
                        key={head.id}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleHead(head.id)}
                          className="rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="truncate">{head.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 3: DETAILS & VALIDITY ──────────────── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Validity Dates */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">Validity</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Valid From <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A]"
                      />
                      <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Valid To <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A]"
                      />
                      <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Period & Academic Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Billing Period
                  </label>
                  <div className="relative">
                    <select
                      value={billingPeriod}
                      onChange={(e) => setBillingPeriod(e.target.value)}
                      className="w-full appearance-none px-3 py-2 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] cursor-pointer"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="half_yearly">Half-Yearly</option>
                      <option value="annual">Annual</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Academic Year
                  </label>
                  <div className="relative">
                    <select
                      value={academicYearId}
                      onChange={(e) => setAcademicYearId(e.target.value)}
                      className="w-full appearance-none px-3 py-2 bg-white border border-[#E6EAF3] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] cursor-pointer"
                    >
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for concession..."
                  className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00875A]"
                />
              </div>

              {/* Supporting Documents Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Supporting Documents <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative border-2 border-dashed border-[#E6EAF3] hover:border-[#00875A] rounded-xl p-5 text-center transition-colors cursor-pointer bg-slate-50/50">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {uploadingDoc ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-[#00875A]" />
                      <span>Uploading document...</span>
                    </div>
                  ) : uploadedDocName ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>{uploadedDocName}</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                      <p className="text-xs font-medium text-slate-700">
                        <span className="text-[#00875A] font-bold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, PNG (Max 5 MB)</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 4: REVIEW ──────────────── */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-[#E6EAF3] space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70">
                  <div className="w-10 h-10 rounded-full bg-[#D1FAE5] text-[#065F46] font-bold text-xs flex items-center justify-center">
                    {(selectedStudent?.first_name?.[0] || "A") +
                      (selectedStudent?.last_name?.[0] || "S")}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{studentFullName}</h4>
                    <p className="text-xs text-slate-500">
                      {selectedStudent?.admission_no} | Class {selectedStudent?.class_name || "10-A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Concession Type
                    </span>
                    <span className="font-bold text-slate-900 capitalize">
                      {concessionType.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Discount
                    </span>
                    <span className="font-bold text-slate-900">
                      {discountType === "percent" ? `${discountValue}%` : `₹${discountValue}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Validity Period
                    </span>
                    <span className="text-slate-700">
                      {validFrom} to {validTo}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Billing Period
                    </span>
                    <span className="text-slate-700 capitalize">{billingPeriod}</span>
                  </div>
                </div>

                {reason && (
                  <div className="pt-2 border-t border-slate-200/70 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Reason
                    </span>
                    <p className="text-slate-700 mt-0.5">{reason}</p>
                  </div>
                )}
              </div>

              {/* Approval notice */}
              {discountType === "percent" && discountValue > 10 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Approval Required</p>
                    <p className="text-[11px] mt-0.5 text-amber-700">
                      Concessions above 10% require administrator review before they become active on
                      student invoices.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E6EAF3] bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E6EAF3] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-[#E6EAF3] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 bg-[#00875A] hover:bg-[#007048] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span>Next</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-5 py-2 bg-[#00875A] hover:bg-[#007048] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Submit Concession</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
