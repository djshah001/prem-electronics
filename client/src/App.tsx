import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
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

// Pages — Customer
import Account from './pages/customer/Account';
import Orders from './pages/customer/Orders';

// Pages — Admin (eager)
import AdminDashboard from './pages/admin/AdminDashboard';

// Lazy pages
import { Suspense, lazy } from 'react';
const ProductDetails = lazy(() => import('./pages/storefront/ProductDetails'));
const Addresses = lazy(() => import('./pages/customer/Addresses'));
const Wishlist = lazy(() => import('./pages/customer/Wishlist'));
const BlogPage = lazy(() => import('./pages/blog/Blog'));
const BlogDetails = lazy(() => import('./pages/blog/BlogDetails'));

const ProductManager = lazy(() => import('./pages/admin/ProductManager'));
const OrderManager = lazy(() => import('./pages/admin/OrderManager'));
const CouponManager = lazy(() => import('./pages/admin/CouponManager'));
const CategoryManager = lazy(() => import('./pages/admin/CategoryManager'));
const LowStock = lazy(() => import('./pages/admin/LowStock'));
const CustomerManager = lazy(() => import('./pages/admin/CustomerManager'));
const ReviewModeration = lazy(() => import('./pages/admin/ReviewModeration'));

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

// ─── Router ───────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/shop', element: <Shop /> },
      { path: '/products/:slug', element: <ProductDetails /> },
      { path: '/blog', element: <BlogPage /> },
      { path: '/blog/:slug', element: <BlogDetails /> },

      // Auth routes
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
          { path: '/verify-otp', element: <VerifyOTP /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
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
          { path: '/account/orders/:id', element: <OrderSuccess /> },
          { path: '/account/addresses', element: <Addresses /> },
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
          { path: '/admin', element: <AdminDashboard /> },
          { path: '/admin/products', element: <ProductManager /> },
          { path: '/admin/orders', element: <OrderManager /> },
          { path: '/admin/coupons', element: <CouponManager /> },
          { path: '/admin/categories', element: <CategoryManager /> },
          { path: '/admin/inventory', element: <LowStock /> },
          { path: '/admin/customers', element: <CustomerManager /> },
          { path: '/admin/reviews', element: <ReviewModeration /> },
        ],
      },
    ],
  },
]);

function App() {
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
