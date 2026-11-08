import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  generatePreviousBalancesTemplateCSV,
  validatePreviousBalancesImport,
  applyPreviousBalancesImport,
  type PreviousBalanceImportReport,
  type PreviousBalanceImportRow,
} from "../../../../services/previousFeeBalanceService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  currentStudent?: {
    id?: string;
    admission_no?: string;
    name?: string;
  };
  onApplyForCurrentStudent: (record: {
    academic_year_id: string;
    academic_year_label: string;
    amount_rupees: number;
    remarks?: string;
  }) => void;
  actorId?: string;
  actorRole?: string;
}

export const ImportPreviousBalancesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  currentStudent,
  onApplyForCurrentStudent,
  actorId,
  actorRole,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [report, setReport] = useState<PreviousBalanceImportReport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const { csv, filename } = generatePreviousBalancesTemplateCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParseError(null);
    setReport(null);
    setApplySuccessMessage(null);
    setIsParsing(true);

    try {
      const text = await selected.text();
      const res = await validatePreviousBalancesImport({
        schoolId,
        csvContent: text,
        currentStudent,
      });
      setReport(res);
    } catch (err: any) {
      setParseError(err?.message || "Failed to parse CSV file. Please verify format.");
    } finally {
      setIsParsing(false);
    }
  };

  // Find if current wizard student is in the parsed records
  const matchedCurrentStudentRow = report?.rows.find((r) => {
    if (!currentStudent?.admission_no) return false;
    return r.admission_no.toLowerCase().trim() === currentStudent.admission_no.toLowerCase().trim();
  }) || (report?.rows.length === 1 && report.rows[0].status !== "invalid" ? report.rows[0] : null);

  const handleApplyCurrent = (row: PreviousBalanceImportRow) => {
    if (!row.academic_year_id) {
      alert("Academic year could not be matched for this record.");
      return;
    }
    onApplyForCurrentStudent({
      academic_year_id: row.academic_year_id,
      academic_year_label: row.academic_year_label,
      amount_rupees: row.amount_rupees,
      remarks: row.remarks,
    });
    onClose();
  };

  const handleApplyAllValid = async () => {
    if (!report || report.valid_count === 0) return;
    setIsApplying(true);
    setParseError(null);

    try {
      const res = await applyPreviousBalancesImport({
        schoolId,
        rows: report.rows,
        actorId,
        actorRole,
      });

      if (res.success || res.appliedCount > 0) {
        setApplySuccessMessage(`Successfully processed ${res.appliedCount} student previous balance record(s)!`);
        // If current student was part of it, apply to current form as well
        if (matchedCurrentStudentRow && matchedCurrentStudentRow.academic_year_id) {
          onApplyForCurrentStudent({
            academic_year_id: matchedCurrentStudentRow.academic_year_id,
            academic_year_label: matchedCurrentStudentRow.academic_year_label,
            amount_rupees: matchedCurrentStudentRow.amount_rupees,
            remarks: matchedCurrentStudentRow.remarks,
          });
        }
      } else {
        setParseError(res.errors.join("; ") || "Failed to apply balances.");
      }
    } catch (err: any) {
      setParseError(err?.message || "Failed to commit previous balance entries.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setReport(null);
    setParseError(null);
    setApplySuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-[#2158E0]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Import Previous Academic Year Balances</h3>
              <p className="text-xs text-slate-500">
                Upload CSV or Excel data to assign previous outstanding balances with full audit trails.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Actions & Template banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900">
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-950">Standard Import Format</span>
              <p className="text-[11px] text-blue-800/80">
                Columns: Admission Number, Student Name, Previous Academic Year, Outstanding Amount, Remarks.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-[#2158E0] font-semibold hover:bg-blue-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Sample CSV
            </button>
          </div>

          {/* Upload Area */}
          {!file && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-[#2158E0] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900">Click to upload or drag & drop</h4>
              <p className="text-xs text-slate-500 mt-1">Supports CSV, XLS, XLSX files up to 10MB</p>
            </div>
          )}

          {/* Loading parsing */}
          {isParsing && (
            <div className="py-10 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#2158E0] mx-auto" />
              <p className="text-xs text-slate-600 font-medium">Validating student records and academic years...</p>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Import Verification Issue:</span>
                <p className="mt-0.5 text-rose-800">{parseError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {applySuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Import Successful:</span>
                <p className="mt-0.5 text-emerald-900">{applySuccessMessage}</p>
              </div>
            </div>
          )}

          {/* Report Preview */}
          {report && !isParsing && (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">Uploaded File:</span>
                  <span className="text-slate-900 font-medium">{file?.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium underline"
                >
                  <RefreshCw className="w-3 h-3" /> Upload different file
                </button>
              </div>

              {/* Status Summary Pills */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">Total Rows</div>
                  <div className="text-lg font-bold text-slate-900">{report.total_rows}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[11px] font-medium text-emerald-700">Valid Records</div>
                  <div className="text-lg font-bold text-emerald-900">{report.valid_count}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                  <div className="text-[11px] font-medium text-rose-700">Errors & Issues</div>
                  <div className="text-lg font-bold text-rose-900">{report.error_count}</div>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Adm No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Academic Year</th>
                        <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-3">Issues / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.rows.map((row) => (
                        <tr
                          key={row.row_number}
                          className={row.status === "invalid" ? "bg-rose-50/30" : "hover:bg-slate-50/50"}
                        >
                          <td className="py-2.5 px-3">
                            {row.status === "valid" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                              </span>
                            ) : row.status === "warning" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Warning
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" /> Error
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{row.admission_no}</td>
                          <td className="py-2.5 px-3 text-slate-700">{row.student_name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.academic_year_label}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                            ₹{row.amount_rupees.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-[11px]">
                            {row.issues.length > 0 ? (
                              <span className="text-rose-600 font-medium">{row.issues.join(", ")}</span>
                            ) : row.remarks ? (
                              <span className="text-slate-500 italic">{row.remarks}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Matched current student prompt */}
              {matchedCurrentStudentRow && matchedCurrentStudentRow.status !== "invalid" && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Record found for this student:</span>{" "}
                    {matchedCurrentStudentRow.student_name} ({matchedCurrentStudentRow.admission_no}) —{" "}
                    <strong>₹{matchedCurrentStudentRow.amount_rupees.toLocaleString("en-IN")}</strong> for{" "}
                    {matchedCurrentStudentRow.academic_year_label}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCurrent(matchedCurrentStudentRow)}
                    className="px-3 py-1.5 bg-[#2158E0] hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Apply to This Student
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {report && report.valid_count > 0 && !applySuccessMessage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isApplying || report.error_count > 0}
                onClick={handleApplyAllValid}
                className="px-4 py-2 bg-[#2158E0] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing Records...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Apply Valid ({report.valid_count})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

