import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Smartphone,
  Laptop,
  Headphones,
  Tv,
  Camera,
  Package,
} from "lucide-react";
import type { Category } from "../../types";
import type { CategoryConfig } from "../../config/navigationCategories";
import { getCategoryIconComponent } from "../../config/navigationCategories";
import { cn } from "../../lib/utils";

interface NavCategoryDropdownProps {
  category: Category | CategoryConfig;
  onNavigate?: () => void;
  overlay?: boolean;
  isHovered?: boolean;
  onHoverStart?: () => void;
}

export const getCategoryIcon = (slugOrName: string) => {
  const normalized = slugOrName.toLowerCase();
  if (normalized.includes("phone") || normalized.includes("mobile")) {
    return Smartphone;
  }
  if (normalized.includes("laptop") || normalized.includes("computer")) {
    return Laptop;
  }
  if (
    normalized.includes("audio") ||
    normalized.includes("headphone") ||
    normalized.includes("sound")
  ) {
    return Headphones;
  }
  if (normalized.includes("tv") || normalized.includes("television")) {
    return Tv;
  }
  if (normalized.includes("camera") || normalized.includes("photo")) {
    return Camera;
  }
  return Package;
};

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
      staggerChildren: 0.03,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.98,
    transition: { duration: 0.14, ease: "easeOut" },
  },
};

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 380, damping: 28 },
  },
};

export const NavCategoryDropdown = ({
  category,
  onNavigate,
  overlay = false,
  isHovered = false,
  onHoverStart,
}: NavCategoryDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    if (!category) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [category]);

  useEffect(() => {
    if (!category || !isOpen) return;
    const updateAlignment = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setAlignRight(window.innerWidth - rect.left < 400);
      }
    };
    updateAlignment();
    window.addEventListener("resize", updateAlignment);
    return () => window.removeEventListener("resize", updateAlignment);
  }, [category, isOpen]);

  if (!category) return null;

  const subcategories: Array<{
    name: string;
    slug: string;
    id?: string;
    href?: string;
    description?: string;
  }> =
    Array.isArray((category as any).subcategories) &&
    (category as any).subcategories.length > 0
      ? (category as any).subcategories
      : Array.isArray((category as Category).children) &&
          (category as Category).children!.length > 0
        ? ((category as Category).children || [])
            .filter((sub) => sub && sub.isActive !== false)
            .map((sub) => ({
              name: sub.name,
              slug: sub.slug,
              id: sub.id,
              description: sub.description,
              href: sub.id
                ? `/shop?categoryId=${sub.id}&categorySlug=${sub.slug}`
                : `/shop?categorySlug=${sub.slug}`,
            }))
        : Array.isArray((category as any).subcategories)
          ? (category as any).subcategories
          : [];

  const hasSubcategories = subcategories.length > 0;

  const CategoryIcon = (category as any).iconName
    ? getCategoryIconComponent((category as any).iconName)
    : getCategoryIcon(category.slug || category.name || "");

  const categoryHref =
    (category as any).href ||
    ((category as any).id
      ? `/shop?categoryId=${(category as any).id}&categorySlug=${category.slug}`
      : `/shop?categorySlug=${category.slug}`);

  const handleMouseEnter = () => {
    onHoverStart?.();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setAlignRight(window.innerWidth - rect.left < 400);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 160);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      if (hasSubcategories) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showPill = isHovered || isOpen;

  if (!hasSubcategories) {
    return (
      <Link
        to={categoryHref}
        onMouseEnter={onHoverStart}
        onClick={onNavigate}
        className={cn(
          "relative rounded-lg px-2.5 sm:px-3 lg:px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold transition-colors duration-200 whitespace-nowrap select-none",
          overlay
            ? "text-white/90 hover:text-white"
            : "text-foreground/90 hover:text-primary",
        )}
      >
        {showPill && (
          <motion.span
            layoutId="navbar-unified-pill"
            className={cn(
              "absolute inset-0 -z-10 rounded-lg",
              overlay
                ? "bg-white/15 border border-white/25"
                : "bg-accent border border-primary/15",
            )}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
        )}
        <span className="relative z-10">{category.name}</span>
      </Link>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Category Trigger Button */}
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative group flex items-center gap-1 sm:gap-1.5 rounded-lg px-2.5 sm:px-3 lg:px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 whitespace-nowrap select-none",
          isOpen
            ? overlay
              ? "text-white"
              : "text-primary"
            : overlay
              ? "text-white/90 hover:text-white"
              : "text-foreground/90 hover:text-primary",
        )}
      >
        {showPill && (
          <motion.span
            layoutId="navbar-unified-pill"
            className={cn(
              "absolute inset-0 -z-10 rounded-lg",
              overlay
                ? "bg-white/15 border border-white/25"
                : isOpen
                  ? "bg-primary/10 border border-primary/20 shadow-xs"
                  : "bg-accent border border-primary/15",
            )}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
        )}
        <span className="relative z-10">{category.name}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="relative z-10 flex items-center"
        >
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-colors duration-200",
              isOpen
                ? overlay
                  ? "text-white"
                  : "text-primary"
                : overlay
                  ? "text-white/70 group-hover:text-white"
                  : "text-muted-foreground group-hover:text-foreground",
            )}
          />
        </motion.span>
      </button>

      {/* Floating Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={reduceMotion ? undefined : panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute top-full mt-2 z-50 w-[340px] sm:w-[400px] max-w-[calc(100vw-2rem)] bg-white/98 dark:bg-card/98 backdrop-blur-2xl border border-slate-200/90 dark:border-border/80 rounded-2xl shadow-2xl p-4 overflow-hidden",
              alignRight
                ? "right-0 origin-top-right"
                : "left-0 origin-top-left",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-foreground">
                    {category.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                    {subcategories.length}{" "}
                    {subcategories.length === 1
                      ? "subcategory"
                      : "subcategories"}{" "}
                    available
                  </p>
                </div>
              </div>

              <Link
                to={categoryHref}
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="group/link text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
              </Link>
            </div>

            {/* Staggered Subcategories List */}
            <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
              {subcategories.map((sub) => {
                const SubIcon = getCategoryIcon(sub.slug || sub.name);
                const subHref =
                  sub.href ||
                  (sub.id
                    ? `/shop?categoryId=${sub.id}&categorySlug=${sub.slug}`
                    : `/shop?categorySlug=${sub.slug}`);

                return (
                  <motion.div
                    key={sub.slug}
                    variants={reduceMotion ? undefined : listItemVariants}
                  >
                    <Link
                      to={subHref}
                      onClick={() => {
                        setIsOpen(false);
                        onNavigate?.();
                      }}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100/90 dark:hover:bg-muted/80 transition-all text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105 flex items-center justify-center transition-all flex-shrink-0">
                        <SubIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-foreground group-hover:text-slate-950 dark:group-hover:text-primary transition-colors">
                          {sub.name}
                        </p>
                        {sub.description && (
                          <p className="text-[11px] text-slate-500 dark:text-muted-foreground truncate mt-0.5">
                            {sub.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary flex-shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Featured footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-border/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Verified genuine stock</span>
              </span>
              <Link
                to={categoryHref}
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="hover:underline text-[11px] font-semibold text-primary"
              >
                Browse All {category.name}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
