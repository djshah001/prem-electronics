import { Router } from "express";
import { adminOnly, authenticate } from "../../core/middlewares/authGuard.js";
import { asyncHandler } from "../../core/middlewares/asyncHandler.js";
import { AppError } from "../../core/errors/appError.js";
import { invoiceService, getInvoicePublicToken } from "./invoice.service.js";

const router = Router();

router.get(
  "/public/:orderId/pdf",
  asyncHandler(async (req, res) => {
    const orderId = String(req.params.orderId);
    const token = String(req.query.token || "");
    const expectedToken = getInvoicePublicToken(orderId);
    if (!token || token !== expectedToken) {
      throw new AppError("Invalid or expired invoice link.", 403);
    }
    const invoice = await invoiceService.issueForOrder(orderId);
    res
      .type("application/pdf")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      );
    res.send(invoice.pdfBytes);
  }),
);

router.get(
  "/preview",
  ...adminOnly,
  asyncHandler(async (_req, res) => {
    const rendered = await invoiceService.preview();
    res
      .type("application/pdf")
      .setHeader(
        "Content-Disposition",
        'inline; filename="invoice-preview.pdf"',
      );
    res.setHeader("X-Invoice-Pages", String(rendered.pageCount));
    res.send(rendered.buffer);
  }),
);

router.get(
  "/orders/:orderId/pdf",
  authenticate,
  asyncHandler(async (req, res) => {
    const isAdmin =
      req.user!.role === "admin" || req.user!.role === "superadmin";
    const invoice = await invoiceService.issueForOrder(
      String(req.params.orderId),
      isAdmin ? undefined : req.user!.id,
    );
    res
      .type("application/pdf")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      );
    res.send(invoice.pdfBytes);
  }),
);

export default router;
