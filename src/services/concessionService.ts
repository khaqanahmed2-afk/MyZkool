import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  StudentConcession,
  StudentConcessionInput,
  StudentConcessionStatus,
  ConcessionRule,
  ConcessionSummaryMetrics,
  ConcessionFilters,
  StudentDue,
  FeeHead,
  FeeLedgerEntry,
} from "../types/fees";
import { computeConcession, getFeeSettings } from "./feeSetupService";

const STUDENT_CONCESSIONS_KEY = (s: string) => `myzkool_student_concessions_${s}`;
const CONCESSION_RULES_KEY = (s: string) => `myzkool_concession_rules_${s}`;
const DUES_KEY = (s: string) => `myzkool_student_dues_${s}`;
const LEDGER_KEY = (s: string) => `myzkool_fee_ledger_${s}`;

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function now(): string {
  return new Date().toISOString();
}

function getTodayIST(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, data: T[]): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// ─── Effective Status Calculation ──────────────────────────────────────────
export function calculateEffectiveStatus(
  concession: Pick<StudentConcession, "status" | "valid_from" | "valid_to">,
  todayStr: string = getTodayIST()
): StudentConcessionStatus {
  const currentStatus = concession.status || "active";
  if (
    currentStatus === "pending" ||
    currentStatus === "rejected" ||
    currentStatus === "revoked" ||
    currentStatus === "draft"
  ) {
    return currentStatus;
  }

  // Check validity dates for approved/active/scheduled
  if (concession.valid_to && concession.valid_to < todayStr) {
    return "expired";
  }
  if (concession.valid_from && concession.valid_from > todayStr) {
    return "scheduled";
  }
  return "active";
}

