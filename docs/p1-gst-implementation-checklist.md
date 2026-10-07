# P1 GST/company purchasing implementation checklist

Updated: 2026-10-03

## Completed and verified locally

- GSTIN normalization, structural validation and checksum rejection before provider access.
- Provider-independent lookup adapter with explicit unconfigured, timeout, not-found and development-fixture behavior.
- ClearTax taxpayer-information adapter configuration; no portal scraping.
- Account-owned, expiring verification records and versioned business profiles.
- Same GSTIN may be saved independently by multiple accounts; one active default per account is enforced by a partial unique index.
- Verified legal identity fields cannot be supplied or overwritten by the client.
- Editable nickname, contact and invoice billing details do not require reverification; GSTIN changes use a new lookup.
- Optional signup handoff, `/account/businesses`, and checkout lookup/save/select flows.
- Personal/company checkout choice, representative acknowledgement and optional PO/reference.
- Variant ID is retained through checkout validation and order creation.
- Guest-cart merge uses an account-scoped replay token, add-and-clamp semantics, variant ownership checks and disclosed rejected/adjusted lines.
- Payment finalization consumes only unchanged purchased cart quantities; additions remain and lower quantities are treated as intentional edits.
- Product HSN and GST-rate basis-point fields, with admin inputs.
- Integer-paise pricing, deterministic discount allocation and per-line rounding.
- Ordinary domestic goods-movement place-of-supply handling with CGST+SGST/UTGST or IGST split.
- Immutable seller, buyer business, billing, shipping, pricing-policy, tax and line-level classification snapshots.
- Invoice number is assigned after captured payment; order print view uses persisted snapshots and does not claim IRP/e-invoice registration.
- Migrations `0010_gst_business_invoices.sql` and `0011_seller_invoice_snapshot.sql` applied successfully to the local database.
- Server/client production builds pass; 8 focused payment/GST tests and 2 PostgreSQL integration tests pass; client lint has warnings only in pre-existing files.

## External setup / verification still required

- Configure a real approved provider and credentials; live GST lookup was not performed.
- Configure the merchant's real GSTIN, legal invoice address and supplier state code. Company checkout deliberately returns 503 until these are valid.
- Confirm catalogue HSN/rates, inclusive/exclusive pricing mode and shipping tax treatment with the merchant/accountant.
- Perform the documented browser journey with real provider test credentials and Razorpay test credentials.

## Outside this GST increment but still not complete in the full supplied prompt

The repository audit does not support a blanket “full prompt complete” verdict yet. The existing code still needs separate work for durable S3-compatible asset records/cleanup, serializable category hierarchy locking, item/quantity return records, persisted partial refund intents and credit-note allocation, a binary PDF invoice endpoint, and refund-aware analytics. These should remain tracked rather than being inferred complete from the earlier checklist.
