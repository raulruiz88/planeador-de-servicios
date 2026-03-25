import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/firebaseServices';
import { LogOut, Calendar, Users, Wrench, ListTodo, Menu, X, UserPlus, History } from 'lucide-react';
import { useState } from 'react';

export const MainLayout = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = userProfile?.rol === 'admin';

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const navLinks = isAdmin ? [
    { to: '/admin', label: 'Dashboard', icon: <Calendar size={20} /> },
    { to: '/admin/orders', label: 'Órdenes', icon: <ListTodo size={20} /> },
    { to: '/admin/clients', label: 'Clientes', icon: <Users size={20} /> },
    { to: '/admin/toolkits', label: 'Herramientas', icon: <Wrench size={20} /> },
    { to: '/admin/employees', label: 'Empleados', icon: <UserPlus size={20} /> },
  ] : [
    { to: '/tecnico', label: 'Mis Tareas', icon: <ListTodo size={20} /> },
    { to: '/tecnico/historial', label: 'Historial', icon: <History size={20} /> },
  ];

  return (
    <div className="layout-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-color)' }}>
      {/* Sidebar Mobile Toggle Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className="sidebar"
        style={{
          width: '260px',
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          position: window.innerWidth <= 768 ? 'fixed' : 'relative',
          height: '100vh',
          zIndex: 50,
          transform: window.innerWidth <= 768 && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        <div className="sidebar-header" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 'bold' }}>Planeador</h2>
          {window.innerWidth <= 768 && (
            <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navLinks.map((link) => (
            <NavLink 
              key={link.to} 
              to={link.to}
              end={link.to === '/admin' || link.to === '/tecnico'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--text-muted)' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{userProfile?.nombre}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rol: {userProfile?.rol}</span>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleLogout}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' }}>
        {/* Mobile Header */}
        <header className="mobile-header d-md-none" style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', display: window.innerWidth > 768 ? 'none' : 'flex', alignItems: 'center', boxShadow: 'var(--shadow)' }}>
          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <span style={{ marginLeft: '1rem', fontWeight: 600 }}>Planeador PWA</span>
        </header>
        
        <div className="page-wrapper" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: var(--text-main);
          text-decoration: none;
          border-radius: var(--radius-sm);
          font-weight: 500;
          transition: var(--transition);
        }
        .nav-link:hover {
          background-color: var(--bg-color);
        }
        .nav-link.active {
          background-color: var(--primary);
          color: white;
        }
        @media (min-width: 769px) {
          .d-md-none { display: none !important; }
        }
      `}</style>
    </div>
  );
};
