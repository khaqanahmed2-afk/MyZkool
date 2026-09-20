/**
 * Student Promotion Pipeline Component (Spec A4.6)
 * Route: /admin/students/promotion
 * 
 * Guided year-end promotion workflow:
 * - Source and target academic year selector
 * - Automatic class mapping (sequential, last class -> Passed Out)
 * - Per-student action overrides (promote, detain, leave, pass out)
 * - Section distribution modes: Keep letter, distribute evenly, unassigned
 * - Outstanding dues warning list (promoted with arrears carry-forward)
 * - Preview drawer/modal with exact counts
 * - Execution summary
 * - 24-hour promotion undo window
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Users,
  ChevronRight,
  FileText,
  Clock,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { getAcademicYearsForSchool } from "../../../services/academicService";
import {
  getPromotionPreview,
  executePromotion,
  getPromotionBatches,
  undoPromotion,
} from "../../../services/studentOperationsService";
import {
  PromotionConfig,
  PromotionPreviewResult,
  PromotionAction,
  SectionDistributionMode,
  PromotionBatch,
} from "../../../types/students";
import { AcademicYear } from "../../../types/academic";

export default function StudentPromotionPipeline() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [schoolId, setSchoolId] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [sourceYearId, setSourceYearId] = useState<string>("");
  const [targetYearId, setTargetYearId] = useState<string>("");

  const [sectionDistribution, setSectionDistribution] = useState<SectionDistributionMode>("keep_letter");
  const [overrides, setOverrides] = useState<Record<string, { action: PromotionAction; target_section_id?: string }>>({});

  const [preview, setPreview] = useState<PromotionPreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  const [recentBatches, setRecentBatches] = useState<PromotionBatch[]>([]);
  const [isUndoing, setIsUndoing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pipeline" | "batches">("pipeline");

  useEffect(() => {
    async function loadData() {
      try {
        const sId = (profile as any)?.school_id || "school-1";
        setSchoolId(sId);

        const [ayRes, batches] = await Promise.all([
          getAcademicYearsForSchool(sId),
          getPromotionBatches(sId),
        ]);

          if (ayRes.academicYears && ayRes.academicYears.length > 0) {
            setAcademicYears(ayRes.academicYears);
            // Default source: current year, target: next year
            const activeAy = ayRes.academicYears.find((y) => y.is_current) || ayRes.academicYears[0];
            setSourceYearId(activeAy.id);

            const nextAy = ayRes.academicYears.find((y) => y.id !== activeAy.id);
            if (nextAy) setTargetYearId(nextAy.id);
          }

          setRecentBatches(batches);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load promotion data");
      }
    }
    loadData();
  }, []);

  // Fetch / refresh preview when source, target, or distribution changes
  useEffect(() => {
    if (!schoolId || !sourceYearId || !targetYearId || sourceYearId === targetYearId) {
      setPreview(null);
      return;
    }

    async function loadPreview() {
      setIsLoadingPreview(true);
      setErrorMsg(null);
      try {
        const res = await getPromotionPreview(schoolId, sourceYearId, targetYearId, {
          section_distribution: sectionDistribution,
          overrides: overrides,
        });
        setPreview(res);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to calculate promotion preview");
      } finally {
        setIsLoadingPreview(false);
      }
    }
    loadPreview();
  }, [schoolId, sourceYearId, targetYearId, sectionDistribution, overrides]);

  const handleActionChange = (studentId: string, action: PromotionAction) => {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        action,
      },
    }));
  };

  const handleExecutePromotion = async () => {
    if (!preview || preview.total_eligible === 0) return;
    if (!window.confirm(`Are you sure you want to promote ${preview.total_eligible} students from ${sourceYearId} to ${targetYearId}?`)) {
      return;
    }

    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const config: PromotionConfig = {
        from_year_id: sourceYearId,
        to_year_id: targetYearId,
        section_distribution: sectionDistribution,
        overrides,
      };

      const result = await executePromotion(schoolId, user?.id || "admin", config);
      setExecutionResult(result);

      // Refresh batches
      const updatedBatches = await getPromotionBatches(schoolId);
      setRecentBatches(updatedBatches);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute promotion");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleUndoPromotion = async (batchId: string) => {
    if (!window.confirm("Are you sure you want to undo this promotion? This will revert new enrollments and restore old enrollments to active.")) {
      return;
    }

    setIsUndoing(batchId);
    setErrorMsg(null);
    try {
      await undoPromotion(schoolId, batchId, user?.id || "admin");
      const updatedBatches = await getPromotionBatches(schoolId);
      setRecentBatches(updatedBatches);
      alert("Promotion successfully undone.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to undo promotion");
    } finally {
      setIsUndoing(null);
    }
  };

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
            <span className="font-medium text-gray-900">Promotion Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Year-End Promotion Pipeline</h1>
          <p className="text-sm text-gray-600">
            Progress students to their next class, handle detentions, manage section distributions, and carry forward arrears.
          </p>
        </div>

        {/* 24h Undo Window Banner if recent committed batch exists */}
        {recentBatches.length > 0 && recentBatches[0].status === "committed" && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-lg flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-amber-700" />
            <div>
              <span className="font-semibold">Recent Promotion Batch: </span>
              <span>Available for 24h undo</span>
            </div>
            <button
              onClick={() => handleUndoPromotion(recentBatches[0].id)}
              disabled={isUndoing === recentBatches[0].id}
              className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow-sm ml-2 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {isUndoing === recentBatches[0].id ? "Undoing..." : "Undo Promotion"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "pipeline"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Promotion Wizard
        </button>
        <button
          onClick={() => setActiveTab("batches")}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
            activeTab === "batches"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Layers className="w-4 h-4" /> Promotion Batches ({recentBatches.length})
        </button>
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">Action Notice</h4>
            <p className="text-sm mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {activeTab === "pipeline" ? (
        executionResult ? (
          /* Execution Result View */
          <div className="bg-white border border-green-200 rounded-xl p-8 text-center max-w-lg mx-auto space-y-5 shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Promotion Completed!</h3>
            <p className="text-sm text-gray-600">
              Successfully processed <span className="font-semibold text-gray-900">{executionResult.total_processed}</span> students.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left bg-gray-50 p-4 rounded-lg text-sm border">
              <div>Promoted: <span className="font-bold text-green-700">{executionResult.promoted_count}</span></div>
              <div>Detained: <span className="font-bold text-amber-700">{executionResult.detained_count}</span></div>
              <div>Passed Out: <span className="font-bold text-blue-700">{executionResult.passed_out_count}</span></div>
              <div>Left School: <span className="font-bold text-gray-700">{executionResult.left_count}</span></div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
              Note: This promotion batch can be undone within 24 hours provided no fees or attendance are recorded in the new academic year.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setExecutionResult(null);
                  setOverrides({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Promote Another Group
              </button>
              <Link
                to="/admin/students"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"
              >
                View Student Directory
              </Link>
            </div>
          </div>
        ) : (
          /* Promotion Pipeline Configuration & Preview */
          <div className="space-y-6">
            {/* Step 1: Academic Years & Section Mode */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Source Academic Year
                </label>
                <select
                  value={sourceYearId}
                  onChange={(e) => setSourceYearId(e.target.value)}
                  className="w-full border-gray-300 rounded-lg shadow-sm text-sm p-2 border"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label} {ay.is_current ? "(Current Active)" : ""}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500 mt-1 block">Students to promote from</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Target Academic Year
                </label>
                <select
                  value={targetYearId}
                  onChange={(e) => setTargetYearId(e.target.value)}
                  className="w-full border-gray-300 rounded-lg shadow-sm text-sm p-2 border"
                >
                  <option value="">Select Target Year</option>
                  {academicYears
                    .filter((ay) => ay.id !== sourceYearId)
                    .map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.label}
                      </option>
                    ))}
                </select>
                <span className="text-xs text-gray-500 mt-1 block">Target year for new enrollments</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Section Distribution Mode
                </label>
                <select
                  value={sectionDistribution}
                  onChange={(e) => setSectionDistribution(e.target.value as SectionDistributionMode)}
                  className="w-full border-gray-300 rounded-lg shadow-sm text-sm p-2 border"
                >
                  <option value="keep_letter">Keep Same Letter (e.g. 4-A → 5-A)</option>
                  <option value="distribute_evenly">Distribute Evenly Across Sections</option>
                  <option value="unassigned">Leave Section Unassigned</option>
                </select>
                <span className="text-xs text-gray-500 mt-1 block">How target sections are assigned</span>
              </div>
            </div>

            {/* Step 2: Class Progression & Overview */}
            {preview && (
              <>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-blue-600" /> Class Progression Map
                    </h3>
                    <div className="flex gap-4 text-xs">
                      <span className="text-green-700 font-semibold">Promote: {preview.promote_count}</span>
                      <span className="text-amber-700 font-semibold">Detain: {preview.detain_count}</span>
                      <span className="text-blue-700 font-semibold">Passed Out: {preview.pass_out_count}</span>
                      <span className="text-red-700 font-semibold">Leave: {preview.leave_count}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {preview.class_mappings.map((m) => (
                      <div key={m.from_class_id} className="p-3 bg-gray-50 rounded-lg border text-xs">
                        <div className="font-semibold text-gray-900">
                          {m.from_class_name} → {m.to_class_name}
                        </div>
                        <div className="text-gray-500 mt-1">{m.student_count} students eligible</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 3: Dues Warning Strip (Spec A4.6 & B6.9) */}
                {preview.dues_count > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900 text-sm">
                        Outstanding Dues Notice ({preview.dues_count} Students)
                      </h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Under MyZkool policy (Spec A4.6 & B6.9), students with outstanding dues are still promoted.
                        Their unpaid dues carry forward to the new academic year as fee arrears.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Per-Student Override Table */}
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Individual Student Overrides</h4>
                      <p className="text-xs text-gray-500">
                        Adjust specific actions (e.g. detain in same class or mark as leaving)
                      </p>
                    </div>
                    <button
                      onClick={handleExecutePromotion}
                      disabled={isExecuting || preview.total_eligible === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow flex items-center gap-2 disabled:bg-gray-300"
                    >
                      {isExecuting ? "Executing Promotion..." : "Run Promotion"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs">Student</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs">Current Class</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs">Target Class</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs">Dues Status</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs">Action Override</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {preview.students.map((item) => (
                          <tr key={item.student_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-gray-900">
                                {item.first_name} {item.last_name}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">{item.admission_no}</div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {item.current_class_name} {item.current_section_name ? `(${item.current_section_name})` : ""}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-blue-700">
                              {item.target_class_name} {item.target_section_name ? `(${item.target_section_name})` : ""}
                            </td>
                            <td className="px-4 py-2.5">
                              {item.has_dues ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  ₹{(item.dues_amount_paise / 100).toFixed(2)} Dues
                                </span>
                              ) : (
                                <span className="text-xs text-green-700 font-medium">Cleared</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={item.action}
                                onChange={(e) => handleActionChange(item.student_id, e.target.value as PromotionAction)}
                                className="text-xs p-1.5 border border-gray-300 rounded-md font-medium"
                              >
                                <option value="promote">Promote</option>
                                <option value="detain">Detain (Repeat)</option>
                                <option value="leave">Left School</option>
                                <option value="pass_out">Pass Out</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )
      ) : (
        /* Batches History Tab */
        <div className="space-y-4">
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Batch ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">From / To Year</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Executed At</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentBatches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No promotion batches executed yet.
                    </td>
                  </tr>
                ) : (
                  recentBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {b.from_year_id} → {b.to_year_id}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(b.created_at).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            b.status === "committed"
                              ? "bg-green-100 text-green-800"
                              : b.status === "reverted"
                              ? "bg-gray-100 text-gray-700 line-through"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.status === "committed" && (
                          <button
                            onClick={() => handleUndoPromotion(b.id)}
                            disabled={isUndoing === b.id}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {isUndoing === b.id ? "Undoing..." : "Undo (24h)"}
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

