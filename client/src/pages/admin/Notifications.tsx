import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { relativeNotificationTime, useAdminNotifications, useNotificationActions, type AdminNotificationSeverity } from '../../hooks/useAdminNotifications';

const severityStyles: Record<AdminNotificationSeverity, string> = {
  info: 'bg-blue-500', success: 'bg-emerald-500', warning: 'bg-amber-500', error: 'bg-red-500',
};

export default function Notifications() {
  const [page, setPage] = useState(1);
  const [readState, setReadState] = useState<'all' | 'read' | 'unread'>('all');
  const [severity, setSeverity] = useState<AdminNotificationSeverity | ''>('');
  const [type, setType] = useState('');
  const query = useAdminNotifications({ page, limit: 20, readState, severity, type: type || undefined });
  const actions = useNotificationActions();
  const meta = query.data?.meta;
  const notifications = query.data?.data ?? [];
  const updateFilters = (next: () => void) => { next(); setPage(1); };

  return <div className="p-4 sm:p-8 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl sm:text-3xl font-black">Notifications</h2><p className="text-sm text-muted-foreground">Operational events for your administrator account.</p></div>
      <button type="button" disabled={actions.markAllRead.isPending} onClick={() => actions.markAllRead.mutate()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"><CheckCheck className="h-4 w-4" /> Mark all read</button>
    </div>
    <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
      <label className="text-sm">Status <select value={readState} onChange={(e) => updateFilters(() => setReadState(e.target.value as typeof readState))} className="ml-2 rounded-lg border border-border bg-background px-3 py-2"><option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option></select></label>
      <label className="text-sm">Severity <select value={severity} onChange={(e) => updateFilters(() => setSeverity(e.target.value as AdminNotificationSeverity | ''))} className="ml-2 rounded-lg border border-border bg-background px-3 py-2"><option value="">All</option><option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Error</option></select></label>
      <label className="text-sm">Type <select value={type} onChange={(e) => updateFilters(() => setType(e.target.value))} className="ml-2 rounded-lg border border-border bg-background px-3 py-2"><option value="">All</option><option value="new_order">New order</option><option value="payment_confirmed">Payment confirmed</option><option value="payment_failed">Payment failed</option><option value="order_cancelled">Cancellation</option><option value="external_refund_confirmed">External refund</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="customer_registered">Customer</option><option value="review_pending">Review</option><option value="email_delivery_failed">Email failure</option></select></label>
      <button type="button" onClick={() => query.refetch()} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><RefreshCw className={clsx('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh</button>
    </div>
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      {query.isPending ? <div className="p-10 text-center text-muted-foreground">Loading notifications…</div>
        : query.isError ? <div role="alert" className="p-10 text-center">Notifications could not be loaded. <button onClick={() => query.refetch()} className="text-primary underline">Retry</button></div>
        : notifications.length === 0 ? <div className="grid place-items-center gap-2 p-12 text-center"><Bell className="h-8 w-8 text-muted-foreground" /><p className="font-semibold">No matching notifications</p><p className="text-sm text-muted-foreground">New operational events will appear here.</p></div>
        : <div className="divide-y divide-border">{notifications.map((notification) => <article key={notification.id} className={clsx('flex gap-3 p-4 sm:p-5', !notification.readAt && 'bg-primary/[0.04]')}>
          <span className={clsx('mt-2 h-2.5 w-2.5 shrink-0 rounded-full', severityStyles[notification.severity])} aria-label={notification.severity} />
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{notification.title}</h3><p className="mt-1 text-sm text-muted-foreground">{notification.message}</p></div><time title={new Date(notification.createdAt).toLocaleString('en-IN')} dateTime={notification.createdAt} className="whitespace-nowrap text-xs text-muted-foreground">{relativeNotificationTime(notification.createdAt)}</time></div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">{notification.destination && <Link to={notification.destination} onClick={() => !notification.readAt && actions.markRead.mutate(notification.id)} className="inline-flex items-center gap-1 text-primary hover:underline">Open related record <ExternalLink className="h-3 w-3" /></Link>}<button type="button" onClick={() => notification.readAt ? actions.markUnread.mutate(notification.id) : actions.markRead.mutate(notification.id)} className="text-muted-foreground hover:text-foreground">Mark {notification.readAt ? 'unread' : 'read'}</button></div>
          </div>
        </article>)}</div>}
    </section>
    {meta && meta.totalPages && meta.totalPages > 1 && <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Page {meta.page} of {meta.totalPages}</span><div className="flex gap-2"><button type="button" disabled={!meta.hasPrevPage} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={!meta.hasNextPage} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}
  </div>;
}
