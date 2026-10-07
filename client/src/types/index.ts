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

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
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
  attributes: Record<string, unknown>;
  brand?: string;
  categoryId?: string;
  isActive: boolean;
  isFeatured: boolean;
  barcode?: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  avgRating: string;
  reviewCount: number;
  createdAt: string;
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
}

export interface CartValidationResult {
  items: Array<{
    productId: string;
    title: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    variantSnapshot: Record<string, unknown>;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon: { id: string; code: string } | null;
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
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  total: string;
  couponCode?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  shippingAddress: Address;
  notes?: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  quantity: number;
  priceAtPurchase: string;
  variantSnapshot: Record<string, unknown>;
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
  usageLimit?: number;
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
  };
}

// ─── Blog ─────────────────────────────────────────────────────────────────────
export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  imageUrl?: string;
  authorId?: string;
  authorName?: string;
  seoTitle?: string;
  seoDescription?: string;
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
  totalSpent: number;
}

// ─── Upload ───────────────────────────────────────────────────────────────────
export interface UploadResponse {
  urls: string[];
}
