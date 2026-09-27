import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Order } from '../../types';

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(p));

export default function OrderSuccess() {
  const { id } = useParams<{ id: string }>();

  const { data } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<Order & { items: any[] }>(`/orders/my/${id}`),
  });

  const order = data?.data;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-12 h-12 text-green-400" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="text-4xl font-black font-['Outfit'] mb-2">Order Confirmed! 🎉</h1>
        {order && (
          <p className="text-muted-foreground mb-2">
            Order <span className="font-mono text-primary font-bold">#{order.orderNumber}</span> has been placed successfully.
          </p>
        )}
        <p className="text-muted-foreground text-sm mb-8">
          A confirmation email has been sent to your registered email address.
        </p>

        {order && (
          <div className="bg-card rounded-2xl border border-border p-6 text-left mb-8">
            <h2 className="font-bold font-['Outfit'] mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Order Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {Number(order.discount) > 0 && <div className="flex justify-between text-green-400"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{Number(order.shipping) === 0 ? 'FREE' : formatPrice(order.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatPrice(order.tax)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border mt-2">
                <span>Total Paid</span>
                <span className="gradient-text">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/account/orders"
            className="flex items-center justify-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all">
            <Package className="w-4 h-4" /> Track Order <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-xl font-semibold hover:border-primary/50 transition-all">
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
