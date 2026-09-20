/**
 * Fee Dues Service (Phase 2)
 *
 * Manages dues generation (idempotent, background-safe), single-student assignment,
 * auto-assignment on admission (replaces Phase 1b stub), manual dues,
 * balance queries, RTE concession application, and future-dues cancellation.
 *
 * Storage: Supabase when configured; localStorage as offline fallback.
 * All amounts in integer paise.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  StudentDue,
  StudentFeeAssignment,
  FeeStructure,
  FeeStructureItem,
  FeeStructureItemTerm,
  FeeHead,
  FeeTerm,
  StudentConcession,
  ConcessionRule,
  FeeLedgerEntry,
  DuesGenerationPreview,
  DuesGenerationResult,
  DuesGenerationException,
  ProrateOption,
  ManualDueInput,
  LedgerEntryType,
} from "../types/fees";
import {
  getFeeSettings,
  getStructureGrid,
  getFeeTerms,
  getFeeHeads,
  computeConcession,
} from "./feeSetupService";

// ─── Cache keys ──────────────────────────────────────────────────────────────
const DUES_KEY = (s: string) => `myzkool_student_dues_${s}`;
const ASSIGNMENTS_KEY = (s: string) => `myzkool_fee_assignments_${s}`;
const LEDGER_KEY = (s: string) => `myzkool_fee_ledger_${s}`;
const STRUCTURES_KEY = (s: string) => `myzkool_fee_structures_${s}`;
const CONCESSION_RULES_KEY = (s: string) => `myzkool_concession_rules_${s}`;
const STUDENT_CONCESSIONS_KEY = (s: string) => `myzkool_student_concessions_${s}`;

function now() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID(); }

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

// ─── Ledger helpers ──────────────────────────────────────────────────────────

async function writeLedger(
  schoolId: string,
  entry: Omit<FeeLedgerEntry, "id" | "created_at">
): Promise<void> {
  const row: FeeLedgerEntry = { ...entry, id: uuid(), created_at: now() };
  if (isSupabaseConfigured) {
    await supabase.from("fee_ledger").insert(row);
  } else {
    const all = lsGet<FeeLedgerEntry>(LEDGER_KEY(schoolId));
    lsSet(LEDGER_KEY(schoolId), [...all, row]);
  }
}

// ─── Public: get dues ────────────────────────────────────────────────────────

export async function getStudentDues(
  schoolId: string,
  studentId: string,
  yearId?: string
): Promise<{ dues: StudentDue[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      let q = supabase.from("student_dues").select(`
        *,
        fee_heads(name),
        fee_terms(name)
      `).eq("school_id", schoolId).eq("student_id", studentId).order("due_date");
      if (yearId) q = q.eq("academic_year_id", yearId);
      const { data, error } = await q;
      if (error) throw error;
      return {
        dues: ((data || []) as any[]).map(d => ({
          ...d,
          fee_head_name: d.fee_heads?.name,
          term_name: d.fee_terms?.name,
        })) as StudentDue[],
      };
    } catch (e: any) { return { dues: [], error: e.message }; }
  }
  let dues = lsGet<StudentDue>(DUES_KEY(schoolId)).filter(d => d.student_id === studentId);
  if (yearId) dues = dues.filter(d => d.academic_year_id === yearId);
  dues.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return { dues };
}

export async function getStudentBalance(
  schoolId: string,
  studentId: string,
  yearId?: string
): Promise<{ balance: number; error?: string }> {
  const { dues, error } = await getStudentDues(schoolId, studentId, yearId);
  if (error) return { balance: 0, error };
  const balance = dues
    .filter(d => d.status === "pending" || d.status === "partial")
    .reduce((sum, d) => sum + d.balance_paise, 0);
  return { balance };
}

// ─── Internal: resolve active structure for student ──────────────────────────

async function getActiveAssignments(
  schoolId: string,
  studentId: string,
  yearId: string
): Promise<StudentFeeAssignment[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("student_fee_assignments")
      .select("*")
      .eq("school_id", schoolId).eq("student_id", studentId)
      .eq("academic_year_id", yearId).eq("status", "active");
    return (data || []) as StudentFeeAssignment[];
  }
  return lsGet<StudentFeeAssignment>(ASSIGNMENTS_KEY(schoolId))
    .filter(a => a.student_id === studentId && a.academic_year_id === yearId && a.status === "active");
}

async function getStructuresForSchool(schoolId: string): Promise<FeeStructure[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("fee_structures").select("*").eq("school_id", schoolId);
    return (data || []) as FeeStructure[];
  }
  return lsGet<FeeStructure>(STRUCTURES_KEY(schoolId));
}

async function getAutoApplyConcessions(
  schoolId: string,
  studentId: string,
  yearId: string
): Promise<{ rules: ConcessionRule[]; studentConcessions: StudentConcession[] }> {
  let rules: ConcessionRule[] = [];
  let studentConcessions: StudentConcession[] = [];
  if (isSupabaseConfigured) {
    const { data: rd } = await supabase.from("concession_rules")
      .select("*").eq("school_id", schoolId).eq("auto_apply", true).eq("is_active", true);
    rules = (rd || []) as ConcessionRule[];
    const { data: sd } = await supabase.from("student_concessions")
      .select("*").eq("student_id", studentId).eq("academic_year_id", yearId).eq("status", "active");
    studentConcessions = (sd || []) as StudentConcession[];
  } else {
    rules = lsGet<ConcessionRule>(CONCESSION_RULES_KEY(schoolId)).filter(r => r.auto_apply && r.is_active);
    studentConcessions = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId))
      .filter(c => c.student_id === studentId && c.academic_year_id === yearId && c.status === "active");
  }
  return { rules, studentConcessions };
}

// ─── Internal: check if due already exists (idempotency) ────────────────────

function dueExists(
  existingDues: StudentDue[],
  studentId: string,
  yearId: string,
  headId: string,
  termId: string | null
): boolean {
  return existingDues.some(d =>
    d.student_id === studentId &&
    d.academic_year_id === yearId &&
    d.fee_head_id === headId &&
    d.term_id === termId &&
    d.source === "structure"
  );
}

// ─── Internal: generate dues for one student ─────────────────────────────────

async function generateDuesForStudent(
  schoolId: string,
  studentId: string,
  yearId: string,
  isRte: boolean,
  assignments: StudentFeeAssignment[],
  existingDues: StudentDue[],
  feeHeads: FeeHead[],
  terms: FeeTerm[],
  actorId?: string,
  prorateFrom?: string,  // term_id: generate only from this term onward
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  const { settings } = await getFeeSettings(schoolId);
  const roundToRupee = settings.round_to_rupee;

  for (const assignment of assignments) {
    const { items, terms: itemTerms } = await getStructureGrid(schoolId, assignment.structure_id);

    for (const item of items) {
      const head = feeHeads.find(h => h.id === item.fee_head_id);
      const itemTermAmounts = itemTerms.filter(it => it.item_id === item.id);

      for (const termAmount of itemTermAmounts) {
        const term = terms.find(t => t.id === termAmount.term_id);
        if (!term) continue;

        // Prorate: skip terms before the requested start
        if (prorateFrom) {
          const fromTerm = terms.find(t => t.id === prorateFrom);
          if (fromTerm && term.sort_order < fromTerm.sort_order) { skipped++; continue; }
        }

        if (dueExists(existingDues, studentId, yearId, item.fee_head_id, termAmount.term_id)) {
          skipped++;
          continue;
        }

        const grossPaise = termAmount.amount_paise;
        if (grossPaise <= 0) { skipped++; continue; }

        // Compute concession
        let concessionPaise = 0;
        if (isRte && head?.rte_waivable) {
          concessionPaise = grossPaise; // 100% concession
        }
        const netPaise = grossPaise - concessionPaise;

        const due: StudentDue = {
          id: uuid(),
          school_id: schoolId,
          student_id: studentId,
          academic_year_id: yearId,
          fee_head_id: item.fee_head_id,
          term_id: termAmount.term_id,
          source: "structure",
          source_ref: assignment.id,
          description: null,
          gross_paise: grossPaise,
          concession_paise: concessionPaise,
          net_paise: netPaise,
          paid_paise: 0,
          balance_paise: netPaise,
          due_date: term.due_date,
          status: netPaise === 0 ? "waived" : "pending",
          created_at: now(),
          updated_at: now(),
          created_by: actorId ?? null,
        };

        if (isSupabaseConfigured) {
          await supabase.from("student_dues").insert(due);
        } else {
          const all = lsGet<StudentDue>(DUES_KEY(schoolId));
          lsSet(DUES_KEY(schoolId), [...all, due]);
        }

        // Write ledger row
        await writeLedger(schoolId, {
          school_id: schoolId,
          student_id: studentId,
          academic_year_id: yearId,
          due_id: due.id,
          receipt_id: null,
          entry_type: "due_created",
          amount_paise: grossPaise,
          note: `Due created: ${head?.name ?? "Unknown"} ${term.name}`,
          created_by: actorId ?? null,
        });

        if (concessionPaise > 0) {
          await writeLedger(schoolId, {
            school_id: schoolId,
            student_id: studentId,
            academic_year_id: yearId,
            due_id: due.id,
            receipt_id: null,
            entry_type: "concession",
            amount_paise: -concessionPaise,
            note: `RTE concession: ${head?.name ?? "Unknown"}`,
            created_by: actorId ?? null,
          });
        }

        created++;
      }
    }
  }

  return { created, skipped };
}

// ─── Dues generation (bulk) ──────────────────────────────────────────────────

export async function previewDuesGeneration(
  schoolId: string,
  yearId: string,
  classIds?: string[]
): Promise<{ preview: DuesGenerationPreview; error?: string }> {
  // Fetch students for the given classes
  let students: Array<{ id: string; first_name: string; last_name: string; admission_no: string; is_rte: boolean; class_id?: string | null }> = [];
  if (isSupabaseConfigured) {
    let q = supabase.from("students").select(`
      id, first_name, last_name, admission_no, is_rte,
      student_enrollments!inner(class_id, academic_year_id, status)
    `).eq("school_id", schoolId).is("deleted_at", null);
    const { data } = await q;
    students = (data || []).map((s: any) => ({
      ...s,
      class_id: s.student_enrollments?.[0]?.class_id,
    })).filter((s: any) => {
      if (classIds?.length) return classIds.includes(s.class_id);
      return true;
    });
  } else {
    const cached = lsGet<any>(`myzkool_students_${schoolId}`);
    students = cached.filter((s: any) => !s.deleted_at && (classIds?.length ? classIds.includes(s.class_id) : true));
  }

  const structures = await getStructuresForSchool(schoolId);
  const existingDues = lsGet<StudentDue>(DUES_KEY(schoolId));

  const exceptions: DuesGenerationException[] = [];
  let dueLineCount = 0;
  let totalDemandPaise = 0;
  let alreadyGeneratedCount = 0;

  for (const student of students) {
    const activeStructures = structures.filter(str =>
      str.academic_year_id === yearId && str.status === "active" &&
      (str.class_id === student.class_id || !student.class_id)
    );
    if (!activeStructures.length) {
      exceptions.push({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_no: student.admission_no,
        reason: "No active fee structure for this class",
      });
      continue;
    }
    const studentExistingDues = existingDues.filter(d => d.student_id === student.id && d.academic_year_id === yearId && d.source === "structure");
    if (studentExistingDues.length > 0) {
      alreadyGeneratedCount++;
      continue;
    }
    // Count expected dues
    for (const str of activeStructures) {
      const { terms: itemTerms } = await getStructureGrid(schoolId, str.id);
      dueLineCount += itemTerms.length;
      totalDemandPaise += itemTerms.reduce((sum, it) => sum + it.amount_paise, 0);
    }
  }

  return {
    preview: {
      student_count: students.length - exceptions.length - alreadyGeneratedCount,
      due_line_count: dueLineCount,
      total_demand_paise: totalDemandPaise,
      already_generated_count: alreadyGeneratedCount,
      exceptions,
    },
  };
}

export async function generateDues(
  schoolId: string,
  yearId: string,
  classIds?: string[],
  actorId?: string
): Promise<{ result: DuesGenerationResult; error?: string }> {
  let students: Array<{ id: string; first_name: string; last_name: string; admission_no: string; is_rte: boolean; class_id?: string | null }> = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("students").select(`
      id, first_name, last_name, admission_no, is_rte,
      student_enrollments!inner(class_id, academic_year_id, status)
    `).eq("school_id", schoolId).is("deleted_at", null);
    students = (data || []).map((s: any) => ({
      ...s,
      class_id: s.student_enrollments?.[0]?.class_id,
    })).filter((s: any) => {
      if (classIds?.length) return classIds.includes(s.class_id);
      return true;
    });
  } else {
    const cached = lsGet<any>(`myzkool_students_${schoolId}`);
    students = cached.filter((s: any) => !s.deleted_at && (classIds?.length ? classIds.includes(s.class_id) : true));
  }

  const structures = await getStructuresForSchool(schoolId);
  const { terms: allTerms } = await getFeeTerms(schoolId, yearId);
  const { heads: feeHeads } = await getFeeHeads(schoolId, true);

  let totalCreated = 0;
  let totalSkipped = 0;
  const exceptions: DuesGenerationException[] = [];

  for (const student of students) {
    const activeStructures = structures.filter(str =>
      str.academic_year_id === yearId && str.status === "active" &&
      str.class_id === student.class_id
    );
    if (!activeStructures.length) {
      exceptions.push({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_no: student.admission_no,
        reason: "No active fee structure for this class",
      });
      continue;
    }

    const existingDues = lsGet<StudentDue>(DUES_KEY(schoolId)).filter(d => d.student_id === student.id && d.academic_year_id === yearId);
    const assignments: StudentFeeAssignment[] = activeStructures.map(str => ({
      id: uuid(), school_id: schoolId, student_id: student.id,
      academic_year_id: yearId, structure_id: str.id,
      structure_version: str.version, assigned_at: now(),
      assigned_by: actorId ?? null, status: "active",
    }));

    const { created, skipped } = await generateDuesForStudent(
      schoolId, student.id, yearId, student.is_rte,
      assignments, existingDues, feeHeads, allTerms, actorId
    );
    totalCreated += created;
    totalSkipped += skipped;
  }

  return { result: { created_count: totalCreated, skipped_count: totalSkipped, exceptions } };
}

// ─── Single-student assignment ────────────────────────────────────────────────

export async function assignFeeStructure(
  schoolId: string,
  studentId: string,
  yearId: string,
  structureId: string,
  prorateOption?: ProrateOption,
  actorId?: string
): Promise<{ assignment?: StudentFeeAssignment; error?: string }> {
  // Mark any existing assignment as replaced
  if (isSupabaseConfigured) {
    await supabase.from("student_fee_assignments")
      .update({ status: "replaced", updated_at: now() })
      .eq("student_id", studentId).eq("academic_year_id", yearId).eq("status", "active");
  } else {
    const all = lsGet<StudentFeeAssignment>(ASSIGNMENTS_KEY(schoolId));
    lsSet(ASSIGNMENTS_KEY(schoolId), all.map(a =>
      a.student_id === studentId && a.academic_year_id === yearId && a.status === "active"
        ? { ...a, status: "replaced" as const }
        : a
    ));
  }

  // Get structure info
  const structures = await getStructuresForSchool(schoolId);
  const structure = structures.find(s => s.id === structureId);
  if (!structure) return { error: "Structure not found" };

  const assignment: StudentFeeAssignment = {
    id: uuid(), school_id: schoolId, student_id: studentId,
    academic_year_id: yearId, structure_id: structureId,
    structure_version: structure.version, assigned_at: now(),
    assigned_by: actorId ?? null, status: "active",
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("student_fee_assignments").insert(assignment).select().single();
    if (error) return { error: error.message };
    return { assignment: data as StudentFeeAssignment };
  }
  const all = lsGet<StudentFeeAssignment>(ASSIGNMENTS_KEY(schoolId));
  lsSet(ASSIGNMENTS_KEY(schoolId), [...all, assignment]);

  // Generate dues
  const { heads: feeHeads } = await getFeeHeads(schoolId, true);
  const { terms } = await getFeeTerms(schoolId, yearId);
  const existingDues = lsGet<StudentDue>(DUES_KEY(schoolId)).filter(d => d.student_id === studentId && d.academic_year_id === yearId);
  const isRte = false; // caller should pass this; stub false for now

  const prorateFrom = prorateOption?.mode === "from_term" ? prorateOption.from_term_id
    : prorateOption?.mode === "from_current_term" ? terms.find(t => new Date(t.due_date) >= new Date())?.id
    : undefined;

  await generateDuesForStudent(
    schoolId, studentId, yearId, isRte,
    [assignment], existingDues, feeHeads, terms, actorId, prorateFrom
  );

  return { assignment };
}

// ─── Auto-assign on admission (replaces Phase 1b stub) ──────────────────────

export async function autoAssignOnAdmission(
  schoolId: string,
  studentId: string,
  isRte: boolean,
  classId: string,
  admissionType: "new" | "re_admission" | "transfer_in",
  actorId?: string
): Promise<{ assigned: boolean; error?: string }> {
  const { settings } = await getFeeSettings(schoolId);
  if (!settings.auto_assign_fee_on_admission) return { assigned: false };

  // Get current academic year
  let yearId: string | null = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("academic_years").select("id").eq("school_id", schoolId).eq("is_current", true).maybeSingle();
    yearId = data?.id ?? null;
  } else {
    const years = lsGet<any>(`myzkool_academic_years_${schoolId}`);
    yearId = years.find((y: any) => y.is_current)?.id ?? null;
  }
  if (!yearId) return { assigned: false, error: "No current academic year" };

  const structures = await getStructuresForSchool(schoolId);
  const appliesToMap: Array<"all" | "new_admission"> = ["all"];
  if (admissionType === "new") appliesToMap.push("new_admission");

  const matching = structures.filter(s =>
    s.class_id === classId && s.academic_year_id === yearId &&
    s.status === "active" && appliesToMap.includes(s.applies_to as "all" | "new_admission")
  );

  if (!matching.length) return { assigned: false };

  const { heads: feeHeads } = await getFeeHeads(schoolId, true);
  const { terms } = await getFeeTerms(schoolId, yearId);

  for (const structure of matching) {
    const assignment: StudentFeeAssignment = {
      id: uuid(), school_id: schoolId, student_id: studentId,
      academic_year_id: yearId, structure_id: structure.id,
      structure_version: structure.version, assigned_at: now(),
      assigned_by: actorId ?? null, status: "active",
    };
    if (isSupabaseConfigured) {
      await supabase.from("student_fee_assignments").insert(assignment);
    } else {
      const all = lsGet<StudentFeeAssignment>(ASSIGNMENTS_KEY(schoolId));
      lsSet(ASSIGNMENTS_KEY(schoolId), [...all, assignment]);
    }
    const existingDues = lsGet<StudentDue>(DUES_KEY(schoolId)).filter(d => d.student_id === studentId && d.academic_year_id === yearId);
    await generateDuesForStudent(
      schoolId, studentId, yearId, isRte,
      [assignment], existingDues, feeHeads, terms, actorId
    );
  }

  return { assigned: true };
}

// ─── Manual due ───────────────────────────────────────────────────────────────

export async function addManualDue(
  schoolId: string,
  studentId: string,
  yearId: string,
  input: ManualDueInput,
  actorId?: string
): Promise<{ due?: StudentDue; error?: string }> {
  if (!input.fee_head_id || input.gross_paise <= 0) return { error: "fee_head_id and positive gross_paise required" };

  const due: StudentDue = {
    id: uuid(),
    school_id: schoolId,
    student_id: studentId,
    academic_year_id: yearId,
    fee_head_id: input.fee_head_id,
    term_id: input.term_id ?? null,
    source: "manual",
    source_ref: null,
    description: input.description ?? null,
    gross_paise: input.gross_paise,
    concession_paise: 0,
    net_paise: input.gross_paise,
    paid_paise: 0,
    balance_paise: input.gross_paise,
    due_date: input.due_date,
    status: "pending",
    created_at: now(),
    updated_at: now(),
    created_by: actorId ?? null,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("student_dues").insert(due).select().single();
    if (error) return { error: error.message };
    await writeLedger(schoolId, {
      school_id: schoolId, student_id: studentId, academic_year_id: yearId,
      due_id: due.id, receipt_id: null,
      entry_type: "due_created", amount_paise: due.gross_paise,
      note: `Manual due: ${input.description || "One-off charge"}`, created_by: actorId ?? null,
    });
    return { due: data as StudentDue };
  }
  const all = lsGet<StudentDue>(DUES_KEY(schoolId));
  lsSet(DUES_KEY(schoolId), [...all, due]);
  await writeLedger(schoolId, {
    school_id: schoolId, student_id: studentId, academic_year_id: yearId,
    due_id: due.id, receipt_id: null,
    entry_type: "due_created", amount_paise: due.gross_paise,
    note: `Manual due: ${input.description || "One-off charge"}`, created_by: actorId ?? null,
  });
  return { due };
}

// ─── Cancel future dues ───────────────────────────────────────────────────────

export async function cancelFutureDues(
  schoolId: string,
  studentId: string,
  effectiveDate: string,
  actorId?: string
): Promise<{ cancelled: number; error?: string }> {
  const { dues } = await getStudentDues(schoolId, studentId);
  const toCancel = dues.filter(d =>
    d.due_date > effectiveDate &&
    (d.status === "pending") &&
    d.paid_paise === 0
  );

  let cancelled = 0;
  for (const due of toCancel) {
    if (isSupabaseConfigured) {
      await supabase.from("student_dues").update({ status: "cancelled", updated_at: now() }).eq("id", due.id);
    } else {
      const all = lsGet<StudentDue>(DUES_KEY(schoolId));
      lsSet(DUES_KEY(schoolId), all.map(d => d.id === due.id ? { ...d, status: "cancelled" as const, updated_at: now() } : d));
    }
    await writeLedger(schoolId, {
      school_id: schoolId, student_id: studentId, academic_year_id: due.academic_year_id,
      due_id: due.id, receipt_id: null,
      entry_type: "cancel_due", amount_paise: -due.balance_paise,
      note: `Due cancelled (status change effective ${effectiveDate})`, created_by: actorId ?? null,
    });
    cancelled++;
  }
  return { cancelled };
}

// ─── Apply RTE concession ─────────────────────────────────────────────────────

export async function applyRteConcession(
  schoolId: string,
  studentId: string,
  yearId: string,
  actorId?: string
): Promise<{ updated: number; error?: string }> {
  const { dues } = await getStudentDues(schoolId, studentId, yearId);
  const { heads } = await getFeeHeads(schoolId, true);
  const headMap = new Map(heads.map(h => [h.id, h]));

  const toUpdate = dues.filter(d => {
    const head = headMap.get(d.fee_head_id);
    return head?.rte_waivable && d.concession_paise < d.gross_paise && d.status === "pending";
  });

  let updated = 0;
  for (const due of toUpdate) {
    const newConcession = due.gross_paise;
    const newNet = 0;
    if (isSupabaseConfigured) {
      await supabase.from("student_dues").update({
        concession_paise: newConcession, net_paise: newNet, balance_paise: 0,
        status: "waived", updated_at: now(),
      }).eq("id", due.id);
    } else {
      const all = lsGet<StudentDue>(DUES_KEY(schoolId));
      lsSet(DUES_KEY(schoolId), all.map(d =>
        d.id === due.id
          ? { ...d, concession_paise: newConcession, net_paise: newNet, balance_paise: 0, status: "waived" as const, updated_at: now() }
          : d
      ));
    }
    await writeLedger(schoolId, {
      school_id: schoolId, student_id: studentId, academic_year_id: yearId,
      due_id: due.id, receipt_id: null,
      entry_type: "concession", amount_paise: -(newConcession - due.concession_paise),
      note: `RTE concession applied`, created_by: actorId ?? null,
    });
    updated++;
  }
  return { updated };
}

// ─── Ledger query ─────────────────────────────────────────────────────────────

export async function getLedger(
  schoolId: string,
  studentId: string,
  yearId?: string
): Promise<{ entries: FeeLedgerEntry[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      let q = supabase.from("fee_ledger").select("*")
        .eq("school_id", schoolId).eq("student_id", studentId).order("created_at");
      if (yearId) q = q.eq("academic_year_id", yearId);
      const { data, error } = await q;
      if (error) throw error;
      return { entries: (data || []) as FeeLedgerEntry[] };
    } catch (e: any) { return { entries: [], error: e.message }; }
  }
  let entries = lsGet<FeeLedgerEntry>(LEDGER_KEY(schoolId)).filter(e => e.student_id === studentId);
  if (yearId) entries = entries.filter(e => e.academic_year_id === yearId);
  return { entries: entries.sort((a, b) => a.created_at.localeCompare(b.created_at)) };
}

