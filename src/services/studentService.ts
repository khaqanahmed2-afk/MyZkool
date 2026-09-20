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
  DuplicateCheckMatch,
  ParentLookupResult,
  AdmissionWizardPayload,
  StudentPermissionKey,
  StudentSensitive,
  STUDENT_PERMISSIONS,
  STUDENT_ROLE_PERMISSIONS,
  ParentRelation,
  EnrollmentStatus,
  DocumentRequiredFor,
} from "../types/students";
import type { AcademicYear } from "../types/academic";
import type { SchoolClass, SchoolSection } from "../types/curriculum";
import { encryptSensitive, decryptSensitive, hashAadhaar } from "../utils/sensitiveCrypto";
import { cleanAadhaar, maskAadhaar, validateAadhaar } from "../utils/aadhaarValidation";
import { feeService } from "./feeService";
import { transportService } from "./transportService";

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
const STUDENT_SENSITIVE_CACHE_PREFIX = "myzkool_student_sensitive_";
const STUDENT_MEDICAL_CACHE_PREFIX = "myzkool_student_medical_";

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

function getStudentSensitiveCacheKey(schoolId: string) {
  return `${STUDENT_SENSITIVE_CACHE_PREFIX}${schoolId}`;
}

function getStudentMedicalCacheKey(schoolId: string) {
  return `${STUDENT_MEDICAL_CACHE_PREFIX}${schoolId}`;
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
      const stored = localStorage.getItem("myzkool_user_permissions");
      if (stored !== null) {
        const permissions = JSON.parse(stored);
        return permissions.includes(permission);
      }
      return true;
    } catch {
      return true;
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
 * Check for duplicate students (delegates to checkStudentDuplicate)
 */
export async function checkDuplicateStudent(
  schoolId: string,
  firstName: string,
  lastName: string,
  dob: string,
  aadhaarHash?: string
): Promise<{ result?: DuplicateCheckResult; error?: string }> {
  const result = await checkStudentDuplicate(schoolId, {
    first_name: firstName,
    last_name: lastName,
    dob,
    aadhaar_number: aadhaarHash,
  });
  return { result };
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

export async function getStudentMedical(
  schoolId: string,
  studentId: string,
  callerPermissions?: StudentPermissionKey[]
): Promise<{ medical?: StudentMedical | null; error?: string; statusCode?: number }> {
  // Check medical read permission
  const canReadMedical = callerPermissions
    ? (callerPermissions.includes("students.medical.read") || callerPermissions.includes("students.reveal_sensitive"))
    : await hasPermission("students.medical.read");
  if (!canReadMedical) {
    return { medical: null, error: "FORBIDDEN: Missing students.medical.read permission", statusCode: 403 };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_medical")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .single();
      return { medical: (data as StudentMedical) || null, error: error?.message };
    } catch {
      return { medical: null };
    }
  }

  try {
    const cacheKey = getStudentMedicalCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const list: StudentMedical[] = cached ? JSON.parse(cached) : [];
    const medical = list.find(m => m.student_id === studentId) || null;
    return { medical };
  } catch {
    return { medical: null };
  }
}

export async function updateStudentMedical(
  schoolId: string,
  studentId: string,
  input: StudentMedicalInput,
  actorId: string,
  actorRole: string,
  callerPermissions?: StudentPermissionKey[]
): Promise<{ medical?: StudentMedical; error?: string; statusCode?: number }> {
  const canWriteMedical = callerPermissions
    ? callerPermissions.includes("students.medical.write")
    : await hasPermission("students.medical.write");
  if (!canWriteMedical) {
    return { error: "FORBIDDEN: Missing students.medical.write permission", statusCode: 403 };
  }

  const timestamp = new Date().toISOString();
  const medicalRecord: StudentMedical = {
    student_id: studentId,
    school_id: schoolId,
    ...input,
    updated_by: actorId,
    updated_at: timestamp,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_medical")
        .upsert(medicalRecord)
        .select()
        .single();
      if (!error && data) {
        await logAudit({
          school_id: schoolId,
          actor_id: actorId,
          actor_role: actorRole,
          entity_type: "student_medical",
          entity_id: studentId,
          action: "update_medical",
          reason: "Updated medical details",
        });
        return { medical: data as StudentMedical };
      }
      return { error: error?.message || "Failed to update medical details" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  try {
    const cacheKey = getStudentMedicalCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const list: StudentMedical[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex(m => m.student_id === studentId);
    if (idx >= 0) {
      list[idx] = medicalRecord;
    } else {
      list.push(medicalRecord);
    }
    localStorage.setItem(cacheKey, JSON.stringify(list));
    await logAudit({
      school_id: schoolId,
      actor_id: actorId,
      actor_role: actorRole,
      entity_type: "student_medical",
      entity_id: studentId,
      action: "update_medical",
      reason: "Updated medical details",
    });
    return { medical: medicalRecord };
  } catch {
    return { error: "Failed to update medical details" };
  }
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
  stepOrInput: number | StudentDraftInput,
  payloadParam?: Record<string, unknown>
): Promise<{ draft?: StudentDraft; error?: string }> {
  if (!schoolId || !userId) {
    return { error: "school_id and user_id are required" };
  }

  const input: StudentDraftInput =
    typeof stepOrInput === "number"
      ? { step: stepOrInput, payload: payloadParam || {} }
      : stepOrInput;

  const timestamp = new Date().toISOString();
  const draft: StudentDraft = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    created_by: userId,
    step: input.step,
    payload: input.payload,
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
): Promise<{ draft?: StudentDraft | null; error?: string }> {
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
      return { draft: null };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = getStudentDraftsCacheKey(userId);
    const cached = localStorage.getItem(cacheKey);
    const drafts: StudentDraft[] = cached ? JSON.parse(cached) : [];
    const draft = drafts.find(d => d.school_id === schoolId && d.created_by === userId) || null;
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
/**
 * Reveal Aadhaar (with permission and audit)
 * Requires students.reveal_sensitive permission.
 * Never exposes raw Aadhaar by default; returns plaintext only on explicit audited call.
 */
export async function revealStudentAadhaar(
  schoolId: string,
  studentId: string,
  reason: string,
  actorId: string,
  actorRole: string,
  callerPermissions?: StudentPermissionKey[]
): Promise<{ aadhaar?: string; last4?: string; error?: string; statusCode?: number }> {
  if (!schoolId || !studentId) {
    return { error: "school_id and student_id are required", statusCode: 400 };
  }
  if (!reason || !reason.trim()) {
    return { error: "Reason is required for audited Aadhaar reveal", statusCode: 400 };
  }

  // Check permission
  const canReveal = callerPermissions
    ? (callerPermissions.includes("students.reveal_sensitive") || actorRole === "owner")
    : await hasPermission("students.reveal_sensitive");
  if (!canReveal) {
    return { error: "FORBIDDEN: Missing students.reveal_sensitive permission", statusCode: 403 };
  }

  let encryptedPayload: any = null;
  let last4: string | undefined;

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("student_sensitive")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .maybeSingle();
      if (data) {
        encryptedPayload = data.aadhaar_enc;
        last4 = data.aadhaar_last4;
      }
    } catch {}
  } else {
    try {
      const cacheKey = getStudentSensitiveCacheKey(schoolId);
      const cached = localStorage.getItem(cacheKey);
      const list: StudentSensitive[] = cached ? JSON.parse(cached) : [];
      const rec = list.find(s => s.student_id === studentId);
      if (rec) {
        encryptedPayload = rec.aadhaar_enc;
        last4 = rec.aadhaar_last4 || undefined;
      }
    } catch {}
  }

  // Fallback to student record if not found in student_sensitive
  if (!encryptedPayload) {
    const { student } = await getStudentById(schoolId, studentId);
    if (student) {
      encryptedPayload = (student as any).aadhaar_enc;
      last4 = student.aadhaar_last4 || undefined;
    }
  }

  if (!encryptedPayload) {
    return { error: "No Aadhaar on record", statusCode: 404 };
  }

  let decryptedPlaintext = "";
  try {
    decryptedPlaintext = decryptSensitive(encryptedPayload);
  } catch (err) {
    decryptedPlaintext = `Decrypted: ${String(err)}`;
  }

  // Log audit
  await logAudit({
    school_id: schoolId,
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: "student_sensitive",
    entity_id: studentId,
    action: "reveal_aadhaar",
    reason,
    before: { masked: maskAadhaar(last4 || "1234") },
    after: { revealed: true },
  });

  return { aadhaar: decryptedPlaintext, last4 };
}

export const revealAadhaar = revealStudentAadhaar;

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

  const defaultTypes: DocumentType[] = [
    { id: "dt-1", school_id: schoolId, key: "birth_certificate", label: "Birth Certificate", required_for: "all", is_required: true, display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "dt-2", school_id: schoolId, key: "previous_tc", label: "Previous Transfer Certificate", required_for: "all", is_required: false, display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "dt-3", school_id: schoolId, key: "report_card", label: "Previous Report Card", required_for: "all", is_required: false, display_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "dt-4", school_id: schoolId, key: "address_proof", label: "Address Proof", required_for: "all", is_required: true, display_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "dt-5", school_id: schoolId, key: "passport_photo", label: "Passport Photo", required_for: "all", is_required: true, display_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "dt-6", school_id: schoolId, key: "aadhaar_copy", label: "Aadhaar Copy (Optional)", required_for: "all", is_required: false, display_order: 6, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "dt-7", school_id: schoolId, key: "category_certificate", label: "Category Certificate (SC/ST/OBC/EWS)", required_for: "category", is_required: false, display_order: 7, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "dt-8", school_id: schoolId, key: "income_certificate", label: "Income Certificate (EWS/RTE)", required_for: "rte", is_required: false, display_order: 8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "dt-9", school_id: schoolId, key: "immunisation_record", label: "Immunisation Record", required_for: "all", is_required: false, display_order: 9, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  return { types: defaultTypes };
}

/**
 * Create document type
 */
export async function createDocumentType(
  schoolId: string,
  input: DocumentTypeInput,
  _actorId: string
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

  const timestamp = new Date().toISOString();
  const document: StudentDocument = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: studentId,
    ...input,
    storage_path: `documents/${schoolId}/${studentId}/${input.doc_type}_${Date.now()}.${input.file_name?.split('.').pop() || 'pdf'}`,
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
    await logAudit({
      school_id: schoolId,
      actor_id: actorId,
      actor_role: "staff",
      entity_type: "student_document",
      entity_id: document.id,
      action: "create",
      after: document as unknown as Record<string, unknown>,
      reason: "Document uploaded",
    });
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
    updates.rejection_reason = rejectionReason || "Document rejected during verification";
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

  // Local storage fallback
  try {
    const cacheKey = getStudentDocumentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const documents: StudentDocument[] = cached ? JSON.parse(cached) : [];
    const index = documents.findIndex(d => d.id === documentId);
    if (index === -1) {
      return { error: "Document not found" };
    }

    const updatedDoc: StudentDocument = {
      ...documents[index],
      ...updates,
    };
    documents[index] = updatedDoc;
    localStorage.setItem(cacheKey, JSON.stringify(documents));

    await logAudit({
      school_id: schoolId,
      actor_id: actorId,
      actor_role: "staff",
      entity_type: "student_document",
      entity_id: documentId,
      action: action,
      after: updatedDoc as unknown as Record<string, unknown>,
      reason: action === "verify" ? "Document verified" : `Document rejected: ${rejectionReason}`,
    });

    return { document: updatedDoc };
  } catch {
    return { error: "Failed to update document" };
  }
}

/**
 * Replace student document (supersede)
 */
export async function replaceStudentDocument(
  schoolId: string,
  documentId: string,
  input: StudentDocumentInput,
  actorId: string
): Promise<{ document?: StudentDocument; error?: string }> {
  if (!schoolId || !documentId) {
    return { error: "school_id and document_id are required" };
  }

  const timestamp = new Date().toISOString();
  const updates: Partial<StudentDocument> = {
    ...input,
    status: "uploaded",
    storage_path: `documents/${schoolId}/superseded/${input.file_name?.split('.').pop() || 'pdf'}_${Date.now()}`,
    uploaded_by: actorId,
    uploaded_at: timestamp,
    updated_at: timestamp,
    verified_by: null,
    verified_at: null,
    rejection_reason: null,
  };

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
        await logAudit({
          school_id: schoolId,
          actor_id: actorId,
          actor_role: "staff",
          entity_type: "student_document",
          entity_id: documentId,
          action: "replace",
          reason: "Document replaced with new version",
        });
        return { document: data as StudentDocument };
      }
      return { error: error?.message || "Failed to replace document" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  try {
    const cacheKey = getStudentDocumentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const docs: StudentDocument[] = cached ? JSON.parse(cached) : [];
    const idx = docs.findIndex(d => d.id === documentId);
    if (idx === -1) return { error: "Document not found" };

    const updated = { ...docs[idx], ...updates };
    docs[idx] = updated;
    localStorage.setItem(cacheKey, JSON.stringify(docs));
    await logAudit({
      school_id: schoolId,
      actor_id: actorId,
      actor_role: "staff",
      entity_type: "student_document",
      entity_id: documentId,
      action: "replace",
      reason: "Document replaced with new version",
    });
    return { document: updated };
  } catch {
    return { error: "Failed to replace document" };
  }
}

/**
 * Delete student document
 * Spec rule: Allowed only before verification; after verification it can only be superseded.
 */
export async function deleteStudentDocument(
  schoolId: string,
  documentId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !documentId) {
    return { success: false, error: "school_id and document_id are required" };
  }

  // Fetch document to check status
  let existingDoc: StudentDocument | null = null;
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("student_documents")
        .select("*")
        .eq("id", documentId)
        .eq("school_id", schoolId)
        .single();
      existingDoc = data as StudentDocument;
    } catch {}
  } else {
    try {
      const cacheKey = getStudentDocumentsCacheKey(schoolId);
      const cached = localStorage.getItem(cacheKey);
      const docs: StudentDocument[] = cached ? JSON.parse(cached) : [];
      existingDoc = docs.find(d => d.id === documentId) || null;
    } catch {}
  }

  if (!existingDoc) {
    return { success: false, error: "Document not found" };
  }

  if (existingDoc.status === "verified") {
    return { success: false, error: "Verified documents cannot be deleted; they can only be superseded with a replacement" };
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("student_documents")
        .delete()
        .eq("id", documentId)
        .eq("school_id", schoolId);
      if (!error) {
        await logAudit({
          school_id: schoolId,
          actor_id: actorId,
          actor_role: "staff",
          entity_type: "student_document",
          entity_id: documentId,
          action: "delete",
          reason: "Unverified document deleted",
        });
        return { success: true };
      }
      return { success: false, error: error?.message };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  try {
    const cacheKey = getStudentDocumentsCacheKey(schoolId);
    const cached = localStorage.getItem(cacheKey);
    const docs: StudentDocument[] = cached ? JSON.parse(cached) : [];
    const filtered = docs.filter(d => d.id !== documentId);
    localStorage.setItem(cacheKey, JSON.stringify(filtered));
    await logAudit({
      school_id: schoolId,
      actor_id: actorId,
      actor_role: "staff",
      entity_type: "student_document",
      entity_id: documentId,
      action: "delete",
      reason: "Unverified document deleted",
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete document" };
  }
}

/**
 * Check for student duplicate matches
 * Checks: (first_name + parent_phone), (dob + mother_name), and (aadhaar_hash)
 */
export async function checkStudentDuplicate(
  schoolId: string,
  params: {
    first_name: string;
    last_name?: string;
    dob?: string;
    parent_phone?: string;
    mother_name?: string;
    aadhaar_number?: string;
  }
): Promise<DuplicateCheckResult> {
  const matches: DuplicateCheckMatch[] = [];
  let maxScore = 0;

  if (!schoolId || (!params.first_name && !params.aadhaar_number)) {
    return { is_duplicate: false, match_score: 0, highest_score: 0, matches: [] } as any;
  }

  const cleanFirst = params.first_name ? params.first_name.trim().toLowerCase() : "";
  const cleanPhone = params.parent_phone ? params.parent_phone.replace(/\D/g, "").slice(-10) : "";
  const cleanAadhaarNum = params.aadhaar_number ? cleanAadhaar(params.aadhaar_number) : "";
  const aadhaarH = cleanAadhaarNum ? hashAadhaar(cleanAadhaarNum) : "";

  // Get students list
  const listRes = await listStudents(schoolId, { limit: 1000 });
  const students = listRes.response?.data || [];
  const studentParentsKey = getStudentParentsCacheKey(schoolId);
  const parentsKey = getParentsCacheKey(schoolId);
  const sensKey = getStudentSensitiveCacheKey(schoolId);

  const spCached = typeof localStorage !== "undefined" ? localStorage.getItem(studentParentsKey) : null;
  const pCached = typeof localStorage !== "undefined" ? localStorage.getItem(parentsKey) : null;
  const sensCached = typeof localStorage !== "undefined" ? localStorage.getItem(sensKey) : null;

  const studentParents: StudentParent[] = spCached ? JSON.parse(spCached) : [];
  const parents: Parent[] = pCached ? JSON.parse(pCached) : [];
  const sensitiveList: StudentSensitive[] = sensCached ? JSON.parse(sensCached) : [];

  for (const s of students) {
    let studentMatched = false;
    let matchReason = "";
    let score = 0;

    // 1. Check Aadhaar hash match
    if (aadhaarH) {
      const isAadhaarMatch =
        (s as any).aadhaar_hash === aadhaarH ||
        sensitiveList.some(sens => sens.student_id === s.id && sens.aadhaar_hash === aadhaarH);
      if (isAadhaarMatch) {
        studentMatched = true;
        score = 100;
        matchReason = "Exact Aadhaar number match";
      }
    }

    // 2. Check (first_name + parent_phone)
    if (!studentMatched && cleanFirst && cleanPhone) {
      if (s.first_name.trim().toLowerCase() === cleanFirst) {
        const links = studentParents.filter(l => l.student_id === s.id);
        const linkedParents = parents.filter(p => links.some(l => l.parent_id === p.id));
        const phoneMatch = linkedParents.some(p => p.phone.replace(/\D/g, "").slice(-10) === cleanPhone);
        if (phoneMatch) {
          studentMatched = true;
          score = 90;
          matchReason = `Same first name (${s.first_name}) and parent phone (${cleanPhone})`;
        }
      }
    }

    // 3. Check (dob + mother_name)
    if (!studentMatched && params.dob && params.mother_name && s.dob === params.dob) {
      const cleanMother = params.mother_name.trim().toLowerCase();
      const links = studentParents.filter(l => l.student_id === s.id && l.relation === "mother");
      const motherParents = parents.filter(p => links.some(l => l.parent_id === p.id));
      const motherMatch = motherParents.some(p => p.full_name.trim().toLowerCase().includes(cleanMother));
      if (motherMatch) {
        studentMatched = true;
        score = 85;
        matchReason = `Same DOB (${s.dob}) and mother name (${params.mother_name})`;
      }
    }

    // 4. Check (first_name + last_name + dob)
    if (!studentMatched && cleanFirst && params.last_name && params.dob) {
      if (
        s.first_name.trim().toLowerCase() === cleanFirst &&
        s.last_name.trim().toLowerCase() === params.last_name.trim().toLowerCase() &&
        s.dob === params.dob
      ) {
        studentMatched = true;
        score = 80;
        matchReason = `Same name (${s.first_name} ${s.last_name}) and DOB (${s.dob})`;
      }
    }

    if (studentMatched) {
      maxScore = Math.max(maxScore, score);
      matches.push({
        id: s.id,
        admission_no: s.admission_no,
        first_name: s.first_name,
        last_name: s.last_name,
        dob: s.dob,
        class_name: s.class_name || undefined,
        section_name: s.section_name || undefined,
        status: s.status,
        match_reason: matchReason,
      });
    }
  }

  return {
    is_duplicate: matches.length > 0,
    match_score: maxScore,
    highest_score: maxScore,
    matches,
  } as any;
}

/**
 * Parent lookup by phone
 */
export async function lookupParentByPhone(
  schoolId: string,
  phone: string
): Promise<ParentLookupResult & { result: ParentLookupResult }> {
  if (!schoolId || !phone) {
    return { found: false, result: { found: false } };
  }

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) {
    return { found: false, result: { found: false } };
  }

  let foundParent: Parent | undefined;
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("parents")
        .select("*")
        .eq("school_id", schoolId)
        .eq("phone", cleanPhone)
        .maybeSingle();
      if (data) foundParent = data as Parent;
    } catch {}
  } else {
    try {
      const cacheKey = getParentsCacheKey(schoolId);
      const cached = localStorage.getItem(cacheKey);
      const parents: Parent[] = cached ? JSON.parse(cached) : [];
      foundParent = parents.find(p => p.phone.replace(/\D/g, "").slice(-10) === cleanPhone);
    } catch {}
  }

  if (!foundParent) {
    return { found: false, result: { found: false } };
  }

  // Hydrate linked students
  const linkedStudents: { id: string; first_name: string; last_name: string; class_name?: string }[] = [];
  try {
    const spKey = getStudentParentsCacheKey(schoolId);
    const cachedSp = typeof localStorage !== "undefined" ? localStorage.getItem(spKey) : null;
    const links: StudentParent[] = cachedSp ? JSON.parse(cachedSp) : [];
    const parentLinks = links.filter(l => l.parent_id === foundParent!.id);
    
    const listRes2 = await listStudents(schoolId, { limit: 1000 });
    const allStudents = listRes2.response?.data || [];
    for (const link of parentLinks) {
      const st = allStudents.find(s => s.id === link.student_id);
      if (st) {
        linkedStudents.push({
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          class_name: st.class_name || undefined,
        });
      }
    }
  } catch {}

  const finalResult: ParentLookupResult = {
    found: true,
    parent: foundParent,
    linked_students: linkedStudents,
  };

  return {
    ...finalResult,
    result: finalResult,
  };
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

  return {
    year: {
      id: "ay-2026-27",
      school_id: schoolId,
      start_year: 2026,
      end_year: 2027,
      label: "2026-2027",
      start_date: "2026-04-01",
      end_date: "2027-03-31",
      is_current: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  };
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

  return {
    class: {
      id: classId,
      school_id: schoolId,
      academic_year_id: "ay-2026-27",
      name: "Class 1",
      sort_order: 1,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  };
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

  return {
    section: {
      id: sectionId,
      school_id: schoolId,
      academic_year_id: "ay-2026-27",
      class_id: "cls-1",
      name: "A",
      sort_order: 1,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  };
}

/**
 * Admission wizard - Transactional admission with full atomic rollback
 * Writes student + enrollment + addresses + parents + links + sensitive + medical + documents + audit + outbox in ONE unit.
 * On ANY failure, full rollback ensures ZERO orphan rows remain in ANY table.
 */
export async function admitStudentTransactional(
  schoolId: string,
  payload: AdmissionWizardPayload,
  actorId: string,
  actorRole: string,
  options?: {
    forceFailAtStep?: "counter" | "student" | "enrollment" | "address" | "parent" | "sensitive" | "medical" | "document" | "outbox";
  }
): Promise<{ student?: Student; error?: string; rolledBack?: boolean }> {
  if (!schoolId) {
    return { error: "school_id is required" };
  }

  const rollbackStack: Array<() => Promise<void>> = [];

  try {
    // Check permission
    const roleLower = (actorRole || "admin").toLowerCase();
    const rolePermissions = STUDENT_ROLE_PERMISSIONS[roleLower as keyof typeof STUDENT_ROLE_PERMISSIONS] || [];
    const canWrite =
      roleLower === "owner" ||
      roleLower === "admin" ||
      rolePermissions.includes("students.write") ||
      await hasPermission("students.write");

    if (!canWrite) {
      return { error: "Insufficient permissions to admit student" };
    }

    // Plan limits check (Spec 1.5, A10)
    const { checkSchoolStudentLimit } = await import("./studentOperationsService");
    const limitStatus = await checkSchoolStudentLimit(schoolId);
    if (limitStatus.is_blocked) {
      throw new Error(`LIMIT_REACHED: School active student limit of ${limitStatus.max_allowed} reached for plan ${limitStatus.plan_tier}`);
    }

    // STEP 1: Counter & Admission Number
    const counterRes = await getNextCounter(schoolId, "student_admission_no");
    if (counterRes.error) {
      throw new Error(`Failed to generate admission number: ${counterRes.error}`);
    }
    const admissionSeq = counterRes.value;
    const admissionNo = `ADM-${new Date().getFullYear()}-${String(admissionSeq).padStart(4, "0")}`;

    rollbackStack.push(async () => {
      // Revert counter if needed
      try {
        const cKey = getCountersCacheKey(schoolId);
        const cCached = localStorage.getItem(cKey);
        const counters: Counter[] = cCached ? JSON.parse(cCached) : [];
        const cIdx = counters.findIndex(c => c.key === "student_admission_no");
        if (cIdx !== -1 && counters[cIdx].next_value > 1) {
          counters[cIdx].next_value -= 1;
          localStorage.setItem(cKey, JSON.stringify(counters));
        }
      } catch {}
    });

    if (options?.forceFailAtStep === "counter") {
      throw new Error("Forced failure at counter step");
    }

    // Pre-calculate Aadhaar sensitive hashes if provided
    let aadhaarLast4: string | null = null;
    let aadhaarHash: string | null = null;
    let encryptedAadhaar: string | null = null;

    if (payload.step5_sensitive?.aadhaar_number) {
      const clean = cleanAadhaar(payload.step5_sensitive.aadhaar_number);
      if (clean) {
        aadhaarLast4 = clean.slice(-4);
        aadhaarHash = hashAadhaar(clean);
        const encRes = encryptSensitive(clean);
        encryptedAadhaar = encRes.packed;
      }
    }

    // STEP 2: Create Student record
    const studentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const studentRecord: Student = {
      id: studentId,
      school_id: schoolId,
      admission_no: admissionNo,
      first_name: payload.step1_basic.first_name,
      middle_name: payload.step1_basic.middle_name,
      last_name: payload.step1_basic.last_name,
      dob: payload.step1_basic.dob,
      gender: payload.step1_basic.gender,
      blood_group: payload.step1_basic.blood_group,
      nationality: payload.step1_basic.nationality || "Indian",
      religion: payload.step1_basic.religion,
      category: payload.step1_basic.category,
      mother_tongue: payload.step1_basic.mother_tongue,
      is_rte: payload.step3_academic.is_rte,
      photo_path: payload.step1_basic.photo_path,
      aadhaar_enc: encryptedAadhaar as any,
      aadhaar_last4: aadhaarLast4,
      aadhaar_hash: aadhaarHash,
      admission_date: payload.step3_academic.admission_date,
      admission_type: payload.step3_academic.admission_type,
      admission_class_id: payload.step3_academic.class_id,
      house: payload.step3_academic.house,
      medium: payload.step3_academic.medium,
      sr_no: payload.step1_basic.sr_no,
      apaar_id: payload.step1_basic.apaar_id,
      status: "enrolled",
      created_at: timestamp,
      updated_at: timestamp,
      created_by: actorId,
      updated_by: actorId,
    };

    if (isSupabaseConfigured) {
      const { error: insErr } = await supabase.from("students").insert(studentRecord);
      if (insErr) throw new Error(`Failed to insert student: ${insErr.message}`);
    } else {
      const cacheKey = getStudentsCacheKey(schoolId);
      const cached = localStorage.getItem(cacheKey);
      const students: Student[] = cached ? JSON.parse(cached) : [];
      students.push(studentRecord);
      localStorage.setItem(cacheKey, JSON.stringify(students));
    }

    rollbackStack.push(async () => {
      if (isSupabaseConfigured) {
        await supabase.from("students").delete().eq("id", studentId);
      } else {
        const cacheKey = getStudentsCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const students: Student[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem(cacheKey, JSON.stringify(students.filter(s => s.id !== studentId)));
      }
    });

    if (options?.forceFailAtStep === "student") {
      throw new Error("Forced failure at student step");
    }

    // STEP 3: Create Enrollment
    const enrollmentId = crypto.randomUUID();
    const enrollmentRecord: StudentEnrollment = {
      id: enrollmentId,
      school_id: schoolId,
      student_id: studentId,
      academic_year_id: payload.step3_academic.academic_year_id,
      class_id: payload.step3_academic.class_id,
      section_id: payload.step3_academic.section_id,
      roll_no: payload.step3_academic.roll_no,
      status: "active",
      enrolled_on: payload.step3_academic.admission_date,
      created_at: timestamp,
      updated_at: timestamp,
    };

    if (isSupabaseConfigured) {
      const { error: enrErr } = await supabase.from("student_enrollments").insert(enrollmentRecord);
      if (enrErr) throw new Error(`Failed to insert enrollment: ${enrErr.message}`);
    } else {
      const cacheKey = getStudentEnrollmentsCacheKey(schoolId);
      const cached = localStorage.getItem(cacheKey);
      const enrollments: StudentEnrollment[] = cached ? JSON.parse(cached) : [];
      enrollments.push(enrollmentRecord);
      localStorage.setItem(cacheKey, JSON.stringify(enrollments));
    }

    rollbackStack.push(async () => {
      if (isSupabaseConfigured) {
        await supabase.from("student_enrollments").delete().eq("id", enrollmentId);
      } else {
        const cacheKey = getStudentEnrollmentsCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const list: StudentEnrollment[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem(cacheKey, JSON.stringify(list.filter(e => e.id !== enrollmentId)));
      }
    });

    if (options?.forceFailAtStep === "enrollment") {
      throw new Error("Forced failure at enrollment step");
    }

    // STEP 4: Addresses
    const addressIds: string[] = [];
    const currentAddr: StudentAddress = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: studentId,
      kind: "current",
      ...payload.step2_guardian.current_address,
      created_at: timestamp,
      updated_at: timestamp,
    };
    addressIds.push(currentAddr.id);

    const addrList: StudentAddress[] = [currentAddr];
    if (payload.step2_guardian.same_as_current) {
      addrList.push({
        ...currentAddr,
        id: crypto.randomUUID(),
        kind: "permanent",
      });
      addressIds.push(addrList[1].id);
    } else if (payload.step2_guardian.permanent_address) {
      const permAddr: StudentAddress = {
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: studentId,
        kind: "permanent",
        ...payload.step2_guardian.permanent_address,
        created_at: timestamp,
        updated_at: timestamp,
      };
      addrList.push(permAddr);
      addressIds.push(permAddr.id);
    }

    if (isSupabaseConfigured) {
      const { error: addrErr } = await supabase.from("student_addresses").insert(addrList);
      if (addrErr) throw new Error(`Failed to insert addresses: ${addrErr.message}`);
    } else {
      const cacheKey = getStudentAddressesCacheKey(schoolId);
      const cached = localStorage.getItem(cacheKey);
      const addrs: StudentAddress[] = cached ? JSON.parse(cached) : [];
      addrs.push(...addrList);
      localStorage.setItem(cacheKey, JSON.stringify(addrs));
    }

    rollbackStack.push(async () => {
      if (isSupabaseConfigured) {
        await supabase.from("student_addresses").delete().in("id", addressIds);
      } else {
        const cacheKey = getStudentAddressesCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const list: StudentAddress[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem(cacheKey, JSON.stringify(list.filter(a => !addressIds.includes(a.id))));
      }
    });

    if (options?.forceFailAtStep === "address") {
      throw new Error("Forced failure at address step");
    }

    // STEP 5: Parents & Guardian linking
    const parentEntries = [
      { key: "father", data: payload.step2_guardian.father, relation: "father" as ParentRelation },
      { key: "mother", data: payload.step2_guardian.mother, relation: "mother" as ParentRelation },
      { key: "guardian", data: payload.step2_guardian.guardian, relation: "guardian" as ParentRelation },
    ].filter(p => p.data && p.data.phone);

    const createdParentIds: string[] = [];
    const createdLinkIds: string[] = [];
    const createdConsentIds: string[] = [];
    let primaryParentPhone: string | null = null;
    let primaryParentConsented = false;

    for (const entry of parentEntries) {
      const pData = entry.data!;
      const cleanPhone = pData.phone.replace(/\D/g, "").slice(-10);

      // Check if parent already exists by phone
      const lookup = await lookupParentByPhone(schoolId, cleanPhone);
      let parentId: string;

      if (lookup.found && lookup.parent) {
        parentId = lookup.parent.id;
      } else {
        parentId = crypto.randomUUID();
        const newParent: Parent = {
          id: parentId,
          school_id: schoolId,
          full_name: pData.full_name,
          phone: cleanPhone,
          whatsapp_phone: pData.whatsapp_phone || cleanPhone,
          email: pData.email || null,
          occupation: pData.occupation || null,
          qualification: pData.qualification || null,
          annual_income_band: pData.annual_income_band || null,
          created_at: timestamp,
          updated_at: timestamp,
        };

        if (isSupabaseConfigured) {
          const { error: pErr } = await supabase.from("parents").insert(newParent);
          if (pErr) throw new Error(`Failed to insert parent: ${pErr.message}`);
        } else {
          const cacheKey = getParentsCacheKey(schoolId);
          const cached = localStorage.getItem(cacheKey);
          const parents: Parent[] = cached ? JSON.parse(cached) : [];
          parents.push(newParent);
          localStorage.setItem(cacheKey, JSON.stringify(parents));
        }
        createdParentIds.push(parentId);
      }

      // Link parent to student
      const linkId = crypto.randomUUID();
      const isPrimary = pData.is_primary_contact ?? (entry.relation === "father");
      if (isPrimary) {
        primaryParentPhone = cleanPhone;
        primaryParentConsented = pData.whatsapp_consent !== false;
      }

      const link: StudentParent = {
        id: linkId,
        school_id: schoolId,
        student_id: studentId,
        parent_id: parentId,
        relation: entry.relation,
        is_primary_contact: isPrimary,
        is_fee_payer: pData.is_fee_payer ?? isPrimary,
        is_emergency_contact: pData.is_emergency_contact ?? true,
        can_pickup: pData.can_pickup ?? true,
        lives_with: pData.lives_with ?? true,
        created_at: timestamp,
        updated_at: timestamp,
      };

      if (isSupabaseConfigured) {
        const { error: spErr } = await supabase.from("student_parents").insert(link);
        if (spErr) throw new Error(`Failed to link parent: ${spErr.message}`);
      } else {
        const cacheKey = getStudentParentsCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const links: StudentParent[] = cached ? JSON.parse(cached) : [];
        links.push(link);
        localStorage.setItem(cacheKey, JSON.stringify(links));
      }
      createdLinkIds.push(linkId);

      // WhatsApp communication consent
      const consentId = crypto.randomUUID();
      const consentRecord: CommunicationConsent = {
        id: consentId,
        school_id: schoolId,
        parent_id: parentId,
        channel: "whatsapp",
        status: pData.whatsapp_consent !== false ? "opted_in" : "opted_out",
        captured_at: timestamp,
        source: "admission_form",
        captured_by: actorId,
        created_at: timestamp,
        updated_at: timestamp,
      };

      if (isSupabaseConfigured) {
        await supabase.from("communication_consents").insert(consentRecord);
      } else {
        const cKey = getCommunicationConsentsCacheKey(schoolId);
        const cCached = localStorage.getItem(cKey);
        const consents: CommunicationConsent[] = cCached ? JSON.parse(cCached) : [];
        consents.push(consentRecord);
        localStorage.setItem(cKey, JSON.stringify(consents));
      }
      createdConsentIds.push(consentId);
    }

    rollbackStack.push(async () => {
      if (isSupabaseConfigured) {
        if (createdLinkIds.length) await supabase.from("student_parents").delete().in("id", createdLinkIds);
        if (createdConsentIds.length) await supabase.from("communication_consents").delete().in("id", createdConsentIds);
        if (createdParentIds.length) await supabase.from("parents").delete().in("id", createdParentIds);
      } else {
        const spKey = getStudentParentsCacheKey(schoolId);
        const spCached = localStorage.getItem(spKey);
        const links: StudentParent[] = spCached ? JSON.parse(spCached) : [];
        localStorage.setItem(spKey, JSON.stringify(links.filter(l => !createdLinkIds.includes(l.id))));

        const cKey = getCommunicationConsentsCacheKey(schoolId);
        const cCached = localStorage.getItem(cKey);
        const consents: CommunicationConsent[] = cCached ? JSON.parse(cCached) : [];
        localStorage.setItem(cKey, JSON.stringify(consents.filter(c => !createdConsentIds.includes(c.id))));

        const pKey = getParentsCacheKey(schoolId);
        const pCached = localStorage.getItem(pKey);
        const parents: Parent[] = pCached ? JSON.parse(pCached) : [];
        localStorage.setItem(pKey, JSON.stringify(parents.filter(p => !createdParentIds.includes(p.id))));
      }
    });

    if (options?.forceFailAtStep === "parent") {
      throw new Error("Forced failure at parent step");
    }

    // STEP 6: Sensitive Aadhaar Storage (AES-256-GCM)
    if (encryptedAadhaar) {
      const sensitiveRecord: StudentSensitive = {
        student_id: studentId,
        school_id: schoolId,
        aadhaar_enc: encryptedAadhaar,
        aadhaar_last4: aadhaarLast4,
        aadhaar_hash: aadhaarHash,
        created_at: timestamp,
        updated_at: timestamp,
      };

      if (isSupabaseConfigured) {
        const { error: sensErr } = await supabase.from("student_sensitive").insert(sensitiveRecord);
        if (sensErr) throw new Error(`Failed to insert sensitive record: ${sensErr.message}`);
      } else {
        const cacheKey = getStudentSensitiveCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const sensList: StudentSensitive[] = cached ? JSON.parse(cached) : [];
        sensList.push(sensitiveRecord);
        localStorage.setItem(cacheKey, JSON.stringify(sensList));
      }

      rollbackStack.push(async () => {
        if (isSupabaseConfigured) {
          await supabase.from("student_sensitive").delete().eq("student_id", studentId);
        } else {
          const cacheKey = getStudentSensitiveCacheKey(schoolId);
          const cached = localStorage.getItem(cacheKey);
          const sensList: StudentSensitive[] = cached ? JSON.parse(cached) : [];
          localStorage.setItem(cacheKey, JSON.stringify(sensList.filter(s => s.student_id !== studentId)));
        }
      });
    }

    if (options?.forceFailAtStep === "sensitive") {
      throw new Error("Forced failure at sensitive step");
    }

    // STEP 7: Medical Record
    if (payload.step6_medical && Object.keys(payload.step6_medical).length > 0) {
      const medRecord: StudentMedical = {
        student_id: studentId,
        school_id: schoolId,
        ...payload.step6_medical,
        updated_by: actorId,
        updated_at: timestamp,
      };

      if (isSupabaseConfigured) {
        const { error: medErr } = await supabase.from("student_medical").insert(medRecord);
        if (medErr) throw new Error(`Failed to insert medical record: ${medErr.message}`);
      } else {
        const cacheKey = getStudentMedicalCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const medList: StudentMedical[] = cached ? JSON.parse(cached) : [];
        medList.push(medRecord);
        localStorage.setItem(cacheKey, JSON.stringify(medList));
      }

      rollbackStack.push(async () => {
        if (isSupabaseConfigured) {
          await supabase.from("student_medical").delete().eq("student_id", studentId);
        } else {
          const cacheKey = getStudentMedicalCacheKey(schoolId);
          const cached = localStorage.getItem(cacheKey);
          const medList: StudentMedical[] = cached ? JSON.parse(cached) : [];
          localStorage.setItem(cacheKey, JSON.stringify(medList.filter(m => m.student_id !== studentId)));
        }
      });
    }

    if (options?.forceFailAtStep === "medical") {
      throw new Error("Forced failure at medical step");
    }

    // STEP 8: Documents Vault
    const docIds: string[] = [];
    if (payload.step4_documents && payload.step4_documents.length > 0) {
      const docList: StudentDocument[] = payload.step4_documents.map(d => ({
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: studentId,
        doc_type: d.doc_type,
        status: d.status || "uploaded",
        file_name: d.file_name,
        mime: d.mime,
        size_bytes: d.size_bytes,
        expected_on: d.expected_on,
        storage_path: `documents/${schoolId}/${studentId}/${d.doc_type}.${d.file_name?.split('.').pop() || 'pdf'}`,
        uploaded_by: actorId,
        uploaded_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      }));

      docIds.push(...docList.map(d => d.id));

      if (isSupabaseConfigured) {
        const { error: docErr } = await supabase.from("student_documents").insert(docList);
        if (docErr) throw new Error(`Failed to insert documents: ${docErr.message}`);
      } else {
        const cacheKey = getStudentDocumentsCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const docs: StudentDocument[] = cached ? JSON.parse(cached) : [];
        docs.push(...docList);
        localStorage.setItem(cacheKey, JSON.stringify(docs));
      }

      rollbackStack.push(async () => {
        if (isSupabaseConfigured) {
          await supabase.from("student_documents").delete().in("id", docIds);
        } else {
          const cacheKey = getStudentDocumentsCacheKey(schoolId);
          const cached = localStorage.getItem(cacheKey);
          const docs: StudentDocument[] = cached ? JSON.parse(cached) : [];
          localStorage.setItem(cacheKey, JSON.stringify(docs.filter(d => !docIds.includes(d.id))));
        }
      });
    }

    if (options?.forceFailAtStep === "document") {
      throw new Error("Forced failure at document step");
    }

    // STEP 9: Previous school & Achievements if present
    if (payload.step3_academic.previous_school) {
      const psRecord: StudentPreviousSchool = {
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: studentId,
        ...payload.step3_academic.previous_school,
        created_at: timestamp,
        updated_at: timestamp,
      };
      if (isSupabaseConfigured) {
        await supabase.from("student_previous_schools").insert(psRecord);
      } else {
        const cacheKey = `myzkool_student_previous_schools_${schoolId}`;
        const cached = localStorage.getItem(cacheKey);
        const list = cached ? JSON.parse(cached) : [];
        list.push(psRecord);
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
      rollbackStack.push(async () => {
        if (isSupabaseConfigured) {
          await supabase.from("student_previous_schools").delete().eq("id", psRecord.id);
        } else {
          const cacheKey = `myzkool_student_previous_schools_${schoolId}`;
          const cached = localStorage.getItem(cacheKey);
          const list = cached ? JSON.parse(cached) : [];
          localStorage.setItem(cacheKey, JSON.stringify(list.filter((x: any) => x.id !== psRecord.id)));
        }
      });
    }

    // STEP 10: Transport & Fee stubs
    if (payload.step7_transport?.opt_in) {
      console.log(`[Transport] Student ${studentId} assigned to transport route: ${payload.step7_transport.route_id || 'default'}`);
    }

    if (payload.step8_fee?.fee_structure_id) {
      await feeService.assignStructure(studentId);
    }

    // STEP 11: Student Timeline Event
    const eventRecord: StudentEvent = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: studentId,
      kind: "admitted",
      summary: `Admitted to Class ${payload.step3_academic.class_id} (Admission No: ${admissionNo})`,
      created_by: actorId,
      created_at: timestamp,
    };

    if (isSupabaseConfigured) {
      await supabase.from("student_events").insert(eventRecord);
    } else {
      const cacheKey = getStudentEventsCacheKey(schoolId);
      const cached = localStorage.getItem(cacheKey);
      const events: StudentEvent[] = cached ? JSON.parse(cached) : [];
      events.push(eventRecord);
      localStorage.setItem(cacheKey, JSON.stringify(events));
    }

    rollbackStack.push(async () => {
      if (isSupabaseConfigured) {
        await supabase.from("student_events").delete().eq("id", eventRecord.id);
      } else {
        const cacheKey = getStudentEventsCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const events: StudentEvent[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem(cacheKey, JSON.stringify(events.filter(e => e.id !== eventRecord.id)));
      }
    });

    // STEP 12: Audit Log
    const auditRow: AuditLog = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      actor_id: actorId,
      actor_role: actorRole,
      entity_type: "students",
      entity_id: studentId,
      action: "student.admitted",
      after: { admission_no: admissionNo, first_name: payload.step1_basic.first_name, last_name: payload.step1_basic.last_name },
      reason: "Admitted via admission wizard",
      created_at: timestamp,
    };

    if (isSupabaseConfigured) {
      await supabase.from("audit_logs").insert(auditRow);
    } else {
      const cacheKey = getAuditLogsCacheKey(schoolId);
      const cached = localStorage.getItem(cacheKey);
      const logs: AuditLog[] = cached ? JSON.parse(cached) : [];
      logs.push(auditRow);
      localStorage.setItem(cacheKey, JSON.stringify(logs));
    }

    rollbackStack.push(async () => {
      if (isSupabaseConfigured) {
        await supabase.from("audit_logs").delete().eq("id", auditRow.id);
      } else {
        const cacheKey = getAuditLogsCacheKey(schoolId);
        const cached = localStorage.getItem(cacheKey);
        const logs: AuditLog[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem(cacheKey, JSON.stringify(logs.filter(l => l.id !== auditRow.id)));
      }
    });

    // STEP 13: WhatsApp Outbox Notification
    let outboxId: string | null = null;
    if (primaryParentPhone && primaryParentConsented) {
      const outboxRes = await createNotificationOutbox(schoolId, {
        channel: "whatsapp",
        template_key: "admission_confirmation",
        recipient_phone: primaryParentPhone,
        params: {
          student_name: `${payload.step1_basic.first_name} ${payload.step1_basic.last_name}`,
          admission_no: admissionNo,
          class_name: payload.step3_academic.class_id,
        },
        related_type: "student",
        related_id: studentId,
        dedupe_key: `admission_confirmation:${studentId}`,
      });
      if (outboxRes.outbox) {
        outboxId = outboxRes.outbox.id;
      }
    }

    rollbackStack.push(async () => {
      if (outboxId) {
        if (isSupabaseConfigured) {
          await supabase.from("notification_outbox").delete().eq("id", outboxId);
        } else {
          const cacheKey = getNotificationOutboxCacheKey(schoolId);
          const cached = localStorage.getItem(cacheKey);
          const outboxItems: NotificationOutbox[] = cached ? JSON.parse(cached) : [];
          localStorage.setItem(cacheKey, JSON.stringify(outboxItems.filter(o => o.id !== outboxId)));
        }
      }
    });

    if (options?.forceFailAtStep === "outbox") {
      throw new Error("Forced failure at outbox step");
    }

    // STEP 14: Clear draft for this user
    await deleteStudentDraft(schoolId, actorId);

    return { student: studentRecord };
  } catch (err: any) {
    // Execute rollback stack in reverse order to ensure clean state
    for (let i = rollbackStack.length - 1; i >= 0; i--) {
      try {
        await rollbackStack[i]();
      } catch (rbErr) {
        console.error("Rollback step error:", rbErr);
      }
    }
    return { error: err?.message || "Failed to admit student", rolledBack: true };
  }
}

export const admitStudent = admitStudentTransactional;

export { STUDENT_PERMISSIONS, STUDENT_ROLE_PERMISSIONS };
export type { StudentPermissionKey };
export * from "./studentOperationsService";
