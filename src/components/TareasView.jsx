import React, { useState, useEffect, useContext } from 'react';
import { getAllTareas, createTarea, updateTarea, updateEstadoTarea, deleteTarea, uploadEvidenciaTarea, reportarIncidenciaTarea } from '../services/TareaService';
import { getAllUsers } from '../services/UserService';
import { getAllDepartamentos } from '../services/DepartamentoService';
import { AuthContext } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_API_URL;

const TareasView = ({ updateTrigger }) => {
    const { user } = useContext(AuthContext);

    const [tareas, setTareas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [filtroFecha, setFiltroFecha] = useState('');
    const [filtroEmpleado, setFiltroEmpleado] = useState('');
    
    const [tabActiva, setTabActiva] = useState('activas');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        notas: '',
        recursosUtilizados: '',
        creadorId: '',
        asignadoId: '',
        compartidosIds: [],
        departamentoId: '',
        fechaLimite: '',
        frecuencia: 'UNICA',
        prioridad: 'NORMAL',
        tipoAsignacion: 'EMPLEADO'
    });

    const [isEvidenciaModalOpen, setIsEvidenciaModalOpen] = useState(false);
    const [tareaACompletar, setTareaACompletar] = useState(null);
    const [archivoEvidencia, setArchivoEvidencia] = useState(null);

    const [isIncidenciaModalOpen, setIsIncidenciaModalOpen] = useState(false);
    const [tareaARechazar, setTareaARechazar] = useState(null);
    const [incidenciaTexto, setIncidenciaTexto] = useState('');

    useEffect(() => {
        cargarDatosMaestros();
    }, [updateTrigger]);

    const cargarDatosMaestros = async () => {
        setLoading(true);
        try {
            const deptosData = await getAllDepartamentos();
            setDepartamentos(deptosData || []);
        } catch (err) { }

        try {
            const usuariosData = await getAllUsers();
            setUsuarios(usuariosData || []);
        } catch (err) { }

        try {
            const tareasData = await getAllTareas();
            setTareas(tareasData || []);
        } catch (err) { }
        setLoading(false);
    };

    const token = localStorage.getItem('token');
    let rolDelToken = 'EMPLEADO';
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            rolDelToken = payload.rol || payload.role || 'EMPLEADO';
        } catch (e) {}
    }
    const esAdminMenu = rolDelToken === 'ADMIN' || rolDelToken === 'ROLE_ADMIN';

    const usuarioActualDB = usuarios.find(u => u.email === user?.email);
    const miDeptoId = usuarioActualDB?.departamento?.idDepartamento;

    const usuariosTopBar = usuarios.filter(u => {
        if (!esAdminMenu) return false; 
        const esDeMiArea = String(u.departamento?.idDepartamento) === String(miDeptoId);
        const esAdminGlobal = u.rol === 'ADMIN' || u.rol === 'ROLE_ADMIN';
        return esDeMiArea || esAdminGlobal;
    });

    const deptosModal = formData.tipoAsignacion === 'ADMIN' 
        ? departamentos 
        : departamentos.filter(d => String(d.idDepartamento) === String(miDeptoId));

        const usuariosModal = usuarios.filter(u => {
        const rolUser = u.rol ? String(u.rol).toUpperCase() : '';
        const esAdmin = rolUser === 'ADMIN' || rolUser === 'ROLE_ADMIN';

        if (formData.tipoAsignacion === 'EMPLEADO') {
            // 👇 MAGIA: Simplemente devolvemos a TODOS los que estén en este departamento, sin importar su rol
            return String(u.departamento?.idDepartamento) === String(miDeptoId);
        } else {
            if (!esAdmin) return false;
            if (!formData.departamentoId) return true;

            const idDeptoUsuario = u.departamento?.idDepartamento;
            const esSuperAdmin = !idDeptoUsuario; 
            const coincideDepto = String(idDeptoUsuario) === String(formData.departamentoId);
                
            return coincideDepto || esSuperAdmin;
        }
    });

    let tareasProcesadas = tareas.filter(tarea => {
        const busqueda = searchTerm.toLowerCase();
        const titulo = tarea.titulo?.toLowerCase() || '';
        const asignado = tarea.asignado?.nombreCompleto?.toLowerCase() || 'sin asignar';
        const coincideTexto = titulo.includes(busqueda) || asignado.includes(busqueda);

        const coincideFecha = filtroFecha ? (tarea.fechaLimite && tarea.fechaLimite.startsWith(filtroFecha)) : true;
        const coincideEmpleado = filtroEmpleado ? (tarea.asignado?.id?.toString() === filtroEmpleado) : true;

        const coincideTab = tabActiva === 'activas' 
            ? (tarea.estado !== 'COMPLETADA' && tarea.estado !== 'FINALIZADA')
            : (tarea.estado === 'COMPLETADA' || tarea.estado === 'FINALIZADA');

        return coincideTexto && coincideFecha && coincideEmpleado && coincideTab;
    });

    // 👇 MAGIA FRONTEND: Ordenamiento dinámico que flota las urgentes manuales y las automáticas (1 día o menos)
    if (tabActiva === 'activas') {
        tareasProcesadas.sort((a, b) => {
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            
            const getDias = (f) => {
                if(!f) return 999;
                const d = new Date(f.split('-')[0], f.split('-')[1] - 1, f.split('-')[2]);
                return Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            };

            const aUrgente = a.prioridad === 'URGENTE' || getDias(a.fechaLimite) <= 1;
            const bUrgente = b.prioridad === 'URGENTE' || getDias(b.fechaLimite) <= 1;

            if (aUrgente && !bUrgente) return -1;
            if (bUrgente && !aUrgente) return 1;
            
            // Si tienen la misma prioridad, que salgan primero las de fecha más cercana
            return getDias(a.fechaLimite) - getDias(b.fechaLimite); 
        });
    }

    const handleNuevaTarea = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({
            titulo: '', 
            descripcion: '',
            notas: '',
            recursosUtilizados: '',
            creadorId: usuarioActualDB?.id || '',
            asignadoId: '',
            departamentoId: miDeptoId || '',
            compartidosIds: [],
            fechaLimite: '',
            frecuencia: 'UNICA',
            prioridad: 'NORMAL',
            tipoAsignacion: 'EMPLEADO'
        });
        setIsModalOpen(true);
    };

    const handleEditar = (tarea) => {
        setIsEditing(true);
        setEditId(tarea.id);
        
        const rolAsignado = tarea.asignado?.rol ? String(tarea.asignado.rol).toUpperCase() : '';
        const esAdminAsignado = rolAsignado === 'ADMIN' || rolAsignado === 'ROLE_ADMIN';
        const esOtroDepto = String(tarea.departamento?.idDepartamento) !== String(miDeptoId);
        const tipoAsig = (esAdminAsignado || esOtroDepto) ? 'ADMIN' : 'EMPLEADO';

        setFormData({
            titulo: tarea.titulo, descripcion: tarea.descripcion || '', notas: tarea.notas || '',
            recursosUtilizados: tarea.recursosUtilizados || '', creadorId: tarea.creador?.id || '',
            asignadoId: tarea.asignado?.id || '', departamentoId: tarea.departamento?.idDepartamento || '',
            compartidosIds: tarea.compartidos?.map(c => c.id) || [],
            fechaLimite: tarea.fechaLimite || '', frecuencia: tarea.frecuencia || 'UNICA',
            prioridad: tarea.prioridad || 'NORMAL',
            tipoAsignacion: tipoAsig
        });
        setIsModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'tipoAsignacion') {
            setFormData({
                ...formData,
                tipoAsignacion: value,
                departamentoId: value === 'EMPLEADO' ? (miDeptoId || '') : '',
                asignadoId: ''
            });
        } else if (name === 'departamentoId' && formData.tipoAsignacion === 'ADMIN') {
            setFormData({
                ...formData,
                departamentoId: value,
                asignadoId: '' 
            });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleCambiarEstado = async (id, nuevoEstado) => {
        if (nuevoEstado === 'COMPLETADA') {
            setTareaACompletar(id);
            setArchivoEvidencia(null);
            setIsEvidenciaModalOpen(true);
        } else {
            try {
                await updateEstadoTarea(id, nuevoEstado);
                cargarDatosMaestros();
            } catch (err) { alert('Error al actualizar el estado de la tarea.'); }
        }
    };

    const handleSubirEvidencia = async (e) => {
        e.preventDefault();
        if (!archivoEvidencia) return alert('Debes adjuntar una captura de pantalla.');
        try {
            await uploadEvidenciaTarea(tareaACompletar, archivoEvidencia);
            setIsEvidenciaModalOpen(false);
            cargarDatosMaestros();
        } catch (err) { alert('Error al subir la evidencia.'); }
    };

    const abrirModalIncidencia = (id) => {
        setTareaARechazar(id);
        setIncidenciaTexto('');
        setIsIncidenciaModalOpen(true);
    };

    const handleReportarIncidencia = async (e) => {
        e.preventDefault();
        if (!incidenciaTexto.trim()) return alert('Debes explicar por qué rechazas la tarea.');
        try {
            await reportarIncidenciaTarea(tareaARechazar, incidenciaTexto);
            setIsIncidenciaModalOpen(false);
            setTabActiva('activas'); 
            cargarDatosMaestros();
        } catch (err) { alert('Error al reportar incidencia.'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            compartidosIds: formData.compartidosIds,
            creadorId: formData.creadorId ? parseInt(formData.creadorId) : null,
            asignadoId: formData.asignadoId ? parseInt(formData.asignadoId) : null,
            departamentoId: formData.departamentoId ? parseInt(formData.departamentoId) : null,
            fechaLimite: formData.fechaLimite || null
        };

        try {
            if (isEditing) await updateTarea(editId, payload);
            else await createTarea(payload);
            setIsModalOpen(false);
            cargarDatosMaestros();
        } catch (err) { alert('Error al guardar la tarea.'); }
    };

    const handleEliminar = async (id) => {
        if (window.confirm('¿Eliminar esta tarea de forma permanente?')) {
            try { await deleteTarea(id); cargarDatosMaestros(); } catch (err) { }
        }
    };

    const evaluarVencimiento = (tarea) => {
        if (tarea.estado === 'COMPLETADA' || tarea.estado === 'FINALIZADA') {
            return { texto: 'Completada', clases: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        }
        if (!tarea.fechaLimite) return { texto: 'Sin límite', clases: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0); 
        const limite = new Date(tarea.fechaLimite.split('-')[0], tarea.fechaLimite.split('-')[1] - 1, tarea.fechaLimite.split('-')[2]);
        const diffDias = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDias < 0) return { texto: `Vencida por ${Math.abs(diffDias)} d`, clases: 'text-red-400 bg-red-500/10 border-red-500/20 font-bold animate-pulse' };
        if (diffDias === 0) return { texto: 'Vence HOY', clases: 'text-orange-400 bg-orange-500/10 border-orange-500/20 font-bold' };
        return { texto: `Vence en ${diffDias} d`, clases: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    };

    const getStatusBadge = (estado) => {
        switch (estado) {
            case 'COMPLETADA': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'EN_CURSO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'BLOQUEADA': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'NO_INICIADA': default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const formatearFechaCreacion = (fechaString) => {
        if (!fechaString) return '---';
        try {
            const fecha = new Date(fechaString);
            return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (error) {
            return '---';
        }
    };

    return (
        <div className="animation-fade-in flex flex-col h-full">
            <header className="mb-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4">
                    <div>
                        <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Operaciones</p>
                        <h2 className="text-3xl font-bold text-white">Gestión de Tareas</h2>
                    </div>
                    {esAdminMenu && (
                        <button onClick={handleNuevaTarea} className="py-2.5 px-5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-[0_4px_14px_rgba(234,179,8,0.2)] hover:shadow-[0_6px_20px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            Nueva Tarea
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/30 p-3 rounded-2xl border border-slate-700/50">
                    <div className="relative">
                        <input type="text" placeholder="Buscar título..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500" />
                    </div>
                    <div className="relative">
                        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 [&::-webkit-calendar-picker-indicator]:invert text-slate-400" />
                    </div>
                    <div className="relative">
                        <select value={filtroEmpleado} onChange={(e) => setFiltroEmpleado(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 appearance-none">
                            <option value="">Todos los empleados</option>
                            {usuariosTopBar.map(u => <option key={u.id} value={u.id}>{u.nombreCompleto}</option>)}
                        </select>
                    </div>
                </div>
            </header>

            <div className="flex gap-6 mb-4 border-b border-slate-700/50">
                <button onClick={() => setTabActiva('activas')} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tabActiva === 'activas' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                    Tareas Activas
                </button>
                <button onClick={() => setTabActiva('historial')} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tabActiva === 'historial' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                    Historial de Completadas
                </button>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl max-h-[calc(100vh-320px)] flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 shadow-sm">
                            <tr className="border-b border-slate-700/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <th className="p-4 pl-6">Título</th>
                                <th className="p-4">Fecha Creación</th>
                                <th className="p-4">Asignado A</th>
                                {tabActiva === 'activas' && <th className="p-4">Recursos</th>}
                                <th className="p-4">Vencimiento</th>
                                <th className="p-4">Estado</th>
                                {tabActiva === 'historial' && <th className="p-4 text-center">Prueba</th>}
                                {esAdminMenu && <th className="p-4 pr-6 text-center">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                            {tareasProcesadas.map((item) => {
                                const alertaVencimiento = evaluarVencimiento(item);
                                
                                // 👇 MAGIA: Evaluamos dinámicamente cuántos días le quedan
                                let diasRestantes = 999;
                                if (item.fechaLimite) {
                                    const hoy = new Date(); hoy.setHours(0, 0, 0, 0); 
                                    const limite = new Date(item.fechaLimite.split('-')[0], item.fechaLimite.split('-')[1] - 1, item.fechaLimite.split('-')[2]);
                                    diasRestantes = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                                }

                                // Es urgente si la BD dice "URGENTE", O si el tiempo nos alcanzó (<= 1 día)
                                const esUrgente = (item.prioridad === 'URGENTE' || (item.fechaLimite && diasRestantes <= 1)) && tabActiva === 'activas';
                                const esRecurrente = item.frecuencia && item.frecuencia.toUpperCase() !== 'UNICA'; 

                                return (
                                    <tr key={item.id} className={`transition-colors group relative ${esUrgente ? 'bg-red-500/5 border-l-4 border-l-red-500' : 'hover:bg-slate-700/10 border-l-4 border-l-transparent'}`}>
                                        <td className="p-4 pl-4 font-semibold text-white group-hover:text-yellow-500 transition-colors w-1/3">
                                            <div className="flex items-center gap-2">
                                                {item.titulo}
                                                {esRecurrente && (
                                                    <svg className="w-4 h-4 text-blue-400 opacity-70 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24" title={`Tarea repetitiva: ${item.frecuencia}`}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                    </svg>
                                                )}
                                                {esUrgente && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-500 text-white animate-pulse">URGENTE</span>}
                                            </div>
                                            <p className="text-xs text-slate-500 font-normal mt-0.5 truncate">{item.descripcion}</p>
                                            
                                            {item.incidencia && tabActiva === 'activas' && (
                                                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-start gap-2">
                                                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                    <span><strong>Rechazada:</strong> {item.incidencia}</span>
                                                </div>
                                            )}
                                        </td>
                                        
                                        <td className="p-4 text-slate-400 text-xs font-medium">
                                            {formatearFechaCreacion(item.fechaCreacion)}
                                        </td>

                                        <td className="p-4">
                                            <span className="text-white font-medium block">{item.asignado?.nombreCompleto || 'Sin Asignar'}</span>
                                            {item.compartidos && item.compartidos.length > 0 && (
                                                <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1">
                                                    {item.compartidos.map(c => (
                                                        <span key={c.id} className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400" title="En copia (Compartido)">
                                                            + {c.nombreCompleto.split(' ')[0]}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        
                                        {/* 👇 NUEVO DATO (Solo se muestra en Activas) 👇 */}
                                        {tabActiva === 'activas' && (
                                            <td className="p-4 text-slate-400 text-xs max-w-[150px] truncate" title={item.recursosUtilizados}>
                                                {item.recursosUtilizados || '---'}
                                            </td>
                                        )}

                                        <td className="p-4">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider border ${alertaVencimiento.clases}`}>{alertaVencimiento.texto}</span>
                                        </td>
                                        <td className="p-4">
                                            <select value={item.estado} onChange={(e) => handleCambiarEstado(item.id, e.target.value)} className={`px-2.5 py-1 rounded-full text-xs font-bold border outline-none cursor-pointer appearance-none ${getStatusBadge(item.estado)}`}>
                                                <option value="NO_INICIADA" className="bg-slate-800 text-white">NO INICIADA</option>
                                                <option value="EN_CURSO" className="bg-slate-800 text-white">EN CURSO</option>
                                                <option value="BLOQUEADA" className="bg-slate-800 text-white">BLOQUEADA</option>
                                                <option value="COMPLETADA" className="bg-slate-800 text-white">COMPLETADA</option>
                                            </select>
                                        </td>

                                        {tabActiva === 'historial' && (
                                            <td className="p-4 text-center">
                                                {item.evidenciaUrl ? (
                                                    <a href={`${BACKEND_URL}${item.evidenciaUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all active:scale-95">
                                                        Ver Prueba
                                                    </a>
                                                ) : <span className="text-slate-500 text-xs italic">Sin archivo</span>}
                                            </td>
                                        )}
                                        
                                        {esAdminMenu && (
                                            <td className="p-4 pr-6 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    {tabActiva === 'historial' && (
                                                        <button onClick={() => abrirModalIncidencia(item.id)} className="text-red-400 hover:text-red-300 font-bold text-xs bg-red-500/10 px-2 py-1 rounded-lg transition-colors border border-red-500/20" title="Reportar Incidencia y Rechazar">
                                                            RECHAZAR
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleEditar(item)} className="text-slate-400 hover:text-yellow-400 transition-colors" title="Editar Detalles">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                    </button>
                                                    <button onClick={() => handleEliminar(item.id)} className="text-slate-400 hover:text-red-400 transition-colors" title="Eliminar">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700/60 w-full max-w-4xl p-6 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-bold text-white mb-4">{isEditing ? 'Detalles de la Tarea' : 'Crear Nueva Tarea'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Título de la Tarea</label>
                                    <input type="text" name="titulo" required value={formData.titulo} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-orange-400 uppercase mb-1">Fecha Límite</label>
                                    <input type="date" name="fechaLimite" value={formData.fechaLimite} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-orange-500 [&::-webkit-calendar-picker-indicator]:invert" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-red-400 uppercase mb-1">Prioridad</label>
                                    <select name="prioridad" value={formData.prioridad} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-bold">
                                        <option value="BAJA">Baja</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="ALTA">Alta</option>
                                        <option value="URGENTE">🔥 URGENTE</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Descripción</label>
                                    <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Recursos Utilizados</label>
                                    <textarea name="recursosUtilizados" value={formData.recursosUtilizados} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"></textarea>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Tipo de Asignación</label>
                                    <select name="tipoAsignacion" value={formData.tipoAsignacion} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500">
                                        <option value="EMPLEADO">Mi Equipo (Colaboradores)</option>
                                        <option value="ADMIN">Otra Área (Admin)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Departamento</label>
                                    <select name="departamentoId" required disabled={formData.tipoAsignacion === 'EMPLEADO'} value={formData.departamentoId} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <option value="">Seleccione...</option>
                                        {deptosModal.map(d => <option key={d.idDepartamento} value={d.idDepartamento}>{d.nombreDepartamento}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Asignado A</label>
                                    <select name="asignadoId" value={formData.asignadoId} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500">
                                        <option value="">Sin Asignar</option>
                                        
                                        {usuariosModal.map(u => {
                                            const rolUser = u.rol ? String(u.rol).toUpperCase() : '';
                                            const etiquetaAdmin = (rolUser === 'ADMIN' || rolUser === 'ROLE_ADMIN') ? ' 👑' : '';
                                            const nombreDepto = u.departamento ? ` (${u.departamento.nombreDepartamento})` : '';
                                            return (
                                                <option key={u.id} value={u.id}>
                                                    {u.nombreCompleto}{etiquetaAdmin}{formData.tipoAsignacion === 'ADMIN' ? nombreDepto : ''}
                                                </option>
                                            );
                                        })}
                                        
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Repetir Tarea</label>
                                    <select name="frecuencia" value={formData.frecuencia} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500">
                                        <option value="UNICA">No repetir (Única)</option>
                                        <option value="DIARIA">Diariamente (L-V)</option>
                                        <option value="SEMANAL">Semanalmente</option>
                                        <option value="MENSUAL">Mensualmente</option>
                                    </select>
                                </div>
                                {/* SECCIÓN: COMPARTIR TAREA (CC) */}
                            {formData.tipoAsignacion === 'EMPLEADO' && usuariosModal.filter(u => String(u.id) !== String(formData.asignadoId)).length > 0 && (
                                <div className="md:col-span-4 mt-2 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        Compartir tarea con (Colaboradores en copia):
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {usuariosModal.filter(u => String(u.id) !== String(formData.asignadoId)).map(u => (
                                            <label key={u.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 hover:border-yellow-500/50 transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData.compartidosIds.includes(u.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({...formData, compartidosIds: [...formData.compartidosIds, u.id]});
                                                        } else {
                                                            setFormData({...formData, compartidosIds: formData.compartidosIds.filter(id => id !== u.id)});
                                                        }
                                                    }}
                                                    className="rounded border-slate-600 text-yellow-500 focus:ring-yellow-500 bg-slate-700 w-4 h-4 cursor-pointer"
                                                />
                                                <span className="truncate font-medium">{u.nombreCompleto}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="px-5 py-2 text-sm bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-colors">{isEditing ? 'Actualizar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEvidenciaModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-md p-6 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.15)] relative">
                        <h3 className="text-xl font-bold text-white mb-2">Completar Tarea</h3>
                        <p className="text-slate-400 text-sm mb-6">Adjunta evidencia (imagen/PDF) para marcarla como completada.</p>
                        
                        <form onSubmit={handleSubirEvidencia}>
                            
                            {/* 👇 NUEVO DISEÑO DEL INPUT FILE 👇 */}
                            <div className="mb-6">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 hover:border-emerald-500/50 transition-all group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {archivoEvidencia ? (
                                            <>
                                                {/* Vista cuando YA se seleccionó un archivo */}
                                                <svg className="w-8 h-8 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                <p className="text-sm text-emerald-400 font-semibold text-center px-4 truncate max-w-[16rem]">{archivoEvidencia.name}</p>
                                                <p className="text-xs text-slate-500 mt-1">Clic para cambiar archivo</p>
                                            </>
                                        ) : (
                                            <>
                                                {/* Vista cuando AÚN NO hay archivo */}
                                                <svg className="w-8 h-8 text-slate-400 mb-2 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                                <p className="mb-1 text-sm text-slate-400 group-hover:text-slate-300"><span className="font-bold text-emerald-500">Haz clic para subir</span> o arrastra tu archivo</p>
                                                <p className="text-xs text-slate-500">Formatos PNG, JPG o PDF</p>
                                            </>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*,.pdf" 
                                        onChange={(e) => setArchivoEvidencia(e.target.files[0])} 
                                    />
                                </label>
                            </div>
                            {/* 👆 FIN DEL NUEVO DISEÑO 👆 */}

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsEvidenciaModalOpen(false); setArchivoEvidencia(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={!archivoEvidencia} className="px-5 py-2 text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    Subir Evidencia
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isIncidenciaModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-red-500/30 w-full max-w-md p-6 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                        <h3 className="text-xl font-bold text-red-500 mb-2">Rechazar Tarea</h3>
                        <p className="text-slate-400 text-sm mb-4">La tarea volverá al panel del empleado con prioridad <strong className="text-red-400">URGENTE</strong>.</p>
                        <form onSubmit={handleReportarIncidencia}>
                            <textarea required value={incidenciaTexto} onChange={(e) => setIncidenciaTexto(e.target.value)} rows="4" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-1 focus:ring-red-500 mb-4" placeholder="Ej. La imagen adjunta no es legible, favor de volver a subirla..."></textarea>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsIncidenciaModalOpen(false)} className="px-4 py-2 text-sm text-slate-400">Cancelar</button>
                                <button type="submit" className="px-5 py-2 text-sm bg-red-500 text-white font-bold rounded-xl">Rechazar y Notificar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TareasView;