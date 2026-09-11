/**
 * Class & Section Service Layer
 *
 * Handles:
 * - Tenant-scoped classes and sections persistence (school_id + academic_year_id)
 * - Duplicate prevention (case-insensitive) at school and class level
 * - Class and section reordering (sort_order)
 * - Safe cascading deletion for onboarding stage
 * - Quick setup templates (K-12, 1-10, Primary, Pre-School)
 * - Onboarding step progression (Step 3 -> Step 4)
 * - Resilient offline/preview caching
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  SchoolClass,
  SchoolSection,
  ClassInput,
  SectionInput,
} from "../types/curriculum";
import { CLASS_STRUCTURE_TEMPLATES } from "../types/curriculum";

const CLASSES_CACHE_PREFIX = "myzkool_classes_";
const SECTIONS_CACHE_PREFIX = "myzkool_sections_";

function getClassesCacheKey(schoolId: string, academicYearId: string) {
  return `${CLASSES_CACHE_PREFIX}${schoolId}_${academicYearId}`;
}

function getSectionsCacheKey(schoolId: string, academicYearId: string) {
  return `${SECTIONS_CACHE_PREFIX}${schoolId}_${academicYearId}`;
}

/**
 * Retrieves all classes with their respective sections for a given school and academic year
 */
export async function getClassesWithSections(
  schoolId: string,
  academicYearId: string
): Promise<{ classes: SchoolClass[]; error?: string }> {
  if (!schoolId || !academicYearId) {
    return { classes: [], error: "school_id and academic_year_id are required." };
  }

  let classes: SchoolClass[] = [];
  let sections: SchoolSection[] = [];

  // 1. Supabase Query
  if (isSupabaseConfigured) {
    try {
      const [classesRes, sectionsRes] = await Promise.all([
        supabase
          .from("classes")
          .select("*")
          .eq("school_id", schoolId)
          .eq("academic_year_id", academicYearId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("sections")
          .select("*")
          .eq("school_id", schoolId)
          .eq("academic_year_id", academicYearId)
          .order("sort_order", { ascending: true }),
      ]);

      if (!classesRes.error && classesRes.data) {
        classes = classesRes.data.map((c) => ({
          id: c.id,
          school_id: c.school_id,
          academic_year_id: c.academic_year_id,
          name: c.name,
          display_name: c.display_name,
          sort_order: c.sort_order,
          status: c.status || "active",
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));
      }

      if (!sectionsRes.error && sectionsRes.data) {
        sections = sectionsRes.data.map((s) => ({
          id: s.id,
          school_id: s.school_id,
          academic_year_id: s.academic_year_id,
          class_id: s.class_id,
          name: s.name,
          display_name: s.display_name,
          sort_order: s.sort_order,
          status: s.status || "active",
          created_at: s.created_at,
          updated_at: s.updated_at,
        }));
      }
    } catch {
      // Table may not yet be initialized in mock environments
    }
  }

  // 2. Local storage fallback if database returned empty
  if (classes.length === 0) {
    try {
      const cachedClasses = localStorage.getItem(
        getClassesCacheKey(schoolId, academicYearId)
      );
      if (cachedClasses) {
        classes = JSON.parse(cachedClasses);
      }
      const cachedSections = localStorage.getItem(
        getSectionsCacheKey(schoolId, academicYearId)
      );
      if (cachedSections) {
        sections = JSON.parse(cachedSections);
      }
    } catch {
      // Storage access error
    }
  }

  // Attach sections to classes
  const classesWithSections: SchoolClass[] = classes.map((c) => {
    const classSections = sections
      .filter((s) => s.class_id === c.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return {
      ...c,
      sections: classSections,
    };
  });

  return { classes: classesWithSections };
}

/**
 * Creates a new Class and optional initial sections
 */
export async function createClass({
  schoolId,
  academicYearId,
  input,
}: {
  schoolId: string;
  academicYearId: string;
  userId?: string;
  input: ClassInput;
}): Promise<{
  success: boolean;
  classRecord?: SchoolClass;
  error?: string;
}> {
  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Please enter a class name." };
  }

  // 1. Fetch current classes to check duplicate and get next sort_order
  const { classes } = await getClassesWithSections(schoolId, academicYearId);

  const duplicate = classes.some(
    (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    return {
      success: false,
      error: `A class named "${trimmedName}" already exists for this academic year.`,
    };
  }

  const nextSortOrder =
    input.sort_order !== undefined
      ? input.sort_order
      : classes.length > 0
      ? Math.max(...classes.map((c) => c.sort_order)) + 1
      : 1;

  const classId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const newClass: SchoolClass = {
    id: classId,
    school_id: schoolId,
    academic_year_id: academicYearId,
    name: trimmedName,
    display_name: input.display_name?.trim() || trimmedName,
    sort_order: nextSortOrder,
    status: "active",
    sections: [],
    created_at: timestamp,
    updated_at: timestamp,
  };

  // Create initial sections (e.g. ["A", "B"])
  const initialSectionsList =
    input.initial_sections && input.initial_sections.length > 0
      ? input.initial_sections
      : ["A"];

  const createdSections: SchoolSection[] = initialSectionsList.map(
    (secName, idx) => ({
      id: crypto.randomUUID(),
      school_id: schoolId,
      academic_year_id: academicYearId,
      class_id: classId,
      name: secName.trim().toUpperCase(),
      display_name: `Section ${secName.trim().toUpperCase()}`,
      sort_order: idx + 1,
      status: "active",
      created_at: timestamp,
      updated_at: timestamp,
    })
  );

  newClass.sections = createdSections;

  // Persist to Supabase
  if (isSupabaseConfigured) {
    try {
      await supabase.from("classes").insert({
        id: newClass.id,
        school_id: newClass.school_id,
        academic_year_id: newClass.academic_year_id,
        name: newClass.name,
        display_name: newClass.display_name,
        sort_order: newClass.sort_order,
        status: newClass.status,
      });

      if (createdSections.length > 0) {
        await supabase.from("sections").insert(
          createdSections.map((s) => ({
            id: s.id,
            school_id: s.school_id,
            academic_year_id: s.academic_year_id,
            class_id: s.class_id,
            name: s.name,
            display_name: s.display_name,
            sort_order: s.sort_order,
            status: s.status,
          }))
        );
      }
    } catch (err) {
      console.warn("Supabase createClass error:", err);
    }
  }

  // Update local cache
  try {
    const updatedClasses = [...classes, newClass];
    localStorage.setItem(
      getClassesCacheKey(schoolId, academicYearId),
      JSON.stringify(updatedClasses)
    );

    const existingSectionsRaw = localStorage.getItem(
      getSectionsCacheKey(schoolId, academicYearId)
    );
    const existingSections: SchoolSection[] = existingSectionsRaw
      ? JSON.parse(existingSectionsRaw)
      : [];
    const updatedSections = [...existingSections, ...createdSections];
    localStorage.setItem(
      getSectionsCacheKey(schoolId, academicYearId),
      JSON.stringify(updatedSections)
    );
  } catch {
    // Non-fatal
  }

  return { success: true, classRecord: newClass };
}

/**
 * Updates a Class name or display name
 */
export async function updateClass({
  schoolId,
  academicYearId,
  classId,
  input,
}: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  input: Partial<ClassInput>;
}): Promise<{
  success: boolean;
  classRecord?: SchoolClass;
  error?: string;
}> {
  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Class name cannot be empty." };
  }

  const { classes } = await getClassesWithSections(schoolId, academicYearId);

  // Check duplicate among other classes
  const duplicate = classes.some(
    (c) =>
      c.id !== classId &&
      c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    return {
      success: false,
      error: `Another class named "${trimmedName}" already exists.`,
    };
  }

  const existingClass = classes.find((c) => c.id === classId);
  if (!existingClass) {
    return { success: false, error: "Class record not found." };
  }

  const updatedClass: SchoolClass = {
    ...existingClass,
    name: trimmedName,
    display_name: input.display_name?.trim() || trimmedName,
    sort_order:
      input.sort_order !== undefined ? input.sort_order : existingClass.sort_order,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("classes")
        .update({
          name: updatedClass.name,
          display_name: updatedClass.display_name,
          sort_order: updatedClass.sort_order,
          updated_at: updatedClass.updated_at,
        })
        .eq("id", classId);
    } catch (err) {
      console.warn("Supabase updateClass error:", err);
    }
  }

  try {
    const updatedList = classes.map((c) => (c.id === classId ? updatedClass : c));
    localStorage.setItem(
      getClassesCacheKey(schoolId, academicYearId),
      JSON.stringify(updatedList)
    );
  } catch {
    // Non-fatal
  }

  return { success: true, classRecord: updatedClass };
}

