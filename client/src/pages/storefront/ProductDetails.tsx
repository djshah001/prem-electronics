import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Shield, Truck, Package, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../../api/axiosClient';
import type { Product, Review } from '../../types';
import { useCart } from '../../hooks/useCart';
import { clsx } from 'clsx';

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

const discountPct = (p: string, s: string) => Math.round(((Number(p) - Number(s)) / Number(p)) * 100);

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewPage] = useState(1);
  const { addToCart, isInCart } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get<Product>(`/products/${slug}`),
  });
  const { data: reviewsData } = useQuery({
    queryKey: ['product-reviews', slug, reviewPage],
    queryFn: () => api.get<Review[]>(`/products/${data?.data?.id}/reviews`, { page: reviewPage, limit: 5 } as Record<string, unknown>),
    enabled: !!data?.data?.id,
  });

  const product = data?.data;
  const reviews = reviewsData?.data ?? [];

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

  const images = product.images ?? [];
  const inCart = isInCart(product.id);

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
          {product.brand && <p className="text-primary font-medium text-sm mb-2">{product.brand}</p>}
          <h1 className="text-3xl font-black font-['Outfit'] text-foreground mb-3">{product.title}</h1>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={clsx('w-4 h-4', s <= Math.round(Number(product.avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{Number(product.avgRating).toFixed(1)} ({product.reviewCount} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl font-black text-foreground">{formatPrice(product.salePrice ?? product.price)}</span>
            {product.salePrice && (
              <>
                <span className="text-xl text-muted-foreground line-through">{formatPrice(product.price)}</span>
                <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-sm font-bold rounded-lg">
                  -{discountPct(product.price, product.salePrice)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6">
            {product.stock === 0 ? (
              <span className="text-sm text-destructive font-medium">Out of Stock</span>
            ) : product.stock <= product.lowStockThreshold ? (
              <span className="text-sm text-amber-400 font-medium">Only {product.stock} left — Order soon!</span>
            ) : (
              <span className="text-sm text-green-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                In Stock ({product.stock} units)
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">{product.description}</p>
          )}

          {/* Add to Cart */}
          <button
            id="product-add-to-cart-btn"
            onClick={() => addToCart(product)}
            disabled={product.stock === 0}
            className={clsx(
              'w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold transition-all mb-4',
              product.stock === 0
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : inCart
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'gradient-primary text-white hover:opacity-90 hover:scale-[1.01] shadow-lg shadow-blue-500/20'
            )}
          >
            <ShoppingCart className="w-5 h-5" />
            {product.stock === 0 ? 'Out of Stock' : inCart ? '✓ In Cart' : 'Add to Cart'}
          </button>

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

          {/* Attributes */}
          {Object.keys(product.attributes ?? {}).length > 0 && (
            <div className="mt-6 p-4 bg-card rounded-2xl border border-border">
              <h3 className="font-bold text-sm mb-3 font-['Outfit']">Specifications</h3>
              <div className="space-y-2">
                {Object.entries(product.attributes as Record<string, string>).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div>
        <h2 className="text-2xl font-black font-['Outfit'] mb-6">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border">
            <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
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
      </div>
    </div>
  );
}
