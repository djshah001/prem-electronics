import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Search, ShieldOff, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { CustomerAdmin, PaginationMeta } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';

const formatPrice = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);

export default function CustomerManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: () => api.get<CustomerAdmin[]>('/admin/customers', { page, limit: 20, ...(search && { search }) } as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

  const customers = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  const toggleBlockMutation = useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) =>
      api.patch(`/admin/customers/${userId}/block`, { block }),
    onSuccess: (_, { block }) => {
      toast.success(block ? 'Customer blocked.' : 'Customer unblocked.');
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Action failed'),
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> Customer Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} registered customers</p>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-center px-4 py-3 font-medium">Verified</th>
              <th className="text-center px-4 py-3 font-medium">Orders</th>
              <th className="text-center px-4 py-3 font-medium">Total Spent</th>
              <th className="text-center px-4 py-3 font-medium">Joined</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                </tr>
              ))
              : customers.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className={clsx('hover:bg-background/50 transition-colors', c.isBlocked && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.isVerified
                      ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                      : <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{Number(c.orderCount)}</td>
                  <td className="px-4 py-3 text-center font-semibold">{formatPrice(Number(c.totalSpent))}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                    {new Date(c.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('text-xs px-2 py-1 rounded-full font-medium',
                      c.isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400')}>
                      {c.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleBlockMutation.mutate({ userId: c.id, block: !c.isBlocked })}
                      disabled={toggleBlockMutation.isPending}
                      className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto transition-colors',
                        c.isBlocked
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20')}>
                      {c.isBlocked
                        ? <><ShieldCheck className="w-3 h-3" /> Unblock</>
                        : <><ShieldOff className="w-3 h-3" /> Block</>}
                    </button>
                  </td>
                </motion.tr>
              ))}
          </tbody>
        </table>
        {customers.length === 0 && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">No customers found.</div>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button disabled={!meta.hasPrevPage} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Previous</button>
          <span className="px-4 py-2 text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
          <button disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
