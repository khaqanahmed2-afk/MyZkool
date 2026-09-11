import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import { getCurrentAcademicYear } from "../../services/academicService";
import { getClassesWithSections } from "../../services/classSectionService";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getClassSubjects,
  assignSubjectToClass,
  removeSubjectFromClass,
  assignSubjectToMultipleClasses,
  importStandardSubjectPresets,
  saveSubjectsSetupProgress,
} from "../../services/subjectService";
import { STANDARD_SUBJECT_PRESETS } from "../../types/curriculum";
import type {
  Subject,
  ClassSubject,
  SchoolClass,
  SubjectType,
} from "../../types/curriculum";
import type { School } from "../../types/school";
import type { AcademicYear } from "../../types/academic";
import {
  BookOpen,
  Plus,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Edit2,
  Sparkles,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Check,
  X,
  Copy,
} from "lucide-react";

export default function Subjects() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Context State
  const [school, setSchool] = useState<School | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [prerequisiteError, setPrerequisiteError] = useState<{
    msg: string;
    route: string;
    actionLabel: string;
  } | null>(null);

  // Active Class Tab
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Subject Library Modal
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectType, setNewSubjectType] = useState<SubjectType>("core");

  // Edit Subject Modal
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectCode, setEditSubjectCode] = useState("");
  const [editSubjectType, setEditSubjectType] = useState<SubjectType>("core");

  // Deletion Modal
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Assign to All Classes Modal / Action
  const [subjectToBatchAssign, setSubjectToBatchAssign] = useState<Subject | null>(null);

  // Status & Errors
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportingPresets, setIsImportingPresets] = useState(false);

  // Redirect if already completed onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // Load All Prerequisite Data
  const reloadData = async () => {
    if (!user) return;
    try {
      const { school: loadedSchool } = await getSchoolForCurrentUser(
        user.id,
        profile?.school_id
      );
      if (!loadedSchool) {
        setPrerequisiteError({
          msg: "Please complete Step 1: School Profile first.",
          route: "/onboarding/school",
          actionLabel: "Go to Step 1: School Profile",
        });
        setIsLoading(false);
        return;
      }
      setSchool(loadedSchool);

      const { academicYear: loadedAY } = await getCurrentAcademicYear(loadedSchool.id);
      if (!loadedAY) {
        setPrerequisiteError({
          msg: "Please configure Step 2: Academic Calendar first.",
          route: "/onboarding/academics",
          actionLabel: "Go to Step 2: Academic Calendar",
        });
        setIsLoading(false);
        return;
      }
      setAcademicYear(loadedAY);

      const { classes: loadedClasses } = await getClassesWithSections(
        loadedSchool.id,
        loadedAY.id
      );
      if (loadedClasses.length === 0) {
        setPrerequisiteError({
          msg: "Please add your school's classes in Step 3 before configuring curriculum subjects.",
          route: "/onboarding/classes",
          actionLabel: "Go to Step 3: Classes Setup",
        });
        setIsLoading(false);
        return;
      }
      setClasses(loadedClasses);

      // Default active class to first class if not set
      if (!selectedClassId || !loadedClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(loadedClasses[0].id);
      }

      const { subjects: loadedSubjects } = await getSubjects(
        loadedSchool.id,
        loadedAY.id
      );
      setSubjects(loadedSubjects);

      const { classSubjects: loadedCS } = await getClassSubjects(
        loadedSchool.id,
        loadedAY.id
      );
      setClassSubjects(loadedCS);
    } catch (err) {
      console.error("Failed to load subjects data:", err);
      setActionError("Failed to load subjects configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, [user, profile?.school_id]);

  // Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !academicYear) return;
    setActionError(null);

    const res = await createSubject({
      schoolId: school.id,
      academicYearId: academicYear.id,
      input: {
        name: newSubjectName.trim(),
        code: newSubjectCode.trim() || undefined,
        subject_type: newSubjectType,
      },
    });

    if (!res.success) {
      setActionError(res.error || "Failed to create subject.");
      return;
    }

    // Automatically assign newly created subject to currently selected class
    if (res.subject && selectedClassId) {
      await assignSubjectToClass({
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: selectedClassId,
        subjectId: res.subject.id,
      });
    }

    setNewSubjectName("");
    setNewSubjectCode("");
    setNewSubjectType("core");
    setShowAddSubjectModal(false);
    await reloadData();
  };

  // Update Subject
  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !academicYear || !editingSubject) return;
    setActionError(null);

    const res = await updateSubject({
      schoolId: school.id,
      academicYearId: academicYear.id,
      subjectId: editingSubject.id,
      input: {
        name: editSubjectName.trim(),
        code: editSubjectCode.trim() || undefined,
        subject_type: editSubjectType,
      },
    });

    if (!res.success) {
      setActionError(res.error || "Failed to update subject.");
      return;
    }

    setEditingSubject(null);
    await reloadData();
  };

  // Delete Subject
  const handleConfirmDelete = async () => {
    if (!school || !academicYear || !subjectToDelete) return;
    setActionError(null);

    const res = await deleteSubject({
      schoolId: school.id,
      academicYearId: academicYear.id,
      subjectId: subjectToDelete.id,
    });

    if (!res.success) {
      setActionError(res.error || "Failed to delete subject.");
    }

    setSubjectToDelete(null);
    await reloadData();
  };

  // Toggle Subject for Selected Class
  const handleToggleSubjectForClass = async (subjectId: string, isAssigned: boolean) => {
    if (!school || !academicYear || !selectedClassId) return;
    setActionError(null);

    if (isAssigned) {
      // Remove
      await removeSubjectFromClass({
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: selectedClassId,
        subjectId,
      });
    } else {
      // Assign
      await assignSubjectToClass({
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: selectedClassId,
        subjectId,
      });
    }

    await reloadData();
  };

  // Quick Preset Import
  const handleImportPresets = async () => {
    if (!school || !academicYear) return;
    setActionError(null);
    setIsImportingPresets(true);

    try {
      const res = await importStandardSubjectPresets({
        schoolId: school.id,
        academicYearId: academicYear.id,
      });

      // Also assign standard core subjects across all classes if none assigned yet
      const { subjects: updatedSubjects } = await getSubjects(
        schoolIdWithFallback,
        academicYear.id
      );

      const coreSubjects = updatedSubjects.filter((s) => s.subject_type === "core");
      for (const cls of classes) {
        for (const cs of coreSubjects) {
          await assignSubjectToClass({
            schoolId: school.id,
            academicYearId: academicYear.id,
            classId: cls.id,
            subjectId: cs.id,
          });
        }
      }

      setActionSuccess(`Added standard subjects and mapped to all classes!`);
      setTimeout(() => setActionSuccess(null), 4000);
      await reloadData();
    } catch (err) {
      console.error("Presets import error:", err);
      setActionError("Failed to import subject pack.");
    } finally {
      setIsImportingPresets(false);
    }
  };

  // Batch Assign Single Subject to All Classes
  const handleBatchAssignToAll = async (subject: Subject) => {
    if (!school || !academicYear) return;
    setActionError(null);

    await assignSubjectToMultipleClasses({
      schoolId: school.id,
      academicYearId: academicYear.id,
      subjectId: subject.id,
      classIds: classes.map((c) => c.id),
    });

    setSubjectToBatchAssign(null);
    setActionSuccess(`Assigned "${subject.name}" to all ${classes.length} classes!`);
    setTimeout(() => setActionSuccess(null), 3000);
    await reloadData();
  };

  // Submit and Proceed to Step 5 (Subscription)
  const handleContinue = async () => {
    if (!school || !academicYear || !user) return;
    setActionError(null);

    if (subjects.length === 0) {
      setActionError("Please add at least one subject to your school's curriculum.");
      return;
    }

    // Check every class has at least 1 subject
    const unassignedClasses = classes.filter(
      (c) => !classSubjects.some((cs) => cs.class_id === c.id)
    );

    if (unassignedClasses.length > 0) {
      const missingNames = unassignedClasses.map((c) => c.name).join(", ");
      setActionError(
        `The following classes do not have any subjects assigned yet: ${missingNames}. Please select at least one subject for each class.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await saveSubjectsSetupProgress({
        schoolId: school.id,
        userId: user.id,
        academicYearId: academicYear.id,
        classIds: classes.map((c) => c.id),
      });

      if (!res.success) {
        setActionError(res.error || "Failed to save subjects progress.");
        setIsSubmitting(false);
        return;
      }

      await refreshSession();
      navigate("/onboarding/subscription");
    } catch (err) {
      console.error("Progression error:", err);
      setActionError("An unexpected error occurred while saving subjects.");
      setIsSubmitting(false);
    }
  };

  const schoolIdWithFallback = school?.id || "";

  // Loading State
  if (isLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={4}
        completedStepNumbers={[1, 2, 3]}
        title="Set up your subjects"
        subtitle="Choose the subjects taught in each class."
      >
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#141A2E]">
            Loading school curriculum and subjects...
          </p>
          <p className="text-xs text-[#5B6478]">
            Retrieving subjects and class mappings from secure storage.
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  // Prerequisite Missing State
  if (prerequisiteError) {
    return (
      <OnboardingLayout
        currentStepNumber={4}
        completedStepNumbers={school ? [1, 2] : []}
        title="Set up your subjects"
        subtitle="Choose the subjects taught in each class."
      >
        <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            {classes.length === 0 ? (
              <Layers className="w-6 h-6" />
            ) : (
              <Building2 className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-900">
              Prerequisite Step Incomplete
            </h2>
            <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
              {prerequisiteError.msg}
            </p>
          </div>
          <Link
            to={prerequisiteError.route}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {prerequisiteError.actionLabel}
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const assignedSubjectIdsForActive = classSubjects
    .filter((cs) => cs.class_id === selectedClass?.id)
    .map((cs) => cs.subject_id);

  return (
    <OnboardingLayout
      currentStepNumber={4}
      completedStepNumbers={[1, 2, 3]}
      title="Set up your subjects"
      subtitle="Choose the subjects taught in each class."
    >
      <div className="space-y-6">
        {/* Context Bar */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-[#141A2E]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2158E0]" />
            <span>
              School: <strong className="font-bold">{school?.name}</strong>
            </span>
            <span className="text-[#94A3B8]">|</span>
            <span>
              Academic Year:{" "}
              <span className="font-semibold text-[#2158E0]">{academicYear?.label}</span>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-[#5B6478] font-medium">
            <span className="px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800 font-semibold">
              {subjects.length} {subjects.length === 1 ? "Subject" : "Subjects"} in Library
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 font-semibold">
              {classes.length} Classes Configured
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

        {/* Action Success Alert */}
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* SECTION 1: Subject Library Bar */}
        <div className="bg-[#F8FAFC]/80 rounded-xl p-4 sm:p-5 border border-[#E6EAF3] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141A2E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2158E0]" />
                1. School Subject Library
              </h2>
              <p className="text-[11px] text-[#5B6478] mt-0.5">
                Create subjects once, then assign them across appropriate classes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="import-standard-pack-btn"
                disabled={isImportingPresets}
                onClick={handleImportPresets}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#2158E0] bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors disabled:opacity-60"
              >
                <Sparkles className="w-3 h-3" />
                <span>Import Standard CBSE/ICSE Pack</span>
              </button>
              <button
                type="button"
                id="add-subject-btn"
                onClick={() => setShowAddSubjectModal(true)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-full transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Subject
              </button>
            </div>
          </div>

          {/* Subjects Chips List */}
          {subjects.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-[#CBD5E1] rounded-xl p-4 space-y-2">
              <p className="text-xs text-[#5B6478]">
                No subjects registered in library yet. Click <strong>Import Standard Pack</strong> to seed standard subjects, or <strong>Add Subject</strong> for custom subjects.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {subjects.map((sub) => {
                const totalAssignedClasses = classes.filter((c) =>
                  classSubjects.some((cs) => cs.class_id === c.id && cs.subject_id === sub.id)
                ).length;

                return (
                  <div
                    key={sub.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#141A2E] shadow-2xs group"
                  >
                    <span className="font-semibold">{sub.name}</span>
                    {sub.code && (
                      <span className="text-[10px] text-[#64748B] font-mono">
                        ({sub.code})
                      </span>
                    )}
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                        sub.subject_type === "core"
                          ? "bg-blue-50 text-blue-700"
                          : sub.subject_type === "elective"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {sub.subject_type}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-medium ml-1">
                      in {totalAssignedClasses} {totalAssignedClasses === 1 ? "class" : "classes"}
                    </span>

                    {/* Batch Assign to all */}
                    <button
                      type="button"
                      onClick={() => handleBatchAssignToAll(sub)}
                      title={`Assign "${sub.name}" to all classes`}
                      className="text-[#94A3B8] hover:text-[#2158E0] p-0.5 ml-1 opacity-70 group-hover:opacity-100"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubject(sub);
                        setEditSubjectName(sub.name);
                        setEditSubjectCode(sub.code || "");
                        setEditSubjectType(sub.subject_type);
                      }}
                      title="Edit subject"
                      className="text-[#94A3B8] hover:text-[#2158E0] p-0.5 opacity-70 group-hover:opacity-100"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setSubjectToDelete(sub)}
                      title="Delete subject"
                      className="text-[#94A3B8] hover:text-red-600 p-0.5 opacity-70 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Class-Subject Assignment Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#141A2E] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2158E0]" />
              2. Assign Subjects by Class
            </h2>
            <span className="text-[11px] text-[#5B6478]">
              Select a class tab to configure its curriculum
            </span>
          </div>

          {/* Class Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {classes.map((cls) => {
              const isSelected = cls.id === selectedClass?.id;
              const assignedCount = classSubjects.filter(
                (cs) => cs.class_id === cls.id
              ).length;

              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? "bg-[#2158E0] text-white shadow-xs ring-2 ring-[#2158E0]/20"
                      : "bg-white text-[#5B6478] hover:text-[#141A2E] border border-[#E6EAF3] hover:border-[#CBD5E1]"
                  }`}
                >
                  <span>{cls.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : assignedCount > 0
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {assignedCount} {assignedCount === 1 ? "Subject" : "Subjects"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Class Assignment Panel */}
          {selectedClass && (
            <div className="bg-white rounded-xl border border-[#E6EAF3] p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-sm font-bold text-[#141A2E]">
                    Curriculum for {selectedClass.name}
                  </h3>
                  <p className="text-xs text-[#5B6478] mt-0.5">
                    Click any subject below to assign or unassign it for {selectedClass.name}.
                  </p>
                </div>
                <div className="text-xs font-semibold text-[#2158E0]">
                  {assignedSubjectIdsForActive.length} of {subjects.length} subjects active
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#5B6478]">
                  Please add subjects to the library above first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {subjects.map((sub) => {
                    const isAssigned = assignedSubjectIdsForActive.includes(sub.id);

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleToggleSubjectForClass(sub.id, isAssigned)}
                        className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition-all ${
                          isAssigned
                            ? "border-[#2158E0] bg-blue-50/40 ring-1 ring-[#2158E0]"
                            : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1] hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold truncate ${
                                isAssigned ? "text-[#2158E0]" : "text-[#141A2E]"
                              }`}
                            >
                              {sub.name}
                            </span>
                            {sub.code && (
                              <span className="text-[10px] text-[#64748B] font-mono">
                                {sub.code}
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                              sub.subject_type === "core"
                                ? "bg-blue-100 text-blue-800"
                                : sub.subject_type === "elective"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {sub.subject_type}
                          </span>
                        </div>

                        {/* Checkbox indicator */}
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isAssigned
                              ? "bg-[#2158E0] border-[#2158E0] text-white"
                              : "border-[#CBD5E1] bg-white text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Action Buttons */}
        <div className="pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to="/onboarding/classes"
            id="subjects-back-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Classes &amp; Sections
          </Link>

          <button
            type="button"
            id="subjects-continue-btn"
            disabled={isSubmitting || subjects.length === 0}
            onClick={handleContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:opacity-60 disabled:cursor-not-allowed rounded-full shadow-sm transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving curriculum setup...</span>
              </>
            ) : (
              <>
                <span>Continue to Subscription</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL 1: Add Subject */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141A2E]">
                Add Curriculum Subject
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Mathematics, Sanskrit, Economics"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                    Subject Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MAT, ENG"
                    maxLength={8}
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] uppercase focus:border-[#2158E0] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                    Subject Type
                  </label>
                  <select
                    value={newSubjectType}
                    onChange={(e) => setNewSubjectType(e.target.value as SubjectType)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] focus:border-[#2158E0] outline-none bg-white"
                  >
                    <option value="core">Core</option>
                    <option value="elective">Elective</option>
                    <option value="activity">Activity / Co-curricular</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-xl shadow-sm"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Subject */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-[#141A2E]">
              Edit Subject
            </h3>
            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] focus:border-[#2158E0] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={editSubjectCode}
                    onChange={(e) => setEditSubjectCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] uppercase focus:border-[#2158E0] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                    Subject Type
                  </label>
                  <select
                    value={editSubjectType}
                    onChange={(e) => setEditSubjectType(e.target.value as SubjectType)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#CBD5E1] focus:border-[#2158E0] outline-none bg-white"
                  >
                    <option value="core">Core</option>
                    <option value="elective">Elective</option>
                    <option value="activity">Activity / Co-curricular</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-xl"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Subject Confirmation */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#141A2E]">
                Delete {subjectToDelete.name}?
              </h3>
              <p className="text-xs text-[#5B6478] mt-1">
                This will delete "{subjectToDelete.name}" from your subject library and remove it from all assigned classes.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm"
              >
                Delete Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}
