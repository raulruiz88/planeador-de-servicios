import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getWorkOrdersForTech, getClients, updateWorkOrderStatus, updateWorkOrderNotes, getToolkits, updateTechAvailability } from '../../services/firebaseServices';
import { CheckCircle, Play, AlertCircle, MapPin, Calendar as CalendarIcon, List as ListIcon } from 'lucide-react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const TechnicianTaskList = ({ filter = 'activas' }) => {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [toolkits, setToolkits] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Calendar View State
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchOrders = async () => {
    setLoading(true);
    const [ordersData, clientsData, toolkitsData] = await Promise.all([
      getWorkOrdersForTech(userProfile.uid),
      getClients(),
      getToolkits()
    ]);
    setOrders(ordersData);
    setClients(clientsData);
    setToolkits(toolkitsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [userProfile]);

  useEffect(() => {
    if (filter === 'terminadas') {
      setViewMode('list');
    }
    setSelectedOrder(null);
  }, [filter]);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setNotes(''); // Clear the new note input
    
    // Initialize checklist state to false for all tools required
    const kit = toolkits.find(k => k.id === order.kit_herramientas_id);
    const initialChecklist = {};
    if (kit?.lista_herramientas) {
      kit.lista_herramientas.forEach(t => { initialChecklist[t] = false; });
    }
    setChecklist(initialChecklist);
  };

  const isChecklistComplete = (tools) => {
    return tools.every(tool => checklist[tool]);
  };

  const handleStatusChange = async (newStatus) => {
    if (selectedOrder) {
      await updateWorkOrderStatus(selectedOrder.id, newStatus);
      
      if (newStatus === 'Terminado') {
        let combinedNotes = selectedOrder.notas_tecnico || '';
        
        if (notes.trim()) {
           const timestamp = new Date().toLocaleString('es-MX', { 
             year: 'numeric', month: '2-digit', day: '2-digit', 
             hour: '2-digit', minute: '2-digit', hour12: true 
           });
           const newEntry = `[${timestamp}] ${userProfile?.nombre || 'Técnico'}:\n${notes.trim()}`;
           combinedNotes = combinedNotes ? `${combinedNotes}\n\n${newEntry}` : newEntry;
           await updateWorkOrderNotes(selectedOrder.id, combinedNotes);
        }
        
        const clientObj = clients.find(c => c.id === selectedOrder.cliente_id);
        const reportText = combinedNotes || 'Sin reporte de fallas.';
        const waText = `¡Servicio Finalizado!\n\n*Equipo:* ${selectedOrder.equipo_a_reparar}\n*Cliente:* ${clientObj ? clientObj.nombre_empresa : 'N/A'}\n*Bitácora Técnica:*\n${reportText}\n\n_(Te envío las fotos de evidencia por este chat)_`;
        const encodedUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;
        window.open(encodedUrl, '_blank');
      }
      
      try {
        if (newStatus === 'En Progreso') {
          await updateTechAvailability(userProfile.uid, false);
        } else if (newStatus === 'Terminado' || newStatus === 'En Espera de Refacciones') {
          await updateTechAvailability(userProfile.uid, true);
        }
      } catch (err) {
        console.error("No se pudo actualizar la disponibilidad", err);
      }

      const updated = { ...selectedOrder, estado: newStatus };
      setSelectedOrder(updated);
      setChecklist({});
      fetchOrders();
    }
  };

  const handleSaveNotes = async () => {
    if (selectedOrder && notes.trim()) {
      const timestamp = new Date().toLocaleString('es-MX', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      });
      const newEntry = `[${timestamp}] ${userProfile?.nombre || 'Técnico'}:\n${notes.trim()}`;
      
      const existingNotes = selectedOrder.notas_tecnico || '';
      const combinedNotes = existingNotes ? `${existingNotes}\n\n${newEntry}` : newEntry;

      await updateWorkOrderNotes(selectedOrder.id, combinedNotes);
      
      const updatedOrder = { ...selectedOrder, notas_tecnico: combinedNotes };
      setSelectedOrder(updatedOrder);
      setNotes(''); // Clear the textarea
      
      fetchOrders();
    }
  };

  if (loading) return <div>Cargando tus tareas...</div>;

  if (selectedOrder) {
    const kit = toolkits.find(k => k.id === selectedOrder.kit_herramientas_id);
    const currentKit = kit;
    const isReadyToStart = isChecklistComplete(kit?.lista_herramientas || []);
    const clientObj = clients.find(c => c.id === selectedOrder.cliente_id);

    const extractContacts = (client) => {
      if (!client) return [];
      if (client.contactos && Array.isArray(client.contactos)) return client.contactos;
      if (client.contacto || client.telefono) return [{ nombre: client.contacto || '', telefono: client.telefono || '' }];
      return [];
    };

    return (
      <div className="flex-col gap-4" style={{ display: 'flex' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>← Volver a Tareas</button>
          <h2>{selectedOrder.equipo_a_reparar}</h2>
          <span className="badge" style={{ backgroundColor: selectedOrder.estado === 'Terminado' ? 'var(--status-done)' : 'var(--status-pending)' }}>{selectedOrder.estado}</span>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Detalles del Trabajo</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cliente</p>
              <p style={{ fontWeight: '500' }}>{clientObj ? clientObj.nombre_empresa : 'Desconocido'}</p>
            </div>
            
            {clientObj && extractContacts(clientObj).length > 0 && (
               <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Contacto(s)</p>
                  {extractContacts(clientObj).map((ct, i) => (
                     ct.telefono ? (
                        <div key={i} style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {ct.nombre}: <a href={`tel:${ct.telefono}`} style={{ color: 'var(--primary)', fontWeight: '500' }}>{ct.telefono}</a>
                        </div>
                     ) : (
                        <div key={i} style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>{ct.nombre} - Sin número</div>
                     )
                  ))}
               </div>
            )}
            
            {clientObj && clientObj.direccion && (
               <div style={{ gridColumn: '1 / -1' }}>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ubicación</p>
                 {clientObj.direccion.startsWith('http') ? (
                    <a href={clientObj.direccion} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', padding: '0.5rem 1rem' }}>
                      <MapPin size={16} /> Abrir en Google Maps
                    </a>
                 ) : (
                    <p style={{ marginTop: '0.25rem' }}>{clientObj.direccion}</p>
                 )}
               </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Fecha Programada</p>
              <p>{selectedOrder.fecha_inicio ? new Date(selectedOrder.fecha_inicio).toLocaleString() : 'No asignada'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Prioridad</p>
              <p style={{ color: selectedOrder.prioridad === 'Urgente' ? 'var(--prio-urgent)' : 'var(--text-main)', fontWeight: selectedOrder.prioridad === 'Urgente' ? 'bold' : 'normal' }}>{selectedOrder.prioridad}</p>
            </div>
          </div>
          {selectedOrder.descripcion_trabajo && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Descripción / Instrucciones</p>
              <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>{selectedOrder.descripcion_trabajo}</p>
            </div>
          )}
        </div>

        {selectedOrder.estado === 'Pendiente' && currentKit && (
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={18} /> Checklist Obligatorio</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Verifica contar con todo el kit <strong>"{currentKit.nombre_kit}"</strong> antes de salir.</p>
            
            <div className="flex-col gap-2" style={{ display: 'flex', marginBottom: '1.5rem' }}>
              {currentKit.lista_herramientas.map(tool => (
                <label key={tool} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', backgroundColor: checklist[tool] ? 'rgba(34, 197, 94, 0.1)' : 'transparent', borderRadius: 'var(--radius-sm)', transition: 'var(--transition)' }}>
                  <input type="checkbox" checked={checklist[tool] || false} onChange={(e) => setChecklist({...checklist, [tool]: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span style={{ color: checklist[tool] ? 'var(--status-done)' : 'var(--text-main)' }}>{tool}</span>
                </label>
              ))}
            </div>

            <button className="btn btn-primary" style={{ width: '100%', opacity: isReadyToStart ? 1 : 0.5 }} disabled={!isReadyToStart} onClick={() => handleStatusChange('En Progreso')}>
              <Play size={18} /> Iniciar Trabajo
            </button>
            {!isReadyToStart && <p style={{ fontSize: '0.75rem', color: 'var(--status-waiting)', textAlign: 'center', marginTop: '0.5rem' }}>Debes marcar todas las herramientas para continuar.</p>}
          </div>
        )}

        {selectedOrder.estado !== 'Pendiente' && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Bitácora de Trabajo</h3>
            </div>
            
            {selectedOrder.notas_tecnico && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Historial del servicio:</p>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '250px', overflowY: 'auto', fontSize: '0.9rem' }}>
                  {selectedOrder.notas_tecnico}
                </div>
              </div>
            )}

            {selectedOrder.estado !== 'Terminado' && (
              <>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Agregar nuevo reporte o notas:</p>
                <textarea className="input-field" rows="3" placeholder="Describe lo que encontraste o reparaste..." value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                <button 
                  className="btn" 
                  style={{ marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', color: notes.trim() ? 'var(--primary)' : 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.2)' }} 
                  onClick={handleSaveNotes}
                  disabled={!notes.trim()}
                >
                  Agregar a la Bitácora
                </button>
              </>
            )}

            {selectedOrder.estado === 'Terminado' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--text-muted)', textAlign: 'center' }}>
                 <p style={{ color: 'var(--status-done)', fontWeight: 'bold' }}>✅ Esta orden ya fue finalizada y reportada.</p>
                 <button 
                   className="btn" 
                   style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--text-muted)', alignSelf: 'center', fontSize: '0.875rem' }}
                   onClick={() => {
                     const waText = `Hola Administrador, necesito solicitar la autorización para reabrir la orden terminada:\n\n*Equipo:* ${selectedOrder.equipo_a_reparar}\n*Motivo:* [Escribe por qué...]`;
                     window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
                   }}
                 >
                   Solicitar Autorización de Edición al Admin
                 </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
                {selectedOrder.estado !== 'En Espera de Refacciones' && (
                  <button 
                    className="btn" 
                    style={{ flex: 1, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid #f59e0b' }} 
                    onClick={() => handleStatusChange('En Espera de Refacciones')}
                  >
                    ⏸ Pausar (Faltan Refacciones)
                  </button>
                )}
                {selectedOrder.estado === 'En Espera de Refacciones' && (
                  <button className="btn btn-primary" style={{flex: 1}} onClick={() => handleStatusChange('En Progreso')}>
                    ▶ Reanudar Progreso
                  </button>
                )}
                <button 
                    className="btn" 
                    style={{ 
                      flex: 1,
                      backgroundColor: (notes.trim() || selectedOrder.notas_tecnico) ? 'var(--status-done)' : 'transparent', 
                      color: (notes.trim() || selectedOrder.notas_tecnico) ? 'white' : 'var(--text-muted)',
                      border: (notes.trim() || selectedOrder.notas_tecnico) ? '1px solid transparent' : '1px dashed var(--text-muted)'
                    }} 
                    disabled={!(notes.trim() || selectedOrder.notas_tecnico)}
                    onClick={() => handleStatusChange('Terminado')}
                >
                    <CheckCircle size={18} /> {(notes.trim() || selectedOrder.notas_tecnico) ? 'Guardar y Enviar WhatsApp' : 'Falta Llenar Bitácora'}
                </button>
              </div>
            )}
            
            {selectedOrder.estado !== 'Terminado' && (
               <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                 * Recuerda enviar las fotografías de evidencia al chat de oficina una vez que envíes tu reporte.
               </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const filteredOrders = orders.filter(o => filter === 'activas' ? o.estado !== 'Terminado' : o.estado === 'Terminado');

  const events = filteredOrders.map(order => {
    const start = order.fecha_inicio ? new Date(order.fecha_inicio) : new Date();
    const end = order.fecha_fin_estimada ? new Date(order.fecha_fin_estimada) : new Date();
    if (end < start) end.setHours(start.getHours() + 2);

    const clientObj = clients.find(c => c.id === order.cliente_id);
    const clientName = clientObj ? clientObj.nombre_empresa : 'Sin Cliente';

    const statusIcon = order.estado === 'Terminado' ? '✅ ' : '';

    return {
      id: order.id,
      title: `${statusIcon}${clientName}: ${order.equipo_a_reparar}`,
      start,
      end,
      resource: order
    };
  });

  const eventPropGetter = (event) => {
    const order = event.resource;
    const clientObj = clients.find(c => c.id === order.cliente_id);
    let backgroundColor = clientObj?.color || 'var(--primary)';
    
    if (order.estado === 'Terminado') backgroundColor = '#475569'; // Slate 600 - dark distinct gray
    else if (order.estado === 'En Espera de Refacciones') backgroundColor = 'var(--status-waiting)';
    
    let borderLeft = 'none';
    if (order.prioridad === 'Urgente' && order.estado !== 'Terminado') borderLeft = '4px solid var(--prio-urgent)';
    
    return { 
       style: { 
          backgroundColor, 
          borderRadius: '4px', 
          opacity: 0.95, 
          color: 'white', 
          border: 'none',
          borderLeft, 
          display: 'block', 
          padding: '2px 5px', 
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
       } 
    };
  };

  return (
    <div className="flex-col gap-4" style={{ display: 'flex', height: '100%', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>{filter === 'activas' ? 'Tus Tareas Pendientes' : 'Historial de Tareas Terminadas'}</h1>
        {filter === 'activas' && (
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
            <button 
              onClick={() => setViewMode('list')} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }}
            >
              <ListIcon size={16} /> Lista
            </button>
            <button 
              onClick={() => setViewMode('calendar')} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', background: viewMode === 'calendar' ? 'var(--primary)' : 'transparent', color: viewMode === 'calendar' ? 'white' : 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }}
            >
              <CalendarIcon size={16} /> Calendario
            </button>
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="flex-col gap-4" style={{ display: 'flex' }}>
          {filteredOrders.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No tienes órdenes en esta sección.</p> : filteredOrders.map(order => {
            const clientObj = clients.find(c => c.id === order.cliente_id);
            return (
            <div key={order.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: `6px solid ${clientObj?.color || 'var(--primary)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge" style={{ backgroundColor: order.estado === 'Terminado' ? 'var(--status-done)' : order.estado === 'Pendiente' ? 'var(--status-pending)' : 'var(--primary)' }}>
                  {order.estado.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{order.prioridad}</span>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>{order.equipo_a_reparar}</h3>
                {order.fecha_inicio && <p style={{ fontSize: '0.875rem', color: 'var(--primary)', marginTop: '0.25rem' }}>🗓 {new Date(order.fecha_inicio).toLocaleDateString()}</p>}
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {order.descripcion_trabajo || 'Orden de trabajo regular.'}
                </p>
              </div>
              
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleSelectOrder(order)}>
                Continuar / Ver Trabajo
              </button>
            </div>
          )})}
        </div>
      ) : (
        <div className="card" style={{ flex: 1, height: '800px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <Calendar
              localizer={localizer}
              events={events}
              popup
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={currentView}
              onView={(newView) => setCurrentView(newView)}
              date={currentDate}
              onNavigate={(newDate) => setCurrentDate(newDate)}
              eventPropGetter={eventPropGetter}
              onSelectEvent={(event) => handleSelectOrder(event.resource)}
              messages={{
                next: ">",
                previous: "<",
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día"
              }}
              culture="es"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianTaskList;
