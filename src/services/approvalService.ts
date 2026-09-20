/**
 * Approval Service (Phase 2)
 *
 * Manages approval_requests across all modules: create, list, approve, reject.
 * Includes owner-PIN rate-limited approval at the counter.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { ApprovalRequest, ApprovalRequestInput, ApprovalKind } from "../types/fees";
import { verifyOwnerPin } from "./feeSetupService";

// ─── Cache key ────────────────────────────────────────────────────────────────
const APPROVALS_KEY = (s: string) => `myzkool_approval_requests_${s}`;

function now() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID(); }

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createApprovalRequest(
  schoolId: string,
  input: ApprovalRequestInput,
  requestedBy?: string
): Promise<{ request?: ApprovalRequest; error?: string }> {
  const request: ApprovalRequest = {
    id: uuid(),
    school_id: schoolId,
    kind: input.kind,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    payload: {
      ...(input.payload ?? {}),
      impact_summary: input.impact_summary,
    },
    requested_by: requestedBy ?? null,
    status: "pending",
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: now(),
    updated_at: now(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("approval_requests").insert(request).select().single();
      if (error) throw error;
      return { request: data as ApprovalRequest };
    } catch (e: any) { return { error: e.message }; }
  }
  const all = lsGet<ApprovalRequest>(APPROVALS_KEY(schoolId));
  lsSet(APPROVALS_KEY(schoolId), [...all, request]);
  return { request };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getPendingApprovals(
  schoolId: string
): Promise<{ requests: ApprovalRequest[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("approval_requests")
        .select("*")
        .eq("school_id", schoolId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { requests: (data || []) as ApprovalRequest[] };
    } catch (e: any) { return { requests: [], error: e.message }; }
  }
  const requests = lsGet<ApprovalRequest>(APPROVALS_KEY(schoolId))
    .filter(r => r.status === "pending")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { requests };
}

export async function getAllApprovals(
  schoolId: string,
  kind?: ApprovalKind
): Promise<{ requests: ApprovalRequest[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      let q = supabase.from("approval_requests").select("*")
        .eq("school_id", schoolId).order("created_at", { ascending: false });
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return { requests: (data || []) as ApprovalRequest[] };
    } catch (e: any) { return { requests: [], error: e.message }; }
  }
  let requests = lsGet<ApprovalRequest>(APPROVALS_KEY(schoolId));
  if (kind) requests = requests.filter(r => r.kind === kind);
  return { requests: requests.sort((a, b) => b.created_at.localeCompare(a.created_at)) };
}

export async function getPendingCount(schoolId: string): Promise<number> {
  const { requests } = await getPendingApprovals(schoolId);
  return requests.length;
}

// ─── Approve / Reject ─────────────────────────────────────────────────────────

export async function approveRequest(
  schoolId: string,
  id: string,
  decidedBy: string,
  note?: string
): Promise<{ error?: string }> {
  const update = {
    status: "approved" as const,
    decided_by: decidedBy,
    decided_at: now(),
    decision_note: note ?? null,
    updated_at: now(),
  };
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("approval_requests")
        .update(update).eq("id", id).eq("school_id", schoolId).eq("status", "pending");
      if (error) throw error;
      return {};
    } catch (e: any) { return { error: e.message }; }
  }
  const all = lsGet<ApprovalRequest>(APPROVALS_KEY(schoolId));
  lsSet(APPROVALS_KEY(schoolId), all.map(r =>
    r.id === id && r.status === "pending" ? { ...r, ...update } : r
  ));
  return {};
}

export async function rejectRequest(
  schoolId: string,
  id: string,
  decidedBy: string,
  note?: string
): Promise<{ error?: string }> {
  const update = {
    status: "rejected" as const,
    decided_by: decidedBy,
    decided_at: now(),
    decision_note: note ?? null,
    updated_at: now(),
  };
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("approval_requests")
        .update(update).eq("id", id).eq("school_id", schoolId).eq("status", "pending");
      if (error) throw error;
      return {};
    } catch (e: any) { return { error: e.message }; }
  }
  const all = lsGet<ApprovalRequest>(APPROVALS_KEY(schoolId));
  lsSet(APPROVALS_KEY(schoolId), all.map(r =>
    r.id === id && r.status === "pending" ? { ...r, ...update } : r
  ));
  return {};
}

// ─── Owner PIN override (rate-limited) ───────────────────────────────────────

export async function approveByOwnerPin(
  schoolId: string,
  id: string,
  pin: string,
  actorId: string
): Promise<{ ok: boolean; locked?: boolean; error?: string }> {
  const { ok, locked, error } = await verifyOwnerPin(schoolId, pin);
  if (!ok) return { ok: false, locked, error };

  const { error: approveError } = await approveRequest(
    schoolId, id, actorId, "approved by owner via PIN"
  );
  if (approveError) return { ok: false, error: approveError };
  return { ok: true };
}

