import { useAtom, useSetAtom } from 'jotai';
import { NavLink } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  BarChart3, BookOpen, Boxes, ChevronLeft, ChevronRight, CreditCard,
  LayoutDashboard, MessageSquare, Package, ShoppingBag, Tag, Users, X, ReceiptText, Mail, Megaphone, ScrollText, Images, Bell,
} from 'lucide-react';
import { clsx } from 'clsx';
import { adminMobileNavOpenAtom, adminSidebarCollapsedAtom } from '../../store/adminLayoutAtom';

const groups = [
  {
    label: 'Overview', items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
      { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
      { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
    ]
  },
  {
    label: 'Catalog', items: [
      { icon: Package, label: 'Products', href: '/admin/products' },
      { icon: Tag, label: 'Categories', href: '/admin/categories' },
      { icon: Boxes, label: 'Inventory', href: '/admin/inventory' },
    ]
  },
  {
    label: 'Sales', items: [
      { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
      { icon: CreditCard, label: 'Transactions', href: '/admin/transactions' },
      { icon: Tag, label: 'Coupons', href: '/admin/coupons' },
    ]
  },
  {
    label: 'Customers', items: [
      { icon: Users, label: 'Customers', href: '/admin/customers' },
      { icon: MessageSquare, label: 'Reviews', href: '/admin/reviews' },
    ]
  },
  {
    label: 'Content', items: [
      { icon: BookOpen, label: 'Blogs', href: '/admin/blogs' },
      { icon: Images, label: 'Banner Master', href: '/admin/banners' },
    ]
  },
  {
    label: 'Communications', items: [
      { icon: Mail, label: 'Email Master', href: '/admin/email-master' },
      { icon: Megaphone, label: 'Campaigns', href: '/admin/campaigns' },
      { icon: ScrollText, label: 'Email Logs', href: '/admin/email-logs' },
    ]
  },
  {
    label: 'Settings / Documents', items: [
      { icon: ReceiptText, label: 'Invoice Master', href: '/admin/invoice-master' },
    ]
  },
];

const SidebarContent = ({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) => (
  <>
    <div className={clsx('h-16 border-b border-border flex items-center gap-3 px-4', collapsed && 'justify-center px-2')}>
      <span className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
        <img
          src="/Symbol.jpg"
          alt="Prem Electronics Logo"
          className="w-full h-full object-contain"
        />
      </span>
      {!collapsed && <div><p className="font-bold text-sm">Prem Electronics</p><p className="text-xs text-muted-foreground">Admin panel</p></div>}
    </div>
    <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto p-3 space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className={clsx('px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground', collapsed && 'sr-only')}>{group.label}</p>
          <div className="space-y-1">
            {group.items.map(({ icon: Icon, label, href }) => (
              <NavLink key={href} to={href} onClick={onNavigate} title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  collapsed && 'justify-center px-2',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}>
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{label}</span>}
                {collapsed && <span className="sr-only">{label}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  </>
);

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useAtom(adminSidebarCollapsedAtom);
  const [mobileOpen, setMobileOpen] = useAtom(adminMobileNavOpenAtom);
  const closeMobile = useSetAtom(adminMobileNavOpenAtom);

  return (
    <>
      <aside className={clsx('hidden md:flex sticky top-0 h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200', collapsed ? 'w-16' : 'w-64')}>
        <SidebarContent collapsed={collapsed} />
        <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'} aria-expanded={!collapsed}
          className="m-3 flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span className="ml-2 text-xs">Collapse</span></>}
        </button>
      </aside>

      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 md:hidden" />
          <DialogPrimitive.Content id="admin-mobile-navigation" aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.querySelector<HTMLButtonElement>('[aria-label="Open admin menu"]')?.focus();
            }}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,18rem)] flex-col border-r border-border bg-card shadow-2xl md:hidden">
            <DialogPrimitive.Title className="sr-only">Admin navigation</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close admin menu" className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary">
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
            <SidebarContent onNavigate={() => closeMobile(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
};
