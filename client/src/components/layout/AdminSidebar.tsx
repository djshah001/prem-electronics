import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Users, AlertTriangle, BarChart3, Zap, MessageSquare
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Package, label: 'Products', href: '/admin/products' },
  { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
  { icon: Tag, label: 'Coupons', href: '/admin/coupons' },
  { icon: Users, label: 'Customers', href: '/admin/customers' },
  { icon: AlertTriangle, label: 'Inventory', href: '/admin/inventory' },
  { icon: MessageSquare, label: 'Reviews', href: '/admin/reviews' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
];

export const AdminSidebar = () => (
  <aside className="w-64 flex-shrink-0 glass border-r border-white/5 min-h-screen">
    <div className="p-6 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm font-['Outfit']">Prem Electronics</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>
    </div>
    <nav className="p-4 space-y-1">
      {navItems.map(({ icon: Icon, label, href }) => (
        <NavLink
          key={href}
          to={href}
          end={href === '/admin'}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            )
          }
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  </aside>
);
