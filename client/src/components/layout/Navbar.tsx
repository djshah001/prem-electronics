import { Link, useNavigate, useLocation } from "react-router-dom";
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
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
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
import { getProductThumbnailUrl } from "../../lib/image";

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(p));

// Framer Motion Variants for Search Auto-Suggest
const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 340,
      damping: 26,
      staggerChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

const suggestionItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 320, damping: 24 },
  },
};

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [hoveredNavKey, setHoveredNavKey] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const { itemCount: cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [, setCartOpen] = useAtom(cartDrawerOpenAtom);
  const user = useAtomValue(userAtom);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = Boolean(useReducedMotion());
  const debouncedSearch = useDebounce(search, 300);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const hasDbConfig =
    Array.isArray(navbarConfigItems) && navbarConfigItems.length > 0;

  // Resolved category configs keyed by categoryId for O(1) lookup
  const categoryConfigById = new Map(
    resolvedNavCategories.map((cat) => [cat.id ?? "", cat]),
  );

  const individualNavCategories = getIndividualNavCategories(categories);

  // Track scroll position for enhanced sticky glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      } else if (e.key === "Escape" && searchFocused) {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchFocused]);

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

  // Helper to render animated glassmorphic nav links with shared layoutId hover pill
  const renderAnimatedNavLink = (key: string, href: string, label: string) => {
    const isActive = location.pathname === href;
    const isHovered = hoveredNavKey === key;

    return (
      <Link
        key={key}
        to={href}
        onMouseEnter={() => setHoveredNavKey(key)}
        onMouseLeave={() => setHoveredNavKey(null)}
        className={cn(
          "relative rounded-lg px-3 py-1.5 text-xs sm:text-[13px] font-semibold transition-colors duration-200 whitespace-nowrap select-none",
          isActive ? "text-primary" : "text-foreground/90 hover:text-primary",
        )}
      >
        {(isHovered || isActive) && (
          <motion.span
            layoutId="navbar-glass-pill"
            className="absolute inset-0 -z-10 rounded-lg bg-accent/90 border border-primary/15"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10">{label}</span>
      </Link>
    );
  };

  const handleCartClick = () => {
    if (user) {
      setCartOpen(true);
    } else {
      navigate(
        `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`
      );
    }
  };

  return (
    <>
      {/* ── ROW 1: Glassmorphic Top Header (Sticky on Mobile/Tablet, Scrolls away on Desktop) ── */}
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-[1100px]:sticky max-[1100px]:top-0 w-full z-40 glass border-b border-border/70 transition-colors duration-200"
      >
        {/* Subtle top brand crimson ambient line */}
        <div className="h-[2px] w-full gradient-primary opacity-85" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 gap-4 md:gap-6 lg:gap-8 mx-auto w-full">
            {/* Left: Company Logo */}
            <div className="flex items-center justify-start shrink-0">
              <motion.div
                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="flex-shrink-0"
              >
                <Link
                  to="/"
                  className="group flex items-center gap-2.5 rounded-xl py-1 pr-2 transition-all duration-300"
                >
                  <div className="relative flex items-center justify-center rounded-lg p-0.5 bg-gradient-to-br from-pink-500/20 to-transparent">
                    <img
                      src="/Symbol.jpg"
                      alt="Prem Electronics Symbol"
                      className="w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain rounded-md shadow-xs shrink-0 transition-transform duration-300 group-hover:rotate-3"
                    />
                  </div>
                  <img
                    src="/logo.png"
                    alt="Prem Electronics"
                    className="h-7 sm:h-7.5 w-auto object-contain shrink-0"
                  />
                </Link>
              </motion.div>
            </div>

            {/* Center: Glassmorphic Search Bar with Smart Auto-Suggest (Visible on Desktop > 1100px) */}
            <motion.div
              ref={searchContainerRef}
              className="hidden min-[1101px]:flex flex-1 max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto justify-center relative"
              animate={{ scale: searchFocused && !reduceMotion ? 1.015 : 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 25 }}
            >
              <form
                onSubmit={handleSearch}
                className="relative w-full flex items-center group"
              >
                <Search
                  className={cn(
                    "absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 pointer-events-none",
                    searchFocused
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <input
                  ref={searchInputRef}
                  id="desktop-search-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search cameras, lenses, gimbals, accessories..."
                  autoComplete="off"
                  className={cn(
                    "h-10 w-full rounded-xl border bg-secondary/65 dark:bg-secondary/50 backdrop-blur-md pl-10 pr-16 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200",
                    searchFocused
                      ? "bg-card/95 border-primary ring-3 ring-primary/15"
                      : "border-border/80 hover:border-primary/40 hover:bg-card/70",
                  )}
                />

                {/* Right side of search input: Spinner, Clear button, or ⌘K shortcut badge */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : search ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSearch("");
                        setSearchFocused(false);
                      }}
                      className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  ) : (
                    <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-background/80 border border-border rounded-md pointer-events-none">
                      ⌘K
                    </kbd>
                  )}
                </div>
              </form>

              {/* Glassmorphic Auto-Suggest Dropdown */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute left-0 right-0 top-full mt-2 glass bg-card/95 rounded-xl shadow-xl border border-primary/20 overflow-hidden z-50"
                  >
                    {suggestions.length > 0 ? (
                      <div>
                        <div className="px-3.5 py-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 bg-accent/40">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Top Matches ({suggestions.length})
                          </span>
                          <span className="text-[10px] font-normal text-muted-foreground">
                            ESC to close
                          </span>
                        </div>
                        <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
                          {suggestions.map((item) => (
                            <motion.button
                              variants={suggestionItemVariants}
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectProduct(item.slug)}
                              className="w-full px-3.5 py-2.5 flex items-center gap-3.5 hover:bg-accent/60 transition-colors text-left group"
                            >
                              <div className="w-11 h-11 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center border border-border/60 group-hover:border-primary/40 transition-colors">
                                {item.images?.[0] ? (
                                  <img
                                    src={getProductThumbnailUrl(item.images[0])}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                                  <span className="text-xs font-bold text-primary">
                                    {formatPrice(item.salePrice ?? item.price)}
                                  </span>
                                  {item.brand && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-medium">
                                      {item.brand}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary transition-all duration-200" />
                            </motion.button>
                          ))}
                        </div>
                        <div className="p-2 border-t border-border/60 bg-secondary/40">
                          <button
                            type="button"
                            onClick={handleSearch}
                            className="w-full py-1.5 rounded-lg text-center text-xs font-semibold text-primary hover:bg-accent/80 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>
                              View all results for &quot;{debouncedSearch}&quot;
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : !isSearching ? (
                      <div className="py-7 px-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          No products found for{" "}
                          <span className="font-semibold text-foreground">
                            &quot;{debouncedSearch}&quot;
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={handleSearch}
                          className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-full badge-brand text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          Search full catalog
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right: Actions (Wishlist, Cart, Account, Mobile Menu Toggle) */}
            <div className="flex items-center justify-end shrink-0 gap-1.5 sm:gap-2">
              {/* Wishlist */}
              <motion.div
                whileHover={reduceMotion ? undefined : { scale: 1.06, y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              >
                <Link
                  to="/wishlist"
                  id="nav-wishlist-btn"
                  className="relative h-9.5 w-9.5 rounded-xl flex items-center justify-center text-foreground/85 hover:text-primary hover:bg-accent border border-transparent hover:border-primary/20 transition-all duration-200"
                  aria-label="Wishlist"
                  title="My Wishlist"
                >
                  <Heart className="w-[19px] h-[19px] text-current transition-transform duration-200" />
                  <AnimatePresence mode="popLayout">
                    {wishlistCount > 0 && (
                      <motion.span
                        key={wishlistCount}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 520,
                          damping: 22,
                        }}
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-xs border-2 border-background leading-none"
                      >
                        {wishlistCount > 99 ? "99+" : wishlistCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>

              {/* Cart */}
              <motion.button
                id="cart-toggle-btn"
                onClick={handleCartClick}
                whileHover={reduceMotion ? undefined : { scale: 1.06, y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                className="relative h-9.5 w-9.5 rounded-xl flex items-center justify-center text-foreground/85 hover:text-primary hover:bg-accent border border-transparent hover:border-primary/20 transition-all duration-200"
                aria-label={user ? "Open cart" : "Sign in to view cart"}
                title={user ? "Shopping Cart" : "Sign In to View Cart"}
              >
                <ShoppingCart className="w-[19px] h-[19px] text-current" />
                <AnimatePresence mode="popLayout">
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 22,
                      }}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-xs border-2 border-background leading-none"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Profile / Account */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    id="profile-menu-btn"
                    className="h-9.5 w-9.5 rounded-full flex items-center justify-center text-foreground hover:bg-accent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="User profile menu"
                    title={user.name}
                  >
                    <Avatar className="h-8 w-8 border-2 border-primary/30 hover:border-primary transition-colors">
                      <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                      <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 glass bg-card/95 border-primary/20 rounded-xl p-1.5 shadow-xl"
                    align="end"
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal px-2.5 py-2 rounded-lg bg-accent/50 mb-1">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold leading-none text-foreground">
                            {user.name}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="bg-border/60" />
                    {(user.role === "admin" || user.role === "superadmin") && (
                      <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-accent focus:text-primary">
                        <Link
                          to="/admin"
                          className="flex w-full items-center py-0.5"
                        >
                          <LayoutDashboard className="mr-2.5 h-4 w-4 text-primary" />
                          <span className="font-medium">Admin Panel</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-accent focus:text-primary">
                      <Link
                        to="/account"
                        className="flex w-full items-center py-0.5"
                      >
                        <User className="mr-2.5 h-4 w-4" />
                        <span>My Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-accent focus:text-primary">
                      <Link
                        to="/wishlist"
                        className="flex w-full items-center py-0.5"
                      >
                        <Heart className="mr-2.5 h-4 w-4" />
                        <span>My Wishlist</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-accent focus:text-primary">
                      <Link
                        to="/account/orders"
                        className="flex w-full items-center py-0.5"
                      >
                        <Package className="mr-2.5 h-4 w-4" />
                        <span>My Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/60" />
                    <DropdownMenuItem
                      onClick={() => logout.mutate()}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-lg"
                    >
                      <LogOut className="mr-2.5 h-4 w-4" />
                      <span className="font-medium">Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                >
                  <Link
                    to="/login"
                    id="nav-account-btn"
                    className="relative h-9 rounded-xl px-3 text-foreground hover:text-primary bg-secondary/80 hover:bg-accent border border-border/80 hover:border-primary/30 transition-all duration-200 flex items-center gap-1.5"
                    aria-label="Account / Sign In"
                    title="Sign In / My Account"
                  >
                    <User className="w-4 h-4 text-primary" />
                    <span className="hidden xl:inline text-xs font-semibold">
                      Sign In
                    </span>
                  </Link>
                </motion.div>
              )}

              {/* Mobile & Tablet menu toggle (Visible on screens <= 1100px) */}
              <motion.button
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                className="h-9.5 w-9.5 rounded-xl flex items-center justify-center text-foreground hover:text-primary hover:bg-accent border border-transparent hover:border-primary/20 transition-colors min-[1101px]:hidden"
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
                      <X className="h-5 w-5 text-primary" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── ROW 2: Sticky Glassmorphic Categories Bar (Desktop > 1100px) ── */}
      <div
        className={cn(
          "hidden min-[1101px]:block sticky top-0 z-30 w-full glass shadow-sm transition-colors duration-300",
          isScrolled
            ? "bg-card/88 border-b border-primary/20"
            : "bg-card/75 border-b border-border/70",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          <nav
            ref={categoriesNavRef}
            aria-label="Categories Navigation"
            className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-6 h-10 w-full overflow-visible"
          >
            {hasDbConfig ? (
              // ── DB-driven items from Admin Navbar Master ──
              navbarConfigItems!.map((item) => {
                if (item.type === "all_categories") {
                  return (
                    <AllCategoriesDropdown
                      key={item.id}
                      categories={resolvedNavCategories}
                    />
                  );
                }
                if (item.type === "category") {
                  const catConfig =
                    (item.categoryId
                      ? categoryConfigById.get(item.categoryId)
                      : undefined) ||
                    resolvedNavCategories.find(
                      (c) =>
                        (item.categoryId && c.id === item.categoryId) ||
                        (item.label &&
                          c.name.toLowerCase() === item.label.toLowerCase()) ||
                        (item.label &&
                          c.slug.toLowerCase() ===
                            item.label.toLowerCase().replace(/\s+/g, "-")),
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
                if (item.type === "custom_link" && item.href) {
                  return renderAnimatedNavLink(
                    String(item.id),
                    item.href,
                    item.label || "Link",
                  );
                }
                return null;
              })
            ) : (
              // ── Canonical fallback when no config is in DB ──
              <>
                {/* 1. All Categories (Multilevel Dropdown) */}
                <AllCategoriesDropdown categories={resolvedNavCategories} />

                {/* 2–5. Individual Category Dropdowns */}
                {individualNavCategories.map((category) => (
                  <NavCategoryDropdown
                    key={category.slug}
                    category={category}
                  />
                ))}

                {/* 6. Contact Us */}
                {renderAnimatedNavLink("contact", "/contact", "Contact Us")}

                {/* 7. Blog */}
                {renderAnimatedNavLink("blog", "/blog", "Blog")}
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
