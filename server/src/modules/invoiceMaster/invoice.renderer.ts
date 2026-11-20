import fs from "node:fs";
import PDFDocument from "pdfkit";

export type InvoiceItem = {
  productTitle?: string | null;
  hsnCodeSnapshot?: string | null;
  skuSnapshot?: string | null;
  quantity: number;
  priceAtPurchase: number;
  unitPriceMinor: number;
  taxableMinor: number;
  gstRateBps: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  lineTotalMinor: number;
};

export type MerchantInvoiceConfig = {
  name: string;
  address: string;
  phone?: string;
  gstin?: string;
  stateName: string;
  stateCode: string;
  cin?: string;
  email?: string;
  logoPath?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankBranchIfsc?: string;
  declaration?: string;
  termsOfDelivery?: string;
  signatureLabel?: string;
  documentTitle?: string;
};

export type InvoiceRenderData = {
  merchant: MerchantInvoiceConfig;
  order: Record<string, any>;
  items: InvoiceItem[];
};

const formatInr = (minor: number) =>
  (minor / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (input: string | Date) => {
  const d = new Date(input);
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${months[d.getMonth()]}-${year}`;
};

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const under100 = (n: number) =>
  n < 20
    ? ones[n]
    : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;

const under1000 = (n: number) =>
  `${n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred ` : ""}${under100(n % 100)}`.trim();

const numberToIndianWords = (num: number): string => {
  let value = Math.max(0, Math.floor(num));
  if (value === 0) return "Zero";
  const parts: string[] = [];
  const units: Array<[number, string]> = [
    [10_000_000, "Crore"],
    [100_000, "Lakh"],
    [1_000, "Thousand"],
  ];
  for (const [size, label] of units) {
    if (value >= size) {
      parts.push(`${under1000(Math.floor(value / size))} ${label}`);
      value %= size;
    }
  }
  if (value) parts.push(under1000(value));
  return parts.join(" ");
};

export const indianAmountInWords = (minor: number): string => {
  const absMinor = Math.max(0, Math.round(minor));
  const rupees = Math.floor(absMinor / 100);
  const paise = absMinor % 100;
  const rupeePart = numberToIndianWords(rupees);
  if (paise > 0) {
    return `INR ${rupeePart} and ${numberToIndianWords(paise)} paise Only`;
  }
  return `INR ${rupeePart} Only`;
};

const formatBuyerAddressLines = (addr: any): string[] => {
  if (!addr) return ["Not provided"];
  return [
    addr.street ?? addr.addressLine1,
    addr.addressLine2,
    [addr.city, addr.pincode].filter(Boolean).join("-"),
  ].filter(Boolean);
};

export async function renderInvoicePdf(
  data: InvoiceRenderData,
): Promise<{ buffer: Buffer; pageCount: number }> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 28,
    bufferPages: true,
    info: {
      Title: `${data.merchant.documentTitle ?? "TAX INVOICE"} ${data.order.invoiceNumber ?? data.order.orderNumber}`,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  const left = 28;
  const width = doc.page.width - 56; // 539.28 pt on A4
  const right = left + width;
  const borderColor = "#111111";

  const hLine = (x1: number, x2: number, y: number, lw = 0.6) => {
    doc.moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(borderColor);
  };
  const vLine = (x: number, y1: number, y2: number, lw = 0.6) => {
    doc.moveTo(x, y1).lineTo(x, y2).lineWidth(lw).stroke(borderColor);
  };

  // Document Title
  const title = data.merchant.documentTitle ?? "TAX INVOICE";
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(title, left, 18, { width, align: "center" });

  const boxTop = 34;
  const midX = left + width * 0.5;
  const rightColMid = midX + (right - midX) * 0.5;

  // --- TOP LEFT: SELLER + BUYER ---
  let sellerY = boxTop + 5;
  const hasLogo = Boolean(
    data.merchant.logoPath && fs.existsSync(data.merchant.logoPath),
  );
  const logoSize = 54;
  const sellerTextX = hasLogo ? left + logoSize + 10 : left + 5;
  const sellerTextW = midX - sellerTextX - 4;

  if (hasLogo && data.merchant.logoPath) {
    try {
      doc.image(data.merchant.logoPath, left + 5, boxTop + 5, {
        fit: [logoSize, logoSize],
        align: "center",
        valign: "center",
      });
    } catch {
      // Skip logo if unreadable
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(data.merchant.name, sellerTextX, sellerY, { width: sellerTextW });
  sellerY = doc.y + 1;
  doc.font("Helvetica").fontSize(7.5);
  if (data.merchant.address) {
    doc.text(data.merchant.address, sellerTextX, sellerY, {
      width: sellerTextW,
    });
    sellerY = doc.y + 1;
  }
  const sellerLines = [
    data.merchant.phone ? `MO.NO.${data.merchant.phone}` : null,
    data.merchant.gstin ? `GSTIN/UIN: ${data.merchant.gstin}` : null,
    `State Name : ${data.merchant.stateName}, Code : ${data.merchant.stateCode}`,
    data.merchant.cin ? `CIN: ${data.merchant.cin}` : null,
    data.merchant.email ? `E-Mail : ${data.merchant.email}` : null,
  ].filter(Boolean) as string[];

  sellerLines.forEach((lineText) => {
    doc.text(lineText, sellerTextX, sellerY, { width: sellerTextW });
    sellerY = doc.y + 1;
  });

  const sellerBottom = Math.max(
    sellerY + 4,
    boxTop + (hasLogo ? logoSize + 12 : 70),
  );
  hLine(left, midX, sellerBottom);

  // Buyer (Bill to)
  const billing =
    data.order.buyerBusinessSnapshot?.billingAddress ??
    data.order.billingAddress ??
    data.order.shippingAddress ??
    {};
  let buyerY = sellerBottom + 4;
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text("Buyer (Bill to)", left + 5, buyerY);
  buyerY = doc.y + 2;
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(
      data.order.buyerBusinessSnapshot?.legalName ??
        billing.fullName ??
        "Customer",
      left + 5,
      buyerY,
      { width: midX - left - 10 },
    );
  buyerY = doc.y + 1;
  doc.font("Helvetica").fontSize(7.5);
  formatBuyerAddressLines(billing).forEach((lineText) => {
    doc.text(lineText, left + 5, buyerY, { width: midX - left - 10 });
    buyerY = doc.y + 1;
  });
  const buyerGstin = data.order.buyerBusinessSnapshot?.gstin;
  if (buyerGstin) {
    doc.text(`GSTIN/UIN       :  ${buyerGstin}`, left + 5, buyerY + 1);
    buyerY = doc.y + 1;
  }
  const buyerState =
    billing.state ?? data.order.taxSnapshot?.placeOfSupplyState ?? "";
  if (buyerState) {
    doc.text(`State Name      :  ${buyerState}`, left + 5, buyerY + 1);
    buyerY = doc.y + 1;
  }

  // --- TOP RIGHT: METADATA GRID ---
  const metaRows: Array<[string, string, string, string]> = [
    [
      "Invoice No.",
      String(data.order.invoiceNumber ?? data.order.orderNumber ?? ""),
      "Dated",
      formatDate(
        data.order.invoiceIssuedAt ?? data.order.createdAt ?? new Date(),
      ),
    ],
    [
      "Delivery Note",
      "",
      "Mode/Terms of Payment",
      String(data.order.paymentMethod ?? ""),
    ],
    [
      "Reference No. & Date.",
      String(data.order.orderNumber ?? ""),
      "Other References",
      "",
    ],
    [
      "Buyer's Order No.",
      String(data.order.purchaseOrderReference ?? ""),
      "Dated",
      "",
    ],
    ["Dispatch Doc No.", "", "Delivery Note Date", ""],
    [
      "Dispatched through",
      "",
      "Destination",
      String(data.order.shippingAddress?.city ?? ""),
    ],
  ];

  const rowH = 22;
  let metaY = boxTop;
  metaRows.forEach(([lLabel, lVal, rLabel, rVal]) => {
    doc
      .font("Helvetica")
      .fontSize(7)
      .text(lLabel, midX + 4, metaY + 2, { width: rightColMid - midX - 8 });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(lVal, midX + 4, metaY + 11, { width: rightColMid - midX - 8 });
    doc
      .font("Helvetica")
      .fontSize(7)
      .text(rLabel, rightColMid + 4, metaY + 2, {
        width: right - rightColMid - 8,
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(rVal, rightColMid + 4, metaY + 11, {
        width: right - rightColMid - 8,
      });
    metaY += rowH;
    hLine(midX, right, metaY);
  });
  vLine(rightColMid, boxTop, metaY);

  // Terms of Delivery
  doc
    .font("Helvetica")
    .fontSize(7)
    .text("Terms of Delivery", midX + 4, metaY + 3);
  if (data.merchant.termsOfDelivery) {
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(data.merchant.termsOfDelivery, midX + 4, metaY + 14, {
        width: right - midX - 8,
      });
  }

  const headerBottom = Math.max(buyerY + 6, metaY + 42);
  vLine(midX, boxTop, headerBottom);
  hLine(left, right, headerBottom);

  // --- ITEMS TABLE ---
  const cols = [
    { key: "sl", label: "Sl\nNo.", w: 22, align: "center" as const },
    {
      key: "desc",
      label: "Description of Goods",
      w: 175,
      align: "left" as const,
    },
    { key: "hsn", label: "HSN/SAC", w: 54, align: "center" as const },
    { key: "qty", label: "Quantity", w: 54, align: "right" as const },
    {
      key: "rateIncl",
      label: "Rate\n(Incl. of Tax)",
      w: 62,
      align: "right" as const,
    },
    { key: "rate", label: "Rate", w: 62, align: "right" as const },
    { key: "per", label: "per", w: 26, align: "center" as const },
    {
      key: "amount",
      label: "Amount",
      w: width - (22 + 175 + 54 + 54 + 62 + 62 + 26),
      align: "right" as const,
    },
  ];

  const colX: number[] = [];
  let cursorX = left;
  cols.forEach((c) => {
    colX.push(cursorX);
    cursorX += c.w;
  });

  const tableHeaderH = 24;
  let y = headerBottom;
  doc.font("Helvetica").fontSize(7.5);
  cols.forEach((c, i) => {
    doc.text(c.label, colX[i] + 2, y + 4, { width: c.w - 4, align: "center" });
  });
  hLine(left, right, y + tableHeaderH);
  const tableBodyTop = y + tableHeaderH;
  y = tableBodyTop + 4;

  let totalQty = 0;
  let totalTaxableMinor = 0;
  let totalCgstMinor = 0;
  let totalSgstMinor = 0;
  let totalIgstMinor = 0;

  data.items.forEach((item, idx) => {
    const qty = item.quantity;
    totalQty += qty;
    const taxableMinor =
      item.taxableMinor || Math.round(item.priceAtPurchase * qty * 100);
    const unitTaxableMinor =
      item.unitPriceMinor || Math.round(taxableMinor / Math.max(qty, 1));
    const rateInclMinor = Math.round(
      unitTaxableMinor * (1 + (item.gstRateBps ?? 0) / 10000),
    );

    totalTaxableMinor += taxableMinor;
    totalCgstMinor += item.cgstMinor ?? 0;
    totalSgstMinor += item.sgstMinor ?? 0;
    totalIgstMinor += item.igstMinor ?? 0;

    const descText = `${(item.productTitle ?? "Product").toUpperCase()}${item.skuSnapshot ? `\nSKU: ${item.skuSnapshot}` : ""}`;
    doc.font("Helvetica-Bold").fontSize(8);
    const rowHeight = Math.max(
      16,
      doc.heightOfString(descText, { width: cols[1].w - 6 }) + 4,
    );

    doc
      .font("Helvetica")
      .fontSize(8)
      .text(String(idx + 1), colX[0] + 2, y, {
        width: cols[0].w - 4,
        align: "center",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(descText, colX[1] + 3, y, { width: cols[1].w - 6, align: "left" });
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(item.hsnCodeSnapshot ?? "—", colX[2] + 2, y, {
        width: cols[2].w - 4,
        align: "center",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(`${qty.toFixed(2)} Nos.`, colX[3] + 2, y, {
        width: cols[3].w - 4,
        align: "right",
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(formatInr(rateInclMinor), colX[4] + 2, y, {
        width: cols[4].w - 4,
        align: "right",
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(formatInr(unitTaxableMinor), colX[5] + 2, y, {
        width: cols[5].w - 4,
        align: "right",
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .text("Nos.", colX[6] + 2, y, { width: cols[6].w - 4, align: "center" });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(formatInr(taxableMinor), colX[7] + 2, y, {
        width: cols[7].w - 4,
        align: "right",
      });

    y += rowHeight + 2;
  });

  // Tax & Round Off lines inside table body
  const taxSnap = data.order.taxSnapshot ?? {};
  const cgstMinor = taxSnap.cgstMinor ?? totalCgstMinor;
  const sgstMinor = taxSnap.sgstMinor ?? totalSgstMinor;
  const igstMinor = taxSnap.igstMinor ?? totalIgstMinor;
  const computedTotalMinor =
    totalTaxableMinor + cgstMinor + sgstMinor + igstMinor;
  const grandTotalMinor =
    Number.isFinite(data.order.amountMinor) && data.order.amountMinor > 0
      ? data.order.amountMinor
      : computedTotalMinor;
  const roundOffMinor = grandTotalMinor - computedTotalMinor;

  y += 10;
  hLine(colX[7] + 4, right - 2, y - 2, 0.5);
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(formatInr(totalTaxableMinor), colX[7] + 2, y + 2, {
      width: cols[7].w - 4,
      align: "right",
    });
  y += 14;

  const drawTaxRow = (label: string, amountMinor: number) => {
    doc
      .font("Helvetica-BoldOblique")
      .fontSize(8)
      .text(label, colX[1] + 2, y, { width: cols[1].w - 8, align: "right" });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(formatInr(amountMinor), colX[7] + 2, y, {
        width: cols[7].w - 4,
        align: "right",
      });
    y += 13;
  };

  if (igstMinor > 0) {
    drawTaxRow("IGST", igstMinor);
  } else {
    drawTaxRow("CGST", cgstMinor);
    drawTaxRow("SGST", sgstMinor);
  }
  if (roundOffMinor !== 0) {
    drawTaxRow("Round Off", roundOffMinor);
  }

  // Stretch table slightly for clean Tally spacing
  const tableBottom = Math.max(y + 18, tableBodyTop + 170);
  hLine(left, right, tableBottom);

  // Total row
  const totalRowH = 18;
  doc
    .font("Helvetica")
    .fontSize(8)
    .text("Total", colX[1] + 2, tableBottom + 4, {
      width: cols[1].w - 8,
      align: "right",
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(`${totalQty.toFixed(2)} Nos.`, colX[3] + 2, tableBottom + 4, {
      width: cols[3].w - 4,
      align: "right",
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(`Rs. ${formatInr(grandTotalMinor)}`, colX[7] + 2, tableBottom + 4, {
      width: cols[7].w - 4,
      align: "right",
    });

  // Vertical dividers for Items Table + Total Row
  const totalRowBottom = tableBottom + totalRowH;
  for (let i = 1; i < colX.length; i++) {
    vLine(colX[i], headerBottom, totalRowBottom);
  }
  hLine(left, right, totalRowBottom);

  // --- AMOUNT CHARGEABLE IN WORDS ---
  y = totalRowBottom + 4;
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text("Amount Chargeable (in words)", left + 4, y);
  doc
    .font("Helvetica-Oblique")
    .fontSize(7.5)
    .text("E. & O.E", left + 4, y, { width: width - 8, align: "right" });
  y += 11;
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(indianAmountInWords(grandTotalMinor), left + 4, y);
  y += 15;
  hLine(left, right, y);

  // --- HSN/SAC TAX SUMMARY TABLE ---
  const isInterstate = igstMinor > 0;
  const hsnGroups = new Map<
    string,
    {
      taxable: number;
      rateBps: number;
      cgst: number;
      sgst: number;
      igst: number;
    }
  >();
  data.items.forEach((item) => {
    const key = item.hsnCodeSnapshot || "—";
    const existing = hsnGroups.get(key) ?? {
      taxable: 0,
      rateBps: item.gstRateBps,
      cgst: 0,
      sgst: 0,
      igst: 0,
    };
    existing.taxable +=
      item.taxableMinor ||
      Math.round(item.priceAtPurchase * item.quantity * 100);
    existing.cgst += item.cgstMinor ?? 0;
    existing.sgst += item.sgstMinor ?? 0;
    existing.igst += item.igstMinor ?? 0;
    hsnGroups.set(key, existing);
  });

  const hsnTop = y;
  const hsnCols = isInterstate
    ? [left, left + 220, left + 310, left + 365, left + 445, right]
    : [
        left,
        left + 180,
        left + 260,
        left + 300,
        left + 365,
        left + 405,
        left + 470,
        right,
      ];

  doc.font("Helvetica").fontSize(7.5);
  doc.text("HSN/SAC", hsnCols[0] + 2, hsnTop + 8, {
    width: hsnCols[1] - hsnCols[0] - 4,
    align: "center",
  });
  doc.text("Taxable\nValue", hsnCols[1] + 2, hsnTop + 4, {
    width: hsnCols[2] - hsnCols[1] - 4,
    align: "center",
  });

  if (isInterstate) {
    doc.text("IGST", hsnCols[2] + 2, hsnTop + 2, {
      width: hsnCols[4] - hsnCols[2] - 4,
      align: "center",
    });
    hLine(hsnCols[2], hsnCols[4], hsnTop + 13);
    doc.text("Rate", hsnCols[2] + 2, hsnTop + 15, {
      width: hsnCols[3] - hsnCols[2] - 4,
      align: "center",
    });
    doc.text("Amount", hsnCols[3] + 2, hsnTop + 15, {
      width: hsnCols[4] - hsnCols[3] - 4,
      align: "center",
    });
    doc.text("Total\nTax Amount", hsnCols[4] + 2, hsnTop + 4, {
      width: hsnCols[5] - hsnCols[4] - 4,
      align: "center",
    });
  } else {
    doc.text("CGST", hsnCols[2] + 2, hsnTop + 2, {
      width: hsnCols[4] - hsnCols[2] - 4,
      align: "center",
    });
    doc.text("SGST/UTGST", hsnCols[4] + 2, hsnTop + 2, {
      width: hsnCols[6] - hsnCols[4] - 4,
      align: "center",
    });
    hLine(hsnCols[2], hsnCols[6], hsnTop + 13);
    doc.text("Rate", hsnCols[2] + 2, hsnTop + 15, {
      width: hsnCols[3] - hsnCols[2] - 4,
      align: "center",
    });
    doc.text("Amount", hsnCols[3] + 2, hsnTop + 15, {
      width: hsnCols[4] - hsnCols[3] - 4,
      align: "center",
    });
    doc.text("Rate", hsnCols[4] + 2, hsnTop + 15, {
      width: hsnCols[5] - hsnCols[4] - 4,
      align: "center",
    });
    doc.text("Amount", hsnCols[5] + 2, hsnTop + 15, {
      width: hsnCols[6] - hsnCols[5] - 4,
      align: "center",
    });
    doc.text("Total\nTax Amount", hsnCols[6] + 2, hsnTop + 4, {
      width: hsnCols[7] - hsnCols[6] - 4,
      align: "center",
    });
  }

  y = hsnTop + 26;
  hLine(left, right, y);

  let sumTaxMinor = 0;
  hsnGroups.forEach((g, hsn) => {
    const rowTax = isInterstate ? g.igst : g.cgst + g.sgst;
    sumTaxMinor += rowTax;
    doc.font("Helvetica").fontSize(7.5);
    doc.text(hsn, hsnCols[0] + 4, y + 3, {
      width: hsnCols[1] - hsnCols[0] - 8,
    });
    doc.text(formatInr(g.taxable), hsnCols[1] + 2, y + 3, {
      width: hsnCols[2] - hsnCols[1] - 4,
      align: "right",
    });
    if (isInterstate) {
      doc.text(`${(g.rateBps / 100).toFixed(0)}%`, hsnCols[2] + 2, y + 3, {
        width: hsnCols[3] - hsnCols[2] - 4,
        align: "right",
      });
      doc.text(formatInr(g.igst), hsnCols[3] + 2, y + 3, {
        width: hsnCols[4] - hsnCols[3] - 4,
        align: "right",
      });
      doc.text(formatInr(rowTax), hsnCols[4] + 2, y + 3, {
        width: hsnCols[5] - hsnCols[4] - 4,
        align: "right",
      });
    } else {
      const halfRate = (g.rateBps / 200).toFixed(0);
      doc.text(`${halfRate}%`, hsnCols[2] + 2, y + 3, {
        width: hsnCols[3] - hsnCols[2] - 4,
        align: "right",
      });
      doc.text(formatInr(g.cgst), hsnCols[3] + 2, y + 3, {
        width: hsnCols[4] - hsnCols[3] - 4,
        align: "right",
      });
      doc.text(`${halfRate}%`, hsnCols[4] + 2, y + 3, {
        width: hsnCols[5] - hsnCols[4] - 4,
        align: "right",
      });
      doc.text(formatInr(g.sgst), hsnCols[5] + 2, y + 3, {
        width: hsnCols[6] - hsnCols[5] - 4,
        align: "right",
      });
      doc.text(formatInr(rowTax), hsnCols[6] + 2, y + 3, {
        width: hsnCols[7] - hsnCols[6] - 4,
        align: "right",
      });
    }
    y += 14;
  });

  hLine(left, right, y);
  // HSN Total Row
  doc.font("Helvetica-Bold").fontSize(7.5);
  doc.text("Total", hsnCols[0] + 4, y + 3, {
    width: hsnCols[1] - hsnCols[0] - 8,
    align: "right",
  });
  doc.text(formatInr(totalTaxableMinor), hsnCols[1] + 2, y + 3, {
    width: hsnCols[2] - hsnCols[1] - 4,
    align: "right",
  });
  if (isInterstate) {
    doc.text(formatInr(igstMinor), hsnCols[3] + 2, y + 3, {
      width: hsnCols[4] - hsnCols[3] - 4,
      align: "right",
    });
    doc.text(formatInr(sumTaxMinor), hsnCols[4] + 2, y + 3, {
      width: hsnCols[5] - hsnCols[4] - 4,
      align: "right",
    });
  } else {
    doc.text(formatInr(cgstMinor), hsnCols[3] + 2, y + 3, {
      width: hsnCols[4] - hsnCols[3] - 4,
      align: "right",
    });
    doc.text(formatInr(sgstMinor), hsnCols[5] + 2, y + 3, {
      width: hsnCols[6] - hsnCols[5] - 4,
      align: "right",
    });
    doc.text(formatInr(sumTaxMinor), hsnCols[6] + 2, y + 3, {
      width: hsnCols[7] - hsnCols[6] - 4,
      align: "right",
    });
  }
  const hsnBottom = y + 16;
  hLine(left, right, hsnBottom);

  // HSN vertical lines
  for (let i = 1; i < hsnCols.length - 1; i++) {
    const startY =
      (!isInterstate && (i === 3 || i === 5)) || (isInterstate && i === 3)
        ? hsnTop + 13
        : hsnTop;
    vLine(hsnCols[i], startY, hsnBottom);
  }

  // --- TAX AMOUNT IN WORDS ---
  y = hsnBottom + 5;
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text("Tax Amount (in words)  :   ", left + 4, y, { continued: true });
  doc.font("Helvetica-Bold").fontSize(8).text(indianAmountInWords(sumTaxMinor));
  y = doc.y + 6;

  // --- FOOTER: DECLARATION (LEFT) + BANK & SIGNATURE (RIGHT) ---
  const footerTop = y;
  const bankX = left + width * 0.5;

  // Left: Declaration
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text("Declaration", left + 4, footerTop + 14, { underline: true });
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      data.merchant.declaration ??
        "Terms & Condition : (1) Interest at 15% Will be charged on Bills not paid within a week. (2) Our Responsibility Ceases as soon as goods have left our shop. (3) Goods Once Sold will not be taken back. (4) WARRANTY : As per Company's Terms & Conditions. (5) E. & O. E.",
      left + 4,
      footerTop + 26,
      { width: bankX - left - 12 },
    );
  const leftFooterBottom = doc.y + 8;

  // Right: Bank Details
  let rightY = footerTop;
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text("Company's Bank Details", bankX + 4, rightY);
  rightY += 11;
  const bankRows = [
    ["Bank Name", data.merchant.bankName ?? ""],
    ["A/c No.", data.merchant.bankAccountNo ?? ""],
    ["Branch & IFS Code", data.merchant.bankBranchIfsc ?? ""],
  ];
  bankRows.forEach(([k, v]) => {
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .text(k, bankX + 4, rightY, { width: 78 });
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(`:  ${v}`, bankX + 82, rightY, { width: right - (bankX + 86) });
    rightY += 11;
  });

  // Right: Signature Box
  const sigTop = rightY + 2;
  hLine(bankX, right, sigTop);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(`for ${data.merchant.name}`, bankX + 4, sigTop + 4, {
      width: right - bankX - 8,
      align: "right",
    });
  const sigBottom = Math.max(leftFooterBottom, sigTop + 46);
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      data.merchant.signatureLabel ?? "Authorised Signatory",
      bankX + 4,
      sigBottom - 12,
      {
        width: right - bankX - 8,
        align: "right",
      },
    );
  vLine(bankX, sigTop, sigBottom);

  // Outer Border Box
  doc
    .rect(left, boxTop, width, sigBottom - boxTop)
    .lineWidth(0.8)
    .stroke(borderColor);

  // Bottom Centered Note
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text("This is a Computer Generated Invoice", left, sigBottom + 6, {
      width,
      align: "center",
    });

  const range = doc.bufferedPageRange();
  doc.end();
  await new Promise<void>((resolve, reject) => {
    doc.once("end", resolve);
    doc.once("error", reject);
  });
  return { buffer: Buffer.concat(chunks), pageCount: range.count };
}
