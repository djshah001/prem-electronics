import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import type { CategoryConfig } from "../../config/navigationCategories";
import { getCategoryIconComponent } from "../../config/navigationCategories";
import { getCategoryIcon } from "./NavCategoryDropdown";
import { cn } from "../../lib/utils";

interface AllCategoriesDropdownProps {
  categories: CategoryConfig[];
  onNavigate?: () => void;
  overlay?: boolean;
  isHovered?: boolean;
  onHoverStart?: () => void;
}

const megaMenuVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 420, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.98,
    transition: { duration: 0.14, ease: "easeOut" },
  },
};

export const AllCategoriesDropdown = ({
  categories,
  onNavigate,
  overlay = false,
  isHovered = false,
  onHoverStart,
}: AllCategoriesDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [alignRight, setAlignRight] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const updateAlignment = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setAlignRight(window.innerWidth - rect.left < 680);
      }
    };

    if (isOpen) {
      updateAlignment();
      window.addEventListener("resize", updateAlignment);
      return () => window.removeEventListener("resize", updateAlignment);
    }
  }, [isOpen]);

  const getSubcategories = (cat?: CategoryConfig | any) => {
    if (!cat) return [];
    if (Array.isArray(cat.subcategories) && cat.subcategories.length > 0)
      return cat.subcategories;
    if (Array.isArray(cat.children) && cat.children.length > 0) {
      return cat.children
        .filter((sub: any) => sub && sub.isActive !== false)
        .map((sub: any) => ({
          name: sub.name,
          slug: sub.slug,
          id: sub.id,
          description: sub.description,
          href: sub.id
            ? `/shop?categoryId=${sub.id}&categorySlug=${sub.slug}`
            : `/shop?categorySlug=${sub.slug}`,
        }));
    }
    return cat.subcategories || [];
  };

  const activeCategory = categories[activeCategoryIndex] || categories[0];
  const activeSubcategories = getSubcategories(activeCategory);
  const ActiveIcon = activeCategory
    ? getCategoryIconComponent(activeCategory.iconName)
    : LayoutGrid;

  useEffect(() => {
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
  }, []);

  const handleMouseEnter = () => {
    onHoverStart?.();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 170);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveCategoryIndex((prev) =>
          prev < categories.length - 1 ? prev + 1 : 0,
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveCategoryIndex((prev) =>
        prev > 0 ? prev - 1 : categories.length - 1,
      );
    }
  };

  const handleCategoryClick = (category: CategoryConfig) => {
    setIsOpen(false);
    onNavigate?.();
    navigate(category.href);
  };

  const showPill = isHovered || isOpen;
  const useTwoColumns = activeSubcategories.length >= 5;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* "All Categories" Trigger Button */}
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="All Categories menu"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative group flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] font-semibold transition-colors duration-200 px-2.5 sm:px-3 lg:px-3.5 py-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 whitespace-nowrap select-none",
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
        <LayoutGrid
          className={cn(
            "relative z-10 w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-90",
            overlay ? "text-white" : "text-primary",
          )}
        />
        <span className="relative z-10">All Categories</span>
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

      {/* Master-Detail Mega Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={reduceMotion ? undefined : megaMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute top-full mt-2.5 z-[110] w-[660px] max-w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-2xl backdrop-saturate-150 border border-border/80 rounded-2xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden text-foreground",
              alignRight
                ? "right-0 origin-top-right"
                : "left-0 origin-top-left",
            )}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Browse Full Catalog
                </span>
              </div>
              <Link
                to="/shop"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="group/all text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <span>Shop All Products</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/all:translate-x-0.5" />
              </Link>
            </div>

            {/* Master-Detail Two-Panel Content */}
            <div className="grid grid-cols-12 min-h-[390px]">
              {/* Left Master Column */}
              <div className="col-span-4 border-r border-border/60 p-2.5 space-y-1 bg-muted/20 max-h-[460px] overflow-y-auto">
                {categories.map((cat, index) => {
                  const Icon = getCategoryIconComponent(cat.iconName);
                  const isSelected = activeCategoryIndex === index;
                  const subCount = getSubcategories(cat).length;

                  return (
                    <div
                      key={cat.slug}
                      onMouseEnter={() => setActiveCategoryIndex(index)}
                      onFocus={() => setActiveCategoryIndex(index)}
                      onClick={() => handleCategoryClick(cat)}
                      className={cn(
                        "relative group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors",
                        isSelected
                          ? "text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                      )}
                      role="menuitem"
                      tabIndex={0}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="mega-menu-active-category"
                          className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20 -z-0"
                          transition={{
                            type: "spring",
                            stiffness: 450,
                            damping: 32,
                          }}
                        />
                      )}

                      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{cat.name}</span>
                      </div>

                      {subCount > 0 ? (
                        <ChevronRight
                          className={cn(
                            "relative z-10 w-3.5 h-3.5 shrink-0 transition-transform",
                            isSelected
                              ? "translate-x-0.5 text-primary"
                              : "text-muted-foreground/40 group-hover:text-foreground",
                          )}
                        />
                      ) : (
                        <span className="relative z-10 text-[10px] font-medium text-muted-foreground/60 shrink-0">
                          All
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Detail Column */}
              <div className="col-span-8 p-5 flex flex-col justify-between bg-transparent">
                <AnimatePresence mode="wait">
                  {activeCategory ? (
                    <motion.div
                      key={activeCategory.slug}
                      initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, x: -6 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      {/* Active Category Header */}
                      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center">
                            <ActiveIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-foreground">
                              {activeCategory.name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              {activeSubcategories.length > 0
                                ? `${activeSubcategories.length} subcategories available`
                                : "Explore all products in this category"}
                            </p>
                          </div>
                        </div>

                        <Link
                          to={activeCategory.href}
                          onClick={() => {
                            setIsOpen(false);
                            onNavigate?.();
                          }}
                          className="group/view px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 text-xs font-semibold text-primary flex items-center gap-1 transition-colors"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3 transition-transform group-hover/view:translate-x-0.5" />
                        </Link>
                      </div>

                      {/* Subcategories Adaptive Grid */}
                      {activeSubcategories.length > 0 ? (
                        <div
                          className={cn(
                            "grid gap-1.5 max-h-[300px] overflow-y-auto pr-1",
                            useTwoColumns ? "grid-cols-2" : "grid-cols-1",
                          )}
                        >
                          {activeSubcategories.map((sub: any) => {
                            const SubIcon = getCategoryIcon(
                              sub.slug || sub.name,
                            );
                            return (
                              <Link
                                key={sub.slug}
                                to={
                                  sub.href ||
                                  (sub.id
                                    ? `/shop?categoryId=${sub.id}&categorySlug=${sub.slug}`
                                    : `/shop?categorySlug=${sub.slug}`)
                                }
                                onClick={() => {
                                  setIsOpen(false);
                                  onNavigate?.();
                                }}
                                className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-accent/80 border border-transparent hover:border-border/60 transition-all text-xs font-medium text-foreground hover:text-primary"
                              >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-7 h-7 rounded-lg bg-secondary/80 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center shrink-0 transition-colors">
                                    <SubIcon className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="truncate font-semibold">
                                    {sub.name}
                                  </span>
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-12 text-center space-y-3">
                          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            Browse all products under {activeCategory.name}.
                          </p>
                          <Link
                            to={activeCategory.href}
                            onClick={() => {
                              setIsOpen(false);
                              onNavigate?.();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                          >
                            Browse {activeCategory.name}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Footer Hint */}
                <div className="pt-3 mt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Fast delivery & 100% genuine warranty</span>
                  </span>
                  <Link
                    to="/shop"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.();
                    }}
                    className="hover:underline font-semibold text-primary"
                  >
                    Full Catalog
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
