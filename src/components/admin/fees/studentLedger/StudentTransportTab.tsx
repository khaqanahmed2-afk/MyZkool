import React from "react";
import { Bus, MapPin, Calendar, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { formatPaise, formatDateDisplay, getStatusBadgeConfig } from "./ledgerFormatters";
import type { FeeObligationBreakdownItem } from "../../../../types/studentFeeLedger";

interface Props {
  transportDetails?: {
    has_transport: boolean;
    route_name?: string;
    stop_name?: string;
    monthly_fee_paise?: number;
    total_billed_paise?: number;
    total_paid_paise?: number;
    total_pending_paise?: number;
  };
  transportObligations: FeeObligationBreakdownItem[];
  onSelectObligation: (item: FeeObligationBreakdownItem) => void;
}

export const StudentTransportTab: React.FC<Props> = ({
  transportDetails,
  transportObligations,
  onSelectObligation,
}) => {
  const isEnrolled = Boolean(transportDetails?.has_transport);

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          School Transport Service & Billing
        </h4>
        <p className="text-[11px] text-slate-500">
          Strict separation of transport route enrollment from monthly transport fee obligations
        </p>
      </div>

      {!isEnrolled ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
          <Bus className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">Student is not enrolled in school transport.</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Transport charges are managed strictly as independent obligations and only billed when transport service is opted.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Section 1: Transport Enrollment Information */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bus className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-xs text-amber-950">Transport Service Enrollment</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                Active Rider
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-amber-200/60">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Assigned Route</div>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {transportDetails?.route_name || "Route A"}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Pickup / Drop Stop</div>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {transportDetails?.stop_name || "Designated Stop"}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Configured Monthly Fee</div>
                <div className="font-semibold text-slate-800 mt-0.5 tabular-nums">
                  {formatPaise(transportDetails?.monthly_fee_paise || 120000)} / mo
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Session Total Billed</div>
                <div className="font-bold text-amber-900 mt-0.5 tabular-nums">
                  {formatPaise(transportDetails?.total_billed_paise || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Transport Fee Obligations (Billing Records) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Monthly Transport Obligations ({transportObligations.length})
              </h5>
              <div className="text-xs text-slate-500">
                Outstanding Transport Dues:{" "}
                <span className="font-bold text-amber-800 tabular-nums">
                  {formatPaise(transportDetails?.total_pending_paise || 0)}
                </span>
              </div>
            </div>

            {transportObligations.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-center text-xs text-slate-500">
                No individual transport dues generated yet for this session.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3 text-right">Fee Amount</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transportObligations.map((o) => {
                      const badge = getStatusBadgeConfig(o.status);
                      return (
                        <tr
                          key={o.id}
                          onClick={() => onSelectObligation(o)}
                          className="hover:bg-amber-50/20 transition-colors cursor-pointer"
                        >
                          <td className="py-2 px-3 font-semibold text-slate-800 text-[11px]">
                            {o.billing_period}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900 tabular-nums text-[11px]">
                            {formatPaise(o.original_amount_paise)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-700 tabular-nums text-[11px]">
                            {o.paid_paise > 0 ? formatPaise(o.paid_paise) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-800 tabular-nums text-[11px]">
                            {formatPaise(o.pending_paise)}
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                            {formatDateDisplay(o.due_date)}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectObligation(o);
                              }}
                              className="px-2 py-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
