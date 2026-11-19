import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";

export interface BrandInfo {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  svg: React.ReactNode;
}

export const BRANDS: BrandInfo[] = [
  {
    id: "canon",
    name: "Canon",
    tagline: "Cameras & RF/EF Lenses",
    accentColor: "#BC0024",
    svg: (
      <svg
        viewBox="0 0 118 28"
        className="h-6 sm:h-7 w-auto"
        aria-label="Canon"
      >
        <g fill="#BC0024">
          <path d="M22.8 5.6c-2.4-2.5-5.8-3.9-9.8-3.9C5.4 1.7.3 7.3.3 14.3c0 7.2 5.4 12.9 13.1 12.9 4.1 0 7.6-1.5 10.1-4.2l-3.3-3.1c-1.8 1.9-4.1 2.9-6.7 2.9-4.8 0-8.2-3.6-8.2-8.5s3.4-8.5 8.2-8.5c2.4 0 4.6 1 6.3 2.7l3-3z" />
          <path d="M37.8 7.8c-2.6 0-4.6 1.1-5.7 2.9V8.2h-4.3v18.5h4.5v-9.7c0-3.2 2-5 4.6-5 2.5 0 4.1 1.6 4.1 4.7v10h4.5v-10.7c0-5-3-8.2-7.7-8.2z" />
          <path d="M60.6 8.2h-4.4v2.4c-1.1-1.7-3.1-2.8-5.6-2.8-4.8 0-8.4 3.7-8.4 9.6 0 5.8 3.6 9.6 8.4 9.6 2.5 0 4.5-1.1 5.6-2.8v2.4h4.4V8.2zm-4.4 9.2c0 3.3-2.1 5.5-4.8 5.5-2.8 0-4.8-2.2-4.8-5.5s2-5.5 4.8-5.5c2.7 0 4.8 2.2 4.8 5.5z" />
          <path d="M78.6 7.8c-5.4 0-9.4 4.1-9.4 9.6 0 5.6 4 9.6 9.4 9.6 5.4 0 9.4-4.1 9.4-9.6 0-5.6-4-9.6-9.4-9.6zm0 15.1c-3 0-5-2.3-5-5.5 0-3.3 2-5.5 5-5.5 3 0 5 2.2 5 5.5 0 3.2-2 5.5-5 5.5z" />
          <path d="M100.8 7.8c-2.6 0-4.6 1.1-5.7 2.9V8.2h-4.3v18.5h4.5v-9.7c0-3.2 2-5 4.6-5 2.5 0 4.1 1.6 4.1 4.7v10h4.5v-10.7c0-5-3-8.2-7.7-8.2z" />
        </g>
      </svg>
    ),
  },
  {
    id: "sony",
    name: "Sony",
    tagline: "Alpha Mirrorless & Cinema",
    accentColor: "#38BDF8",
    svg: (
      <svg
        viewBox="0 0 112 24"
        className="h-5 sm:h-6 w-auto fill-current"
        aria-label="SONY"
      >
        <text
          x="2"
          y="20"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="3.5px"
        >
          SONY
        </text>
      </svg>
    ),
  },
  {
    id: "nikon",
    name: "Nikon",
    tagline: "Z-Mount & DSLR Systems",
    accentColor: "#FACC15",
    svg: (
      <svg
        viewBox="0 0 114 28"
        className="h-6 sm:h-7 w-auto"
        aria-label="Nikon"
      >
        <rect x="0" y="1" width="114" height="26" rx="4" fill="#FFE600" />
        <g transform="skewX(-11) translate(10, 4)" fill="#111111">
          <path d="M4 2h5.2l9.2 12V2H23v18h-5.2L8.6 8v12H4V2z" />
          <path d="M26.5 2h4.8v18h-4.8V2z" />
          <path d="M35 2h4.8v7.6l6-7.6h6l-7.4 8.7L52.5 20h-6.2l-6.5-7.9V20H35V2z" />
          <path d="M55 11c0-5.1 3.8-9.2 9.2-9.2S73.4 5.9 73.4 11s-3.8 9.2-9.2 9.2S55 16.1 55 11zm13.4 0c0-3-1.8-5.4-4.2-5.4s-4.2 2.4-4.2 5.4 1.8 5.4 4.2 5.4 4.2-2.4 4.2-5.4z" />
          <path d="M76 2h4.8l7 10.2V2h4.4v18h-4.6L80.8 9.2V20H76V2z" />
        </g>
      </svg>
    ),
  },
  {
    id: "fujifilm",
    name: "Fujifilm",
    tagline: "Value from Innovation",
    accentColor: "#009E60",
    svg: (
      <svg
        viewBox="0 0 142 32"
        className="h-7 sm:h-8 w-auto"
        aria-label="FUJIFILM - Value from Innovation"
      >
        <text
          x="0"
          y="18"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="19"
          letterSpacing="1.8px"
          fill="currentColor"
        >
          FUJIFILM
        </text>
        <rect x="66" y="3" width="4" height="4" fill="#E2001A" rx="0.8" />
        <text
          x="0"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontSize="8.5"
          letterSpacing="0.8px"
          fill="#009E60"
        >
          Value from Innovation
        </text>
      </svg>
    ),
  },
  {
    id: "panasonic",
    name: "Panasonic",
    tagline: "Lumix Mirrorless & Pro Video",
    accentColor: "#0066CC",
    svg: (
      <svg
        viewBox="0 0 140 26"
        className="h-5 sm:h-6 w-auto"
        aria-label="Panasonic"
      >
        <text
          x="0"
          y="20"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="21"
          letterSpacing="0.8px"
          fill="#0066CC"
        >
          Panasonic
        </text>
      </svg>
    ),
  },
  {
    id: "sigma",
    name: "Sigma",
    tagline: "Art, Contemporary & Sports Lenses",
    accentColor: "#D82D53",
    svg: (
      <svg
        viewBox="0 0 116 26"
        className="h-6 sm:h-7 w-auto fill-current"
        aria-label="SIGMA"
      >
        <path d="M4 4h14l-8 9 8 9H4l8-9-8-9z" fill="#D82D53" />
        <text
          x="25"
          y="20"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="20"
          letterSpacing="2.2px"
        >
          SIGMA
        </text>
      </svg>
    ),
  },
  {
    id: "zeiss",
    name: "Zeiss",
    tagline: "Precision Cine & Still Optics",
    accentColor: "#003B91",
    svg: (
      <svg
        viewBox="0 0 100 30"
        className="h-6 sm:h-7 w-auto"
        aria-label="ZEISS"
      >
        <rect x="0" y="2" width="26" height="26" rx="3" fill="#003B91" />
        <text
          x="13"
          y="20"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="12"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          Z
        </text>
        <text
          x="33"
          y="22"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="19"
          letterSpacing="2px"
          fill="currentColor"
        >
          ZEISS
        </text>
      </svg>
    ),
  },
  {
    id: "tamron",
    name: "Tamron",
    tagline: "High-Performance Zoom Lenses",
    accentColor: "#C8A96E",
    svg: (
      <svg
        viewBox="0 0 124 25"
        className="h-5 sm:h-6 w-auto fill-current"
        aria-label="TAMRON"
      >
        <text
          x="0"
          y="19"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="20"
          letterSpacing="2.5px"
        >
          TAMRON
        </text>
        <rect x="0" y="22.5" width="42" height="2" rx="1" fill="#C8A96E" />
      </svg>
    ),
  },
  {
    id: "profoto",
    name: "Profoto",
    tagline: "The light shaping company",
    accentColor: "#E11D48",
    svg: (
      <svg
        viewBox="0 0 148 32"
        className="h-7 sm:h-8 w-auto"
        aria-label="Profoto - The light shaping company"
      >
        <text
          x="0"
          y="18"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="19"
          letterSpacing="1.2px"
          fill="currentColor"
        >
          Profoto
        </text>
        <text
          x="0"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontSize="8.5"
          letterSpacing="0.8px"
          fill="#E11D48"
        >
          The light shaping company
        </text>
      </svg>
    ),
  },
  {
    id: "godox",
    name: "Godox",
    tagline: "Studio Strobes & LED Systems",
    accentColor: "#F97316",
    svg: (
      <svg
        viewBox="0 0 105 26"
        className="h-6 sm:h-7 w-auto fill-current"
        aria-label="Godox"
      >
        <text
          x="0"
          y="20"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="21"
          letterSpacing="1px"
        >
          G<tspan fill="#F97316">o</tspan>dox
        </text>
      </svg>
    ),
  },
  {
    id: "aputure",
    name: "Aputure",
    tagline: "Cinema LED Lighting",
    accentColor: "#D82D53",
    svg: (
      <svg
        viewBox="0 0 126 28"
        className="h-6 sm:h-7 w-auto fill-current"
        aria-label="Aputure"
      >
        <path d="M4 23L13 3l9 20h-4.6l-4.4-9.6L8.6 23H4z" fill="#D82D53" />
        <text
          x="27"
          y="20"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="18.5"
          letterSpacing="1px"
        >
          Aputure
        </text>
      </svg>
    ),
  },
  {
    id: "elinchrom",
    name: "Elinchrom",
    tagline: "Photo Lighting Solutions",
    accentColor: "#E11D48",
    svg: (
      <svg
        viewBox="0 0 148 32"
        className="h-7 sm:h-8 w-auto"
        aria-label="Elinchrom - Photo Lighting Solutions"
      >
        <text
          x="0"
          y="18"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="19"
          letterSpacing="0.8px"
          fill="currentColor"
        >
          elinchr<tspan fill="#E11D48">o</tspan>m
        </text>
        <text
          x="0"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontSize="8.5"
          letterSpacing="0.8px"
          fill="currentColor"
          className="opacity-70"
        >
          Photo Lighting Solutions
        </text>
      </svg>
    ),
  },
  {
    id: "nisi",
    name: "NiSi",
    tagline: "Cinema & Landscape ND Filters",
    accentColor: "#F59E0B",
    svg: (
      <svg viewBox="0 0 92 28" className="h-6 sm:h-7 w-auto" aria-label="NiSi">
        <rect
          x="2"
          y="4"
          width="20"
          height="20"
          rx="5"
          fill="#F59E0B"
          fillOpacity="0.2"
          stroke="#F59E0B"
          strokeWidth="2"
        />
        <circle cx="12" cy="14" r="4" fill="#F59E0B" />
        <text
          x="29"
          y="21"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="21"
          letterSpacing="1.5px"
          fill="currentColor"
        >
          NiSi
        </text>
      </svg>
    ),
  },
  {
    id: "hoya",
    name: "HOYA",
    tagline: "Multi-Coated Optical Filters",
    accentColor: "#0EA5E9",
    svg: (
      <svg viewBox="0 0 112 26" className="h-6 sm:h-7 w-auto" aria-label="HOYA">
        <circle
          cx="12"
          cy="13"
          r="9"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="2.4"
        />
        <circle cx="12" cy="13" r="3.5" fill="#0EA5E9" />
        <text
          x="27"
          y="20"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="20"
          letterSpacing="2.5px"
          fill="currentColor"
        >
          HOYA
        </text>
      </svg>
    ),
  },
  {
    id: "manfrotto",
    name: "Manfrotto",
    tagline: "Imagine More",
    accentColor: "#E2001A",
    svg: (
      <svg
        viewBox="0 0 142 32"
        className="h-7 sm:h-8 w-auto"
        aria-label="Manfrotto - Imagine More"
      >
        <circle cx="9" cy="6" r="3" fill="#E2001A" />
        <path d="M9 10l-4.5 11h3l1.5-5 1.5 5h3L9 10z" fill="#E2001A" />
        <text
          x="21"
          y="18"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="17.5"
          letterSpacing="0.8px"
          fill="currentColor"
        >
          Manfrotto
        </text>
        <text
          x="21"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontSize="8.5"
          letterSpacing="1.2px"
          fill="#E2001A"
        >
          Imagine More
        </text>
      </svg>
    ),
  },
  {
    id: "zhiyun",
    name: "Zhiyun",
    tagline: "3-Axis Gimbals & Pocket Lights",
    accentColor: "#EF4444",
    svg: (
      <svg
        viewBox="0 0 120 24"
        className="h-5 sm:h-6 w-auto fill-current"
        aria-label="ZHIYUN"
      >
        <text
          x="0"
          y="19"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="19"
          letterSpacing="3px"
        >
          ZHIYUN
        </text>
        <polygon points="108,6 116,12 108,18" fill="#EF4444" />
      </svg>
    ),
  },
  {
    id: "gopro",
    name: "GoPro",
    tagline: "Action Cameras & Mounts",
    accentColor: "#00A2E8",
    svg: (
      <svg
        viewBox="0 0 124 28"
        className="h-6 sm:h-7 w-auto fill-current"
        aria-label="GoPro"
      >
        <g transform="skewX(-8)">
          <text
            x="2"
            y="21"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="21"
            letterSpacing="1px"
          >
            GoPro
          </text>
        </g>
        <rect x="94" y="6" width="6" height="14" rx="1.5" fill="#00A2E8" />
        <rect x="103" y="6" width="6" height="14" rx="1.5" fill="#38BDF8" />
        <rect x="112" y="6" width="6" height="14" rx="1.5" fill="#7DD3FC" />
      </svg>
    ),
  },
  {
    id: "sandisk",
    name: "SanDisk",
    tagline: "Extreme PRO Memory & SSDs",
    accentColor: "#E2001A",
    svg: (
      <svg
        viewBox="0 0 125 26"
        className="h-6 sm:h-7 w-auto fill-current"
        aria-label="SanDisk"
      >
        <text
          x="0"
          y="20"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="21"
          letterSpacing="1px"
        >
          San<tspan fill="#E2001A">Disk</tspan>
        </text>
        <path d="M96 6c8 0 16 3 20 8-4-4-11-6-18-6H96v-2z" fill="#E2001A" />
      </svg>
    ),
  },
  {
    id: "toshiba",
    name: "Toshiba",
    tagline: "Leading Innovation >>>",
    accentColor: "#E60012",
    svg: (
      <svg
        viewBox="0 0 144 32"
        className="h-7 sm:h-8 w-auto"
        aria-label="TOSHIBA - Leading Innovation"
      >
        <text
          x="0"
          y="18"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="19"
          letterSpacing="2px"
          fill="#E60012"
        >
          TOSHIBA
        </text>
        <text
          x="0"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontSize="8.5"
          letterSpacing="0.7px"
          fill="currentColor"
          className="opacity-75"
        >
          Leading Innovation <tspan fill="#E60012">&gt;&gt;&gt;</tspan>
        </text>
      </svg>
    ),
  },
  {
    id: "lowepro",
    name: "Lowepro",
    tagline: "Pro Camera Backpacks & Cases",
    accentColor: "#FF6600",
    svg: (
      <svg
        viewBox="0 0 125 28"
        className="h-6 sm:h-7 w-auto fill-current"
        aria-label="Lowepro"
      >
        <rect x="2" y="5" width="16" height="16" rx="3.5" fill="#FF6600" />
        <circle cx="10" cy="13" r="4" fill="#FFFFFF" />
        <text
          x="25"
          y="20"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="19"
          letterSpacing="1px"
        >
          Lowepro
        </text>
      </svg>
    ),
  },
  {
    id: "magmod",
    name: "MagMod",
    tagline: "Magnetic Flash Modifiers",
    accentColor: "#F97316",
    svg: (
      <svg
        viewBox="0 0 132 26"
        className="h-6 sm:h-7 w-auto fill-current"
        aria-label="MAGMOD"
      >
        <path
          d="M4 19V7h4l4 6 4-6h4v12h-4v-6l-4 5.5-4-5.5v6H4z"
          fill="#F97316"
        />
        <text
          x="26"
          y="19"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="18"
          letterSpacing="2px"
        >
          MAGMOD
        </text>
      </svg>
    ),
  },
  {
    id: "tokina",
    name: "Tokina",
    tagline: "Cinema & Wide-Angle Lenses",
    accentColor: "#2563EB",
    svg: (
      <svg
        viewBox="0 0 112 24"
        className="h-5 sm:h-6 w-auto fill-current"
        aria-label="Tokina"
      >
        <text
          x="0"
          y="19"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="20"
          letterSpacing="2px"
        >
          Tokina
        </text>
        <circle cx="94" cy="9" r="3" fill="#2563EB" />
      </svg>
    ),
  },
  {
    id: "samyang",
    name: "Samyang",
    tagline: "AF & V-AF Cine Prime Lenses",
    accentColor: "#E2001A",
    svg: (
      <svg
        viewBox="0 0 128 24"
        className="h-5 sm:h-6 w-auto fill-current"
        aria-label="SAMYANG"
      >
        <text
          x="0"
          y="19"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="19"
          letterSpacing="2px"
        >
          SAMYANG
        </text>
        <circle cx="120" cy="13" r="3.5" fill="#E2001A" />
      </svg>
    ),
  },
  {
    id: "vanguard",
    name: "Vanguard",
    tagline: "Carbon Tripods & Optics",
    accentColor: "#DC2626",
    svg: (
      <svg
        viewBox="0 0 142 26"
        className="h-5 sm:h-6 w-auto fill-current"
        aria-label="VANGUARD"
      >
        <path d="M2 5h4.5l5 12 5-12H21l-7.5 16h-4L2 5z" fill="#DC2626" />
        <text
          x="24"
          y="19"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="17"
          letterSpacing="2px"
        >
          VANGUARD
        </text>
      </svg>
    ),
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
            "text-foreground/75 grayscale opacity-75 hover:grayscale-0 hover:opacity-100 hover:text-foreground",
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

          {/* Crisp Vector Mark */}
          <div className="relative z-10 flex items-center justify-center transition-transform duration-300">
            {brand.svg}
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
  const rowOne = BRANDS.slice(0, 12);
  const rowTwo = BRANDS.slice(12);

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