/**
 * Deletes a Class safely (removes sections and class_subject mappings in onboarding)
 */
export async function deleteClass({
  schoolId,
  academicYearId,
  classId,
}: {
  schoolId: string;
  academicYearId: string;
  classId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from("class_subjects").delete().eq("class_id", classId);
      await supabase.from("sections").delete().eq("class_id", classId);
      await supabase.from("classes").delete().eq("id", classId);
    } catch (err) {
      console.warn("Supabase deleteClass error:", err);
    }
  }

  try {
    const { classes } = await getClassesWithSections(schoolId, academicYearId);
    const updatedClasses = classes.filter((c) => c.id !== classId);
    localStorage.setItem(
      getClassesCacheKey(schoolId, academicYearId),
      JSON.stringify(updatedClasses)
    );

    const existingSectionsRaw = localStorage.getItem(
      getSectionsCacheKey(schoolId, academicYearId)
    );
    if (existingSectionsRaw) {
      const existingSections: SchoolSection[] = JSON.parse(existingSectionsRaw);
      const filteredSections = existingSections.filter((s) => s.class_id !== classId);
      localStorage.setItem(
        getSectionsCacheKey(schoolId, academicYearId),
        JSON.stringify(filteredSections)
      );
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Reorders classes by updating their sort_order
 */
export async function reorderClasses({
  schoolId,
  academicYearId,
  classIds,
}: {
  schoolId: string;
  academicYearId: string;
  classIds: string[];
}): Promise<{ success: boolean; error?: string }> {
  const { classes } = await getClassesWithSections(schoolId, academicYearId);

  const updatedClasses = classes.map((c) => {
    const idx = classIds.indexOf(c.id);
    return {
      ...c,
      sort_order: idx >= 0 ? idx + 1 : c.sort_order,
    };
  }).sort((a, b) => a.sort_order - b.sort_order);

  if (isSupabaseConfigured) {
    try {
      for (const c of updatedClasses) {
        await supabase
          .from("classes")
          .update({ sort_order: c.sort_order })
          .eq("id", c.id);
      }
    } catch (err) {
      console.warn("Supabase reorderClasses error:", err);
    }
  }

  try {
    localStorage.setItem(
      getClassesCacheKey(schoolId, academicYearId),
      JSON.stringify(updatedClasses)
    );
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Adds a new Section under a specific Class
 */
export async function createSection({
  schoolId,
  academicYearId,
  classId,
  input,
}: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  input: SectionInput;
}): Promise<{
  success: boolean;
  sectionRecord?: SchoolSection;
  error?: string;
}> {
  const trimmedName = input.name?.trim().toUpperCase();
  if (!trimmedName) {
    return { success: false, error: "Please enter a section name (e.g., A, B, C)." };
  }

  const { classes } = await getClassesWithSections(schoolId, academicYearId);
  const targetClass = classes.find((c) => c.id === classId);
  if (!targetClass) {
    return { success: false, error: "Parent class not found." };
  }

  const existingSections = targetClass.sections || [];
  const duplicate = existingSections.some(
    (s) => s.name.trim().toUpperCase() === trimmedName
  );
  if (duplicate) {
    return {
      success: false,
      error: `Section "${trimmedName}" already exists in ${targetClass.name}.`,
    };
  }

  const nextSortOrder =
    input.sort_order !== undefined
      ? input.sort_order
      : existingSections.length > 0
      ? Math.max(...existingSections.map((s) => s.sort_order)) + 1
      : 1;

  const sectionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const newSection: SchoolSection = {
    id: sectionId,
    school_id: schoolId,
    academic_year_id: academicYearId,
    class_id: classId,
    name: trimmedName,
    display_name: input.display_name?.trim() || `Section ${trimmedName}`,
    sort_order: nextSortOrder,
    status: "active",
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from("sections").insert({
        id: newSection.id,
        school_id: newSection.school_id,
        academic_year_id: newSection.academic_year_id,
        class_id: newSection.class_id,
        name: newSection.name,
        display_name: newSection.display_name,
        sort_order: newSection.sort_order,
        status: newSection.status,
      });
    } catch (err) {
      console.warn("Supabase createSection error:", err);
    }
  }

  try {
    const raw = localStorage.getItem(getSectionsCacheKey(schoolId, academicYearId));
    const allSections: SchoolSection[] = raw ? JSON.parse(raw) : [];
    allSections.push(newSection);
    localStorage.setItem(
      getSectionsCacheKey(schoolId, academicYearId),
      JSON.stringify(allSections)
    );
  } catch {
    // Non-fatal
  }

  return { success: true, sectionRecord: newSection };
}

/**
 * Updates a Section name
 */
export async function updateSection({
  schoolId,
  academicYearId,
  classId,
  sectionId,
  input,
}: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  input: SectionInput;
}): Promise<{
  success: boolean;
  sectionRecord?: SchoolSection;
  error?: string;
}> {
  const trimmedName = input.name?.trim().toUpperCase();
  if (!trimmedName) {
    return { success: false, error: "Section name cannot be empty." };
  }

  const { classes } = await getClassesWithSections(schoolId, academicYearId);
  const targetClass = classes.find((c) => c.id === classId);
  if (!targetClass) {
    return { success: false, error: "Parent class not found." };
  }

  const existingSections = targetClass.sections || [];
  const duplicate = existingSections.some(
    (s) => s.id !== sectionId && s.name.trim().toUpperCase() === trimmedName
  );
  if (duplicate) {
    return {
      success: false,
      error: `Another section named "${trimmedName}" already exists in ${targetClass.name}.`,
    };
  }

  const existingSection = existingSections.find((s) => s.id === sectionId);
  if (!existingSection) {
    return { success: false, error: "Section not found." };
  }

  const updatedSection: SchoolSection = {
    ...existingSection,
    name: trimmedName,
    display_name: input.display_name?.trim() || `Section ${trimmedName}`,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("sections")
        .update({
          name: updatedSection.name,
          display_name: updatedSection.display_name,
          updated_at: updatedSection.updated_at,
        })
        .eq("id", sectionId);
    } catch (err) {
      console.warn("Supabase updateSection error:", err);
    }
  }

  try {
    const raw = localStorage.getItem(getSectionsCacheKey(schoolId, academicYearId));
    if (raw) {
      const allSections: SchoolSection[] = JSON.parse(raw);
      const updated = allSections.map((s) => (s.id === sectionId ? updatedSection : s));
      localStorage.setItem(
        getSectionsCacheKey(schoolId, academicYearId),
        JSON.stringify(updated)
      );
    }
  } catch {
    // Non-fatal
  }

  return { success: true, sectionRecord: updatedSection };
}

