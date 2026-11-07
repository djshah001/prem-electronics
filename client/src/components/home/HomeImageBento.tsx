import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import image360Camera from "../../assets/10001.jpg";
import imageCompactDrone from "../../assets/10002.webp";
import imageWirelessAudio from "../../assets/10003.webp";
import imageMobileGimbal from "../../assets/10004.webp";
import imageCameraDrones from "../../assets/10005.webp";
import { cn } from "../../lib/utils";

interface BentoItem {
  id: string;
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  specs?: string[];
  href: string;
  position: string;
  layout: string;
  isHero?: boolean;
}

/**
 * ============================================================================
 * DESIGN TEAM GUIDE: RECOMMENDED BENTO GRID IMAGE DIMENSIONS & ASSET SPECS
 * ============================================================================
 * The "Creator Ecosystem" Bento Grid uses a 12-column responsive layout.
 * Images are styled with `object-cover` to fill their dynamic card bounds.
 *
 * GENERAL RECOMMENDATIONS:
 * - File Format: Optimized WebP or JPG (compressed with 80-85% quality, < 250 KB)
 * - Color Profile: sRGB
 * - DPI: 72 DPI (Standard Web)
 * - Safe Area: Keep primary product subjects centered or vertically biased
 *   towards the top/center to ensure visibility behind bottom text overlays.
 *
 * ITEM BREAKDOWN & DIMENSIONS:
 * 1. 360-camera (Hero Card - lg:col-span-8):
 *    - Recommended Dimensions: 1200 x 800 px (Min: 960 x 640 px)
 *    - Aspect Ratio: ~3:2 Landscape (Wide Hero)
 *
 * 2. compact-drone (Standard Card - lg:col-span-4):
 *    - Recommended Dimensions: 600 x 800 px (Min: 480 x 640 px)
 *    - Aspect Ratio: ~3:4 Portrait / Vertical
 *
 * 3. wireless-audio (Standard Card - lg:col-span-4):
 *    - Recommended Dimensions: 600 x 800 px (Min: 480 x 640 px)
 *    - Aspect Ratio: ~3:4 Portrait / Vertical
 *
 * 4. mobile-gimbal (Standard Card - lg:col-span-4):
 *    - Recommended Dimensions: 600 x 800 px (Min: 480 x 640 px)
 *    - Aspect Ratio: ~3:4 Portrait / Vertical
 *
 * 5. camera-drones (Standard Card - lg:col-span-4):
 *    - Recommended Dimensions: 600 x 800 px (Min: 480 x 640 px)
 *    - Aspect Ratio: ~3:4 Portrait / Vertical
 * ============================================================================
 */
