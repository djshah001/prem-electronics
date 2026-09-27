import { Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/axiosClient';
import type { Coupon } from '../../types';
import { clsx } from 'clsx';

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p));

export default function CouponManager() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get<Coupon[]>('/coupons'),
  });

  const coupons = data?.data ?? [];

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <h1 className="text-3xl font-black font-['Outfit'] mb-6 flex items-center gap-2">
        <Tag className="w-7 h-7 text-primary" /> Coupon Manager
      </h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {['Code', 'Type', 'Value', 'Min Purchase', 'Uses', 'Status', 'Expires'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{coupon.code}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{coupon.discountType}</td>
                  <td className="px-4 py-3 font-semibold">
                    {coupon.discountType === 'flat' ? formatPrice(coupon.discountValue) : `${coupon.discountValue}%`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatPrice(coupon.minPurchase)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', coupon.isActive ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No coupons found.</div>
          )}
        </div>
      )}
    </div>
  );
}
