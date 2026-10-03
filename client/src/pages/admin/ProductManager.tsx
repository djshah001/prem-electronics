import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Archive,
  RefreshCw,
  X,
  Package,
  Star,
  CheckSquare,
  Square,
  Upload,
  MoreHorizontal,
  Sparkles,
  Layers,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Info,
  ChevronLeft,
  ChevronRight,

} from 'lucide-react';
import { api } from '../../api/axiosClient';
import { Link } from 'react-router-dom';
import type { Product, PaginationMeta, Category } from '../../types';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, dataTableFeatures } from '../../components/ui/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';

export interface VariantRow {
  id?: string;
  sku: string;
  barcode: string;
  price: string;
  salePrice: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  optionCombinationKey: string;
  combinationLabel: string;
  optionValueLabels: Array<{ optionName: string; valueLabel: string }>;
}

export interface OptionDef {
  id?: string;
  name: string;
  values: Array<{ id?: string; label: string; colorSwatch?: string }>;
}

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  helperText?: string;
}

const FormField = ({ label, id, error, helperText, className, ...props }: FieldProps) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label htmlFor={id} className="block text-xs font-semibold text-foreground/80">
        {label}
      </label>
      {helperText && <span className="text-[11px] text-muted-foreground">{helperText}</span>}
    </div>
    <input
      id={id}
      {...props}
      className={cn(
        "w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
        error && "border-red-500 focus:ring-red-500/50",
        className
      )}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const EMPTY_FORM = {
  title: '',
  slug: '',
  sku: '',
  barcode: '',
  description: '',
  price: '',
  salePrice: '',
  stock: 0,
  lowStockThreshold: 5,
  brand: '',
  categoryId: '',
  isFeatured: false,
  isNewArrival: false,
  isBestSeller: false,
  isActive: true,
  images: [] as string[],
  tags: '',
  attributes: [] as { name: string; value: string }[],
};

