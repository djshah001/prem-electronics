import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../../api/axiosClient';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface LowStockItem {
  id: string;
  title: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  price: string;
  isActive: boolean;
}

export default function LowStock() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<number>(0);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: () => api.get<LowStockItem[]>('/admin/inventory/low-stock'),
    refetchInterval: 30000,
  });

  const items = data?.data ?? [];

  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      api.patch(`/admin/inventory/${id}/stock`, { stock }),
    onSuccess: () => {
      toast.success('Stock updated!');
      qc.invalidateQueries({ queryKey: ['admin-low-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update stock'),
  });

  const startEdit = (item: LowStockItem) => {
    setEditingId(item.id);
    setEditStock(item.stock);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-2">
          <AlertTriangle className="w-7 h-7 text-amber-400" /> Inventory — Low Stock
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {items.length} product{items.length !== 1 ? 's' : ''} require restocking
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-2xl border border-border">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-bold font-['Outfit'] mb-2">All products are well stocked</h3>
          <p className="text-muted-foreground text-sm">No items are below their low-stock threshold.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-center px-4 py-3 font-medium">Current Stock</th>
                <th className="text-center px-4 py-3 font-medium">Threshold</th>
                <th className="text-center px-4 py-3 font-medium">Urgency</th>
                <th className="text-right px-4 py-3 font-medium">Update Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, i) => (
                <motion.tr key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="hover:bg-background/50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.isActive ? 'Active' : 'Archived'}</p>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{item.sku}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={clsx('text-base font-black', item.stock === 0 ? 'text-red-400' : 'text-amber-400')}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-muted-foreground">{item.lowStockThreshold}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={clsx('text-xs px-2 py-1 rounded-full font-semibold',
                      item.stock === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400')}>
                      {item.stock === 0 ? '🔴 Out of Stock' : '🟡 Low'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === item.id ? (
                        <>
                          <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden">
                            <button onClick={() => setEditStock(s => Math.max(0, s - 1))} className="p-1.5 hover:bg-muted transition-colors">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <input type="number" value={editStock} onChange={e => setEditStock(Number(e.target.value))} min="0"
                              className="w-16 text-center text-sm bg-transparent py-1 text-foreground focus:outline-none" />
                            <button onClick={() => setEditStock(s => s + 1)} className="p-1.5 hover:bg-muted transition-colors">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          </div>
                          <button onClick={() => updateStockMutation.mutate({ id: item.id, stock: editStock })}
                            disabled={updateStockMutation.isPending}
                            className="px-3 py-1.5 gradient-primary text-white rounded-lg text-xs font-semibold disabled:opacity-60">
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-muted rounded-lg text-xs font-semibold">Cancel</button>
                        </>
                      ) : (
                        <button id={`update-stock-${item.id}`} onClick={() => startEdit(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-semibold hover:border-primary/50 transition-colors">
                          <RefreshCw className="w-3 h-3" /> Update
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
