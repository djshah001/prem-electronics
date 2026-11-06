import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { env } from './config/env.js';
import { errorHandler } from './core/middlewares/errorHandler.js';
import { publicLimiter } from './core/middlewares/rateLimiter.js';
import { originGuard } from './core/middlewares/originGuard.js';
import { NotFoundError } from './core/errors/appError.js';
import { serverUploadRoot } from './core/utils/uploadPaths.js';

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
import invoiceMasterRoutes from './modules/invoiceMaster/invoice.routes.js';
import emailMasterRoutes from './modules/communications/email.routes.js';
import { campaignRouter, marketingRouter, unsubscribeRouter } from './modules/communications/campaign.routes.js';
import { bannerAdminRouter, bannerPublicRouter } from './modules/banners/banners.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import navbarMasterRoutes from './modules/navbarMaster/navbarMaster.routes.js';
import { seoRouter } from './modules/seo/seo.routes.js';

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

// ─── Static Uploads & On-Demand Thumbnail Generator ────────────────────────
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  async (req, res, next) => {
    if (req.method !== 'GET') return next();
    const match = req.path.match(/^\/(.+)-thumb(\.[a-zA-Z0-9]+)$/);
    if (!match) return next();

    const requestedThumbPath = path.join(serverUploadRoot, req.path);
    try {
      await fs.access(requestedThumbPath);
      return next(); // Thumbnail exists, pass to express.static
    } catch {
      // Thumbnail missing: search for source image to dynamically generate and cache it
      const baseName = match[1];
      const ext = match[2];
      const candidates = [
        path.join(serverUploadRoot, `${baseName}${ext}`),
        path.join(serverUploadRoot, `${baseName}.webp`),
        path.join(serverUploadRoot, `${baseName}.jpg`),
        path.join(serverUploadRoot, `${baseName}.jpeg`),
        path.join(serverUploadRoot, `${baseName}.png`),
      ];

      for (const candidatePath of candidates) {
        try {
          await fs.access(candidatePath);
          const thumbBuffer = await sharp(candidatePath, { limitInputPixels: 45_000_000 })
            .rotate()
            .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85, effort: 4, smartSubsample: true })
            .toBuffer();

          await fs.writeFile(requestedThumbPath, thumbBuffer).catch(() => undefined);
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
          return res.send(thumbBuffer);
        } catch {
          continue;
        }
      }
      next();
    }
  },
  express.static(serverUploadRoot, { maxAge: '30d' })
);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'Prem Electronics API is running 🚀', timestamp: new Date().toISOString() });
});

// ─── SEO Routes (sitemap.xml & robots.txt) ────────────────────────────────────
app.use(seoRouter);
app.use('/api/v1', seoRouter);

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
app.use('/api/v1/invoice-master', invoiceMasterRoutes);
app.use('/api/v1/email-master', emailMasterRoutes);
app.use('/api/v1/campaigns', campaignRouter);
app.use('/api/v1/marketing', marketingRouter);
app.use('/api/v1/unsubscribe', unsubscribeRouter);
app.use('/api/v1/banners', bannerPublicRouter);
app.use('/api/v1/admin/banners', bannerAdminRouter);
app.use('/api/v1/admin/notifications', notificationsRoutes);
app.use('/api/v1/navbar', navbarMasterRoutes);

// ─── Favicon (prevent 404 noise) ─────────────────────────────────────────
app.get('/favicon.jpg', (_req, res) => {
  res.status(204).end();
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new NotFoundError('API endpoint not found.'));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
