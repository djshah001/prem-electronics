import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Search, X, ChevronDown, Check } from 'lucide-react';
// Preserved icon imports for future filter re-activation: Star, Sparkles, Flame
import { api } from '../../api/axiosClient';
import { ProductCard } from '../../components/shared/ProductCard';
import type { Product, Category, PaginationMeta } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { normalizeCategoryList } from '../../hooks/useCategories';
import { clsx } from 'clsx';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
];

export const POPULAR_BRANDS = ['Apple', 'Samsung', 'Sony', 'ASUS', 'LG', 'OnePlus', 'Dell', 'HP', 'Boat'];

/**
 * Helper to dynamically get brands for the active category.
 * Ready for activation when the approved brand list is provided.
 */
export const getBrandsForCategory = (categoryId?: string): string[] => {
  if (!categoryId) return POPULAR_BRANDS;
  return POPULAR_BRANDS;
};

/**
 * Temporarily disabled categories per store policy.
 * Implementation preserved here so they can be re-enabled at any time.
 */
export const TEMPORARILY_DISABLED_CATEGORIES = [
  'smartphones',
  'smartphone',
  'laptops',
  'laptop',
  'televisions',
  'television',
  'tv',
  'office laptops',
  'office-laptops',
  'office laptop',
];

export const RATING_OPTIONS = [
  { value: 4, label: '4★ & above' },
  { value: 3, label: '3★ & above' },
  { value: 2, label: '2★ & above' },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') ?? '');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sliderMax, setSliderMax] = useState(500000);
  const [inStock, setInStock] = useState(false);
  const [isFeatured, setIsFeatured] = useState(searchParams.get('isFeatured') === 'true');
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [page, setPage] = useState(1);
  const [mobileFilters, setMobileFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const queryParams: Record<string, string | number | boolean> = {
    page,
    limit: 12,
    sortBy,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(categoryId && { categoryId }),
    ...(selectedBrand && { brand: selectedBrand }),
    ...(minRating && { minRating }),
    ...(minPrice && { minPrice: Number(minPrice) }),
    ...(maxPrice && { maxPrice: Number(maxPrice) }),
    ...(inStock && { inStock: true }),
    ...(isFeatured && { isFeatured: true }),
    ...(isNewArrival && { isNewArrival: true }),
    ...(isBestSeller && { isBestSeller: true }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => api.get<Product[]>('/products', queryParams as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  });

  const products = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;
  const categories = normalizeCategoryList(categoriesRes);

  // Synchronize component state with URL searchParams (e.g. from navbar clicks)
  useEffect(() => {
    const urlCatId = searchParams.get('categoryId');
    const urlCatSlug = searchParams.get('categorySlug');
    const urlSearch = searchParams.get('search');
    const urlBrand = searchParams.get('brand');
    const urlFeatured = searchParams.get('isFeatured');

    if (urlCatId) {
      setCategoryId(urlCatId);
    } else if (urlCatSlug && categories.length > 0) {
      const findInTree = (items: Category[]): Category | undefined => {
        for (const item of items) {
          if (item.slug === urlCatSlug) return item;
          if (item.children?.length) {
            const found = findInTree(item.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      const match = findInTree(categories);
      if (match) {
        setCategoryId(match.id);
      }
    } else if (!searchParams.has('categoryId') && !searchParams.has('categorySlug')) {
      setCategoryId('');
    }

    if (urlSearch !== null) setSearch(urlSearch);
    if (urlBrand !== null) setSelectedBrand(urlBrand);
    if (urlFeatured !== null) setIsFeatured(urlFeatured === 'true');
  }, [searchParams, categories]);

  // Find active category or subcategory
  const findCategory = (id: string, list: Category[]): Category | undefined => {
    for (const c of list) {
      if (c.id === id) return c;
      if (c.children?.length) {
        const found = findCategory(id, c.children);
        if (found) return found;
      }
    }
    return undefined;
  };
  const activeCategory = categoryId ? findCategory(categoryId, categories) : undefined;

  const handleSelectCategory = (cat: Category | null) => {
    if (!cat) {
      setCategoryId('');
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('categoryId');
        next.delete('categorySlug');
        return next;
      });
    } else {
      setCategoryId(cat.id);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('categoryId', cat.id);
        next.set('categorySlug', cat.slug);
        return next;
      });
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, selectedBrand, minRating, sortBy, minPrice, maxPrice, inStock, isFeatured, isNewArrival, isBestSeller]);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setSelectedBrand('');
    setMinRating(null);
    setSortBy('newest');
    setMinPrice('');
    setMaxPrice('');
    setSliderMax(500000);
    setInStock(false);
    setIsFeatured(false);
    setIsNewArrival(false);
    setIsBestSeller(false);
    setSearchParams({});
  };

  const hasFilters =
    Boolean(search) ||
    Boolean(categoryId) ||
    Boolean(selectedBrand) ||
    minRating !== null ||
    Boolean(minPrice) ||
    Boolean(maxPrice && Number(maxPrice) < 500000) ||
    inStock ||
    isFeatured ||
    isNewArrival ||
    isBestSeller;

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h3 className="font-semibold text-base text-foreground mb-3 font-['Outfit']">Category</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          <button
            onClick={() => handleSelectCategory(null)}
            className={clsx(
              'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between',
              !categoryId ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-card'
            )}
          >
            <span>All Categories</span>
            {!categoryId && <Check className="w-4 h-4" />}
          </button>

          {/* Filter out temporarily disabled categories (Smartphones, Laptops, Televisions, Office Laptops) */}
          {categories
            .filter((c) => !c.parentId)
            .filter((c) => {
              const normName = c.name?.toLowerCase().trim() || '';
              const normSlug = c.slug?.toLowerCase().trim() || '';
              return (
                !TEMPORARILY_DISABLED_CATEGORIES.includes(normName) &&
                !TEMPORARILY_DISABLED_CATEGORIES.includes(normSlug)
              );
            })
            .map((cat) => {
              const isCatSelected = categoryId === cat.id;
              const subcategories = (cat.children ?? []).filter((s) => s.isActive !== false);
              return (
                <div key={cat.id} className="space-y-0.5">
                  <button
                    onClick={() => handleSelectCategory(cat)}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between font-medium',
                      isCatSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-card'
                    )}
                  >
                    <span>{cat.name}</span>
                    {isCatSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  {subcategories.length > 0 && (
                    <div className="pl-3.5 ml-2 space-y-0.5 border-l border-border/50">
                      {subcategories.map((sub) => {
                        const isSubSelected = categoryId === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleSelectCategory(sub)}
                            className={clsx(
                              'w-full text-left px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] transition-colors flex items-center justify-between',
                              isSubSelected
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card'
                            )}
                          >
                            <span className="truncate">{sub.name}</span>
                            {isSubSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* =========================================================================
          BRANDS FILTER (TEMPORARILY DISABLED)
          Preserved for future activation once the approved brand list is provided.
          When activated, displays only the brands relevant to the active category.
          ========================================================================= */}
      {/* 
      <div>
        <h3 className="font-semibold text-base text-foreground mb-3 font-['Outfit']">Brands</h3>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {POPULAR_BRANDS.map((b) => {
            const isSelected = selectedBrand.toLowerCase() === b.toLowerCase();
            return (
              <label
                key={b}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-card cursor-pointer text-sm transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => setSelectedBrand(isSelected ? '' : b)}
                  className="accent-primary w-4 h-4 rounded"
                />
                <span className={clsx(isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{b}</span>
              </label>
            );
          })}
        </div>
      </div>
      */}

      {/* Price Range Slider (Up to ₹5,00,000) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-base text-foreground font-['Outfit']">Price Range</h3>
          <span className="text-sm font-bold text-primary">{formatCurrency(Number(maxPrice || sliderMax))}</span>
        </div>
        <input
          type="range"
          min="1000"
          max="500000"
          step="5000"
          value={maxPrice || sliderMax}
          onChange={(e) => {
            const val = Number(e.target.value);
            setSliderMax(val);
            setMaxPrice(String(val));
          }}
          className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
        />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Min (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Max (₹)</label>
            <input
              type="number"
              placeholder="500000"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                if (e.target.value) setSliderMax(Number(e.target.value));
              }}
              className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          CUSTOMER RATING FILTER (TEMPORARILY DISABLED)
          Preserved for future use per store instructions.
          ========================================================================= */}
      {/* 
      <div>
        <h3 className="font-semibold text-base text-foreground mb-2 font-['Outfit']">Customer Rating</h3>
        <div className="space-y-1">
          {RATING_OPTIONS.map((r) => {
            const active = minRating === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setMinRating(active ? null : r.value)}
                className={clsx(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                  active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-card'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={clsx('w-3.5 h-3.5', s <= r.value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
                      />
                    ))}
                  </div>
                  <span>{r.label}</span>
                </div>
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>
      */}

      {/* =========================================================================
          SPECIAL TAGS FILTER (TEMPORARILY DISABLED)
          Preserved for future use per store instructions.
          ========================================================================= */}
      {/* 
      <div>
        <h3 className="font-semibold text-base text-foreground mb-2.5 font-['Outfit']">Special Tags</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={isNewArrival}
              onChange={(e) => setIsNewArrival(e.target.checked)}
              className="accent-purple-500 w-4 h-4 rounded"
            />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="w-4 h-4 text-purple-400" /> New Arrivals
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={isBestSeller}
              onChange={(e) => setIsBestSeller(e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded"
            />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Flame className="w-4 h-4 text-amber-400" /> Best Sellers
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="accent-blue-500 w-4 h-4 rounded"
            />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              Featured Items
            </span>
          </label>
        </div>
      </div>
      */}

      {/* In Stock Only Toggle (Active & Fully Functional) */}
      <label className="flex items-center gap-3 cursor-pointer pt-3 border-t border-border group">
        <div className="relative">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="sr-only"
          />
          <div className={clsx('w-11 h-6 rounded-full transition-colors', inStock ? 'bg-primary' : 'bg-muted')}>
            <div
              className={clsx(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                inStock && 'translate-x-5'
              )}
            />
          </div>
        </div>
        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          In Stock Only
        </span>
      </label>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-destructive/50 text-destructive rounded-xl text-sm font-semibold hover:bg-destructive/10 transition-colors"
        >
          <X className="w-4 h-4" /> Reset All Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 sm:mt-20 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black font-['Outfit']">
            {debouncedSearch
              ? `Results for "${debouncedSearch}"`
              : activeCategory
              ? activeCategory.name
              : 'Shop Electronics'}
          </h1>
          {meta && (
            <p className="text-muted-foreground text-sm mt-1">
              {meta.total} product{meta.total !== 1 ? 's' : ''} available
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter products..."
              className="w-full pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {/* Mobile filter toggle */}
          <button
            onClick={() => setMobileFilters(!mobileFilters)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {activeCategory && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              Category: {activeCategory.name}
              <button
                type="button"
                onClick={() => handleSelectCategory(null)}
                aria-label={`Remove ${activeCategory.name} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedBrand && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              Brand: {selectedBrand}
              <button onClick={() => setSelectedBrand('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {minRating && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
              {minRating}★ & above
              <button onClick={() => setMinRating(null)}><X className="w-3 h-3" /></button>
            </span>
          )}
          {maxPrice && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              Max: {formatCurrency(Number(maxPrice))}
              <button onClick={() => { setMaxPrice(''); setSliderMax(500000); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {isNewArrival && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">
              New Arrivals
              <button onClick={() => setIsNewArrival(false)}><X className="w-3 h-3" /></button>
            </span>
          )}
          {isBestSeller && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
              Best Sellers
              <button onClick={() => setIsBestSeller(false)}><X className="w-3 h-3" /></button>
            </span>
          )}
          {inStock && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
              In Stock Only
              <button onClick={() => setInStock(false)}><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-2">
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-8">
        {/* Desktop Filters */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground font-['Outfit'] text-base">Filters</h2>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                  Reset
                </button>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* Mobile Filters Drawer */}
        {mobileFilters && (
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setMobileFilters(false)}>
            <div
              className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold font-['Outfit'] text-lg">Filters</h2>
                <button onClick={() => setMobileFilters(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterPanel />
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-8 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-card rounded-3xl border border-border p-8">
              <Search className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-bold font-['Outfit'] mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">We couldn&apos;t find any products matching your selected filters.</p>
              <button
                onClick={clearFilters}
                className="px-6 py-2.5 gradient-primary text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    disabled={!meta.hasPrevPage}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium disabled:opacity-40 hover:border-primary/50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-muted-foreground">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <button
                    disabled={!meta.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium disabled:opacity-40 hover:border-primary/50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
