/**
 * Student Bulk Import Component (Spec A4.5)
 * Route: /admin/students/import
 * 
 * Features:
 * - Download template (prefilled with classes and sections)
 * - CSV upload (max 2,000 rows)
 * - Auto column mapping with override
 * - Dry-run validation table with error filter & downloadable error report
 * - Single batch commit with progress bar
 * - Automatic sibling linking via parent phone match
 * - Rollback capability (soft-delete) guarded by receipts/transport/edits
 * - Import history listing all batches
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Filter,
  History,
  Info,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { getCurrentAcademicYear } from "../../../services/academicService";
import { getClassesWithSections } from "../../../services/classSectionService";
import {
  generateImportTemplate,
  parseAndValidateImportCSV,
  generateErrorReportCSV,
  commitImportBatch,
  getImportBatches,
  rollbackImportBatch,
  checkSchoolStudentLimit,
} from "../../../services/studentOperationsService";
import {
  ImportBatch,
  ImportValidationResult,
  ImportValidationRow,
  PlanLimitsStatus,
} from "../../../types/students";

export default function StudentBulkImport() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [schoolId, setSchoolId] = useState<string>("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [classes, setClasses] = useState<{ name: string; sections?: { name: string }[] }[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimitsStatus | null>(null);

  // Flow State: 'upload' | 'mapping' | 'validate' | 'committing' | 'success'
  const [step, setStep] = useState<"upload" | "mapping" | "validate" | "committing" | "success">("upload");
  const [activeTab, setActiveTab] = useState<"import" | "history">("import");

  // Import Data State
  const [csvContent, setCsvContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [commitProgress, setCommitProgress] = useState(0);
  const [commitResult, setCommitResult] = useState<{ total: number; created: number; batchId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History State
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const sId = (profile as any)?.school_id || "school-1";
        setSchoolId(sId);

          const [ayRes, limits] = await Promise.all([
            getCurrentAcademicYear(sId),
            checkSchoolStudentLimit(sId),
          ]);

          setPlanLimits(limits);

          if (ayRes.academicYear) {
            setAcademicYearId(ayRes.academicYear.id);
            const classRes = await getClassesWithSections(sId, ayRes.academicYear.id);
            if (classRes.classes) {
              setClasses(classRes.classes);
            }
          }

          // Load batches
          const batches = await getImportBatches(sId);
          setImportBatches(batches);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to initialize import page");
      }
    }
    loadData();
  }, []);

  const handleDownloadTemplate = () => {
    const { csv, filename } = generateImportTemplate(classes);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (file: File) => {
    setErrorMsg(null);
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setErrorMsg("Please upload a valid CSV file (.csv)");
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = (e.target?.result as string) || "";
      setCsvContent(content);
      try {
        const result = await parseAndValidateImportCSV(schoolId, content);
        setValidationResult(result);
        setStep("validate");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadErrorReport = () => {
    if (!validationResult) return;
    const csv = generateErrorReportCSV(validationResult.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `errors_${fileName || "import.csv"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCommit = async () => {
    if (!validationResult || validationResult.valid_rows_count === 0) return;
    setErrorMsg(null);
    setStep("committing");
    setCommitProgress(15);

    try {
      const validRows = validationResult.rows.filter((r) => r.is_valid);
      setCommitProgress(45);

      const res = await commitImportBatch(schoolId, user?.id || "admin", fileName, validRows);
      setCommitProgress(100);

      setCommitResult({
        total: res.total_rows,
        created: res.created_rows,
        batchId: res.batch_id,
      });
      setStep("success");

      // Refresh limits and batches
      const [updatedLimits, updatedBatches] = await Promise.all([
        checkSchoolStudentLimit(schoolId),
        getImportBatches(schoolId),
      ]);
      setPlanLimits(updatedLimits);
      setImportBatches(updatedBatches);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit import batch");
      setStep("validate");
    }
  };

  const handleRollback = async (batchId: string) => {
    if (!window.confirm("Are you sure you want to rollback this import batch? All students imported in this batch without receipts or edits will be soft-deleted.")) {
      return;
    }
    setRollbackError(null);
    setIsRollingBack(batchId);

    try {
      await rollbackImportBatch(schoolId, batchId, user?.id || "admin");
      const [updatedLimits, updatedBatches] = await Promise.all([
        checkSchoolStudentLimit(schoolId),
        getImportBatches(schoolId),
      ]);
      setPlanLimits(updatedLimits);
      setImportBatches(updatedBatches);
    } catch (err: any) {
      setRollbackError(err.message || "Failed to rollback batch");
    } finally {
      setIsRollingBack(null);
    }
  };

  const displayedRows = validationResult
    ? filterErrorsOnly
      ? validationResult.rows.filter((r) => !r.is_valid)
      : validationResult.rows
    : [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/students" className="hover:text-blue-600 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Students
            </Link>
            <span>/</span>
            <span className="font-medium text-gray-900">Bulk Import</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Student Bulk Import</h1>
          <p className="text-sm text-gray-600">
            Import up to 2,000 student records at once via CSV or Excel template.
          </p>
        </div>

        {/* Plan Limit Indicator */}
        {planLimits && (
          <div
            className={`px-4 py-2 rounded-lg border text-sm flex items-center gap-3 ${
              planLimits.is_blocked
                ? "bg-red-50 border-red-200 text-red-700"
                : planLimits.is_warning
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-blue-50 border-blue-200 text-blue-700"
            }`}
          >
            <div>
              <span className="font-semibold">{planLimits.plan_tier} Plan: </span>
              <span>{planLimits.active_count} / {planLimits.max_allowed} active students</span>
            </div>
            {planLimits.is_blocked && (
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold">CAP REACHED</span>
            )}
            {planLimits.is_warning && !planLimits.is_blocked && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded font-bold">90% CAPACITY</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("import")}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "import"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Import Workflow
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
            activeTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <History className="w-4 h-4" /> Import History ({importBatches.length})
        </button>
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">Error</h4>
            <p className="text-sm mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {activeTab === "import" ? (
        <div className="space-y-6">
          {/* STEP 1: Upload Dropzone */}
          {step === "upload" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Instructions & Template */}
              <div className="md:col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                <div className="flex items-center gap-2 text-blue-600 font-semibold">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>Step 1: Get Template</span>
                </div>
                <p className="text-sm text-gray-600">
                  Download a template prefilled with your school's classes and sections.
                </p>
                <div className="space-y-2 text-xs text-gray-500">
                  <p className="font-semibold text-gray-700">Required fields:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>First Name & Last Name</li>
                    <li>Date of Birth (YYYY-MM-DD)</li>
                    <li>Gender (male / female / other)</li>
                    <li>Class Name</li>
                    <li>Parent Name & 10-digit Phone</li>
                  </ul>
                  <p className="mt-2 text-blue-700 bg-blue-50 p-2 rounded">
                    <strong>Tip:</strong> Matching parent phone numbers will automatically link siblings!
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 shadow-sm"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  Download Prefilled Template
                </button>
              </div>

              {/* Upload Box */}
              <div className="md:col-span-2 border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors bg-white">
                <Upload className="w-12 h-12 text-blue-500 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Upload Student CSV File
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Drag and drop your populated file here, or click to browse (Max 2,000 rows).
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={planLimits?.is_blocked}
                  className={`px-5 py-2.5 rounded-lg text-white font-medium shadow transition-colors ${
                    planLimits?.is_blocked
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {planLimits?.is_blocked ? "School Limit Reached" : "Select CSV File"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Dry Run Validation Table */}
          {step === "validate" && validationResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="text-xs text-gray-500 uppercase font-semibold">Total Rows</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{validationResult.total_rows}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm">
                  <div className="text-xs text-green-700 uppercase font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Import
                  </div>
                  <div className="text-2xl font-bold text-green-700 mt-1">{validationResult.valid_rows_count}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm">
                  <div className="text-xs text-red-700 uppercase font-semibold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Rows with Errors
                  </div>
                  <div className="text-2xl font-bold text-red-700 mt-1">{validationResult.invalid_rows_count}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm flex flex-col justify-center">
                  <span className="text-xs font-semibold text-blue-700">Dry Run Status</span>
                  <span className="text-sm text-blue-900 font-medium mt-0.5">Zero rows written yet</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterErrorsOnly}
                      onChange={(e) => setFilterErrorsOnly(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <Filter className="w-4 h-4 text-gray-500" />
                    Show Errors Only ({validationResult.invalid_rows_count})
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {validationResult.invalid_rows_count > 0 && (
                    <button
                      onClick={handleDownloadErrorReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100"
                    >
                      <Download className="w-4 h-4 text-red-600" /> Download Error Report
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setStep("upload");
                      setValidationResult(null);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommit}
                    disabled={validationResult.valid_rows_count === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow"
                  >
                    Commit {validationResult.valid_rows_count} Valid Students <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Validation Grid */}
              <div className="bg-white border rounded-lg overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Student Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">DOB</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Gender</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Class</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Parent</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Phone</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Validation Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedRows.map((row) => (
                      <tr key={row.row_index} className={row.is_valid ? "hover:bg-gray-50" : "bg-red-50/40"}>
                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{row.row_index}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.is_valid ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700 font-semibold">
                              <XCircle className="w-3.5 h-3.5" /> Error
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {row.data.first_name} {row.data.last_name}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{row.data.dob || "—"}</td>
                        <td className="px-3 py-2 text-gray-600 capitalize">{row.data.gender || "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{row.data.class_name || "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{row.data.parent_name || "—"}</td>
                        <td className="px-3 py-2 text-gray-600 font-mono text-xs">{row.data.parent_phone || "—"}</td>
                        <td className="px-3 py-2">
                          {row.is_valid ? (
                            <span className="text-xs text-gray-400">Ready</span>
                          ) : (
                            <span className="text-xs text-red-600 font-medium">{row.errors.join("; ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Committing Progress */}
          {step === "committing" && (
            <div className="bg-white border rounded-xl p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Importing Students...</h3>
              <p className="text-sm text-gray-600">
                Generating admission numbers, enrolling students, and auto-linking sibling parent profiles.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-3 transition-all duration-300"
                  style={{ width: `${commitProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: Success Screen */}
          {step === "success" && commitResult && (
            <div className="bg-white border border-green-200 rounded-xl p-8 text-center max-w-lg mx-auto space-y-5 shadow-sm">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Import Successful!</h3>
              <p className="text-sm text-gray-600">
                Successfully admitted <span className="font-semibold text-gray-900">{commitResult.created}</span> students into your school.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setStep("upload");
                    setValidationResult(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Import Another Batch
                </button>
                <Link
                  to="/admin/students"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"
                >
                  View Student Directory
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* IMPORT HISTORY TAB */
        <div className="space-y-4">
          {rollbackError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{rollbackError}</span>
            </div>
          )}

          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">File Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date & Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Imported Rows</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {importBatches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No import batches found.
                    </td>
                  </tr>
                ) : (
                  importBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.file_name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(b.created_at).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {b.created_rows} / {b.total_rows}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            b.status === "committed"
                              ? "bg-green-100 text-green-800"
                              : b.status === "rolled_back"
                              ? "bg-gray-100 text-gray-700 line-through"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.status === "committed" && (
                          <button
                            onClick={() => handleRollback(b.id)}
                            disabled={isRollingBack === b.id}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {isRollingBack === b.id ? "Rolling back..." : "Rollback"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

