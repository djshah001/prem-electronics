# P3 operations and safety notes

## Invoice artifacts

- Issued PDFs are stored in PostgreSQL as immutable `bytea` artifacts with a SHA-256 digest, page count, renderer version, template-version pointer, and order/seller/buyer/template snapshots.
- Database backups therefore include the legally displayed PDF; monitor database growth and retention in production.
- Orders invoiced before the versioned renderer launch cutoff (`2026-10-05T00:00:00Z`) are explicitly marked legacy and do not claim a template-version association.
- Invoice generation reads stored order/item/tax snapshots. It does not reprice an order.
- The customer and administrator PDF endpoint applies the existing order-ownership/admin authorization checks.

## Email delivery semantics

- `smtp_accepted` means the configured SMTP server accepted the recipient. It does not mean inbox delivery, reading, or engagement.
- Delivery jobs pin an immutable template version and rendered subject/HTML/plain-text snapshots. Unique dedupe keys prevent the application from intentionally submitting the same event twice.
- Leases reduce concurrent worker duplication, but SMTP submission has an unavoidable ambiguous interval. The system does not claim exactly-once delivery.
- Authentication jobs have higher priority and expiry timestamps. Invoice/order emails can attach only database-owned PDF buffers; Nodemailer file and URL access are disabled.
- Preview and test-send endpoints are admin protected and rate limited. Test recipients are restricted to the signed-in admin and `EMAIL_TEST_RECIPIENTS`.

## Campaign controls

- Legacy accounts without an explicit preference record are excluded.
- Audience snapshots include only explicit opt-ins and deduplicate normalized email addresses.
- Suppression and consent are checked again immediately before SMTP submission.
- `CAMPAIGN_DELIVERY_ENABLED=false` is the safe default. Campaign test sends are separate, explicit admin actions and target only the signed-in admin.
- Schedule timestamps are stored in UTC and displayed in the admin UI using `Asia/Kolkata`.
- Unsubscribe `GET` validates and displays a confirmation only. The idempotent `POST` performs the preference withdrawal and suppression.

## Worker deployment

The API process polls scheduled campaigns and delivery jobs every 60 seconds. Database leases and conditional status updates allow multiple API instances to poll safely. For higher throughput, move the same service calls to a dedicated worker process without changing job semantics.