/**
 * Deletes a Section
 */
export async function deleteSection({
  schoolId,
  academicYearId,
  sectionId,
}: {
  schoolId: string;
  academicYearId: string;
  sectionId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from("sections").delete().eq("id", sectionId);
    } catch (err) {
      console.warn("Supabase deleteSection error:", err);
    }
  }

  try {
    const raw = localStorage.getItem(getSectionsCacheKey(schoolId, academicYearId));
    if (raw) {
      const allSections: SchoolSection[] = JSON.parse(raw);
      const filtered = allSections.filter((s) => s.id !== sectionId);
      localStorage.setItem(
        getSectionsCacheKey(schoolId, academicYearId),
        JSON.stringify(filtered)
      );
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Applies a fast setup template (e.g. K-12, Class 1-10, Primary)
 */
export async function applyClassTemplate({
  schoolId,
  academicYearId,
  templateId,
}: {
  schoolId: string;
  academicYearId: string;
  userId?: string;
  templateId: string;
}): Promise<{ success: boolean; createdCount: number; error?: string }> {
  const template = CLASS_STRUCTURE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return { success: false, createdCount: 0, error: "Template not found." };
  }

  const { classes: existingClasses } = await getClassesWithSections(
    schoolId,
    academicYearId
  );
  let createdCount = 0;

  for (const tClass of template.classes) {
    // Check if class already exists
    const exists = existingClasses.some(
      (c) => c.name.trim().toLowerCase() === tClass.name.trim().toLowerCase()
    );
    if (!exists) {
      await createClass({
        schoolId,
        academicYearId,
        input: {
          name: tClass.name,
          initial_sections: tClass.sections,
        },
      });
      createdCount++;
    }
  }

  return { success: true, createdCount };
}

/**
 * Advances Onboarding to Step 4 (Subjects)
 */
export async function saveClassesSetupProgress({
  schoolId,
  userId,
  academicYearId,
}: {
  schoolId: string;
  userId: string;
  academicYearId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { classes } = await getClassesWithSections(schoolId, academicYearId);

  if (classes.length === 0) {
    return {
      success: false,
      error: "Please configure at least one class for your school.",
    };
  }

  const hasMissingSections = classes.some(
    (c) => !c.sections || c.sections.length === 0
  );
  if (hasMissingSections) {
    return {
      success: false,
      error: "Every class must have at least one section (e.g. Section A).",
    };
  }

  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { data: currentSchool } = await supabase
        .from("schools")
        .select("onboarding_step")
        .eq("id", schoolId)
        .maybeSingle();

      const currentStep = currentSchool?.onboarding_step || 3;
      const newStep = Math.max(currentStep, 4);

      await supabase
        .from("schools")
        .update({
          onboarding_step: newStep,
          updated_at: timestamp,
        })
        .eq("id", schoolId);

      await supabase
        .from("profiles")
        .update({
          current_onboarding_step: "/onboarding/subjects",
          updated_at: timestamp,
        })
        .eq("auth_id", userId);

      await supabase.auth.updateUser({
        data: {
          onboarding_step: newStep,
          current_onboarding_step: "/onboarding/subjects",
        },
      });
    } catch (err) {
      console.warn("Supabase progress save error:", err);
    }
  }

  // Update cached school profile
  try {
    const schoolKey = `myzkool_school_profile_${userId}`;
    const raw = localStorage.getItem(schoolKey);
    if (raw) {
      const cached = JSON.parse(raw);
      cached.onboarding_step = Math.max(cached.onboarding_step || 3, 4);
      localStorage.setItem(schoolKey, JSON.stringify(cached));
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}
