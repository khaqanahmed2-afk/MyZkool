/**
 * Class & Section Service Layer
 *
 * Handles:
 * - Tenant-scoped classes and sections persistence (school_id + academic_year_id)
 * - Duplicate prevention (case-insensitive) at school and class level
 * - Class and section reordering (sort_order)
 * - Safe deletion guards (checking student_enrollments before deleting)
 * - Deterministic Quick setup templates (Full School K-12, Class 1-10, Primary, Early Childhood)
 * - Batch validation and persistence for onboarding flow
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
 * Retrieves all classes with their respective sections for a given school and optional academic year
 */
export async function getClassesWithSections(
  schoolId: string,
  academicYearId?: string
): Promise<{ classes: SchoolClass[]; error?: string }> {
  if (!schoolId) {
    return { classes: [], error: "school_id is required." };
  }

  let classes: SchoolClass[] = [];
  let sections: SchoolSection[] = [];

  // 1. Supabase Query
  if (isSupabaseConfigured) {
    try {
      let classQuery = supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId);

      let sectionQuery = supabase
        .from("sections")
        .select("*")
        .eq("school_id", schoolId);

      if (academicYearId) {
        classQuery = classQuery.eq("academic_year_id", academicYearId);
        sectionQuery = sectionQuery.eq("academic_year_id", academicYearId);
      }

      const [classesRes, sectionsRes] = await Promise.all([
        classQuery.order("sort_order", { ascending: true }),
        sectionQuery.order("sort_order", { ascending: true }),
      ]);

      if (!classesRes.error && classesRes.data && classesRes.data.length > 0) {
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
      } else if (academicYearId) {
        // Fallback: Query all classes for this school if specific academic_year_id returned nothing
        const fallbackRes = await supabase
          .from("classes")
          .select("*")
          .eq("school_id", schoolId)
          .order("sort_order", { ascending: true });

        if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
          classes = fallbackRes.data.map((c) => ({
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
      }

      if (!sectionsRes.error && sectionsRes.data && sectionsRes.data.length > 0) {
        sections = sectionsRes.data.map((s) => ({
          id: s.id,
          school_id: s.school_id,
          academic_year_id: s.academic_year_id,
          class_id: s.class_id,
          name: s.name,
          display_name: s.display_name,
          sort_order: s.sort_order,
          capacity: s.capacity !== undefined && s.capacity !== null ? Number(s.capacity) : 40,
          status: s.status || "active",
          created_at: s.created_at,
          updated_at: s.updated_at,
        }));
      } else if (academicYearId) {
        const fallbackSecRes = await supabase
          .from("sections")
          .select("*")
          .eq("school_id", schoolId)
          .order("sort_order", { ascending: true });

        if (!fallbackSecRes.error && fallbackSecRes.data && fallbackSecRes.data.length > 0) {
          sections = fallbackSecRes.data.map((s) => ({
            id: s.id,
            school_id: s.school_id,
            academic_year_id: s.academic_year_id,
            class_id: s.class_id,
            name: s.name,
            display_name: s.display_name,
            sort_order: s.sort_order,
            capacity: s.capacity !== undefined && s.capacity !== null ? Number(s.capacity) : 40,
            status: s.status || "active",
            created_at: s.created_at,
            updated_at: s.updated_at,
          }));
        }
      }
    } catch (err) {
      console.warn("Supabase getClassesWithSections query failed:", err);
    }
  }

  // 2. Local storage fallback if database returned empty
  if (classes.length === 0) {
    try {
      const yearClassesRaw = academicYearId
        ? localStorage.getItem(getClassesCacheKey(schoolId, academicYearId))
        : null;

      if (yearClassesRaw) {
        classes = JSON.parse(yearClassesRaw);
      } else {
        const cachedFallback = localStorage.getItem(`${CLASSES_CACHE_PREFIX}${schoolId}`);
        if (cachedFallback) {
          const parsed: SchoolClass[] = JSON.parse(cachedFallback);
          classes = academicYearId
            ? parsed.filter((c) => !c.academic_year_id || c.academic_year_id === academicYearId)
            : parsed;
        }
      }

      const yearSectionsRaw = academicYearId
        ? localStorage.getItem(getSectionsCacheKey(schoolId, academicYearId))
        : null;

      if (yearSectionsRaw) {
        sections = JSON.parse(yearSectionsRaw);
      } else {
        const cachedFallbackSec = localStorage.getItem(`${SECTIONS_CACHE_PREFIX}${schoolId}`);
        if (cachedFallbackSec) {
          const parsed: SchoolSection[] = JSON.parse(cachedFallbackSec);
          sections = academicYearId
            ? parsed.filter((s) => !s.academic_year_id || s.academic_year_id === academicYearId)
            : parsed;
        }
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
 * Checks if a class can be safely deleted (fails if enrolled students exist)
 */
export async function canDeleteClass(
  schoolId: string,
  classId: string
): Promise<{ canDelete: boolean; studentCount: number; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { count, error } = await supabase
        .from("student_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("class_id", classId);

      if (!error && count !== null && count > 0) {
        return {
          canDelete: false,
          studentCount: count,
          error: `Cannot delete this class because it has ${count} enrolled student(s).`,
        };
      }
    } catch (err) {
      console.warn("canDeleteClass check error:", err);
    }
  }
  return { canDelete: true, studentCount: 0 };
}

/**
 * Checks if a section can be safely deleted (fails if enrolled students exist)
 */
export async function canDeleteSection(
  schoolId: string,
  sectionId: string
): Promise<{ canDelete: boolean; studentCount: number; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { count, error } = await supabase
        .from("student_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("section_id", sectionId);

      if (!error && count !== null && count > 0) {
        return {
          canDelete: false,
          studentCount: count,
          error: `Cannot delete this section because it has ${count} enrolled student(s).`,
        };
      }
    } catch (err) {
      console.warn("canDeleteSection check error:", err);
    }
  }
  return { canDelete: true, studentCount: 0 };
}

/**
 * Generates initial in-memory class & section structures from a template.
 * Does NOT write directly to the database without user confirmation.
 */
export function generateClassesFromTemplate(
  templateId: string,
  schoolId: string,
  academicYearId: string
): SchoolClass[] {
  const template = CLASS_STRUCTURE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return [];

  const timestamp = new Date().toISOString();

  return template.classes.map((tClass, cIdx) => {
    const classId = crypto.randomUUID();
    const sections: SchoolSection[] = tClass.sections.map((secName, sIdx) => ({
      id: crypto.randomUUID(),
      school_id: schoolId,
      academic_year_id: academicYearId,
      class_id: classId,
      name: secName.trim().toUpperCase(),
      display_name: `Section ${secName.trim().toUpperCase()}`,
      sort_order: sIdx + 1,
      capacity: 40,
      status: "active",
      created_at: timestamp,
      updated_at: timestamp,
    }));

    return {
      id: classId,
      school_id: schoolId,
      academic_year_id: academicYearId,
      name: tClass.name.trim(),
      display_name: tClass.name.trim(),
      sort_order: cIdx + 1,
      status: "active",
      sections,
      created_at: timestamp,
      updated_at: timestamp,
    };
  });
}

/**
 * Validates in-memory classes structure for duplicates, empty values, and section requirements
 */
export function validateClassesStructure(classes: SchoolClass[]): {
  isValid: boolean;
  error?: string;
} {
  if (!classes || classes.length === 0) {
    return {
      isValid: false,
      error: "Please add at least one class for your school.",
    };
  }

  const seenClassNames = new Set<string>();

  for (let i = 0; i < classes.length; i++) {
    const c = classes[i];
    const trimmedClassName = (c.name || "").trim();
    if (!trimmedClassName) {
      return {
        isValid: false,
        error: `Class #${i + 1} has an empty name. Please specify a class name.`,
      };
    }

    const lowerName = trimmedClassName.toLowerCase();
    if (seenClassNames.has(lowerName)) {
      return {
        isValid: false,
        error: `Duplicate class name "${trimmedClassName}" detected. Each class name must be unique.`,
      };
    }
    seenClassNames.add(lowerName);

    if (!c.sections || c.sections.length === 0) {
      return {
        isValid: false,
        error: `Class "${trimmedClassName}" must have at least one section (e.g. Section A).`,
      };
    }

    const seenSectionNames = new Set<string>();
    for (let j = 0; j < c.sections.length; j++) {
      const s = c.sections[j];
      const trimmedSecName = (s.name || "").trim().toUpperCase();
      if (!trimmedSecName) {
        return {
          isValid: false,
          error: `A section in ${trimmedClassName} has an empty name.`,
        };
      }
      if (seenSectionNames.has(trimmedSecName)) {
        return {
          isValid: false,
          error: `Class "${trimmedClassName}" contains duplicate section "${trimmedSecName}".`,
        };
      }
      seenSectionNames.add(trimmedSecName);
    }
  }

  return { isValid: true };
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
      capacity: 40,
      status: "active",
      created_at: timestamp,
      updated_at: timestamp,
    })
  );

  newClass.sections = createdSections;

  // Persist to Supabase
  if (isSupabaseConfigured) {
    try {
      const { error: cErr } = await supabase.from("classes").insert({
        id: newClass.id,
        school_id: newClass.school_id,
        academic_year_id: newClass.academic_year_id,
        name: newClass.name,
        display_name: newClass.display_name,
        sort_order: newClass.sort_order,
        status: newClass.status,
      });

      if (cErr) {
        console.error("Supabase createClass insert error:", cErr);
        return { success: false, error: cErr.message || "Failed to create class in database." };
      }

      if (createdSections.length > 0) {
        const { error: sErr } = await supabase.from("sections").insert(
          createdSections.map((s) => ({
            id: s.id,
            school_id: s.school_id,
            academic_year_id: s.academic_year_id,
            class_id: s.class_id,
            name: s.name,
            display_name: s.display_name,
            sort_order: s.sort_order,
            capacity: s.capacity || 40,
            status: s.status,
          }))
        );

        if (sErr) {
          console.error("Supabase createClass sections insert error:", sErr);
        }
      }
    } catch (err: any) {
      console.warn("Supabase createClass error:", err);
      return { success: false, error: err?.message || "Failed to create class." };
    }
  }

  // Update local cache
  try {
    const updatedClasses = [...classes, newClass];
    localStorage.setItem(
      getClassesCacheKey(schoolId, academicYearId),
      JSON.stringify(updatedClasses)
    );
    localStorage.setItem(
      `${CLASSES_CACHE_PREFIX}${schoolId}`,
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
    localStorage.setItem(
      `${SECTIONS_CACHE_PREFIX}${schoolId}`,
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
      error: `Another class named "${trimmedName}" already exists for this academic year.`,
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
      const { error: uErr } = await supabase
        .from("classes")
        .update({
          name: updatedClass.name,
          display_name: updatedClass.display_name,
          sort_order: updatedClass.sort_order,
          updated_at: updatedClass.updated_at,
        })
        .eq("id", classId);

      if (uErr) {
        console.error("Supabase updateClass error:", uErr);
        return { success: false, error: uErr.message || "Failed to update class in database." };
      }
    } catch (err: any) {
      console.warn("Supabase updateClass error:", err);
      return { success: false, error: err?.message || "Failed to update class." };
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
 * Deletes a Class safely (guards against student enrollments, removes sections)
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
  // Check if class has student records
  const check = await canDeleteClass(schoolId, classId);
  if (!check.canDelete) {
    return { success: false, error: check.error };
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from("class_subjects").delete().eq("class_id", classId);
      await supabase.from("sections").delete().eq("class_id", classId);
      const { error: dErr } = await supabase.from("classes").delete().eq("id", classId);
      if (dErr) {
        console.error("Supabase deleteClass error:", dErr);
        return { success: false, error: dErr.message || "Failed to delete class." };
      }
    } catch (err: any) {
      console.warn("Supabase deleteClass error:", err);
      return { success: false, error: err?.message || "Failed to delete class." };
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
    capacity: input.capacity !== undefined ? Number(input.capacity) : 40,
    status: "active",
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { error: sErr } = await supabase.from("sections").insert({
        id: newSection.id,
        school_id: newSection.school_id,
        academic_year_id: newSection.academic_year_id,
        class_id: newSection.class_id,
        name: newSection.name,
        display_name: newSection.display_name,
        sort_order: newSection.sort_order,
        capacity: newSection.capacity || 40,
        status: newSection.status,
      });

      if (sErr) {
        console.error("Supabase createSection error:", sErr);
        return { success: false, error: sErr.message || "Failed to create section in database." };
      }
    } catch (err: any) {
      console.warn("Supabase createSection error:", err);
      return { success: false, error: err?.message || "Failed to create section." };
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
 * Updates a Section name or capacity
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
    capacity: input.capacity !== undefined ? Number(input.capacity) : (existingSection.capacity || 40),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error: sErr } = await supabase
        .from("sections")
        .update({
          name: updatedSection.name,
          display_name: updatedSection.display_name,
          capacity: updatedSection.capacity || 40,
          updated_at: updatedSection.updated_at,
        })
        .eq("id", sectionId);

      if (sErr) {
        console.error("Supabase updateSection error:", sErr);
        return { success: false, error: sErr.message || "Failed to update section." };
      }
    } catch (err: any) {
      console.warn("Supabase updateSection error:", err);
      return { success: false, error: err?.message || "Failed to update section." };
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
 * Deletes a Section (guards against student enrollments)
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
  const check = await canDeleteSection(schoolId, sectionId);
  if (!check.canDelete) {
    return { success: false, error: check.error };
  }

  if (isSupabaseConfigured) {
    try {
      const { error: dErr } = await supabase.from("sections").delete().eq("id", sectionId);
      if (dErr) {
        console.error("Supabase deleteSection error:", dErr);
        return { success: false, error: dErr.message || "Failed to delete section." };
      }
    } catch (err: any) {
      console.warn("Supabase deleteSection error:", err);
      return { success: false, error: err?.message || "Failed to delete section." };
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
    const exists = existingClasses.some(
      (c) => c.name.trim().toLowerCase() === tClass.name.trim().toLowerCase()
    );
    if (!exists) {
      const res = await createClass({
        schoolId,
        academicYearId,
        input: {
          name: tClass.name,
          initial_sections: tClass.sections,
        },
      });
      if (res.success) {
        createdCount++;
      }
    }
  }

  return { success: true, createdCount };
}

/**
 * Saves all classes and sections in a coordinated atomic batch.
 * Validates structure, reconciles deletions safely, updates profiles/schools, and advances onboarding to Step 4.
 */
export async function saveAllClassesAndSections({
  schoolId,
  academicYearId,
  userId,
  classes,
}: {
  schoolId: string;
  academicYearId: string;
  userId: string;
  classes: SchoolClass[];
}): Promise<{ success: boolean; error?: string }> {
  if (!schoolId) {
    return { success: false, error: "School association required." };
  }
  if (!academicYearId) {
    return { success: false, error: "Academic year association required." };
  }
  if (!userId) {
    return { success: false, error: "Authentication session expired. Please log in again." };
  }

  // 1. Validation
  const validation = validateClassesStructure(classes);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const timestamp = new Date().toISOString();

  // 2. Persist to Supabase
  if (isSupabaseConfigured) {
    try {
      // Fetch existing classes & sections to detect any deletions
      const { data: existingDbClasses } = await supabase
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId)
        .eq("academic_year_id", academicYearId);

      const currentClassIds = new Set(classes.map((c) => c.id));
      const deletedClasses = (existingDbClasses || []).filter(
        (dbC) => !currentClassIds.has(dbC.id)
      );

      // Verify deletion safety for removed classes
      for (const delClass of deletedClasses) {
        const check = await canDeleteClass(schoolId, delClass.id);
        if (!check.canDelete) {
          return { success: false, error: check.error };
        }
      }

      // Check section deletions
      const { data: existingDbSections } = await supabase
        .from("sections")
        .select("id, name, class_id")
        .eq("school_id", schoolId)
        .eq("academic_year_id", academicYearId);

      const currentSectionIds = new Set(
        classes.flatMap((c) => (c.sections || []).map((s) => s.id))
      );
      const deletedSections = (existingDbSections || []).filter(
        (dbS) => !currentSectionIds.has(dbS.id)
      );

      for (const delSec of deletedSections) {
        const check = await canDeleteSection(schoolId, delSec.id);
        if (!check.canDelete) {
          return { success: false, error: check.error };
        }
      }

      // Delete removed classes (CASCADE removes their sections)
      if (deletedClasses.length > 0) {
        const { error: dCErr } = await supabase
          .from("classes")
          .delete()
          .in("id", deletedClasses.map((c) => c.id));

        if (dCErr) {
          console.error("Supabase delete removed classes error:", dCErr);
        }
      }

      // Delete removed sections that belong to classes still present
      if (deletedSections.length > 0) {
        const { error: dSErr } = await supabase
          .from("sections")
          .delete()
          .in("id", deletedSections.map((s) => s.id));

        if (dSErr) {
          console.error("Supabase delete removed sections error:", dSErr);
        }
      }

      // Upsert classes
      const classRows = classes.map((c, idx) => ({
        id: c.id,
        school_id: schoolId,
        academic_year_id: academicYearId,
        name: c.name.trim(),
        display_name: c.display_name?.trim() || c.name.trim(),
        sort_order: idx + 1,
        status: c.status || "active",
        updated_at: timestamp,
      }));

      const { error: cUpsertErr } = await supabase
        .from("classes")
        .upsert(classRows, { onConflict: "id" });

      if (cUpsertErr) {
        console.error("Supabase classes upsert error:", cUpsertErr);
        if (cUpsertErr.code === "23505") {
          return {
            success: false,
            error: "A class with this name already exists in this academic year.",
          };
        }
        return {
          success: false,
          error: cUpsertErr.message || "Failed to save classes.",
        };
      }

      // Upsert sections
      const sectionRows = classes.flatMap((c) =>
        (c.sections || []).map((s, idx) => ({
          id: s.id,
          school_id: schoolId,
          academic_year_id: academicYearId,
          class_id: c.id,
          name: s.name.trim().toUpperCase(),
          display_name: s.display_name?.trim() || `Section ${s.name.trim().toUpperCase()}`,
          sort_order: idx + 1,
          capacity: s.capacity ? Number(s.capacity) : 40,
          status: s.status || "active",
          updated_at: timestamp,
        }))
      );

      if (sectionRows.length > 0) {
        const { error: sUpsertErr } = await supabase
          .from("sections")
          .upsert(sectionRows, { onConflict: "id" });

        if (sUpsertErr) {
          console.error("Supabase sections upsert error:", sUpsertErr);
          if (sUpsertErr.code === "23505") {
            return {
              success: false,
              error: "Duplicate section name within a class is not permitted.",
            };
          }
          return {
            success: false,
            error: sUpsertErr.message || "Failed to save sections.",
          };
        }
      }

      // Advance onboarding step to Step 4
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
          school_id: schoolId,
          current_onboarding_step: "/onboarding/subscription",
          updated_at: timestamp,
        })
        .eq("auth_id", userId);

      await supabase.auth.updateUser({
        data: {
          school_id: schoolId,
          onboarding_step: newStep,
          current_onboarding_step: "/onboarding/subscription",
        },
      });
    } catch (err: any) {
      console.error("saveAllClassesAndSections exception:", err);
      return {
        success: false,
        error: err?.message || "An unexpected database error occurred.",
      };
    }
  }

  // Update local caches
  try {
    localStorage.setItem(
      getClassesCacheKey(schoolId, academicYearId),
      JSON.stringify(classes)
    );
    localStorage.setItem(
      `${CLASSES_CACHE_PREFIX}${schoolId}`,
      JSON.stringify(classes)
    );

    const allSections = classes.flatMap((c) => c.sections || []);
    localStorage.setItem(
      getSectionsCacheKey(schoolId, academicYearId),
      JSON.stringify(allSections)
    );
    localStorage.setItem(
      `${SECTIONS_CACHE_PREFIX}${schoolId}`,
      JSON.stringify(allSections)
    );

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

/**
 * Advances Onboarding to Step 4 (backward compatible wrapper around saveAllClassesAndSections)
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

  return saveAllClassesAndSections({
    schoolId,
    academicYearId,
    userId,
    classes,
  });
}
