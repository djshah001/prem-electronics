import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import image360Camera from "../../assets/10001.jpg";
import imageCompactDrone from "../../assets/10002.webp";
import imageWirelessAudio from "../../assets/10003.webp";
import imageMobileGimbal from "../../assets/10004.webp";
import imageCameraDrones from "../../assets/10005.webp";
import { cn } from "../../lib/utils";

interface BentoItem {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  href: string;
  position: string;
  layout: string;
  heightClass?: string;
}

const SHOWCASE_IMAGES: BentoItem[] = [
  {
    src: image360Camera,
    alt: "Two compact 360-degree action cameras illuminated against a dark background",
    eyebrow: "Immersive capture",
    title: "Every angle. One frame.",
    href: "/shop?search=360%20camera",
    position: "object-center",
    layout: "sm:col-span-2 sm:row-span-2 lg:col-span-7 lg:row-span-2",
  },
  {
    src: imageCompactDrone,
    alt: "Compact camera drone on a sculpted white surface",
    eyebrow: "Next-gen flight",
    title: "Made to explore",
    href: "/shop?search=drone",
    position: "object-center",
    layout: "sm:col-span-1 lg:col-span-5",
  },
  {
    src: imageWirelessAudio,
    alt: "Wireless microphone system floating above its charging case",
    eyebrow: "Wireless audio",
    title: "Sound without limits",
    href: "/shop?search=wireless%20microphone",
    position: "object-center",
    layout: "sm:col-span-1 lg:col-span-5",
  },
  {
    src: imageMobileGimbal,
    alt: "Smartphone filming gimbals arranged on a light studio background",
    eyebrow: "Mobile filmmaking",
    title: "Create in motion",
    href: "/shop?search=gimbal",
    position: "object-center",
    layout: "sm:col-span-1 lg:col-span-6",
  },
  {
    src: imageCameraDrones,
    alt: "Two folded camera drones displayed on geometric platforms",
    eyebrow: "Aerial imaging",
    title: "Ready for the sky",
    href: "/shop?search=camera%20drone",
    position: "object-[center_62%]",
    layout: "sm:col-span-1 lg:col-span-6",
  },
];

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 35, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 240,
      damping: 24,
    },
  },
};

const imageVariants: Variants = {
  hover: {
    scale: 1.06,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

// Controls the bottom dock entrance and exit on hover
const dockVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 0,
    y: 28,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  hover: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 24,
    },
  },
};

function BentoCard({
  item,
  index,
  reduceMotion,
}: {
  item: BentoItem;
  index: number;
  reduceMotion: boolean;
}) {
  const isHero = index === 0;

  return (
    <motion.article
      data-bento-tile={index}
      variants={reduceMotion ? undefined : tileVariants}
      whileHover={reduceMotion ? undefined : "hover"}
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-[2rem] border border-border/60 bg-zinc-950 shadow-xl transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10",
        item.layout,
      )}
    >
      <Link
        to={item.href}
        aria-label={`${item.title} — browse ${item.eyebrow.toLowerCase()}`}
        className="relative block h-full w-full overflow-hidden rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {/* Background Product Image */}
        <motion.img
          src={item.src}
          alt={item.alt}
          loading={isHero ? "eager" : "lazy"}
          fetchPriority={isHero ? "high" : "auto"}
          decoding="async"
          variants={reduceMotion ? undefined : imageVariants}
          className={cn(
            "absolute inset-0 h-full w-full object-cover will-change-transform",
            item.position,
          )}
        />

        {/* Ambient Overlay: Soft when idle, deepens on hover for crisp text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 opacity-20 transition-opacity duration-500 ease-out group-hover:opacity-95" />

        {/* Animated Sweeping Light Sheen on Hover */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />

        {/* Top Glass Shimmer Line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-primary/50 transition-colors duration-500" />

        {/* ─── Floating Frosted Glass Bottom Dock (Revealed on Hover) ─── */}
        <motion.div
          variants={reduceMotion ? undefined : dockVariants}
          className="absolute inset-x-0 bottom-0 p-3 sm:p-4 lg:p-5 pointer-events-none group-hover:pointer-events-auto"
        >
          <div className="relative flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-xl shadow-2xl transition-all duration-500 group-hover:border-primary/40 group-hover:bg-slate-950/70 sm:p-5">
            <div className="min-w-0 flex-1">
              {/* Eyebrow with Pulsing Brand Dot */}
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 backdrop-blur-md transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-primary/10">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80 group-hover:text-white sm:text-[11px]">
                  {item.eyebrow}
                </span>
              </div>

              {/* Title */}
              <h3
                className={cn(
                  "font-['Outfit'] font-black leading-tight tracking-tight text-white transition-colors duration-300 group-hover:text-pink-50",
                  isHero
                    ? "text-2xl sm:text-3xl lg:text-4xl xl:text-5xl"
                    : "text-lg sm:text-xl lg:text-2xl",
                )}
              >
                {item.title}
              </h3>
            </div>

            {/* Action Arrow Icon Button */}
            <motion.span
              variants={
                reduceMotion
                  ? undefined
                  : { hover: { x: 3, y: -3, scale: 1.05 } }
              }
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md shadow-md transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_0_20px_rgba(216,45,83,0.5)]"
              aria-hidden="true"
            >
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
            </motion.span>
          </div>
        </motion.div>
      </Link>
    </motion.article>
  );
}

export function HomeImageBento() {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <section
      className="relative w-full overflow-hidden bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby="image-bento-heading"
    >
      {/* Background Pink Ambient Atmosphere */}
      <div className="pointer-events-none absolute left-1/3 top-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/10 blur-[150px] rounded-full" />
      <div className="pointer-events-none absolute right-10 bottom-12 w-[550px] h-[350px] bg-primary/5 blur-[130px] rounded-full" />

      {/* Full-width container */}
      <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-12">
        {/* Header */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.65, ease: [0.16, 1, 0.3, 1] }
          }
          className="mb-8 flex w-full flex-col items-start gap-3 lg:mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-primary backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Designed for creators</span>
          </div>

          <h2
            id="image-bento-heading"
            className="max-w-4xl font-['Outfit'] text-3xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Technology made to{" "}
            <span className="gradient-text">move with you.</span>
          </h2>
        </motion.div>

        {/* Responsive Bento Grid */}
        <motion.div
          data-home-bento="image-grid"
          variants={reduceMotion ? undefined : gridVariants}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.08 }}
          className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-12 lg:gap-5 auto-rows-[310px] sm:auto-rows-[330px] lg:auto-rows-[360px]"
        >
          {SHOWCASE_IMAGES.map((item, index) => (
            <BentoCard
              key={item.src}
              item={item}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
