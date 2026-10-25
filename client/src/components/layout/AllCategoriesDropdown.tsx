import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import type { CategoryConfig } from '../../config/navigationCategories';
import { getCategoryIconComponent } from '../../config/navigationCategories';

interface AllCategoriesDropdownProps {
  categories: CategoryConfig[];
  onNavigate?: () => void;
  overlay?: boolean;
}

export const AllCategoriesDropdown = ({
  categories,
  onNavigate,
  overlay = false,
}: AllCategoriesDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const activeCategory = categories[activeCategoryIndex] || categories[0];
  const ActiveIcon = activeCategory
    ? getCategoryIconComponent(activeCategory.iconName)
    : LayoutGrid;

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
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveCategoryIndex((prev) =>
          prev < categories.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveCategoryIndex((prev) =>
        prev > 0 ? prev - 1 : categories.length - 1
      );
    }
  };

  const handleCategoryClick = (category: CategoryConfig) => {
    if (category.subcategories.length === 0) {
      setIsOpen(false);
      onNavigate?.();
      navigate(category.href);
    }
  };

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
        className={`group flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 px-3 py-1.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          isOpen
            ? 'text-primary bg-primary/10 shadow-sm'
            : overlay
            ? 'text-white/90 hover:bg-white/10 hover:text-white'
            : 'text-muted-foreground hover:text-foreground hover:bg-card/70'
        }`}
      >
        <LayoutGrid className="w-4 h-4 text-primary" />
        <span>All Categories</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen
              ? 'rotate-180 text-primary'
              : overlay
              ? 'text-white/70'
              : 'text-muted-foreground group-hover:text-foreground'
          }`}
        />
      </button>

      {/* Multilevel Cascading / Master-Detail Mega Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 z-[110] w-[620px] max-w-[95vw] bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Explore Catalog Categories
                </span>
              </div>
              <Link
                to="/shop"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <span>View All Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Master-Detail Two-Panel Content */}
            <div className="grid grid-cols-12 min-h-[380px]">
              {/* Left Master Column: 10 Main Categories */}
              <div className="col-span-5 border-r border-border/50 p-2 space-y-0.5 bg-background/40 max-h-[460px] overflow-y-auto">
                {categories.map((cat, index) => {
                  const Icon = getCategoryIconComponent(cat.iconName);
                  const isSelected = activeCategoryIndex === index;
                  const hasSub = cat.subcategories.length > 0;

                  return (
                    <div
                      key={cat.slug}
                      onMouseEnter={() => setActiveCategoryIndex(index)}
                      onFocus={() => setActiveCategoryIndex(index)}
                      onClick={() => handleCategoryClick(cat)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-card/70'
                      }`}
                      role="menuitem"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/70 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{cat.name}</span>
                      </div>

                      {hasSub ? (
                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                            isSelected
                              ? 'translate-x-0.5 text-primary'
                              : 'text-muted-foreground/40 group-hover:text-foreground'
                          }`}
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 shrink-0 uppercase tracking-tighter">
                          All
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Detail Column: Nested Subcategories */}
              <div className="col-span-7 p-5 flex flex-col justify-between bg-card/60">
                {activeCategory ? (
                  <div>
                    {/* Active Category Header */}
                    <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <ActiveIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">
                            {activeCategory.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {activeCategory.subcategories.length > 0
                              ? `${activeCategory.subcategories.length} subcategories available`
                              : 'Explore all products in this category'}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={activeCategory.href}
                        onClick={() => {
                          setIsOpen(false);
                          onNavigate?.();
                        }}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Subcategories Grid */}
                    {activeCategory.subcategories.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {activeCategory.subcategories.map((sub) => (
                          <Link
                            key={sub.slug}
                            to={sub.href}
                            onClick={() => {
                              setIsOpen(false);
                              onNavigate?.();
                            }}
                            className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-primary/10 transition-all text-xs font-medium text-foreground hover:text-primary"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-125 transition-all" />
                              <span>{sub.name}</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center space-y-3">
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                          Browse all products under {activeCategory.name}.
                        </p>
                        <Link
                          to={activeCategory.href}
                          onClick={() => {
                            setIsOpen(false);
                            onNavigate?.();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          Browse {activeCategory.name}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Footer Hint */}
                <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Fast delivery & 100% genuine warranty</span>
                  <Link
                    to="/shop"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.();
                    }}
                    className="hover:text-foreground underline"
                  >
                    All Catalog
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