const SHOWCASE_IMAGES: BentoItem[] = [
  {
    id: "360-camera",
    src: image360Camera,
    // [RECOMMENDED IMAGE DIMENSIONS]: 1200 x 800 px | Aspect Ratio: 3:2 Landscape (Hero Item, spans 8 cols on desktop)
    alt: "Compact 360-degree action cameras",
    eyebrow: "Immersive capture",
    badge: "Flagship Gear",
    title: "Every angle. One frame.",
    description:
      "Spherical 8K video recording with automatic horizon lock and invisible stitching.",
    specs: [
      "Dual 1-Inch Sensors",
      "FlowState Stabilization",
      "AI Subject Lock",
    ],
    href: "/shop?search=360%20camera",
    position: "object-center",
    layout: "md:col-span-2 lg:col-span-8 lg:row-span-1",
    isHero: true,
  },
  {
    id: "compact-drone",
    src: imageCompactDrone,
    // [RECOMMENDED IMAGE DIMENSIONS]: 600 x 800 px | Aspect Ratio: 3:4 Portrait (Spans 4 cols on desktop)
    alt: "Compact camera drone on a sculpted white surface",
    eyebrow: "Next-gen flight",
    badge: "Sub-249g",
    title: "Made to explore",
    description:
      "Omnidirectional obstacle sensing with crystal-clear 4K HDR dynamic range.",
    specs: ["4K/60fps HDR", "34-min Flight"],
    href: "/shop?search=drone",
    position: "object-center",
    layout: "md:col-span-1 lg:col-span-4 lg:row-span-1",
  },
  {
    id: "wireless-audio",
    src: imageWirelessAudio,
    // [RECOMMENDED IMAGE DIMENSIONS]: 600 x 800 px | Aspect Ratio: 3:4 Portrait (Spans 4 cols on desktop)
    alt: "Wireless microphone system floating above its charging case",
    eyebrow: "Wireless audio",
    badge: "Studio Grade",
    title: "Sound without limits",
    description:
      "32-bit float internal recording with zero clipping and high-gain transmission.",
    specs: ["32-bit Float", "250m Range"],
    href: "/shop?search=wireless%20microphone",
    position: "object-center",
    layout: "md:col-span-1 lg:col-span-4 lg:row-span-1",
  },
  {
    id: "mobile-gimbal",
    src: imageMobileGimbal,
    // [RECOMMENDED IMAGE DIMENSIONS]: 600 x 800 px | Aspect Ratio: 3:4 Portrait (Spans 4 cols on desktop)
    alt: "Smartphone filming gimbals arranged on a light studio background",
    eyebrow: "Mobile filmmaking",
    badge: "Stabilization",
    title: "Create in motion",
    description:
      "Magnetic quick-release system paired with 7th-generation 3-axis tracking.",
    specs: ["ActiveTrack 6.0", "Built-in Extension"],
    href: "/shop?search=gimbal",
    position: "object-center",
    layout: "md:col-span-1 lg:col-span-4 lg:row-span-1",
  },
  {
    id: "camera-drones",
    src: imageCameraDrones,
    // [RECOMMENDED IMAGE DIMENSIONS]: 600 x 800 px | Aspect Ratio: 3:4 Portrait (Spans 4 cols on desktop)
    alt: "Two folded camera drones displayed on geometric platforms",
    eyebrow: "Aerial imaging",
    badge: "Pro Series",
    title: "Ready for the sky",
    description:
      "Multi-focal camera arrays featuring telephoto zoom and extended flight endurance.",
    specs: ["Triple-Lens Array", "46-min Flight"],
    href: "/shop?search=camera%20drone",
    position: "object-[center_62%]",
    layout: "md:col-span-2 lg:col-span-4 lg:row-span-1",
  },
];

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

