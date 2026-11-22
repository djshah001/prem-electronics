import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";

export interface BrandInfo {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  /** Official logo stored in public/brands/{id}.svg (or .png/.webp) */
  logoSrc: string;
  /** Optional light-colored official logo for dark mode (e.g., white wordmark) */
  darkLogoSrc?: string;
  /** Set true for pure-black monochrome wordmarks so they invert cleanly in dark mode */
  invertInDark?: boolean;
  /** Optional optical height override for tall/compact marks */
  logoClassName?: string;
}

export const BRANDS: BrandInfo[] = [
  {
    id: "canon",
    name: "Canon",
    tagline: "Cameras & RF/EF Lenses",
    accentColor: "#BC0024",
    logoSrc: "/brands/canon.svg",
  },
  {
    id: "sony",
    name: "Sony",
    tagline: "Alpha Mirrorless & Cinema",
    accentColor: "#38BDF8",
    logoSrc: "/brands/sony.svg",
    invertInDark: true,
  },
  {
    id: "nikon",
    name: "Nikon",
    tagline: "Z-Mount & DSLR Systems",
    accentColor: "#FACC15",
    logoSrc: "/brands/nikon.svg",
    invertInDark: true,
  },
  {
    id: "dji",
    name: "DJI",
    tagline: "Drones, Gimbals & Action Cameras",
    accentColor: "#000000",
    logoSrc: "/brands/dji.svg",
    invertInDark: true,
    logoClassName: "max-h-5 sm:max-h-6",
  },
  {
    id: "fujifilm",
    name: "Fujifilm",
    tagline: "Value from Innovation",
    accentColor: "#009E60",
    logoSrc: "/brands/fujifilm.svg",
  },
  {
    id: "panasonic",
    name: "Panasonic",
    tagline: "Lumix Mirrorless & Pro Video",
    accentColor: "#0066CC",
    logoSrc: "/brands/panasonic.svg",
  },
  {
    id: "sigma",
    name: "Sigma",
    tagline: "Art, Contemporary & Sports Lenses",
    accentColor: "#D82D53",
    logoSrc: "/brands/sigma.svg",
    invertInDark: true,
  },
  {
    id: "zeiss",
    name: "Zeiss",
    tagline: "Precision Cine & Still Optics",
    accentColor: "#003B91",
    logoSrc: "/brands/zeiss.svg",
    logoClassName: "max-h-5 sm:max-h-6",
  },
  {
    id: "tamron",
    name: "Tamron",
    tagline: "High-Performance Zoom Lenses",
    accentColor: "#C8A96E",
    logoSrc: "/brands/tamron.svg",
    invertInDark: true,
  },
  {
    id: "profoto",
    name: "Profoto",
    tagline: "The light shaping company",
    accentColor: "#E11D48",
    logoSrc: "/brands/profoto.svg",
    invertInDark: true,
  },
  {
    id: "godox",
    name: "Godox",
    tagline: "Studio Strobes & LED Systems",
    accentColor: "#F97316",
    logoSrc: "/brands/godox.svg",
  },
  {
    id: "aputure",
    name: "Aputure",
    tagline: "Cinema LED Lighting",
    accentColor: "#D82D53",
    logoSrc: "/brands/aputure.svg",
  },
  {
    id: "elinchrom",
    name: "Elinchrom",
    tagline: "Photo Lighting Solutions",
    accentColor: "#E11D48",
    logoSrc: "/brands/elinchrom.svg",
  },
  {
    id: "nisi",
    name: "NiSi",
    tagline: "Cinema & Landscape ND Filters",
    accentColor: "#F59E0B",
    logoSrc: "/brands/nisi.svg",
  },
  {
    id: "hoya",
    name: "HOYA",
    tagline: "Multi-Coated Optical Filters",
    accentColor: "#0EA5E9",
    logoSrc: "/brands/hoya.svg",
  },
  {
    id: "manfrotto",
    name: "Manfrotto",
    tagline: "Imagine More",
    accentColor: "#E2001A",
    logoSrc: "/brands/manfrotto.svg",
  },
  {
    id: "zhiyun",
    name: "Zhiyun",
    tagline: "3-Axis Gimbals & Pocket Lights",
    accentColor: "#EF4444",
    logoSrc: "/brands/zhiyun.svg",
    logoClassName: "max-h-5 sm:max-h-6",
  },
  {
    id: "gopro",
    name: "GoPro",
    tagline: "Action Cameras & Mounts",
    accentColor: "#00A2E8",
    logoSrc: "/brands/gopro.svg",
    invertInDark: true,
  },
  {
    id: "sandisk",
    name: "SanDisk",
    tagline: "Extreme PRO Memory & SSDs",
    accentColor: "#E2001A",
    logoSrc: "/brands/sandisk.svg",
  },
  {
    id: "toshiba",
    name: "Toshiba",
    tagline: "Leading Innovation >>>",
    accentColor: "#E60012",
    logoSrc: "/brands/toshiba.svg",
  },
  {
    id: "lowepro",
    name: "Lowepro",
    tagline: "Pro Camera Backpacks & Cases",
    accentColor: "#FF6600",
    logoSrc: "/brands/lowepro.svg",
  },
  {
    id: "magmod",
    name: "MagMod",
    tagline: "Magnetic Flash Modifiers",
    accentColor: "#F97316",
    logoSrc: "/brands/magmod.svg",
  },
  {
    id: "tokina",
    name: "Tokina",
    tagline: "Cinema & Wide-Angle Lenses",
    accentColor: "#2563EB",
    logoSrc: "/brands/tokina.svg",
    invertInDark: true,
  },
  {
    id: "samyang",
    name: "Samyang",
    tagline: "AF & V-AF Cine Prime Lenses",
    accentColor: "#E2001A",
    logoSrc: "/brands/samyang.svg",
  },
  {
    id: "vanguard",
    name: "Vanguard",
    tagline: "Carbon Tripods & Optics",
    accentColor: "#DC2626",
    logoSrc: "/brands/vanguard.svg",
  },
];

