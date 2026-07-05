import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser({
                    email: decoded.sub,
                    nombre: decoded.nombre, // Asegúrate de que "nombre" coincide con el claim de tu token
                    role: decoded.rol || decoded.role || decoded.roles?.[0] // Atrapa el rol
                });
            } catch (error) {
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const loginUser = (token) => {
        localStorage.setItem('token', token);
        const decoded = jwtDecode(token);
        setUser({ email: decoded.sub, role: decoded.role || decoded.roles?.[0] });
    };

    const logoutUser = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loginUser, logoutUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};