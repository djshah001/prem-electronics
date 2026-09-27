import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, Star, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/axiosClient';
import type { WishlistItem } from '../../types';
import { useCart } from '../../hooks/useCart';
import { toast } from 'sonner';

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

export default function Wishlist() {
  const qc = useQueryClient();
  const { addItem } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<WishlistItem[]>('/wishlists'),
  });

  const items = data?.data ?? [];

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlists/${productId}`),
    onSuccess: () => { toast.success('Removed from wishlist'); qc.invalidateQueries({ queryKey: ['wishlist'] }); },
    onError: () => toast.error('Failed to remove'),
  });

  const handleMoveToCart = (item: WishlistItem) => {
    addItem({
      productId: item.product.id,
      title: item.product.title,
      slug: item.product.slug,
      price: item.product.price,
      salePrice: item.product.salePrice,
      image: item.product.images[0],
      quantity: 1,
    });
    removeMutation.mutate(item.productId);
    toast.success('Moved to cart!');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black font-['Outfit'] flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-400 fill-red-400" /> My Wishlist
          </h1>
          <p className="text-muted-foreground mt-2">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="h-72 bg-card rounded-2xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-bold font-['Outfit'] mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground mb-6">Save items you love to come back to them later.</p>
            <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item, i) => {
              const p = item.product;
              const effectivePrice = p.salePrice ?? p.price;
              const discount = p.salePrice ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;

              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden group card-glow">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <Link to={`/products/${p.slug}`}>
                      {p.images[0]
                        ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-muted-foreground/30" /></div>}
                    </Link>
                    {discount > 0 && (
                      <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
                    )}
                    <button onClick={() => removeMutation.mutate(item.productId)} className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm text-red-400 hover:bg-red-500/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {p.brand && <p className="text-xs text-primary font-medium mb-1">{p.brand}</p>}
                    <Link to={`/products/${p.slug}`}>
                      <h3 className="font-semibold text-foreground line-clamp-2 mb-2 hover:text-primary transition-colors">{p.title}</h3>
                    </Link>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">{Number(p.avgRating).toFixed(1)} ({p.reviewCount})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-black text-foreground">{formatPrice(effectivePrice)}</p>
                        {p.salePrice && <p className="text-xs text-muted-foreground line-through">{formatPrice(p.price)}</p>}
                      </div>
                      <button onClick={() => handleMoveToCart(item)} disabled={p.stock === 0}
                        className="flex items-center gap-1.5 px-3 py-2 gradient-primary text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-40">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {p.stock === 0 ? 'Out' : 'Add'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
