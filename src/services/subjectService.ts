/**
 * Subject & Curriculum Service Layer
 *
 * Handles:
 * - Reusable Subject library per school & academic year
 * - Case-insensitive duplicate prevention
 * - Class-to-Subject assignments (class_subjects junction)
 * - Multi-class subject assignments
 * - Quick subject preset packs
 * - Onboarding step progression (Step 4 -> Step 5)
 * - Resilient offline/preview caching
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  Subject,
  ClassSubject,
  SubjectInput,
  StandardSubjectPreset,
} from "../types/curriculum";
import { STANDARD_SUBJECT_PRESETS } from "../types/curriculum";

const SUBJECTS_CACHE_PREFIX = "myzkool_subjects_";
const CLASS_SUBJECTS_CACHE_PREFIX = "myzkool_class_subjects_";

function getSubjectsCacheKey(schoolId: string, academicYearId: string) {
  return `${SUBJECTS_CACHE_PREFIX}${schoolId}_${academicYearId}`;
}

function getClassSubjectsCacheKey(schoolId: string, academicYearId: string) {
  return `${CLASS_SUBJECTS_CACHE_PREFIX}${schoolId}_${academicYearId}`;
}

/**
 * Retrieves all subjects registered in the school's subject library
 */
export async function getSubjects(
  schoolId: string,
  academicYearId: string
): Promise<{ subjects: Subject[]; error?: string }> {
  if (!schoolId || !academicYearId) {
    return { subjects: [], error: "school_id and academic_year_id are required." };
  }

  let subjects: Subject[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId)
        .eq("academic_year_id", academicYearId)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        subjects = data.map((s) => ({
          id: s.id,
          school_id: s.school_id,
          academic_year_id: s.academic_year_id,
          name: s.name,
          code: s.code,
          subject_type: s.subject_type || "core",
          status: s.status || "active",
          sort_order: s.sort_order,
          created_at: s.created_at,
          updated_at: s.updated_at,
        }));
      }
    } catch {
      // Table may not yet be initialized in mock environments
    }
  }

  if (subjects.length === 0) {
    try {
      const raw = localStorage.getItem(getSubjectsCacheKey(schoolId, academicYearId));
      if (raw) {
        subjects = JSON.parse(raw);
      }
    } catch {
      // Storage access error
    }
  }

  return { subjects };
}

/**
 * Creates a new Subject in the school's library
 */
export async function createSubject({
  schoolId,
  academicYearId,
  input,
}: {
  schoolId: string;
  academicYearId: string;
  input: SubjectInput;
}): Promise<{
  success: boolean;
  subject?: Subject;
  error?: string;
}> {
  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Please enter a subject name." };
  }

  const { subjects } = await getSubjects(schoolId, academicYearId);

  // Case-insensitive uniqueness
  const duplicate = subjects.some(
    (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    return {
      success: false,
      error: `A subject named "${trimmedName}" already exists in your school library.`,
    };
  }

  const nextSortOrder =
    input.sort_order !== undefined
      ? input.sort_order
      : subjects.length > 0
      ? Math.max(...subjects.map((s) => s.sort_order)) + 1
      : 1;

  const subjectId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const newSubject: Subject = {
    id: subjectId,
    school_id: schoolId,
    academic_year_id: academicYearId,
    name: trimmedName,
    code: input.code?.trim().toUpperCase() || undefined,
    subject_type: input.subject_type || "core",
    status: "active",
    sort_order: nextSortOrder,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from("subjects").insert({
        id: newSubject.id,
        school_id: newSubject.school_id,
        academic_year_id: newSubject.academic_year_id,
        name: newSubject.name,
        code: newSubject.code,
        subject_type: newSubject.subject_type,
        status: newSubject.status,
        sort_order: newSubject.sort_order,
      });
    } catch (err) {
      console.warn("Supabase createSubject error:", err);
    }
  }

  try {
    const updated = [...subjects, newSubject];
    localStorage.setItem(
      getSubjectsCacheKey(schoolId, academicYearId),
      JSON.stringify(updated)
    );
  } catch {
    // Non-fatal
  }

  return { success: true, subject: newSubject };
}

/**
 * Updates an existing Subject
 */
