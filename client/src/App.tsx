import { createBrowserRouter, RouterProvider, Outlet, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Navbar } from './components/layout/Navbar';
import { CartDrawer } from './components/layout/CartDrawer';
import { Footer } from './components/layout/Footer';
import { AdminSidebar } from './components/layout/AdminSidebar';
import { AdminHeader } from './components/layout/AdminHeader';
import { ProtectedRoute, AdminRoute } from './routes/ProtectedRoute';
import { PromoPopup } from './components/ui/PromoPopup';
import { ThemeProvider } from './components/ui/ThemeProvider';

// Pages — Storefront (eager)
import Home from './pages/storefront/Home';
import Shop from './pages/storefront/Shop';
import Checkout from './pages/storefront/Checkout';
import OrderSuccess from './pages/storefront/OrderSuccess';

// Pages — Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Pages — Customer
import Account from './pages/customer/Account';
import Orders from './pages/customer/Orders';

// Pages — Admin (eager)
import AdminDashboard from './pages/admin/AdminDashboard';

// Lazy pages
import { Suspense, lazy, useEffect } from 'react';
import { subscribeToLogout, clearLocalAuthState } from './auth/session';
const ProductDetails = lazy(() => import('./pages/storefront/ProductDetails'));
const Addresses = lazy(() => import('./pages/customer/Addresses'));
const Profile = lazy(() => import('./pages/customer/Profile'));
const Wishlist = lazy(() => import('./pages/customer/Wishlist'));
const OrderDetail = lazy(() => import('./pages/customer/OrderDetail'));
const Businesses = lazy(() => import('./pages/customer/Businesses'));

const BlogPage = lazy(() => import('./pages/blog/Blog'));
const BlogDetails = lazy(() => import('./pages/blog/BlogDetails'));

