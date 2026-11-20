import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Package, ArrowLeft, Clock, CheckCircle2, Truck, MapPin,
  RotateCcw, X, Star, Receipt, CreditCard,
  ShieldCheck, Printer, Download,
  Copy, Check, Building2, Phone, AlertCircle,
  ExternalLink, HelpCircle
} from 'lucide-react';
import { api, axiosClient } from '../../api/axiosClient';
import type { Order, OrderItem } from '../../types';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface OrderDetailData extends Order {
  items: (OrderItem & { productImages?: string[]; productSlug?: string })[];
  merchant?: {
    name: string;
    gstin?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    cin?: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string; icon: typeof Package }> = {
  pending: { label: 'Order Placed', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30', dot: 'bg-amber-500', icon: Clock },
  confirmed: { label: 'Payment Confirmed', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', dot: 'bg-blue-500', icon: CheckCircle2 },
  processing: { label: 'Processing & Packed', bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30', dot: 'bg-purple-500', icon: Package },
  shipped: { label: 'Out for Delivery / In Transit', bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30', dot: 'bg-cyan-500', icon: Truck },
  delivered: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30', dot: 'bg-emerald-500', icon: ShieldCheck },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/30', dot: 'bg-rose-500', icon: X },
  refunded: { label: 'Refunded', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400', icon: RotateCcw },
};

const STEP_DEFINITIONS = [
  { key: 'pending', label: 'Order Placed', desc: 'Received & logged' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Payment verified' },
  { key: 'processing', label: 'Packed', desc: 'Quality checked' },
  { key: 'shipped', label: 'In Transit', desc: 'Dispatched with courier' },
  { key: 'delivered', label: 'Delivered', desc: 'Delivered safely' },
];

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(p));

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-order', id],
    queryFn: () => api.get<OrderDetailData>(`/orders/my/${id}`),
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.patch<Order>(`/orders/my/${id}/cancel`),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Order cancelled.');
      qc.invalidateQueries({ queryKey: ['my-order', id] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not cancel order.'),
  });

  const order = data?.data;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadPdf = async () => {
    if (!order) return;
    try {
      setIsDownloading(true);
      toast.loading('Generating tax invoice PDF...', { id: 'pdf-dl' });
      const response = await axiosClient.get(`/invoice-master/orders/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${order.invoiceNumber ?? order.orderNumber ?? 'invoice'}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Tax invoice downloaded successfully', { id: 'pdf-dl' });
    } catch (error: any) {
      toast.error(error?.message ?? 'Invoice PDF is not available yet.', { id: 'pdf-dl' });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-6">
        <div className="h-6 bg-muted rounded w-32" />
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-60" />
            <div className="h-4 bg-muted rounded w-40" />
          </div>
          <div className="h-10 bg-muted rounded-xl w-36" />
        </div>
        <div className="h-32 bg-card rounded-2xl border border-border p-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-64 bg-card rounded-2xl border border-border" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-card rounded-2xl border border-border" />
            <div className="h-48 bg-card rounded-2xl border border-border" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold font-['Outfit'] mb-2">Order Not Found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We could not locate the details for this order reference.
        </p>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </Link>
      </div>
    );
  }

  const currentStepIndex = STEP_DEFINITIONS.findIndex((s) => s.key === order.status);
  const isCancelled = ['cancelled', 'refunded'].includes(order.status);
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const isPaid = order.paymentStatus === 'paid';
  const taxSnapshot = (order.taxSnapshot as any) ?? {};
  const isCompany = order.purchaseType === 'company';
  const buyerBusiness = (order.buyerBusinessSnapshot as any) ?? null;

  // Calculate progress percentage
  const progressPercent = currentStepIndex >= 0
    ? (currentStepIndex / (STEP_DEFINITIONS.length - 1)) * 100
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:m-0 print:max-w-none">
      {/* ─────────────────────────────────────────────────────────────
          PRINT-ONLY INVOICE HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-foreground/20">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black font-['Outfit'] tracking-tight">
              {order.merchant?.name ?? 'Prem Electronics'}
            </h1>
            {order.merchant?.gstin && <p className="text-xs text-muted-foreground">GSTIN: {order.merchant.gstin}</p>}
            {order.merchant?.address && <p className="text-xs text-muted-foreground">{order.merchant.address}</p>}
            {(order.merchant?.email || order.merchant?.phone) && (
              <p className="text-xs text-muted-foreground">
                {[order.merchant.email, order.merchant.phone].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold font-['Outfit']">TAX INVOICE</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Invoice #: {order.invoiceNumber ?? 'INV-' + order.orderNumber}
            </p>
            <p className="text-xs text-muted-foreground">Date: {formatDate(order.invoiceIssuedAt ?? order.createdAt)}</p>
            <p className="text-xs text-muted-foreground">
              Payment: {order.paymentMethod?.toUpperCase() ?? 'ONLINE'} ({order.paymentStatus.toUpperCase()})
            </p>
            {order.razorpayPaymentId && (
              <p className="text-[11px] font-mono text-muted-foreground">Txn ID: {order.razorpayPaymentId}</p>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SCREEN HEADER & NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <div className="print:hidden mb-6">
        <button
          onClick={() => navigate('/account/orders')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to My Orders
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
                Order #{order.orderNumber}
              </h1>
              <button
                onClick={() => handleCopy(order.orderNumber, 'order-num')}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Copy Order Number"
              >
                {copiedKey === 'order-num' ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              {isCompany && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Building2 className="w-3.5 h-3.5" /> B2B Company Order
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Placed on {formatDate(order.createdAt)} · {order.items?.length ?? 0} item{(order.items?.length ?? 0) === 1 ? '' : 's'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={clsx(
              'inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full font-semibold border capitalize',
              statusCfg.bg, statusCfg.text, statusCfg.border
            )}>
              <span className={clsx('w-2 h-2 rounded-full', statusCfg.dot, {
                'animate-ping': ['pending', 'shipped'].includes(order.status)
              })} />
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusCfg.label}</span>
            </span>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-primary" /> Print
            </button>

            {isPaid && (
              <button
                onClick={downloadPdf}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl gradient-primary text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Generating PDF…' : 'Tax Invoice (PDF)'}</span>
              </button>
            )}

            {canCancel && (
              <button
                disabled={cancelMutation.isPending}
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this order? Inventory will be released.')) {
                    cancelMutation.mutate();
                  }
                }}
                className="text-xs text-destructive hover:bg-destructive/10 border border-destructive/20 font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CANCELLED / REFUND BANNER (IF APPLICABLE)
      ───────────────────────────────────────────────────────────── */}
      {isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx(
            'rounded-2xl p-5 mb-6 border print:hidden flex items-start gap-3.5',
            order.status === 'cancelled'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
          )}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold">
              {order.status === 'cancelled' ? 'Order Cancelled' : 'Order Refunded'}
            </h4>
            <p className="text-xs opacity-90 mt-1">
              {order.status === 'cancelled' && isPaid
                ? 'This order was cancelled after payment. Your refund has been initiated and will credit back to your original payment method in 3–5 working days.'
                : order.status === 'cancelled'
                ? 'This order has been cancelled and will not be processed or delivered.'
                : 'A full refund has been settled for this purchase.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          INTERACTIVE ORDER PROGRESS TRACKER
      ───────────────────────────────────────────────────────────── */}
      {!isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6 mb-6 print:hidden shadow-xs"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <h2 className="font-bold font-['Outfit'] text-base">Fulfillment & Tracking</h2>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Estimated Delivery: 2–4 Business Days
            </span>
          </div>

          <div className="relative pt-2 pb-4">
            {/* Background Line */}
            <div className="absolute top-6 left-6 right-6 h-1 bg-muted rounded-full" />
            {/* Animated Active Line */}
            <motion.div
              className="absolute top-6 left-6 h-1 bg-gradient-to-r from-primary via-primary to-cyan-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* Stepper Nodes */}
            <div className="relative flex justify-between">
              {STEP_DEFINITIONS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center max-w-[100px]">
                    <div
                      className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 relative',
                        isPassed
                          ? 'bg-primary text-white shadow-md shadow-primary/25'
                          : 'bg-card border-2 border-border text-muted-foreground'
                      )}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}

                      {/* Pulsing Ring on Active Node */}
                      {isCurrent && (
                        <span className="absolute -inset-1.5 rounded-full border-2 border-primary/40 animate-ping pointer-events-none" />
                      )}
                    </div>

                    <p className={clsx('text-xs font-bold mt-2.5', isPassed ? 'text-foreground' : 'text-muted-foreground')}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 hidden sm:block mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT GRID: ITEMS + SUMMARY
      ───────────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6 print:grid-cols-1">
        {/* Left Column: Items List + Addresses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Card */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs print:shadow-none print:border-foreground/15">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold font-['Outfit'] text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Items in this Order ({order.items?.length ?? 0})
              </h2>
              {order.invoiceNumber && (
                <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                  INV: {order.invoiceNumber}
                </span>
              )}
            </div>

            <div className="divide-y divide-border/60">
              {(order.items ?? []).map((item) => {
                const imgSrc = item.productImages?.[0] || item.imageSnapshot;
                const variant = (item.variantSnapshot as any) ?? {};
                const lineTotal = Number(item.priceAtPurchase) * item.quantity;

                return (
                  <div key={item.id} className="py-4.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 items-start">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex-shrink-0 flex items-center justify-center print:hidden">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.productTitle ?? ''}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Item Information */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-2">
                        {item.productTitle}
                      </h3>

                      {/* Snapshots & Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          Qty: {item.quantity}
                        </span>

                        {(item.skuSnapshot || variant.sku) && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">
                            SKU: {item.skuSnapshot || variant.sku}
                          </span>
                        )}

                        {item.hsnCodeSnapshot && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">
                            HSN: {item.hsnCodeSnapshot}
                          </span>
                        )}

                        {variant.brand && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {variant.brand}
                          </span>
                        )}
                      </div>

                      {/* Rate and Tax Details per Item */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span>Unit Rate: {formatPrice(item.priceAtPurchase)}</span>
                        {item.gstRateBps && (
                          <span>· GST @ {item.gstRateBps / 100}%</span>
                        )}
                      </div>

                      {/* Quick Links */}
                      {item.productSlug && (
                        <div className="mt-3 flex items-center gap-3 print:hidden">
                          <Link
                            to={`/products/${item.productSlug}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <span>View Product</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>

                          {order.status === 'delivered' && (
                            <Link
                              to={`/products/${item.productSlug}#reviews`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 hover:underline"
                            >
                              <Star className="w-3 h-3 fill-amber-500" /> Write Review
                            </Link>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price column */}
                    <div className="text-left sm:text-right flex-shrink-0 self-end sm:self-start">
                      <p className="font-bold text-base text-foreground font-mono">
                        {formatPrice(lineTotal)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatPrice(item.priceAtPurchase)} each
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Billing Address Cards (2-column layout) */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Delivery Address */}
            {order.shippingAddress && (
              <div className="bg-card rounded-2xl border border-border p-5 shadow-xs print:border-foreground/15">
                <h3 className="font-bold font-['Outfit'] text-sm mb-3 flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-primary" /> Delivery Address
                </h3>
                <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                  <p className="font-bold text-sm text-foreground">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pincode}</p>
                  <p>{order.shippingAddress.country}</p>
                  <p className="pt-1.5 flex items-center gap-1.5 text-foreground font-medium">
                    <Phone className="w-3 h-3 text-primary" /> {order.shippingAddress.phone}
                  </p>
                </div>
              </div>
            )}

            {/* B2B Company Billing Block (if company purchase) */}
            {isCompany && buyerBusiness ? (
              <div className="bg-card rounded-2xl border border-border p-5 shadow-xs print:border-foreground/15">
                <h3 className="font-bold font-['Outfit'] text-sm mb-3 flex items-center gap-2 text-foreground">
                  <Building2 className="w-4 h-4 text-blue-500" /> B2B Billing (Tax Invoice)
                </h3>
                <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                  <p className="font-bold text-sm text-foreground">{buyerBusiness.legalName}</p>
                  {buyerBusiness.tradeName && <p>{buyerBusiness.tradeName}</p>}
                  <p className="font-mono text-foreground font-semibold">
                    GSTIN: {buyerBusiness.gstin}
                  </p>
                  {buyerBusiness.billingAddress && (
                    <p>
                      {[buyerBusiness.billingAddress.building, buyerBusiness.billingAddress.street, buyerBusiness.billingAddress.locality].filter(Boolean).join(', ')}, {buyerBusiness.billingAddress.city}, {buyerBusiness.billingAddress.state} – {buyerBusiness.billingAddress.pincode}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/80 pt-1">
                    Verified Snapshot · v{buyerBusiness.profileVersion ?? 1}
                  </p>
                </div>
              </div>
            ) : (
              /* Fallback: Help & Support Card */
              <div className="bg-card rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between print:hidden">
                <div>
                  <h3 className="font-bold font-['Outfit'] text-sm mb-2 flex items-center gap-2 text-foreground">
                    <HelpCircle className="w-4 h-4 text-primary" /> Need Help With Your Order?
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Have questions about delivery, warranty registration, or tax invoices? Our support team is here to assist you.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-xs">
                  <a href="mailto:support@premelectronics.com" className="font-semibold text-primary hover:underline">
                    Email Support
                  </a>
                  <span className="text-border">|</span>
                  <a href="tel:+919876543210" className="font-semibold text-primary hover:underline">
                    Call Store
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payment Details & Detailed GST Breakdown */}
        <div className="space-y-6">
          {/* Payment & GST Summary Card */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs print:shadow-none print:border-foreground/15">
            <h2 className="font-bold font-['Outfit'] text-base mb-4 flex items-center gap-2 text-foreground">
              <Receipt className="w-4 h-4 text-primary" /> Price & Tax Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Items Subtotal</span>
                <span className="font-mono text-foreground">{formatPrice(order.subtotal)}</span>
              </div>

              {Number(order.discount) > 0 && (
                <div className="flex justify-between items-center text-emerald-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    Discount
                    {order.couponCode && (
                      <span className="font-mono text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {order.couponCode}
                      </span>
                    )}
                  </span>
                  <span className="font-mono">-{formatPrice(order.discount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Shipping</span>
                <span>
                  {Number(order.shipping) === 0 ? (
                    <span className="text-emerald-500 font-semibold text-xs bg-emerald-500/10 px-2 py-0.5 rounded">
                      FREE DELIVERY
                    </span>
                  ) : (
                    <span className="font-mono text-foreground">{formatPrice(order.shipping)}</span>
                  )}
                </span>
              </div>

              {/* Detailed GST Section */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
                  <span>GST Breakdown</span>
                  <span className="capitalize text-[11px]">
                    {taxSnapshot.jurisdiction === 'inter_state' ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)'}
                  </span>
                </div>

                {Number(taxSnapshot.cgstMinor ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground pl-2">
                    <span>Central GST (CGST)</span>
                    <span className="font-mono text-foreground">{formatPrice(Number(taxSnapshot.cgstMinor) / 100)}</span>
                  </div>
                )}

                {Number(taxSnapshot.sgstMinor ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground pl-2">
                    <span>State GST (SGST / UTGST)</span>
                    <span className="font-mono text-foreground">{formatPrice(Number(taxSnapshot.sgstMinor) / 100)}</span>
                  </div>
                )}

                {Number(taxSnapshot.igstMinor ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground pl-2">
                    <span>Integrated GST (IGST)</span>
                    <span className="font-mono text-foreground">{formatPrice(Number(taxSnapshot.igstMinor) / 100)}</span>
                  </div>
                )}

                {taxSnapshot.placeOfSupplyState && (
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground/70 pl-2">
                    <span>Place of Supply</span>
                    <span>{taxSnapshot.placeOfSupplyState} ({taxSnapshot.placeOfSupplyStateCode ?? ''})</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-muted-foreground font-medium pt-1">
                  <span>Total Tax</span>
                  <span className="font-mono text-foreground">{formatPrice(order.tax)}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center font-black text-lg pt-3 border-t border-border text-foreground">
                <div>
                  <span>Grand Total</span>
                  <p className="text-[11px] font-normal text-muted-foreground">Inclusive of all taxes</p>
                </div>
                <span className="text-primary font-mono text-xl">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Information Card */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs print:shadow-none print:border-foreground/15 space-y-4">
            <h2 className="font-bold font-['Outfit'] text-base flex items-center gap-2 text-foreground">
              <CreditCard className="w-4 h-4 text-primary" /> Payment & Transaction
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-semibold text-foreground uppercase tracking-wider">
                  {order.paymentMethod ?? 'Razorpay Gateway'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className={clsx(
                  'font-bold px-2 py-0.5 rounded-full capitalize',
                  isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                )}>
                  {order.paymentStatus}
                </span>
              </div>

              {order.razorpayPaymentId && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Transaction Reference:</span>
                  <div className="flex items-center justify-between font-mono text-[11px] bg-muted/50 p-2 rounded-lg break-all">
                    <span>{order.razorpayPaymentId}</span>
                    <button
                      onClick={() => handleCopy(order.razorpayPaymentId!, 'txn-id')}
                      className="p-1 hover:text-primary transition-colors flex-shrink-0 ml-1"
                      title="Copy Transaction ID"
                    >
                      {copiedKey === 'txn-id' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}

              {order.invoiceNumber && (
                <div className="space-y-1 pt-1">
                  <span className="text-muted-foreground">Official Invoice No:</span>
                  <div className="flex items-center justify-between font-mono text-[11px] bg-muted/50 p-2 rounded-lg">
                    <span>{order.invoiceNumber}</span>
                    <button
                      onClick={() => handleCopy(order.invoiceNumber!, 'inv-no')}
                      className="p-1 hover:text-primary transition-colors flex-shrink-0 ml-1"
                      title="Copy Invoice Number"
                    >
                      {copiedKey === 'inv-no' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tax Invoice PDF button */}
            {isPaid && (
              <div className="pt-2 print:hidden">
                <button
                  onClick={downloadPdf}
                  disabled={isDownloading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl gradient-primary text-white font-semibold text-xs shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? 'Generating PDF…' : 'Download Tax Invoice (PDF)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Notes Card (if present) */}
          {order.notes && (
            <div className="bg-card rounded-2xl border border-border p-5 text-xs">
              <h4 className="font-bold font-['Outfit'] mb-1 text-foreground">Order Notes</h4>
              <p className="text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PRINT-ONLY INVOICE FOOTER
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden print:block mt-8 pt-6 border-t border-foreground/20 text-center text-xs text-muted-foreground">
        <p>This is a computer-generated tax invoice. Registered with Prem Electronics.</p>
        <p className="mt-1">Thank you for your business!</p>
      </div>
    </div>
  );
}
