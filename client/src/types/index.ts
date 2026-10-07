// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'superadmin';
  isVerified: boolean;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  type: 'shipping' | 'billing' | 'both';
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface BusinessAddress {
  building?: string;
  street?: string;
  locality?: string;
  city: string;
  district?: string;
  state: string;
  stateCode: string;
  pincode: string;
  country: string;
  source: 'provider' | 'customer';
}

export interface GstVerification {
  id: string;
  gstin: string;
  provider: string;
  registrationStatus: 'active' | 'inactive' | 'cancelled' | 'suspended' | 'unknown';
  legalName: string;
  tradeName?: string;
  taxpayerType?: string;
  stateCode: string;
  stateName: string;
  principalAddress?: BusinessAddress;
  additionalAddresses: BusinessAddress[];
  checkedAt: string;
  expiresAt: string;
  cached: boolean;
}

export interface BusinessProfile {
  id: string;
  verificationId: string;
  nickname?: string;
  gstin: string;
  legalName: string;
  tradeName?: string;
  taxpayerType?: string;
  registrationStatus: string;
  registrationStateCode: string;
  registrationStateName: string;
  registeredAddress?: BusinessAddress;
  billingAddress: BusinessAddress;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  isDefault: boolean;
  version: number;
  verifiedAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  user: User;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  bannerImage?: string;
  parentId?: string;
  isActive: boolean;
  children?: Category[];
}

// ─── Product Variants ─────────────────────────────────────────────────────────
export interface ProductOptionValue {
  id: string;
  optionId: string;
  label: string;
  normalizedValue: string;
  displayOrder: number;
  colorSwatch?: string | null;
}

export interface ProductOption {
  id: string;
  productId: string;
  name: string;
  normalizedKey: string;
  displayOrder: number;
  values?: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  price: string;
  salePrice?: string | null;
  priceMinor: number;
  salePriceMinor?: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  optionCombinationKey: string;
  optionValues?: string[];
}

// ─── Product ─────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string;
  description?: string;
  price: string;
  salePrice?: string;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  tags: string[];
  attributes: Array<{ name: string; value: string }>;
  brand?: string;
  hsnCode?: string;
  gstRateBps?: number;
  categoryId?: string;
  isActive: boolean;
  isFeatured: boolean;
  barcode?: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  avgRating: string;
  reviewCount: number;
  createdAt: string;
  options?: ProductOption[];
  variants?: ProductVariant[];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  productId: string;
  title: string;
  image?: string;
  price: string;
  salePrice?: string;
  quantity: number;
  slug: string;
  variantId?: string;
  variantSnapshot?: Record<string, unknown>;
}

export interface CartValidationResult {
  items: Array<{
    productId: string;
    title: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    unitPriceMinor: number;
    discountMinor: number;
    taxableMinor: number;
    gstRateBps: number;
    cgstMinor: number;
    sgstMinor: number;
    igstMinor: number;
    finalMinor: number;
    variantSnapshot: Record<string, unknown>;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon: { id: string; code: string } | null;
  amountMinor: number;
  taxBreakdown: {
    mode: 'exclusive' | 'inclusive';
    policyVersion: string;
    jurisdiction: 'intra_state' | 'inter_state';
    taxableMinor: number;
    cgstMinor: number;
    sgstMinor: number;
    igstMinor: number;
    totalTaxMinor: number;
  };
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  returnStatus: 'none' | 'requested' | 'approved' | 'rejected' | 'completed';
  refundStatus: 'none' | 'pending' | 'processed';
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  total: string;
  couponCode?: string;
  paymentMethod?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  shippingAddress: Address;
  notes?: string;
  purchaseType?: 'personal' | 'company';
  buyerBusinessSnapshot?: Record<string, unknown>;
  sellerSnapshot?: Record<string, unknown>;
  billingAddress?: Address | BusinessAddress;
  taxSnapshot?: Record<string, unknown>;
  pricingPolicyVersion?: string;
  invoiceNumber?: string;
  invoiceIssuedAt?: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  productTitle?: string;
  quantity: number;
  priceAtPurchase: string;
  variantSnapshot: Record<string, unknown>;
  skuSnapshot?: string;
  imageSnapshot?: string;
  hsnCodeSnapshot?: string;
  unitPriceMinor?: number;
  discountMinor?: number;
  taxableMinor?: number;
  gstRateBps?: number;
  cgstMinor?: number;
  sgstMinor?: number;
  igstMinor?: number;
  lineTotalMinor?: number;
}

// ─── Coupon ──────────────────────────────────────────────────────────────────
export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: 'flat' | 'percentage';
  discountValue: string;
  minPurchase: string;
  maxDiscount?: string;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  firstOrderOnly: boolean;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
}

// ─── Review ──────────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
  isVerifiedBuyer: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
  // Joined fields (admin view)
  productTitle?: string;
  userName?: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardMetrics {
  revenue: {
    total: number;
    last30Days: number;
    byDay: Array<{ date: string; revenue: number; count: number }>;
  };
  orders: {
    total: number;
    recent: Order[];
  };
  users: {
    total: number;
  };
  topProducts: Array<{
    productId: string;
    totalSold: number;
    revenue: number;
  }>;
  lowStockAlerts: Array<{
    id: string;
    title: string;
    stock: number;
    threshold: number;
  }>;
}

export interface AnalyticsData {
  period: number;
  revenue: Array<{ date: string; revenue: number; orders: number }>;
  totalOrders: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    price: string;
    salePrice?: string;
    images: string[];
    brand?: string;
    stock: number;
    avgRating: string;
    reviewCount: number;
    isActive: boolean;
  };
}

// ─── Blog ─────────────────────────────────────────────────────────────────────
export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  editorJson?: { type: 'doc'; content?: Array<Record<string, unknown>> } | null;
  editorSchemaVersion?: number;
  editorMigrationStatus?: 'legacy_html' | 'structured' | 'recovery_required';
  excerpt?: string | null;
  imageUrl?: string | null;
  coverAlt?: string | null;
  authorId?: string;
  authorName?: string;
  seoTitle?: string;
  seoDescription?: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string | null;
  archivedAt?: string | null;
  version: number;
  redirectedFrom?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Customer (Admin View) ───────────────────────────────────────────────────
export interface CustomerAdmin {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  orderCount: number;
  phone?: string | null;
  grossPaidMinor: number;
  refundedMinor: number;
  netPaidMinor: number;
}

// ─── Upload ───────────────────────────────────────────────────────────────────
export interface UploadResponse {
  urls: string[];
}
