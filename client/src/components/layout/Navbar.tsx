import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { cartCountAtom, cartDrawerOpenAtom } from "../../store/cartAtom";
import { userAtom } from "../../store/userAtom";
import { useAuth } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { useCategories } from "../../hooks/useCategories";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/axiosClient";
import type { Product } from "../../types";
// import { ThemeToggle } from "../ui/ThemeToggle";
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
import { cn } from "../../lib/utils";

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
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const cartCount = useAtomValue(cartCountAtom);
  const [, setCartOpen] = useAtom(cartDrawerOpenAtom);
  const user = useAtomValue(userAtom);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = Boolean(useReducedMotion());
  const isHome = location.pathname === "/";
  const debouncedSearch = useDebounce(search, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // -------------------------------------------------------------
  // Liquid Scroll Behavior: Hide on scroll, show when stopped
  // -------------------------------------------------------------
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);

      // Never hide navbar if user is actively searching or has mobile menu open
      if (searchFocused || menuOpen) {
        setIsVisible(true);
        return;
      }

      // Always show when resting at the top of the page
      if (currentScrollY <= 25) {
        setIsVisible(true);
        return;
      }

      // Hide immediately while scrolling
      setIsVisible(false);

      // Debounce reveal: trigger smooth spring entry when scrolling ceases
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 200);
    };

    const handleScrollEnd = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      setIsVisible(true);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scrollend", handleScrollEnd);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scrollend", handleScrollEnd);
    };
  }, [searchFocused, menuOpen]);

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

  // Keep visible if search or menu is actively open
  const shouldShow = true;
  const isTransparentHero = false;

  const navLinkClass = cn(
    "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5",
    isTransparentHero
      ? "text-white/80 hover:bg-white/10 hover:text-white"
      : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
  );

  return (
    <motion.header className="fixed inset-x-0 top-0 z-[100] pointer-events-none">
      <div
        className={cn(
          "relative mx-auto max-w-8xl px-4 shadow-xl backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-500 sm:px-6 pointer-events-auto",
          "border-border/80 bg-white shadow-black/10",
        )}
      >
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo */}
          <motion.div
            whileHover={reduceMotion ? undefined : { scale: 1.035 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <Link
              to="/"
              className={cn(
                "flex items-center gap-2 flex-shrink-0 rounded-xl transition-all duration-300",
                isTransparentHero && "px-2.5 py-2 shadow-sm",
              )}
            >
              <img
                src="/Symbol.jpg"
                alt="Prem Electronics Symbol"
                className="w-6 h-6 object-contain"
              />
              <img
                src="/logo.png"
                alt="Prem Electronics"
                className="h-6 w-auto object-contain"
              />
            </Link>
          </motion.div>

          {/* Desktop Nav with Dynamic Categories */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1 xl:gap-2"
          >
            <Link to="/shop" className={navLinkClass}>
              Shop
            </Link>

            {categoriesLoading ? (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-7 w-20 rounded-lg animate-pulse",
                      isTransparentHero ? "bg-white/15" : "bg-muted/40",
                    )}
                  />
                ))}
              </div>
            ) : categoriesError ? (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  isTransparentHero ? "text-white/70" : "text-muted-foreground",
                )}
              >
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
                  overlay={isTransparentHero}
                />
              ))
            )}

            <Link to="/blog" className={navLinkClass}>
              Blog
            </Link>
          </nav>

          {/* Desktop Search with Smart Auto-Suggest */}
          <motion.div
            ref={searchContainerRef}
            className="hidden lg:block relative flex-1 min-w-0 max-w-xs mx-2 xl:mx-4"
            animate={{ scale: searchFocused && !reduceMotion ? 1.025 : 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <form onSubmit={handleSearch} className="relative w-full">
              <Search
                className={cn(
                  "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
                  isTransparentHero ? "text-white/65" : "text-muted-foreground",
                )}
              />
              <input
                id="desktop-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search products..."
                autoComplete="off"
                className={cn(
                  "w-full rounded-xl border py-2 pl-9 pr-8 text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-primary/50",
                  isTransparentHero
                    ? "border-white/20 bg-black/20 text-white placeholder:text-white/55 hover:bg-black/30 focus:bg-black/35"
                    : "border-border bg-card text-foreground placeholder:text-muted-foreground",
                )}
              />
              {isSearching ? (
                <Loader2
                  className={cn(
                    "absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin",
                    isTransparentHero
                      ? "text-white/65"
                      : "text-muted-foreground",
                  )}
                />
              ) : search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchFocused(false);
                  }}
                  className={cn(
                    "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors",
                    isTransparentHero
                      ? "text-white/65 hover:text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
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
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
          </motion.div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* <ThemeToggle
              className={cn(
                "hidden sm:flex",
                isTransparentHero &&
                  "!border-white/20 !bg-white/10 hover:!bg-white/20 text-white",
              )}
            /> */}

            {/* Wishlist */}
            <Link
              to="/wishlist"
              id="nav-wishlist-btn"
              className={cn(
                "relative rounded-xl p-2 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105",
                isTransparentHero
                  ? "text-white/75 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
              aria-label="Wishlist"
              title="My Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Cart */}
            <motion.button
              id="cart-toggle-btn"
              onClick={() => setCartOpen(true)}
              whileHover={reduceMotion ? undefined : { y: -2, scale: 1.06 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              className={cn(
                "relative rounded-xl p-2 transition-colors",
                isTransparentHero
                  ? "text-white/80 hover:bg-white/10 hover:text-white"
                  : "hover:bg-card",
              )}
              aria-label="Open cart"
            >
              <ShoppingCart
                className={cn(
                  "w-5 h-5",
                  isTransparentHero ? "text-current" : "text-muted-foreground",
                )}
              />
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
            </motion.button>

            {/* Profile */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="profile-menu-btn"
                  className={cn(
                    "flex items-center gap-2 rounded-full p-1 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isTransparentHero ? "hover:bg-white/10" : "hover:bg-card",
                  )}
                  aria-label="User profile menu"
                >
                  <Avatar
                    className={cn(
                      "h-9 w-9 border",
                      isTransparentHero ? "border-white/30" : "border-border",
                    )}
                  >
                    <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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
                className="hidden items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl sm:flex"
              >
                Sign In
              </Link>
            )}

            {/* Mobile menu toggle */}
            <motion.button
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              className={cn(
                "rounded-xl p-2 transition-colors lg:hidden",
                isTransparentHero
                  ? "text-white hover:bg-white/10"
                  : "hover:bg-card",
              )}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={menuOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "close" : "open"}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, rotate: -70, scale: 0.7 }
                  }
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={
                    reduceMotion
                      ? undefined
                      : { opacity: 0, rotate: 70, scale: 0.7 }
                  }
                  transition={{ duration: reduceMotion ? 0 : 0.18 }}
                >
                  {menuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
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
    </motion.header>
  );
};
