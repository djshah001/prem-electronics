# MSG91 mobile OTP authentication

## Architecture decision

Prem Electronics now authenticates customers and administrators by verified mobile number. `users.auth_phone_e164` is the only phone field that can identify an account. The existing `users.phone`, address phones, names, emails, GSTINs, and order data remain contact/business data and are never used to claim an account.

New customers are not created when an OTP is requested. After successful provider proof, the server issues a short-lived, one-time onboarding continuation. The account and first application session are created atomically only after a real name is supplied. Email is optional and is used only for receipts/communications.

OTP challenges are persisted in PostgreSQL and bound to the original canonical phone, finite purpose, browser flow (or authenticated session for phone change), provider request, and expiry. Provider access tokens never leave the backend. Application sessions remain rotating, hashed refresh sessions plus short-lived HttpOnly access cookies.

## Official MSG91 operation mapping

Selected family: **OTP Widget API**, called server-to-server from Node. The custom React interface does not embed MSG91's visual widget.

| Operation    | Method and fixed host/path                                       | Server payload                                  | Accepted success                                      |
| ------------ | ---------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| Send         | `POST https://control.msg91.com/api/v5/widget/sendOtp`           | `widgetId`, `identifier` (country code, no `+`) | `type=success`, opaque `message` saved as `reqId`     |
| Retry        | `POST https://control.msg91.com/api/v5/widget/retryOtp`          | `widgetId`, stored `reqId`, SMS channel `11`    | `type=success`                                        |
| Verify OTP   | `POST https://control.msg91.com/api/v5/widget/verifyOtp`         | `widgetId`, stored `reqId`, six-digit `otp`     | `type=success`, `message` is short-lived access token |
| Verify proof | `POST https://control.msg91.com/api/v5/widget/verifyAccessToken` | `access-token` from the previous response       | `type=success`, `message` is the verified identifier  |

The account authkey is supplied only in a backend header. HTTP 200 is not sufficient: malformed bodies, `type=error`, code `201`, mismatched identifiers, already-used proofs, and ambiguous responses fail closed. Requests have an 8-second default timeout and a 32 KiB response limit. Timeout after send is reported as unknown/failed and is not automatically retried.

Primary references checked on 2026-10-22:

- https://docs.msg91.com/llms.txt
- https://docs.msg91.com/otp-widget
- https://docs.msg91.com/otp-widget/send-otp-1
- https://docs.msg91.com/otp-widget/retry-otp
- https://docs.msg91.com/otp-widget/verify-otp
- https://docs.msg91.com/otp-widget/verify-access-token

The official index and Widget overview exposed the flow and POST semantics. The supplied DocStar CLI was also attempted; initialization reached its interactive module selector, which cannot be completed non-interactively in this environment. No authenticated provider request or SMS was sent.

## API

Customer:

- `POST /api/v1/auth/otp/request` — `{ phone }`
- `POST /api/v1/auth/otp/resend` — `{ challengeId }`
- `POST /api/v1/auth/otp/verify` — `{ challengeId, code }`
- `POST /api/v1/auth/otp/cancel` — `{ challengeId }`
- `PATCH /api/v1/auth/onboarding` — `{ onboardingToken, name, email?, marketingConsent }`

Administrator (unknown or ineligible numbers receive an opaque request response and no SMS):

- `POST /api/v1/auth/admin/otp/request`
- `POST /api/v1/auth/admin/otp/resend`
- `POST /api/v1/auth/admin/otp/verify`
- `POST /api/v1/auth/admin/otp/cancel`

Authenticated phone change:

- `POST /api/v1/auth/phone-change/request` — `{ stage: "current" }` or `{ stage: "new", phone }`
- `POST /api/v1/auth/phone-change/verify` — `{ stage, challengeId, code }`
- `POST /api/v1/auth/phone-change/complete` — `{ currentProof, newProof }`

Legacy password registration, login, verification, forgot-password, and reset-password API routes are removed. Their browser routes redirect to mobile sign-in. Old email OTP/password-reset templates are removed from the catalog and archived by migration.

## MSG91 account prerequisites

1. Complete account/KYC and India DLT/sender/template requirements applicable to the merchant.
2. Create one OTP Widget configured for mobile + SMS and a six-digit OTP with approximately five-minute validity.
3. Restrict the widget to India and configure the server's outbound IP allowlist where MSG91 authkey IP security is enabled.
4. Set `MSG91_AUTHKEY` and `MSG91_WIDGET_ID` only on the server. Do not create `VITE_MSG91_*` credentials.
5. Set `OTP_PROVIDER=msg91`. Production refuses `OTP_PROVIDER=fake` and refuses missing MSG91 credentials.

