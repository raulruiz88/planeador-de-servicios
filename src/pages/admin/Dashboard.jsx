import { useState, useEffect } from 'react';
import { getWorkOrders, getTechnicians, getClients } from '../../services/firebaseServices';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTech, setSelectedTech] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => { 
      if (e.key === 'Escape') {
        setSelectedTech(null);
        setSelectedOrder(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedOrders, fetchedTechs, fetchedClients] = await Promise.all([
          getWorkOrders(),
          getTechnicians(),
          getClients()
        ]);
        setOrders(fetchedOrders);
        setTechnicians(fetchedTechs);
        setClients(fetchedClients);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const events = orders.map(order => {
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
    
    if (order.estado === 'Terminado') backgroundColor = '#475569'; // Slate 600 - distinct gray that doesn't disappear into the dark background
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
          padding: '2px 4px',
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
       } 
    };
  };

  if (loading) return <div>Cargando dashboard...</div>;

  return (
    <div className="flex-col gap-4" style={{ display: 'flex', flex: 1, height: '100%' }}>
      <h1>Dashboard Operativo</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.5rem', flex: 1 }}>
        {/* Calendario Interactivo */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '800px' }}>
          <h2>Calendario de Órdenes</h2>
          <div style={{ flex: 1, marginTop: '1rem' }}>
            <Calendar
              localizer={localizer}
              events={events}
              popup
              onSelectEvent={(e) => setSelectedOrder(e.resource)}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={currentView}
              onView={(newView) => setCurrentView(newView)}
              date={currentDate}
              onNavigate={(newDate) => setCurrentDate(newDate)}
              eventPropGetter={eventPropGetter}
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

        {/* Panel lateral derecho (Técnicos) */}
        <div className="flex-col gap-4" style={{ display: 'flex' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '480px' }}>
            <h2>Disponibilidad en Tiempo Real</h2>
            <div className="flex-col gap-2" style={{ display: 'flex', marginTop: '1rem', overflowY: 'auto', paddingRight: '0.5rem', flex: 1 }}>
              {technicians.length === 0 ? <p className="text-muted">No hay técnicos.</p> : technicians.map(tech => (
                <div 
                  key={tech.id} 
                  onClick={() => setSelectedTech(tech)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--text-muted)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'var(--transition)' }}
                  className="hover-action"
                  title="Ver órdenes de este técnico"
                >
                  <span>{tech.nombre}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      width: '12px', height: '12px', borderRadius: '50%',
                      backgroundColor: tech.estado_disponibilidad === 'Libre' ? 'var(--status-done)' : 'var(--prio-urgent)'
                    }} />
                    <span style={{ fontSize: '0.875rem' }}>{tech.estado_disponibilidad}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card">
            <h2>Resumen</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {orders.length} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>Órdenes Totales</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tech Details Modal */}
      {selectedTech && (() => {
        const activeOrders = orders.filter(o => 
          o.estado !== 'Terminado' && 
          (o.tecnico_asignado_id === selectedTech.id || (o.tecnicos_asignados_ids || []).includes(selectedTech.id))
        );
        
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }} onClick={() => setSelectedTech(null)}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: selectedTech.estado_disponibilidad === 'Libre' ? 'var(--status-done)' : 'var(--prio-urgent)' }} />
                  {selectedTech.nombre}
                </h2>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', border: 'none' }} onClick={() => setSelectedTech(null)}>X</button>
              </div>
              
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tareas de Hoy</h3>
                {activeOrders.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No tiene tareas activas asignadas.</p>
                ) : (
                  activeOrders.map(o => {
                    const c = clients.find(cl => cl.id === o.cliente_id);
                    return (
                      <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: `6px solid ${c?.color || 'var(--primary)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{o.equipo_a_reparar}</span>
                          <span className="badge" style={{ backgroundColor: o.estado === 'Pendiente' ? 'var(--status-pending)' : 'var(--primary)', fontSize: '0.75rem', alignSelf: 'center' }}>{o.estado}</span>
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cliente: {c ? c.nombre_empresa : 'Desconocido'}</span>
                        {o.prioridad === 'Urgente' && <span style={{ fontSize: '0.85rem', color: 'var(--prio-urgent)', fontWeight: 'bold' }}>Prioridad Urgente</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* Order Details Modal */}
      {selectedOrder && (() => {
         const clientObj = clients.find(c => c.id === selectedOrder.cliente_id);
         let assignedTechs = [];
         if (selectedOrder.tecnicos_asignados_ids && selectedOrder.tecnicos_asignados_ids.length > 0) {
            assignedTechs = technicians.filter(t => selectedOrder.tecnicos_asignados_ids.includes(t.id));
         }
         
         return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }} onClick={() => setSelectedOrder(null)}>
            <div className="card" style={{ width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h2 style={{ color: clientObj?.color || 'var(--primary)', marginBottom: '0' }}>{selectedOrder.equipo_a_reparar}</h2>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', border: 'none' }} onClick={() => setSelectedOrder(null)}>X</button>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{clientObj ? clientObj.nombre_empresa : 'Sin Cliente'}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '4px' }}>
                 <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Técnicos Asignados</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem', fontWeight: '500' }}>
                      {assignedTechs.length > 0 ? assignedTechs.map(tech => (
                        <span key={tech.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: '4px', height: '4px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block' }} />
                          {tech.nombre}
                        </span>
                      )) : <span>Sin Asignar</span>}
                    </div>
                 </div>
                 <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha Programada</span>
                    <p style={{ fontWeight: '500' }}>{selectedOrder.fecha_inicio ? new Date(selectedOrder.fecha_inicio).toLocaleDateString() : 'N/A'}</p>
                 </div>
                 <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</span>
                    <p><span className="badge" style={{ backgroundColor: selectedOrder.estado === 'Terminado' ? 'var(--status-done)' : selectedOrder.estado === 'Pendiente' ? 'var(--status-pending)' : 'var(--primary)' }}>{selectedOrder.estado}</span></p>
                 </div>
                 <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prioridad</span>
                    <p style={{ color: selectedOrder.prioridad === 'Urgente' ? 'var(--prio-urgent)' : 'inherit', fontWeight: '500' }}>{selectedOrder.prioridad}</p>
                 </div>
              </div>
              {selectedOrder.descripcion_trabajo && (
                 <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Instrucciones / Falla</span>
                    <p style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.25rem', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>{selectedOrder.descripcion_trabajo}</p>
                 </div>
              )}
            </div>
          </div>
         );
      })()}
    </div>
  );
};

export default AdminDashboard;
