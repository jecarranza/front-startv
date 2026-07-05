import axios from 'axios';

const API_URL = 'http://localhost:8080/admin'; 

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

export const getAllUsers = async () => {
    // 🚨 AQUÍ ESTABA EL ERROR: Ahora apunta correctamente a /obtenerUsuarios
    const response = await axios.get(`${API_URL}/obtenerUsuarios?size=100`, getAuthHeaders());
    // Extraemos el arreglo "content" de la paginación de Spring Boot
    return response.data.content ? response.data.content : response.data;
};

export const createUser = async (usuarioData) => {
    // Apunta a /saveUser
    const response = await axios.post(`${API_URL}/saveUser`, usuarioData, getAuthHeaders());
    return response.data;
};

export const updateUser = async (id, usuarioData) => {
    // Apunta a /actualizarUsuario/{id}
    const response = await axios.put(`${API_URL}/actualizarUsuario/${id}`, usuarioData, getAuthHeaders());
    return response.data;
};

export const deleteUser = async (id) => {
    // Apunta a /eliminarUsuario/{id}
    const response = await axios.delete(`${API_URL}/eliminarUsuario/${id}`, getAuthHeaders());
    return response.data;
};