import React, { useState, useRef } from "react";
import { Upload, X, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { uploadWebsiteAsset } from "../../../services/websiteService";

interface ImageUploadFieldProps {
  label: string;
  description?: string;
  value?: string;
  schoolId: string;
  category: "logo" | "hero" | "principal" | "gallery" | "facilities" | "general" | string;
  aspectRatioHint?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  description,
  value,
  schoolId,
  category,
  aspectRatioHint = "JPG, PNG, or WebP up to 5MB",
  onChange,
  onRemove,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const res = await uploadWebsiteAsset({
        schoolId,
        file,
        category,
      });

      if (!res.success || !res.url) {
        setError(res.error || "Failed to upload image. Please try again.");
      } else {
        onChange(res.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    // Reset file input so re-selecting same file triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#141A2E]">{label}</label>
        {aspectRatioHint && (
          <span className="text-[11px] text-[#94A3B8]">{aspectRatioHint}</span>
        )}
      </div>

      {description && <p className="text-xs text-[#5B6478]">{description}</p>}

      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {value ? (
        <div className="relative group rounded-xl border border-[#E6EAF3] bg-slate-50 p-3 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-white border border-[#E2E8F0] overflow-hidden flex items-center justify-center shrink-0">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback for broken image
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='9' cy='9' r='2'%3E%3C/circle%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'%3E%3C/path%3E%3C/svg%3E";
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#10B981]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Image uploaded</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] truncate mt-0.5 max-w-[240px]">
              {value}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#141A2E] transition-colors cursor-pointer disabled:opacity-50"
              title="Replace image"
            >
              <RefreshCw className={`w-3 h-3 ${isUploading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Replace</span>
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => {
                onChange("");
                if (onRemove) onRemove();
              }}
              className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-red-50 hover:text-red-600 text-xs text-[#5B6478] transition-colors cursor-pointer disabled:opacity-50"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
            isDragOver
              ? "border-[#2158E0] bg-blue-50/50"
              : "border-[#E2E8F0] hover:border-[#CBD5E1] bg-slate-50/50 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            onChange={handleInputChange}
          />
          {isUploading ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-[#2158E0]">Uploading image...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-[#141A2E]">
                Click to browse or drag & drop photo
              </p>
              <p className="text-[11px] text-[#94A3B8]">
                Supports JPG, PNG, WebP up to 5MB
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