// ─── Format Currency ───────────────────────────────────────────────────────
export function formatCurrencyPaise(paise: number): string {
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

// ─── Get Concessions Overview with Metrics & Filtering ─────────────────────
export async function getConcessionsOverview(
  schoolId: string,
  filters?: ConcessionFilters
): Promise<{
  concessions: StudentConcession[];
  metrics: ConcessionSummaryMetrics;
  error?: string;
}> {
  if (!schoolId) {
    return {
      concessions: [],
      metrics: {
        activeCount: 0,
        discountThisMonthPaise: 0,
        pendingCount: 0,
        scheduledCount: 0,
        totalCount: 0,
      },
    };
  }

  const todayStr = getTodayIST();
  let rawConcessions: StudentConcession[] = [];
  let students: any[] = [];
  let enrollments: any[] = [];
  let classes: any[] = [];
  let sections: any[] = [];
  let feeHeads: FeeHead[] = [];
  let rules: ConcessionRule[] = [];
  let studentDues: StudentDue[] = [];

  if (isSupabaseConfigured) {
    try {
      const [
        concessionsRes,
        studentsRes,
        enrollmentsRes,
        classesRes,
        sectionsRes,
        headsRes,
        rulesRes,
        duesRes,
      ] = await Promise.all([
        supabase.from("student_concessions").select("*").eq("school_id", schoolId),
        supabase.from("students").select("id, admission_no, first_name, last_name, admission_class_id, status").eq("school_id", schoolId),
        supabase.from("student_enrollments").select("student_id, class_id, section_id, academic_year_id, status").eq("school_id", schoolId),
        supabase.from("classes").select("id, name").eq("school_id", schoolId),
        supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId),
        supabase.from("fee_heads").select("id, name, code, kind").eq("school_id", schoolId),
        supabase.from("concession_rules").select("*").eq("school_id", schoolId),
        supabase.from("student_dues").select("id, student_id, gross_paise, concession_paise, due_date, status, academic_year_id").eq("school_id", schoolId),
      ]);

      rawConcessions = (concessionsRes.data || []) as StudentConcession[];
      students = studentsRes.data || [];
      enrollments = enrollmentsRes.data || [];
      classes = classesRes.data || [];
      sections = sectionsRes.data || [];
      feeHeads = (headsRes.data || []) as FeeHead[];
      rules = (rulesRes.data || []) as ConcessionRule[];
      studentDues = (duesRes.data || []) as StudentDue[];
    } catch (err: any) {
      console.warn("Supabase fetch notice, falling back to local storage:", err?.message);
    }
  }

  // Fallback to local storage if empty or offline
  if (rawConcessions.length === 0) {
    rawConcessions = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId));
    students = lsGet<any>(`myzkool_students_${schoolId}`);
    classes = lsGet<any>(`myzkool_classes_${schoolId}`);
    sections = lsGet<any>(`myzkool_sections_${schoolId}`);
    feeHeads = lsGet<FeeHead>(`myzkool_fee_heads_${schoolId}`);
    rules = lsGet<ConcessionRule>(CONCESSION_RULES_KEY(schoolId));
    studentDues = lsGet<StudentDue>(DUES_KEY(schoolId));
  }

  // Build lookups
  const studentMap = new Map<string, any>(students.map((s) => [s.id, s]));
  const classMap = new Map<string, any>(classes.map((c) => [c.id, c]));
  const sectionMap = new Map<string, any>(sections.map((s) => [s.id, s]));
  const ruleMap = new Map<string, ConcessionRule>(rules.map((r) => [r.id, r]));

  // Build student enrollment lookup for quick class & section resolution
  const studentEnrollmentMap = new Map<string, { classId: string; sectionId?: string }>();
  for (const enr of enrollments) {
    if (enr.student_id && (!studentEnrollmentMap.has(enr.student_id) || enr.status === "enrolled")) {
      studentEnrollmentMap.set(enr.student_id, {
        classId: enr.class_id,
        sectionId: enr.section_id,
      });
    }
  }

  // Enrich concessions with joined names and effective status
  const enriched: StudentConcession[] = rawConcessions.map((c) => {
    const st = studentMap.get(c.student_id);
    const enr = studentEnrollmentMap.get(c.student_id);
    const classId = enr?.classId || st?.admission_class_id || st?.class_id;
    const cls = classId ? classMap.get(classId) : null;
    const sec = enr?.sectionId ? sectionMap.get(enr.sectionId) : null;
    const rule = c.rule_id ? ruleMap.get(c.rule_id) : null;

    const studentName = st
      ? [st.first_name, st.last_name].filter(Boolean).join(" ")
      : "Unknown Student";
    const admissionNo = st?.admission_no || "-";
    const className = cls?.name || "Class -";
    const sectionName = sec?.name || "";
    const effectiveStatus = calculateEffectiveStatus(c, todayStr);

    return {
      ...c,
      status: effectiveStatus,
      student_name: studentName,
      admission_no: admissionNo,
      class_name: className,
      section_name: sectionName,
      rule_name: rule?.name || "",
    };
  });

  // Calculate Metrics from authoritative database records
  let activeCount = 0;
  let pendingCount = 0;
  let scheduledCount = 0;

  for (const c of enriched) {
    if (c.status === "active") activeCount++;
    else if (c.status === "pending") pendingCount++;
    else if (c.status === "scheduled") scheduledCount++;
  }

  // Calculate Discount This Month:
  // 1. Sum actual concession_paise on student dues due/created in current month
  // 2. Add monthly active concessions value for active students
  const currentMonthPrefix = todayStr.slice(0, 7); // e.g. "2026-10"
  let duesConcessionsThisMonth = 0;
  for (const due of studentDues) {
    if (due.due_date && due.due_date.startsWith(currentMonthPrefix) && due.concession_paise > 0) {
      duesConcessionsThisMonth += due.concession_paise;
    }
  }

  // If no dues were generated this month yet, compute discount estimation from active concessions
  let estimatedMonthlyDiscountPaise = 0;
  for (const c of enriched) {
    if (c.status === "active") {
      if (c.type === "fixed") {
        estimatedMonthlyDiscountPaise += Math.round(Number(c.value) * 100);
      } else {
        // Average monthly estimate for percentage concession (e.g. 10% of ~₹25,000 tuition = ₹2,500)
        estimatedMonthlyDiscountPaise += Math.round(Number(c.value) * 25000);
      }
    }
  }

  const discountThisMonthPaise =
    duesConcessionsThisMonth > 0 ? duesConcessionsThisMonth : estimatedMonthlyDiscountPaise;

  const metrics: ConcessionSummaryMetrics = {
    activeCount,
    discountThisMonthPaise,
    pendingCount,
    scheduledCount,
    totalCount: enriched.length,
  };

  // Filter concessions
  let filtered = [...enriched];

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (c) =>
        (c.student_name && c.student_name.toLowerCase().includes(q)) ||
        (c.admission_no && c.admission_no.toLowerCase().includes(q)) ||
        (c.concession_type && c.concession_type.toLowerCase().includes(q)) ||
        (c.reason && c.reason.toLowerCase().includes(q)) ||
        (c.class_name && c.class_name.toLowerCase().includes(q))
    );
  }

  if (filters?.academicYearId && filters.academicYearId !== "all") {
    filtered = filtered.filter((c) => c.academic_year_id === filters.academicYearId);
  }

  if (filters?.classId && filters.classId !== "all") {
    filtered = filtered.filter((c) => {
      const enr = studentEnrollmentMap.get(c.student_id);
      const st = studentMap.get(c.student_id);
      const cId = enr?.classId || st?.admission_class_id || st?.class_id;
      return cId === filters.classId;
    });
  }

  if (filters?.concessionType && filters.concessionType !== "all") {
    const ct = filters.concessionType.toLowerCase().replace(/[\s_-]+/g, "");
    filtered = filtered.filter((c) => {
      const itemType = (c.concession_type || "").toLowerCase().replace(/[\s_-]+/g, "");
      return itemType === ct;
    });
  }

  if (filters?.status && filters.status !== "all") {
    filtered = filtered.filter((c) => c.status === filters.status);
  }

  // Chips filtering
  if (filters?.chipFilter && filters.chipFilter !== "all") {
    const chip = filters.chipFilter.toLowerCase().trim();
    if (["active", "pending", "scheduled", "expired", "revoked", "rejected"].includes(chip)) {
      filtered = filtered.filter((c) => c.status === chip);
    } else {
      // Category chip (sibling, merit, financial_aid, staff_ward, management, other)
      const cleanChip = chip.replace(/[\s_-]+/g, "");
      filtered = filtered.filter((c) => {
        const itemType = (c.concession_type || "").toLowerCase().replace(/[\s_-]+/g, "");
        return itemType.includes(cleanChip) || cleanChip.includes(itemType);
      });
    }
  }

  // Sort descending by created_at
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { concessions: filtered, metrics };
}

