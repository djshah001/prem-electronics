import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, CheckSquare, Square, Trash2, ArrowUpDown,
  RotateCcw, CreditCard, X, Eye,
} from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Order, PaginationMeta, OrderStatus } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, dataTableFeatures } from '../../components/ui/DataTable';
import { Link } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { ModuleStatsCards } from '../../components/shared/ModuleStatsCards';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-gray-500/20 text-gray-400',
};

const RETURN_STATUS_COLORS: Record<string, string> = {
  none: 'text-muted-foreground',
  requested: 'text-amber-400',
  approved: 'text-blue-400',
  rejected: 'text-red-400',
  completed: 'text-green-400',
};

const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ['cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

interface OrderDetailPanelProps {
  order: Order;
  onClose: () => void;
}

function OrderDetailPanel({ order, onClose }: OrderDetailPanelProps) {
  const qc = useQueryClient();

  const returnMutation = useMutation({
    mutationFn: (returnStatus: 'approved' | 'rejected' | 'completed') =>
      api.put(`/orders/${order.id}/return-status`, { returnStatus }),
    onSuccess: (_, returnStatus) => {
      toast.success(`Return status updated to ${returnStatus}`);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update return status'),
  });

  const refundMutation = useMutation({
    mutationFn: () => api.post(`/orders/${order.id}/refund`, {}),
    onSuccess: () => {
      toast.success('Refund marked as processed');
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to process refund'),
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-40 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold font-['Outfit']">Order #{order.orderNumber}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Status */}
          <div className="rounded-xl bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Order Status</p>
            <span className={clsx('text-sm font-semibold capitalize px-2 py-0.5 rounded-full', STATUS_COLORS[order.status])}>
              {order.status}
            </span>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-xs text-muted-foreground mb-2">Delivery Address</p>
              <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.street}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
            </div>
          )}

          {/* Payment */}
          <div className="rounded-xl bg-background border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Payment Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-sm text-green-400">
                <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{Number(order.shipping) === 0 ? 'Free' : formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span><span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2">
              <span>Total</span><span className="text-primary">{formatPrice(order.total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Payment: <span className={order.paymentStatus === 'paid' ? 'text-green-400 font-medium' : 'text-amber-400 font-medium'}>{order.paymentStatus}</span>
            </p>
          </div>

          {/* Return management */}
          {order.returnStatus !== 'none' && (
            <div className="rounded-xl bg-background border border-amber-500/20 p-4">
              <p className="text-xs text-amber-400 font-semibold mb-3 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Return Request
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Status: <span className={clsx('font-semibold capitalize', RETURN_STATUS_COLORS[order.returnStatus])}>{order.returnStatus}</span>
              </p>
              {order.returnStatus === 'requested' && (
                <div className="flex gap-2">
                  <button
                    disabled={returnMutation.isPending}
                    onClick={() => returnMutation.mutate('approved')}
                    className="flex-1 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={returnMutation.isPending}
                    onClick={() => returnMutation.mutate('rejected')}
                    className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
              {order.returnStatus === 'approved' && (
                <button
                  disabled={returnMutation.isPending}
                  onClick={() => returnMutation.mutate('completed')}
                  className="w-full py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  Mark Return Completed
                </button>
              )}
            </div>
          )}

          {/* Refund processing */}
          {(order.refundStatus === 'pending' || order.paymentStatus === 'paid' && ['cancelled', 'refunded'].includes(order.status)) && (
            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Refund
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Status: <span className={clsx('font-semibold', order.refundStatus === 'processed' ? 'text-green-400' : 'text-amber-400')}>{order.refundStatus}</span>
              </p>
              {order.refundStatus !== 'processed' && (
                <button
                  disabled={refundMutation.isPending}
                  onClick={() => { if (confirm(`Mark refund of ${formatPrice(order.total)} as processed?`)) refundMutation.mutate(); }}
                  className="w-full py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {refundMutation.isPending ? 'Processing…' : `Mark Refund Processed (${formatPrice(order.total)})`}
                </button>
              )}
            </div>
          )}

          {order.notes && (
            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function OrderManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, debouncedSearch, statusFilter, sortBy, sortOrder],
    queryFn: () =>
      api.get<Order[]>('/admin/orders', {
        page, limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        sortBy, sortOrder,
      } as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/orders/${id}/status`, { status }),
    onSuccess: () => { toast.success('Order status updated'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/admin/orders/bulk-delete', { ids }),
    onSuccess: () => {
      toast.success(`${selected.size} orders archived`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Bulk archive failed'),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder((s) => s === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
    setPage(1);
  };

  const columns: ColumnDef<typeof dataTableFeatures, Order, any>[] = [
    {
      id: 'select',
      header: () => (
        <button onClick={toggleAll} id="select-all-orders">
          {selected.size === orders.length && orders.length > 0
            ? <CheckSquare className="w-4 h-4 text-primary" />
            : <Square className="w-4 h-4 text-muted-foreground" />}
        </button>
      ),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <button onClick={() => toggleSelect(order.id)}>
            {selected.has(order.id)
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4 text-muted-foreground" />}
          </button>
        );
      },
    },
    {
      accessorKey: 'orderNumber',
      header: () => (
        <button onClick={() => toggleSort('orderNumber')} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          Order # <ArrowUpDown className={clsx('w-3 h-3', sortBy === 'orderNumber' ? 'text-primary' : '')} />
        </button>
      ),
      cell: ({ row }) => <span className="font-mono text-primary font-bold text-xs">#{row.original.orderNumber}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: () => (
        <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          Date <ArrowUpDown className={clsx('w-3 h-3', sortBy === 'createdAt' ? 'text-primary' : '')} />
        </button>
      ),
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{new Date(row.original.createdAt).toLocaleDateString('en-IN')}</span>,
    },
    {
      accessorKey: 'total',
      header: () => (
        <button onClick={() => toggleSort('total')} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          Total <ArrowUpDown className={clsx('w-3 h-3', sortBy === 'total' ? 'text-primary' : '')} />
        </button>
      ),
      cell: ({ row }) => <span className="font-semibold text-sm">{formatPrice(row.original.total)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex flex-col gap-1">
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium capitalize w-fit', STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground')}>
              {order.status}
            </span>
            {order.returnStatus !== 'none' && (
              <span className={clsx('text-[10px] font-medium capitalize flex items-center gap-0.5', RETURN_STATUS_COLORS[order.returnStatus])}>
                <RotateCcw className="w-2.5 h-2.5" /> {order.returnStatus}
              </span>
            )}
            {order.refundStatus !== 'none' && (
              <span className="text-[10px] font-medium text-cyan-400 flex items-center gap-0.5">
                <CreditCard className="w-2.5 h-2.5" /> refund: {order.refundStatus}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Update',
      cell: ({ row }) => {
        const order = row.original;
        const nextOpts = NEXT_STATUSES[order.status] ?? [];
        return (
          <div className="flex items-center gap-2">
            {nextOpts.length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) updateStatusMutation.mutate({ id: order.id, status: e.target.value }); }}
                className="px-2 py-1 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary/50"
              >
                <option value="">Move to…</option>
                {nextOpts.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setDetailOrder(order)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              title="View details"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <Link to={`/admin/orders/${order.id}`} aria-label={`Open order ${order.orderNumber} page`} className="px-2 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">Open</Link>
          </div>
        );
      },
    },
  ];

  const tableData = orders.map(o => ({ ...o, isSelected: selected.has(o.id) }));

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <AnimatePresence>
        {detailOrder && (
          <OrderDetailPanel order={detailOrder} onClose={() => setDetailOrder(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-primary" />
          Order Manager
        </h1>
        <p className="text-muted-foreground mt-1">
          {meta ? `${meta.total} total orders` : 'All customer orders'}
        </p>
      </div>

      <div className="mb-6"><ModuleStatsCards module="orders" /></div>
      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by order #..."
        filters={[
          {
            key: 'status',
            label: 'All Statuses',
            value: statusFilter,
            onChange: (val) => { setStatusFilter(val); setPage(1); },
            options: ORDER_STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))
          }
        ]}
        page={page}
        totalPages={meta?.totalPages}
        onPageChange={setPage}
        actions={
          selected.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => { if (confirm(`Archive ${selected.size} orders from operational views?`)) bulkDeleteMutation.mutate(Array.from(selected)); }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-medium text-sm hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Archive ({selected.size})
            </motion.button>
          )
        }
      />
    </div>
  );
}
