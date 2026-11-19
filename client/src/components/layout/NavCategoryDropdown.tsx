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
  Aperture,
  Video,
  Mic,
  Sun,
  Compass,
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
  if (normalized.includes("lens") || normalized.includes("optic")) {
    return Aperture;
  }
  if (
    normalized.includes("gimbal") ||
    normalized.includes("stabilizer") ||
    normalized.includes("tripod") ||
    normalized.includes("action")
  ) {
    return Video;
  }
  if (normalized.includes("drone") || normalized.includes("aerial")) {
    return Compass;
  }
  if (normalized.includes("light") || normalized.includes("flash")) {
    return Sun;
  }
  if (
    normalized.includes("mic") ||
    normalized.includes("audio") ||
    normalized.includes("headphone") ||
    normalized.includes("sound")
  ) {
    return normalized.includes("mic") ? Mic : Headphones;
  }
  if (normalized.includes("camera") || normalized.includes("photo")) {
    return Camera;
  }
  if (normalized.includes("phone") || normalized.includes("mobile")) {
    return Smartphone;
  }
  if (normalized.includes("laptop") || normalized.includes("computer")) {
    return Laptop;
  }
  if (normalized.includes("tv") || normalized.includes("television")) {
    return Tv;
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
      stiffness: 420,
      damping: 30,
      staggerChildren: 0.025,
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
  hidden: { opacity: 0, x: -6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 400, damping: 28 },
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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [category]);

  useEffect(() => {
    if (!category || !isOpen) return;
    const updateAlignment = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setAlignRight(window.innerWidth - rect.left < 420);
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
      setAlignRight(window.innerWidth - rect.left < 420);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
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
                  ? "bg-primary/10 border border-primary/20"
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

      {/* Unified Frosted Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={reduceMotion ? undefined : panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute top-full mt-2.5 z-[110] w-[360px] sm:w-[410px] max-w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-2xl backdrop-saturate-150 border border-border/80 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.28)] overflow-hidden text-foreground",
              alignRight
                ? "right-0 origin-top-right"
                : "left-0 origin-top-left",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground leading-tight">
                    {category.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {subcategories.length}{" "}
                    {subcategories.length === 1
                      ? "subcategory"
                      : "subcategories"}
                  </p>
                </div>
              </div>

              <Link
                to={categoryHref}
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="group/link px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 text-xs font-semibold text-primary flex items-center gap-1 transition-colors"
              >
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
              </Link>
            </div>

            {/* Staggered Subcategories List */}
            <div className="p-2.5 space-y-1 max-h-[360px] overflow-y-auto">
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
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/80 border border-transparent hover:border-border/60 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/80 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 flex items-center justify-center transition-all flex-shrink-0">
                        <SubIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">
                          {sub.name}
                        </p>
                        {sub.description && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {sub.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border/60 bg-muted/25 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>100% Genuine Brand Warranty</span>
              </span>
              <Link
                to={categoryHref}
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="hover:underline font-semibold text-primary"
              >
                All {category.name}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
