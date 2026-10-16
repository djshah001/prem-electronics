import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.env.BANNER_API_BASE_URL || 'http://localhost:5000/api/v1';
const origin = process.env.BANNER_CLIENT_ORIGIN || 'http://localhost:5173';
let cookie = '';
const tracked = new Map();

const call = async (path, options = {}, expected = 200) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(options.headers ?? {}) },
  });
  const body = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${options.method ?? 'GET'} ${path}: ${JSON.stringify(body)}`);
  return body;
};

const loginResponse = await fetch(`${base}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
  body: JSON.stringify({ email: 'admin@premelectronics.com', password: 'Admin@123' }),
});
assert.equal(loginResponse.status, 200, await loginResponse.text());
cookie = loginResponse.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
assert.match(cookie, /accessToken=/);

const firstOrderRead = await call('/admin/banners/order?placement=home_hero');
for (const banner of firstOrderRead.data.filter((item) => item.internalName.startsWith('Smoke '))) {
  await call(`/admin/banners/${banner.id}?expectedVersion=${banner.version}`, { method: 'DELETE' });
}
const preexisting = await call('/admin/banners/order?placement=home_hero');
assert.equal(preexisting.data.length, 0, 'Refusing to run destructive ordering smoke against a database that already has unarchived banners.');

const unauthorized = await fetch(`${base}/admin/banners`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: '{}' });
assert.equal(unauthorized.status, 401);

try {
  const form = new FormData();
  form.append('image', new File([await readFile(resolve('client/src/assets/hero.png'))], 'hero.png', { type: 'image/png' }));
  const upload = await call('/upload/banner-assets', { method: 'POST', body: form }, 201);
  assert.equal(upload.data.asset.mimeType, 'image/webp');
  assert.ok(upload.data.asset.width >= 320);

  const stamp = Date.now();
  const create = async (name, active, headline, schedule = {}) => {
    const result = await call('/admin/banners', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        internalName: name, placement: 'home_hero', contentMode: 'overlay', desktopAssetId: upload.data.asset.id,
        mobileAssetId: upload.data.asset.id, desktopAltText: '', mobileAltText: null, accessibleLinkLabel: null,
        eyebrow: 'Smoke verification', headline, description: 'Temporary banner created by the focused Banner Master verification.',
        primaryCtaLabel: 'Browse products', primaryCtaUrl: '/shop', bannerLinkUrl: null, openInNewTab: false,
        textAlignment: 'left', desktopContentPosition: 'center_left', mobileContentPosition: 'bottom_left', textTheme: 'light',
        overlayStrength: 50, desktopFocalX: 50, desktopFocalY: 50, mobileFocalX: 50, mobileFocalY: 50,
        isActive: active, startsAt: schedule.startsAt ?? null, endsAt: schedule.endsAt ?? null,
      }),
    }, 201);
    tracked.set(result.data.id, result.data.version);
    return result.data;
  };
  const first = await create(`Smoke primary ${stamp}`, true, `Primary smoke ${stamp}`);
  const second = await create(`Smoke secondary ${stamp}`, false, `Secondary smoke ${stamp}`);
  const future = await create(`Smoke future ${stamp}`, true, `Future smoke ${stamp}`, { startsAt: new Date(Date.now() + 86_400_000).toISOString() });
  const expired = await create(`Smoke expired ${stamp}`, true, `Expired smoke ${stamp}`, { startsAt: new Date(Date.now() - 172_800_000).toISOString(), endsAt: new Date(Date.now() - 86_400_000).toISOString() });

  let publicResult = await call('/banners?placement=home_hero');
  assert.equal(publicResult.data.banners.some((banner) => banner.id === first.id), true);
  assert.equal(publicResult.data.banners.some((banner) => banner.id === second.id), false);
  assert.equal(publicResult.data.banners.some((banner) => banner.id === future.id), false);
  assert.equal(publicResult.data.banners.some((banner) => banner.id === expired.id), false);
  assert.equal('internalName' in publicResult.data.banners.find((banner) => banner.id === first.id), false);

  const activated = await call(`/admin/banners/${second.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: second.version, isActive: true }),
  });
  tracked.set(second.id, activated.data.version);
  const fullOrder = await call('/admin/banners/order?placement=home_hero');
  const smokeIds = new Set([first.id, second.id, future.id, expired.id]);
  const reorderedItems = [
    ...fullOrder.data.filter((banner) => banner.id === second.id),
    ...fullOrder.data.filter((banner) => banner.id !== second.id),
  ].map((banner) => ({ id: banner.id, expectedVersion: banner.version }));
  const reordered = await call('/admin/banners/reorder', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placement: 'home_hero', items: reorderedItems }) });
  for (const banner of reordered.data) if (smokeIds.has(banner.id)) tracked.set(banner.id, banner.version);
  publicResult = await call('/banners?placement=home_hero');
  assert.equal(publicResult.data.banners.filter((banner) => smokeIds.has(banner.id))[0].id, second.id);

  const invalid = await fetch(`${base}/admin/banners/${first.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie },
    body: JSON.stringify({ expectedVersion: tracked.get(first.id), primaryCtaUrl: 'javascript:alert(1)' }),
  });
  assert.ok([400, 422].includes(invalid.status));
} finally {
  for (const [id] of tracked) {
    try {
      const detail = await call(`/admin/banners/${id}`);
      if (!detail.data.archivedAt) await call(`/admin/banners/${id}?expectedVersion=${detail.data.version}`, { method: 'DELETE' });
    } catch { /* Preserve the original failure; cleanup is best effort. */ }
  }
}

const emptyAfterCleanup = await call('/banners?placement=home_hero');
assert.equal(emptyAfterCleanup.data.banners.some((banner) => tracked.has(banner.id)), false);
console.log(JSON.stringify({ upload: 'decoded-to-webp', createActivateReorderArchive: 'passed', unauthorizedWrite: 'rejected', invalidUrl: 'rejected', cleanup: 'archived-test-banners' }, null, 2));
