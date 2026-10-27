import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Home, Package, Printer } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Order } from '../../types';

const formatPrice = (price: string | number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(price));

export default function OrderSuccess() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<Order>(`/orders/my/${id}`),
    enabled: Boolean(id),
  });
  const order = data?.data;
  const isConfirmed = order?.paymentStatus === 'paid' && !['cancelled', 'refunded'].includes(order.status);

  if (isLoading) return <div className="max-w-2xl mx-auto px-4 py-24 text-center text-muted-foreground">Loading order…</div>;
  if (isError || !order) return <div className="max-w-2xl mx-auto px-4 py-24 text-center"><h1 className="text-2xl font-bold">Order not found</h1><Link to="/account/orders" className="inline-block mt-4 text-primary font-semibold">Return to orders</Link></div>;

  return <div className="max-w-2xl mx-auto px-4 py-16 text-center print:py-0 print:mt-0">
    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="w-24 h-24 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6 print:hidden"><CheckCircle className="w-12 h-12 text-green-400" /></motion.div>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-4xl font-black font-['Outfit'] mb-2">{isConfirmed ? 'Order Confirmed!' : 'Order Details'}</h1>
      <p className="text-muted-foreground mb-2">Order <span className="font-mono text-primary font-bold">#{order.orderNumber}</span> · <span className="capitalize">{order.status}</span></p>
      {isConfirmed && <p className="text-muted-foreground text-sm mb-8 print:hidden">A confirmation email has been sent to your registered email address.</p>}

      <section className="bg-card rounded-2xl border border-border p-6 text-left mb-8">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold font-['Outfit'] flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Invoice</h2><span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-IN')}</span></div>
        <div className="space-y-2 text-sm">
          {order.items?.map((item) => <div key={item.id} className="flex justify-between gap-4 pb-2 mb-2 border-b border-border/60"><span>{item.productTitle ?? 'Product'} × {item.quantity}</span><span>{formatPrice(Number(item.priceAtPurchase) * item.quantity)}</span></div>)}
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {Number(order.discount) > 0 && <div className="flex justify-between text-green-500"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{Number(order.shipping) === 0 ? 'FREE' : formatPrice(order.shipping)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatPrice(order.tax)}</span></div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-border mt-2"><span>Total</span><span className="gradient-text">{formatPrice(order.total)}</span></div>
        </div>
        {order.shippingAddress && <div className="mt-5 pt-4 border-t border-border text-sm"><p className="font-semibold mb-1">Ship to</p><p className="text-muted-foreground leading-5">{order.shippingAddress.fullName}, {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}, {order.shippingAddress.country}<br />{order.shippingAddress.phone}</p></div>}
        {order.status === 'cancelled' && order.paymentStatus === 'paid' && <p className="mt-4 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-500">For support regarding your cancelled order, please contact customer support.</p>}
      </section>

      <div className="flex flex-col sm:flex-row gap-4 justify-center print:hidden">
        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-semibold"><Printer className="w-4 h-4" /> Print Invoice</button>
        <Link to="/account/orders" className="flex items-center justify-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-semibold"><Package className="w-4 h-4" /> Track Order <ArrowRight className="w-4 h-4" /></Link>
        <Link to="/" className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-semibold"><Home className="w-4 h-4" /> Home</Link>
      </div>
    </motion.div>
  </div>;
}