const ProductManager = lazy(() => import('./pages/admin/ProductManager'));
const OrderManager = lazy(() => import('./pages/admin/OrderManager'));
const CouponManager = lazy(() => import('./pages/admin/CouponManager'));
const CategoryManager = lazy(() => import('./pages/admin/CategoryManager'));
const LowStock = lazy(() => import('./pages/admin/LowStock'));
const CustomerManager = lazy(() => import('./pages/admin/CustomerManager'));
const ReviewModeration = lazy(() => import('./pages/admin/ReviewModeration'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const TransactionManager = lazy(() => import('./pages/admin/TransactionManager'));
const CustomerDetail = lazy(() => import('./pages/admin/CustomerDetail'));
const AdminOrderDetail = lazy(() => import('./pages/admin/AdminOrderDetail'));
const BlogManager = lazy(() => import('./pages/admin/BlogManager'));
const BlogEditor = lazy(() => import('./pages/admin/BlogEditor'));
const InvoiceMaster = lazy(() => import('./pages/admin/InvoiceMaster'));
const EmailMaster = lazy(() => import('./pages/admin/EmailMaster'));
const CampaignManager = lazy(() => import('./pages/admin/CampaignManager'));
const EmailLogs = lazy(() => import('./pages/admin/EmailLogs'));
const BannerManager = lazy(() => import('./pages/admin/BannerManager'));
const Unsubscribe = lazy(() => import('./pages/storefront/Unsubscribe'));
const MarketingPreferences = lazy(() => import('./pages/customer/MarketingPreferences'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─── Layouts ─────────────────────────────────────────────────────────────────
const StorefrontLayout = () => (
  <>
    <Navbar />
    <CartDrawer />
    <PromoPopup />
    <Suspense fallback={<Spinner />}>
      <Outlet />
    </Suspense>
    <Footer />
  </>
);

const AuthLayout = () => (
  <div className="min-h-screen bg-background">
    <Outlet />
  </div>
);

const AdminLayout = () => (
  <div className="min-h-screen bg-background flex">
    <AdminSidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <AdminHeader />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner /></div>}>
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <Outlet />
        </main>
      </Suspense>
    </div>
  </div>
);

const AdminNotFound = () => <div className="p-8 min-h-[60vh] grid place-items-center"><div className="text-center"><p className="text-6xl font-black text-primary">404</p><h2 className="text-2xl font-bold mt-3">Admin page not found</h2><p className="text-muted-foreground mt-2">This route is not part of the authorized admin console.</p><Link to="/admin/dashboard" className="inline-block mt-5 rounded-lg bg-primary px-4 py-2 text-primary-foreground">Back to dashboard</Link></div></div>;
const AccessDenied = () => <div className="min-h-screen grid place-items-center bg-background p-6"><div className="text-center"><p className="text-5xl font-black text-red-500">403</p><h1 className="text-2xl font-bold mt-3">Access denied</h1><p className="text-muted-foreground mt-2">Your account is signed in but does not have permission to open the admin console.</p><Link to="/" className="inline-block mt-5 rounded-lg bg-primary px-4 py-2 text-primary-foreground">Return to storefront</Link></div></div>;

const StorefrontErrorBoundary = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
      <span className="text-3xl">⚠️</span>
    </div>
    <h2 className="text-2xl font-bold font-['Outfit'] mb-2">Something went wrong</h2>
    <p className="text-muted-foreground text-sm max-w-md mb-6">
      We encountered an issue loading this view. You can return home or refresh the page.
    </p>
    <div className="flex items-center gap-3">
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Reload Page
      </button>
      <Link
        to="/"
        className="px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
      >
        Go to Homepage
      </Link>
    </div>
  </div>
);

// ─── Router ───────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    errorElement: <StorefrontErrorBoundary />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/shop', element: <Shop /> },
      { path: '/products/:slug', element: <ProductDetails /> },
      { path: '/blog', element: <BlogPage /> },
      { path: '/blog/:slug', element: <BlogDetails /> },
      { path: '/access-denied', element: <AccessDenied /> },
      { path: '/unsubscribe', element: <Unsubscribe /> },

      // Auth routes
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
          { path: '/verify-otp', element: <VerifyOTP /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
          { path: '/reset-password', element: <ResetPassword /> },
        ],
      },

      // Customer protected routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/checkout', element: <Checkout /> },
          { path: '/order-success/:id', element: <OrderSuccess /> },
          { path: '/account', element: <Account /> },
          { path: '/account/orders', element: <Orders /> },
          { path: '/account/orders/:id', element: <OrderDetail /> },
          { path: '/account/addresses', element: <Addresses /> },
          { path: '/account/profile', element: <Profile /> },
          { path: '/account/businesses', element: <Businesses /> },
          { path: '/account/marketing-preferences', element: <MarketingPreferences /> },
          { path: '/wishlist', element: <Wishlist /> },
        ],
      },
    ],
  },

  // Admin routes
  {
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
          { path: '/admin/dashboard', element: <AdminDashboard /> },
          { path: '/admin/analytics', element: <Analytics /> },
          { path: '/admin/products', element: <ProductManager /> },
          { path: '/admin/orders', element: <OrderManager /> },
          { path: '/admin/orders/:id', element: <AdminOrderDetail /> },
          { path: '/admin/transactions', element: <TransactionManager /> },
          { path: '/admin/coupons', element: <CouponManager /> },
          { path: '/admin/categories', element: <CategoryManager /> },
          { path: '/admin/inventory', element: <LowStock /> },
          { path: '/admin/customers', element: <CustomerManager /> },
          { path: '/admin/customers/:id', element: <CustomerDetail /> },
          { path: '/admin/reviews', element: <ReviewModeration /> },
          { path: '/admin/blogs', element: <BlogManager /> },
          { path: '/admin/blogs/new', element: <BlogEditor /> },
          { path: '/admin/blogs/:id/edit', element: <BlogEditor /> },
          { path: '/admin/invoice-master', element: <InvoiceMaster /> },
          { path: '/admin/email-master', element: <EmailMaster /> },
          { path: '/admin/campaigns', element: <CampaignManager /> },
          { path: '/admin/email-logs', element: <EmailLogs /> },
          { path: '/admin/banners', element: <BannerManager /> },
          { path: '/admin/*', element: <AdminNotFound /> },
        ],
      },
    ],
  },
]);

function App() {
  useEffect(() => subscribeToLogout(() => {
    clearLocalAuthState();
    void queryClient.cancelQueries();
    queryClient.clear();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.replace('/login?reason=signed-out');
    }
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
