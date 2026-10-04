import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ShieldCheck, ShieldOff, User } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Order, PaginationMeta } from '../../types';
import { toast } from 'sonner';

type Detail = {
  customer: { id: string; name: string; email: string; phone?: string; isVerified: boolean; isBlocked: boolean; createdAt: string };
  businesses: Array<{ id: string; gstin: string; legalName: string; tradeName?: string; registrationStateName: string; isDefault: boolean; isArchived: boolean; verifiedAt: string }>;
  summary: { orderCount: number; paidOrderCount: number; grossCapturedMinor: number; processedRefundMinor: number; netPaidMinor: number; currency: string };
};
const money = (minor: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(minor / 100);

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const detail = useQuery({ queryKey: ['admin-customer', id], queryFn: () => api.get<Detail>(`/admin/customers/${id}`), enabled: Boolean(id) });
  const orders = useQuery({ queryKey: ['admin-customer-orders', id, page, status], queryFn: () => api.get<Order[]>(`/admin/customers/${id}/orders`, { page, limit: 10, ...(status ? { status } : {}) }), enabled: Boolean(id), placeholderData: (previous) => previous });
  const block = useMutation({
    mutationFn: (value: boolean) => api.patch(`/admin/customers/${id}/block`, { block: value }),
    onSuccess: (_, value) => { toast.success(value ? 'Customer blocked.' : 'Customer unblocked.'); void qc.invalidateQueries({ queryKey: ['admin-customer', id] }); },
    onError: (error: any) => toast.error(error?.message ?? 'Account status could not be updated.'),
  });
  if (detail.isPending) return <div className="p-8"><div className="h-48 rounded-xl bg-card animate-pulse" /></div>;
  if (detail.isError || !detail.data?.data) return <div className="p-8"><p role="alert">Customer could not be loaded.</p><button onClick={() => detail.refetch()} className="underline">Retry</button></div>;
  const data = detail.data.data;
  const meta = orders.data?.meta as PaginationMeta | undefined;

  return <div className="p-4 sm:p-8 space-y-6">
    <button onClick={() => navigate('/admin/customers')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Customers</button>
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-4"><span className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-white"><User /></span><div><h2 className="text-2xl font-black">{data.customer.name}</h2><p className="text-muted-foreground">{data.customer.email}{data.customer.phone ? ` · ${data.customer.phone}` : ''}</p><p className="text-xs text-muted-foreground mt-1">Joined {new Date(data.customer.createdAt).toLocaleDateString('en-IN')} · {data.customer.isVerified ? 'Verified' : 'Unverified'}</p></div></div>
        <button disabled={block.isPending} onClick={() => { if (confirm(`${data.customer.isBlocked ? 'Unblock' : 'Block'} this customer account?`)) block.mutate(!data.customer.isBlocked); }} className="self-start inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">{data.customer.isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}{data.customer.isBlocked ? 'Unblock account' : 'Block account'}</button>
      </div>
    </section>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[
      ['Orders', data.summary.orderCount], ['Paid orders', data.summary.paidOrderCount], ['Gross captured', money(data.summary.grossCapturedMinor)], ['Net paid', money(data.summary.netPaidMinor)],
    ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-black">{value}</p></div>)}</div>
    <section className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-primary" /> Business/GST profiles</h3>{data.businesses.length ? <div className="grid lg:grid-cols-2 gap-3">{data.businesses.map((business) => <div key={business.id} className="rounded-lg bg-muted/50 p-4"><p className="font-semibold">{business.legalName}</p><p className="font-mono text-sm">{business.gstin}</p><p className="text-xs text-muted-foreground">{business.registrationStateName} · {business.isArchived ? 'Archived' : business.isDefault ? 'Default' : 'Active'}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No business profiles.</p>}</section>
    <section className="rounded-xl border border-border bg-card overflow-hidden"><div className="p-5 border-b border-border flex flex-wrap gap-3 justify-between"><div><h3 className="font-bold">Order history</h3><p className="text-xs text-muted-foreground">Server-paginated account history.</p></div><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">All statuses</option>{['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map((value) => <option key={value}>{value}</option>)}</select></div>
      {orders.isError ? <div className="p-5" role="alert">Orders could not be loaded. <button onClick={() => orders.refetch()} className="underline">Retry</button></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>{['Order','Date','Payment','Fulfilment','Total'].map((label) => <th key={label} className="text-left px-4 py-3">{label}</th>)}</tr></thead><tbody>{orders.isPending ? <tr><td colSpan={5} className="p-8 text-center">Loading…</td></tr> : orders.data?.data.length ? orders.data.data.map((order) => <tr key={order.id} className="border-t border-border"><td className="px-4 py-3"><Link className="text-primary hover:underline" to={`/admin/orders/${order.id}`}>#{order.orderNumber}</Link></td><td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td><td className="px-4 py-3 capitalize">{order.paymentStatus}</td><td className="px-4 py-3 capitalize">{order.status}</td><td className="px-4 py-3 font-semibold">₹{Number(order.total).toLocaleString('en-IN')}</td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No matching orders.</td></tr>}</tbody></table></div>}
      {meta && meta.totalPages > 1 && <div className="p-4 border-t border-border flex justify-between"><button disabled={!meta.hasPrevPage} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {meta.page} of {meta.totalPages}</span><button disabled={!meta.hasNextPage} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
  </div>;
}