`OTP_FAKE_CODE` is only for the injected local/test provider. It is never returned by routes or logged. Run local development with `OTP_PROVIDER=fake`; use an owned test number and a separately approved smoke procedure for live SMS.

## Identity audit and mapping

Run the audit before migration and again afterward:

```powershell
cd server
npm run auth:audit-identities
```

It reports exact user IDs, privileged users, missing/invalid untrusted contact numbers, trusted identities, and canonical duplicates without changing data.

Create a private file outside source control:

```json
[{ "userId": "reviewed-existing-user-uuid", "phone": "+919876543210" }]
```

Validate it without writes, then apply only after human review:

```powershell
npm run auth:map-phones -- D:\private\auth-phone-mappings.json
$env:AUTH_MAPPING_ACTOR='operator-name'; npm run auth:map-phones -- D:\private\auth-phone-mappings.json --apply
```

Bootstrap the first administrator by promoting one explicitly reviewed existing user. Create a private file outside source control:

```json
{
  "userId": "reviewed-existing-user-uuid",
  "phone": "+919876543210",
  "role": "admin"
}
```

Run a dry-run first. Applying requires a named operator and a confirmation containing the same user ID:

```powershell
npm run auth:bootstrap-admin -- D:\private\admin-bootstrap.json
$env:AUTH_BOOTSTRAP_ACTOR='operator-name'; npm run auth:bootstrap-admin -- D:\private\admin-bootstrap.json --apply --confirm-user=reviewed-existing-user-uuid
```

The command is idempotent for the same user, role, and phone. It rejects unknown or blocked users, duplicate phones, and accidental superadmin downgrades. On change it revokes prior sessions and records the role transition plus hashed before/after phone identities in the audit log. It is not an HTTP endpoint and does not contain a hardcoded administrator identity or credential.

## Cutover

1. Back up PostgreSQL and deploy to staging first.
2. Run `auth:audit-identities`; resolve every intended legacy/customer/admin mapping and every duplicate.
3. Configure the OTP Widget and production secrets. Set a new `AUTH_TOKEN_VERSION` value (for example `otp-v1`) at cutover.
4. Run `npm run db:migrate`. Migration `0019_msg91_otp_auth.sql` is non-destructive: it keeps user IDs, passwords as dormant rollback data, orders, carts, addresses, GST profiles, and audit history. It revokes existing refresh sessions and clears outstanding legacy OTP/reset secrets.
5. Apply reviewed phone mappings, with the first admin mapping first.
6. Deploy server and client together. Validate `/auth/me`, customer/admin OTP, cart merge, checkout, addresses, GST, orders, and cancellation.
7. Only after observation, schedule a separate reviewed migration to remove dormant password columns. This change intentionally does not drop them.

### Rollback

Rollback application binaries and rotate `AUTH_TOKEN_VERSION`/session signing material again. Do not silently expose the old password routes while the OTP build is active. Preserve `0019` tables and identity audit records during incident rollback; reversing schema is a separate, reviewed database operation. Export applied mappings before clearing any trusted auth phone. All users must authenticate again after either cutover or rollback.

## Recovery and operations

If the old login phone is unavailable, the UI directs the customer to merchant support. Recovery is a private reviewed mapping procedure using the exact existing user ID; email, GSTIN, order number, name, or address alone are never sufficient. There is no public recovery or account-merging endpoint.

Expired challenges are marked during auth traffic and records older than seven days are deleted in bounded batches. Application limits count initial sends and resends together, persist in PostgreSQL, and cover phone, IP/device, and global budgets. Express proxy trust remains disabled unless deployment networking is explicitly reviewed.

## Verification status (2026-10-22)

- **VERIFIED** — server TypeScript build and 24/24 unit tests; client TypeScript/Vite production build; client lint exits successfully (existing unrelated warnings remain); password endpoints absent from router; server authkey absent from client source.
- **IMPLEMENTED BUT UNVERIFIED** — migration execution, persistent challenge concurrency against PostgreSQL, private identity mapping, checkout/cart/GST regressions. The configured database resolves to a remote host and was intentionally not modified.
- **IMPLEMENTED BUT UNVERIFIED** — live MSG91 send/retry/verify/proof flow. No credentials were used and no SMS credits were spent.
- **BLOCKED** — concrete unresolved historical identity list. The read-only audit command was attempted, but sandbox networking rejected the configured remote PostgreSQL host with `EACCES`; run the audit from an authorized environment before cutover.
- **PARTIAL** — browser automation/live mobile delivery. UI compiles, but no configured browser/provider account was available for an end-to-end SMS run.
- **MISSING** — none in the scoped password-to-mobile authentication implementation; production rollout remains gated by the unverified items above.
