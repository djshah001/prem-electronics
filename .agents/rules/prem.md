# Prem Electronics — Project Skills & Implementation Guide

## 1. Purpose and authority

Build and maintain the Prem Electronics e-commerce storefront and administration application. This file gives coding agents the project context, required capabilities, architecture, implementation order, and acceptance criteria.

Read this file before changing the project. Follow the user's latest instructions and existing repository conventions. Inspect the implementation before assuming a feature is missing or rebuilding it. Complete features across database, API, and UI; a placeholder page or an API without its requested interface is not complete.

This is a repository project guide, not an installed agent skill. Keep it at the project root and explicitly include it in coding-agent context. Automatic loading depends on the IDE; `SKILLS.md` is not a universal auto-discovery filename.

### Source and limitations

- Source: [shared Gemini conversation](https://share.gemini.google/Euci6yhX0OvH), reviewed on 2026-10-02; conversation title: **Prem Electronics**.
- The visible conversation establishes the stack and successive feature requests. Later user corrections supersede earlier suggestions.
- Attached `requirements.txt`, `responseHandler.js`, `asyncHandler.js`, `errorHandler.js`, and `logger.js` cannot be viewed or downloaded from Gemini's shared conversation. Their exact contents and the full referenced quotation are unverified. Obtain those files before claiming full quotation compliance.
- The conversation says a client and server were already generated. Their current code, schema, and runtime behavior have not been inspected for this document.
- Sections marked **engineering default** resolve gaps; they are recommendations, not additional requirements claimed from the attachments.

## 2. Required engineering capabilities

| Capability | Project responsibility |
| --- | --- |
| React and TypeScript | Responsive storefront, account screens, and working admin forms |
| Express and ES Modules | Feature-based APIs, validation, authorization, consistent errors |
| PostgreSQL and Drizzle | Relational models, JSONB attributes, migrations, transactional operations |
| TanStack Query | API cache, query keys, mutations, loading/error states, invalidation |
| Jotai | Client UI state, guest cart, themes, sidebar and promotional popup state |
| TanStack Table and shadcn/ui | Reusable tables with server-side pagination, filtering, sorting, selection |
| Razorpay | Server-calculated checkout, payment verification, webhook reconciliation |
| Nodemailer | Email verification, password reset, order confirmations |
| Upload handling | Product/category image uploads, previews, validation, storage integration |
| Quality assurance | Meaningful integration tests and browser verification of user workflows |

## 3. Technology decisions

| Area | Required tools or conventions |
| --- | --- |
| Frontend | React, React DOM, Vite, strict TypeScript |
| Routing | React Router (`react-router-dom`) with storefront, account, auth, and admin layouts |
| Server state | `@tanstack/react-query` |
| Client state | `jotai`; do not replace with Zustand |
| HTTP client | `axios`; shared client and bounded auth/error interceptors |
| Styling | Tailwind CSS, shadcn/ui, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority` |
| Animation | Aceternity UI components and their compatible Motion/Framer Motion dependencies |
| Tables and charts | `@tanstack/react-table`; shadcn chart components built on `recharts` |
| Backend | Node.js, Express, TypeScript, `import`/`export`, backend `"type": "module"` |
| Database | PostgreSQL, `pg`, `drizzle-orm`; `drizzle-kit` for migrations |
| Validation | `zod` for environment, bodies, parameters, queries, and boundary contracts |
| Authentication | `jsonwebtoken`, `bcrypt` or `bcryptjs`, `cookie-parser` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Payments | Backend `razorpay`; frontend `react-razorpay` with Standard Checkout |
| Email | `nodemailer`; do not replace with Resend |
| Uploads | `multer`; local development storage or a configured object-storage adapter |
| Configuration | `dotenv`, validated environment settings |
| Development | TypeScript tooling, `nodemon` or `tsx`, linting and formatting |
| Logging | Structured logger compatible with existing code; Pino/Winston are defaults if needed |

Install additional packages only for a concrete need. shadcn/ui and Aceternity are component source systems; include the dependencies required by the components actually used. Match Tailwind build and animation packages to the installed major version rather than copying an outdated package list. Pin compatible versions in the lockfile. Use Express's built-in JSON/urlencoded parsers unless `body-parser` is specifically needed. Preserve raw webhook bytes before JSON parsing.

## 4. Backend architecture

Retain the requested feature-first structure, adapting the existing repository rather than moving working code unnecessarily:

```text
server/
  src/
    app.ts
    server.ts
    config/env.ts
    core/
      errors/appError.ts
      logger/logger.ts
      middlewares/
        asyncHandler.ts
        errorHandler.ts
        authGuard.ts
        rateLimiter.ts
      utils/responseHandler.ts
    infrastructure/
      database/
        db.ts
        schema/
      payment/razorpay.ts
      mail/mailer.ts
      storage/
    modules/
      auth/
      users/
      categories/
      products/
      cart/
      orders/
      payments/
      coupons/
      reviews/
      wishlists/
      blogs/
      admin/
      uploads/
```

Each domain has `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, and `*.schema.ts` as needed. Domain repositories own ORM access; infrastructure owns the connection and schema. Cross-domain work uses explicit services/repositories. Transaction-dependent repositories must accept the transaction context.

- Routes declare middleware and endpoints.
- Controllers extract validated input, call services, and send responses.
- Services own business rules, transactions, and external integration orchestration.
- Repositories perform database queries.
- Schemas define validated request contracts.
- `app.ts` configures/export the app without listening; `server.ts` validates configuration, initializes resources, and listens.
- Mount APIs under `/api/v1`. Use consistent admin namespaces for protected operations and maintain compatibility with existing callers where appropriate.

Modernize the attached utility files when they become available. Remove Mongoose/MongoDB-specific assumptions. Handle Zod validation, PostgreSQL constraints, known application errors, and unexpected exceptions. Do not expose database details, secrets, or production stack traces. Adapt error handling to the installed Zod and Express versions; do not copy Gemini's snippets blindly.

## 5. Frontend architecture and state boundaries

```text
client/src/
  api/
  components/
    ui/
    animated/
    layout/
    shared/
  hooks/
  store/
  pages/
    storefront/
    customer/
    admin/
    auth/
  routes/
  types/
```

Use TanStack Query as the authority for fetched products, categories, authenticated profiles, orders, stock, and analytics. Use Jotai for local interaction state and guest state. Do not keep independent, competing copies of the same server data in atoms. The server remains authoritative for prices, permissions, stock, and authenticated carts.

Keep query keys scoped by resource, record ID, filters, pagination, sorting, and analytics date range. Invalidate relevant lists, detail views, statistics, and inventory queries after mutations. Clear user-specific cache and state at logout. Refresh interceptors must have bounded retries and handle concurrent requests without loops.

## 6. Functional scope

### Authentication and accounts

- Email/password registration and login.
- Email OTP verification through Nodemailer.
- Password reset with expiring, single-use tokens.
- Roles: `customer`, `admin`, `superadmin`; enforce permissions on the server.
- Secure HTTP-only authentication cookies and the established refresh/logout flow.
- Customer profile, saved shipping/billing addresses, order history, and wishlist.
- Admin customer list, customer details/order history, account status, and block/unblock actions.

### Categories and catalog

- Build a working category manager before enabling product creation.
- Support hierarchical categories, banners/images, names, slugs, and SEO-friendly URLs.
- Prevent parent cycles and invalid parent references.
- Every product must reference an existing eligible category; enforce this in both UI and API.
- If categories are absent, explain the dependency and link the admin to category creation.
- Product fields: title, slug, description, SKU, barcode, brand, category, stock quantity, low-stock threshold, price, sale price, image gallery, tags, dynamic attributes/variants, `isActive`, `isFeatured`, `isNewArrival`, and `isBestSeller`.
- Search and filters: price, brand, color/size, rating, stock status, category, and relevant product text; add navbar search suggestions.
- Product details, image gallery, prices, stock indicators, and add-to-cart behavior.

### Product manager — mandatory workflow

1. Admin creates a category.
2. Admin opens Add Product and selects that category from API-backed options.
3. Admin uploads image files through a drag-and-drop zone or file picker.
4. Show previews, upload progress/errors, remove controls, and ordered gallery data.
5. Admin enters attributes through editable rows: **Attribute Name** and **Value**, with Add Row and Remove actions.
6. Convert rows to a documented JSONB structure, such as `{ name, value }[]`; validate server-side. Do not make raw JSON editing the required workflow.
7. Admin saves the product and sees updated table data and statistics.
8. Admin can activate/deactivate from the form or listing; both directions must persist.

Never hard-delete products. Single and bulk deletion requests deactivate them (`isActive = false`). Use **Deactivate Selected** wording for products. Hide inactive products from public listings, search, suggestions, and purchasing; preserve historical order references. Admins can filter and restore inactive products.

**Engineering default:** Attributes such as wattage/material are JSONB metadata. Independently purchasable variants with distinct SKU, price, or stock should have relational variant records; do not rely on an opaque JSON blob for inventory updates.

### Shopping, pricing, and orders

- Guest cart plus persisted authenticated cart, including a documented login merge rule.
- Wishlist hearts, wishlist page, remove actions, and move-to-cart behavior.
- Server-side price and stock revalidation during checkout.
- Coupons: fixed/percentage discounts, expiry, minimum purchase, and configured eligibility/usage limits.
- Tax and shipping calculations; keep rates and business rules configurable until supplied.
- Checkout with saved/new addresses and Razorpay payment.
- Order success/details, invoice generation, and confirmation emails.
- Admin order listing/details and supported fulfillment transitions: pending, processing, shipped, delivered, cancelled.
- Cancellation, returns, and refund workflow with explicit statuses and permitted transitions.
- Keep payment status, fulfillment status, return status, and refund status separate.

### Content and marketing

- Blog list/details with slugs, cover image, author, active/publication state, SEO title/description, and sharing controls.
- Admin blog management is an engineering default needed to maintain this content.
- Verified-buyer ratings/reviews with pending approval, admin approve/reject actions, and approved public display.
- First-order discount promotional popup with persistent seen/dismissed state in Jotai/local storage. Server-side coupon rules must enforce eligibility.

## 7. Admin experience

Build a responsive admin shell with:

- Sticky header, light/dark toggle, **View Storefront**, profile menu, and functional logout.
- Collapsible sidebar with icon-only mode, accessible labels, mobile navigation, active links, and logical submenus.
- Suggested groups: Overview; Catalog (Categories, Products, Inventory); Sales (Orders, Transactions, Coupons); Customers (Customers, Reviews); Content (Blogs); System (Settings, if implemented).
- Working pages for categories, products, low stock, analytics, customers, orders, coupons, and review moderation; include supporting content/payment pages where exposed.
- Basic metric cards for each module, with clearly defined measures.
- Dashboard charts using shadcn/Recharts: revenue over time, orders over time, sales by category, and relevant stock/customer summaries.
- Low stock list and quick stock update action; variant-aware where applicable.

All statistics must come from the database. Define whether each card is global or filter-scoped. Define analytics timezone/date ranges and exclude failed/unpaid transactions from revenue. Account for refunds under the chosen revenue definition. Visitor reports require actual tracking; do not fabricate visitor numbers.

## 8. Server-side tables, APIs, and bulk actions

Every admin list uses shadcn table primitives plus TanStack Table. Pagination, search, filtering, and sorting operate on the server across the full matching dataset.

### List contract

```http
GET /api/v1/admin/products?page=1&limit=20&search=fan&sortBy=createdAt&sortOrder=desc&isActive=true
```

```json
{
  "success": true,
  "message": "Products fetched",
  "data": [],
  "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 }
}
```

- Validate query parameters, cap page size, allowlist sortable fields, and parameterize values.
- Use identical filters for the list and total count; add stable tie-breaking order.
- Enable manual pagination, sorting, and filtering in TanStack Table.
- Translate its zero-based page index to the API's one-based page number.
- Include all table controls in query keys; debounce search and reset to the first page when filters/sort change.
- Do not fetch everything and sort/filter/slice it in the browser.
- Support selected rows, pagination controls, loading skeletons, empty states, errors/retry, and visible mutation outcomes.
- Scope selection explicitly; do not claim to select all records when only the current page is selected.

### Endpoint coverage

Include protected category/product/customer/order lists, category/product writes, account block actions, module stats, `/admin/analytics`, `/admin/inventory/low-stock`, review moderation, upload handling, and bulk operations. Use `/api/v1/upload` for the requested image endpoint unless maintaining an existing equivalent.

The conversation requests `POST /api/v1/[module]/bulk-delete` with `{ "ids": [...] }`. Preserve that contract or use a consistently documented admin equivalent and update all clients. Implement bulk actions for requested modules, respecting resource lifecycles:

| Resource | Bulk action behavior |
| --- | --- |
| Products | Deactivate only; allow reactivation |
| Categories | Archive or reject when dependencies would be invalidated |
| Customers/users | Deactivate/block while preserving order history; protect privileged accounts |
| Orders | Archive from operational views while preserving payment/order history |
| Other managed modules | Define delete/archive semantics and dependent records explicitly |

Non-product archival semantics above are **engineering defaults** because the source does not define them. Do not implement cascading loss of transaction history as a shortcut. Validate/deduplicate IDs, cap batch size, enforce per-resource permissions, and return explicit success/failure outcomes. Do not show a bulk button that has no implemented API.

## 9. Database, migrations, uploads, and seeds

Model users, addresses, categories, products, variants where needed, carts/items, orders/items, payment attempts, coupons/redemptions, wishlists, reviews, blogs, and webhook deduplication records.

- Use foreign keys, unique slugs/SKUs, unique wishlist pairs, timestamps, and business-appropriate constraints/indexes.
- Store money in integer minor units or exact decimal values; document conversions and rounding.
- Snapshot purchased item description, SKU, unit price, discounts, tax, and addresses on orders.
- Generate and review versioned migrations. Avoid schema push against production.
- Uploads require admin authorization, configured file count/size/type limits, generated filenames, content checks, and a storage adapter. Return asset identifiers/URLs; do not trust arbitrary client filesystem paths.
- Local development uploads need correct static serving. Production storage must survive restarts/deployments; use object storage or durable storage appropriate to the host.
- Keep linked assets and gallery records consistent; account for abandoned uploads.
- Seed categories before products and users before their orders. Include variants/attributes, active/inactive products, low-stock examples, reviews, coupons, and order states.
- Seed realistic electronics demo data, not invented merchant inventory or actual customer data.
- Default seeds should be repeatable without clearing existing business records. Any reset mode must target an explicitly disposable development/test database; never truncate production.

## 10. Payments and critical business invariants

The frontend submits item IDs, quantities, addresses, and coupon input. The backend owns the final amount and creates the Razorpay order. Store the local/provider order mapping, customer ownership, currency, and amount.

Verify Checkout signatures against the server-stored provider order ID and reconcile captured/paid provider state before fulfillment. Verify webhook signatures using raw request bytes and the webhook secret; deduplicate event IDs. Never expose payment secrets or trust the frontend success screen as payment confirmation.

**Engineering defaults:** Use one idempotent payment-finalization path shared by callbacks and webhooks. Check amount/currency/order linkage. Apply stock/order/payment changes transactionally, and reserve stock with expiration or an equivalent concurrency-safe strategy before external checkout. Define recovery for provider success followed by local persistence failure. Queue confirmation email after commit with retries so an SMTP error cannot undo a successful payment. Track pending/failed/captured/refunded states and partial refunds separately.

Authoritative references to consult during implementation:

- [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps)
- [Razorpay payment verification practices](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/best-practices)
- [Razorpay webhook validation and duplicate events](https://razorpay.com/docs/webhooks/validate-test)
- [TanStack Table server-side processing](https://tanstack.com/table/latest/docs/guide/client-side-vs-server-side)

## 11. Security and UI quality

- Validate configuration at startup; provide `.env.example` without secrets. Validate numeric ports and required integration settings appropriately.
- Use secure cookies in production, deliberate SameSite/CORS settings, and CSRF protection suitable for cookie-authenticated mutations.
- Enforce ownership checks for customer resources and role checks for admin operations. Blocking an account must affect its access.
- Hash passwords; expire/hash verification and reset secrets; rate-limit sensitive endpoints. Keep secrets, tokens, payment details, and personal information out of logs.
- Sanitize rich content before rendering and validate uploaded content.
- Apply semantic light/dark tokens to the entire application: storefront, forms, dialogs, tables, charts, tooltips, and empty states. Persist preference and honor reduced-motion settings.
- Provide keyboard access, labels, focus management, readable contrast, and responsive layouts.
- Buttons must perform their labeled action; use understandable validation messages and success/error feedback.

## 12. Implementation sequence

1. **Audit:** inspect repository instructions, packages, routes, schema, migrations, seeds, utility files, and current UI. Map every requirement above to implemented/missing/broken behavior. Preserve working features.
2. **Foundations:** validate env, database connection, API response/errors, auth/roles, schemas, and reviewed migrations. Establish upload and server-side list/bulk/stats contracts.
3. **Admin shell:** implement header, logout, storefront link, sidebar groups/collapse/mobile behavior, and global themes.
4. **Categories:** finish API, table, create/edit form, images, hierarchy, dependency rules, and bulk actions. Verify creation end to end.
5. **Products:** finish category-linked forms, image uploads, attribute rows, activation/deactivation, variants, server-side table controls, bulk deactivation, and stats.
6. **Inventory and customers:** implement low stock/updates, customer lists/details/history, block actions, and module stats.
7. **Commerce:** complete storefront discovery, cart sync, pricing/coupons, addresses, checkout, payment reconciliation, orders, invoices, and emails.
8. **Remaining modules:** complete fulfillment/returns/refunds, wishlist, reviews/moderation, blogs, promotional popup, and analytics.
9. **Seeds and verification:** update seeds to the final schema, run appropriate checks, verify real workflows in the browser in both themes, and fix errors before delivery.

Complete the database → API → UI → verification loop for each feature. Do not stop after scaffolding or report a feature complete because its route renders.

## 13. Acceptance criteria and definition of done

- [ ] No required route crashes or displays an implementation placeholder.
- [ ] Admin can create a category, then create/edit a product referencing it.
- [ ] Invalid/missing category assignments are rejected by the API.
- [ ] Multiple product images upload, preview, persist, and display after reload.
- [ ] Attribute rows add/remove/edit and survive a save/reload round trip.
- [ ] Single and bulk product deactivation preserve records; reactivation works.
- [ ] Inactive products cannot be newly purchased; historical orders remain readable.
- [ ] Admin search, filters, sorting, and pagination query the full server dataset.
- [ ] Bulk actions and module cards reflect persisted results.
- [ ] Header/logout/storefront navigation and expanded/collapsed sidebar work.
- [ ] Light and dark modes work throughout storefront and admin.
- [ ] Low stock, customers, analytics, orders, coupons, and review moderation have functional interfaces.
- [ ] Wishlist, blog, reviews, search suggestions, and promotional popup work as described.
- [ ] Checkout rejects client price manipulation, unavailable stock, and invalid coupons.
- [ ] Forged signatures fail; repeated callbacks/webhooks do not duplicate stock changes or orders.
- [ ] Unauthorized roles and cross-customer resource access are rejected.
- [ ] Migrations and safe seeds run against a clean development database.
- [ ] Typecheck, lint, builds, and relevant integration tests pass; browser verification covers the requested user journeys.

Use focused tests for payment replay, inventory concurrency, authorization, relational constraints, and server-side list behavior. Do not create tests that merely repeat implementation internals. Report what passed, any actual blockers, and remaining unverified behavior. Never claim production readiness or full attached-requirements compliance without evidence.

## 14. Decisions still needing project input

Keep these visible as unresolved until supplied: inaccessible requirements/quotation and utility files; current source repository; branding/assets and actual inventory; hosting and durable storage; tax/shipping rates; coupon policy; cancellation/return/refund eligibility; invoice fields; SMTP/Razorpay configuration; guest checkout policy; advanced electronics variant rules; non-product deletion semantics; and visitor tracking requirements.

Proceed with reversible engineering work using the defaults above. Ask only when a missing decision changes required behavior or an external integration cannot proceed. Record decisions here as the project evolves.
