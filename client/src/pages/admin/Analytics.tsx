import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, CreditCard, RotateCcw, ShoppingBag, Users } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '../../api/axiosClient';

type AnalyticsResult = {
  appliedRange: { start: string; end: string; timezone: string; grouping: string };
  currency: string;
  collections: { grossCapturedMinor: number; processedRefundMinor: number; netCollectionsMinor: number; scope: string };
  daily: Array<{ date: string; grossCapturedMinor: number; processedRefundMinor: number; netCollectionsMinor: number; ordersCreated: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  categorySales: Array<{ category: string; source: string; units: number; merchandiseMinor: number }>;
  refundAllocation: { unresolvedProcessedRefunds: number; note: string };
  stock: { eligibleVariants: number; inStock: number; lowStock: number; outOfStock: number; availableUnits: number; scope: string };
  customers: { registered: number; active: number; blocked: number; newInRange: number; purchasingInRange: number; repeatPurchasersInRange: number; purchasingDefinition: string };
};

const presets = [
  ['today', 'Today'], ['last7', 'Last 7 days'], ['last30', 'Last 30 days'], ['month', 'This month'], ['custom', 'Custom'],
] as const;
const money = (minor: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const preset = params.get('preset') ?? 'last30';
  const start = params.get('start') ?? '';
  const end = params.get('end') ?? '';
  const queryParams = useMemo(() => ({ preset, timezone: 'Asia/Kolkata', currency: 'INR', ...(preset === 'custom' ? { start, end } : {}) }), [preset, start, end]);
  const query = useQuery({
    queryKey: ['admin-analytics', queryParams],
    queryFn: () => api.get<AnalyticsResult>('/admin/analytics', queryParams),
    enabled: preset !== 'custom' || Boolean(start && end),
  });
  const data = query.data?.data;
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params); next.set(key, value);
    if (key === 'preset' && value !== 'custom') { next.delete('start'); next.delete('end'); }
    setParams(next, { replace: true });
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div><h2 className="text-2xl sm:text-3xl font-black flex items-center gap-2"><BarChart3 className="text-primary" /> Analytics</h2><p className="text-sm text-muted-foreground">Refund-aware event-date reporting in Asia/Kolkata.</p></div>
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
        <label className="text-sm"><span className="block mb-1 text-muted-foreground">Range</span><select value={preset} onChange={(e) => set('preset', e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2">{presets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {preset === 'custom' && <><label className="text-sm"><span className="block mb-1 text-muted-foreground">Start</span><input type="date" value={start} onChange={(e) => set('start', e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2" /></label><label className="text-sm"><span className="block mb-1 text-muted-foreground">End</span><input type="date" value={end} onChange={(e) => set('end', e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2" /></label></>}
        {data && <p className="text-xs text-muted-foreground ml-auto">Applied: {data.appliedRange.start} – {data.appliedRange.end} · {data.appliedRange.timezone}</p>}
      </div>
      {query.isError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"><p>Analytics could not be loaded.</p><button onClick={() => query.refetch()} className="mt-2 underline">Retry</button></div>}
      {query.isPending && <div className="h-40 rounded-xl bg-card animate-pulse" />}
      {data && <>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            ['Gross collections', money(data.collections.grossCapturedMinor), CreditCard],
            ['Processed refunds', money(data.collections.processedRefundMinor), RotateCcw],
            ['Net collections', money(data.collections.netCollectionsMinor), ShoppingBag],
            ['Purchasing customers', data.customers.purchasingInRange.toLocaleString(), Users],
          ].map(([label, value, Icon]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-5"><Icon className="w-5 h-5 text-primary mb-3" /><p className="text-sm text-muted-foreground">{String(label)}</p><p className="text-2xl font-black">{String(value)}</p></div>)}
        </div>
        <div className="grid xl:grid-cols-2 gap-6">
          <section className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold mb-1">Collections cash flow</h3><p className="text-xs text-muted-foreground mb-4">Captured and processed-refund events by date.</p><ResponsiveContainer width="100%" height={280}><AreaChart data={data.daily}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(v) => `₹${Math.round(v / 10000)}k`} /><Tooltip formatter={(v) => money(Number(v))} /><Legend /><Area dataKey="grossCapturedMinor" name="Gross captured" stroke="#22c55e" fill="#22c55e33" /><Area dataKey="processedRefundMinor" name="Refunds" stroke="#ef4444" fill="#ef444433" /><Area dataKey="netCollectionsMinor" name="Net collections" stroke="#3b82f6" fill="#3b82f633" /></AreaChart></ResponsiveContainer></section>
          <section className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold mb-1">Daily orders</h3><p className="text-xs text-muted-foreground mb-4">Orders created in the selected calendar range.</p><ResponsiveContainer width="100%" height={280}><BarChart data={data.daily}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="ordersCreated" name="Orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></section>
          <section className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold mb-4">Sales by category</h3><ResponsiveContainer width="100%" height={280}><BarChart data={data.categorySales} layout="vertical"><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis type="number" tickFormatter={(v) => `₹${Math.round(v / 10000)}k`} /><YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 11 }} /><Tooltip formatter={(v, key) => key === 'merchandiseMinor' ? money(Number(v)) : Number(v)} /><Legend /><Bar dataKey="merchandiseMinor" name="Gross merchandise" fill="#06b6d4" /><Bar dataKey="units" name="Units" fill="#f59e0b" /></BarChart></ResponsiveContainer><p className="text-xs text-muted-foreground">{data.refundAllocation.note}</p></section>
          <section className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold mb-4">Current stock snapshot</h3><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={[{ name: 'In stock', value: data.stock.inStock }, { name: 'Low stock', value: data.stock.lowStock }, { name: 'Out of stock', value: data.stock.outOfStock }]} dataKey="value" nameKey="name" outerRadius={80} fill="#3b82f6" label /><Tooltip /><Legend /></PieChart></ResponsiveContainer><p className="text-xs text-muted-foreground">{data.stock.scope} Available units: {data.stock.availableUnits}.</p></section>
        </div>
      </>}
    </div>
  );
}
