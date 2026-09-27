import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, AlertTriangle } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { DashboardMetrics, AnalyticsData } from '../../types';

const formatPrice = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', confirmed: '#3b82f6', processing: '#8b5cf6',
  shipped: '#06b6d4', delivered: '#10b981', cancelled: '#ef4444', refunded: '#6b7280',
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<DashboardMetrics>('/admin/dashboard'),
    refetchInterval: 60000,
  });

  const { data: analyticsRes } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get<AnalyticsData>('/admin/analytics'),
    refetchInterval: 120000,
  });

  const metrics = data?.data;
  const analytics = analyticsRes?.data;

  const statCards = metrics ? [
    { title: 'Total Revenue', value: formatPrice(metrics.revenue.total), sub: `+${formatPrice(metrics.revenue.last30Days)} this month`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    { title: 'Total Orders', value: metrics.orders.total.toLocaleString(), sub: 'All time orders', icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Customers', value: metrics.users.total.toLocaleString(), sub: 'Registered users', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Low Stock Alerts', value: metrics.lowStockAlerts.length.toString(), sub: 'Products need restocking', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ] : [];

  if (isLoading) return (
    <div className="flex-1 p-8">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse h-32" />)}
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black font-['Outfit']">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back to Prem Electronics admin</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map(({ title, value, sub, icon: Icon, color, bg }, i) => (
          <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-card rounded-2xl border border-border p-6 card-glow">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-black font-['Outfit'] text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Area Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold font-['Outfit'] mb-4">Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analytics?.revenue ?? metrics?.revenue.byDay ?? []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }}
                formatter={(value: number) => [formatPrice(value), 'Revenue']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN')}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Order Status Pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold font-['Outfit'] mb-4">Order Status</h2>
          {analytics?.statusBreakdown && analytics.statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {analytics.statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }} />
                <Legend formatter={(value) => <span className="text-xs capitalize text-muted-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No order data yet</div>
          )}
        </motion.div>
      </div>

      {/* Orders Bar Chart */}
      {(analytics?.revenue?.length ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-bold font-['Outfit'] mb-4">Daily Orders (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics?.revenue ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }} />
              <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold font-['Outfit'] mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Recent Orders
          </h2>
          <div className="space-y-3">
            {metrics?.orders.recent.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-background rounded-xl">
                <div>
                  <p className="text-sm font-semibold font-mono">#{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatPrice(Number(order.total))}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                    style={{ background: `${STATUS_COLORS[order.status]}30`, color: STATUS_COLORS[order.status] }}>
                    {order.status}
                  </span>
                </div>
              </div>
            )) ?? <p className="text-muted-foreground text-sm text-center py-4">No orders yet</p>}
          </div>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold font-['Outfit'] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Low Stock Alerts
          </h2>
          <div className="space-y-3">
            {metrics?.lowStockAlerts.length === 0
              ? <p className="text-muted-foreground text-sm text-center py-4">✅ All products well stocked</p>
              : metrics?.lowStockAlerts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-background rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">Threshold: {p.threshold}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ml-3 ${p.stock === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {p.stock === 0 ? 'Out of Stock' : `${p.stock} left`}
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
