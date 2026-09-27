import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Archive, RefreshCw, X, Package, Star, AlertCircle } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Product, PaginationMeta } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

const EMPTY_FORM = {
  title: '', slug: '', sku: '', barcode: '', description: '', price: '', salePrice: '', stock: 0,
  lowStockThreshold: 5, brand: '', categoryId: '', isFeatured: false, isNewArrival: false, isBestSeller: false, isActive: true,
  images: [''], tags: '', attributes: '{}',
};

export default function ProductManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: () => api.get<Product[]>('/products/admin/all', { page, limit: 15, ...(search && { search }) } as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

  const products = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Product>('/products', payload),
    onSuccess: () => { toast.success('Product created!'); qc.invalidateQueries({ queryKey: ['admin-products'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.put<Product>(`/products/${id}`, payload),
    onSuccess: () => { toast.success('Product updated!'); qc.invalidateQueries({ queryKey: ['admin-products'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to update product'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/archive`, {}),
    onSuccess: () => { toast.success('Product archived'); qc.invalidateQueries({ queryKey: ['admin-products'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed to archive'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/reactivate`, {}),
    onSuccess: () => { toast.success('Product reactivated'); qc.invalidateQueries({ queryKey: ['admin-products'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed to reactivate'),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowModal(true); };
  const openEdit = (p: Product) => {
    setForm({
      title: p.title, slug: p.slug, sku: p.sku, barcode: p.barcode ?? '', description: p.description ?? '',
      price: p.price, salePrice: p.salePrice ?? '', stock: p.stock,
      lowStockThreshold: p.lowStockThreshold, brand: p.brand ?? '', categoryId: p.categoryId ?? '',
      isFeatured: p.isFeatured, isNewArrival: p.isNewArrival ?? false, isBestSeller: p.isBestSeller ?? false, isActive: p.isActive,
      images: p.images.length ? p.images : [''], tags: p.tags.join(', '),
      attributes: JSON.stringify(p.attributes, null, 2),
    });
    setEditing(p);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedAttrs = {};
    try { parsedAttrs = JSON.parse(form.attributes || '{}'); } catch { toast.error('Attributes JSON is invalid'); return; }
    const payload = {
      title: form.title, slug: form.slug, sku: form.sku, barcode: form.barcode || undefined,
      description: form.description || undefined, price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      stock: Number(form.stock), lowStockThreshold: Number(form.lowStockThreshold),
      brand: form.brand || undefined, categoryId: form.categoryId || undefined,
      isFeatured: form.isFeatured, isNewArrival: form.isNewArrival, isBestSeller: form.isBestSeller, isActive: form.isActive,
      images: form.images.filter(Boolean),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      attributes: parsedAttrs,
    };
    if (editing) updateMutation.mutate({ id: editing.id, payload });
    else createMutation.mutate(payload);
  };

  const Field = ({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input id={id} {...props} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
    </div>
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" /> Product Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} total products (including archived)</p>
        </div>
        <button id="add-product-btn" onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by title or SKU..."
          className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Product</th>
              <th className="text-left px-4 py-3 font-medium">SKU</th>
              <th className="text-left px-4 py-3 font-medium">Price</th>
              <th className="text-center px-4 py-3 font-medium">Stock</th>
              <th className="text-center px-4 py-3 font-medium">Rating</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                </tr>
              ))
              : products.map((p) => (
                <tr key={p.id} className={clsx('hover:bg-background/50 transition-colors', !p.isActive && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {p.images[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 m-3 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground line-clamp-1 max-w-[200px]">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    <div>{p.sku}</div>
                    {p.barcode && <div className="text-[10px] text-muted-foreground/60">{p.barcode}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{formatPrice(p.salePrice ?? p.price)}</p>
                    {p.salePrice && <p className="text-xs text-muted-foreground line-through">{formatPrice(p.price)}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('text-sm font-bold', p.stock === 0 ? 'text-red-400' : p.stock <= p.lowStockThreshold ? 'text-amber-400' : 'text-green-400')}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm">{Number(p.avgRating).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                        {p.isActive ? 'Active' : 'Archived'}
                      </span>
                      {p.isFeatured && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">Featured</span>}
                      {p.isNewArrival && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">New</span>}
                      {p.isBestSeller && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">Best Seller</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      {p.isActive ? (
                        <button onClick={() => archiveMutation.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors" title="Archive">
                          <Archive className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => reactivateMutation.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors" title="Reactivate">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {products.length === 0 && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products found.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button disabled={!meta.hasPrevPage} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Previous</button>
          <span className="px-4 py-2 text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
          <button disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={closeModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-card rounded-3xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-black font-['Outfit']">{editing ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Field label="Title *" id="pm-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                  <Field label="Slug *" id="pm-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required />
                  <Field label="SKU *" id="pm-sku" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required />
                  <Field label="Price (₹) *" id="pm-price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required min="0" step="0.01" />
                  <Field label="Sale Price (₹)" id="pm-sale" type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} min="0" step="0.01" />
                  <Field label="Stock *" id="pm-stock" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} required min="0" />
                  <Field label="Low Stock Threshold" id="pm-threshold" type="number" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} min="0" />
                  <Field label="Brand" id="pm-brand" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                  <Field label="Tags (comma-separated)" id="pm-tags" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="laptop, gaming, intel" />
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Image URLs (one per line)</label>
                    <textarea value={form.images.join('\n')} onChange={e => setForm(f => ({ ...f, images: e.target.value.split('\n') }))} rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Attributes (JSON)</label>
                    <textarea value={form.attributes} onChange={e => setForm(f => ({ ...f, attributes: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs" />
                  </div>
                  <Field label="Barcode" id="pm-barcode" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="e.g. 8901234567890" />
                  <div className="flex flex-wrap items-center gap-6 col-span-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="accent-blue-500 w-4 h-4" />
                      <span className="text-sm">Featured</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isNewArrival} onChange={e => setForm(f => ({ ...f, isNewArrival: e.target.checked }))} className="accent-purple-500 w-4 h-4" />
                      <span className="text-sm">New Arrival</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isBestSeller} onChange={e => setForm(f => ({ ...f, isBestSeller: e.target.checked }))} className="accent-amber-500 w-4 h-4" />
                      <span className="text-sm">Best Seller</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-green-500 w-4 h-4" />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                  <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-muted rounded-xl text-sm font-semibold hover:bg-muted/70 transition-colors">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
