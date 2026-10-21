import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/axiosClient';
import type { Order, PaginationMeta } from '../../types';
import { Package, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-gray-500/20 text-gray-400',
};

const formatPrice = (p: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

export default function Orders() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => api.get<Order[]>('/orders/my', { page, limit: 10 } as Record<string, unknown>),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch<Order>(`/orders/my/${id}/cancel`),
    onSuccess: async (response) => {
      toast.success(response.message);
      await queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not cancel this order.'),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-black font-['Outfit'] mb-8">My Orders</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold font-['Outfit'] mb-2">No orders yet</h3>
          <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
          <Link to="/shop" className="px-6 py-3 gradient-primary text-white rounded-xl font-semibold inline-block">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="bg-card rounded-2xl border border-border p-6 card-glow hover:border-primary/40 transition-all group">
              <Link to={`/account/orders/${order.id}`} className="block">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-bold font-mono text-primary">#{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('text-xs px-3 py-1 rounded-full font-medium capitalize', STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground')}>
                    {order.status}
                  </span>
                  <span className="text-lg font-bold">{formatPrice(order.total)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
              </Link>
              {['pending', 'confirmed'].includes(order.status) && <div className="mt-4 pt-4 border-t border-border flex justify-end"><button disabled={cancelMutation.isPending} onClick={() => { if (window.confirm('Cancel this order?')) cancelMutation.mutate(order.id); }} className="text-sm font-semibold text-destructive disabled:opacity-50">Cancel order</button></div>}
              {order.status === 'cancelled' && order.paymentStatus === 'paid' && <p className="mt-3 text-xs text-blue-500 text-right">Contact the store for refund assistance</p>}
            </article>
          ))}

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-6">
              <button disabled={!meta.hasPrevPage} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Previous</button>
              <span className="px-4 py-2 text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
              <button disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
