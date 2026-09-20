/**
 * Counter Service (Phase 3a)
 *
 * Gap-free sequential receipt numbers.
 * Format: {prefix}/{yearLabel}/{six-digit zero-padded}
 * e.g. MZ/2026-27/000123
 *
 * In Supabase mode: calls the atomic `next_receipt_no` RPC.
 * In localStorage mode: manages a local counter per school/year.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";

const COUNTER_PREFIX = "myzkool_receipt_counter_";

function counterKey(schoolId: string, yearId: string): string {
  return `${COUNTER_PREFIX}${schoolId}_${yearId}`;
}

/** Atomically get the next receipt number. */
export async function nextReceiptNo(
  schoolId: string,
  yearId: string,
  prefix: string,
  yearLabel: string,
): Promise<string> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("next_receipt_no", {
      p_school_id: schoolId,
      p_academic_year_id: yearId,
      p_prefix: prefix,
      p_year_label: yearLabel,
    });
    if (error) throw new Error(`next_receipt_no RPC failed: ${error.message}`);
    return data as string;
  }

  // localStorage fallback — NOT safe for concurrent requests (dev only)
  const key = counterKey(schoolId, yearId);
  const current = parseInt(localStorage.getItem(key) || "0", 10);
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return `${prefix}/${yearLabel}/${String(next).padStart(6, "0")}`;
}

/** Reset counter (for testing only). */
export function _resetCounter_TEST(schoolId: string, yearId: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(counterKey(schoolId, yearId));
  }
}

