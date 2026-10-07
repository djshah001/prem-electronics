import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CreditCard, Eye } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { api } from '../../api/axiosClient';
import { DataTable, dataTableFeatures } from '../../components/ui/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useDebounce } from '../../hooks/useDebounce';
import type { PaginationMeta } from '../../types';
import { ModuleStatsCards } from '../../components/shared/ModuleStatsCards';

type Transaction = {
  id: string; orderId: string; orderNumber: string; customerId?: string; customerName?: string; customerEmail?: string;
  provider: string; providerOrderId: string; providerPaymentId?: string; amountMinor: number; grossCapturedMinor: number; processedRefundMinor: number;
  remainingRefundableMinor: number; currency: string; status: string; failureReason?: string; capturedAt?: string; createdAt: string;
};
type TransactionDetail = Transaction & { refunds: Array<{ id: string; providerRefundId?: string; amountMinor: number; status: string; processedAt?: string; createdAt: string }> };
const money = (minor: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(minor / 100);

export default function TransactionManager() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const query = useQuery({
    queryKey: ['admin-transactions', page, debouncedSearch, status],
    queryFn: () => api.get<Transaction[]>('/admin/transactions', { page, limit: 20, ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(status ? { status } : {}) }),
    placeholderData: (previous) => previous,
  });
  const detail = useQuery({
    queryKey: ['admin-transaction', selectedId],
    queryFn: () => api.get<TransactionDetail>(`/admin/transactions/${selectedId}`),
    enabled: Boolean(selectedId),
  });
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta as PaginationMeta | undefined;
  const columns: ColumnDef<typeof dataTableFeatures, Transaction, any>[] = [
    { accessorKey: 'providerPaymentId', header: 'Provider reference', cell: ({ row }) => <div><p className="font-mono text-xs">{row.original.providerPaymentId ?? 'Not captured'}</p><p className="text-xs text-muted-foreground">{row.original.providerOrderId}</p></div> },
    { accessorKey: 'orderNumber', header: 'Order', cell: ({ row }) => <Link className="text-primary hover:underline" to={`/admin/orders/${row.original.orderId}`}>#{row.original.orderNumber}</Link> },
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => row.original.customerId ? <Link className="hover:underline" to={`/admin/customers/${row.original.customerId}`}>{row.original.customerName ?? row.original.customerEmail}</Link> : 'Guest/removed' },
    { accessorKey: 'amountMinor', header: 'Payment amount', cell: ({ row }) => <span className="font-semibold">{money(row.original.amountMinor)}</span> },
    { accessorKey: 'processedRefundMinor', header: 'Processed refunds', cell: ({ row }) => money(Number(row.original.processedRefundMinor)) },
    { accessorKey: 'status', header: 'Payment status', cell: ({ row }) => <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{row.original.status}</span> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => <button aria-label={`View transaction ${row.original.providerOrderId}`} onClick={() => setSelectedId(row.original.id)} className="rounded-lg border border-border p-2 hover:bg-muted"><Eye className="w-4 h-4" /></button> },
  ];

  return <div className="p-4 sm:p-8 space-y-6">
    <div><h2 className="text-2xl sm:text-3xl font-black flex items-center gap-2"><CreditCard className="text-primary" /> Transactions</h2><p className="text-sm text-muted-foreground">Authoritative local capture and refund ledger. Fulfilment is shown separately on orders.</p></div>
    <ModuleStatsCards module="payments" />
    {query.isError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">Unable to load transactions. <button className="underline" onClick={() => query.refetch()}>Retry</button></div>}
    <DataTable columns={columns} data={rows} isLoading={query.isPending} search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Search payment, order or customer…" filters={[{ key: 'status', label: 'All payment statuses', value: status, onChange: (value) => { setStatus(value); setPage(1); }, options: ['created', 'captured', 'failed', 'refunded'].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })) }]} page={page} totalPages={meta?.totalPages} onPageChange={setPage} />
    <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Transaction details</DialogTitle><DialogDescription>Provider references are read-only.</DialogDescription></DialogHeader>{detail.isPending ? <div className="h-32 animate-pulse bg-muted rounded-xl" /> : detail.data?.data ? <div className="space-y-4 text-sm"><dl className="grid sm:grid-cols-2 gap-3">{[
      ['Order', detail.data.data.orderNumber], ['Provider', detail.data.data.provider], ['Payment ID', detail.data.data.providerPaymentId ?? 'Not captured'], ['Gross captured', money(detail.data.data.grossCapturedMinor)], ['Processed refunds', money(detail.data.data.processedRefundMinor)], ['Remaining refundable', money(detail.data.data.remainingRefundableMinor)],
    ].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium break-all">{value}</dd></div>)}</dl><div><h3 className="font-semibold mb-2">Refund history</h3>{detail.data.data.refunds.length ? detail.data.data.refunds.map((refund) => <div key={refund.id} className="flex justify-between border-t border-border py-3"><span>{refund.providerRefundId ?? 'Pending provider reference'} · {refund.status}</span><strong>{money(refund.amountMinor)}</strong></div>) : <p className="text-muted-foreground">No refund records.</p>}</div></div> : <p>Transaction could not be loaded.</p>}</DialogContent></Dialog>
  </div>;
}
