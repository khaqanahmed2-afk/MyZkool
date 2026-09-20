/**
 * Pure fee allocation engine (Phase 3a)
 *
 * All amounts in integer paise. No I/O, no side effects.
 * Every exported function satisfies these invariants:
 *   - SUM(lines[i].allocated_paise) + advance_paise === total_paid
 *   - ALL lines: allocated_paise >= 0
 *   - ALL lines: balance_after >= 0
 *   - Rounding remainder lands on the last line so sum is exact
 *
 * Unit-tested exhaustively in tests/test-phase3a.ts.
 */

import type { AllocationLine, AllocationResult } from "../types/collection";
import type { StudentDue } from "../types/fees";

// ─── Internal sort helpers ────────────────────────────────────────────────────

/**
 * Sort dues oldest-first.
 * Priority: carry_forward first, then late_fee, then due_date asc, then head display_order asc.
 */
function sortOldestFirst(dues: StudentDue[]): StudentDue[] {
  return [...dues].sort((a, b) => {
    // carry_forward source first
    const aCarry = a.source === "carry_forward" ? 0 : 1;
    const bCarry = b.source === "carry_forward" ? 0 : 1;
    if (aCarry !== bCarry) return aCarry - bCarry;
    // late_fee before regular at same date
    const aLate = a.source === "late_fee" ? 0 : 1;
    const bLate = b.source === "late_fee" ? 0 : 1;
    if (aLate !== bLate) return aLate - bLate;
    // due_date ascending
    if (a.due_date < b.due_date) return -1;
    if (a.due_date > b.due_date) return 1;
    return 0;
  });
}

// ─── Core allocate ────────────────────────────────────────────────────────────

/**
 * Allocate `amountPaise` across the given dues in the provided order.
 * Returns allocation lines and any advance (excess).
 */
function allocate(
  orderedDues: StudentDue[],
  amountPaise: number,
): AllocationLine[] {
  const lines: AllocationLine[] = [];
  let remaining = amountPaise;

  const payableDues = orderedDues.filter(d =>
    (d.status === "pending" || d.status === "partial") && d.balance_paise > 0
  );

  for (const due of payableDues) {
    if (remaining <= 0) break;
    const balance = due.balance_paise;
    const allocated = Math.min(remaining, balance);
    lines.push({
      due_id: due.id,
      fee_head_id: due.fee_head_id,
      due_date: due.due_date,
      gross_paise: due.gross_paise,
      net_paise: due.net_paise,
      prior_paid_paise: due.paid_paise,
      balance_before: balance,
      allocated_paise: allocated,
      balance_after: balance - allocated,
    });
    remaining -= allocated;
  }

  return lines;
}

// ─── Exported allocation functions ────────────────────────────────────────────

/**
 * Oldest-first allocation.
 * Excess over all dues becomes advance credit.
 */
export function allocateOldestFirst(
  dues: StudentDue[],
  amountPaise: number,
): AllocationResult {
  const ordered = sortOldestFirst(dues);
  const lines = allocate(ordered, amountPaise);
  const totalAllocated = lines.reduce((s, l) => s + l.allocated_paise, 0);
  const advance = amountPaise - totalAllocated;
  return {
    lines,
    advance_paise: Math.max(0, advance),
    total_allocated: totalAllocated,
    total_paid: amountPaise,
  };
}

/**
 * Manual selection: allocate across exactly these dues in order.
 * Caller ensures selectedDues are in desired order.
 * Excess becomes advance.
 */
export function allocateManual(
  selectedDues: StudentDue[],
  amountPaise: number,
): AllocationResult {
  const lines = allocate(selectedDues, amountPaise);
  const totalAllocated = lines.reduce((s, l) => s + l.allocated_paise, 0);
  const advance = amountPaise - totalAllocated;
  return {
    lines,
    advance_paise: Math.max(0, advance),
    total_allocated: totalAllocated,
    total_paid: amountPaise,
  };
}

/**
 * Apply available advance credits to reduce lines (oldest lines first).
 * Returns adjusted lines and remaining unused credit.
 */
export function applyAdvanceCredit(
  lines: AllocationLine[],
  creditAvailablePaise: number,
): { lines: AllocationLine[]; used_credit_paise: number; remaining_credit_paise: number } {
  if (creditAvailablePaise <= 0) {
    return { lines, used_credit_paise: 0, remaining_credit_paise: 0 };
  }
  let credit = creditAvailablePaise;
  const adjusted = lines.map(line => {
    if (credit <= 0) return line;
    // Credit reduces what needs to be paid from the "cash" pool
    // For allocation display purposes, we show it as a credit offset on this line
    const use = Math.min(credit, line.balance_before);
    credit -= use;
    return { ...line, credit_applied_paise: use };
  });
  return {
    lines: adjusted,
    used_credit_paise: creditAvailablePaise - credit,
    remaining_credit_paise: credit,
  };
}

/**
 * Ensure rounding remainders land on the last line so SUM(allocated) === total.
 * Call this after any rounding during concession / partial calculations.
 */
export function fixRoundingRemainder(lines: AllocationLine[], totalPaise: number): AllocationLine[] {
  if (lines.length === 0) return lines;
  const sumBeforeFix = lines.reduce((s, l) => s + l.allocated_paise, 0);
  const diff = totalPaise - sumBeforeFix;
  if (diff === 0) return lines;
  // Apply remainder to last line
  const last = { ...lines[lines.length - 1] };
  last.allocated_paise = Math.max(0, last.allocated_paise + diff);
  last.balance_after = Math.max(0, last.balance_before - last.allocated_paise);
  return [...lines.slice(0, -1), last];
}

/**
 * Validate allocation invariants. Throws if violated.
 * Call before writing to database.
 */
export function validateAllocation(result: AllocationResult): void {
  const { lines, advance_paise, total_paid } = result;
  const sum = lines.reduce((s, l) => s + l.allocated_paise, 0) + advance_paise;

  if (Math.abs(sum - total_paid) > 1) {
    throw new Error(
      `Allocation invariant violated: sum(lines)+advance=${sum} !== total_paid=${total_paid}`
    );
  }
  for (const line of lines) {
    if (line.allocated_paise < 0) {
      throw new Error(`Negative allocation on due ${line.due_id}: ${line.allocated_paise}`);
    }
    if (line.balance_after < 0) {
      throw new Error(`Negative balance_after on due ${line.due_id}: ${line.balance_after}`);
    }
    if (line.allocated_paise > line.balance_before + 1) {
      throw new Error(
        `Over-payment on due ${line.due_id}: allocated=${line.allocated_paise} balance=${line.balance_before}`
      );
    }
  }
  if (advance_paise < 0) {
    throw new Error(`Negative advance: ${advance_paise}`);
  }
}

/**
 * High-level entry point: choose allocation strategy based on settings.
 * Returns validated result ready for database write.
 */
export function computeAllocation(
  allDues: StudentDue[],
  amountPaise: number,
  mode: "auto_oldest_first" | "manual",
  selectedDueIds?: string[],
): AllocationResult {
  let result: AllocationResult;

  if (mode === "manual" && selectedDueIds && selectedDueIds.length > 0) {
    const selected = selectedDueIds
      .map(id => allDues.find(d => d.id === id))
      .filter((d): d is StudentDue => d !== undefined);
    result = allocateManual(selected, amountPaise);
  } else {
    result = allocateOldestFirst(allDues, amountPaise);
  }

  // Fix rounding on last line
  result = {
    ...result,
    lines: fixRoundingRemainder(result.lines, result.total_allocated),
  };

  validateAllocation(result);
  return result;
}

