import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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

interface NavCategoryDropdownProps {
  category: Category;
  onNavigate?: () => void;
  overlay?: boolean;
}

// Icon resolver based on category slug/name
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

export const NavCategoryDropdown = ({
  category,
  onNavigate,
  overlay = false,
}: NavCategoryDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const subcategories = Array.isArray(category.children)
    ? category.children.filter((sub) => sub && sub.isActive !== false)
    : [];
  const hasSubcategories = subcategories.length > 0;
  const CategoryIcon = getCategoryIcon(category.slug || category.name || '');

  // Close on outside click
  useEffect(() => {
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
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150); // Small grace delay for smoother cursor travel
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

  // If no subcategories, render a direct link
  if (!hasSubcategories) {
    return (
      <Link
        to={`/shop?categoryId=${category.id}&categorySlug=${category.slug}`}
        onClick={onNavigate}
        className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 ${
          overlay
            ? "text-white/80 hover:bg-white/10 hover:text-white"
            : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
        }`}
      >
        {category.name}
      </Link>
    );
  }

  const isWide = subcategories.length > 3;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Category Trigger */}
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          isOpen
            ? "text-primary bg-primary/10"
            : overlay
              ? "text-white/80 hover:bg-white/10 hover:text-white"
              : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
        }`}
      >
        <span>{category.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : "text-muted-foreground group-hover:text-foreground"
          }`}
        />
      </button>

      {/* Floating Dropdown / Mega Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className={`absolute top-full left-0 mt-1.5 z-50 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-4 overflow-hidden origin-top-left ${
              isWide ? "w-80 sm:w-96" : "w-72"
            }`}
          >
            {/* Header with Category Name & View All link */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {category.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {subcategories.length}{" "}
                    {subcategories.length === 1 ? "subcategory" : "subcategories"}
                  </p>
                </div>
              </div>

              <Link
                to={`/shop?categoryId=${category.id}&categorySlug=${category.slug}`}
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Subcategories Grid */}
            <div
              className={`grid gap-1.5 ${
                isWide ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {subcategories.map((sub) => {
                const SubIcon = getCategoryIcon(sub.slug || sub.name);
                return (
                  <Link
                    key={sub.id}
                    to={`/shop?categoryId=${sub.id}&categorySlug=${sub.slug}`}
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.();
                    }}
                    className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-primary/10 transition-all text-left"
                  >
                    <div className="w-6 h-6 rounded-md bg-muted/60 group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary flex items-center justify-center transition-colors flex-shrink-0">
                      <SubIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {sub.name}
                      </p>
                      {sub.description && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {sub.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                  </Link>
                );
              })}
            </div>

            {/* Optional Banner or Featured footer */}
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Verified genuine stock</span>
              </span>
              <Link
                to="/shop"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="hover:underline text-[10px] text-muted-foreground hover:text-foreground"
              >
                All Products
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
