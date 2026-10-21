# Admin notifications and offline refund policy

## Current business policy

- Customers may cancel only orders in `pending` or `confirmed` fulfilment state.
- Cancelling an unpaid order changes its pending payment state to failed and releases reserved inventory once.
- Cancelling a paid order keeps the payment marked paid. It does not create a refund, mark a refund pending, or call the payment provider.
- Return and refund requests are handled directly by the store, outside this website. The former customer return and admin return/refund mutation endpoints no longer exist.
- Razorpay checkout, signature verification, capture reconciliation, and invoice issuance remain unchanged.
- The signed `refund.processed` webhook is passive reconciliation only. It cannot initiate a refund. A partial provider refund sets `refund_status=partial`; a full provider refund sets the payment and order to refunded.
- Admin transaction/order views may show externally confirmed refund history, but expose no refund action.

## Admin notification model

Every operational event is stored once in `admin_notifications` using a unique `event_key`. A separate `admin_notification_recipients` row gives every active, verified admin or superadmin independent read state. No public notification-create endpoint exists.

Supported events:

| Event | Trigger | Severity | Destination |
| --- | --- | --- | --- |
| `new_order` | Inventory reservation and order commit | info | Order detail |
| `payment_confirmed` | Verified capture commit | success | Order detail |
| `payment_failed` | Provider/signature verification failure | error | Order detail |
| `order_cancelled` | Valid cancellation commit | warning | Order detail |
| `external_refund_confirmed` | Signed provider refund webhook | warning | Order detail |
| `low_stock` | Stock crosses its configured threshold | warning | Inventory |
| `out_of_stock` | Stock crosses to zero | error | Inventory |
| `customer_registered` | Customer account creation | info | Customer detail |
| `review_pending` | Verified buyer submits a review | info | Review moderation |
| `email_delivery_failed` | A tracked email exhausts all retry attempts | error | Email logs |

Admin-only API:

- `GET /api/v1/admin/notifications`
- `GET /api/v1/admin/notifications/unread-count`
- `PATCH /api/v1/admin/notifications/:id/read`
- `PATCH /api/v1/admin/notifications/:id/unread`
- `POST /api/v1/admin/notifications/read-all`

The client polls every 25 seconds only while the document is visible, refreshes on focus, caps the bell badge at `99+`, and provides retry, empty, filtered, and paginated states.

## Test-data reset

The seed contains no return workflow or refund ledger fixtures. A destructive reset is blocked in production and requires the exact database name in `SEED_RESET_CONFIRM`. A disposable database whose name does not include `dev`, `test`, or `local` additionally requires `SEED_RESET_TEST_DATABASE=true`.

## Deployment

1. Run `npm run db:migrate` in `server` to add notification tables, indexes, recipient constraints, and the partial refund state.
2. If an older environment contains website-created refund rows that never reached a provider, run `src/infrastructure/database/maintenance/disable_pending_refund_initiation.sql` once. It preserves the ledger rows, labels them failed/disabled by policy, and has no external side effects. Rows with a provider reference remain available for passive webhook reconciliation.
3. Deploy the server before the client. The notification UI normally updates within 25 seconds while visible and immediately on window focus.
