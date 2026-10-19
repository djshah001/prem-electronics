import { useState } from "react";
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
} from "lucide-react";
import type { Category, User as UserType } from "../../types";
import { getCategoryIcon } from "./NavCategoryDropdown";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  user: UserType | null;
  onLogout: () => void;
}

export const MobileNav = ({
  isOpen,
  onClose,
  categories,
  isLoading,
  isError,
  onRetry,
  user,
  onLogout,
}: MobileNavProps) => {
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [mobileSearch, setMobileSearch] = useState("");
  const navigate = useNavigate();

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearch.trim()) {
      onClose();
      navigate(`/shop?search=${encodeURIComponent(mobileSearch.trim())}`);
    }
  };

  const rootCategories = Array.isArray(categories)
    ? categories.filter(
        (c) =>
          c && c.isActive !== false && (!c.parentId || c.parentId === null),
      )
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute left-0 right-0 top-full z-[110] lg:hidden
             max-h-[calc(100dvh-4rem)] overflow-y-auto
             border border-gray-200 bg-white text-gray-900
             shadow-2xl rounded-b-2xl"
        >
          <div className="px-4 py-5 space-y-5">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="mobile-search-input"
                type="text"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Search products, brands..."
                className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </form>

            {/* Quick Link: All Shop */}
            <div className="space-y-1">
              <Link
                to="/shop"
                onClick={onClose}
                className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span>All Products</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>

            {/* Categories Section */}
            <div>
              <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Categories</span>
                {isLoading && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Loading...
                  </span>
                )}
              </div>

              {/* Loading Skeletons */}
              {isLoading && (
                <div className="space-y-2 px-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-muted/50 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center justify-between">
                  <span>Failed to load categories.</span>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-1 font-semibold underline hover:no-underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Categories Accordion */}
              {!isLoading && !isError && (
                <div className="space-y-1">
                  {rootCategories.map((category) => {
                    const subcategories = Array.isArray(category?.children)
                      ? category.children.filter(
                          (sub) => sub && sub.isActive !== false,
                        )
                      : [];
                    const hasSubcategories = subcategories.length > 0;
                    const isExpanded = !!expandedCategories[category.id];
                    const CategoryIcon = getCategoryIcon(
                      category.slug || category.name,
                    );

                    if (!hasSubcategories) {
                      return (
                        <Link
                          key={category.id}
                          to={`/shop?categoryId=${category.id}&categorySlug=${category.slug}`}
                          onClick={onClose}
                          className="flex items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                              <CategoryIcon className="w-3.5 h-3.5" />
                            </div>
                            <span>{category.name}</span>
                          </div>
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={category.id}
                        className="rounded-xl overflow-hidden border border-border/40 bg-card/40"
                      >
                        {/* Accordion Header */}
                        <div className="flex items-center justify-between px-3 py-2">
                          <Link
                            to={`/shop?categoryId=${category.id}&categorySlug=${category.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors flex-1"
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <CategoryIcon className="w-3.5 h-3.5" />
                            </div>
                            <span>{category.name}</span>
                          </Link>

                          {/* Toggle Subcategories Button */}
                          <button
                            type="button"
                            aria-label={`Toggle ${category.name} subcategories`}
                            aria-expanded={isExpanded}
                            onClick={() => toggleCategory(category.id)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-primary" : ""
                              }`}
                            />
                          </button>
                        </div>

                        {/* Subcategories Accordion Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-border/30 bg-muted/20"
                            >
                              <div className="py-1.5 pl-6 pr-3 space-y-1">
                                <Link
                                  to={`/shop?categoryId=${category.id}&categorySlug=${category.slug}`}
                                  onClick={onClose}
                                  className="block py-1.5 px-3 text-xs font-semibold text-primary hover:underline"
                                >
                                  View all in {category.name} →
                                </Link>
                                {subcategories.map((sub) => (
                                  <Link
                                    key={sub.id}
                                    to={`/shop?categoryId=${sub.id}&categorySlug=${sub.slug}`}
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
                  })}
                </div>
              )}
            </div>

            {/* Other Links */}
            <div className="pt-2 border-t border-border/50 space-y-1">
              <Link
                to="/blog"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tech Beats Blog</span>
              </Link>

              <Link
                to="/wishlist"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium"
              >
                <Heart className="w-4 h-4" />
                <span>My Wishlist</span>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};
