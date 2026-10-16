import assert from 'node:assert/strict';
import test from 'node:test';
import { bannerPayloadSchema, safeBannerUrlSchema } from './banners.schema.js';
import { bannerVisibility } from './banners.service.js';

const uuid = '11111111-1111-4111-8111-111111111111';
const validOverlay = {
  internalName: 'Homepage introduction', placement: 'home_hero' as const, contentMode: 'overlay' as const,
  desktopAssetId: uuid, mobileAssetId: null, desktopAltText: '', mobileAltText: null, accessibleLinkLabel: null,
  eyebrow: 'Prem Electronics', headline: 'Explore electronics', description: null,
  primaryCtaLabel: 'Shop now', primaryCtaUrl: '/shop', bannerLinkUrl: null, openInNewTab: false,
  textAlignment: 'left' as const, desktopContentPosition: 'center_left' as const, mobileContentPosition: 'bottom_left' as const,
  textTheme: 'light' as const, overlayStrength: 45, desktopFocalX: 50, desktopFocalY: 50, mobileFocalX: 50, mobileFocalY: 50,
  isActive: false, startsAt: null, endsAt: null,
};

test('banner URLs allow site-relative and HTTPS destinations only', () => {
  assert.equal(safeBannerUrlSchema.safeParse('/shop?category=audio').success, true);
  assert.equal(safeBannerUrlSchema.safeParse('https://example.com/store').success, true);
  for (const value of ['javascript:alert(1)', 'data:text/html,x', '//evil.example/x', 'http://example.com', '/ok\u0000bad']) {
    assert.equal(safeBannerUrlSchema.safeParse(value).success, false, value);
  }
});

test('mode-specific fields and schedule ordering are enforced', () => {
  assert.equal(bannerPayloadSchema.safeParse(validOverlay).success, true);
  assert.equal(bannerPayloadSchema.safeParse({ ...validOverlay, primaryCtaLabel: 'Shop', primaryCtaUrl: null }).success, false);
  assert.equal(bannerPayloadSchema.safeParse({ ...validOverlay, startsAt: new Date('2026-10-13T10:00:00Z'), endsAt: new Date('2026-10-13T09:00:00Z') }).success, false);
  assert.equal(bannerPayloadSchema.safeParse({ ...validOverlay, contentMode: 'artwork', desktopAltText: '', primaryCtaLabel: null, primaryCtaUrl: null }).success, false);
  assert.equal(bannerPayloadSchema.safeParse({ ...validOverlay, contentMode: 'artwork', desktopAltText: 'Promotional artwork for the audio collection', primaryCtaLabel: null, primaryCtaUrl: null, bannerLinkUrl: '/shop', accessibleLinkLabel: null }).success, false);
});

test('visibility uses inclusive starts and exclusive ends', () => {
  const now = new Date('2026-10-13T10:00:00.000Z');
  const base = { isActive: true, archivedAt: null, startsAt: null, endsAt: null };
  assert.equal(bannerVisibility(base as any, now), 'visible');
  assert.equal(bannerVisibility({ ...base, startsAt: now } as any, now), 'visible');
  assert.equal(bannerVisibility({ ...base, startsAt: new Date(now.getTime() + 1) } as any, now), 'scheduled');
  assert.equal(bannerVisibility({ ...base, endsAt: now } as any, now), 'expired');
  assert.equal(bannerVisibility({ ...base, archivedAt: now } as any, now), 'archived');
  assert.equal(bannerVisibility({ ...base, isActive: false } as any, now), 'inactive');
});
