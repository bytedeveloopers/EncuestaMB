import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ResultadosLayout from './ResultadosLayout';
import ResultadosTabla from './ResultadosTabla';
import ResultadosEstadisticas from './ResultadosEstadisticas';
import Navbar from './Navbar';
import VotacionPage from './VotacionPage';
import Home from './Home';
import CrearVotacionPage from './CrearVotacionPage';
import Registros from './Registros';
import EncuestaDisponible from './EncuestaDisponible';
import CompartirEncuesta from './CompartirEncuesta';
import Estadisticas from './Estadisticas';
import Login from './Login';
import { supabase } from './lib/supabaseClient';
import './App.css';

export default function App() {
  // Ya no se usan role ni nombre aquí, Navbar los obtiene internamente
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setLoading(false);
    };
    checkAuth();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      {loading ? (
        <div className="flex items-center justify-center h-screen">Cargando...</div>
      ) : !isAuthenticated ? (
        <Login onLogin={() => setIsAuthenticated(true)} />
      ) : (
        <>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/crear-votacion" element={<CrearVotacionPage />} />
            <Route path="/registros" element={<Registros />} />
            <Route path="/encuesta-disponible" element={<EncuestaDisponible />} />
            <Route path="/compartir-encuesta" element={<CompartirEncuesta />} />
            <Route path="/compartir/:id" element={<CompartirEncuesta />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/votacion/:id" element={<VotacionPage />} />
            <Route path="/resultados/:id" element={<ResultadosLayout />} />
          </Routes>
        </>
      )}
    </Router>
  );
}
