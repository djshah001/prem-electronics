import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ShieldOff, ShieldCheck, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/axiosClient';
import type { CustomerAdmin, PaginationMeta } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, dataTableFeatures } from '../../components/ui/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { ModuleStatsCards } from '../../components/shared/ModuleStatsCards';

const formatPrice = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);

export default function CustomerManager() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, debouncedSearch],
    queryFn: () => api.get<CustomerAdmin[]>('/admin/customers', { page, limit: 20, ...(debouncedSearch && { search: debouncedSearch }) } as Record<string, unknown>),
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

  const columns: ColumnDef<typeof dataTableFeatures, CustomerAdmin, any>[] = [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'isVerified',
      header: () => <div className="text-center">Verified</div>,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-center">
            {c.isVerified
              ? <CheckCircle className="w-4 h-4 text-green-400" />
              : <XCircle className="w-4 h-4 text-muted-foreground/40" />}
          </div>
        );
      },
    },
    {
      accessorKey: 'orderCount',
      header: () => <div className="text-center">Orders</div>,
      cell: ({ row }) => <div className="text-center font-semibold">{Number(row.original.orderCount)}</div>,
    },
    {
      accessorKey: 'netPaidMinor',
      header: () => <div className="text-center">Net Paid</div>,
      cell: ({ row }) => <div className="text-center font-semibold">{formatPrice(Number(row.original.netPaidMinor) / 100)}</div>,
    },
    {
      accessorKey: 'createdAt',
      header: () => <div className="text-center">Joined</div>,
      cell: ({ row }) => <div className="text-center text-muted-foreground text-xs">{new Date(row.original.createdAt).toLocaleDateString('en-IN')}</div>,
    },
    {
      accessorKey: 'isBlocked',
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-center">
            <span className={clsx('text-xs px-2 py-1 rounded-full font-medium',
              c.isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400')}>
              {c.isBlocked ? 'Blocked' : 'Active'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Link aria-label={`View ${c.name}`} to={`/admin/customers/${c.id}`} className="rounded-lg border border-border p-2 hover:bg-muted"><Eye className="w-3.5 h-3.5" /></Link>
            <button
              onClick={() => toggleBlockMutation.mutate({ userId: c.id, block: !c.isBlocked })}
              disabled={toggleBlockMutation.isPending}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                c.isBlocked
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20')}>
              {c.isBlocked
                ? <><ShieldCheck className="w-3 h-3" /> Unblock</>
                : <><ShieldOff className="w-3 h-3" /> Block</>}
            </button>
          </div>
        );
      }
    },
  ];

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

      <div className="mb-6"><ModuleStatsCards module="customers" /></div>
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by name or email..."
        page={page}
        totalPages={meta?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
