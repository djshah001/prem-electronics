import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Users, BarChart3,
  Zap, MessageSquare, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItemDef {
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItemDef[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  {
    icon: Package,
    label: 'Catalogue',
    children: [
      { label: 'Products', href: '/admin/products' },
      { label: 'Categories', href: '/admin/categories' },
      { label: 'Low Stock', href: '/admin/inventory' },
    ],
  },
  { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
  { icon: Tag, label: 'Coupons', href: '/admin/coupons' },
  { icon: Users, label: 'Customers', href: '/admin/customers' },
  { icon: MessageSquare, label: 'Reviews', href: '/admin/reviews' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
];

interface SubMenuProps {
  item: NavItemDef;
  collapsed: boolean;
}

const SubMenu = ({ item, collapsed }: SubMenuProps) => {
  const [open, setOpen] = useState(true);
  const Icon = item.icon;

  if (collapsed) {
    return (
      <div className="relative group">
        <button className="w-full flex items-center justify-center p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-all">
          <Icon className="w-4 h-4 flex-shrink-0" />
        </button>
        {/* Tooltip sub-menu */}
        <div className="absolute left-full top-0 ml-2 bg-card border border-border rounded-xl shadow-2xl p-2 w-40 hidden group-hover:block z-50">
          <p className="text-xs font-semibold text-muted-foreground px-2 pb-1 uppercase tracking-wide">{item.label}</p>
          {item.children?.map((c) => (
            <NavLink
              key={c.href}
              to={c.href}
              className={({ isActive }) =>
                clsx('block px-3 py-2 rounded-lg text-sm transition-all',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-card"
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3 h-3" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden ml-3 pl-4 border-l border-border"
          >
            {item.children?.map((c) => (
              <NavLink
                key={c.href}
                to={c.href}
                className={({ isActive }) =>
                  clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all my-0.5',
                    isActive ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-card'
                  )
                }
              >
                {c.label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex-shrink-0 glass border-r border-white/5 min-h-screen flex flex-col sticky top-0 h-screen overflow-hidden"
    >
      {/* Header */}
      <div className={clsx('p-4 border-b border-border flex items-center gap-3', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm font-['Outfit'] truncate">Prem Electronics</p>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          id="sidebar-collapse-btn"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all border border-border"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Sidebar Top Spacing / Actions removed to AdminHeader */}

      {/* Nav Items */}
      <nav className={clsx('flex-1 overflow-y-auto', collapsed ? 'p-2 space-y-1' : 'p-4 space-y-1')}>
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            return <SubMenu key={item.label} item={item} collapsed={collapsed} />;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href!}
              end={item.href === '/admin'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  collapsed ? 'justify-center' : '',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card'
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer removed to AdminHeader */}
    </motion.aside>
  );
};
