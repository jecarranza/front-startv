import React, { useState, useEffect, useContext } from 'react';
import { getAllTareas } from '../services/TareaService';
import { AuthContext } from '../context/AuthContext';

const ResumenView = ({ updateTrigger, setVistaActiva, setFechaFiltroGlobal }) => {
    const { user } = useContext(AuthContext);
    const [tareas, setTareas] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date());
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const token = localStorage.getItem('token');
    let rolDelToken = 'EMPLEADO';
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            rolDelToken = payload.rol || payload.role || 'EMPLEADO';
        } catch (e) { }
    }
    const esAdminMenu = rolDelToken === 'ADMIN' || rolDelToken === 'ROLE_ADMIN';

    useEffect(() => {
        cargarTareas();
    }, [updateTrigger]);

    const cargarTareas = async () => {
        setLoading(true);
        try {
            const data = await getAllTareas();
            setTareas(data || []);
        } catch (error) {
            console.error("Error al cargar tareas:", error);
        }
        setLoading(false);
    };

    const formatFecha = (fechaString) => {
        if (!fechaString) return '';
        const fecha = new Date(fechaString + "T00:00:00");
        return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const isHoy = (fechaString) => {
        if (!fechaString) return false;
        const fecha = new Date(fechaString);
        return fecha.getDate() === hoy.getDate() &&
            fecha.getMonth() === hoy.getMonth() &&
            fecha.getFullYear() === hoy.getFullYear();
    };

    const tiempoTranscurrido = (fechaString) => {
        if (!fechaString) return 'Desconocido';
        const fecha = new Date(fechaString);
        const ahora = new Date();
        const diffMs = ahora - fecha;
        
        if (diffMs < 0) return 'Justo ahora';

        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDias = Math.floor(diffHrs / 24);

        if (diffMins < 60) return diffMins === 0 ? 'Justo ahora' : `Hace ${diffMins} min`;
        if (diffHrs < 24) return `Hace ${diffHrs} horas`;
        if (diffDias === 1) return 'Ayer';
        return `Hace ${diffDias} días`;
    };

    // ==========================================
    // CÁLCULO DE KPIs SUPERIORES
    // ==========================================
    const tareasActivas = tareas.filter(t => t.estado !== 'COMPLETADA' && t.estado !== 'FINALIZADA');
    const tareasUrgentes = tareasActivas.filter(t => t.prioridad === 'URGENTE');
    const tareasCompletadasHoy = tareas.filter(t => (t.estado === 'COMPLETADA' || t.estado === 'FINALIZADA') && isHoy(t.fechaFinalizacion));

    // Cambiamos a 50 para permitir que el scroll funcione si hay muchas tareas
    const proximasAVencer = [...tareasActivas]
        .sort((a, b) => new Date(a.fechaLimite || '9999-12-31') - new Date(b.fechaLimite || '9999-12-31'))
        .slice(0, 50);

    const recienCompletadas = tareas.filter(t => t.estado === 'COMPLETADA' || t.estado === 'FINALIZADA')
        .sort((a, b) => new Date(b.fechaFinalizacion || 0) - new Date(a.fechaFinalizacion || 0))
        .slice(0, 50);

    // ==========================================
    // CÁLCULO DEL CALENDARIO
    // ==========================================
    const tareasDelDiaSeleccionado = tareas.filter(t => {
        if (!t.fechaLimite) return false;
        const [year, month, day] = t.fechaLimite.split('-');
        return parseInt(year) === diaSeleccionado.getFullYear() &&
               parseInt(month) - 1 === diaSeleccionado.getMonth() &&
               parseInt(day) === diaSeleccionado.getDate();
    });

    let stats = {
        total: tareasDelDiaSeleccionado.length,
        completadasATiempo: 0,
        completadasAtrasadas: 0,
        faltantes: 0,
        atrasadasVencidas: 0
    };

    tareasDelDiaSeleccionado.forEach(tarea => {
        const limiteDate = new Date(tarea.fechaLimite + "T00:00:00");

        if (tarea.estado === 'COMPLETADA' || tarea.estado === 'FINALIZADA') {
            if (tarea.fechaFinalizacion) {
                const finDate = new Date(tarea.fechaFinalizacion);
                finDate.setHours(0, 0, 0, 0); 
                if (finDate > limiteDate) {
                    stats.completadasAtrasadas++;
                } else {
                    stats.completadasATiempo++;
                }
            } else {
                stats.completadasATiempo++; 
            }
        } else {
            if (hoy > limiteDate) {
                stats.atrasadasVencidas++;
            } else {
                stats.faltantes++;
            }
        }
    });

    const avancePorcentaje = stats.total === 0 ? 0 : Math.round(((stats.completadasATiempo + stats.completadasAtrasadas) / stats.total) * 100);
    const handleVerTareasDelDia = () => {
        // Formateamos la fecha a YYYY-MM-DD para que el input type="date" la entienda
        const anio = diaSeleccionado.getFullYear();
        const mes = String(diaSeleccionado.getMonth() + 1).padStart(2, '0');
        const dia = String(diaSeleccionado.getDate()).padStart(2, '0');
        
        setFechaFiltroGlobal(`${anio}-${mes}-${dia}`); // Guardamos la fecha en el puente
        setVistaActiva('tareas'); // Cambiamos de pantalla
    };
    return (
        <div className="animation-fade-in space-y-6">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Panel de Control</p>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Resumen Operativo</h2>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Fecha Actual</p>
                    <p className="text-sm text-slate-300 font-bold capitalize">{hoy.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </header>

            {/* TARJETAS DE KPIs SUPERIORES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/30 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-slate-400 text-sm font-semibold mb-4">Total Tareas Activas</h3>
                    <p className="text-5xl font-black text-white tracking-tight">{tareasActivas.length}</p>
                    <p className="text-xs text-blue-400 mt-3 font-medium flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> En curso en la plataforma</p>
                </div>

                <div className="bg-slate-800/30 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-slate-400 text-sm font-semibold mb-4">Prioridad (Urgentes)</h3>
                    <p className="text-5xl font-black text-white tracking-tight">{tareasUrgentes.length}</p>
                    <p className="text-xs text-red-400 mt-3 font-medium flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div> Requieren atención inmediata</p>
                </div>

                <div className="bg-slate-800/30 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-slate-400 text-sm font-semibold mb-4">Completadas Hoy</h3>
                    <p className="text-5xl font-black text-white tracking-tight">{tareasCompletadasHoy.length}</p>
                    <p className="text-xs text-emerald-400 mt-3 font-medium flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg> Tareas finalizadas en el día</p>
                </div>
            </div>

            {/* SECCIÓN CENTRAL: VENCIMIENTOS Y RECIENTES CON SCROLL INDEPENDIENTE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CAJA 1: Próximas a Vencer */}
                <div className="bg-slate-800/30 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col h-[400px]">
                    <h3 className="text-slate-300 text-sm font-bold mb-6 flex items-center gap-2 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Próximas a Vencer
                    </h3>
                    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                        {proximasAVencer.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-8">No hay tareas pendientes.</p>
                        ) : (
                            proximasAVencer.map(tarea => (
                                <div key={tarea.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-700/30 transition-colors border border-transparent hover:border-slate-700/50 group">
                                    <div>
                                        <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{tarea.titulo}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Asignado a: <span className="text-slate-400">{tarea.asignado?.nombreCompleto || 'Sin asignar'}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-300">{formatFecha(tarea.fechaLimite)}</p>
                                        {tarea.prioridad === 'URGENTE' && <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded">Urgente</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* CAJA 2: Recién Completadas */}
                <div className="bg-slate-800/30 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col h-[400px]">
                    <h3 className="text-slate-300 text-sm font-bold mb-6 flex items-center gap-2 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Recién Completadas
                    </h3>
                    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                        {recienCompletadas.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-8">Aún no hay tareas completadas.</p>
                        ) : (
                            recienCompletadas.map(tarea => (
                                <div key={tarea.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-700/30 transition-colors border border-transparent hover:border-slate-700/50 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{tarea.titulo}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Por: <span className="text-slate-400">{tarea.asignado?.nombreCompleto || 'Desconocido'}</span></p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-medium">{tiempoTranscurrido(tarea.fechaFinalizacion)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* SECCIÓN INFERIOR: CALENDARIO Y DESGLOSE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CALENDARIO BÁSICO */}
                <div className="lg:col-span-2 bg-slate-800/30 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold">{diaSeleccionado.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setDiaSeleccionado(new Date(diaSeleccionado.getFullYear(), diaSeleccionado.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
                            <button onClick={() => setDiaSeleccionado(new Date(diaSeleccionado.getFullYear(), diaSeleccionado.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 mb-2">
                        <div>D</div><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: new Date(diaSeleccionado.getFullYear(), diaSeleccionado.getMonth() + 1, 0).getDate() }).map((_, i) => {
                            const dia = i + 1;
                            const current = new Date(diaSeleccionado.getFullYear(), diaSeleccionado.getMonth(), dia);
                            const isSelected = dia === diaSeleccionado.getDate();
                            
                            const tieneTareas = tareas.some(t => {
                                if (!t.fechaLimite) return false;
                                const [y, m, d] = t.fechaLimite.split('-');
                                return parseInt(y) === current.getFullYear() && parseInt(m) - 1 === current.getMonth() && parseInt(d) === current.getDate();
                            });

                            return (
                                <div key={dia} onClick={() => setDiaSeleccionado(current)} className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all text-sm font-bold ${isSelected ? 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-105' : 'hover:bg-slate-700/50 text-slate-300'}`}>
                                    {dia}
                                    {tieneTareas && <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-slate-900' : 'bg-yellow-500'}`}></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* DESGLOSE EXACTO DEL DÍA */}
                <div className="bg-slate-800/30 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col">
                    <div className="flex items-start gap-4 mb-8 pb-6 border-b border-slate-700/50">
                        <div className="text-4xl font-black text-white tracking-tighter">{diaSeleccionado.getDate()}</div>
                        <div className="mt-1">
                            <h4 className="text-lg font-bold text-yellow-500 capitalize">{diaSeleccionado.toLocaleDateString('es-MX', { month: 'long' })}</h4>
                            <p className="text-xs text-slate-400 capitalize">{diaSeleccionado.toLocaleDateString('es-MX', { weekday: 'long' })} - Resumen del día</p>
                        </div>
                    </div>

                    <div className="space-y-4 mt-2 flex-1">
                        <div className="flex justify-between items-center text-sm mb-4">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Total Tareas Vencimiento</span>
                            <span className="text-white font-bold text-lg bg-slate-700/50 px-2 rounded">{stats.total}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-700/20 transition-colors">
                            <span className="text-emerald-400 font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div> Completadas (A tiempo)</span>
                            <span className="text-emerald-400 font-bold">{stats.completadasATiempo}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-700/20 transition-colors">
                            <span className="text-yellow-500 font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div> Completadas (Atrasadas)</span>
                            <span className="text-yellow-500 font-bold">{stats.completadasAtrasadas}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-700/20 transition-colors">
                            <span className="text-blue-400 font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div> Faltantes (A tiempo)</span>
                            <span className="text-blue-400 font-bold">{stats.faltantes}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-700/20 transition-colors">
                            <span className="text-red-400 font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)] animate-pulse"></div> Atrasadas (Sin terminar)</span>
                            <span className="text-red-400 font-bold">{stats.atrasadasVencidas}</span>
                        </div>
                    </div>

                    {/* 👇 EL BOTÓN BIEN POSICIONADO 👇 */}
                    <button 
                        onClick={handleVerTareasDelDia}
                        className="w-full mt-6 py-2.5 bg-slate-700/40 hover:bg-slate-700/80 border border-slate-600/50 text-slate-300 hover:text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex justify-center items-center gap-2 active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        Ver Tareas del Día
                    </button>

                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avance Diario</span>
                            <span className="text-2xl font-black text-white">{avancePorcentaje}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(234,179,8,0.5)]" style={{ width: `${avancePorcentaje}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumenView;