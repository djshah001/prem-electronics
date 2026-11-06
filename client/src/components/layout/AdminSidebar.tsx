import { useState, useEffect, useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { NavLink, Link, useLocation } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingBag,
  Tag,
  Users,
  X,
  ReceiptText,
  Mail,
  Megaphone,
  ScrollText,
  Images,
  Bell,
  Navigation,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  FolderKanban,
  Wallet,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import {
  adminMobileNavOpenAtom,
  adminSidebarCollapsedAtom,
} from "../../store/adminLayoutAtom";
import { userAtom } from "../../store/userAtom";

interface NavSubItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: string;
}

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  href?: string;
  badge?: string;
  subItems?: NavSubItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/admin/dashboard",
      },
      {
        id: "analytics",
        icon: BarChart3,
        label: "Analytics",
        href: "/admin/analytics",
      },
      {
        id: "notifications",
        icon: Bell,
        label: "Notifications",
        href: "/admin/notifications",
      },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        id: "catalog",
        icon: Layers,
        label: "Catalog",
        subItems: [
          {
            icon: Tag,
            label: "Categories",
            href: "/admin/categories",
            badge: "Step 1",
          },
          {
            icon: Package,
            label: "Products",
            href: "/admin/products",
          },
          {
            icon: Boxes,
            label: "Inventory",
            href: "/admin/inventory",
          },
        ],
      },
      {
        id: "sales",
        icon: Wallet,
        label: "Sales & Billing",
        subItems: [
          {
            icon: ShoppingBag,
            label: "Orders",
            href: "/admin/orders",
          },
          {
            icon: CreditCard,
            label: "Transactions",
            href: "/admin/transactions",
          },
          {
            icon: Tag,
            label: "Coupons",
            href: "/admin/coupons",
          },
        ],
      },
      {
        id: "customers",
        icon: Users,
        label: "Customer Hub",
        subItems: [
          {
            icon: Users,
            label: "Customers",
            href: "/admin/customers",
          },
          {
            icon: MessageSquare,
            label: "Reviews",
            href: "/admin/reviews",
          },
        ],
      },
    ],
  },
  {
    label: "Experience & Marketing",
    items: [
      {
        id: "cms",
        icon: FolderKanban,
        label: "Storefront CMS",
        subItems: [
          {
            icon: Images,
            label: "Banner Master",
            href: "/admin/banners",
          },
          {
            icon: Navigation,
            label: "Navbar Master",
            href: "/admin/navbar-master",
          },
          {
            icon: BookOpen,
            label: "Blogs",
            href: "/admin/blogs",
          },
        ],
      },
      {
        id: "communications",
        icon: Mail,
        label: "Communications",
        subItems: [
          {
            icon: Mail,
            label: "Email Master",
            href: "/admin/email-master",
          },
          {
            icon: Megaphone,
            label: "Campaigns",
            href: "/admin/campaigns",
          },
          {
            icon: ScrollText,
            label: "Email Logs",
            href: "/admin/email-logs",
          },
        ],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        id: "settings-docs",
        icon: Settings2,
        label: "Documents & Setup",
        subItems: [
          {
            icon: ReceiptText,
            label: "Invoice Master",
            href: "/admin/invoice-master",
          },
        ],
      },
    ],
  },
];

const submenuVariants: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.2, delay: 0.04 },
    },
  },
};

const flyoutVariants: Variants = {
  hidden: { opacity: 0, x: -8, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 26 },
  },
  exit: {
    opacity: 0,
    x: -6,
    scale: 0.96,
    transition: { duration: 0.12 },
  },
};

