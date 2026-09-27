import { Navigate, Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { userAtom } from '../store/userAtom';

export const ProtectedRoute = () => {
  const user = useAtomValue(userAtom);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const AdminRoute = () => {
  const user = useAtomValue(userAtom);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export const GuestRoute = () => {
  const user = useAtomValue(userAtom);
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
};
