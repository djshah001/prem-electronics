import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { products, categories, blogs } from '../../infrastructure/database/schema/index.js';
import { env } from '../../config/env.js';

export const seoRouter = Router();

seoRouter.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const baseUrl = env.CLIENT_URL.replace(/\/$/, '');

    const staticRoutes = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '/shop', priority: '0.9', changefreq: 'daily' },
      { path: '/blog', priority: '0.7', changefreq: 'weekly' },
      { path: '/about', priority: '0.5', changefreq: 'monthly' },
      { path: '/contact', priority: '0.5', changefreq: 'monthly' },
      { path: '/faq', priority: '0.4', changefreq: 'monthly' },
      { path: '/terms', priority: '0.3', changefreq: 'yearly' },
      { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
    ];

    const [activeProducts, activeCategories, publishedBlogs] = await Promise.all([
      db.select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(eq(products.isActive, true)),
      db.select({ slug: categories.slug, updatedAt: categories.updatedAt })
        .from(categories)
        .where(eq(categories.isActive, true)),
      db.select({ slug: blogs.slug, updatedAt: blogs.updatedAt })
        .from(blogs)
        .where(and(eq(blogs.isActive, true), eq(blogs.status, 'published'))),
    ]);

    const xmlUrls = [
      ...staticRoutes.map((r) => `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`),
      ...activeCategories.map((c) => `  <url>
    <loc>${baseUrl}/shop?categorySlug=${encodeURIComponent(c.slug)}</loc>
    <lastmod>${c.updatedAt ? new Date(c.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`),
      ...activeProducts.map((p) => `  <url>
    <loc>${baseUrl}/products/${encodeURIComponent(p.slug)}</loc>
    <lastmod>${p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`),
      ...publishedBlogs.map((b) => `  <url>
    <loc>${baseUrl}/blog/${encodeURIComponent(b.slug)}</loc>
    <lastmod>${b.updatedAt ? new Date(b.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
});

seoRouter.get('/robots.txt', (_req, res) => {
  const baseUrl = env.CLIENT_URL.replace(/\/$/, '');
  const content = `# robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin
Disallow: /account/
Disallow: /account
Disallow: /checkout
Disallow: /order-success/
Disallow: /verify-otp
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(content);
});

