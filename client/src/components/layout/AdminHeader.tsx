import { useSetAtom } from 'jotai';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCheck, CreditCard, Loader2, LogOut, MailWarning, Menu, MessageSquare, PackageX, ShoppingBag, Store, UserPlus } from 'lucide-react';
// import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { adminMobileNavOpenAtom } from '../../store/adminLayoutAtom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuGroup, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { relativeNotificationTime, useAdminNotifications, useAdminUnreadCount, useNotificationActions } from '../../hooks/useAdminNotifications';

const titles: Record<string, string> = {
  dashboard: 'Dashboard', analytics: 'Analytics', products: 'Products', categories: 'Categories',
  inventory: 'Inventory', orders: 'Orders', transactions: 'Transactions', coupons: 'Coupons',
  customers: 'Customers', reviews: 'Reviews', blogs: 'Blogs', banners: 'Banner Master',
  'invoice-master': 'Invoice Master', 'email-master': 'Email Master', campaigns: 'Campaigns', 'email-logs': 'Email Logs',
  notifications: 'Notifications',
};

const NotificationTypeIcon = ({ type }: { type: string }) => {
  const Icon = type === 'new_order' || type === 'order_cancelled' ? ShoppingBag
    : type.startsWith('payment_') || type === 'external_refund_confirmed' ? CreditCard
      : type === 'low_stock' ? AlertTriangle : type === 'out_of_stock' ? PackageX
        : type === 'customer_registered' ? UserPlus : type === 'review_pending' ? MessageSquare
          : type === 'email_delivery_failed' ? MailWarning : Bell;
  return <Icon className="h-4 w-4" aria-hidden="true" />;
};

export const AdminHeader = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const openMobile = useSetAtom(adminMobileNavOpenAtom);
  const segment = location.pathname.split('/')[2] || 'dashboard';
  const title = titles[segment] ?? 'Administration';
  const notifications = useAdminNotifications({ page: 1, limit: 5, readState: 'all' });
  const unread = useAdminUnreadCount();
  const notificationActions = useNotificationActions();
  const unreadCount = unread.data?.data.count ?? 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-6">
        <button type="button" onClick={() => openMobile(true)} aria-label="Open admin menu" aria-controls="admin-mobile-navigation"
          className="md:hidden rounded-lg border border-border p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"><Menu className="w-5 h-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Admin / {title}</p>
          <h1 className="truncate text-base font-bold sm:text-lg">{title}</h1>
        </div>
        <Link to="/" className="hidden sm:flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary">
          <Store className="w-4 h-4" /> View Storefront
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={`${unreadCount} unread admin notifications`} className="relative rounded-lg border border-border p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-5 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[min(92vw,24rem)] p-0" align="end">
            <div className="flex items-center justify-between border-b border-border p-3"><span className="text-sm font-semibold">Notifications</span><button type="button" disabled={notificationActions.markAllRead.isPending || unreadCount === 0} onClick={() => notificationActions.markAllRead.mutate()} className="inline-flex items-center gap-1 text-xs text-primary disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button></div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.isPending ? <p className="p-5 text-center text-sm text-muted-foreground">Loading…</p> : notifications.isError ? <div role="alert" className="p-5 text-center text-sm">Notifications unavailable. <button type="button" onClick={() => notifications.refetch()} className="text-primary underline">Retry</button></div> : notifications.data?.data.length ? notifications.data.data.map((notification) => <div key={notification.id} className={`border-b border-border p-3 last:border-0 ${notification.readAt ? '' : 'bg-primary/[0.05]'}`}>
                <div className="flex items-start gap-2"><span className={`mt-0.5 shrink-0 ${notification.severity === 'error' ? 'text-red-500' : notification.severity === 'warning' ? 'text-amber-500' : notification.severity === 'success' ? 'text-emerald-500' : 'text-blue-500'}`}><NotificationTypeIcon type={notification.type} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{notification.title}</p><p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p><div className="mt-2 flex items-center justify-between gap-2"><time dateTime={notification.createdAt} title={new Date(notification.createdAt).toLocaleString('en-IN')} className="text-[11px] text-muted-foreground">{relativeNotificationTime(notification.createdAt)}</time><span className="flex items-center gap-2">{!notification.readAt && <button type="button" onClick={() => notificationActions.markRead.mutate(notification.id)} className="text-xs text-muted-foreground hover:text-foreground">Mark read</button>}{notification.destination && <Link to={notification.destination} onClick={() => !notification.readAt && notificationActions.markRead.mutate(notification.id)} className="text-xs text-primary hover:underline">Open</Link>}</span></div></div></div>
              </div>) : <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>}
            </div>
            <DropdownMenuSeparator className="m-0" /><Link to="/admin/notifications" className="block p-3 text-center text-sm font-medium text-primary hover:bg-muted">View all notifications</Link>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* <ThemeToggle /> */}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Open administrator profile menu" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Avatar className="h-9 w-9 border border-border"><AvatarImage src={user?.avatarUrl || ''} alt="" /><AvatarFallback>{user?.name?.[0]?.toUpperCase() || 'A'}</AvatarFallback></Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end">
            <DropdownMenuGroup><DropdownMenuLabel><span className="block truncate">{user?.name}</span><span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span></DropdownMenuLabel></DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()} className="cursor-pointer text-red-500">
              {logout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              {logout.isPending ? 'Signing out…' : 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
