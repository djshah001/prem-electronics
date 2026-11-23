import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Star,
  Shield,
  Truck,
  Package,
  Zap,
  ChevronLeft,
  ChevronRight,
  PenLine,
  AlertCircle,
  CheckCircle2,
  Heart,
  ZoomIn,
  Share2,
  Copy,
  Check,
  Minus,
  Plus,
  X,
  Maximize2,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { api } from "../../api/axiosClient";
import type { Product, Review } from "../../types";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import { useAtomValue } from "jotai";
import { userAtom } from "../../store/userAtom";
import { clsx } from "clsx";
import { toast } from "sonner";
import { SEO } from "../../components/shared/SEO";

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(p));

const discountPct = (p: string | number, s: string | number) =>
  Math.round(((Number(p) - Number(s)) / Number(p)) * 100);

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const STAR_SIZE_MAP = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
} as const;

function StarPicker({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: keyof typeof STAR_SIZE_MAP;
}) {
  const [hovered, setHovered] = useState(0);
  const activeRating = hovered || value;

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <motion.button
            key={s}
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
            className="focus:outline-none"
          >
            <Star
              className={clsx(
                STAR_SIZE_MAP[size],
                "transition-colors duration-150",
                activeRating >= s
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30",
              )}
            />
          </motion.button>
        ))}
      </div>
      {activeRating > 0 && (
        <span className="text-xs font-semibold text-amber-400">
          {RATING_LABELS[activeRating]}
        </span>
      )}
    </div>
  );
}

