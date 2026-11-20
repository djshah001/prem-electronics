import { db } from "./db.js";
import {
  orders,
  orderItems,
  paymentAttempts,
  paymentRefunds,
  orderStatusEvents,
  issuedInvoices,
  users,
  products,
} from "./schema/index.js";
import { eq, inArray } from "drizzle-orm";
import logger from "../../core/logger/logger.js";
import { invoiceService } from "../../modules/invoiceMaster/invoice.service.js";

interface SeedItem {
  productId: string;
  quantity: number;
}

interface SeedOrderDef {
  orderNumber: string;
  invoiceNumber?: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  userEmail: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  buyerBusinessSnapshot?: {
    profileId: string;
    verificationId: string;
    gstin: string;
    legalName: string;
    registrationStatus: string;
    registrationStateCode: string;
    registrationStateName: string;
    billingAddress: any;
    verifiedAt: string;
    profileVersion: number;
    authorizedRepresentative: true;
  };
  items: SeedItem[];
  paymentOutcome: "captured" | "failed" | "created" | "refunded";
  refundAmountMinor?: number;
  daysAgo: number;
}

export async function seedOrdersAndTransactions() {
  logger.info("📦 Seeding orders and transactions...");

  // 1. Fetch available users
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
    })
    .from(users);
  const userMap = new Map(
    userRows
      .filter((u): u is typeof u & { email: string } => Boolean(u.email))
      .map((u) => [u.email.toLowerCase(), u]),
  );

  // Default fallback user if specific email not found
  const fallbackUser = userRows[0];
  if (!fallbackUser) {
    throw new Error(
      "No users found in database. Please seed or register at least one user before seeding orders.",
    );
  }

  // 2. Fetch products
  const productRows = await db.select().from(products).limit(10);
  if (productRows.length === 0) {
    throw new Error(
      "No products found in database. Please run npm run db:seed first.",
    );
  }
  const prodById = new Map(productRows.map((p) => [p.id, p]));
  const defaultProd = productRows[0];

  const orderDefs: SeedOrderDef[] = [
    {
      orderNumber: "ORD-1001",
      invoiceNumber: "PETI1401",
      status: "delivered",
      paymentStatus: "paid",
      userEmail: "amit.rathod.dev23@gmail.com",
      shippingAddress: {
        fullName: "Amit Rathod",
        phone: "+919876543210",
        street: "702, Shivalik High Street, Alkapuri",
        city: "Vadodara",
        state: "Gujarat",
        pincode: "390007",
        country: "India",
      },
      items: [{ productId: productRows[0].id, quantity: 1 }],
      paymentOutcome: "captured",
      daysAgo: 12,
    },
    {
      orderNumber: "ORD-1002",
      invoiceNumber: "PETI1402",
      status: "shipped",
      paymentStatus: "paid",
      userEmail: "amit.rathod.dev23@gmail.com",
      shippingAddress: {
        fullName: "GAMP SERVICES LTD",
        phone: "+919876543211",
        street: "303-304 Sahyog Elina, VIP Road, Karelibaug",
        city: "Vadodara",
        state: "Gujarat",
        pincode: "390018",
        country: "India",
      },
      buyerBusinessSnapshot: {
        profileId: "11111111-1111-1111-1111-111111111111",
        verificationId: "v-gamp-001",
        gstin: "24AAICG4336Q1Z6",
        legalName: "GAMP SERVICES LTD",
        registrationStatus: "Active",
        registrationStateCode: "24",
        registrationStateName: "Gujarat",
        billingAddress: {
          street: "303-304 Sahyog Elina, VIP Road, Karelibaug",
          city: "Vadodara",
          state: "Gujarat",
          pincode: "390018",
        },
        verifiedAt: new Date().toISOString(),
        profileVersion: 1,
        authorizedRepresentative: true,
      },
      items: [
        { productId: productRows[1]?.id ?? defaultProd.id, quantity: 1 },
        { productId: productRows[8]?.id ?? defaultProd.id, quantity: 2 },
      ],
      paymentOutcome: "captured",
      daysAgo: 8,
    },
    {
      orderNumber: "ORD-1003",
      invoiceNumber: "PETI1403",
      status: "processing",
      paymentStatus: "paid",
      userEmail: "darshanshahking@gmail.com",
      shippingAddress: {
        fullName: "Darshan Shah",
        phone: "+919712000609",
        street: "Flat 402, Royal Residency, Satellite",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380015",
        country: "India",
      },
      items: [{ productId: productRows[2]?.id ?? defaultProd.id, quantity: 1 }],
      paymentOutcome: "captured",
      daysAgo: 4,
    },
    {
      orderNumber: "ORD-1004",
      invoiceNumber: "PETI1404",
      status: "confirmed",
      paymentStatus: "paid",
      userEmail: "amit.rathod.dev23@gmail.com",
      shippingAddress: {
        fullName: "Vikram Joshi (Apex Media)",
        phone: "+919822012345",
        street: "Plot 45, Andheri East Industrial Area",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400093",
        country: "India",
      },
      buyerBusinessSnapshot: {
        profileId: "22222222-2222-2222-2222-222222222222",
        verificationId: "v-apex-002",
        gstin: "27AABCU9603R1ZM",
        legalName: "APEX DIGITAL CINEMA WORKS",
        registrationStatus: "Active",
        registrationStateCode: "27",
        registrationStateName: "Maharashtra",
        billingAddress: {
          street: "Plot 45, Andheri East Industrial Area",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400093",
        },
        verifiedAt: new Date().toISOString(),
        profileVersion: 1,
        authorizedRepresentative: true,
      },
      items: [{ productId: productRows[3]?.id ?? defaultProd.id, quantity: 1 }],
      paymentOutcome: "captured",
      daysAgo: 2,
    },
    {
      orderNumber: "ORD-1005",
      status: "pending",
      paymentStatus: "pending",
      userEmail: "darshanshahking@gmail.com",
      shippingAddress: {
        fullName: "Suresh Patel",
        phone: "+919825012345",
        street: "12, Diamond Market, Varachha",
        city: "Surat",
        state: "Gujarat",
        pincode: "395006",
        country: "India",
      },
      items: [{ productId: productRows[4]?.id ?? defaultProd.id, quantity: 1 }],
      paymentOutcome: "created",
      daysAgo: 1,
    },
    {
      orderNumber: "ORD-1006",
      invoiceNumber: "PETI1405",
      status: "refunded",
      paymentStatus: "refunded",
      userEmail: "amit.rathod.dev23@gmail.com",
      shippingAddress: {
        fullName: "Rahul Sharma",
        phone: "+919911223344",
        street: "B-12, Connaught Place Outer Circle",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110001",
        country: "India",
      },
      items: [{ productId: productRows[5]?.id ?? defaultProd.id, quantity: 1 }],
      paymentOutcome: "refunded",
      refundAmountMinor: 30549000,
      daysAgo: 15,
    },
    {
      orderNumber: "ORD-1007",
      status: "cancelled",
      paymentStatus: "failed",
      userEmail: "darshanshahking@gmail.com",
      shippingAddress: {
        fullName: "Pooja Mehta",
        phone: "+919426098765",
        street: "55, Kalawad Road",
        city: "Rajkot",
        state: "Gujarat",
        pincode: "360005",
        country: "India",
      },
      items: [{ productId: productRows[6]?.id ?? defaultProd.id, quantity: 1 }],
      paymentOutcome: "failed",
      daysAgo: 5,
    },
    {
      orderNumber: "ORD-1008",
      invoiceNumber: "PETI1406",
      status: "delivered",
      paymentStatus: "paid",
      userEmail: "amit.rathod.dev23@gmail.com",
      shippingAddress: {
        fullName: "Ravi Desai",
        phone: "+919724011223",
        street: "22, Gotri Sevasi Road",
        city: "Vadodara",
        state: "Gujarat",
        pincode: "390021",
        country: "India",
      },
      items: [
        { productId: productRows[7]?.id ?? defaultProd.id, quantity: 1 },
        { productId: productRows[8]?.id ?? defaultProd.id, quantity: 1 },
      ],
      paymentOutcome: "captured",
      daysAgo: 18,
    },
    {
      orderNumber: "ORD-1009",
      invoiceNumber: "PETI1407",
      status: "delivered",
      paymentStatus: "paid",
      userEmail: "darshanshahking@gmail.com",
      shippingAddress: {
        fullName: "Apex Media Studios",
        phone: "+919414012345",
        street: "14, MI Road, Near Raj Mandir",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "India",
      },
      buyerBusinessSnapshot: {
        profileId: "33333333-3333-3333-3333-333333333333",
        verificationId: "v-apex-003",
        gstin: "08AABCA1234A1Z1",
        legalName: "APEX MEDIA STUDIOS LLP",
        registrationStatus: "Active",
        registrationStateCode: "08",
        registrationStateName: "Rajasthan",
        billingAddress: {
          street: "14, MI Road, Near Raj Mandir",
          city: "Jaipur",
          state: "Rajasthan",
          pincode: "302001",
        },
        verifiedAt: new Date().toISOString(),
        profileVersion: 1,
        authorizedRepresentative: true,
      },
      items: [
        { productId: productRows[0]?.id ?? defaultProd.id, quantity: 1 },
        { productId: productRows[8]?.id ?? defaultProd.id, quantity: 3 },
      ],
      paymentOutcome: "captured",
      daysAgo: 22,
    },
    {
      orderNumber: "ORD-1010",
      status: "pending",
      paymentStatus: "pending",
      userEmail: "amit.rathod.dev23@gmail.com",
      shippingAddress: {
        fullName: "Manish Trivedi",
        phone: "+919904055667",
        street: "88, Waghawadi Road",
        city: "Bhavnagar",
        state: "Gujarat",
        pincode: "364001",
        country: "India",
      },
      items: [{ productId: productRows[9]?.id ?? defaultProd.id, quantity: 1 }],
      paymentOutcome: "created",
      daysAgo: 0,
    },
  ];

  // Clean existing seed orders if re-running
  const existingOrderNumbers = orderDefs.map((o) => o.orderNumber);
  const existing = await db
    .select({ id: orders.id })
    .from(orders)
    .where(inArray(orders.orderNumber, existingOrderNumbers));
  if (existing.length > 0) {
    logger.info(`Cleaning ${existing.length} existing sample orders...`);
    const ids = existing.map((e) => e.id);
    await db.delete(issuedInvoices).where(inArray(issuedInvoices.orderId, ids));
    await db.delete(paymentRefunds).where(inArray(paymentRefunds.orderId, ids));
    await db
      .delete(paymentAttempts)
      .where(inArray(paymentAttempts.orderId, ids));
    await db
      .delete(orderStatusEvents)
      .where(inArray(orderStatusEvents.orderId, ids));
    await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
    await db.delete(orders).where(inArray(orders.id, ids));
  }

  const supplierStateCode = "24"; // Gujarat

  for (const def of orderDefs) {
    const user = userMap.get(def.userEmail.toLowerCase()) ?? fallbackUser;
    const createdAt = new Date(Date.now() - def.daysAgo * 86400 * 1000);
    const destinationState = def.shippingAddress.state;
    const isInterstate = destinationState.toLowerCase() !== "gujarat";

    // Calculate line items and totals
    let totalTaxableMinor = 0;
    let totalCgstMinor = 0;
    let totalSgstMinor = 0;
    let totalIgstMinor = 0;
    let totalMinor = 0;

    const computedItems = def.items.map((itemDef) => {
      const prod = prodById.get(itemDef.productId) ?? defaultProd;
      const price = parseFloat(prod.price);
      const qty = itemDef.quantity;
      const gstRateBps = prod.gstRateBps ?? 1800;

      const unitTaxableMinor = Math.round(
        (price * 100) / (1 + gstRateBps / 10000),
      );
      const taxableMinor = unitTaxableMinor * qty;

      let cgstMinor = 0;
      let sgstMinor = 0;
      let igstMinor = 0;

      if (isInterstate) {
        igstMinor = Math.round(taxableMinor * (gstRateBps / 10000));
      } else {
        cgstMinor = Math.round(taxableMinor * (gstRateBps / 20000));
        sgstMinor = Math.round(taxableMinor * (gstRateBps / 20000));
      }

      const lineTotalMinor = taxableMinor + cgstMinor + sgstMinor + igstMinor;

      totalTaxableMinor += taxableMinor;
      totalCgstMinor += cgstMinor;
      totalSgstMinor += sgstMinor;
      totalIgstMinor += igstMinor;
      totalMinor += lineTotalMinor;

      return {
        productId: prod.id,
        productTitle: prod.title,
        skuSnapshot: prod.sku,
        hsnCodeSnapshot: prod.hsnCode ?? "85258900",
        imageSnapshot: Array.isArray(prod.images) ? prod.images[0] : null,
        quantity: qty,
        priceAtPurchase: String(price),
        unitPriceMinor: unitTaxableMinor,
        discountMinor: 0,
        taxableMinor,
        gstRateBps,
        cgstMinor,
        sgstMinor,
        igstMinor,
        lineTotalMinor,
      };
    });

    const totalTaxMinor = totalCgstMinor + totalSgstMinor + totalIgstMinor;
    const subtotalStr = (totalTaxableMinor / 100).toFixed(2);
    const taxStr = (totalTaxMinor / 100).toFixed(2);
    const totalStr = (totalMinor / 100).toFixed(2);

    const taxSnapshot = {
      policyVersion: "gst-v2",
      mode: "exclusive" as const,
      supplierStateCode,
      placeOfSupplyStateCode: isInterstate ? "27" : "24",
      placeOfSupplyState: destinationState,
      scenario: "ordinary_goods_movement" as const,
      jurisdiction: isInterstate
        ? ("inter_state" as const)
        : ("intra_state" as const),
      taxableMinor: totalTaxableMinor,
      cgstMinor: totalCgstMinor,
      sgstMinor: totalSgstMinor,
      igstMinor: totalIgstMinor,
      totalTaxMinor,
      rounding: "half_up_per_line_minor_unit" as const,
    };

    const sellerSnapshot = {
      name: "PREM ELECTRONICS",
      gstin: "24AAFPI9545M1ZB",
      address:
        "7, SHIVAKRUTI APPARTMENT, SHIVAJI ROAD, DANDIA BAZAR, VADODARA-390001.",
      phone: "9712000609",
      email: "premelectronics@ymail.com",
      stateCode: supplierStateCode,
    };

    const rzpOrderId = `order_${def.orderNumber.replace(/[^A-Za-z0-9]/g, "")}_${Date.now().toString().slice(-4)}`;
    const rzpPaymentId =
      def.paymentStatus === "paid" || def.paymentStatus === "refunded"
        ? `pay_${def.orderNumber.replace(/[^A-Za-z0-9]/g, "")}_${Date.now().toString().slice(-4)}`
        : null;

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: def.orderNumber,
        userId: user.id,
        status: def.status,
        paymentStatus: def.paymentStatus,
        isArchived: false,
        subtotal: subtotalStr,
        discount: "0.00",
        tax: taxStr,
        shipping: "0.00",
        total: totalStr,
        amountMinor: totalMinor,
        currency: "INR",
        purchaseType: def.buyerBusinessSnapshot ? "company" : "personal",
        buyerBusinessSnapshot: def.buyerBusinessSnapshot,
        sellerSnapshot,
        billingAddress: def.shippingAddress,
        shippingAddress: def.shippingAddress,
        taxSnapshot,
        pricingPolicyVersion: "gst-v2",
        invoiceNumber: def.invoiceNumber ?? null,
        invoiceIssuedAt: def.invoiceNumber ? createdAt : null,
        paymentMethod: "Razorpay (UPI / Card / NetBanking)",
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpPaymentId ? "sig_mock_signature_verified" : null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    // Insert Order Items
    for (const item of computedItems) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        productTitle: item.productTitle,
        skuSnapshot: item.skuSnapshot,
        hsnCodeSnapshot: item.hsnCodeSnapshot,
        imageSnapshot: item.imageSnapshot,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: 0,
        taxableMinor: item.taxableMinor,
        gstRateBps: item.gstRateBps,
        cgstMinor: item.cgstMinor,
        sgstMinor: item.sgstMinor,
        igstMinor: item.igstMinor,
        lineTotalMinor: item.lineTotalMinor,
        createdAt,
      });
    }

    // Insert Payment Attempt (Transaction)
    const [attempt] = await db
      .insert(paymentAttempts)
      .values({
        orderId: order.id,
        provider: "razorpay",
        providerOrderId: rzpOrderId,
        providerPaymentId: rzpPaymentId,
        amountMinor: totalMinor,
        currency: "INR",
        status: def.paymentOutcome,
        failureReason:
          def.paymentOutcome === "failed"
            ? "Transaction declined by issuer bank (insufficient balance or limit reached)"
            : null,
        capturedAt:
          def.paymentOutcome === "captured" || def.paymentOutcome === "refunded"
            ? createdAt
            : null,
        finalizedAt: def.paymentOutcome !== "created" ? createdAt : null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    // Insert Payment Refund if applicable
    if (def.paymentOutcome === "refunded" && def.refundAmountMinor) {
      await db.insert(paymentRefunds).values({
        orderId: order.id,
        paymentAttemptId: attempt.id,
        providerRefundId: `rfd_${def.orderNumber.replace(/[^A-Za-z0-9]/g, "")}`,
        amountMinor: def.refundAmountMinor,
        merchandiseMinor: def.refundAmountMinor,
        taxMinor: 0,
        shippingMinor: 0,
        currency: "INR",
        status: "processed",
        processedAt: new Date(createdAt.getTime() + 2 * 86400 * 1000),
        createdAt: new Date(createdAt.getTime() + 2 * 86400 * 1000),
      });
    }

    // Insert Order Status Lifecycle Events
    const statusProgression: Array<{
      from: string | null;
      to: string;
      delayHours: number;
    }> = [{ from: null, to: "pending", delayHours: 0 }];
    if (
      def.status === "confirmed" ||
      def.status === "processing" ||
      def.status === "shipped" ||
      def.status === "delivered"
    ) {
      statusProgression.push({
        from: "pending",
        to: "confirmed",
        delayHours: 1,
      });
    }
    if (
      def.status === "processing" ||
      def.status === "shipped" ||
      def.status === "delivered"
    ) {
      statusProgression.push({
        from: "confirmed",
        to: "processing",
        delayHours: 6,
      });
    }
    if (def.status === "shipped" || def.status === "delivered") {
      statusProgression.push({
        from: "processing",
        to: "shipped",
        delayHours: 24,
      });
    }
    if (def.status === "delivered") {
      statusProgression.push({
        from: "shipped",
        to: "delivered",
        delayHours: 72,
      });
    }
    if (def.status === "cancelled") {
      statusProgression.push({
        from: "pending",
        to: "cancelled",
        delayHours: 2,
      });
    }
    if (def.status === "refunded") {
      statusProgression.push({
        from: "pending",
        to: "confirmed",
        delayHours: 1,
      });
      statusProgression.push({
        from: "confirmed",
        to: "refunded",
        delayHours: 48,
      });
    }

    for (const evt of statusProgression) {
      await db.insert(orderStatusEvents).values({
        orderId: order.id,
        eventType: "status_changed",
        fromValue: evt.from,
        toValue: evt.to,
        actorUserId: user.id,
        metadata: { note: `Status updated to ${evt.to}` },
        createdAt: new Date(createdAt.getTime() + evt.delayHours * 3600 * 1000),
      });
    }

    // Issue invoice PDF caching for paid orders with invoiceNumber
    if (
      def.invoiceNumber &&
      (def.paymentStatus === "paid" || def.paymentStatus === "refunded")
    ) {
      try {
        await invoiceService.issueForOrder(order.id);
      } catch (err: any) {
        logger.warn(
          `Could not cache invoice for ${def.orderNumber}: ${err?.message}`,
        );
      }
    }
  }

  logger.info(
    `✅ Successfully seeded ${orderDefs.length} orders & transactions!`,
  );
}

// Allow direct execution: node seedOrders.js
if (process.argv[1]?.includes("seedOrders")) {
  seedOrdersAndTransactions()
    .then(() => {
      console.log("Seeding completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