const SidebarContent = ({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) => {
  const location = useLocation();
  const user = useAtomValue(userAtom);
  const reduceMotion = Boolean(useReducedMotion());

  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const activeParentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of navGroups) {
      for (const item of group.items) {
        if (
          item.subItems?.some(
            (sub) =>
              location.pathname === sub.href ||
              location.pathname.startsWith(`${sub.href}/`),
          )
        ) {
          ids.add(item.id);
        }
      }
    }
    return ids;
  }, [location.pathname]);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { catalog: true };
    activeParentIds.forEach((id) => {
      initial[id] = true;
    });
    return initial;
  });

  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev };
      activeParentIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [activeParentIds]);

  const toggleSubmenu = (id: string) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return navGroups;

    return navGroups
      .map((group) => {
        const matchedItems = group.items
          .map((item) => {
            const parentMatches = item.label.toLowerCase().includes(q);
            if (item.subItems) {
              const matchingSubs = item.subItems.filter((sub) =>
                sub.label.toLowerCase().includes(q),
              );
              if (parentMatches) return item;
              if (matchingSubs.length > 0) {
                return { ...item, subItems: matchingSubs };
              }
              return null;
            }
            return parentMatches ? item : null;
          })
          .filter(Boolean) as NavItem[];

        return matchedItems.length > 0
          ? { ...group, items: matchedItems }
          : null;
      })
      .filter(Boolean) as NavGroup[];
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full select-none">
      {/* ── Top Brand Header ── */}
      <div
        className={clsx(
          "relative h-16 border-b border-slate-200/70 dark:border-[#232838] flex items-center gap-3 px-4 shrink-0",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#fb7185] via-[#D82D53] to-[#f43f68]" />

        <Link
          to="/admin/dashboard"
          onClick={onNavigate}
          className="group flex items-center gap-3 focus-visible:outline-none"
        >
          <motion.span
            whileHover={reduceMotion ? undefined : { scale: 1.05, rotate: 2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-gradient-to-br from-[#D82D53]/20 via-[#D82D53]/5 to-transparent dark:from-[#f43f68]/30 dark:via-[#D82D53]/10 dark:to-[#121521] border border-[#D82D53]/25 dark:border-[#f43f68]/40 p-0.5 shadow-xs"
          >
            <img
              src="/Symbol.jpg"
              alt="Prem Electronics Logo"
              className="w-full h-full object-contain rounded-lg"
            />
          </motion.span>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.16 }}
                className="min-w-0"
              >
                <p className="font-bold text-sm text-slate-900 dark:text-[#F2F4F8] truncate tracking-tight">
                  Prem Electronics
                </p>
                <p className="text-[11px] font-medium text-[#D82D53] dark:text-[#ff6b8b] flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Admin Workspace</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* ── Quick Filter Search Bar ── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="px-3 pt-3 pb-1 shrink-0 overflow-hidden"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 dark:text-[#7E869A] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter menu..."
                className="w-full h-8.5 pl-8.5 pr-7 rounded-lg text-xs bg-slate-100/80 dark:bg-[#1A1E2E]/90 border border-slate-200/80 dark:border-[#282E42] text-slate-900 dark:text-[#F2F4F8] placeholder:text-slate-400 dark:placeholder:text-[#7E869A] focus:outline-none focus:border-[#D82D53] dark:focus:border-[#f43f68] focus:bg-white dark:focus:bg-[#1E2336] focus:ring-2 focus:ring-[#D82D53]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear filter"
                  className="absolute right-2 text-slate-400 hover:text-[#D82D53] dark:hover:text-[#ff6b8b] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scrollable Navigation Tree ── */}
      <nav
        aria-label="Admin navigation"
        className={clsx(
          "flex-1 py-3 px-2.5 space-y-5",
          collapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden",
        )}
      >
        {filteredGroups.length === 0 ? (
          <div className="py-8 px-3 text-center">
            <p className="text-xs text-slate-400 dark:text-[#7E869A]">
              No modules matching &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed ? (
                <div className="px-3 mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#687086]">
                    {group.label}
                  </p>
                </div>
              ) : (
                <div className="mx-auto my-2 w-6 h-[1px] bg-slate-200/80 dark:bg-[#232838]" />
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const hasSubmenu = Boolean(item.subItems?.length);
                  const isParentActive = activeParentIds.has(item.id);
                  const isOpen = isSearching || Boolean(openMenus[item.id]);
                  const isHovered = hoveredItemId === item.id;

                  // ── Direct Link Item ──
                  if (!hasSubmenu && item.href) {
                    return (
                      <div
                        key={item.id}
                        className="relative"
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                      >
                        <NavLink
                          to={item.href}
                          onClick={onNavigate}
                          aria-label={collapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            clsx(
                              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D82D53]",
                              collapsed && "justify-center px-2",
                              isActive
                                ? "text-[#D82D53] dark:text-[#ff6b8b]"
                                : "text-slate-600 dark:text-[#9BA3B5] hover:text-slate-900 dark:hover:text-[#F2F4F8] hover:bg-slate-100/70 dark:hover:bg-[#1B2030]",
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.span
                                  layoutId="admin-sidebar-active-bg"
                                  transition={{
                                    type: "spring",
                                    stiffness: 380,
                                    damping: 30,
                                  }}
                                  className="absolute inset-0 rounded-xl bg-[#D82D53]/10 dark:bg-gradient-to-r dark:from-[#D82D53]/25 dark:to-[#f43f68]/5 border border-[#D82D53]/25 dark:border-[#f43f68]/35 -z-10"
                                />
                              )}
                              <Icon
                                className={clsx(
                                  "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                                  isActive
                                    ? "text-[#D82D53] dark:text-[#ff6b8b]"
                                    : "text-slate-500 dark:text-[#7E869A] group-hover:text-[#D82D53] dark:group-hover:text-[#ff6b8b]",
                                )}
                                aria-hidden="true"
                              />
                              {!collapsed && (
                                <span className="truncate flex-1">
                                  {item.label}
                                </span>
                              )}
                              {collapsed && (
                                <span className="sr-only">{item.label}</span>
                              )}
                            </>
                          )}
                        </NavLink>

                        <AnimatePresence>
                          {collapsed && isHovered && (
                            <motion.div
                              variants={flyoutVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              className="fixed left-16 ml-2.5 z-50 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-[#161A29]/95 backdrop-blur-xl border border-[#D82D53]/25 dark:border-[#f43f68]/35 shadow-xl pointer-events-none whitespace-nowrap"
                              style={{ marginTop: "-36px" }}
                            >
                              <span className="text-xs font-semibold text-slate-900 dark:text-[#F2F4F8]">
                                {item.label}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // ── Expandable Parent Item ──
                  return (
                    <div
                      key={item.id}
                      className="relative"
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!collapsed) toggleSubmenu(item.id);
                        }}
                        aria-expanded={!collapsed ? isOpen : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={clsx(
                          "group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D82D53]",
                          collapsed && "justify-center px-2",
                          isParentActive
                            ? "text-[#D82D53] dark:text-[#ff6b8b] bg-[#D82D53]/8 dark:bg-[#D82D53]/15 border border-transparent dark:border-[#f43f68]/20"
                            : "text-slate-700 dark:text-[#B4BCD0] hover:text-slate-900 dark:hover:text-[#F2F4F8] hover:bg-slate-100/70 dark:hover:bg-[#1B2030]",
                        )}
                      >
                        <Icon
                          className={clsx(
                            "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                            isParentActive
                              ? "text-[#D82D53] dark:text-[#ff6b8b]"
                              : "text-slate-500 dark:text-[#7E869A] group-hover:text-[#D82D53] dark:group-hover:text-[#ff6b8b]",
                          )}
                          aria-hidden="true"
                        />

                        {!collapsed && (
                          <>
                            <span className="truncate flex-1 text-left">
                              {item.label}
                            </span>
                            {isParentActive && !isOpen && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D82D53] dark:bg-[#ff6b8b]" />
                            )}
                            <motion.span
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-slate-400 dark:text-[#7E869A] group-hover:text-slate-600 dark:group-hover:text-[#F2F4F8]"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </motion.span>
                          </>
                        )}

                        {collapsed && isParentActive && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#D82D53] dark:bg-[#ff6b8b]" />
                        )}
                      </button>

                      {/* Expanded Submenu Tree */}
                      <AnimatePresence initial={false}>
                        {!collapsed && isOpen && item.subItems && (
                          <motion.div
                            variants={submenuVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="overflow-hidden"
                          >
                            <div className="relative mt-1 ml-4.5 pl-3 border-l border-slate-200/80 dark:border-[#262C3F] space-y-1 py-0.5">
                              {item.subItems.map((sub) => {
                                const SubIcon = sub.icon;
                                return (
                                  <NavLink
                                    key={sub.href}
                                    to={sub.href}
                                    onClick={onNavigate}
                                    className={({ isActive }) =>
                                      clsx(
                                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D82D53]",
                                        isActive
                                          ? "text-[#D82D53] dark:text-[#ff6b8b] font-semibold"
                                          : "text-slate-500 dark:text-[#9BA3B5] hover:text-slate-900 dark:hover:text-[#F2F4F8] hover:bg-slate-100/60 dark:hover:bg-[#1B2030]",
                                      )
                                    }
                                  >
                                    {({ isActive }) => (
                                      <>
                                        {isActive && (
                                          <>
                                            <motion.span
                                              layoutId="admin-sidebar-active-bg"
                                              transition={{
                                                type: "spring",
                                                stiffness: 380,
                                                damping: 30,
                                              }}
                                              className="absolute inset-0 rounded-lg bg-[#D82D53]/10 dark:bg-gradient-to-r dark:from-[#D82D53]/25 dark:to-[#f43f68]/5 border border-[#D82D53]/20 dark:border-[#f43f68]/35 -z-10"
                                            />
                                            <motion.span
                                              layoutId="admin-submenu-tree-indicator"
                                              className="absolute -left-[13px] top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#D82D53] dark:bg-[#ff6b8b]"
                                            />
                                          </>
                                        )}
                                        <SubIcon
                                          className={clsx(
                                            "w-3.5 h-3.5 shrink-0 transition-colors",
                                            isActive
                                              ? "text-[#D82D53] dark:text-[#ff6b8b]"
                                              : "text-slate-400 dark:text-[#7E869A] group-hover:text-[#D82D53] dark:group-hover:text-[#ff6b8b]",
                                          )}
                                        />
                                        <span className="truncate flex-1">
                                          {sub.label}
                                        </span>
                                        {sub.badge && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[#D82D53]/10 dark:bg-[#f43f68]/20 text-[#D82D53] dark:text-[#ff85a1] border border-[#D82D53]/20 dark:border-[#f43f68]/35">
                                            {sub.badge}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </NavLink>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Collapsed Floating Flyout */}
                      <AnimatePresence>
                        {collapsed && isHovered && item.subItems && (
                          <motion.div
                            variants={flyoutVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed left-16 pl-2 z-50"
                            style={{ marginTop: "-40px" }}
                          >
                            <div className="w-52 rounded-xl bg-white/95 dark:bg-[#151928]/95 backdrop-blur-2xl backdrop-saturate-150 border border-[#D82D53]/25 dark:border-[#f43f68]/35 p-2 shadow-2xl">
                              <div className="px-2.5 py-1.5 mb-1 border-b border-slate-200/60 dark:border-[#262C3F] flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5 text-[#D82D53] dark:text-[#ff6b8b]" />
                                <span className="text-xs font-bold text-slate-900 dark:text-[#F2F4F8]">
                                  {item.label}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                {item.subItems.map((sub) => {
                                  const SubIcon = sub.icon;
                                  return (
                                    <NavLink
                                      key={sub.href}
                                      to={sub.href}
                                      onClick={() => {
                                        setHoveredItemId(null);
                                        onNavigate?.();
                                      }}
                                      className={({ isActive }) =>
                                        clsx(
                                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                                          isActive
                                            ? "bg-[#D82D53]/12 dark:bg-[#D82D53]/25 text-[#D82D53] dark:text-[#ff6b8b] font-semibold"
                                            : "text-slate-600 dark:text-[#B4BCD0] hover:bg-[#D82D53]/8 dark:hover:bg-[#1E2438] hover:text-[#D82D53] dark:hover:text-[#ff6b8b]",
                                        )
                                      }
                                    >
                                      <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate flex-1">
                                        {sub.label}
                                      </span>
                                      {sub.badge && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#D82D53]/10 dark:bg-[#f43f68]/20 text-[#D82D53] dark:text-[#ff85a1]">
                                          {sub.badge}
                                        </span>
                                      )}
                                    </NavLink>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* ── Bottom Utility Footer ── */}
      <div className="p-2.5 border-t border-slate-200/70 dark:border-[#232838] space-y-2 shrink-0">
        <Link
          to="/"
          title={collapsed ? "View Live Storefront" : undefined}
          className={clsx(
            "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 dark:text-[#B4BCD0] hover:text-[#D82D53] dark:hover:text-[#ff6b8b] bg-slate-100/70 dark:bg-[#181C2B] hover:bg-[#D82D53]/10 dark:hover:bg-[#D82D53]/20 border border-slate-200/70 dark:border-[#282E42] hover:border-[#D82D53]/30 dark:hover:border-[#f43f68]/40 transition-all",
            collapsed && "justify-center px-2",
          )}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#D82D53] dark:text-[#ff6b8b]" />
          {!collapsed && (
            <span className="truncate flex-1">Live Storefront</span>
          )}
        </Link>

        {user && (
          <div
            className={clsx(
              "flex items-center gap-2.5 rounded-xl p-2 bg-gradient-to-r from-[#D82D53]/8 via-transparent to-transparent dark:from-[#D82D53]/20 dark:via-[#161A28] dark:to-[#121521] border border-[#D82D53]/15 dark:border-[#f43f68]/30",
              collapsed && "justify-center p-1.5",
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f43f68] to-[#D82D53] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
              {user.name?.charAt(0).toUpperCase() || "A"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#F2F4F8] truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] font-medium text-[#D82D53] dark:text-[#ff6b8b] uppercase tracking-wider truncate">
                  {user.role || "Admin"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useAtom(adminSidebarCollapsedAtom);
  const [mobileOpen, setMobileOpen] = useAtom(adminMobileNavOpenAtom);
  const closeMobile = useSetAtom(adminMobileNavOpenAtom);
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCollapsed]);

  return (
    <>
      {/* ── Desktop Sticky Obsidian-Glass Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 264 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 340, damping: 32 }
        }
        className="hidden md:flex sticky top-0 h-screen shrink-0 flex-col border-r border-slate-200/80 dark:border-[#232838] z-30 relative"
      >
        {/* Layered Glass + Subtle Dark Crimson Ambient Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-white/80 dark:bg-black/90 backdrop-blur-2xl backdrop-saturate-150 overflow-hidden"
        >
          <div className="hidden dark:block absolute -top-24 -left-24 w-64 h-64 rounded-full bg-[#D82D53]/12 blur-3xl" />
          <div className="hidden dark:block absolute bottom-0 right-0 w-48 h-48 rounded-full bg-[#f43f68]/8 blur-3xl" />
        </div>

        <div className="flex-1 min-h-0">
          <SidebarContent collapsed={collapsed} />
        </div>

        <div className="px-2.5 pb-3 pt-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={
              collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"
            }
            aria-expanded={!collapsed}
            title="Toggle Sidebar (⌘B)"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 dark:border-[#282E42] bg-white/60 dark:bg-[#181C2B] hover:bg-[#D82D53]/10 dark:hover:bg-[#D82D53]/20 hover:border-[#D82D53]/30 dark:hover:border-[#f43f68]/40 p-2 text-slate-600 dark:text-[#B4BCD0] hover:text-[#D82D53] dark:hover:text-[#ff6b8b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D82D53]"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs font-semibold flex-1 text-left">
                  Collapse
                </span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-[#7E869A] bg-slate-100 dark:bg-[#111420] border border-slate-200/80 dark:border-[#262C3F] rounded">
                  ⌘B
                </kbd>
              </>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ── Mobile Obsidian-Glass Drawer ── */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <AnimatePresence>
          {mobileOpen && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs md:hidden"
                />
              </DialogPrimitive.Overlay>

              <DialogPrimitive.Content
                asChild
                id="admin-mobile-navigation"
                aria-describedby={undefined}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  document
                    .querySelector<HTMLButtonElement>(
                      '[aria-label="Open admin menu"]',
                    )
                    ?.focus();
                }}
              >
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 340, damping: 32 }}
                  className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,18.5rem)] flex-col border-r border-[#D82D53]/20 dark:border-[#f43f68]/30 bg-white/95 dark:bg-[#10131E]/95 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl md:hidden"
                >
                  <DialogPrimitive.Title className="sr-only">
                    Admin navigation
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close
                    aria-label="Close admin menu"
                    className="absolute right-3 top-3.5 z-10 rounded-lg p-1.5 text-slate-500 dark:text-[#9BA3B5] hover:text-[#D82D53] dark:hover:text-[#ff6b8b] hover:bg-[#D82D53]/10 dark:hover:bg-[#D82D53]/20 focus-visible:ring-2 focus-visible:ring-[#D82D53] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </DialogPrimitive.Close>

                  <SidebarContent onNavigate={() => closeMobile(false)} />
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </>
  );
};