export async function updateSubject({
  schoolId,
  academicYearId,
  subjectId,
  input,
}: {
  schoolId: string;
  academicYearId: string;
  subjectId: string;
  input: Partial<SubjectInput>;
}): Promise<{
  success: boolean;
  subject?: Subject;
  error?: string;
}> {
  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Subject name cannot be empty." };
  }

  const { subjects } = await getSubjects(schoolId, academicYearId);

  const duplicate = subjects.some(
    (s) =>
      s.id !== subjectId &&
      s.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    return {
      success: false,
      error: `Another subject named "${trimmedName}" already exists.`,
    };
  }

  const existingSubject = subjects.find((s) => s.id === subjectId);
  if (!existingSubject) {
    return { success: false, error: "Subject not found." };
  }

  const updatedSubject: Subject = {
    ...existingSubject,
    name: trimmedName,
    code: input.code !== undefined ? input.code?.trim().toUpperCase() : existingSubject.code,
    subject_type: input.subject_type || existingSubject.subject_type,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("subjects")
        .update({
          name: updatedSubject.name,
          code: updatedSubject.code,
          subject_type: updatedSubject.subject_type,
          updated_at: updatedSubject.updated_at,
        })
        .eq("id", subjectId);
    } catch (err) {
      console.warn("Supabase updateSubject error:", err);
    }
  }

  try {
    const updated = subjects.map((s) => (s.id === subjectId ? updatedSubject : s));
    localStorage.setItem(
      getSubjectsCacheKey(schoolId, academicYearId),
      JSON.stringify(updated)
    );
  } catch {
    // Non-fatal
  }

  return { success: true, subject: updatedSubject };
}

/**
 * Deletes a Subject and its class assignments
 */
export async function deleteSubject({
  schoolId,
  academicYearId,
  subjectId,
}: {
  schoolId: string;
  academicYearId: string;
  subjectId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from("class_subjects").delete().eq("subject_id", subjectId);
      await supabase.from("subjects").delete().eq("id", subjectId);
    } catch (err) {
      console.warn("Supabase deleteSubject error:", err);
    }
  }

  try {
    const { subjects } = await getSubjects(schoolId, academicYearId);
    const updatedSubjects = subjects.filter((s) => s.id !== subjectId);
    localStorage.setItem(
      getSubjectsCacheKey(schoolId, academicYearId),
      JSON.stringify(updatedSubjects)
    );

    const raw = localStorage.getItem(getClassSubjectsCacheKey(schoolId, academicYearId));
    if (raw) {
      const allClassSubjects: ClassSubject[] = JSON.parse(raw);
      const filtered = allClassSubjects.filter((cs) => cs.subject_id !== subjectId);
      localStorage.setItem(
        getClassSubjectsCacheKey(schoolId, academicYearId),
        JSON.stringify(filtered)
      );
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Retrieves all Class-Subject mappings for the school and academic year
 */
export async function getClassSubjects(
  schoolId: string,
  academicYearId: string
): Promise<{ classSubjects: ClassSubject[]; error?: string }> {
  if (!schoolId || !academicYearId) {
    return { classSubjects: [], error: "school_id and academic_year_id are required." };
  }

  let classSubjects: ClassSubject[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("class_subjects")
        .select("*")
        .eq("school_id", schoolId)
        .eq("academic_year_id", academicYearId)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        classSubjects = data.map((cs) => ({
          id: cs.id,
          school_id: cs.school_id,
          academic_year_id: cs.academic_year_id,
          class_id: cs.class_id,
          subject_id: cs.subject_id,
          sort_order: cs.sort_order,
          created_at: cs.created_at,
          updated_at: cs.updated_at,
        }));
      }
    } catch {
      // Table may not yet be initialized
    }
  }

  if (classSubjects.length === 0) {
    try {
      const raw = localStorage.getItem(
        getClassSubjectsCacheKey(schoolId, academicYearId)
      );
      if (raw) {
        classSubjects = JSON.parse(raw);
      }
    } catch {
      // Storage access error
    }
  }

  return { classSubjects };
}

/**
 * Assigns a Subject to a Class
 */
export async function assignSubjectToClass({
  schoolId,
  academicYearId,
  classId,
  subjectId,
  sortOrder,
}: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
  sortOrder?: number;
}): Promise<{ success: boolean; classSubject?: ClassSubject; error?: string }> {
  const { classSubjects } = await getClassSubjects(schoolId, academicYearId);

  const duplicate = classSubjects.some(
    (cs) => cs.class_id === classId && cs.subject_id === subjectId
  );
  if (duplicate) {
    return {
      success: false,
      error: "This subject is already assigned to this class.",
    };
  }

  const nextSortOrder =
    sortOrder !== undefined
      ? sortOrder
      : classSubjects.filter((cs) => cs.class_id === classId).length + 1;

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const newMapping: ClassSubject = {
    id,
    school_id: schoolId,
    academic_year_id: academicYearId,
    class_id: classId,
    subject_id: subjectId,
    sort_order: nextSortOrder,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from("class_subjects").insert({
        id: newMapping.id,
        school_id: newMapping.school_id,
        academic_year_id: newMapping.academic_year_id,
        class_id: newMapping.class_id,
        subject_id: newMapping.subject_id,
        sort_order: newMapping.sort_order,
      });
    } catch (err) {
      console.warn("Supabase assignSubjectToClass error:", err);
    }
  }

  try {
    const updated = [...classSubjects, newMapping];
    localStorage.setItem(
      getClassSubjectsCacheKey(schoolId, academicYearId),
      JSON.stringify(updated)
    );
  } catch {
    // Non-fatal
  }

  return { success: true, classSubject: newMapping };
}

/**
 * Removes a Subject from a Class
 */
