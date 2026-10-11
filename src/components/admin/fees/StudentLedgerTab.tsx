/**
 * StudentLedgerTab — B5.5
 * Embeddable tab component for student profile Fees tab.
 * Also used standalone at /admin/fees/students/:id
 *
 * Shows: summary tiles + timeline ledger table
 * Actions: Collect fee, Add manual due, Assign structure, Statement PDF
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard, Plus, FileText, Download, RefreshCw, ChevronDown,
  TrendingDown, TrendingUp, Wallet, AlertCircle, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getStudentDues } from "../../../services/feeDuesService";
import { amountInWords, formatPaise } from "../../../lib/amountInWords";
import type { StudentDue, FeeLedgerEntry } from "../../../types/fees";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(p: number) {
  return "₹" + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function entryLabel(e: FeeLedgerEntry) {
  switch (e.entry_type) {
    case "due_created": return "Due created";
    case "payment": return "Payment";
    case "concession": return "Concession";
    case "reversal": return "Reversal";
    case "waiver": return "Late fee waiver";
    case "late_fee": return "Late fee";
    case "adjustment": return e.note?.includes("INTEGRITY") ? "⚠ Balance alert" : "Adjustment";
    case "carry_forward": return "Carry forward";
    case "cancel_due": return "Due cancelled";
    default: return e.entry_type;
  }
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

function Tile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-1">
      <div className={`text-lg font-bold tabular-nums font-display ${color ?? "text-slate-900"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  studentName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StudentLedgerTab({ studentId, studentName }: Props) {
  const { schoolId } = useAuth();
  const navigate = useNavigate();

  const [dues, setDues] = useState<StudentDue[]>([]);
  const [ledger, setLedger] = useState<FeeLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearId, setYearId] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (!schoolId) return;
    const years = JSON.parse(localStorage.getItem(`myzkool_academic_years_${schoolId}`) || "[]");
    const cur = years.find((y: any) => y.is_current);
    if (cur) setYearId(cur.id);
  }, [schoolId]);

  const load = useCallback(async () => {
    if (!schoolId || !studentId) return;
    setLoading(true);
    try {
      const { dues: d } = await getStudentDues(schoolId, studentId, yearId || undefined);
      setDues(d);

      // Load ledger from localStorage (dev) or Supabase
      const allLedger = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${schoolId}`) || "[]") as FeeLedgerEntry[];
      const studentLedger = allLedger.filter(e => e.student_id === studentId);
      setLedger(studentLedger.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, yearId]);

  useEffect(() => { load(); }, [load]);

  // ── Summary metrics ───────────────────────────────────────────────────────
  const totalDemand = dues.reduce((s, d) => s + d.net_paise, 0);
  const totalConcession = dues.reduce((s, d) => s + d.concession_paise, 0);
  const totalPaid = dues.reduce((s, d) => s + d.paid_paise, 0);
  const totalBalance = dues.reduce((s, d) => s + d.balance_paise, 0);

  // ── Running balance calc ───────────────────────────────────────────────────
  let running = 0;
  const ledgerWithBalance = [...ledger].reverse().map(e => {
    running += e.amount_paise;
    return { ...e, running_balance: running };
  }).reverse();

  const filtered = typeFilter === "all"
    ? ledgerWithBalance
    : ledgerWithBalance.filter(e => e.entry_type === typeFilter);

  function generateStatementPDF() {
    const rows = ledgerWithBalance.map(e => `
      <tr>
        <td>${fmtDate(e.created_at)}</td>
        <td>${entryLabel(e)}</td>
        <td>${e.note ?? ""}</td>
        <td style="text-align:right">${e.amount_paise > 0 ? fmt(e.amount_paise) : ""}</td>
        <td style="text-align:right">${e.amount_paise < 0 ? fmt(-e.amount_paise) : ""}</td>
        <td style="text-align:right">${fmt(e.running_balance)}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Fee Statement — ${studentName ?? studentId}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;color:#111;margin:0;padding:8mm}
  h1{font-size:16px;margin:0 0 2px;font-weight:700}
  .sub{font-size:9px;color:#666;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#f1f5f9;padding:5px 6px;text-align:left;font-size:9px;font-weight:600;border-bottom:2px solid #cbd5e1}
  td{padding:4px 6px;border-bottom:1px solid #e2e8f0}
  .tiles{display:flex;gap:8px;margin:8px 0}
  .tile{flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:6px;text-align:center}
  .tile-val{font-size:13px;font-weight:700}
  .tile-lbl{font-size:8px;color:#64748b}
  @media print{@page{size:A4 portrait;margin:0}body{padding:8mm}}
</style></head>
<body>
  <h1>MyZkool School</h1>
  <div class="sub">Fee Statement — ${studentName ?? studentId} | Academic Year 2026-27</div>
  <div class="tiles">
    <div class="tile"><div class="tile-val">${fmt(totalDemand)}</div><div class="tile-lbl">Total demand</div></div>
    <div class="tile"><div class="tile-val">${fmt(totalConcession)}</div><div class="tile-lbl">Concession</div></div>
    <div class="tile"><div class="tile-val" style="color:#1fae7a">${fmt(totalPaid)}</div><div class="tile-lbl">Paid</div></div>
    <div class="tile"><div class="tile-val" style="color:#dc2626">${fmt(totalBalance)}</div><div class="tile-lbl">Balance</div></div>
  </div>
  <table>
    <thead>
      <tr><th>Date</th><th>Description</th><th>Note</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:8px;color:#888;margin-top:8px;text-align:center">This is a computer generated statement.</p>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate(`/admin/fees/collect?student=${studentId}`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2158E0] text-white text-xs font-medium hover:bg-[#2158E0]/90"
        >
          <CreditCard className="w-3.5 h-3.5" /> Collect fee
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50">
          <Plus className="w-3.5 h-3.5" /> Add manual due
        </button>
        <button
          onClick={generateStatementPDF}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
        >
          <Download className="w-3.5 h-3.5" /> Statement PDF
        </button>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Total demand" value={fmt(totalDemand)} />
        <Tile label="Concession" value={fmt(totalConcession)} color="text-slate-600" />
        <Tile label="Paid" value={fmt(totalPaid)} color="text-[#1FAE7A]" />
        <Tile label="Balance" value={fmt(totalBalance)} color={totalBalance > 0 ? "text-red-600" : "text-slate-900"} />
      </div>

      {/* Ledger timeline */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 overflow-x-auto">
          <span className="text-xs font-medium text-slate-500 flex-shrink-0">Filter:</span>
          {["all", "payment", "due_created", "concession", "reversal", "waiver", "late_fee"].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize flex-shrink-0 ${
                typeFilter === t ? "bg-[#2158E0] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No ledger entries yet.</p>
            <p className="text-xs text-slate-400 mt-1">Collect a fee to see the ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Description</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">Debit</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">Credit</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(e => {
                  const isDebit = e.amount_paise > 0;
                  const isCredit = e.amount_paise < 0;
                  return (
                    <tr key={e.id} style={{ height: 44 }}>
                      <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">{fmtDate(e.created_at)}</td>
                      <td className="px-4 py-2">
                        <div className="text-sm text-slate-800">{entryLabel(e)}</div>
                        {e.note && <div className="text-xs text-slate-400 truncate max-w-[200px]">{e.note}</div>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-sm">
                        {isDebit ? <span className="text-red-600 font-medium">{fmt(e.amount_paise)}</span> : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-sm">
                        {isCredit ? <span className="text-[#1FAE7A] font-medium">{fmt(-e.amount_paise)}</span> : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-sm font-semibold">
                        <span className={e.running_balance > 0 ? "text-red-600" : "text-slate-700"}>
                          {fmt(Math.abs(e.running_balance))}
                          {e.running_balance !== 0 && (
                            <span className="text-xs ml-0.5 font-normal">{e.running_balance > 0 ? " Dr" : " Cr"}</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dues list */}
      {dues.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dues detail</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Description</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Due date</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600">Net</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600">Paid</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600">Balance</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dues.map(d => (
                  <tr key={d.id} style={{ height: 44 }}>
                    <td className="px-3 py-2 text-slate-800 text-xs">{d.description || "Due"}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{fmtDate(d.due_date)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{fmt(d.net_paise)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-[#1FAE7A]">{fmt(d.paid_paise)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-semibold">
                      <span className={d.balance_paise > 0 ? "text-red-600" : "text-slate-700"}>{fmt(d.balance_paise)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.status === "paid" ? "bg-green-50 text-green-700"
                        : d.status === "partial" ? "bg-amber-50 text-amber-700"
                        : d.status === "pending" ? "bg-slate-100 text-slate-600"
                        : "bg-red-50 text-red-700"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

