import { useState, useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCheck,
  ChevronRight,
  CreditCard,
  Layers,
  Loader2,
  LogOut,
  MailWarning,
  Menu,
  MessageSquare,
  PackageX,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  UserPlus,
  X,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { clsx } from "clsx";
// import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from "../../hooks/useAuth";
import { adminMobileNavOpenAtom } from "../../store/adminLayoutAtom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  relativeNotificationTime,
  useAdminNotifications,
  useAdminUnreadCount,
  useNotificationActions,
} from "../../hooks/useAdminNotifications";

const routeMeta: Record<string, { title: string; section: string }> = {
  dashboard: { title: "Dashboard", section: "Overview" },
  analytics: { title: "Analytics", section: "Overview" },
  notifications: { title: "Notifications", section: "Overview" },
  categories: { title: "Categories", section: "Commerce" },
  products: { title: "Products", section: "Commerce" },
  inventory: { title: "Inventory", section: "Commerce" },
  orders: { title: "Orders", section: "Sales & Billing" },
  transactions: { title: "Transactions", section: "Sales & Billing" },
  coupons: { title: "Coupons", section: "Sales & Billing" },
  customers: { title: "Customers", section: "Customer Hub" },
  reviews: { title: "Reviews", section: "Customer Hub" },
  banners: { title: "Banner Master", section: "Storefront CMS" },
  "navbar-master": { title: "Navbar Master", section: "Storefront CMS" },
  blogs: { title: "Blogs", section: "Storefront CMS" },
  "email-master": { title: "Email Master", section: "Communications" },
  campaigns: { title: "Campaigns", section: "Communications" },
  "email-logs": { title: "Email Logs", section: "Communications" },
  "invoice-master": { title: "Invoice Master", section: "Administration" },
};

const quickLinks = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Layers },
  { label: "Products", href: "/admin/products", icon: ShoppingBag },
  { label: "Orders", href: "/admin/orders", icon: CreditCard },
  { label: "Analytics", href: "/admin/analytics", icon: Sparkles },
  { label: "Navbar Master", href: "/admin/navbar-master", icon: Store },
];

const NotificationTypeIcon = ({ type }: { type: string }) => {
  const Icon =
    type === "new_order" || type === "order_cancelled"
      ? ShoppingBag
      : type.startsWith("payment_") || type === "external_refund_confirmed"
        ? CreditCard
        : type === "low_stock"
          ? AlertTriangle
          : type === "out_of_stock"
            ? PackageX
            : type === "customer_registered"
              ? UserPlus
              : type === "review_pending"
                ? MessageSquare
                : type === "email_delivery_failed"
                  ? MailWarning
                  : Bell;
  return <Icon className="h-4 w-4" aria-hidden="true" />;
};

const getSeverityBadgeClasses = (severity?: string) => {
  if (severity === "error") {
    return "bg-red-500/20 text-red-400 border-red-500/30";
  }
  if (severity === "warning") {
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  }
  if (severity === "success") {
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  }
  return "bg-[#D82D53]/20 text-[#ff6b8b] border-[#D82D53]/40";
};