// ─── Create Student Concession with Approval & Due Application ──────────────
export async function createStudentConcession(
  schoolId: string,
  input: StudentConcessionInput,
  actorId?: string,
  actorRole?: string
): Promise<{ concession?: StudentConcession; error?: string; approvalRequired?: boolean }> {
  if (!schoolId) return { error: "School ID is required." };
  if (!input.student_id) return { error: "Please select a student." };
  if (!input.academic_year_id) return { error: "Academic year is required." };
  if (!input.value || input.value <= 0) return { error: "Please enter a positive discount value." };
  if (input.type === "percent" && input.value > 100) return { error: "Percentage discount cannot exceed 100%." };
  if (!input.valid_from || !input.valid_to) return { error: "Validity dates are required." };
  if (input.valid_to < input.valid_from) return { error: "Valid To date must be on or after Valid From date." };

  const todayStr = getTodayIST();
  const { settings } = await getFeeSettings(schoolId);
  const threshold = settings.discount_approval_threshold_percent ?? 10;

  // Determine if approval is needed
  let requiresApproval = false;
  if (input.type === "percent" && input.value > threshold) {
    requiresApproval = true;
  }
  if (input.rule_id) {
    const rules = isSupabaseConfigured
      ? (await supabase.from("concession_rules").select("*").eq("id", input.rule_id).maybeSingle()).data
      : lsGet<ConcessionRule>(CONCESSION_RULES_KEY(schoolId)).find((r) => r.id === input.rule_id);
    if (rules?.needs_approval) {
      requiresApproval = true;
    }
  }

  // School admin or super admin can auto-approve if creating directly and below limits
  const isSuperAdminOrOwner = actorRole === "super_admin" || actorRole === "owner";
  if (isSuperAdminOrOwner && input.status === "active") {
    requiresApproval = false;
  }

  let finalStatus: StudentConcessionStatus = "active";
  if (requiresApproval) {
    finalStatus = "pending";
  } else if (input.valid_from > todayStr) {
    finalStatus = "scheduled";
  } else {
    finalStatus = "active";
  }

  const concession: StudentConcession = {
    id: uuid(),
    school_id: schoolId,
    student_id: input.student_id,
    academic_year_id: input.academic_year_id,
    rule_id: input.rule_id ?? null,
    concession_type: input.concession_type || "other",
    type: input.type,
    value: input.value,
    fee_head_ids: input.fee_head_ids || [],
    valid_from: input.valid_from,
    valid_to: input.valid_to,
    billing_period: input.billing_period || "monthly",
    reason: input.reason || "Fee Concession",
    document_url: input.document_url || null,
    document_name: input.document_name || null,
    notes: input.notes || null,
    status: finalStatus,
    approved_by: finalStatus === "active" || finalStatus === "scheduled" ? actorId ?? null : null,
    approved_at: finalStatus === "active" || finalStatus === "scheduled" ? now() : null,
    created_by: actorId ?? null,
    created_at: now(),
    updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("student_concessions")
        .insert({
          id: concession.id,
          school_id: concession.school_id,
          student_id: concession.student_id,
          academic_year_id: concession.academic_year_id,
          rule_id: concession.rule_id,
          concession_type: concession.concession_type,
          type: concession.type,
          value: concession.value,
          fee_head_ids: concession.fee_head_ids,
          valid_from: concession.valid_from,
          valid_to: concession.valid_to,
          billing_period: concession.billing_period,
          reason: concession.reason,
          document_url: concession.document_url,
          document_name: concession.document_name,
          notes: concession.notes,
          status: concession.status,
          approved_by: concession.approved_by,
          approved_at: concession.approved_at,
          created_by: concession.created_by,
          created_at: concession.created_at,
          updated_at: concession.updated_at,
        })
        .select()
        .single();

      if (error) throw error;

      // Also record approval request if pending
      if (finalStatus === "pending") {
        await supabase.from("approval_requests").insert({
          school_id: schoolId,
          kind: "discount",
          entity_type: "student_concession",
          entity_id: concession.id,
          requested_by: actorId ?? null,
          payload: {
            student_id: concession.student_id,
            concession_type: concession.concession_type,
            type: concession.type,
            value: concession.value,
            reason: concession.reason,
          },
          status: "pending",
        });
      }

      // If active, apply to existing eligible student dues
      if (finalStatus === "active") {
        await applyConcessionToStudentDues(schoolId, concession, actorId);
      }

      // Cache locally
      const existing = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId));
      lsSet(STUDENT_CONCESSIONS_KEY(schoolId), [concession, ...existing]);

      return { concession: data as StudentConcession, approvalRequired: requiresApproval };
    } catch (err: any) {
      console.warn("Supabase createStudentConcession error, storing locally:", err?.message);
    }
  }

  // Local storage fallback
  const existing = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId));
  lsSet(STUDENT_CONCESSIONS_KEY(schoolId), [concession, ...existing]);

  if (finalStatus === "active") {
    await applyConcessionToStudentDues(schoolId, concession, actorId);
  }

  return { concession, approvalRequired: requiresApproval };
}

