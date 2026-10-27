import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Package, ArrowLeft, Clock, CheckCircle2, Truck, MapPin,
  RotateCcw, X, Star, Receipt, CreditCard,
  ShieldCheck, ChevronRight, Printer, Download,
} from 'lucide-react';
import { api, axiosClient } from '../../api/axiosClient';
import type { Order, OrderItem } from '../../types';
import { clsx } from 'clsx';
import { toast } from 'sonner';

interface OrderDetail extends Order {
  items: (OrderItem & { productImages?: string[]; productSlug?: string })[];
  merchant?: { name: string; gstin?: string | null; address?: string | null; phone?: string | null; email?: string | null };
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

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

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
  const downloadPdf = async () => {
    try {
      const response = await axiosClient.get(`/invoice-master/orders/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${order?.invoiceNumber ?? order?.orderNumber ?? 'invoice'}.pdf`; anchor.click(); URL.revokeObjectURL(url);
    } catch (error: any) { toast.error(error?.message ?? 'Invoice PDF is not available yet.'); }
  };

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
  const StatusIcon = STATUS_ICONS[order.status] ?? Package;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:m-0 print:max-w-none">
      {/* Print-only Invoice Header */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-foreground/20">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black font-['Outfit'] tracking-tight">{order.merchant?.name ?? 'Prem Electronics'}</h1>
            {order.merchant?.gstin && <p className="text-xs text-muted-foreground">GSTIN: {order.merchant.gstin}</p>}
            {order.merchant?.address && <p className="text-xs text-muted-foreground">{order.merchant.address}</p>}
            {(order.merchant?.email || order.merchant?.phone) && <p className="text-xs text-muted-foreground">{[order.merchant.email, order.merchant.phone].filter(Boolean).join(' | ')}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold font-['Outfit']">TAX INVOICE</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">Invoice #: {order.invoiceNumber ?? 'Issued after payment capture'}</p>
            <p className="text-xs text-muted-foreground">Date: {formatDate(order.invoiceIssuedAt ?? order.createdAt)}</p>
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
          {['paid', 'refunded'].includes(order.paymentStatus) && <button onClick={downloadPdf} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium print:hidden"><Download className="w-3.5 h-3.5 text-primary" /> PDF</button>}
          {canCancel && (
            <button
              disabled={cancelMutation.isPending}
              onClick={() => { if (window.confirm('Are you sure you want to cancel this order?')) cancelMutation.mutate(); }}
              className="text-sm text-destructive font-medium hover:underline disabled:opacity-50 print:hidden"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Read-only status for refunds performed outside this website and confirmed by the provider. */}
      {order.refundStatus !== 'none' && (
        <div className={clsx('rounded-xl p-4 mb-5 text-sm flex items-start gap-3 border print:hidden', {
          'bg-amber-500/10 border-amber-500/20 text-amber-400': order.refundStatus === 'pending' || order.refundStatus === 'partial',
          'bg-green-500/10 border-green-500/20 text-green-400': order.refundStatus === 'processed',
        })}>
          <CreditCard className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            {order.refundStatus === 'pending' && 'A historical refund record is pending reconciliation. Please contact the store for assistance.'}
            {order.refundStatus === 'partial' && 'A partial refund processed outside this website was confirmed by the payment provider.'}
            {order.refundStatus === 'processed' && 'A full refund processed outside this website was confirmed by the payment provider.'}
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
          {order.purchaseType === 'company' && order.buyerBusinessSnapshot && (() => {
            const buyer = order.buyerBusinessSnapshot as any;
            const billing = buyer.billingAddress ?? order.billingAddress;
            return <div className="bg-card rounded-2xl border border-border p-6 print:border-foreground/10 print:shadow-none">
              <h2 className="font-bold font-['Outfit'] mb-3 flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> Billed to</h2>
              <div className="text-sm text-muted-foreground space-y-0.5"><p className="font-medium text-foreground">{buyer.legalName}</p>{buyer.tradeName && <p>{buyer.tradeName}</p>}<p className="font-mono">GSTIN: {buyer.gstin}</p>{billing && <><p>{[billing.building, billing.street, billing.locality].filter(Boolean).join(', ')}</p><p>{billing.city}, {billing.state} – {billing.pincode}</p></>}<p className="text-xs mt-2">Verified identity snapshot · Profile version {buyer.profileVersion}</p></div>
            </div>;
          })()}
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
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatPrice(order.tax)}</span></div>
              {Number((order.taxSnapshot as any)?.cgstMinor ?? 0) > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>CGST</span><span>{formatPrice(Number((order.taxSnapshot as any).cgstMinor) / 100)}</span></div>}
              {Number((order.taxSnapshot as any)?.sgstMinor ?? 0) > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>SGST / UTGST</span><span>{formatPrice(Number((order.taxSnapshot as any).sgstMinor) / 100)}</span></div>}
              {Number((order.taxSnapshot as any)?.igstMinor ?? 0) > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>IGST</span><span>{formatPrice(Number((order.taxSnapshot as any).igstMinor) / 100)}</span></div>}
              {(order.taxSnapshot as any)?.placeOfSupplyState && <div className="flex justify-between text-xs text-muted-foreground"><span>Place of supply</span><span>{(order.taxSnapshot as any).placeOfSupplyState} ({(order.taxSnapshot as any).placeOfSupplyStateCode})</span></div>}
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
        <p>This is a computer-generated invoice. It is not an IRP-registered e-invoice.</p>
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
