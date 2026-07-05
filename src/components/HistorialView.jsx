import React, { useState, useEffect } from 'react';
import { getHistorialGlobal } from '../services/auditoriaService';

const HistorialView = () => {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // NUEVOS ESTADOS PARA PAGINACIÓN
    const [pagina, setPagina] = useState(0);
    const [hayMasDatos, setHayMasDatos] = useState(true);

    // Se ejecuta al montar el componente (página 0) y cada vez que 'pagina' aumenta
    useEffect(() => {
        const cargarHistorial = async () => {
            setLoading(true);
            try {
                // Le pasamos la página actual y el tamaño (20) a tu servicio
                const data = await getHistorialGlobal(pagina, 20);
                
                if (data && data.length > 0) {
                    // Concatenamos el historial anterior con la nueva página que llega
                    setHistorial(prevHistorial => [...prevHistorial, ...data]);
                    
                    // Si el backend devuelve menos de 20, significa que llegamos al final del historial
                    if (data.length < 20) {
                        setHayMasDatos(false);
                    }
                } else {
                    setHayMasDatos(false); // Si llega vacío, ya no hay más datos
                }
            } catch (error) {
                console.error("Error al cargar historial", error);
                setHayMasDatos(false);
            }
            setLoading(false);
        };
        
        cargarHistorial();
    }, [pagina]);

    const historialFiltrado = historial.filter(h => {
        const busqueda = searchTerm.toLowerCase();
        return (h.responsable?.toLowerCase() || '').includes(busqueda) ||
               (h.entidad?.toLowerCase() || '').includes(busqueda) ||
               (h.detalles?.toLowerCase() || '').includes(busqueda);
    });

    const getAccionColor = (accion) => {
        switch (accion) {
            case 'CREACIÓN': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'MODIFICACIÓN': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'ELIMINACIÓN': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className="animation-fade-in flex flex-col h-full">
            <header className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Auditoría y Seguridad</p>
                    <h2 className="text-3xl font-bold text-white">Histórico de Cambios</h2>
                </div>
                
                <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar usuario, entidad o detalle..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500/50 placeholder-slate-500"
                    />
                </div>
            </header>

            <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl max-h-[calc(100vh-200px)] flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 shadow-sm">
                            <tr className="border-b border-slate-700/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <th className="p-4 pl-6">Fecha y Hora</th>
                                <th className="p-4">Responsable</th>
                                <th className="p-4">Acción</th>
                                <th className="p-4">Entidad Afectada</th>
                                <th className="p-4">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                            {historialFiltrado.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-700/10 transition-colors group">
                                    <td className="p-4 pl-6 text-slate-300 font-mono text-xs">
                                        {new Date(item.fechaCambio).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'medium' })}
                                    </td>
                                    <td className="p-4 text-white font-semibold flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-yellow-500 font-bold uppercase">
                                            {item.responsable.charAt(0)}
                                        </div>
                                        {item.responsable}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getAccionColor(item.accion)}`}>
                                            {item.accion}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-400 font-medium">{item.entidad}</td>
                                    <td className="p-4 text-slate-300 italic">"{item.detalles}"</td>
                                </tr>
                            ))}
                            {historialFiltrado.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        No hay registros de auditoría que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    
                    {/* 👇 BOTÓN DE PAGINACIÓN 👇 */}
                    {hayMasDatos && searchTerm === '' && (
                        <div className="p-4 flex justify-center border-t border-slate-700/50 bg-slate-900/50">
                            <button 
                                onClick={() => setPagina(prev => prev + 1)}
                                disabled={loading}
                                className="px-6 py-2.5 bg-slate-800 text-yellow-500 font-bold text-sm rounded-xl border border-yellow-500/30 hover:bg-slate-700 hover:border-yellow-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Cargando...
                                    </>
                                ) : (
                                    "Cargar más movimientos..."
                                )}
                            </button>
                        </div>
                    )}
                    
                </div>
            </div>
        </div>
    );
};

export default HistorialView;