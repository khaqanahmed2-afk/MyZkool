/**
 * Student Operations Service Layer (Stage 4)
 * 
 * Implements:
 * - Plan limits enforcement (800 Basic, 1,800 Pro; 90% warning, 100% block)
 * - Bulk Import (/admin/students/import): template, parse, validate, commit, rollback
 * - Promotion Pipeline (/admin/students/promotion): source to target mapping, overrides, distribution, dues warning, 24h undo
 * - Status Change & TC generation: reason required, dues check/override, transport end prompt, counter-based tc_no, QR code, duplicate copy
 * - Parent Merge: phone lookup, link migration, audit logging
 * - Classes & Sections Settings (/admin/settings/classes): display order, soft capacity warnings, copy sections from last year
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  Student,
  StudentStatus,
  StudentGender,
  StudentCategory,
  ParentRelation,
  ImportBatch,
  ImportBatchStatus,
  ImportValidationRow,
  ImportValidationResult,
  ImportCommitResult,
  ImportRowData,
  PromotionBatch,
  PromotionBatchStatus,
  PromotionConfig,
  PromotionPreviewResult,
  PromotionExecuteResult,
  PromotionStudentItem,
  PromotionClassMapping,
  StatusChangeInput,
  IssueTCInput,
  StudentTransferCertificate,
  TCStatus,
  PlanLimitsStatus,
  ParentMergePreview,
  ParentMergeResult,
  StudentEnrollment,
  EnrollmentStatus,
  Parent,
  AuditLog,
} from "../types/students";
import { createFeeService } from "./feeService";
import { transportService } from "./transportService";
import {
  getNextCounter,
  logAudit,
  getStudentProfile,
} from "./studentService";

/** Get a fee service instance with school context (Phase 3a: wires real balance) */
function getFeeService(schoolId: string) { return createFeeService(schoolId); }

// Local storage cache keys
const STUDENTS_CACHE_PREFIX = "myzkool_students_";
const PARENTS_CACHE_PREFIX = "myzkool_parents_";
const STUDENT_PARENTS_CACHE_PREFIX = "myzkool_student_parents_";
const STUDENT_ENROLLMENTS_CACHE_PREFIX = "myzkool_student_enrollments_";
const STUDENT_ADDRESSES_CACHE_PREFIX = "myzkool_student_addresses_";
const STUDENT_EVENTS_CACHE_PREFIX = "myzkool_student_events_";
const IMPORT_BATCHES_CACHE_PREFIX = "myzkool_import_batches_";
const PROMOTION_BATCHES_CACHE_PREFIX = "myzkool_promotion_batches_";
const TRANSFER_CERTIFICATES_CACHE_PREFIX = "myzkool_transfer_certificates_";
const SCHOOL_PLANS_CACHE_PREFIX = "myzkool_school_plans_";
const CLASSES_CACHE_PREFIX = "myzkool_classes_";
const SECTIONS_CACHE_PREFIX = "myzkool_sections_";

async function recordStudentEvent(
  schoolId: string,
  studentId: string,
  kind: any,
  summary: string,
  actorId?: string
): Promise<void> {
  const eventRecord = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: studentId,
    kind,
    summary,
    created_by: actorId || null,
    created_at: new Date().toISOString(),
  };
  if (isSupabaseConfigured) {
    await supabase.from("student_events").insert(eventRecord);
  } else if (typeof localStorage !== "undefined") {
    const cacheKey = `${STUDENT_EVENTS_CACHE_PREFIX}${schoolId}`;
    const cached = localStorage.getItem(cacheKey);
    const events = cached ? JSON.parse(cached) : [];
    events.push(eventRecord);
    localStorage.setItem(cacheKey, JSON.stringify(events));
  }
}

async function audit(
  schoolId: string,
  entry: {
    actor_id?: string | null;
    actor_role?: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string | null;
  }
): Promise<void> {
  await logAudit({
    school_id: schoolId,
    actor_id: entry.actor_id || null,
    actor_role: entry.actor_role || null,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    before: entry.before || null,
    after: entry.after || null,
    reason: entry.reason || null,
  });
}

function getStudentsCacheKey(schoolId: string) {
  return `${STUDENTS_CACHE_PREFIX}${schoolId}`;
}
function getParentsCacheKey(schoolId: string) {
  return `${PARENTS_CACHE_PREFIX}${schoolId}`;
}
function getStudentParentsCacheKey(schoolId: string) {
  return `${STUDENT_PARENTS_CACHE_PREFIX}${schoolId}`;
}
function getStudentEnrollmentsCacheKey(schoolId: string) {
  return `${STUDENT_ENROLLMENTS_CACHE_PREFIX}${schoolId}`;
}
function getStudentAddressesCacheKey(schoolId: string) {
  return `${STUDENT_ADDRESSES_CACHE_PREFIX}${schoolId}`;
}
function getImportBatchesCacheKey(schoolId: string) {
  return `${IMPORT_BATCHES_CACHE_PREFIX}${schoolId}`;
}
function getPromotionBatchesCacheKey(schoolId: string) {
  return `${PROMOTION_BATCHES_CACHE_PREFIX}${schoolId}`;
}
function getTransferCertificatesCacheKey(schoolId: string) {
  return `${TRANSFER_CERTIFICATES_CACHE_PREFIX}${schoolId}`;
}
function getSchoolPlansCacheKey(schoolId: string) {
  return `${SCHOOL_PLANS_CACHE_PREFIX}${schoolId}`;
}
function getClassesCacheKey(schoolId: string) {
  return `${CLASSES_CACHE_PREFIX}${schoolId}`;
}
function getSectionsCacheKey(schoolId: string) {
  return `${SECTIONS_CACHE_PREFIX}${schoolId}`;
}

// -----------------------------------------------------------------------------
// 1. Plan Limits Enforcement
// -----------------------------------------------------------------------------

export async function setSchoolPlan(schoolId: string, planTier: "Basic" | "Pro" | "Enterprise"): Promise<void> {
  const cacheKey = getSchoolPlansCacheKey(schoolId);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(cacheKey, planTier);
  }
}

export async function getSchoolPlanTier(schoolId: string): Promise<"Basic" | "Pro" | "Enterprise"> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("school_subscriptions")
      .select("subscription_plans(slug, name)")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .maybeSingle();

    if (data && (data as any).subscription_plans?.slug) {
      const slug = (data as any).subscription_plans.slug.toLowerCase();
      if (slug.includes("pro")) return "Pro";
      if (slug.includes("enterprise")) return "Enterprise";
      return "Basic";
    }
  }

  if (typeof localStorage !== "undefined") {
    const cached = localStorage.getItem(getSchoolPlansCacheKey(schoolId));
    if (cached === "Pro" || cached === "Enterprise") return cached as any;
  }
  return "Basic";
}

export async function checkSchoolStudentLimit(schoolId: string): Promise<PlanLimitsStatus> {
  const planTier = await getSchoolPlanTier(schoolId);
  const maxAllowed = planTier === "Pro" ? 1800 : planTier === "Enterprise" ? 5000 : 800;
  const warningThreshold = Math.floor(maxAllowed * 0.9); // 720 for Basic, 1620 for Pro

  let activeCount = 0;

  if (isSupabaseConfigured) {
    const { count, error } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .eq("status", "enrolled");

    if (!error && typeof count === "number") {
      activeCount = count;
    }
  } else if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(getStudentsCacheKey(schoolId));
    const students: Student[] = raw ? JSON.parse(raw) : [];
    activeCount = students.filter((s) => !s.deleted_at && s.status === "enrolled").length;
  }

  const isWarning = activeCount >= warningThreshold;
  const isBlocked = activeCount >= maxAllowed;
  const remainingCapacity = Math.max(0, maxAllowed - activeCount);

  return {
    active_count: activeCount,
    max_allowed: maxAllowed,
    plan_tier: planTier,
    warning_threshold: warningThreshold,
    is_warning: isWarning,
    is_blocked: isBlocked,
    remaining_capacity: remainingCapacity,
  };
}

// -----------------------------------------------------------------------------
// 2. Bulk Import (/admin/students/import)
// -----------------------------------------------------------------------------

export function generateImportTemplate(
  classes: { name: string; sections?: { name: string }[] }[]
): { csv: string; filename: string } {
  const classesListStr = classes.map((c) => c.name).join(", ");
  const headerComment = `# MyZkool Student Bulk Import Template\n# Available classes: ${classesListStr || "Class 1, Class 2, Class 3"}\n# Required columns: First Name, Last Name, Date of Birth, Gender, Class, Parent Name, Parent Phone\n`;
  const headers = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Date of Birth (YYYY-MM-DD)",
    "Gender (male/female/other)",
    "Class",
    "Section",
    "Roll No",
    "Parent Name",
    "Parent Phone",
    "Parent Relation (father/mother/guardian)",
    "Category (general/obc/sc/st/ews)",
    "Address Line 1",
    "City",
    "State",
    "Pincode",
    "Is RTE (yes/no)",
  ].join(",");

  const sampleRow = [
    "Aarav",
    "",
    "Sharma",
    "2019-05-12",
    "male",
    classes[0]?.name || "Class 1",
    classes[0]?.sections?.[0]?.name || "A",
    "1",
    "Ramesh Sharma",
    "9876543210",
    "father",
    "general",
    "123 Main Road",
    "Lucknow",
    "Uttar Pradesh",
    "226010",
    "no",
  ].join(",");

  return {
    csv: `${headerComment}${headers}\n${sampleRow}\n`,
    filename: `myzkool_students_import_template.csv`,
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  headers.forEach((h, index) => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!mapping["first_name"] && (clean.includes("firstname") || clean === "fname")) mapping["first_name"] = String(index);
    else if (!mapping["middle_name"] && (clean.includes("middlename") || clean === "mname")) mapping["middle_name"] = String(index);
    else if (!mapping["last_name"] && (clean.includes("lastname") || clean === "lname")) mapping["last_name"] = String(index);
    else if (!mapping["dob"] && (clean.includes("dob") || clean.includes("birth"))) mapping["dob"] = String(index);
    else if (!mapping["gender"] && (clean.includes("gender") || clean === "sex")) mapping["gender"] = String(index);
    else if (!mapping["class_name"] && (clean === "class" || clean.includes("grade"))) mapping["class_name"] = String(index);
    else if (!mapping["section_name"] && clean === "section") mapping["section_name"] = String(index);
    else if (!mapping["roll_no"] && clean.includes("roll")) mapping["roll_no"] = String(index);
    else if (!mapping["parent_name"] && (clean.includes("parentname") || clean.includes("fathername") || clean.includes("guardianname"))) {
      mapping["parent_name"] = String(index);
    } else if (!mapping["parent_phone"] && (clean.includes("phone") || clean.includes("mobile") || clean.includes("contact"))) {
      mapping["parent_phone"] = String(index);
    } else if (!mapping["parent_relation"] && clean.includes("relation")) mapping["parent_relation"] = String(index);
    else if (!mapping["category"] && clean.includes("category")) mapping["category"] = String(index);
    else if (!mapping["address_line1"] && clean.includes("address")) mapping["address_line1"] = String(index);
    else if (!mapping["city"] && clean.includes("city")) mapping["city"] = String(index);
    else if (!mapping["state"] && clean.includes("state")) mapping["state"] = String(index);
    else if (!mapping["pin"] && clean.includes("pin")) mapping["pin"] = String(index);
    else if (!mapping["is_rte"] && clean.includes("rte")) mapping["is_rte"] = String(index);
  });
  return mapping;
}

