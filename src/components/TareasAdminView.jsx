import React, { useState, useEffect, useContext } from 'react';
import { getAllTareas, updateTarea } from '../services/TareaService';
import { getAllUsers } from '../services/UserService';
import { AuthContext } from '../context/AuthContext';

const TareasAdminView = ({ updateTrigger }) => {
    const { user } = useContext(AuthContext);

    const [tareas, setTareas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para el modal de asignación rápida
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tareaAAsignar, setTareaAAsignar] = useState(null);
    const [colaboradorSeleccionado, setColaboradorColaborador] = useState('');

    useEffect(() => {
        cargarDatos();
    }, [updateTrigger]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const usersData = await getAllUsers();
            setUsuarios(usersData || []);
            const tareasData = await getAllTareas();
            setTareas(tareasData || []);
        } catch (err) {
            console.error("Error al cargar datos en bandeja admin:", err);
        }
        setLoading(false);
    };

    const miUsuarioDB = usuarios.find(u => u.email === user?.email);
    const miDeptoId = miUsuarioDB?.departamento?.idDepartamento;

    // ========================================================
    // FILTRADO: Tareas asignadas a este Admin (o su depto) creadas por OTRO admin,
    // que todavía están en estatus inicial (pendientes de delegar).
    // ========================================================
    const tareasPorDelegar = tareas.filter(t => {
        const perteneceAMiDepto = t.departamento?.idDepartamento === miDeptoId;
        const estaAsignadaAMiOMensajeria = t.asignado?.id === miUsuarioDB?.id || t.asignado?.rol === 'ADMIN';
        const estaPendiente = t.estado !== 'COMPLETADA' && t.estado !== 'FINALIZADA';
        const creadaPorOtro = t.creador?.id !== miUsuarioDB?.id;

        return perteneceAMiDepto && estaAsignadaAMiOMensajeria && estaPendiente && creadaPorOtro;
    });

    // Filtramos solo los empleados de mi área para asignárselas
    const misColaboradores = usuarios.filter(u => u.departamento?.idDepartamento === miDeptoId && u.rol !== 'ADMIN');

    const abrirModalAsignacion = (tarea) => {
        setTareaAAsignar(tarea);
        setColaboradorColaborador('');
        setIsModalOpen(true);
    };

    const handleConfirmarAsignacion = async (e) => {
        e.preventDefault();
        if (!colaboradorSeleccionado) return alert('Por favor, selecciona un colaborador.');

        // Construimos el payload respetando toda la metadata que el primer admin llenó
        const payload = {
            titulo: tareaAAsignar.titulo,
            descripcion: tareaAAsignar.descripcion,
            notas: tareaAAsignar.notas,
            fechaLimite: tareaAAsignar.fechaLimite,
            frecuencia: tareaAAsignar.frecuencia,
            prioridad: tareaAAsignar.prioridad,
            recursosUtilitarios: tareaAAsignar.recursosUtilizados,
            evidenciaUrl: tareaAAsignar.evidenciaUrl,
            departamentoId: tareaAAsignar.departamento?.idDepartamento,
            creadorId: tareaAAsignar.creador?.id,
            asignadoId: parseInt(colaboradorSeleccionado) // 👈 AQUÍ SUCEDE LA MAGIA
        };

        try {
            await updateTarea(tareaAAsignar.id, payload);
            setIsModalOpen(false);
            cargarDatos(); // Recargar localmente
        } catch (err) {
            alert('Error al delegar la tarea al colaborador.');
        }
    };

    return (
        <div className="animation-fade-in flex flex-col h-full">
            <header className="mb-6">
                <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Panel de Control</p>
                <h2 className="text-3xl font-bold text-white">Bandeja Admin (Tareas Recibidas)</h2>
                <p className="text-xs text-slate-500 mt-1">Gestión de requerimientos interdepartamentales pendientes de asignación.</p>
            </header>

            <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl flex-1 flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 shadow-sm">
                            <tr className="border-b border-slate-700/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <th className="p-4 pl-6">Tarea</th>
                                <th className="p-4">Solicitado Por</th>
                                <th className="p-4">Área Destino</th>
                                <th className="p-4">Vencimiento Original</th>
                                <th className="p-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                            {tareasPorDelegar.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-slate-500 text-center py-12 italic">
                                        No tienes tareas pendientes de asignar por otros administradores.
                                    </td>
                                        </tr>
                            ) : (
                                tareasPorDelegar.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-700/10 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="font-semibold text-white flex items-center gap-2">
                                                {item.titulo}
                                                {item.prioridad === 'URGENTE' && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-500 text-white animate-pulse">URGENTE</span>}
                                            </div>
                                            <p className="text-xs text-slate-500 font-normal mt-0.5 max-w-md truncate">{item.descripcion}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-slate-300 font-medium">{item.creador?.nombreCompleto}</span>
                                            <p className="text-[11px] text-slate-500">{item.creador?.email}</p>
                                        </td>
                                        <td className="p-4 text-slate-400">{item.departamento?.nombreDepartamento}</td>
                                        <td className="p-4 text-slate-300 font-bold">
                                            {item.fechaLimite ? new Date(item.fechaLimite + "T00:00:00").toLocaleDateString('es-MX', {day:'2-digit', month:'short'}) : 'Sin límite'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => abrirModalAsignacion(item)} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md">
                                                Asignar Colaborador
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE DELEGACIÓN RÁPIDA */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700/60 w-full max-w-md p-6 rounded-2xl shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-1">Delegar Requerimiento</h3>
                        <p className="text-xs text-slate-400 mb-4">Selecciona qué colaborador de tu equipo ejecutará la tarea: <strong className="text-yellow-500">"{tareaAAsignar?.titulo}"</strong></p>
                        
                        <form onSubmit={handleConfirmarAsignacion} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Colaborador Responsable</label>
                                <select 
                                    required 
                                    value={colaboradorSeleccionado} 
                                    onChange={(e) => setColaboradorColaborador(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-sm"
                                >
                                    <option value="">Selecciona un empleado de tu área...</option>
                                    {misColaboradores.map(colab => (
                                        <option key={colab.id} value={colab.id}>{colab.nombreCompleto}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="px-5 py-2 text-xs bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-colors">Confirmar y Notificar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TareasAdminView;