// ─── Apply Active Concession to Student Dues ───────────────────────────────
export async function applyConcessionToStudentDues(
  schoolId: string,
  concession: StudentConcession,
  actorId?: string
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;
  const { settings } = await getFeeSettings(schoolId);
  const roundToRupee = settings.round_to_rupee ?? true;

  let dues: StudentDue[] = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("student_dues")
      .select("*")
      .eq("school_id", schoolId)
      .eq("student_id", concession.student_id)
      .eq("academic_year_id", concession.academic_year_id)
      .neq("status", "paid")
      .neq("status", "cancelled");
    dues = (data || []) as StudentDue[];
  } else {
    dues = lsGet<StudentDue>(DUES_KEY(schoolId)).filter(
      (d) =>
        d.student_id === concession.student_id &&
        d.academic_year_id === concession.academic_year_id &&
        d.status !== "paid" &&
        d.status !== "cancelled"
    );
  }

  const eligibleHeadIds = new Set(concession.fee_head_ids || []);
  const allHeadsEligible = eligibleHeadIds.size === 0;

  for (const due of dues) {
    // Only apply if head is eligible
    if (!allHeadsEligible && !eligibleHeadIds.has(due.fee_head_id)) {
      continue;
    }

    // Skip if due already has equal or higher concession applied
    const calculatedPaise =
      concession.type === "percent"
        ? computeConcession(due.gross_paise, "percent", Number(concession.value), roundToRupee)
        : Math.min(Math.round(Number(concession.value) * 100), due.gross_paise);

    if (calculatedPaise <= due.concession_paise) {
      continue;
    }

    const diffConcessionPaise = calculatedPaise - due.concession_paise;
    const newNetPaise = Math.max(0, due.gross_paise - calculatedPaise);
    const newBalancePaise = Math.max(0, newNetPaise - due.paid_paise);
    const newStatus =
      newBalancePaise === 0 && newNetPaise === 0
        ? "waived"
        : newBalancePaise === 0
        ? "paid"
        : "pending";

    const updatePayload = {
      concession_paise: calculatedPaise,
      net_paise: newNetPaise,
      balance_paise: newBalancePaise,
      status: newStatus,
      updated_at: now(),
    };

    if (isSupabaseConfigured) {
      await supabase
        .from("student_dues")
        .update(updatePayload)
        .eq("id", due.id)
        .eq("school_id", schoolId);

      // Log to fee_ledger
      const ledgerRow: FeeLedgerEntry = {
        id: uuid(),
        school_id: schoolId,
        student_id: due.student_id,
        academic_year_id: due.academic_year_id,
        due_id: due.id,
        receipt_id: null,
        entry_type: "concession",
        amount_paise: -diffConcessionPaise,
        note: `Concession applied: ${concession.concession_type} (${concession.reason || "Approved"})`,
        created_at: now(),
        created_by: actorId ?? null,
      };
      await supabase.from("fee_ledger").insert(ledgerRow);
    } else {
      const allDues = lsGet<StudentDue>(DUES_KEY(schoolId));
      lsSet(
        DUES_KEY(schoolId),
        allDues.map((d) => (d.id === due.id ? { ...d, ...updatePayload } : d))
      );
    }

    updatedCount++;
  }

  return { updatedCount };
}

