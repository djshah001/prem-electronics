import React from "react";
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
} from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import type { Product } from "../../types";
import { useAtomValue } from "jotai";
import { userAtom } from "../../store/userAtom";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

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

  // A default inventory variant exists for every product. Only products with
  // real option groups (color, size, storage, etc.) require configuration.
  const hasVariants = Boolean(
    product.hasVariants === true ||
    product.options?.some((option) => (option.values?.length ?? 0) > 0),
  );

  const isOutOfStock = product.stock === 0;

  // Wishlist state via shared hook
  const { isWishlisted: checkWishlisted, toggleItem, isToggling } = useWishlist();
  const isWishlisted = checkWishlisted(product.id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Sign in to save items to your wishlist");
      return;
    }
    toggleItem(product.id);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasVariants) {
      navigate(`/products/${product.slug}#product-options`);
    } else {
      addToCart(product);
    }
  };

  return (
    <motion.article
      data-product-card={product.id}
      data-product-has-variants={hasVariants ? "true" : "false"}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[1.6rem] border border-border/70 bg-card p-3 shadow-sm transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10",
        className,
      )}
    >
      {/* Top Metallic Pink Accent Shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* ─── Media Showcase Container ────────────────────────── */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/40">
        <Link
          to={`/products/${product.slug}`}
          className="relative block h-full w-full overflow-hidden outline-none"
        >
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108 will-change-transform"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector(".fallback-icon")) {
                  const fallback = document.createElement("div");
                  fallback.className =
                    "w-full h-full flex items-center justify-center text-muted-foreground/30 fallback-icon";
                  fallback.innerHTML =
                    '<svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
              <Zap className="h-10 w-10 opacity-30" />
            </div>
          )}

          {/* Vignette Shadow on Hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Link>

        {/* ─── Floating Badges (Top-Left) ──────────────────────── */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
          {product.salePrice && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm shadow-primary/30">
              -{calculateDiscount(product.price, product.salePrice)}%
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center rounded-lg border border-amber-400/30 bg-amber-400/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-black backdrop-blur-md">
              Featured
            </span>
          )}
          {hasVariants && (
            <span className="inline-flex items-center rounded-lg border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-md">
              Variants
            </span>
          )}
          {product.stock <= product.lowStockThreshold && product.stock > 0 && (
            <span className="inline-flex items-center rounded-lg border border-orange-500/30 bg-orange-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              Low Stock
            </span>
          )}
          {isOutOfStock && (
            <span className="inline-flex items-center rounded-lg border border-border/80 bg-zinc-950/80 px-2.5 py-1 text-[11px] font-bold text-white/80 backdrop-blur-md">
              Sold Out
            </span>
          )}
        </div>

        {/* ─── Wishlist Heart (Top-Right) ──────────────────────── */}
        <motion.button
          type="button"
          onClick={handleWishlist}
          disabled={isToggling}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.85 }}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-background/80 backdrop-blur-md shadow-sm transition-all duration-300",
            isWishlisted
              ? "opacity-100 text-primary border-primary/40 bg-primary/10 shadow-primary/20"
              : "opacity-0 text-muted-foreground group-hover:opacity-100 hover:text-primary hover:border-primary/30",
          )}
          aria-label={
            isWishlisted ? "Remove from wishlist" : "Save to wishlist"
          }
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors duration-200",
              isWishlisted ? "fill-primary text-primary" : "text-current",
            )}
          />
        </motion.button>
      </div>

      {/* ─── Content Information ─────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-between pt-3.5 pb-1 px-1">
        <div>
          {/* Brand & Star Rating Row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {product.brand || "Prem Gear"}
            </span>
            {product.reviewCount > 0 && (
              <div className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-foreground">
                  {Number(product.avgRating).toFixed(1)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({product.reviewCount})
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <Link to={`/products/${product.slug}`} className="block">
            <h3 className="line-clamp-2 text-[0.95rem] font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary leading-snug">
              {product.title}
            </h3>
          </Link>
        </div>

        {/* ─── Price & Action Footer ───────────────────────────── */}
        <div className="mt-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-foreground font-['Outfit']">
              {formatPrice(product.salePrice ?? product.price)}
            </span>
            {product.salePrice && (
              <span className="text-sm font-medium text-muted-foreground/80 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Conditional Action: Configure vs Add to Cart vs Out of Stock */}
          {isOutOfStock ? (
            <button
              type="button"
              data-product-action="sold-out"
              disabled
              className="w-full rounded-xl bg-muted py-2.5 text-sm font-semibold text-muted-foreground cursor-not-allowed text-center"
            >
              Sold Out
            </button>
          ) : hasVariants ? (
            /* Variant Action: Directs user to select options on product page */
            <button
              type="button"
              data-product-action="configure"
              onClick={handleAction}
              className="group/btn relative flex w-full items-center justify-between rounded-xl border border-border/80 bg-secondary/80 px-4 py-2.5 text-sm font-bold text-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Configure Options
              </span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </button>
          ) : (
            /* Standalone Action: Direct Quick Add to Cart */
            <button
              type="button"
              data-product-action="add-to-cart"
              onClick={handleAction}
              className={cn(
                "group/btn relative flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-300 active:scale-[0.98]",
                inCart
                  ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                  : "bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {inCart ? (
                  <motion.span
                    key="in-cart"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    In Cart
                  </motion.span>
                ) : (
                  <motion.span
                    key="add-cart"
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    className="flex items-center gap-1.5"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};
