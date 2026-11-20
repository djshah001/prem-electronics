import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  Trash2,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Link as LinkIcon,
  GripHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../api/axiosClient";
import { toast } from "sonner";

export interface MediaDropzoneProps {
  images: string[];
  onChange: (images: string[]) => void;
  uploadType?: "product" | "category" | "blog" | "banner";
  ratio?: "1:1" | "freeform";
  maxFiles?: number;
  minDimensions?: string;
  maxDimensions?: string;
  aspectRatioLabel?: string;
  title?: string;
}

export function MediaDropzone({
  images,
  onChange,
  uploadType = "product",
  ratio = "1:1",
  maxFiles = 30,
  minDimensions = "500 × 500 px",
  maxDimensions = "1000 × 1000 px",
  aspectRatioLabel = "Auto 1:1 Square (No Padding)",
  title = "Product Images",
}: MediaDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    done: number;
  }>({ total: 0, done: 0 });
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Drag-to-reorder state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Filter out any blank strings
  const validImages = images.filter((img) => Boolean(img && img.trim()));

  // Core upload handler accepting an array of File objects
  const processFiles = useCallback(
    async (rawFiles: FileList | File[]) => {
      const fileList = Array.from(rawFiles).filter((file) =>
        [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/avif",
        ].includes(file.type),
      );

      if (fileList.length === 0) {
        toast.error("Please select valid image files (JPEG, PNG, WebP, AVIF).");
        return;
      }

      if (validImages.length + fileList.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} images allowed per product.`);
        return;
      }

      setUploading(true);
      setUploadProgress({ total: fileList.length, done: 0 });

      const formData = new FormData();
      formData.append("type", uploadType);
      if (ratio === "1:1") formData.append("ratio", "1:1");

      fileList.forEach((file) => {
        formData.append("images", file);
      });

      try {
        const queryParams = new URLSearchParams();
        queryParams.set("type", uploadType);
        if (ratio === "1:1") queryParams.set("ratio", "1:1");

        const res = await api.postForm<{ urls: string[] }>(
          `/upload?${queryParams.toString()}`,
          formData,
        );
        const uploadedUrls = res.data?.urls ?? [];

        if (uploadedUrls.length > 0) {
          onChange([...validImages, ...uploadedUrls]);
          toast.success(
            `${uploadedUrls.length} image${uploadedUrls.length > 1 ? "s" : ""} uploaded and auto-optimized to 1:1 WebP!`,
          );
        } else {
          toast.error("No images returned from server.");
        }
      } catch (err: any) {
        toast.error(
          err?.message ||
            "Failed to upload images. Check file sizes and format.",
        );
      } finally {
        setUploading(false);
        setUploadProgress({ total: 0, done: 0 });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [maxFiles, onChange, ratio, uploadType, validImages],
  );

  // Native input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(e.target.files);
    }
  };

  // Drag and Drop Zone Event Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void processFiles(e.dataTransfer.files);
    }
  };

  // Reordering: Set image as primary cover (index 0)
  const setCover = (index: number) => {
    if (index === 0) return;
    const item = validImages[index];
    const remaining = validImages.filter((_, i) => i !== index);
    onChange([item, ...remaining]);
    toast.success("Cover image updated");
  };

  // Reordering: Move left / right
  const moveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= validImages.length) return;
    const updated = [...validImages];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onChange(updated);
  };

  // Remove image
  const removeImage = (index: number) => {
    const updated = validImages.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Drag to reorder within gallery
  const handleThumbnailDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const handleThumbnailDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleThumbnailDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...validImages];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    onChange(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleThumbnailDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Add pasted URLs
  const handleAddUrls = () => {
    const raw = urlInputValue.trim();
    if (!raw) return;
    const splitUrls = raw
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(
        (u) =>
          u.startsWith("http://") ||
          u.startsWith("https://") ||
          u.startsWith("/uploads/"),
      );

    if (splitUrls.length === 0) {
      toast.error("Please enter valid HTTP or /uploads image URLs.");
      return;
    }

    onChange([...validImages, ...splitUrls]);
    setUrlInputValue("");
    setShowUrlInput(false);
    toast.success(
      `Added ${splitUrls.length} image URL${splitUrls.length > 1 ? "s" : ""}`,
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Header & Action Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-primary" /> {title}
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
            {validImages.length} {validImages.length === 1 ? "image" : "images"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlInput((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? "Hide URL Input" : "Paste URLs"}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-60 cursor-pointer shadow-xs"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            <span>{uploading ? "Uploading..." : "Browse Images"}</span>
          </button>
        </div>
      </div>

      {/* Hidden file input supporting multiple files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ── Interactive Drag & Drop Zone ── */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center select-none ${
          isDragging
            ? "border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.008]"
            : "border-border hover:border-primary/50 bg-gradient-to-b from-card/60 via-card/30 to-background hover:bg-card/80"
        } ${uploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <div className="flex flex-col items-center max-w-md">
          {/* Animated Center Icon */}
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300 ${
              isDragging
                ? "border-primary bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/25"
                : "border-primary/20 bg-primary/10 text-primary group-hover:scale-105 group-hover:border-primary/40"
            }`}
          >
            {uploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            ) : isDragging ? (
              <Sparkles className="h-7 w-7 animate-bounce text-white" />
            ) : (
              <UploadCloud className="h-7 w-7 transition-transform group-hover:-translate-y-0.5" />
            )}
          </div>

          {/* Prompt Copy */}
          <div className="mt-3.5">
            {uploading ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {uploadProgress.total > 0
                    ? `Uploading ${uploadProgress.total} image${uploadProgress.total > 1 ? "s" : ""}...`
                    : "Processing & Uploading Images..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Auto-adjusting to 1:1 square & compressing to high-fidelity
                  WebP
                </p>
              </div>
            ) : isDragging ? (
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-primary">
                  Drop images now to upload
                </p>
                <p className="text-xs text-primary/80">
                  Multiple files will be uploaded together automatically
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-primary hover:underline">
                    Click to browse
                  </span>{" "}
                  or drag and drop images here
                </p>
                <p className="text-xs text-muted-foreground">
                  Select multiple files at once • JPEG, PNG, WebP, AVIF up to
                  15MB each
                </p>
              </div>
            )}
          </div>

          {/* Quick Specs Pill */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-medium">
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 border border-border/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />{" "}
              {aspectRatioLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 border border-border/80">
              Min: {minDimensions} • Max: {maxDimensions}
            </span>
          </div>
        </div>
      </div>

      {/* ── Optional Paste URLs Accordion ── */}
      <AnimatePresence>
        {showUrlInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-primary" /> Paste Image
                  URLs directly
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Separate with commas or newlines
                </span>
              </div>
              <textarea
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                rows={3}
                placeholder="https://example.com/product-front.jpg&#10;https://example.com/product-angle.jpg"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddUrls}
                  disabled={!urlInputValue.trim()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  Add URLs to Gallery
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Visual Image Gallery with Reorder & Cover Badges ── */}
      {validImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium flex items-center gap-1.5">
              <GripHorizontal className="w-3.5 h-3.5" />
              <span>
                Drag to reorder • First image is the primary storefront cover
              </span>
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-destructive hover:underline font-semibold"
            >
              Remove All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {validImages.map((url, i) => {
              const isCover = i === 0;
              const isTargetDrop = dragOverIndex === i;

              return (
                <div
                  key={`${url}-${i}`}
                  draggable
                  onDragStart={(e) => handleThumbnailDragStart(e, i)}
                  onDragOver={(e) => handleThumbnailDragOver(e, i)}
                  onDrop={(e) => handleThumbnailDrop(e, i)}
                  onDragEnd={handleThumbnailDragEnd}
                  className={`group relative aspect-square rounded-xl overflow-hidden border bg-muted flex items-center justify-center transition-all duration-200 select-none shadow-xs ${
                    isCover
                      ? "border-primary ring-2 ring-primary/30 shadow-md"
                      : isTargetDrop
                        ? "border-primary scale-105 ring-2 ring-primary"
                        : "border-border hover:border-border/90 hover:shadow-sm"
                  }`}
                >
                  {/* Thumbnail Image */}
                  <img
                    src={url}
                    alt={`Product angle ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Top-Left Order Number */}
                  <span
                    className={`absolute top-1.5 left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold shadow-xs ${
                      isCover
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/60 text-white backdrop-blur-xs"
                    }`}
                  >
                    {i + 1}
                  </span>

                  {/* Primary Cover Badge */}
                  {isCover && (
                    <span className="absolute bottom-0 inset-x-0 z-10 bg-primary/95 text-primary-foreground text-[9px] font-bold text-center py-0.5 flex items-center justify-center gap-1 shadow-xs tracking-wide">
                      <Star className="w-2.5 h-2.5 fill-current" /> Cover Image
                    </span>
                  )}

                  {/* Quick-action overlay on hover */}
                  <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-20">
                    {/* Top Row: Lightbox & Delete */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Preview full image"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(url);
                        }}
                        className="h-6 w-6 rounded-md bg-white/90 hover:bg-white text-zinc-800 flex items-center justify-center shadow-xs transition-transform active:scale-90"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title="Delete image"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(i);
                        }}
                        className="h-6 w-6 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center shadow-xs transition-transform active:scale-90"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Bottom Row: Set as cover or move left/right */}
                    <div className="flex items-center justify-between gap-1">
                      {!isCover ? (
                        <button
                          type="button"
                          title="Set as primary cover"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCover(i);
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/90 hover:bg-white text-zinc-900 text-[9px] font-bold shadow-xs"
                        >
                          <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                          <span>Make Cover</span>
                        </button>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-0.5 ml-auto">
                        {i > 0 && (
                          <button
                            type="button"
                            title="Move left"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveImage(i, "left");
                            }}
                            className="h-5 w-5 rounded bg-white/90 hover:bg-white text-zinc-800 flex items-center justify-center shadow-xs"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        )}
                        {i < validImages.length - 1 && (
                          <button
                            type="button"
                            title="Move right"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveImage(i, "right");
                            }}
                            className="h-5 w-5 rounded bg-white/90 hover:bg-white text-zinc-800 flex items-center justify-center shadow-xs"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── High-Res Preview Lightbox Modal ── */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-[90vh] bg-card rounded-2xl overflow-hidden border border-border shadow-2xl p-2"
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                title="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={previewImage}
                alt="Full preview"
                className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain mx-auto"
              />
              <div className="mt-2 px-2 pb-1 text-center text-xs text-muted-foreground truncate">
                {previewImage}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