// ─── Approve Concession ────────────────────────────────────────────────────
export async function approveStudentConcession(
  schoolId: string,
  concessionId: string,
  actorId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !concessionId) return { success: false, error: "Invalid parameters." };

  const todayStr = getTodayIST();
  let concession: StudentConcession | null = null;

  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("student_concessions")
      .select("*")
      .eq("id", concessionId)
      .eq("school_id", schoolId)
      .maybeSingle();
    concession = data as StudentConcession | null;
  } else {
    concession = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId)).find(
      (c) => c.id === concessionId
    ) || null;
  }

  if (!concession) return { success: false, error: "Concession not found." };

  // Determine if it should become scheduled or active
  const nextStatus: StudentConcessionStatus =
    concession.valid_from && concession.valid_from > todayStr ? "scheduled" : "active";

  const updateFields = {
    status: nextStatus,
    approved_by: actorId,
    approved_at: now(),
    notes: note ? (concession.notes ? `${concession.notes} | ${note}` : note) : concession.notes,
    updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("student_concessions")
        .update(updateFields)
        .eq("id", concessionId)
        .eq("school_id", schoolId);

      // Update related approval_requests row
      await supabase
        .from("approval_requests")
        .update({
          status: "approved",
          decided_by: actorId,
          decided_at: now(),
          decision_note: note || "Approved concession",
          updated_at: now(),
        })
        .eq("school_id", schoolId)
        .eq("entity_id", concessionId);

      if (nextStatus === "active") {
        await applyConcessionToStudentDues(
          schoolId,
          { ...concession, ...updateFields },
          actorId
        );
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // Update local storage
  const all = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId));
  lsSet(
    STUDENT_CONCESSIONS_KEY(schoolId),
    all.map((c) => (c.id === concessionId ? { ...c, ...updateFields } : c))
  );

  return { success: true };
}

// ─── Reject Concession ─────────────────────────────────────────────────────
export async function rejectStudentConcession(
  schoolId: string,
  concessionId: string,
  actorId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !concessionId) return { success: false, error: "Invalid parameters." };

  const updateFields = {
    status: "rejected" as StudentConcessionStatus,
    rejected_by: actorId,
    rejected_at: now(),
    rejection_reason: reason || "Declined by administrator",
    updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("student_concessions")
        .update(updateFields)
        .eq("id", concessionId)
        .eq("school_id", schoolId);

      await supabase
        .from("approval_requests")
        .update({
          status: "rejected",
          decided_by: actorId,
          decided_at: now(),
          decision_note: reason,
          updated_at: now(),
        })
        .eq("school_id", schoolId)
        .eq("entity_id", concessionId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  const all = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId));
  lsSet(
    STUDENT_CONCESSIONS_KEY(schoolId),
    all.map((c) => (c.id === concessionId ? { ...c, ...updateFields } : c))
  );

  return { success: true };
}

