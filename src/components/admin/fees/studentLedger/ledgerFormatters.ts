import { formatPaise, formatPaiseCompact } from "../../../../lib/amountInWords";

export { formatPaise, formatPaiseCompact };

/**
 * Format any date string (YYYY-MM-DD or ISO) into DD MMM YYYY in en-IN locale
 * e.g. "2026-10-09" -> "09 Oct 2026"
 */
export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Returns initials from a student's full name (max 2 characters)
 */
export function getInitials(name?: string | null): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type StatusCategory = "paid" | "partial" | "overdue" | "waived" | "unpaid" | "upcoming" | "neutral";

/**
 * Maps any financial status into standard badge classes & labels
 */
export function getStatusBadgeConfig(statusRaw?: string | null): {
  label: string;
  category: StatusCategory;
  className: string;
} {
  const s = (statusRaw || "").toLowerCase().trim();

  if (s === "paid" || s === "received" || s === "fully_paid") {
    return {
      label: s === "fully_paid" ? "Fully Paid" : s === "received" ? "Received" : "Paid",
      category: "paid",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    };
  }

  if (s === "overdue") {
    return {
      label: "Overdue",
      category: "overdue",
      className: "bg-rose-50 text-rose-700 border border-rose-200/80 font-bold",
    };
  }

  if (s === "partial" || s === "partially_paid") {
    return {
      label: "Partial",
      category: "partial",
      className: "bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold",
    };
  }

  if (s === "waived" || s === "concession") {
    return {
      label: "Waived",
      category: "waived",
      className: "bg-teal-50 text-teal-700 border border-teal-200/80 font-semibold",
    };
  }

  if (s === "upcoming") {
    return {
      label: "Upcoming",
      category: "upcoming",
      className: "bg-sky-50 text-sky-700 border border-sky-200/80",
    };
  }

  if (s === "no_dues") {
    return {
      label: "No Dues",
      category: "paid",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    };
  }

  if (s === "pending" || s === "unpaid") {
    return {
      label: "Pending",
      category: "unpaid",
      className: "bg-slate-100 text-slate-700 border border-slate-200",
    };
  }

  return {
    label: statusRaw || "Active",
    category: "neutral",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  };
}
