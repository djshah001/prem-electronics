import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  RotateCcw,
  ArrowUp,
  LayoutGrid,
  Grid2x2,
  FolderTree,
  IndianRupee,
  PackageCheck,
  ArrowUpDown,
} from "lucide-react";
// Preserved icon imports for future filter re-activation: Star, Sparkles, Flame
import { api } from "../../api/axiosClient";
import { ProductCard } from "../../components/shared/ProductCard";
import type { Product, Category, PaginationMeta } from "../../types";
import { useDebounce } from "../../hooks/useDebounce";
import { normalizeCategoryList } from "../../hooks/useCategories";
import { clsx } from "clsx";
import { SEO } from "../../components/shared/SEO";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured / Recommended" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "popular", label: "Most Popular" },
];

const PRICE_PRESETS = [
  { label: "Under ₹25k", min: "", max: "25000" },
  { label: "₹25k – ₹75k", min: "25000", max: "75000" },
  { label: "₹75k – ₹2L", min: "75000", max: "200000" },
  { label: "₹2L+", min: "200000", max: "" },
];

const MAX_PRICE_LIMIT = 500000;

export const PARENT_CATEGORY_ORDER: Record<string, number> = {
  cameras: 1,
  "camera-lenses": 2,
  "action-pocket-cameras": 3,
  "gimbals-stabilizers": 4,
  "camera-accessories-media": 5,
  "pro-audio-microphones": 6,
};

export const SUB_CATEGORY_ORDER: Record<string, number> = {
  "full-frame-mirrorless-cameras": 1,
  "aps-c-mirrorless-cameras": 2,
  "cinema-broadcast-cameras": 2.5,
  "sony-fe-lenses": 3,
  "canon-rf-lenses": 3.1,
  "cinema-prime-lenses": 3.2,
  "sony-aps-c-lenses": 4,
  "canon-rf-s-lenses": 4.1,
  "dslr-cameras": 5,
  "canon-ef-lenses": 6,
  "compact-vlog-cameras": 7,
  "dji-action-series": 8,
  "dji-pocket-series": 8.1,
  "dji-ronin-stabilizers": 9,
  "dji-om-series": 9.1,
  "batteries-chargers-grips": 10,
  "memory-cards-readers": 10.1,
  "camera-microphones": 10.2,
  "lens-converters-adapters": 10.3,
  "photo-printers-consumables": 10.4,
};

export const QUICK_CATEGORY_ITEMS = [
  { label: "All Products", slugs: [] },
  { label: "Full-Frame Mirrorless", slugs: ["full-frame-mirrorless-cameras"] },
  {
    label: "APSC Mirrorless",
    slugs: ["aps-c-mirrorless-cameras", "cinema-broadcast-cameras"],
  },
  {
    label: "Full-Frame Lenses",
    slugs: ["sony-fe-lenses", "canon-rf-lenses", "cinema-prime-lenses"],
  },
  { label: "APSC Lenses", slugs: ["sony-aps-c-lenses", "canon-rf-s-lenses"] },
  { label: "DSLR Cameras", slugs: ["dslr-cameras"] },
  { label: "DSLR Lenses", slugs: ["canon-ef-lenses"] },
  { label: "Compact Cameras", slugs: ["compact-vlog-cameras"] },
  {
    label: "Action Cameras",
    slugs: ["action-pocket-cameras", "dji-action-series", "dji-pocket-series"],
  },
  {
    label: "DJI Gimbals",
    slugs: ["gimbals-stabilizers", "dji-om-series", "dji-ronin-stabilizers"],
  },
  {
    label: "Accessories",
    slugs: [
      "camera-accessories-media",
      "batteries-chargers-grips",
      "memory-cards-readers",
      "camera-microphones",
      "photo-printers-consumables",
      "lens-converters-adapters",
      "pro-audio-microphones",
    ],
  },
];

export const POPULAR_BRANDS = [
  "Apple",
  "Samsung",
  "Sony",
  "ASUS",
  "LG",
  "OnePlus",
  "Dell",
  "HP",
  "Boat",
];

