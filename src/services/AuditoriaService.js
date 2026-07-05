const API_URL = 'http://localhost:8080/auditoria';

export const getHistorialGlobal = async (page = 0, size = 20) => {
    // 👇 Inyectamos page y size directamente en la URL
    const response = await fetch(`${API_URL}/global?page=${page}&size=${size}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });

    if (!response.ok) throw new Error('Error al obtener el historial');
    return await response.json();
};