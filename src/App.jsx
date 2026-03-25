import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { useAuth } from './context/AuthContext';

// Placeholders for views - we will create these files next
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/WorkOrders';
import AdminClients from './pages/admin/Clients';
import AdminToolkits from './pages/admin/Toolkits';
import AdminEmployees from './pages/admin/Employees';
import TechTaskList from './pages/tech/TaskList';

const AppRoutes = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <div className="app-container justify-center items-center">Cargando aplicación...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!currentUser ? <Login /> : <Navigate to={userProfile?.rol === 'admin' ? '/admin' : '/tecnico'} />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="toolkits" element={<AdminToolkits />} />
          <Route path="employees" element={<AdminEmployees />} />
        </Route>

        {/* Technician Routes */}
        <Route path="/tecnico" element={<ProtectedRoute allowedRoles={['tecnico']}><MainLayout /></ProtectedRoute>}>
          <Route index element={<TechTaskList filter="activas" />} />
          <Route path="historial" element={<TechTaskList filter="terminadas" />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={currentUser ? (userProfile?.rol === 'admin' ? '/admin' : '/tecnico') : '/login'} />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