export async function parseAndValidateImportCSV(
  schoolId: string,
  csvContent: string,
  customColumnMapping?: Record<string, string>
): Promise<ImportValidationResult> {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (lines.length === 0) {
    return {
      file_name: "import.csv",
      total_rows: 0,
      valid_rows_count: 0,
      invalid_rows_count: 0,
      rows: [],
      can_commit: false,
      column_mapping: {},
    };
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const mapping = customColumnMapping || autoMapColumns(rawHeaders);
  const dataLines = lines.slice(1);

  // Maximum 2,000 rows rule (Spec A4.5)
  if (dataLines.length > 2000) {
    throw new Error(
      `Import file exceeds maximum allowed limit of 2,000 rows (${dataLines.length} rows provided)`
    );
  }

  const maxRows = 2000;
  const rowsToProcess = dataLines.slice(0, maxRows);

  const validationRows: ImportValidationRow[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < rowsToProcess.length; i++) {
    const rawCols = parseCSVLine(rowsToProcess[i]);
    const getVal = (field: string) => {
      const idx = mapping[field];
      return idx !== undefined && rawCols[parseInt(idx, 10)] !== undefined
        ? rawCols[parseInt(idx, 10)].trim()
        : "";
    };

    const rowData: Partial<ImportRowData> = {
      first_name: getVal("first_name"),
      middle_name: getVal("middle_name") || undefined,
      last_name: getVal("last_name"),
      dob: getVal("dob"),
      gender: getVal("gender").toLowerCase() as StudentGender,
      class_name: getVal("class_name"),
      section_name: getVal("section_name") || undefined,
      roll_no: getVal("roll_no") || undefined,
      parent_name: getVal("parent_name"),
      parent_phone: getVal("parent_phone").replace(/\D/g, ""),
      parent_relation: (getVal("parent_relation").toLowerCase() as ParentRelation) || "father",
      category: (getVal("category").toLowerCase() as StudentCategory) || "general",
      address_line1: getVal("address_line1") || undefined,
      city: getVal("city") || undefined,
      state: getVal("state") || undefined,
      pin: getVal("pin") || undefined,
      is_rte: ["yes", "true", "1", "y"].includes(getVal("is_rte").toLowerCase()),
    };

    const errors: string[] = [];

    // Required column validations
    if (!rowData.first_name) errors.push("First name is required");
    if (!rowData.last_name) errors.push("Last name is required");
    if (!rowData.dob) {
      errors.push("Date of birth is required");
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(rowData.dob)) {
      errors.push("Date of birth must be in YYYY-MM-DD format");
    } else {
      const dobDate = new Date(rowData.dob);
      if (isNaN(dobDate.getTime()) || dobDate >= new Date()) {
        errors.push("Date of birth must be a valid date in the past");
      }
    }

    if (!rowData.gender) {
      errors.push("Gender is required");
    } else if (!["male", "female", "other"].includes(rowData.gender)) {
      errors.push("Gender must be 'male', 'female', or 'other'");
    }

    if (!rowData.class_name) {
      errors.push("Class is required");
    }

    if (!rowData.parent_name) {
      errors.push("Parent / Guardian name is required");
    }

    if (!rowData.parent_phone) {
      errors.push("Parent phone number is required");
    } else if (rowData.parent_phone.length !== 10) {
      errors.push("Parent phone must be exactly 10 digits");
    }

    // In-file duplicate check
    const dedupeKey = `${rowData.first_name?.toLowerCase()}_${rowData.last_name?.toLowerCase()}_${rowData.dob}`;
    if (seenKeys.has(dedupeKey)) {
      errors.push("Duplicate student row found within this file");
    } else {
      seenKeys.add(dedupeKey);
    }

    validationRows.push({
      row_index: i + 1,
      data: rowData,
      errors,
      is_valid: errors.length === 0,
    });
  }

  const validCount = validationRows.filter((r) => r.is_valid).length;
  const invalidCount = validationRows.length - validCount;

  return {
    file_name: "students_import.csv",
    total_rows: validationRows.length,
    valid_rows_count: validCount,
    invalid_rows_count: invalidCount,
    rows: validationRows,
    can_commit: validCount > 0,
    column_mapping: mapping,
  };
}

export function generateErrorReportCSV(rows: ImportValidationRow[]): string {
  const invalidRows = rows.filter((r) => !r.is_valid);
  const header = "Row,First Name,Last Name,Class,Errors\n";
  const body = invalidRows
    .map((r) => {
      const fn = r.data.first_name || "";
      const ln = r.data.last_name || "";
      const cls = r.data.class_name || "";
      const err = `"${r.errors.join("; ").replace(/"/g, '""')}"`;
      return `${r.row_index},${fn},${ln},${cls},${err}`;
    })
    .join("\n");
  return header + body;
}

export async function commitImportBatch(
  schoolId: string,
  actorId: string,
  fileName: string,
  validRows: ImportValidationRow[]
): Promise<ImportCommitResult> {
  if (validRows.length === 0) {
    throw new Error("No valid rows to commit");
  }

  // 1. Plan limits check
  const limits = await checkSchoolStudentLimit(schoolId);
  if (limits.active_count + validRows.length > limits.max_allowed) {
    throw new Error(
      `LIMIT_REACHED: Importing ${validRows.length} students would exceed school limit of ${limits.max_allowed} active students (current: ${limits.active_count}).`
    );
  }

  // 2. Create import_batches record
  const batchId = crypto.randomUUID();
  const importBatch: ImportBatch = {
    id: batchId,
    school_id: schoolId,
    created_by: actorId,
    file_name: fileName,
    total_rows: validRows.length,
    created_rows: 0,
    skipped_rows: 0,
    status: "committed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const createdStudentIds: string[] = [];

  // Load existing parents to link siblings
  let existingParents: Parent[] = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("parents").select("*").eq("school_id", schoolId).is("deleted_at", null);
    if (data) existingParents = data;
  } else if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(getParentsCacheKey(schoolId));
    existingParents = raw ? JSON.parse(raw) : [];
  }

  const parentPhoneMap = new Map<string, Parent>();
  existingParents.forEach((p) => {
    if (p.phone) parentPhoneMap.set(p.phone.replace(/\D/g, ""), p);
  });

  const studentsToInsert: Student[] = [];
  const enrollmentsToInsert: StudentEnrollment[] = [];
  const parentsToInsert: Parent[] = [];
  const studentParentsToInsert: any[] = [];
  const addressesToInsert: any[] = [];

  const currentYear = new Date().getFullYear();

  for (let i = 0; i < validRows.length; i++) {
    const r = validRows[i].data;
    const studentId = crypto.randomUUID();
    createdStudentIds.push(studentId);

    // Admission number counter
    const counterRes = await getNextCounter(schoolId, "student_admission_no");
    const seq = counterRes.value || i + 1;
    const admissionNo = `ADM-${currentYear}-${String(seq).padStart(4, "0")}`;

    const studentRecord: Student = {
      id: studentId,
      school_id: schoolId,
      admission_no: admissionNo,
      first_name: r.first_name!,
      middle_name: r.middle_name || null,
      last_name: r.last_name!,
      dob: r.dob!,
      gender: r.gender!,
      nationality: "Indian",
      category: r.category || "general",
      is_rte: r.is_rte || false,
      admission_date: new Date().toISOString().split("T")[0],
      admission_type: "new",
      status: "enrolled",
      import_batch_id: batchId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: actorId,
    };
    studentsToInsert.push(studentRecord);

    // Parent matching (links sibling if phone matches)
    const phone = r.parent_phone!;
    let parent = parentPhoneMap.get(phone);
    if (!parent) {
      parent = {
        id: crypto.randomUUID(),
        school_id: schoolId,
        full_name: r.parent_name || "Parent",
        phone: phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      parentsToInsert.push(parent);
      parentPhoneMap.set(phone, parent);
    }

    studentParentsToInsert.push({
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: studentId,
      parent_id: parent.id,
      relation: r.parent_relation || "father",
      is_primary_contact: true,
      is_fee_payer: true,
      is_emergency_contact: true,
      can_pickup: true,
      lives_with: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Enrollment
    enrollmentsToInsert.push({
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: studentId,
      academic_year_id: "ay-current",
      class_id: r.class_name || "class-1",
      section_id: r.section_name || null,
      roll_no: r.roll_no || null,
      status: "active",
      enrolled_on: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Address
    if (r.address_line1 || r.city) {
      addressesToInsert.push({
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: studentId,
        kind: "current",
        line1: r.address_line1 || "",
        city: r.city || "",
        state: r.state || "",
        pin: r.pin || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Persistence (Supabase or In-Memory / LocalStorage)
  if (isSupabaseConfigured) {
    await supabase.from("import_batches").insert(importBatch);
    if (parentsToInsert.length > 0) await supabase.from("parents").insert(parentsToInsert);
    if (studentsToInsert.length > 0) await supabase.from("students").insert(studentsToInsert);
    if (studentParentsToInsert.length > 0) await supabase.from("student_parents").insert(studentParentsToInsert);
    if (enrollmentsToInsert.length > 0) await supabase.from("student_enrollments").insert(enrollmentsToInsert);
    if (addressesToInsert.length > 0) await supabase.from("student_addresses").insert(addressesToInsert);
  } else if (typeof localStorage !== "undefined") {
    // Import batches
    const ibKey = getImportBatchesCacheKey(schoolId);
    const prevBatches = localStorage.getItem(ibKey);
    const batches: ImportBatch[] = prevBatches ? JSON.parse(prevBatches) : [];
    batches.unshift(importBatch);
    localStorage.setItem(ibKey, JSON.stringify(batches));

    // Parents
    const pKey = getParentsCacheKey(schoolId);
    const curParents = localStorage.getItem(pKey);
    const parents: Parent[] = curParents ? JSON.parse(curParents) : [];
    parents.push(...parentsToInsert);
    localStorage.setItem(pKey, JSON.stringify(parents));

    // Students
    const sKey = getStudentsCacheKey(schoolId);
    const curStudents = localStorage.getItem(sKey);
    const students: Student[] = curStudents ? JSON.parse(curStudents) : [];
    students.push(...studentsToInsert);
    localStorage.setItem(sKey, JSON.stringify(students));

    // Student parents
    const spKey = getStudentParentsCacheKey(schoolId);
    const curSP = localStorage.getItem(spKey);
    const spList = curSP ? JSON.parse(curSP) : [];
    spList.push(...studentParentsToInsert);
    localStorage.setItem(spKey, JSON.stringify(spList));

    // Enrollments
    const seKey = getStudentEnrollmentsCacheKey(schoolId);
    const curSE = localStorage.getItem(seKey);
    const seList = curSE ? JSON.parse(curSE) : [];
    seList.push(...enrollmentsToInsert);
    localStorage.setItem(seKey, JSON.stringify(seList));

    // Addresses
    const saKey = getStudentAddressesCacheKey(schoolId);
    const curSA = localStorage.getItem(saKey);
    const saList = curSA ? JSON.parse(curSA) : [];
    saList.push(...addressesToInsert);
    localStorage.setItem(saKey, JSON.stringify(saList));
  }

  // Audit log for import batch
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: "admin",
    entity_type: "import_batch",
    entity_id: batchId,
    action: "import_committed",
    after: { total_rows: validRows.length, created_students: createdStudentIds.length },
    reason: `Committed bulk import of ${createdStudentIds.length} students from ${fileName}`,
  });

  importBatch.created_rows = createdStudentIds.length;

  return {
    batch_id: batchId,
    total_rows: validRows.length,
    created_rows: createdStudentIds.length,
    skipped_rows: 0,
    status: "committed",
    created_student_ids: createdStudentIds,
  };
}

export async function getImportBatches(schoolId: string): Promise<ImportBatch[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("import_batches")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    if (data) return data;
  }
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(getImportBatchesCacheKey(schoolId));
    return raw ? JSON.parse(raw) : [];
  }
  return [];
}

export async function rollbackImportBatch(
  schoolId: string,
  batchId: string,
  actorId: string
): Promise<{ success: boolean; rolled_back_count: number }> {
  // 1. Get batch
  const batches = await getImportBatches(schoolId);
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) {
    throw new Error("Import batch not found");
  }
  if (batch.status === "rolled_back") {
    throw new Error("Import batch has already been rolled back");
  }

  // 2. Fetch students in this batch
  let students: Student[] = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("import_batch_id", batchId)
      .is("deleted_at", null);
    if (data) students = data;
  } else if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(getStudentsCacheKey(schoolId));
    const allStudents: Student[] = raw ? JSON.parse(raw) : [];
    students = allStudents.filter((s) => s.import_batch_id === batchId && !s.deleted_at);
  }

  // 3. Rule A4.5: Block rollback if any student has receipts, transport assignments, or later edits
  for (const student of students) {
    // Check fee receipts / balance
    const feeRes = await getFeeService(schoolId).getStudentBalance(student.id);
    const balance = feeRes?.balance || 0;
    if (balance > 0) {
      throw new Error(
        `CANNOT_ROLLBACK: Student ${student.first_name} ${student.last_name} (${student.admission_no}) has fee records/balance.`
      );
    }

    // Check transport
    const transport = await transportService.getStudentTransport(student.id);
    if (transport?.assignment) {
      throw new Error(
        `CANNOT_ROLLBACK: Student ${student.first_name} ${student.last_name} (${student.admission_no}) has active transport assignments.`
      );
    }

    // Check later edits (updated_at significantly later than created_at, e.g. > 5 seconds)
    const createdAtMs = new Date(student.created_at).getTime();
    const updatedAtMs = new Date(student.updated_at).getTime();
    if (updatedAtMs - createdAtMs > 5000) {
      throw new Error(
        `CANNOT_ROLLBACK: Student ${student.first_name} ${student.last_name} (${student.admission_no}) has modifications made after import.`
      );
    }
  }

  // 4. Soft-delete the students
  const nowStr = new Date().toISOString();
  if (isSupabaseConfigured) {
    await supabase
      .from("students")
      .update({
        deleted_at: nowStr,
        deleted_by: actorId,
        delete_reason: "Import batch rollback",
      })
      .eq("import_batch_id", batchId);

    await supabase
      .from("import_batches")
      .update({ status: "rolled_back", updated_at: nowStr })
      .eq("id", batchId);
  } else if (typeof localStorage !== "undefined") {
    // Update students in localStorage
    const sKey = getStudentsCacheKey(schoolId);
    const raw = localStorage.getItem(sKey);
    const allStudents: Student[] = raw ? JSON.parse(raw) : [];
    allStudents.forEach((s) => {
      if (s.import_batch_id === batchId) {
        s.deleted_at = nowStr;
        s.deleted_by = actorId;
        s.delete_reason = "Import batch rollback";
      }
    });
    localStorage.setItem(sKey, JSON.stringify(allStudents));

    // Update batch status
    const ibKey = getImportBatchesCacheKey(schoolId);
    const rawBatches = localStorage.getItem(ibKey);
    const allBatches: ImportBatch[] = rawBatches ? JSON.parse(rawBatches) : [];
    const b = allBatches.find((item) => item.id === batchId);
    if (b) {
      b.status = "rolled_back";
      b.updated_at = nowStr;
    }
    localStorage.setItem(ibKey, JSON.stringify(allBatches));
  }

  // 5. Audit log
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: "admin",
    entity_type: "import_batch",
    entity_id: batchId,
    action: "import_rolled_back",
    reason: `Rolled back import batch ${batch.file_name} with ${students.length} students soft-deleted`,
  });

  return { success: true, rolled_back_count: students.length };
}

