import { Link, useNavigate } from "react-router-dom";
import { useAtom, useAtomValue } from "jotai";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  User,
  LogOut,
  Package,
  LayoutDashboard,
  Heart,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { cartCountAtom, cartDrawerOpenAtom } from "../../store/cartAtom";
import { userAtom } from "../../store/userAtom";
import { useAuth } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { useCategories } from "../../hooks/useCategories";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/axiosClient";
import type { Product } from "../../types";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { NavCategoryDropdown } from "./NavCategoryDropdown";
import { MobileNav } from "./MobileNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(p));

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const cartCount = useAtomValue(cartCountAtom);
  const [, setCartOpen] = useAtom(cartDrawerOpenAtom);
  const user = useAtomValue(userAtom);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(search, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic Categories from backend via React Query
  const {
    categories,
    rootCategories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  // Auto-suggest query
  const { data: suggestionsData, isFetching: isSearching } = useQuery({
    queryKey: ["search-suggestions", debouncedSearch],
    queryFn: () =>
      api.get<Product[]>("/products", {
        search: debouncedSearch.trim(),
        limit: 5,
      } as Record<string, unknown>),
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30000,
  });

  const suggestions = suggestionsData?.data ?? [];
  const showSuggestions = searchFocused && debouncedSearch.trim().length >= 2;

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setSearchFocused(false);
      navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleSelectProduct = (slug: string) => {
    setSearchFocused(false);
    setSearch("");
    navigate(`/products/${slug}`);
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            {/* Symbol Image */}
            <img
              src="/Symbol.jpg"
              alt="Prem Electronics Symbol"
              className="w-9 h-9 object-contain"
            />
            {/* Brand Logo / Title Image */}
            <img
              src="/logo.png"
              alt="Prem Electronics"
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav with Dynamic Categories */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-1 lg:gap-2 flex-wrap"
          >
            <Link
              to="/shop"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium px-2.5 py-1.5 rounded-lg hover:bg-card/70"
            >
              Shop
            </Link>

            {/* Dynamic Categories */}
            {categoriesLoading ? (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-7 w-20 bg-muted/40 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : categoriesError ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link
                  to="/shop"
                  className="hover:text-primary transition-colors underline"
                >
                  Catalog
                </Link>
                <button
                  type="button"
                  onClick={() => refetchCategories()}
                  title="Retry loading categories"
                  className="p-1 hover:text-primary transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            ) : (
              rootCategories.map((category) => (
                <NavCategoryDropdown
                  key={category.id}
                  category={category}
                />
              ))
            )}

            <Link
              to="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium px-2.5 py-1.5 rounded-lg hover:bg-card/70"
            >
              Blog
            </Link>
          </nav>

          {/* Desktop Search with Smart Auto-Suggest */}
          <div
            ref={searchContainerRef}
            className="hidden md:block relative flex-1 max-w-xs mx-4"
          >
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="desktop-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search products..."
                autoComplete="off"
                className="w-full pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {isSearching ? (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
              ) : search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchFocused(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </form>

            {/* Auto-suggest dropdown */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 py-2"
                >
                  {suggestions.length > 0 ? (
                    <div>
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                        Products ({suggestions.length})
                      </div>
                      <div className="divide-y divide-border/40">
                        {suggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectProduct(item.slug)}
                            className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-background/80 transition-colors text-left group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {item.images?.[0] ? (
                                <img
                                  src={item.images[0]}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-bold text-primary">
                                  {formatPrice(item.salePrice ?? item.price)}
                                </span>
                                {item.brand && (
                                  <span className="text-[10px] text-muted-foreground">
                                    · {item.brand}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-border/50 bg-background/50">
                        <button
                          type="button"
                          onClick={handleSearch}
                          className="w-full py-1.5 text-center text-xs font-semibold text-primary hover:underline"
                        >
                          View all results for &quot;{debouncedSearch}&quot; →
                        </button>
                      </div>
                    </div>
                  ) : !isSearching ? (
                    <div className="py-6 px-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        No products found for &quot;{debouncedSearch}&quot;
                      </p>
                      <button
                        type="button"
                        onClick={handleSearch}
                        className="mt-2 text-xs text-primary font-semibold hover:underline"
                      >
                        Search anyway in catalog
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle className="hidden sm:flex" />

            {/* Wishlist */}
            <Link
              to="/wishlist"
              id="nav-wishlist-btn"
              className="relative p-2 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Wishlist"
              title="My Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Cart */}
            <button
              id="cart-toggle-btn"
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-lg hover:bg-card transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center"
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Profile */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button
                    id="profile-menu-btn"
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-card transition-colors focus:outline-none"
                    aria-label="User profile menu"
                  >
                    <Avatar className="w-9 h-9 border border-border">
                      <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none">
                          {user.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {(user.role === "admin" || user.role === "superadmin") && (
                    <DropdownMenuItem className="cursor-pointer">
                      <Link to="/admin" className="flex w-full items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="cursor-pointer">
                    <Link to="/account" className="flex w-full items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>My Account</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Link to="/wishlist" className="flex w-full items-center">
                      <Heart className="mr-2 h-4 w-4" />
                      <span>My Wishlist</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Link
                      to="/account/orders"
                      className="flex w-full items-center"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      <span>My Orders</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout.mutate()}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-card transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Mobile Navigation Drawer */}
        <MobileNav
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          categories={categories}
          isLoading={categoriesLoading}
          isError={categoriesError}
          onRetry={refetchCategories}
          user={user}
          onLogout={() => logout.mutate()}
        />
      </div>
    </header>
  );
};
