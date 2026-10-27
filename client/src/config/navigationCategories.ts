import type { Category } from '../types';
import {
  Camera,
  Aperture,
  Video,
  HardDrive,
  Headphones,
  Compass,
  Maximize2,
  Sun,
  Briefcase,
  Layers,
  Smartphone,
  Laptop,
  Tv,
  Package,
} from 'lucide-react';

export interface SubcategoryConfig {
  name: string;
  slug: string;
  id?: string;
  href: string;
}

export interface CategoryConfig {
  name: string;
  slug: string;
  id?: string;
  description?: string;
  bannerImage?: string;
  href: string;
  iconName: string;
  subcategories: SubcategoryConfig[];
}

/**
 * Canonical categories hierarchy used for fallback and icon mapping.
 */
export const CANONICAL_CATEGORIES_CONFIG = [
  {
    name: 'Cameras',
    slug: 'cameras',
    iconName: 'Camera',
    subcategories: [
      { name: 'Full-Frame Mirrorless Cameras', slug: 'full-frame-mirrorless-cameras' },
      { name: 'APS-C Mirrorless Cameras', slug: 'aps-c-mirrorless-cameras' },
      { name: 'Cinema & Broadcast Cameras', slug: 'cinema-broadcast-cameras' },
      { name: 'DSLR Cameras', slug: 'dslr-cameras' },
      { name: 'Compact & Vlog Cameras', slug: 'compact-vlog-cameras' },
    ],
  },
  {
    name: 'Camera Lenses',
    slug: 'camera-lenses',
    iconName: 'Aperture',
    subcategories: [
      { name: 'Sony E-Mount Full Frame Lenses', slug: 'sony-fe-lenses' },
      { name: 'Sony E-Mount APS-C Lenses', slug: 'sony-aps-c-lenses' },
      { name: 'Canon RF Full-Frame Lenses', slug: 'canon-rf-lenses' },
      { name: 'Canon RF-S APS-C Lenses', slug: 'canon-rf-s-lenses' },
      { name: 'Canon EF DSLR Lenses', slug: 'canon-ef-lenses' },
      { name: 'Cinema Prime Lenses', slug: 'cinema-prime-lenses' },
      { name: 'Lens Converters & Mount Adapters', slug: 'lens-converters-adapters' },
    ],
  },
  {
    name: 'Action & Pocket Cameras',
    slug: 'action-pocket-cameras',
    iconName: 'Video',
    subcategories: [
      { name: 'DJI Pocket Series', slug: 'dji-pocket-series' },
      { name: 'DJI Action Series', slug: 'dji-action-series' },
    ],
  },
  {
    name: 'Gimbals & Stabilizers',
    slug: 'gimbals-stabilizers',
    iconName: 'Compass',
    subcategories: [
      { name: 'DJI OM Series', slug: 'dji-om-series' },
      { name: 'DJI Ronin Stabilizers', slug: 'dji-ronin-stabilizers' },
    ],
  },
  {
    name: 'Pro Audio & Microphones',
    slug: 'pro-audio-microphones',
    iconName: 'Headphones',
    subcategories: [
      { name: 'Camera Microphones & Audio Adapters', slug: 'camera-microphones' },
    ],
  },
  {
    name: 'Camera Accessories & Media',
    slug: 'camera-accessories-media',
    iconName: 'Layers',
    subcategories: [
      { name: 'Memory Cards & Readers', slug: 'memory-cards-readers' },
      { name: 'Batteries, Chargers & Grips', slug: 'batteries-chargers-grips' },
      { name: 'Photo Printers & Consumables', slug: 'photo-printers-consumables' },
    ],
  },
  {
    name: 'Action Cameras',
    slug: 'action-cameras',
    iconName: 'Video',
    subcategories: [
      { name: 'Camera', slug: 'action-camera-units' },
      { name: 'Accessories', slug: 'action-camera-accessories' },
    ],
  },
  {
    name: 'Memory Cards & Storage',
    slug: 'memory-cards-storage',
    iconName: 'HardDrive',
    subcategories: [
      { name: 'SDXC', slug: 'sdxc' },
      { name: 'Micro SD', slug: 'micro-sd' },
      { name: 'Card Readers', slug: 'card-readers' },
      { name: 'HDD / SSD', slug: 'hdd-ssd' },
    ],
  },
  {
    name: 'Audio',
    slug: 'audio',
    iconName: 'Headphones',
    subcategories: [
      { name: 'Microphones', slug: 'microphones' },
      { name: 'Mic Accessories', slug: 'mic-accessories' },
    ],
  },
  {
    name: 'Tripods',
    slug: 'tripods',
    iconName: 'Maximize2',
    subcategories: [
      { name: 'Tripod', slug: 'tripod-units' },
      { name: 'Monopods', slug: 'monopods' },
      { name: 'Accessories', slug: 'tripod-accessories' },
    ],
  },
  {
    name: 'Lighting',
    slug: 'lighting',
    iconName: 'Sun',
    subcategories: [
      { name: 'Softboxes', slug: 'softboxes' },
      { name: 'Stick Lights', slug: 'stick-lights' },
      { name: 'Accessories', slug: 'lighting-accessories' },
    ],
  },
  {
    name: 'Camera Bags & Cases',
    slug: 'camera-bags-cases',
    iconName: 'Briefcase',
    subcategories: [],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    iconName: 'Layers',
    subcategories: [
      { name: 'Batteries & Chargers', slug: 'batteries-chargers' },
      { name: 'Camera Straps & Harness', slug: 'camera-straps-harness' },
      { name: 'Lens Protectors & ND Filters', slug: 'lens-protectors-nd-filters' },
      { name: 'Cables', slug: 'cables' },
      { name: 'Camera Cages', slug: 'camera-cages' },
    ],
  },
] as const;