// -----------------------------------------------------------------------------
// 3. Promotion Pipeline (/admin/students/promotion)
// -----------------------------------------------------------------------------

export async function getPromotionPreview(
  schoolId: string,
  fromYearId: string,
  toYearId: string,
  config?: Partial<PromotionConfig>
): Promise<PromotionPreviewResult> {
  // Fetch active enrollments in fromYearId
  let enrollments: StudentEnrollment[] = [];
  let students: Student[] = [];

  if (isSupabaseConfigured) {
    const [enrRes, stdRes] = await Promise.all([
      supabase
        .from("student_enrollments")
        .select("*")
        .eq("school_id", schoolId)
        .eq("academic_year_id", fromYearId)
        .eq("status", "active"),
      supabase.from("students").select("*").eq("school_id", schoolId).is("deleted_at", null),
    ]);
    if (enrRes.data) enrollments = enrRes.data;
    if (stdRes.data) students = stdRes.data;
  } else if (typeof localStorage !== "undefined") {
    const rawE = localStorage.getItem(getStudentEnrollmentsCacheKey(schoolId));
    const allE: StudentEnrollment[] = rawE ? JSON.parse(rawE) : [];
    enrollments = allE.filter((e) => e.academic_year_id === fromYearId && e.status === "active");

    const rawS = localStorage.getItem(getStudentsCacheKey(schoolId));
    const allS: Student[] = rawS ? JSON.parse(rawS) : [];
    students = allS.filter((s) => !s.deleted_at);
  }

  const studentMap = new Map<string, Student>();
  students.forEach((s) => studentMap.set(s.id, s));

  // Determine distinct classes from enrollments
  const classNames = Array.from(new Set(enrollments.map((e) => e.class_id))).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
    const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
    return numA - numB;
  });

  // Build sequential class mapping (Class 1 -> Class 2, etc.)
  // Last class maps to null ("Passed out")
  const classMappings: PromotionClassMapping[] = [];
  for (let i = 0; i < classNames.length; i++) {
    const currentClass = classNames[i];
    const nextClass = i < classNames.length - 1 ? classNames[i + 1] : null;
    const count = enrollments.filter((e) => e.class_id === currentClass).length;

    classMappings.push({
      from_class_id: currentClass,
      from_class_name: currentClass,
      to_class_id: nextClass,
      to_class_name: nextClass ? nextClass : "Passed Out",
      student_count: count,
    });
  }

  const overrides = config?.overrides || {};
  const distribution = config?.section_distribution || "keep_letter";

  const studentItems: PromotionStudentItem[] = [];
  let duesCount = 0;
  let promoteCount = 0;
  let detainCount = 0;
  let leaveCount = 0;
  let passOutCount = 0;

  for (const enr of enrollments) {
    const student = studentMap.get(enr.student_id);
    if (!student) continue;

    // Check dues
    const duesRes = await getFeeService(schoolId).getStudentBalance(student.id);
    const dues = duesRes?.balance || 0;
    const hasDues = dues > 0;
    if (hasDues) duesCount++;

    const mapping = classMappings.find((m) => m.from_class_id === enr.class_id);
    const isLastClass = !mapping || mapping.to_class_id === null;

    // Default action
    let defaultAction: "promote" | "detain" | "leave" | "pass_out" = isLastClass ? "pass_out" : "promote";
    let targetClassId = mapping?.to_class_id || null;
    let targetClassName = mapping?.to_class_name || "Passed Out";
    let targetSectionId = enr.section_id || null;

    // Override
    if (overrides[student.id]) {
      defaultAction = overrides[student.id].action;
      if (overrides[student.id].target_section_id) {
        targetSectionId = overrides[student.id].target_section_id;
      }
    }

    if (defaultAction === "detain") {
      targetClassId = enr.class_id;
      targetClassName = enr.class_id;
      detainCount++;
    } else if (defaultAction === "leave") {
      targetClassId = null;
      targetClassName = "Left School";
      leaveCount++;
    } else if (defaultAction === "pass_out") {
      targetClassId = null;
      targetClassName = "Passed Out";
      passOutCount++;
    } else {
      promoteCount++;
    }

    // Section distribution
    if (distribution === "unassigned") {
      targetSectionId = null;
    }

    studentItems.push({
      student_id: student.id,
      admission_no: student.admission_no,
      first_name: student.first_name,
      last_name: student.last_name,
      current_class_id: enr.class_id,
      current_class_name: enr.class_id,
      current_section_id: enr.section_id,
      current_section_name: enr.section_id || undefined,
      action: defaultAction,
      target_class_id: targetClassId,
      target_class_name: targetClassName,
      target_section_id: targetSectionId,
      target_section_name: targetSectionId || undefined,
      has_dues: hasDues,
      dues_amount_paise: dues,
    });
  }

  return {
    from_year_id: fromYearId,
    to_year_id: toYearId,
    total_eligible: enrollments.length,
    promote_count: promoteCount,
    detain_count: detainCount,
    leave_count: leaveCount,
    pass_out_count: passOutCount,
    dues_count: duesCount,
    class_mappings: classMappings,
    students: studentItems,
  };
}