// ─── Revoke Concession (Rollback un-paid dues) ──────────────────────────────
export async function revokeStudentConcession(
  schoolId: string,
  concessionId: string,
  actorId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !concessionId) return { success: false, error: "Invalid parameters." };

  let concession: StudentConcession | null = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("student_concessions")
      .select("*")
      .eq("id", concessionId)
      .eq("school_id", schoolId)
      .maybeSingle();
    concession = data as StudentConcession | null;
  } else {
    concession = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId)).find(
      (c) => c.id === concessionId
    ) || null;
  }

  if (!concession) return { success: false, error: "Concession not found." };

  const updateFields = {
    status: "revoked" as StudentConcessionStatus,
    notes: reason ? `Revoked: ${reason}` : "Revoked by administrator",
    updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("student_concessions")
        .update(updateFields)
        .eq("id", concessionId)
        .eq("school_id", schoolId);

      // Revert dues that have not been paid
      const { data: dues } = await supabase
        .from("student_dues")
        .select("*")
        .eq("school_id", schoolId)
        .eq("student_id", concession.student_id)
        .eq("academic_year_id", concession.academic_year_id)
        .neq("status", "paid")
        .neq("status", "cancelled");

      for (const due of (dues || []) as StudentDue[]) {
        if (due.concession_paise > 0) {
          const revertedPaise = due.concession_paise;
          const restoredNet = due.gross_paise;
          const restoredBalance = Math.max(0, restoredNet - due.paid_paise);
          await supabase
            .from("student_dues")
            .update({
              concession_paise: 0,
              net_paise: restoredNet,
              balance_paise: restoredBalance,
              status: restoredBalance === 0 ? "paid" : "pending",
              updated_at: now(),
            })
            .eq("id", due.id)
            .eq("school_id", schoolId);

          // Write ledger reversal
          await supabase.from("fee_ledger").insert({
            id: uuid(),
            school_id: schoolId,
            student_id: due.student_id,
            academic_year_id: due.academic_year_id,
            due_id: due.id,
            receipt_id: null,
            entry_type: "concession_reversal",
            amount_paise: revertedPaise,
            note: `Concession revoked: ${reason || "Cancelled"}`,
            created_at: now(),
            created_by: actorId,
          });
        }
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  const all = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId));
  lsSet(
    STUDENT_CONCESSIONS_KEY(schoolId),
    all.map((c) => (c.id === concessionId ? { ...c, ...updateFields } : c))
  );

  return { success: true };
}

// ─── Delete Concession ─────────────────────────────────────────────────────
export async function deleteStudentConcession(
  schoolId: string,
  concessionId: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("student_concessions")
        .delete()
        .eq("id", concessionId)
        .eq("school_id", schoolId);
      if (error) throw error;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  const all = lsGet<StudentConcession>(STUDENT_CONCESSIONS_KEY(schoolId));
  lsSet(
    STUDENT_CONCESSIONS_KEY(schoolId),
    all.filter((c) => c.id !== concessionId)
  );
  return { success: true };
}

// ─── Upload Supporting Document ────────────────────────────────────────────
export async function uploadConcessionDocument(
  schoolId: string,
  file: File
): Promise<{ url?: string; name: string; error?: string }> {
  if (!file) return { name: "", error: "No file provided" };

  // Limit to 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return { name: file.name, error: "File exceeds maximum size of 5 MB." };
  }

  // Allowed extensions: pdf, png, jpg, jpeg
  const validExts = [".pdf", ".jpg", ".jpeg", ".png"];
  const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!validExts.includes(fileExt)) {
    return { name: file.name, error: "Only PDF, JPG, and PNG files are allowed." };
  }

  if (isSupabaseConfigured) {
    try {
      const path = `concessions/${schoolId}/${uuid()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error } = await supabase.storage.from("school-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from("school-assets")
          .getPublicUrl(data.path);
        return { url: publicUrlData.publicUrl, name: file.name };
      }
    } catch (e: any) {
      console.warn("Storage upload error:", e.message);
    }
  }

  // Fallback: create base64 object URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ url: reader.result as string, name: file.name });
    };
    reader.onerror = () => {
      resolve({ name: file.name, error: "Failed to read file." });
    };
    reader.readAsDataURL(file);
  });
}
