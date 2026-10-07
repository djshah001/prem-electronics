import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  pgEnum,
  json,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

export const returnStatusEnum = pgEnum('return_status', [
  'none',
  'requested',
  'approved',
  'rejected',
  'completed',
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'none',
  'pending',
  'processed',
]);
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';
import { coupons } from './coupons.js';
import { orderItems } from './orderItems.js';
import { businessProfiles, type BusinessAddress } from './businesses.js';

export type BuyerBusinessSnapshot = {
  profileId: string;
  verificationId: string;
  gstin: string;
  legalName: string;
  tradeName?: string | null;
  taxpayerType?: string | null;
  registrationStatus: string;
  registrationStateCode: string;
  registrationStateName: string;
  registeredAddress?: BusinessAddress | null;
  billingAddress: BusinessAddress;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  verifiedAt: string;
  profileVersion: number;
  authorizedRepresentative: true;
  purchaseOrderReference?: string;
};

export type TaxSnapshot = {
  policyVersion: string;
  mode: 'exclusive' | 'inclusive';
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  placeOfSupplyState: string;
  scenario: 'ordinary_goods_movement';
  jurisdiction: 'intra_state' | 'inter_state';
  taxableMinor: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  totalTaxMinor: number;
  rounding: 'half_up_per_line_minor_unit';
};

export type SellerSnapshot = {
  name: string;
  gstin?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  stateCode?: string | null;
};

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  status: orderStatusEnum('status').default('pending').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 10, scale: 2 }).default('0'),
  tax: numeric('tax', { precision: 10, scale: 2 }).default('0'),
  shipping: numeric('shipping', { precision: 10, scale: 2 }).default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  amountMinor: integer('amount_minor').default(0).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  couponCode: varchar('coupon_code', { length: 50 }),
  purchaseType: varchar('purchase_type', { length: 20 }).default('personal').notNull(),
  businessProfileId: uuid('business_profile_id').references(() => businessProfiles.id, { onDelete: 'set null' }),
  buyerBusinessSnapshot: json('buyer_business_snapshot').$type<BuyerBusinessSnapshot>(),
  sellerSnapshot: json('seller_snapshot').$type<SellerSnapshot>(),
  billingAddress: json('billing_address').$type<Record<string, unknown>>(),
  taxSnapshot: json('tax_snapshot').$type<TaxSnapshot>(),
  pricingPolicyVersion: varchar('pricing_policy_version', { length: 50 }).default('legacy').notNull(),
  purchaseOrderReference: varchar('purchase_order_reference', { length: 100 }),
  invoiceNumber: varchar('invoice_number', { length: 40 }).unique(),
  invoiceIssuedAt: timestamp('invoice_issued_at', { withTimezone: true }),
  paymentMethod: varchar('payment_method', { length: 50 }).default('razorpay'),
  razorpayOrderId: varchar('razorpay_order_id', { length: 100 }).unique(),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 100 }),
  razorpaySignature: varchar('razorpay_signature', { length: 255 }),
  shippingAddress: json('shipping_address').$type<{
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }>(),
  notes: varchar('notes', { length: 500 }),
  returnStatus: returnStatusEnum('return_status').default('none').notNull(),
  refundStatus: refundStatusEnum('refund_status').default('none').notNull(),
  inventoryReservedAt: timestamp('inventory_reserved_at', { withTimezone: true }),
  inventoryReservationExpiresAt: timestamp('inventory_reservation_expires_at', { withTimezone: true }),
  inventoryReleasedAt: timestamp('inventory_released_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  businessProfile: one(businessProfiles, { fields: [orders.businessProfileId], references: [businessProfiles.id] }),
  items: many(orderItems),
}));

export const insertOrderSchema = createInsertSchema(orders);
export const selectOrderSchema = createSelectSchema(orders);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