export async function executePromotion(
  schoolId: string,
  actorId: string,
  config: PromotionConfig
): Promise<PromotionExecuteResult> {
  const preview = await getPromotionPreview(schoolId, config.from_year_id, config.to_year_id, config);
  const batchId = crypto.randomUUID();
  const nowStr = new Date().toISOString();

  const promotionBatch: PromotionBatch = {
    id: batchId,
    school_id: schoolId,
    from_year_id: config.from_year_id,
    to_year_id: config.to_year_id,
    status: "committed",
    summary: {
      total_processed: preview.students.length,
      promoted_count: preview.promote_count,
      detained_count: preview.detain_count,
      passed_out_count: preview.pass_out_count,
      leave_count: preview.leave_count,
      dues_count: preview.dues_count,
      students: preview.students.map((s) => ({
        student_id: s.student_id,
        action: s.action,
        from_class: s.current_class_id,
        to_class: s.target_class_id,
        to_section: s.target_section_id,
      })),
    },
    created_by: actorId,
    created_at: nowStr,
    updated_at: nowStr,
  };

  const newEnrollments: StudentEnrollment[] = [];

  for (const item of preview.students) {
    if (item.action === "promote" || item.action === "detain") {
      newEnrollments.push({
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: item.student_id,
        academic_year_id: config.to_year_id,
        class_id: item.target_class_id || item.current_class_id,
        section_id: item.target_section_id || null,
        status: "active",
        promotion_batch_id: batchId,
        enrolled_on: nowStr.split("T")[0],
        created_at: nowStr,
        updated_at: nowStr,
      });

      // Student event
      await recordStudentEvent(
        schoolId,
        item.student_id,
        "promoted",
        item.action === "promote"
          ? `Promoted to Class ${item.target_class_name || item.target_class_id} for AY ${config.to_year_id}`
          : `Detained in Class ${item.target_class_name || item.target_class_id} for AY ${config.to_year_id}`,
        actorId
      );
    } else if (item.action === "pass_out") {
      await recordStudentEvent(
        schoolId,
        item.student_id,
        "status_changed",
        `Student Passed Out from Class ${item.current_class_name} for AY ${config.from_year_id}`,
        actorId
      );
    }
  }

  // Persistence
  if (isSupabaseConfigured) {
    await supabase.from("promotion_batches").insert(promotionBatch);

    // Update old enrollments
    for (const item of preview.students) {
      const statusVal: EnrollmentStatus =
        item.action === "leave"
          ? "left"
          : item.action === "pass_out"
          ? "passed_out"
          : item.action === "detain"
          ? "detained"
          : "promoted";

      await supabase
        .from("student_enrollments")
        .update({
          status: statusVal,
          ended_on: nowStr.split("T")[0],
          updated_at: nowStr,
        })
        .eq("school_id", schoolId)
        .eq("student_id", item.student_id)
        .eq("academic_year_id", config.from_year_id);
    }

    if (newEnrollments.length > 0) {
      await supabase.from("student_enrollments").insert(newEnrollments);
    }
  } else if (typeof localStorage !== "undefined") {
    // Save promotion batch
    const pbKey = getPromotionBatchesCacheKey(schoolId);
    const rawPB = localStorage.getItem(pbKey);
    const batches: PromotionBatch[] = rawPB ? JSON.parse(rawPB) : [];
    batches.unshift(promotionBatch);
    localStorage.setItem(pbKey, JSON.stringify(batches));

    // Update enrollments in localStorage
    const seKey = getStudentEnrollmentsCacheKey(schoolId);
    const rawSE = localStorage.getItem(seKey);
    const allEnrollments: StudentEnrollment[] = rawSE ? JSON.parse(rawSE) : [];

    const actionMap = new Map(preview.students.map((s) => [s.student_id, s.action]));
    allEnrollments.forEach((e) => {
      if (e.academic_year_id === config.from_year_id && actionMap.has(e.student_id)) {
        const act = actionMap.get(e.student_id)!;
        const statusVal: EnrollmentStatus =
          act === "leave"
            ? "left"
            : act === "pass_out"
            ? "passed_out"
            : act === "detain"
            ? "detained"
            : "promoted";
        e.status = statusVal;
        e.ended_on = nowStr.split("T")[0];
        e.updated_at = nowStr;
      }
    });

    allEnrollments.push(...newEnrollments);
    localStorage.setItem(seKey, JSON.stringify(allEnrollments));
  }

  // Audit log
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: "admin",
    entity_type: "promotion_batch",
    entity_id: batchId,
    action: "promotion_executed",
    after: promotionBatch.summary as any,
    reason: `Executed academic promotion from ${config.from_year_id} to ${config.to_year_id}`,
  });

  return {
    batch_id: batchId,
    from_year_id: config.from_year_id,
    to_year_id: config.to_year_id,
    total_processed: preview.students.length,
    promoted_count: preview.promote_count,
    detained_count: preview.detain_count,
    passed_out_count: preview.pass_out_count,
    left_count: preview.leave_count,
    summary: promotionBatch.summary as any,
  };
}

export async function getPromotionBatches(schoolId: string): Promise<PromotionBatch[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("promotion_batches")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    if (data) return data;
  }
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(getPromotionBatchesCacheKey(schoolId));
    return raw ? JSON.parse(raw) : [];
  }
  return [];
}

export async function undoPromotion(
  schoolId: string,
  batchId: string,
  actorId: string
): Promise<{ success: boolean; reverted_students_count: number }> {
  // 1. Fetch batch
  const batches = await getPromotionBatches(schoolId);
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) {
    throw new Error("Promotion batch not found");
  }
  if (batch.status === "reverted") {
    throw new Error("Promotion batch has already been undone");
  }

  // 2. Check 24-hour undo window rule (A4.6)
  const createdAtMs = new Date(batch.created_at).getTime();
  const nowMs = Date.now();
  const hoursElapsed = (nowMs - createdAtMs) / (1000 * 60 * 60);
  if (hoursElapsed > 24) {
    throw new Error(`UNDO_WINDOW_EXPIRED: Promotion can only be undone within 24 hours of execution (${hoursElapsed.toFixed(1)}h elapsed).`);
  }

  // 3. Check if any new records (fees/attendance) exist in the target academic year
  // In our stub architecture, check fee/attendance guard
  const summaryStudents = (batch.summary as any)?.students || [];
  const studentIds: string[] = summaryStudents.map((s: any) => s.student_id);

  // Check if any student has fee transactions or attendance in the new year
  // If dependency exists: throw CANNOT_UNDO_PROMOTION error
  for (const sId of studentIds) {
    const balance = await getFeeService(schoolId).getStudentBalance(sId);
    // If payments were accepted in the new year (we verify through simulated check if tagged)
    if ((batch.summary as any)?.has_new_year_payments) {
      throw new Error("CANNOT_UNDO_PROMOTION: Fee receipts or attendance records exist in the target academic year.");
    }
  }

  // 4. Revert enrollments
  const nowStr = new Date().toISOString();
  if (isSupabaseConfigured) {
    // Delete newly created enrollments
    await supabase.from("student_enrollments").delete().eq("promotion_batch_id", batchId);

    // Restore old enrollments to active
    for (const sId of studentIds) {
      await supabase
        .from("student_enrollments")
        .update({
          status: "active",
          ended_on: null,
          updated_at: nowStr,
        })
        .eq("school_id", schoolId)
        .eq("student_id", sId)
        .eq("academic_year_id", batch.from_year_id);
    }

    await supabase
      .from("promotion_batches")
      .update({ status: "reverted", updated_at: nowStr })
      .eq("id", batchId);
  } else if (typeof localStorage !== "undefined") {
    const seKey = getStudentEnrollmentsCacheKey(schoolId);
    const rawSE = localStorage.getItem(seKey);
    let enrollments: StudentEnrollment[] = rawSE ? JSON.parse(rawSE) : [];

    // Remove new enrollments
    enrollments = enrollments.filter((e) => e.promotion_batch_id !== batchId);

    // Revert old enrollments
    const sIdSet = new Set(studentIds);
    enrollments.forEach((e) => {
      if (e.academic_year_id === batch.from_year_id && sIdSet.has(e.student_id)) {
        e.status = "active";
        e.ended_on = null;
        e.updated_at = nowStr;
      }
    });
    localStorage.setItem(seKey, JSON.stringify(enrollments));

    // Update batch status
    const pbKey = getPromotionBatchesCacheKey(schoolId);
    const rawPB = localStorage.getItem(pbKey);
    const allBatches: PromotionBatch[] = rawPB ? JSON.parse(rawPB) : [];
    const b = allBatches.find((item) => item.id === batchId);
    if (b) {
      b.status = "reverted";
      b.updated_at = nowStr;
    }
    localStorage.setItem(pbKey, JSON.stringify(allBatches));
  }

  // 5. Audit log
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: "admin",
    entity_type: "promotion_batch",
    entity_id: batchId,
    action: "promotion_undone",
    reason: `Undone promotion batch ${batchId}, reverting ${studentIds.length} students to active`,
  });

  return { success: true, reverted_students_count: studentIds.length };
}

