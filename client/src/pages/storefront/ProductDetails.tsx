import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Star, Shield, Truck, Package, Zap, ChevronLeft, ChevronRight, PenLine, AlertCircle, CheckCircle2, Heart } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { api } from '../../api/axiosClient';
import type { Product, Review } from '../../types';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAtomValue } from 'jotai';
import { userAtom } from '../../store/userAtom';
import { clsx } from 'clsx';
import { toast } from 'sonner';

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

const discountPct = (p: string, s: string) => Math.round(((Number(p) - Number(s)) / Number(p)) * 100);

function StarPicker({ value, onChange, size = 5 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
          className="transition-transform hover:scale-110"
        >
          <Star className={clsx(`w-${size} h-${size}`, (hovered || value) >= s ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productId, onSuccess }: { productId: string; onSuccess: () => void }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post(`/products/${productId}/reviews`, { rating, title: title.trim() || undefined, body: body.trim() || undefined }),
    onSuccess: () => {
      toast.success('Review submitted! It will appear after approval.');
      qc.invalidateQueries({ queryKey: ['product-reviews', productId] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not submit review.'),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (rating === 0) { toast.error('Please select a star rating.'); return; } mutation.mutate(); }}
      className="bg-card rounded-2xl border border-border p-6 space-y-4"
    >
      <h3 className="font-bold text-base font-['Outfit']">Write a Review</h3>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Rating *</label>
        <StarPicker value={rating} onChange={setRating} size={6} />
        {rating === 0 && (
          <p className="text-xs text-muted-foreground mt-1">Click to rate</p>
        )}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Title (optional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          placeholder="Summarize your review"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Review (optional)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Share your experience with this product…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
        <p className="text-xs text-muted-foreground text-right mt-0.5">{body.length}/2000</p>
      </div>
      <button
        type="submit"
        disabled={mutation.isPending || rating === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        <PenLine className="w-4 h-4" />
        {mutation.isPending ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const { addToCart, isInCart } = useCart();
  const { isWishlisted, toggleItem, isToggling } = useWishlist();
  const user = useAtomValue(userAtom);
  const navigate = useNavigate();
  const location = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get<Product>(`/products/${slug}`),
  });

  const product = data?.data;

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['product-reviews', product?.id, reviewPage],
    queryFn: () =>
      api.get<Review[]>(`/products/${product!.id}/reviews`, { page: reviewPage, limit: 5 } as Record<string, unknown>),
    enabled: !!product?.id,
  });

  // Fetch the user's own review (if any) to show submitted status
  const { data: myReviewData } = useQuery({
    queryKey: ['my-review', product?.id],
    queryFn: () => api.get<Review | null>(`/products/${product!.id}/reviews/mine`),
    enabled: !!product?.id && !!user,
  });

  const reviews = reviewsData?.data ?? [];
  const meta = reviewsData?.meta;
  const myReview = myReviewData?.data;
  const images = product?.images ?? [];

  // Options & Variants state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const options = useMemo(() => product?.options ?? [], [product?.options]);
  const variants = useMemo(() => product?.variants ?? [], [product?.variants]);
  const hasOptions = options.length > 0 && options.some(opt => (opt.values?.length ?? 0) > 0);

  useEffect(() => {
    if (hasOptions) {
      const initial: Record<string, string> = {};
      for (const opt of options) {
        if (opt.values && opt.values.length > 0) {
          initial[opt.id] = opt.values[0].id;
        }
      }
      setSelectedOptions(initial);
    }
  }, [product?.id, hasOptions, options]);

  useEffect(() => {
    if (!hasOptions || location.hash !== '#product-options') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('product-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasOptions, location.hash, product?.id]);

  const selectedVariant = useMemo(() => {
    if (!hasOptions) {
      return variants.find(v => v.optionCombinationKey === 'default') ?? variants[0];
    }
    const chosenValueIds = Object.values(selectedOptions);
    if (chosenValueIds.length === 0) return undefined;
    return variants.find(v => {
      if (!v.optionValues) return false;
      return chosenValueIds.every(id => v.optionValues!.includes(id));
    });
  }, [hasOptions, variants, selectedOptions]);

  const activePrice = selectedVariant ? (selectedVariant.salePrice ?? selectedVariant.price) : (product?.salePrice ?? product?.price ?? '0');
  const regularPrice = selectedVariant ? selectedVariant.price : (product?.price ?? '0');
  const hasSalePrice = selectedVariant ? Boolean(selectedVariant.salePrice) : Boolean(product?.salePrice);
  const activeStock = selectedVariant ? selectedVariant.stockQuantity : (product?.stock ?? 0);
  const activeSku = selectedVariant ? selectedVariant.sku : (product?.sku ?? '');
  const activeThreshold = selectedVariant ? selectedVariant.lowStockThreshold : (product?.lowStockThreshold ?? 5);
  const inCart = product ? isInCart(product.id, selectedVariant?.id) : false;

  const attrs = Array.isArray(product?.attributes) ? product!.attributes : [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square bg-muted rounded-3xl" />
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded w-4/5" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <Zap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold font-['Outfit'] mb-2">Product not found</h1>
        <Link to="/shop" className="text-primary hover:underline">Back to Shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-foreground transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-foreground line-clamp-1">{product.title}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div>
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-square rounded-3xl overflow-hidden bg-card border border-border mb-4"
          >
            {images[selectedImage] ? (
              <img src={images[selectedImage]} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Zap className="w-24 h-24 text-muted-foreground/20" />
              </div>
            )}
          </motion.div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={clsx('w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all',
                    selectedImage === i ? 'border-primary' : 'border-border hover:border-primary/50')}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && <p className="text-primary font-bold text-sm uppercase tracking-wider mb-2">{product.brand}</p>}
          <h1 className="text-3xl sm:text-4xl font-black font-['Outfit'] text-foreground mb-3">{product.title}</h1>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={clsx('w-4 h-4', s <= Math.round(Number(product.avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                ))}
              </div>
              <span className="text-sm font-medium text-muted-foreground">{Number(product.avgRating).toFixed(1)} ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})</span>
            </div>
          )}

          {/* SKU */}
          {activeSku && (
            <p className="text-xs text-muted-foreground mb-2">
              SKU: <span className="font-mono font-medium text-foreground">{activeSku}</span>
            </p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-4xl sm:text-5xl font-black text-foreground font-['Outfit']">{formatPrice(activePrice)}</span>
            {hasSalePrice && (
              <>
                <span className="text-xl sm:text-2xl text-muted-foreground line-through font-medium">{formatPrice(regularPrice)}</span>
                <span className="px-2.5 py-1 bg-destructive/15 text-destructive text-sm font-bold rounded-lg">
                  -{discountPct(regularPrice, activePrice)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Product Options (Variants: Color, Size, Storage, etc.) */}
          {hasOptions && (
            <div id="product-options" className="scroll-mt-24 space-y-4 mb-6 p-4 rounded-2xl bg-card border border-border target:ring-2 target:ring-primary/40 target:ring-offset-4 target:ring-offset-background">
              {options.map((opt) => {
                const isColor = opt.name.toLowerCase().includes('color');
                const selectedValId = selectedOptions[opt.id];
                const selectedValObj = opt.values?.find((v) => v.id === selectedValId);

                return (
                  <div key={opt.id}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-2">
                      <span className="text-foreground uppercase tracking-wider">{opt.name}</span>
                      {selectedValObj && (
                        <span className="text-muted-foreground font-normal">{selectedValObj.label}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opt.values?.map((val) => {
                        const isSelected = selectedValId === val.id;
                        return isColor && val.colorSwatch ? (
                          <button
                            key={val.id}
                            type="button"
                            onClick={() => setSelectedOptions((prev) => ({ ...prev, [opt.id]: val.id }))}
                            className={clsx(
                              'group relative flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                              isSelected
                                ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40'
                                : 'border-border bg-background hover:border-primary/50'
                            )}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: val.colorSwatch }}
                            />
                            <span>{val.label}</span>
                          </button>
                        ) : (
                          <button
                            key={val.id}
                            type="button"
                            onClick={() => setSelectedOptions((prev) => ({ ...prev, [opt.id]: val.id }))}
                            className={clsx(
                              'px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                                : 'border-border bg-background hover:border-primary/50 text-foreground'
                            )}
                          >
                            {val.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stock */}
          <div className="mb-6">
            {activeStock === 0 ? (
              <span className="text-sm text-destructive font-medium">Out of Stock</span>
            ) : activeStock <= activeThreshold ? (
              <span className="text-sm text-amber-400 font-medium">Only {activeStock} left — Order soon!</span>
            ) : (
              <span className="text-sm text-green-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                In Stock ({activeStock} units)
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">{product.description}</p>
          )}

          {/* Actions: Add to Cart and Wishlist */}
          <div className="flex items-center gap-3 mb-4">
            <button
              id="product-add-to-cart-btn"
              onClick={() => addToCart(product, 1, selectedVariant)}
              disabled={activeStock === 0 || (hasOptions && !selectedVariant)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-base sm:text-lg font-bold transition-all',
                activeStock === 0 || (hasOptions && !selectedVariant)
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : inCart
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'gradient-primary text-white hover:opacity-90 hover:scale-[1.01] shadow-lg shadow-blue-500/20'
              )}
            >
              <ShoppingCart className="w-5 h-5" />
              {activeStock === 0
                ? 'Out of Stock'
                : hasOptions && !selectedVariant
                ? 'Select Options'
                : inCart
                ? '✓ In Cart'
                : 'Add to Cart'}
            </button>

            <button
              id="product-wishlist-toggle-btn"
              type="button"
              onClick={() => {
                if (!user) {
                  toast.info('Sign in to save items to your wishlist');
                  return;
                }
                if (product) toggleItem(product.id);
              }}
              disabled={isToggling}
              className={clsx(
                'h-14 w-14 rounded-2xl flex items-center justify-center border transition-all shrink-0',
                product && isWishlisted(product.id)
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 hover:bg-rose-500/20 shadow-xs'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'
              )}
              title={product && isWishlisted(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-label={product && isWishlisted(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart className={clsx('w-6 h-6 transition-transform active:scale-90', product && isWishlisted(product.id) ? 'fill-current text-rose-500' : '')} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Shield, text: 'Authentic Product' },
              { icon: Truck, text: 'Free Delivery' },
              { icon: Package, text: '1-Year Warranty' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 p-3 bg-card rounded-xl border border-border text-center">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>

          {/* Attributes / Specifications */}
          {attrs.length > 0 && (
            <div className="mt-6 p-4 bg-card rounded-2xl border border-border">
              <h3 className="font-bold text-sm mb-3 font-['Outfit']">Specifications</h3>
              <div className="space-y-0">
                {attrs.map((attr) => (
                  <div key={attr.name} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{attr.name}</span>
                    <span className="font-medium text-foreground text-right max-w-[55%]">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Reviews ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black font-['Outfit']">Customer Reviews</h2>
          {user && !myReview && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium"
              id="write-review-btn"
            >
              <PenLine className="w-4 h-4" />
              Write a Review
            </button>
          )}
          {!user && (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium"
            >
              <PenLine className="w-4 h-4" />
              Sign in to Review
            </button>
          )}
        </div>

        {/* My submitted review notice */}
        {myReview && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-5 text-sm">
            {myReview.isApproved ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-muted-foreground">
              {myReview.isApproved
                ? 'Your review has been approved and is visible below.'
                : 'Your review has been submitted and is pending moderation.'}
            </p>
          </div>
        )}

        {/* Review submission form */}
        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <ReviewForm
                productId={product.id}
                onSuccess={() => setShowReviewForm(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews list */}
        {reviewsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-3" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border">
            <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet.</p>
            {!user && (
              <button onClick={() => navigate('/login')} className="mt-3 text-primary text-sm hover:underline">
                Sign in to be the first to review
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={clsx('w-4 h-4', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                  ))}
                  {review.isVerifiedBuyer && (
                    <span className="ml-2 text-xs text-green-400 font-medium flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Verified Purchase
                    </span>
                  )}
                </div>
                {review.title && <h4 className="font-bold text-sm mb-1">{review.title}</h4>}
                {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
                <p className="text-xs text-muted-foreground mt-2">{new Date(review.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setReviewPage((p) => p - 1)}
              disabled={!meta.hasPrevPage}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-50 transition-colors"
              aria-label="Previous reviews page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setReviewPage((p) => p + 1)}
              disabled={!meta.hasNextPage}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-50 transition-colors"
              aria-label="Next reviews page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
