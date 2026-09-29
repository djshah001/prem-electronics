import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Zap, Heart } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import type { Product } from '../../types';
import { clsx } from 'clsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/axiosClient';
import { useAtomValue } from 'jotai';
import { userAtom } from '../../store/userAtom';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  className?: string;
}

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

const discountPercent = (original: string, sale: string) =>
  Math.round(((Number(original) - Number(sale)) / Number(original)) * 100);

export const ProductCard = ({ product, className }: ProductCardProps) => {
  const { addToCart, isInCart } = useCart();
  const inCart = isInCart(product.id);
  const user = useAtomValue(userAtom);
  const qc = useQueryClient();

  // Wishlist state
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<Array<{ productId: string }>>('/wishlists'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isWishlisted = wishlistData?.data?.some((w) => w.productId === product.id) ?? false;

  const wishlistMutation = useMutation({
    mutationFn: () =>
      isWishlisted
        ? api.delete(`/wishlists/${product.id}`)
        : api.post(`/wishlists/${product.id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    },
    onError: () => toast.error('Failed to update wishlist'),
  });

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.info('Please login to save items'); return; }
    wishlistMutation.mutate();
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={clsx(
        'group relative bg-card rounded-2xl border border-border overflow-hidden card-glow',
        className
      )}
    >
      {/* Image */}
      <Link to={`/products/${product.slug}`} className="block relative overflow-hidden bg-muted aspect-square">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent && !parent.querySelector('.fallback-icon')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-full flex items-center justify-center text-muted-foreground fallback-icon';
                placeholder.innerHTML = '<svg class="w-12 h-12 opacity-20" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
                parent.appendChild(placeholder);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Zap className="w-12 h-12 opacity-20" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.salePrice && (
            <span className="px-2 py-0.5 bg-destructive text-white text-xs font-bold rounded-md">
              -{discountPercent(product.price, product.salePrice)}%
            </span>
          )}
          {product.isFeatured && (
            <span className="px-2 py-0.5 bg-amber-500 text-black text-xs font-bold rounded-md">
              Featured
            </span>
          )}
          {product.stock <= product.lowStockThreshold && product.stock > 0 && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-md">
              Low Stock
            </span>
          )}
          {product.stock === 0 && (
            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded-md">
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist heart */}
        <button
          id={`wishlist-${product.id}`}
          onClick={handleWishlist}
          disabled={wishlistMutation.isPending}
          className={clsx(
            'absolute top-2 right-2 p-2 rounded-full transition-all',
            isWishlisted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'backdrop-blur-sm bg-background/70 hover:scale-110 active:scale-95',
            wishlistMutation.isPending && 'opacity-50'
          )}
        >
          <Heart
            className={clsx(
              'w-4 h-4 transition-colors',
              isWishlisted ? 'fill-red-400 text-red-400' : 'text-muted-foreground hover:text-red-400'
            )}
          />
        </button>
      </Link>

      {/* Content */}
      <div className="p-4">
        {product.brand && (
          <p className="text-xs text-primary font-medium mb-1">{product.brand}</p>
        )}
        <Link to={`/products/${product.slug}`}>
          <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-2">
            {product.title}
          </h3>
        </Link>

        {/* Rating */}
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={clsx(
                    'w-3 h-3',
                    star <= Math.round(Number(product.avgRating))
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-foreground">
            {formatPrice(product.salePrice ?? product.price)}
          </span>
          {product.salePrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <button
          id={`add-to-cart-${product.id}`}
          onClick={() => addToCart(product)}
          disabled={product.stock === 0}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            product.stock === 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : inCart
              ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          {product.stock === 0 ? 'Out of Stock' : inCart ? 'In Cart ✓' : 'Add to Cart'}
        </button>
      </div>
    </motion.div>
  );
};