export async function removeSubjectFromClass({
  schoolId,
  academicYearId,
  classId,
  subjectId,
}: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("class_subjects")
        .delete()
        .eq("class_id", classId)
        .eq("subject_id", subjectId);
    } catch (err) {
      console.warn("Supabase removeSubjectFromClass error:", err);
    }
  }

  try {
    const { classSubjects } = await getClassSubjects(schoolId, academicYearId);
    const updated = classSubjects.filter(
      (cs) => !(cs.class_id === classId && cs.subject_id === subjectId)
    );
    localStorage.setItem(
      getClassSubjectsCacheKey(schoolId, academicYearId),
      JSON.stringify(updated)
    );
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Assigns a single subject to multiple classes at once
 */
export async function assignSubjectToMultipleClasses({
  schoolId,
  academicYearId,
  subjectId,
  classIds,
}: {
  schoolId: string;
  academicYearId: string;
  subjectId: string;
  classIds: string[];
}): Promise<{ success: boolean; count: number }> {
  let count = 0;
  for (const cId of classIds) {
    const res = await assignSubjectToClass({
      schoolId,
      academicYearId,
      classId: cId,
      subjectId,
    });
    if (res.success) count++;
  }
  return { success: true, count };
}

/**
 * Synchronizes the list of subjects assigned to a class
 */
export async function syncClassSubjects({
  schoolId,
  academicYearId,
  classId,
  selectedSubjectIds,
}: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  selectedSubjectIds: string[];
}): Promise<{ success: boolean; error?: string }> {
  const { classSubjects } = await getClassSubjects(schoolId, academicYearId);
  const currentAssignedIds = classSubjects
    .filter((cs) => cs.class_id === classId)
    .map((cs) => cs.subject_id);

  // Remove unselected
  for (const subId of currentAssignedIds) {
    if (!selectedSubjectIds.includes(subId)) {
      await removeSubjectFromClass({ schoolId, academicYearId, classId, subjectId: subId });
    }
  }

  // Add newly selected
  for (let idx = 0; idx < selectedSubjectIds.length; idx++) {
    const subId = selectedSubjectIds[idx];
    if (!currentAssignedIds.includes(subId)) {
      await assignSubjectToClass({
        schoolId,
        academicYearId,
        classId,
        subjectId: subId,
        sortOrder: idx + 1,
      });
    }
  }

  return { success: true };
}

/**
 * Seeds or imports standard subject presets
 */
export async function importStandardSubjectPresets({
  schoolId,
  academicYearId,
  presets,
}: {
  schoolId: string;
  academicYearId: string;
  presets?: StandardSubjectPreset[];
}): Promise<{ success: boolean; createdCount: number }> {
  const targetPresets = presets || STANDARD_SUBJECT_PRESETS;
  const { subjects: existing } = await getSubjects(schoolId, academicYearId);
  let createdCount = 0;

  for (const p of targetPresets) {
    const exists = existing.some(
      (s) => s.name.trim().toLowerCase() === p.name.trim().toLowerCase()
    );
    if (!exists) {
      await createSubject({
        schoolId,
        academicYearId,
        input: {
          name: p.name,
          code: p.code,
          subject_type: p.subject_type,
        },
      });
      createdCount++;
    }
  }

  return { success: true, createdCount };
}

/**
 * Advances Onboarding from Step 4 (Subjects) to Step 5 (Subscription)
 */
export async function saveSubjectsSetupProgress({
  schoolId,
  userId,
  academicYearId,
  classIds,
}: {
  schoolId: string;
  userId: string;
  academicYearId: string;
  classIds: string[];
}): Promise<{ success: boolean; error?: string }> {
  const { subjects } = await getSubjects(schoolId, academicYearId);

  if (subjects.length === 0) {
    return {
      success: false,
      error: "Please configure at least one subject in your school's curriculum.",
    };
  }

  const { classSubjects } = await getClassSubjects(schoolId, academicYearId);

  // Check that every class has at least one subject
  const unassignedClasses = classIds.filter(
    (cId) => !classSubjects.some((cs) => cs.class_id === cId)
  );

  if (unassignedClasses.length > 0) {
    return {
      success: false,
      error: `Some classes do not have any subjects assigned yet. Please assign subjects to all classes before continuing.`,
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

      const currentStep = currentSchool?.onboarding_step || 4;
      const newStep = Math.max(currentStep, 5);

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
          current_onboarding_step: "/onboarding/subscription",
          updated_at: timestamp,
        })
        .eq("auth_id", userId);

      await supabase.auth.updateUser({
        data: {
          onboarding_step: newStep,
          current_onboarding_step: "/onboarding/subscription",
        },
      });
    } catch (err) {
      console.warn("Supabase progress save error:", err);
    }
  }

  try {
    const schoolKey = `myzkool_school_profile_${userId}`;
    const raw = localStorage.getItem(schoolKey);
    if (raw) {
      const cached = JSON.parse(raw);
      cached.onboarding_step = Math.max(cached.onboarding_step || 4, 5);
      localStorage.setItem(schoolKey, JSON.stringify(cached));
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}
