import React, { useState } from "react";
import { FileText, Upload, Clock, CheckCircle2, AlertCircle, X, Trash2, Calendar } from "lucide-react";
import { StudentDocumentInput, StudentCategory } from "../../../../types/students";

interface Step4Props {
  documents: StudentDocumentInput[];
  category?: StudentCategory;
  isRte?: boolean;
  onChange: (docs: StudentDocumentInput[]) => void;
}

const DEFAULT_DOC_TYPES = [
  { key: "birth_certificate", label: "Birth Certificate", required: true },
  { key: "passport_photo", label: "Passport Photo", required: true },
  { key: "address_proof", label: "Address Proof", required: true },
  { key: "previous_tc", label: "Previous Transfer Certificate", required: false },
  { key: "report_card", label: "Previous Report Card / Marksheet", required: false },
  { key: "aadhaar_copy", label: "Aadhaar Copy (Optional)", required: false },
  { key: "category_certificate", label: "Category Certificate", requiredFor: ["sc", "st", "obc", "ews"] },
  { key: "income_certificate", label: "Income Certificate", requiredForRte: true },
  { key: "immunisation_record", label: "Immunisation / Medical Record", required: false },
];

export const StudentWizardStep4Docs: React.FC<Step4Props> = ({
  documents,
  category,
  isRte,
  onChange,
}) => {
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [editingPendingDoc, setEditingPendingDoc] = useState<string | null>(null);
  const [customExpectedDate, setCustomExpectedDate] = useState<string>("");

  const getDocState = (key: string) => {
    return documents.find((d) => d.doc_type === key);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = (key: string, file: File) => {
    setDocErrors((prev) => ({ ...prev, [key]: "" }));

    // File validation: max 5 MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setDocErrors((prev) => ({
        ...prev,
        [key]: `File is too large (${formatFileSize(file.size)}). Maximum allowed size is 5 MB.`,
      }));
      return;
    }

    // Supported formats
    const allowedMimes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedMimes.includes(file.type)) {
      setDocErrors((prev) => ({
        ...prev,
        [key]: "Only PDF, JPG, PNG, and WebP files are supported.",
      }));
      return;
    }

    const updated = documents.filter((d) => d.doc_type !== key);
    updated.push({
      doc_type: key,
      status: "uploaded",
      file_name: file.name,
      mime: file.type,
      size_bytes: file.size,
    });
    onChange(updated);
  };

  const handleMarkPending = (key: string, expectedDays: number = 7, specificDate?: string) => {
    let dateStr = specificDate;
    if (!dateStr) {
      const date = new Date();
      date.setDate(date.getDate() + expectedDays);
      dateStr = date.toISOString().split("T")[0];
    }

    const updated = documents.filter((d) => d.doc_type !== key);
    updated.push({
      doc_type: key,
      status: "pending",
      expected_on: dateStr,
    });
    onChange(updated);
    setEditingPendingDoc(null);
  };

  const handleRemoveDoc = (key: string) => {
    const updated = documents.filter((d) => d.doc_type !== key);
    onChange(updated);
    setDocErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const filteredDocTypes = DEFAULT_DOC_TYPES.filter((dt) => {
    if (dt.requiredFor && (!category || !dt.requiredFor.includes(category))) return false;
    if (dt.requiredForRte && !isRte && category !== "ews") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 4: Documents Vault</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload certified documents or record pending submissions with an agreed target date.
        </p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
        <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold">Admission with pending documents is allowed:</span> Pending documents are tracked in the student vault and will automatically appear in admission reports and automated parent WhatsApp reminders.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
        {filteredDocTypes.map((dt) => {
          const docState = getDocState(dt.key);
          const isUploaded = docState?.status === "uploaded" || docState?.status === "verified";
          const isPending = docState?.status === "pending";
          const err = docErrors[dt.key];

          return (
            <div key={dt.key} className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isUploaded
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : isPending
                        ? "bg-amber-50 text-amber-600 border border-amber-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{dt.label}</span>
                      {dt.required ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Mandatory
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {isUploaded
                        ? `Uploaded: ${docState?.file_name} (${formatFileSize(docState?.size_bytes)})`
                        : isPending
                        ? `Pending submission (Expected by ${docState?.expected_on || "within 7 days"})`
                        : "No file uploaded yet"}
                    </p>
                  </div>
                </div>

                {/* Status Badges & Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {isUploaded && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}

                  {/* Upload / Replace button */}
                  <label
                    htmlFor={`upload-doc-${dt.key}`}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isUploaded ? "Replace" : "Upload"}</span>
                    <input
                      id={`upload-doc-${dt.key}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(dt.key, file);
                      }}
                    />
                  </label>

                  {/* Mark Pending button */}
                  {!isUploaded && !isPending && (
                    <button
                      type="button"
                      onClick={() => setEditingPendingDoc(editingPendingDoc === dt.key ? null : dt.key)}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg font-medium transition cursor-pointer"
                    >
                      Mark Pending
                    </button>
                  )}

                  {/* Remove action */}
                  {(isUploaded || isPending) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(dt.key)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Clear document status"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Error feedback */}
              {err && (
                <p className="text-xs text-rose-600 flex items-center gap-1 font-medium pl-13">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}
                </p>
              )}

              {/* Pending Expected Date Selection Popover */}
              {editingPendingDoc === dt.key && (
                <div className="ml-13 p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900">
                      Select expected submission date:
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingPendingDoc(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Close date picker"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleMarkPending(dt.key, 7)}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-md text-amber-900 font-medium hover:bg-amber-100"
                    >
                      +7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkPending(dt.key, 15)}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-md text-amber-900 font-medium hover:bg-amber-100"
                    >
                      +15 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkPending(dt.key, 30)}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-md text-amber-900 font-medium hover:bg-amber-100"
                    >
                      +30 Days
                    </button>
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-slate-500">or pick:</span>
                      <input
                        type="date"
                        aria-label="Select custom expected submission date"
                        value={customExpectedDate}
                        onChange={(e) => setCustomExpectedDate(e.target.value)}
                        className="px-2 py-0.5 bg-white border border-amber-300 rounded-md text-slate-800"
                      />
                      {customExpectedDate && (
                        <button
                          type="button"
                          onClick={() => handleMarkPending(dt.key, 0, customExpectedDate)}
                          className="px-2 py-0.5 bg-[#2158E0] text-white rounded-md font-semibold text-xs"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
