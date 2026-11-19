import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  getWebsitePages,
  createWebsitePage,
  updateWebsitePage,
  deleteWebsitePage,
  toggleWebsitePage,
  reorderWebsitePages,
  normalizePageSlug,
  formatSchoolWebsiteUrl,
} from "../../../services/websiteService";
import type { SchoolWebsite, WebsitePage } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import {
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  X,
  Check,
  FileText,
} from "lucide-react";

const SYSTEM_DEFAULT_SLUGS = ["home", "about", "academics", "admissions", "contact"];

export default function PagesManagementPage() {
  const { school, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newType, setNewType] = useState("custom");
  const [isCreating, setIsCreating] = useState(false);

  // Edit Modal State
  const [editingPage, setEditingPage] = useState<WebsitePage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirm Modal
  const [deletingPage, setDeletingPage] = useState<WebsitePage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const webRes = await getSchoolWebsite(school.id);
      if (webRes.website) {
        setWebsite(webRes.website);
        const pagesRes = await getWebsitePages(webRes.website.id);
        setPages(pagesRes.pages);
      }
    } catch (err) {
      console.warn("Failed to load website pages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Page
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !website?.id) return;
    if (!newTitle.trim()) {
      setFeedback({ type: "error", message: "Page title is required." });
      return;
    }
    const cleanSlug = normalizePageSlug(newSlug || newTitle);
    if (!cleanSlug) {
      setFeedback({ type: "error", message: "Valid URL slug is required." });
      return;
    }

    setIsCreating(true);
    try {
      const res = await createWebsitePage({
        schoolId: school.id,
        websiteId: website.id,
        slug: cleanSlug,
        title: newTitle.trim(),
        pageType: newType,
        userRole,
      });

      if (res.success && res.page) {
        setPages((prev) => [...prev, res.page!]);
        setIsCreateOpen(false);
        setNewTitle("");
        setNewSlug("");
        setFeedback({ type: "success", message: `Page '${res.page.title}' created successfully.` });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to create page." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Creation failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Edit Page
  const handleUpdatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !website?.id || !editingPage) return;

    setIsUpdating(true);
    try {
      const res = await updateWebsitePage({
        schoolId: school.id,
        websiteId: website.id,
        pageId: editingPage.id,
        title: editTitle.trim(),
        slug: editSlug.trim(),
        isEnabled: editEnabled,
        userRole,
      });

      if (res.success && res.page) {
        setPages((prev) => prev.map((p) => (p.id === editingPage.id ? res.page! : p)));
        setEditingPage(null);
        setFeedback({ type: "success", message: "Page updated successfully." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update page." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Toggle Visibility
  const handleToggle = async (page: WebsitePage) => {
    if (!school?.id || !website?.id) return;
    const nextState = !page.is_enabled;
    const res = await toggleWebsitePage({
      schoolId: school.id,
      websiteId: website.id,
      pageId: page.id,
      isEnabled: nextState,
      userRole,
    });

    if (res.success) {
      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, is_enabled: nextState } : p))
      );
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to toggle page status." });
    }
  };

  // Handle Delete Page
  const handleDeletePage = async () => {
    if (!school?.id || !website?.id || !deletingPage) return;
    setIsDeleting(true);
    try {
      const res = await deleteWebsitePage({
        schoolId: school.id,
        websiteId: website.id,
        pageId: deletingPage.id,
        userRole,
      });

      if (res.success) {
        setPages((prev) => prev.filter((p) => p.id !== deletingPage.id));
        setFeedback({ type: "success", message: `Page '${deletingPage.title}' deleted.` });
        setDeletingPage(null);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to delete page." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  // Reordering
  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!school?.id || !website?.id) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const reordered = [...pages];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setPages(reordered);

    const orderedIds = reordered.map((p) => p.id);
    await reorderWebsitePages({
      schoolId: school.id,
      websiteId: website.id,
      orderedPageIds: orderedIds,
      userRole,
    });
  };

  const publicUrl = school?.subdomain ? formatSchoolWebsiteUrl(school.subdomain) : "";

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Pages Management"
        description="Create, reorder, publish, and customize individual website pages and navigation structure."
        website={website}
        actions={
          <button
            type="button"
            onClick={() => {
              setNewTitle("");
              setNewSlug("");
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Page
          </button>
        }
      />

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pages Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Navigation Menu & Page Hierarchy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reorder pages using the arrows to adjust their order in your school's header navigation.
            </p>
          </div>

          <span className="text-xs font-medium text-slate-500 self-start sm:self-auto">
            {pages.length} total pages ({pages.filter((p) => p.is_enabled).length} visible)
          </span>
        </div>

        {pages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Order</th>
                  <th className="py-3 px-4">Page Title</th>
                  <th className="py-3 px-4">URL Route</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pages.map((p, idx) => {
                  const isSystem = SYSTEM_DEFAULT_SLUGS.includes(p.slug.toLowerCase());
                  const isHome = p.slug === "home";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order Controls */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, "up")}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-slate-500 w-4">
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={idx === pages.length - 1}
                            onClick={() => handleMove(idx, "down")}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Page Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{p.title}</span>
                          {isHome && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Landing
                            </span>
                          )}
                          {isSystem && !isHome && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              Default
                            </span>
                          )}
                        </div>
                      </td>

                      {/* URL Route */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {p.slug === "home" ? "/" : `/${p.slug}`}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-xs text-slate-600">
                          {p.page_type}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          disabled={isHome}
                          onClick={() => handleToggle(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            p.is_enabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          } ${isHome ? "cursor-not-allowed opacity-80" : "hover:opacity-90"}`}
                        >
                          {p.is_enabled ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" /> Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-400" /> Hidden
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPage(p);
                              setEditTitle(p.title);
                              setEditSlug(p.slug);
                              setEditEnabled(p.is_enabled);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Page"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete button (guarded against default pages) */}
                          {!isSystem ? (
                            <button
                              type="button"
                              onClick={() => setDeletingPage(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Page"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                              title="System default pages cannot be deleted"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No pages initialized</p>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Website Page</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Page Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newSlug || newSlug === normalizePageSlug(newTitle)) {
                      setNewSlug(normalizePageSlug(e.target.value));
                    }
                  }}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Annual Celebrations"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 text-xs bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-500">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={newSlug}
                    onChange={(e) => setNewSlug(normalizePageSlug(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="annual-celebrations"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Alphanumeric characters and hyphens only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Page Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="custom">Custom Content Page</option>
                  <option value="academics">Curriculum / Academics</option>
                  <option value="facilities">Campus Infrastructure</option>
                  <option value="gallery">Photo Showcase</option>
                  <option value="news">News & Notices</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-60"
                >
                  {isCreating ? "Creating..." : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Page: {editingPage.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Page Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 text-xs bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-500">
                    /
                  </span>
                  <input
                    type="text"
                    disabled={editingPage.slug === "home"}
                    value={editSlug}
                    onChange={(e) => setEditSlug(normalizePageSlug(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-r-lg disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                {editingPage.slug === "home" && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    The Home page landing route cannot be altered.
                  </p>
                )}
              </div>

              {editingPage.slug !== "home" && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">
                    Visible in Header Navigation
                  </span>
                  <input
                    type="checkbox"
                    checked={editEnabled}
                    onChange={(e) => setEditEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-60"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Custom Page?</h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Are you sure you want to delete <span className="font-semibold text-slate-800">"{deletingPage.title}"</span>? This will remove its navigation link from your public website.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPage(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePage}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