function ReviewForm({
  productId,
  onSuccess,
  onCancel,
}: {
  productId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/products/${productId}/reviews`, {
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Review submitted! It will appear after approval.");
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
      qc.invalidateQueries({ queryKey: ["my-review", productId] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not submit review."),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating === 0) {
          toast.error("Please select a star rating.");
          return;
        }
        mutation.mutate();
      }}
      className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/80 p-6 space-y-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base font-['Outfit']">Write a Review</h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Close review form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Your Rating *
        </label>
        <StarPicker value={rating} onChange={setRating} size="lg" />
        {rating === 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Click a star to rate
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Title (optional)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          placeholder="Summarize your experience"
          className="w-full rounded-xl border border-border bg-background/80 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Review (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Share your experience with this gear…"
          className="w-full rounded-xl border border-border bg-background/80 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
        />
        <p className="text-[11px] text-muted-foreground text-right mt-1 tabular-nums">
          {body.length}/2000
        </p>
      </div>

      <div className="flex items-center gap-2.5 pt-1">
        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={mutation.isPending || rating === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <PenLine className="w-4 h-4" />
          {mutation.isPending ? "Submitting…" : "Submit Review"}
        </motion.button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0, size: 140 });
  const mainImageRef = useRef<HTMLDivElement>(null);

  const [quantity, setQuantity] = useState(1);
  const [copiedSku, setCopiedSku] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { addToCart, isInCart } = useCart();
  const { isWishlisted, toggleItem, isToggling } = useWishlist();
  const user = useAtomValue(userAtom);
  const navigate = useNavigate();
  const location = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get<Product>(`/products/${slug}`),
  });

  const product = data?.data;

  // Reset state when navigating between products
  useEffect(() => {
    setSelectedImage(0);
    setIsZooming(false);
    setIsLightboxOpen(false);
    setQuantity(1);
  }, [slug]);

  const displayImages = useMemo(() => {
    const raw = product?.images;
    if (!raw) return [];
    let list: unknown[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [raw];
      } catch {
        list = [raw];
      }
    }
    return list.filter(
      (img): img is string => typeof img === "string" && img.trim().length > 0,
    );
  }, [product?.images]);

  const activeImageIndex = Math.min(
    selectedImage,
    Math.max(0, displayImages.length - 1),
  );
  const currentImage =
    displayImages[activeImageIndex] || displayImages[0] || "";

  const goPrevImage = useCallback(() => {
    if (displayImages.length <= 1) return;
    setSelectedImage(
      (prev) => (prev - 1 + displayImages.length) % displayImages.length,
    );
    setIsZooming(false);
  }, [displayImages.length]);

  const goNextImage = useCallback(() => {
    if (displayImages.length <= 1) return;
    setSelectedImage((prev) => (prev + 1) % displayImages.length);
    setIsZooming(false);
  }, [displayImages.length]);

  // Lightbox keyboard navigation & scroll lock
  useEffect(() => {
    if (!isLightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowLeft") goPrevImage();
      if (e.key === "ArrowRight") goNextImage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isLightboxOpen, goPrevImage, goNextImage]);

  const handleMouseEnter = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: fine)").matches
    ) {
      setIsZooming(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }
    if (!mainImageRef.current) return;
    const rect = mainImageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const clampedX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const clampedY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const xPercent = (clampedX / rect.width) * 100;
    const yPercent = (clampedY / rect.height) * 100;

    const lensSize = Math.min(rect.width * 0.5, 240);
    const halfLens = lensSize / 2;

    const lensX = Math.max(
      0,
      Math.min(rect.width - lensSize, clampedX - halfLens),
    );
    const lensY = Math.max(
      0,
      Math.min(rect.height - lensSize, clampedY - halfLens),
    );

    setZoomPosition({ x: xPercent, y: yPercent });
    setLensPosition({ x: lensX, y: lensY, size: lensSize });
    if (!isZooming) setIsZooming(true);
  };

  const handleMouseLeave = () => setIsZooming(false);

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["product-reviews", product?.id, reviewPage],
    queryFn: () =>
      api.get<Review[]>(`/products/${product!.id}/reviews`, {
        page: reviewPage,
        limit: 5,
      } as Record<string, unknown>),
    enabled: !!product?.id,
  });

  const { data: myReviewData } = useQuery({
    queryKey: ["my-review", product?.id],
    queryFn: () =>
      api.get<Review | null>(`/products/${product!.id}/reviews/mine`),
    enabled: !!product?.id && !!user,
  });

  const reviews = reviewsData?.data ?? [];
  const meta = reviewsData?.meta;
  const myReview = myReviewData?.data;

  // Options & Variants state
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const options = useMemo(() => product?.options ?? [], [product?.options]);
  const variants = useMemo(() => product?.variants ?? [], [product?.variants]);
  const hasOptions =
    options.length > 0 && options.some((opt) => (opt.values?.length ?? 0) > 0);

  useEffect(() => {
    if (hasOptions) {
      const initial: Record<string, string> = {};
      for (const opt of options) {
        if (opt.values && opt.values.length > 0) {
          initial[opt.id] = opt.values[0].id;
        }
      }
      setSelectedOptions(initial);
    }
  }, [product?.id, hasOptions, options]);

  useEffect(() => {
    if (!hasOptions || location.hash !== "#product-options") return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById("product-options")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasOptions, location.hash, product?.id]);

  const selectedVariant = useMemo(() => {
    if (!hasOptions) {
      return (
        variants.find((v) => v.optionCombinationKey === "default") ??
        variants[0]
      );
    }
    const chosenValueIds = Object.values(selectedOptions);
    if (chosenValueIds.length === 0) return undefined;
    return variants.find((v) => {
      if (!v.optionValues) return false;
      return chosenValueIds.every((id) => v.optionValues!.includes(id));
    });
  }, [hasOptions, variants, selectedOptions]);

  const activePrice = selectedVariant
    ? (selectedVariant.salePrice ?? selectedVariant.price)
    : (product?.salePrice ?? product?.price ?? "0");
  const regularPrice = selectedVariant
    ? selectedVariant.price
    : (product?.price ?? "0");
  const hasSalePrice = selectedVariant
    ? Boolean(
        selectedVariant.salePrice &&
        Number(selectedVariant.salePrice) < Number(selectedVariant.price),
      )
    : Boolean(
        product?.salePrice && Number(product.salePrice) < Number(product.price),
      );
  const savingsAmount = hasSalePrice
    ? Number(regularPrice) - Number(activePrice)
    : 0;

  const activeStock = selectedVariant
    ? selectedVariant.stockQuantity
    : (product?.stock ?? 0);
  const activeSku = selectedVariant
    ? selectedVariant.sku
    : (product?.sku ?? "");
  const activeThreshold = selectedVariant
    ? selectedVariant.lowStockThreshold
    : (product?.lowStockThreshold ?? 5);
  const inCart = product ? isInCart(product.id, selectedVariant?.id) : false;
  const wishlisted = product ? isWishlisted(product.id) : false;

  // Keep quantity within available stock when switching variants
  useEffect(() => {
    if (activeStock > 0 && quantity > activeStock) {
      setQuantity(activeStock);
    }
  }, [activeStock, quantity]);

  const attrs = Array.isArray(product?.attributes) ? product!.attributes : [];

  const handleAddToCart = () => {
    if (!product) return;
    if (!user) {
      toast.info("Please sign in to add items to your cart.");
      navigate(
        `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
      );
      return;
    }
    addToCart(product, quantity, selectedVariant);
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    if (!user) {
      toast.info("Please sign in to save items to your wishlist.");
      navigate(
        `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
      );
      return;
    }
    toggleItem(product.id);
  };

  const handleCopySku = async () => {
    if (!activeSku) return;
    try {
      await navigator.clipboard.writeText(activeSku);
      setCopiedSku(true);
      toast.success("SKU copied to clipboard");
      setTimeout(() => setCopiedSku(false), 1800);
    } catch {
      toast.error("Could not copy SKU");
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share && product) {
      try {
        await navigator.share({ title: product.title, url: shareUrl });
        return;
      } catch {
        // User cancelled or share failed; fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Product link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const jsonLd = useMemo(() => {
    if (!product) return undefined;
    const priceValue = product.salePrice
      ? Number(product.salePrice)
      : Number(product.price);
    return {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: product.title,
      image: displayImages,
      description:
        product.description || `${product.title} from Prem Electronics`,
      sku: activeSku || product.sku,
      brand: {
        "@type": "Brand",
        name: product.brand || "Prem Electronics",
      },
      offers: {
        "@type": "Offer",
        url: window.location.href,
        priceCurrency: "INR",
        price: priceValue,
        availability:
          activeStock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    };
  }, [product, displayImages, activeSku, activeStock]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-4 w-48 bg-muted/70 rounded mb-6 animate-pulse" />
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 animate-pulse">
          <div className="space-y-4">
            <div className="aspect-square bg-muted/70 rounded-3xl" />
            <div className="grid grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-muted/60 rounded-2xl"
                />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="h-5 bg-muted/70 rounded w-28" />
            <div className="h-10 bg-muted/80 rounded-xl w-4/5" />
            <div className="h-5 bg-muted/60 rounded w-36" />
            <div className="h-14 bg-muted/70 rounded-2xl w-1/2" />
            <div className="h-24 bg-muted/60 rounded-2xl" />
            <div className="h-14 bg-muted/70 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h1 className="text-2xl font-bold font-['Outfit'] mb-2">
          Product not found
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          This item may have been removed or is no longer available.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const isActionDisabled =
    activeStock === 0 || (hasOptions && !selectedVariant);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 lg:pb-12">
      <SEO
        title={product.title}
        description={
          product.description?.slice(0, 160) ||
          `Buy ${product.title} online at the best price from Prem Electronics.`
        }
        keywords={`${product.title}, ${product.brand || ""}, electronics, buy online India`}
        ogType="product"
        ogImage={displayImages[0]}
        jsonLd={jsonLd}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-6"
      >
        <Link to="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
        <Link to="/shop" className="hover:text-foreground transition-colors">
          Shop
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
        <span className="text-foreground font-medium line-clamp-1">
          {product.title}
        </span>
      </nav>

      {/* Main Product Grid */}
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 mb-16 relative items-start">
        {/* ─── Left: Sticky Images Gallery ───────────────────────── */}
        <div className="relative z-30 lg:sticky lg:top-24 self-start">
          {/* Main Display Image */}
          <div
            ref={mainImageRef}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => currentImage && setIsLightboxOpen(true)}
            className="group relative aspect-square rounded-3xl overflow-hidden bg-card/80 border border-border/80 shadow-sm cursor-crosshair lg:cursor-crosshair select-none"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${slug}-${activeImageIndex}`}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full h-full"
              >
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={product.title}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Zap className="w-24 h-24 text-muted-foreground/20" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Discount Badge on Image */}
            {hasSalePrice && (
              <div className="pointer-events-none absolute top-4 left-4 z-10 px-3 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider shadow-sm">
                -{discountPct(regularPrice, activePrice)}% OFF
              </div>
            )}

            {/* Image Counter Pill */}
            {displayImages.length > 1 && (
              <div className="pointer-events-none absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15 tabular-nums">
                {activeImageIndex + 1} / {displayImages.length}
              </div>
            )}

            {/* Prev / Next Gallery Arrows */}
            {displayImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevImage();
                  }}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/80 backdrop-blur-md border border-border/80 text-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-background transition-all shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextImage();
                  }}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/80 backdrop-blur-md border border-border/80 text-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-background transition-all shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Viewfinder Lens Overlay on Main Image */}
            {isZooming && currentImage && (
              <div
                className="pointer-events-none absolute border-2 border-primary/70 bg-primary/15 rounded-2xl shadow-inner backdrop-blur-[0.5px] hidden lg:block"
                style={{
                  width: `${lensPosition.size}px`,
                  height: `${lensPosition.size}px`,
                  transform: `translate3d(${lensPosition.x}px, ${lensPosition.y}px, 0)`,
                  left: 0,
                  top: 0,
                }}
              />
            )}

            {/* Bottom Zoom / Fullscreen Prompt */}
            {currentImage && (
              <div className="absolute bottom-3.5 right-3.5 z-10 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/15 opacity-85 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-3.5 h-3.5 text-primary hidden lg:block" />
                <Maximize2 className="w-3.5 h-3.5 text-primary lg:hidden" />
                <span className="hidden lg:inline">
                  Hover to zoom • Click to expand
                </span>
                <span className="lg:hidden">Tap to expand</span>
              </div>
            )}
          </div>

          {/* Separate Square Zoom Box (Desktop) */}
          <AnimatePresence>
            {isZooming && currentImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-[calc(100%+1.5rem)] top-0 z-50 w-[112%] aspect-square rounded-3xl overflow-hidden border border-border/80 bg-card shadow-2xl pointer-events-none hidden lg:block"
              >
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${currentImage})`,
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <div className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold border border-white/20 flex items-center gap-1.5 shadow-sm">
                  <ZoomIn className="w-3.5 h-3.5 text-primary" />
                  <span>2.0× Zoom</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Image Thumbnails */}
          {displayImages.length > 1 && (
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 sm:gap-3 mt-4">
              {displayImages.map((img, i) => {
                const isSelected = activeImageIndex === i;
                return (
                  <motion.button
                    key={i}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedImage(i);
                      setIsZooming(false);
                    }}
                    className={clsx(
                      "group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm",
                      isSelected
                        ? "border-primary ring-2 ring-primary/25 bg-card opacity-100"
                        : "border-border/70 opacity-65 hover:opacity-100 hover:border-primary/50 bg-card/60",
                    )}
                    aria-label={`View product image ${i + 1}`}
                    aria-selected={isSelected}
                  >
                    <img
                      src={img}
                      alt={`${product.title} thumbnail ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Right: Product Details & Actions ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          {/* Brand + Share Row */}
          <div className="flex items-center justify-between gap-3 mb-2">
            {product.brand ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest">
                {product.brand}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card/70 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              aria-label="Share product"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black font-['Outfit'] tracking-tight text-foreground leading-tight mb-3">
            {product.title}
          </h1>

          {/* Rating & SKU Metadata Bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
            {product.reviewCount > 0 && (
              <a
                href="#customer-reviews"
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-card border border-border/70 hover:border-primary/40 transition-colors"
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={clsx(
                        "w-3.5 h-3.5",
                        s <= Math.round(Number(product.avgRating))
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {Number(product.avgRating).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({product.reviewCount} review
                  {product.reviewCount !== 1 ? "s" : ""})
                </span>
              </a>
            )}

            {activeSku && (
              <button
                type="button"
                onClick={handleCopySku}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Copy SKU"
              >
                <span>SKU:</span>
                <span className="font-mono font-medium text-foreground">
                  {activeSku}
                </span>
                {copiedSku ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 opacity-60" />
                )}
              </button>
            )}
          </div>

          {/* Price Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card/75 backdrop-blur-md border border-border/80 mb-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <AnimatePresence mode="wait">
                <motion.span
                  key={String(activePrice)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="text-3xl sm:text-4xl font-black text-foreground font-['Outfit'] tabular-nums"
                >
                  {formatPrice(activePrice)}
                </motion.span>
              </AnimatePresence>

              {hasSalePrice && (
                <>
                  <span className="text-lg sm:text-xl text-muted-foreground/80 line-through font-medium tabular-nums">
                    {formatPrice(regularPrice)}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold rounded-lg tabular-nums">
                    Save {formatPrice(savingsAmount)} (
                    {discountPct(regularPrice, activePrice)}%)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Inclusive of all taxes • Genuine Indian warranty
            </p>
          </div>

          {/* Product Options (Variants) */}
          {hasOptions && (
            <div
              id="product-options"
              className="scroll-mt-24 space-y-4 mb-6 p-4 sm:p-5 rounded-2xl bg-card/75 backdrop-blur-md border border-border/80 target:ring-2 target:ring-primary/40 target:ring-offset-4 target:ring-offset-background"
            >
              {options.map((opt) => {
                const isColor = opt.name.toLowerCase().includes("color");
                const selectedValId = selectedOptions[opt.id];
                const selectedValObj = opt.values?.find(
                  (v) => v.id === selectedValId,
                );

                return (
                  <div key={opt.id}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-2.5">
                      <span className="text-foreground uppercase tracking-wider">
                        {opt.name}
                      </span>
                      {selectedValObj && (
                        <span className="text-primary font-medium">
                          {selectedValObj.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opt.values?.map((val) => {
                        const isSelected = selectedValId === val.id;
                        return isColor && val.colorSwatch ? (
                          <motion.button
                            key={val.id}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [opt.id]: val.id,
                              }))
                            }
                            className={clsx(
                              "group relative flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                              isSelected
                                ? "border-primary bg-primary/15 text-foreground ring-2 ring-primary/30"
                                : "border-border bg-background/80 text-muted-foreground hover:text-foreground hover:border-primary/50",
                            )}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                              style={{ backgroundColor: val.colorSwatch }}
                            />
                            <span>{val.label}</span>
                          </motion.button>
                        ) : (
                          <motion.button
                            key={val.id}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [opt.id]: val.id,
                              }))
                            }
                            className={clsx(
                              "px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background/80 text-foreground hover:border-primary/50 hover:bg-muted/50",
                            )}
                          >
                            {val.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stock Indicator */}
          <div className="mb-5">
            {activeStock === 0 ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/25 text-xs sm:text-sm text-destructive font-semibold">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                Out of Stock
              </span>
            ) : activeStock <= activeThreshold ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs sm:text-sm text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Only {activeStock} left — Order soon!
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                In Stock ({activeStock} units ready to ship)
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground text-sm sm:text-[15px] leading-relaxed mb-6">
              {product.description}
            </p>
          )}

          {/* Quantity + Add to Cart + Wishlist */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
            {/* Quantity Stepper */}
            {activeStock > 0 && (
              <div className="flex items-center justify-between sm:justify-center border border-border/80 bg-card/80 rounded-2xl p-1.5 h-14 sm:w-32 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-9 h-full rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold tabular-nums w-8 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(activeStock, q + 1))
                  }
                  disabled={quantity >= activeStock}
                  aria-label="Increase quantity"
                  className="w-9 h-full rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Primary Add to Cart CTA */}
            <div className="flex items-center gap-3 flex-1">
              <motion.button
                id="product-add-to-cart-btn"
                type="button"
                whileTap={isActionDisabled ? undefined : { scale: 0.985 }}
                onClick={handleAddToCart}
                disabled={isActionDisabled}
                className={clsx(
                  "group/cta relative flex-1 h-14 flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl text-base font-bold shadow-md transition-colors",
                  isActionDisabled
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : inCart
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/25"
                      : "gradient-primary text-white hover:opacity-95",
                )}
              >
                {!isActionDisabled && !inCart && (
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-full" />
                )}

                <AnimatePresence mode="wait" initial={false}>
                  {activeStock === 0 ? (
                    <span key="oos">Out of Stock</span>
                  ) : hasOptions && !selectedVariant ? (
                    <span key="select">Select Options</span>
                  ) : inCart ? (
                    <motion.span
                      key="in-cart"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-5 h-5 stroke-[2.75]" />
                      In Cart
                    </motion.span>
                  ) : (
                    <motion.span
                      key="add"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      className="flex items-center gap-2.5"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Wishlist Button */}
              <motion.button
                id="product-wishlist-toggle-btn"
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleToggleWishlist}
                disabled={isToggling}
                className={clsx(
                  "h-14 w-14 rounded-2xl flex items-center justify-center border transition-colors shrink-0 shadow-sm",
                  wishlisted
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-500 hover:bg-rose-500/25"
                    : "border-border/80 bg-card/80 text-muted-foreground hover:text-foreground hover:border-primary/40",
                )}
                title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-label={
                  wishlisted ? "Remove from wishlist" : "Save to wishlist"
                }
              >
                <motion.span
                  key={wishlisted ? "w-on" : "w-off"}
                  initial={{ scale: 0.75 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 480, damping: 20 }}
                >
                  <Heart
                    className={clsx(
                      "w-6 h-6",
                      wishlisted && "fill-current text-rose-500",
                    )}
                  />
                </motion.span>
              </motion.button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              {
                icon: Shield,
                title: "100% Authentic",
                sub: "Authorized dealer",
              },
              { icon: Truck, title: "Free Delivery", sub: "Insured shipping" },
              { icon: Package, title: "1-Year Warranty", sub: "Brand support" },
            ].map(({ icon: Icon, title, sub }) => (
              <div
                key={title}
                className="flex flex-col items-center gap-1 p-3 bg-card/70 backdrop-blur-md rounded-2xl border border-border/70 text-center"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {title}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:block">
                  {sub}
                </span>
              </div>
            ))}
          </div>

          {/* Specifications */}
          {attrs.length > 0 && (
            <div className="mt-6 overflow-hidden bg-card/75 backdrop-blur-md rounded-2xl border border-border/80">
              <div className="px-5 py-3.5 border-b border-border/70">
                <h3 className="font-bold text-sm font-['Outfit'] tracking-wide">
                  Specifications
                </h3>
              </div>
              <div className="divide-y divide-border/50">
                {attrs.map((attr, idx) => (
                  <div
                    key={attr.name}
                    className={clsx(
                      "flex justify-between gap-4 text-sm px-5 py-2.5",
                      idx % 2 === 1 && "bg-muted/20",
                    )}
                  >
                    <span className="text-muted-foreground">{attr.name}</span>
                    <span className="font-medium text-foreground text-right max-w-[58%]">
                      {attr.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ─── Customer Reviews ──────────────────────────────────────── */}
      <section
        id="customer-reviews"
        className="scroll-mt-24 pt-10 border-t border-border/60"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black font-['Outfit']">
              Customer Reviews
            </h2>
            {product.reviewCount > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Rated{" "}
                <span className="font-bold text-foreground">
                  {Number(product.avgRating).toFixed(1)}
                </span>{" "}
                out of 5 based on{" "}
                <span className="font-semibold text-foreground">
                  {product.reviewCount}
                </span>{" "}
                review
                {product.reviewCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {user && !myReview && !showReviewForm && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowReviewForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card/80 hover:border-primary/50 hover:bg-muted/60 transition-colors text-sm font-semibold self-start sm:self-auto"
              id="write-review-btn"
            >
              <PenLine className="w-4 h-4 text-primary" />
              Write a Review
            </motion.button>
          )}
          {!user && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card/80 hover:border-primary/50 hover:bg-muted/60 transition-colors text-sm font-semibold self-start sm:self-auto"
            >
              <PenLine className="w-4 h-4 text-primary" />
              Sign in to Review
            </button>
          )}
        </div>

        {/* My submitted review notice */}
        {myReview && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-6 text-sm">
            {myReview.isApproved ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            )}
            <p className="text-muted-foreground">
              {myReview.isApproved
                ? "Your review has been approved and is visible below."
                : "Your review has been submitted and is pending moderation."}
            </p>
          </div>
        )}

        {/* Review Submission Form */}
        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6 overflow-hidden"
            >
              <ReviewForm
                productId={product.id}
                onSuccess={() => setShowReviewForm(false)}
                onCancel={() => setShowReviewForm(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews List */}
        {reviewsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-card/70 rounded-2xl border border-border/70 p-5 animate-pulse"
              >
                <div className="h-4 bg-muted rounded w-32 mb-3" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-14 bg-card/70 backdrop-blur-md rounded-3xl border border-border/80 px-6">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground mb-1">No reviews yet</p>
            <p className="text-sm text-muted-foreground">
              Be the first to share your thoughts on this product.
            </p>
            {!user && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
                  )
                }
                className="mt-4 px-4 py-2 rounded-xl bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors"
              >
                Sign in to Review
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                className="bg-card/75 backdrop-blur-md rounded-2xl border border-border/80 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={clsx(
                            "w-4 h-4",
                            s <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30",
                          )}
                        />
                      ))}
                    </div>
                    {review.isVerifiedBuyer && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-semibold">
                        <Shield className="w-3 h-3" /> Verified Purchase
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {review.title && (
                  <h4 className="font-bold text-sm text-foreground mb-1">
                    {review.title}
                  </h4>
                )}
                {review.body && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.body}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setReviewPage((p) => p - 1)}
              disabled={!meta.hasPrevPage}
              className="p-2 rounded-xl border border-border bg-card/80 hover:bg-muted disabled:opacity-40 transition-colors"
              aria-label="Previous reviews page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page{" "}
              <span className="font-semibold text-foreground">{meta.page}</span>{" "}
              of {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setReviewPage((p) => p + 1)}
              disabled={!meta.hasNextPage}
              className="p-2 rounded-xl border border-border bg-card/80 hover:bg-muted disabled:opacity-40 transition-colors"
              aria-label="Next reviews page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* ─── Sticky Mobile Purchase Bar ────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden bg-card/90 backdrop-blur-xl border-t border-border/80 px-4 py-3 shadow-2xl">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="min-w-0">
            <p className="text-lg font-black font-['Outfit'] text-foreground leading-tight tabular-nums">
              {formatPrice(activePrice)}
            </p>
            {hasSalePrice && (
              <p className="text-xs text-muted-foreground line-through tabular-nums">
                {formatPrice(regularPrice)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isActionDisabled}
            className={clsx(
              "flex-1 max-w-[220px] h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors",
              isActionDisabled
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : inCart
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/35"
                  : "gradient-primary text-white",
            )}
          >
            {inCart ? (
              <Check className="w-4 h-4" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            {activeStock === 0
              ? "Out of Stock"
              : inCart
                ? "In Cart"
                : "Add to Cart"}
          </button>
        </div>
      </div>

      {/* ─── Fullscreen Image Lightbox Modal ───────────────────────── */}
      <AnimatePresence>
        {isLightboxOpen && currentImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close fullscreen gallery"
              className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {displayImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevImage();
                  }}
                  aria-label="Previous image"
                  className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextImage();
                  }}
                  aria-label="Next image"
                  className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <motion.img
              key={`lightbox-${activeImageIndex}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              src={currentImage}
              alt={product.title}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl select-none"
            />

            {displayImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold border border-white/15 tabular-nums">
                {activeImageIndex + 1} / {displayImages.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
