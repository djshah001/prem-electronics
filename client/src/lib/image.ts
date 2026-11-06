/**
 * Image helper utility for Prem Electronics
 * Handles thumbnail resolution and dimension specifications
 */

/**
 * Resolves an optimized thumbnail URL for an image.
 * If the image is stored on Prem Electronics upload server (e.g. /uploads/image.webp),
 * returns the companion -thumb.webp variant.
 * If external or already a thumbnail, returns as-is.
 */
export function getProductThumbnailUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('-thumb.')) return url;
  if (url.includes('/uploads/')) {
    return url.replace(/(\.[a-zA-Z0-9]+)$/, '-thumb.webp');
  }
  return url;
}

/**
 * Standard image dimension specifications for the Prem Electronics platform
 */
export const IMAGE_SPECS = {
  product: {
    label: 'Product Showcase Image',
    aspectRatio: '1:1 (Square)',
    recommendedDimensions: '1000 × 1000 px',
    minDimensions: '500 × 500 px',
    maxDimensions: '2500 × 2500 px',
    formats: 'JPG, PNG, WebP',
    maxFileSize: '15 MB',
    thumbnail: 'Auto-generated 400 × 400 px WebP',
    guidance: 'Square 1:1 image with clean or solid background. Sharp compresses to high-fidelity WebP without visual loss and auto-generates 400 × 400 px thumbnails.',
  },
  bannerDesktop: {
    label: 'Desktop Banner Artwork',
    aspectRatio: '16:9 (Widescreen Landscape)',
    recommendedDimensions: '1920 × 1080 px',
    minDimensions: '1280 × 720 px',
    maxDimensions: '3840 × 2160 px (4K)',
    formats: 'JPG, PNG, WebP',
    maxFileSize: '15 MB',
    guidance: 'High-resolution landscape banner for desktop displays. Safe focal area should be centered.',
  },
  bannerMobile: {
    label: 'Mobile Banner Artwork',
    aspectRatio: '9:16 (Portrait)',
    recommendedDimensions: '1080 × 1920 px',
    minDimensions: '720 × 1280 px',
    maxDimensions: '1440 × 2560 px',
    formats: 'JPG, PNG, WebP',
    maxFileSize: '15 MB',
    guidance: 'Vertical portrait banner for smartphone displays. Fallback to desktop banner if omitted.',
  },
  category: {
    label: 'Category Header Banner',
    aspectRatio: '3:1 (Wide Panoramic)',
    recommendedDimensions: '1200 × 400 px',
    minDimensions: '800 × 267 px',
    maxDimensions: '2400 × 800 px',
    formats: 'JPG, PNG, WebP',
    maxFileSize: '15 MB',
    guidance: 'Horizontal banner displayed across the top of category catalog pages.',
  },
  blogCover: {
    label: 'Blog Post Cover Image',
    aspectRatio: '1.91:1 (Social / Hero)',
    recommendedDimensions: '1200 × 630 px',
    minDimensions: '800 × 420 px',
    maxDimensions: '2400 × 1260 px',
    formats: 'JPG, PNG, WebP',
    maxFileSize: '15 MB',
    guidance: 'Standard OpenGraph and hero format optimal for search results and social previews.',
  },
} as const;

