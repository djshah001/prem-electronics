# Prem Electronics — P3 Implementation Checklist

> Started: 2026-10-05 | Completed and verified: 2026-10-05 | Verdict: **Implemented**

## Shared versioned architecture

- [x] Editable invoice/email drafts with optimistic revision checks
- [x] Immutable published versions and active-version pointers
- [x] Restore copies an old version into a new editable draft; it never mutates history
- [x] Referenced versions use restrictive foreign keys and have no hard-delete endpoint
- [x] Actor/time audit events for create, edit, publish, restore, archive, schedule, start, pause, and cancel actions
- [x] Admin-only master, campaign, delivery-log, preview, and test-send APIs

## Invoice Master

- [x] `/admin/invoice-master` list, create, duplicate, edit, preview, publish/default, history, restore, and archive workflow
- [x] Reference-aligned A4 portrait PDF with seller, ship-to/bill-to, metadata, item/HSN/GST columns, tax summary, words, declaration/bank/signature, and computer-generated footer
- [x] Configurable labels, merchant/legal fields, section visibility and ordering, margins, repeated table headings, and page numbers
- [x] Preview and issuance call the same code-owned PDFKit renderer
- [x] Required legal/layout sections are enforced at publication
- [x] Issued PDFs persist as immutable PostgreSQL `bytea` artifacts with SHA-256, renderer/page metadata, pinned template version, and order/seller/buyer/template snapshots
- [x] Existing pre-P3 invoices retain a clear legacy marker and no false template-version association
- [x] Customer and administrator PDF downloads enforce existing ownership/role checks
- [x] PDF generation never reprices historical orders

## Email Master and delivery

- [x] Pinned `@react-email/editor@1.7.11`, compatible with the installed React 19 runtime
- [x] Shared EMAIL/BLOG structured editor wrapper with visual, JSON source, desktop/mobile, and light/dark canvas modes
- [x] Server allowlists document nodes/marks/URLs and produces sanitized HTML plus plain text; arbitrary JSX/HTML is not executed
- [x] `/admin/email-master` list/edit/preview/plain-text/test-send/publish/history/restore/archive workflow
- [x] Stable templates for welcome, OTP, password reset, order confirmation/invoice, payment failure, shipment, delivery, cancellation, return, refund, and promotion
- [x] Mandatory event variables cannot be removed; auth URLs and marketing unsubscribe URLs are present in HTML and plain text
- [x] Existing auth/order sends use versioned templates; legacy P2 outbox rows bridge through the new delivery engine with dedupe keys
- [x] Durable delivery jobs pin versions and rendered snapshots and record queued/render-failed/submitting/SMTP-accepted/failed/unknown/cancelled states
- [x] Attempt records, leases, expiry, priority, retry backoff, provider IDs, and dedupe keys implemented
- [x] Order confirmation attaches the persisted PDF buffer; Nodemailer file/URL access is disabled
- [x] Logs correctly describe `smtp_accepted` as transport acceptance, not delivery or engagement

## Campaigns and consent

- [x] `/admin/campaigns` create, audience preview/snapshot, admin-only test, schedule, start, pause, cancel, and status workflow
- [x] Campaigns pin a published marketing template version and an immutable recipient snapshot
- [x] Only explicit opt-ins are eligible; legacy accounts with no consent record are excluded
- [x] Normalized-email deduplication, provenance, preference records, and suppression records implemented
- [x] Suppression/consent is checked at snapshot, queue, and immediately before SMTP submission
- [x] Paused/cancelled campaigns cannot leak queued sends
- [x] UTC schedules display in `Asia/Kolkata`
- [x] `CAMPAIGN_DELIVERY_ENABLED=false` safe deployment default; no real audience campaign was sent during implementation
- [x] Confirmation-only unsubscribe `GET` and idempotent mutation `POST`; authenticated preference center can explicitly opt back in
- [x] Counts use honest states and do not fabricate opens, clicks, delivery, or engagement

## Blog visual editor

- [x] Blogs store canonical structured editor JSON, schema version, and migration status
- [x] Visual editor is the default with a deliberate JSON source mode
- [x] Server renders a sanitized article fragment without the email shell
- [x] Legacy HTML opens in the visual editor with a visible migration/loss warning and is converted only after editing/saving
- [x] Structured revisions retain the previous JSON alongside historical HTML
- [x] Existing P2 draft/publish/unpublish/archive/restore, SEO, cover upload, and public visibility rules remain intact

## Navigation and routes

- [x] Settings / Documents → Invoice Master
- [x] Communications → Email Master, Campaigns, Email Logs
- [x] Content → Blogs
- [x] Customer account → Marketing Preferences
- [x] Public `/unsubscribe` confirmation route

## Supplied invoice reference mapping

Reference: `INV-24.pdf` (A4 portrait, compact Tally-style one-page sample).

| Reference block | Implemented source | Historical behavior |
|---|---|---|
| Seller identity, address, GSTIN, state, phone | Merchant configuration + issued snapshot | Never read from a future template after issuance |
| PAN, bank, declaration, signature | Template settings | Optional; no fabricated production identifiers |
| Invoice number/date | Stored order invoice fields | Stable `INV-<order number>` strategy and uniqueness constraint |
| Ship-to and bill-to | Order address/business snapshots | Wrapped for long addresses |
| Delivery/payment/reference metadata | Stored order metadata + template terms | Missing optional values render as blank/dash, never invented |
| Description, HSN/SAC, quantity, rate, GST, amount | Order-item/variant/tax snapshots | Never repriced |
| CGST/SGST/IGST summary | Stored order tax allocation | Jurisdiction split preserved |
| Amount in words | Deterministic Indian-number renderer | Derived from pinned stored total |
| Footer/page headings | Template/page settings | Repeated headings and page numbers on overflow |

## Verification evidence

- [x] Migration `0016_p3_content_masters.sql` applied successfully and repeated migration pass succeeded
- [x] `npm run build` at repository root — server and client production builds pass
- [x] `npm test` in `server` — **18/18 passed**
- [x] `npm run test:p3-db` — unsubscribe confirmation/no-side-effect/idempotent POST integration passed
- [x] PDF tests — reference-sized invoice stays on one A4 page; 75-item invoice spans pages with valid PDF bytes
- [x] Browser smoke — all P3 admin routes, responsive navigation, theme toggle, public unsubscribe state, logout, **0 browser exceptions**, **0 HTTP 5xx**
- [x] Seed executed successfully twice in non-destructive mode
- [x] Seed audit — 1 invoice template/version, 3 durable PDFs, 11 email templates, 13 versions, 1 non-sending campaign, 2 explicit development opt-ins, 5 structured blogs, 0 duplicate version numbers
- [x] `npm audit --omit=dev` — **0 production vulnerabilities** for both client and server after targeted dependency upgrades

## Operational note

The React Email visual editor is lazy-loaded but remains a large route chunk. This is a performance optimization opportunity, not a functional blocker. Deployment and delivery semantics are documented in `docs/P3_OPERATIONS.md`.
