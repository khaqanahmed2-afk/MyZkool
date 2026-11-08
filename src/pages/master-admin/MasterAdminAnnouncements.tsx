import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  Users,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type { PlatformAnnouncement } from "../../services/masterAdminSettingsService";

export const MasterAdminAnnouncements: React.FC = () => {
  const { hasPermission } = useMasterAdminAuth();
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New announcement form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<PlatformAnnouncement["type"]>("announcement");
  const [targetAudience, setTargetAudience] = useState<PlatformAnnouncement["target_audience"]>("all");
  const [expiresAt, setExpiresAt] = useState("");

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/master-admin/announcements");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAnnouncements(json.data);
      }
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/master-admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          type,
          targetAudience,
          expiresAt: expiresAt || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setTitle("");
        setContent("");
        setType("announcement");
        setTargetAudience("all");
        setExpiresAt("");
        await fetchAnnouncements();
      } else {
        alert(json.error || "Failed to create announcement");
      }
    } catch (err) {
      alert("Error creating announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this announcement broadcast?")) return;

    try {
      const res = await fetch(`/api/master-admin/announcements/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      alert("Failed to delete announcement.");
    }
  };

  const filtered = announcements.filter((a) => {
    if (filterType === "all") return true;
    return a.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Announcements</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Broadcast System
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Broadcast platform-wide updates, scheduled maintenance windows, and feature releases to schools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnnouncements}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Refresh announcements"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {hasPermission("announcements.publish") && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              New Broadcast
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {[
          { label: "All Broadcasts", val: "all" },
          { label: "System Maintenance", val: "maintenance" },
          { label: "Feature Updates", val: "feature_update" },
          { label: "Critical Alerts", val: "critical" },
          { label: "General", val: "announcement" },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setFilterType(tab.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterType === tab.val
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Loading platform announcements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No announcements found</p>
            <p className="text-xs text-slate-400 mt-1">
              Publish a broadcast to notify school administrators across the platform.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isMaintenance = item.type === "maintenance";
            const isCritical = item.type === "critical";
            const isFeature = item.type === "feature_update";

            return (
              <div
                key={item.id}
                className={`p-5 rounded-xl border transition ${
                  isCritical
                    ? "bg-rose-50/50 border-rose-200"
                    : isMaintenance
                    ? "bg-amber-50/50 border-amber-200"
                    : isFeature
                    ? "bg-emerald-50/50 border-emerald-200"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isCritical
                          ? "bg-rose-100 text-rose-700"
                          : isMaintenance
                          ? "bg-amber-100 text-amber-700"
                          : isFeature
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isCritical ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isMaintenance ? (
                        <Clock className="w-5 h-5" />
                      ) : isFeature ? (
                        <Sparkles className="w-5 h-5" />
                      ) : (
                        <Megaphone className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                            isCritical
                              ? "bg-rose-100 text-rose-800"
                              : isMaintenance
                              ? "bg-amber-100 text-amber-800"
                              : isFeature
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.type.replace("_", " ")}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Users className="w-3.5 h-3.5" />
                          Target: <strong className="capitalize">{item.target_audience.replace("_", " ")}</strong>
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
                        <span>Published by {item.published_by_name || "Platform Admin"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {hasPermission("announcements.publish") && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compose Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Broadcast Platform Announcement</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target institutional administrators with important updates or maintenance notifications.
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label htmlFor="announcement-title" className="block text-xs font-semibold text-slate-700 mb-1">Broadcast Title</label>
                <input
                  id="announcement-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Scheduled System Upgrade Sunday 2 AM"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="announcement-type" className="block text-xs font-semibold text-slate-700 mb-1">Broadcast Type</label>
                  <select
                    id="announcement-type"
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="announcement">General Announcement</option>
                    <option value="maintenance">Maintenance Window</option>
                    <option value="feature_update">Feature Release</option>
                    <option value="critical">Critical Urgent Notice</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="announcement-target-audience" className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    id="announcement-target-audience"
                    name="targetAudience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Schools</option>
                    <option value="pro_plan">Pro Plan Schools Only</option>
                    <option value="basic_plan">Basic Plan Schools Only</option>
                    <option value="trial">Trial Schools Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="announcement-content" className="block text-xs font-semibold text-slate-700 mb-1">Message Content</label>
                <textarea
                  id="announcement-content"
                  name="content"
                  required
                  rows={4}
                  placeholder="Provide detailed description, affected modules, and guidance for school administrators..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="announcement-expires-at" className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="announcement-expires-at"
                  name="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : "Publish Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAdminAnnouncements;
