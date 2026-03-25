import { useState, useEffect } from 'react';
import { getTechnicians, createTechnicianAccount, updateTechnician, deleteTechnician } from '../../services/firebaseServices';
import { Edit2, Trash2 } from 'lucide-react';

const AdminEmployees = () => {
  const [techs, setTechs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingTechId, setEditingTechId] = useState(null);

  const [newTech, setNewTech] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    estado_disponibilidad: 'Libre'
  });

  const fetchTechs = async () => {
    const data = await getTechnicians();
    setTechs(data);
  };

  useEffect(() => {
    fetchTechs();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTechId(null);
    setError(null);
    setNewTech({ nombre: '', email: '', telefono: '', password: '', estado_disponibilidad: 'Libre' });
  };

  const openEditModal = (tech) => {
    setEditingTechId(tech.id);
    setNewTech({
      nombre: tech.nombre || '',
      email: tech.email || '',
      telefono: tech.telefono || '',
      password: '', // Hidden on edit
      estado_disponibilidad: tech.estado_disponibilidad || 'Libre'
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (editingTechId) {
        // Only update Firestore document
        await updateTechnician(editingTechId, {
          nombre: newTech.nombre,
          telefono: newTech.telefono,
          estado_disponibilidad: newTech.estado_disponibilidad
        });
      } else {
        if (newTech.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        await createTechnicianAccount(newTech.email, newTech.password, newTech.nombre, newTech.telefono);
      }
      closeModal();
      fetchTechs();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al guardar el usuario. Si es uno nuevo, verifica que el correo no esté en uso.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro de técnico de forma permanente?')) {
      await deleteTechnician(id);
      fetchTechs();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Gestión de Empleados (Técnicos)</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Nuevo Técnico</button>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--text-muted)' }}>
              <th style={{ padding: '0.75rem' }}>Nombre</th>
              <th>Contacto</th>
              <th>Disponibilidad</th>
              <th style={{ textAlign: 'right', paddingRight: '0.75rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {techs.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '0.75rem' }}><strong>{t.nombre}</strong></td>
                <td>
                  <div style={{ fontSize: '0.875rem' }}>{t.email}</div>
                  {t.telefono && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tel: {t.telefono}</div>}
                </td>
                <td>
                  <span className="badge" style={{ backgroundColor: t.estado_disponibilidad === 'Libre' ? 'var(--status-done)' : 'var(--status-waiting)' }}>
                    {t.estado_disponibilidad}
                  </span>
                </td>
                <td style={{ textAlign: 'right', paddingRight: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEditModal(t)}>
                      <Edit2 size={16} /> Editar
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--status-waiting)', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={() => handleDelete(t.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {techs.length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No hay técnicos registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2>{editingTechId ? 'Editar Técnico' : 'Registrar Nuevo Técnico'}</h2>
            {!editingTechId && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                El técnico utilizará este correo y contraseña para acceder a la aplicación desde su dispositivo móvil.
              </p>
            )}
            
            {error && <div style={{ color: 'var(--status-waiting)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Nombre del Técnico</label>
                <input className="input-field" required value={newTech.nombre} onChange={(e) => setNewTech({...newTech, nombre: e.target.value})} placeholder="Ej. Juan Pérez" />
              </div>
              
              <div>
                <label className="label">Correo Electrónico</label>
                <input type="email" className="input-field" required disabled={!!editingTechId} value={newTech.email} onChange={(e) => setNewTech({...newTech, email: e.target.value})} placeholder="tecnico@ejemplo.com" />
                {editingTechId && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>El correo no se puede cambiar por seguridad.</span>}
              </div>

              <div>
                <label className="label">Teléfono (WhatsApp)</label>
                <input type="tel" className="input-field" value={newTech.telefono} onChange={(e) => setNewTech({...newTech, telefono: e.target.value})} placeholder="Ej. 1234567890" />
              </div>

              {!editingTechId && (
                <div>
                  <label className="label">Contraseña Temporal</label>
                  <input type="password" className="input-field" required value={newTech.password} onChange={(e) => setNewTech({...newTech, password: e.target.value})} placeholder="Mínimo 6 caracteres" />
                </div>
              )}

              {editingTechId && (
                <div>
                  <label className="label">Estado de Disponibilidad Actual</label>
                  <select className="input-field" value={newTech.estado_disponibilidad} onChange={(e) => setNewTech({...newTech, estado_disponibilidad: e.target.value})}>
                    <option value="Libre">Libre</option>
                    <option value="Ocupado">Ocupado</option>
                  </select>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : (editingTechId ? 'Guardar Cambios' : 'Crear Cuenta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEmployees;
