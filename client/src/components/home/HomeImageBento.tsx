import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import image360Camera from "../../assets/10001.jpg";
import imageCompactDrone from "../../assets/10002.webp";
import imageWirelessAudio from "../../assets/10003.webp";
import imageMobileGimbal from "../../assets/10004.webp";
import imageCameraDrones from "../../assets/10005.webp";
import { cn } from "../../lib/utils";

/**
 * OPTIMAL IMAGE DIMENSIONS (Retina 2x resolution):
 * 
 * To ensure your images look sharp and fit perfectly without awkward cropping,
 * export them at the following dimensions:
 * 
 * - Hero Item (Item 1): 1610px × 600px (approx 8:3 ratio)
 * - Standard Items (Items 2-5): 790px × 600px (approx 4:3 ratio)
 */

interface BentoItem {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  href: string;
  position: string;
  layout: string;
}

const SHOWCASE_IMAGES: BentoItem[] = [
  {
    src: image360Camera,
    alt: "Compact 360-degree action cameras",
    eyebrow: "Immersive capture",
    title: "Every angle. One frame.",
    href: "/shop?search=360%20camera",
    position: "object-center",
    // 8 columns wide on desktop, 1 row tall
    layout: "md:col-span-2 lg:col-span-8 lg:row-span-1",
  },
  {
    src: imageCompactDrone,
    alt: "Compact camera drone on a sculpted white surface",
    eyebrow: "Next-gen flight",
    title: "Made to explore",
    href: "/shop?search=drone",
    position: "object-center",
    // 4 columns wide on desktop, 1 row tall
    layout: "md:col-span-1 lg:col-span-4 lg:row-span-1",
  },
  {
    src: imageWirelessAudio,
    alt: "Wireless microphone system floating above its charging case",
    eyebrow: "Wireless audio",
    title: "Sound without limits",
    href: "/shop?search=wireless%20microphone",
    position: "object-center",
    layout: "md:col-span-1 lg:col-span-4 lg:row-span-1",
  },
  {
    src: imageMobileGimbal,
    alt: "Smartphone filming gimbals arranged on a light studio background",
    eyebrow: "Mobile filmmaking",
    title: "Create in motion",
    href: "/shop?search=gimbal",
    position: "object-center",
    layout: "md:col-span-1 lg:col-span-4 lg:row-span-1",
  },
  {
    src: imageCameraDrones,
    alt: "Two folded camera drones displayed on geometric platforms",
    eyebrow: "Aerial imaging",
    title: "Ready for the sky",
    href: "/shop?search=camera%20drone",
    position: "object-[center_62%]",
    layout: "md:col-span-2 lg:col-span-4 lg:row-span-1",
  },
];

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
};

const imageVariants: Variants = {
  hover: {
    scale: 1.05,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

function BentoCard({ item, reduceMotion }: { item: BentoItem; reduceMotion: boolean }) {
  return (
    <motion.article
      variants={reduceMotion ? undefined : tileVariants}
      whileHover={reduceMotion ? undefined : "hover"}
      className={cn(
        "group relative flex min-h-[280px] lg:min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-lg transition-colors duration-300 hover:border-white/20",
        item.layout
      )}
    >
      <Link
        to={item.href}
        aria-label={`${item.title} — browse ${item.eyebrow.toLowerCase()}`}
        className="relative flex h-full w-full flex-col justify-end overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Background Image */}
        <motion.img
          src={item.src}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          variants={reduceMotion ? undefined : imageVariants}
          className={cn(
            "absolute inset-0 h-full w-full object-cover will-change-transform",
            item.position
          )}
        />

        {/* Smooth Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-95" />

        {/* Content */}
        <div className="relative z-10 flex items-end justify-between gap-4 p-6 lg:p-8">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/90 transition-colors duration-300 group-hover:text-primary">
              {item.eyebrow}
            </span>
            <h3 className="font-['Outfit'] text-2xl font-bold leading-tight text-zinc-100 transition-colors duration-300 group-hover:text-white lg:text-3xl">
              {item.title}
            </h3>
          </div>

          {/* Clean Arrow Button */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:shadow-[0_0_15px_rgba(216,45,83,0.4)]">
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export function HomeImageBento() {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <section
      className="relative flex w-full flex-col items-center bg-background px-4 py-12 lg:h-[90vh] lg:min-h-[700px] lg:max-h-[950px] lg:justify-center lg:px-8"
      aria-labelledby="image-bento-heading"
    >
      {/* Background Subtle Glows */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-[300px] w-[400px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="flex h-full w-full max-w-7xl flex-col mx-auto">
        {/* Header Section */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
          className="mb-8 flex shrink-0 flex-col items-start gap-3 lg:mb-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Designed for creators</span>
          </div>

          <h2
            id="image-bento-heading"
            className="font-['Outfit'] text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl"
          >
            Technology made to <span className="text-primary">move with you.</span>
          </h2>
        </motion.div>

        {/* 
          Grid Section: 
          - On mobile: standard stacked cards.
          - On desktop: takes up remaining flexible height (flex-1) with 2 rows.
        */}
        <motion.div
          variants={reduceMotion ? undefined : gridVariants}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.1 }}
          className="grid flex-1 min-h-0 w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2"
        >
          {SHOWCASE_IMAGES.map((item) => (
            <BentoCard key={item.src} item={item} reduceMotion={reduceMotion} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}