/**
 * Helper to dynamically get brands for the active category.
 * Ready for activation when the approved brand list is provided.
 */
export const getBrandsForCategory = (categoryId?: string): string[] => {
  if (!categoryId) return POPULAR_BRANDS;
  return POPULAR_BRANDS;
};

/**
 * Temporarily disabled categories per store policy.
 * Implementation preserved here so they can be re-enabled at any time.
 */
export const TEMPORARILY_DISABLED_CATEGORIES = [
  "smartphones",
  "smartphone",
  "laptops",
  "laptop",
  "televisions",
  "television",
  "tv",
  "office laptops",
  "office-laptops",
  "office laptop",
];

export const RATING_OPTIONS = [
  { value: 4, label: "4★ & above" },
  { value: 3, label: "3★ & above" },
  { value: 2, label: "2★ & above" },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

/* -------------------------------------------------------------------------- */
/*  Collapsible Filter Accordion Section                                      */
/* -------------------------------------------------------------------------- */
interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}

function FilterSection({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between py-1.5 group text-left"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 font-semibold text-sm text-foreground font-['Outfit'] tracking-wide">
          <span className="text-muted-foreground group-hover:text-primary transition-colors">
            {icon}
          </span>
          {title}
          {badge !== undefined && badge !== "" && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary">
              {badge}
            </span>
          )}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="text-muted-foreground group-hover:text-foreground"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Standalone FilterPanel (Prevents Remounts & Preserves Input Focus)        */
/* -------------------------------------------------------------------------- */
interface FilterPanelProps {
  categories: Category[];
  categoryId: string;
  activeCategory?: Category;
  minPrice: string;
  maxPrice: string;
  sliderMax: number;
  inStock: boolean;
  hasFilters: boolean;
  onSelectCategory: (cat: Category | null) => void;
  onMinPriceChange: (val: string) => void;
  onMaxPriceChange: (val: string) => void;
  onSliderMaxChange: (val: number) => void;
  onApplyPricePreset: (min: string, max: string) => void;
  onInStockChange: (val: boolean) => void;
  onClearFilters: () => void;
}

function FilterPanel({
  categories,
  categoryId,
  activeCategory,
  minPrice,
  maxPrice,
  sliderMax,
  inStock,
  hasFilters,
  onSelectCategory,
  onMinPriceChange,
  onMaxPriceChange,
  onSliderMaxChange,
  onApplyPricePreset,
  onInStockChange,
  onClearFilters,
}: FilterPanelProps) {
  const [expandedParents, setExpandedParents] = useState<
    Record<string, boolean>
  >({});

  // Auto-expand the parent category of the currently selected subcategory
  useEffect(() => {
    if (activeCategory?.parentId) {
      setExpandedParents((prev) => ({
        ...prev,
        [activeCategory.parentId!]: true,
      }));
    } else if (activeCategory?.id) {
      setExpandedParents((prev) => ({ ...prev, [activeCategory.id]: true }));
    }
  }, [activeCategory]);

  const toggleParentExpand = (id: string) => {
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleParentCategories = useMemo(
    () =>
      categories
        .filter((c) => !c.parentId)
        .filter((c) => {
          const normName = c.name?.toLowerCase().trim() || "";
          const normSlug = c.slug?.toLowerCase().trim() || "";
          return (
            !TEMPORARILY_DISABLED_CATEGORIES.includes(normName) &&
            !TEMPORARILY_DISABLED_CATEGORIES.includes(normSlug)
          );
        })
        .sort(
          (a, b) =>
            (PARENT_CATEGORY_ORDER[a.slug] ?? 99) -
            (PARENT_CATEGORY_ORDER[b.slug] ?? 99),
        ),
    [categories],
  );

  const currentMaxNumeric = Math.min(
    MAX_PRICE_LIMIT,
    Math.max(1000, Number(maxPrice || sliderMax)),
  );
  const sliderPercent =
    ((currentMaxNumeric - 1000) / (MAX_PRICE_LIMIT - 1000)) * 100;
  const isPriceActive =
    Boolean(minPrice) ||
    Boolean(maxPrice && Number(maxPrice) < MAX_PRICE_LIMIT);

  return (
    <div className="space-y-4">
      {/* Category Tree */}
      <FilterSection
        title="Category"
        icon={<FolderTree className="w-4 h-4" />}
        badge={activeCategory ? 1 : undefined}
      >
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={clsx(
              "w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center justify-between",
              !categoryId
                ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            <span>All Categories</span>
            {!categoryId && <Check className="w-4 h-4 shrink-0" />}
          </button>

          {visibleParentCategories.map((cat) => {
            const isCatSelected = categoryId === cat.id;
            const subcategories = (cat.children ?? [])
              .filter((s) => s.isActive !== false)
              .sort(
                (a, b) =>
                  (SUB_CATEGORY_ORDER[a.slug] ?? 99) -
                  (SUB_CATEGORY_ORDER[b.slug] ?? 99),
              );
            const hasActiveChild = subcategories.some(
              (s) => s.id === categoryId,
            );
            const isExpanded = Boolean(
              expandedParents[cat.id] || isCatSelected || hasActiveChild,
            );

            return (
              <div key={cat.id} className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={clsx(
                      "flex-1 text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center justify-between font-medium",
                      isCatSelected
                        ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30"
                        : hasActiveChild
                          ? "text-foreground bg-muted/40"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isCatSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>

                  {subcategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleParentExpand(cat.id)}
                      aria-label={`Toggle ${cat.name} subcategories`}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <motion.span
                        className="block"
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </motion.span>
                    </button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {subcategories.length > 0 && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pl-3 ml-3 my-1 space-y-0.5 border-l border-border/60">
                        {subcategories.map((sub) => {
                          const isSubSelected = categoryId === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => onSelectCategory(sub)}
                              className={clsx(
                                "w-full text-left px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] transition-all flex items-center justify-between",
                                isSubSelected
                                  ? "bg-primary/15 text-primary font-semibold"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                              )}
                            >
                              <span className="truncate">{sub.name}</span>
                              {isSubSelected && (
                                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </FilterSection>

      {/* =========================================================================
          BRANDS FILTER (TEMPORARILY DISABLED)
          Preserved for future activation once the approved brand list is provided.
          When activated, displays only the brands relevant to the active category.
          ========================================================================= */}
      {/* 
      <FilterSection title="Brands" icon={<Tag className="w-4 h-4" />}>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {POPULAR_BRANDS.map((b) => {
            const isSelected = selectedBrand.toLowerCase() === b.toLowerCase();
            return (
              <label
                key={b}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-card cursor-pointer text-sm transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => setSelectedBrand(isSelected ? '' : b)}
                  className="accent-primary w-4 h-4 rounded"
                />
                <span className={clsx(isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{b}</span>
              </label>
            );
          })}
        </div>
      </FilterSection>
      */}

      {/* Price Range Filter */}
      <FilterSection
        title="Price Range"
        icon={<IndianRupee className="w-4 h-4" />}
        badge={isPriceActive ? "Active" : undefined}
      >
        <div className="space-y-3.5">
          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-1.5">
            {PRICE_PRESETS.map((preset) => {
              const isPresetActive =
                minPrice === preset.min && maxPrice === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    isPresetActive
                      ? onApplyPricePreset("", "")
                      : onApplyPricePreset(preset.min, preset.max)
                  }
                  className={clsx(
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border text-center",
                    isPresetActive
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-background/60 text-muted-foreground border-border/70 hover:text-foreground hover:border-border",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Visual Range Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Up to</span>
              <span className="font-bold text-primary tabular-nums">
                {formatCurrency(currentMaxNumeric)}
              </span>
            </div>
            <div className="relative h-5 flex items-center">
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.max(0, sliderPercent))}%`,
                  }}
                />
              </div>
              <input
                type="range"
                min="1000"
                max={MAX_PRICE_LIMIT}
                step="5000"
                value={currentMaxNumeric}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onSliderMaxChange(val);
                  onMaxPriceChange(String(val));
                }}
                aria-label="Maximum price"
                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="pointer-events-none absolute w-4 h-4 rounded-full bg-primary border-2 border-background shadow-sm transition-all duration-75"
                style={{
                  left: `calc(${Math.min(100, Math.max(0, sliderPercent))}% - 8px)`,
                }}
              />
            </div>
          </div>

          {/* Min / Max Numeric Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Min
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => onMinPriceChange(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-background/70 border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Max
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  placeholder="500000"
                  value={maxPrice}
                  onChange={(e) => {
                    onMaxPriceChange(e.target.value);
                    if (e.target.value)
                      onSliderMaxChange(Number(e.target.value));
                  }}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-background/70 border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* =========================================================================
          CUSTOMER RATING FILTER (TEMPORARILY DISABLED)
          Preserved for future use per store instructions.
          ========================================================================= */}
      {/* 
      <FilterSection title="Customer Rating" icon={<Star className="w-4 h-4" />}>
        <div className="space-y-1">
          {RATING_OPTIONS.map((r) => {
            const active = minRating === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setMinRating(active ? null : r.value)}
                className={clsx(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                  active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-card'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={clsx('w-3.5 h-3.5', s <= r.value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
                      />
                    ))}
                  </div>
                  <span>{r.label}</span>
                </div>
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </FilterSection>
      */}

      {/* =========================================================================
          SPECIAL TAGS FILTER (TEMPORARILY DISABLED)
          Preserved for future use per store instructions.
          ========================================================================= */}
      {/* 
      <FilterSection title="Special Tags" icon={<Sparkles className="w-4 h-4" />}>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={isNewArrival}
              onChange={(e) => setIsNewArrival(e.target.checked)}
              className="accent-purple-500 w-4 h-4 rounded"
            />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="w-4 h-4 text-purple-400" /> New Arrivals
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={isBestSeller}
              onChange={(e) => setIsBestSeller(e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded"
            />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Flame className="w-4 h-4 text-amber-400" /> Best Sellers
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="accent-blue-500 w-4 h-4 rounded"
            />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              Featured Items
            </span>
          </label>
        </div>
      </FilterSection>
      */}

      {/* Availability Toggle */}
      <FilterSection
        title="Availability"
        icon={<PackageCheck className="w-4 h-4" />}
        badge={inStock ? 1 : undefined}
      >
        <label className="flex items-center justify-between gap-3 cursor-pointer p-2.5 rounded-xl bg-background/50 border border-border/60 hover:border-border transition-colors group">
          <div>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors block">
              In Stock Only
            </span>
            <span className="text-[11px] text-muted-foreground">
              Hide out-of-stock gear
            </span>
          </div>
          <div className="relative shrink-0">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => onInStockChange(e.target.checked)}
              className="sr-only"
            />
            <div
              className={clsx(
                "w-11 h-6 rounded-full p-0.5 flex items-center transition-colors duration-200",
                inStock ? "bg-primary justify-end" : "bg-muted justify-start",
              )}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="w-5 h-5 rounded-full bg-white shadow-sm"
              />
            </div>
          </div>
        </label>
      </FilterSection>

      {/* Reset All Button */}
      <AnimatePresence>
        {hasFilters && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClearFilters}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-destructive/40 bg-destructive/5 text-destructive rounded-xl text-sm font-semibold hover:bg-destructive/15 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Custom Animated Sort Dropdown                                             */
/* -------------------------------------------------------------------------- */
function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3.5 py-2 bg-card/80 backdrop-blur-md border border-border rounded-xl text-sm text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="truncate max-w-[140px] sm:max-w-[175px] font-medium">
          {selectedLabel}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-56 z-40 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-xl p-1.5 space-y-0.5"
          >
            {SORT_OPTIONS.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors text-left",
                      isSelected
                        ? "bg-primary/15 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Shop Page                                                            */
/* -------------------------------------------------------------------------- */
export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") ?? "",
  );
  const [selectedBrand, setSelectedBrand] = useState(
    searchParams.get("brand") ?? "",
  );
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") ?? "featured",
  );
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sliderMax, setSliderMax] = useState(MAX_PRICE_LIMIT);
  const [inStock, setInStock] = useState(false);
  const [isFeatured, setIsFeatured] = useState(
    searchParams.get("isFeatured") === "true",
  );
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [gridCols, setGridCols] = useState<2 | 3>(3);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const debouncedSearch = useDebounce(search, 450);
  const debouncedMinPrice = useDebounce(minPrice, 350);
  const debouncedMaxPrice = useDebounce(maxPrice, 350);

  const baseQueryParams = useMemo(
    () => ({
      limit: 12,
      sortBy,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(categoryId && { categoryId }),
      ...(selectedBrand && { brand: selectedBrand }),
      ...(minRating && { minRating }),
      ...(debouncedMinPrice && { minPrice: Number(debouncedMinPrice) }),
      ...(debouncedMaxPrice && { maxPrice: Number(debouncedMaxPrice) }),
      ...(inStock && { inStock: true }),
      ...(isFeatured && { isFeatured: true }),
      ...(isNewArrival && { isNewArrival: true }),
      ...(isBestSeller && { isBestSeller: true }),
    }),
    [
      debouncedSearch,
      categoryId,
      selectedBrand,
      minRating,
      debouncedMinPrice,
      debouncedMaxPrice,
      inStock,
      isFeatured,
      isNewArrival,
      isBestSeller,
      sortBy,
    ],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["products-infinite", baseQueryParams],
    queryFn: ({ pageParam = 1 }) =>
      api.get<Product[]>("/products", {
        ...baseQueryParams,
        page: pageParam,
      } as Record<string, unknown>),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta as PaginationMeta | undefined;
      if (meta && meta.hasNextPage) {
        return meta.page + 1;
      }
      return undefined;
    },
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  // Flatten and deduplicate products across all fetched pages
  const products = useMemo(() => {
    if (!data?.pages) return [];
    const seen = new Set<string>();
    const list: Product[] = [];
    for (const page of data.pages) {
      const items = (page as any)?.data ?? [];
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      }
    }
    return list;
  }, [data?.pages]);

  const totalCount = (data?.pages?.[0]?.meta as PaginationMeta | undefined)
    ?.total;
  const categories = useMemo(
    () => normalizeCategoryList(categoriesRes),
    [categoriesRes],
  );

  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Back-to-top button visibility
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 550);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll & handle Escape when mobile filter drawer is open
  useEffect(() => {
    if (!mobileFilters) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileFilters(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileFilters]);

  // Synchronize component state with URL searchParams (e.g. from navbar clicks)
  useEffect(() => {
    const urlCatId = searchParams.get("categoryId");
    const urlCatSlug = searchParams.get("categorySlug");
    const urlSearch = searchParams.get("search");
    const urlBrand = searchParams.get("brand");
    const urlFeatured = searchParams.get("isFeatured");

    if (urlCatId) {
      setCategoryId(urlCatId);
    } else if (urlCatSlug && categories.length > 0) {
      const findInTree = (items: Category[]): Category | undefined => {
        for (const item of items) {
          if (item.slug === urlCatSlug) return item;
          if (item.children?.length) {
            const found = findInTree(item.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      const match = findInTree(categories);
      if (match) {
        setCategoryId(match.id);
      }
    } else if (
      !searchParams.has("categoryId") &&
      !searchParams.has("categorySlug")
    ) {
      setCategoryId("");
    }

    setSearch(urlSearch ?? "");
    setSelectedBrand(urlBrand ?? "");
    setIsFeatured(urlFeatured === "true");
    const urlSort = searchParams.get("sortBy");
    setSortBy(urlSort ?? "featured");
  }, [searchParams, categories]);

  const findCategory = useCallback(
    (id: string, list: Category[]): Category | undefined => {
      for (const c of list) {
        if (c.id === id) return c;
        if (c.children?.length) {
          const found = findCategory(id, c.children);
          if (found) return found;
        }
      }
      return undefined;
    },
    [],
  );

  const findCategoryBySlug = useCallback(
    (slug: string, list: Category[]): Category | undefined => {
      for (const c of list) {
        if (c.slug === slug) return c;
        if (c.children?.length) {
          const found = findCategoryBySlug(slug, c.children);
          if (found) return found;
        }
      }
      return undefined;
    },
    [],
  );

  const activeCategory = useMemo(
    () => (categoryId ? findCategory(categoryId, categories) : undefined),
    [categoryId, categories, findCategory],
  );

  const isPillSelected = (item: (typeof QUICK_CATEGORY_ITEMS)[number]) => {
    if (item.slugs.length === 0) return !categoryId;
    if (!activeCategory) return false;
    if (item.slugs.includes(activeCategory.slug)) return true;
    const parentCat = categories.find((c) => c.id === activeCategory.parentId);
    if (parentCat && item.slugs.includes(parentCat.slug)) return true;
    return false;
  };

  const handleSelectCategory = useCallback(
    (cat: Category | null) => {
      if (!cat) {
        setCategoryId("");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("categoryId");
          next.delete("categorySlug");
          return next;
        });
      } else {
        setCategoryId(cat.id);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("categoryId", cat.id);
          next.set("categorySlug", cat.slug);
          return next;
        });
      }
    },
    [setSearchParams],
  );

  const handleApplyPricePreset = useCallback((min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    setSliderMax(max ? Number(max) : MAX_PRICE_LIMIT);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryId("");
    setSelectedBrand("");
    setMinRating(null);
    setSortBy("featured");
    setMinPrice("");
    setMaxPrice("");
    setSliderMax(MAX_PRICE_LIMIT);
    setInStock(false);
    setIsFeatured(false);
    setIsNewArrival(false);
    setIsBestSeller(false);
    setSearchParams({});
  }, [setSearchParams]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryId) count++;
    if (selectedBrand) count++;
    if (minRating !== null) count++;
    if (minPrice) count++;
    if (maxPrice && Number(maxPrice) < MAX_PRICE_LIMIT) count++;
    if (inStock) count++;
    if (isFeatured) count++;
    if (isNewArrival) count++;
    if (isBestSeller) count++;
    return count;
  }, [
    categoryId,
    selectedBrand,
    minRating,
    minPrice,
    maxPrice,
    inStock,
    isFeatured,
    isNewArrival,
    isBestSeller,
  ]);

  const hasFilters =
    activeFilterCount > 0 || Boolean(search) || sortBy !== "featured";

  const filterPanelProps: FilterPanelProps = {
    categories,
    categoryId,
    activeCategory,
    minPrice,
    maxPrice,
    sliderMax,
    inStock,
    hasFilters,
    onSelectCategory: handleSelectCategory,
    onMinPriceChange: setMinPrice,
    onMaxPriceChange: setMaxPrice,
    onSliderMaxChange: setSliderMax,
    onApplyPricePreset: handleApplyPricePreset,
    onInStockChange: setInStock,
    onClearFilters: clearFilters,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <SEO
        title={
          activeCategory
            ? `${activeCategory.name} — Shop Online`
            : debouncedSearch
              ? `Search "${debouncedSearch}"`
              : "Shop Electronics"
        }
        description={`Explore premium electronics, gadgets, and accessories at Prem Electronics.${
          activeCategory ? ` Browse top deals in ${activeCategory.name}.` : ""
        }`}
        keywords={`${activeCategory?.name || "electronics"}, smartphones, laptops, audio, accessories, shop online India`}
      />

      {/* Header & Controls */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6"
      >
        <div>
          <AnimatePresence mode="wait">
            <motion.h1
              key={debouncedSearch || activeCategory?.id || "default-title"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-3xl sm:text-4xl font-black font-['Outfit'] tracking-tight"
            >
              {debouncedSearch
                ? `Results for "${debouncedSearch}"`
                : activeCategory
                  ? activeCategory.name
                  : "Shop Electronics"}
            </motion.h1>
          </AnimatePresence>
          <div className="flex items-center gap-2.5 mt-1.5 min-h-[20px]">
            {totalCount !== undefined && (
              <p className="text-muted-foreground text-sm">
                <span className="font-semibold text-foreground tabular-nums">
                  {totalCount}
                </span>{" "}
                product
                {totalCount !== 1 ? "s" : ""} available
              </p>
            )}
            {isFetching && !isLoading && !isFetchingNextPage && (
              <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating...
              </span>
            )}
          </div>
        </div>

        {/* Search, Sort, Grid Toggle & Mobile Filter Trigger */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cameras, lenses..."
              className="w-full pl-10 pr-8 py-2 bg-card/80 backdrop-blur-md border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Custom Animated Sort Dropdown */}
          <SortDropdown value={sortBy} onChange={setSortBy} />

          {/* Desktop Grid Density Toggle */}
          <div className="hidden lg:flex items-center p-1 bg-card/80 backdrop-blur-md border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setGridCols(3)}
              aria-label="3 column grid"
              className={clsx(
                "p-1.5 rounded-lg transition-colors",
                gridCols === 3
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setGridCols(2)}
              aria-label="2 column grid"
              className={clsx(
                "p-1.5 rounded-lg transition-colors",
                gridCols === 2
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Grid2x2 className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Filter Trigger */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => setMobileFilters(true)}
            className="lg:hidden relative flex items-center gap-2 px-3.5 py-2 bg-card/80 backdrop-blur-md border border-border rounded-xl text-sm font-medium hover:border-primary/50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground leading-none">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Animated Category Quick Pills */}
      <div className="relative mb-5 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-2 min-w-max">
            {QUICK_CATEGORY_ITEMS.map((item) => {
              const isSelected = isPillSelected(item);
              return (
                <motion.button
                  key={item.label}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (item.slugs.length === 0) {
                      handleSelectCategory(null);
                    } else {
                      const match = findCategoryBySlug(
                        item.slugs[0],
                        categories,
                      );
                      if (match) handleSelectCategory(match);
                    }
                  }}
                  className={clsx(
                    "relative px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap border shadow-xl",
                    isSelected
                      ? "text-primary-foreground bg-primary border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-muted/50",
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="activeQuickPill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      className="absolute inset-0 rounded-full bg-primary -z-10"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Animated Active Filter Chips */}
      <AnimatePresence>
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-6"
          >
            <div className="flex items-center gap-2 flex-wrap py-1">
              <span className="text-xs font-medium text-muted-foreground">
                Active:
              </span>

              <AnimatePresence mode="popLayout">
                {activeCategory && (
                  <motion.span
                    layout
                    key="chip-category"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold"
                  >
                    {activeCategory.name}
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(null)}
                      aria-label={`Remove ${activeCategory.name} filter`}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}

                {sortBy !== "featured" && (
                  <motion.span
                    layout
                    key="chip-sort"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                  >
                    Sort:{" "}
                    {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ??
                      sortBy}
                    <button
                      type="button"
                      onClick={() => setSortBy("featured")}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}

                {selectedBrand && (
                  <motion.span
                    layout
                    key="chip-brand"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                  >
                    Brand: {selectedBrand}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand("");
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.delete("brand");
                          return next;
                        });
                      }}
                      aria-label={`Remove brand filter ${selectedBrand}`}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}

                {minRating && (
                  <motion.span
                    layout
                    key="chip-rating"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
                  >
                    {minRating}★ & above
                    <button
                      type="button"
                      onClick={() => setMinRating(null)}
                      className="hover:bg-amber-500/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}

                {minPrice && (
                  <motion.span
                    layout
                    key="chip-min-price"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                  >
                    Min: {formatCurrency(Number(minPrice))}
                    <button
                      type="button"
                      onClick={() => setMinPrice("")}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}

                {maxPrice && Number(maxPrice) < MAX_PRICE_LIMIT && (
                  <motion.span
                    layout
                    key="chip-max-price"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                  >
                    Max: {formatCurrency(Number(maxPrice))}
                    <button
                      type="button"
                      onClick={() => {
                        setMaxPrice("");
                        setSliderMax(MAX_PRICE_LIMIT);
                      }}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}

                {isNewArrival && (
                  <motion.span
                    layout
                    key="chip-new"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium"
                  >
                    New Arrivals
                    <button
                      type="button"
                      onClick={() => setIsNewArrival(false)}
                      className="hover:bg-purple-500/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}

                {isBestSeller && (
                  <motion.span
                    layout
                    key="chip-best"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
                  >
                    Best Sellers
                    <button
                      type="button"
                      onClick={() => setIsBestSeller(false)}
                      className="hover:bg-amber-500/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}

                {inStock && (
                  <motion.span
                    layout
                    key="chip-stock"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
                  >
                    In Stock Only
                    <button
                      type="button"
                      onClick={() => setInStock(false)}
                      className="hover:bg-emerald-500/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 ml-1 transition-colors"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex gap-8 items-start">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-5 self-start">
          <div className="bg-card/75 backdrop-blur-xl rounded-2xl border border-border/80 p-5 shadow-sm max-h-[calc(100vh-6rem)] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-foreground font-['Outfit'] text-base">
                  Filters
                </h2>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-primary hover:underline underline-offset-4"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Scrollable Filter Body */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-2 -mr-2
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-border/70
        hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
            >
              <FilterPanel {...filterPanelProps} />
            </div>
          </div>
        </aside>

        {/* Animated Mobile Filters Drawer */}
        <AnimatePresence>
          {mobileFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileFilters(false)}
            >
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 360, damping: 34 }}
                className="absolute right-0 top-0 bottom-0 w-[86vw] max-w-sm bg-card/95 backdrop-blur-2xl border-l border-border flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-border/70">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <h2 className="font-bold font-['Outfit'] text-lg">
                      Filters
                    </h2>
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileFilters(false)}
                    aria-label="Close filters"
                    className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <FilterPanel {...filterPanelProps} />
                </div>

                {/* Sticky Drawer Footer */}
                <div className="p-4 border-t border-border/70 bg-card/90 backdrop-blur-md flex items-center gap-2.5">
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileFilters(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity"
                  >
                    {totalCount !== undefined
                      ? `Show ${totalCount} Result${totalCount === 1 ? "" : "s"}`
                      : "Apply Filters"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div
              className={clsx(
                "grid grid-cols-1 sm:grid-cols-2 gap-5",
                gridCols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
              )}
            >
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card/70 rounded-2xl border border-border/70 overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-muted/70" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted/80 rounded-md w-3/4" />
                    <div className="h-3.5 bg-muted/60 rounded-md w-1/2" />
                    <div className="h-9 bg-muted/70 rounded-xl mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center py-24 text-center bg-card/70 backdrop-blur-md rounded-3xl border border-border/80 p-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/70 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] mb-2">
                No products found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                We couldn&apos;t find any gear matching your selected filters.
                Try broadening your price range or clearing a filter.
              </p>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-6 py-2.5 gradient-primary text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                Clear All Filters
              </motion.button>
            </motion.div>
          ) : (
            <>
              <div
                className={clsx(
                  "grid grid-cols-1 sm:grid-cols-2 gap-5 transition-opacity duration-200",
                  gridCols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
                  isFetching && !isFetchingNextPage
                    ? "opacity-70"
                    : "opacity-100",
                )}
              >
                {products.map((product, i) => (
                  <motion.div
                    key={product.id}
                    layout="position"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.32,
                      delay: (i % 12) * 0.035,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>

              {/* Infinite Scroll Sentinel & Loading Indicator */}
              <div
                ref={sentinelRef}
                className="py-10 flex flex-col justify-center items-center w-full"
              >
                <AnimatePresence mode="wait">
                  {isFetchingNextPage && (
                    <motion.div
                      key="loading-more"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-sm text-xs font-semibold text-foreground"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading more products...</span>
                    </motion.div>
                  )}
                  {!hasNextPage && products.length > 0 && (
                    <motion.p
                      key="end-of-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground/70 pt-4 border-t border-border/40 w-full text-center"
                    >
                      Showing all {products.length}{" "}
                      {products.length === 1 ? "product" : "products"}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-card/90 backdrop-blur-xl border border-border shadow-lg text-foreground hover:text-primary hover:border-primary/50 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
