/**
 * Fee Setup Service (Phase 2)
 *
 * Manages fee heads, terms, structures (grid + patterns + versioning),
 * concession rules, late-fee rules, and school fee settings.
 *
 * Storage: Supabase when configured; localStorage as offline fallback.
 * All amounts in integer paise.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  FeeHead, FeeHeadInput,
  FeeTerm, FeeTermInput,
  FeeStructure, FeeStructureInput,
  FeeStructureItem, FeeStructureItemTerm,
  StructureGridUpdate,
  ConcessionRule, ConcessionRuleInput,
  LateFeeRule, LateFeeRuleInput,
  FeeSettings, FeeSettingsInput,
  TermPreset,
  FeeCycleFrequency,
  FeeCycleSchedule,
  SUGGESTED_FEE_HEADS,
  SYSTEM_FEE_HEADS,
  StructureAppliesTo,
  StructureTargetType,
  FeeHeadFrequency,
  FeeStructureConfigItem,
  StructureStatus,
  StudentFeeAssignment,
  StudentDue,
} from "../types/fees";
import { SUGGESTED_FEE_HEADS as SUGGESTED, SYSTEM_FEE_HEADS as SYSTEM } from "../types/fees";

// ─── Cache keys ──────────────────────────────────────────────────────────────
const FEE_HEADS_KEY = (s: string) => `myzkool_fee_heads_${s}`;
const FEE_TERMS_KEY = (s: string, y: string) => `myzkool_fee_terms_${s}_${y}`;
const FEE_STRUCTURES_KEY = (s: string) => `myzkool_fee_structures_${s}`;
const FEE_STRUCTURE_ITEMS_KEY = (s: string) => `myzkool_fee_structure_items_${s}`;
const FEE_STRUCTURE_ITEM_TERMS_KEY = (s: string) => `myzkool_fee_structure_item_terms_${s}`;
const CONCESSION_RULES_KEY = (s: string) => `myzkool_concession_rules_${s}`;
const LATE_FEE_RULES_KEY = (s: string) => `myzkool_late_fee_rules_${s}`;
const FEE_SETTINGS_KEY = (s: string) => `myzkool_fee_settings_${s}`;
const PIN_ATTEMPTS_KEY = (s: string) => `myzkool_pin_attempts_${s}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function now() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID(); }

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}
function lsGetObj<T>(key: string, def: T): T {
  if (typeof localStorage === "undefined") return def;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}
function lsSetObj<T>(key: string, data: T) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

/** Half-up rounding: paise → nearest rupee * 100 */
export function roundPaise(paise: number, roundToRupee = true): number {
  if (!roundToRupee) return Math.round(paise);
  return Math.round(paise / 100) * 100;
}

/** Compute concession (never exceeds gross). Returns paise. */
export function computeConcession(
  grossPaise: number,
  type: "percent" | "fixed",
  value: number,
  roundToRupee = true,
): number {
  const raw = type === "percent"
    ? (grossPaise * value) / 100
    : value;
  const rounded = roundPaise(raw, roundToRupee);
  return Math.min(rounded, grossPaise);
}

/**
 * Derives the active calendar months that belong to a fee term.
 * A month belongs to a term if the overlap between the term's dates and the month is >= 15 days.
 */
export function getTermBillingMonths(
  term: { period_start?: string | null; period_end?: string | null; due_date?: string | null },
  academicYearStartYear: number,
  billingMonths: number[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
  allTermsCount = 12,
  termIndex = 0
): { year: number; month: number }[] {
  if (term.period_start && term.period_end) {
    const [psY, psM, psD] = term.period_start.split("-").map(Number);
    const [peY, peM, peD] = term.period_end.split("-").map(Number);
    const tStart = new Date(psY, psM - 1, psD);
    const tEnd = new Date(peY, peM - 1, peD);

    const result: { year: number; month: number }[] = [];
    for (const m of billingMonths) {
      const year = m < 4 ? academicYearStartYear + 1 : academicYearStartYear;
      const mStart = new Date(year, m - 1, 1);
      const mEnd = new Date(year, m, 0);

      const overlapStart = tStart > mStart ? tStart : mStart;
      const overlapEnd = tEnd < mEnd ? tEnd : mEnd;

      if (overlapEnd >= overlapStart) {
        const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (overlapDays >= 15) {
          result.push({ year, month: m });
        }
      }
    }
    if (result.length > 0) return result;
  }

  if (allTermsCount > 0) {
    const perTerm = Math.ceil(billingMonths.length / allTermsCount);
    const slice = billingMonths.slice(termIndex * perTerm, (termIndex + 1) * perTerm);
    return slice.map((m) => ({
      year: m < 4 ? academicYearStartYear + 1 : academicYearStartYear,
      month: m,
    }));
  }

  return [];
}

// ─── Simple PBKDF2 PIN hash (browser-compatible) ─────────────────────────────
async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]
  );
  const salt = enc.encode("myzkool_owner_pin_salt_v1");
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return (await hashPin(pin)) === hash;
}

// ─── Fee Heads ───────────────────────────────────────────────────────────────

export async function getFeeHeads(
  schoolId: string,
  includeInactive = false
): Promise<{ heads: FeeHead[]; error?: string }> {
  if (!schoolId) return { heads: [], error: "school_id required" };

  if (isSupabaseConfigured) {
    try {
      let q = supabase.from("fee_heads").select("*").eq("school_id", schoolId).order("display_order");
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      if (data && data.length > 0) {
        return { heads: data as FeeHead[] };
      }
      // Check local storage if no Supabase records returned yet
      const local = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId))
        .filter(h => includeInactive || h.is_active)
        .sort((a, b) => a.display_order - b.display_order);
      if (local.length > 0) {
        return { heads: local };
      }
      return { heads: [] };
    } catch (e: any) {
      console.warn("Supabase getFeeHeads error, checking local fallback:", e.message);
      const heads = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId))
        .filter(h => includeInactive || h.is_active)
        .sort((a, b) => a.display_order - b.display_order);
      return { heads, error: heads.length > 0 ? undefined : e.message };
    }
  }

  const heads = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId))
    .filter(h => includeInactive || h.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  return { heads };
}

export async function createFeeHead(
  schoolId: string,
  input: FeeHeadInput,
  actorId?: string
): Promise<{ head?: FeeHead; error?: string }> {
  if (!schoolId || !input.name || !input.code) return { error: "name and code required" };

  const existing = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId));
  if (existing.some(h => h.code === input.code)) return { error: `Code '${input.code}' already exists` };

  const maxOrder = existing.reduce((m, h) => Math.max(m, h.display_order), 0);
  const head: FeeHead = {
    id: uuid(), school_id: schoolId,
    name: input.name, code: input.code,
    kind: input.kind, is_refundable: input.is_refundable ?? false,
    rte_waivable: input.rte_waivable ?? false, is_system: false,
    display_order: input.display_order ?? maxOrder + 10,
    is_active: input.is_active ?? true,
    created_at: now(), updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_heads").insert({ ...head, created_by: actorId }).select().single();
      if (error) {
        console.warn("Supabase createFeeHead error, saving to local fallback:", error.message);
        lsSet(FEE_HEADS_KEY(schoolId), [...existing, head]);
        return { head };
      }
      lsSet(FEE_HEADS_KEY(schoolId), [...existing, data as FeeHead]);
      return { head: data as FeeHead };
    } catch (e: any) {
      lsSet(FEE_HEADS_KEY(schoolId), [...existing, head]);
      return { head };
    }
  }
  lsSet(FEE_HEADS_KEY(schoolId), [...existing, head]);
  return { head };
}

export async function updateFeeHead(
  schoolId: string,
  id: string,
  input: Partial<FeeHeadInput>
): Promise<{ head?: FeeHead; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_heads")
        .update({ ...input, updated_at: now() })
        .eq("id", id).eq("school_id", schoolId).eq("is_system", false)
        .select().single();
      if (!error && data) {
        const heads = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId));
        const idx = heads.findIndex(h => h.id === id);
        if (idx >= 0) {
          heads[idx] = data as FeeHead;
          lsSet(FEE_HEADS_KEY(schoolId), heads);
        }
        return { head: data as FeeHead };
      }
    } catch (e: any) {
      console.warn("Supabase updateFeeHead error, updating local storage:", e.message);
    }
  }
  const heads = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId));
  const idx = heads.findIndex(h => h.id === id && !h.is_system);
  if (idx < 0) return { error: "Head not found or is a system head" };
  heads[idx] = { ...heads[idx], ...input, updated_at: now() };
  lsSet(FEE_HEADS_KEY(schoolId), heads);
  return { head: heads[idx] };
}

export async function reorderFeeHeads(
  schoolId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  if (isSupabaseConfigured) {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await supabase.from("fee_heads").update({ display_order: i * 10, updated_at: now() })
          .eq("id", orderedIds[i]).eq("school_id", schoolId);
      }
      return {};
    } catch (e: any) { return { error: e.message }; }
  }
  const heads = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId));
  for (let i = 0; i < orderedIds.length; i++) {
    const h = heads.find(x => x.id === orderedIds[i]);
    if (h) { h.display_order = i * 10; h.updated_at = now(); }
  }
  lsSet(FEE_HEADS_KEY(schoolId), heads);
  return {};
}

export async function addSuggestedHeads(
  schoolId: string,
  codes: string[]
): Promise<{ added: FeeHead[]; error?: string }> {
  const { heads: existing } = await getFeeHeads(schoolId, true);
  const existingCodes = new Set(existing.map(h => h.code));
  const toAdd = SUGGESTED.filter(s => codes.includes(s.code) && !existingCodes.has(s.code));
  const maxOrder = existing.reduce((m, h) => Math.max(m, h.display_order), 0);
  const added: FeeHead[] = [];
  for (let i = 0; i < toAdd.length; i++) {
    const s = toAdd[i];
    const r = await createFeeHead(schoolId, { ...s, display_order: maxOrder + (i + 1) * 10 });
    if (r.head) added.push(r.head);
  }
  return { added };
}

export async function ensureSystemHeads(schoolId: string): Promise<void> {
  const { heads: existing } = await getFeeHeads(schoolId, true);
  const existingCodes = new Set(existing.map(h => h.code));
  for (let i = 0; i < SYSTEM.length; i++) {
    const s = SYSTEM[i];
    if (!existingCodes.has(s.code)) {
      const head: FeeHead = {
        id: uuid(), school_id: schoolId,
        name: s.name, code: s.code, kind: s.kind,
        is_refundable: false, rte_waivable: false, is_system: true,
        display_order: 1000 + i * 10, is_active: true,
        created_at: now(), updated_at: now(),
      };
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("fee_heads").insert(head);
        if (error) {
          console.warn("Supabase ensureSystemHeads insert error, falling back to local:", error.message);
          const all = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId));
          lsSet(FEE_HEADS_KEY(schoolId), [...all, head]);
        }
      } else {
        const all = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId));
        lsSet(FEE_HEADS_KEY(schoolId), [...all, head]);
      }
    }
  }
}

// ─── Fee Terms ───────────────────────────────────────────────────────────────

const FEE_CYCLE_SCHEDULE_KEY = (s: string, y: string) => `myzkool_fee_cycle_sched_${s}_${y}`;

