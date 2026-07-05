import axios from 'axios';

// 🚨 Nota el cambio de ruta respecto a los otros servicios
const API_URL = 'http://localhost:8080/api/tareas'; 

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

export const getAllTareas = async () => {
    const response = await axios.get(`${API_URL}/obtenerTareas?size=100`, getAuthHeaders());
    return response.data.content ? response.data.content : response.data;
};

export const getTareasPorAsignado = async (usuarioId) => {
    const response = await axios.get(`${API_URL}/obtenerTareasAsignado/${usuarioId}?size=100`, getAuthHeaders());
    return response.data.content ? response.data.content : response.data;
};

export const createTarea = async (tareaDTO) => {
    const response = await axios.post(`${API_URL}/crearTarea`, tareaDTO, getAuthHeaders());
    return response.data;
};

export const updateTarea = async (id, tareaDTO) => {
    const response = await axios.put(`${API_URL}/actualizarTarea/${id}`, tareaDTO, getAuthHeaders());
    return response.data;
};

export const updateEstadoTarea = async (id, nuevoEstado) => {
    // Al ser un Enum, Spring Boot espera el valor entre comillas como JSON válido
    const response = await axios.put(`${API_URL}/actualizarEstadoTarea/${id}`, `"${nuevoEstado}"`, getAuthHeaders());
    return response.data;
};

export const deleteTarea = async (id) => {
    const response = await axios.delete(`${API_URL}/eliminarTarea/${id}`, getAuthHeaders());
    return response.data;
};

export const uploadEvidenciaTarea = async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/${id}/evidencia`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
            // OJO: NO pongas 'Content-Type' aquí, el navegador lo calcula automáticamente para archivos
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error('Error al subir la evidencia');
    }
    return await response.json();
};

export const reportarIncidenciaTarea = async (id, incidencia) => {
    const response = await fetch(`${API_URL}/${id}/incidencia`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ incidencia })
    });

    if (!response.ok) {
        throw new Error('Error al reportar la incidencia');
    }
    return await response.json();
};