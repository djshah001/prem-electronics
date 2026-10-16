import React, { useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  type Variants,
} from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Zap,
  Shield,
  Truck,
  Headphones,
  Sparkles,
  Copy,
  Check,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../api/axiosClient";
import { ProductCard } from "../../components/shared/ProductCard";
import type { Product } from "../../types";
import { HeroBannerCarousel } from "../../components/banner/HeroBannerCarousel";
import { HomeImageBento } from "../../components/home/HomeImageBento";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: Shield,
    title: "Authentic Products",
    desc: "100% genuine electronics from authorized dealers",
  },
  {
    icon: Truck,
    title: "Free Delivery",
    desc: "Free shipping on orders above ₹999",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "Expert support for all your electronics needs",
  },
  {
    icon: Zap,
    title: "Fast Checkout",
    desc: "Secure Razorpay payment in seconds",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 220,
      damping: 24,
    },
  },
};

function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: FeatureItem & { index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  return (
    <motion.div
      variants={cardVariants}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/80 via-card/50 to-card/20 p-6 shadow-sm backdrop-blur-xl transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5"
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              320px circle at ${mouseX}px ${mouseY}px,
              hsl(var(--primary) / 0.14),
              transparent 80%
            )
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 dark:via-white/10" />

      <div className="relative flex items-center justify-between">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-primary/25 blur-lg opacity-0 transition-all duration-500 group-hover:scale-150 group-hover:opacity-100" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-inner transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/20 group-hover:scale-105">
            <Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
          </div>
        </div>
        <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground/40 transition-colors duration-300 group-hover:text-primary/60">
          0{index + 1}
        </span>
      </div>

      <div className="relative mt-8">
        <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>

      <div className="mt-6 h-0.5 w-6 rounded-full bg-border/80 transition-all duration-300 group-hover:w-12 group-hover:bg-primary/60" />
    </motion.div>
  );
}

export default function Home() {
  const [copied, setCopied] = useState(false);

  const { data: featuredRes, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => api.get<Product[]>("/products/featured"),
  });

  const featured = featuredRes?.data ?? [];

  const copyCoupon = () => {
    navigator.clipboard.writeText("WELCOME10");
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <main className="min-h-screen bg-background">
      <h1 className="sr-only">Prem Electronics online electronics store</h1>
      <HeroBannerCarousel />

      {/* ─── Features Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 border-y border-border/60 bg-gradient-to-b from-background via-card/20 to-background">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Bento Grid ─────────────────────────────────────────── */}
      <HomeImageBento />

      {/* ─── Featured Products ─────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 bg-card/20 border-t border-border/50">
        <div className="pointer-events-none absolute left-10 top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute right-10 bottom-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary mb-2.5">
                <Sparkles className="h-3 w-3" />
                Hand-picked Deals
              </div>
              <h2 className="text-3xl sm:text-4xl font-black font-['Outfit'] tracking-tight">
                Featured <span className="gradient-text">Collection</span>
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Cutting-edge tech and exclusive prices backed by official
                warranty
              </p>
            </div>
            <Link
              to="/shop?isFeatured=true"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all hover:text-primary/80"
            >
              <span>Explore all deals</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-[380px] rounded-[1.75rem] border border-border/50 bg-card/50 p-4 animate-pulse flex flex-col justify-between"
                >
                  <div className="h-52 w-full rounded-2xl bg-muted/60" />
                  <div className="space-y-2 mt-4">
                    <div className="h-4 w-2/3 rounded bg-muted/60" />
                    <div className="h-4 w-1/3 rounded bg-muted/60" />
                  </div>
                  <div className="h-10 w-full rounded-xl bg-muted/60 mt-4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: i * 0.08,
                    type: "spring",
                    stiffness: 220,
                    damping: 24,
                  }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Pink CTA Banner ────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative overflow-hidden rounded-[2.5rem] gradient-primary p-8 sm:p-14 lg:p-16 text-center shadow-2xl shadow-primary/25"
          >
            {/* Ambient Background Light Effects */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-white/20 blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-pink-950/40 blur-3xl translate-y-1/2 -translate-x-1/3" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md mb-6">
                🎉 Special Welcome Offer
              </span>

              <h2 className="text-3xl sm:text-5xl font-black font-['Outfit'] text-white tracking-tight leading-tight">
                Get 10% OFF Your First Gear
              </h2>

              <p className="mt-4 text-base sm:text-lg text-pink-100/90 leading-relaxed">
                Upgrade your creative setup today. Copy the coupon below and
                apply at checkout for instant savings.
              </p>

              {/* Interactive Coupon Pill Button */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={copyCoupon}
                  className="group flex items-center gap-2.5 rounded-2xl border border-white/30 bg-black/20 px-5 py-3 text-sm font-mono font-bold text-white backdrop-blur-md transition-all hover:bg-black/35 hover:scale-105 active:scale-95 shadow-inner"
                  title="Click to copy coupon code"
                >
                  <span className="tracking-widest text-base">WELCOME10</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-white/15 text-white transition-colors group-hover:bg-white group-hover:text-primary">
                    {copied ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </div>
                </button>

                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-950 shadow-xl transition-all duration-300 hover:bg-pink-50 hover:shadow-2xl hover:scale-105 active:scale-95"
                >
                  <span>Claim & Register</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