/**
 * Slugs for individual dropdown navigation items.
 */
export const INDIVIDUAL_NAVBAR_SLUGS = [
  'cameras',
  'camera-lenses',
  'action-pocket-cameras',
  'action-cameras',
  'gimbals-stabilizers',
  'gimbal-stabilizers',
  'pro-audio-microphones',
  'camera-accessories-media',
] as const;

/**
 * Determine icon name by keyword heuristics
 */
export const getIconNameForCategory = (slug = '', name = ''): string => {
  const s = slug.toLowerCase();
  const n = name.toLowerCase();
  if (s.includes('lens') || n.includes('lens')) return 'Aperture';
  if (s.includes('action') || s.includes('pocket') || s.includes('video') || n.includes('action') || n.includes('pocket')) return 'Video';
  if (s.includes('gimbal') || s.includes('stabilizer') || n.includes('gimbal') || n.includes('stabilizer')) return 'Compass';
  if (s.includes('audio') || s.includes('mic') || s.includes('sound') || n.includes('audio') || n.includes('mic')) return 'Headphones';
  if (s.includes('storage') || s.includes('card') || s.includes('memory') || n.includes('storage') || n.includes('card') || n.includes('memory')) return 'HardDrive';
  if (s.includes('tripod') || s.includes('monopod') || n.includes('tripod') || n.includes('monopod')) return 'Maximize2';
  if (s.includes('light') || n.includes('light')) return 'Sun';
  if (s.includes('bag') || s.includes('case') || n.includes('bag') || n.includes('case')) return 'Briefcase';
  if (s.includes('camera') || n.includes('camera')) return 'Camera';
  if (s.includes('phone') || s.includes('mobile') || n.includes('phone') || n.includes('mobile')) return 'Smartphone';
  if (s.includes('laptop') || s.includes('computer') || n.includes('laptop') || n.includes('computer')) return 'Laptop';
  if (s.includes('tv') || s.includes('television') || n.includes('tv') || n.includes('television')) return 'Tv';
  if (s.includes('accessor') || n.includes('accessor') || s.includes('media') || n.includes('media')) return 'Layers';
  return 'Package';
};

/**
 * Map icon component by name
 */
export const getCategoryIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'Camera':
      return Camera;
    case 'Aperture':
      return Aperture;
    case 'Video':
      return Video;
    case 'HardDrive':
      return HardDrive;
    case 'Headphones':
      return Headphones;
    case 'Compass':
      return Compass;
    case 'Maximize2':
      return Maximize2;
    case 'Sun':
      return Sun;
    case 'Briefcase':
      return Briefcase;
    case 'Layers':
      return Layers;
    case 'Smartphone':
      return Smartphone;
    case 'Laptop':
      return Laptop;
    case 'Tv':
      return Tv;
    default:
      return Package;
  }
};

