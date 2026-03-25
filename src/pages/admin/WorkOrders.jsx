import { useState, useEffect } from 'react';
import { getWorkOrders, getClients, getTechnicians, getToolkits, createWorkOrder, updateWorkOrder, updateTechnician, deleteWorkOrder } from '../../services/firebaseServices';
import { Edit2, Trash2 } from 'lucide-react';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [toolkits, setToolkits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const initialOrderState = {
    cliente_id: '',
    equipo_a_reparar: '',
    fecha_inicio: '',
    fecha_fin_estimada: '',
    tecnicos_asignados_ids: [],
    kit_herramientas_id: '',
    estado: 'Pendiente',
    prioridad: 'Normal',
    descripcion_trabajo: '',
    notas_tecnico: ''
  };
  const [newOrder, setNewOrder] = useState(initialOrderState);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedOrders, fetchedClients, fetchedTechs, fetchedKits] = await Promise.all([
      getWorkOrders(), getClients(), getTechnicians(), getToolkits()
    ]);
    setOrders(fetchedOrders);
    setClients(fetchedClients);
    setTechnicians(fetchedTechs);
    setToolkits(fetchedKits);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrderId(null);
    setNewOrder(initialOrderState);
  };

  const openEditModal = (order) => {
    setEditingOrderId(order.id);
    
    // Migration from old single-select setup
    let assignedIds = order.tecnicos_asignados_ids || [];
    if (order.tecnico_asignado_id && !assignedIds.includes(order.tecnico_asignado_id)) {
      assignedIds = [...assignedIds, order.tecnico_asignado_id];
    }

    setNewOrder({
      cliente_id: order.cliente_id || '',
      equipo_a_reparar: order.equipo_a_reparar || '',
      fecha_inicio: order.fecha_inicio || '',
      fecha_fin_estimada: order.fecha_fin_estimada || '',
      tecnicos_asignados_ids: assignedIds,
      kit_herramientas_id: order.kit_herramientas_id || '',
      estado: order.estado || 'Pendiente',
      prioridad: order.prioridad || 'Normal',
      descripcion_trabajo: order.descripcion_trabajo || '',
      notas_tecnico: order.notas_tecnico || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    
    // --- Validation and Conflict Detection ---
    if (newOrder.fecha_inicio && newOrder.fecha_fin_estimada) {
      const startA = new Date(newOrder.fecha_inicio).getTime();
      const endA = new Date(newOrder.fecha_fin_estimada).getTime();
      
      if (endA <= startA) {
        alert("La fecha estimada de fin debe ser posterior a la fecha de inicio.");
        return;
      }

      if (newOrder.tecnicos_asignados_ids && newOrder.tecnicos_asignados_ids.length > 0) {
        let conflictWarning = '';
        
        for (const tId of newOrder.tecnicos_asignados_ids) {
          const techOrders = orders.filter(o => 
            o.id !== editingOrderId && 
            o.estado !== 'Terminado' && 
            (o.tecnico_asignado_id === tId || (o.tecnicos_asignados_ids || []).includes(tId))
          );
          
          for (const existing of techOrders) {
             if (!existing.fecha_inicio || !existing.fecha_fin_estimada) continue;
             const startB = new Date(existing.fecha_inicio).getTime();
             const endB = new Date(existing.fecha_fin_estimada).getTime();
             
             if (startA < endB && endA > startB) {
                const tech = technicians.find(t => t.id === tId);
                conflictWarning += `- ${tech ? tech.nombre : 'Técnico'} ya estará trabajando en: "${existing.equipo_a_reparar}"\n`;
             }
          }
        }
        
        if (conflictWarning) {
          const proceed = window.confirm(`¡Atención Administrador!\n\nSe ha detectado un empalme de horarios:\n${conflictWarning}\n¿Estás de acuerdo con empalmar estas órdenes?`);
          if (!proceed) return;
        }
      }
    }
    // -----------------------------------------

    if (editingOrderId) {
      await updateWorkOrder(editingOrderId, newOrder);
    } else {
      await createWorkOrder(newOrder);
      
      // WhatsApp Notifications strictly for NEW orders
      const wantsToNotify = window.confirm(`¡Orden programada exitosamente!\n\n¿Deseas enviar avisos automáticos por WhatsApp a los técnicos asignados?`);
      if (wantsToNotify) {
         for (const tId of newOrder.tecnicos_asignados_ids) {
            const tech = technicians.find(t => t.id === tId);
            if (tech && tech.telefono) {
               const startStr = new Date(newOrder.fecha_inicio).toLocaleString();
               const text = `Hola ${tech.nombre}, se te ha asignado una nueva orden de trabajo:\n\n*Equipo:* ${newOrder.equipo_a_reparar}\n*Fecha programada:* ${startStr}\n*Prioridad:* ${newOrder.prioridad}\n\nAbre tu Planeador desde el celular para ver las instrucciones completas y llenar tu evidencia fotográfica antes de salir.`;
               const encodedUrl = `https://wa.me/${tech.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
               window.open(encodedUrl, '_blank');
            } else if (tech && !tech.telefono) {
               alert(`El técnico ${tech.nombre} no tiene número de teléfono registrado en tu agenda de Empleados.`);
            }
         }
      }
    }
    
    if (newOrder.tecnicos_asignados_ids && newOrder.tecnicos_asignados_ids.length > 0) {
       for (const tId of newOrder.tecnicos_asignados_ids) {
         if (newOrder.estado === 'En Progreso') {
            await updateTechnician(tId, { estado_disponibilidad: 'Ocupado' });
         } else if (newOrder.estado === 'Terminado' || newOrder.estado === 'En Espera de Refacciones') {
            await updateTechnician(tId, { estado_disponibilidad: 'Libre' });
         }
       }
    }
    
    closeModal();
    fetchData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta orden de trabajo de forma permanente?')) {
      await deleteWorkOrder(id);
      fetchData();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Gestión de Órdenes</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Nueva Orden</button>
      </div>

      {loading ? <p>Cargando órdenes...</p> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Equipo</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th style={{ textAlign: 'right', paddingRight: '0.75rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const clientObj = clients.find(c => c.id === o.cliente_id);
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <strong>{o.equipo_a_reparar}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: clientObj?.color || 'var(--primary)' }} />
                        {clientObj ? clientObj.nombre_empresa : 'N/A'}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: o.estado === 'Terminado' ? 'var(--status-done)' : o.estado === 'Pendiente' ? 'var(--status-pending)' : 'var(--primary)' }}>
                        {o.estado}
                      </span>
                    </td>
                    <td>{o.prioridad}</td>
                    <td style={{ textAlign: 'right', paddingRight: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEditModal(o)}>
                          <Edit2 size={16} /> Editar
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--status-waiting)', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={() => handleDelete(o.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center' }}>No hay órdenes</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal - Create/Edit */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingOrderId ? 'Editar Orden de Trabajo' : 'Crear Nueva Orden'}</h2>
            <form onSubmit={handleSaveOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label className="label">Cliente</label>
                <select className="input-field" required value={newOrder.cliente_id} onChange={(e) => setNewOrder({...newOrder, cliente_id: e.target.value})}>
                  <option value="">Selecciona un cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}
                </select>
              </div>
              
              <div>
                <label className="label">Equipo a reparar</label>
                <input className="input-field" required value={newOrder.equipo_a_reparar} onChange={(e) => setNewOrder({...newOrder, equipo_a_reparar: e.target.value})} />
              </div>

              <div>
                <label className="label">Técnico(s) Asignado(s)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--text-muted)', borderRadius: 'var(--radius-sm)' }}>
                  {technicians.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={newOrder.tecnicos_asignados_ids?.includes(t.id) || false}
                        onChange={(e) => {
                          let arr = [...(newOrder.tecnicos_asignados_ids || [])];
                          if (e.target.checked) arr.push(t.id);
                          else arr = arr.filter(id => id !== t.id);
                          setNewOrder({...newOrder, tecnicos_asignados_ids: arr});
                        }}
                      />
                      {t.nombre}
                    </label>
                  ))}
                  {technicians.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No hay técnicos registrados.</p>}
                </div>
              </div>

              <div>
                <label className="label">Kit de Herramientas</label>
                <select className="input-field" required value={newOrder.kit_herramientas_id} onChange={(e) => setNewOrder({...newOrder, kit_herramientas_id: e.target.value})}>
                  <option value="">Selecciona un kit</option>
                  {toolkits.map(k => <option key={k.id} value={k.id}>{k.nombre_kit}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Fecha Programada (Inicio)</label>
                  <input type="datetime-local" className="input-field" required value={newOrder.fecha_inicio} onChange={(e) => setNewOrder({...newOrder, fecha_inicio: e.target.value})} />
                </div>
                <div>
                  <label className="label">Fecha Estimada de Fin</label>
                  <input type="datetime-local" className="input-field" required value={newOrder.fecha_fin_estimada} onChange={(e) => setNewOrder({...newOrder, fecha_fin_estimada: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Nivel de Urgencia</label>
                  <select className="input-field" required value={newOrder.prioridad} onChange={(e) => setNewOrder({...newOrder, prioridad: e.target.value})}>
                    <option value="Baja">Baja</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="label">Estado Actual</label>
                  <select className="input-field" required value={newOrder.estado} onChange={(e) => setNewOrder({...newOrder, estado: e.target.value})}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="En Espera de Refacciones">En Espera de Refacciones</option>
                    <option value="Terminado">Terminado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Descripción o Instrucciones</label>
                <textarea className="input-field" rows="3" required value={newOrder.descripcion_trabajo} onChange={(e) => setNewOrder({...newOrder, descripcion_trabajo: e.target.value})} placeholder="Detalles de la falla o mantenimiento requerido..." style={{ resize: 'vertical' }}></textarea>
              </div>
              
              {editingOrderId && (newOrder.estado === 'Terminado' || newOrder.notas_tecnico) && (
                <div>
                  <label className="label">Notas y Reporte del Técnico</label>
                  <textarea className="input-field" rows="2" value={newOrder.notas_tecnico} disabled placeholder="Sin reporte final adjunto." style={{ resize: 'vertical', opacity: 0.7 }}></textarea>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingOrderId ? 'Guardar Cambios' : 'Crear Orden'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
