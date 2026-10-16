export type BannerPlacement = 'home_hero';
export type BannerContentMode = 'artwork' | 'overlay';
export type BannerContentPosition =
  | 'top_left' | 'top_center' | 'top_right'
  | 'center_left' | 'center' | 'center_right'
  | 'bottom_left' | 'bottom_center' | 'bottom_right';

export interface BannerAsset {
  id?: string;
  url: string;
  width: number;
  height: number;
  mimeType?: string;
  byteSize?: number;
}

export interface HeroBanner {
  id: string;
  contentMode: BannerContentMode;
  desktopAsset: BannerAsset | null;
  mobileAsset: BannerAsset | null;
  desktopAltText: string;
  mobileAltText: string | null;
  accessibleLinkLabel: string | null;
  eyebrow: string | null;
  headline: string | null;
  description: string | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  bannerLinkUrl: string | null;
  openInNewTab: boolean;
  textAlignment: 'left' | 'center' | 'right';
  desktopContentPosition: BannerContentPosition;
  mobileContentPosition: BannerContentPosition;
  textTheme: 'light' | 'dark';
  overlayStrength: number;
  desktopFocalX: number;
  desktopFocalY: number;
  mobileFocalX: number;
  mobileFocalY: number;
}

export interface HeroSettings {
  autoplayEnabled: boolean;
  autoplayIntervalMs: number;
  showNavigation: boolean;
  showIndicators: boolean;
}

export interface PublicBannerResponse {
  banners: HeroBanner[];
  settings: HeroSettings;
  serverTime: string;
  freshUntil: string;
}

export interface AdminBanner extends Omit<HeroBanner, 'desktopAsset' | 'mobileAsset'> {
  internalName: string;
  placement: BannerPlacement;
  desktopAssetId: string;
  mobileAssetId: string | null;
  desktopAsset: BannerAsset;
  mobileAsset: BannerAsset | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  archivedAt: string | null;
  visibility: 'inactive' | 'scheduled' | 'visible' | 'expired' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHeroSettings extends HeroSettings {
  id: string;
  placement: BannerPlacement;
  version: number;
  updatedAt: string;
}
