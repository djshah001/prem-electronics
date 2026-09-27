import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Zap, Shield, Truck, Headphones, Star } from 'lucide-react';
import { api } from '../../api/axiosClient';
import { ProductCard } from '../../components/shared/ProductCard';
import type { Product, Category } from '../../types';

const FEATURES = [
  { icon: Shield, title: 'Authentic Products', desc: '100% genuine electronics from authorized dealers' },
  { icon: Truck, title: 'Free Delivery', desc: 'Free shipping on orders above ₹999' },
  { icon: Headphones, title: '24/7 Support', desc: 'Expert support for all your electronics needs' },
  { icon: Zap, title: 'Fast Checkout', desc: 'Secure Razorpay payment in seconds' },
];

export default function Home() {
  const { data: featuredRes } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get<Product[]>('/products/featured'),
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  });

  const featured = featuredRes?.data ?? [];
  const categories = (categoriesRes?.data ?? []).filter((c) => !c.parentId).slice(0, 6);

  return (
    <main>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Animated background orbs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-6"
            >
              <Zap className="w-3.5 h-3.5" />
              Trusted by 50,000+ customers across India
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight font-['Outfit'] mb-6">
              Power Your{' '}
              <span className="gradient-text">Digital</span>{' '}
              Life
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Shop the latest smartphones, laptops, audio, and more — all authentic, all at the best prices in India.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/shop"
                id="hero-shop-btn"
                className="flex items-center gap-2 px-8 py-4 gradient-primary text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20"
              >
                Shop Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/shop?isFeatured=true"
                className="flex items-center gap-2 px-8 py-4 bg-card border border-border text-foreground rounded-2xl font-bold text-lg hover:border-primary/50 transition-all"
              >
                Featured Deals
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-10">
              <div className="flex -space-x-2">
                {['A', 'R', 'P', 'M'].map((l, i) => (
                  <div key={i} className="w-9 h-9 rounded-full gradient-primary border-2 border-background flex items-center justify-center text-white text-xs font-bold">{l}</div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground">4.9 rating • 12,000+ reviews</p>
              </div>
            </div>
          </motion.div>

          {/* Hero product showcase */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            className="relative hidden lg:block"
          >
            <div className="relative z-10 animate-float">
              <img
                src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80"
                alt="Featured electronics"
                className="w-full max-w-md mx-auto rounded-3xl shadow-2xl shadow-blue-500/20"
              />
            </div>
            {/* Floating cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -left-8 top-1/3 glass rounded-2xl p-4 border border-border shadow-xl"
            >
              <p className="text-xs text-muted-foreground">Today's Deal</p>
              <p className="font-bold text-primary text-sm">Up to 30% OFF</p>
              <p className="text-xs text-muted-foreground">On all Samsung products</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -right-4 bottom-1/3 glass rounded-2xl p-4 border border-border shadow-xl"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <div>
                  <p className="font-bold text-xs">Verified Seller</p>
                  <p className="text-xs text-muted-foreground">1-year warranty</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────── */}
      <section className="py-16 border-y border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-3 items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black font-['Outfit']">
                Shop by <span className="gradient-text">Category</span>
              </h2>
              <Link to="/shop" className="text-sm text-primary hover:underline flex items-center gap-1">
                All categories <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link
                    to={`/shop?categoryId=${cat.id}`}
                    className="group block bg-card rounded-2xl border border-border overflow-hidden card-glow text-center p-4 hover:border-primary/40 transition-all"
                  >
                    {cat.bannerImage ? (
                      <div className="w-full aspect-square rounded-xl overflow-hidden mb-3">
                        <img src={cat.bannerImage} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      </div>
                    ) : (
                      <div className="w-full aspect-square rounded-xl bg-muted mb-3 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Featured Products ─────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-16 bg-card/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black font-['Outfit']">
                  Featured <span className="gradient-text">Deals</span>
                </h2>
                <p className="text-muted-foreground mt-1">Hand-picked best sellers at exclusive prices</p>
              </div>
              <Link to="/shop?isFeatured=true" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA Banner ────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl gradient-primary p-12 text-center"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl font-black font-['Outfit'] text-white mb-4">
                New User? Get 10% OFF 🎉
              </h2>
              <p className="text-blue-100 mb-6 text-lg">Use code <strong className="text-white bg-white/20 px-2 py-0.5 rounded font-mono">WELCOME10</strong> on your first order</p>
              <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-900 rounded-2xl font-bold hover:bg-blue-50 transition-all hover:scale-105">
                Register Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
