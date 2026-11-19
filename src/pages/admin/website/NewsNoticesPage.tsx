import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  getWebsitePosts,
  createWebsitePost,
  updateWebsitePost,
  deleteWebsitePost,
} from "../../../services/websiteService";
import type { SchoolWebsite, WebsitePost, WebsitePostCategory } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import { ImageUploadField } from "../../../components/onboarding/website/ImageUploadField";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  EyeOff,
  Bell,
  Sparkles,
  X,
  FileText,
} from "lucide-react";

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "all", label: "All Posts" },
  { id: "announcement", label: "Announcements" },
  { id: "news", label: "School News" },
  { id: "event", label: "Events & Meets" },
  { id: "notice", label: "Official Circulars" },
];

export default function NewsNoticesPage() {
  const { school, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [posts, setPosts] = useState<WebsitePost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<WebsitePost | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WebsitePostCategory>("announcement");
  const [featuredImage, setFeaturedImage] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [publicationDate, setPublicationDate] = useState(new Date().toISOString().split("T")[0]);
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingPost, setDeletingPost] = useState<WebsitePost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const [webRes, postsRes] = await Promise.all([
        getSchoolWebsite(school.id),
        getWebsitePosts({
          schoolId: school.id,
          category: selectedCategory === "all" ? undefined : selectedCategory,
        }),
      ]);
      if (webRes.website) setWebsite(webRes.website);
      if (postsRes.posts) setPosts(postsRes.posts);
    } catch (err) {
      console.warn("Failed to load posts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school?.id, selectedCategory]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleOpenCreate = () => {
    setEditingPost(null);
    setTitle("");
    setDescription("");
    setCategory("announcement");
    setFeaturedImage("");
    setEventDate("");
    setPublicationDate(new Date().toISOString().split("T")[0]);
    setIsPublished(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: WebsitePost) => {
    setEditingPost(p);
    setTitle(p.title);
    setDescription(p.description);
    setCategory(p.category as WebsitePostCategory);
    setFeaturedImage(p.featured_image || "");
    setEventDate(p.event_date ? p.event_date.split("T")[0] : "");
    setPublicationDate(p.publication_date ? p.publication_date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setIsPublished(p.is_published);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !title.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (editingPost) {
        const res = await updateWebsitePost({
          schoolId: school.id,
          postId: editingPost.id,
          post: {
            title: title.trim(),
            description: description.trim(),
            category,
            featured_image: featuredImage || null,
            event_date: eventDate ? new Date(eventDate).toISOString() : null,
            publication_date: new Date(publicationDate).toISOString(),
            is_published: isPublished,
            status: isPublished ? "published" : "draft",
          },
          userRole,
        });

        if (res.success && res.post) {
          setPosts((prev) => prev.map((item) => (item.id === editingPost.id ? res.post! : item)));
          setIsModalOpen(false);
          setFeedback({ type: "success", message: "Post updated successfully." });
        } else {
          setFeedback({ type: "error", message: res.error || "Update failed." });
        }
      } else {
        const res = await createWebsitePost({
          schoolId: school.id,
          websiteId: website?.id,
          post: {
            title: title.trim(),
            description: description.trim(),
            category,
            featured_image: featuredImage || null,
            event_date: eventDate ? new Date(eventDate).toISOString() : null,
            publication_date: new Date(publicationDate).toISOString(),
            is_published: isPublished,
            status: isPublished ? "published" : "draft",
          },
          userRole,
        });

        if (res.success && res.post) {
          setPosts((prev) => [res.post!, ...prev]);
          setIsModalOpen(false);
          setFeedback({ type: "success", message: "New update published successfully." });
        } else {
          setFeedback({ type: "error", message: res.error || "Creation failed." });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!school?.id || !deletingPost) return;
    setIsDeleting(true);
    try {
      const res = await deleteWebsitePost({
        schoolId: school.id,
        postId: deletingPost.id,
        userRole,
      });

      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== deletingPost.id));
        setFeedback({ type: "success", message: `Post '${deletingPost.title}' deleted.` });
        setDeletingPost(null);
      } else {
        setFeedback({ type: "error", message: res.error || "Delete failed." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete exception";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (p: WebsitePost) => {
    if (!school?.id) return;
    const nextState = !p.is_published;
    const res = await updateWebsitePost({
      schoolId: school.id,
      postId: p.id,
      post: {
        is_published: nextState,
        status: nextState ? "published" : "draft",
      },
      userRole,
    });

    if (res.success && res.post) {
      setPosts((prev) => prev.map((item) => (item.id === p.id ? res.post! : item)));
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (statusFilter === "published" && !p.is_published) return false;
    if (statusFilter === "draft" && p.is_published) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "news":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">School News</span>;
      case "event":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Event</span>;
      case "notice":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Notice</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Announcement</span>;
    }
  };

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="News, Notices & Events"
        description="Publish circulars, upcoming events, academic notices, and school news directly on your public website."
        website={website}
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Post
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

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {filteredPosts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                      <Bell className="w-6 h-6" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{post.title}</h4>
                      {getCategoryBadge(post.category)}
                      {post.is_published ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Published
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          Draft
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 max-w-2xl">
                      {post.description}
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-0.5">
                      <span>
                        Published: {new Date(post.publication_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {post.event_date && (
                        <span className="text-purple-600 font-medium">
                          Event Date: {new Date(post.event_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(post)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                    title={post.is_published ? "Unpublish" : "Publish"}
                  >
                    {post.is_published ? (
                      <EyeOff className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(post)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                    title="Edit Post"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingPost(post)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                    title="Delete Post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">No Posts Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Create an announcement or circular to keep students, parents, and prospective families updated.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              <Plus className="w-3.5 h-3.5" /> Create Announcement
            </button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingPost ? "Edit Website Post" : "Create New Post or Announcement"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Post Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Annual Sports Day 2026 Registration Open"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WebsitePostCategory)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="news">School News</option>
                    <option value="event">Event</option>
                    <option value="notice">Official Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Date
                  </label>
                  <input
                    type="date"
                    required
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {category === "event" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Content / Details *
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide full announcement details, timings, venues, and contact information..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Featured Image (Optional)
                </label>
                <ImageUploadField
                  label="Upload Banner Image"
                  value={featuredImage}
                  onChange={(url) => setFeaturedImage(url)}
                  onRemove={() => setFeaturedImage("")}
                  schoolId={school?.id || ""}
                  category="general"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Publish Immediately</div>
                  <div className="text-[11px] text-slate-500">
                    If unchecked, post will be saved as a draft and hidden from visitors.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : editingPost ? "Save Changes" : "Publish Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Post?</h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Are you sure you want to delete <span className="font-semibold text-slate-800">"{deletingPost.title}"</span>? This will permanently remove it from your public website.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPost(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
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
