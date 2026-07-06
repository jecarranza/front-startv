import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import UsuariosView from '../components/UsuariosView';
import DepartamentosView from '../components/DepartamentosView';
import TareasView from '../components/TareasView';
import ResumenView from '../components/ResumenView';
import HistorialView from '../components/HistorialView';
import TareasAdminView from '../components/TareasAdminView'; // 👈 NUEVO COMPONENTE

const BACKEND_WS_URL = `${import.meta.env.VITE_API_URL}/ws-star-tv`;

const Dashboard = () => {
    const { user, logoutUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [vistaActiva, setVistaActiva] = useState('resumen');

    const [alertas, setAlertas] = useState([]);
    const [notificaciones, setNotificaciones] = useState([]);
    const [mostrarPanelNotif, setMostrarPanelNotif] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(0);

    const token = localStorage.getItem('token');
    let rolDelToken = 'EMPLEADO';

    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            rolDelToken = payload.rol || payload.role || 'EMPLEADO';
        } catch (e) { }
    }

    const esAdmin = rolDelToken === 'ADMIN' || rolDelToken === 'ROLE_ADMIN';
    const miEmail = user?.email;

    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (!miEmail) return;

        const stompClient = new Client({
            webSocketFactory: () => new SockJS(BACKEND_WS_URL),
            reconnectDelay: 5000, 
            onConnect: () => {
                console.log("Conectado al servidor de WebSockets de StarTV 🟢");

                stompClient.subscribe('/topic/notificaciones', (mensaje) => {
                    if (mensaje.body) {
                        const notificacion = JSON.parse(mensaje.body);

                        if (notificacion.tipo === 'EXITO' && esAdmin) {
                            lanzarAlerta(notificacion.mensaje, notificacion.tipo);
                            setUpdateTrigger(prev => prev + 1); 
                        }
                        else if (notificacion.destinatarioEmail === miEmail) {
                            lanzarAlerta(notificacion.mensaje, notificacion.tipo);
                            setUpdateTrigger(prev => prev + 1); 
                        }
                    }
                });
            },
            onStompError: (frame) => {
                console.error("Error STOMP: " + frame.headers['message']);
            }
        });

        stompClient.activate();

        return () => {
            if (stompClient.active) {
                stompClient.deactivate();
                console.log("Desconectado de WebSockets 🔴");
            }
        };
    }, [miEmail, esAdmin]);

    const lanzarAlerta = (mensaje, tipo) => {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("StarTV - Sistema de Tareas", {
                body: mensaje,
                icon: '/vite.svg',
                requireInteraction: tipo === 'URGENTE'
            });
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
                gain1.gain.setValueAtTime(0.08, ctx.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start();
                osc1.stop(ctx.currentTime + 0.3);
                
                setTimeout(() => {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(880.00, ctx.currentTime);
                    gain2.gain.setValueAtTime(0.08, ctx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start();
                    osc2.stop(ctx.currentTime + 0.4);
                }, 70);
            }
        } catch (error) { }

        const nuevaNotif = { id: Date.now(), mensaje, tipo, leida: false, fecha: new Date() };
        setNotificaciones(prev => [nuevaNotif, ...prev]);
        setAlertas(prev => [...prev, nuevaNotif]);

        setTimeout(() => {
            setAlertas(prev => prev.filter(a => a.id !== nuevaNotif.id));
        }, 8000); 
    };

    const marcarNotificacionesLeidas = () => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    const handleLogout = () => { logoutUser(); navigate('/login'); };

    const getToastColors = (tipo) => {
        switch (tipo) {
            case 'URGENTE': return 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse';
            case 'EXITO': return 'bg-emerald-500 border-emerald-400 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
            case 'INCIDENCIA':
            case 'ERROR': return 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]';
            case 'NUEVA_TAREA':
            default: return 'bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]';
        }
    };

    const noLeidas = notificaciones.filter(n => !n.leida).length;

    return (
        <div className="h-screen overflow-hidden bg-[#0f172a] flex text-slate-200 font-sans selection:bg-yellow-500/30 relative">

            {/* Toasts flotantes */}
            <div className="absolute top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none w-80">
                {alertas.map(alerta => (
                    <div key={alerta.id} className={`p-4 rounded-xl border font-bold text-sm pointer-events-auto transition-all transform translate-x-0 ${getToastColors(alerta.tipo)}`}>
                        <div className="flex items-start gap-3">
                            <span className="text-xl mt-0.5">{alerta.tipo === 'URGENTE' ? '🔥' : alerta.tipo === 'EXITO' ? '✅' : alerta.tipo === 'ERROR' || alerta.tipo === 'INCIDENCIA' ? '⚠️' : '🔔'}</span>
                            <p>{alerta.mensaje}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* BARRA LATERAL (SIDEBAR) */}
            <aside className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col h-screen z-20">
                <div className="p-6 pb-2">
                    <div className="flex items-center gap-3 mb-6 pl-2">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Star<span className="text-yellow-500">TV</span></h1>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-6 space-y-2 custom-scrollbar">
                    <button onClick={() => setVistaActiva('resumen')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all border ${vistaActiva === 'resumen' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)] font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent font-medium'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        <span>Dashboard</span>
                    </button>

                    {esAdmin && (
                        <>
                            {/* 👇 NUEVO BOTÓN: BANDEJA DE ENTRADA ENTRE ADMINISTRADORES 👇 */}
                            <button onClick={() => setVistaActiva('tareasAdmin')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all border ${vistaActiva === 'tareasAdmin' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)] font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent font-medium'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20"></path></svg>
                                <span className="flex-1 text-left">Bandeja Admin</span>
                            </button>

                            <button onClick={() => setVistaActiva('usuarios')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all border ${vistaActiva === 'usuarios' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)] font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent font-medium'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                <span>Usuarios</span>
                            </button>
                            <button onClick={() => setVistaActiva('departamentos')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all border ${vistaActiva === 'departamentos' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)] font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent font-medium'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                <span>Departamentos</span>
                            </button>
                            <button onClick={() => setVistaActiva('historial')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all border ${vistaActiva === 'historial' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)] font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent font-medium'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Historial de Cambios</span>
                            </button>
                        </>
                    )}

                    <button onClick={() => setVistaActiva('tareas')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all border ${vistaActiva === 'tareas' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)] font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent font-medium'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        <span>Gestión de Tareas</span>
                    </button>
                </nav>

                <div className="mt-auto p-6 bg-slate-900/40 border-t border-slate-800/80">
                    <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-yellow-600 to-yellow-400 flex items-center justify-center text-slate-900 font-bold text-lg uppercase shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                                {user?.nombre?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-white truncate" title={user?.nombre || user?.email}>
                                    {user?.nombre || user?.email || 'Usuario'}
                                </p>
                                <p className="text-xs text-yellow-500 font-medium tracking-wider uppercase">
                                    {rolDelToken}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 h-screen overflow-y-auto custom-scrollbar relative flex flex-col">
                <div className="sticky top-0 z-30 flex justify-end p-6 pointer-events-none">
                    <div className="relative pointer-events-auto">
                        <button onClick={() => { setMostrarPanelNotif(!mostrarPanelNotif); marcarNotificacionesLeidas(); }} className="w-12 h-12 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            {noLeidas > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-900">{noLeidas}</span>}
                        </button>

                        {mostrarPanelNotif && (
                            <div className="absolute right-0 mt-3 w-80 bg-slate-800 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden z-50">
                                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                                    <h4 className="font-bold text-white">Notificaciones</h4>
                                    <button onClick={() => setNotificaciones([])} className="text-xs text-slate-400 hover:text-white">Limpiar</button>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notificaciones.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center p-6">No hay notificaciones recientes.</p>
                                    ) : (
                                        notificaciones.map(n => (
                                            <div key={n.id} className="p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                                <p className="text-sm text-slate-300">{n.mensaje}</p>
                                                <p className="text-[10px] text-slate-500 mt-2">{n.fecha.toLocaleTimeString('es-MX')}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-8 lg:px-12 pb-12 -mt-12 flex-1">
                    {vistaActiva === 'resumen' && <ResumenView updateTrigger={updateTrigger} />}
                    {vistaActiva === 'usuarios' && <UsuariosView />}
                    {vistaActiva === 'departamentos' && <DepartamentosView />}
                    {vistaActiva === 'tareas' && <TareasView updateTrigger={updateTrigger} />}
                    {vistaActiva === 'historial' && <HistorialView updateTrigger={updateTrigger} />}
                    {/* 👇 RENDERIZAMOS LA NUEVA BISTA 👇 */}
                    {vistaActiva === 'tareasAdmin' && <TareasAdminView updateTrigger={updateTrigger} />}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;