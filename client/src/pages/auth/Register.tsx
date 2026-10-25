import { Navigate, useLocation } from 'react-router-dom';

export default function Register() {
  const location = useLocation();
  return <Navigate to={`/login${location.search}`} replace />;
}
