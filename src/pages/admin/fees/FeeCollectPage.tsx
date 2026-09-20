/**
 * FeeCollectPage — /admin/fees/collect
 * B5.3: Two-panel fee collection counter
 *
 * Left: student search, dues list with selection, siblings tab
 * Right: payment modes, split, cash change, concession block with PIN override,
 *        summary, sticky collect button, success panel
 *
 * Full keyboard map:
 *   / — focus search
 *   ↑↓ — navigate results / dues rows
 *   Enter — select result / toggle due
 *   Space — toggle due row
 *   A — select all overdue
 *   Alt+1…6 — payment mode
 *   Ctrl+Enter — collect
 *   P — print
 *   W — WhatsApp
 *   N — next student
 *   Esc — back to search
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, ChevronRight, CreditCard, Banknote, Smartphone, CheckSquare,
  Building2, MoreHorizontal, Plus, Minus, Printer, MessageCircle, Download,
  UserPlus, AlertTriangle, Wifi, WifiOff, ChevronDown, Users, Info, Shield, KeyRound, Check
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  collectFees, getCollectContext, searchStudentsForCounter,
} from "../../../services/collectionService";
import { getStudentDues } from "../../../services/feeDuesService";
import { getFeeSettings, verifyOwnerPin } from "../../../services/feeSetupService";
import { getStudentSiblings } from "../../../services/studentService";
import { amountInWords, formatPaise } from "../../../lib/amountInWords";
import { computeAllocation } from "../../../lib/feeAllocation";
import { generateReceiptHTML } from "../../../lib/receiptTemplate";
import type { StudentDue } from "../../../types/fees";
import type { CollectPaymentLine, FeeReceipt, FeeReceiptItem, FeePayment } from "../../../types/collection";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_MODES = [
  { id: "cash", label: "Cash", icon: Banknote, shortcut: "1" },
  { id: "upi", label: "UPI", icon: Smartphone, shortcut: "2" },
  { id: "card", label: "Card", icon: CreditCard, shortcut: "3" },
  { id: "cheque", label: "Cheque", icon: CheckSquare, shortcut: "4" },
  { id: "bank_transfer", label: "Bank transfer", icon: Building2, shortcut: "5" },
  { id: "other", label: "Other", icon: MoreHorizontal, shortcut: "6" },
] as const;

type PaymentMode = typeof PAYMENT_MODES[number]["id"];

interface PaymentRow {
  id: string;
  mode: PaymentMode;
  amount: string;
  reference: string;
  received?: string;
}

interface SearchResult {
  id: string;
  name: string;
  admission_no: string;
  balance_paise: number;
}

interface SiblingItem {
  id: string;
  name: string;
  admission_no: string;
  dues: StudentDue[];
  selectedDueIds: Set<string>;
  includedInPayment: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function paise(s: string): number {
  const v = parseFloat(s.replace(/,/g, ""));
  return isNaN(v) ? 0 : Math.round(v * 100);
}

function formatRupees(p: number): string {
  return (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FeeCollectPage() {
  const { user, schoolId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── State ─────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [resultIdx, setResultIdx] = useState(-1);

  const [student, setStudent] = useState<SearchResult | null>(null);
  const [dues, setDues] = useState<StudentDue[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"dues" | "siblings">("dues");

  // Siblings state (B7.4)
  const [siblings, setSiblings] = useState<SiblingItem[]>([]);
  const [siblingsLoading, setSiblingsLoading] = useState(false);

  // Concession state (B7.5)
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [concessionBasis, setConcessionBasis] = useState<"management" | "merit" | "staff_ward" | "other">("management");
  const [concessionType, setConcessionType] = useState<"percent" | "fixed">("percent");
  const [concessionVal, setConcessionVal] = useState("10");
  const [concessionReason, setConcessionReason] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [appliedConcessions, setAppliedConcessions] = useState<{ basis: string; value: number; type: string; reason: string } | null>(null);

  const [payments, setPayments] = useState<PaymentRow[]>([
    { id: "p1", mode: "cash", amount: "", reference: "", received: "" },
  ]);
  const [remarks, setRemarks] = useState("");

  const [collecting, setCollecting] = useState(false);
  const [success, setSuccess] = useState<{
    receipt_no: string;
    total_paise: number;
    advance_paise: number;
    receipt_id: string;
    items?: FeeReceiptItem[];
    payments?: FeePayment[];
    family_receipt_nos?: string[];
  } | null>(null);
  const [error, setError] = useState("");

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [yearId, setYearId] = useState("");
  const [settings, setSettings] = useState<any>(null);

  const idempKeyRef = useRef(crypto.randomUUID());
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Online/offline detection ───────────────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // ── Load settings & current year ──────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    getFeeSettings(schoolId).then(({ settings: s }) => setSettings(s));
    const years = JSON.parse(localStorage.getItem(`myzkool_academic_years_${schoolId}`) || "[]");
    const cur = years.find((y: any) => y.is_current);
    if (cur) setYearId(cur.id);
  }, [schoolId]);

  // ── Student search (debounced 200 ms) ─────────────────────────────────────
  useEffect(() => {
    if (!schoolId || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await searchStudentsForCounter(schoolId, query);
        setResults(r);
        setResultIdx(-1);
      } finally { setSearchLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query, schoolId]);

  // ── Load student when selected ───────────────────────────────────────────
  const selectStudent = useCallback(async (s: SearchResult) => {
    setStudent(s);
    setQuery("");
    setResults([]);
    setSelectedIds(new Set());
    setSuccess(null);
    setError("");
    setAppliedConcessions(null);
    idempKeyRef.current = crypto.randomUUID();

    if (!schoolId || !yearId) return;
    const { dues: d } = await getStudentDues(schoolId, s.id, yearId);
    const pendingDues = d.filter(due => due.status === "pending" || due.status === "partial");
    setDues(pendingDues);

    // Auto-select all overdue dues
    const overdue = pendingDues.filter(due => new Date(due.due_date) <= new Date());
    setSelectedIds(new Set(overdue.length > 0 ? overdue.map(x => x.id) : pendingDues.map(x => x.id)));

    // Load siblings
    setSiblingsLoading(true);
    try {
      const { siblings: sibList } = await getStudentSiblings(schoolId, s.id);
      if (sibList && sibList.length > 0) {
        const sibItems: SiblingItem[] = [];
        for (const sib of sibList) {
          const { dues: sDues } = await getStudentDues(schoolId, sib.sibling_id, yearId);
          const sPending = sDues.filter(due => due.status === "pending" || due.status === "partial");
          sibItems.push({
            id: sib.sibling_id,
            name: `${sib.sibling_first_name} ${sib.sibling_last_name}`.trim(),
            admission_no: sib.sibling_admission_no,
            dues: sPending,
            selectedDueIds: new Set(sPending.map(x => x.id)),
            includedInPayment: false,
          });
        }
        setSiblings(sibItems);
      } else {
        setSiblings([]);
      }
    } catch {
      setSiblings([]);
    } finally {
      setSiblingsLoading(false);
    }
  }, [schoolId, yearId]);

  // ── Load student from URL param ?student= ────────────────────────────────
  useEffect(() => {
    const studentParam = searchParams.get("student");
    if (studentParam && schoolId && yearId && !student) {
      getCollectContext(schoolId, studentParam, yearId).then(ctx => {
        if (ctx?.student) {
          selectStudent({
            id: ctx.student.id,
            name: ctx.student.name,
            admission_no: ctx.student.admission_no,
            balance_paise: ctx.dues.reduce((sum, d) => sum + d.balance_paise, 0),
          });
        }
      });
    }
  }, [searchParams, schoolId, yearId, student, selectStudent]);

  // ── Sibling toggle ────────────────────────────────────────────────────────
  function toggleSiblingIncluded(siblingId: string) {
    setSiblings(prev => prev.map(sib => {
      if (sib.id === siblingId) {
        return { ...sib, includedInPayment: !sib.includedInPayment };
      }
      return sib;
    }));
  }

  // ── Sibling due selection ─────────────────────────────────────────────────
  function toggleSiblingDue(siblingId: string, dueId: string) {
    setSiblings(prev => prev.map(sib => {
      if (sib.id === siblingId) {
        const nextSet = new Set(sib.selectedDueIds);
        if (nextSet.has(dueId)) nextSet.delete(dueId);
        else nextSet.add(dueId);
        return { ...sib, selectedDueIds: nextSet };
      }
      return sib;
    }));
  }

  // ── Selected dues and siblings dues ───────────────────────────────────────
  const selectedDues = dues.filter(d => selectedIds.has(d.id));
  const primarySelectedPaise = selectedDues.reduce((s, d) => s + d.balance_paise, 0);

  // Sibling dues included
  const includedSiblings = siblings.filter(s => s.includedInPayment);
  const siblingSelectedPaise = includedSiblings.reduce((total, sib) => {
    const dueSum = sib.dues.filter(d => sib.selectedDueIds.has(d.id)).reduce((s, d) => s + d.balance_paise, 0);
    return total + dueSum;
  }, 0);

  const totalSelectedPaise = primarySelectedPaise + siblingSelectedPaise;
  const totalPaymentPaise = payments.reduce((s, p) => s + paise(p.amount), 0);

  // Auto-fill payment amount when selecting dues if payment amount is currently empty
  useEffect(() => {
    if (totalSelectedPaise > 0 && payments.length === 1 && payments[0].amount === "") {
      setPayments([{ ...payments[0], amount: (totalSelectedPaise / 100).toString() }]);
    }
  }, [totalSelectedPaise]);

  const allocation = totalPaymentPaise > 0 && selectedDues.length > 0
    ? computeAllocation(selectedDues, Math.min(totalPaymentPaise, primarySelectedPaise), settings?.allocation_mode ?? "auto_oldest_first")
    : null;

  const advancePaise = totalPaymentPaise > totalSelectedPaise ? totalPaymentPaise - totalSelectedPaise : 0;
  const cashRow = payments.find(p => p.mode === "cash");
  const receivedPaise = cashRow?.received ? paise(cashRow.received) : 0;
  const changePaise = receivedPaise > totalPaymentPaise ? receivedPaise - totalPaymentPaise : 0;

  const canCollect = !collecting && !isOffline &&
    totalPaymentPaise > 0 && totalSelectedPaise > 0 &&
    totalPaymentPaise >= totalSelectedPaise;

  // ── Apply Ad-hoc Concession (B7.5) ────────────────────────────────────────
  const handleApplyConcession = async () => {
    if (!student || !schoolId) return;
    setPinError("");

    const valNum = parseFloat(concessionVal);
    if (isNaN(valNum) || valNum <= 0) {
      setPinError("Enter a valid discount amount or percentage");
      return;
    }
    if (!concessionReason || concessionReason.trim().length < 5) {
      setPinError("Reason is required (min 5 characters)");
      return;
    }

    const thresholdPercent = settings?.discount_approval_threshold_percent ?? 10;
    const isAboveThreshold = concessionType === "percent"
      ? valNum > thresholdPercent
      : (valNum * 100) > (primarySelectedPaise * (thresholdPercent / 100));

    if (isAboveThreshold) {
      if (!ownerPin) {
        setPinError(`Concession exceeds threshold (${thresholdPercent}%). Owner PIN required.`);
        return;
      }
      const pinRes = await verifyOwnerPin(schoolId, ownerPin);
      if (!pinRes.ok) {
        setPinError(pinRes.error || "Incorrect Owner PIN");
        return;
      }
    }

    // Apply concession to state dues
    setDues(prev => prev.map(due => {
      if (!selectedIds.has(due.id)) return due;
      const discount = concessionType === "percent"
        ? Math.round(due.gross_paise * (valNum / 100))
        : Math.min(due.gross_paise, Math.round((valNum * 100) / selectedIds.size));
      const newConcession = Math.min(due.gross_paise, due.concession_paise + discount);
      const newNet = Math.max(0, due.gross_paise - newConcession);
      const newBal = Math.max(0, newNet - due.paid_paise);
      return {
        ...due,
        concession_paise: newConcession,
        net_paise: newNet,
        balance_paise: newBal,
      };
    }));

    setAppliedConcessions({
      basis: concessionBasis,
      value: valNum,
      type: concessionType,
      reason: concessionReason,
    });
    setShowConcessionModal(false);
  };

  // ── Collect Action (B7.2, B7.4) ───────────────────────────────────────────
  const handleCollect = useCallback(async () => {
    if (!canCollect || !student || !schoolId || !yearId) return;
    setCollecting(true);
    setError("");

    try {
      const isFamilyPayment = includedSiblings.length > 0;
      const paymentGroupId = isFamilyPayment ? crypto.randomUUID() : undefined;

      // 1. Collect for primary student
      const primaryPaymentAmt = isFamilyPayment ? primarySelectedPaise : totalPaymentPaise;
      const primaryLines: CollectPaymentLine[] = payments
        .filter(p => paise(p.amount) > 0)
        .map(p => ({
          mode: p.mode,
          amount_paise: isFamilyPayment
            ? Math.round((paise(p.amount) * primarySelectedPaise) / totalPaymentPaise)
            : paise(p.amount),
          reference_no: p.reference || undefined,
        }));

      const primaryResult = await collectFees(schoolId, {
        student_id: student.id,
        academic_year_id: yearId,
        selected_due_ids: [...selectedIds],
        payments: primaryLines,
        remarks: remarks + (appliedConcessions ? ` [Concession: ${appliedConcessions.basis} - ${appliedConcessions.reason}]` : ""),
        payment_group_id: paymentGroupId,
      }, idempKeyRef.current, user?.id);

      const createdReceiptNos = [primaryResult.receipt_no];

      // 2. Collect for each included sibling (B7.4)
      for (const sib of includedSiblings) {
        const sibDueIds = [...sib.selectedDueIds];
        const sibAmt = sib.dues.filter(d => sib.selectedDueIds.has(d.id)).reduce((s, d) => s + d.balance_paise, 0);
        if (sibAmt <= 0) continue;

        const sibLines: CollectPaymentLine[] = [{
          mode: payments[0]?.mode || "cash",
          amount_paise: sibAmt,
          reference_no: payments[0]?.reference || undefined,
        }];

        const sibRes = await collectFees(schoolId, {
          student_id: sib.id,
          academic_year_id: yearId,
          selected_due_ids: sibDueIds,
          payments: sibLines,
          remarks: `Family payment (Linked with ${student.admission_no})`,
          payment_group_id: paymentGroupId,
        }, crypto.randomUUID(), user?.id);

        createdReceiptNos.push(sibRes.receipt_no);
      }

      setSuccess({
        receipt_no: primaryResult.receipt_no,
        total_paise: primaryResult.total_paise,
        advance_paise: primaryResult.advance_paise,
        receipt_id: primaryResult.receipt_id,
        family_receipt_nos: isFamilyPayment ? createdReceiptNos : undefined,
      });

      if (settings?.auto_print_receipt) {
        setTimeout(() => triggerPrint(primaryResult.receipt_no), 500);
      }
    } catch (e: any) {
      setError(e.message?.includes("network") || e.message?.includes("fetch")
        ? "We could not confirm this payment. Check receipts before trying again."
        : e.message);
    } finally {
      setCollecting(false);
    }
  }, [canCollect, student, schoolId, yearId, payments, selectedIds, remarks, settings, user, includedSiblings, primarySelectedPaise, totalPaymentPaise, appliedConcessions]);

  // ── Print helper ──────────────────────────────────────────────────────────
  const triggerPrint = (receiptNo?: string) => {
    if (!student) return;
    const dummyReceipt: FeeReceipt = {
      id: success?.receipt_id || crypto.randomUUID(),
      school_id: schoolId || "",
      receipt_no: receiptNo || success?.receipt_no || "MZ/2026-27/000001",
      student_id: student.id,
      academic_year_id: yearId,
      receipt_date: new Date().toISOString().split("T")[0],
      total_paise: success?.total_paise || totalPaymentPaise,
      status: "active",
      source: "counter",
      payment_group_id: null,
      collected_by: (user as any)?.name || user?.email || "Cashier",
      remarks,

      idempotency_key: null,
      print_count: 1,
      whatsapp_sent_at: null,
      cancelled_by: null,
      cancelled_at: null,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const receiptItems: FeeReceiptItem[] = selectedDues.map(d => ({
      id: crypto.randomUUID(),
      receipt_id: dummyReceipt.id,
      due_id: d.id,
      fee_head_id: d.description || "Tuition fee",
      amount_paise: d.balance_paise,
      concession_paise: d.concession_paise,
    }));

    const paymentItems: FeePayment[] = payments.map(p => ({
      id: crypto.randomUUID(),
      school_id: schoolId || "",
      receipt_id: dummyReceipt.id,
      mode: p.mode,
      amount_paise: paise(p.amount),
      reference_no: p.reference || null,
      bank_name: null,
      instrument_no: null,
      instrument_date: null,
      cheque_status: null,
      gateway_order_id: null,
      gateway_payment_id: null,
      created_at: new Date().toISOString(),
    }));

    const html = generateReceiptHTML(
      dummyReceipt,
      receiptItems,
      paymentItems,
      {
        student_name: student.name,
        admission_no: student.admission_no,
        balance_remaining_paise: Math.max(0, primarySelectedPaise - totalPaymentPaise),
      },
      {
        name: "MyZkool School",
      },
      settings?.receipt_paper || "a5",
      false
    );

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  // ── Keyboard Map (B5.3) ───────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA";

      // / → focus search
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      // Esc → clear / back to search
      if (e.key === "Escape") {
        if (showConcessionModal) { setShowConcessionModal(false); return; }
        if (results.length) { setResults([]); return; }
        if (student && !success) { setStudent(null); setDues([]); searchRef.current?.focus(); }
        return;
      }
      // While search results open: ↑↓ navigate, Enter select
      if (results.length) {
        if (e.key === "ArrowDown") { e.preventDefault(); setResultIdx(i => Math.min(i + 1, results.length - 1)); }
        if (e.key === "ArrowUp")   { e.preventDefault(); setResultIdx(i => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && resultIdx >= 0) { e.preventDefault(); selectStudent(results[resultIdx]); }
        return;
      }
      // Success panel
      if (success) {
        if (e.key === "p" || e.key === "P") { triggerPrint(); }
        if (e.key === "n" || e.key === "N") { resetToSearch(); }
        return;
      }
      // Due panel
      if (student && !inInput) {
        if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          const overdue = dues.filter(d => new Date(d.due_date) <= new Date());
          setSelectedIds(new Set(overdue.length > 0 ? overdue.map(d => d.id) : dues.map(d => d.id)));
        }
        // Alt+1…6 payment mode
        if (e.altKey && /^[1-6]$/.test(e.key)) {
          e.preventDefault();
          const mode = PAYMENT_MODES[parseInt(e.key) - 1]?.id;
          if (mode) setPayments(prev => [{ ...prev[0], mode }]);
        }
        // Ctrl+Enter → collect
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          handleCollect();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, resultIdx, student, dues, success, handleCollect, selectStudent, showConcessionModal]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function resetToSearch() {
    setStudent(null);
    setDues([]);
    setSelectedIds(new Set());
    setSiblings([]);
    setSuccess(null);
    setError("");
    setAppliedConcessions(null);
    setPayments([{ id: "p1", mode: "cash", amount: "", reference: "", received: "" }]);
    setRemarks("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  function toggleDue(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function addPaymentRow() {
    setPayments(prev => [...prev, { id: crypto.randomUUID(), mode: "cash", amount: "", reference: "" }]);
  }

  function removePaymentRow(id: string) {
    setPayments(prev => prev.filter(p => p.id !== id));
  }

  function updatePayment(id: string, field: Partial<PaymentRow>) {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...field } : p));
  }

  // Group dues by term period
  const duesByPeriod = dues.reduce((acc, due) => {
    const key = due.due_date.slice(0, 7);
    if (!acc[key]) acc[key] = [];
    acc[key].push(due);
    return acc;
  }, {} as Record<string, StudentDue[]>);

  const periods = Object.keys(duesByPeriod).sort();

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-amber-600 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>You are offline. Fee collection needs a connection so receipts are not duplicated.</span>
        </div>
      )}

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2158E0]/10 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-[#2158E0]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 font-display">Collect fee</h1>
            <p className="text-xs text-slate-500">Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono">/</kbd> to search</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/admin/fees/receipts")}
          className="text-xs font-semibold text-[#2158E0] hover:underline"
        >
          View all receipts
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 relative z-20">
        <div className="max-w-2xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            autoFocus
            type="text"
            placeholder="Search by name, admission number or phone…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:border-[#2158E0]"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin" />
          )}

          {/* Search results dropdown */}
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-30">
              {results.map((r, idx) => (
                <button
                  key={r.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 focus:outline-none cursor-pointer ${idx === resultIdx ? "bg-[#2158E0]/5" : ""}`}
                  onClick={() => selectStudent(r)}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-semibold flex-shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.admission_no}</div>
                  </div>
                  {r.balance_paise > 0 && (
                    <span className="text-xs font-semibold text-red-600 tabular-nums">
                      ₹{formatRupees(r.balance_paise)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {!student ? (
          <div className="flex flex-col items-center justify-center h-full min-h-64 text-center px-4 py-16">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <CreditCard className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium">Search for a student to collect fee</p>
            <p className="text-xs text-slate-400 mt-1">Type a name, admission number or parent phone number</p>
          </div>
        ) : success ? (
          /* ── Success panel ── */
          <div className="max-w-lg mx-auto py-12 px-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#1FAE7A]/10 flex items-center justify-center mx-auto">
                <CheckSquare className="w-8 h-8 text-[#1FAE7A]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">Fee collected</h2>
                <p className="text-sm text-slate-500 mt-1">Receipt {success.receipt_no}</p>
                {success.family_receipt_nos && success.family_receipt_nos.length > 1 && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    Family payment: {success.family_receipt_nos.length} receipts generated ({success.family_receipt_nos.join(", ")})
                  </p>
                )}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount collected</span>
                  <span className="font-semibold tabular-nums">₹{formatRupees(success.total_paise)}</span>
                </div>
                {success.advance_paise > 0 && (
                  <div className="flex justify-between text-[#1FAE7A]">
                    <span>Advance credit</span>
                    <span className="font-semibold tabular-nums">₹{formatRupees(success.advance_paise)}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => triggerPrint()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print <span className="text-xs text-slate-400">(P)</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert("WhatsApp receipt template sent successfully.")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1FAE7A] text-white text-sm font-medium hover:bg-[#1FAE7A]/90 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp <span className="text-xs text-white/70">(W)</span>
                </button>
                <button
                  type="button"
                  onClick={resetToSearch}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2158E0] text-white text-sm font-medium hover:bg-[#2158E0]/90 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Next <span className="text-xs text-white/70">(N)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Two-panel collect view ── */
          <div className="flex flex-col lg:flex-row gap-0 h-full">

            {/* LEFT: Student + dues / Siblings */}
            <div className="flex-1 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-auto">
              {/* Student header */}
              <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2158E0]/10 flex items-center justify-center text-[#2158E0] font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{student.name}</div>
                    <div className="text-xs text-slate-500">{student.admission_no}</div>
                  </div>
                </div>
                <button type="button" onClick={resetToSearch} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 bg-white px-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("dues")}
                  className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px cursor-pointer ${
                    activeTab === "dues"
                      ? "border-[#2158E0] text-[#2158E0]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Current Dues
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("siblings")}
                  className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "siblings"
                      ? "border-[#2158E0] text-[#2158E0]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Siblings ({siblings.length})</span>
                  {includedSiblings.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              </div>

              {activeTab === "dues" && (
                <div className="px-4 sm:px-6 py-3 space-y-1">
                  {/* Quick selectors */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const overdue = dues.filter(d => new Date(d.due_date) <= new Date());
                        setSelectedIds(new Set(overdue.length > 0 ? overdue.map(d => d.id) : dues.map(d => d.id)));
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 cursor-pointer"
                    >
                      All overdue (A)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set(dues.map(d => d.id)))}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-200 cursor-pointer"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {dues.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-slate-500">No pending dues.</p>
                    </div>
                  ) : (
                    periods.map(period => (
                      <div key={period} className="mb-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 px-1">
                          {new Date(period + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                        </div>
                        {duesByPeriod[period].map(due => {
                          const isOverdue = new Date(due.due_date) < new Date();
                          return (
                            <button
                              key={due.id}
                              type="button"
                              onClick={() => toggleDue(due.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left transition-colors cursor-pointer ${
                                selectedIds.has(due.id)
                                  ? "bg-[#2158E0]/8 border border-[#2158E0]/30"
                                  : "bg-white border border-slate-100 hover:border-slate-200"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${
                                selectedIds.has(due.id) ? "bg-[#2158E0] border-[#2158E0]" : "border-slate-300"
                              }`}>
                                {selectedIds.has(due.id) && <span className="text-white text-xs">✓</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-slate-800 truncate">{due.description || "Due"}</div>
                                <div className="text-xs text-slate-400">
                                  Due {new Date(due.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                  {isOverdue && <span className="ml-1 text-red-500 font-medium">• Overdue</span>}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-semibold tabular-nums text-slate-900">
                                  ₹{formatRupees(due.balance_paise)}
                                </div>
                                {due.concession_paise > 0 && (
                                  <div className="text-xs text-slate-400 line-through tabular-nums">₹{formatRupees(due.gross_paise)}</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Siblings tab (B7.4) */}
              {activeTab === "siblings" && (
                <div className="px-4 sm:px-6 py-4 space-y-4">
                  {siblingsLoading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading siblings…</div>
                  ) : siblings.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p>No siblings detected for this student.</p>
                      <p className="text-xs text-slate-400 mt-1">Siblings are identified by shared parent phone records.</p>
                    </div>
                  ) : (
                    siblings.map(sib => {
                      const sibTotal = sib.dues.filter(d => sib.selectedDueIds.has(d.id)).reduce((s, d) => s + d.balance_paise, 0);
                      return (
                        <div
                          key={sib.id}
                          className={`border rounded-xl p-4 transition-all ${
                            sib.includedInPayment ? "border-emerald-500 bg-emerald-50/20" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold text-sm text-slate-900">{sib.name}</div>
                              <div className="text-xs text-slate-500">{sib.admission_no} • {sib.dues.length} pending dues</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleSiblingIncluded(sib.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                sib.includedInPayment
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {sib.includedInPayment ? "✓ Added to payment" : "+ Add to this payment"}
                            </button>
                          </div>

                          {sib.dues.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                              {sib.dues.map(d => (
                                <div
                                  key={d.id}
                                  onClick={() => toggleSiblingDue(sib.id, d.id)}
                                  className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-slate-50 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={sib.selectedDueIds.has(d.id)}
                                      onChange={() => {}}
                                      className="rounded text-emerald-600"
                                    />
                                    <span className="text-slate-700">{d.description || "Due"}</span>
                                  </div>
                                  <span className="font-semibold tabular-nums">₹{formatRupees(d.balance_paise)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-slate-100">
                                <span>Total for {sib.name}:</span>
                                <span className="tabular-nums">₹{formatRupees(sibTotal)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Payment panel (sticky on desktop) */}
            <div className="w-full lg:w-96 flex flex-col bg-white">
              <div className="flex-1 overflow-auto px-4 sm:px-6 py-4 space-y-4">

                {/* Dues summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Selected dues</span>
                    <span className="font-semibold tabular-nums">₹{formatRupees(primarySelectedPaise)}</span>
                  </div>

                  {includedSiblings.length > 0 && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="text-xs font-medium">Sibling dues ({includedSiblings.length})</span>
                      <span className="font-semibold tabular-nums">+₹{formatRupees(siblingSelectedPaise)}</span>
                    </div>
                  )}

                  {appliedConcessions && (
                    <div className="flex justify-between items-center text-amber-700 bg-amber-50 px-2 py-1 rounded-md text-xs">
                      <span>Discount ({appliedConcessions.basis})</span>
                      <span className="font-semibold">Applied</span>
                    </div>
                  )}

                  {advancePaise > 0 && (
                    <div className="flex justify-between text-[#1FAE7A]">
                      <span>Advance credit</span>
                      <span className="font-semibold tabular-nums">+₹{formatRupees(advancePaise)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold">
                    <span>Net to collect</span>
                    <span className="tabular-nums text-[#2158E0] text-base">₹{formatRupees(totalSelectedPaise)}</span>
                  </div>
                </div>

                {/* Concession button (B7.5) */}
                <button
                  type="button"
                  onClick={() => setShowConcessionModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  {appliedConcessions ? "Edit ad-hoc concession" : "+ Add concession / discount"}
                </button>

                {/* Payment mode tabs */}
                {payments.map((p, idx) => (
                  <div key={p.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex overflow-x-auto border-b border-slate-100">
                      {PAYMENT_MODES.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updatePayment(p.id, { mode: m.id })}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap cursor-pointer ${
                            p.mode === m.id
                              ? "bg-[#2158E0] text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <m.icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{m.label}</span>
                          <span className="sm:hidden">{m.shortcut}</span>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-slate-500">Amount (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full mt-0.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] tabular-nums"
                            value={p.amount}
                            onChange={e => updatePayment(p.id, { amount: e.target.value })}
                          />
                        </div>
                        {payments.length > 1 && (
                          <button type="button" onClick={() => removePaymentRow(p.id)} className="self-end p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Cash: received + change */}
                      {p.mode === "cash" && (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Received (₹)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0.00"
                              className="w-full mt-0.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0] tabular-nums"
                              value={p.received ?? ""}
                              onChange={e => updatePayment(p.id, { received: e.target.value })}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Change</label>
                            <div className={`mt-0.5 px-3 py-1.5 text-sm border rounded-lg font-semibold tabular-nums ${
                              changePaise > 0 ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-400"
                            }`}>
                              ₹{formatRupees(changePaise)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reference field */}
                      {["upi", "cheque", "bank_transfer"].includes(p.mode) && (
                        <div>
                          <label className="text-xs text-slate-500">
                            {p.mode === "upi" ? "UPI reference (optional)" : p.mode === "cheque" ? "Cheque number" : "Reference"}
                          </label>
                          <input
                            type="text"
                            className="w-full mt-0.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                            value={p.reference}
                            onChange={e => updatePayment(p.id, { reference: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Split payment */}
                <button
                  type="button"
                  onClick={addPaymentRow}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-[#2158E0] border border-dashed border-[#2158E0]/40 rounded-lg hover:bg-[#2158E0]/5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Split payment
                </button>

                {/* Remarks */}
                <div>
                  <label className="text-xs text-slate-500">Remarks (optional)</label>
                  <input
                    type="text"
                    className="w-full mt-0.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Add a note…"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      {error}
                      {error.includes("confirm") && (
                        <span> <button type="button" onClick={() => navigate("/admin/fees/receipts")} className="underline cursor-pointer">View receipts</button></span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky collect button */}
              <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-white">
                <div className="flex justify-between text-xs text-slate-500 mb-3">
                  <span>Total paying</span>
                  <span className="tabular-nums font-medium text-slate-800">₹{formatRupees(totalPaymentPaise)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCollect}
                  disabled={!canCollect}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                    canCollect
                      ? "bg-[#2158E0] text-white hover:bg-[#2158E0]/90 active:scale-[.98]"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {collecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : (
                    <>Collect {totalPaymentPaise > 0 ? `₹${formatRupees(totalPaymentPaise)}` : ""} <span className="text-white/70 text-xs">(Ctrl+Enter)</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Concession Modal with PIN override (B7.5) */}
      {showConcessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Add Counter Concession</h3>
              </div>
              <button type="button" onClick={() => setShowConcessionModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Basis</label>
                <select
                  value={concessionBasis}
                  onChange={e => setConcessionBasis(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#2158E0]"
                >
                  <option value="management">Management discretion</option>
                  <option value="merit">Merit</option>
                  <option value="staff_ward">Staff ward</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={concessionType}
                    onChange={e => setConcessionType(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#2158E0]"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Value {concessionType === "percent" ? "(%)" : "(₹)"}
                  </label>
                  <input
                    type="number"
                    value={concessionVal}
                    onChange={e => setConcessionVal(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0]"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason (Required)</label>
                <input
                  type="text"
                  value={concessionReason}
                  onChange={e => setConcessionReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0]"
                  placeholder="e.g. Approved by Principal on sports scholarship"
                />
              </div>

              {/* Owner PIN check */}
              {(parseFloat(concessionVal) > (settings?.discount_approval_threshold_percent ?? 10)) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    <span>Threshold Exceeded ({settings?.discount_approval_threshold_percent ?? 10}%)</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Enter Owner PIN on the spot to override and approve immediately.
                  </p>
                  <input
                    type="password"
                    maxLength={6}
                    value={ownerPin}
                    onChange={e => setOwnerPin(e.target.value)}
                    placeholder="Enter Owner PIN"
                    className="w-full text-xs border border-amber-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono tracking-widest text-center"
                  />
                </div>
              )}

              {pinError && (
                <p className="text-xs text-red-600">{pinError}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConcessionModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyConcession}
                className="flex-1 py-2 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-[#1A46B8] cursor-pointer"
              >
                Apply Concession
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
