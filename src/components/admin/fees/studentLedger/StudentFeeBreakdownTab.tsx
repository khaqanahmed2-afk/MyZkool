import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Receipt,
  FileText,
  Search,
} from "lucide-react";
import { formatPaise, formatDateDisplay, getStatusBadgeConfig } from "./ledgerFormatters";
import type { FeeObligationBreakdownItem } from "../../../../types/studentFeeLedger";

interface Props {
  feeBreakdown: FeeObligationBreakdownItem[];
  onSelectObligation: (item: FeeObligationBreakdownItem) => void;
  metrics: {
    total_charges_paise: number;
    total_concessions_paise: number;
    net_assessed_paise?: number;
    total_payments_paise: number;
    closing_balance_paise: number;
    overdue_balance_paise: number;
  };
}

type FilterType = "all" | "outstanding" | "overdue" | "paid" | "waived";

export const StudentFeeBreakdownTab: React.FC<Props> = ({
  feeBreakdown,
  onSelectObligation,
  metrics,
}) => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const pageSize = 8;

  // Filter items
  const filtered = useMemo(() => {
    return feeBreakdown.filter((item) => {
      if (filter === "outstanding") return item.pending_paise > 0;
      if (filter === "overdue") return item.status === "Overdue" || (item.pending_paise > 0 && item.status.toLowerCase() === "overdue");
      if (filter === "paid") return item.status === "Paid" || (item.pending_paise === 0 && item.paid_paise > 0);
      if (filter === "waived") return item.status === "Waived" || item.waived_paise > 0;
      return true;
    });
  }, [feeBreakdown, filter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Counts for pills
  const counts = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let paid = 0;
    let waived = 0;
    for (const item of feeBreakdown) {
      if (item.pending_paise > 0) outstanding++;
      if (item.status === "Overdue") overdue++;
      if (item.status === "Paid" || (item.pending_paise === 0 && item.paid_paise > 0)) paid++;
      if (item.status === "Waived" || item.waived_paise > 0) waived++;
    }
    return {
      all: feeBreakdown.length,
      outstanding,
      overdue,
      paid,
      waived,
    };
  }, [feeBreakdown]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Fee-Wise Obligations & Balances
          </h4>
          <p className="text-[11px] text-slate-500">
            Canonical schedule of assessed fee components, applied waivers, payments, and balances
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter("outstanding");
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "outstanding"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Outstanding ({counts.outstanding})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter("overdue");
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "overdue"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Overdue ({counts.overdue})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter("paid");
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "paid"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Paid ({counts.paid})
          </button>
          {counts.waived > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilter("waived");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "waived"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Waived ({counts.waived})
            </button>
          )}
        </div>
      </div>

      {/* Main Canonical Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3">Fee Description</th>
                <th className="py-2.5 px-3">Billing Period</th>
                <th className="py-2.5 px-3 text-right">Net Assessed</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">
                      No obligations found for filter &ldquo;{filter}&rdquo;
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((b) => {
                  const isExpanded = expandedRowId === b.id;
                  const netAssessed = b.original_amount_paise - b.waived_paise;
                  const badge = getStatusBadgeConfig(b.status);

                  return (
                    <React.Fragment key={b.id}>
                      <tr
                        tabIndex={0}
                        onClick={() => onSelectObligation(b)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectObligation(b);
                          }
                        }}
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer focus:outline-none focus:bg-blue-50/40 ${
                          isExpanded ? "bg-slate-50/60" : ""
                        }`}
                      >
                        {/* Expand toggle */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(b.id, e)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse details" : "Expand gross & concession breakdown"}
                          >
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                isExpanded ? "rotate-90 text-blue-600" : ""
                              }`}
                            />
                          </button>
                        </td>

                        {/* Fee Description */}
                        <td className="py-2.5 px-3 text-slate-900 font-semibold text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span>{b.description}</span>
                            {b.category === "Transport" && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-semibold uppercase">
                                Transport
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Billing Period */}
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {b.billing_period}
                        </td>

                        {/* Net Assessed */}
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900 tabular-nums text-[11px]">
                          {formatPaise(netAssessed)}
                        </td>

                        {/* Paid */}
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-700 tabular-nums text-[11px]">
                          {b.paid_paise > 0 ? formatPaise(b.paid_paise) : "—"}
                        </td>

                        {/* Outstanding Balance */}
                        <td
                          className={`py-2.5 px-3 text-right font-bold tabular-nums text-[11px] ${
                            b.pending_paise > 0
                              ? b.status === "Overdue"
                                ? "text-rose-600"
                                : "text-amber-800"
                              : "text-slate-400"
                          }`}
                        >
                          {formatPaise(b.pending_paise)}
                        </td>

                        {/* Due Date */}
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {formatDateDisplay(b.due_date)}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectObligation(b);
                            }}
                            className="px-2 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Breakdown Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-200 animate-in fade-in duration-150">
                          <td colSpan={9} className="py-3 px-6 text-xs text-slate-700 space-y-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white rounded-lg border border-slate-200">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  Gross Assessed
                                </span>
                                <div className="font-semibold text-slate-800 tabular-nums text-xs mt-0.5">
                                  {formatPaise(b.original_amount_paise)}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  Waiver / Concession
                                </span>
                                <div className="font-semibold text-teal-700 tabular-nums text-xs mt-0.5">
                                  {b.waived_paise > 0 ? `-${formatPaise(b.waived_paise)}` : "None (₹0.00)"}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  Net Obligation
                                </span>
                                <div className="font-semibold text-slate-900 tabular-nums text-xs mt-0.5">
                                  {formatPaise(netAssessed)}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  Allocated Receipts
                                </span>
                                <div className="font-semibold text-emerald-700 tabular-nums text-xs mt-0.5">
                                  {b.allocations?.length || 0} receipt{b.allocations?.length === 1 ? "" : "s"}
                                </div>
                              </div>
                            </div>

                            {/* Linked payment allocations if any */}
                            {b.allocations && b.allocations.length > 0 && (
                              <div className="space-y-1 pt-1">
                                <span className="text-[11px] font-semibold text-slate-700">
                                  Payment Settlement Details:
                                </span>
                                <div className="space-y-1">
                                  {b.allocations.map((alc, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between p-2 rounded bg-emerald-50/70 border border-emerald-100 text-[11px]"
                                    >
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="font-mono font-semibold text-slate-800">
                                          {alc.receipt_no}
                                        </span>
                                        <span className="text-slate-500">
                                          ({formatDateDisplay(alc.receipt_date)})
                                        </span>
                                        {alc.payment_mode && (
                                          <span className="text-slate-400 uppercase text-[10px]">
                                            via {alc.payment_mode}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-bold text-emerald-700 tabular-nums">
                                        {formatPaise(alc.amount_paise)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} obligations
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reconciled Totals Footer Bar */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-slate-500">Gross Assessed:</span>{" "}
            <span className="font-bold text-slate-900 tabular-nums">
              {formatPaise(metrics.total_charges_paise || 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Approved Concessions:</span>{" "}
            <span className="font-bold text-teal-700 tabular-nums">
              -{formatPaise(metrics.total_concessions_paise || 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Net Assessed:</span>{" "}
            <span className="font-bold text-slate-900 tabular-nums">
              {formatPaise(metrics.net_assessed_paise || 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Total Paid:</span>{" "}
            <span className="font-bold text-emerald-700 tabular-nums">
              {formatPaise(metrics.total_payments_paise || 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Total Outstanding:</span>{" "}
          <span className="font-bold text-amber-800 tabular-nums">
            {formatPaise(metrics.closing_balance_paise || 0)}
          </span>
          {metrics.overdue_balance_paise > 0 && (
            <span className="text-rose-600 font-bold tabular-nums">
              ({formatPaise(metrics.overdue_balance_paise)} Overdue)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
