import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { axiosClient } from "../../api/axiosClient";
import type {
  AdminBanner,
  BannerAsset,
  BannerContentMode,
  BannerContentPosition,
  HeroBanner,
} from "../../types/banner";
import { HeroBannerSlide } from "./HeroBannerSlide";
import { cn } from "../../lib/utils";

export type BannerMutationPayload = {
  internalName: string;
  placement: "home_hero";
  contentMode: BannerContentMode;
  desktopAssetId: string;
  mobileAssetId: string | null;
  desktopAltText: string;
  mobileAltText: string | null;
  accessibleLinkLabel: string | null;
  eyebrow: string | null;
  headline: string | null;
  description: string | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  bannerLinkUrl: string | null;
  openInNewTab: boolean;
  textAlignment: "left" | "center" | "right";
  desktopContentPosition: BannerContentPosition;
  mobileContentPosition: BannerContentPosition;
  textTheme: "light" | "dark";
  overlayStrength: number;
  desktopFocalX: number;
  desktopFocalY: number;
  mobileFocalX: number;
  mobileFocalY: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  expectedVersion?: number;
};

const toIstInput = (value: string | null | undefined) =>
  value
    ? new Date(new Date(value).getTime() + 330 * 60_000)
        .toISOString()
        .slice(0, 16)
    : "";
const fromIstInput = (value: string) =>
  value ? new Date(`${value}:00+05:30`).toISOString() : null;
const empty = {
  internalName: "",
  contentMode: "overlay" as BannerContentMode,
  desktopAsset: null as BannerAsset | null,
  mobileAsset: null as BannerAsset | null,
  desktopAltText: "",
  mobileAltText: "",
  accessibleLinkLabel: "",
  eyebrow: "",
  headline: "",
  description: "",
  primaryCtaLabel: "",
  primaryCtaUrl: "",
  bannerLinkUrl: "",
  openInNewTab: false,
  textAlignment: "left" as "left" | "center" | "right",
  desktopContentPosition: "center_left" as BannerContentPosition,
  mobileContentPosition: "bottom_left" as BannerContentPosition,
  textTheme: "light" as "light" | "dark",
  overlayStrength: 45,
  desktopFocalX: 50,
  desktopFocalY: 50,
  mobileFocalX: 50,
  mobileFocalY: 50,
  isActive: false,
  startsAt: "",
  endsAt: "",
};

type Draft = typeof empty;
const fromBanner = (banner?: AdminBanner | null): Draft =>
  banner
    ? {
        internalName: banner.internalName,
        contentMode: banner.contentMode,
        desktopAsset: banner.desktopAsset,
        mobileAsset: banner.mobileAsset,
        desktopAltText: banner.desktopAltText,
        mobileAltText: banner.mobileAltText ?? "",
        accessibleLinkLabel: banner.accessibleLinkLabel ?? "",
        eyebrow: banner.eyebrow ?? "",
        headline: banner.headline ?? "",
        description: banner.description ?? "",
        primaryCtaLabel: banner.primaryCtaLabel ?? "",
        primaryCtaUrl: banner.primaryCtaUrl ?? "",
        bannerLinkUrl: banner.bannerLinkUrl ?? "",
        openInNewTab: banner.openInNewTab,
        textAlignment: banner.textAlignment,
        desktopContentPosition: banner.desktopContentPosition,
        mobileContentPosition: banner.mobileContentPosition,
        textTheme: banner.textTheme,
        overlayStrength: banner.overlayStrength,
        desktopFocalX: banner.desktopFocalX,
        desktopFocalY: banner.desktopFocalY,
        mobileFocalX: banner.mobileFocalX,
        mobileFocalY: banner.mobileFocalY,
        isActive: banner.isActive,
        startsAt: toIstInput(banner.startsAt),
        endsAt: toIstInput(banner.endsAt),
      }
    : { ...empty };