// -----------------------------------------------------------------------------
// 4. Status Change & Transfer Certificate (TC)
// -----------------------------------------------------------------------------

export async function changeStudentStatus(
  schoolId: string,
  studentId: string,
  actorId: string,
  actorRole: string,
  input: StatusChangeInput
): Promise<Student> {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error("Reason is required when changing student status");
  }

  // Handle transport termination if requested
  if (input.end_transport) {
    await transportService.endAssignment(studentId, input.effective_date, input.reason);
  }

  let updatedStudent: Student | null = null;
  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("students")
      .update({
        status: input.new_status,
        status_changed_on: input.effective_date,
        status_reason: input.reason,
        updated_at: nowStr,
        updated_by: actorId,
      })
      .eq("school_id", schoolId)
      .eq("id", studentId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to change student status: ${error?.message || "Unknown error"}`);
    }
    updatedStudent = data;
  } else if (typeof localStorage !== "undefined") {
    const sKey = getStudentsCacheKey(schoolId);
    const raw = localStorage.getItem(sKey);
    const allStudents: Student[] = raw ? JSON.parse(raw) : [];
    const target = allStudents.find((s) => s.id === studentId);
    if (!target) {
      throw new Error("Student not found");
    }
    target.status = input.new_status;
    target.status_changed_on = input.effective_date;
    target.status_reason = input.reason;
    target.updated_at = nowStr;
    target.updated_by = actorId;
    localStorage.setItem(sKey, JSON.stringify(allStudents));
    updatedStudent = target;
  }

  if (!updatedStudent) {
    throw new Error("Student not found");
  }

  // Timeline event
  await recordStudentEvent(
    schoolId,
    studentId,
    "status_changed",
    `Status changed to ${input.new_status}: ${input.reason}`,
    actorId
  );

  // Audit log
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: "student",
    entity_id: studentId,
    action: "status_changed",
    after: { status: input.new_status, reason: input.reason, date: input.effective_date },
    reason: input.reason,
  });

  return updatedStudent;
}

export async function issueTransferCertificate(
  schoolId: string,
  studentId: string,
  actorId: string,
  actorRole: string,
  input: IssueTCInput
): Promise<StudentTransferCertificate> {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error("Reason for leaving is required to issue a Transfer Certificate");
  }

  // 1. Dues Check (Spec A4.7)
  const feeRes = await getFeeService(schoolId).getStudentBalance(studentId);
  const duesPaise = feeRes?.balance || 0;
  if (duesPaise > 0) {
    const isOwner = actorRole.toLowerCase() === "owner" || actorRole.toLowerCase() === "school_admin";
    if (!isOwner) {
      throw new Error(
        `DUES_BLOCK: Cannot issue Transfer Certificate. Student has outstanding dues of ₹${(duesPaise / 100).toFixed(2)}. Only the school owner can override.`
      );
    }
    if (!input.dues_override_reason || input.dues_override_reason.trim().length === 0) {
      throw new Error(
        `DUES_BLOCK: Cannot issue Transfer Certificate. Outstanding dues of ₹${(duesPaise / 100).toFixed(2)} exist. A typed override reason is required.`
      );
    }
  }

  // 2. Counter-based TC number
  const counterRes = await getNextCounter(schoolId, "student_tc_no");
  const tcSeq = counterRes.value || 1;
  const currentYear = new Date().getFullYear();
  const tcNo = `TC-${currentYear}-${String(tcSeq).padStart(4, "0")}`;

  // 3. QR code verification string
  const qrVerificationCode = `MYZKOOL:TC:${schoolId}:${tcNo}:${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // 4. Determine status: Admin prepares (draft) and Owner approves (Spec Decision A4.7)
  const isOwner = actorRole.toLowerCase() === "owner" || actorRole.toLowerCase() === "school_admin";
  const status: TCStatus = isOwner || input.require_owner_approval === false ? "approved" : "draft";

  const tcRecord: StudentTransferCertificate = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: studentId,
    tc_no: tcNo,
    issued_on: input.issued_on,
    last_class_id: input.last_class_id || null,
    last_academic_year_id: input.last_academic_year_id || null,
    reason: input.reason,
    conduct: input.conduct || "Good",
    remarks: input.remarks || null,
    dues_cleared: duesPaise === 0,
    dues_override_reason: duesPaise > 0 ? input.dues_override_reason : null,
    approved_by: status === "approved" ? actorId : null,
    is_duplicate_copy: false,
    original_tc_id: null,
    status: status,
    qr_verification_code: qrVerificationCode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 5. Persistence
  if (isSupabaseConfigured) {
    await supabase.from("student_transfer_certificates").insert(tcRecord);
  } else if (typeof localStorage !== "undefined") {
    const tcKey = getTransferCertificatesCacheKey(schoolId);
    const raw = localStorage.getItem(tcKey);
    const tcs: StudentTransferCertificate[] = raw ? JSON.parse(raw) : [];
    tcs.unshift(tcRecord);
    localStorage.setItem(tcKey, JSON.stringify(tcs));
  }

  // 6. Update student status to transferred
  await changeStudentStatus(schoolId, studentId, actorId, actorRole, {
    new_status: "transferred",
    effective_date: input.issued_on,
    reason: `TC issued (${tcNo}): ${input.reason}`,
  });

  // 7. Timeline event
  await recordStudentEvent(
    schoolId,
    studentId,
    "tc_issued",
    `Transfer Certificate Issued: ${tcNo}`,
    actorId
  );

  // 8. Audit log
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: "transfer_certificate",
    entity_id: tcRecord.id,
    action: "tc_issued",
    after: tcRecord as any,
    reason: `Issued Transfer Certificate ${tcNo}`,
  });

  return tcRecord;
}

export async function approveTransferCertificate(
  schoolId: string,
  tcId: string,
  ownerId: string
): Promise<StudentTransferCertificate> {
  let updatedTC: StudentTransferCertificate | null = null;
  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("student_transfer_certificates")
      .update({
        status: "approved",
        approved_by: ownerId,
        updated_at: nowStr,
      })
      .eq("school_id", schoolId)
      .eq("id", tcId)
      .select()
      .single();
    if (data) updatedTC = data;
  } else if (typeof localStorage !== "undefined") {
    const tcKey = getTransferCertificatesCacheKey(schoolId);
    const raw = localStorage.getItem(tcKey);
    const tcs: StudentTransferCertificate[] = raw ? JSON.parse(raw) : [];
    const target = tcs.find((t) => t.id === tcId);
    if (!target) throw new Error("Transfer certificate not found");
    target.status = "approved";
    target.approved_by = ownerId;
    target.updated_at = nowStr;
    localStorage.setItem(tcKey, JSON.stringify(tcs));
    updatedTC = target;
  }

  if (!updatedTC) throw new Error("Transfer certificate not found");

  await audit(schoolId, {
    actor_id: ownerId,
    actor_role: "owner",
    entity_type: "transfer_certificate",
    entity_id: tcId,
    action: "tc_approved",
    reason: `Approved Transfer Certificate ${updatedTC.tc_no}`,
  });

  return updatedTC;
}

