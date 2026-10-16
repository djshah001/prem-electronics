import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowDown, ArrowUp, Pencil, Plus, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';
import { BannerForm, type BannerMutationPayload } from '../../components/banner/BannerForm';
import { DataTable } from '../../components/ui/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { heroBannerQueryKey } from '../../hooks/useHeroBanners';
import type { AdminBanner, AdminHeroSettings } from '../../types/banner';

const messageOf = (error: any) => error?.message ?? error?.errors?.formErrors?.[0] ?? 'The banner operation failed.';
const badge: Record<AdminBanner['visibility'], string> = {
  visible: 'bg-emerald-500/10 text-emerald-600', scheduled: 'bg-blue-500/10 text-blue-600', inactive: 'bg-zinc-500/10 text-zinc-500',
  expired: 'bg-amber-500/10 text-amber-600', archived: 'bg-red-500/10 text-red-500',
};

export default function BannerManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState(''); const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [editing, setEditing] = useState<AdminBanner | null | undefined>(undefined);
  const [showOrdering, setShowOrdering] = useState(false);
  const [order, setOrder] = useState<AdminBanner[]>([]);
  useEffect(() => { const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [search]);

  const list = useQuery({ queryKey: ['admin-banners', page, limit, debouncedSearch, visibility], queryFn: () => api.get<AdminBanner[]>('/admin/banners', { page, limit, search: debouncedSearch || undefined, visibility, placement: 'home_hero' }) });
  const settingsQuery = useQuery({ queryKey: ['admin-banner-settings'], queryFn: () => api.get<AdminHeroSettings>('/admin/banners/settings/home_hero') });
  const orderQuery = useQuery({ queryKey: ['admin-banner-order'], queryFn: () => api.get<AdminBanner[]>('/admin/banners/order', { placement: 'home_hero' }), enabled: showOrdering });
  useEffect(() => { if (orderQuery.data?.data) setOrder(orderQuery.data.data); }, [orderQuery.data]);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['admin-banners'] }), qc.invalidateQueries({ queryKey: ['admin-banner-order'] }),
      qc.invalidateQueries({ queryKey: ['admin-banner-settings'] }), qc.invalidateQueries({ queryKey: heroBannerQueryKey }),
    ]);
  };
  const save = useMutation({
    mutationFn: (payload: BannerMutationPayload) => editing
      ? api.patch<AdminBanner>(`/admin/banners/${editing.id}`, payload)
      : api.post<AdminBanner>('/admin/banners', payload),
    onSuccess: async () => { toast.success(editing ? 'Banner saved.' : 'Banner created.'); setEditing(undefined); await refresh(); },
    onError: (error) => toast.error(messageOf(error)),
  });
  const toggle = useMutation({
    mutationFn: (banner: AdminBanner) => api.patch<AdminBanner>(`/admin/banners/${banner.id}`, { expectedVersion: banner.version, isActive: !banner.isActive }),
    onSuccess: async (result) => { toast.success(result.data.isActive ? 'Banner activated.' : 'Banner deactivated.'); await refresh(); },
    onError: (error) => toast.error(messageOf(error)),
  });
  const archive = useMutation({
    mutationFn: (banner: AdminBanner) => api.delete(`/admin/banners/${banner.id}?expectedVersion=${banner.version}`),
    onSuccess: async () => { toast.success('Banner archived and removed from storefront eligibility.'); await refresh(); },
    onError: (error) => toast.error(messageOf(error)),
  });
  const reorder = useMutation({
    mutationFn: () => api.patch<AdminBanner[]>('/admin/banners/reorder', { placement: 'home_hero', items: order.map((banner) => ({ id: banner.id, expectedVersion: banner.version })) }),
    onSuccess: async () => { toast.success('Banner order saved.'); await refresh(); setShowOrdering(false); },
    onError: async (error) => { toast.error(messageOf(error)); await orderQuery.refetch(); },
  });

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta as any;
  const columns = useMemo(() => [
    { id: 'banner', header: 'Banner', cell: ({ row }: any) => <div className="flex min-w-64 items-center gap-3"><img src={row.original.desktopAsset?.url} alt="" className="h-14 w-24 rounded-lg bg-muted object-cover" /><div><p className="font-semibold">{row.original.internalName}</p><p className="text-xs text-muted-foreground">{row.original.contentMode} · order {row.original.sortOrder + 1}</p></div></div> },
    { accessorKey: 'visibility', header: 'Visibility', cell: ({ row }: any) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badge[row.original.visibility as AdminBanner['visibility']]}`}>{row.original.visibility}</span> },
    { id: 'schedule', header: 'Schedule (IST)', cell: ({ row }: any) => <div className="whitespace-nowrap text-xs"><p>{row.original.startsAt ? new Date(row.original.startsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Starts immediately'}</p><p className="text-muted-foreground">{row.original.endsAt ? `Ends ${new Date(row.original.endsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'No end date'}</p></div> },
    { accessorKey: 'updatedAt', header: 'Updated', cell: ({ row }: any) => <span className="whitespace-nowrap text-xs">{new Date(row.original.updatedAt).toLocaleString('en-IN')}</span> },
    { id: 'actions', header: 'Actions', cell: ({ row }: any) => { const banner = row.original as AdminBanner; return <div className="flex items-center gap-1"><button type="button" disabled={Boolean(banner.archivedAt)} onClick={() => setEditing(banner)} aria-label={`Edit ${banner.internalName}`} className="rounded-lg p-2 hover:bg-muted disabled:opacity-40"><Pencil className="h-4 w-4" /></button><button type="button" disabled={Boolean(banner.archivedAt) || toggle.isPending} onClick={() => toggle.mutate(banner)} className="rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-40">{banner.isActive ? 'Deactivate' : 'Activate'}</button><button type="button" disabled={Boolean(banner.archivedAt) || archive.isPending} onClick={() => window.confirm(`Archive “${banner.internalName}”? It will no longer be eligible for the storefront.`) && archive.mutate(banner)} aria-label={`Archive ${banner.internalName}`} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-40"><Archive className="h-4 w-4" /></button></div>; } },
  ], [archive, toggle]);

  return <div className="space-y-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-black">Banner Master</h1><p className="mt-1 text-sm text-muted-foreground">Manage responsive homepage artwork, overlay content, schedules, and carousel behavior.</p></div><div className="flex gap-2"><button type="button" onClick={() => setShowOrdering((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold"><ArrowUp className="h-4 w-4" />Reorder</button><button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />Add banner</button></div></header>
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: 'All banners', value: meta?.counts?.total ?? '—' }, { label: 'Active banners', value: meta?.counts?.active ?? '—' }, { label: 'Archived banners', value: meta?.counts?.archived ?? '—' }].map((item) => <div key={item.label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-black">{item.value}</p></div>)}</div>

    {showOrdering && <section className="rounded-xl border border-border bg-card p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Full home hero order</h2><p className="text-xs text-muted-foreground">This list includes every unarchived home hero banner, independent of search and pagination.</p></div><button type="button" disabled={reorder.isPending || orderQuery.isPending} onClick={() => reorder.mutate()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" />Save order</button></div>
      {orderQuery.isError ? <p role="alert" className="text-sm text-red-500">Could not load the full order. <button onClick={() => void orderQuery.refetch()} className="underline">Retry</button></p> : <div className="space-y-2">{order.map((banner, index) => <div key={banner.id} className="flex items-center gap-3 rounded-lg border border-border p-2"><span className="w-7 text-center text-sm font-bold">{index + 1}</span><img src={banner.desktopAsset.url} alt="" className="h-10 w-16 rounded object-cover" /><span className="flex-1 text-sm font-medium">{banner.internalName}</span><button type="button" disabled={index === 0} onClick={() => setOrder((items) => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} aria-label={`Move ${banner.internalName} up`} className="rounded p-2 hover:bg-muted disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === order.length - 1} onClick={() => setOrder((items) => { const next = [...items]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} aria-label={`Move ${banner.internalName} down`} className="rounded p-2 hover:bg-muted disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></div>)}</div>}
    </section>}

    <HeroSettingsPanel settings={settingsQuery.data?.data} loading={settingsQuery.isPending} onSaved={refresh} />
    <DataTable columns={columns} data={rows} isLoading={list.isPending} isFetching={list.isFetching} error={list.isError ? messageOf(list.error) : undefined} onRetry={() => void list.refetch()} emptyMessage="No banners match these filters." search={search} onSearchChange={setSearch} searchPlaceholder="Search internal banner name…" filters={[{ key: 'visibility', label: 'All visibility states', value: visibility === 'all' ? '' : visibility, onChange: (value) => { setVisibility(value || 'all'); setPage(1); }, options: ['visible','scheduled','inactive','expired','archived'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })) }]} page={page} totalPages={meta?.totalPages ?? 0} onPageChange={setPage} pageSize={limit} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} />

    <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open && window.confirm('Close the banner editor? Unsaved form changes will be discarded.')) setEditing(undefined); }}><DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? `Edit ${editing.internalName}` : 'Add home hero banner'}</DialogTitle><DialogDescription>Upload assets first, preview the exact slide, then save. Uploading alone does not change the storefront.</DialogDescription></DialogHeader>{editing !== undefined && <BannerForm key={editing?.id ?? 'new'} banner={editing} saving={save.isPending} onSave={(payload) => save.mutate(payload)} onCancel={() => setEditing(undefined)} />}</DialogContent></Dialog>
  </div>;
}

