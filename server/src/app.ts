import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './core/middlewares/errorHandler.js';
import { publicLimiter } from './core/middlewares/rateLimiter.js';
import { originGuard } from './core/middlewares/originGuard.js';
import { NotFoundError } from './core/errors/appError.js';

// Routers
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import paymentsRoutes, { paymentsWebhookRouter } from './modules/payments/payments.routes.js';
import couponsRoutes from './modules/coupons/coupons.routes.js';
import reviewsRoutes from './modules/reviews/reviews.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import wishlistsRoutes from './modules/wishlists/wishlists.routes.js';
import blogsRoutes from './modules/blogs/blogs.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import businessesRoutes from './modules/businesses/businesses.routes.js';

const app = express();

// ─── Security Middlewares ────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(cookieParser());
// Razorpay signature validation requires the exact raw request bytes.
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), paymentsWebhookRouter);
app.use(originGuard);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(publicLimiter);

// ─── Static Uploads ─────────────────────────────────────────────────────────
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.join(__dirname, '..', 'uploads'))
);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'Prem Electronics API is running 🚀', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/products/:productId/reviews', reviewsRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/coupons', couponsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/wishlists', wishlistsRoutes);
app.use('/api/v1/blogs', blogsRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/businesses', businessesRoutes);

// ─── Favicon (prevent 404 noise) ─────────────────────────────────────────
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new NotFoundError('API endpoint not found.'));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
