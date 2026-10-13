import React, { useState, useEffect, useCallback, useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import { getCurrentAcademicYear } from "../../services/academicService";
import {
  getClassesWithSections,
  generateClassesFromTemplate,
  validateClassesStructure,
  saveAllClassesAndSections,
  canDeleteClass,
  canDeleteSection,
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
  AlertCircle,
  Building2,
  Calendar,
  X,
  CheckCircle2,
  Users,
  Check,
  GraduationCap,
  BookOpen,
  Sparkles,
} from "lucide-react";

function generateLocalId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// Icon helper for template cards
function getTemplateIcon(templateId: string) {
  switch (templateId) {
    case "k12":
      return <GraduationCap className="w-5 h-5 text-[#2158E0]" />;
    case "class_1_10":
      return <BookOpen className="w-5 h-5 text-[#2158E0]" />;
    case "primary_1_5":
      return <Layers className="w-5 h-5 text-[#2158E0]" />;
    case "preschool":
      return <Sparkles className="w-5 h-5 text-[#2158E0]" />;
    default:
      return <Layers className="w-5 h-5 text-[#2158E0]" />;
  }
}

export default function ClassesSections() {
  const { user, profile, refreshSession, signOut } = useAuth();
  const navigate = useNavigate();

  // Accessibility IDs
  const addClassInputId = useId();
  const addClassSectionsId = useId();
  const addClassCapacityId = useId();
  const editClassNameId = useId();

  // Context State
  const [school, setSchool] = useState<School | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [prerequisiteError, setPrerequisiteError] = useState<string | null>(null);

  // Unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false);

  // Template Replacement Confirmation Modal State
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  // Add Class Modal State
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSections, setNewClassSections] = useState("A, B");
  const [newClassCapacity, setNewClassCapacity] = useState(40);
  const [addClassError, setAddClassError] = useState<string | null>(null);

  // Edit Class Modal State
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassError, setEditClassError] = useState<string | null>(null);

  // Section Management State
  const [addingSectionForClassId, setAddingSectionForClassId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionCapacity, setNewSectionCapacity] = useState(40);
  const [addSectionError, setAddSectionError] = useState<string | null>(null);

  const [editingSection, setEditingSection] = useState<{
    classId: string;
    section: SchoolSection;
  } | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionCapacity, setEditSectionCapacity] = useState(40);
  const [editSectionError, setEditSectionError] = useState<string | null>(null);

  // Deletion Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "class" | "section";
    classId: string;
    className: string;
    sectionId?: string;
    sectionName?: string;
    checkingSafety?: boolean;
    isBlocked?: boolean;
    blockReason?: string;
  } | null>(null);

  // Status and Submission States
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingAndExiting, setIsSavingAndExiting] = useState(false);

  // Redirect if already completed onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // Load School, Academic Year and Classes on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) return;
      setIsInitialLoading(true);

      try {
        const { school: loadedSchool } = await getSchoolForCurrentUser(
          user.id,
          profile?.school_id
        );

        if (!isMounted) return;

        if (!loadedSchool) {
          setPrerequisiteError("Please complete Step 1: School Profile first.");
          setIsInitialLoading(false);
          return;
        }
        setSchool(loadedSchool);

        const { academicYear: loadedAY } = await getCurrentAcademicYear(loadedSchool.id);

        if (!isMounted) return;

        if (!loadedAY) {
          setPrerequisiteError("Please configure Step 2: Academic Year first.");
          setIsInitialLoading(false);
          return;
        }
        setAcademicYear(loadedAY);

        const { classes: loadedClasses } = await getClassesWithSections(
          loadedSchool.id,
          loadedAY.id
        );

        if (!isMounted) return;

        setClasses(loadedClasses || []);
        setIsDirty(false);
      } catch (err: any) {
        console.error("Failed to load school classes data:", err);
        setActionError("Failed to load school classes.");
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, profile?.school_id]);

  // Total metrics
  const totalSectionsCount = classes.reduce(
    (acc, c) => acc + (c.sections?.length || 0),
    0
  );

  // Auto-dismiss success notice
  useEffect(() => {
    if (!successNotice) return;
    const timer = setTimeout(() => {
      setSuccessNotice(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successNotice]);

  // 1. Template Fast Setup (In-Memory, Deterministic)
  const handleSelectTemplate = (templateId: string) => {
    setActionError(null);
    if (classes.length > 0) {
      // Prompt user confirmation before replacing existing classes
      setPendingTemplateId(templateId);
    } else {
      executeApplyTemplate(templateId);
    }
  };

  const executeApplyTemplate = (templateId: string) => {
    if (!school || !academicYear) return;
    const generated = generateClassesFromTemplate(
      templateId,
      school.id,
      academicYear.id
    );

    const templateMeta = CLASS_STRUCTURE_TEMPLATES.find((t) => t.id === templateId);
    setClasses(generated);
    setIsDirty(true);
    setPendingTemplateId(null);
    setSuccessNotice(
      `Applied "${templateMeta?.name || "Template"}": ${generated.length} classes generated. Review or customize before continuing.`
    );
  };

  // 2. Add Class Handler
  const handleOpenAddClassModal = () => {
    setNewClassName("");
    setNewClassSections("A, B");
    setNewClassCapacity(40);
    setAddClassError(null);
    setShowAddClassModal(true);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !academicYear) return;

    const trimmedName = newClassName.trim();
    if (!trimmedName) {
      setAddClassError("Please enter a class or grade name.");
      return;
    }

    // Check duplicate
    const exists = classes.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      setAddClassError(`A class named "${trimmedName}" already exists.`);
      return;
    }

    // Parse sections
    const secTokens = newClassSections
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const distinctSecNames: string[] = Array.from(new Set<string>(secTokens));
    if (distinctSecNames.length === 0) {
      distinctSecNames.push("A");
    }

    const classId = generateLocalId();
    const timestamp = new Date().toISOString();

    const sections: SchoolSection[] = distinctSecNames.map((sName, sIdx) => ({
      id: generateLocalId(),
      school_id: school.id,
      academic_year_id: academicYear.id,
      class_id: classId,
      name: sName,
      display_name: `Section ${sName}`,
      sort_order: sIdx + 1,
      capacity: Math.max(1, Math.min(newClassCapacity || 40, 200)),
      status: "active",
      created_at: timestamp,
      updated_at: timestamp,
    }));

    const newClass: SchoolClass = {
      id: classId,
      school_id: school.id,
      academic_year_id: academicYear.id,
      name: trimmedName,
      display_name: trimmedName,
      sort_order: classes.length + 1,
      status: "active",
      sections,
      created_at: timestamp,
      updated_at: timestamp,
    };

    setClasses((prev) => [...prev, newClass]);
    setIsDirty(true);
    setShowAddClassModal(false);
    setActionError(null);
  };

  // 3. Edit Class Handler
  const handleOpenEditClassModal = (targetClass: SchoolClass) => {
    setEditingClass(targetClass);
    setEditClassName(targetClass.name);
    setEditClassError(null);
  };

  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    const trimmedName = editClassName.trim();
    if (!trimmedName) {
      setEditClassError("Class name cannot be empty.");
      return;
    }

    // Check duplicate among other classes
    const exists = classes.some(
      (c) =>
        c.id !== editingClass.id &&
        c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      setEditClassError(`Another class named "${trimmedName}" already exists.`);
      return;
    }

    setClasses((prev) =>
      prev.map((c) =>
        c.id === editingClass.id
          ? {
              ...c,
              name: trimmedName,
              display_name: trimmedName,
              updated_at: new Date().toISOString(),
            }
          : c
      )
    );

    setIsDirty(true);
    setEditingClass(null);
  };

  // 4. Move Class (Reorder)
  const handleMoveClass = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;

    const updated = [...classes];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Update sort_order numbers
    const reordered = updated.map((c, i) => ({
      ...c,
      sort_order: i + 1,
    }));

    setClasses(reordered);
    setIsDirty(true);
  };

  // 5. Section Management: Add Section
  const handleOpenAddSectionModal = (classId: string) => {
    const targetClass = classes.find((c) => c.id === classId);
    let suggestedLetter = "A";

    if (targetClass && targetClass.sections) {
      const existingNames = targetClass.sections.map((s) => s.name.toUpperCase());
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      suggestedLetter = letters.find((l) => !existingNames.includes(l)) || "A";
    }

    setAddingSectionForClassId(classId);
    setNewSectionName(suggestedLetter);
    setNewSectionCapacity(40);
    setAddSectionError(null);
  };

  const handleCreateSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSectionForClassId || !school || !academicYear) return;

    const targetClass = classes.find((c) => c.id === addingSectionForClassId);
    if (!targetClass) return;

    const trimmedSecName = newSectionName.trim().toUpperCase();
    if (!trimmedSecName) {
      setAddSectionError("Section name cannot be empty.");
      return;
    }

    const exists = (targetClass.sections || []).some(
      (s) => s.name.toUpperCase() === trimmedSecName
    );
    if (exists) {
      setAddSectionError(`Section "${trimmedSecName}" already exists in ${targetClass.name}.`);
      return;
    }

    const timestamp = new Date().toISOString();
    const newSection: SchoolSection = {
      id: generateLocalId(),
      school_id: school.id,
      academic_year_id: academicYear.id,
      class_id: targetClass.id,
      name: trimmedSecName,
      display_name: `Section ${trimmedSecName}`,
      sort_order: (targetClass.sections?.length || 0) + 1,
      capacity: Math.max(1, Math.min(newSectionCapacity || 40, 200)),
      status: "active",
      created_at: timestamp,
      updated_at: timestamp,
    };

    setClasses((prev) =>
      prev.map((c) =>
        c.id === targetClass.id
          ? {
              ...c,
              sections: [...(c.sections || []), newSection],
              updated_at: timestamp,
            }
          : c
      )
    );

    setIsDirty(true);
    setAddingSectionForClassId(null);
  };

  // 6. Section Management: Edit Section
  const handleOpenEditSectionModal = (classId: string, section: SchoolSection) => {
    setEditingSection({ classId, section });
    setEditSectionName(section.name);
    setEditSectionCapacity(section.capacity || 40);
    setEditSectionError(null);
  };

  const handleUpdateSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    const { classId, section } = editingSection;
    const targetClass = classes.find((c) => c.id === classId);
    if (!targetClass) return;

    const trimmedName = editSectionName.trim().toUpperCase();
    if (!trimmedName) {
      setEditSectionError("Section name cannot be empty.");
      return;
    }

    // Check duplicate in same class
    const duplicate = (targetClass.sections || []).some(
      (s) => s.id !== section.id && s.name.toUpperCase() === trimmedName
    );
    if (duplicate) {
      setEditSectionError(`Section "${trimmedName}" already exists in ${targetClass.name}.`);
      return;
    }

    const timestamp = new Date().toISOString();
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? {
              ...c,
              sections: (c.sections || []).map((s) =>
                s.id === section.id
                  ? {
                      ...s,
                      name: trimmedName,
                      display_name: `Section ${trimmedName}`,
                      capacity: Math.max(1, Math.min(editSectionCapacity || 40, 200)),
                      updated_at: timestamp,
                    }
                  : s
              ),
              updated_at: timestamp,
            }
          : c
      )
    );

    setIsDirty(true);
    setEditingSection(null);
  };

  // 7. Deletion Confirmation with Foreign Key Student Checks
  const handleRequestDeleteClass = async (targetClass: SchoolClass) => {
    if (!school) return;

    // Check if this class has students enrolled in DB
    setDeleteTarget({
      type: "class",
      classId: targetClass.id,
      className: targetClass.name,
      checkingSafety: true,
    });

    const check = await canDeleteClass(school.id, targetClass.id);
    if (!check.canDelete) {
      setDeleteTarget({
        type: "class",
        classId: targetClass.id,
        className: targetClass.name,
        checkingSafety: false,
        isBlocked: true,
        blockReason:
          check.error ||
          "Cannot delete this class because it currently has enrolled students.",
      });
    } else {
      setDeleteTarget({
        type: "class",
        classId: targetClass.id,
        className: targetClass.name,
        checkingSafety: false,
        isBlocked: false,
      });
    }
  };

  const handleRequestDeleteSection = async (
    targetClass: SchoolClass,
    targetSection: SchoolSection
  ) => {
    if (!school) return;

    // Minimum 1 section rule warning check
    if ((targetClass.sections || []).length <= 1) {
      setDeleteTarget({
        type: "section",
        classId: targetClass.id,
        className: targetClass.name,
        sectionId: targetSection.id,
        sectionName: targetSection.name,
        checkingSafety: false,
        isBlocked: true,
        blockReason:
          "Every class must have at least one section. Add another section before removing this one, or delete the entire class.",
      });
      return;
    }

    setDeleteTarget({
      type: "section",
      classId: targetClass.id,
      className: targetClass.name,
      sectionId: targetSection.id,
      sectionName: targetSection.name,
      checkingSafety: true,
    });

    const check = await canDeleteSection(school.id, targetSection.id);
    if (!check.canDelete) {
      setDeleteTarget({
        type: "section",
        classId: targetClass.id,
        className: targetClass.name,
        sectionId: targetSection.id,
        sectionName: targetSection.name,
        checkingSafety: false,
        isBlocked: true,
        blockReason:
          check.error ||
          "Cannot delete this section because it currently has enrolled students.",
      });
    } else {
      setDeleteTarget({
        type: "section",
        classId: targetClass.id,
        className: targetClass.name,
        sectionId: targetSection.id,
        sectionName: targetSection.name,
        checkingSafety: false,
        isBlocked: false,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || deleteTarget.isBlocked) return;

    if (deleteTarget.type === "class") {
      setClasses((prev) => {
        const filtered = prev.filter((c) => c.id !== deleteTarget.classId);
        return filtered.map((c, i) => ({ ...c, sort_order: i + 1 }));
      });
      setIsDirty(true);
    } else if (deleteTarget.type === "section" && deleteTarget.sectionId) {
      setClasses((prev) =>
        prev.map((c) =>
          c.id === deleteTarget.classId
            ? {
                ...c,
                sections: (c.sections || [])
                  .filter((s) => s.id !== deleteTarget.sectionId)
                  .map((s, idx) => ({ ...s, sort_order: idx + 1 })),
                updated_at: new Date().toISOString(),
              }
            : c
        )
      );
      setIsDirty(true);
    }

    setDeleteTarget(null);
  };

  // 8. Continue to Next Step (Persistence & Validation)
  const handleContinue = async () => {
    if (!school || !academicYear || !user) return;
    setActionError(null);

    // Validate classes structure
    const validation = validateClassesStructure(classes);
    if (!validation.isValid) {
      setActionError(validation.error || "Please review your classes setup.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await saveAllClassesAndSections({
        schoolId: school.id,
        academicYearId: academicYear.id,
        userId: user.id,
        classes,
      });

      if (!res.success) {
        setActionError(res.error || "Failed to save classes. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setIsDirty(false);
      await refreshSession();

      // Proceed to Step 4: Plan & Subscription
      navigate("/onboarding/subscription");
    } catch (err: any) {
      console.error("Classes progression error:", err);
      setActionError(
        err?.message || "An unexpected error occurred while saving your classes."
      );
      setIsSubmitting(false);
    }
  };

  // 9. Save & Exit Handler
  const handleSaveAndExit = async () => {
    if (!isDirty || !school || !academicYear || !user) {
      await signOut();
      navigate("/login");
      return;
    }

    // If valid, save before exiting
    const validation = validateClassesStructure(classes);
    if (validation.isValid) {
      setIsSavingAndExiting(true);
      try {
        await saveAllClassesAndSections({
          schoolId: school.id,
          academicYearId: academicYear.id,
          userId: user.id,
          classes,
        });
      } catch (err) {
        console.warn("Background save on exit error:", err);
      }
    }

    await signOut();
    navigate("/login");
  };

  // Initial Loading State
  if (isInitialLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={3}
        completedStepNumbers={[1, 2]}
        title=""
        subtitle=""
        maxWidth="max-w-4xl"
        showCardWrapper={false}
      >
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#5B6478]">
            Loading your classes and grade structure...
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  // Prerequisite Error State
  if (prerequisiteError) {
    return (
      <OnboardingLayout
        currentStepNumber={3}
        completedStepNumbers={[1, 2]}
        title="Set up your classes"
        subtitle="Configure classes and sections for your school."
        maxWidth="max-w-2xl"
      >
        <div className="py-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#141A2E]">
            Previous Step Required
          </h2>
          <p className="text-sm text-[#5B6478] max-w-md mx-auto">
            {prerequisiteError}
          </p>
          <div className="pt-2">
            <Link
              to="/onboarding/academics"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1A46B8] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Academic Year Setup
            </Link>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={3}
      completedStepNumbers={[1, 2]}
      title=""
      subtitle=""
      maxWidth="max-w-4xl"
      showCardWrapper={false}
      onSaveAndExit={handleSaveAndExit}
      isSavingAndExiting={isSavingAndExiting}
    >
      <div className="space-y-6">
        {/* Page Title & Context Header */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#141A2E] tracking-tight">
              Set up your classes
            </h1>
            <p className="text-sm text-[#5B6478] mt-1">
              Configure classes and sections for your school. Choose a quick setup template or build your custom structure.
            </p>
          </div>

          {/* School & Academic Year Context Summary */}
          {school && academicYear && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-2.5 px-3.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#5B6478] shadow-sm">
              <div className="flex items-center gap-1.5 font-medium text-[#141A2E]">
                <Building2 className="w-4 h-4 text-[#2158E0]" />
                <span>{school.name}</span>
              </div>
              <span className="text-[#CBD5E1] hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 font-medium text-[#141A2E]">
                <Calendar className="w-4 h-4 text-[#2158E0]" />
                <span>{academicYear.label}</span>
              </div>
              <span className="text-[#CBD5E1] hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-[#141A2E]">{classes.length}</span>
                <span>{classes.length === 1 ? "Class" : "Classes"}</span>
                <span className="text-[#94A3B8]">({totalSectionsCount} sections)</span>
              </div>
              {isDirty && (
                <div className="sm:ml-auto flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action / Error Alerts */}
        {actionError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to proceed</p>
              <p className="text-xs sm:text-sm mt-0.5 text-red-600">{actionError}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-600 transition-colors p-1"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successNotice && (
          <div
            role="status"
            className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs sm:text-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="flex-1">{successNotice}</p>
            <button
              type="button"
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-500 hover:text-emerald-700 p-0.5"
              aria-label="Dismiss message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. Quick Setup Templates */}
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#141A2E] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2158E0]" />
                Quick Setup Templates
              </h2>
              <p className="text-xs text-[#5B6478] mt-0.5">
                Populate standard school structures in one click. You can customize them before saving.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {CLASS_STRUCTURE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tmpl.id)}
                disabled={isSubmitting}
                className="group flex flex-col items-start p-3 rounded-lg border border-[#E6EAF3] hover:border-[#2158E0] bg-[#F8FAFC] hover:bg-blue-50/50 transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#2158E0] disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="p-1.5 bg-white rounded border border-[#E6EAF3] group-hover:border-[#2158E0]/40">
                    {getTemplateIcon(tmpl.id)}
                  </div>
                  <span className="text-[11px] font-semibold text-[#5B6478] bg-white px-2 py-0.5 rounded border border-[#E6EAF3]">
                    {tmpl.classes.length} classes
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
                  {tmpl.name}
                </h3>
                <p className="text-[11px] text-[#5B6478] mt-0.5 line-clamp-2 leading-relaxed">
                  {tmpl.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Review and Edit Classes & Sections */}
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F9]">
            <div>
              <h2 className="text-sm font-semibold text-[#141A2E] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2158E0]" />
                Classes & Sections ({classes.length})
              </h2>
              <p className="text-xs text-[#5B6478] mt-0.5">
                Review, reorder, or customize each class and its sections.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddClassModal}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2158E0] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          </div>

          {/* Classes List / Table */}
          {classes.length === 0 ? (
            <div className="py-12 px-4 text-center border-2 border-dashed border-[#E6EAF3] rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#141A2E]">
                  No classes configured yet
                </h3>
                <p className="text-xs text-[#5B6478] max-w-sm mx-auto mt-1">
                  Choose a template above to generate classes automatically, or click "Add Class" to build your structure manually.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddClassModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#2158E0] text-[#2158E0] hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Class
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((cls, index) => {
                const sectionList = cls.sections || [];
                return (
                  <div
                    key={cls.id}
                    className="p-3.5 sm:p-4 rounded-lg border border-[#E6EAF3] bg-white hover:border-[#CBD5E1] transition-all space-y-3"
                  >
                    {/* Class Row Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Sort Order Buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveClass(index, "up")}
                            disabled={index === 0 || isSubmitting}
                            title="Move class up"
                            aria-label={`Move ${cls.name} up`}
                            className="p-0.5 rounded text-[#94A3B8] hover:text-[#141A2E] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveClass(index, "down")}
                            disabled={index === classes.length - 1 || isSubmitting}
                            title="Move class down"
                            aria-label={`Move ${cls.name} down`}
                            className="p-0.5 rounded text-[#94A3B8] hover:text-[#141A2E] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Class Name */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#94A3B8]">
                              #{index + 1}
                            </span>
                            <h3 className="text-sm font-bold text-[#141A2E]">
                              {cls.name}
                            </h3>
                            <span className="text-[11px] font-medium text-[#5B6478] bg-[#F1F4F9] px-2 py-0.5 rounded">
                              {sectionList.length} {sectionList.length === 1 ? "Section" : "Sections"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Class Actions */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditClassModal(cls)}
                          disabled={isSubmitting}
                          title="Rename class"
                          aria-label={`Rename ${cls.name}`}
                          className="p-1.5 text-[#5B6478] hover:text-[#2158E0] hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteClass(cls)}
                          disabled={isSubmitting}
                          title="Delete class"
                          aria-label={`Delete ${cls.name}`}
                          className="p-1.5 text-[#5B6478] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sections Container */}
                    <div className="pt-2 border-t border-[#F1F4F9] flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-[#94A3B8] mr-1">
                        Sections:
                      </span>

                      {sectionList.map((sec) => (
                        <div
                          key={sec.id}
                          className="group inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md bg-[#F8FAFC] border border-[#E6EAF3] hover:border-[#CBD5E1] text-xs text-[#141A2E] transition-all"
                        >
                          <span className="font-semibold text-[#141A2E]">
                            {sec.name}
                          </span>
                          <span className="text-[11px] text-[#5B6478]">
                            ({sec.capacity || 40} seats)
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenEditSectionModal(cls.id, sec)}
                            disabled={isSubmitting}
                            title="Edit section"
                            aria-label={`Edit Section ${sec.name} of ${cls.name}`}
                            className="p-0.5 text-[#94A3B8] hover:text-[#2158E0] rounded transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestDeleteSection(cls, sec)}
                            disabled={isSubmitting}
                            title="Remove section"
                            aria-label={`Remove Section ${sec.name} from ${cls.name}`}
                            className="p-0.5 text-[#94A3B8] hover:text-red-600 rounded transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add Section Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenAddSectionModal(cls.id)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md border border-dashed border-[#CBD5E1] hover:border-[#2158E0] hover:text-[#2158E0] hover:bg-blue-50/40 text-[11px] font-semibold text-[#5B6478] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Section</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Bottom Actions & Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <Link
            to="/onboarding/academics"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E6EAF3] bg-white text-[#5B6478] hover:text-[#141A2E] hover:border-[#CBD5E1] rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Academic Year</span>
          </Link>

          <button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting || classes.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2158E0] hover:bg-[#1A46B8] disabled:bg-[#94A3B8] text-white rounded-lg text-sm font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving classes...</span>
              </>
            ) : (
              <>
                <span>Continue to plan</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL 1: Add Class */}
      {showAddClassModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-class-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF3] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F9]">
              <h3 id="add-class-title" className="text-base font-bold text-[#141A2E]">
                Add New Class
              </h3>
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                className="text-[#94A3B8] hover:text-[#141A2E] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addClassError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{addClassError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-3.5">
              <div>
                <label
                  htmlFor={addClassInputId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1"
                >
                  Class / Grade Name *
                </label>
                <input
                  id={addClassInputId}
                  type="text"
                  required
                  placeholder="e.g. Class 11, Playgroup, Nursery"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0]"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor={addClassSectionsId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1"
                >
                  Initial Sections (comma separated)
                </label>
                <input
                  id={addClassSectionsId}
                  type="text"
                  placeholder="A, B"
                  value={newClassSections}
                  onChange={(e) => setNewClassSections(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0]"
                />
                <span className="text-[11px] text-[#94A3B8] mt-1 block">
                  Example: "A, B" or "Rose, Lily"
                </span>
              </div>

              <div>
                <label
                  htmlFor={addClassCapacityId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1"
                >
                  Default Student Capacity per Section
                </label>
                <input
                  id={addClassCapacityId}
                  type="number"
                  min="1"
                  max="200"
                  value={newClassCapacity}
                  onChange={(e) => setNewClassCapacity(Number(e.target.value) || 40)}
                  className="w-full px-3 py-2 text-sm border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F4F9]">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Rename Class */}
      {editingClass && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-class-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF3] max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F9]">
              <h3 id="edit-class-title" className="text-base font-bold text-[#141A2E]">
                Rename Class
              </h3>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="text-[#94A3B8] hover:text-[#141A2E] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editClassError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editClassError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateClass} className="space-y-3.5">
              <div>
                <label
                  htmlFor={editClassNameId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1"
                >
                  Class Name *
                </label>
                <input
                  id={editClassNameId}
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F4F9]">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-3 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Section */}
      {addingSectionForClassId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-section-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF3] max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F9]">
              <h3 id="add-section-title" className="text-base font-bold text-[#141A2E]">
                Add Section
              </h3>
              <button
                type="button"
                onClick={() => setAddingSectionForClassId(null)}
                className="text-[#94A3B8] hover:text-[#141A2E] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addSectionError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{addSectionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSection} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C, D"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0] uppercase"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Student Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={newSectionCapacity}
                  onChange={(e) => setNewSectionCapacity(Number(e.target.value) || 40)}
                  className="w-full px-3 py-2 text-sm border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F4F9]">
                <button
                  type="button"
                  onClick={() => setAddingSectionForClassId(null)}
                  className="px-3 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Section */}
      {editingSection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-section-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF3] max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F9]">
              <h3 id="edit-section-title" className="text-base font-bold text-[#141A2E]">
                Edit Section
              </h3>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="text-[#94A3B8] hover:text-[#141A2E] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editSectionError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editSectionError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSection} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  required
                  value={editSectionName}
                  onChange={(e) => setEditSectionName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0] uppercase"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Student Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={editSectionCapacity}
                  onChange={(e) => setEditSectionCapacity(Number(e.target.value) || 40)}
                  className="w-full px-3 py-2 text-sm border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F4F9]">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-3 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Template Replace Confirmation */}
      {pendingTemplateId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-replace-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF3] max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="template-replace-title" className="text-base font-bold text-[#141A2E]">
                  Replace Current Classes?
                </h3>
                <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                  Applying this template will replace your current {classes.length} {classes.length === 1 ? "class" : "classes"}. Any unsaved custom classes and sections will be overwritten.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F4F9]">
              <button
                type="button"
                onClick={() => setPendingTemplateId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeApplyTemplate(pendingTemplateId)}
                className="px-4 py-1.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Yes, Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF3] max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  deleteTarget.isBlocked
                    ? "bg-amber-50 text-amber-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 id="delete-dialog-title" className="text-base font-bold text-[#141A2E]">
                  {deleteTarget.type === "class"
                    ? `Delete Class "${deleteTarget.className}"`
                    : `Delete Section "${deleteTarget.sectionName}"`}
                </h3>

                {deleteTarget.checkingSafety ? (
                  <p className="text-xs text-[#5B6478] mt-1">
                    Checking student enrollments...
                  </p>
                ) : deleteTarget.isBlocked ? (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    {deleteTarget.blockReason}
                  </div>
                ) : (
                  <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                    {deleteTarget.type === "class"
                      ? "Are you sure you want to remove this class and all its sections? This action cannot be undone."
                      : `Are you sure you want to remove Section ${deleteTarget.sectionName} from ${deleteTarget.className}?`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F4F9]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] rounded-lg"
              >
                {deleteTarget.isBlocked ? "Close" : "Cancel"}
              </button>

              {!deleteTarget.isBlocked && !deleteTarget.checkingSafety && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {deleteTarget.type === "class" ? "Delete Class" : "Delete Section"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}
