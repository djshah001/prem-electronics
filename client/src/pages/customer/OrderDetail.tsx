import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, ArrowLeft, Clock, CheckCircle2, Truck, MapPin,
  RotateCcw, X, Star, AlertTriangle, Receipt, CreditCard,
  ShieldCheck, ChevronRight, Printer,
} from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/axiosClient';
import type { Order, OrderItem } from '../../types';
import { clsx } from 'clsx';
import { toast } from 'sonner';

interface OrderDetail extends Order {
  items: (OrderItem & { productImages?: string[]; productSlug?: string })[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  processing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  shipped: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  refunded: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STATUS_ICONS: Record<string, typeof Package> = {
  pending: Clock,
  confirmed: CheckCircle2,
  processing: Package,
  shipped: Truck,
  delivered: ShieldCheck,
  cancelled: X,
  refunded: RotateCcw,
};

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function ReturnRequestModal({ order, onClose }: { order: OrderDetail; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post(`/orders/my/${order.id}/return-request`, { reason }),
    onSuccess: () => {
      toast.success('Return request submitted. We\'ll review it within 24 hours.');
      qc.invalidateQueries({ queryKey: ['my-order', order.id] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not submit return request.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-['Outfit']">Request Return</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Describe the reason for your return. Our team will review and respond within 24–48 hours.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={5}
          placeholder="e.g. Product damaged in transit, received wrong item, quality not as described…"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none mb-4"
        />
        <p className="text-xs text-muted-foreground text-right mb-4">{reason.length}/500</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={reason.trim().length < 10 || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
        {reason.trim().length > 0 && reason.trim().length < 10 && (
          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Please provide at least 10 characters.
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showReturnModal, setShowReturnModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-order', id],
    queryFn: () => api.get<OrderDetail>(`/orders/my/${id}`),
    enabled: !!id,
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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-6" />
        <div className="bg-card rounded-2xl border border-border p-6 mb-4">
          <div className="h-5 bg-muted rounded w-1/3 mb-4" />
          <div className="h-4 bg-muted rounded w-full mb-2" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-xl font-bold font-['Outfit'] mb-2">Order not found</h1>
        <Link to="/account/orders" className="text-primary hover:underline text-sm">Back to orders</Link>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancelled = ['cancelled', 'refunded'].includes(order.status);
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canReturn = order.status === 'delivered' && order.returnStatus === 'none';
  const StatusIcon = STATUS_ICONS[order.status] ?? Package;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:max-w-none">
      {showReturnModal && (
        <ReturnRequestModal order={order} onClose={() => setShowReturnModal(false)} />
      )}

      {/* Print-only Invoice Header */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-foreground/20">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black font-['Outfit'] tracking-tight">PREM ELECTRONICS</h1>
            <p className="text-xs text-muted-foreground mt-1">Authorized Electronics Retailer & Service</p>
            <p className="text-xs text-muted-foreground">GSTIN: 27AABCP1234F1Z5</p>
            <p className="text-xs text-muted-foreground">123 Electronic Market, Station Road, Mumbai, Maharashtra 400001</p>
            <p className="text-xs text-muted-foreground">support@premelectronics.com | +91 98765 43210</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold font-['Outfit']">TAX INVOICE</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">Invoice #: {order.orderNumber}</p>
            <p className="text-xs text-muted-foreground">Date: {formatDate(order.createdAt)}</p>
            <p className="text-xs text-muted-foreground">Payment: {order.paymentMethod?.toUpperCase() ?? 'ONLINE'} ({order.paymentStatus.toUpperCase()})</p>
            {order.razorpayPaymentId && (
              <p className="text-[11px] font-mono text-muted-foreground">Txn: {order.razorpayPaymentId}</p>
            )}
          </div>
        </div>
      </div>

      {/* Back Button (Hidden when printing) */}
      <button
        onClick={() => navigate('/account/orders')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors print:hidden"
      >
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black font-['Outfit']">Order #{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('text-sm px-3 py-1 rounded-full font-semibold capitalize border', STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground')}>
            <StatusIcon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            {order.status}
          </span>
          <button
            onClick={() => window.print()}
            id="print-invoice-btn"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium print:hidden"
          >
            <Printer className="w-3.5 h-3.5 text-primary" /> Print Invoice
          </button>
          {canCancel && (
            <button
              disabled={cancelMutation.isPending}
              onClick={() => { if (window.confirm('Are you sure you want to cancel this order?')) cancelMutation.mutate(); }}
              className="text-sm text-destructive font-medium hover:underline disabled:opacity-50 print:hidden"
            >
              Cancel Order
            </button>
          )}
          {canReturn && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium print:hidden"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Request Return
            </button>
          )}
        </div>
      </div>

      {/* Return status banner */}
      {order.returnStatus !== 'none' && (
        <div className={clsx('rounded-xl p-4 mb-5 text-sm flex items-start gap-3 border print:hidden', {
          'bg-amber-500/10 border-amber-500/20 text-amber-400': order.returnStatus === 'requested',
          'bg-green-500/10 border-green-500/20 text-green-400': order.returnStatus === 'approved' || order.returnStatus === 'completed',
          'bg-red-500/10 border-red-500/20 text-red-400': order.returnStatus === 'rejected',
        })}>
          <RotateCcw className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            {order.returnStatus === 'requested' && 'Return requested — our team will review within 24–48 hours.'}
            {order.returnStatus === 'approved' && 'Return approved. Please follow the return instructions sent to your email.'}
            {order.returnStatus === 'rejected' && 'Return request was not approved. Contact support for assistance.'}
            {order.returnStatus === 'completed' && 'Return completed. Refund has been initiated.'}
          </p>
        </div>
      )}

      {/* Refund status */}
      {order.refundStatus !== 'none' && (
        <div className={clsx('rounded-xl p-4 mb-5 text-sm flex items-start gap-3 border print:hidden', {
          'bg-amber-500/10 border-amber-500/20 text-amber-400': order.refundStatus === 'pending',
          'bg-green-500/10 border-green-500/20 text-green-400': order.refundStatus === 'processed',
        })}>
          <CreditCard className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            {order.refundStatus === 'pending' && 'Refund is being processed. It will appear in your account within 5–7 business days.'}
            {order.refundStatus === 'processed' && `Refund of ${formatPrice(order.total)} has been processed to your original payment method.`}
          </p>
        </div>
      )}

      {/* Order progress tracker (Hidden when printing) */}
      {!isCancelled && (
        <div className="bg-card rounded-2xl border border-border p-6 mb-5 print:hidden">
          <h2 className="font-bold font-['Outfit'] mb-5">Order Progress</h2>
          <div className="relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
            <div
              className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500"
              style={{ width: currentStep < 0 ? '0%' : `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((step, i) => {
                const StepIcon = STATUS_ICONS[step] ?? Package;
                const done = currentStep >= i;
                const active = currentStep === i;
                return (
                  <div key={step} className="flex flex-col items-center gap-2">
                    <div className={clsx(
                      'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
                      done ? 'bg-primary border-primary text-white' : 'bg-background border-border text-muted-foreground',
                      active && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                    )}>
                      <StepIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className={clsx('text-xs font-medium capitalize hidden sm:block', done ? 'text-foreground' : 'text-muted-foreground')}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5 print:grid-cols-1">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 print:border-foreground/10 print:shadow-none">
            <h2 className="font-bold font-['Outfit'] mb-4">Items Ordered</h2>
            <div className="space-y-4">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex gap-4 py-3 border-b border-border last:border-0 last:pb-0">
                  <div className="w-16 h-16 rounded-xl bg-muted flex-shrink-0 overflow-hidden print:hidden">
                    {item.productImages?.[0] ? (
                      <img src={item.productImages[0]} alt={item.productTitle ?? ''} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 m-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-2">{item.productTitle}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      {item.variantSnapshot && typeof item.variantSnapshot === 'object' && (
                        <>
                          {(item.variantSnapshot as any).sku && (
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              SKU: {(item.variantSnapshot as any).sku}
                            </span>
                          )}
                          {(item.variantSnapshot as any).brand && (
                            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {(item.variantSnapshot as any).brand}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {item.productSlug && (
                      <Link to={`/products/${item.productSlug}`} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-1 print:hidden">
                        View product <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm">{formatPrice(Number(item.priceAtPurchase) * item.quantity)}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.priceAtPurchase)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="bg-card rounded-2xl border border-border p-6 print:border-foreground/10 print:shadow-none">
              <h2 className="font-bold font-['Outfit'] mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Delivery Address
              </h2>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pincode}</p>
                <p>{order.shippingAddress.country}</p>
                <p className="mt-1">📞 {order.shippingAddress.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 print:border-foreground/10 print:shadow-none">
            <h2 className="font-bold font-['Outfit'] mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Payment Summary
            </h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount {order.couponCode && <span className="font-mono text-xs">({order.couponCode})</span>}</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{Number(order.shipping) === 0 ? <span className="text-green-400">Free</span> : formatPrice(order.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (GST 18% incl.)</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 print:border-foreground/10 print:shadow-none">
            <h2 className="font-bold font-['Outfit'] mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Payment Details
            </h2>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p>Method: <span className="text-foreground capitalize">{order.paymentMethod ?? 'Razorpay'}</span></p>
              <p>Status: <span className={clsx('font-semibold capitalize', order.paymentStatus === 'paid' ? 'text-green-400' : 'text-amber-400')}>{order.paymentStatus}</span></p>
              {order.razorpayPaymentId && (
                <p className="font-mono text-xs break-all">ID: {order.razorpayPaymentId}</p>
              )}
            </div>
          </div>

          {order.notes && (
            <div className="bg-card rounded-2xl border border-border p-5 print:border-foreground/10 print:shadow-none">
              <h2 className="font-bold font-['Outfit'] text-sm mb-2">Order Notes</h2>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Print-only Invoice Footer */}
      <div className="hidden print:block mt-8 pt-6 border-t border-foreground/20 text-center text-xs text-muted-foreground">
        <p>This is a computer-generated tax invoice and requires no physical signature.</p>
        <p className="mt-1">Thank you for shopping with Prem Electronics!</p>
      </div>

      {/* Write Review CTA for delivered orders */}
      {order.status === 'delivered' && (order.items ?? []).length > 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <div>
              <p className="font-semibold text-sm">How was your order?</p>
              <p className="text-xs text-muted-foreground">Share your experience to help other buyers.</p>
            </div>
          </div>
          {(order.items ?? []).map((item) =>
            item.productSlug ? (
              <Link
                key={item.id}
                to={`/products/${item.productSlug}#reviews`}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 font-medium text-sm hover:bg-amber-400/20 transition-colors"
              >
                Write Review
              </Link>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
