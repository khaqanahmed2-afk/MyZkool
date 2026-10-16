import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Send,
  Ban,
  RotateCcw,
} from "lucide-react";
import type { ReminderDispatchLog } from "../../../types/duesReminders";
import {
  getReminderHistory,
  retryFailedReminder,
  cancelScheduledReminder,
} from "../../../services/duesRemindersService";

interface ReminderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  initialStudentId?: string;
  initialInvoiceNo?: string;
}

export function ReminderHistoryModal({
  isOpen,
  onClose,
  schoolId,
  initialStudentId,
  initialInvoiceNo,
}: ReminderHistoryModalProps) {
  const [logs, setLogs] = useState<ReminderDispatchLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getReminderHistory(schoolId, {
        studentId: initialStudentId,
        invoiceNo: initialInvoiceNo,
      });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, schoolId, initialStudentId, initialInvoiceNo]);

  const handleRetry = async (logId: string) => {
    setActionLoadingId(logId);
    try {
      await retryFailedReminder(schoolId, logId);
      await fetchLogs();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (logId: string) => {
    if (confirm("Are you sure you want to cancel this scheduled reminder?")) {
      setActionLoadingId(logId);
      try {
        await cancelScheduledReminder(schoolId, logId);
        await fetchLogs();
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.studentName.toLowerCase().includes(q) ||
        log.admissionNo.toLowerCase().includes(q) ||
        log.invoiceNo.toLowerCase().includes(q) ||
        log.recipientPhone.includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: ReminderDispatchLog["status"]) => {
    switch (status) {
      case "delivered":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Delivered</span>;
      case "sent":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Sent</span>;
      case "scheduled":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Scheduled</span>;
      case "queued":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Queued</span>;
      case "failed":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">Failed</span>;
      case "cancelled":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF3] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#141A2E]">Reminder Delivery History</h2>
              <p className="text-[11px] text-[#5B6478]">
                Audit trail of dispatched, delivered, scheduled, and failed payment reminders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-[#E6EAF3] bg-slate-50/60 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search student, adm no., invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E]"
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="scheduled">Scheduled</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              type="button"
              onClick={fetchLogs}
              className="p-1.5 bg-white border border-[#E6EAF3] rounded-lg text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 text-center text-xs text-gray-400">Loading delivery logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-500 space-y-1">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">No reminder logs found</p>
              <p className="text-[11px] text-gray-400">Reminders sent from the Dues table will appear here.</p>
            </div>
          ) : (
            <div className="border border-[#E6EAF3] rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478]">
                    <th className="py-2.5 px-3">Student & Invoice</th>
                    <th className="py-2.5 px-3">Recipient & Channel</th>
                    <th className="py-2.5 px-3">Template</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-[#141A2E]">{log.studentName}</p>
                        <p className="text-[10px] text-[#5B6478]">{log.invoiceNo} • {log.admissionNo}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-[#141A2E]">{log.recipientPhone || "—"}</p>
                        <span className="text-[10px] text-gray-500 capitalize flex items-center gap-1">
                          {log.channel === "whatsapp" ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ) : (
                            <Smartphone className="w-2.5 h-2.5 text-blue-500" />
                          )}
                          {log.channel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-[#141A2E] truncate max-w-[150px]">{log.templateName}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{log.messageBody}</p>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-[#5B6478]">
                        <p>{new Date(log.scheduledAt).toLocaleDateString("en-IN")}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(log.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>
                      <td className="py-2.5 px-3">
                        {getStatusBadge(log.status)}
                        {log.error && (
                          <p className="text-[9px] text-red-600 mt-0.5 truncate max-w-[120px]" title={log.error}>
                            {log.error}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {log.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => handleRetry(log.id)}
                            disabled={actionLoadingId === log.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        )}
                        {log.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => handleCancel(log.id)}
                            disabled={actionLoadingId === log.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-semibold border border-red-200"
                          >
                            <Ban className="w-3 h-3" /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E6EAF3] bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#5B6478]">
            Showing {filteredLogs.length} reminder entries
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
