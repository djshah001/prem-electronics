# Banner Master implementation checklist

Status labels: **VERIFIED**, **IMPLEMENTED BUT UNVERIFIED**, **PARTIAL**, **BLOCKED**.

## Database and backend

- **VERIFIED** — Drizzle migration applied successfully to the configured development PostgreSQL database.
- **VERIFIED** — Asset records, banner records, settings defaults, foreign keys, checks, indexes, audit events, UTC schedules, optimistic versions, and non-destructive archive behavior compile and migrate.
- **VERIFIED** — Public visibility policy uses inclusive starts and exclusive ends; focused unit tests pass.
- **VERIFIED** — URL, mode-specific, CTA-pair, artwork-alt/link-label, focal point, interval, identifier, and schedule validation is server-side.
- **IMPLEMENTED BUT UNVERIFIED** — Concurrent active-limit and reorder conflict paths use PostgreSQL advisory locks/transactions; deterministic code and constraints are present, but a parallel-session stress test has not yet been run.
- **VERIFIED** — Server-local uploads are decoded/normalized with Sharp and stored under immutable filenames. Animated/SVG/invalid/oversized images are rejected.
- **VERIFIED** — Non-destructive seed completes and creates settings without fake live promotions.

## Storefront

- **VERIFIED** — Production TypeScript/Vite build passes with shadcn Carousel composition, Embla 8.6, and Embla Autoplay 8.6.
- **VERIFIED** — The zero-banner fallback renders without horizontal overflow at 1440 px and 390 px in the browser smoke suite.
- **IMPLEMENTED BUT UNVERIFIED** — One/multiple rendering, responsive art direction, focal cropping, selection preservation, and image failure fallback are implemented and production-built; the complete live-carousel interaction matrix has not been automated in a browser.
- **IMPLEMENTED BUT UNVERIFIED** — Pause/play reason policy, focus/hover/visibility/offscreen handling, pointer/manual pause, reduced motion, listener cleanup, and inert offscreen actions are implemented; assistive-technology manual testing remains.

## Admin

- **VERIFIED** — `/admin/banners`, its sidebar entry, page heading, Add Banner action, create dialog, two image inputs, and shared live preview load in the desktop browser smoke suite and remain role-protected.
- **VERIFIED** — The focused API smoke uploads and decodes a real PNG to immutable WebP, creates active/inactive/future/expired banners, checks public visibility, activates, atomically reorders, rejects an unsafe URL and unauthorized write, archives, and confirms public removal.
- **IMPLEMENTED BUT UNVERIFIED** — The complete point-and-click browser workflow for replace/remove, edit, settings, conflict recovery, filters, pagination, reorder controls, and archive is implemented but has not been fully automated.

## Operations

- **VERIFIED** — Public freshness is capped at 30 seconds, clamped to schedule boundaries, and invalidated after writes.
- **VERIFIED** — Server storage usage, upload dimensions, admin workflow, cache behavior, and bounded abandoned-upload cleanup are documented.
- **VERIFIED** — Banner images use server-local storage under `server/uploads/banners`, as directed by the project owner; no AWS dependency or object-storage path was added.
- **PARTIAL** — A production deployment still needs a persistent, backup-enabled `server/uploads` volume. Ephemeral/serverless filesystems cannot make server-local uploads durable.
