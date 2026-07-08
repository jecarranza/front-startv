import React, { useState, useEffect } from 'react';
import { getAllDepartamentos, createDepartamento, updateDepartamento, deleteDepartamento } from '../services/DepartamentoService';

// 1. 👇 Recibimos updateTrigger como prop (parámetro)
const DepartamentosView = ({ updateTrigger }) => {
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // ESTADO PARA LA BARRA DE BÚSQUEDA
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    
    const [formData, setFormData] = useState({ 
        nombreDepartamento: '' 
    });

    // 2. 👇 Agregamos updateTrigger al arreglo de dependencias
    useEffect(() => {
        cargarDepartamentos();
    }, [updateTrigger]); // <--- ¡Esta es la clave de la actualización en vivo!

    const cargarDepartamentos = async () => {
        setLoading(true);
        try {
            const data = await getAllDepartamentos();
            setDepartamentos(data || []);
        } catch (err) {
            console.error("Error al cargar departamentos", err);
        }
        setLoading(false);
    };

    // ==========================================
    // MOTOR DE BÚSQUEDA EN TIEMPO REAL
    // ==========================================
    const departamentosParaMostrar = departamentos.filter(depto => {
        const busqueda = searchTerm.toLowerCase();
        const nombre = depto.nombreDepartamento?.toLowerCase() || '';
        const id = depto.idDepartamento?.toString() || '';
        
        return nombre.includes(busqueda) || id.includes(busqueda);
    });

    const handleNuevoDepto = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({ nombreDepartamento: '' });
        setIsModalOpen(true);
    };

    const handleEditar = (depto) => {
        setIsEditing(true);
        setEditId(depto.idDepartamento);
        setFormData({ nombreDepartamento: depto.nombreDepartamento });
        setIsModalOpen(true);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateDepartamento(editId, formData);
            } else {
                await createDepartamento(formData);
            }
            setIsModalOpen(false);
            cargarDepartamentos();
        } catch (err) {
            alert('Error al guardar el departamento.');
        }
    };

    const handleEliminar = async (id) => {
        if (window.confirm('¿Eliminar este departamento? Esto podría afectar a los usuarios asociados.')) {
            try {
                await deleteDepartamento(id);
                cargarDepartamentos();
            } catch (err) {
                alert('No se pudo eliminar el departamento.');
            }
        }
    };

    return (
        <div className="animation-fade-in flex flex-col h-full">
            
            {/* HEADER CON BARRA DE BÚSQUEDA */}
            <header className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Estructura</p>
                    <h2 className="text-3xl font-bold text-white">Catálogo de Departamentos</h2>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar área o ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder-slate-500"
                        />
                    </div>

                    <button 
                        onClick={handleNuevoDepto}
                        className="py-2.5 px-5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-[0_4px_14px_rgba(234,179,8,0.2)] hover:shadow-[0_6px_20px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Nuevo Departamento
                    </button>
                </div>
            </header>

            {/* TABLA CON SCROLL INDEPENDIENTE */}
            <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl max-h-[calc(100vh-220px)] flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 shadow-sm">
                            <tr className="border-b border-slate-700/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <th className="p-4 pl-6 w-24">ID</th>
                                <th className="p-4">Nombre del Departamento</th>
                                <th className="p-4 pr-6 text-center w-36">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                            {departamentosParaMostrar.map((item) => (
                                <tr key={item.idDepartamento} className="hover:bg-slate-700/10 transition-colors group">
                                    <td className="p-4 pl-6 font-mono text-slate-500 font-bold">#{item.idDepartamento}</td>
                                    <td className="p-4 font-semibold text-white group-hover:text-yellow-500 transition-colors">{item.nombreDepartamento}</td>
                                    <td className="p-4 pr-6 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button onClick={() => handleEditar(item)} className="text-slate-400 hover:text-yellow-400 transition-colors" title="Editar">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                            <button onClick={() => handleEliminar(item.idDepartamento)} className="text-slate-400 hover:text-red-400 transition-colors" title="Eliminar">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {departamentosParaMostrar.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-slate-500">
                                        {searchTerm ? 'No se encontraron departamentos con esos criterios.' : 'No hay departamentos registrados.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700/60 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {isEditing ? 'Editar Área' : 'Nuevo Departamento'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Nombre del Departamento</label>
                                <input type="text" name="nombreDepartamento" required value={formData.nombreDepartamento} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" placeholder="Ej. Análisis de Indicadores"/>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="px-5 py-2 text-sm bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-colors">
                                    {isEditing ? 'Guardar Cambios' : 'Crear Área'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartamentosView;