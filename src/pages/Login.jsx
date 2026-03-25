import { useState } from 'react';
import { loginUser } from '../services/firebaseServices';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginUser(email, password);
      // ProtectedRoute handles the redirect automatically when auth state changes
    } catch (err) {
      setError('Credenciales incorrectas o error de conexión.');
      setLoading(false);
    }
  };

  return (
    <div className="app-container items-center justify-center">
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary)' }}>Planeador PWA</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Ingresa a tu cuenta</p>
        
        {error && <div style={{ color: 'var(--status-waiting)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ display: 'flex' }}>
          <div>
            <label className="label">Correo Electrónico</label>
            <input 
              type="email" 
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input 
              type="password" 
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            <LogIn size={18} /> {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
