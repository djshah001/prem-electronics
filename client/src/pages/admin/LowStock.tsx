import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react';
import { api } from '../../api/axiosClient';
import { ModuleStatsCards } from '../../components/shared/ModuleStatsCards';
import { useDebounce } from '../../hooks/useDebounce';
import type { PaginationMeta } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface LowStockItem {
  id: string;
  productId: string;
  title: string;
  sku: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableStock: number;
  lowStockThreshold: number;
  price: string;
  salePrice: string | null;
  isActive: boolean;
}

export default function LowStock() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stockState, setStockState] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['admin-low-stock', page, debouncedSearch, stockState],
    queryFn: () => api.get<LowStockItem[]>('/admin/inventory/low-stock', {
      page,
      limit: 20,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(stockState && { state: stockState }),
    } as Record<string, unknown>),
    placeholderData: (previous) => previous,
    refetchInterval: 30_000,
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta as PaginationMeta | undefined;
  const updateStock = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => api.patch(`/admin/inventory/${id}/stock`, { stock }),
    onSuccess: () => {
      toast.success('Variant stock updated.');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-module-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (error: any) => toast.error(error?.message || 'Failed to update stock.'),
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-black font-['Outfit']">
          <AlertTriangle className="h-7 w-7 text-amber-400" /> Inventory — Low Stock
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meta?.total ?? 0} active variant{(meta?.total ?? 0) === 1 ? '' : 's'} require restocking
        </p>
      </div>

      <div className="mb-6"><ModuleStatsCards module="inventory" /></div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search low-stock variants</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search product or variant SKU"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm" />
        </label>
        <select aria-label="Filter inventory alerts" value={stockState}
          onChange={(event) => { setStockState(event.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
          <option value="">All alerts</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        {query.isFetching && !query.isLoading && <span className="text-xs text-muted-foreground">Refreshing…</span>}
      </div>

      {query.isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <p className="mb-3 text-sm text-red-400">Inventory alerts could not be loaded.</p>
          <button onClick={() => query.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : query.isLoading ? (
        <div className="space-y-4">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl border border-border bg-card" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-24 text-center">
          <h2 className="mb-2 text-lg font-bold font-['Outfit']">No matching stock alerts</h2>
          <p className="text-sm text-muted-foreground">No active variants match the current search and stock filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[880px] text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-left font-medium">Variant SKU</th>
              <th className="px-4 py-3 text-center font-medium">Available</th>
              <th className="px-4 py-3 text-center font-medium">Physical / Reserved</th>
              <th className="px-4 py-3 text-center font-medium">Threshold</th>
              <th className="px-4 py-3 text-center font-medium">Urgency</th>
              <th className="px-4 py-3 text-right font-medium">Update physical stock</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-background/50">
                  <td className="px-4 py-4 font-medium">{item.title}</td>
                  <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{item.sku}</td>
                  <td className={clsx('px-4 py-4 text-center text-base font-black', item.availableStock <= 0 ? 'text-red-400' : 'text-amber-400')}>{item.availableStock}</td>
                  <td className="px-4 py-4 text-center text-muted-foreground">{item.stockQuantity} / {item.reservedQuantity}</td>
                  <td className="px-4 py-4 text-center text-muted-foreground">{item.lowStockThreshold}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={clsx('rounded-full px-2 py-1 text-xs font-semibold', item.availableStock <= 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400')}>
                      {item.availableStock <= 0 ? 'Out of stock' : 'Low'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === item.id ? <>
                        <div className="flex items-center overflow-hidden rounded-lg border border-border bg-background">
                          <button aria-label={`Decrease physical stock for ${item.sku}`} onClick={() => setEditStock((value) => Math.max(item.reservedQuantity, value - 1))} className="p-1.5 hover:bg-muted"><ChevronDown className="h-3 w-3" /></button>
                          <input aria-label={`Physical stock for ${item.sku}`} type="number" min={item.reservedQuantity} value={editStock} onChange={(event) => setEditStock(Number(event.target.value))} className="w-16 bg-transparent py-1 text-center text-sm outline-none" />
                          <button aria-label={`Increase physical stock for ${item.sku}`} onClick={() => setEditStock((value) => value + 1)} className="p-1.5 hover:bg-muted"><ChevronUp className="h-3 w-3" /></button>
                        </div>
                        <button disabled={updateStock.isPending || editStock < item.reservedQuantity} onClick={() => updateStock.mutate({ id: item.id, stock: editStock })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Save</button>
                        <button disabled={updateStock.isPending} onClick={() => setEditingId(null)} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Cancel</button>
                      </> : (
                        <button onClick={() => { setEditingId(item.id); setEditStock(item.stockQuantity); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50">
                          <RefreshCw className="h-3 w-3" /> Update
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button disabled={!meta.hasPrevPage || query.isFetching} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages} · {meta.total} variants</span>
          <button disabled={!meta.hasNextPage || query.isFetching} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
