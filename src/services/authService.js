import axios from 'axios';

const API_URL = 'http://localhost:8080'; 

export const login = async (email, password) => {
    try {
        // Agregamos el /auth/ a la ruta para que coincida con tu backend
        const response = await axios.post(`${API_URL}/auth/login`, { email, password });
        
        if (response.data && response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Error al iniciar sesión';
    }
};

export const logout = () => {
    localStorage.removeItem('token');
};