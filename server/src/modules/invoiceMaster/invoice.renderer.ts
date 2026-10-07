import PDFDocument from 'pdfkit';
import type { InvoiceTemplateConfig } from '../../infrastructure/database/schema/contentMasters.js';

type InvoiceItem = {
  productTitle?: string | null; hsnCodeSnapshot?: string | null; skuSnapshot?: string | null; quantity: number;
  priceAtPurchase: number; unitPriceMinor: number; taxableMinor: number; gstRateBps: number; cgstMinor: number; sgstMinor: number; igstMinor: number; lineTotalMinor: number;
};
export type InvoiceRenderData = { merchant: Record<string, unknown>; order: Record<string, any>; items: InvoiceItem[] };

const money = (minor: number) => `INR ${(minor / 100).toFixed(2)}`;
const displayAddress = (value: any) => value ? [value.fullName ?? value.legalName, value.street ?? value.addressLine1, value.addressLine2, value.city, value.state, value.pincode, value.country].filter(Boolean).join(', ') : 'Not provided';
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const under100 = (n: number) => n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`;
const under1000 = (n: number) => `${n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred ` : ''}${under100(n % 100)}`.trim();
export const indianAmountInWords = (amount: number) => {
  let value = Math.max(0, Math.floor(amount)); if (value === 0) return 'Zero Rupees Only';
  const parts: string[] = []; const units: Array<[number, string]> = [[10_000_000, 'Crore'], [100_000, 'Lakh'], [1_000, 'Thousand']];
  for (const [size, label] of units) if (value >= size) { parts.push(`${under1000(Math.floor(value / size))} ${label}`); value %= size; }
  if (value) parts.push(under1000(value)); return `${parts.join(' ')} Rupees Only`;
};
const mm = (value: number) => value * 2.83465;

export async function renderInvoicePdf(config: InvoiceTemplateConfig, data: InvoiceRenderData): Promise<{ buffer: Buffer; pageCount: number }> {
  const doc = new PDFDocument({ size: 'A4', margin: mm(config.page.marginMm), bufferPages: true, info: { Title: `Tax Invoice ${data.order.invoiceNumber ?? data.order.orderNumber}` } });
  const chunks: Buffer[] = []; doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const left = doc.page.margins.left; const width = doc.page.width - left - doc.page.margins.right; const bottom = () => doc.page.height - doc.page.margins.bottom - 30;
  const label = (key: string, fallback: string) => config.labels[key] || fallback;
  const line = (y = doc.y) => { doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).stroke('#111111'); };
  const continuedHeader = () => { doc.font('Helvetica-Bold').fontSize(8).text(`${label('invoice', 'Tax Invoice')} — ${data.order.invoiceNumber ?? data.order.orderNumber}`, { align: 'right' }); doc.moveDown(0.4); };
  const ensure = (height: number, continuation?: () => void) => { if (doc.y + height <= bottom()) return; doc.addPage(); continuedHeader(); continuation?.(); };
  const closeSection = () => { doc.moveDown(0.35); line(); doc.moveDown(0.45); };
  const totalMinor = Number.isFinite(data.order.amountMinor) && data.order.amountMinor > 0 ? data.order.amountMinor : Math.round(Number(data.order.total) * 100);
  const tax = data.order.taxSnapshot ?? {};

  doc.font('Helvetica-Bold').fontSize(15).text(label('invoice', 'Tax Invoice'), { align: 'center' }); doc.moveDown(0.35); line(); doc.moveDown(0.55);

  const columns = [
    { label: 'Sl', x: 0, w: 22 }, { label: 'Description of Goods', x: 22, w: 185 }, { label: 'HSN/SAC', x: 207, w: 55 },
    { label: 'Qty', x: 262, w: 35 }, { label: 'Rate', x: 297, w: 62 }, { label: 'GST', x: 359, w: 38 }, { label: 'Amount', x: 397, w: width - 397 },
  ];
  const tableHeader = () => { const y = doc.y; doc.font('Helvetica-Bold').fontSize(7); columns.forEach((column) => doc.text(column.label, left + column.x + 2, y + 3, { width: column.w - 4, align: column.x > 200 ? 'right' : 'left' })); doc.y = y + 17; line(); };

  const renderers: Record<string, () => void> = {
    seller: () => {
      ensure(65); doc.font('Helvetica-Bold').fontSize(11).text(config.merchant.name || String(data.merchant.name ?? 'Prem Electronics'));
      doc.font('Helvetica').fontSize(8); if (config.merchant.address || data.merchant.address) doc.text(String(config.merchant.address || data.merchant.address));
      const meta = [config.merchant.gstin && `GSTIN: ${config.merchant.gstin}`, config.merchant.pan && `PAN: ${config.merchant.pan}`, config.merchant.state && `State: ${config.merchant.state}${config.merchant.stateCode ? ` (${config.merchant.stateCode})` : ''}`, config.merchant.phone, config.merchant.email].filter(Boolean).join('  |  ');
      if (meta) doc.text(meta); closeSection();
    },
    buyer: () => {
      const shipping = displayAddress(data.order.shippingAddress); const billingValue = data.order.buyerBusinessSnapshot?.billingAddress ?? data.order.billingAddress ?? data.order.shippingAddress; const billing = displayAddress(billingValue); const col = width / 2;
      doc.font('Helvetica').fontSize(8); const needed = Math.max(doc.heightOfString(shipping, { width: col - 8 }), doc.heightOfString(billing, { width: col - 8 })) + 40; ensure(needed);
      const y = doc.y; doc.font('Helvetica-Bold').text(label('consignee', 'Consignee (Ship to)'), left, y, { width: col - 8 }); doc.font('Helvetica').text(shipping, left, y + 12, { width: col - 8 });
      doc.font('Helvetica-Bold').text(label('buyer', 'Buyer (Bill to)'), left + col, y, { width: col - 8 }); doc.font('Helvetica').text(billing, left + col, y + 12, { width: col - 8 });
      const gstin = data.order.buyerBusinessSnapshot?.gstin; if (gstin) doc.text(`GSTIN: ${gstin}`, left + col, y + 16 + doc.heightOfString(billing, { width: col - 8 }), { width: col - 8 });
      doc.y = y + needed; closeSection();
    },
    metadata: () => {
      ensure(86); const pairs = [['Invoice No.', data.order.invoiceNumber ?? data.order.orderNumber], ['Dated', new Date(data.order.invoiceIssuedAt ?? data.order.createdAt).toLocaleDateString('en-IN')], ['Payment Method', data.order.paymentMethod ?? '—'], ['Buyer Order No.', data.order.purchaseOrderReference ?? '—'], ['Place of Supply', data.order.taxSnapshot?.placeOfSupplyState ?? data.order.shippingAddress?.state ?? '—'], ['Terms of Delivery', config.terms ?? '—']];
      const y = doc.y; pairs.forEach(([key, value], index) => { const column = index % 2; const row = Math.floor(index / 2); const x = left + column * width / 2; doc.font('Helvetica-Bold').fontSize(7).text(key, x, y + row * 25, { width: width / 2 - 8 }); doc.font('Helvetica').fontSize(8).text(String(value), x, y + row * 25 + 9, { width: width / 2 - 8 }); });
      doc.y = y + Math.ceil(pairs.length / 2) * 25; closeSection();
    },
    items: () => {
      ensure(40); tableHeader();
      data.items.forEach((item, index) => { const description = `${item.productTitle ?? 'Product'}${item.skuSnapshot ? `\nSKU: ${item.skuSnapshot}` : ''}`; doc.font('Helvetica').fontSize(7); const height = Math.max(24, doc.heightOfString(description, { width: 177 }) + 8); ensure(height + 12, config.page.repeatTableHeader ? tableHeader : undefined); const y = doc.y; const cells = [String(index + 1), description, item.hsnCodeSnapshot ?? '—', String(item.quantity), money(item.unitPriceMinor || Math.round(item.priceAtPurchase * 100)), `${(item.gstRateBps / 100).toFixed(2)}%`, money(item.lineTotalMinor || Math.round(item.priceAtPurchase * item.quantity * 100))]; columns.forEach((column, cellIndex) => doc.text(cells[cellIndex], left + column.x + 2, y + 4, { width: column.w - 4, align: column.x > 200 ? 'right' : 'left' })); doc.y = y + height; line(); });
      doc.moveDown(0.35).font('Helvetica-Bold').fontSize(9).text(`Total quantity: ${data.items.reduce((sum, item) => sum + item.quantity, 0)}          ${label('grandTotal', 'Grand Total')}: ${money(totalMinor)}`, { align: 'right' }); closeSection();
    },
    taxSummary: () => { ensure(45); doc.font('Helvetica-Bold').fontSize(8).text('GST Summary'); doc.font('Helvetica').text(`Taxable value: ${money(tax.taxableMinor ?? 0)}   CGST: ${money(tax.cgstMinor ?? 0)}   SGST: ${money(tax.sgstMinor ?? 0)}   IGST: ${money(tax.igstMinor ?? 0)}   Total tax: ${money(tax.totalTaxMinor ?? Math.round(Number(data.order.tax) * 100))}`); closeSection(); },
    amountWords: () => { ensure(35); doc.font('Helvetica').fontSize(8).text(`${label('amountWords', 'Amount chargeable in words')}: ${indianAmountInWords(totalMinor / 100)}`); closeSection(); },
    bank: () => { if (!config.merchant.bankDetails) return; ensure(45); doc.font('Helvetica-Bold').fontSize(8).text('Bank details'); doc.font('Helvetica').text(config.merchant.bankDetails); closeSection(); },
    terms: () => { const value = config.merchant.declaration ?? config.terms; if (!value) return; ensure(50); doc.font('Helvetica-Bold').fontSize(8).text(config.merchant.declaration ? 'Declaration' : 'Terms'); doc.font('Helvetica').text(value); closeSection(); },
    signature: () => { ensure(65); doc.font('Helvetica-Bold').fontSize(8).text(`for ${config.merchant.name}`, { align: 'right' }).moveDown(1.5).text(config.merchant.signatureLabel ?? 'Authorised Signatory', { align: 'right' }); closeSection(); },
  };

  [...config.sections].filter((section) => section.visible).sort((a, b) => a.order - b.order).forEach((section) => renderers[section.key]?.());
  ensure(20); doc.font('Helvetica').fontSize(7).text('This is a Computer Generated Invoice', { align: 'center' });
  const range = doc.bufferedPageRange();
  if (config.page.showPageNumbers) for (let index = range.start; index < range.start + range.count; index += 1) { doc.switchToPage(index); doc.font('Helvetica').fontSize(7).text(`Page ${index + 1} of ${range.count}`, left, doc.page.height - doc.page.margins.bottom - 10, { width, align: 'center', lineBreak: false }); }
  doc.end(); await new Promise<void>((resolve, reject) => { doc.once('end', resolve); doc.once('error', reject); });
  return { buffer: Buffer.concat(chunks), pageCount: range.count };
}
