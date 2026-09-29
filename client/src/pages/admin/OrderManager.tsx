import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShoppingBag, CheckSquare, Square,
  Trash2, ArrowUpDown
} from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Order, PaginationMeta, OrderStatus } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, dataTableFeatures } from '../../components/ui/DataTable';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-gray-500/20 text-gray-400',
};

const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

export default function OrderManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, statusFilter, sortBy, sortOrder],
    queryFn: () =>
      api.get<Order[]>('/admin/orders', {
        page, limit: 20,
        ...(search && { search }),
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
      toast.success(`${selected.size} orders deleted`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Bulk delete failed'),
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
      cell: ({ row }) => <span className="font-mono text-primary font-bold">#{row.original.orderNumber}</span>,
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
      cell: ({ row }) => <span className="font-semibold">{formatPrice(row.original.total)}</span>,
    },
    {
      accessorKey: 'status',
      header: () => (
        <button onClick={() => toggleSort('status')} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          Status <ArrowUpDown className={clsx('w-3 h-3', sortBy === 'status' ? 'text-primary' : '')} />
        </button>
      ),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground')}>
            {order.status}
          </span>
        );
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: () => (
        <button onClick={() => toggleSort('paymentStatus')} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          Payment <ArrowUpDown className={clsx('w-3 h-3', sortBy === 'paymentStatus' ? 'text-primary' : '')} />
        </button>
      ),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
            {order.paymentStatus}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Update Status',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <select
            value={order.status}
            onChange={(e) => updateStatusMutation.mutate({ id: order.id, status: e.target.value })}
            className="px-2 py-1 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary/50 capitalize"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        );
      },
    },
  ];

  const tableData = orders.map(o => ({ ...o, isSelected: selected.has(o.id) }));

  return (
    <div className="flex-1 p-8 overflow-y-auto">
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

      {/* Table */}
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
              onClick={() => { if (confirm(`Delete ${selected.size} orders?`)) bulkDeleteMutation.mutate(Array.from(selected)); }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-medium text-sm hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selected.size})
            </motion.button>
          )
        }
      />
    </div>
  );
}
