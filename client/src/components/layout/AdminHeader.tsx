import { useSetAtom } from 'jotai';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, LogOut, Menu, Store } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { adminMobileNavOpenAtom } from '../../store/adminLayoutAtom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuGroup, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const titles: Record<string, string> = {
  dashboard: 'Dashboard', analytics: 'Analytics', products: 'Products', categories: 'Categories',
  inventory: 'Inventory', orders: 'Orders', transactions: 'Transactions', coupons: 'Coupons',
  customers: 'Customers', reviews: 'Reviews', blogs: 'Blogs', banners: 'Banner Master',
  'invoice-master': 'Invoice Master', 'email-master': 'Email Master', campaigns: 'Campaigns', 'email-logs': 'Email Logs',
};

export const AdminHeader = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const openMobile = useSetAtom(adminMobileNavOpenAtom);
  const segment = location.pathname.split('/')[2] || 'dashboard';
  const title = titles[segment] ?? 'Administration';

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
        <ThemeToggle />
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
