/**
 * Students Service Layer
 * 
 * Handles:
 * - Student CRUD operations with tenant scoping
 * - Admission wizard transaction
 * - Parent lookup and linking
 * - Document Vault operations
 * - Medical record access (permission-gated)
 * - Aadhaar reveal with audit
 * - Student enrollment management
 * - Drafts autosave
 * - Duplicate detection
 * - Audit logging
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  Student,
  StudentInput,
  StudentUpdateInput,
  StudentAddress,
  StudentAddressInput,
  Parent,
  ParentInput,
  ParentUpdateInput,
  StudentParent,
  StudentParentInput,
  StudentPreviousSchool,
  StudentPreviousSchoolInput,
  StudentAchievement,
  StudentAchievementInput,
  DocumentType,
  DocumentTypeInput,
  StudentDocument,
  StudentDocumentInput,
  StudentMedical,
  StudentMedicalInput,
  StudentEvent,
  StudentEventInput,
  StudentDraft,
  StudentDraftInput,
  StudentTransferCertificate,
  StudentTransferCertificateInput,
  ImportBatch,
  PromotionBatch,
  StudentEnrollment,
  StudentEnrollmentInput,
  Counter,
  AuditLog,
  CommunicationConsent,
  CommunicationConsentInput,
  NotificationOutbox,
  NotificationOutboxInput,
  StudentSibling,
  StudentListParams,
  StudentListResponse,
  StudentListItem,
  StudentProfile,
  DuplicateCheckResult,
  ParentLookupResult,
  AdmissionWizardPayload,
  StudentPermissionKey,
  STUDENT_PERMISSIONS,
  STUDENT_ROLE_PERMISSIONS,
  ParentRelation,
  EnrollmentStatus,
  DocumentRequiredFor,
} from "../types/students";
import type { AcademicYear } from "../types/academic";
import type { SchoolClass, SchoolSection } from "../types/curriculum";

// Local storage fallbacks
const STUDENTS_CACHE_PREFIX = "myzkool_students_";
const PARENTS_CACHE_PREFIX = "myzkool_parents_";
const STUDENT_PARENTS_CACHE_PREFIX = "myzkool_student_parents_";
const STUDENT_ADDRESSES_CACHE_PREFIX = "myzkool_student_addresses_";
const STUDENT_DRAFTS_CACHE_PREFIX = "myzkool_student_drafts_";
const STUDENT_DOCUMENTS_CACHE_PREFIX = "myzkool_student_documents_";
const STUDENT_EVENTS_CACHE_PREFIX = "myzkool_student_events_";
const STUDENT_ENROLLMENTS_CACHE_PREFIX = "myzkool_student_enrollments_";
const COUNTERS_CACHE_PREFIX = "myzkool_counters_";
const AUDIT_LOGS_CACHE_PREFIX = "myzkool_audit_logs_";
const COMMUNICATION_CONSENTS_CACHE_PREFIX = "myzkool_communication_consents_";
const NOTIFICATION_OUTBOX_CACHE_PREFIX = "myzkool_notification_outbox_";

function getStudentsCacheKey(schoolId: string) {
  return `${STUDENTS_CACHE_PREFIX}${schoolId}`;
}

function getParentsCacheKey(schoolId: string) {
  return `${PARENTS_CACHE_PREFIX}${schoolId}`;
}

function getStudentParentsCacheKey(schoolId: string) {
  return `${STUDENT_PARENTS_CACHE_PREFIX}${schoolId}`;
}

function getStudentAddressesCacheKey(schoolId: string) {
  return `${STUDENT_ADDRESSES_CACHE_PREFIX}${schoolId}`;
}

function getStudentDraftsCacheKey(userId: string) {
  return `${STUDENT_DRAFTS_CACHE_PREFIX}${userId}`;
}

function getStudentDocumentsCacheKey(schoolId: string) {
  return `${STUDENT_DOCUMENTS_CACHE_PREFIX}${schoolId}`;
}

function getStudentEventsCacheKey(schoolId: string) {
  return `${STUDENT_EVENTS_CACHE_PREFIX}${schoolId}`;
}

function getStudentEnrollmentsCacheKey(schoolId: string) {
  return `${STUDENT_ENROLLMENTS_CACHE_PREFIX}${schoolId}`;
}

function getCountersCacheKey(schoolId: string) {
  return `${COUNTERS_CACHE_PREFIX}${schoolId}`;
}

function getAuditLogsCacheKey(schoolId: string) {
  return `${AUDIT_LOGS_CACHE_PREFIX}${schoolId}`;
}

function getCommunicationConsentsCacheKey(schoolId: string) {
  return `${COMMUNICATION_CONSENTS_CACHE_PREFIX}${schoolId}`;
}

function getNotificationOutboxCacheKey(schoolId: string) {
  return `${NOTIFICATION_OUTBOX_CACHE_PREFIX}${schoolId}`;
}

/**
 * Get current school ID from auth context
 * In a real app, this would come from the authenticated user's profile
 */
async function getCurrentSchoolId(): Promise<string | null> {
  if (!isSupabaseConfigured) {
    // For local development, try to get from localStorage
    try {
      const schoolId = localStorage.getItem("myzkool_current_school_id");
      return schoolId;
    } catch {
      return null;
    }
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("auth_id", user.id)
      .single();
    
    return profile?.school_id || null;
  } catch {
    return null;
  }
}

/**
 * Check if current user has a specific permission
 */
async function hasPermission(permission: StudentPermissionKey): Promise<boolean> {
  if (!isSupabaseConfigured) {
    // For local development, check localStorage
    try {
      const permissions = JSON.parse(localStorage.getItem("myzkool_user_permissions") || "[]");
      return permissions.includes(permission);
    } catch {
      return false;
    }
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, school_id")
      .eq("auth_id", user.id)
      .single();
    
    if (!profile) return false;
    
    const rolePermissions = STUDENT_ROLE_PERMISSIONS[profile.role] || [];
    return rolePermissions.includes(permission);
  } catch {
    return false;
  }
}

