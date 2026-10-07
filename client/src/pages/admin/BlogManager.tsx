import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Archive, BookOpen, CheckSquare, Edit3, Plus, Square } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';
import { DataTable, dataTableFeatures } from '../../components/ui/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import type { Blog, PaginationMeta } from '../../types';

export default function BlogManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const debounced = useDebounce(search, 300);
  const query = useQuery({ queryKey: ['admin-blogs', page, debounced, status], queryFn: () => api.get<Blog[]>('/blogs/admin', { page, limit: 20, ...(debounced ? { search: debounced } : {}), ...(status ? { status } : {}), sortBy: 'updatedAt', sortOrder: 'desc' }), placeholderData: (previous) => previous });
  const stats = useQuery({ queryKey: ['admin-blog-stats'], queryFn: () => api.get<{ draft: number; published: number; archived: number; total: number }>('/blogs/admin/stats') });
  useEffect(() => {
    // Selection is page-scoped by contract and must not survive a context change.
    // oxlint-disable-next-line react/set-state-in-effect -- selection is explicitly scoped to the current server page
    setSelected(new Set());
  }, [page, debounced, status]);
  const archive = useMutation({ mutationFn: (ids: string[]) => api.post<{ archived: number; failed: Array<{ id: string; reason: string }> }>('/blogs/admin/bulk-archive', { ids }), onSuccess: (result) => { toast.success(`${result.data.archived} posts archived.`); if (result.data.failed.length) toast.warning(`${result.data.failed.length} posts were unchanged.`); setSelected(new Set()); void qc.invalidateQueries({ queryKey: ['admin-blogs'] }); void qc.invalidateQueries({ queryKey: ['admin-blog-stats'] }); }, onError: (e: any) => toast.error(e?.message ?? 'Archive failed.') });
  const blogs = query.data?.data ?? [];
  const meta = query.data?.meta as PaginationMeta | undefined;
  const allSelected = blogs.length > 0 && blogs.every((blog) => selected.has(blog.id));
  const columns: ColumnDef<typeof dataTableFeatures, Blog, any>[] = [
    { id: 'select', header: () => <button aria-label="Select all posts on this page" onClick={() => setSelected(allSelected ? new Set() : new Set(blogs.map((blog) => blog.id)))}>{allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}</button>, cell: ({ row }) => <button aria-label={`Select ${row.original.title}`} onClick={() => setSelected((current) => { const next = new Set(current); if (next.has(row.original.id)) next.delete(row.original.id); else next.add(row.original.id); return next; })}>{selected.has(row.original.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}</button> },
    { accessorKey: 'imageUrl', header: 'Cover', cell: ({ row }) => row.original.imageUrl ? <img src={row.original.imageUrl} alt={row.original.coverAlt ?? ''} className="w-14 h-9 rounded object-cover" /> : <span className="w-14 h-9 rounded bg-muted flex items-center justify-center"><BookOpen className="w-4 h-4" /></span> },
    { accessorKey: 'title', header: 'Title', cell: ({ row }) => <div><p className="font-semibold">{row.original.title}</p><p className="text-xs text-muted-foreground">/{row.original.slug}</p></div> },
    { accessorKey: 'authorName', header: 'Author', cell: ({ row }) => row.original.authorName ?? 'Former administrator' },
    { accessorKey: 'status', header: 'State', cell: ({ row }) => <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{row.original.status}</span> },
    { accessorKey: 'publishedAt', header: 'Published / updated', cell: ({ row }) => <div className="text-xs"><p>{row.original.publishedAt ? new Date(row.original.publishedAt).toLocaleDateString('en-IN') : 'Not published'}</p><p className="text-muted-foreground">Updated {new Date(row.original.updatedAt).toLocaleDateString('en-IN')}</p></div> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => <Link aria-label={`Edit ${row.original.title}`} to={`/admin/blogs/${row.original.id}/edit`} className="inline-flex rounded-lg border border-border p-2 hover:bg-muted"><Edit3 className="w-4 h-4" /></Link> },
  ];
  return <div className="p-4 sm:p-8 space-y-6"><div className="flex flex-wrap gap-3 justify-between"><div><h2 className="text-2xl sm:text-3xl font-black flex items-center gap-2"><BookOpen className="text-primary" /> Blogs</h2><p className="text-sm text-muted-foreground">Draft, publish and archive sanitized articles.</p></div><Link to="/admin/blogs/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground"><Plus className="w-4 h-4" /> New post</Link></div>
    <div className="grid sm:grid-cols-3 gap-4">{(['draft','published','archived'] as const).map((key) => <div key={key} className="rounded-xl border border-border bg-card p-5"><p className="text-sm capitalize text-muted-foreground">{key}</p><p className="text-2xl font-black">{stats.data?.data[key] ?? '—'}</p><p className="text-xs text-muted-foreground">Global database count</p></div>)}</div>
    {query.isError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">Blogs could not be loaded. <button onClick={() => query.refetch()} className="underline">Retry</button></div>}
    <DataTable columns={columns} data={blogs.map((blog) => ({ ...blog, isSelected: selected.has(blog.id) }))} isLoading={query.isPending} search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Search title or slug…" filters={[{ key: 'status', label: 'All states', value: status, onChange: (value) => { setStatus(value); setPage(1); }, options: ['draft','published','archived'].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })) }]} page={page} totalPages={meta?.totalPages} onPageChange={setPage} actions={selected.size > 0 ? <button disabled={archive.isPending} onClick={() => confirm(`Archive ${selected.size} selected posts from this page?`) && archive.mutate([...selected])} className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500 disabled:opacity-50"><Archive className="w-4 h-4" /> Archive selected ({selected.size})</button> : undefined} />
  </div>;
}