export const AdminHeader = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const openMobile = useSetAtom(adminMobileNavOpenAtom);
  const reduceMotion = Boolean(useReducedMotion());

  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const cmdInputRef = useRef<HTMLInputElement>(null);

  const segment = location.pathname.split("/")[2] || "dashboard";
  const meta = routeMeta[segment] ?? {
    title: "Administration",
    section: "Workspace",
  };

  const notifications = useAdminNotifications({
    page: 1,
    limit: 5,
    readState: "all",
  });
  const unread = useAdminUnreadCount();
  const notificationActions = useNotificationActions();
  const unreadCount = unread.data?.data.count ?? 0;

  // Global Command Palette Shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      } else if (e.key === "Escape" && cmdOpen) {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cmdOpen]);

  useEffect(() => {
    if (cmdOpen) {
      setTimeout(() => cmdInputRef.current?.focus(), 50);
    } else {
      setCmdQuery("");
    }
  }, [cmdOpen]);

  const filteredQuickLinks = quickLinks.filter((item) =>
    item.label.toLowerCase().includes(cmdQuery.toLowerCase()),
  );

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[#D82D53]/30 bg-black/90 backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-200">
        {/* Dedicated ambient crimson glow behind header */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-16 left-1/3 w-96 h-28 rounded-full bg-[#D82D53]/15 blur-3xl" />
        </div>

        {/* Brand Accent Top Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D82D53] to-transparent" />

        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-6">
          {/* ── Left: Mobile Menu Button + Breadcrumb & Title ── */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              onClick={() => openMobile(true)}
              aria-label="Open admin menu"
              aria-controls="admin-mobile-navigation"
              className="md:hidden h-9.5 w-9.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-200 hover:text-[#ff6b8b] hover:border-[#D82D53]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D82D53]"
            >
              <Menu className="w-5 h-5" />
            </motion.button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <span>Admin</span>
                <ChevronRight className="w-3 h-3 shrink-0 opacity-70" />
                <span className="truncate">{meta.section}</span>
                <ChevronRight className="w-3 h-3 shrink-0 opacity-70" />
                <span className="truncate text-[#ff6b8b] font-semibold">
                  {meta.title}
                </span>
              </div>

              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h1
                    key={meta.title}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="truncate text-base sm:text-lg font-bold tracking-tight text-white"
                  >
                    {meta.title}
                  </motion.h1>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── Center / Right: Command Palette Trigger, Storefront, Notifications, Profile ── */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Command Search Trigger Button */}
            <motion.button
              type="button"
              onClick={() => setCmdOpen(true)}
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className="hidden md:flex items-center gap-3 h-9 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-[#D82D53]/15 hover:border-[#D82D53]/40 text-slate-400 hover:text-[#ff6b8b] transition-all text-xs font-medium"
            >
              <Search className="w-3.5 h-3.5 text-[#ff6b8b]" />
              <span>Search modules...</span>
            </motion.button>

            {/* View Storefront */}
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.02, y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className="hidden sm:block"
            >
              <Link
                to="/"
                className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-[#D82D53]/20 hover:border-[#D82D53]/40 px-3.5 py-2 text-xs font-semibold text-[#B4BCD0] hover:text-[#ff6b8b] shadow-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D82D53]"
              >
                <Store className="w-3.5 h-3.5 text-[#ff6b8b]" />
                <span>Storefront</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </motion.div>

            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`${unreadCount} unread admin notifications`}
                className="group relative h-9.5 w-9.5 rounded-xl border border-white/10 bg-white/5 hover:bg-[#D82D53]/20 hover:border-[#D82D53]/40 flex items-center justify-center text-[#B4BCD0] hover:text-[#ff6b8b] shadow-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D82D53]"
              >
                <Bell className="h-[18px] w-[18px] transition-transform duration-200 group-hover:rotate-6" />
                <AnimatePresence mode="popLayout">
                  {unreadCount > 0 && (
                    <motion.span
                      key={unreadCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 22,
                      }}
                      className="absolute -right-1.5 -top-1.5 min-w-[19px] h-[19px] rounded-full bg-gradient-to-r from-[#f43f68] to-[#D82D53] px-1 text-center text-[10px] font-bold leading-[15px] text-white shadow-xs border-2 border-black flex items-center justify-center"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[min(92vw,24rem)] p-0 rounded-2xl border border-[#f43f68]/30 bg-black/95 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl overflow-hidden text-white"
                align="end"
                sideOffset={8}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-[#D82D53]/15 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff6b8b]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#f43f68]/25 text-[#ff85a1]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      notificationActions.markAllRead.isPending ||
                      unreadCount === 0
                    }
                    onClick={() => notificationActions.markAllRead.mutate()}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#ff6b8b] hover:bg-[#D82D53]/20 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Mark all read</span>
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-white/10">
                  {notifications.isPending ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-[#ff6b8b]" />
                      <p className="text-xs font-medium">
                        Loading notifications…
                      </p>
                    </div>
                  ) : notifications.isError ? (
                    <div
                      role="alert"
                      className="p-6 text-center text-xs text-slate-400"
                    >
                      <p>Notifications unavailable right now.</p>
                      <button
                        type="button"
                        onClick={() => notifications.refetch()}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f43f68]/20 text-[#ff6b8b] font-semibold hover:opacity-90 transition-opacity"
                      >
                        Retry
                      </button>
                    </div>
                  ) : notifications.data?.data.length ? (
                    notifications.data.data.map((notification) => {
                      const isUnread = !notification.readAt;
                      return (
                        <div
                          key={notification.id}
                          className={clsx(
                            "relative p-3.5 transition-colors hover:bg-white/5",
                            isUnread && "bg-[#D82D53]/15",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={clsx(
                                "mt-0.5 h-8 w-8 rounded-xl border flex items-center justify-center shrink-0",
                                getSeverityBadgeClasses(notification.severity),
                              )}
                            >
                              <NotificationTypeIcon type={notification.type} />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-bold text-white leading-snug">
                                  {notification.title}
                                </p>
                                {isUnread && (
                                  <span
                                    aria-label="Unread"
                                    className="mt-1 h-2 w-2 rounded-full bg-[#ff6b8b] shrink-0"
                                  />
                                )}
                              </div>

                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                                {notification.message}
                              </p>

                              <div className="mt-2 flex items-center justify-between gap-2">
                                <time
                                  dateTime={notification.createdAt}
                                  title={new Date(
                                    notification.createdAt,
                                  ).toLocaleString("en-IN")}
                                  className="text-[11px] font-medium text-slate-400"
                                >
                                  {relativeNotificationTime(
                                    notification.createdAt,
                                  )}
                                </time>

                                <span className="flex items-center gap-2.5">
                                  {isUnread && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        notificationActions.markRead.mutate(
                                          notification.id,
                                        )
                                      }
                                      className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                                    >
                                      Mark read
                                    </button>
                                  )}
                                  {notification.destination && (
                                    <Link
                                      to={notification.destination}
                                      onClick={() =>
                                        isUnread &&
                                        notificationActions.markRead.mutate(
                                          notification.id,
                                        )
                                      }
                                      className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#ff6b8b] hover:underline"
                                    >
                                      <span>Open</span>
                                      <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 px-6 text-center">
                      <Bell className="w-7 h-7 mx-auto mb-2 text-slate-500" />
                      <p className="text-xs font-medium text-slate-400">
                        You&apos;re all caught up! No notifications yet.
                      </p>
                    </div>
                  )}
                </div>

                <DropdownMenuSeparator className="m-0 bg-white/10" />
                <Link
                  to="/admin/notifications"
                  className="block p-2.5 text-center text-xs font-bold text-[#ff6b8b] bg-white/5 hover:bg-[#D82D53]/25 transition-colors"
                >
                  View all notifications →
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Administrator Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Open administrator profile menu"
                className="group flex items-center gap-2 rounded-full sm:rounded-xl p-0.5 sm:pr-2.5 sm:pl-1 sm:py-1 border border-transparent sm:border-white/10 sm:bg-white/5 hover:border-[#D82D53]/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D82D53]"
              >
                <Avatar className="h-8 w-8 border-2 border-[#ff6b8b]/40 group-hover:border-[#ff6b8b] transition-colors">
                  <AvatarImage src={user?.avatarUrl || ""} alt="" />
                  <AvatarFallback className="bg-gradient-to-br from-[#f43f68] to-[#D82D53] text-white text-xs font-bold">
                    {user?.name?.[0]?.toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start text-left max-w-[120px]">
                  <span className="truncate text-xs font-bold text-white leading-tight">
                    {user?.name || "Admin"}
                  </span>
                  <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#ff6b8b] leading-tight">
                    {user?.role || "Administrator"}
                  </span>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-60 rounded-2xl border border-[#f43f68]/30 bg-black/95 backdrop-blur-2xl backdrop-saturate-150 p-1.5 shadow-2xl text-white"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="rounded-xl bg-[#D82D53]/20 border border-[#f43f68]/30 px-3 py-2.5 mb-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#ff6b8b] shrink-0" />
                      <span className="block truncate text-xs font-bold text-white">
                        {user?.name}
                      </span>
                    </div>
                    <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-400">
                      {user?.email}
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuItem className="sm:hidden rounded-lg cursor-pointer focus:bg-[#D82D53]/25 focus:text-[#ff6b8b]">
                  <Link
                    to="/"
                    className="flex w-full items-center gap-2 py-0.5 text-xs font-medium text-white"
                  >
                    <Store className="h-4 w-4 text-[#ff6b8b]" />
                    <span>View Storefront</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  disabled={logout.isPending}
                  onClick={() => logout.mutate()}
                  className="cursor-pointer rounded-lg text-xs font-semibold text-red-400 focus:bg-red-500/20 focus:text-red-300"
                >
                  {logout.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  {logout.isPending ? "Signing out…" : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Global Command Palette Modal (⌘K) ── */}
      <AnimatePresence>
        {cmdOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCmdOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative z-10 w-full max-w-lg rounded-2xl border border-[#f43f68]/40 bg-black/95 backdrop-blur-2xl shadow-2xl overflow-hidden text-white p-2"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                <Search className="w-4 h-4 text-[#ff6b8b]" />
                <input
                  ref={cmdInputRef}
                  type="text"
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Type a command or search admin modules..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCmdOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Quick Navigation
                </p>
                {filteredQuickLinks.length > 0 ? (
                  filteredQuickLinks.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          setCmdOpen(false);
                          navigate(item.href);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-[#D82D53]/25 transition-colors text-left group"
                      >
                        <ItemIcon className="w-4 h-4 text-[#ff6b8b]" />
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                          Jump →
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No matching modules found.
                  </div>
                )}
              </div>

              <div className="px-3 py-2 border-t border-white/10 bg-white/5 flex items-center justify-end text-[11px] text-slate-400">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">
                  ESC to close
                </kbd>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
