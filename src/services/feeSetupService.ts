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
  SUGGESTED_FEE_HEADS,
  SYSTEM_FEE_HEADS,
  StructureAppliesTo,
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
      return { heads: (data || []) as FeeHead[] };
    } catch (e: any) { return { heads: [], error: e.message }; }
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
    is_active: true,
    created_at: now(), updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_heads").insert({ ...head, created_by: actorId }).select().single();
      if (error) throw error;
      return { head: data as FeeHead };
    } catch (e: any) { return { error: e.message }; }
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
      if (error) throw error;
      return { head: data as FeeHead };
    } catch (e: any) { return { error: e.message }; }
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
        await supabase.from("fee_heads").insert(head);
      } else {
        const all = lsGet<FeeHead>(FEE_HEADS_KEY(schoolId));
        lsSet(FEE_HEADS_KEY(schoolId), [...all, head]);
      }
    }
  }
}

// ─── Fee Terms ───────────────────────────────────────────────────────────────

export async function getFeeTerms(
  schoolId: string,
  yearId: string
): Promise<{ terms: FeeTerm[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_terms")
        .select("*").eq("school_id", schoolId).eq("academic_year_id", yearId).order("sort_order");
      if (error) throw error;
      return { terms: (data || []) as FeeTerm[] };
    } catch (e: any) { return { terms: [], error: e.message }; }
  }
  const terms = lsGet<FeeTerm>(FEE_TERMS_KEY(schoolId, yearId)).sort((a, b) => a.sort_order - b.sort_order);
  return { terms };
}

export function generateTermPreset(
  yearId: string,
  schoolId: string,
  preset: TermPreset,
  yearStart: string,
): FeeTermInput[] {
  const start = new Date(yearStart);
  const getDate = (monthOffset: number, day: number) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + monthOffset, day);
    return d.toISOString().split("T")[0];
  };
  const dueDay = 10;
  if (preset === "monthly") {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNames = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
      return { name: monthNames[i], due_date: getDate(i, dueDay), sort_order: i };
    });
  }
  if (preset === "quarterly") {
    return [
      { name: "Q1 (Apr–Jun)", due_date: getDate(0, dueDay), sort_order: 0 },
      { name: "Q2 (Jul–Sep)", due_date: getDate(3, dueDay), sort_order: 1 },
      { name: "Q3 (Oct–Dec)", due_date: getDate(6, dueDay), sort_order: 2 },
      { name: "Q4 (Jan–Mar)", due_date: getDate(9, dueDay), sort_order: 3 },
    ];
  }
  if (preset === "three_term") {
    return [
      { name: "Term 1 (Apr–Jul)", due_date: getDate(0, dueDay), sort_order: 0 },
      { name: "Term 2 (Aug–Nov)", due_date: getDate(4, dueDay), sort_order: 1 },
      { name: "Term 3 (Dec–Mar)", due_date: getDate(8, dueDay), sort_order: 2 },
    ];
  }
  if (preset === "half_yearly") {
    return [
      { name: "Half Year 1 (Apr–Sep)", due_date: getDate(0, dueDay), sort_order: 0 },
      { name: "Half Year 2 (Oct–Mar)", due_date: getDate(6, dueDay), sort_order: 1 },
    ];
  }
  // yearly
  return [{ name: "Annual", due_date: getDate(0, dueDay), sort_order: 0 }];
}

export async function createFeeTerms(
  schoolId: string,
  yearId: string,
  inputs: FeeTermInput[]
): Promise<{ terms: FeeTerm[]; error?: string }> {
  const terms: FeeTerm[] = inputs.map((inp, i) => ({
    id: uuid(), school_id: schoolId, academic_year_id: yearId,
    name: inp.name,
    period_start: inp.period_start ?? null,
    period_end: inp.period_end ?? null,
    due_date: inp.due_date,
    late_grace_days: inp.late_grace_days ?? 0,
    sort_order: inp.sort_order ?? i,
    created_at: now(), updated_at: now(),
  }));

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_terms").insert(terms).select();
      if (error) throw error;
      return { terms: (data || []) as FeeTerm[] };
    } catch (e: any) { return { terms: [], error: e.message }; }
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
      if (error) throw error;
      return { term: data as FeeTerm };
    } catch (e: any) { return { error: e.message }; }
  }
  // find in any year's cache — iterate stored keys not possible in simple helper; scan all known terms
  // For simplicity in localStorage mode, rebuild from a full scan
  const all = Object.keys(localStorage)
    .filter(k => k.startsWith(`myzkool_fee_terms_${schoolId}_`))
    .flatMap(k => lsGet<FeeTerm>(k));
  const t = all.find(x => x.id === id);
  if (!t) return { error: "Term not found" };
  const updated = { ...t, ...input, updated_at: now() };
  const key = FEE_TERMS_KEY(schoolId, t.academic_year_id);
  const yearTerms = lsGet<FeeTerm>(key).map(x => x.id === id ? updated : x);
  lsSet(key, yearTerms);
  return { term: updated };
}

// ─── Fee Structures ──────────────────────────────────────────────────────────

export async function getFeeStructures(
  schoolId: string,
  yearId?: string,
  classId?: string
): Promise<{ structures: FeeStructure[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      let q = supabase.from("fee_structures").select("*").eq("school_id", schoolId);
      if (yearId) q = q.eq("academic_year_id", yearId);
      if (classId) q = q.eq("class_id", classId);
      const { data, error } = await q;
      if (error) throw error;
      return { structures: (data || []) as FeeStructure[] };
    } catch (e: any) { return { structures: [], error: e.message }; }
  }
  let structures = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  if (yearId) structures = structures.filter(s => s.academic_year_id === yearId);
  if (classId) structures = structures.filter(s => s.class_id === classId);
  return { structures };
}

export async function createFeeStructure(
  schoolId: string,
  input: FeeStructureInput
): Promise<{ structure?: FeeStructure; error?: string }> {
  const structure: FeeStructure = {
    id: uuid(), school_id: schoolId,
    academic_year_id: input.academic_year_id,
    class_id: input.class_id, name: input.name,
    applies_to: input.applies_to, version: 1, status: "draft",
    created_at: now(), updated_at: now(),
  };
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("fee_structures").insert(structure).select().single();
      if (error) throw error;
      return { structure: data as FeeStructure };
    } catch (e: any) { return { error: e.message }; }
  }
  const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  lsSet(FEE_STRUCTURES_KEY(schoolId), [...all, structure]);
  return { structure };
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
  actorId: string
): Promise<{ version?: number; error?: string; needs_approval?: boolean }> {
  const all = lsGet<FeeStructure>(FEE_STRUCTURES_KEY(schoolId));
  const s = all.find(x => x.id === structureId);
  if (!s) return { error: "Structure not found" };

  // Archive existing active structure for same (year, class, applies_to)
  const toArchive = all.filter(x =>
    x.id !== structureId &&
    x.academic_year_id === s.academic_year_id &&
    x.class_id === s.class_id &&
    x.applies_to === s.applies_to &&
    x.status === "active"
  );

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
      return { version: newVersion };
    } catch (e: any) { return { error: e.message }; }
  }

  const updated = all.map(x => {
    if (toArchive.some(a => a.id === x.id)) return { ...x, status: "archived" as const, updated_at: now() };
    if (x.id === structureId) return { ...x, status: "active" as const, version: (x.version || 1) + 1, updated_at: now() };
    return x;
  });
  lsSet(FEE_STRUCTURES_KEY(schoolId), updated);
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

