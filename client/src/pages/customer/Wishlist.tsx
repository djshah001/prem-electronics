import { Heart, ShoppingCart, Trash2, Star, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WishlistItem } from '../../types';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { toast } from 'sonner';

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(p));

export default function Wishlist() {
  const { addToCart } = useCart();
  const { items, isLoading, removeItem, isRemoving } = useWishlist();

  const handleMoveToCart = (item: WishlistItem) => {
    if (item.product.stock === 0 || !item.product.isActive) return;

    addToCart(item.product, 1);
    removeItem(item.productId);
    toast.success('Moved to cart!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-3">
          <Heart className="w-7 h-7 text-red-400 fill-red-400" />
          My Wishlist
        </h1>

        {!isLoading && (
          <span className="text-sm text-muted-foreground">
            {items.length} saved item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border p-6 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-muted rounded-xl shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold font-['Outfit'] mb-2">
            Your wishlist is empty
          </h3>
          <p className="text-muted-foreground mb-4">
            Save items you love to come back to them later.
          </p>
          <Link
            to="/shop"
            className="px-6 py-3 gradient-primary text-white rounded-xl font-semibold inline-block"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const p = item.product;
            const effectivePrice = p.salePrice ?? p.price;

            const discount = p.salePrice
              ? Math.round(
                (1 - Number(p.salePrice) / Number(p.price)) * 100
              )
              : 0;

            const unavailable = p.stock === 0 || !p.isActive;

            return (
              <article
                key={item.id}
                className="bg-card rounded-2xl border border-border p-4 sm:p-6 card-glow hover:border-primary/40 transition-all group"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to={`/products/${p.slug}`}
                    className="relative w-full sm:w-28 sm:h-28 aspect-square sm:aspect-auto shrink-0 overflow-hidden rounded-xl bg-muted"
                  >
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}

                    {discount > 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        -{discount}%
                      </span>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {p.brand && (
                          <p className="text-xs text-primary font-medium mb-1">
                            {p.brand}
                          </p>
                        )}

                        <Link to={`/products/${p.slug}`}>
                          <h3 className="font-bold text-foreground hover:text-primary transition-colors line-clamp-2">
                            {p.title}
                          </h3>
                        </Link>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${p.title} from wishlist`}
                        title="Remove from wishlist"
                        disabled={isRemoving}
                        onClick={() => removeItem(item.productId)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">
                        {Number(p.avgRating).toFixed(1)} ({p.reviewCount})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                      <div>
                        <p className="text-lg font-bold text-foreground">
                          {formatPrice(effectivePrice)}
                        </p>

                        {p.salePrice && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(p.price)}
                          </p>
                        )}

                        {unavailable && (
                          <p className="text-xs text-destructive mt-1">
                            Currently unavailable
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={unavailable || isRemoving}
                        onClick={() => handleMoveToCart(item)}
                        className="flex items-center justify-center gap-2 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {unavailable ? 'Unavailable' : 'Move to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}