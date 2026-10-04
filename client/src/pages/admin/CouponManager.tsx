import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, Edit, Trash2, X, Search, RefreshCw } from 'lucide-react';
import { api } from '../../api/axiosClient';
import { ModuleStatsCards } from '../../components/shared/ModuleStatsCards';
import { useDebounce } from '../../hooks/useDebounce';
import type { Coupon, PaginationMeta } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

const EMPTY_FORM = {
  code: '', description: '', discountType: 'flat' as 'flat' | 'percentage',
  discountValue: '', minPurchase: '0', maxDiscount: '', usageLimit: '', perUserLimit: '',
  firstOrderOnly: false, isActive: true, expiresAt: '',
};

export default function CouponManager() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['admin-coupons', page, debouncedSearch, state],
    queryFn: () => api.get<Coupon[]>('/coupons', {
      page, limit: 20,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(state && { state }),
    } as Record<string, unknown>),
    placeholderData: (previous) => previous,
  });

  const coupons = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Coupon>('/coupons', payload),
    onSuccess: () => { toast.success('Coupon created!'); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); qc.invalidateQueries({ queryKey: ['admin-module-stats'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.put<Coupon>(`/coupons/${id}`, payload),
    onSuccess: () => { toast.success('Coupon updated!'); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); qc.invalidateQueries({ queryKey: ['admin-module-stats'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      toast.success('Coupon deleted');
      if (coupons.length === 1 && page > 1) setPage((value) => value - 1);
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      qc.invalidateQueries({ queryKey: ['admin-module-stats'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete'),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowModal(true); };
  const openEdit = (c: Coupon) => {
    setForm({
      code: c.code, description: c.description || '', discountType: c.discountType,
      discountValue: c.discountValue, minPurchase: c.minPurchase, maxDiscount: c.maxDiscount || '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '', isActive: c.isActive,
      perUserLimit: c.perUserLimit ? String(c.perUserLimit) : '', firstOrderOnly: c.firstOrderOnly,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
    });
    setEditing(c);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      ...form,
      discountValue: Number(form.discountValue),
      minPurchase: Number(form.minPurchase),
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      expiresAt: form.expiresAt || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-3">
            <Tag className="w-7 h-7 text-primary" />
            Coupon Manager
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage discount coupons</p>
        </div>
        <button
          id="create-coupon-btn"
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" /> New Coupon
        </button>
      </div>

      <div className="mb-6"><ModuleStatsCards module="coupons" /></div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search coupons</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search code or description"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm" />
        </label>
        <select aria-label="Filter coupons by state" value={state}
          onChange={(event) => { setState(event.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
          <option value="">All states</option><option value="active">Active</option>
          <option value="inactive">Inactive</option><option value="expired">Expired</option>
        </select>
        {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Refreshing…</span>}
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <p className="mb-3 text-sm text-red-400">Coupons could not be loaded.</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Retry</button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40">
                {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Status', 'Expires', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No coupons yet</td></tr>
              ) : coupons.map((coupon) => (
                <motion.tr key={coupon.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{coupon.code}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{coupon.discountType}</td>
                  <td className="px-4 py-3 font-semibold">
                    {coupon.discountType === 'flat' ? formatPrice(coupon.discountValue) : `${coupon.discountValue}%`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatPrice(coupon.minPurchase)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', coupon.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground')}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(coupon)} id={`edit-coupon-${coupon.id}`} aria-label={`Edit ${coupon.code}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm(`Delete coupon "${coupon.code}"?`)) deleteMutation.mutate(coupon.id); }}
                        id={`delete-coupon-${coupon.id}`} aria-label={`Delete ${coupon.code}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button disabled={!meta.hasPrevPage || isFetching} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages} · {meta.total} coupons</span>
          <button disabled={!meta.hasNextPage || isFetching} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-['Outfit']">{editing ? 'Edit Coupon' : 'New Coupon'}</h2>
                <button onClick={closeModal} aria-label="Close coupon editor" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Code *</label>
                    <input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 font-mono uppercase"
                      placeholder="SAVE20" id="coupon-code-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Type *</label>
                    <select value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as any }))}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50">
                      <option value="flat">Flat (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Discount Value *</label>
                    <input required type="number" min="0" value={form.discountValue}
                      onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                      placeholder={form.discountType === 'flat' ? '500' : '20'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Min Purchase (₹)</label>
                    <input type="number" min="0" value={form.minPurchase}
                      onChange={(e) => setForm((f) => ({ ...f, minPurchase: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                      placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Max Discount (₹)</label>
                    <input type="number" min="0" value={form.maxDiscount}
                      onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                      placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Usage Limit</label>
                    <input type="number" min="1" value={form.usageLimit}
                      onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                      placeholder="Unlimited" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Per-customer limit</label>
                    <input type="number" min="1" value={form.perUserLimit}
                      onChange={(e) => setForm((f) => ({ ...f, perUserLimit: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                      placeholder="Unlimited" />
                  </div>
                  <label className="flex items-center gap-3 self-end pb-3">
                    <input type="checkbox" checked={form.firstOrderOnly}
                      onChange={(e) => setForm((f) => ({ ...f, firstOrderOnly: e.target.checked }))}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium">First order only</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Expires At</label>
                  <input type="date" value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description</label>
                  <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                    placeholder="Optional" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="coupon-active" checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 accent-primary" />
                  <label htmlFor="coupon-active" className="text-sm font-medium">Active</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal}
                    className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-accent transition-all">
                    Cancel
                  </button>
                  <button type="submit" id="coupon-submit-btn"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60">
                    {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
