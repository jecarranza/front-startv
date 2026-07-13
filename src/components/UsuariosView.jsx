import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser } from '../services/UserService';
import { getAllDepartamentos } from '../services/DepartamentoService';

const UsuariosView = ({ updateTrigger }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para los filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroDepartamento, setFiltroDepartamento] = useState('Todos');
    const [listaDepartamentos, setListaDepartamentos] = useState([]);
    
    // Estados del Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ 
        nombreCompleto: '', email: '', password: '', rol: 'EMPLEADO', departamentoId: '' 
    });

    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                const data = await getAllUsers();
                
                if (data && data.length > 0) {
                    setUsuarios(data);
                    const depsExtraidos = data.map(u => {
                        if (typeof u.departamento === 'object' && u.departamento !== null) {
                            return u.departamento.nombreDepartamento;
                        }
                        return u.departamento;
                    }).filter(Boolean); // Filter(Boolean) quita los nulos o vacíos
                    
                    const depsUnicos = [...new Set(depsExtraidos)];
                    setListaDepartamentos(depsUnicos);

                    // B) Leer el Token y aplicarlo SOLO si existe en la lista de departamentos de la BD
                    const token = localStorage.getItem('token'); 
                    if (token) {
                        try {
                            const cleanToken = token.replace('Bearer ', '').replace(/"/g, '');
                            const base64Url = cleanToken.split('.')[1];
                            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                            
                            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                            }).join(''));
                            
                            const payloadDecoded = JSON.parse(jsonPayload);
                            
                            // Validamos que el departamento del token exista realmente en la base de datos
                            if (payloadDecoded.departamento && 
                                payloadDecoded.departamento !== "Sin Departamento" &&
                                depsUnicos.includes(payloadDecoded.departamento)) {
                                
                                setFiltroDepartamento(payloadDecoded.departamento);
                            }
                        } catch (e) {
                            console.error("Error al decodificar el token:", e);
                        }
                    }
                }
            } catch (error) {
                console.error("Error al cargar los usuarios", error);
            }
            setLoading(false);
        };

        cargarDatos();
        cargarDatosMaestros(); // Aprovechamos para cargar los departamentos del modal
    }, [updateTrigger]);

    const cargarDatosMaestros = async () => {
        try {
            const deptosData = await getAllDepartamentos();
            setDepartamentos(deptosData || []);
        } catch (err) {}
    };

    // ==========================================
    // MOTOR DE BÚSQUEDA Y FILTRADO UNIFICADO
    // ==========================================
    const usuariosFiltrados = usuarios.filter(u => {
        // 1. Coincidencia de Búsqueda (Texto)
        const busqueda = searchTerm.toLowerCase();
        const nombre = u.nombreCompleto?.toLowerCase() || '';
        const correo = u.email?.toLowerCase() || '';
        const deptoNombre = u.departamento?.nombreDepartamento?.toLowerCase() || '';
        
        const coincideBusqueda = nombre.includes(busqueda) || correo.includes(busqueda) || deptoNombre.includes(busqueda);
        
        // 2. Coincidencia de Selector (Departamento)
        const nombreDep = u.departamento?.nombreDepartamento || 'Sin Departamento';
        const coincideFiltro = filtroDepartamento === 'Todos' || nombreDep === filtroDepartamento;
        
        return coincideBusqueda && coincideFiltro;
    });

    const handleNuevoUsuario = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({ nombreCompleto: '', email: '', password: '', rol: 'EMPLEADO', departamentoId: '' });
        setIsModalOpen(true);
    };

    const handleEditar = (usuario) => {
        setIsEditing(true);
        setEditId(usuario.id);
        setFormData({
            nombreCompleto: usuario.nombreCompleto,
            email: usuario.email,
            password: '', 
            rol: usuario.rol,
            departamentoId: usuario.departamento?.idDepartamento || '' 
        });
        setIsModalOpen(true);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nombreCompleto: formData.nombreCompleto,
            email: formData.email,
            password: formData.password,
            rol: formData.rol,
            departamento: formData.departamentoId ? { idDepartamento: parseInt(formData.departamentoId) } : null
        };

        try {
            if (isEditing) {
                await updateUser(editId, payload);
            } else {
                await createUser(payload);
            }
            setIsModalOpen(false);
            // Recargar usuarios tras crear/editar
            const data = await getAllUsers();
            setUsuarios(data || []);
        } catch (err) {
            alert(isEditing ? 'Error al actualizar el usuario.' : 'Error al registrar al usuario.');
        }
    };

    const handleEliminar = async (id) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario del sistema?')) {
            try {
                await deleteUser(id);
                // Recargar usuarios tras eliminar
                const data = await getAllUsers();
                setUsuarios(data || []);
            } catch (err) {
                alert('No se pudo eliminar el usuario.');
            }
        }
    };

    return (
        <div className="animation-fade-in flex flex-col h-[calc(100vh-96px)]">
            
            {/* HEADER CON BARRA DE BÚSQUEDA Y FILTRO */}
<header className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
                <div className="flex justify-between items-center w-full md:w-auto">
                    <div>
                        <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Administración</p>
                        <h2 className="text-3xl font-bold text-white">Catálogo de Usuarios</h2>
                    </div>
                    {/* BOTÓN + NUEVO USUARIO (Visible en móviles arriba, en desktop se alinea a la derecha) */}
                    <button 
                        onClick={handleNuevoUsuario}
                        className="md:hidden px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Nuevo
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* SELECTOR AUTOMÁTICO */}
                    <select
                        value={filtroDepartamento}
                        onChange={(e) => setFiltroDepartamento(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-yellow-500 font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-500/50 cursor-pointer outline-none"
                    >
                        <option value="Todos">Todos los departamentos</option>
                        {listaDepartamentos.map(dep => (
                            <option key={dep} value={dep}>{dep}</option>
                        ))}
                    </select>

                    {/* BUSCADOR CLÁSICO */}
                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar usuario o correo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500/50 placeholder-slate-500"
                        />
                    </div>

                    {/* BOTÓN + NUEVO USUARIO (Desktop) */}
                    <button 
                        onClick={handleNuevoUsuario}
                        className="hidden md:flex px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-lg transition-colors items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Nuevo Usuario
                    </button>
                </div>
            </header>

            {/* TABLA CON SCROLL AUTOMÁTICO REPARADO */}
            <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto custom-scrollbar flex-1 relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 shadow-sm">
                            <tr className="border-b border-slate-700/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <th className="p-4 pl-6">Nombre Completo</th>
                                <th className="p-4">Correo Electrónico</th>
                                <th className="p-4">Departamento</th>
                                <th className="p-4">Rol</th>
                                <th className="p-4 pr-6 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                            {/* 👇 AQUÍ YA USAMOS LA LISTA CORRECTA QUE TIENE EL FILTRO 👇 */}
                            {usuariosFiltrados.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-700/10 transition-colors group">
                                    <td className="p-4 pl-6 font-semibold text-white group-hover:text-yellow-500 transition-colors">{item.nombreCompleto}</td>
                                    <td className="p-4 text-slate-300">{item.email}</td>
                                    <td className="p-4 text-slate-400">{item.departamento?.nombreDepartamento || 'Sin asignar'}</td>
                                    <td className="p-4">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            item.rol === 'ADMIN' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                            {item.rol}
                                        </span>
                                    </td>
                                    <td className="p-4 pr-6 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button onClick={() => handleEditar(item)} className="text-slate-400 hover:text-yellow-400 transition-colors" title="Editar">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                            <button onClick={() => handleEliminar(item.id)} className="text-slate-400 hover:text-red-400 transition-colors" title="Eliminar">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {usuariosFiltrados.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No hay usuarios registrados en este departamento.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE CREACIÓN/EDICIÓN SE QUEDA IGUAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700/60 w-full max-w-md p-6 rounded-2xl shadow-2xl relative">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {isEditing ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Nombre Completo</label>
                                <input type="text" name="nombreCompleto" required value={formData.nombreCompleto} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" placeholder="Ej. Juan Pérez"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Correo Electrónico</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" placeholder="usuario@stargroup.com"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">
                                    {isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'}
                                </label>
                                <input type="password" name="password" required={!isEditing} value={formData.password} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" placeholder="••••••••"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Rol</label>
                                    <select name="rol" value={formData.rol} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500">
                                        <option value="EMPLEADO">EMPLEADO</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Departamento</label>
                                    <select 
                                        name="departamentoId" 
                                        required 
                                        value={formData.departamentoId} 
                                        onChange={handleInputChange} 
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                    >
                                        <option value="">Seleccione...</option>
                                        {departamentos.map(d => (
                                            <option key={d.idDepartamento} value={d.idDepartamento}>
                                                {d.nombreDepartamento}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="px-5 py-2 text-sm bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-colors">
                                    {isEditing ? 'Actualizar Cambios' : 'Guardar Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsuariosView;