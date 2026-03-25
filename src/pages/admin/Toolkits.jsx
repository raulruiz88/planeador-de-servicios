import { useState, useEffect } from 'react';
import { getToolkits, createToolkit, updateToolkit, deleteToolkit } from '../../services/firebaseServices';
import { Edit2, Trash2 } from 'lucide-react';

const AdminToolkits = () => {
  const [toolkits, setToolkits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState(null);
  
  const [newKitName, setNewKitName] = useState('');
  const [herramientasInput, setHerramientasInput] = useState('');

  const fetchKits = async () => {
    const data = await getToolkits();
    setToolkits(data);
  };

  useEffect(() => {
    fetchKits();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingKitId(null);
    setNewKitName('');
    setHerramientasInput('');
  };

  const openEditModal = (kit) => {
    setEditingKitId(kit.id);
    setNewKitName(kit.nombre_kit);
    setHerramientasInput(kit.lista_herramientas.join('\n'));
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newKitName.trim() || !herramientasInput.trim()) return;
    
    const lista_herramientas = herramientasInput.split('\n').map(h => h.trim()).filter(h => h);
    
    const payload = {
      nombre_kit: newKitName,
      lista_herramientas
    };

    if (editingKitId) {
      await updateToolkit(editingKitId, payload);
    } else {
      await createToolkit(payload);
    }
    closeModal();
    fetchKits();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este kit de herramientas de forma permanente?')) {
      await deleteToolkit(id);
      fetchKits();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Gestión de Hub de Herramientas</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Nuevo Kit</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {toolkits.length === 0 ? <p>No hay kits registrados.</p> : toolkits.map(kit => (
          <div key={kit.id} className="card flex-col gap-2" style={{ display: 'flex', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ color: 'var(--primary)' }}>{kit.nombre_kit}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEditModal(kit)}>
                  <Edit2 size={16} /> Editar
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--status-waiting)', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={() => handleDelete(kit.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{kit.lista_herramientas.length} herramientas</span>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-main)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {kit.lista_herramientas.map((h, i) => (
                <li key={i} style={{ marginBottom: '0.25rem' }}>{h}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2>{editingKitId ? 'Editar Kit de Herramientas' : 'Crear Nuevo Kit de Herramientas'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              El técnico deberá pasar por el checklist de estas herramientas antes de iniciar cualquier orden.
            </p>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Nombre del Kit (Ej. Kit Eléctrico)</label>
                <input className="input-field" required value={newKitName} onChange={(e) => setNewKitName(e.target.value)} />
              </div>
              <div>
                <label className="label">Lista de Herramientas (1 por línea)</label>
                <textarea 
                  className="input-field" 
                  rows="6" 
                  required 
                  value={herramientasInput} 
                  onChange={(e) => setHerramientasInput(e.target.value)} 
                  placeholder="Multímetro&#10;Pinzas de corte&#10;Desarmadores aislados"
                  style={{ resize: 'vertical' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingKitId ? 'Guardar Cambios' : 'Guardar Kit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminToolkits;
