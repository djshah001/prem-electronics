# P2 security, table and analytics contracts

## Authentication and logout

Access JWTs contain a server session ID (`sid`). Refresh rotation creates a new row in the same `auth_sessions.family_id`. Every protected request verifies that its `sid` is active. Logout resolves the family from either cookie and revokes all active rows in that family, which closes refresh/logout races without signing out unrelated device families.

The client increments a local session generation before logout, prevents late refresh responses from restoring the session, cancels queries, removes only `prem_user`, the legacy `prem_token`, cart-merge operation state and pending business setup state, and broadcasts logout to other tabs. Guest cart and theme/sidebar preferences are retained.

## Server-side list contract

P2 lists accept one value per parameter. `page` is one-based and positive; `limit` is 1-100; search is trimmed/bounded; booleans accept only `true` or `false`; sort fields are module allowlists. Repeated, fractional, negative, over-limit and unsupported values return a validation error. Queries use a deterministic ID tie-breaker. Offset pagination is stable for a fixed dataset; inserts/updates between requests can move rows, as expected with offset pagination.

Statistics returned by `/api/v1/admin/stats` are global current-database totals and do not use the visible page length. Inventory/customer account state cards are labeled current snapshots.

## Analytics definitions

- Default timezone: `Asia/Kolkata`.
- Date-only inputs are inclusive local calendar dates, converted to a UTC start-inclusive/end-exclusive interval.
- Maximum range: 366 days.
- Gross collections: unique local `payment_attempts` in captured/refunded state, by `captured_at`.
- Processed refunds: `payment_refunds` in processed state, by `processed_at`; pending/failed rows are excluded.
- Net collections: gross collections minus processed refunds, in one requested currency.
- Daily collections are event-date cash flow. Daily order counts/statuses are explicitly order-created-date measures.
- Category merchandise sales use order-item `taxable_minor`, quantity and category snapshots. Rows migrated from older orders are marked `current_fallback`; missing evidence is `Unknown / legacy`.
- Refund rows can persist merchandise/tax/shipping allocations. Analytics reports unresolved legacy allocations instead of inventing category reductions.
- Stock is a current snapshot of active product variants using `stock_quantity - reserved_quantity`. Product and variant stocks are not added together.
- Purchasing customers have at least one captured payment event in range. Repeat purchasers have more than one distinct captured payment.

## Blog sanitization policy

The server sanitizes before persistence and again on every public/admin read to protect legacy rows. Allowed body formatting is limited to paragraphs, line breaks, emphasis, headings 2-4, blockquotes, code/preformatted blocks, lists, safe links, approved images, tables and horizontal rules. Event handlers, scripts, forms, embeds, iframes, inline styles and unsafe URL schemes are removed. External links receive `noopener noreferrer nofollow`.

Blog body images and covers must use `/uploads/`, `/assets/`, the configured client host, or an HTTPS host listed in `BLOG_IMAGE_HOSTS`. Titles, excerpts, alt text and SEO fields remain plain text and are rendered through React escaping.

Legacy remediation is dry-run by default:

```powershell
npm.cmd run blogs:remediate
$env:BLOG_REMEDIATE_APPLY='true'; npm.cmd run blogs:remediate
```

Applied remediation stores the original body in `blog_content_revisions` before changing content. Run it first against a disposable development copy and review the dry-run report.
