import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import app from '../../app.js';
import { db, pool } from '../../infrastructure/database/db.js';
import { blogs } from '../../infrastructure/database/schema/index.js';
import { eq } from 'drizzle-orm';

test('P2 protected/public APIs and logout replay protections work over HTTP', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const origin = 'http://localhost:5173';
  let createdBlogId: string | undefined;
  try {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: 'admin@premelectronics.com', password: 'Admin@123' }),
    });
    assert.equal(login.status, 200);
    const setCookies = login.headers.getSetCookie();
    const cookie = setCookies.map((value) => value.split(';')[0]).join('; ');
    const accessCookie = setCookies.find((value) => value.startsWith('accessToken='))!.split(';')[0];

    const authenticatedGet = (path: string) => fetch(`${base}${path}`, { headers: { cookie } });
    const [analytics, transactions, customers, stats, adminBlogs, coupons, inventory, reviews, publicBlogs] = await Promise.all([
      authenticatedGet('/admin/analytics?preset=last30&timezone=Asia%2FKolkata&currency=INR'),
      authenticatedGet('/admin/transactions?page=1&limit=20'),
      authenticatedGet('/admin/customers?page=1&limit=20'),
      authenticatedGet('/admin/stats'),
      authenticatedGet('/blogs/admin?page=1&limit=20'),
      authenticatedGet('/coupons?page=1&limit=20&state=active'),
      authenticatedGet('/admin/inventory/low-stock?page=1&limit=20'),
      authenticatedGet('/admin/reviews/pending?page=1&limit=20'),
      fetch(`${base}/blogs?page=1&limit=20`),
    ]);
    assert.deepEqual(
      [analytics.status, transactions.status, customers.status, stats.status, adminBlogs.status, coupons.status, inventory.status, reviews.status, publicBlogs.status],
      [200, 200, 200, 200, 200, 200, 200, 200, 200],
    );
    const analyticsBody = await analytics.json() as any;
    assert.equal(analyticsBody.data.appliedRange.timezone, 'Asia/Kolkata');
    assert.equal(typeof analyticsBody.data.collections.netCollectionsMinor, 'number');
    const adminBlogBody = await adminBlogs.json() as any;
    const publicBlogBody = await publicBlogs.json() as any;
    const transactionBody = await transactions.json() as any;
    const customerBody = await customers.json() as any;
    const statsBody = await stats.json() as any;
    assert.equal(adminBlogBody.meta.total >= 5, true);
    assert.equal(publicBlogBody.data.every((post: any) => post.status === 'published'), true);
    assert.equal(typeof statsBody.data.orders.total, 'number');

    const customerId = customerBody.data[0]?.id;
    assert.ok(customerId, 'seeded customer is required for the detail smoke test');
    const [customerDetail, customerOrders] = await Promise.all([
      authenticatedGet(`/admin/customers/${customerId}`),
      authenticatedGet(`/admin/customers/${customerId}/orders?page=1&limit=10`),
    ]);
    assert.deepEqual([customerDetail.status, customerOrders.status], [200, 200]);
    const customerDetailBody = await customerDetail.json() as any;
    assert.equal(typeof customerDetailBody.data.summary.orderCount, 'number');
    assert.equal(typeof customerDetailBody.data.summary.netPaidMinor, 'number');

    const transactionId = transactionBody.data[0]?.id;
    const orderId = transactionBody.data[0]?.orderId;
    assert.ok(transactionId && orderId, 'seeded transaction and order are required for detail smoke tests');
    const [transactionDetail, orderDetail] = await Promise.all([
      authenticatedGet(`/admin/transactions/${transactionId}`),
      authenticatedGet(`/admin/orders/${orderId}`),
    ]);
    assert.deepEqual([transactionDetail.status, orderDetail.status], [200, 200]);
    const transactionDetailBody = await transactionDetail.json() as any;
    const orderDetailBody = await orderDetail.json() as any;
    assert.equal(Array.isArray(transactionDetailBody.data.refunds), true);
    assert.equal(Array.isArray(orderDetailBody.data.statusHistory), true);
    assert.equal(orderDetailBody.data.statusHistory.length > 0, true);

    const slug = `p2-smoke-${Date.now()}`;
    const createBlog = await fetch(`${base}/blogs/admin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, origin },
      body: JSON.stringify({
        title: 'P2 smoke lifecycle post',
        slug,
        excerpt: 'Temporary post used by the P2 API lifecycle test.',
        content: '<h2>Safe heading</h2><p>Lifecycle content.</p>',
        coverAlt: 'P2 smoke test cover',
      }),
    });
    assert.equal(createBlog.status, 201);
    const createdBlog = (await createBlog.json() as any).data;
    createdBlogId = createdBlog.id;

    const updateBlog = await fetch(`${base}/blogs/admin/${createdBlog.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, origin },
      body: JSON.stringify({
        title: 'P2 smoke lifecycle post updated',
        content: '<h2>Updated safely</h2><p>Lifecycle content.</p>',
        expectedVersion: createdBlog.version,
      }),
    });
    assert.equal(updateBlog.status, 200);
    const updatedBlog = (await updateBlog.json() as any).data;

    const publishBlog = await fetch(`${base}/blogs/admin/${createdBlog.id}/state`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie, origin },
      body: JSON.stringify({ action: 'publish', expectedVersion: updatedBlog.version }),
    });
    assert.equal(publishBlog.status, 200);
    const publishedBlog = (await publishBlog.json() as any).data;
    assert.equal((await fetch(`${base}/blogs/${slug}`)).status, 200);

    const archiveBlog = await fetch(`${base}/blogs/admin/${createdBlog.id}/state`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie, origin },
      body: JSON.stringify({ action: 'archive', expectedVersion: publishedBlog.version }),
    });
    assert.equal(archiveBlog.status, 200);
    assert.equal((await fetch(`${base}/blogs/${slug}`)).status, 404);

    const draft = await fetch(`${base}/blogs/smart-home-starter-guide-draft`);
    assert.equal(draft.status, 404);
    const repeatedQuery = await authenticatedGet('/admin/transactions?page=1&page=2');
    assert.equal(repeatedQuery.status, 400);
    const invalidCouponSort = await authenticatedGet('/coupons?sortBy=drop_table');
    assert.equal(invalidCouponSort.status, 400);
    const invalidInventoryLimit = await authenticatedGet('/admin/inventory/low-stock?limit=101');
    assert.equal(invalidInventoryLimit.status, 400);

    const logout = await fetch(`${base}/auth/logout`, { method: 'POST', headers: { cookie, origin } });
    assert.equal(logout.status, 200);
    const replay = await fetch(`${base}/admin/stats`, { headers: { cookie: accessCookie } });
    assert.equal(replay.status, 401);
    const refresh = await fetch(`${base}/auth/refresh`, { method: 'POST', headers: { cookie, origin } });
    assert.equal(refresh.status, 401);
  } finally {
    if (createdBlogId) await db.delete(blogs).where(eq(blogs.id, createdBlogId));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  }
});
