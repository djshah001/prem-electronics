import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Star,
  Zap,
  Heart,
  SlidersHorizontal,
  Check,
  ArrowRight,
  Eye,
  ImageOff,
} from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import type { Product } from "../../types";
import { useAtomValue } from "jotai";
import { userAtom } from "../../store/userAtom";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { getProductThumbnailUrl } from "../../lib/image";

interface ProductCardProps {
  product: Product;
  className?: string;
}

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(p));

const calculateDiscount = (original: string | number, sale: string | number) =>
  Math.round(((Number(original) - Number(sale)) / Number(original)) * 100);

export const ProductCard = ({ product, className }: ProductCardProps) => {
  const { addToCart, isInCart } = useCart();
  const inCart = isInCart(product.id);
  const user = useAtomValue(userAtom);
  const navigate = useNavigate();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [primaryError, setPrimaryError] = useState(false);
  const [secondaryError, setSecondaryError] = useState(false);

  // A default inventory variant exists for every product. Only products with
  // real option groups (color, size, storage, etc.) require configuration.
  const hasVariants = Boolean(
    product.hasVariants === true ||
    product.options?.some((option) => (option.values?.length ?? 0) > 0),
  );

  const isOutOfStock = product.stock === 0;
  const isLowStock =
    !isOutOfStock && product.stock <= product.lowStockThreshold;
  const hasSale = Boolean(
    product.salePrice && Number(product.salePrice) < Number(product.price),
  );
  const discountPercent = hasSale
    ? calculateDiscount(product.price, product.salePrice!)
    : 0;
  const savingsAmount = hasSale
    ? Number(product.price) - Number(product.salePrice)
    : 0;

  const primaryImage = product.images?.[0]
    ? getProductThumbnailUrl(product.images[0])
    : null;
  const secondaryImage =
    product.images?.[1] && !secondaryError
      ? getProductThumbnailUrl(product.images[1])
      : null;

  // Wishlist state via shared hook
  const {
    isWishlisted: checkWishlisted,
    toggleItem,
    isToggling,
  } = useWishlist();
  const isWishlisted = checkWishlisted(product.id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Please sign in to save items to your wishlist.");
      navigate(
        `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    toggleItem(product.id);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasVariants) {
      navigate(`/products/${product.slug}#product-options`);
      return;
    }

    if (!user) {
      toast.info("Please sign in to add items to your cart.");
      navigate(
        `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }

    addToCart(product);
  };

  return (
    <motion.article
      data-product-card={product.id}
      data-product-has-variants={hasVariants ? "true" : "false"}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] border border-border/75 bg-card/85 backdrop-blur-md p-3 shadow-sm transition-colors duration-300 hover:border-primary/45 hover:shadow-xl hover:shadow-primary/10",
        className,
      )}
    >
      {/* Top Edge Accent Shimmer */}
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* ─── Media Showcase Container ────────────────────────── */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/40">
        <Link
          to={`/products/${product.slug}`}
          className="relative block h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {/* Loading Shimmer */}
          {primaryImage && !primaryError && !imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-muted/60" />
          )}

          {primaryImage && !primaryError ? (
            <>
              <img
                src={primaryImage}
                alt={product.title}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setPrimaryError(true)}
                className={cn(
                  "h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.06]",
                  imageLoaded ? "opacity-100" : "opacity-0",
                  secondaryImage && "group-hover:opacity-0",
                  isOutOfStock && "grayscale-[0.65] opacity-75",
                )}
              />

              {/* Secondary Angle Crossfade on Hover */}
              {secondaryImage && (
                <img
                  src={secondaryImage}
                  alt={`${product.title} alternate view`}
                  loading="lazy"
                  onError={() => setSecondaryError(true)}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:opacity-100 group-hover:scale-[1.06]",
                    isOutOfStock && "grayscale-[0.65]",
                  )}
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/35">
              {primaryError ? (
                <ImageOff className="h-9 w-9" />
              ) : (
                <Zap className="h-9 w-9 opacity-40" />
              )}
            </div>
          )}

          {/* Subtle Hover Vignette */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Floating "Quick View" Pill on Hover */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center translate-y-3 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/65 px-3 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md">
              <Eye className="h-3.5 w-3.5" />
              View Details
            </span>
          </div>
        </Link>

        {/* ─── Floating Badges (Top-Left) ──────────────────────── */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1.5">
          {hasSale && discountPercent > 0 && (
            <span className="inline-flex items-center rounded-lg bg-primary px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary-foreground shadow-sm">
              -{discountPercent}%
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center rounded-lg border border-amber-400/35 bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black backdrop-blur-md">
              Featured
            </span>
          )}
          {hasVariants && !isOutOfStock && (
            <span className="inline-flex items-center rounded-lg border border-white/15 bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/90 backdrop-blur-md">
              Options
            </span>
          )}
          {isLowStock && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-orange-500/35 bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Low Stock
            </span>
          )}
          {isOutOfStock && (
            <span className="inline-flex items-center rounded-lg border border-white/15 bg-zinc-950/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-md">
              Sold Out
            </span>
          )}
        </div>

        {/* ─── Wishlist Heart (Top-Right) ──────────────────────── */}
        <motion.button
          type="button"
          onClick={handleWishlist}
          disabled={isToggling}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.86 }}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md shadow-sm transition-all duration-300",
            isWishlisted
              ? "opacity-100 border-primary/45 bg-primary/15 text-primary"
              : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 border-white/20 bg-background/75 text-muted-foreground hover:text-primary hover:border-primary/40",
          )}
          aria-label={
            isWishlisted ? "Remove from wishlist" : "Save to wishlist"
          }
        >
          <motion.span
            key={isWishlisted ? "wishlisted" : "unwishlisted"}
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="flex items-center justify-center"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                isWishlisted ? "fill-primary text-primary" : "text-current",
              )}
            />
          </motion.span>
        </motion.button>
      </div>

      {/* ─── Content Information ─────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-between pt-3.5 pb-1 px-1">
        <div>
          {/* Brand & Star Rating Row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="truncate text-[11px] font-bold uppercase tracking-widest text-primary">
              {product.brand || "Prem Gear"}
            </span>
            {product.reviewCount > 0 && (
              <div className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-bold text-foreground tabular-nums">
                  {Number(product.avgRating).toFixed(1)}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  ({product.reviewCount})
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <Link to={`/products/${product.slug}`} className="block outline-none">
            <h3 className="line-clamp-2 text-[0.95rem] font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary leading-snug">
              {product.title}
            </h3>
          </Link>
        </div>

        {/* ─── Price & Action Footer ───────────────────────────── */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight text-foreground font-['Outfit'] tabular-nums">
                {formatPrice(product.salePrice ?? product.price)}
              </span>
              {hasSale && (
                <span className="text-xs font-medium text-muted-foreground/75 line-through tabular-nums">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            {hasSale && savingsAmount > 0 && (
              <span className="text-[11px] font-semibold text-emerald-500 tabular-nums">
                Save {formatPrice(savingsAmount)}
              </span>
            )}
          </div>

          {/* Conditional Action: Sold Out vs Configure vs Add to Cart */}
          {isOutOfStock ? (
            <button
              type="button"
              data-product-action="sold-out"
              disabled
              className="w-full rounded-xl border border-border/60 bg-muted/60 py-2.5 text-sm font-semibold text-muted-foreground cursor-not-allowed text-center"
            >
              Out of Stock
            </button>
          ) : hasVariants ? (
            <motion.button
              type="button"
              data-product-action="configure"
              whileTap={{ scale: 0.98 }}
              onClick={handleAction}
              className="group/btn relative flex w-full items-center justify-between rounded-xl border border-border/80 bg-secondary/70 px-4 py-2.5 text-sm font-bold text-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary transition-transform duration-300 group-hover/btn:rotate-12" />
                Configure Options
              </span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              data-product-action="add-to-cart"
              whileTap={{ scale: 0.98 }}
              onClick={handleAction}
              className={cn(
                "group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-2.5 text-sm font-bold shadow-sm transition-colors duration-300",
                inCart
                  ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {/* Subtle Button Sheen on Hover */}
              {!inCart && (
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full" />
              )}

              <AnimatePresence mode="wait" initial={false}>
                {inCart ? (
                  <motion.span
                    key="in-cart"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 24 }}
                    className="relative z-10 flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    In Cart
                  </motion.span>
                ) : (
                  <motion.span
                    key="add-cart"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16 }}
                    className="relative z-10 flex items-center gap-1.5"
                  >
                    <ShoppingCart className="h-4 w-4 transition-transform duration-300 group-hover/btn:-rotate-6" />
                    Add to Cart
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
};
