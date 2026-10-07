import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CreditCard, ShoppingBag, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/axiosClient';
import type { Order } from '../../types';

type Analytics = {
  appliedRange: { start: string; end: string; timezone: string };
  collections: { grossCapturedMinor: number; processedRefundMinor: number; netCollectionsMinor: number };
  daily: Array<{ date: string; netCollectionsMinor: number; ordersCreated: number }>;
  stock: { lowStock: number; outOfStock: number; scope: string };
  customers: { registered: number; newInRange: number };
};
const money = (minor: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

export default function AdminDashboard() {
  const analytics = useQuery({ queryKey: ['admin-analytics', 'last30-dashboard'], queryFn: () => api.get<Analytics>('/admin/analytics', { preset: 'last30', timezone: 'Asia/Kolkata', currency: 'INR' }), refetchInterval: 120_000 });
  const recent = useQuery({ queryKey: ['admin-orders', 'recent-dashboard'], queryFn: () => api.get<Order[]>('/admin/orders', { page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }), refetchInterval: 60_000 });
  const data = analytics.data?.data;
  return <div className="p-4 sm:p-8 space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl sm:text-3xl font-black">Dashboard</h2><p className="text-sm text-muted-foreground">Operational summary backed by the same ledger as Analytics.</p></div><Link to="/admin/analytics" className="inline-flex items-center gap-2 text-sm text-primary">Open full analytics <ArrowRight className="w-4 h-4" /></Link></div>
    {analytics.isError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">Dashboard metrics are unavailable. <button onClick={() => analytics.refetch()} className="underline">Retry</button></div>}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[
      { label: 'Net collections · 30 days', value: data ? money(data.collections.netCollectionsMinor) : '—', icon: CreditCard },
      { label: 'Gross captured · 30 days', value: data ? money(data.collections.grossCapturedMinor) : '—', icon: ShoppingBag },
      { label: 'Registered customers', value: data ? Number(data.customers.registered).toLocaleString() : '—', icon: Users },
      { label: 'Low/out variants', value: data ? `${data.stock.lowStock} / ${data.stock.outOfStock}` : '—', icon: AlertTriangle },
    ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-border bg-card p-5"><Icon className="w-5 h-5 text-primary mb-3" /><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl sm:text-2xl font-black">{value}</p></div>)}</div>
    {data && <p className="text-xs text-muted-foreground">Applied range {data.appliedRange.start} – {data.appliedRange.end} ({data.appliedRange.timezone}). Collections use capture/refund event dates; stock is a current snapshot.</p>}
    <div className="grid xl:grid-cols-2 gap-6"><section className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold mb-4">Net collections</h3><ResponsiveContainer width="100%" height={240}><AreaChart data={data?.daily ?? []}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(value) => `₹${Math.round(value / 10000)}k`} /><Tooltip formatter={(value) => money(Number(value))} /><Area dataKey="netCollectionsMinor" name="Net collections" stroke="#3b82f6" fill="#3b82f633" /></AreaChart></ResponsiveContainer></section><section className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold mb-4">Orders created</h3><ResponsiveContainer width="100%" height={240}><BarChart data={data?.daily ?? []}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="ordersCreated" name="Orders" fill="#8b5cf6" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></section></div>
    <section className="rounded-xl border border-border bg-card overflow-hidden"><div className="flex justify-between p-5 border-b border-border"><h3 className="font-bold">Recent orders</h3><Link to="/admin/orders" className="text-sm text-primary">View all</Link></div>{recent.isError ? <div role="alert" className="p-5">Recent orders unavailable. <button className="underline" onClick={() => recent.refetch()}>Retry</button></div> : <div className="divide-y divide-border">{recent.data?.data.map((order) => <Link to={`/admin/orders/${order.id}`} key={order.id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"><div><p className="font-mono font-semibold">#{order.orderNumber}</p><p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('en-IN')}</p></div><div className="text-right"><p className="font-semibold">₹{Number(order.total).toLocaleString('en-IN')}</p><p className="text-xs capitalize text-muted-foreground">{order.paymentStatus} · {order.status}</p></div></Link>)}</div>}</section>
  </div>;
}