/**
 * Dynamically resolves category hierarchy with subcategories from the backend.
 * When backendCategories are provided, it automatically extracts all root categories
 * and dynamically extracts all active child categories from `backendCat.children`.
 * This ensures that any category/subcategory created or seeded in the database
 * automatically appears in the dropdown without requiring static configuration changes.
 */
export const resolveNavCategories = (backendCategories: Category[]): CategoryConfig[] => {
  if (Array.isArray(backendCategories) && backendCategories.length > 0) {
    // Top-level categories have parentId === null or undefined
    const rootCats = backendCategories.filter((c) => !c.parentId);
    const sourceRoots = rootCats.length > 0 ? rootCats : backendCategories;

    return sourceRoots.map((backendCat) => {
      // Find matching canonical category for icon name fallback
      const canonicalMatch = CANONICAL_CATEGORIES_CONFIG.find(
        (c) =>
          c.slug.toLowerCase() === backendCat.slug?.toLowerCase() ||
          c.name.toLowerCase() === backendCat.name?.toLowerCase() ||
          c.slug.replace(/-/g, '').toLowerCase() === backendCat.slug?.replace(/-/g, '').toLowerCase()
      );

      const iconName =
        canonicalMatch?.iconName ||
        getIconNameForCategory(backendCat.slug || '', backendCat.name || '');

      const catHref = backendCat.id
        ? `/shop?categoryId=${backendCat.id}&categorySlug=${backendCat.slug}`
        : `/shop?categorySlug=${backendCat.slug}`;

      // Dynamically extract all child subcategories directly from backendCat.children or parentId matching
      let subcategories: SubcategoryConfig[] = [];
      if (Array.isArray(backendCat.children) && backendCat.children.length > 0) {
        subcategories = backendCat.children
          .filter((sub) => sub && sub.isActive !== false)
          .map((sub) => ({
            name: sub.name,
            slug: sub.slug,
            id: sub.id,
            href: `/shop?categoryId=${sub.id}&categorySlug=${sub.slug}`,
          }));
      } else {
        const flatChildren = backendCategories.filter(
          (c) => c.parentId && c.parentId === backendCat.id && c.isActive !== false
        );
        if (flatChildren.length > 0) {
          subcategories = flatChildren.map((sub) => ({
            name: sub.name,
            slug: sub.slug,
            id: sub.id,
            href: `/shop?categoryId=${sub.id}&categorySlug=${sub.slug}`,
          }));
        } else if (canonicalMatch && canonicalMatch.subcategories.length > 0) {
          // Fallback to canonical subcategories only if backend children array is empty
          subcategories = canonicalMatch.subcategories.map((sub) => ({
            name: sub.name,
            slug: sub.slug,
            href: `/shop?categorySlug=${sub.slug}`,
          }));
        }
      }

      return {
        id: backendCat.id,
        name: backendCat.name,
        slug: backendCat.slug,
        description: backendCat.description,
        bannerImage: backendCat.bannerImage,
        href: catHref,
        iconName,
        subcategories,
      };
    });
  }

  // Fallback when backend data is not yet loaded or empty
  return CANONICAL_CATEGORIES_CONFIG.map((catConfig) => ({
    name: catConfig.name,
    slug: catConfig.slug,
    href: `/shop?categorySlug=${catConfig.slug}`,
    iconName: catConfig.iconName,
    subcategories: catConfig.subcategories.map((sub) => ({
      name: sub.name,
      slug: sub.slug,
      href: `/shop?categorySlug=${sub.slug}`,
    })),
  }));
};

/**
 * Returns individual dropdown items (Cameras, Camera Lenses, Action & Pocket Cameras, Gimbals & Stabilizers).
 */
export const getIndividualNavCategories = (backendCategories: Category[]): CategoryConfig[] => {
  const allResolved = resolveNavCategories(backendCategories);

  // Return all resolved categories from the backend in dynamic order
  if (allResolved.length > 0) {
    return allResolved;
  }

  return CANONICAL_CATEGORIES_CONFIG.map((catConfig) => ({
    name: catConfig.name,
    slug: catConfig.slug,
    href: `/shop?categorySlug=${catConfig.slug}`,
    iconName: catConfig.iconName,
    subcategories: catConfig.subcategories.map((sub) => ({
      name: sub.name,
      slug: sub.slug,
      href: `/shop?categorySlug=${sub.slug}`,
    })),
  }));
};
