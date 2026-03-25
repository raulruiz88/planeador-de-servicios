import { useState, useEffect } from 'react';
import { getClients, addClient, updateClient, deleteClient } from '../../services/firebaseServices';
import { Edit2, Plus, Trash2, MapPin } from 'lucide-react';

const CLIENT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

const AdminClients = () => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);

  // Form State
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contactos, setContactos] = useState([{ nombre: '', telefono: '' }]);
  const [clientColor, setClientColor] = useState(CLIENT_COLORS[0]);

  const fetchClients = async () => {
    const data = await getClients();
    setClients(data);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClientId(null);
    setNombreEmpresa('');
    setDireccion('');
    setContactos([{ nombre: '', telefono: '' }]);
    setClientColor(CLIENT_COLORS[0]);
  };

  const extractContacts = (client) => {
    if (client.contactos && Array.isArray(client.contactos)) return client.contactos;
    // Legacy support if saved with old single-contact schema fields
    if (client.contacto || client.telefono) {
      return [{ nombre: client.contacto || '', telefono: client.telefono || '' }];
    }
    return [];
  };

  const openEditModal = (client) => {
    setEditingClientId(client.id);
    setNombreEmpresa(client.nombre_empresa || '');
    setDireccion(client.direccion || '');
    setClientColor(client.color || CLIENT_COLORS[0]);
    
    const extracted = extractContacts(client);
    setContactos(extracted.length > 0 ? extracted : [{ nombre: '', telefono: '' }]);
    
    setIsModalOpen(true);
  };

  const handleAddContact = () => {
    setContactos([...contactos, { nombre: '', telefono: '' }]);
  };

  const handleContactChange = (index, field, value) => {
    const updated = [...contactos];
    updated[index][field] = value;
    setContactos(updated);
  };

  const removeContact = (index) => {
    if (contactos.length > 1) {
      setContactos(contactos.filter((_, i) => i !== index));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombreEmpresa.trim()) return;

    // Remove empty rows to keep the database clean
    const cleanedContacts = contactos.filter(c => c.nombre.trim() || c.telefono.trim());

    const payload = {
      nombre_empresa: nombreEmpresa,
      direccion,
      contactos: cleanedContacts,
      color: clientColor
    };

    if (editingClientId) {
      await updateClient(editingClientId, payload);
    } else {
      await addClient(payload);
    }
    
    closeModal();
    fetchClients();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente de forma permanente?')) {
      await deleteClient(id);
      fetchClients();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Gestión de Clientes</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Nuevo Cliente</button>
      </div>

      <div className="card">
         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Empresa</th>
                <th>Contactos</th>
                <th style={{ textAlign: 'right', paddingRight: '0.75rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const clientContacts = extractContacts(c);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.color || 'var(--primary)', flexShrink: 0 }} />
                        <strong>{c.nombre_empresa}</strong>
                      </div>
                      {c.direccion && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginLeft: '1.25rem' }}>
                        {c.direccion.startsWith('http') ? <a href={c.direccion} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none'}}><MapPin size={14} /> Ver en Google Maps</a> : c.direccion}
                      </div>}
                    </td>
                    <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                      {clientContacts.length === 0 ? <span style={{ color: 'var(--text-muted)' }}>Sin contactos</span> : null}
                      {clientContacts.map((contact, idx) => (
                        <div key={idx} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 500 }}>{contact.nombre || 'N/A'}</span>
                          {contact.telefono && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({contact.telefono})</span>}
                        </div>
                      ))}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEditModal(c)}>
                          <Edit2 size={16} /> Editar
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--status-waiting)', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={() => handleDelete(c.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {clients.length === 0 && <tr><td colSpan="3" style={{ padding: '1rem', textAlign: 'center' }}>No hay clientes</td></tr>}
            </tbody>
          </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingClientId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div>
                <label className="label">Nombre de la Empresa</label>
                <input className="input-field" required value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} />
              </div>
              
              <div>
                <label className="label">Dirección o Enlace de Google Maps (Opcional)</label>
                <input className="input-field" placeholder="Ej. https://maps.app.goo.gl/..." value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Si pegas un link, el técnico verá un botón directo de 'Ubicación'.</p>
              </div>

              <div>
                <label className="label">Color de Identificación (Para Calendarios)</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {CLIENT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setClientColor(color)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: color,
                        border: clientColor === color ? '3px solid white' : '2px solid transparent',
                        cursor: 'pointer', outline: clientColor === color ? '2px solid var(--primary)' : 'none',
                        transition: '0.2s', boxShadow: 'var(--shadow)'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--text-muted)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label className="label" style={{ margin: 0 }}>Gestión de Contactos</label>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={handleAddContact}>
                    <Plus size={16} /> Añadir Contacto
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {contactos.map((contacto, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <input 
                        className="input-field" 
                        placeholder="Nombre completo" 
                        value={contacto.nombre} 
                        onChange={(e) => handleContactChange(idx, 'nombre', e.target.value)} 
                        style={{ flex: 1 }}
                      />
                      <input 
                        className="input-field" 
                        placeholder="Teléfono (Ej. 555-1234)" 
                        value={contacto.telefono} 
                        onChange={(e) => handleContactChange(idx, 'telefono', e.target.value)} 
                        style={{ width: '150px' }}
                      />
                      {contactos.length > 1 && (
                        <button type="button" className="btn" style={{ padding: '0.75rem', color: 'var(--status-waiting)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }} onClick={() => removeContact(idx)}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingClientId ? 'Guardar Cambios' : 'Crear Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminClients;
