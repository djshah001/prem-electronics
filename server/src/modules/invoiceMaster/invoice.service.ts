import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/db.js";
import { issuedInvoices } from "../../infrastructure/database/schema/index.js";
import { env } from "../../config/env.js";
import { AppError } from "../../core/errors/appError.js";
import { ordersService } from "../orders/orders.service.js";
import {
  renderInvoicePdf,
  type InvoiceRenderData,
  type MerchantInvoiceConfig,
} from "./invoice.renderer.js";

export const resolveLogoPath = (): string | undefined => {
  const candidates = [
    path.resolve(process.cwd(), "assets/logo.png"),
    path.resolve(process.cwd(), "server/assets/logo.png"),
    path.resolve(process.cwd(), "../client/public/logo.png"),
    path.resolve(process.cwd(), "client/public/logo.png"),
  ];
  return candidates.find((p) => fs.existsSync(p));
};

export const getMerchantInvoiceConfig = (): MerchantInvoiceConfig => ({
  name: env.MERCHANT_NAME || "PREM ELECTRONICS",
  address:
    env.MERCHANT_ADDRESS ||
    "7, SHIVAKRUTI APPARTMENT, SHIVAJI ROAD, DANDIA BAZAR, VADODARA-390001.",
  phone: env.MERCHANT_PHONE || "9712000609",
  gstin: env.MERCHANT_GSTIN || "24AAFPI9545M1ZB",
  stateName: "Gujarat",
  stateCode: env.SUPPLIER_STATE_CODE || "24",
  email: env.MERCHANT_EMAIL || "premelectronics@ymail.com",
  logoPath: resolveLogoPath(),
  bankName: "HDFC BANK",
  bankAccountNo: "04292000005162",
  bankBranchIfsc: "PANCHMUKHI VADODARA & HDFC0000429",
  declaration:
    env.MERCHANT_DECLARATION ||
    "Terms & Condition : (1) Interest at 15% Will be charged on Bills not paid within a week. (2) Our Responsibility Ceases as soon as goods have left our shop. (3) Goods Once Sold will not be taken back. (4) WARRANTY : As per Company's Terms & Conditions. (5) E. & O. E.",
  termsOfDelivery: "",
  signatureLabel: env.MERCHANT_SIGNATURE_LABEL || "Authorised Signatory",
  documentTitle: "TAX INVOICE",
});

export const sampleInvoice = (): InvoiceRenderData => ({
  merchant: getMerchantInvoiceConfig(),
  order: {
    invoiceNumber: "PETI1405",
    orderNumber: "1405",
    createdAt: new Date().toISOString(),
    invoiceIssuedAt: new Date().toISOString(),
    paymentMethod: "Online",
    purchaseOrderReference: "",
    shippingAddress: {
      fullName: "GAMP SERVICES LTD",
      street:
        "303-304 SAHYOG ELINA, CHINTAMANI SOCIETY, VIP MEN ROAD, KARELIBAUG",
      city: "VADODARA",
      state: "Gujarat",
      pincode: "390018",
    },
    billingAddress: {
      fullName: "GAMP SERVICES LTD",
      street:
        "303-304 SAHYOG ELINA, CHINTAMANI SOCIETY, VIP MEN ROAD, KARELIBAUG",
      city: "VADODARA",
      state: "Gujarat",
      pincode: "390018",
    },
    buyerBusinessSnapshot: {
      legalName: "GAMP SERVICES LTD",
      gstin: "24AAICG4336Q1Z6",
    },
    taxSnapshot: {
      placeOfSupplyState: "Gujarat",
      taxableMinor: 338135590,
      cgstMinor: 30432203,
      sgstMinor: 30432203,
      igstMinor: 0,
      totalTaxMinor: 60864406,
    },
    amountMinor: 399000000,
    total: 3990000,
    tax: 608644.06,
  },
  items: [
    {
      productTitle: "PANASONIC CAMCORDER CX 17 ED",
      hsnCodeSnapshot: "85258900",
      quantity: 15,
      priceAtPurchase: 135000,
      unitPriceMinor: 11440678,
      taxableMinor: 171610170,
      gstRateBps: 1800,
      cgstMinor: 15444915,
      sgstMinor: 15444915,
      igstMinor: 0,
      lineTotalMinor: 202500000,
    },
  ],
});

export const invoiceService = {
  preview: () => renderInvoicePdf(sampleInvoice()),

  async issueForOrder(orderId: string, userId?: string) {
    const [existing] = await db
      .select()
      .from(issuedInvoices)
      .where(eq(issuedInvoices.orderId, orderId))
      .limit(1);
    if (existing) return existing;

    const invoice = await ordersService.getInvoice(orderId, userId);
    if (
      !["paid", "refunded"].includes(invoice.order.paymentStatus) ||
      !invoice.order.invoiceNumber
    ) {
      throw new AppError(
        "The invoice is issued only after payment is captured.",
        409,
      );
    }

    const merchant = getMerchantInvoiceConfig();
    const renderData: InvoiceRenderData = {
      merchant,
      order: invoice.order,
      items: invoice.items as InvoiceRenderData["items"],
    };

    const rendered = await renderInvoicePdf(renderData);

    const values = {
      orderId,
      templateVersionId: null,
      invoiceNumber: invoice.order.invoiceNumber,
      orderSnapshot: invoice.order,
      sellerSnapshot: merchant,
      buyerSnapshot: {
        shippingAddress: invoice.order.shippingAddress,
        billingAddress: invoice.order.billingAddress,
        buyerBusinessSnapshot: invoice.order.buyerBusinessSnapshot,
      },
      templateSnapshot: merchant as unknown as Record<string, unknown>,
      pdfSha256: createHash("sha256").update(rendered.buffer).digest("hex"),
      pdfBytes: rendered.buffer,
      pageCount: rendered.pageCount,
      isLegacy: false,
    };

    const [created] = await db
      .insert(issuedInvoices)
      .values(values)
      .onConflictDoNothing({ target: issuedInvoices.orderId })
      .returning();

    if (created) return created;

    const [winner] = await db
      .select()
      .from(issuedInvoices)
      .where(eq(issuedInvoices.orderId, orderId))
      .limit(1);
    return winner;
  },
};