export default function ProductManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [productMode, setProductMode] = useState<'simple' | 'variants'>('simple');
  const [optionsList, setOptionsList] = useState<OptionDef[]>([]);
  const [variantsList, setVariantsList] = useState<VariantRow[]>([]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [newValInputs, setNewValInputs] = useState<Record<number, string>>({});
  const [newSwatchInputs, setNewSwatchInputs] = useState<Record<number, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search, statusFilter, categoryFilter, sortBy, sortOrder],
    queryFn: () =>
      api.get<Product[]>('/products/admin/all', {
        page,
        limit: 15,
        ...(search && { search }),
        ...(statusFilter && { isActive: statusFilter === 'active' }),
        ...(categoryFilter && { categoryId: categoryFilter }),
        sortBy,
        sortOrder,
      } as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

  const { data: catData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => api.get<Category[]>('/categories'),
    staleTime: 60000,
  });

  const products = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  const flatCats = useMemo(() => {
    const list: (Category & { depth?: number })[] = [];
    const flatten = (cats: Category[], depth = 0) => {
      cats.forEach((c) => {
        list.push({ ...c, depth });
        if (c.children?.length) flatten(c.children, depth + 1);
      });
    };
    if (catData?.data) {
      flatten(Array.isArray(catData.data) ? catData.data : [catData.data as any]);
    }
    return list;
  }, [catData]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Product>('/products', payload),
    onSuccess: () => {
      toast.success('Product created successfully!');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      closeModal();
    },
    onError: (e: any) => toast.error(e?.errors?.[0]?.message || e?.message || 'Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.put<Product>(`/products/${id}`, payload),
    onSuccess: () => {
      toast.success('Product updated successfully!');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      closeModal();
    },
    onError: (e: any) => toast.error(e?.errors?.[0]?.message || e?.message || 'Failed to update product'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/archive`, {}),
    onSuccess: () => {
      toast.success('Product archived');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to archive'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/reactivate`, {}),
    onSuccess: () => {
      toast.success('Product reactivated');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to reactivate'),
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/admin/products/bulk-delete', { ids }),
    onSuccess: () => {
      toast.success(`${selected.size} products deactivated`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Bulk deactivation failed'),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('images', f));
    try {
      const res = await api.postForm<{ urls: string[] }>('/upload', formData);
      const urls = res.data?.urls ?? [];
      setForm((f) => ({ ...f, images: [...f.images.filter(Boolean), ...urls] }));
      toast.success(`${urls.length} image(s) uploaded successfully`);
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      images: [],
      attributes: [],
    });
    setEditing(null);
    setProductMode('simple');
    setOptionsList([]);
    setVariantsList([]);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    // Handle both legacy Record<string,unknown> and new {name,value}[] attribute formats
    const attrArray = Array.isArray(p.attributes)
      ? p.attributes
      : Object.entries(p.attributes || {}).map(([name, value]) => ({ name, value: String(value) }));
    setForm({
      title: p.title,
      slug: p.slug,
      sku: p.sku,
      barcode: p.barcode ?? '',
      description: p.description ?? '',
      price: String(p.price),
      salePrice: p.salePrice ? String(p.salePrice) : '',
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold ?? 5,
      brand: p.brand ?? '',
      categoryId: p.categoryId ?? '',
      isFeatured: Boolean(p.isFeatured),
      isNewArrival: Boolean(p.isNewArrival),
      isBestSeller: Boolean(p.isBestSeller),
      isActive: Boolean(p.isActive),
      images: Array.isArray(p.images) ? p.images : [],
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      attributes: attrArray,
    });
    setEditing(p);
    setShowModal(true);
    setProductMode('simple');
    setOptionsList([]);
    setVariantsList([]);

    api.get<{ options: OptionDef[]; variants: any[] }>(`/products/${p.id}/variants`)
      .then((res) => {
        const vData = res.data;
        if (vData?.options && vData.options.length > 0) {
          setProductMode('variants');
          setOptionsList(vData.options);
          setVariantsList(vData.variants.map((v: any) => {
            const optValues = v.optionValues || [];
            const optionValueLabels: Array<{ optionName: string; valueLabel: string }> = [];
            const labels: string[] = [];
            for (const opt of vData.options) {
              const matchedVal = opt.values?.find((val: any) => optValues.includes(val.id));
              if (matchedVal) {
                labels.push(matchedVal.label);
                optionValueLabels.push({ optionName: opt.name, valueLabel: matchedVal.label });
              }
            }
            return {
              id: v.id,
              sku: v.sku,
              barcode: v.barcode || '',
              price: String(v.price),
              salePrice: v.salePrice ? String(v.salePrice) : '',
              stockQuantity: v.stockQuantity,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              isActive: v.isActive ?? true,
              optionCombinationKey: v.optionCombinationKey,
              combinationLabel: labels.join(' / ') || v.optionCombinationKey,
              optionValueLabels,
            };
          }));
        }
      })
      .catch(() => {});
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= form.images.length) return;
    const updated = [...form.images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setForm((f) => ({ ...f, images: updated }));
  };

  const setCoverImage = (index: number) => {
    if (index === 0) return;
    const updated = [...form.images];
    const [selectedImg] = updated.splice(index, 1);
    updated.unshift(selectedImg);
    setForm((f) => ({ ...f, images: updated }));
    toast.success('Cover image updated.');
  };

  const generateCombinations = () => {
    const validOptions = optionsList.filter((o) => o.name.trim() && o.values.length > 0);
    if (validOptions.length === 0) {
      toast.error('Add at least one option with values to generate variants.');
      return;
    }

    const cartesian = (arrays: any[][]): any[][] =>
      arrays.reduce((acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])), [[]]);

    const valueArrays = validOptions.map((o) =>
      o.values.map((v) => ({ optionName: o.name, valueLabel: v.label, swatch: v.colorSwatch }))
    );

    const combos = cartesian(valueArrays);
    if (combos.length > 50) {
      toast.warning('Generated 50 variants (capped at 50 to prevent overload).');
      combos.length = 50;
    }

    const baseSku = form.sku.trim() || 'SKU';
    const basePrice = form.price || '0';
    const baseSale = form.salePrice || '';
    const baseStock = form.stock || 10;
    const baseThresh = form.lowStockThreshold || 5;

    const newVariants: VariantRow[] = combos.map((combo) => {
      const combinationKey = combo
        .map((c: any) => `${c.optionName.trim().toLowerCase()}:${c.valueLabel.trim().toLowerCase().replace(/\s+/g, '-')}`)
        .join(';');
      const label = combo.map((c: any) => c.valueLabel).join(' / ');
      const skuSuffix = combo.map((c: any) => c.valueLabel.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-');
      const sku = `${baseSku}-${skuSuffix}`;

      const existing = variantsList.find((v) => v.optionCombinationKey === combinationKey);

      return {
        id: existing?.id,
        sku: existing?.sku || sku,
        barcode: existing?.barcode || '',
        price: existing?.price || basePrice,
        salePrice: existing?.salePrice || baseSale,
        stockQuantity: existing?.stockQuantity ?? baseStock,
        lowStockThreshold: existing?.lowStockThreshold ?? baseThresh,
        isActive: existing?.isActive ?? true,
        optionCombinationKey: combinationKey,
        combinationLabel: label,
        optionValueLabels: combo.map((c: any) => ({ optionName: c.optionName, valueLabel: c.valueLabel })),
      };
    });

    setVariantsList(newVariants);
    toast.success(`Generated ${newVariants.length} variant combinations!`);
  };

  const applyBulkFill = () => {
    if (!bulkPrice && !bulkStock) {
      toast.info('Enter bulk price or stock to apply.');
      return;
    }
    setVariantsList((prev) =>
      prev.map((v) => ({
        ...v,
        ...(bulkPrice ? { price: bulkPrice } : {}),
        ...(bulkStock !== '' ? { stockQuantity: Number(bulkStock) } : {}),
      }))
    );
    toast.success('Bulk values applied to all variants.');
  };

  const saveVariantsForProduct = async (productId: string) => {
    if (productMode !== 'variants' || variantsList.length === 0) return;
    await api.put(`/products/${productId}/variants`, {
      options: optionsList.map((opt, i) => ({
        name: opt.name,
        displayOrder: i,
        values: opt.values.map((v, j) => ({
          label: v.label,
          colorSwatch: v.colorSwatch || undefined,
          displayOrder: j,
        })),
      })),
      variants: variantsList.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode || null,
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
        stockQuantity: Number(v.stockQuantity),
        lowStockThreshold: Number(v.lowStockThreshold),
        isActive: v.isActive,
        optionCombinationKey: v.optionCombinationKey,
        optionValueLabels: v.optionValueLabels,
      })),
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const title = form.title.trim();
    if (!title || title.length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }

    const slug = form.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/(^-+|-+$)/g, '');
    if (!slug || slug.length < 3) {
      toast.error('Slug must be at least 3 lowercase characters (letters, numbers, hyphens)');
      return;
    }

    const sku = form.sku.trim().toUpperCase();
    if (!sku || sku.length < 2) {
      toast.error('SKU must be at least 2 characters');
      return;
    }

    if (!form.categoryId || form.categoryId.trim() === '') {
      toast.error('Please select a category');
      return;
    }

    const price = Number(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    let salePrice: number | null = null;
    if (form.salePrice !== undefined && form.salePrice !== '' && form.salePrice !== null) {
      const sp = Number(form.salePrice);
      if (isNaN(sp) || sp <= 0) {
        toast.error('Sale price must be greater than 0');
        return;
      }
      if (sp >= price) {
        toast.error('Sale price must be less than regular price');
        return;
      }
      salePrice = sp;
    }

    const stock = Number(form.stock);
    if (isNaN(stock) || stock < 0) {
      toast.error('Stock must be 0 or greater');
      return;
    }

    const lowStockThreshold = Number(form.lowStockThreshold) >= 0 ? Number(form.lowStockThreshold) : 5;

    const cleanAttrs = form.attributes
      .filter((attr) => attr.name.trim() && attr.value.trim())
      .map((attr) => ({ name: attr.name.trim(), value: attr.value.trim() }));

    const cleanImages = (Array.isArray(form.images) ? form.images : [])
      .map((img) => img.trim())
      .filter(Boolean);

    const cleanTags = typeof form.tags === 'string'
      ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      title,
      slug,
      sku,
      barcode: form.barcode?.trim() || null,
      description: form.description?.trim() || null,
      price,
      salePrice,
      stock,
      lowStockThreshold,
      brand: form.brand?.trim() || null,
      categoryId: form.categoryId,
      isFeatured: Boolean(form.isFeatured),
      isNewArrival: Boolean(form.isNewArrival),
      isBestSeller: Boolean(form.isBestSeller),
      isActive: Boolean(form.isActive),
      images: cleanImages,
      tags: cleanTags,
      attributes: cleanAttrs,
    };

    if (productMode === 'variants') {
      if (variantsList.length === 0) {
        toast.error('Please generate variants or switch to Simple Product mode.');
        return;
      }
      for (const v of variantsList) {
        if (!v.sku.trim()) {
          toast.error(`Variant "${v.combinationLabel}" requires a SKU.`);
          return;
        }
        if (!v.price || Number(v.price) <= 0) {
          toast.error(`Variant "${v.combinationLabel}" requires a valid price > 0.`);
          return;
        }
      }
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload }, {
        onSuccess: async () => {
          try {
            await saveVariantsForProduct(editing.id);
          } catch (e: any) {
            toast.error(e?.message || 'Product updated, but failed to save variants.');
          }
        },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: async (res) => {
          try {
            if (res.data?.id) await saveVariantsForProduct(res.data.id);
          } catch (e: any) {
            toast.error(e?.message || 'Product created, but failed to save variants.');
          }
        },
      });
    }
  };

  const columns: ColumnDef<typeof dataTableFeatures, Product, any>[] = [
    {
      id: 'select',
      header: () => (
        <button onClick={toggleAll}>
          {selected.size === products.length && products.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <button onClick={() => toggleSelect(p.id)}>
            {selected.has(p.id) ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        );
      },
    },
    {
      accessorKey: 'title',
      header: () => (
        <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-foreground">
          Product {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {p.images?.[0] ? (
                <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-4 h-4 m-3 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground line-clamp-1 max-w-[200px]">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.brand}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'sku',
      header: () => (
        <button onClick={() => toggleSort('sku')} className="flex items-center gap-1 hover:text-foreground">
          SKU {sortBy === 'sku' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="font-mono text-xs text-muted-foreground">
            <div>{p.sku}</div>
            {p.barcode && <div className="text-[10px] text-muted-foreground/60">{p.barcode}</div>}
          </div>
        );
      },
    },
    {
      accessorKey: 'price',
      header: () => (
        <button onClick={() => toggleSort('price')} className="flex items-center gap-1 hover:text-foreground">
          Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <span className="font-semibold text-foreground">{formatPrice(p.price)}</span>
            {p.salePrice && (
              <span className="block text-xs text-emerald-500 font-medium">Sale: {formatPrice(p.salePrice)}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'stock',
      header: () => (
        <button onClick={() => toggleSort('stock')} className="flex items-center gap-1 hover:text-foreground">
          Stock {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        const isLow = p.stock <= p.lowStockThreshold;
        return (
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold",
              p.stock === 0
                ? "bg-red-500/10 text-red-500"
                : isLow
                ? "bg-amber-500/10 text-amber-500"
                : "bg-emerald-500/10 text-emerald-500"
            )}
          >
            {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
          </span>
        );
      },
    },
    {
      accessorKey: 'avgRating',
      header: 'Rating',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{Number(p.avgRating || 0).toFixed(1)}</span>
            <span>({p.reviewCount || 0})</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-semibold",
              p.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
            )}
          >
            {p.isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEdit(p)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {p.isActive ? (
                  <DropdownMenuItem
                    onClick={() => archiveMutation.mutate(p.id)}
                    className="text-amber-500 focus:text-amber-500 focus:bg-amber-500/10 cursor-pointer"
                  >
                    <Archive className="w-4 h-4 mr-2" /> Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => reactivateMutation.mutate(p.id)}
                    className="text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Reactivate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const tableData = products.map((p) => ({ ...p, isSelected: selected.has(p.id) }));

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
        <button
          id="add-product-btn"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search products by title or SKU..."
        filters={[
          {
            key: 'status',
            label: 'All Statuses',
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'archived' },
            ],
          },
          {
            key: 'category',
            label: 'All Categories',
            value: categoryFilter,
            onChange: (val) => {
              setCategoryFilter(val);
              setPage(1);
            },
            options: flatCats.map((c) => ({
              label: '— '.repeat(c.depth || 0) + c.name,
              value: c.id,
            })),
          },
        ]}
        page={page}
        totalPages={meta?.totalPages}
        onPageChange={setPage}
        actions={
          selected.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => bulkArchiveMutation.mutate(Array.from(selected))}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-medium text-sm hover:bg-amber-500/20 transition-all"
            >
              <Archive className="w-4 h-4" /> Deactivate Selected ({selected.size})
            </motion.button>
          )
        }
      />

      {/* Product Creation / Edit Dialog (Shadcn Dialog) */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border sm:rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
            <DialogTitle className="text-xl font-bold font-['Outfit'] flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {editing ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Update details for "${editing.title}"`
                : 'Fill in the information below to add a new product to your store inventory.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Basic Information */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" /> Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <FormField
                      label="Product Title *"
                      id="pm-title"
                      placeholder="e.g. Sony WH-1000XM5 Wireless Noise Cancelling Headphones"
                      value={form.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => {
                          const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
                          const autoSku = val.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
                          return {
                            ...f,
                            title: val,
                            ...(!editing && (!f.slug || f.slug === f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, ''))
                              ? { slug: autoSlug }
                              : {}),
                            ...(!editing && !f.sku
                              ? { sku: autoSku ? `${autoSku}-${Math.floor(1000 + Math.random() * 9000)}` : '' }
                              : {}),
                          };
                        });
                      }}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="pm-slug" className="block text-xs font-semibold text-foreground/80">
                        Slug (URL Key) *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const s = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
                          setForm((f) => ({ ...f, slug: s }));
                        }}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        From Title
                      </button>
                    </div>
                    <input
                      id="pm-slug"
                      value={form.slug}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        }))
                      }
                      required
                      placeholder="sony-wh-1000xm5"
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="pm-sku" className="block text-xs font-semibold text-foreground/80">
                        SKU (Stock Keeping Unit) *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const prefix = form.title
                            ? form.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
                            : 'PRD';
                          const rand = Math.floor(1000 + Math.random() * 9000);
                          setForm((f) => ({ ...f, sku: `${prefix || 'PRD'}-${rand}` }));
                        }}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        Generate Unique
                      </button>
                    </div>
                    <input
                      id="pm-sku"
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                      required
                      placeholder="e.g. SONY-4821"
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="pm-category" className="block text-xs font-semibold text-foreground/80 mb-1">
                      Category *
                    </label>
                    {flatCats.length === 0 ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-500 flex items-center justify-between">
                        <span>No active categories found.</span>
                        <Link to="/admin/categories" className="underline font-bold hover:text-amber-400">
                          Create Category
                        </Link>
                      </div>
                    ) : (
                    <select
                      id="pm-category"
                      required
                      value={form.categoryId}
                      onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">-- Select Category --</option>
                      {flatCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {'— '.repeat(c.depth || 0) + c.name}
                        </option>
                      ))}
                    </select>
                    )}
                  </div>

                  <FormField
                    label="Brand"
                    id="pm-brand"
                    placeholder="e.g. Sony, Apple, Samsung"
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  />
                </div>
              </div>

              {/* Section 2: Pricing & Inventory */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Pricing & Inventory
                </h3>
                {/* Product Mode Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-2xl border border-border mb-4">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Product Type</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Simple product or multiple variants (color, size, storage)
                    </p>
                  </div>
                  <div className="flex bg-background border border-border rounded-xl p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setProductMode('simple')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg transition-all',
                        productMode === 'simple'
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Simple Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductMode('variants')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg transition-all',
                        productMode === 'variants'
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Variant-based
                    </button>
                  </div>
                </div>

                {productMode === 'simple' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Regular Price (₹) *"
                    id="pm-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="2499.00"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    required
                  />

                  <FormField
                    label="Sale Price (₹)"
                    id="pm-sale"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Optional discounted price"
                    value={form.salePrice}
                    onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                  />

                  <FormField
                    label="Stock Quantity *"
                    id="pm-stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                    required
                  />

                  <FormField
                    label="Low Stock Alert Threshold"
                    id="pm-threshold"
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
                  />

                  <div className="md:col-span-2">
                    <FormField
                      label="Barcode / EAN / UPC"
                      id="pm-barcode"
                      placeholder="e.g. 8901234567890"
                      value={form.barcode}
                      onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                    />
                  </div>
                </div>
                ) : (
                  <div className="space-y-4">
                    {/* Options Manager */}
                    <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Options & Values</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Define options like Color, Size, Storage and their respective values.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (optionsList.length >= 4) {
                              toast.info('Maximum 4 options allowed.');
                              return;
                            }
                            setOptionsList((prev) => [...prev, { name: '', values: [] }]);
                          }}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-primary/10 text-primary font-semibold rounded-lg hover:bg-primary/20 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Option
                        </button>
                      </div>

                      {optionsList.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center border border-dashed border-border rounded-xl">
                          No options added yet. Click &ldquo;Add Option&rdquo; above to start.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {optionsList.map((opt, optIdx) => {
                            const isColor = opt.name.toLowerCase().includes('color');
                            return (
                              <div key={optIdx} className="p-3 bg-muted/30 rounded-xl border border-border space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    placeholder="Option Name (e.g. Color, Storage, Size)"
                                    value={opt.name}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setOptionsList((prev) =>
                                        prev.map((o, idx) => (idx === optIdx ? { ...o, name: val } : o))
                                      );
                                    }}
                                    className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setOptionsList((prev) => prev.filter((_, idx) => idx !== optIdx))}
                                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                                    title="Remove Option"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Values tags */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {opt.values.map((v, valIdx) => (
                                    <span
                                      key={valIdx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium"
                                    >
                                      {v.colorSwatch && (
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                                          style={{ backgroundColor: v.colorSwatch }}
                                        />
                                      )}
                                      <span>{v.label}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOptionsList((prev) =>
                                            prev.map((o, idx) =>
                                              idx === optIdx
                                                ? { ...o, values: o.values.filter((_, vIdx) => vIdx !== valIdx) }
                                                : o
                                            )
                                          );
                                        }}
                                        className="text-muted-foreground hover:text-destructive ml-0.5"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  ))}

                                  {/* Add value input */}
                                  <div className="flex items-center gap-1">
                                    <input
                                      placeholder="New value"
                                      value={newValInputs[optIdx] ?? ''}
                                      onChange={(e) =>
                                        setNewValInputs((prev) => ({ ...prev, [optIdx]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const val = (newValInputs[optIdx] ?? '').trim();
                                          if (!val) return;
                                          setOptionsList((prev) =>
                                            prev.map((o, idx) =>
                                              idx === optIdx
                                                ? {
                                                    ...o,
                                                    values: [
                                                      ...o.values,
                                                      {
                                                        label: val,
                                                        colorSwatch: isColor
                                                          ? newSwatchInputs[optIdx] || '#000000'
                                                          : undefined,
                                                      },
                                                    ],
                                                  }
                                                : o
                                            )
                                          );
                                          setNewValInputs((prev) => ({ ...prev, [optIdx]: '' }));
                                        }
                                      }}
                                      className="w-28 px-2 py-1 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    />
                                    {isColor && (
                                      <input
                                        type="color"
                                        value={newSwatchInputs[optIdx] ?? '#000000'}
                                        onChange={(e) =>
                                          setNewSwatchInputs((prev) => ({ ...prev, [optIdx]: e.target.value }))
                                        }
                                        title="Pick swatch color"
                                        className="w-6 h-6 rounded cursor-pointer border border-border p-0"
                                      />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const val = (newValInputs[optIdx] ?? '').trim();
                                        if (!val) return;
                                        setOptionsList((prev) =>
                                          prev.map((o, idx) =>
                                            idx === optIdx
                                              ? {
                                                  ...o,
                                                  values: [
                                                    ...o.values,
                                                    {
                                                      label: val,
                                                      colorSwatch: isColor
                                                        ? newSwatchInputs[optIdx] || '#000000'
                                                        : undefined,
                                                    },
                                                  ],
                                                }
                                              : o
                                          )
                                        );
                                        setNewValInputs((prev) => ({ ...prev, [optIdx]: '' }));
                                      }}
                                      className="px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90"
                                    >
                                      Add
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={generateCombinations}
                              className="flex items-center gap-1.5 px-4 py-2 gradient-primary text-white text-xs font-bold rounded-xl shadow hover:opacity-90 transition-all cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Generate Combinations
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bulk fill bar */}
                    {variantsList.length > 0 && (
                      <div className="p-3 bg-muted/40 rounded-xl border border-border flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">Bulk Fill:</span>
                        <input
                          placeholder="Price (₹)"
                          type="number"
                          step="0.01"
                          value={bulkPrice}
                          onChange={(e) => setBulkPrice(e.target.value)}
                          className="w-24 px-2 py-1 bg-background border border-border rounded-lg"
                        />
                        <input
                          placeholder="Stock"
                          type="number"
                          value={bulkStock}
                          onChange={(e) => setBulkStock(e.target.value)}
                          className="w-20 px-2 py-1 bg-background border border-border rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={applyBulkFill}
                          className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20"
                        >
                          Apply to All
                        </button>
                        <span className="text-muted-foreground ml-auto">
                          {variantsList.length} variant{variantsList.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Variants Table */}
                    {variantsList.length > 0 && (
                      <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/80 text-muted-foreground font-semibold uppercase tracking-wider sticky top-0 border-b border-border">
                            <tr>
                              <th className="p-2.5">Variant</th>
                              <th className="p-2.5">SKU *</th>
                              <th className="p-2.5">Price (₹) *</th>
                              <th className="p-2.5">Sale (₹)</th>
                              <th className="p-2.5">Stock *</th>
                              <th className="p-2.5">Active</th>
                              <th className="p-2.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {variantsList.map((v, vIdx) => (
                              <tr key={vIdx} className="hover:bg-muted/30">
                                <td className="p-2.5 font-medium text-foreground max-w-[140px] truncate">
                                  {v.combinationLabel}
                                </td>
                                <td className="p-2">
                                  <input
                                    value={v.sku}
                                    onChange={(e) => {
                                      const val = e.target.value.toUpperCase();
                                      setVariantsList((prev) =>
                                        prev.map((item, i) => (i === vIdx ? { ...item, sku: val } : item))
                                      );
                                    }}
                                    className="w-28 px-1.5 py-1 bg-background border border-border rounded text-xs font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={v.price}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setVariantsList((prev) =>
                                        prev.map((item, i) => (i === vIdx ? { ...item, price: val } : item))
                                      );
                                    }}
                                    className="w-20 px-1.5 py-1 bg-background border border-border rounded text-xs"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={v.salePrice}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setVariantsList((prev) =>
                                        prev.map((item, i) => (i === vIdx ? { ...item, salePrice: val } : item))
                                      );
                                    }}
                                    className="w-20 px-1.5 py-1 bg-background border border-border rounded text-xs"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={v.stockQuantity}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setVariantsList((prev) =>
                                        prev.map((item, i) => (i === vIdx ? { ...item, stockQuantity: val } : item))
                                      );
                                    }}
                                    className="w-16 px-1.5 py-1 bg-background border border-border rounded text-xs"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={v.isActive}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setVariantsList((prev) =>
                                        prev.map((item, i) => (i === vIdx ? { ...item, isActive: checked } : item))
                                      );
                                    }}
                                    className="accent-primary w-3.5 h-3.5 rounded"
                                  />
                                </td>
                                <td className="p-2">
                                  <button
                                    type="button"
                                    onClick={() => setVariantsList((prev) => prev.filter((_, i) => i !== vIdx))}
                                    className="text-muted-foreground hover:text-destructive"
                                    title="Remove variant"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Media & Images */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" /> Product Images
                  </h3>
                  <button
                    type="button"
                    id="upload-images-btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary font-semibold rounded-lg hover:bg-primary/20 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {form.images.filter(Boolean).length > 0 && (
                  <div className="flex gap-2.5 mb-3 flex-wrap">
                    {form.images.filter(Boolean).map((url, i, arr) => (
                      <div
                        key={i}
                        className="relative group w-24 h-24 rounded-xl overflow-hidden border border-border bg-muted flex-shrink-0"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {i === 0 ? (
                          <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-[9px] font-bold text-center py-0.5 flex items-center justify-center gap-0.5 shadow">
                            <Star className="w-2.5 h-2.5 fill-current" /> Cover
                          </span>
                        ) : (
                          <button
                            type="button"
                            title="Set as cover image"
                            onClick={() => setCoverImage(i)}
                            className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 bg-background/90 hover:bg-background text-foreground text-[9px] px-1.5 py-0.5 rounded shadow transition-all flex items-center gap-0.5 border border-border"
                          >
                            <Star className="w-2.5 h-2.5" /> Cover
                          </button>
                        )}
                        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {i > 0 && (
                            <button
                              type="button"
                              title="Move left"
                              onClick={() => moveImage(i, 'left')}
                              className="w-5 h-5 rounded-full bg-background/90 hover:bg-background text-foreground flex items-center justify-center shadow border border-border"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {i < arr.length - 1 && (
                            <button
                              type="button"
                              title="Move right"
                              onClick={() => moveImage(i, 'right')}
                              className="w-5 h-5 rounded-full bg-background/90 hover:bg-background text-foreground flex items-center justify-center shadow border border-border"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Remove image"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                images: f.images.filter((_, idx) => idx !== i),
                              }))
                            }
                            className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  value={form.images.join('\n')}
                  onChange={(e) => setForm((f) => ({ ...f, images: e.target.value.split('\n') }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs"
                  placeholder="Or paste image URLs here (one URL per line)"
                />
              </div>

              {/* Section 4: Details & Tags */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Description & Tags
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="pm-desc" className="block text-xs font-semibold text-foreground/80 mb-1">
                      Description
                    </label>
                    <textarea
                      id="pm-desc"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      placeholder="Detailed product specifications and highlights..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <FormField
                    label="Tags (comma-separated)"
                    id="pm-tags"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="wireless, bluetooth, noise-cancelling, bass"
                  />
                </div>
              </div>

              {/* Section 5: Dynamic Attributes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" /> Dynamic Attributes
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        attributes: [...f.attributes, { name: '', value: '' }],
                      }))
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Attribute Row
                  </button>
                </div>

                <div className="space-y-2">
                  {form.attributes.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No custom attributes added (e.g. Color, Warranty, Storage). Click &quot;Add Attribute Row&quot; above to add.
                    </p>
                  ) : (
                    form.attributes.map((attr, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          placeholder="Name (e.g. Color)"
                          value={attr.name}
                          onChange={(e) => {
                            const newAttrs = [...form.attributes];
                            newAttrs[i].name = e.target.value;
                            setForm((f) => ({ ...f, attributes: newAttrs }));
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <input
                          placeholder="Value (e.g. Midnight Black)"
                          value={attr.value}
                          onChange={(e) => {
                            const newAttrs = [...form.attributes];
                            newAttrs[i].value = e.target.value;
                            setForm((f) => ({ ...f, attributes: newAttrs }));
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newAttrs = [...form.attributes];
                            newAttrs.splice(i, 1);
                            setForm((f) => ({ ...f, attributes: newAttrs }));
                          }}
                          className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 6: Badges & Status */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Storefront Badges & Visibility
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-muted/30 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                      className="accent-blue-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium">Featured</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-muted/30 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.isNewArrival}
                      onChange={(e) => setForm((f) => ({ ...f, isNewArrival: e.target.checked }))}
                      className="accent-purple-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium">New Arrival</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-muted/30 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.isBestSeller}
                      onChange={(e) => setForm((f) => ({ ...f, isBestSeller: e.target.checked }))}
                      className="accent-amber-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium">Best Seller</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-muted/30 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="accent-green-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium">Active (Visible)</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 px-6 border-t border-border bg-card/60 flex items-center justify-end gap-3 m-0">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 bg-muted rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 gradient-primary text-white rounded-xl text-sm font-semibold shadow hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                )}
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editing
                  ? 'Update Product'
                  : 'Create Product'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