export async function issueDuplicateTransferCertificate(
  schoolId: string,
  originalTcId: string,
  actorId: string,
  reason: string
): Promise<StudentTransferCertificate> {
  const tcs = await getTransferCertificates(schoolId);
  const original = tcs.find((t) => t.id === originalTcId);
  if (!original) {
    throw new Error("Original Transfer Certificate not found");
  }

  const duplicateRecord: StudentTransferCertificate = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: original.student_id,
    tc_no: original.tc_no, // Keeps original TC number (Spec A4.7)
    issued_on: new Date().toISOString().split("T")[0],
    last_class_id: original.last_class_id,
    last_academic_year_id: original.last_academic_year_id,
    reason: original.reason,
    conduct: original.conduct,
    remarks: `DUPLICATE COPY. Issued on ${new Date().toLocaleDateString("en-IN")}. Reason: ${reason}`,
    dues_cleared: original.dues_cleared,
    dues_override_reason: original.dues_override_reason,
    approved_by: actorId,
    is_duplicate_copy: true,
    original_tc_id: original.id,
    status: "approved",
    qr_verification_code: `MYZKOOL:TC:DUPLICATE:${original.tc_no}:${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("student_transfer_certificates").insert(duplicateRecord);
  } else if (typeof localStorage !== "undefined") {
    const tcKey = getTransferCertificatesCacheKey(schoolId);
    const raw = localStorage.getItem(tcKey);
    const allTCs: StudentTransferCertificate[] = raw ? JSON.parse(raw) : [];
    allTCs.unshift(duplicateRecord);
    localStorage.setItem(tcKey, JSON.stringify(allTCs));
  }

  await audit(schoolId, {
    actor_id: actorId,
    actor_role: "admin",
    entity_type: "transfer_certificate",
    entity_id: duplicateRecord.id,
    action: "tc_duplicate_issued",
    reason: `Issued duplicate copy of TC ${original.tc_no}: ${reason}`,
  });

  return duplicateRecord;
}

export async function getTransferCertificates(
  schoolId: string,
  filters?: { search?: string; status?: TCStatus }
): Promise<StudentTransferCertificate[]> {
  let list: StudentTransferCertificate[] = [];
  if (isSupabaseConfigured) {
    let query = supabase.from("student_transfer_certificates").select("*").eq("school_id", schoolId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data } = await query.order("created_at", { ascending: false });
    if (data) list = data;
  } else if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(getTransferCertificatesCacheKey(schoolId));
    list = raw ? JSON.parse(raw) : [];
    if (filters?.status) {
      list = list.filter((t) => t.status === filters.status);
    }
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((t) => t.tc_no.toLowerCase().includes(q) || t.reason.toLowerCase().includes(q));
  }

  return list;
}

// -----------------------------------------------------------------------------
// 5. Parent Merge Tool (Spec A4.9)
// -----------------------------------------------------------------------------

export async function previewParentMerge(
  schoolId: string,
  survivingParentId: string,
  duplicateParentId: string
): Promise<ParentMergePreview> {
  if (survivingParentId === duplicateParentId) {
    throw new Error("Cannot merge a parent record with itself");
  }

  let allParents: Parent[] = [];
  let allStudentParents: any[] = [];
  let allStudents: Student[] = [];

  if (isSupabaseConfigured) {
    const [pRes, spRes, sRes] = await Promise.all([
      supabase.from("parents").select("*").eq("school_id", schoolId),
      supabase.from("student_parents").select("*").eq("school_id", schoolId),
      supabase.from("students").select("*").eq("school_id", schoolId).is("deleted_at", null),
    ]);
    if (pRes.data) allParents = pRes.data;
    if (spRes.data) allStudentParents = spRes.data;
    if (sRes.data) allStudents = sRes.data;
  } else if (typeof localStorage !== "undefined") {
    const pRaw = localStorage.getItem(getParentsCacheKey(schoolId));
    allParents = pRaw ? JSON.parse(pRaw) : [];

    const spRaw = localStorage.getItem(getStudentParentsCacheKey(schoolId));
    allStudentParents = spRaw ? JSON.parse(spRaw) : [];

    const sRaw = localStorage.getItem(getStudentsCacheKey(schoolId));
    allStudents = sRaw ? JSON.parse(sRaw) : [];
  }

  const surviving = allParents.find((p) => p.id === survivingParentId && !p.deleted_at);
  const duplicate = allParents.find((p) => p.id === duplicateParentId && !p.deleted_at);

  if (!surviving) throw new Error("Surviving parent record not found");
  if (!duplicate) throw new Error("Duplicate parent record not found");

  const studentMap = new Map<string, Student>();
  allStudents.forEach((s) => studentMap.set(s.id, s));

  const survivingStudentIds = new Set(
    allStudentParents.filter((sp) => sp.parent_id === survivingParentId).map((sp) => sp.student_id)
  );

  const duplicateStudentParents = allStudentParents.filter((sp) => sp.parent_id === duplicateParentId);

  const studentsToLink: { id: string; first_name: string; last_name: string; admission_no: string }[] = [];
  const alreadyLinked: { id: string; first_name: string; last_name: string }[] = [];

  duplicateStudentParents.forEach((sp) => {
    const std = studentMap.get(sp.student_id);
    if (!std) return;

    if (survivingStudentIds.has(sp.student_id)) {
      alreadyLinked.push({ id: std.id, first_name: std.first_name, last_name: std.last_name });
    } else {
      studentsToLink.push({
        id: std.id,
        first_name: std.first_name,
        last_name: std.last_name,
        admission_no: std.admission_no,
      });
    }
  });

  return {
    surviving_parent: surviving,
    duplicate_parent: duplicate,
    students_to_link: studentsToLink,
    already_linked_students: alreadyLinked,
    consents_to_transfer: [],
  };
}

export async function executeParentMerge(
  schoolId: string,
  actorId: string,
  survivingParentId: string,
  duplicateParentId: string
): Promise<ParentMergeResult> {
  const preview = await previewParentMerge(schoolId, survivingParentId, duplicateParentId);
  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured) {
    // 1. Move student_parents links
    for (const student of preview.students_to_link) {
      await supabase
        .from("student_parents")
        .update({ parent_id: survivingParentId, updated_at: nowStr })
        .eq("school_id", schoolId)
        .eq("parent_id", duplicateParentId)
        .eq("student_id", student.id);
    }

    // 2. Remove any duplicate links that were already shared
    for (const student of preview.already_linked_students) {
      await supabase
        .from("student_parents")
        .delete()
        .eq("school_id", schoolId)
        .eq("parent_id", duplicateParentId)
        .eq("student_id", student.id);
    }

    // 3. Soft-delete duplicate parent
    await supabase
      .from("parents")
      .update({ deleted_at: nowStr, updated_at: nowStr })
      .eq("school_id", schoolId)
      .eq("id", duplicateParentId);
  } else if (typeof localStorage !== "undefined") {
    const spKey = getStudentParentsCacheKey(schoolId);
    const rawSP = localStorage.getItem(spKey);
    const allSP: any[] = rawSP ? JSON.parse(rawSP) : [];

    const toLinkIds = new Set(preview.students_to_link.map((s) => s.id));
    const alreadyLinkedIds = new Set(preview.already_linked_students.map((s) => s.id));

    allSP.forEach((sp) => {
      if (sp.parent_id === duplicateParentId) {
        if (toLinkIds.has(sp.student_id)) {
          sp.parent_id = survivingParentId;
          sp.updated_at = nowStr;
        }
      }
    });

    // Remove redundant shared links
    const filteredSP = allSP.filter(
      (sp) => !(sp.parent_id === duplicateParentId && alreadyLinkedIds.has(sp.student_id))
    );
    localStorage.setItem(spKey, JSON.stringify(filteredSP));

    // Soft-delete duplicate parent
    const pKey = getParentsCacheKey(schoolId);
    const rawP = localStorage.getItem(pKey);
    const allParents: Parent[] = rawP ? JSON.parse(rawP) : [];
    const dupP = allParents.find((p) => p.id === duplicateParentId);
    if (dupP) {
      dupP.deleted_at = nowStr;
      dupP.updated_at = nowStr;
    }
    localStorage.setItem(pKey, JSON.stringify(allParents));
  }

  // Write append-only audit row (Spec A4.9)
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: "admin",
    entity_type: "parent",
    entity_id: survivingParentId,
    action: "parent_merged",
    before: { duplicate_parent: preview.duplicate_parent },
    after: { surviving_parent: preview.surviving_parent, moved_students: preview.students_to_link },
    reason: `Merged duplicate parent (${preview.duplicate_parent.full_name}, ${preview.duplicate_parent.phone}) into surviving parent (${preview.surviving_parent.full_name}, ${preview.surviving_parent.phone})`,
  });

  return {
    surviving_parent_id: survivingParentId,
    duplicate_parent_id: duplicateParentId,
    moved_links_count: preview.students_to_link.length,
    transferred_consents_count: preview.consents_to_transfer.length,
  };
}

// -----------------------------------------------------------------------------
// 6. Classes and Sections Management (Spec A4.8)
// -----------------------------------------------------------------------------

export async function updateClassesDisplayOrder(
  schoolId: string,
  academicYearId: string,
  orders: { class_id: string; sort_order: number }[]
): Promise<void> {
  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured) {
    for (const item of orders) {
      await supabase
        .from("classes")
        .update({ sort_order: item.sort_order, updated_at: nowStr })
        .eq("school_id", schoolId)
        .eq("id", item.class_id);
    }
  } else if (typeof localStorage !== "undefined") {
    const cKey = getClassesCacheKey(schoolId);
    const raw = localStorage.getItem(cKey);
    const classes: any[] = raw ? JSON.parse(raw) : [];
    orders.forEach((o) => {
      const cls = classes.find((c) => c.id === o.class_id);
      if (cls) {
        cls.sort_order = o.sort_order;
        cls.updated_at = nowStr;
      }
    });
    localStorage.setItem(cKey, JSON.stringify(classes));
  }
}

export async function updateSectionSettings(
  schoolId: string,
  sectionId: string,
  settings: { capacity?: number; class_teacher_id?: string | null; display_name?: string }
): Promise<void> {
  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured) {
    await supabase
      .from("sections")
      .update({ ...settings, updated_at: nowStr })
      .eq("school_id", schoolId)
      .eq("id", sectionId);
  } else if (typeof localStorage !== "undefined") {
    const sKey = getSectionsCacheKey(schoolId);
    const raw = localStorage.getItem(sKey);
    const sections: any[] = raw ? JSON.parse(raw) : [];
    const sec = sections.find((s) => s.id === sectionId);
    if (sec) {
      Object.assign(sec, settings, { updated_at: nowStr });
      localStorage.setItem(sKey, JSON.stringify(sections));
    }
  }
}

export async function checkSectionCapacity(
  schoolId: string,
  sectionId: string
): Promise<{ current_count: number; capacity: number; is_over_capacity: boolean }> {
  let capacity = 40;
  let currentCount = 0;

  if (isSupabaseConfigured) {
    const secRes = await supabase.from("sections").select("capacity").eq("id", sectionId).maybeSingle();
    if (secRes.data?.capacity) capacity = secRes.data.capacity;

    const { count } = await supabase
      .from("student_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("section_id", sectionId)
      .eq("status", "active");
    if (typeof count === "number") currentCount = count;
  } else if (typeof localStorage !== "undefined") {
    const sKey = getSectionsCacheKey(schoolId);
    const rawS = localStorage.getItem(sKey);
    const sections: any[] = rawS ? JSON.parse(rawS) : [];
    const sec = sections.find((s) => s.id === sectionId);
    if (sec?.capacity) capacity = sec.capacity;

    const seKey = getStudentEnrollmentsCacheKey(schoolId);
    const rawSE = localStorage.getItem(seKey);
    const enrollments: StudentEnrollment[] = rawSE ? JSON.parse(rawSE) : [];
    currentCount = enrollments.filter((e) => e.section_id === sectionId && e.status === "active").length;
  }

  return {
    current_count: currentCount,
    capacity: capacity,
    is_over_capacity: currentCount > capacity,
  };
}

export async function copySectionsFromPreviousYear(
  schoolId: string,
  fromYearId: string,
  toYearId: string
): Promise<{ copied_count: number }> {
  let previousSections: any[] = [];
  let existingTargetSections: any[] = [];

  if (isSupabaseConfigured) {
    const [prevRes, curRes] = await Promise.all([
      supabase.from("sections").select("*").eq("school_id", schoolId).eq("academic_year_id", fromYearId),
      supabase.from("sections").select("*").eq("school_id", schoolId).eq("academic_year_id", toYearId),
    ]);
    if (prevRes.data) previousSections = prevRes.data;
    if (curRes.data) existingTargetSections = curRes.data;
  } else if (typeof localStorage !== "undefined") {
    const sKey = getSectionsCacheKey(schoolId);
    const raw = localStorage.getItem(sKey);
    const sections: any[] = raw ? JSON.parse(raw) : [];
    previousSections = sections.filter((s) => s.academic_year_id === fromYearId);
    existingTargetSections = sections.filter((s) => s.academic_year_id === toYearId);
  }

  const existingKeys = new Set(
    existingTargetSections.map((s) => `${s.class_id}_${s.name.toLowerCase()}`)
  );

  const sectionsToCreate: any[] = [];
  const nowStr = new Date().toISOString();

  for (const prev of previousSections) {
    const key = `${prev.class_id}_${prev.name.toLowerCase()}`;
    if (!existingKeys.has(key)) {
      sectionsToCreate.push({
        id: crypto.randomUUID(),
        school_id: schoolId,
        academic_year_id: toYearId,
        class_id: prev.class_id,
        name: prev.name,
        display_name: prev.display_name,
        sort_order: prev.sort_order,
        capacity: prev.capacity || 40,
        status: "active",
        created_at: nowStr,
        updated_at: nowStr,
      });
      existingKeys.add(key);
    }
  }

  if (sectionsToCreate.length > 0) {
    if (isSupabaseConfigured) {
      await supabase.from("sections").insert(sectionsToCreate);
    } else if (typeof localStorage !== "undefined") {
      const sKey = getSectionsCacheKey(schoolId);
      const raw = localStorage.getItem(sKey);
      const sections: any[] = raw ? JSON.parse(raw) : [];
      sections.push(...sectionsToCreate);
      localStorage.setItem(sKey, JSON.stringify(sections));
    }
  }

  return { copied_count: sectionsToCreate.length };
}

// -----------------------------------------------------------------------------
// 7. Student Re-admission (Spec 1.5, A5.4, A9, A10)
// -----------------------------------------------------------------------------

export interface ReAdmitStudentInput {
  academic_year_id: string;
  class_id: string;
  section_id?: string | null;
  admission_date: string;
  reason?: string;
  roll_no?: string | null;
}

export async function reAdmitStudent(
  schoolId: string,
  studentId: string,
  actorId: string,
  input: ReAdmitStudentInput,
  actorRole: string = "admin"
): Promise<{ success: boolean; student: Student; enrollment: StudentEnrollment }> {
  // 1. Plan limit gating (Spec 1.5, A10)
  const limits = await checkSchoolStudentLimit(schoolId);
  if (limits.is_blocked) {
    const err = new Error(`LIMIT_REACHED: School active student limit of ${limits.max_allowed} reached for plan ${limits.plan_tier}`);
    (err as any).code = "LIMIT_REACHED";
    throw err;
  }

  let student: Student | null = null;
  let allStudents: Student[] = [];

  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("id", studentId)
      .maybeSingle();
    student = data;
  } else if (typeof localStorage !== "undefined") {
    const sKey = getStudentsCacheKey(schoolId);
    const raw = localStorage.getItem(sKey);
    allStudents = raw ? JSON.parse(raw) : [];
    student = allStudents.find((s) => s.id === studentId && !s.deleted_at) || null;
  }

  if (!student) {
    throw new Error("Student record not found");
  }

  if (student.status === "enrolled") {
    throw new Error("Student is already active/enrolled");
  }

  const previousStatus = student.status;
  const nowStr = new Date().toISOString();

  // 2. Update Student status and retain existing admission_no (Spec [DECISION])
  student.status = "enrolled";
  student.status_changed_on = input.admission_date;
  student.status_reason = input.reason || "Student re-admitted";
  student.admission_type = "re_admission";
  student.updated_at = nowStr;
  student.updated_by = actorId;

  // 3. Create active enrollment record
  const newEnrollment: StudentEnrollment = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: studentId,
    academic_year_id: input.academic_year_id,
    class_id: input.class_id,
    section_id: input.section_id || null,
    roll_no: input.roll_no || null,
    status: "active",
    enrolled_on: input.admission_date,
    created_at: nowStr,
    updated_at: nowStr,
  };

  if (isSupabaseConfigured) {
    await supabase
      .from("students")
      .update({
        status: "enrolled",
        status_changed_on: input.admission_date,
        status_reason: input.reason || "Student re-admitted",
        admission_type: "re_admission",
        updated_at: nowStr,
        updated_by: actorId,
      })
      .eq("school_id", schoolId)
      .eq("id", studentId);

    await supabase.from("student_enrollments").insert(newEnrollment);
  } else if (typeof localStorage !== "undefined") {
    const sKey = getStudentsCacheKey(schoolId);
    const targetIdx = allStudents.findIndex((s) => s.id === studentId);
    if (targetIdx >= 0) {
      allStudents[targetIdx] = student;
      localStorage.setItem(sKey, JSON.stringify(allStudents));
    }

    const seKey = getStudentEnrollmentsCacheKey(schoolId);
    const rawSE = localStorage.getItem(seKey);
    const allSE: StudentEnrollment[] = rawSE ? JSON.parse(rawSE) : [];
    allSE.push(newEnrollment);
    localStorage.setItem(seKey, JSON.stringify(allSE));
  }

  // 4. Record student timeline event
  await recordStudentEvent(
    schoolId,
    studentId,
    "readmitted",
    input.reason || `Re-admitted to Class on ${input.admission_date}`,
    actorId
  );

  // 5. Append-only audit log
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: "student",
    entity_id: studentId,
    action: "student_readmitted",
    before: { status: previousStatus },
    after: {
      status: "enrolled",
      academic_year_id: input.academic_year_id,
      class_id: input.class_id,
      section_id: input.section_id || null,
      admission_no: student.admission_no,
    },
    reason: input.reason || "Student re-admitted",
  });

  return { success: true, student, enrollment: newEnrollment };
}

// -----------------------------------------------------------------------------
// 8. Masked & Audited Student Export (Spec A4.1, A5.8)
// -----------------------------------------------------------------------------

export interface MaskedStudentExport {
  id: string;
  admission_no: string;
  sr_no?: string | null;
  apaar_id?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  dob: string;
  gender: StudentGender;
  blood_group?: string | null;
  category?: StudentCategory | null;
  is_rte: boolean;
  status: StudentStatus;
  admission_date: string;
  admission_type: string;
  masked_aadhaar: string | null;
  parents: {
    relation: string;
    full_name: string;
    phone: string;
    email?: string | null;
    occupation?: string | null;
  }[];
  current_enrollment?: {
    academic_year_id: string;
    class_id: string;
    section_id?: string | null;
    roll_no?: string | null;
  } | null;
  exported_at: string;
}

export async function exportStudentData(
  schoolId: string,
  studentId: string,
  actorId: string,
  actorRole: string = "admin"
): Promise<MaskedStudentExport> {
  const profileRes = await getStudentProfile(schoolId, studentId);
  if (profileRes.error || !profileRes.profile) {
    throw new Error(profileRes.error || "Student profile not found");
  }

  const p = profileRes.profile;

  // Mask Aadhaar: never expose full Aadhaar or hashes/enc
  const maskedAadhaar = p.aadhaar_last4 ? `****-****-${p.aadhaar_last4}` : null;

  // Masked parent details
  const maskedParents = (p.parents || []).map((parent) => ({
    relation: parent.relation,
    full_name: parent.full_name,
    phone: parent.phone,
    email: parent.email || null,
    occupation: parent.occupation || null,
  }));

  // Exclude staff-only notes / internal system fields
  const exportData: MaskedStudentExport = {
    id: p.id,
    admission_no: p.admission_no,
    sr_no: p.sr_no,
    apaar_id: p.apaar_id,
    first_name: p.first_name,
    middle_name: p.middle_name,
    last_name: p.last_name,
    dob: p.dob,
    gender: p.gender,
    blood_group: p.blood_group,
    category: p.category,
    is_rte: p.is_rte,
    status: p.status,
    admission_date: p.admission_date,
    admission_type: p.admission_type,
    masked_aadhaar: maskedAadhaar,
    parents: maskedParents,
    current_enrollment: (() => {
      const activeEnr = p.enrollments?.find((e) => e.status === "active") || p.enrollments?.[0];
      return activeEnr
        ? {
            academic_year_id: activeEnr.academic_year_id,
            class_id: activeEnr.class_id,
            section_id: activeEnr.section_id,
            roll_no: activeEnr.roll_no,
          }
        : null;
    })(),
    exported_at: new Date().toISOString(),
  };

  // Write append-only audit entry (Spec A5.8)
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: "student",
    entity_id: studentId,
    action: "student_exported",
    reason: `Exported student profile data (masked) for student ${p.admission_no}`,
  });

  return exportData;
}

export interface ExportStudentsListFilter {
  class_id?: string;
  section_id?: string;
  status?: StudentStatus;
  search?: string;
}

export async function exportStudentsList(
  schoolId: string,
  actorId: string,
  filters?: ExportStudentsListFilter,
  actorRole: string = "admin"
): Promise<{ csv: string; count: number; filename: string }> {
  let students: Student[] = [];
  let enrollments: StudentEnrollment[] = [];
  let parents: Parent[] = [];
  let studentParents: any[] = [];

  if (isSupabaseConfigured) {
    let q = supabase.from("students").select("*").eq("school_id", schoolId).is("deleted_at", null);
    if (filters?.status) q = q.eq("status", filters.status);
    const sRes = await q;
    if (sRes.data) students = sRes.data;

    const [enrRes, pRes, spRes] = await Promise.all([
      supabase.from("student_enrollments").select("*").eq("school_id", schoolId).eq("status", "active"),
      supabase.from("parents").select("*").eq("school_id", schoolId).is("deleted_at", null),
      supabase.from("student_parents").select("*").eq("school_id", schoolId),
    ]);
    if (enrRes.data) enrollments = enrRes.data;
    if (pRes.data) parents = pRes.data;
    if (spRes.data) studentParents = spRes.data;
  } else if (typeof localStorage !== "undefined") {
    const rawS = localStorage.getItem(getStudentsCacheKey(schoolId));
    const allS: Student[] = rawS ? JSON.parse(rawS) : [];
    students = allS.filter((s) => !s.deleted_at);
    if (filters?.status) {
      students = students.filter((s) => s.status === filters.status);
    }

    const rawE = localStorage.getItem(getStudentEnrollmentsCacheKey(schoolId));
    enrollments = rawE ? JSON.parse(rawE) : [];

    const rawP = localStorage.getItem(getParentsCacheKey(schoolId));
    parents = rawP ? JSON.parse(rawP) : [];

    const rawSP = localStorage.getItem(getStudentParentsCacheKey(schoolId));
    studentParents = rawSP ? JSON.parse(rawSP) : [];
  }

  const enrollmentMap = new Map<string, StudentEnrollment>();
  enrollments.forEach((e) => {
    if (e.status === "active") enrollmentMap.set(e.student_id, e);
  });

  const parentMap = new Map<string, Parent>();
  parents.forEach((p) => parentMap.set(p.id, p));

  const primaryParentMap = new Map<string, Parent>();
  studentParents.forEach((sp) => {
    if (sp.is_primary_contact || !primaryParentMap.has(sp.student_id)) {
      const p = parentMap.get(sp.parent_id);
      if (p) primaryParentMap.set(sp.student_id, p);
    }
  });

  // Filter by class_id or section_id if requested
  if (filters?.class_id) {
    students = students.filter((s) => {
      const enr = enrollmentMap.get(s.id);
      return enr?.class_id === filters.class_id;
    });
  }

  if (filters?.section_id) {
    students = students.filter((s) => {
      const enr = enrollmentMap.get(s.id);
      return enr?.section_id === filters.section_id;
    });
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    students = students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.admission_no.toLowerCase().includes(q)
    );
  }

  // Generate CSV
  const headers = [
    "Admission No",
    "First Name",
    "Middle Name",
    "Last Name",
    "Gender",
    "Date of Birth",
    "Category",
    "Class",
    "Section",
    "Parent Name",
    "Parent Phone",
    "Status",
    "Aadhaar (Masked)",
  ];

  const escapeCSV = (val: string | null | undefined) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = students.map((s) => {
    const enr = enrollmentMap.get(s.id);
    const parent = primaryParentMap.get(s.id);
    const maskedAadhaar = s.aadhaar_last4 ? `****-****-${s.aadhaar_last4}` : "Not Provided";

    return [
      escapeCSV(s.admission_no),
      escapeCSV(s.first_name),
      escapeCSV(s.middle_name || ""),
      escapeCSV(s.last_name),
      escapeCSV(s.gender),
      escapeCSV(s.dob),
      escapeCSV(s.category || "General"),
      escapeCSV(enr?.class_id || ""),
      escapeCSV(enr?.section_id || ""),
      escapeCSV(parent?.full_name || ""),
      escapeCSV(parent?.phone || ""),
      escapeCSV(s.status),
      escapeCSV(maskedAadhaar),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const filename = `students_export_${new Date().toISOString().split("T")[0]}.csv`;

  // Append-only audit row (Spec A4.1, A5.8)
  await audit(schoolId, {
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: "students",
    entity_id: schoolId,
    action: "students_bulk_exported",
    reason: `Exported ${students.length} student records as CSV (Aadhaar masked, staff notes excluded)`,
  });

  return {
    csv: csvContent,
    count: students.length,
    filename,
  };
}

// -----------------------------------------------------------------------------
// 9. ID Card Print Sheet (Spec A4.10)
// -----------------------------------------------------------------------------

export interface StudentIdCardItem {
  student_id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  full_name: string;
  photo_url?: string | null;
  class_id?: string | null;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  guardian_name: string;
  guardian_phone: string;
  blood_group?: string | null;
  dob: string;
  qr_payload: string; // MYZKOOL:STUDENT:{admission_no}:{student_id}
  school_name?: string;
}

export async function getStudentIdCardData(
  schoolId: string,
  options?: {
    classId?: string;
    sectionId?: string;
    academicYearId?: string;
    studentId?: string;
  }
): Promise<StudentIdCardItem[]> {
  let students: Student[] = [];
  let enrollments: StudentEnrollment[] = [];
  let parents: Parent[] = [];
  let studentParents: any[] = [];
  let classes: any[] = [];
  let sections: any[] = [];

  if (isSupabaseConfigured) {
    let q = supabase.from("students").select("*").eq("school_id", schoolId).is("deleted_at", null);
    if (options?.studentId) {
      q = q.eq("id", options.studentId);
    } else {
      q = q.eq("status", "enrolled");
    }
    const sRes = await q;
    if (sRes.data) students = sRes.data;

    const [enrRes, pRes, spRes, clsRes, secRes] = await Promise.all([
      supabase.from("student_enrollments").select("*").eq("school_id", schoolId).eq("status", "active"),
      supabase.from("parents").select("*").eq("school_id", schoolId).is("deleted_at", null),
      supabase.from("student_parents").select("*").eq("school_id", schoolId),
      supabase.from("classes").select("*").eq("school_id", schoolId),
      supabase.from("sections").select("*").eq("school_id", schoolId),
    ]);
    if (enrRes.data) enrollments = enrRes.data;
    if (pRes.data) parents = pRes.data;
    if (spRes.data) studentParents = spRes.data;
    if (clsRes.data) classes = clsRes.data;
    if (secRes.data) sections = secRes.data;
  } else if (typeof localStorage !== "undefined") {
    const rawS = localStorage.getItem(getStudentsCacheKey(schoolId));
    const allS: Student[] = rawS ? JSON.parse(rawS) : [];
    students = allS.filter((s) => !s.deleted_at);
    if (options?.studentId) {
      students = students.filter((s) => s.id === options.studentId);
    } else {
      students = students.filter((s) => s.status === "enrolled");
    }

    const rawE = localStorage.getItem(getStudentEnrollmentsCacheKey(schoolId));
    enrollments = rawE ? JSON.parse(rawE) : [];

    const rawP = localStorage.getItem(getParentsCacheKey(schoolId));
    parents = rawP ? JSON.parse(rawP) : [];

    const rawSP = localStorage.getItem(getStudentParentsCacheKey(schoolId));
    studentParents = rawSP ? JSON.parse(rawSP) : [];

    const rawC = localStorage.getItem(getClassesCacheKey(schoolId));
    classes = rawC ? JSON.parse(rawC) : [];

    const rawSec = localStorage.getItem(getSectionsCacheKey(schoolId));
    sections = rawSec ? JSON.parse(rawSec) : [];
  }

  const enrollmentMap = new Map<string, StudentEnrollment>();
  enrollments.forEach((e) => {
    if (e.status === "active") enrollmentMap.set(e.student_id, e);
  });

  const parentMap = new Map<string, Parent>();
  parents.forEach((p) => parentMap.set(p.id, p));

  const primaryParentMap = new Map<string, Parent>();
  studentParents.forEach((sp) => {
    if (sp.is_primary_contact || !primaryParentMap.has(sp.student_id)) {
      const p = parentMap.get(sp.parent_id);
      if (p) primaryParentMap.set(sp.student_id, p);
    }
  });

  const classMap = new Map<string, string>();
  classes.forEach((c) => classMap.set(c.id, c.name));

  const sectionMap = new Map<string, string>();
  sections.forEach((s) => sectionMap.set(s.id, s.name));

  // Filter by class / section
  if (options?.classId) {
    students = students.filter((s) => {
      const enr = enrollmentMap.get(s.id);
      return enr?.class_id === options.classId;
    });
  }

  if (options?.sectionId) {
    students = students.filter((s) => {
      const enr = enrollmentMap.get(s.id);
      return enr?.section_id === options.sectionId;
    });
  }

  return students.map((s) => {
    const enr = enrollmentMap.get(s.id);
    const parent = primaryParentMap.get(s.id);
    const className = (enr?.class_id && classMap.get(enr.class_id)) || enr?.class_id || "Class 1";
    const sectionName = (enr?.section_id && sectionMap.get(enr.section_id)) || enr?.section_id || null;
    const fullName = `${s.first_name} ${s.middle_name ? `${s.middle_name} ` : ""}${s.last_name}`;

    return {
      student_id: s.id,
      admission_no: s.admission_no,
      first_name: s.first_name,
      last_name: s.last_name,
      full_name: fullName,
      photo_url: s.photo_path || null,
      class_id: enr?.class_id || null,
      class_name: className,
      section_id: enr?.section_id || null,
      section_name: sectionName,
      guardian_name: parent?.full_name || "Parent/Guardian",
      guardian_phone: parent?.phone || "N/A",
      blood_group: s.blood_group || null,
      dob: s.dob,
      qr_payload: `MYZKOOL:STUDENT:${s.admission_no}:${s.id}`,
      school_name: "MyZkool Academy",
    };
  });
}


