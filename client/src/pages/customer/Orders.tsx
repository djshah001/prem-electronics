import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api, axiosClient } from "../../api/axiosClient";
import type { Order, PaginationMeta } from "../../types";
import {
  Package,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  ShieldCheck,
  XCircle,
  RotateCcw,
  Copy,
  Check,
  Download,
  Search,
  Building2,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    icon: typeof Package;
  }
> = {
  pending: {
    label: "Order Placed",
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
    icon: Package,
  },
  shipped: {
    label: "In Transit",
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    icon: ShieldCheck,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-500/10",
    text: "text-rose-500",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
    icon: RotateCcw,
  },
};

const formatPrice = (p: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(p));

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

type FilterTab = "all" | "active" | "delivered" | "cancelled";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All Orders" },
  { id: "active", label: "In Progress" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled / Refunded" },
];

export default function Orders() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", page],
    queryFn: () =>
      api.get<Order[]>("/orders/my", { page, limit: 12 } as Record<
        string,
        unknown
      >),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch<Order>(`/orders/my/${id}/cancel`),
    onSuccess: async (response) => {
      toast.success(response.message ?? "Order cancelled successfully.");
      await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (error: { message?: string }) =>
      toast.error(error.message ?? "Could not cancel this order."),
  });

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Order number copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadPdf = async (order: Order, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDownloadingId(order.id);
      toast.loading("Generating invoice PDF...", { id: `pdf-${order.id}` });
      const response = await axiosClient.get(
        `/invoice-master/orders/${order.id}/pdf`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${order.invoiceNumber ?? order.orderNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded", { id: `pdf-${order.id}` });
    } catch (error: any) {
      toast.error(error?.message ?? "Invoice PDF is not available yet.", {
        id: `pdf-${order.id}`,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter orders by tab and search text
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === "active") {
        if (
          !["pending", "confirmed", "processing", "shipped"].includes(
            order.status,
          )
        )
          return false;
      } else if (activeTab === "delivered") {
        if (order.status !== "delivered") return false;
      } else if (activeTab === "cancelled") {
        if (!["cancelled", "refunded"].includes(order.status)) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesNumber = order.orderNumber.toLowerCase().includes(query);
        const matchesItems = order.items?.some(
          (item) =>
            item.productTitle?.toLowerCase().includes(query) ||
            item.skuSnapshot?.toLowerCase().includes(query),
        );
        return matchesNumber || matchesItems;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Count active orders for badge
  const activeCount = useMemo(() => {
    return orders.filter((o) =>
      ["pending", "confirmed", "processing", "shipped"].includes(o.status),
    ).length;
  }, [orders]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black font-['Outfit'] tracking-tight">
              My Orders
            </h1>
            {meta?.total !== undefined && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {meta.total} {meta.total === 1 ? "order" : "orders"}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track live delivery status, access GST tax invoices, and manage past
            purchases.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order # or product…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none border-b border-border">
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <span>{tab.label}</span>
              {tab.id === "active" && activeCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              )}
              {isActive && (
                <motion.div
                  layoutId="activeFilterTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border p-6 animate-pulse"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 bg-muted rounded w-40" />
                <div className="h-6 bg-muted rounded-full w-28" />
              </div>
              <div className="flex gap-4 mb-4">
                <div className="w-16 h-16 bg-muted rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
              <div className="h-10 bg-muted/50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 px-4 bg-card rounded-2xl border border-border"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold font-['Outfit'] mb-2">
            No orders placed yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Discover cutting-edge electronics, home appliances, and accessories
            with official warranty and GST invoicing.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold text-sm shadow-md shadow-primary/20 hover:opacity-95 transition-all"
          >
            <ShoppingBag className="w-4 h-4" /> Start Shopping
          </Link>
        </motion.div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card rounded-2xl border border-border">
          <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold font-['Outfit'] mb-1">
            No orders match your filter
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your search query or switching tabs.
          </p>
          <button
            onClick={() => {
              setActiveTab("all");
              setSearchQuery("");
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.06 },
            },
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              const statusCfg =
                STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              const isPaid = order.paymentStatus === "paid";
              const isCompanyOrder = order.purchaseType === "company";
              const canCancel = ["pending", "confirmed"].includes(order.status);
              const items = order.items ?? [];
              const totalItemsCount = items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );

              return (
                <motion.article
                  key={order.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.3 },
                    },
                    exit: { opacity: 0, scale: 0.98 },
                  }}
                  className="group bg-card rounded-2xl border border-border/80 hover:border-primary/40 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  {/* Top Bar: Order ID, Date, Status Badges */}
                  <div className="p-5 sm:p-6 pb-4 border-b border-border/50 bg-muted/20">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Link
                          to={`/account/orders/${order.id}`}
                          className="font-mono font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <span>#{order.orderNumber}</span>
                        </Link>
                        <button
                          onClick={(e) =>
                            handleCopy(order.orderNumber, order.id, e)
                          }
                          title="Copy Order ID"
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          {copiedId === order.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          ·
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {isCompanyOrder && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <Building2 className="w-3 h-3" /> B2B Invoice
                          </span>
                        )}

                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold border capitalize",
                            statusCfg.bg,
                            statusCfg.text,
                            statusCfg.border,
                          )}
                        >
                          <span
                            className={clsx(
                              "w-1.5 h-1.5 rounded-full",
                              statusCfg.dot,
                              {
                                "animate-ping": ["pending", "shipped"].includes(
                                  order.status,
                                ),
                              },
                            )}
                          />
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{statusCfg.label}</span>
                        </span>

                        <span
                          className={clsx(
                            "text-[11px] px-2.5 py-1 rounded-full font-medium uppercase tracking-wider",
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500",
                          )}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="sm:hidden mt-2 text-xs text-muted-foreground">
                      Placed on {formatDate(order.createdAt)}
                    </div>
                  </div>

                  {/* Middle Section: Items Preview */}
                  <Link
                    to={`/account/orders/${order.id}`}
                    className="block p-5 sm:p-6 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Thumbnails + Item Descriptions */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Thumbnails Strip */}
                        <div className="flex -space-x-3 overflow-hidden flex-shrink-0 py-1">
                          {items.slice(0, 3).map((item, idx) => {
                            const imgSrc =
                              (item as any).productImages?.[0] ||
                              item.imageSnapshot;
                            return (
                              <div
                                key={item.id ?? idx}
                                className="w-14 h-14 rounded-xl bg-card border-2 border-background shadow-xs overflow-hidden flex-shrink-0 flex items-center justify-center"
                              >
                                {imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt={item.productTitle ?? "Product"}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-muted-foreground/60" />
                                )}
                              </div>
                            );
                          })}
                          {items.length > 3 && (
                            <div className="w-14 h-14 rounded-xl bg-muted/80 border-2 border-background shadow-xs flex items-center justify-center text-xs font-bold text-foreground">
                              +{items.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Title and quantity description */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {items[0]?.productTitle ??
                              `Order with ${totalItemsCount} item${totalItemsCount > 1 ? "s" : ""}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {items.length === 1
                              ? `Quantity: ${items[0]?.quantity}`
                              : `${totalItemsCount} items total · ${items
                                  .slice(1, 3)
                                  .map((i) => i.productTitle)
                                  .filter(Boolean)
                                  .join(", ")}${items.length > 3 ? "..." : ""}`}
                          </p>
                          {order.shippingAddress?.city && (
                            <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-primary/70" />{" "}
                              Shipping to {order.shippingAddress.city},{" "}
                              {order.shippingAddress.state}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50 flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          Order Total
                        </p>
                        <p className="text-lg sm:text-xl font-black font-['Outfit'] text-foreground tracking-tight">
                          {formatPrice(order.total)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Incl. GST
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Bottom Footer Actions */}
                  <div className="px-5 sm:px-6 py-3.5 bg-muted/30 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {isPaid && (
                        <button
                          onClick={(e) => handleDownloadPdf(order, e)}
                          disabled={downloadingId === order.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {downloadingId === order.id
                              ? "Downloading…"
                              : "Tax Invoice (PDF)"}
                          </span>
                        </button>
                      )}

                      {canCancel && (
                        <button
                          disabled={cancelMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to cancel order #${order.orderNumber}?`,
                              )
                            ) {
                              cancelMutation.mutate(order.id);
                            }
                          }}
                          className="text-xs font-semibold text-destructive hover:underline disabled:opacity-50"
                        >
                          Cancel order
                        </button>
                      )}

                      {order.status === "cancelled" && isPaid && (
                        <span className="text-xs text-blue-500 font-medium">
                          Refund under processing · Contact support if needed
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/account/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors ml-auto group-hover:translate-x-0.5 duration-200"
                    >
                      <span>View Order Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <button
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