/**
 * Get next counter value (gap-free sequence)
 */
export async function getNextCounter(schoolId: string, key: string): Promise<{ value: number; error?: string }> {
  if (!schoolId || !key) {
    return { value: 0, error: "school_id and key are required" };
  }

  if (isSupabaseConfigured) {
    try {
      // Use a transaction-like approach with SELECT FOR UPDATE
      const { data, error } = await supabase.rpc("get_next_counter", {
        p_school_id: schoolId,
        p_key: key,
      });
      
      if (!error && data !== null) {
        return { value: data };
      }
    } catch {
      // Fall through to local storage
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getCountersCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const counters: Record<string, number> = cached ? JSON.parse(cached) : {};
    const nextValue = (counters[key] || 1);
    counters[key] = nextValue + 1;
    localStorage.setItem(cacheKey, JSON.stringify(counters));
    return { value: nextValue };
  } catch {
    return { value: 0, error: "Failed to get next counter value" };
  }
}

/**
 * Create a new student (used by admission wizard)
 */
export async function createStudent(
  schoolId: string,
  input: StudentInput,
  actorId: string,
  actorRole: string
): Promise<{ student?: Student; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  // Check permission
  const canWrite = await hasPermission("students.write");
  if (!canWrite) {
    return { error: "Insufficient permissions to create student" };
  }

  // Get admission number from counter
  const { value: admissionNo, error: counterError } = await getNextCounter(schoolId, "admission_no");
  if (counterError) {
    return { error: counterError };
  }

  const timestamp = new Date().toISOString();
  const admissionNoStr = `ADM/${new Date().getFullYear()}/${String(admissionNo).padStart(4, "0")}`;

  const newStudent: Student = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    admission_no: admissionNoStr,
    ...input,
    nationality: input.nationality || "Indian",
    is_rte: input.is_rte ?? false,
    status: "enrolled",
    created_at: timestamp,
    updated_at: timestamp,
    created_by: actorId,
    updated_by: actorId,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("students")
        .insert(newStudent)
        .select()
        .single();

      if (!error && data) {
        // Log audit
        await logAudit({
          school_id: schoolId,
          actor_id: actorId,
          actor_role: actorRole,
          entity_type: "student",
          entity_id: data.id,
          action: "create",
          after: data as unknown as Record<string, unknown>,
          reason: "Student admitted via wizard",
        });

        return { student: data as Student };
      }
      return { error: error?.message || "Failed to create student" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const students: Student[] = cached ? JSON.parse(cached) : [];
    students.push(newStudent);
    localStorage.setItem(cacheKey, JSON.stringify(students));
    return { student: newStudent };
  } catch {
    return { error: "Failed to create student" };
  }
}

/**
 * Get student by ID
 */
export async function getStudentById(
  schoolId: string,
  studentId: string
): Promise<{ student?: Student; error?: string }> {
  if (!schoolId || !studentId) {
    return { error: "school_id and student_id are required" };
  }

  // Check permission
  const canRead = await hasPermission("students.read");
  if (!canRead) {
    return { error: "Insufficient permissions to view student" };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .eq("school_id", schoolId)
        .single();

      if (!error && data) {
        return { student: data as Student };
      }
      return { error: error?.message || "Student not found" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const students: Student[] = cached ? JSON.parse(cached) : [];
    const student = students.find(s => s.id === studentId);
    if (student) {
      return { student };
    }
    return { error: "Student not found" };
  } catch {
    return { error: "Failed to get student" };
  }
}

/**
 * List students with filters, search, and pagination
 */
export async function listStudents(
  schoolId: string,
  params: StudentListParams = {}
): Promise<{ response?: StudentListResponse; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  // Check permission
  const canRead = await hasPermission("students.read");
  if (!canRead) {
    return { error: "Insufficient permissions to list students" };
  }

  const {
    search,
    class_id,
    section_id,
    status,
    gender,
    category,
    is_rte,
    has_dues,
    uses_transport,
    documents_pending,
    admission_year,
    limit = 50,
    cursor,
    sort_by = "created_at",
    sort_order = "desc",
    userRole,
    teacherSectionIds,
    parentStudentIds,
  } = params;

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("students")
        .select(`
          *,
          student_enrollments!inner (
            class_id,
            section_id,
            class:classes(name),
            section:sections(name)
          ),
          student_parents!inner (
            parent:parents(full_name, phone),
            is_primary_contact
          )
        `)
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .order(sort_by, { ascending: sort_order === "asc" })
        .limit(limit + 1); // +1 to check if there are more

      // Role scoping (Spec A6 Rule 11)
      if (userRole === "teacher" && teacherSectionIds) {
        query = query.in("student_enrollments.section_id", teacherSectionIds);
      } else if (userRole === "parent" && parentStudentIds) {
        query = query.in("id", parentStudentIds);
      }

      // Apply filters
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,admission_no.ilike.%${search}%,sr_no.ilike.%${search}%`);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (gender) {
        query = query.eq("gender", gender);
      }
      if (category) {
        query = query.eq("category", category);
      }
      if (is_rte !== undefined) {
        query = query.eq("is_rte", is_rte);
      }
      if (class_id) {
        query = query.eq("student_enrollments.class_id", class_id);
      }
      if (section_id) {
        query = query.eq("student_enrollments.section_id", section_id);
      }

      // Cursor pagination
      if (cursor) {
        const cursorDate = new Date(cursor);
        if (sort_order === "desc") {
          query = query.lt("created_at", cursorDate.toISOString());
        } else {
          query = query.gt("created_at", cursorDate.toISOString());
        }
      }

      const { data, error } = await query;

      if (!error && data) {
        const hasMore = data.length > limit;
        const items = hasMore ? data.slice(0, limit) : data;
        
        const mappedItems: StudentListItem[] = items.map((item: any) => ({
          id: item.id,
          admission_no: item.admission_no,
          first_name: item.first_name,
          last_name: item.last_name,
          middle_name: item.middle_name,
          dob: item.dob,
          gender: item.gender,
          photo_path: item.photo_path,
          class_id: item.student_enrollments?.[0]?.class_id,
          class_name: item.student_enrollments?.[0]?.class?.name,
          section_id: item.student_enrollments?.[0]?.section_id,
          section_name: item.student_enrollments?.[0]?.section?.name,
          primary_parent_name: item.student_parents?.find((sp: any) => sp.is_primary_contact)?.parent?.full_name,
          primary_parent_phone: item.student_parents?.find((sp: any) => sp.is_primary_contact)?.parent?.phone,
          fee_status: null, // Populated by FeeService
          transport_route: null, // Populated by TransportService
          documents_pending_count: 0,
          status: item.status,
        }));

        return {
          response: {
            data: mappedItems,
            next_cursor: hasMore ? items[items.length - 1].created_at : null,
            total_estimate: items.length,
          },
        };
      }
      return { error: error?.message || "Failed to list students" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    let students: Student[] = cached ? JSON.parse(cached) : [];
    
    // Role scoping (Spec A6 Rule 11)
    if (userRole === "teacher") {
      const enrollmentsKey = getStudentEnrollmentsCacheKey(schoolId);
      const enrCached = localStorage.getItem(enrollmentsKey);
      const enrollments: StudentEnrollment[] = enrCached ? JSON.parse(enrCached) : [];
      const allowedStudentIds = enrollments
        .filter(e => teacherSectionIds ? teacherSectionIds.includes(e.section_id || "") : false)
        .map(e => e.student_id);
      students = students.filter(s => allowedStudentIds.includes(s.id));
    } else if (userRole === "parent") {
      students = students.filter(s => parentStudentIds ? parentStudentIds.includes(s.id) : false);
    }

    // Apply filters
    students = students.filter(s => !s.deleted_at);
    if (search) {
      const searchLower = search.toLowerCase();
      // Also check parent phone numbers
      const spKey = getStudentParentsCacheKey(schoolId);
      const pKey = getParentsCacheKey(schoolId);
      const spCached = localStorage.getItem(spKey);
      const pCached = localStorage.getItem(pKey);
      const studentParents: StudentParent[] = spCached ? JSON.parse(spCached) : [];
      const parents: Parent[] = pCached ? JSON.parse(pCached) : [];
      
      const phoneMatchingStudentIds = new Set<string>();
      for (const p of parents) {
        if (p.phone && p.phone.includes(searchLower)) {
          studentParents.filter(sp => sp.parent_id === p.id).forEach(sp => phoneMatchingStudentIds.add(sp.student_id));
        }
      }

      students = students.filter(s => 
        s.first_name.toLowerCase().includes(searchLower) ||
        s.last_name.toLowerCase().includes(searchLower) ||
        s.admission_no.toLowerCase().includes(searchLower) ||
        (s.sr_no && s.sr_no.toLowerCase().includes(searchLower)) ||
        phoneMatchingStudentIds.has(s.id)
      );
    }
    if (status) {
      students = students.filter(s => s.status === status);
    }
    if (gender) {
      students = students.filter(s => s.gender === gender);
    }
    if (category) {
      students = students.filter(s => s.category === category);
    }
    if (is_rte !== undefined) {
      students = students.filter(s => s.is_rte === is_rte);
    }

    // Sort
    students.sort((a, b) => {
      const aVal = a[sort_by as keyof Student];
      const bVal = b[sort_by as keyof Student];
      if (aVal < bVal) return sort_order === "asc" ? -1 : 1;
      if (aVal > bVal) return sort_order === "asc" ? 1 : -1;
      return 0;
    });

    // Cursor pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      students = students.filter(s => {
        const createdAt = new Date(s.created_at);
        return sort_order === "desc" ? createdAt < cursorDate : createdAt > cursorDate;
      });
    }

    const hasMore = students.length > limit;
    const items = hasMore ? students.slice(0, limit) : students;

    // Hydrate enrollment and parent info
    const enrKey = getStudentEnrollmentsCacheKey(schoolId);
    const enrCached = localStorage.getItem(enrKey);
    const enrollments: StudentEnrollment[] = enrCached ? JSON.parse(enrCached) : [];

    const spKey = getStudentParentsCacheKey(schoolId);
    const pKey = getParentsCacheKey(schoolId);
    const spCached = localStorage.getItem(spKey);
    const pCached = localStorage.getItem(pKey);
    const studentParents: StudentParent[] = spCached ? JSON.parse(spCached) : [];
    const parents: Parent[] = pCached ? JSON.parse(pCached) : [];

    const mappedItems: StudentListItem[] = items.map(item => {
      const enr = enrollments.find(e => e.student_id === item.id && e.status === "active");
      const sp = studentParents.find(p => p.student_id === item.id && p.is_primary_contact);
      const parent = sp ? parents.find(p => p.id === sp.parent_id) : null;

      return {
        id: item.id,
        admission_no: item.admission_no,
        first_name: item.first_name,
        last_name: item.last_name,
        middle_name: item.middle_name,
        dob: item.dob,
        gender: item.gender,
        photo_path: item.photo_path,
        class_id: enr?.class_id || null,
        class_name: null,
        section_id: enr?.section_id || null,
        section_name: null,
        primary_parent_name: parent?.full_name || null,
        primary_parent_phone: parent?.phone || null,
        fee_status: null,
        transport_route: null,
        documents_pending_count: 0,
        status: item.status,
      };
    });

    return {
      response: {
        data: mappedItems,
        next_cursor: hasMore ? items[items.length - 1].created_at : null,
        total_estimate: students.length,
      },
    };
  } catch {
    return { error: "Failed to list students" };
  }
}

/**
 * Update student (field-level, audited)
 */
export async function updateStudent(
  schoolId: string,
  studentId: string,
  input: StudentUpdateInput,
  actorId: string,
  actorRole: string
): Promise<{ student?: Student; error?: string }> {
  if (!schoolId || !studentId) {
    return { error: "school_id and student_id are required" };
  }

  // Check permission
  const canWrite = await hasPermission("students.write");
  if (!canWrite) {
    return { error: "Insufficient permissions to update student" };
  }

  // Get current student for audit
  const { student: currentStudent, error: getError } = await getStudentById(schoolId, studentId);
  if (getError || !currentStudent) {
    return { error: getError || "Student not found" };
  }

  const timestamp = new Date().toISOString();
  const updatedStudent: Student = {
    ...currentStudent,
    ...input,
    updated_at: timestamp,
    updated_by: actorId,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("students")
        .update(updatedStudent)
        .eq("id", studentId)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (!error && data) {
        // Log audit
        await logAudit({
          school_id: schoolId,
          actor_id: actorId,
          actor_role: actorRole,
          entity_type: "student",
          entity_id: studentId,
          action: "update",
          before: currentStudent as unknown as Record<string, unknown>,
          after: data as unknown as Record<string, unknown>,
          reason: "Student profile updated",
        });

        return { student: data as Student };
      }
      return { error: error?.message || "Failed to update student" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const students: Student[] = cached ? JSON.parse(cached) : [];
    const index = students.findIndex(s => s.id === studentId);
    if (index !== -1) {
      students[index] = updatedStudent;
      localStorage.setItem(cacheKey, JSON.stringify(students));
      await logAudit({
        school_id: schoolId,
        actor_id: actorId,
        actor_role: actorRole,
        entity_type: "student",
        entity_id: studentId,
        action: "update",
        before: currentStudent as unknown as Record<string, unknown>,
        after: updatedStudent as unknown as Record<string, unknown>,
        reason: "Student profile updated",
      });
      return { student: updatedStudent };
    }
    return { error: "Student not found" };
  } catch {
    return { error: "Failed to update student" };
  }
}

/**
 * Check for duplicate students (by name, DOB, or Aadhaar hash)
 */
export async function checkDuplicateStudent(
  schoolId: string,
  firstName: string,
  lastName: string,
  dob: string,
  aadhaarHash?: string
): Promise<{ result?: DuplicateCheckResult; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("students")
        .select("id, admission_no, first_name, last_name, dob, status")
        .eq("school_id", schoolId)
        .is("deleted_at", null);

      // Build OR condition for duplicate check
      const conditions = [
        `first_name.ilike.${firstName}`,
        `last_name.ilike.${lastName}`,
        `dob.eq.${dob}`,
      ];
      
      if (aadhaarHash) {
        conditions.push(`aadhaar_hash.eq.${aadhaarHash}`);
      }

      query = query.or(conditions.join(","));

      const { data, error } = await query;

      if (!error && data) {
        return {
          result: {
            is_duplicate: data.length > 0,
            matches: data.map((item: any) => ({
              id: item.id,
              admission_no: item.admission_no,
              first_name: item.first_name,
              last_name: item.last_name,
              dob: item.dob,
              status: item.status,
            })),
          },
        };
      }
      return { error: error?.message || "Failed to check duplicates" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const students: Student[] = cached ? JSON.parse(cached) : [];
    
    const matches = students.filter(s => 
      !s.deleted_at &&
      s.first_name.toLowerCase() === firstName.toLowerCase() &&
      s.last_name.toLowerCase() === lastName.toLowerCase() &&
      s.dob === dob
    );

    return {
      result: {
        is_duplicate: matches.length > 0,
        matches: matches.map(m => ({
          id: m.id,
          admission_no: m.admission_no,
          first_name: m.first_name,
          last_name: m.last_name,
          dob: m.dob,
          status: m.status,
        })),
      },
    };
  } catch {
    return { error: "Failed to check duplicates" };
  }
}

/**
 * Lookup parent by phone
 */
export async function lookupParentByPhone(
  schoolId: string,
  phone: string
): Promise<{ result?: ParentLookupResult; error?: string }> {
  if (!schoolId || !phone) {
    return { error: "school_id and phone are required" };
  }

  // Normalize phone (remove +91, spaces, etc.)
  const normalizedPhone = phone.replace(/\D/g, "").slice(-10);

  if (isSupabaseConfigured) {
    try {
      const { data: parent, error } = await supabase
        .from("parents")
        .select("*")
        .eq("school_id", schoolId)
        .eq("phone", normalizedPhone)
        .is("deleted_at", null)
        .single();

      if (!error && parent) {
        // Get linked students
        const { data: linkedStudents } = await supabase
          .from("student_parents")
          .select(`
            student:students(id, first_name, last_name, admission_no),
            student_enrollments!inner(class:classes(name))
          `)
          .eq("parent_id", parent.id);

        return {
          result: {
            found: true,
            parent: parent as Parent,
            linked_students: linkedStudents?.map((ls: any) => ({
              id: ls.student.id,
              first_name: ls.student.first_name,
              last_name: ls.student.last_name,
              class_name: ls.student_enrollments?.[0]?.class?.name,
            })) || [],
          },
        };
      }

      return { result: { found: false } };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getParentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const parents: Parent[] = cached ? JSON.parse(cached) : [];
    
    const parent = parents.find(p => !p.deleted_at && p.phone === normalizedPhone);
    if (parent) {
      return { result: { found: true, parent, linked_students: [] } };
    }
    return { result: { found: false } };
  } catch {
    return { error: "Failed to lookup parent" };
  }
}

/**
 * Create or link parent
 */
export async function createOrLinkParent(
  schoolId: string,
  input: ParentInput,
  actorId: string
): Promise<{ parent?: Parent; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  // Normalize phone
  const normalizedPhone = input.phone.replace(/\D/g, "").slice(-10);

  // Check if parent already exists
  const { result: lookup } = await lookupParentByPhone(schoolId, normalizedPhone);
  if (lookup?.found && lookup.parent) {
    return { parent: lookup.parent };
  }

  // Create new parent
  const timestamp = new Date().toISOString();
  const newParent: Parent = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    ...input,
    phone: normalizedPhone,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("parents")
        .insert(newParent)
        .select()
        .single();

      if (!error && data) {
        return { parent: data as Parent };
      }
      return { error: error?.message || "Failed to create parent" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getParentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const parents: Parent[] = cached ? JSON.parse(cached) : [];
    parents.push(newParent);
    localStorage.setItem(cacheKey, JSON.stringify(parents));
    return { parent: newParent };
  } catch {
    return { error: "Failed to create parent" };
  }
}

/**
 * Link student to parent
 */
export async function linkStudentParent(
  schoolId: string,
  input: StudentParentInput,
  actorId: string
): Promise<{ link?: StudentParent; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  const timestamp = new Date().toISOString();
  const newLink: StudentParent = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: input.student_id,
    parent_id: input.parent_id,
    relation: input.relation,
    is_primary_contact: input.is_primary_contact ?? false,
    is_fee_payer: input.is_fee_payer ?? false,
    is_emergency_contact: input.is_emergency_contact ?? false,
    can_pickup: input.can_pickup ?? false,
    lives_with: input.lives_with ?? true,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_parents")
        .insert(newLink)
        .select()
        .single();

      if (!error && data) {
        return { link: data as StudentParent };
      }
      return { error: error?.message || "Failed to link parent" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentParentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const links: StudentParent[] = cached ? JSON.parse(cached) : [];
    links.push(newLink);
    localStorage.setItem(cacheKey, JSON.stringify(links));
    return { link: newLink };
  } catch {
    return { error: "Failed to link parent" };
  }
}

/**
 * Get student profile with all related data
 */
export async function getStudentProfile(
  schoolId: string,
  studentId: string
): Promise<{ profile?: StudentProfile; error?: string }> {
  if (!schoolId || !studentId) {
    return { error: "school_id and student_id are required" };
  }

  // Check permission
  const canRead = await hasPermission("students.read");
  if (!canRead) {
    return { error: "Insufficient permissions to view student profile" };
  }

  // Get base student
  const { student, error: studentError } = await getStudentById(schoolId, studentId);
  if (studentError || !student) {
    return { error: studentError || "Student not found" };
  }

  // Fetch all related data in parallel
  const [
    addressesRes,
    parentsRes,
    previousSchoolsRes,
    achievementsRes,
    documentsRes,
    medicalRes,
    eventsRes,
    enrollmentsRes,
    siblingsRes,
  ] = await Promise.all([
    getStudentAddresses(schoolId, studentId),
    getStudentParents(schoolId, studentId),
    getStudentPreviousSchools(schoolId, studentId),
    getStudentAchievements(schoolId, studentId),
    getStudentDocuments(schoolId, studentId),
    getStudentMedical(schoolId, studentId),
    getStudentEvents(schoolId, studentId),
    getStudentEnrollments(schoolId, studentId),
    getStudentSiblings(schoolId, studentId),
  ]);

  const profile: StudentProfile = {
    ...student,
    addresses: addressesRes.addresses || [],
    parents: parentsRes.parents || [],
    previous_schools: previousSchoolsRes.previousSchools || [],
    achievements: achievementsRes.achievements || [],
    documents: documentsRes.documents || [],
    medical: medicalRes.medical || null,
    events: eventsRes.events || [],
    enrollments: enrollmentsRes.enrollments || [],
    siblings: siblingsRes.siblings || [],
  };

  return { profile };
}

// Helper functions for related data
async function getStudentAddresses(schoolId: string, studentId: string): Promise<{ addresses?: StudentAddress[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_addresses")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId);
      return { addresses: data as StudentAddress[] || [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }
  try {
    const cacheKey = getStudentAddressesCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const addresses: StudentAddress[] = cached ? JSON.parse(cached) : [];
    return { addresses: addresses.filter(a => a.student_id === studentId) };
  } catch {
    return { addresses: [] };
  }
}

async function getStudentParents(schoolId: string, studentId: string): Promise<{ parents?: (Parent & { relation: ParentRelation; is_primary_contact: boolean; is_fee_payer: boolean; is_emergency_contact: boolean; can_pickup: boolean; lives_with: boolean })[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_parents")
        .select(`
          *,
          parent:parents(*)
        `)
        .eq("school_id", schoolId)
        .eq("student_id", studentId);
      
      if (!error && data) {
        return { 
          parents: data.map((sp: any) => ({
            ...sp.parent,
            relation: sp.relation,
            is_primary_contact: sp.is_primary_contact,
            is_fee_payer: sp.is_fee_payer,
            is_emergency_contact: sp.is_emergency_contact,
            can_pickup: sp.can_pickup,
            lives_with: sp.lives_with,
          }))
        };
      }
      return { parents: [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }
  try {
    const cacheKey = getStudentParentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const links: StudentParent[] = cached ? JSON.parse(cached) : [];
    const parentCacheKey = getParentsCacheKey(schoolId);
    const parentCached = localStorage.getItem(parentCacheKey);
    const parents: Parent[] = parentCached ? JSON.parse(parentCached) : [];
    
    const studentLinks = links.filter(l => l.student_id === studentId);
    const result = studentLinks.map(l => {
      const parent = parents.find(p => p.id === l.parent_id);
      return {
        ...parent!,
        relation: l.relation,
        is_primary_contact: l.is_primary_contact,
        is_fee_payer: l.is_fee_payer,
        is_emergency_contact: l.is_emergency_contact,
        can_pickup: l.can_pickup,
        lives_with: l.lives_with,
      };
    }).filter(Boolean);
    return { parents: result };
  } catch {
    return { parents: [] };
  }
}

async function getStudentPreviousSchools(schoolId: string, studentId: string): Promise<{ previousSchools?: StudentPreviousSchool[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_previous_schools")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId);
      return { previousSchools: data as StudentPreviousSchool[] || [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }
  return { previousSchools: [] };
}

async function getStudentAchievements(schoolId: string, studentId: string): Promise<{ achievements?: StudentAchievement[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_achievements")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId);
      return { achievements: data as StudentAchievement[] || [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }
  return { achievements: [] };
}

async function getStudentDocuments(schoolId: string, studentId: string): Promise<{ documents?: StudentDocument[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_documents")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId);
      return { documents: data as StudentDocument[] || [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }
  try {
    const cacheKey = getStudentDocumentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const documents: StudentDocument[] = cached ? JSON.parse(cached) : [];
    return { documents: documents.filter(d => d.student_id === studentId) };
  } catch {
    return { documents: [] };
  }
}

async function getStudentMedical(schoolId: string, studentId: string): Promise<{ medical?: StudentMedical | null; error?: string }> {
  // Check medical read permission
  const canReadMedical = await hasPermission("students.medical.read");
  if (!canReadMedical) {
    return { medical: null };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_medical")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .single();
      return { medical: data as StudentMedical || null, error: error?.message };
    } catch (err) {
      return { medical: null };
    }
  }
  return { medical: null };
}

async function getStudentEvents(schoolId: string, studentId: string): Promise<{ events?: StudentEvent[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_events")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      return { events: data as StudentEvent[] || [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }
  try {
    const cacheKey = getStudentEventsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const events: StudentEvent[] = cached ? JSON.parse(cached) : [];
    return { events: events.filter(e => e.student_id === studentId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) };
  } catch {
    return { events: [] };
  }
}

async function getStudentEnrollments(schoolId: string, studentId: string): Promise<{ enrollments?: StudentEnrollment[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_enrollments")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId);
      return { enrollments: data as StudentEnrollment[] || [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }
  try {
    const cacheKey = getStudentEnrollmentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const enrollments: StudentEnrollment[] = cached ? JSON.parse(cached) : [];
    return { enrollments: enrollments.filter(e => e.student_id === studentId) };
  } catch {
    return { enrollments: [] };
  }
}

export async function getStudentSiblings(schoolId: string, studentId: string): Promise<{ siblings?: StudentSibling[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("v_student_siblings")
        .select("*")
        .eq("student_id", studentId);
      return { siblings: data as StudentSibling[] || [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }
  try {
    const spKey = getStudentParentsCacheKey(schoolId);
    const spCached = localStorage.getItem(spKey);
    const studentParents: StudentParent[] = spCached ? JSON.parse(spCached) : [];
    const myParentIds = studentParents.filter(sp => sp.student_id === studentId).map(sp => sp.parent_id);
    if (myParentIds.length === 0) return { siblings: [] };
    
    const siblingStudentIds = studentParents
      .filter(sp => sp.student_id !== studentId && myParentIds.includes(sp.parent_id))
      .map(sp => sp.student_id);
      
    const studentsKey = getStudentsCacheKey(schoolId);
    const studentsCached = localStorage.getItem(studentsKey);
    const students: Student[] = studentsCached ? JSON.parse(studentsCached) : [];
    
    const siblings: StudentSibling[] = students
      .filter(s => siblingStudentIds.includes(s.id) && !s.deleted_at)
      .map(s => ({
        student_id: studentId,
        sibling_id: s.id,
        sibling_first_name: s.first_name,
        sibling_last_name: s.last_name,
        sibling_admission_no: s.admission_no,
      }));
    return { siblings };
  } catch {
    return { siblings: [] };
  }
}

/**
 * Create student enrollment
 */
export async function createStudentEnrollment(
  schoolId: string,
  input: StudentEnrollmentInput,
  actorId: string
): Promise<{ enrollment?: StudentEnrollment; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  const timestamp = new Date().toISOString();
  const newEnrollment: StudentEnrollment = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    ...input,
    status: input.status || "active",
    enrolled_on: input.enrolled_on || new Date().toISOString().split("T")[0],
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_enrollments")
        .insert(newEnrollment)
        .select()
        .single();

      if (!error && data) {
        return { enrollment: data as StudentEnrollment };
      }
      return { error: error?.message || "Failed to create enrollment" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentEnrollmentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const enrollments: StudentEnrollment[] = cached ? JSON.parse(cached) : [];
    enrollments.push(newEnrollment);
    localStorage.setItem(cacheKey, JSON.stringify(enrollments));
    return { enrollment: newEnrollment };
  } catch {
    return { error: "Failed to create enrollment" };
  }
}

/**
 * Log audit entry
 */
export async function logAudit(input: Omit<AuditLog, "id" | "created_at">): Promise<{ success: boolean; error?: string }> {
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    ...input,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("audit_logs")
        .insert(auditLog);
      
      if (!error) {
        return { success: true };
      }
      return { success: false, error: error.message };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const schoolId = input.school_id;
    const cacheKey = getAuditLogsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const logs: AuditLog[] = cached ? JSON.parse(cached) : [];
    logs.push(auditLog);
    localStorage.setItem(cacheKey, JSON.stringify(logs));
    return { success: true };
  } catch {
    return { success: false, error: "Failed to log audit" };
  }
}

/**
 * Save student draft (wizard autosave)
 */
export async function saveStudentDraft(
  schoolId: string,
  userId: string,
  input: StudentDraftInput
): Promise<{ draft?: StudentDraft; error?: string }> {
  if (!schoolId || !userId) {
    return { error: "school_id and user_id are required" };
  }

  const timestamp = new Date().toISOString();
  const draft: StudentDraft = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    created_by: userId,
    ...input,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_drafts")
        .upsert(draft, { onConflict: "school_id,created_by" })
        .select()
        .single();

      if (!error && data) {
        return { draft: data as StudentDraft };
      }
      return { error: error?.message || "Failed to save draft" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentDraftsCacheKey(userId);
    const cached = localStorage.getItem(cacheKey);
    const drafts: StudentDraft[] = cached ? JSON.parse(cached) : [];
    const existingIndex = drafts.findIndex(d => d.school_id === schoolId && d.created_by === userId);
    if (existingIndex !== -1) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }
    localStorage.setItem(cacheKey, JSON.stringify(drafts));
    return { draft };
  } catch {
    return { error: "Failed to save draft" };
  }
}

/**
 * Get student draft
 */
export async function getStudentDraft(
  schoolId: string,
  userId: string
): Promise<{ draft?: StudentDraft; error?: string }> {
  if (!schoolId || !userId) {
    return { error: "school_id and user_id are required" };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_drafts")
        .select("*")
        .eq("school_id", schoolId)
        .eq("created_by", userId)
        .single();

      if (!error && data) {
        return { draft: data as StudentDraft };
      }
      return { draft: undefined };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentDraftsCacheKey(userId);
    const cached = localStorage.getItem(cacheKey);
    const drafts: StudentDraft[] = cached ? JSON.parse(cached) : [];
    const draft = drafts.find(d => d.school_id === schoolId && d.created_by === userId);
    return { draft };
  } catch {
    return { error: "Failed to get draft" };
  }
}

/**
 * Delete student draft
 */
export async function deleteStudentDraft(
  schoolId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !userId) {
    return { success: false, error: "school_id and user_id are required" };
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("student_drafts")
        .delete()
        .eq("school_id", schoolId)
        .eq("created_by", userId);
      
      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentDraftsCacheKey(userId);
    const cached = localStorage.getItem(cacheKey);
    const drafts: StudentDraft[] = cached ? JSON.parse(cached) : [];
    const filtered = drafts.filter(d => !(d.school_id === schoolId && d.created_by === userId));
    localStorage.setItem(cacheKey, JSON.stringify(filtered));
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete draft" };
  }
}

/**
 * Reveal Aadhaar (with permission and audit)
 */
export async function revealAadhaar(
  schoolId: string,
  studentId: string,
  reason: string,
  actorId: string,
  actorRole: string
): Promise<{ aadhaar?: string; error?: string }> {
  if (!schoolId || !studentId || !reason) {
    return { error: "school_id, student_id, and reason are required" };
  }

  // Check permission
  const canReveal = await hasPermission("students.reveal_sensitive");
  if (!canReveal) {
    return { error: "Insufficient permissions to reveal Aadhaar" };
  }

  const { student, error } = await getStudentById(schoolId, studentId);
  if (error || !student) {
    return { error: error || "Student not found" };
  }

  if (!student.aadhaar_enc) {
    return { error: "No Aadhaar on record" };
  }

  // In a real implementation, decrypt the Aadhaar here
  // For now, return masked version
  const maskedAadhaar = `XXXX XXXX ${student.aadhaar_last4 || "1234"}`;

  // Log audit
  await logAudit({
    school_id: schoolId,
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: "student",
    entity_id: studentId,
    action: "reveal_aadhaar",
    before: { aadhaar_last4: student.aadhaar_last4 },
    after: { revealed: true, reason },
    reason,
  });

  return { aadhaar: maskedAadhaar };
}

/**
 * Get document types for a school
 */
export async function getDocumentTypes(schoolId: string): Promise<{ types?: DocumentType[]; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("document_types")
        .select("*")
        .eq("school_id", schoolId)
        .order("display_order");
      
      return { types: data as DocumentType[] || [], error: error?.message };
    } catch (err) {
      return { error: String(err) };
    }
  }

  return { types: [] };
}

/**
 * Create document type
 */
export async function createDocumentType(
  schoolId: string,
  input: DocumentTypeInput,
  actorId: string
): Promise<{ type?: DocumentType; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  const timestamp = new Date().toISOString();
  const newType: DocumentType = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    ...input,
    is_required: input.is_required ?? false,
    display_order: input.display_order ?? 0,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("document_types")
        .insert(newType)
        .select()
        .single();

      if (!error && data) {
        return { type: data as DocumentType };
      }
      return { error: error?.message || "Failed to create document type" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  return { type: newType };
}

/**
 * Upload student document
 */
export async function uploadStudentDocument(
  schoolId: string,
  studentId: string,
  input: StudentDocumentInput,
  actorId: string
): Promise<{ document?: StudentDocument; error?: string }> {
  if (!schoolId || !studentId) {
    return { error: "school_id and student_id are required" };
  }

  // Check permission
  const canManage = await hasPermission("students.documents.manage");
  if (!canManage) {
    return { error: "Insufficient permissions to manage documents" };
  }

  const timestamp = new Date().toISOString();
  const document: StudentDocument = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: studentId,
    ...input,
    uploaded_by: actorId,
    uploaded_at: timestamp,
    status: input.status || "uploaded",
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_documents")
        .insert(document)
        .select()
        .single();

      if (!error && data) {
        // Log audit
        await logAudit({
          school_id: schoolId,
          actor_id: actorId,
          actor_role: "staff",
          entity_type: "student_document",
          entity_id: data.id,
          action: "create",
          after: data as unknown as Record<string, unknown>,
          reason: "Document uploaded",
        });
        return { document: data as StudentDocument };
      }
      return { error: error?.message || "Failed to upload document" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentDocumentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const documents: StudentDocument[] = cached ? JSON.parse(cached) : [];
    documents.push(document);
    localStorage.setItem(cacheKey, JSON.stringify(documents));
    return { document };
  } catch {
    return { error: "Failed to upload document" };
  }
}

/**
 * Verify or reject document
 */
export async function verifyStudentDocument(
  schoolId: string,
  documentId: string,
  action: "verify" | "reject",
  actorId: string,
  rejectionReason?: string
): Promise<{ document?: StudentDocument; error?: string }> {
  if (!schoolId || !documentId) {
    return { error: "school_id and document_id are required" };
  }

  // Check permission
  const canManage = await hasPermission("students.documents.manage");
  if (!canManage) {
    return { error: "Insufficient permissions to verify/reject documents" };
  }

  const timestamp = new Date().toISOString();
  const updates: Partial<StudentDocument> = {
    updated_at: timestamp,
    verified_by: actorId,
    verified_at: timestamp,
  };

  if (action === "verify") {
    updates.status = "verified";
  } else {
    updates.status = "rejected";
    updates.rejection_reason = rejectionReason;
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_documents")
        .update(updates)
        .eq("id", documentId)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (!error && data) {
        // Log audit
        await logAudit({
          school_id: schoolId,
          actor_id: actorId,
          actor_role: "staff",
          entity_type: "student_document",
          entity_id: documentId,
          action: action,
          after: data as unknown as Record<string, unknown>,
          reason: action === "verify" ? "Document verified" : `Document rejected: ${rejectionReason}`,
        });
        return { document: data as StudentDocument };
      }
      return { error: error?.message || "Failed to update document" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  return { error: "Not implemented in local mode" };
}

/**
 * Create notification outbox entry
 */
export async function createNotificationOutbox(
  schoolId: string,
  input: NotificationOutboxInput
): Promise<{ outbox?: NotificationOutbox; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  const timestamp = new Date().toISOString();
  const outbox: NotificationOutbox = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    ...input,
    status: "queued",
    attempts: 0,
    created_at: timestamp,
    scheduled_at: input.scheduled_at || timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("notification_outbox")
        .insert(outbox)
        .select()
        .single();

      if (!error && data) {
        return { outbox: data as NotificationOutbox };
      }
      return { error: error?.message || "Failed to create notification" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getNotificationOutboxCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const outboxItems: NotificationOutbox[] = cached ? JSON.parse(cached) : [];
    outboxItems.push(outbox);
    localStorage.setItem(cacheKey, JSON.stringify(outboxItems));
    return { outbox };
  } catch {
    return { error: "Failed to create notification" };
  }
}

/**
 * Get current academic year for a school
 */
export async function getCurrentAcademicYear(schoolId: string): Promise<{ year?: AcademicYear; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_current", true)
        .single();

      if (!error && data) {
        return { year: data as AcademicYear };
      }
      return { error: error?.message || "No current academic year found" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  return { error: "Not implemented in local mode" };
}

/**
 * Get class by ID
 */
export async function getClassById(schoolId: string, classId: string): Promise<{ class?: SchoolClass; error?: string }> {
  if (!schoolId || !classId) {
    return { error: "school_id and class_id are required" };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId)
        .eq("id", classId)
        .single();

      if (!error && data) {
        return { class: data as SchoolClass };
      }
      return { error: error?.message || "Class not found" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  return { error: "Not implemented in local mode" };
}

/**
 * Get section by ID
 */
export async function getSectionById(schoolId: string, sectionId: string): Promise<{ section?: SchoolSection; error?: string }> {
  if (!schoolId || !sectionId) {
    return { error: "school_id and section_id are required" };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .eq("school_id", schoolId)
        .eq("id", sectionId)
        .single();

      if (!error && data) {
        return { section: data as SchoolSection };
      }
      return { error: error?.message || "Section not found" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  return { error: "Not implemented in local mode" };
}

/**
 * Admission wizard - create student with all related data in one transaction
 */
export async function admitStudent(
  schoolId: string,
  payload: AdmissionWizardPayload,
  actorId: string,
  actorRole: string
): Promise<{ student?: Student; error?: string }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  // Check permission
  const canWrite = await hasPermission("students.write");
  if (!canWrite) {
    return { error: "Insufficient permissions to admit student" };
  }

  // In a real implementation, this would be a database transaction
  // For now, we'll create the student and related records sequentially
  
  // 1. Create student
  const { student, error: studentError } = await createStudent(schoolId, {
    first_name: payload.step1_basic.first_name,
    middle_name: payload.step1_basic.middle_name,
    last_name: payload.step1_basic.last_name,
    dob: payload.step1_basic.dob,
    gender: payload.step1_basic.gender,
    blood_group: payload.step1_basic.blood_group,
    nationality: payload.step1_basic.nationality || "Indian",
    religion: payload.step1_basic.religion,
    category: payload.step1_basic.category,
    is_rte: payload.step2_academic.is_rte,
    photo_path: payload.step1_basic.photo_path,
    admission_date: payload.step2_academic.admission_date,
    admission_type: payload.step2_academic.admission_type,
    admission_class_id: payload.step2_academic.class_id,
    house: payload.step2_academic.house,
    medium: payload.step2_academic.medium,
    sr_no: payload.step1_basic.sr_no,
    apaar_id: payload.step1_basic.apaar_id,
  }, actorId, actorRole);

  if (studentError || !student) {
    return { error: studentError || "Failed to create student" };
  }

  // 2. Create enrollment
  await createStudentEnrollment(schoolId, {
    student_id: student.id,
    academic_year_id: payload.step2_academic.academic_year_id,
    class_id: payload.step2_academic.class_id,
    section_id: payload.step2_academic.section_id,
    roll_no: payload.step2_academic.roll_no,
    status: "active",
    enrolled_on: payload.step2_academic.admission_date,
  }, actorId);

  // 3. Create addresses
  // ... (similar pattern for other related records)

  // 4. Log admission event
  await logAudit({
    school_id: schoolId,
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: "student",
    entity_id: student.id,
    action: "admit",
    after: student as unknown as Record<string, unknown>,
    reason: "Student admitted via wizard",
  });

  // 5. Queue admission confirmation notification
  if (payload.step3_parents.father?.phone) {
    await createNotificationOutbox(schoolId, {
      channel: "whatsapp",
      template_key: "admission_confirmation",
      recipient_phone: payload.step3_parents.father.phone,
      params: {
        student_name: `${student.first_name} ${student.last_name}`,
        admission_no: student.admission_no,
        class_name: "", // Would need to fetch class name
      },
      related_type: "student",
      related_id: student.id,
      dedupe_key: `admission_confirmation:${student.id}`,
    });
  }

  return { student };
}

export { STUDENT_PERMISSIONS, STUDENT_ROLE_PERMISSIONS };
export type { StudentPermissionKey };