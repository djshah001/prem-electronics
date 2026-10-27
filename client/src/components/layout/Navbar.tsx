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
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { cartDrawerOpenAtom } from "../../store/cartAtom";
import { userAtom } from "../../store/userAtom";
import { useAuth } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { useCategories } from "../../hooks/useCategories";
import { useNavbarConfig } from "../../hooks/useNavbarConfig";
import { useWishlist } from "../../hooks/useWishlist";
import { useCart } from "../../hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/axiosClient";
import type { Product } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { NavCategoryDropdown } from "./NavCategoryDropdown";
import { AllCategoriesDropdown } from "./AllCategoriesDropdown";
import { MobileNav } from "./MobileNav";
import {
  resolveNavCategories,
  getIndividualNavCategories,
} from "../../config/navigationCategories";
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

  const { itemCount: cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [, setCartOpen] = useAtom(cartDrawerOpenAtom);
  const user = useAtomValue(userAtom);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = Boolean(useReducedMotion());
  const debouncedSearch = useDebounce(search, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoriesNavRef = useRef<HTMLElement>(null);

  // Dynamic Categories from backend via React Query
  const {
    categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  // Admin Navbar Master config (DB-driven item list)
  const { data: navbarConfigItems } = useNavbarConfig();

  const resolvedNavCategories = resolveNavCategories(categories);

  /**
   * Build the desktop navigation items from the admin navbar config.
   * If no config items exist yet, fall back to the canonical behaviour
   * (AllCategories + 4 individual category dropdowns + Contact + Blog).
   */
  const hasDbConfig = Array.isArray(navbarConfigItems) && navbarConfigItems.length > 0;

  // Resolved category configs keyed by categoryId for O(1) lookup
  const categoryConfigById = new Map(
    resolvedNavCategories.map((cat) => [cat.id ?? '', cat])
  );

  const individualNavCategories = getIndividualNavCategories(categories);



  // Prevent background scrolling when mobile menu is open & auto-close on resize > 1100px
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleResize = () => {
      if (window.innerWidth > 1100) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("resize", handleResize);
    };
  }, [menuOpen]);

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

  const navLinkClass = cn(
    "rounded-lg px-2.5 sm:px-3 lg:px-3.5 py-1 text-xs sm:text-[13px] font-semibold text-slate-900 transition-colors duration-200 hover:text-slate-600 hover:bg-slate-100/80 dark:text-slate-900 dark:hover:text-slate-600 whitespace-nowrap",
  );

  return (
    <>
      {/* ── ROW 1: Non-sticky First Row (Scrolls away naturally) ── */}
      <header className="relative w-full z-30 bg-white/95 dark:bg-card/95 border-b border-slate-100 dark:border-border/40 transition-[background-color,border-color] duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4 md:gap-6 lg:gap-8 mx-auto w-full">
            {/* Left: Company Logo (Far Left, starts at same horizontal position as first category) */}
            <div className="flex items-center justify-start shrink-0">
              <motion.div
                whileHover={reduceMotion ? undefined : { scale: 1.025 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="flex-shrink-0"
              >
                <Link
                  to="/"
                  className="flex items-center gap-2 rounded-xl transition-all duration-300"
                >
                  <img
                    src="/Symbol.jpg"
                    alt="Prem Electronics Symbol"
                    className="w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain rounded-md shadow-xs shrink-0"
                  />
                  <img
                    src="/logo.png"
                    alt="Prem Electronics"
                    className="h-7 sm:h-7.5 w-auto object-contain shrink-0"
                  />
                </Link>
              </motion.div>
            </div>

            {/* Center: Search Bar with Smart Auto-Suggest (Visible on Desktop > 1100px) */}
            <motion.div
              ref={searchContainerRef}
              className="hidden min-[1101px]:flex flex-1 max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto justify-center relative"
              animate={{ scale: searchFocused && !reduceMotion ? 1.01 : 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
            >
              <form onSubmit={handleSearch} className="relative w-full flex items-center">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors pointer-events-none"
                />
                <input
                  id="desktop-search-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search cameras, lenses, gimbals, accessories..."
                  autoComplete="off"
                  className="h-9 w-full rounded-md border border-slate-200/90 dark:border-border/80 bg-slate-50/90 dark:bg-card pl-9.5 pr-8 text-[13px] text-slate-900 dark:text-foreground placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-card focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
                {isSearching ? (
                  <Loader2
                    className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400"
                  />
                ) : search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSearchFocused(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
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
                    className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-lg shadow-2xl overflow-hidden z-50 py-2"
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

            {/* Right: Actions (Wishlist, Cart, Account on Far Right - right edge aligned with ending position of categories row) */}
            <div className="flex items-center justify-end shrink-0 gap-1 sm:gap-1.5">
              {/* Wishlist */}
              <Link
                to="/wishlist"
                id="nav-wishlist-btn"
                className="relative h-9 w-9 rounded-lg flex items-center justify-center text-slate-800 hover:text-slate-600 hover:bg-slate-100/80 transition-colors"
                aria-label="Wishlist"
                title="My Wishlist"
              >
                <Heart className="w-5 h-5 text-current" />
                <AnimatePresence>
                  {wishlistCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-xs border border-white dark:border-card leading-none"
                    >
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Cart */}
              <motion.button
                id="cart-toggle-btn"
                onClick={() => setCartOpen(true)}
                whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                className="relative h-9 w-9 rounded-lg flex items-center justify-center text-slate-800 hover:text-slate-600 hover:bg-slate-100/80 transition-colors"
                aria-label="Open cart"
                title="Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5 text-current" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-xs border border-white dark:border-card leading-none"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Profile / Account: Aligned on Far Right */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    id="profile-menu-btn"
                    className="h-9 w-9 rounded-full flex items-center justify-center text-slate-800 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="User profile menu"
                    title={user.name}
                  >
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
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
                  id="nav-account-btn"
                  className="relative h-9 rounded-lg px-2 text-slate-800 hover:text-slate-600 hover:bg-slate-100/80 transition-colors flex items-center gap-1.5"
                  aria-label="Account / Sign In"
                  title="Sign In / My Account"
                >
                  <User className="w-4.5 h-4.5 text-current" />
                  <span className="hidden xl:inline text-xs font-semibold text-slate-800 hover:text-slate-600">
                    Sign In
                  </span>
                </Link>
              )}

              {/* Mobile & Tablet menu toggle (Visible on screens <= 1100px) */}
              <motion.button
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-800 hover:text-slate-600 hover:bg-slate-100/80 transition-colors min-[1101px]:hidden"
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
        </div>
      </header>

      {/* ── ROW 2: Sticky Categories Bar (Only this row remains sticky at top on scroll) ── */}
      <div className="hidden min-[1101px]:block sticky top-0 z-40 w-full bg-white/95 dark:bg-card/95 border-b border-border/80 shadow-xs shadow-black/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          <nav
            ref={categoriesNavRef}
            aria-label="Categories Navigation"
            className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-6 h-9 w-full overflow-visible"
          >
            {hasDbConfig ? (
              // ── DB-driven items from Admin Navbar Master ──
              navbarConfigItems!.map((item) => {
                if (item.type === 'all_categories') {
                  return (
                    <AllCategoriesDropdown
                      key={item.id}
                      categories={resolvedNavCategories}
                    />
                  );
                }
                if (item.type === 'category') {
                  const catConfig =
                    (item.categoryId ? categoryConfigById.get(item.categoryId) : undefined) ||
                    resolvedNavCategories.find(
                      (c) =>
                        (item.categoryId && c.id === item.categoryId) ||
                        (item.label && c.name.toLowerCase() === item.label.toLowerCase()) ||
                        (item.label && c.slug.toLowerCase() === item.label.toLowerCase().replace(/\s+/g, '-'))
                    );
                  if (!catConfig) return null;
                  return (
                    <NavCategoryDropdown
                      key={item.id}
                      category={{
                        ...catConfig,
                        name: item.label || catConfig.name,
                      }}
                    />
                  );
                }
                if (item.type === 'custom_link' && item.href) {
                  return (
                    <Link key={item.id} to={item.href} className={navLinkClass}>
                      {item.label}
                    </Link>
                  );
                }
                return null;
              })
            ) : (
              // ── Canonical fallback when no config is in DB ──
              <>
                {/* 1. All Categories (Multilevel Dropdown) */}
                <AllCategoriesDropdown
                  categories={resolvedNavCategories}
                />

                {/* 2–5. Individual Category Dropdowns */}
                {individualNavCategories.map((category) => (
                  <NavCategoryDropdown
                    key={category.slug}
                    category={category}
                  />
                ))}

                {/* 6. Contact Us */}
                <Link to="/contact" className={navLinkClass}>
                  Contact Us
                </Link>

                {/* 7. Blog */}
                <Link to="/blog" className={navLinkClass}>
                  Blog
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Dynamic Mobile Navigation Drawer */}
      <MobileNav
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        allCategories={resolvedNavCategories}
        individualCategories={individualNavCategories}
        navbarItems={navbarConfigItems}
        isLoading={categoriesLoading}
        isError={categoriesError}
        onRetry={refetchCategories}
        user={user}
        onLogout={() => logout.mutate()}
        wishlistCount={wishlistCount}
        cartCount={cartCount}
      />
    </>
  );
};
