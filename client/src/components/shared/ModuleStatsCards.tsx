import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/axiosClient';

type ModuleName = 'products' | 'categories' | 'inventory' | 'orders' | 'customers' | 'payments' | 'coupons' | 'reviews';
type StatsResponse = Record<string, Record<string, number> | Array<Record<string, number | string>> | string>;

const labels: Record<string, string> = {
  total: 'Total', active: 'Active', archived: 'Archived', eligible: 'Eligible variants', eligibleVariants: 'Eligible variants',
  inStock: 'In stock', lowStock: 'Low stock', outOfStock: 'Out of stock', availableUnits: 'Available units',
  registered: 'Registered', blocked: 'Blocked', pending: 'Pending', processing: 'Processing', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded', approved: 'Approved', expired: 'Expired',
};

export function ModuleStatsCards({ module }: { module: ModuleName }) {
  const query = useQuery({ queryKey: ['admin-module-stats'], queryFn: () => api.get<StatsResponse>('/admin/stats'), staleTime: 30_000 });
  let values = query.data?.data[module];
  if (module === 'payments' && Array.isArray(values)) {
    const currency = values.find((entry) => entry.currency === 'INR') ?? values[0];
    values = currency ? {
      grossCapturedMinor: Number(currency.grossCapturedMinor),
      processedRefundMinor: Number(currency.processedRefundMinor),
      netCollectionsMinor: Number(currency.netCollectionsMinor),
    } : {};
  }
  const entries = values && !Array.isArray(values) && typeof values === 'object' ? Object.entries(values).slice(0, 5) : [];
  if (query.isError) return <p role="alert" className="text-xs text-red-500">Module statistics unavailable.</p>;
  return <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
    {(query.isPending ? Array.from({ length: 3 }, (_, index) => [`loading-${index}`, '—'] as const) : entries).map(([key, value]) => {
      const isMoney = key.toLowerCase().includes('minor');
      const display = isMoney ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) / 100) : Number(value).toLocaleString('en-IN');
      return <div key={key} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{labels[key] ?? key.replace(/([A-Z])/g, ' $1')}</p><p className="text-xl font-black">{query.isPending ? '—' : display}</p><p className="text-[10px] text-muted-foreground">Global current scope</p></div>;
    })}
  </div>;
}
