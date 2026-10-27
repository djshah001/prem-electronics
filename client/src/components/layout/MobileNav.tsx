import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  ArrowRight,
  Heart,
  LayoutDashboard,
  User,
  Package,
  LogOut,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  LayoutGrid,
  Phone,
  X,
} from "lucide-react";
import type { User as UserType } from "../../types";
import type { CategoryConfig } from "../../config/navigationCategories";
import { getCategoryIconComponent } from "../../config/navigationCategories";
import type { NavbarItem } from "../../hooks/useNavbarConfig";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  allCategories: CategoryConfig[];
  individualCategories: CategoryConfig[];
  navbarItems?: NavbarItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  user: UserType | null;
  onLogout: () => void;
  wishlistCount?: number;
  cartCount?: number;
}

export const MobileNav = ({
  isOpen,
  onClose,
  allCategories,
  individualCategories,
  navbarItems,
  isLoading,
  isError,
  onRetry,
  user,
  onLogout,
  wishlistCount,
  cartCount: _cartCount,
}: MobileNavProps) => {
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [mobileSearch, setMobileSearch] = useState("");
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearch.trim()) {
      onClose();
      navigate(`/shop?search=${encodeURIComponent(mobileSearch.trim())}`);
    }
  };

  const hasDbConfig = Array.isArray(navbarItems) && navbarItems.length > 0;
  const categoryConfigById = new Map(
    allCategories.map((cat) => [cat.id ?? "", cat])
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] min-[1101px]:hidden">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Side Navigation Drawer Panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 w-[85vw] max-w-sm sm:max-w-md bg-card text-foreground border-r border-border shadow-2xl flex flex-col z-[130] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            {/* Header: Brand Logo & Close Button */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border bg-card/95">
              <Link
                to="/"
                onClick={onClose}
                className="flex items-center gap-2.5 transition-transform active:scale-95"
              >
                <img
                  src="/Symbol.jpg"
                  alt="Prem Electronics Symbol"
                  className="w-8 h-8 object-contain rounded-lg shadow-xs"
                />
                <img
                  src="/logo.png"
                  alt="Prem Electronics"
                  className="h-7 w-auto object-contain"
                />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Drawer Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="mobile-search-input"
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="Search cameras, lenses, gimbals..."
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </form>

              {/* Sync Status / Error */}
              {isError && onRetry && (
                <div className="flex items-center justify-between px-3 py-2 bg-destructive/10 text-destructive text-xs rounded-xl">
                  <span>Failed to sync categories</span>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex items-center gap-1 font-semibold hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}
              {isLoading && (
                <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-pulse w-1/3" />
                </div>
              )}

              {/* Quick Link: All Catalog Products */}
              <Link
                to="/shop"
                onClick={onClose}
                className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span>All Catalog Products</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              {/* Navigation Section */}
              <div className="space-y-1.5">
                <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Categories &amp; Navigation
                </div>

                {/* 1. All Categories Accordion */}
                <div className="rounded-xl overflow-hidden border border-border/50 bg-background/50">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setAllCategoriesOpen((prev) => !prev)}
                      className="flex items-center gap-2.5 text-sm font-bold text-foreground hover:text-primary transition-colors flex-1 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <LayoutGrid className="w-4 h-4" />
                      </div>
                      <span>All Categories</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Toggle All Categories"
                      onClick={() => setAllCategoriesOpen((prev) => !prev)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          allCategoriesOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* All Categories Nested Content */}
                  <AnimatePresence>
                    {allCategoriesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border/40 bg-muted/20"
                      >
                        <div className="py-2 pl-3 pr-2 space-y-1">
                          <Link
                            to="/shop"
                            onClick={onClose}
                            className="block py-1.5 px-3 text-xs font-semibold text-primary hover:underline"
                          >
                            View Entire Catalog →
                          </Link>

                          {allCategories.map((cat) => {
                            const Icon = getCategoryIconComponent(cat.iconName);
                            const isCatExpanded = !!expandedCategories[`all-${cat.slug}`];
                            const hasSub = cat.subcategories.length > 0;

                            return (
                              <div key={cat.slug} className="rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-2.5 py-1.5 hover:bg-card/70 rounded-lg">
                                  <Link
                                    to={cat.href}
                                    onClick={onClose}
                                    className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary flex-1"
                                  >
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>{cat.name}</span>
                                  </Link>

                                  {hasSub && (
                                    <button
                                      type="button"
                                      aria-label={`Toggle ${cat.name} subcategories`}
                                      onClick={() => toggleCategory(`all-${cat.slug}`)}
                                      className="p-1 hover:text-primary"
                                    >
                                      <ChevronDown
                                        className={`w-3.5 h-3.5 transition-transform ${
                                          isCatExpanded ? "rotate-180 text-primary" : "text-muted-foreground"
                                        }`}
                                      />
                                    </button>
                                  )}
                                </div>

                                {/* Nested Subcategories */}
                                <AnimatePresence>
                                  {hasSub && isCatExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden pl-7 pr-2 py-1 space-y-1 border-l-2 border-primary/20 ml-4 my-1"
                                    >
                                      <Link
                                        to={cat.href}
                                        onClick={onClose}
                                        className="block py-1 text-[11px] font-semibold text-primary"
                                      >
                                        All in {cat.name} →
                                      </Link>
                                      {cat.subcategories.map((sub) => (
                                        <Link
                                          key={sub.slug}
                                          to={sub.href}
                                          onClick={onClose}
                                          className="block py-1 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card rounded-md font-medium"
                                        >
                                          {sub.name}
                                        </Link>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Individual Categories from DB Config or Fallback */}
                {hasDbConfig ? (
                  navbarItems!.map((item) => {
                    if (item.type === "all_categories") return null;
                    if (item.type === "category") {
                      const catConfig =
                        (item.categoryId ? categoryConfigById.get(item.categoryId) : undefined) ||
                        allCategories.find(
                          (c) =>
                            (item.categoryId && c.id === item.categoryId) ||
                            (item.label && c.name.toLowerCase() === item.label.toLowerCase()) ||
                            (item.label && c.slug.toLowerCase() === item.label.toLowerCase().replace(/\s+/g, "-"))
                        );
                      if (!catConfig) return null;
                      const Icon = getCategoryIconComponent(catConfig.iconName);
                      const isExpanded = !!expandedCategories[`db-${catConfig.slug}`];
                      const hasSub = catConfig.subcategories.length > 0;

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl overflow-hidden border border-border/40 bg-background/40"
                        >
                          <div className="flex items-center justify-between px-3 py-2">
                            <Link
                              to={catConfig.href}
                              onClick={onClose}
                              className="flex items-center gap-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors flex-1"
                            >
                              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span>{item.label || catConfig.name}</span>
                            </Link>

                            {hasSub && (
                              <button
                                type="button"
                                aria-label={`Toggle ${catConfig.name} subcategories`}
                                aria-expanded={isExpanded}
                                onClick={() => toggleCategory(`db-${catConfig.slug}`)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-primary" : ""
                                  }`}
                                />
                              </button>
                            )}
                          </div>

                          <AnimatePresence>
                            {hasSub && isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-border/30 bg-muted/20"
                              >
                                <div className="py-2 pl-6 pr-3 space-y-1">
                                  <Link
                                    to={catConfig.href}
                                    onClick={onClose}
                                    className="block py-1.5 px-3 text-xs font-semibold text-primary hover:underline"
                                  >
                                    View all in {catConfig.name} →
                                  </Link>
                                  {catConfig.subcategories.map((sub) => (
                                    <Link
                                      key={sub.slug}
                                      to={sub.href}
                                      onClick={onClose}
                                      className="block py-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-card/60 rounded-lg transition-colors font-medium"
                                    >
                                      {sub.name}
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }
                    if (item.type === "custom_link" && item.href) {
                      return (
                        <Link
                          key={item.id}
                          to={item.href}
                          onClick={onClose}
                          className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <span>{item.label}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      );
                    }
                    return null;
                  })
                ) : (
                  individualCategories.map((category) => {
                    const Icon = getCategoryIconComponent(category.iconName);
                    const isExpanded = !!expandedCategories[`ind-${category.slug}`];
                    const hasSub = category.subcategories.length > 0;

                    return (
                      <div
                        key={category.slug}
                        className="rounded-xl overflow-hidden border border-border/40 bg-background/40"
                      >
                        <div className="flex items-center justify-between px-3 py-2">
                          <Link
                            to={category.href}
                            onClick={onClose}
                            className="flex items-center gap-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors flex-1"
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span>{category.name}</span>
                          </Link>

                          {hasSub && (
                            <button
                              type="button"
                              aria-label={`Toggle ${category.name} subcategories`}
                              aria-expanded={isExpanded}
                              onClick={() => toggleCategory(`ind-${category.slug}`)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180 text-primary" : ""
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Subcategories */}
                        <AnimatePresence>
                          {hasSub && isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-border/30 bg-muted/20"
                            >
                              <div className="py-2 pl-6 pr-3 space-y-1">
                                <Link
                                  to={category.href}
                                  onClick={onClose}
                                  className="block py-1.5 px-3 text-xs font-semibold text-primary hover:underline"
                                >
                                  View all in {category.name} →
                                </Link>
                                {category.subcategories.map((sub) => (
                                  <Link
                                    key={sub.slug}
                                    to={sub.href}
                                    onClick={onClose}
                                    className="block py-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-card/60 rounded-lg transition-colors font-medium"
                                  >
                                    {sub.name}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}

                {/* If fallback (no db config), render Contact & Blog */}
                {!hasDbConfig && (
                  <>
                    <Link
                      to="/contact"
                      onClick={onClose}
                      className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <span>Contact Us</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/blog"
                      onClick={onClose}
                      className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <span>Blog</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </>
                )}
              </div>

              {/* Wishlist Link */}
              <div className="pt-2 border-t border-border/50 space-y-1">
                <Link
                  to="/wishlist"
                  onClick={onClose}
                  className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4" />
                    <span>My Wishlist</span>
                  </div>
                  {wishlistCount !== undefined && wishlistCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* User Profile / Auth Actions */}
              <div className="pt-3 border-t border-border/50">
                {user ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>

                    {(user.role === "admin" || user.role === "superadmin") && (
                      <Link
                        to="/admin"
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-primary font-medium hover:bg-primary/10 rounded-xl transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Admin Panel</span>
                      </Link>
                    )}

                    <Link
                      to="/account"
                      onClick={onClose}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium"
                    >
                      <User className="w-4 h-4" />
                      <span>My Account</span>
                    </Link>

                    <Link
                      to="/account/orders"
                      onClick={onClose}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium"
                    >
                      <Package className="w-4 h-4" />
                      <span>My Orders</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-medium text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <span>Sign In / Register</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