export async function getFeeTerms(
  schoolId: string,
  yearId?: string
): Promise<{ terms: FeeTerm[]; error?: string }> {
  let terms: FeeTerm[] = [];

  if (isSupabaseConfigured) {
    try {
      let q = supabase.from("fee_terms").select("*").eq("school_id", schoolId);
      if (yearId && yearId.trim()) {
        q = q.eq("academic_year_id", yearId.trim());
      }
      const { data, error } = await q.order("sort_order");
      if (error) throw error;
      terms = (data || []) as FeeTerm[];
    } catch (e: any) {
      console.warn("Supabase getFeeTerms error, falling back to local:", e.message);
    }
  }

  if (terms.length === 0) {
    terms = lsGet<FeeTerm>(FEE_TERMS_KEY(schoolId, yearId || "")).sort((a, b) => a.sort_order - b.sort_order);
    if (terms.length === 0 && (!yearId || !yearId.trim()) && typeof localStorage !== "undefined") {
      const prefix = `myzkool_fee_terms_${schoolId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) {
              terms = parsed;
              break;
            }
          } catch {}
        }
      }
    }
  }

  // Merge applicable_fee_head_ids from local schedule if column was omitted in DB
  const sched = lsGetObj<any>(FEE_CYCLE_SCHEDULE_KEY(schoolId, yearId), null);
  if (sched?.terms) {
    const localMap = new Map<string, string[]>();
    for (const lt of sched.terms) {
      if (lt.applicable_fee_head_ids && lt.applicable_fee_head_ids.length > 0) {
        localMap.set(lt.id, lt.applicable_fee_head_ids);
        localMap.set(lt.name, lt.applicable_fee_head_ids);
      }
    }
    terms = terms.map(t => ({
      ...t,
      applicable_fee_head_ids: t.applicable_fee_head_ids || localMap.get(t.id) || localMap.get(t.name) || [],
    }));
  }

  return { terms };
}

export function generateTermPreset(
  yearId: string,
  schoolId: string,
  preset: TermPreset | FeeCycleFrequency,
  yearStart: string,
  dueDay = 10,
  graceDays = 5
): FeeTermInput[] {
  const start = new Date(yearStart);
  const startYear = start.getFullYear() || 2025;
  const startMonth = start.getMonth(); // 0-indexed, e.g. 3 for April

  const formatIso = (d: Date) => d.toISOString().split("T")[0];

  if (preset === "monthly") {
    const monthNames = [
      "April", "May", "June", "July", "August", "September",
      "October", "November", "December", "January", "February", "March"
    ];
    return Array.from({ length: 12 }, (_, i) => {
      // Month calculation starting from session startMonth
      const termMonthDate = new Date(startYear, startMonth + i, 1);
      const endMonthDate = new Date(startYear, startMonth + i + 1, 0); // last day of month
      const dueDate = new Date(startYear, startMonth + i, dueDay);

      return {
        name: `${monthNames[i]} ${termMonthDate.getFullYear()}`,
        period_start: formatIso(termMonthDate),
        period_end: formatIso(endMonthDate),
        due_date: formatIso(dueDate),
        late_grace_days: graceDays,
        sort_order: i,
      };
    });
  }

  if (preset === "quarterly") {
    const quarters = [
      { name: "Term 1 (Apr – Jun)", mStart: 0, mEnd: 2 },
      { name: "Term 2 (Jul – Sep)", mStart: 3, mEnd: 5 },
      { name: "Term 3 (Oct – Dec)", mStart: 6, mEnd: 8 },
      { name: "Term 4 (Jan – Mar)", mStart: 9, mEnd: 11 },
    ];
    return quarters.map((q, i) => {
      const pStart = new Date(startYear, startMonth + q.mStart, 1);
      const pEnd = new Date(startYear, startMonth + q.mEnd + 1, 0);
      const dDate = new Date(startYear, startMonth + q.mStart, dueDay);
      return {
        name: q.name,
        period_start: formatIso(pStart),
        period_end: formatIso(pEnd),
        due_date: formatIso(dDate),
        late_grace_days: graceDays,
        sort_order: i,
      };
    });
  }

  if (preset === "three_term") {
    const terms = [
      { name: "Term 1 (Apr – Jul)", mStart: 0, mEnd: 3 },
      { name: "Term 2 (Aug – Nov)", mStart: 4, mEnd: 7 },
      { name: "Term 3 (Dec – Mar)", mStart: 8, mEnd: 11 },
    ];
    return terms.map((t, i) => {
      const pStart = new Date(startYear, startMonth + t.mStart, 1);
      const pEnd = new Date(startYear, startMonth + t.mEnd + 1, 0);
      const dDate = new Date(startYear, startMonth + t.mStart, dueDay);
      return {
        name: t.name,
        period_start: formatIso(pStart),
        period_end: formatIso(pEnd),
        due_date: formatIso(dDate),
        late_grace_days: graceDays,
        sort_order: i,
      };
    });
  }

  if (preset === "half_yearly") {
    const halves = [
      { name: "Half Year 1 (Apr – Sep)", mStart: 0, mEnd: 5 },
      { name: "Half Year 2 (Oct – Mar)", mStart: 6, mEnd: 11 },
    ];
    return halves.map((h, i) => {
      const pStart = new Date(startYear, startMonth + h.mStart, 1);
      const pEnd = new Date(startYear, startMonth + h.mEnd + 1, 0);
      const dDate = new Date(startYear, startMonth + h.mStart, dueDay);
      return {
        name: h.name,
        period_start: formatIso(pStart),
        period_end: formatIso(pEnd),
        due_date: formatIso(dDate),
        late_grace_days: graceDays,
        sort_order: i,
      };
    });
  }

  // Default: Annual / Yearly (1 term)
  const pStart = new Date(startYear, startMonth, 1);
  const pEnd = new Date(startYear, startMonth + 12, 0);
  const dDate = new Date(startYear, startMonth, dueDay);
  return [{
    name: "Annual (Full Year)",
    period_start: formatIso(pStart),
    period_end: formatIso(pEnd),
    due_date: formatIso(dDate),
    late_grace_days: graceDays,
    sort_order: 0,
  }];
}

export async function createFeeTerms(
  schoolId: string,
  yearId: string,
  inputs: FeeTermInput[]
): Promise<{ terms: FeeTerm[]; error?: string }> {
  const terms: FeeTerm[] = inputs.map((inp, i) => ({
    id: inp.id || uuid(),
    school_id: schoolId,
    academic_year_id: yearId,
    name: inp.name.trim(),
    period_start: inp.period_start ?? null,
    period_end: inp.period_end ?? null,
    due_date: inp.due_date,
    late_grace_days: inp.late_grace_days ?? 0,
    sort_order: inp.sort_order ?? i,
    applicable_fee_head_ids: inp.applicable_fee_head_ids || [],
    created_at: now(),
    updated_at: now(),
  }));

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_terms").insert(terms).select();
      if (error) {
        // Retry without applicable_fee_head_ids in case column is not yet migrated
        const stripped = terms.map(({ applicable_fee_head_ids, ...rest }) => rest);
        const { data: retryData, error: retryErr } = await supabase.from("fee_terms").insert(stripped).select();
        if (retryErr) throw retryErr;
        // sync to local
        const existing = lsGet<FeeTerm>(FEE_TERMS_KEY(schoolId, yearId));
        lsSet(FEE_TERMS_KEY(schoolId, yearId), [...existing, ...terms]);
        return { terms };
      }
      return { terms: (data || terms) as FeeTerm[] };
    } catch (e: any) {
      console.warn("createFeeTerms Supabase error, saving locally:", e.message);
    }
  }
  const existing = lsGet<FeeTerm>(FEE_TERMS_KEY(schoolId, yearId));
  lsSet(FEE_TERMS_KEY(schoolId, yearId), [...existing, ...terms]);
  return { terms };
}

export async function updateFeeTerm(
  schoolId: string,
  id: string,
  input: Partial<FeeTermInput>
): Promise<{ term?: FeeTerm; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_terms")
        .update({ ...input, updated_at: now() }).eq("id", id).eq("school_id", schoolId)
        .select().single();
      if (!error && data) {
        return { term: data as FeeTerm };
      }
    } catch (e: any) {
      console.warn("updateFeeTerm Supabase error:", e.message);
    }
  }
  const allKeys = typeof localStorage !== "undefined"
    ? Object.keys(localStorage).filter(k => k.startsWith(`myzkool_fee_terms_${schoolId}_`))
    : [];
  let foundTerm: FeeTerm | null = null;
  for (const k of allKeys) {
    const terms = lsGet<FeeTerm>(k);
    const idx = terms.findIndex(x => x.id === id);
    if (idx >= 0) {
      terms[idx] = { ...terms[idx], ...input, updated_at: now() };
      lsSet(k, terms);
      foundTerm = terms[idx];
      break;
    }
  }
  if (!foundTerm) return { error: "Term not found" };
  return { term: foundTerm };
}

export async function deleteFeeTerm(
  schoolId: string,
  termId: string
): Promise<{ success: boolean; error?: string }> {
  // Check if student dues are attached to this term
  if (isSupabaseConfigured) {
    try {
      const { count, error: countErr } = await supabase
        .from("student_dues")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("term_id", termId);
      if (!countErr && count && count > 0) {
        return {
          success: false,
          error: `Cannot delete this term because ${count} student fee due(s) or invoices are already assigned to it.`,
        };
      }
      const { error: delErr } = await supabase
        .from("fee_terms")
        .delete()
        .eq("id", termId)
        .eq("school_id", schoolId);
      if (delErr) {
        console.warn("deleteFeeTerm Supabase error:", delErr.message);
      }
    } catch (e: any) {
      console.warn("deleteFeeTerm check error:", e.message);
    }
  }

  // Check localStorage dues
  const localDues = lsGet<any>(`myzkool_dues_${schoolId}`);
  const attached = localDues.filter((d: any) => d.term_id === termId && d.status !== "cancelled");
  if (attached.length > 0) {
    return {
      success: false,
      error: `Cannot delete this term because ${attached.length} student due(s) are attached to it.`,
    };
  }

  // Remove from all term caches
  const allKeys = typeof localStorage !== "undefined"
    ? Object.keys(localStorage).filter(k => k.startsWith(`myzkool_fee_terms_${schoolId}_`))
    : [];
  for (const k of allKeys) {
    const items = lsGet<FeeTerm>(k);
    lsSet(k, items.filter(t => t.id !== termId));
  }
  return { success: true };
}

export async function saveFeeCycleSchedule(
  schoolId: string,
  yearId: string,
  termsInput: FeeTermInput[],
  headMapping: Record<string, string[]> = {},
  frequency: FeeCycleFrequency = "quarterly"
): Promise<{ terms: FeeTerm[]; error?: string }> {
  if (!schoolId || !yearId) return { terms: [], error: "schoolId and yearId are required" };

  // Fetch existing terms to inspect what to delete vs update vs insert
  const { terms: existingTerms } = await getFeeTerms(schoolId, yearId);
  const inputIds = new Set(termsInput.filter(t => t.id).map(t => t.id!));

  // Safe delete terms that were removed in the UI
  const toDelete = existingTerms.filter(t => !inputIds.has(t.id));
  for (const t of toDelete) {
    const delRes = await deleteFeeTerm(schoolId, t.id);
    if (!delRes.success) {
      return { terms: existingTerms, error: delRes.error };
    }
  }

  // Prepare normalized FeeTerm objects
  const finalTerms: FeeTerm[] = termsInput.map((inp, i) => {
    const termId = inp.id || uuid();
    // Resolve applicable head IDs from headMapping or direct property
    const applicableHeads = inp.applicable_fee_head_ids ||
      Object.entries(headMapping)
        .filter(([_, tids]) => tids.includes(termId) || (inp.name && tids.includes(inp.name)))
        .map(([headId]) => headId);

    return {
      id: termId,
      school_id: schoolId,
      academic_year_id: yearId,
      name: inp.name.trim(),
      period_start: inp.period_start || null,
      period_end: inp.period_end || null,
      due_date: inp.due_date,
      late_grace_days: inp.late_grace_days ?? 0,
      sort_order: inp.sort_order ?? i,
      applicable_fee_head_ids: applicableHeads,
      created_at: now(),
      updated_at: now(),
    };
  });

  // Upsert to Supabase
  if (isSupabaseConfigured) {
    try {
      const { error: upsertErr } = await supabase.from("fee_terms").upsert(finalTerms);
      if (upsertErr) {
        // Fallback without applicable_fee_head_ids if column is missing
        const stripped = finalTerms.map(({ applicable_fee_head_ids, ...rest }) => rest);
        const { error: retryErr } = await supabase.from("fee_terms").upsert(stripped);
        if (retryErr) console.warn("Supabase upsert retry error:", retryErr.message);
      }
    } catch (e: any) {
      console.warn("Supabase saveFeeCycleSchedule note:", e.message);
    }
  }

  // Cache in localStorage
  lsSet(FEE_TERMS_KEY(schoolId, yearId), finalTerms);
  lsSetObj(FEE_CYCLE_SCHEDULE_KEY(schoolId, yearId), {
    academic_year_id: yearId,
    frequency,
    terms: finalTerms,
    head_mapping: headMapping,
    updated_at: now(),
  });

  return { terms: finalTerms };
}

export async function getFeeCycleSchedule(
  schoolId: string,
  yearId: string
): Promise<{
  terms: FeeTerm[];
  headMapping: Record<string, string[]>;
  frequency: FeeCycleFrequency;
  error?: string;
}> {
  const { terms, error } = await getFeeTerms(schoolId, yearId);
  const sched = lsGetObj<FeeCycleSchedule | null>(FEE_CYCLE_SCHEDULE_KEY(schoolId, yearId), null);

  const headMapping: Record<string, string[]> = sched?.head_mapping ? { ...sched.head_mapping } : {};
  for (const t of terms) {
    if (t.applicable_fee_head_ids) {
      for (const hid of t.applicable_fee_head_ids) {
        if (!headMapping[hid]) headMapping[hid] = [];
        if (!headMapping[hid].includes(t.id)) headMapping[hid].push(t.id);
      }
    }
  }

  const derivedFrequency: FeeCycleFrequency = sched?.frequency ||
    (terms.length === 12 ? "monthly" : terms.length === 4 ? "quarterly" : terms.length === 2 ? "half_yearly" : terms.length === 1 ? "yearly" : "custom");

  return {
    terms,
    headMapping,
    frequency: derivedFrequency,
    error,
  };
}

// ─── Fee Structures ──────────────────────────────────────────────────────────

export async function getFeeStructures(
  schoolId: string,
  yearId?: string,
  classId?: string
): Promise<{ structures: FeeStructure[]; error?: string }> {
  let structures: FeeStructure[] = [];
  if (isSupabaseConfigured) {
    try {
      let q = supabase.from("fee_structures").select("*").eq("school_id", schoolId);
      if (yearId) q = q.eq("academic_year_id", yearId);
      const { data, error } = await q;
      if (error) throw error;
      structures = (data || []) as FeeStructure[];

      // Enrich junction tables (fee_structure_classes, fee_structure_sections)
      try {
        const { data: classJunctions } = await supabase
          .from("fee_structure_classes")
          .select("fee_structure_id, class_id")
          .eq("school_id", schoolId);

        const { data: secJunctions } = await supabase
          .from("fee_structure_sections")
          .select("fee_structure_id, section_id")
          .eq("school_id", schoolId);

        if (classJunctions && classJunctions.length > 0) {
          const classMap = new Map<string, string[]>();
          for (const cj of classJunctions) {
            if (!classMap.has(cj.fee_structure_id)) classMap.set(cj.fee_structure_id, []);
            classMap.get(cj.fee_structure_id)!.push(cj.class_id);
          }

          structures = structures.map((st) => {
            const mappedCids = classMap.get(st.id) || [];
            if (mappedCids.length > 0) {
              const primaryClassId = st.class_id || mappedCids[0];
              const mergedCids = Array.from(new Set([...(st.class_ids || []), ...mappedCids]));
              return {
                ...st,
                class_id: primaryClassId,
                class_ids: mergedCids,
                target_type: st.target_type === "all_classes" ? "specific_classes" : st.target_type,
              };
            }
            return st;
          });
        }

        if (secJunctions && secJunctions.length > 0) {
          const secMap = new Map<string, string[]>();
          for (const sj of secJunctions) {
            if (!secMap.has(sj.fee_structure_id)) secMap.set(sj.fee_structure_id, []);
            secMap.get(sj.fee_structure_id)!.push(sj.section_id);
          }

          structures = structures.map((st) => {
            const mappedSids = secMap.get(st.id) || [];
            if (mappedSids.length > 0) {
              const mergedSids = Array.from(new Set([...(st.section_ids || []), ...mappedSids]));
              return {
                ...st,
                section_ids: mergedSids,
              };
            }
            return st;
          });
        }
      } catch (jErr: any) {
        console.warn("fee_structure junctions enrichment note:", jErr.message);
      }
    } catch (e: any) {
      console.warn("getFeeStructures Supabase note:", e.message);
    }
  }

  // Merge with localStorage
  const local = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  const combinedMap = new Map<string, FeeStructure>();
  for (const s of structures) combinedMap.set(s.id, s);
  for (const s of local) {
    if (!combinedMap.has(s.id)) {
      combinedMap.set(s.id, s);
    } else {
      const remote = combinedMap.get(s.id)!;
      // Prefer newer record or merge fields cleanly without overwriting valid class_id or names
      const preferLocal = s.updated_at && remote.updated_at && new Date(s.updated_at) > new Date(remote.updated_at);
      const effectiveName = preferLocal ? s.name : remote.name || s.name;
      const effectiveClassId = remote.class_id || (remote.class_ids && remote.class_ids[0]) || s.class_id || (s.class_ids && s.class_ids[0]) || null;
      const effectiveClassIds = (remote.class_ids && remote.class_ids.length > 0) ? remote.class_ids : (s.class_ids && s.class_ids.length > 0) ? s.class_ids : effectiveClassId ? [effectiveClassId] : [];
      const effectiveTargetType = effectiveClassId || effectiveClassIds.length > 0
        ? ((remote.target_type && remote.target_type !== "all_classes") ? remote.target_type : s.target_type !== "all_classes" ? s.target_type : "specific_classes")
        : (remote.target_type || s.target_type);

      combinedMap.set(s.id, {
        ...remote,
        name: effectiveName,
        target_type: effectiveTargetType,
        class_id: effectiveClassId,
        class_ids: effectiveClassIds,
        section_ids: (remote.section_ids && remote.section_ids.length > 0) ? remote.section_ids : s.section_ids,
        student_ids: (remote.student_ids && remote.student_ids.length > 0) ? remote.student_ids : s.student_ids,
        description: remote.description || s.description,
      });
    }
  }

  let list = Array.from(combinedMap.values());
  if (yearId) list = list.filter(s => s.academic_year_id === yearId);
  if (classId) {
    list = list.filter(s =>
      s.class_id === classId ||
      s.target_type === "all_classes" ||
      (s.target_type === "specific_classes" && s.class_ids?.includes(classId))
    );
  }
  return { structures: list };
}

/**
 * Calculates exact eligible enrolled students and active transport users
 * for a given fee structure scope without duplicate counts.
 */
export async function getStructureStudentCounts(
  schoolId: string,
  academicYearId: string,
  structure: {
    target_type?: StructureTargetType;
    class_id?: string | null;
    class_ids?: string[];
    section_ids?: string[];
  }
): Promise<{ enrolledCount: number; transportCount: number; studentIds: string[] }> {
  if (!schoolId) {
    return { enrolledCount: 0, transportCount: 0, studentIds: [] };
  }

  const targetClassIds =
    structure.class_ids && structure.class_ids.length > 0
      ? structure.class_ids
      : structure.class_id
      ? [structure.class_id]
      : [];
  const targetSectionIds = structure.section_ids || [];

  if (isSupabaseConfigured) {
    try {
      // 1. Fetch eligible student enrollments for this school and academic year
      let q = supabase
        .from("student_enrollments")
        .select("student_id, class_id, section_id")
        .eq("school_id", schoolId)
        .eq("status", "active");

      if (academicYearId) {
        q = q.eq("academic_year_id", academicYearId);
      }

      if (structure.target_type === "specific_classes" && targetClassIds.length > 0) {
        q = q.in("class_id", targetClassIds);
      } else if (structure.target_type === "specific_sections" && targetSectionIds.length > 0) {
        q = q.in("section_id", targetSectionIds);
      } else if (targetClassIds.length > 0) {
        q = q.in("class_id", targetClassIds);
      }

      const { data: enrollments, error: enrErr } = await q;
      if (!enrErr && enrollments) {
        // Unique student IDs to prevent duplicate counts from any joins
        const studentIdSet = new Set<string>();
        for (const e of enrollments) {
          if (e.student_id) studentIdSet.add(e.student_id);
        }
        const studentIds = Array.from(studentIdSet);
        const enrolledCount = studentIds.length;

        let transportCount = 0;
        if (studentIds.length > 0) {
          const { data: transData, error: transErr } = await supabase
            .from("transport_assignments")
            .select("student_id")
            .eq("school_id", schoolId)
            .eq("status", "active")
            .in("student_id", studentIds);

          if (!transErr && transData) {
            const transSet = new Set(transData.map((t) => t.student_id));
            transportCount = transSet.size;
          }
        }

        return { enrolledCount, transportCount, studentIds };
      }
    } catch (e: any) {
      console.warn("getStructureStudentCounts Supabase note:", e.message);
    }
  }

  // Fallback to local storage cache
  try {
    const rawEnr = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);
    const filtered = (rawEnr || []).filter((e: any) => {
      if (academicYearId && e.academic_year_id && e.academic_year_id !== academicYearId) return false;
      if (e.status && e.status !== "active" && e.status !== "enrolled") return false;
      if (targetClassIds.length > 0 && !targetClassIds.includes(e.class_id)) return false;
      if (targetSectionIds.length > 0 && !targetSectionIds.includes(e.section_id)) return false;
      return true;
    });

    const studentIds = Array.from(new Set(filtered.map((e: any) => e.student_id).filter(Boolean))) as string[];
    const enrolledCount = studentIds.length;

    const rawTrans = lsGet<any>(`myzkool_transport_assignments_${schoolId}`);
    const activeTrans = (rawTrans || []).filter(
      (t: any) => t.status === "active" && studentIds.includes(t.student_id)
    );
    const transportCount = new Set(activeTrans.map((t: any) => t.student_id)).size;

    return { enrolledCount, transportCount, studentIds };
  } catch {
    return { enrolledCount: 0, transportCount: 0, studentIds: [] };
  }
}


export async function createFeeStructure(
  schoolId: string,
  input: FeeStructureInput
): Promise<{ structure?: FeeStructure; error?: string }> {
  const structure: FeeStructure = {
    id: uuid(),
    school_id: schoolId,
    academic_year_id: input.academic_year_id,
    class_id: input.class_id ?? (input.class_ids && input.class_ids.length === 1 ? input.class_ids[0] : null),
    name: input.name.trim(),
    applies_to: input.applies_to ?? (input.target_type === "specific_students" ? "new_admission" : "all"),
    target_type: input.target_type ?? "specific_classes",
    class_ids: input.class_ids ?? (input.class_id ? [input.class_id] : []),
    section_ids: input.section_ids ?? [],
    student_ids: input.student_ids ?? [],
    description: input.description ?? "",
    version: input.version ?? 1,
    status: input.status ?? "draft",
    metadata: input.metadata ?? {},
    created_at: now(),
    updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_structures").insert(structure).select().single();
      if (error) {
        // Retry with legacy columns if remote DB schema does not have the new columns yet
        const { target_type, class_ids, section_ids, student_ids, description, ...legacy } = structure;
        const { data: retryData, error: retryErr } = await supabase.from("fee_structures").insert(legacy).select().single();
        if (retryErr) throw retryErr;
        const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
        lsSet(FEE_STRUCTURES_KEY(schoolId), [...all.filter(s => s.id !== structure.id), structure]);
        return { structure };
      }
      const created = data as FeeStructure;
      const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
      lsSet(FEE_STRUCTURES_KEY(schoolId), [...all.filter(s => s.id !== created.id), created]);
      return { structure: created };
    } catch (e: any) {
      console.warn("createFeeStructure Supabase note:", e.message);
    }
  }

  const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  lsSet(FEE_STRUCTURES_KEY(schoolId), [...all.filter(s => s.id !== structure.id), structure]);
  return { structure };
}

/**
 * Automatically assigns an active fee structure to all eligible students
 * based on target classes, sections, and academic year.
 * Applies base fees to all eligible students, and applies transport fees
 * strictly to students with active transport assignments.
 */
export async function assignFeeStructureToEligibleStudents(
  schoolId: string,
  structureId: string,
  actorId?: string
): Promise<{
  success: boolean;
  assignedStudentsCount: number;
  createdDuesCount: number;
  transportRidersCount: number;
  error?: string;
}> {
  if (!schoolId || !structureId) {
    return {
      success: false,
      assignedStudentsCount: 0,
      createdDuesCount: 0,
      transportRidersCount: 0,
      error: "School ID and Structure ID are required",
    };
  }

  // 1. If Supabase is configured, use the atomic RPC function
  if (isSupabaseConfigured) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc(
        "assign_fee_structure_to_eligible_students",
        {
          p_school_id: schoolId,
          p_structure_id: structureId,
          p_actor_id: actorId || null,
        }
      );

      if (!rpcErr && rpcRes && rpcRes.success) {
        // Sync local storage caches for offline resilience
        try {
          const { data: remoteAssigns } = await supabase
            .from("student_fee_assignments")
            .select("*")
            .eq("school_id", schoolId)
            .eq("structure_id", structureId);

          if (remoteAssigns) {
            const localAssigns = lsGet<StudentFeeAssignment>(`myzkool_student_fee_assignments_${schoolId}`);
            const otherAssigns = localAssigns.filter((a) => a.structure_id !== structureId);
            lsSet(`myzkool_student_fee_assignments_${schoolId}`, [...otherAssigns, ...remoteAssigns]);
          }

          const { data: remoteDues } = await supabase
            .from("student_dues")
            .select("*")
            .eq("school_id", schoolId);

          if (remoteDues) {
            lsSet(`myzkool_student_dues_${schoolId}`, remoteDues);
          }
        } catch {
          // Ignore cache sync error
        }

        return {
          success: true,
          assignedStudentsCount: rpcRes.assigned_students_count || 0,
          createdDuesCount: rpcRes.created_dues_count || 0,
          transportRidersCount: rpcRes.transport_riders_count || 0,
        };
      } else if (rpcErr) {
        console.warn("assign_fee_structure_to_eligible_students RPC notice, running client fallback:", rpcErr.message);
      }
    } catch (e: any) {
      console.warn("assignFeeStructureToEligibleStudents Supabase RPC error:", e.message);
    }
  }

  // 2. Client-side / Offline fallback
  try {
    let structure: FeeStructure | null = null;
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from("fee_structures")
        .select("*")
        .eq("id", structureId)
        .eq("school_id", schoolId)
        .maybeSingle();
      structure = data as FeeStructure | null;
    }
    if (!structure) {
      const allStructures = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
      structure = allStructures.find((s) => s.id === structureId) || null;
    }

    if (!structure) {
      return { success: false, assignedStudentsCount: 0, createdDuesCount: 0, transportRidersCount: 0, error: "Structure not found" };
    }

    const yearId = structure.academic_year_id;
    const targetClassIds =
      structure.class_ids && structure.class_ids.length > 0
        ? structure.class_ids
        : structure.class_id
        ? [structure.class_id]
        : [];
    const targetSectionIds = structure.section_ids || [];

    // Resolve eligible student enrollments
    let eligibleStudents: Array<{ id: string; is_rte: boolean; class_id?: string; section_id?: string }> = [];

    if (isSupabaseConfigured) {
      let q = supabase
        .from("student_enrollments")
        .select("student_id, class_id, section_id, is_rte:students(is_rte)")
        .eq("school_id", schoolId)
        .eq("status", "active");

      if (yearId) q = q.eq("academic_year_id", yearId);

      if (structure.target_type === "specific_classes" && targetClassIds.length > 0) {
        q = q.in("class_id", targetClassIds);
      } else if (structure.target_type === "specific_sections" && targetSectionIds.length > 0) {
        q = q.in("section_id", targetSectionIds);
      } else if (structure.target_type === "specific_students" && structure.student_ids && structure.student_ids.length > 0) {
        q = q.in("student_id", structure.student_ids);
      } else if (targetClassIds.length > 0) {
        q = q.in("class_id", targetClassIds);
      }

      const { data: enrRows } = await q;
      if (enrRows) {
        eligibleStudents = enrRows.map((e: any) => ({
          id: e.student_id,
          class_id: e.class_id,
          section_id: e.section_id,
          is_rte: !!e.is_rte?.is_rte,
        }));
      }
    }

    if (eligibleStudents.length === 0) {
      const localEnrollments = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);
      eligibleStudents = localEnrollments
        .filter((e: any) => {
          if (e.school_id && e.school_id !== schoolId) return false;
          if (yearId && e.academic_year_id !== yearId) return false;
          if (e.status && e.status !== "active") return false;
          if (structure?.target_type === "specific_classes" && targetClassIds.length > 0) {
            return targetClassIds.includes(e.class_id);
          }
          if (structure?.target_type === "specific_sections" && targetSectionIds.length > 0) {
            return targetSectionIds.includes(e.section_id);
          }
          if (targetClassIds.length > 0) {
            return targetClassIds.includes(e.class_id);
          }
          return true;
        })
        .map((e: any) => ({
          id: e.student_id,
          class_id: e.class_id,
          section_id: e.section_id,
          is_rte: !!e.is_rte,
        }));
    }

    if (eligibleStudents.length === 0) {
      return { success: true, assignedStudentsCount: 0, createdDuesCount: 0, transportRidersCount: 0 };
    }

    const studentIds = Array.from(new Set(eligibleStudents.map((s) => s.id)));

    // Fetch transport assignments
    const activeTransportMap = new Map<string, { id: string; monthly_fee_paise: number; effective_from: string; effective_to?: string | null }>();
    if (isSupabaseConfigured) {
      const { data: transRows } = await supabase
        .from("transport_assignments")
        .select("id, student_id, monthly_fee_paise, status, effective_from, effective_to")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .in("student_id", studentIds);

      if (transRows) {
        transRows.forEach((tr: any) => {
          if (tr.monthly_fee_paise > 0) {
            activeTransportMap.set(tr.student_id, {
              id: tr.id,
              monthly_fee_paise: Number(tr.monthly_fee_paise),
              effective_from: tr.effective_from,
              effective_to: tr.effective_to,
            });
          }
        });
      }
    } else {
      const localTrans = lsGet<any>(`myzkool_transport_assignments_${schoolId}`);
      localTrans
        .filter((tr: any) => tr.status === "active" && studentIds.includes(tr.student_id) && tr.monthly_fee_paise > 0)
        .forEach((tr: any) => {
          activeTransportMap.set(tr.student_id, {
            id: tr.id,
            monthly_fee_paise: Number(tr.monthly_fee_paise),
            effective_from: tr.effective_from,
            effective_to: tr.effective_to,
          });
        });
    }

    // Fetch fee heads to check RTE waivability and find transport fee head
    const { heads: allHeads } = await getFeeHeads(schoolId, true);
    const transportHead = allHeads.find(
      (h) => h.code === "transport_fee" || (h.kind === "recurring" && /transport/i.test(h.name))
    );

    // Fetch terms for this academic year
    const { terms: allTerms } = await getFeeTerms(schoolId, yearId);
    const sortedTerms = [...allTerms].sort((a, b) => a.sort_order - b.sort_order);

    // Fetch structure items
    const { items: structItems, terms: structItemTerms } = await getStructureGrid(schoolId, structureId);

    // Track counts
    let assignedStudentsCount = 0;
    let createdDuesCount = 0;
    let transportRidersCount = 0;

    // Existing assignments
    let existingAssigns: StudentFeeAssignment[] = [];
    if (isSupabaseConfigured) {
      const { data: dbAssigns } = await supabase
        .from("student_fee_assignments")
        .select("*")
        .eq("school_id", schoolId)
        .eq("academic_year_id", yearId);
      existingAssigns = (dbAssigns || []) as StudentFeeAssignment[];
    } else {
      existingAssigns = lsGet<StudentFeeAssignment>(`myzkool_student_fee_assignments_${schoolId}`);
    }

    // Existing dues
    let existingDues: StudentDue[] = [];
    if (isSupabaseConfigured) {
      const { data: dbDues } = await supabase
        .from("student_dues")
        .select("*")
        .eq("school_id", schoolId)
        .eq("academic_year_id", yearId);
      existingDues = (dbDues || []) as StudentDue[];
    } else {
      existingDues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
    }

    const newAssignmentsToInsert: StudentFeeAssignment[] = [];
    const newDuesToInsert: StudentDue[] = [];

    for (const student of eligibleStudents) {
      // 1. Assignment
      let assignment = existingAssigns.find(
        (a) => a.student_id === student.id && a.academic_year_id === yearId && a.structure_id === structureId && a.status === "active"
      );

      if (!assignment) {
        // Mark any old active assignments for different structure as replaced
        const oldAssigns = existingAssigns.filter(
          (a) => a.student_id === student.id && a.academic_year_id === yearId && a.structure_id !== structureId && a.status === "active"
        );
        for (const oldA of oldAssigns) {
          oldA.status = "replaced";
          if (isSupabaseConfigured) {
            await supabase.from("student_fee_assignments").update({ status: "replaced", updated_at: now() }).eq("id", oldA.id);
          }
        }

        assignment = {
          id: uuid(),
          school_id: schoolId,
          student_id: student.id,
          academic_year_id: yearId,
          structure_id: structureId,
          structure_version: structure.version || 1,
          assigned_at: now(),
          assigned_by: actorId ?? null,
          status: "active",
        };
        newAssignmentsToInsert.push(assignment);
        assignedStudentsCount++;
      }

      // 2. Base Dues
      for (const item of structItems) {
        if (transportHead && item.fee_head_id === transportHead.id) continue;
        const head = allHeads.find((h) => h.id === item.fee_head_id);
        const itemTerms = structItemTerms.filter((it) => it.item_id === item.id);

        if (itemTerms.length > 0) {
          for (const it of itemTerms) {
            const term = sortedTerms.find((t) => t.id === it.term_id);
            if (!term || it.amount_paise <= 0) continue;

            const existingDue = existingDues.find(
              (d) =>
                d.student_id === student.id &&
                d.academic_year_id === yearId &&
                d.fee_head_id === item.fee_head_id &&
                d.term_id === it.term_id &&
                d.source === "structure"
            );

            if (!existingDue) {
              const concessionPaise = student.is_rte && head?.rte_waivable ? it.amount_paise : 0;
              const netPaise = it.amount_paise - concessionPaise;
              const dueRow: StudentDue = {
                id: uuid(),
                school_id: schoolId,
                student_id: student.id,
                academic_year_id: yearId,
                fee_head_id: item.fee_head_id,
                term_id: it.term_id,
                source: "structure",
                source_ref: assignment.id,
                description: null,
                gross_paise: it.amount_paise,
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
              newDuesToInsert.push(dueRow);
              createdDuesCount++;
            }
          }
        } else {
          // Derive terms from frequency
          const itemAmount = item.amount_paise;
          if (itemAmount <= 0) continue;

          for (const term of sortedTerms) {
            const order = term.sort_order;
            const matchesFrequency =
              item.frequency === "monthly" ||
              (item.frequency === "quarterly" && order % 3 === 0 && order < 12) ||
              (item.frequency === "half_yearly" && (order === 0 || order === 6)) ||
              ((item.frequency === "yearly" || item.frequency === "one_time") && order === 0);

            if (matchesFrequency) {
              const existingDue = existingDues.find(
                (d) =>
                  d.student_id === student.id &&
                  d.academic_year_id === yearId &&
                  d.fee_head_id === item.fee_head_id &&
                  d.term_id === term.id &&
                  d.source === "structure"
              );

              if (!existingDue) {
                const concessionPaise = student.is_rte && head?.rte_waivable ? itemAmount : 0;
                const netPaise = itemAmount - concessionPaise;
                const dueRow: StudentDue = {
                  id: uuid(),
                  school_id: schoolId,
                  student_id: student.id,
                  academic_year_id: yearId,
                  fee_head_id: item.fee_head_id,
                  term_id: term.id,
                  source: "structure",
                  source_ref: assignment.id,
                  description: null,
                  gross_paise: itemAmount,
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
                newDuesToInsert.push(dueRow);
                createdDuesCount++;
              }
            }
          }
        }
      }

      // 3. Transport Dues: ONLY FOR ACTIVE TRANSPORT RIDERS
      const transInfo = activeTransportMap.get(student.id);
      if (transInfo && transportHead) {
        transportRidersCount++;
        const effDate = new Date(transInfo.effective_from);
        const effYear = effDate.getFullYear();
        const startMonth = effDate.getMonth() + 1;
        const startYear = effYear;

        let endYear: number | null = null;
        let endMonth: number | null = null;
        if (transInfo.effective_to) {
          const toDate = new Date(transInfo.effective_to);
          endYear = toDate.getFullYear();
          endMonth = toDate.getMonth() + 1;
        }

        for (let tIdx = 0; tIdx < sortedTerms.length; tIdx++) {
          const term = sortedTerms[tIdx];
          const existingTransDue = existingDues.find(
            (d) =>
              d.student_id === student.id &&
              d.academic_year_id === yearId &&
              d.term_id === term.id &&
              d.source === "transport" &&
              d.status !== "cancelled"
          );

          if (!existingTransDue) {
            const termBillingMonths = getTermBillingMonths(
              term,
              effYear,
              [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
              sortedTerms.length,
              tIdx
            );

            const activeMonths = termBillingMonths.filter((bm) => {
              const afterStart = bm.year > startYear || (bm.year === startYear && bm.month >= startMonth);
              const beforeEnd = !endYear || bm.year < endYear || (bm.year === endYear && bm.month <= endMonth!);
              return afterStart && beforeEnd;
            });

            if (activeMonths.length === 0) continue;

            const grossPaise = transInfo.monthly_fee_paise * activeMonths.length;

            const transDueRow: StudentDue = {
              id: uuid(),
              school_id: schoolId,
              student_id: student.id,
              academic_year_id: yearId,
              fee_head_id: transportHead.id,
              term_id: term.id,
              source: "transport",
              source_ref: transInfo.id,
              description: `Transport Fee - ${term.name}`,
              gross_paise: grossPaise,
              concession_paise: 0,
              net_paise: grossPaise,
              paid_paise: 0,
              balance_paise: grossPaise,
              due_date: term.due_date,
              status: "pending",
              created_at: now(),
              updated_at: now(),
              created_by: actorId ?? null,
            };
            newDuesToInsert.push(transDueRow);
            createdDuesCount++;
          }
        }
      }
    }

    // Insert new assignments into Supabase / local
    if (newAssignmentsToInsert.length > 0) {
      if (isSupabaseConfigured) {
        try {
          await supabase.from("student_fee_assignments").insert(newAssignmentsToInsert);
        } catch (e: any) {
          console.warn("Insert student_fee_assignments error:", e.message);
        }
      }
      const currentAssigns = lsGet<StudentFeeAssignment>(`myzkool_student_fee_assignments_${schoolId}`);
      lsSet(`myzkool_student_fee_assignments_${schoolId}`, [...currentAssigns, ...newAssignmentsToInsert]);
    }

    // Insert new dues and corresponding atomic fee_ledger entries into Supabase / local
    if (newDuesToInsert.length > 0) {
      const newLedgerEntries: any[] = [];
      for (const due of newDuesToInsert) {
        if (due.concession_paise > 0) {
          newLedgerEntries.push({
            id: uuid(),
            school_id: schoolId,
            student_id: due.student_id,
            academic_year_id: due.academic_year_id,
            due_id: due.id,
            receipt_id: null,
            entry_type: "due_created",
            amount_paise: due.gross_paise,
            note: due.description || `Due created: ${due.source}`,
            created_by: actorId ?? null,
            created_at: now(),
          });
          newLedgerEntries.push({
            id: uuid(),
            school_id: schoolId,
            student_id: due.student_id,
            academic_year_id: due.academic_year_id,
            due_id: due.id,
            receipt_id: null,
            entry_type: "concession",
            amount_paise: -due.concession_paise,
            note: `Concession applied: ${due.description || due.source}`,
            created_by: actorId ?? null,
            created_at: now(),
          });
        } else if (due.net_paise > 0) {
          newLedgerEntries.push({
            id: uuid(),
            school_id: schoolId,
            student_id: due.student_id,
            academic_year_id: due.academic_year_id,
            due_id: due.id,
            receipt_id: null,
            entry_type: "due_created",
            amount_paise: due.net_paise,
            note: due.description || `Due created: ${due.source}`,
            created_by: actorId ?? null,
            created_at: now(),
          });
        }
      }

      if (isSupabaseConfigured) {
        try {
          await supabase.from("student_dues").insert(newDuesToInsert);
          if (newLedgerEntries.length > 0) {
            await supabase.from("fee_ledger").insert(newLedgerEntries);
          }
        } catch (e: any) {
          console.warn("Insert student_dues/fee_ledger error:", e.message);
        }
      }
      const currentDues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
      lsSet(`myzkool_student_dues_${schoolId}`, [...currentDues, ...newDuesToInsert]);

      if (newLedgerEntries.length > 0) {
        const currentLedger = lsGet<any>(`myzkool_fee_ledger_${schoolId}`);
        lsSet(`myzkool_fee_ledger_${schoolId}`, [...currentLedger, ...newLedgerEntries]);
      }
    }

    return {
      success: true,
      assignedStudentsCount,
      createdDuesCount,
      transportRidersCount,
    };
  } catch (err: any) {
    console.error("assignFeeStructureToEligibleStudents fallback error:", err);
    return {
      success: false,
      assignedStudentsCount: 0,
      createdDuesCount: 0,
      transportRidersCount: 0,
      error: err.message || "Failed to assign fee structure to students",
    };
  }
}

export async function checkStructureOverlaps(
  schoolId: string,
  yearId: string,
  targetType: StructureTargetType,
  targetIds: string[],
  excludeStructureId?: string
): Promise<{ hasConflict: boolean; conflicts: Array<{ structureName: string; targetId: string; targetName?: string }> }> {
  const { structures } = await getFeeStructures(schoolId, yearId);
  const activeStructures = structures.filter(s => s.status === "active" && s.id !== excludeStructureId);

  const conflicts: Array<{ structureName: string; targetId: string; targetName?: string }> = [];

  for (const s of activeStructures) {
    if (targetType === "all_classes") {
      if (s.target_type === "all_classes") {
        conflicts.push({
          structureName: s.name,
          targetId: s.id,
          targetName: "All Classes (Universal Active Structure)",
        });
      }
    } else if (targetType === "specific_classes") {
      const sClassIds = s.class_ids || (s.class_id ? [s.class_id] : []);
      for (const cid of targetIds) {
        if (sClassIds.includes(cid)) {
          conflicts.push({
            structureName: s.name,
            targetId: cid,
          });
        }
      }
    } else if (targetType === "specific_sections") {
      const sSectionIds = s.section_ids || [];
      for (const sid of targetIds) {
        if (sSectionIds.includes(sid)) {
          conflicts.push({
            structureName: s.name,
            targetId: sid,
          });
        }
      }
    } else if (targetType === "specific_students") {
      const sStudentIds = s.student_ids || [];
      for (const stid of targetIds) {
        if (sStudentIds.includes(stid)) {
          conflicts.push({
            structureName: s.name,
            targetId: stid,
            targetName: "Student already has an active specific override",
          });
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

export async function saveCompleteFeeStructure(
  schoolId: string,
  input: {
    id?: string;
    name?: string;
    academic_year_id?: string;
    status?: StructureStatus;
    target_type?: StructureTargetType;
    class_id?: string | null;
    class_ids?: string[];
    section_ids?: string[];
    student_ids?: string[];
    description?: string;
    items?: FeeStructureConfigItem[];
    metadata?: Record<string, any>;
  }
): Promise<{ structure?: FeeStructure; error?: string }> {
  // If id is provided, fetch existing to allow partial updates (like status toggles or editing)
  let existing: FeeStructure | null = null;
  if (input.id) {
    const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
    existing = all.find(s => s.id === input.id) || null;
  }

  const effectiveYearId = input.academic_year_id || existing?.academic_year_id;
  const effectiveName = (input.name !== undefined ? input.name : existing?.name || "").trim();

  if (!schoolId || !effectiveYearId || !effectiveName) {
    return { error: "Name, academic year and school are required" };
  }

  const structureId = input.id || uuid();
  const primaryClassId = input.class_id !== undefined ? input.class_id : existing?.class_id ?? (input.class_ids && input.class_ids.length > 0 ? input.class_ids[0] : (existing?.class_ids && existing.class_ids.length > 0 ? existing.class_ids[0] : null));
  const resolvedClassIds = input.class_ids !== undefined ? input.class_ids : (existing?.class_ids && existing.class_ids.length > 0 ? existing.class_ids : primaryClassId ? [primaryClassId] : []);
  const resolvedSectionIds = input.section_ids !== undefined ? input.section_ids : (existing?.section_ids ?? []);
  const resolvedTargetType = input.target_type || existing?.target_type || (resolvedSectionIds.length > 0 ? "specific_sections" : resolvedClassIds.length > 0 ? "specific_classes" : "all_classes");

  const structure: FeeStructure = {
    id: structureId,
    school_id: schoolId,
    academic_year_id: effectiveYearId,
    name: effectiveName,
    status: input.status || (existing?.status ?? "draft"),
    target_type: resolvedTargetType,
    class_id: primaryClassId,
    class_ids: resolvedClassIds,
    section_ids: resolvedSectionIds,
    student_ids: input.student_ids ?? (existing?.student_ids ?? []),
    description: input.description ?? (existing?.description ?? ""),
    applies_to: (input.target_type || existing?.target_type) === "specific_students" ? "new_admission" : "all",
    version: existing ? existing.version : 1,
    metadata: input.metadata ? { ...(existing?.metadata || {}), ...input.metadata } : (existing?.metadata ?? {}),
    created_at: existing ? existing.created_at : now(),
    updated_at: now(),
  };

  // Upsert structure
  if (isSupabaseConfigured) {
    try {
      const { error: upErr } = await supabase.from("fee_structures").upsert(structure);
      if (upErr) {
        console.warn("saveCompleteFeeStructure upsert failed, attempting update by ID:", upErr.message);
        // Attempt explicit update if ID exists
        const { error: updateErr } = await supabase
          .from("fee_structures")
          .update(structure)
          .eq("id", structureId)
          .eq("school_id", schoolId);

        if (updateErr) {
          const { target_type, class_ids, section_ids, student_ids, description, ...legacy } = structure;
          await supabase.from("fee_structures").upsert(legacy);
        }
      }
    } catch (e: any) {
      console.warn("saveCompleteFeeStructure Supabase note:", e.message);
    }
  }
  const allStructures = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  lsSet(FEE_STRUCTURES_KEY(schoolId), [...allStructures.filter(s => s.id !== structureId), structure]);

  // Handle items & term mappings if provided
  if (input.items && Array.isArray(input.items)) {
    const existingItems = lsGet<FeeStructureItem>(FEE_STRUCTURE_ITEMS_KEY(schoolId)).filter(i => i.structure_id === structureId);
    const existingItemIds = new Set(existingItems.map(i => i.id));

    // Save new items
    const savedItems: FeeStructureItem[] = [];
    const savedItemTerms: FeeStructureItemTerm[] = [];

    for (const itemInput of input.items) {
      const existingItem = existingItems.find(i => i.fee_head_id === itemInput.fee_head_id);
      const itemId = existingItem ? existingItem.id : uuid();

      const itemRow: FeeStructureItem = {
        id: itemId,
        school_id: schoolId,
        structure_id: structureId,
        fee_head_id: itemInput.fee_head_id,
        pattern: "custom",
        frequency: itemInput.frequency,
        is_mandatory: itemInput.is_mandatory ?? true,
        proration_rule: itemInput.proration_rule ?? "full",
        start_date: itemInput.start_date || null,
        end_date: itemInput.end_date || null,
        amount_paise: Math.round(itemInput.base_amount_rupees * 100),
      };
      savedItems.push(itemRow);

      if (isSupabaseConfigured) {
        try {
          const { error: itemErr } = await supabase.from("fee_structure_items").upsert(itemRow);
          if (itemErr) {
            const { frequency, is_mandatory, proration_rule, start_date, end_date, amount_paise, ...legacyItem } = itemRow;
            await supabase.from("fee_structure_items").upsert(legacyItem);
          }
        } catch (e: any) {
          console.warn("upsert fee_structure_item error:", e.message);
        }
      }

      // Term amounts
      for (const [termId, amountRupees] of Object.entries(itemInput.term_amounts || {})) {
        const termAmountRow: FeeStructureItemTerm = {
          item_id: itemId,
          term_id: termId,
          amount_paise: Math.round(Number(amountRupees || 0) * 100),
        };
        savedItemTerms.push(termAmountRow);

        if (isSupabaseConfigured) {
          try {
            await supabase.from("fee_structure_item_terms").upsert(termAmountRow, {
              onConflict: "item_id,term_id",
            });
          } catch (e: any) {
            console.warn("upsert fee_structure_item_terms error:", e.message);
          }
        }
      }
    }

    // Update local caches
    const allCachedItems = lsGet<FeeStructureItem>(FEE_STRUCTURE_ITEMS_KEY(schoolId));
    const otherItems = allCachedItems.filter(i => i.structure_id !== structureId);
    lsSet(FEE_STRUCTURE_ITEMS_KEY(schoolId), [...otherItems, ...savedItems]);

    const newItemIds = new Set(savedItems.map(i => i.id));
    const allCachedItemTerms = lsGet<FeeStructureItemTerm>(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId));
    const otherItemTerms = allCachedItemTerms.filter(t => !existingItemIds.has(t.item_id) && !newItemIds.has(t.item_id));
    lsSet(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId), [...otherItemTerms, ...savedItemTerms]);
  }

  // Sync junction tables in Supabase if specific classes or sections are targeted
  if (isSupabaseConfigured) {
    try {
      // 1. fee_structure_classes
      await supabase.from("fee_structure_classes").delete().eq("school_id", schoolId).eq("fee_structure_id", structureId);
      const classIdsToInsert = structure.class_ids || (structure.class_id ? [structure.class_id] : []);
      if (classIdsToInsert.length > 0) {
        const classRows = classIdsToInsert.map(cid => ({
          school_id: schoolId,
          fee_structure_id: structureId,
          class_id: cid,
        }));
        await supabase.from("fee_structure_classes").insert(classRows);
      }

      // 2. fee_structure_sections
      await supabase.from("fee_structure_sections").delete().eq("school_id", schoolId).eq("fee_structure_id", structureId);
      if (structure.section_ids && structure.section_ids.length > 0) {
        const secRows = structure.section_ids.map(sid => ({
          school_id: schoolId,
          fee_structure_id: structureId,
          section_id: sid,
        }));
        await supabase.from("fee_structure_sections").insert(secRows);
      }
    } catch (e: any) {
      console.warn("fee_structure junctions sync note:", e.message);
    }
  }

  // Automatic student fee assignment if structure is marked Active
  if (structure.status === "active") {
    try {
      await assignFeeStructureToEligibleStudents(schoolId, structureId);
    } catch (e: any) {
      console.warn("Auto-assignment on saveCompleteFeeStructure error:", e.message);
    }
  }

  return { structure };
}

export async function deleteFeeStructure(
  schoolId: string,
  structureId: string
): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !structureId) {
    return { success: false, error: "School ID and Structure ID are required" };
  }

  // 1. Financial integrity check: Cannot delete if active student dues or assignments exist
  if (isSupabaseConfigured) {
    try {
      // Check RPC function first
      const { data: checkRes, error: rpcErr } = await supabase.rpc("check_fee_structure_can_delete", {
        p_school_id: schoolId,
        p_structure_id: structureId,
      });

      if (!rpcErr && checkRes && checkRes.can_delete === false) {
        return { success: false, error: checkRes.reason };
      }

      // Direct fallback count checks
      const { count: assignCount } = await supabase
        .from("student_fee_assignments")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("structure_id", structureId)
        .eq("status", "active");

      if (assignCount && assignCount > 0) {
        return {
          success: false,
          error: `Cannot delete fee structure: ${assignCount} student(s) currently have active fee assignments to this structure. Archive the structure instead to preserve financial audit history.`,
        };
      }

      // Safe deletion in Supabase (cascades or delete explicitly)
      await supabase.from("fee_structure_sections").delete().eq("school_id", schoolId).eq("fee_structure_id", structureId);
      await supabase.from("fee_structure_classes").delete().eq("school_id", schoolId).eq("fee_structure_id", structureId);
      
      const { data: itemRows } = await supabase.from("fee_structure_items").select("id").eq("structure_id", structureId);
      if (itemRows && itemRows.length > 0) {
        const itemIds = itemRows.map(i => i.id);
        await supabase.from("fee_structure_item_terms").delete().in("item_id", itemIds);
      }
      await supabase.from("fee_structure_items").delete().eq("structure_id", structureId);
      
      const { error: delErr } = await supabase.from("fee_structures").delete().eq("id", structureId).eq("school_id", schoolId);
      if (delErr) throw delErr;
    } catch (e: any) {
      console.warn("deleteFeeStructure Supabase error:", e.message);
      // If error mentions foreign key or constraint, return friendly error
      if (e.message?.includes("foreign key") || e.message?.includes("violates foreign key")) {
        return {
          success: false,
          error: "Cannot delete fee structure because existing financial records or invoices depend on it. Please archive the structure instead.",
        };
      }
    }
  }

  // Check local dues / assignments cache
  const localAssignments = lsGet<StudentFeeAssignment>(`myzkool_student_fee_assignments_${schoolId}`);
  const activeLocalAssigns = localAssignments.filter(a => a.structure_id === structureId && a.status === "active");
  if (activeLocalAssigns.length > 0) {
    return {
      success: false,
      error: `Cannot delete fee structure: ${activeLocalAssigns.length} student(s) have active assignments in local records. Please archive the structure instead.`,
    };
  }

  // Remove from localStorage caches
  const allStructures = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  lsSet(FEE_STRUCTURES_KEY(schoolId), allStructures.filter(s => s.id !== structureId));

  const allItems = lsGet<FeeStructureItem>(FEE_STRUCTURE_ITEMS_KEY(schoolId));
  const removedItemIds = new Set(allItems.filter(i => i.structure_id === structureId).map(i => i.id));
  lsSet(FEE_STRUCTURE_ITEMS_KEY(schoolId), allItems.filter(i => i.structure_id !== structureId));

  const allTerms = lsGet<FeeStructureItemTerm>(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId));
  lsSet(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId), allTerms.filter(t => !removedItemIds.has(t.item_id)));

  return { success: true };
}

export async function getStructureConfigItems(
  schoolId: string,
  structureId: string
): Promise<{ items: FeeStructureConfigItem[]; error?: string }> {
  const { items: rawItems, terms: rawTerms } = await getStructureGrid(schoolId, structureId);
  const configItems: FeeStructureConfigItem[] = rawItems.map(item => {
    const itemTerms = rawTerms.filter(t => t.item_id === item.id);
    const term_amounts: Record<string, number> = {};
    for (const it of itemTerms) {
      term_amounts[it.term_id] = it.amount_paise / 100;
    }
    const baseRupees = item.amount_paise !== undefined && item.amount_paise !== null
      ? item.amount_paise / 100
      : (itemTerms.length > 0 ? (itemTerms[0].amount_paise / 100) : 0);

    return {
      fee_head_id: item.fee_head_id,
      frequency: item.frequency || "quarterly",
      base_amount_rupees: baseRupees,
      is_mandatory: item.is_mandatory ?? true,
      proration_rule: item.proration_rule || "full",
      start_date: item.start_date || null,
      end_date: item.end_date || null,
      term_amounts,
    };
  });

  return { items: configItems };
}

export async function duplicateFeeStructure(
  schoolId: string,
  structureId: string,
  newName?: string
): Promise<{ structure?: FeeStructure; error?: string }> {
  const { structures } = await getFeeStructures(schoolId);
  const src = structures.find(s => s.id === structureId);
  if (!src) return { error: "Source structure not found" };

  const { items, terms } = await getStructureGrid(schoolId, structureId);

  const newStructureId = uuid();
  const clonedStructure: FeeStructure = {
    ...src,
    id: newStructureId,
    name: newName || `${src.name} (Copy)`,
    status: "draft",
    version: 1,
    created_at: now(),
    updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error: insErr } = await supabase.from("fee_structures").insert(clonedStructure);
      if (insErr) {
        const { target_type, class_ids, section_ids, student_ids, description, ...legacy } = clonedStructure;
        await supabase.from("fee_structures").insert(legacy);
      }
    } catch (e: any) {
      console.warn("duplicateFeeStructure Supabase note:", e.message);
    }
  }
  const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  lsSet(FEE_STRUCTURES_KEY(schoolId), [...all, clonedStructure]);

  const allItems = lsGet<FeeStructureItem>(FEE_STRUCTURE_ITEMS_KEY(schoolId));
  const allTerms = lsGet<FeeStructureItemTerm>(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId));
  const newItems: FeeStructureItem[] = [];
  const newTerms: FeeStructureItemTerm[] = [];

  for (const item of items) {
    const newItemId = uuid();
    const clonedItem: FeeStructureItem = {
      ...item,
      id: newItemId,
      structure_id: newStructureId,
    };
    newItems.push(clonedItem);

    const relatedTerms = terms.filter(t => t.item_id === item.id);
    for (const t of relatedTerms) {
      newTerms.push({
        item_id: newItemId,
        term_id: t.term_id,
        amount_paise: t.amount_paise,
      });
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from("fee_structure_items").insert(clonedItem);
        if (relatedTerms.length > 0) {
          await supabase.from("fee_structure_item_terms").insert(
            relatedTerms.map(rt => ({
              item_id: newItemId,
              term_id: rt.term_id,
              amount_paise: rt.amount_paise,
            }))
          );
        }
      } catch (e: any) {
        console.warn("duplicate items Supabase note:", e.message);
      }
    }
  }

  lsSet(FEE_STRUCTURE_ITEMS_KEY(schoolId), [...allItems, ...newItems]);
  lsSet(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId), [...allTerms, ...newTerms]);

  return { structure: clonedStructure };
}

export async function deactivateFeeStructure(
  schoolId: string,
  structureId: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from("fee_structures").update({ status: "draft", updated_at: now() }).eq("id", structureId);
    } catch (e: any) {
      console.warn("deactivateFeeStructure Supabase note:", e.message);
    }
  }
  const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  lsSet(FEE_STRUCTURES_KEY(schoolId), all.map(s => s.id === structureId ? { ...s, status: "draft" as const, updated_at: now() } : s));
  return { success: true };
}

export async function archiveFeeStructure(
  schoolId: string,
  structureId: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from("fee_structures").update({ status: "archived", updated_at: now() }).eq("id", structureId);
    } catch (e: any) {
      console.warn("archiveFeeStructure Supabase note:", e.message);
    }
  }
  const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  lsSet(FEE_STRUCTURES_KEY(schoolId), all.map(s => s.id === structureId ? { ...s, status: "archived" as const, updated_at: now() } : s));
  return { success: true };
}

export async function assignStructureTargets(
  schoolId: string,
  structureId: string,
  targetType: StructureTargetType,
  targetIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const updateData: Partial<FeeStructure> = {
    target_type: targetType,
    updated_at: now(),
  };

  if (targetType === "all_classes") {
    updateData.class_ids = [];
    updateData.section_ids = [];
    updateData.student_ids = [];
    updateData.class_id = null;
  } else if (targetType === "specific_classes") {
    updateData.class_ids = targetIds;
    updateData.class_id = targetIds.length === 1 ? targetIds[0] : null;
    updateData.section_ids = [];
    updateData.student_ids = [];
  } else if (targetType === "specific_sections") {
    updateData.section_ids = targetIds;
    updateData.class_ids = [];
    updateData.student_ids = [];
    updateData.class_id = null;
  } else if (targetType === "specific_students") {
    updateData.student_ids = targetIds;
    updateData.class_ids = [];
    updateData.section_ids = [];
    updateData.class_id = null;
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("fee_structures").update(updateData).eq("id", structureId);
      if (error) {
        console.warn("assignStructureTargets Supabase update note:", error.message);
      }
    } catch (e: any) {
      console.warn("assignStructureTargets Supabase note:", e.message);
    }
  }

  const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  lsSet(FEE_STRUCTURES_KEY(schoolId), all.map(s => s.id === structureId ? { ...s, ...updateData } : s));

  return { success: true };
}

export async function updateStructureGrid(
  schoolId: string,
  update: StructureGridUpdate
): Promise<{ error?: string }> {
  const { structure_id, fee_head_id, terms, pattern } = update;

  if (isSupabaseConfigured) {
    try {
      // Upsert item
      let item: FeeStructureItem;
      const { data: existItem } = await supabase.from("fee_structure_items")
        .select("id").eq("structure_id", structure_id).eq("fee_head_id", fee_head_id).maybeSingle();
      if (existItem) {
        item = existItem as FeeStructureItem;
        await supabase.from("fee_structure_items").update({ pattern }).eq("id", item.id);
      } else {
        const ins = { id: uuid(), school_id: schoolId, structure_id, fee_head_id, pattern };
        const { data } = await supabase.from("fee_structure_items").insert(ins).select().single();
        item = data as FeeStructureItem;
      }
      // Upsert term amounts
      for (const t of terms) {
        await supabase.from("fee_structure_item_terms").upsert({
          item_id: item.id, term_id: t.term_id, amount_paise: t.amount_paise
        }, { onConflict: "item_id,term_id" });
      }
      return {};
    } catch (e: any) { return { error: e.message }; }
  }

  // localStorage path
  const items = lsGet<FeeStructureItem>(FEE_STRUCTURE_ITEMS_KEY(schoolId));
  let item = items.find(i => i.structure_id === structure_id && i.fee_head_id === fee_head_id);
  if (!item) {
    item = { id: uuid(), school_id: schoolId, structure_id, fee_head_id, pattern };
    lsSet(FEE_STRUCTURE_ITEMS_KEY(schoolId), [...items, item]);
  } else {
    item.pattern = pattern;
    lsSet(FEE_STRUCTURE_ITEMS_KEY(schoolId), items.map(i => i.id === item!.id ? item! : i));
  }
  const itemTerms = lsGet<FeeStructureItemTerm>(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId));
  const other = itemTerms.filter(it => !(it.item_id === item!.id && terms.some(t => t.term_id === it.term_id)));
  const newRows = terms.map(t => ({ item_id: item!.id, term_id: t.term_id, amount_paise: t.amount_paise }));
  lsSet(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId), [...other, ...newRows]);
  return {};
}

export async function getStructureGrid(
  schoolId: string,
  structureId: string
): Promise<{ items: FeeStructureItem[]; terms: FeeStructureItemTerm[] }> {
  if (isSupabaseConfigured) {
    try {
      const { data: items } = await supabase.from("fee_structure_items").select("*").eq("structure_id", structureId);
      const itemIds = (items || []).map((i: any) => i.id);
      let termRows: any[] = [];
      if (itemIds.length > 0) {
        const { data } = await supabase.from("fee_structure_item_terms").select("*").in("item_id", itemIds);
        termRows = data || [];
      }
      return { items: (items || []) as FeeStructureItem[], terms: termRows as FeeStructureItemTerm[] };
    } catch { return { items: [], terms: [] }; }
  }
  const items = lsGet<FeeStructureItem>(FEE_STRUCTURE_ITEMS_KEY(schoolId)).filter(i => i.structure_id === structureId);
  const itemIds = new Set(items.map(i => i.id));
  const terms = lsGet<FeeStructureItemTerm>(FEE_STRUCTURE_ITEM_TERMS_KEY(schoolId)).filter(t => itemIds.has(t.item_id));
  return { items, terms };
}

export async function activateStructure(
  schoolId: string,
  structureId: string,
  actorId?: string
): Promise<{ version?: number; error?: string; needs_approval?: boolean }> {
  const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  const s = all.find(x => x.id === structureId);
  if (!s) return { error: "Structure not found" };

  // Archive conflicting active structures for the same academic year and target
  const toArchive = all.filter(x => {
    if (x.id === structureId || x.academic_year_id !== s.academic_year_id || x.status !== "active") {
      return false;
    }
    // If both are universal all_classes
    if (s.target_type === "all_classes" && x.target_type === "all_classes") return true;

    // Check class overlaps
    if ((s.target_type === "specific_classes" || !s.target_type) && (x.target_type === "specific_classes" || !x.target_type)) {
      const sClasses = s.class_ids || (s.class_id ? [s.class_id] : []);
      const xClasses = x.class_ids || (x.class_id ? [x.class_id] : []);
      return sClasses.some(c => xClasses.includes(c));
    }

    // Check section overlaps
    if (s.target_type === "specific_sections" && x.target_type === "specific_sections") {
      const sSections = s.section_ids || [];
      const xSections = x.section_ids || [];
      return sSections.some(sec => xSections.includes(sec));
    }

    // Check student overrides
    if (s.target_type === "specific_students" && x.target_type === "specific_students") {
      const sStudents = s.student_ids || [];
      const xStudents = x.student_ids || [];
      return sStudents.some(stu => xStudents.includes(stu));
    }

    return false;
  });

  if (isSupabaseConfigured) {
    try {
      for (const a of toArchive) {
        await supabase.from("fee_structures").update({ status: "archived", updated_at: now() }).eq("id", a.id);
      }
      const newVersion = (s.version || 1) + (toArchive.length > 0 ? 1 : 0);
      const { error } = await supabase.from("fee_structures")
        .update({ status: "active", version: newVersion, updated_at: now() })
        .eq("id", structureId);
      if (error) throw error;
      // Auto-assign to eligible students
      try {
        await assignFeeStructureToEligibleStudents(schoolId, structureId, actorId);
      } catch (err: any) {
        console.warn("Auto-assignment on activateStructure error:", err.message);
      }
      return { version: newVersion };
    } catch (e: any) { return { error: e.message }; }
  }

  const updated = all.map(x => {
    if (toArchive.some(a => a.id === x.id)) return { ...x, status: "archived" as const, updated_at: now() };
    if (x.id === structureId) return { ...x, status: "active" as const, version: (x.version || 1) + 1, updated_at: now() };
    return x;
  });
  lsSet(FEE_STRUCTURES_KEY(schoolId), updated);
  try {
    await assignFeeStructureToEligibleStudents(schoolId, structureId, actorId);
  } catch (err: any) {
    console.warn("Auto-assignment on activateStructure error:", err.message);
  }
  return { version: (s.version || 1) + 1 };
}

export async function copyStructureToClasses(
  schoolId: string,
  sourceStructureId: string,
  targetClassIds: string[],
  pctAdjust = 0
): Promise<{ created: string[]; error?: string }> {
  const { items, terms } = await getStructureGrid(schoolId, sourceStructureId);
  const allStructures = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  const src = allStructures.find(s => s.id === sourceStructureId);
  if (!src) return { created: [], error: "Source structure not found" };

  const created: string[] = [];
  for (const classId of targetClassIds) {
    const { structure } = await createFeeStructure(schoolId, {
      class_id: classId,
      name: `${src.name} (copy)`,
      applies_to: src.applies_to,
      academic_year_id: src.academic_year_id,
    });
    if (!structure) continue;

    const multiplier = 1 + pctAdjust / 100;
    for (const item of items) {
      const itemTerms = terms.filter(t => t.item_id === item.id);
      await updateStructureGrid(schoolId, {
        structure_id: structure.id,
        fee_head_id: item.fee_head_id,
        pattern: item.pattern,
        terms: itemTerms.map(it => ({
          term_id: it.term_id,
          amount_paise: Math.round(it.amount_paise * multiplier),
        })),
      });
    }
    created.push(structure.id);
  }
  return { created };
}

export async function copyStructureFromLastYear(
  schoolId: string,
  classId: string,
  currentYearId: string,
  pctIncrease = 0
): Promise<{ structure?: FeeStructure; error?: string }> {
  const allStructures = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  const lastYearActive = allStructures.find(s =>
    s.class_id === classId && s.status === "active" && s.academic_year_id !== currentYearId
  );
  if (!lastYearActive) return { error: "No active structure found for this class in previous year" };

  const { created } = await copyStructureToClasses(schoolId, lastYearActive.id, [classId], pctIncrease);
  if (!created.length) return { error: "Copy failed" };
  const newStruct = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId)).find(s => s.id === created[0]);
  // Re-link to current year
  if (newStruct) {
    newStruct.academic_year_id = currentYearId;
    const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
    lsSet(FEE_STRUCTURES_KEY(schoolId), all.map(s => s.id === newStruct.id ? newStruct : s));
  }
  return { structure: newStruct };
}

// ─── Concession Rules ────────────────────────────────────────────────────────

export async function getConcessionRules(schoolId: string): Promise<{ rules: ConcessionRule[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("concession_rules").select("*").eq("school_id", schoolId);
      if (error) throw error;
      return { rules: (data || []) as ConcessionRule[] };
    } catch (e: any) { return { rules: [], error: e.message }; }
  }
  return { rules: lsGet<ConcessionRule>(CONCESSION_RULES_KEY(schoolId)) };
}

export async function createConcessionRule(
  schoolId: string,
  input: ConcessionRuleInput
): Promise<{ rule?: ConcessionRule; error?: string }> {
  const rule: ConcessionRule = {
    id: uuid(), school_id: schoolId,
    name: input.name, basis: input.basis, type: input.type, value: input.value,
    fee_head_ids: input.fee_head_ids ?? [],
    sibling_from_rank: input.sibling_from_rank ?? null,
    auto_apply: input.auto_apply ?? false,
    needs_approval: input.needs_approval ?? false,
    is_active: true,
    created_at: now(), updated_at: now(),
  };
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("concession_rules").insert(rule).select().single();
      if (error) throw error;
      return { rule: data as ConcessionRule };
    } catch (e: any) { return { error: e.message }; }
  }
  const all = lsGet<ConcessionRule>(CONCESSION_RULES_KEY(schoolId));
  lsSet(CONCESSION_RULES_KEY(schoolId), [...all, rule]);
  return { rule };
}

export async function updateConcessionRule(
  schoolId: string,
  id: string,
  input: Partial<ConcessionRuleInput>
): Promise<{ error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("concession_rules").update({ ...input, updated_at: now() }).eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return {};
    } catch (e: any) { return { error: e.message }; }
  }
  const all = lsGet<ConcessionRule>(CONCESSION_RULES_KEY(schoolId));
  lsSet(CONCESSION_RULES_KEY(schoolId), all.map(r => r.id === id ? { ...r, ...input, updated_at: now() } : r));
  return {};
}

// ─── Late Fee Rules ───────────────────────────────────────────────────────────

export async function getLateFeeRules(schoolId: string): Promise<{ rules: LateFeeRule[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("late_fee_rules").select("*").eq("school_id", schoolId);
      if (error) throw error;
      return { rules: (data || []) as LateFeeRule[] };
    } catch (e: any) { return { rules: [], error: e.message }; }
  }
  return { rules: lsGet<LateFeeRule>(LATE_FEE_RULES_KEY(schoolId)) };
}

export async function createLateFeeRule(
  schoolId: string,
  input: LateFeeRuleInput
): Promise<{ rule?: LateFeeRule; error?: string }> {
  const rule: LateFeeRule = {
    id: uuid(), school_id: schoolId,
    name: input.name,
    fee_head_ids: input.fee_head_ids ?? null,
    method: input.method, value: input.value,
    grace_days: input.grace_days ?? 0,
    max_cap_paise: input.max_cap_paise ?? null,
    is_active: true,
    created_at: now(), updated_at: now(),
  };
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("late_fee_rules").insert(rule).select().single();
      if (error) throw error;
      return { rule: data as LateFeeRule };
    } catch (e: any) { return { error: e.message }; }
  }
  const all = lsGet<LateFeeRule>(LATE_FEE_RULES_KEY(schoolId));
  lsSet(LATE_FEE_RULES_KEY(schoolId), [...all, rule]);
  return { rule };
}

/** Human-readable description of a late fee rule */
export function describeLateFeeRule(rule: LateFeeRule): string {
  const val = rule.method === "percent_once" ? `${rule.value}%` : `₹${rule.value / 100}`;
  const methodLabel: Record<string, string> = {
    flat_once: `${val} flat once`, per_day: `${val} per day`, per_week: `${val} per week`,
    per_month: `${val} per month`, percent_once: `${val} of unpaid balance once`,
  };
  let desc = methodLabel[rule.method] || val;
  if (rule.grace_days > 0) desc += ` after ${rule.grace_days} days grace`;
  if (rule.max_cap_paise) desc += `, at most ₹${rule.max_cap_paise / 100}`;
  return desc;
}

// ─── Fee Settings ─────────────────────────────────────────────────────────────

export const DEFAULT_FEE_SETTINGS: Omit<FeeSettings, "school_id" | "created_at" | "updated_at"> = {
  receipt_prefix: "MZ",
  receipt_paper: "a5",
  receipt_language: "en",
  allow_partial: true,
  min_partial_paise: 0,
  allow_advance: true,
  allocation_mode: "auto_oldest_first",
  round_to_rupee: true,
  backdate_days_limit: 0,
  discount_approval_threshold_percent: 10,
  auto_assign_fee_on_admission: true,
  auto_late_fee: false,
  cheque_receipt_timing: "on_receipt",
  parent_pay_enabled: false,
  gateway_fee_bearer: "school",
  auto_print_receipt: false,
  owner_pin_hash: null,
};

export async function getFeeSettings(schoolId: string): Promise<{ settings: FeeSettings }> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from("fee_settings").select("*").eq("school_id", schoolId).maybeSingle();
      if (data) return { settings: data as FeeSettings };
    } catch {}
  }
  const stored = lsGetObj<FeeSettings | null>(FEE_SETTINGS_KEY(schoolId), null);
  if (stored) return { settings: stored };
  const defaults: FeeSettings = {
    school_id: schoolId, ...DEFAULT_FEE_SETTINGS,
    created_at: now(), updated_at: now(),
  };
  return { settings: defaults };
}

export async function updateFeeSettings(
  schoolId: string,
  input: FeeSettingsInput
): Promise<{ settings?: FeeSettings; error?: string }> {
  const { new_pin, ...rest } = input;
  const update: Partial<FeeSettings> = { ...rest, updated_at: now() };

  if (new_pin) {
    if (new_pin.length < 4 || new_pin.length > 8 || !/^\d+$/.test(new_pin)) {
      return { error: "PIN must be 4–8 digits" };
    }
    update.owner_pin_hash = await hashPin(new_pin);
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_settings")
        .upsert({ school_id: schoolId, ...update }, { onConflict: "school_id" })
        .select().single();
      if (error) throw error;
      return { settings: data as FeeSettings };
    } catch (e: any) { return { error: e.message }; }
  }

  const { settings: current } = await getFeeSettings(schoolId);
  const merged: FeeSettings = { ...current, ...update, school_id: schoolId };
  lsSetObj(FEE_SETTINGS_KEY(schoolId), merged);
  return { settings: merged };
}

// ─── Owner PIN verification (rate-limited) ────────────────────────────────────

interface PinAttempts { count: number; lockedUntil?: number }

export async function verifyOwnerPin(
  schoolId: string,
  pin: string
): Promise<{ ok: boolean; locked?: boolean; remaining_attempts?: number; error?: string }> {
  const attemptsKey = PIN_ATTEMPTS_KEY(schoolId);
  const attempts = lsGetObj<PinAttempts>(attemptsKey, { count: 0 });

  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    const mins = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
    return { ok: false, locked: true, error: `PIN locked. Try again in ${mins} minute(s).` };
  }

  const { settings } = await getFeeSettings(schoolId);
  if (!settings.owner_pin_hash) return { ok: false, error: "No owner PIN set" };

  const ok = await verifyPin(pin, settings.owner_pin_hash);
  if (ok) {
    lsSetObj(attemptsKey, { count: 0 });
    return { ok: true };
  }

  const newCount = attempts.count + 1;
  const MAX_ATTEMPTS = 5;
  if (newCount >= MAX_ATTEMPTS) {
    lsSetObj(attemptsKey, { count: newCount, lockedUntil: Date.now() + 15 * 60 * 1000 });
    return { ok: false, locked: true, error: "Too many attempts. PIN locked for 15 minutes." };
  }
  lsSetObj(attemptsKey, { count: newCount });
  return { ok: false, remaining_attempts: MAX_ATTEMPTS - newCount };
}

