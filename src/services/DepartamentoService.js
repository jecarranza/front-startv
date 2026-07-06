import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/admin`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

export const getAllDepartamentos = async () => {
    // Agregamos ?size=100 para asegurarnos de traer todos en una sola página de momento
    const response = await axios.get(`${API_URL}/obtenerDepartamentos?size=100`, getAuthHeaders());
    // Spring Boot con Pageable devuelve la lista dentro de "content"
    return response.data.content ? response.data.content : response.data;
};

export const createDepartamento = async (departamentoData) => {
    const response = await axios.post(`${API_URL}/guardarDepartamento`, departamentoData, getAuthHeaders());
    return response.data;
};

export const updateDepartamento = async (id, departamentoData) => {
    const response = await axios.put(`${API_URL}/actualizarDepartamento/${id}`, departamentoData, getAuthHeaders());
    return response.data;
};

export const deleteDepartamento = async (id) => {
    const response = await axios.delete(`${API_URL}/eliminarDepartamento/${id}`, getAuthHeaders());
    return response.data;
};