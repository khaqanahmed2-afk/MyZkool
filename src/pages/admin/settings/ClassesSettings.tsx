/**
 * Classes & Sections Settings Page (Spec A4.8 & A4.9)
 * Route: /admin/settings/classes
 * 
 * Features:
 * - Classes with display order (reordering)
 * - Sections per academic year with capacity and class teacher
 * - Capacity warnings (soft enforcement with owner override)
 * - "Copy sections from last year"
 * - Parent Merge Tool for resolving duplicate parent phone numbers
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Plus,
  Copy,
  Users,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  Search,
  ShieldAlert,
  Building2,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { getAcademicYearsForSchool, getCurrentAcademicYear } from "../../../services/academicService";
import {
  getClassesWithSections,
  createClass,
  createSection,
  updateSection,
} from "../../../services/classSectionService";
import {
  updateClassesDisplayOrder,
  updateSectionSettings,
  checkSectionCapacity,
  copySectionsFromPreviousYear,
  previewParentMerge,
  executeParentMerge,
} from "../../../services/studentOperationsService";
import { lookupParentByPhone } from "../../../services/studentService";
import { SchoolClass, SchoolSection } from "../../../types/curriculum";
import { AcademicYear } from "../../../types/academic";
import { ParentMergePreview } from "../../../types/students";

export default function ClassesSettings() {
  const { user, profile } = useAuth();

  const [schoolId, setSchoolId] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"classes" | "parent_merge">("classes");

  // Section Capacity Management
  const [sectionCapacities, setSectionCapacities] = useState<Record<string, number>>({});
  const [copySuccessMsg, setCopySuccessMsg] = useState<string | null>(null);

  // Parent Merge Tool State
  const [survivingPhone, setSurvivingPhone] = useState("");
  const [duplicatePhone, setDuplicatePhone] = useState("");
  const [survivingParent, setSurvivingParent] = useState<any | null>(null);
  const [duplicateParent, setDuplicateParent] = useState<any | null>(null);
  const [mergePreview, setMergePreview] = useState<ParentMergePreview | null>(null);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const sId = (profile as any)?.school_id || "school-1";
        setSchoolId(sId);

        const ayRes = await getAcademicYearsForSchool(sId);
        if (ayRes.academicYears && ayRes.academicYears.length > 0) {
          setAcademicYears(ayRes.academicYears);
          const activeAy = ayRes.academicYears.find((y) => y.is_current) || ayRes.academicYears[0];
          setSelectedYearId(activeAy.id);
          await loadClasses(sId, activeAy.id);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load classes settings");
      }
    }
    loadData();
  }, []);

  const loadClasses = async (sId: string, ayId: string) => {
    const classRes = await getClassesWithSections(sId, ayId);
    if (classRes.classes) {
      setClasses(classRes.classes);
      if (classRes.classes.length > 0 && !selectedClassId) {
        setSelectedClassId(classRes.classes[0].id);
      }
    }
  };

  const handleYearChange = async (ayId: string) => {
    setSelectedYearId(ayId);
    await loadClasses(schoolId, ayId);
  };

  const handleMoveClass = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;

    const newClasses = [...classes];
    const temp = newClasses[index];
    newClasses[index] = newClasses[targetIndex];
    newClasses[targetIndex] = temp;

    const orders = newClasses.map((c, idx) => ({
      class_id: c.id,
      sort_order: idx + 1,
    }));

    setClasses(newClasses);
    await updateClassesDisplayOrder(schoolId, selectedYearId, orders);
  };

  const handleCapacityChange = async (sectionId: string, capacity: number) => {
    setSectionCapacities((prev) => ({ ...prev, [sectionId]: capacity }));
    await updateSectionSettings(schoolId, sectionId, { capacity });
  };

  const handleCopyFromPreviousYear = async () => {
    setCopySuccessMsg(null);
    setErrorMsg(null);
    const prevYear = academicYears.find((y) => y.id !== selectedYearId);
    if (!prevYear) {
      setErrorMsg("No previous academic year found to copy sections from");
      return;
    }

    try {
      const res = await copySectionsFromPreviousYear(schoolId, prevYear.id, selectedYearId);
      setCopySuccessMsg(`Copied ${res.copied_count} sections from ${prevYear.name}`);
      await loadClasses(schoolId, selectedYearId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to copy sections");
    }
  };

  // Parent Merge Handlers
  const handleLookupSurviving = async () => {
    setMergeError(null);
    const res = await lookupParentByPhone(schoolId, survivingPhone);
    if (res.found && res.parent) {
      setSurvivingParent(res.parent);
    } else {
      setMergeError("Surviving parent with phone not found");
    }
  };

  const handleLookupDuplicate = async () => {
    setMergeError(null);
    const res = await lookupParentByPhone(schoolId, duplicatePhone);
    if (res.found && res.parent) {
      setDuplicateParent(res.parent);
    } else {
      setMergeError("Duplicate parent with phone not found");
    }
  };

  const handlePreviewMerge = async () => {
    if (!survivingParent || !duplicateParent) return;
    setMergeError(null);
    try {
      const preview = await previewParentMerge(schoolId, survivingParent.id, duplicateParent.id);
      setMergePreview(preview);
    } catch (err: any) {
      setMergeError(err.message || "Failed to preview parent merge");
    }
  };

  const handleExecuteMerge = async () => {
    if (!survivingParent || !duplicateParent) return;
    setIsMerging(true);
    setMergeError(null);
    try {
      const res = await executeParentMerge(
        schoolId,
        user?.id || "admin",
        survivingParent.id,
        duplicateParent.id
      );
      setMergeSuccess(
        `Successfully merged parent! Moved ${res.moved_links_count} children links to surviving parent.`
      );
      setMergePreview(null);
      setDuplicateParent(null);
      setSurvivingParent(null);
      setSurvivingPhone("");
      setDuplicatePhone("");
    } catch (err: any) {
      setMergeError(err.message || "Failed to execute parent merge");
    } finally {
      setIsMerging(false);
    }
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Admin
            </Link>
            <span>/</span>
            <span className="font-medium text-gray-900">Settings</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Classes, Sections & Structure</h1>
          <p className="text-sm text-gray-600">
            Configure display order, manage section capacities, copy previous year structures, and resolve duplicate parent contacts.
          </p>
        </div>

        {/* Academic Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={selectedYearId}
            onChange={(e) => handleYearChange(e.target.value)}
            className="border-gray-300 rounded-lg text-sm p-2 border shadow-sm font-medium"
          >
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.label} {ay.is_current ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("classes")}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "classes"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Classes & Section Capacities
        </button>
        <button
          onClick={() => setActiveTab("parent_merge")}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
            activeTab === "parent_merge"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <GitMerge className="w-4 h-4" /> Parent Merge Tool (Spec A4.9)
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {copySuccessMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{copySuccessMsg}</span>
        </div>
      )}

      {activeTab === "classes" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Class List & Reordering */}
          <div className="md:col-span-1 bg-white border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-gray-900 text-sm">Class Order ({classes.length})</h3>
              <button
                onClick={handleCopyFromPreviousYear}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                title="Copy sections from last year"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Last Year
              </button>
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {classes.map((cls, idx) => (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                    selectedClassId === cls.id
                      ? "bg-blue-50 border border-blue-200 text-blue-900 font-semibold"
                      : "hover:bg-gray-50 text-gray-700 border border-transparent"
                  }`}
                >
                  <span className="truncate">{cls.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveClass(idx, "up");
                      }}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveClass(idx, "down");
                      }}
                      disabled={idx === classes.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section Capacities for Selected Class */}
          <div className="md:col-span-2 bg-white border rounded-xl p-6 shadow-sm space-y-4">
            {currentClass ? (
              <>
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{currentClass.name} Sections</h3>
                    <p className="text-xs text-gray-500">
                      Manage section capacities and class teachers. Soft capacity warnings apply.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {currentClass.sections && currentClass.sections.length > 0 ? (
                    currentClass.sections.map((sec) => {
                      const capacity = sectionCapacities[sec.id] || (sec as any).capacity || 40;
                      return (
                        <div
                          key={sec.id}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="font-semibold text-gray-900">
                              Section {sec.name} {sec.display_name ? `(${sec.display_name})` : ""}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Enforced softly with owner override.
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                                Capacity
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={capacity}
                                onChange={(e) =>
                                  handleCapacityChange(sec.id, parseInt(e.target.value, 10) || 40)
                                }
                                className="w-24 border-gray-300 rounded-md text-sm p-1.5 border"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No sections configured for this class.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">Select a class to view sections.</div>
            )}
          </div>
        </div>
      ) : (
        /* PARENT MERGE TOOL TAB */
        <div className="bg-white border rounded-xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-blue-600" /> Parent Merge Tool (Spec A4.9)
            </h3>
            <p className="text-sm text-gray-600">
              When the same parent is entered with two different phone numbers, merge the duplicate into the surviving record.
              All linked children will be re-assigned, duplicate links deduplicated, and the old record soft-deleted with an audit trail.
            </p>
          </div>

          {mergeError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {mergeError}
            </div>
          )}

          {mergeSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              {mergeSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Surviving Record Input */}
            <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
              <span className="text-xs font-bold text-green-700 uppercase">1. Surviving Parent (To Keep)</span>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="10-digit phone"
                    value={survivingPhone}
                    onChange={(e) => setSurvivingPhone(e.target.value)}
                    className="w-full border-gray-300 rounded text-sm p-2 border"
                  />
                  <button
                    onClick={handleLookupSurviving}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Find
                  </button>
                </div>
              </div>
              {survivingParent && (
                <div className="p-2 bg-white rounded border text-xs space-y-1">
                  <div className="font-semibold text-gray-900">{survivingParent.full_name}</div>
                  <div className="text-gray-500 font-mono">{survivingParent.phone}</div>
                </div>
              )}
            </div>

            {/* Duplicate Record Input */}
            <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
              <span className="text-xs font-bold text-red-700 uppercase">2. Duplicate Parent (To Merge & Remove)</span>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="10-digit phone"
                    value={duplicatePhone}
                    onChange={(e) => setDuplicatePhone(e.target.value)}
                    className="w-full border-gray-300 rounded text-sm p-2 border"
                  />
                  <button
                    onClick={handleLookupDuplicate}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Find
                  </button>
                </div>
              </div>
              {duplicateParent && (
                <div className="p-2 bg-white rounded border text-xs space-y-1">
                  <div className="font-semibold text-gray-900">{duplicateParent.full_name}</div>
                  <div className="text-gray-500 font-mono">{duplicateParent.phone}</div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handlePreviewMerge}
              disabled={!survivingParent || !duplicateParent}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:bg-gray-300 shadow"
            >
              Preview Merge Impact
            </button>
          </div>

          {/* Merge Preview Drawer */}
          {mergePreview && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-blue-900 text-sm">Merge Preview:</h4>
              <p className="text-xs text-blue-800">
                Children currently linked to{" "}
                <strong>{mergePreview.duplicate_parent.full_name}</strong> ({mergePreview.duplicate_parent.phone}) will be moved to{" "}
                <strong>{mergePreview.surviving_parent.full_name}</strong> ({mergePreview.surviving_parent.phone}):
              </p>

              <div className="space-y-1">
                {mergePreview.students_to_link.map((s) => (
                  <div key={s.id} className="p-2 bg-white rounded border text-xs font-medium text-gray-800 flex items-center justify-between">
                    <span>{s.first_name} {s.last_name} ({s.admission_no})</span>
                    <span className="text-blue-600 font-semibold">Will be moved</span>
                  </div>
                ))}
                {mergePreview.students_to_link.length === 0 && (
                  <div className="text-xs text-gray-500 italic">No unlinked children to move.</div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setMergePreview(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteMerge}
                  disabled={isMerging}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold shadow"
                >
                  {isMerging ? "Merging..." : "Confirm & Execute Merge"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

