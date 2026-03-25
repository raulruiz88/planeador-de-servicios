import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <div className="app-container justify-center items-center">Cargando...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && userProfile) {
    if (!allowedRoles.includes(userProfile.rol)) {
      // Si está logueado pero su rol no está permitido, lo enviamos a su home
      return <Navigate to={userProfile.rol === 'admin' ? '/admin' : '/tecnico'} />;
    }
  }

  return children;
};
