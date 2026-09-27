import { ShoppingBag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/axiosClient';
import type { Order, PaginationMeta } from '../../types';
import { useState } from 'react';
import { clsx } from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

const formatPrice = (p: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

export default function OrderManager() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => api.get<Order[]>('/orders', { page, limit: 20 } as Record<string, unknown>),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <h1 className="text-3xl font-black font-['Outfit'] mb-6 flex items-center gap-2">
        <ShoppingBag className="w-7 h-7 text-primary" /> Order Manager
      </h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {['Order #', 'Date', 'Customer', 'Total', 'Status', 'Payment'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-primary font-bold">#{order.orderNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{order.userId?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(order.total)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-1 rounded-full font-medium capitalize', STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground')}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                      {order.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No orders yet.</div>
          )}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button disabled={!meta.hasPrevPage} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Previous</button>
          <span className="px-4 py-2 text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
          <button disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
