import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  getWebsiteMedia,
  uploadWebsiteAsset,
  deleteWebsiteMedia,
  MAX_IMAGE_FILE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
} from "../../../services/websiteService";
import type { SchoolWebsite, WebsiteMediaItem } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileImage,
  X,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Media" },
  { id: "general", label: "General" },
  { id: "logo", label: "Logos & Crests" },
  { id: "hero", label: "Hero Banners" },
  { id: "principal", label: "Leadership" },
  { id: "facilities", label: "Facilities" },
  { id: "gallery", label: "Gallery" },
];

export default function MediaLibraryPage() {
  const { school, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [mediaList, setMediaList] = useState<WebsiteMediaItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<WebsiteMediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const [webRes, mediaRes] = await Promise.all([
        getSchoolWebsite(school.id),
        getWebsiteMedia({ schoolId: school.id, category: selectedCategory }),
      ]);
      if (webRes.website) setWebsite(webRes.website);
      if (mediaRes.media) setMediaList(mediaRes.media);
    } catch (err) {
      console.warn("Failed to load media library:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school?.id, selectedCategory]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !school?.id) return;

    const file = files[0];
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
      setFeedback({
        type: "error",
        message: "Invalid file format. Please upload JPG, PNG, or WebP images.",
      });
      return;
    }
    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setFeedback({
        type: "error",
        message: "File exceeds 5MB size limit. Please compress image before upload.",
      });
      return;
    }

    setIsUploading(true);
    setFeedback(null);
    try {
      const cat = selectedCategory === "all" ? "general" : selectedCategory;
      const res = await uploadWebsiteAsset({
        schoolId: school.id,
        file,
        category: cat,
      });

      if (res.success && res.url) {
        setFeedback({ type: "success", message: `Uploaded '${file.name}' successfully.` });
        await loadMedia();
      } else {
        setFeedback({ type: "error", message: res.error || "Upload failed." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload exception";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopyUrl = (item: WebsiteMediaItem) => {
    navigator.clipboard.writeText(item.file_url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!school?.id || !deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await deleteWebsiteMedia({
        schoolId: school.id,
        mediaId: deletingItem.id,
        userRole,
      });

      if (res.success) {
        setMediaList((prev) => prev.filter((m) => m.id !== deletingItem.id));
        setFeedback({ type: "success", message: `Media '${deletingItem.file_name}' removed.` });
        setDeletingItem(null);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to delete media." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete exception";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMedia = mediaList.filter((m) =>
    m.file_name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Media Library"
        description="Centralized repository for all images, banners, crests, and photographs used across your school website."
        website={website}
        actions={
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? "Uploading..." : "Upload Image"}
            </button>
          </div>
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by file name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Media Grid */}
      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between group hover:border-slate-300 transition-all"
            >
              {/* Thumbnail Container */}
              <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                <img
                  src={item.file_url}
                  alt={item.file_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Hover Quick Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item)}
                    className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow"
                    title="Copy Public Image URL"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow"
                    title="View Full Image in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setDeletingItem(item)}
                    className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Meta Info */}
              <div className="p-3 space-y-1">
                <div
                  className="text-xs font-semibold text-slate-800 truncate"
                  title={item.file_name}
                >
                  {item.file_name}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize">{item.category}</span>
                  <span>{formatFileSize(item.file_size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No Media Files Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Upload campus photos, school logos, and banner illustrations to reuse them across your website.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            <Upload className="w-3.5 h-3.5" /> Select File to Upload
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Media Item?</h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Are you sure you want to delete <span className="font-semibold text-slate-800">"{deletingItem.file_name}"</span>? Any page currently referencing this image will need to be updated.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
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
