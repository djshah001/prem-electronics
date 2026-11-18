import type { BannerFontFamily } from '../types/banner';

export interface BannerFontOption {
  id: BannerFontFamily;
  name: string;
  category: string;
  cssFamily: string;
  className: string;
  sampleText: string;
}

export const BANNER_FONTS: BannerFontOption[] = [
  {
    id: 'outfit',
    name: 'Outfit',
    category: 'Brand Default · Geometric Sans',
    cssFamily: "'Outfit', sans-serif",
    className: "font-['Outfit']",
    sampleText: 'Premium Tech & Next-Gen Audio',
  },
  {
    id: 'inter',
    name: 'Inter',
    category: 'Clean Technical · Modern Sans',
    cssFamily: "'Inter', sans-serif",
    className: "font-['Inter']",
    sampleText: 'Engineered For Pure Performance',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    category: 'Rounded · Friendly Geometric',
    cssFamily: "'Poppins', sans-serif",
    className: "font-['Poppins']",
    sampleText: 'Celebrate The Best Festive Deals',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    category: 'Architectural · Punchy Bold',
    cssFamily: "'Montserrat', sans-serif",
    className: "font-['Montserrat'] font-extrabold tracking-tight",
    sampleText: 'POWERFUL WORKSTATIONS & GEAR',
  },
  {
    id: 'bebas_neue',
    name: 'Bebas Neue',
    category: 'Cinematic All-Caps · High Impact',
    cssFamily: "'Bebas Neue', sans-serif",
    className: "font-['Bebas_Neue'] tracking-wider uppercase font-normal scale-y-105",
    sampleText: 'UNLEASH ULTRA 8K VISUALS',
  },
  {
    id: 'space_grotesk',
    name: 'Space Grotesk',
    category: 'Futuristic · Cyber Tech',
    cssFamily: "'Space Grotesk', monospace",
    className: "font-['Space_Grotesk'] tracking-tight font-bold",
    sampleText: 'NEXT-LEVEL SMART HOME SYSTEM',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    category: 'Luxury · Editorial Serif',
    cssFamily: "'Playfair Display', serif",
    className: "font-['Playfair_Display'] italic font-bold",
    sampleText: 'The Art of Acoustic Perfection',
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    category: 'Classical Roman · Royal Elegance',
    cssFamily: "'Cinzel', serif",
    className: "font-['Cinzel'] tracking-widest uppercase font-bold",
    sampleText: 'THE FLAGSHIP COLLECTION',
  },
];

export const BANNER_FONT_MAP: Record<BannerFontFamily, BannerFontOption> = BANNER_FONTS.reduce(
  (acc, font) => {
    acc[font.id] = font;
    return acc;
  },
  {} as Record<BannerFontFamily, BannerFontOption>
);

export function getBannerFontClass(fontId?: BannerFontFamily | null): string {
  if (!fontId || !BANNER_FONT_MAP[fontId]) {
    return BANNER_FONT_MAP.outfit.className;
  }
  return BANNER_FONT_MAP[fontId].className;
}
