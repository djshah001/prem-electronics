import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  X,
  GripVertical,
  Eye,
  EyeOff,
  Link as LinkIcon,
  FolderTree,
  LayoutGrid,
  ChevronDown,
  Loader2,
  Save,
  Navigation,
} from 'lucide-react';
import { api } from '../../api/axiosClient';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { getCategoryIconComponent } from '../../config/navigationCategories';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NavbarItem {
  id: string;
  label: string;
  type: 'all_categories' | 'category' | 'custom_link';
  categoryId: string | null;
  href: string | null;
  iconName: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  children?: Category[];
}

const ICON_OPTIONS = [
  'Camera', 'Aperture', 'Video', 'HardDrive', 'Headphones', 'Compass',
  'Maximize2', 'Sun', 'Briefcase', 'Layers', 'Smartphone', 'Laptop',
  'Tv', 'Package', 'ShoppingBag', 'Star', 'Heart', 'Home',
  'Grid', 'Tag', 'Zap', 'Globe', 'BookOpen', 'Music',
];

const TYPE_LABELS: Record<NavbarItem['type'], string> = {
  all_categories: 'All Categories Menu',
  category: 'Category Dropdown',
  custom_link: 'Custom Link',
};

const TYPE_COLORS: Record<NavbarItem['type'], string> = {
  all_categories: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  category: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  custom_link: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const EMPTY_FORM = {
  label: '',
  type: 'category' as NavbarItem['type'],
  categoryId: '',
  href: '',
  iconName: 'Package',
  isVisible: true,
};

// ─── Flatten category tree helper ─────────────────────────────────────────────
function flattenCategories(cats: Category[], depth = 0): { cat: Category; depth: number }[] {
  const result: { cat: Category; depth: number }[] = [];
  for (const c of cats) {
    result.push({ cat: c, depth });
    if (c.children?.length) {
      result.push(...flattenCategories(c.children, depth + 1));
    }
  }
  return result;
}

// ─── Item Row Component ───────────────────────────────────────────────────────
function NavbarItemRow({
  item,
  allCategories,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  item: NavbarItem;
  allCategories: Category[];
  onEdit: (item: NavbarItem) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (item: NavbarItem) => void;
}) {
  const flat = flattenCategories(allCategories);
  const linkedCategory = item.categoryId
    ? flat.find((f) => f.cat.id === item.categoryId)?.cat
    : null;

  const IconComponent = getCategoryIconComponent(item.iconName || 'Package');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={clsx(
        'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
        item.isVisible
          ? 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
          : 'bg-muted/30 border-border/50 opacity-60'
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 touch-none">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Sort order badge */}
      <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
        {item.sortOrder}
      </span>

      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <IconComponent className="w-4 h-4 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">{item.label}</span>
          <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', TYPE_COLORS[item.type])}>
            {TYPE_LABELS[item.type]}
          </span>
          {!item.isVisible && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Hidden
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {item.type === 'category' && linkedCategory
            ? `→ ${linkedCategory.name}`
            : item.type === 'custom_link' && item.href
            ? `→ ${item.href}`
            : item.type === 'all_categories'
            ? 'Shows all category mega-menu'
            : '—'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onToggleVisibility(item)}
          title={item.isVisible ? 'Hide from navbar' : 'Show in navbar'}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {item.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          title="Edit"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          title="Delete"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NavbarMaster() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NavbarItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [orderedItems, setOrderedItems] = useState<NavbarItem[] | null>(null);
  const [hasReordered, setHasReordered] = useState(false);

  // Fetch navbar items (admin — all items)
  const { data: navRes, isLoading } = useQuery({
    queryKey: ['navbar-admin'],
    queryFn: () => api.get<NavbarItem[]>('/navbar/admin'),
    select: (res) => (Array.isArray(res.data) ? res.data : []),
  });

  // Fetch all categories for the dropdown
  const { data: catsRes } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
    staleTime: 60000,
  });

  const items = orderedItems ?? (navRes ?? []);
  const allCategories = Array.isArray(catsRes?.data) ? (catsRes.data as Category[]) : [];
  const flatCategories = flattenCategories(allCategories).filter((f) => f.cat.isActive !== false);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => api.post<NavbarItem>('/navbar', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['navbar-admin'] });
      setOrderedItems(null);
      toast.success('Navbar item created!');
      closeModal();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof EMPTY_FORM> }) =>
      api.put<NavbarItem>(`/navbar/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['navbar-admin'] });
      setOrderedItems(null);
      toast.success('Navbar item updated!');
      closeModal();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update item'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/navbar/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['navbar-admin'] });
      setOrderedItems(null);
      toast.success('Navbar item deleted.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete item'),
  });

  const reorderMutation = useMutation({
    mutationFn: (updates: { id: string; sortOrder: number }[]) =>
      api.post('/navbar/reorder', { items: updates }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['navbar-admin'] });
      setHasReordered(false);
      toast.success('Order saved!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save order'),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      api.put(`/navbar/${id}`, { isVisible }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['navbar-admin'] });
      setOrderedItems(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to toggle visibility'),
  });

  const isLimitReached = items.length >= 7;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    if (isLimitReached) {
      toast.error('Maximum limit reached: You can select up to 7 categories or links in the navbar.');
      return;
    }
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: NavbarItem) => {
    setEditingItem(item);
    setForm({
      label: item.label,
      type: item.type,
      categoryId: item.categoryId ?? '',
      href: item.href ?? '',
      iconName: item.iconName ?? 'Package',
      isVisible: item.isVisible,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem && isLimitReached) {
      toast.error('Maximum limit reached: You cannot select more than 7 categories or links.');
      return;
    }
    const payload = {
      ...form,
      categoryId: form.type === 'category' ? form.categoryId || null : null,
      href: form.type === 'custom_link' ? form.href || null : null,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload as any });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this navbar item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleReorder = (newOrder: NavbarItem[]) => {
    const updated = newOrder.map((item, idx) => ({ ...item, sortOrder: idx }));
    setOrderedItems(updated);
    setHasReordered(true);
  };

  const saveReorder = () => {
    if (!orderedItems) return;
    reorderMutation.mutate(orderedItems.map((item, idx) => ({ id: item.id, sortOrder: idx })));
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const SelectedIcon = getCategoryIconComponent(form.iconName || 'Package');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Navbar Master</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Control which categories, dropdowns, and links appear in the public storefront navbar (maximum 7 selections).
            Drag to reorder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 7 Limit Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold">
            <span className={clsx(isLimitReached ? 'text-amber-500 font-bold' : 'text-primary font-bold')}>
              {items.length}/7
            </span>
            <span className="text-muted-foreground">selected</span>
          </div>

          {hasReordered && (
            <button
              type="button"
              onClick={saveReorder}
              disabled={reorderMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {reorderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Order
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            disabled={isLimitReached}
            title={isLimitReached ? 'Maximum of 7 categories or links already selected' : 'Add New Category'}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              isLimitReached
                ? 'bg-muted text-muted-foreground/60 border border-border cursor-not-allowed opacity-60'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg'
            )}
          >
            <Plus className="w-4 h-4" />
            Add New Category
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {(Object.entries(TYPE_LABELS) as [NavbarItem['type'], string][]).map(([type, label]) => (
          <span key={type} className={clsx('px-2 py-1 rounded-full font-semibold', TYPE_COLORS[type])}>
            {label}
          </span>
        ))}
      </div>

      {/* Items List */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Navigation className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No navbar items configured yet.</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Add First Item
            </button>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={handleReorder}
            className="space-y-2"
          >
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <Reorder.Item key={item.id} value={item} className="list-none">
                  <NavbarItemRow
                    item={item}
                    allCategories={allCategories}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleVisibility={(item) =>
                      toggleVisibilityMutation.mutate({ id: item.id, isVisible: !item.isVisible })
                    }
                  />
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-300">
        <p className="font-semibold mb-1">How this works</p>
        <ul className="space-y-1 list-disc pl-4 text-blue-700 dark:text-blue-400">
          <li><strong>All Categories Menu</strong> — adds the "All Categories" mega-dropdown with every active category.</li>
          <li><strong>Category Dropdown</strong> — adds an individual category with its subcategories as a dropdown.</li>
          <li><strong>Custom Link</strong> — adds a plain navigation link (e.g., Contact Us, Blog).</li>
          <li>Drag rows to reorder, then click <strong>Save Order</strong>. Toggle the eye icon to show/hide without deleting.</li>
        </ul>
      </div>

      {/* ─── Modal ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="text-base font-bold text-foreground">
                  {editingItem ? 'Edit Navbar Item' : 'Add Navbar Item'}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    Item Type <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {(Object.entries(TYPE_LABELS) as [NavbarItem['type'], string][]).map(([type, label]) => {
                      const IconMap = {
                        all_categories: LayoutGrid,
                        category: FolderTree,
                        custom_link: LinkIcon,
                      };
                      const TIcon = IconMap[type];
                      return (
                        <label
                          key={type}
                          className={clsx(
                            'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                            form.type === type
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40'
                          )}
                        >
                          <input
                            type="radio"
                            name="type"
                            value={type}
                            checked={form.type === type}
                            onChange={() => setForm((f) => ({ ...f, type }))}
                            className="sr-only"
                          />
                          <TIcon className={clsx('w-4 h-4', form.type === type ? 'text-primary' : 'text-muted-foreground')} />
                          <div>
                            <p className="text-sm font-semibold">{label}</p>
                            <p className="text-xs text-muted-foreground">
                              {type === 'all_categories' && 'Mega-menu showing all categories'}
                              {type === 'category' && 'Individual category with sub-categories'}
                              {type === 'custom_link' && 'Custom URL link'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Label <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Cameras, All Categories, Contact Us"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Category selector */}
                {form.type === 'category' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Link to Category <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={form.categoryId}
                        onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                        required
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 appearance-none pr-8"
                      >
                        <option value="">Select a category...</option>
                        {flatCategories
                          .filter((f) => f.cat.parentId === null)
                          .map(({ cat }) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only root (top-level) categories are shown. Their subcategories will appear in the dropdown automatically.
                    </p>
                  </div>
                )}

                {/* Custom link URL */}
                {form.type === 'custom_link' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      URL <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.href}
                      onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
                      placeholder="/contact or https://example.com"
                      required
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                )}

                {/* Icon */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Icon</label>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <SelectedIcon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{form.iconName}</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto">
                    {ICON_OPTIONS.map((name) => {
                      const Ic = getCategoryIconComponent(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          title={name}
                          onClick={() => setForm((f) => ({ ...f, iconName: name }))}
                          className={clsx(
                            'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                            form.iconName === name
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                          )}
                        >
                          <Ic className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visible toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isVisible}
                    onClick={() => setForm((f) => ({ ...f, isVisible: !f.isVisible }))}
                    className={clsx(
                      'relative w-10 h-5 rounded-full transition-colors',
                      form.isVisible ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                        form.isVisible ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                  <span className="text-sm font-medium text-foreground">
                    {form.isVisible ? 'Visible in navbar' : 'Hidden from navbar'}
                  </span>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isMutating}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isMutating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingItem ? 'Save Changes' : 'Add Item'}
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
