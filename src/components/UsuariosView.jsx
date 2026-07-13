import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser } from '../services/UserService';
import { getAllDepartamentos } from '../services/DepartamentoService';

// 1. 👇 Recibimos updateTrigger como prop
const UsuariosView = ({ updateTrigger }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // ESTADO PARA LA BARRA DE BÚSQUEDA
    const [searchTerm, setSearchTerm] = useState('');

    const [filtroDepartamento, setFiltroDepartamento] = useState('Todos');
    const [listaDepartamentos, setListaDepartamentos] = useState([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    
    const [formData, setFormData] = useState({ 
        nombreCompleto: '', 
        email: '', 
        password: '', 
        rol: 'EMPLEADO', 
        departamentoId: '' 
    });

    // 2. 👇 Agregamos updateTrigger al arreglo de dependencias
useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                const data = await obtenerUsuarios(); // O el nombre de tu función de API
                
                if (data && data.length > 0) {
                    setUsuarios(data);

                    // A) Extraemos los nombres de los departamentos únicos para llenar el <select>
                    const depsUnicos = [...new Set(data.map(u => u.departamento?.nombreDepartamento).filter(Boolean))];
                    setListaDepartamentos(depsUnicos);

                    // B) Leemos el Token para auto-seleccionar el departamento del usuario actual
                    const token = localStorage.getItem('token'); 
                    if (token) {
                        try {
                            // Decodificamos el JWT (La información viene en la segunda parte del token separada por un punto)
                            const payloadBase64 = token.split('.')[1];
                            const payloadDecoded = JSON.parse(atob(payloadBase64));
                            
                            // Si el token tiene un departamento y no dice "Sin Departamento", lo aplicamos
                            if (payloadDecoded.departamento && payloadDecoded.departamento !== "Sin Departamento") {
                                setFiltroDepartamento(payloadDecoded.departamento);
                            }
                        } catch (e) {
                            console.error("Error al leer el token", e);
                        }
                    }
                }
            } catch (error) {
                console.error("Error al cargar los usuarios", error);
            }
            setLoading(false);
        };

        cargarDatos();
    }, [updateTrigger]);

    const usuariosFiltrados = usuarios.filter(u => {
        // Filtro 1: Buscador de texto
        const busqueda = searchTerm.toLowerCase();
        const coincideBusqueda = (u.nombreCompleto?.toLowerCase() || '').includes(busqueda) || 
                                 (u.email?.toLowerCase() || '').includes(busqueda);
        
        // Filtro 2: Selector de departamento
        const nombreDep = u.departamento?.nombreDepartamento || 'Sin Departamento';
        const coincideFiltro = filtroDepartamento === 'Todos' || nombreDep === filtroDepartamento;
        
        return coincideBusqueda && coincideFiltro; // Debe cumplir ambas condiciones
    });

    const cargarDatosMaestros = async () => {
        setLoading(true);
        try {
            const deptosData = await getAllDepartamentos();
            setDepartamentos(deptosData || []);
        } catch (err) {}

        try {
            const usuariosData = await getAllUsers();
            setUsuarios(usuariosData || []);
        } catch (err) {} 
        
        setLoading(false);
    };

    // ==========================================
    // MOTOR DE BÚSQUEDA EN TIEMPO REAL
    // ==========================================
    const usuariosParaMostrar = usuarios.filter(user => {
        const busqueda = searchTerm.toLowerCase();
        const nombre = user.nombreCompleto?.toLowerCase() || '';
        const correo = user.email?.toLowerCase() || '';
        const depto = user.departamento?.nombreDepartamento?.toLowerCase() || '';

        // Busca coincidencias en nombre, correo o departamento
        return nombre.includes(busqueda) || correo.includes(busqueda) || depto.includes(busqueda);
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
            cargarDatosMaestros(); 
        } catch (err) {
            alert(isEditing ? 'Error al actualizar el usuario.' : 'Error al registrar al usuario.');
        }
    };

    const handleEliminar = async (id) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario del sistema?')) {
            try {
                await deleteUser(id);
                cargarDatosMaestros();
            } catch (err) {
                alert('No se pudo eliminar el usuario.');
            }
        }
    };

    return (
        <div className="animation-fade-in flex flex-col h-full">
            
            {/* HEADER CON BARRA DE BÚSQUEDA INTEGRAD */}
<header className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
                <div>
                    <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Administración</p>
                    <h2 className="text-3xl font-bold text-white">Catálogo de Usuarios</h2>
                </div>

                {/* 👇 NUEVO CONTENEDOR FLEX (Selector + Buscador) 👇 */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    
                    {/* EL SELECTOR AUTOMÁTICO */}
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

                    {/* TU BUSCADOR CLÁSICO */}
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
                </div>
            </header>

            {/* TABLA CON SCROLL INDEPENDIENTE */}
            {/* El calc(100vh-220px) asegura que la tabla no se salga de la pantalla */}
            <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl max-h-[calc(100vh-220px)] flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        {/* Cabecera pegajosa (Sticky) */}
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
                            {/* AQUÍ USAMOS LA LISTA FILTRADA */}
                            {usuariosParaMostrar.map((item) => (
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
                            {usuariosParaMostrar.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No hay usuarios registrados.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE CREACIÓN/EDICIÓN */}
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