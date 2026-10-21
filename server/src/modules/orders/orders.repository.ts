import { eq, desc, asc, and, sql, inArray, ilike, gte, lt, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  orders,
  orderItems,
  products,
  productVariants,
  paymentAttempts,
  orderStatusEvents,
  type Order,
  type NewOrder,
  type NewOrderItem,
  type OrderItem,
} from '../../infrastructure/database/schema/index.js';
import type { OrderQuery } from './orders.schema.js';
import { createAdminNotification } from '../notifications/notifications.service.js';

export const ordersRepository = {
  async findByUserId(userId: string, query: OrderQuery): Promise<{ data: Order[]; total: number }> {
    const offset = (query.page - 1) * query.limit;
    const conditions = [eq(orders.userId, userId)];
    if (query.status) conditions.push(eq(orders.status, query.status));

    const whereClause = and(...conditions);
    const [data, countResult] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(query.limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async findAll(query: OrderQuery): Promise<{ data: Order[]; total: number }> {
    const offset = (query.page - 1) * query.limit;
    const conditions = query.status ? [eq(orders.status, query.status)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(query.limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async findById(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  },

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | undefined> {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpayOrderId))
      .limit(1);
    return result[0];
  },

  async create(data: NewOrder): Promise<Order> {
    const result = await db.insert(orders).values(data).returning();
    return result[0];
  },

  async createItems(items: NewOrderItem[]): Promise<OrderItem[]> {
    return db.insert(orderItems).values(items).returning();
  },

  async createWithInventoryReservation(
    orderData: NewOrder,
    items: Omit<NewOrderItem, 'orderId'>[],
    reservationExpiresAt: Date
  ): Promise<Order> {
    return db.transaction(async (tx) => {
      const inventoryAlerts: Array<{ type: 'low_stock' | 'out_of_stock'; entityType: 'product' | 'variant'; entityId: string; label: string; stock: number }> = [];
      for (const item of items) {
        if (!item.productId) throw new Error('Cannot reserve inventory without a product ID.');
        if (item.variantId) {
          const reservedVariant = await tx
            .update(productVariants)
            .set({
              stockQuantity: sql`${productVariants.stockQuantity} - ${item.quantity}`,
              reservedQuantity: sql`${productVariants.reservedQuantity} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(and(
              eq(productVariants.id, item.variantId),
              eq(productVariants.isActive, true),
              gte(productVariants.stockQuantity, item.quantity)
            ))
            .returning({ id: productVariants.id, sku: productVariants.sku, stock: productVariants.stockQuantity, threshold: productVariants.lowStockThreshold });

          if (reservedVariant.length !== 1) {
            throw new Error(`INVENTORY_RESERVATION_FAILED:variant_${item.variantId}`);
          }
          const variant = reservedVariant[0];
          const previousStock = variant.stock + item.quantity;
          const variantLabel = `${item.productTitle ?? 'Product'} (${variant.sku ?? variant.id})`;
          if (previousStock > 0 && variant.stock === 0) inventoryAlerts.push({ type: 'out_of_stock', entityType: 'variant', entityId: variant.id, label: variantLabel, stock: 0 });
          else if (previousStock > variant.threshold && variant.stock <= variant.threshold) inventoryAlerts.push({ type: 'low_stock', entityType: 'variant', entityId: variant.id, label: variantLabel, stock: variant.stock });
        }
        const reserved = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(and(
            eq(products.id, item.productId),
            eq(products.isActive, true),
            gte(products.stock, item.quantity)
          ))
          .returning({ id: products.id, stock: products.stock, threshold: products.lowStockThreshold });

        if (reserved.length !== 1) {
          throw new Error(`INVENTORY_RESERVATION_FAILED:${item.productId}`);
        }
        if (!item.variantId) {
          const product = reserved[0];
          const previousStock = product.stock + item.quantity;
          if (previousStock > 0 && product.stock === 0) inventoryAlerts.push({ type: 'out_of_stock', entityType: 'product', entityId: product.id, label: item.productTitle ?? 'Product', stock: 0 });
          else if (previousStock > product.threshold && product.stock <= product.threshold) inventoryAlerts.push({ type: 'low_stock', entityType: 'product', entityId: product.id, label: item.productTitle ?? 'Product', stock: product.stock });
        }
      }

      const [order] = await tx.insert(orders).values({
        ...orderData,
        inventoryReservedAt: new Date(),
        inventoryReservationExpiresAt: reservationExpiresAt,
      }).returning();

      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        eventType: 'order_created',
        toValue: order.status,
        actorUserId: order.userId,
        metadata: { paymentStatus: order.paymentStatus },
      });

      await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId: order.id })));
      await tx.insert(paymentAttempts).values({
        orderId: order.id,
        providerOrderId: order.razorpayOrderId!,
        amountMinor: order.amountMinor,
        currency: order.currency,
      });

      await createAdminNotification(tx, {
        eventKey: `order.created:${order.id}`, type: 'new_order', severity: 'info',
        title: 'New order placed', message: `Order #${order.orderNumber} was placed and is awaiting payment.`,
        entityType: 'order', entityId: order.id, destination: `/admin/orders/${order.id}`,
      });
      for (const alert of inventoryAlerts) {
        await createAdminNotification(tx, {
          eventKey: `inventory.${alert.type}:${alert.entityType}:${alert.entityId}:order:${order.id}`,
          type: alert.type, severity: alert.type === 'out_of_stock' ? 'error' : 'warning',
          title: alert.type === 'out_of_stock' ? 'Item out of stock' : 'Low stock warning',
          message: `${alert.label} now has ${alert.stock} unit${alert.stock === 1 ? '' : 's'} available.`,
          entityType: alert.entityType, entityId: alert.entityId, destination: '/admin/inventory',
          metadata: { stock: alert.stock },
        });
      }

      return order;
    });
  },

  async releaseExpiredReservations(now = new Date()): Promise<number> {
    return db.transaction(async (tx) => {
      const expired = await tx.select({ id: orders.id })
        .from(orders)
        .where(and(
          eq(orders.paymentStatus, 'pending'),
          isNotNull(orders.inventoryReservedAt),
          isNull(orders.inventoryReleasedAt),
          lt(orders.inventoryReservationExpiresAt, now)
        ))
        .for('update');

      if (expired.length === 0) return 0;
      const ids = expired.map((entry) => entry.id);
      const items = await tx.select().from(orderItems).where(inArray(orderItems.orderId, ids));

      for (const item of items) {
        if (item.variantId) {
          await tx.update(productVariants)
            .set({
              stockQuantity: sql`${productVariants.stockQuantity} + ${item.quantity}`,
              reservedQuantity: sql`GREATEST(0, ${productVariants.reservedQuantity} - ${item.quantity})`,
              updatedAt: now,
            })
            .where(eq(productVariants.id, item.variantId));
        }
        if (!item.productId) continue;
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: now })
          .where(eq(products.id, item.productId));
      }

      await tx.update(orders)
        .set({ inventoryReleasedAt: now, updatedAt: now })
        .where(inArray(orders.id, ids));
      return ids.length;
    });
  },

  async getItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  },

  /** Returns order items joined with product images and slug for customer-facing detail pages */
  async getItemsWithProduct(orderId: string) {
    return db.select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      variantId: orderItems.variantId,
      productTitle: orderItems.productTitle,
      categoryIdSnapshot: orderItems.categoryIdSnapshot,
      categoryNameSnapshot: orderItems.categoryNameSnapshot,
      categorySnapshotSource: orderItems.categorySnapshotSource,
      quantity: orderItems.quantity,
      priceAtPurchase: orderItems.priceAtPurchase,
      skuSnapshot: orderItems.skuSnapshot,
      imageSnapshot: orderItems.imageSnapshot,
      hsnCodeSnapshot: orderItems.hsnCodeSnapshot,
      unitPriceMinor: orderItems.unitPriceMinor,
      discountMinor: orderItems.discountMinor,
      taxableMinor: orderItems.taxableMinor,
      gstRateBps: orderItems.gstRateBps,
      cgstMinor: orderItems.cgstMinor,
      sgstMinor: orderItems.sgstMinor,
      igstMinor: orderItems.igstMinor,
      lineTotalMinor: orderItems.lineTotalMinor,
      variantSnapshot: orderItems.variantSnapshot,
      createdAt: orderItems.createdAt,
      productImages: products.images,
      productSlug: products.slug,
    })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, orderId));
  },

  async updateStatus(id: string, status: Order['status']): Promise<Order> {
    const result = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  },

  async markPaid(
    id: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<Order> {
    const result = await db
      .update(orders)
      .set({
        paymentStatus: 'paid',
        status: 'confirmed',
        razorpayPaymentId,
        razorpaySignature,
        invoiceNumber: sql`COALESCE(${orders.invoiceNumber}, ${'INV-'} || ${orders.orderNumber})`,
        invoiceIssuedAt: sql`COALESCE(${orders.invoiceIssuedAt}, NOW())`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  },

  async generateOrderNumber(): Promise<string> {
    const count = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const num = Number(count[0].count) + 1;
    return `PE-${new Date().getFullYear()}-${String(num).padStart(6, '0')}`;
  },

  async findAllAdmin(page: number, limit: number, search?: string, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): Promise<{ data: Order[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = [eq(orders.isArchived, false)];
    if (search) conditions.push(ilike(orders.orderNumber, `%${search}%`));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    let orderCol = orders.createdAt;
    if (sortBy === 'orderNumber') orderCol = orders.orderNumber as any;
    if (sortBy === 'total') orderCol = orders.total as any;
    if (sortBy === 'status') orderCol = orders.status as any;
    
    const orderClause = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);

    const [data, countResult] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(orderClause).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await db.update(orders)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(inArray(orders.id, ids));
  },

  async transitionStatus(id: string, status: Order['status'], allowedFrom: Order['status'][], actorUserId?: string): Promise<Order | undefined> {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for('update').limit(1);
      if (!order || !allowedFrom.includes(order.status)) return undefined;

      const now = new Date();
      if (status === 'cancelled' && order.inventoryReservedAt && !order.inventoryReleasedAt) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
        for (const item of items) {
          if (item.variantId) {
            await tx.update(productVariants)
              .set({
                stockQuantity: sql`${productVariants.stockQuantity} + ${item.quantity}`,
                reservedQuantity: sql`GREATEST(0, ${productVariants.reservedQuantity} - ${item.quantity})`,
                updatedAt: now,
              })
              .where(eq(productVariants.id, item.variantId));
          }
          if (item.productId) {
            await tx.update(products).set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: now }).where(eq(products.id, item.productId));
          }
        }
      }

      const [updated] = await tx.update(orders).set({
        status,
        ...(status === 'cancelled' ? {
          inventoryReleasedAt: order.inventoryReleasedAt ?? now,
          paymentStatus: order.paymentStatus === 'pending' ? 'failed' as const : order.paymentStatus,
        } : {}),
        updatedAt: now,
      }).where(eq(orders.id, id)).returning();
      await tx.insert(orderStatusEvents).values({
        orderId: id, eventType: 'fulfilment_changed', fromValue: order.status, toValue: status,
        actorUserId, metadata: { paymentStatus: updated.paymentStatus, refundStatus: updated.refundStatus },
      });
      if (status === 'cancelled') {
        await createAdminNotification(tx, {
          eventKey: `order.cancelled:${id}`, type: 'order_cancelled', severity: 'warning',
          title: 'Order cancelled', message: `Order #${order.orderNumber} was cancelled.`,
          entityType: 'order', entityId: id, destination: `/admin/orders/${id}`,
          metadata: { paymentStatus: updated.paymentStatus },
        });
      }
      return updated;
    });
  },
};
