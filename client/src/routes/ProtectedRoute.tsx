import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { authReadyAtom, userAtom } from '../store/userAtom';

const Waiting = () => <div className="min-h-[50vh] grid place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

export const ProtectedRoute = () => {
  const user = useAtomValue(userAtom);
  const ready = useAtomValue(authReadyAtom);
  const location = useLocation();
  if (!ready) return <Waiting />;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Outlet />;
};

export const AdminRoute = () => {
  const user = useAtomValue(userAtom);
  const ready = useAtomValue(authReadyAtom);
  const location = useLocation();
  if (!ready) return <Waiting />;
  if (!user) return <Navigate to={`/admin/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
};

export const GuestRoute = () => {
  const user = useAtomValue(userAtom);
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
};
