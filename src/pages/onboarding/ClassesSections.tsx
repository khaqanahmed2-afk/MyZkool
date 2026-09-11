import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import { getCurrentAcademicYear } from "../../services/academicService";
import {
  getClassesWithSections,
  createClass,
  updateClass,
  deleteClass,
  reorderClasses,
  createSection,
  updateSection,
  deleteSection,
  applyClassTemplate,
  saveClassesSetupProgress,
} from "../../services/classSectionService";
import { CLASS_STRUCTURE_TEMPLATES } from "../../types/curriculum";
import type { SchoolClass, SchoolSection } from "../../types/curriculum";
import type { School } from "../../types/school";
import type { AcademicYear } from "../../types/academic";
import {
  Layers,
  Plus,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  AlertCircle,
  Building2,
  Calendar,
  X,
} from "lucide-react";

export default function ClassesSections() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Context State
  const [school, setSchool] = useState<School | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prerequisiteError, setPrerequisiteError] = useState<string | null>(null);

  // Class Management State
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSections, setNewClassSections] = useState("A, B");
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editClassName, setEditClassName] = useState("");

  // Section Management State
  const [addingSectionForClassId, setAddingSectionForClassId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSection, setEditingSection] = useState<{
    classId: string;
    section: SchoolSection;
  } | null>(null);
  const [editSectionName, setEditSectionName] = useState("");

  // Deletion Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "class" | "section";
    classId: string;
    className?: string;
    sectionId?: string;
    sectionName?: string;
  } | null>(null);

  // Action status state
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Redirect if already completed onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // Load School, Academic Year and Classes
  const reloadData = async () => {
    if (!user) return;
    try {
      const { school: loadedSchool } = await getSchoolForCurrentUser(
        user.id,
        profile?.school_id
      );
      if (!loadedSchool) {
        setPrerequisiteError("Please complete Step 1: School Profile first.");
        setIsLoading(false);
        return;
      }
      setSchool(loadedSchool);

      const { academicYear: loadedAY } = await getCurrentAcademicYear(loadedSchool.id);
      if (!loadedAY) {
        setPrerequisiteError("Please configure Step 2: Academic Calendar first.");
        setIsLoading(false);
        return;
      }
      setAcademicYear(loadedAY);

      const { classes: loadedClasses } = await getClassesWithSections(
        loadedSchool.id,
        loadedAY.id
      );
      setClasses(loadedClasses);
    } catch (err) {
      console.error("Failed to load classes data:", err);
      setActionError("Failed to load school classes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, [user, profile?.school_id]);

  // Total metrics
  const totalSectionsCount = classes.reduce(
    (acc, c) => acc + (c.sections?.length || 0),
    0
  );

  // Template Fast Setup
  const handleApplyTemplate = async (templateId: string) => {
    if (!school || !academicYear) return;
    setActionError(null);
    setIsApplyingTemplate(true);

    try {
      const res = await applyClassTemplate({
        schoolId: school.id,
        academicYearId: academicYear.id,
        userId: user?.id,
        templateId,
      });

      if (!res.success) {
        setActionError(res.error || "Failed to apply template.");
      } else {
        await reloadData();
      }
    } catch (err) {
      console.error("Template error:", err);
      setActionError("Unexpected error applying class template.");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !academicYear) return;
    setActionError(null);

    const sectionsArray = newClassSections
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await createClass({
      schoolId: school.id,
      academicYearId: academicYear.id,
      userId: user?.id,
      input: {
        name: newClassName.trim(),
        initial_sections: sectionsArray.length > 0 ? sectionsArray : ["A"],
      },
    });

    if (!res.success) {
      setActionError(res.error || "Failed to create class.");
      return;
    }

    setNewClassName("");
    setNewClassSections("A, B");
    setShowAddClassModal(false);
    await reloadData();
  };

  // Update Class Name
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !academicYear || !editingClass) return;
    setActionError(null);

    const res = await updateClass({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: editingClass.id,
      input: { name: editClassName.trim() },
    });

    if (!res.success) {
      setActionError(res.error || "Failed to update class.");
      return;
    }

    setEditingClass(null);
    await reloadData();
  };

  // Reorder Classes
  const handleMoveClass = async (index: number, direction: "up" | "down") => {
    if (!school || !academicYear) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;

    const newOrder = [...classes];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setClasses(newOrder); // Optimistic UI update

    await reorderClasses({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classIds: newOrder.map((c) => c.id),
    });
  };

  // Add Section to Class
  const handleAddSection = async (classId: string) => {
    if (!school || !academicYear) return;
    setActionError(null);

    const targetClass = classes.find((c) => c.id === classId);
    let secName = newSectionName.trim().toUpperCase();

    // Auto-suggest next section letter if input empty
    if (!secName && targetClass) {
      const existing = (targetClass.sections || []).map((s) => s.name.toUpperCase());
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const nextLetter = letters.find((l) => !existing.includes(l)) || "A";
      secName = nextLetter;
    }

    const res = await createSection({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId,
      input: { name: secName },
    });

    if (!res.success) {
      setActionError(res.error || "Failed to add section.");
      return;
    }

    setAddingSectionForClassId(null);
    setNewSectionName("");
    await reloadData();
  };

  // Update Section Name
  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !academicYear || !editingSection) return;
    setActionError(null);

    const res = await updateSection({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: editingSection.classId,
      sectionId: editingSection.section.id,
      input: { name: editSectionName.trim().toUpperCase() },
    });

    if (!res.success) {
      setActionError(res.error || "Failed to update section.");
      return;
    }

    setEditingSection(null);
    await reloadData();
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    if (!school || !academicYear || !deleteTarget) return;
    setActionError(null);

    if (deleteTarget.type === "class") {
      const res = await deleteClass({
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: deleteTarget.classId,
      });
      if (!res.success) {
        setActionError(res.error || "Failed to delete class.");
      }
    } else if (deleteTarget.type === "section" && deleteTarget.sectionId) {
      const res = await deleteSection({
        schoolId: school.id,
        academicYearId: academicYear.id,
        sectionId: deleteTarget.sectionId,
      });
      if (!res.success) {
        setActionError(res.error || "Failed to delete section.");
      }
    }

    setDeleteTarget(null);
    await reloadData();
  };

  // Submit and Proceed to Step 4 (Subjects)
  const handleContinue = async () => {
    if (!school || !academicYear || !user) return;
    setActionError(null);

    if (classes.length === 0) {
      setActionError("Please add at least one class to continue.");
      return;
    }

    const missingSections = classes.some(
      (c) => !c.sections || c.sections.length === 0
    );
    if (missingSections) {
      setActionError("Every class must have at least one section (e.g. Section A).");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await saveClassesSetupProgress({
        schoolId: school.id,
        userId: user.id,
        academicYearId: academicYear.id,
      });

      if (!res.success) {
        setActionError(res.error || "Failed to save classes setup.");
        setIsSubmitting(false);
        return;
      }

      await refreshSession();
      navigate("/onboarding/subjects");
    } catch (err) {
      console.error("Progression error:", err);
      setActionError("Failed to save progress. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={3}
        completedStepNumbers={[1, 2]}
        title="Set up your classes"
        subtitle="Add the classes and sections used by your school."
      >
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#141A2E]">
            Loading school classes and sections...
          </p>
          <p className="text-xs text-[#5B6478]">
            Retrieving academic structure from secure storage.
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  // Prerequisite Missing State
  if (prerequisiteError) {
    return (
      <OnboardingLayout
        currentStepNumber={3}
        completedStepNumbers={school ? [1] : []}
        title="Set up your classes"
        subtitle="Add the classes and sections used by your school."
      >
        <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            {school ? <Calendar className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-900">
              Prerequisite Setup Incomplete
            </h2>
            <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
              {prerequisiteError}
            </p>
          </div>
          <Link
            to={school ? "/onboarding/academics" : "/onboarding/school"}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go to{" "}
            {school ? "Step 2: Academic Setup" : "Step 1: School Profile"}
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={3}
      completedStepNumbers={[1, 2]}
      title="Set up your classes"
      subtitle="Add the classes and sections used by your school."
    >
      <div className="space-y-6">
        {/* Context Bar */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-[#141A2E]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2158E0]" />
            <span>
              School: <strong className="font-bold">{school?.name}</strong>
            </span>
            <span className="text-[#94A3B8]">|</span>
            <span>
              Academic Year: <span className="font-semibold text-[#2158E0]">{academicYear?.label}</span>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-[#5B6478] font-medium">
            <span className="px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800 font-semibold">
              {classes.length} {classes.length === 1 ? "Class" : "Classes"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-800 font-semibold">
              {totalSectionsCount} {totalSectionsCount === 1 ? "Section" : "Sections"}
            </span>
          </div>
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Notice: </span>
              <span>{actionError}</span>
            </div>
          </div>
        )}

        {/* Quick Setup Templates Toolbar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6478] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2158E0]" />
              Quick Setup Templates
            </span>
            <span className="text-[11px] text-[#94A3B8]">
              Instant batch configuration (fully customizable)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CLASS_STRUCTURE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                id={`template-${tmpl.id}`}
                disabled={isApplyingTemplate}
                onClick={() => handleApplyTemplate(tmpl.id)}
                className="p-2.5 rounded-xl border border-[#E6EAF3] bg-white hover:border-[#2158E0] hover:bg-blue-50/30 text-left transition-all disabled:opacity-60"
              >
                <span className="block text-xs font-bold text-[#141A2E] truncate">
                  {tmpl.name}
                </span>
                <span className="block text-[10px] text-[#64748B] mt-0.5 line-clamp-1">
                  {tmpl.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Classes List Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#141A2E] flex items-center gap-2">
            School Classes &amp; Sections List
          </h2>
          <button
            type="button"
            id="add-class-btn"
            onClick={() => setShowAddClassModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-full transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Class
          </button>
        </div>

        {/* Empty State */}
        {classes.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-[#CBD5E1] rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2158E0] mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#141A2E]">
              No classes created yet
            </h3>
            <p className="text-xs text-[#5B6478] max-w-sm mx-auto">
              Select one of the Quick Setup Templates above (e.g. K-12 or Class 1–10) or click Add Class to specify your school's grades.
            </p>
            <button
              type="button"
              onClick={() => handleApplyTemplate("k12")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#2158E0] bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-fill K-12 School
            </button>
          </div>
        ) : (
          /* Class Cards List */
          <div className="space-y-3">
            {classes.map((c, index) => {
              const isFirst = index === 0;
              const isLast = index === classes.length - 1;
              const classSections = c.sections || [];

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-[#E6EAF3] hover:border-[#CBD5E1] transition-all p-4 space-y-3"
                >
                  {/* Class Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveClass(index, "up")}
                          aria-label={`Move ${c.name} up`}
                          className="p-1 rounded text-[#94A3B8] hover:text-[#141A2E] hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveClass(index, "down")}
                          aria-label={`Move ${c.name} down`}
                          className="p-1 rounded text-[#94A3B8] hover:text-[#141A2E] hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Class Title */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#141A2E]">
                            {c.name}
                          </h3>
                          <span className="text-[11px] text-[#64748B] bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            {classSections.length} {classSections.length === 1 ? "Section" : "Sections"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Class Action Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClass(c);
                          setEditClassName(c.name);
                        }}
                        aria-label={`Edit ${c.name}`}
                        className="p-1.5 text-[#5B6478] hover:text-[#2158E0] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit class name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: "class",
                            classId: c.id,
                            className: c.name,
                          })
                        }
                        aria-label={`Delete ${c.name}`}
                        className="p-1.5 text-[#5B6478] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sections Row */}
                  <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mr-1">
                      Sections:
                    </span>

                    {classSections.map((sec) => (
                      <div
                        key={sec.id}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-[#141A2E] transition-colors"
                      >
                        <span>{sec.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection({ classId: c.id, section: sec });
                            setEditSectionName(sec.name);
                          }}
                          aria-label={`Edit Section ${sec.name} of ${c.name}`}
                          className="text-[#94A3B8] hover:text-[#2158E0] opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: "section",
                              classId: c.id,
                              className: c.name,
                              sectionId: sec.id,
                              sectionName: sec.name,
                            })
                          }
                          aria-label={`Remove Section ${sec.name} from ${c.name}`}
                          className="text-[#94A3B8] hover:text-red-600 opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Inline Add Section */}
                    {addingSectionForClassId === c.id ? (
                      <div className="inline-flex items-center gap-1.5 bg-blue-50/80 p-1 rounded-lg border border-blue-200">
                        <input
                          type="text"
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                          placeholder="Letter (e.g. C)"
                          maxLength={5}
                          autoFocus
                          className="w-24 px-2 py-0.5 text-xs rounded border border-blue-300 uppercase font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSection(c.id);
                            }
                            if (e.key === "Escape") {
                              setAddingSectionForClassId(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSection(c.id)}
                          className="px-2 py-0.5 text-[11px] font-bold text-white bg-[#2158E0] rounded hover:bg-[#1a4ec4]"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingSectionForClassId(null)}
                          className="p-0.5 text-slate-500 hover:text-slate-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingSectionForClassId(c.id);
                          setNewSectionName("");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2158E0] bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Section
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to="/onboarding/academics"
            id="classes-back-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Academic Setup
          </Link>

          <button
            type="button"
            id="classes-continue-btn"
            disabled={isSubmitting || classes.length === 0}
            onClick={handleContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:opacity-60 disabled:cursor-not-allowed rounded-full shadow-sm transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving classes setup...</span>
              </>
            ) : (
              <>
                <span>Continue to Subjects</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL 1: Add Class */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141A2E]">
                Add School Class
              </h3>
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Class Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Class 1, Grade 5, Nursery"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Initial Sections (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. A, B, C"
                  value={newClassSections}
                  onChange={(e) => setNewClassSections(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 outline-none uppercase"
                />
                <p className="text-[11px] text-[#5B6478] mt-1">
                  Leave as A, B or specify customized section letters.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-xl shadow-sm"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Rename Class */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-[#141A2E]">
              Rename Class
            </h3>
            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] focus:border-[#2158E0] outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Rename Section */}
      {editingSection && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-[#141A2E]">
              Rename Section
            </h3>
            <form onSubmit={handleUpdateSection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Section Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={5}
                  value={editSectionName}
                  onChange={(e) => setEditSectionName(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] uppercase focus:border-[#2158E0] outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-xl"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#141A2E]">
                {deleteTarget.type === "class"
                  ? `Delete ${deleteTarget.className}?`
                  : `Delete Section ${deleteTarget.sectionName}?`}
              </h3>
              <p className="text-xs text-[#5B6478] mt-1">
                {deleteTarget.type === "class"
                  ? "This will delete this class and all associated sections and subject assignments. You can always re-create it later."
                  : `This will remove Section ${deleteTarget.sectionName} from ${deleteTarget.className}.`}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}