function HeroSettingsPanel({ settings, loading, onSaved }: { settings?: AdminHeroSettings; loading: boolean; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ autoplayEnabled: true, autoplayIntervalMs: 6000, showNavigation: true, showIndicators: true });
  useEffect(() => { if (settings) setForm({ autoplayEnabled: settings.autoplayEnabled, autoplayIntervalMs: settings.autoplayIntervalMs, showNavigation: settings.showNavigation, showIndicators: settings.showIndicators }); }, [settings]);
  const mutation = useMutation({ mutationFn: () => api.patch('/admin/banners/settings/home_hero', { ...form, expectedVersion: settings!.version }), onSuccess: async () => { toast.success('Hero settings saved.'); await onSaved(); }, onError: (error) => toast.error(messageOf(error)) });
  return <details className="rounded-xl border border-border bg-card p-4"><summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><Settings2 className="h-4 w-4" />Carousel settings</summary>{loading ? <p className="mt-3 text-sm text-muted-foreground">Loading settings…</p> : settings && <div className="mt-4 flex flex-wrap items-end gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.autoplayEnabled} onChange={(e) => setForm((value) => ({ ...value, autoplayEnabled: e.target.checked }))} />Autoplay</label><label className="text-sm">Interval (3–15 seconds)<input type="number" min={3} max={15} value={form.autoplayIntervalMs / 1000} onChange={(e) => setForm((value) => ({ ...value, autoplayIntervalMs: Number(e.target.value) * 1000 }))} className="ml-2 w-20 rounded-lg border border-border bg-background px-2 py-1.5" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.showNavigation} onChange={(e) => setForm((value) => ({ ...value, showNavigation: e.target.checked }))} />Arrows</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.showIndicators} onChange={(e) => setForm((value) => ({ ...value, showIndicators: e.target.checked }))} />Indicators</label><button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"><Save className="mr-2 inline h-4 w-4" />Save settings</button></div>}</details>;
}
