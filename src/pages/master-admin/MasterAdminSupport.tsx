import React, { useState, useEffect } from "react";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type {
  MasterAdminTicket,
  MasterAdminTicketMessage,
} from "../../services/masterAdminSupportService";
import {
  Headphones,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  Send,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  X,
} from "lucide-react";

export default function MasterAdminSupport() {
  const { token, admin, hasPermission } = useMasterAdminAuth();

  const [tickets, setTickets] = useState<MasterAdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Selected Ticket Drawer State
  const [selectedTicket, setSelectedTicket] = useState<MasterAdminTicket | null>(null);
  const [messages, setMessages] = useState<MasterAdminTicketMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        priority: priorityFilter,
      });

      const res = await fetch(`/api/master-admin/support/tickets?${params}`, {
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTickets(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, token]);

  const loadTicketDetail = async (ticket: MasterAdminTicket) => {
    setSelectedTicket(ticket);
    try {
      const res = await fetch(`/api/master-admin/support/tickets/${ticket.id}`, {
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMessages(json.data.messages || []);
      }
    } catch (err) {
      console.warn("Failed to load ticket details:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setIsSending(true);

    try {
      const res = await fetch(`/api/master-admin/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: replyText.trim(),
          isInternalNote,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages((prev) => [...prev, json.data]);
        setReplyText("");
        setIsInternalNote(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to post message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "in_progress" | "resolved" | "closed") => {
    if (!selectedTicket) return;

    try {
      const res = await fetch(`/api/master-admin/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          resolutionSummary: newStatus === "resolved" ? "Resolved via support drawer." : undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setSelectedTicket(json.data);
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
            Support Center & Helpdesk
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Triage school partner queries, resolve technical issues, and coordinate internal operator notes.
          </p>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">Open Tickets</p>
          <p className="text-xl font-bold text-blue-600 font-heading mt-1">12</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting resolution</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">Urgent Priority</p>
          <p className="text-xl font-bold text-rose-600 font-heading mt-1">2</p>
          <p className="text-[10px] text-rose-500 font-semibold mt-0.5">Immediate attention</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">In Progress</p>
          <p className="text-xl font-bold text-amber-600 font-heading mt-1">5</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Assigned to agents</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">Resolved (30d)</p>
          <p className="text-xl font-bold text-emerald-600 font-heading mt-1">84</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">96.4% SLA adherence</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {["all", "open", "in_progress", "resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Ticket #</th>
                <th className="py-3 px-4">School & Contact</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                    {t.ticket_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900 truncate max-w-xs">{t.school_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{t.creator_name}</p>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-md truncate">
                    {t.subject}
                  </td>
                  <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-slate-600">
                    {t.category}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.priority === "urgent"
                          ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                          : t.priority === "high"
                          ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        t.status === "resolved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                          : t.status === "in_progress"
                          ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                          : "bg-blue-50 text-blue-700 border border-blue-200/80"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => loadTicketDetail(t)}
                      className="px-2.5 py-1 text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Open Thread →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversation Thread Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-blue-600">
                    {selectedTicket.ticket_number}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                    {selectedTicket.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1 font-heading">
                  {selectedTicket.subject}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedTicket.school_name} · {selectedTicket.creator_name}
                </p>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                    m.is_internal_note
                      ? "bg-amber-50/80 border border-amber-200/90 text-amber-900"
                      : m.sender_type === "platform_admin"
                      ? "bg-blue-50/80 border border-blue-200/80 text-blue-950 ml-6"
                      : "bg-slate-50 border border-slate-200/80 text-slate-900 mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {m.is_internal_note && <Lock className="w-3 h-3 text-amber-600" />}
                      {m.sender_name}
                      {m.is_internal_note && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-800">
                          INTERNAL NOTE (Hidden from School)
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="leading-relaxed">{m.message}</p>
                </div>
              ))}
            </div>

            {/* Status Quick Actions & Reply Composer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Ticket Lifecycle:</span>
                <div className="flex items-center gap-2">
                  {selectedTicket.status !== "in_progress" && (
                    <button
                      onClick={() => handleUpdateStatus("in_progress")}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                    >
                      Mark In Progress
                    </button>
                  )}
                  {selectedTicket.status !== "resolved" && (
                    <button
                      onClick={() => handleUpdateStatus("resolved")}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                    >
                      Resolve Ticket
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Post as Internal Staff Note (Never visible to school users)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? "Add private note for platform operators..."
                        : "Type public reply to school administrator..."
                    }
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-2xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer ${
                      isInternalNote
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