interface BrandLogoItemProps {
  brand: BrandInfo;
  isDuplicate?: boolean;
}

const BrandLogoItem = memo(function BrandLogoItem({
  brand,
  isDuplicate = false,
}: BrandLogoItemProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [imgError, setImgError] = useState(false);

  const imgClasses = cn(
    "h-auto max-h-6 sm:max-h-7 w-auto max-w-[110px] sm:max-w-[130px] object-contain select-none transition-all duration-300",
    brand.logoClassName,
    brand.invertInDark && !brand.darkLogoSrc && "dark:invert",
  );

  return (
    <div className="flex items-center shrink-0">
      <motion.div
        whileHover={reduceMotion ? undefined : { scale: 1.08, y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        transition={{ type: "spring", stiffness: 450, damping: 24 }}
      >
        <Link
          to={`/shop?brand=${encodeURIComponent(brand.name)}`}
          title={`${brand.name} — ${brand.tagline}`}
          tabIndex={isDuplicate ? -1 : 0}
          aria-hidden={isDuplicate}
          className={cn(
            "group relative flex h-16 sm:h-20 items-center justify-center px-6 sm:px-8 rounded-2xl transition-all duration-300",
            "grayscale opacity-75 hover:grayscale-0 hover:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          {/* Radial Brand-Colored Aura Glow on Hover */}
          <span
            style={{
              background: `radial-gradient(circle, ${brand.accentColor}28 0%, transparent 72%)`,
            }}
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 scale-75 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
            aria-hidden="true"
          />

          {/* Official Brand Logo */}
          <div className="relative z-10 flex h-7 sm:h-8 w-28 sm:w-36 items-center justify-center transition-transform duration-300">
            {imgError ? (
              <span className="text-sm sm:text-base font-extrabold tracking-wider uppercase text-foreground/80">
                {brand.name}
              </span>
            ) : brand.darkLogoSrc ? (
              <>
                <img
                  src={brand.logoSrc}
                  alt={brand.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={() => setImgError(true)}
                  className={cn(imgClasses, "block dark:hidden")}
                />
                <img
                  src={brand.darkLogoSrc}
                  alt={brand.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={() => setImgError(true)}
                  className={cn(imgClasses, "hidden dark:block")}
                />
              </>
            ) : (
              <img
                src={brand.logoSrc}
                alt={brand.name}
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={() => setImgError(true)}
                className={imgClasses}
              />
            )}
          </div>

          {/* Floating Tagline Pill on Hover */}
          <span className="pointer-events-none absolute -bottom-2.5 left-1/2 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 whitespace-nowrap rounded-full bg-popover/95 border border-border/80 px-2.5 py-0.5 text-[10px] font-semibold text-foreground shadow-md backdrop-blur-md z-20">
            {brand.tagline}
          </span>
        </Link>
      </motion.div>

      {/* Subtle Editorial Hairline Divider */}
      <span
        className="h-6 w-px bg-gradient-to-b from-transparent via-border/80 to-transparent shrink-0"
        aria-hidden="true"
      />
    </div>
  );
});

export function BrandLogoMarquee() {
  const reduceMotion = Boolean(useReducedMotion());
  const half = Math.ceil(BRANDS.length / 2);
  const rowOne = BRANDS.slice(0, half);
  const rowTwo = BRANDS.slice(half);

  return (
    <section
      aria-label="Authorized Brand Partners"
      className="relative w-full border-y border-border/60 bg-gradient-to-b from-background via-card/40 to-background py-12 sm:py-16 overflow-hidden"
    >
      {/* Inline Keyframes for Silky-Smooth 60fps Infinite Scroll */}
      <style>{`
        @keyframes prem-marquee-left {
          0% { transform: translate3d(0%, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes prem-marquee-right {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0%, 0, 0); }
        }
        .animate-prem-marquee-left {
          animation: prem-marquee-left 42s linear infinite;
        }
        .animate-prem-marquee-right {
          animation: prem-marquee-right 46s linear infinite;
        }
        .marquee-row-wrapper:hover .animate-prem-marquee-left,
        .marquee-row-wrapper:hover .animate-prem-marquee-right {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-prem-marquee-left,
          .animate-prem-marquee-right {
            animation: none;
          }
        }
      `}</style>

      {/* Subtle Ambient Spotlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-48 w-[42rem] max-w-full rounded-full bg-primary/8 blur-[90px]"
        aria-hidden="true"
      />

      {/* Section Header */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center mb-9 sm:mb-11"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary mb-3 shadow-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>100% Genuine &amp; Warranty-Backed</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-['Outfit'] tracking-tight text-foreground">
          Authorized Brand Partners
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Explore official cameras, cinema optics, studio lighting, and pro
          accessories from the world&apos;s leading imaging brands.
        </p>
      </motion.div>

      {/* Dual-Row Glassmorphic Showcase Ribbon */}
      <div className="relative w-full space-y-2 sm:space-y-3 [mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]">
        {/* Row 1: Leftward Glide */}
        <div className="marquee-row-wrapper relative w-full overflow-x-clip py-3">
          <div className="flex w-max animate-prem-marquee-left items-center will-change-transform">
            <div className="flex shrink-0 items-center">
              {rowOne.map((brand) => (
                <BrandLogoItem key={`r1-a-${brand.id}`} brand={brand} />
              ))}
            </div>
            <div className="flex shrink-0 items-center" aria-hidden="true">
              {rowOne.map((brand) => (
                <BrandLogoItem
                  key={`r1-b-${brand.id}`}
                  brand={brand}
                  isDuplicate
                />
              ))}
            </div>
          </div>
        </div>

        {/* Subtle Center Hairline Separator */}
        <div
          className="mx-auto max-w-5xl h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"
          aria-hidden="true"
        />

        {/* Row 2: Rightward Counter-Glide */}
        <div className="marquee-row-wrapper relative w-full overflow-x-clip py-3">
          <div className="flex w-max animate-prem-marquee-right items-center will-change-transform">
            <div className="flex shrink-0 items-center">
              {rowTwo.map((brand) => (
                <BrandLogoItem key={`r2-a-${brand.id}`} brand={brand} />
              ))}
            </div>
            <div className="flex shrink-0 items-center" aria-hidden="true">
              {rowTwo.map((brand) => (
                <BrandLogoItem
                  key={`r2-b-${brand.id}`}
                  brand={brand}
                  isDuplicate
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
