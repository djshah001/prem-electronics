# Banner Master

Banner Master controls the storefront homepage hero without a client deployment. Authorized `admin` and `superadmin` users can open **Admin → Content → Banner Master** (`/admin/banners`).

## Admin workflow

1. Select **Add banner** or edit an existing unarchived banner.
2. Choose **Overlay text** when the image is photographic/background artwork and the headline/CTA should remain accessible HTML. Choose **Text already in artwork** only when the uploaded artwork already contains its promotional message.
3. Upload the desktop image and, optionally, a mobile image. Uploading creates an asset but does not modify the live banner until **Create banner** or **Save banner** succeeds.
4. Set image descriptions, focal points, content positions, theme, overlay strength, schedule, and active state. Schedule fields are displayed as Asia/Kolkata and stored as UTC. Start is inclusive; end is exclusive.
5. Check desktop, tablet, and mobile previews. Preview destinations are deliberately disabled.
6. Save. Use **Reorder** to move every unarchived banner and save the complete order atomically.
7. Deactivate a banner to retain it for later use, or archive it to remove it from operational editing and storefront eligibility.

Artwork links require an accessible link name. Overlay CTAs require both a label and a site-relative or HTTPS destination. `javascript:`, `data:`, protocol-relative, HTTP, malformed, and control-character URLs are rejected by the server.

## Image guidance and server storage

- Desktop recommendation: **1920 × 1080 px (16:9)**.
- Mobile recommendation: **1080 × 1920 px (9:16)**.
- Accepted source formats: JPEG, PNG, and WebP.
- Maximum upload: 15 MB, 12,000 px on either edge, and 40 megapixels.
- Minimum upload: 320 × 180 px.
- Animated images and SVG are rejected.

Uploads are fully decoded with Sharp, auto-oriented, metadata-stripped, and normalized to WebP. Files use immutable generated names under `server/uploads/banners`; `media_assets` stores dimensions, byte size, MIME type, storage key, uploader, and ready state. Replacing or archiving a banner never deletes an attached/shared asset.

Banner storage is intentionally server-local. This feature does not use AWS or S3.

The server uploads directory must be on a **persistent, backup-enabled server volume** in production. It must not be an ephemeral serverless filesystem. Run `npm run banners:cleanup-assets --prefix server` periodically to remove at most 100 uploads per run that are older than 24 hours and have never been attached to any active or archived banner.

## Storefront behavior

- The public endpoint is `GET /api/v1/banners?placement=home_hero`.
- It returns only active, unarchived banners where `startsAt <= server time < endsAt`, ordered by `sortOrder` and banner ID.
- Public responses are cached for at most **30 seconds** and clamped to the next schedule boundary. Every banner/settings mutation invalidates the server cache immediately.
- The client revalidates every 30 seconds and on window focus. It preserves the selected banner by ID where possible.
- Zero banners show a stable Prem Electronics fallback. One banner is static. Multiple banners use the shadcn Carousel composition backed by Embla and its autoplay plugin.
- The storefront hero is full-bleed and fills the viewport behind the non-sticky overlay navigation. Framer Motion adds selected-image crossfade/scale and staggered overlay-copy entrances without animating Embla's track.
- Autoplay pauses independently for explicit user pause, pointer hover, focus within, hidden tabs, and an offscreen hero. Manual interaction requires explicit Play to resume. Reduced-motion users start paused and may explicitly play instant transitions.
- Offscreen slide actions are inert and hidden from assistive technology. Manual navigation is announced without repeatedly announcing autoplay.

## Data and API safety

- `0017_banner_master.sql` creates `media_assets`, `banners`, `banner_settings`, enums, foreign keys, indexes, and database checks.
- Banner updates, settings, reorder, and archive use optimistic versions and return HTTP 409 for stale writes.
- Activation is serialized with a PostgreSQL advisory transaction lock and is limited to 10 active home hero banners.
- Reorder accepts the complete unarchived placement list, rejects missing/duplicate/wrong/stale records, and commits atomically.
- Admin mutations, uploads, settings, and order routes use the existing cookie authentication, origin guard, and admin role guard.
- Audit events are written for create, update, reorder, archive, and settings changes.

No fake live promotion is seeded. The seed only ensures safe default hero settings; the storefront fallback remains visible until an administrator creates and activates a real banner.
