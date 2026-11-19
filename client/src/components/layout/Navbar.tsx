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
  Star,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  LayoutGroup,
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

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 28,
      staggerChildren: 0.035,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: 0.14, ease: "easeOut" },
  },
};

const suggestionItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 360, damping: 26 },
  },
};

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-primary/20 text-primary font-bold rounded-xs px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

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

  // Scroll-linked progress & header height compression
  const { scrollY, scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });
  const headerHeight = useTransform(scrollY, [0, 80], [54, 46]);

  const {
    categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  const { data: navbarConfigItems } = useNavbarConfig();

  const resolvedNavCategories = resolveNavCategories(categories);
  const hasDbConfig =
    Array.isArray(navbarConfigItems) && navbarConfigItems.length > 0;

  const categoryConfigById = new Map(
    resolvedNavCategories.map((cat) => [cat.id ?? "", cat]),
  );

  const individualNavCategories = getIndividualNavCategories(categories);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const isHome = location.pathname === "/" || location.pathname === "";
  const isTransparentOverHero = isHome && !isScrolled;

  const renderAnimatedNavLink = (
    key: string,
    href: string,
    label: string,
    isUtility = false,
  ) => {
    const isActive = location.pathname === href;
    const isHovered = hoveredNavKey === key;

    return (
      <Link
        key={key}
        to={href}
        onMouseEnter={() => setHoveredNavKey(key)}
        className={cn(
          "relative rounded-lg px-2.5 py-1 text-xs transition-colors duration-200 whitespace-nowrap select-none",
          isUtility ? "font-medium" : "font-semibold sm:text-[13px]",
          isActive
            ? isTransparentOverHero
              ? "text-white"
              : "text-primary font-bold"
            : isTransparentOverHero
              ? isUtility
                ? "text-white/70 hover:text-white"
                : "text-white/90 hover:text-white"
              : isUtility
                ? "text-zinc-600 hover:text-zinc-950"
                : "text-zinc-800 hover:text-primary",
        )}
      >
        {(isHovered || (isActive && !hoveredNavKey)) && (
          <motion.span
            layoutId="navbar-unified-pill"
            className={cn(
              "absolute inset-0 -z-10 rounded-lg",
              isTransparentOverHero
                ? "bg-white/15 border border-white/20"
                : "bg-zinc-100 border border-zinc-200/80 shadow-2xs",
            )}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
        )}
        <span className="relative z-10">{label}</span>
        {isActive && (
          <motion.span
            layoutId="navbar-active-dot"
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
        )}
      </Link>
    );
  };

  const handleCartClick = () => {
    if (user) {
      setCartOpen(true);
    } else {
      navigate(
        `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
      );
    }
  };

  return (
    <>
      <div
        className={cn(
          "w-full z-40 transition-all duration-300",
          isHome ? "fixed top-0 left-0 right-0" : "relative",
          isTransparentOverHero
            ? "bg-gradient-to-b from-black/75 via-black/45 to-transparent backdrop-blur-md text-white"
            : "bg-white/65 backdrop-blur-xl backdrop-saturate-150 border-b border-zinc-200/80 text-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
        )}
      >
        {/* Smooth 80px gradient fade between navbar and hero to eliminate hard edge */}
        {isTransparentOverHero && (
          <div
            className="pointer-events-none absolute -bottom-20 left-0 right-0 h-20 bg-gradient-to-b from-black/15 via-black/5 to-transparent"
            aria-hidden="true"
          />
        )}

        {/* ── ROW 1: Compact Glassmorphic Top Header ── */}
        <motion.header
          initial={reduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative w-full z-40 transition-all duration-300 pt-0.5",
            !isHome && "max-[1100px]:sticky max-[1100px]:top-0",
            isTransparentOverHero
              ? "bg-transparent border-b border-white/[0.08] text-white"
              : "bg-transparent border-b border-zinc-200/70 text-zinc-900",
          )}
        >
          {/* Top Brand Line + Animated Scroll Progress Indicator */}
          <div className="relative h-[2px] w-full bg-primary/15 overflow-hidden">
            <div className="absolute inset-0 gradient-primary opacity-45" />
            {!reduceMotion && (
              <motion.div
                style={{ scaleX: smoothProgress, transformOrigin: "0% 50%" }}
                className="h-full w-full gradient-primary"
              />
            )}
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              style={reduceMotion ? undefined : { height: headerHeight }}
              className="flex items-center justify-between h-13 sm:h-14 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mx-auto w-full"
            >
              {/* Left: Company Logo with adaptive contrast & scroll transform */}
              <div className="flex items-center justify-start shrink-0">
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 450, damping: 24 }}
                  className="flex-shrink-0"
                >
                  <Link
                    to="/"
                    className="group flex items-center gap-2 sm:gap-2.5 rounded-xl py-0.5 pr-2 transition-all duration-300"
                  >
                    <div className="relative flex items-center justify-center rounded-lg p-0.5 bg-gradient-to-br from-primary/25 to-transparent group-hover:from-primary/40 transition-colors">
                      <img
                        src="/Symbol.jpg"
                        alt="Prem Electronics Symbol"
                        className={cn(
                          "w-7.5 h-7.5 sm:w-8 sm:h-8 object-contain rounded-md shadow-xs shrink-0 transition-all duration-300 group-hover:rotate-6 group-hover:scale-105",
                          isScrolled && "w-6.5 h-6.5 sm:w-7 sm:h-7",
                        )}
                      />
                    </div>
                    <img
                      src="/logo.png"
                      alt="Prem Electronics"
                      className={cn(
                        "h-6.5 sm:h-7 w-auto object-contain shrink-0 transition-all duration-300 group-hover:opacity-90",
                        isTransparentOverHero &&
                          "brightness-0 invert drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]",
                        isScrolled && "h-5.5 sm:h-6",
                      )}
                    />
                  </Link>
                </motion.div>
              </div>

              {/* Center: Slimmer Smoked-Glass Search Bar with Smart Auto-Suggest */}
              <motion.div
                ref={searchContainerRef}
                className="hidden min-[1101px]:flex flex-1 max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg mx-auto justify-center relative"
                animate={{
                  scale: searchFocused && !reduceMotion ? 1.015 : 1,
                }}
                transition={{ type: "spring", stiffness: 360, damping: 26 }}
              >
                <form
                  onSubmit={handleSearch}
                  className="relative w-full flex items-center group"
                >
                  <motion.div
                    animate={
                      searchFocused && !reduceMotion
                        ? { scale: [1, 1.15, 1] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.25 }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                  >
                    <Search
                      className={cn(
                        "h-3.5 w-3.5 transition-colors duration-200",
                        searchFocused
                          ? "text-primary"
                          : isTransparentOverHero
                            ? "text-white/85 group-hover:text-white"
                            : "text-muted-foreground group-hover:text-primary",
                      )}
                    />
                  </motion.div>
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
                      "h-9 w-full rounded-xl border pl-9 pr-14 text-xs sm:text-[13px] outline-none transition-all duration-200",
                      isTransparentOverHero
                        ? "bg-black/20 hover:bg-black/45 border-white/15 text-white placeholder:text-white/60 hover:border-white/30 focus:text-white/80 focus:placeholder:text-muted-foreground focus:border-primary/70 focus:ring-4 focus:ring-primary/20"
                        : "bg-zinc-100/60 text-zinc-900 placeholder:text-zinc-500 border-zinc-200 hover:border-primary/40 hover:bg-white focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/15 shadow-2xs",
                      searchFocused && "ring-4 ring-primary/20 shadow-md",
                      isScrolled && "h-8.5 text-xs",
                    )}
                  />

                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSearching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : search ? (
                      <motion.button
                        type="button"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSearch("");
                          setSearchFocused(false);
                        }}
                        className={cn(
                          "h-5 w-5 rounded-md flex items-center justify-center transition-colors",
                          isTransparentOverHero && !searchFocused
                            ? "text-white/70 hover:text-white hover:bg-white/15"
                            : "text-zinc-500 hover:text-primary hover:bg-zinc-100",
                        )}
                        aria-label="Clear search"
                      >
                        <X className="w-3 h-3" />
                      </motion.button>
                    ) : (
                      <kbd
                        className={cn(
                          "hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold border rounded-md pointer-events-none transition-colors",
                          isTransparentOverHero && !searchFocused
                            ? "text-white/75 bg-white/15 border-white/20"
                            : "text-zinc-500 bg-white border-zinc-200",
                        )}
                      >
                        Ctrl+K
                      </kbd>
                    )}
                  </div>
                </form>

                {/* Glassmorphic Auto-Suggest Dropdown with Full Product Info */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute left-0 right-0 top-full mt-2 glass bg-card/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-primary/20 overflow-hidden z-50 text-foreground"
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
                          <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
                            {suggestions.map((item) => {
                              const saleNum = item.salePrice
                                ? Number(item.salePrice)
                                : null;
                              const priceNum = Number(item.price);
                              const hasDiscount =
                                saleNum !== null &&
                                saleNum < priceNum &&
                                priceNum > 0;
                              const ratingNum = item.avgRating
                                ? Number(item.avgRating)
                                : 0;

                              return (
                                <motion.button
                                  variants={suggestionItemVariants}
                                  whileHover={
                                    reduceMotion ? undefined : { x: 3 }
                                  }
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(item.slug)}
                                  className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-accent/70 transition-colors text-left group"
                                >
                                  {/* Product Thumbnail */}
                                  <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center border border-border/60 group-hover:border-primary/40 transition-colors">
                                    {item.images?.[0] ? (
                                      <img
                                        src={getProductThumbnailUrl(
                                          item.images[0],
                                        )}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                                      />
                                    ) : (
                                      <Package className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </div>

                                  {/* Product Info */}
                                  <div className="flex-1 min-w-0">
                                    {/* Brand & Badges */}
                                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                      {item.brand && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-secondary/80 px-1.5 py-0.2 rounded">
                                          <HighlightMatch
                                            text={item.brand}
                                            query={debouncedSearch}
                                          />
                                        </span>
                                      )}
                                      {item.stock <= 0 ? (
                                        <span className="text-[9px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.2 rounded">
                                          Out of Stock
                                        </span>
                                      ) : item.isBestSeller ? (
                                        <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                                          Best Seller
                                        </span>
                                      ) : null}
                                    </div>

                                    {/* Title with matched text highlight */}
                                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                      <HighlightMatch
                                        text={item.title}
                                        query={debouncedSearch}
                                      />
                                    </p>

                                    {/* Pricing & Rating */}
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-bold text-primary">
                                        {formatPrice(
                                          item.salePrice ?? item.price,
                                        )}
                                      </span>
                                      {hasDiscount && (
                                        <span className="text-[11px] line-through text-muted-foreground/75">
                                          {formatPrice(item.price)}
                                        </span>
                                      )}
                                      {hasDiscount && (
                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
                                          Save{" "}
                                          {Math.round(
                                            (1 - saleNum! / priceNum) * 100,
                                          )}
                                          %
                                        </span>
                                      )}

                                      {/* Star Rating */}
                                      {ratingNum > 0 && (
                                        <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-500 shrink-0">
                                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                          <span>{ratingNum.toFixed(1)}</span>
                                          {item.reviewCount > 0 && (
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                              ({item.reviewCount})
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary transition-all duration-200 shrink-0" />
                                </motion.button>
                              );
                            })}
                          </div>
                          <div className="p-2 border-t border-border/60 bg-secondary/40">
                            <button
                              type="button"
                              onClick={handleSearch}
                              className="w-full py-1.5 rounded-xl text-center text-xs font-semibold text-primary hover:bg-accent/80 transition-colors flex items-center justify-center gap-1.5 group"
                            >
                              <span>
                                View all results for &quot;{debouncedSearch}
                                &quot;
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
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
                            className="mt-2.5 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full badge-brand text-xs font-semibold hover:opacity-90 transition-opacity"
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

              {/* Right: Actions with refined tactile circular icons & high-contrast CTA */}
              <div className="flex items-center justify-end shrink-0 gap-1.5 sm:gap-2">
                {/* Wishlist */}
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.06, y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                >
                  <Link
                    to="/wishlist"
                    id="nav-wishlist-btn"
                    className={cn(
                      "group relative h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full flex items-center justify-center border transition-all duration-200",
                      isTransparentOverHero
                        ? "bg-white/10 hover:bg-white/20 border-white/15 text-white shadow-xs"
                        : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800 hover:text-primary shadow-2xs",
                    )}
                    aria-label="Wishlist"
                    title="My Wishlist"
                  >
                    <Heart className="w-[17px] h-[17px] text-current transition-transform duration-200 group-hover:scale-110" />
                    <AnimatePresence mode="popLayout">
                      {wishlistCount > 0 && (
                        <motion.span
                          key={wishlistCount}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 550,
                            damping: 20,
                          }}
                          className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-xs border-2 border-background leading-none"
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
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                  className={cn(
                    "group relative h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full flex items-center justify-center border transition-all duration-200",
                    isTransparentOverHero
                      ? "bg-white/10 hover:bg-white/20 border-white/15 text-white shadow-xs"
                      : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800 hover:text-primary shadow-2xs",
                  )}
                  aria-label={user ? "Open cart" : "Sign in to view cart"}
                  title={user ? "Shopping Cart" : "Sign In to View Cart"}
                >
                  <ShoppingCart className="w-[17px] h-[17px] text-current transition-transform duration-200 group-hover:-rotate-6" />
                  <AnimatePresence mode="popLayout">
                    {cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 550,
                          damping: 20,
                        }}
                        className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-xs border-2 border-background leading-none"
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
                      className={cn(
                        "h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isTransparentOverHero
                          ? "text-white hover:bg-white/15"
                          : "text-zinc-800 hover:bg-zinc-100",
                      )}
                      aria-label="User profile menu"
                      title={user.name}
                    >
                      <Avatar className="h-7.5 w-7.5 sm:h-8 sm:w-8 border-2 border-primary/35 hover:border-primary transition-colors">
                        <AvatarImage
                          src={user.avatarUrl || ""}
                          alt={user.name}
                        />
                        <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 glass bg-card/95 border-primary/20 rounded-xl p-1.5 shadow-xl text-foreground"
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
                      {(user.role === "admin" ||
                        user.role === "superadmin") && (
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
                    whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 450, damping: 24 }}
                  >
                    <Link
                      to="/login"
                      id="nav-account-btn"
                      className={cn(
                        "relative h-8.5 rounded-full px-3.5 sm:px-4 border transition-all duration-200 flex items-center gap-1.5 font-semibold text-xs shadow-xs",
                        isTransparentOverHero
                          ? "bg-white text-zinc-950 hover:bg-white/90 border-white/30 shadow-md"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent shadow-sm",
                      )}
                      aria-label="Account / Sign In"
                      title="Sign In / My Account"
                    >
                      <User
                        className={cn(
                          "w-3.5 h-3.5",
                          isTransparentOverHero
                            ? "text-zinc-950"
                            : "text-primary-foreground",
                        )}
                      />
                      <span className="hidden sm:inline">Sign In</span>
                    </Link>
                  </motion.div>
                )}

                {/* Mobile & Tablet menu toggle */}
                <motion.button
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  className={cn(
                    "h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full flex items-center justify-center border transition-colors min-[1101px]:hidden",
                    isTransparentOverHero
                      ? "bg-white/10 hover:bg-white/20 border-white/15 text-white"
                      : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800 hover:text-primary shadow-2xs",
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
                        <X className="h-4.5 w-4.5 text-primary" />
                      ) : (
                        <Menu className="h-4.5 w-4.5 text-current" />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.header>

        {/* ── ROW 2: Slimmer Sticky Categories Bar (Desktop > 1100px) ── */}
        <div
          className={cn(
            "hidden min-[1101px]:block w-full transition-colors duration-300",
            !isHome && "sticky top-0 z-30 shadow-xs",
            isTransparentOverHero
              ? "bg-transparent text-white border-b border-white/[0.04]"
              : "bg-transparent border-b border-zinc-200/60 text-zinc-800",
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
            <LayoutGroup id="desktop-categories-nav">
              <nav
                ref={categoriesNavRef}
                onMouseLeave={() => setHoveredNavKey(null)}
                aria-label="Categories Navigation"
                className="flex items-center h-9 w-full overflow-visible"
              >
                {hasDbConfig ? (
                  <>
                    {/* Catalog Categories Group (Left) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 overflow-visible">
                      {navbarConfigItems!
                        .filter(
                          (item) =>
                            item.type === "all_categories" ||
                            item.type === "category",
                        )
                        .map((item) => {
                          if (item.type === "all_categories") {
                            return (
                              <AllCategoriesDropdown
                                key={item.id}
                                categories={resolvedNavCategories}
                                overlay={isTransparentOverHero}
                                isHovered={hoveredNavKey === "all_categories"}
                                onHoverStart={() =>
                                  setHoveredNavKey("all_categories")
                                }
                              />
                            );
                          }
                          const catConfig =
                            (item.categoryId
                              ? categoryConfigById.get(item.categoryId)
                              : undefined) ||
                            resolvedNavCategories.find(
                              (c) =>
                                (item.categoryId && c.id === item.categoryId) ||
                                (item.label &&
                                  c.name.toLowerCase() ===
                                    item.label.toLowerCase()) ||
                                (item.label &&
                                  c.slug.toLowerCase() ===
                                    item.label
                                      .toLowerCase()
                                      .replace(/\s+/g, "-")),
                            );
                          if (!catConfig) return null;
                          const navKey = `cat-${item.id}`;
                          return (
                            <NavCategoryDropdown
                              key={item.id}
                              category={{
                                ...catConfig,
                                name: item.label || catConfig.name,
                              }}
                              overlay={isTransparentOverHero}
                              isHovered={hoveredNavKey === navKey}
                              onHoverStart={() => setHoveredNavKey(navKey)}
                            />
                          );
                        })}
                    </div>

                    {/* Utility Links Group (Custom Links on Right) */}
                    <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
                      {navbarConfigItems!
                        .filter(
                          (item) => item.type === "custom_link" && item.href,
                        )
                        .map((item) =>
                          renderAnimatedNavLink(
                            String(item.id),
                            item.href!,
                            item.label || "Link",
                            true,
                          ),
                        )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Catalog Categories Group (Left) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 overflow-visible">
                      <AllCategoriesDropdown
                        categories={resolvedNavCategories}
                        overlay={isTransparentOverHero}
                        isHovered={hoveredNavKey === "all_categories"}
                        onHoverStart={() => setHoveredNavKey("all_categories")}
                      />

                      {/* Subtle divider separating master menu from individual catalog categories */}
                      <div
                        className={cn(
                          "h-3.5 w-px mx-1 shrink-0",
                          isTransparentOverHero ? "bg-white/15" : "bg-zinc-300",
                        )}
                        aria-hidden="true"
                      />

                      {individualNavCategories.map((category) => {
                        const navKey = `cat-${category.slug}`;
                        return (
                          <NavCategoryDropdown
                            key={category.slug}
                            category={category}
                            overlay={isTransparentOverHero}
                            isHovered={hoveredNavKey === navKey}
                            onHoverStart={() => setHoveredNavKey(navKey)}
                          />
                        );
                      })}
                    </div>

                    {/* Utility Links Group (Contact Us & Blog on Right) */}
                    <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
                      {renderAnimatedNavLink(
                        "contact",
                        "/contact",
                        "Contact Us",
                        true,
                      )}
                      {renderAnimatedNavLink("blog", "/blog", "Blog", true)}
                    </div>
                  </>
                )}
              </nav>
            </LayoutGroup>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-full left-0 right-0 h-10 backdrop-blur-md bg-gradient-to-b from-black/15 via-black/0 to-transparent [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
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