const imageVariants: Variants = {
  hover: {
    scale: 1.06,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

function BentoCard({
  item,
  reduceMotion,
}: {
  item: BentoItem;
  reduceMotion: boolean;
}) {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  function handleMouseLeave() {
    mouseX.set(-1000);
    mouseY.set(-1000);
  }

  const spotlightBackground = useMotionTemplate`radial-gradient(650px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.12), transparent 80%)`;
  const borderHighlight = useMotionTemplate`radial-gradient(450px circle at ${mouseX}px ${mouseY}px, rgba(216, 45, 83, 0.5), transparent 75%)`;

  return (
    <motion.article
      variants={reduceMotion ? undefined : tileVariants}
      whileHover={reduceMotion ? undefined : "hover"}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative flex h-full min-h-[300px] w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-950 transition-colors duration-500 hover:border-white/25 lg:min-h-0",
        item.layout,
      )}
    >
      {!reduceMotion && (
        <>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: spotlightBackground }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-2xl sm:rounded-3xl border border-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ borderColor: borderHighlight }}
          />
        </>
      )}

      <Link
        to={item.href}
        aria-label={`${item.title} — browse ${item.eyebrow.toLowerCase()}`}
        className="relative flex h-full w-full flex-col justify-between overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            item.position,
          )}
        />

        {/* Ambient Top Vignette */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none" />

        {/* Main High-Legibility Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-85 transition-opacity duration-500 group-hover:opacity-95" />

        {/* Brand Accent Hover Glow */}
        <div className="pointer-events-none absolute inset-0 bg-primary/10 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100" />

        {/* Top Badges Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 p-5 sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-200 backdrop-blur-md transition-colors duration-300 group-hover:border-primary/50 group-hover:text-white">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>{item.eyebrow}</span>
          </div>

          {item.badge && (
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium tracking-wider uppercase text-zinc-300 backdrop-blur-md">
              {item.badge}
            </span>
          )}
        </div>

        {/* Bottom Content Area */}
        <div className="relative z-10 flex flex-col gap-3.5 p-5 sm:p-7 lg:p-8">
          <div className="flex items-end justify-between gap-4">
            <div className="flex max-w-2xl flex-col gap-1.5">
              <h3
                className={cn(
                  "font-['Outfit'] font-extrabold leading-tight tracking-tight text-zinc-100 transition-colors duration-300 group-hover:text-white",
                  item.isHero
                    ? "text-2xl sm:text-4xl lg:text-5xl"
                    : "text-xl sm:text-2xl lg:text-3xl",
                )}
              >
                {item.title}
              </h3>

              <p className="line-clamp-2 text-xs sm:text-base leading-relaxed text-zinc-300/85">
                {item.description}
              </p>
            </div>

            {/* Prominent Action Button */}
            {item.isHero ? (
              <div className="hidden sm:inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:shadow-[0_0_25px_rgba(216,45,83,0.5)]">
                <span>Explore Gear</span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            ) : (
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-300 group-hover:scale-105 group-hover:border-primary group-hover:bg-primary group-hover:shadow-[0_0_25px_rgba(216,45,83,0.5)]">
                <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            )}
          </div>

          {/* Quick Technical Specs */}
          {item.specs && item.specs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {item.specs.map((spec) => (
                <span
                  key={spec}
                  className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-xs font-medium tracking-wide text-zinc-300 backdrop-blur-sm"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.article>
  );
}

export function HomeImageBento() {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <section
      className="relative flex h-screen max-h-screen w-full flex-col justify-between overflow-hidden bg-background p-2.5 sm:p-4 lg:p-5"
      aria-labelledby="image-bento-heading"
    >
      {/* Immersive Background Glows */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-[450px] w-[600px] rounded-full bg-primary/5 blur-[150px]" />

      {/* Main Full-Bleed Flex Wrapper */}
      <div className="flex h-full w-full flex-1 flex-col justify-between gap-3 min-h-0">
        {/* Low-Profile Header to Maximize Card Real Estate */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }
          }
          className="flex shrink-0 items-center justify-between gap-4 px-2 py-1"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Creator Ecosystem</span>
            </div>

            <h2
              id="image-bento-heading"
              className="font-['Outfit'] text-lg font-black tracking-tight text-foreground sm:text-2xl"
            >
              Technology made to{" "}
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                move with you.
              </span>
            </h2>
          </div>

          <Link
            to="/shop"
            className="group hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors duration-300 hover:text-foreground sm:inline-flex"
          >
            <span>Browse Full Catalog</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </motion.div>

        {/* 
          Full-Height Maximized Bento Grid
          ----------------------------------------------------------------------
          GRID LAYOUT & RECOMMENDED IMAGE SIZES FOR DESIGNERS:
          - Layout: 12-column dynamic grid (lg:grid-cols-12)
          - Card 1 (360-camera Hero): lg:col-span-8 -> Recommended: 1200 x 800 px (3:2 Landscape)
          - Card 2 (compact-drone):    lg:col-span-4 -> Recommended: 600 x 800 px (3:4 Portrait)
          - Card 3 (wireless-audio):   lg:col-span-4 -> Recommended: 600 x 800 px (3:4 Portrait)
          - Card 4 (mobile-gimbal):    lg:col-span-4 -> Recommended: 600 x 800 px (3:4 Portrait)
          - Card 5 (camera-drones):    lg:col-span-4 -> Recommended: 600 x 800 px (3:4 Portrait)
          All images use object-cover with safe centered/upper-third subject framing.
          ----------------------------------------------------------------------
        */}
        <motion.div
          variants={reduceMotion ? undefined : gridVariants}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true }}
          className="grid flex-1 min-h-0 w-full grid-cols-1 gap-2.5 sm:gap-3.5 lg:grid-cols-12 lg:grid-rows-1"
        >
          {SHOWCASE_IMAGES.map((item) => (
            <BentoCard key={item.id} item={item} reduceMotion={reduceMotion} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