function AssetUploader({
  label,
  guidance,
  dimensions,
  asset,
  required,
  onChange,
}: {
  label: string;
  guidance: string;
  dimensions?: string;
  asset: BannerAsset | null;
  required?: boolean;
  onChange: (asset: BannerAsset | null) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  const upload = async (file?: File) => {
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setLocalPreview(preview);
    setUploading(true);
    setProgress(0);
    controller.current = new AbortController();
    const data = new FormData();
    data.append("image", file);
    try {
      const response = await axiosClient.post("/upload/banner-assets", data, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.current.signal,
        onUploadProgress: (event) =>
          setProgress(
            event.total ? Math.round((event.loaded / event.total) * 100) : 0,
          ),
      });
      onChange(response.data.data.asset as BannerAsset);
      setLocalPreview(null);
      previewRef.current = null;
      URL.revokeObjectURL(preview);
      toast.success(
        `${label} uploaded. Save the banner to publish this change.`,
      );
    } catch (error: any) {
      if (error?.code !== "ERR_CANCELED")
        toast.error(
          error?.response?.data?.message ??
            error?.message ??
            "Image upload failed.",
        );
      setLocalPreview(null);
      previewRef.current = null;
      URL.revokeObjectURL(preview);
    } finally {
      setUploading(false);
      controller.current = null;
    }
  };
  return (
    <div className="rounded-xl border border-border p-3.5 bg-card">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {label}
            {required && " *"}
          </p>
          <p className="text-xs text-muted-foreground">{guidance}</p>
          {dimensions && (
            <p className="text-[11px] font-mono text-primary mt-0.5 bg-primary/10 px-2 py-0.5 rounded inline-block">
              {dimensions}
            </p>
          )}
        </div>
        {asset && !required && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {localPreview || asset?.url ? (
        <img
          src={localPreview || asset!.url}
          alt=""
          className="mb-3 aspect-[3/1] w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mb-3 grid aspect-[3/1] place-items-center rounded-lg bg-muted">
          <ImagePlus className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      <div className="flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
          <UploadCloud className="h-4 w-4" />
          {asset ? "Replace" : "Upload"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
        {uploading && (
          <button
            type="button"
            onClick={() => controller.current?.abort()}
            className="rounded-lg border border-border px-3 py-2 text-xs"
          >
            Cancel upload
          </button>
        )}
      </div>
      {uploading && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploading {progress}%
          </p>
        </div>
      )}
    </div>
  );
}

const Field = ({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) => (
  <label className={cn("block text-sm font-medium", className)}>
    {label}
    {children}
  </label>
);
const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function BannerForm({
  banner,
  saving,
  onSave,
  onCancel,
}: {
  banner?: AdminBanner | null;
  saving: boolean;
  onSave: (payload: BannerMutationPayload) => void;
  onCancel: () => void;
}) {
  const initial = useMemo(() => fromBanner(banner), [banner]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const preview: HeroBanner = {
    id: banner?.id ?? "preview",
    contentMode: draft.contentMode,
    desktopAsset: draft.desktopAsset,
    mobileAsset: draft.mobileAsset,
    desktopAltText: draft.desktopAltText,
    mobileAltText: draft.mobileAltText || null,
    accessibleLinkLabel: draft.accessibleLinkLabel || null,
    eyebrow: draft.eyebrow || null,
    headline: draft.headline || null,
    description: draft.description || null,
    primaryCtaLabel: draft.primaryCtaLabel || null,
    primaryCtaUrl: draft.primaryCtaUrl || null,
    bannerLinkUrl: draft.bannerLinkUrl || null,
    openInNewTab: draft.openInNewTab,
    textAlignment: draft.textAlignment,
    desktopContentPosition: draft.desktopContentPosition,
    mobileContentPosition: draft.mobileContentPosition,
    textTheme: draft.textTheme,
    overlayStrength: draft.overlayStrength,
    desktopFocalX: draft.desktopFocalX,
    desktopFocalY: draft.desktopFocalY,
    mobileFocalX: draft.mobileFocalX,
    mobileFocalY: draft.mobileFocalY,
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.desktopAsset?.id)
      return toast.error("Upload a desktop banner image first.");
    onSave({
      internalName: draft.internalName.trim(),
      placement: "home_hero",
      contentMode: draft.contentMode,
      desktopAssetId: draft.desktopAsset.id,
      mobileAssetId: draft.mobileAsset?.id ?? null,
      desktopAltText: draft.desktopAltText.trim(),
      mobileAltText: draft.mobileAltText.trim() || null,
      accessibleLinkLabel:
        draft.contentMode === "artwork"
          ? draft.accessibleLinkLabel.trim() || null
          : null,
      eyebrow:
        draft.contentMode === "overlay" ? draft.eyebrow.trim() || null : null,
      headline:
        draft.contentMode === "overlay" ? draft.headline.trim() || null : null,
      description:
        draft.contentMode === "overlay"
          ? draft.description.trim() || null
          : null,
      primaryCtaLabel:
        draft.contentMode === "overlay"
          ? draft.primaryCtaLabel.trim() || null
          : null,
      primaryCtaUrl:
        draft.contentMode === "overlay"
          ? draft.primaryCtaUrl.trim() || null
          : null,
      bannerLinkUrl:
        draft.contentMode === "artwork"
          ? draft.bannerLinkUrl.trim() || null
          : null,
      openInNewTab: draft.openInNewTab,
      textAlignment: draft.textAlignment,
      desktopContentPosition: draft.desktopContentPosition,
      mobileContentPosition: draft.mobileContentPosition,
      textTheme: draft.textTheme,
      overlayStrength: draft.overlayStrength,
      desktopFocalX: draft.desktopFocalX,
      desktopFocalY: draft.desktopFocalY,
      mobileFocalX: draft.mobileFocalX,
      mobileFocalY: draft.mobileFocalY,
      isActive: draft.isActive,
      startsAt: fromIstInput(draft.startsAt),
      endsAt: fromIstInput(draft.endsAt),
      ...(banner ? { expectedVersion: banner.version } : {}),
    });
  };
  const cancel = () => {
    if (!dirty || window.confirm("Discard your unsaved banner changes?"))
      onCancel();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
        <h3 className="font-bold md:col-span-2">Content mode</h3>
        <Field label="Internal admin name *">
          <input
            required
            maxLength={120}
            value={draft.internalName}
            onChange={(event) => set("internalName", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Mode">
          <select
            value={draft.contentMode}
            onChange={(event) =>
              set("contentMode", event.target.value as BannerContentMode)
            }
            className={inputClass}
          >
            <option value="overlay">Overlay text</option>
            <option value="artwork">Text already in artwork</option>
          </select>
        </Field>
      </section>
      <section className="rounded-xl border border-border p-4">
        <h3 className="mb-1 font-bold">Images</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Recommended: desktop 1920 × 1080 px (16:9), mobile 1080 × 1920 px
          (9:16). JPEG, PNG or WebP; maximum 15 MB and 40 MP.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <AssetUploader
            label="Desktop image"
            guidance="Required full-screen 16:9 artwork"
            dimensions="1920 × 1080 px (16:9) • Min 1280 × 720 px"
            asset={draft.desktopAsset}
            required
            onChange={(asset) => set("desktopAsset", asset)}
          />
          <AssetUploader
            label="Mobile image"
            guidance="Optional 9:16 vertical portrait artwork (desktop fallback)"
            dimensions="1080 × 1920 px (9:16) • Min 720 × 1280 px"
            asset={draft.mobileAsset}
            onChange={(asset) => set("mobileAsset", asset)}
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label={`Desktop alt text${draft.contentMode === "artwork" ? " *" : ""}`}
          >
            <input
              value={draft.desktopAltText}
              onChange={(event) => set("desktopAltText", event.target.value)}
              maxLength={240}
              className={inputClass}
            />
          </Field>
          <Field label="Mobile alt text (optional)">
            <input
              value={draft.mobileAltText}
              onChange={(event) => set("mobileAltText", event.target.value)}
              maxLength={240}
              className={inputClass}
            />
          </Field>
        </div>
      </section>
      {draft.contentMode === "overlay" ? (
        <section className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
          <h3 className="font-bold md:col-span-2">Overlay copy and CTA</h3>
          <Field label="Eyebrow">
            <input
              maxLength={80}
              value={draft.eyebrow}
              onChange={(e) => set("eyebrow", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Headline">
            <input
              maxLength={160}
              value={draft.headline}
              onChange={(e) => set("headline", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              maxLength={400}
              rows={3}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="CTA label">
            <input
              maxLength={80}
              value={draft.primaryCtaLabel}
              onChange={(e) => set("primaryCtaLabel", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="CTA path or HTTPS URL">
            <input
              value={draft.primaryCtaUrl}
              onChange={(e) => set("primaryCtaUrl", e.target.value)}
              className={inputClass}
              placeholder="/shop"
            />
          </Field>
        </section>
      ) : (
        <section className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
          <h3 className="font-bold md:col-span-2">Artwork link</h3>
          <Field label="Optional banner path or HTTPS URL">
            <input
              value={draft.bannerLinkUrl}
              onChange={(e) => set("bannerLinkUrl", e.target.value)}
              className={inputClass}
              placeholder="/shop"
            />
          </Field>
          <Field label="Accessible link name">
            <input
              maxLength={160}
              value={draft.accessibleLinkLabel}
              onChange={(e) => set("accessibleLinkLabel", e.target.value)}
              className={inputClass}
            />
          </Field>
        </section>
      )}
      <section className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-3">
        <h3 className="font-bold md:col-span-3">Appearance and crop</h3>
        <Field label="Text alignment">
          <select
            value={draft.textAlignment}
            onChange={(e) =>
              set("textAlignment", e.target.value as Draft["textAlignment"])
            }
            className={inputClass}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </Field>
        <Field label="Desktop content position">
          <PositionSelect
            value={draft.desktopContentPosition}
            onChange={(value) => set("desktopContentPosition", value)}
          />
        </Field>
        <Field label="Mobile content position">
          <PositionSelect
            value={draft.mobileContentPosition}
            onChange={(value) => set("mobileContentPosition", value)}
          />
        </Field>
        <Field label="Text theme">
          <select
            value={draft.textTheme}
            onChange={(e) =>
              set("textTheme", e.target.value as Draft["textTheme"])
            }
            className={inputClass}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <Field label={`Overlay strength: ${draft.overlayStrength}%`}>
          <input
            type="range"
            min="0"
            max="80"
            value={draft.overlayStrength}
            onChange={(e) => set("overlayStrength", Number(e.target.value))}
            className="mt-3 w-full"
          />
        </Field>
        <div className="md:col-span-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              "desktopFocalX",
              "desktopFocalY",
              "mobileFocalX",
              "mobileFocalY",
            ] as const
          ).map((key) => (
            <Field
              key={key}
              label={`${key.replace(/([A-Z])/g, " $1")}: ${draft[key]}%`}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={draft[key]}
                onChange={(e) => set(key, Number(e.target.value))}
                className="mt-3 w-full"
              />
            </Field>
          ))}
        </div>
      </section>
      <section className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
        <h3 className="font-bold md:col-span-2">Visibility schedule</h3>
        <Field label="Starts at (Asia/Kolkata)">
          <input
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Ends at — exclusive (Asia/Kolkata)">
          <input
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Active
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={draft.openInNewTab}
            onChange={(e) => set("openInNewTab", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Open destination in new tab
        </label>
      </section>
      <section className="rounded-xl border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Live preview</h3>
            <p className="text-xs text-muted-foreground">
              Preview links are disabled and never save or activate the banner.
            </p>
          </div>
          <div className="flex rounded-lg bg-muted p-1">
            {(["desktop", "tablet", "mobile"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setViewport(item)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs capitalize",
                  viewport === item && "bg-background shadow",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div
          className={cn(
            "mx-auto transition-[max-width]",
            viewport === "desktop"
              ? "max-w-full"
              : viewport === "tablet"
                ? "max-w-[768px]"
                : "max-w-[390px]",
          )}
        >
          <HeroBannerSlide
            banner={preview}
            preview
            forceViewport={viewport === "mobile" ? "mobile" : "desktop"}
          />
        </div>
      </section>
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {banner ? "Save banner" : "Create banner"}
        </button>
      </div>
    </form>
  );
}

function PositionSelect({
  value,
  onChange,
}: {
  value: BannerContentPosition;
  onChange: (value: BannerContentPosition) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value as BannerContentPosition)
      }
      className={inputClass}
    >
      {[
        "top_left",
        "top_center",
        "top_right",
        "center_left",
        "center",
        "center_right",
        "bottom_left",
        "bottom_center",
        "bottom_right",
      ].map((position) => (
        <option key={position} value={position}>
          {position.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
