import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit, Trash2, X, FolderTree, CheckSquare, Square,
  Upload, Loader2, Image as ImageIcon
} from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Category, PaginationMeta } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, dataTableFeatures } from '../../components/ui/DataTable';

const EMPTY_FORM = { name: '', slug: '', description: '', bannerImage: '', parentId: '', isActive: true };

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function CategoryManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Fetch (paginated admin view)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories', page, search],
    queryFn: () => api.get<Category[]>('/admin/categories', { page, limit: 15, ...(search && { search }) } as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

  // Flat list for parent selector
  const { data: allCatsRes } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => api.get<Category[]>('/categories'),
    staleTime: 60000,
  });

  const categories = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  // Flatten category tree for parent dropdown
  const flatCats: Category[] = [];
  const flatten = (cats: Category[]) => {
    cats.forEach((c) => { flatCats.push(c); if (c.children) flatten(c.children); });
  };
  if (allCatsRes?.data) flatten(Array.isArray(allCatsRes.data) ? allCatsRes.data : [allCatsRes.data as any]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('images', file);
    try {
      const res = await api.postForm<{ urls: string[] }>('/upload', formData);
      const url = res.data?.urls?.[0];
      if (url) {
        setForm((f) => ({ ...f, bannerImage: url }));
        toast.success('Banner image uploaded!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Category>('/categories', payload),
    onSuccess: () => { toast.success('Category created!'); invalidate(); closeModal(); },
    onError: (e: any) => toast.error(e?.errors?.[0]?.message || e?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.put<Category>(`/categories/${id}`, payload),
    onSuccess: () => { toast.success('Category updated!'); invalidate(); closeModal(); },
    onError: (e: any) => toast.error(e?.errors?.[0]?.message || e?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => { toast.success('Category archived'); invalidate(); },
    onError: (e: any) => toast.error(e?.errors?.[0]?.message || e?.message || 'Failed to delete'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/admin/categories/bulk-delete', { ids }),
    onSuccess: () => { toast.success(`${selected.size} categories archived`); setSelected(new Set()); invalidate(); },
    onError: (e: any) => toast.error(e?.errors?.[0]?.message || e?.message || 'Bulk delete failed'),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-categories'] });
    qc.invalidateQueries({ queryKey: ['categories-flat'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowModal(true); };
  const openEdit = (c: Category) => {
    setForm({ name: c.name, slug: c.slug, description: c.description || '', bannerImage: c.bannerImage || '', parentId: c.parentId || '', isActive: c.isActive });
    setEditing(c);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description?.trim() || undefined,
      bannerImage: form.bannerImage?.trim() || undefined,
      parentId: form.parentId?.trim() || undefined,
      isActive: form.isActive,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === categories.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(categories.map((c) => c.id)));
    }
  };

  const columns: ColumnDef<typeof dataTableFeatures, Category, any>[] = [
    {
      id: 'select',
      header: () => (
        <button onClick={toggleAll} id="select-all-categories">
          {selected.size === categories.length && categories.length > 0
            ? <CheckSquare className="w-4 h-4 text-primary" />
            : <Square className="w-4 h-4 text-muted-foreground" />}
        </button>
      ),
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <button onClick={() => toggleSelect(cat.id)}>
            {selected.has(cat.id)
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4 text-muted-foreground" />}
          </button>
        );
      },
    },
    {
      id: 'image',
      header: 'Banner',
      cell: ({ row }) => {
        const img = row.original.bannerImage;
        return (
          <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
            {img ? (
              <img src={img} alt={row.original.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.slug}</span>,
    },
    {
      accessorKey: 'parentId',
      header: 'Parent',
      cell: ({ row }) => {
        const parent = flatCats.find((c) => c.id === row.original.parentId);
        return <span className="text-muted-foreground">{parent ? parent.name : <span className="text-border">—</span>}</span>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openEdit(cat)}
              id={`edit-cat-${cat.id}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { if (confirm(`Archive "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
              id={`delete-cat-${cat.id}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  const tableData = categories.map(c => ({ ...c, isSelected: selected.has(c.id) }));

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-3">
            <FolderTree className="w-7 h-7 text-primary" />
            Category Manager
          </h1>
          <p className="text-muted-foreground mt-1">Manage product categories and hierarchy</p>
        </div>
        <button
          id="create-category-btn"
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search categories..."
        page={page}
        totalPages={meta?.totalPages}
        onPageChange={setPage}
        actions={
          selected.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-medium text-sm hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Archive ({selected.size})
            </motion.button>
          )
        }
      />

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-['Outfit']">
                  {editing ? 'Edit Category' : 'New Category'}
                </h2>
                <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                    placeholder="e.g. Smartphones"
                    id="cat-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Slug *</label>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 font-mono"
                    placeholder="e.g. smartphones"
                    id="cat-slug-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Banner Image</label>
                  <div className="space-y-2">
                    {form.bannerImage && (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border group bg-muted/30">
                        <img
                          src={form.bannerImage}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, bannerImage: '' }))}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500 transition-colors"
                          title="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={form.bannerImage}
                        onChange={(e) => setForm((f) => ({ ...f, bannerImage: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                        placeholder="Image URL or upload..."
                      />
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="cat-banner-file"
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => bannerInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl border border-border transition-colors disabled:opacity-50"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" /> Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Parent Category</label>
                  <select
                    value={form.parentId}
                    onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="">— None (root) —</option>
                    {flatCats.filter((c) => c.id !== editing?.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cat-active"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="cat-active" className="text-sm font-medium">Active</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-accent transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="cat-submit-btn"
                    disabled={createMutation.isPending || updateMutation.isPending || uploading}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60"
                  >
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
