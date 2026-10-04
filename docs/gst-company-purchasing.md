# GST company purchasing

Customers may create accounts without a GSTIN. An optional signup choice resumes business setup after email verification. The same setup is available at `/account/businesses` and checkout.

GSTIN input is normalized and its checksum is checked before a provider request. A successful lookup creates an account-owned, expiring verification record. Legal name, GSTIN, registration status and registration state come only from that record; customers may edit contact details and the distinct invoice billing address. Only active, fresh verifications can be used at checkout. Public taxpayer lookup does not prove authority, so company checkout requires an explicit representative acknowledgement.

Business profiles use optimistic versions and one partial unique default per account. The same GSTIN may be stored by different accounts without sharing contact or billing data. Removing a profile archives it. Orders retain immutable business, billing, delivery and tax snapshots after profile edits or archival.

## Provider configuration

Set `GST_PROVIDER=cleartax` with `GST_PROVIDER_BASE_URL`, `GST_PROVIDER_AUTH_TOKEN`, and `GST_PROVIDER_TAXABLE_ENTITY_ID`. The adapter uses the provider taxpayer-information endpoint and has a configurable timeout. Provider failures return an error and never create a false successful verification.

For local development only, set `GST_PROVIDER=fixture` and `ALLOW_GST_FIXTURES=true`. The fixture GSTIN is `27AAPFU0939F1ZV`; it is clearly labelled development data. Production rejects the fixture provider at startup. Live lookup remains unverified until real provider credentials are supplied.

## Pricing and place of supply

Money is converted to integer paise. Coupon discount is allocated proportionally across lines with the final line receiving any integer residual. Tax is rounded half-up per line in the minor unit. Each product may set an HSN code and GST rate in basis points; otherwise the configured `TAX_RATE` is used. `TAX_MODE` is `exclusive` or `inclusive`, and every order records `PRICING_POLICY_VERSION`.

The implemented tax scenario is ordinary domestic taxable goods movement in India. Place of supply is the state where movement terminates for delivery. `SUPPLIER_STATE_CODE` equal to place of supply produces CGST plus SGST/UTGST; a different code produces IGST. Shipping is currently a separately charged, non-taxed amount. Exports, SEZ supplies, installation/assembly, on-board delivery, and third-party bill-to/ship-to deemed-receipt cases are not supported; accounting rules must be supplied before adding them.

Company checkout does not change the tax rate or create a discount. A taxpayer lookup or generated invoice does not generate an IRN, file GST returns, or constitute an IRP-registered e-invoice.

## Invoice configuration

Set real `MERCHANT_NAME`, `MERCHANT_GSTIN`, `MERCHANT_ADDRESS`, `MERCHANT_PHONE`, `MERCHANT_EMAIL`, and `SUPPLIER_STATE_CODE` values. Legal fields intentionally have no fabricated defaults. Invoice identifiers are assigned only after captured payment; order details render the persisted seller, buyer, delivery, classification and tax snapshots available for that order.
