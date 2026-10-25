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
 * Exact canonical 10-category hierarchy specified in the requirements.
 * Reused by both "All Categories" and individual dropdowns.
 */
export const CANONICAL_CATEGORIES_CONFIG = [
  {
    name: 'Cameras',
    slug: 'cameras',
    iconName: 'Camera',
    subcategories: [
      { name: 'DSLR Cameras', slug: 'dslr-cameras' },
      { name: 'Mirrorless Cameras', slug: 'mirrorless-cameras' },
      { name: 'Video Cameras', slug: 'video-cameras' },
    ],
  },
  {
    name: 'Camera Lenses',
    slug: 'camera-lenses',
    iconName: 'Aperture',
    subcategories: [
      { name: 'DSLR Lenses', slug: 'dslr-lenses' },
      { name: 'Mirrorless Lenses', slug: 'mirrorless-lenses' },
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
    name: 'Gimbals & Stabilizers',
    slug: 'gimbal-stabilizers',
    iconName: 'Compass',
    subcategories: [
      { name: 'Camera Gimbal', slug: 'camera-gimbal' },
      { name: 'Smartphone Gimbal', slug: 'smartphone-gimbal' },
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
 * Slugs for the four individual dropdown navigation items.
 */
export const INDIVIDUAL_NAVBAR_SLUGS = [
  'cameras',
  'camera-lenses',
  'action-cameras',
  'gimbal-stabilizers',
] as const;

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
 * Flatten a nested category tree from backend into a lookup map by slug and id
 */
const buildBackendLookup = (categories: Category[]) => {
  const bySlug = new Map<string, Category>();
  const byId = new Map<string, Category>();

  const traverse = (cats: Category[]) => {
    for (const c of cats) {
      if (!c) continue;
      if (c.slug) bySlug.set(c.slug.toLowerCase(), c);
      if (c.id) byId.set(c.id, c);
      if (Array.isArray(c.children) && c.children.length > 0) {
        traverse(c.children);
      }
    }
  };

  traverse(categories);
  return { bySlug, byId };
};

/**
 * Merges the canonical menu hierarchy with dynamic category data from the backend.
 * Uses real backend IDs when available while ensuring all 10 categories & subcategories
 * render reliably and link correctly.
 */
export const resolveNavCategories = (backendCategories: Category[]): CategoryConfig[] => {
  const { bySlug } = buildBackendLookup(backendCategories);

  return CANONICAL_CATEGORIES_CONFIG.map((catConfig) => {
    // Match root category by slug or alternative slugs
    const backendCat =
      bySlug.get(catConfig.slug.toLowerCase()) ||
      bySlug.get(catConfig.slug.replace(/-/g, '').toLowerCase());

    const catId = backendCat?.id;
    const catHref = catId
      ? `/shop?categoryId=${catId}&categorySlug=${catConfig.slug}`
      : `/shop?categorySlug=${catConfig.slug}`;

    const subcategories: SubcategoryConfig[] = catConfig.subcategories.map((subConfig) => {
      // Find subcategory in backend lookup
      const backendSub =
        bySlug.get(subConfig.slug.toLowerCase()) ||
        (backendCat && Array.isArray(backendCat.children)
          ? backendCat.children.find(
              (c) =>
                c.slug?.toLowerCase() === subConfig.slug.toLowerCase() ||
                c.name?.toLowerCase() === subConfig.name.toLowerCase()
            )
          : undefined);

      const subId = backendSub?.id;
      const subHref = subId
        ? `/shop?categoryId=${subId}&categorySlug=${subConfig.slug}`
        : `/shop?categorySlug=${subConfig.slug}`;

      return {
        name: subConfig.name,
        slug: subConfig.slug,
        id: subId,
        href: subHref,
      };
    });

    return {
      name: catConfig.name,
      slug: catConfig.slug,
      id: catId,
      description: backendCat?.description,
      bannerImage: backendCat?.bannerImage,
      href: catHref,
      iconName: catConfig.iconName,
      subcategories,
    };
  });
};

/**
 * Returns the four individual dropdown items (Cameras, Camera Lenses, Action Cameras, Gimbals & Stabilizers).
 */
export const getIndividualNavCategories = (backendCategories: Category[]): CategoryConfig[] => {
  const allResolved = resolveNavCategories(backendCategories);
  return allResolved.filter((cat) =>
    (INDIVIDUAL_NAVBAR_SLUGS as readonly string[]).includes(cat.slug)
  );
};
