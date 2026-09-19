import React from "react";
import { FileText, Upload, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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
  { key: "report_card", label: "Previous Report Card", required: false },
  { key: "aadhaar_copy", label: "Aadhaar Copy (Optional)", required: false },
  { key: "category_certificate", label: "Category Certificate", requiredFor: ["sc", "st", "obc", "ews"] },
  { key: "income_certificate", label: "Income Certificate", requiredForRte: true },
  { key: "immunisation_record", label: "Immunisation Record", required: false },
];

export const StudentWizardStep4Docs: React.FC<Step4Props> = ({
  documents,
  category,
  isRte,
  onChange,
}) => {
  const getDocState = (key: string) => {
    return documents.find((d) => d.doc_type === key);
  };

  const handleUploadMock = (key: string, fileName: string) => {
    const updated = documents.filter((d) => d.doc_type !== key);
    updated.push({
      doc_type: key,
      status: "uploaded",
      file_name: fileName,
      mime: "application/pdf",
      size_bytes: 1024 * 250, // 250 KB
    });
    onChange(updated);
  };

  const handleMarkPending = (key: string, expectedDate: string) => {
    const updated = documents.filter((d) => d.doc_type !== key);
    updated.push({
      doc_type: key,
      status: "pending",
      expected_on: expectedDate,
    });
    onChange(updated);
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
          Upload certificates or mark documents pending with an expected submission date.
        </p>
      </div>

      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
        <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Admission with pending documents is allowed:</span> Missing or pending documents appear on the student record and automatically generate WhatsApp reminder notifications to parents after 7 days.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
        {filteredDocTypes.map((dt) => {
          const docState = getDocState(dt.key);
          const isUploaded = docState?.status === "uploaded" || docState?.status === "verified";
          const isPending = docState?.status === "pending";

          return (
            <div key={dt.key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isUploaded
                      ? "bg-emerald-50 text-emerald-600"
                      : isPending
                      ? "bg-amber-50 text-amber-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{dt.label}</span>
                    {dt.required && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-50 text-red-600">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isUploaded
                      ? `Uploaded: ${docState?.file_name || "document.pdf"}`
                      : isPending
                      ? `Pending submission (Expected by ${docState?.expected_on || "7 days"})`
                      : "No file uploaded yet"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isUploaded ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </span>
                ) : null}

                <label className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isUploaded ? "Replace" : "Upload"}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadMock(dt.key, file.name);
                    }}
                  />
                </label>

                {!isUploaded && (
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 7);
                      handleMarkPending(dt.key, date.toISOString().split("T")[0]);
                    }}
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded-lg"
                  >
                    Mark Pending
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
