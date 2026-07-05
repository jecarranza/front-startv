import React, { useState, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { AuthContext } from '../context/AuthContext';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { loginUser } = useContext(AuthContext);
    const navigate = useNavigate();

    // Inicialización estable del motor de partículas
    const particlesInit = useCallback(async (engine) => {
        await loadSlim(engine);
    }, []);

    // Configuración de las estrellas amarillas estilo Star TV
    const options = useMemo(() => ({
        background: { color: { value: "#0f172a" } }, // Fondo oscuro corporativo
        fpsLimit: 60,
        interactivity: {
            events: {
                onClick: { enable: true, mode: "push" },
                onHover: { enable: true, mode: "repulse" },
            },
            modes: {
                push: { quantity: 4 },
                repulse: { distance: 80, duration: 0.4 },
            },
        },
        particles: {
            color: { value: "#eab308" }, // Amarillo Star TV
            links: {
                color: "#eab308",
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
            },
            move: {
                direction: "none",
                enable: true,
                outModes: { default: "bounce" },
                random: true,
                speed: 1.2,
                straight: false,
            },
            number: { density: { enable: true, area: 800 }, value: 60 },
            opacity: { value: 0.6 },
            shape: { type: "star" }, // Partículas con forma de estrella
            size: { value: { min: 1, max: 3 } },
        },
        detectRetina: true,
    }), []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!email || !password) {
            setError('Por favor, rellena todos los campos.');
            return;
        }

        try {
            setLoading(true);
            const data = await login(email, password);
            loginUser(data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err || 'Credenciales incorrectas. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
            
            {/* Capa de Partículas en el fondo */}
            <Particles 
                id="tsparticles" 
                init={particlesInit} 
                options={options} 
                className="absolute inset-0 z-0" 
            />

            {/* Contenedor Principal (Efecto Glassmorphism) */}
            <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.1)]">
                
                {/* Cabecera / Logo Star TV */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-4 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        {/* Icono de Estrella vectorizado */}
                        <svg className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Star<span className="text-yellow-500">TV</span></h2>
                    <p className="text-slate-400 mt-2 text-sm font-medium tracking-wide uppercase">Gestor de Tareas</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Input Correo */}
                    <div className="group">
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 transition-colors group-focus-within:text-yellow-500">Correo Electrónico</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-500 group-focus-within:text-yellow-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                                placeholder="usuario@stargroup.com"
                            />
                        </div>
                    </div>

                    {/* Input Contraseña */}
                    <div className="group">
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 transition-colors group-focus-within:text-yellow-500">Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-500 group-focus-within:text-yellow-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {/* Botón */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold rounded-xl shadow-[0_4px_14px_0_rgba(234,179,8,0.3)] hover:shadow-[0_6px_20px_rgba(234,179,8,0.2)] transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Ingresando...
                            </span>
                        ) : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;