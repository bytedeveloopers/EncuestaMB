import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "./lib/supabaseClient";
import { FaRegCalendarAlt, FaVoteYea } from "react-icons/fa";

type Votacion = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  start_at: string;
  end_at: string;
  portada_url?: string;
  tipo?: string;
};

const EncuestaDisponible: React.FC = () => {
  const navigate = useNavigate();
  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>(null);

  useEffect(() => {
    async function fetchVotaciones() {
      setLoading(true);
      setErrorMsg(null);
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("votaciones")
        .select("id, titulo, descripcion, estado, start_at, end_at, portada_url")
        .in("estado", ["ACTIVA", "PROGRAMADA"])
        .lte("start_at", nowIso)
        .gte("end_at", nowIso)
        .order("start_at", { ascending: true });
      if (error) setErrorMsg(error.message);
      setDebugData(data);
      setVotaciones(data ?? []);
      setLoading(false);
    }
    fetchVotaciones();
  }, []);

  return (
    <div className="px-4 py-10 max-w-4xl mx-auto relative">
      {/* Fondo animado con burbujas */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-60 h-60 bg-pink-300 opacity-20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-300 opacity-20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-200 opacity-10 rounded-full blur-2xl animate-pulse"></div>
      </div>

      <motion.h1
        className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-blue-500 to-yellow-500 text-center mb-10 drop-shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Encuestas Disponibles
      </motion.h1>

      {loading ? (
        <motion.p
          className="text-center text-blue-700 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Cargando...
        </motion.p>
      ) : votaciones.length === 0 ? (
        <div>
          <motion.p
            className="text-center text-gray-500 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No hay encuestas disponibles.
          </motion.p>
          {errorMsg && (
            <div className="text-center text-red-600 mt-4">Error: {errorMsg}</div>
          )}
          <div className="text-xs text-gray-400 mt-2 text-center">
            <pre>Debug: {JSON.stringify(debugData, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {votaciones.map((v, index) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.12, duration: 0.5 }}
              whileHover={{ scale: 1.04, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.25)' }}
              className="p-7 border-4 rounded-2xl shadow-xl bg-white/90 flex flex-col justify-between transition-all border-blue-200 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #fdf6ff 60%, #e0f2fe 100%)' }}
            >
              {/* Icono decorativo */}
              <div className="absolute -top-6 -right-6 opacity-20 text-yellow-300 text-8xl pointer-events-none select-none">
                <FaVoteYea />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <span className="text-pink-400"><FaVoteYea /></span>
                  {v.titulo}
                </h2>
                <p className="text-gray-700 mb-3">{v.descripcion}</p>
                <div className="flex items-center gap-2 text-sm text-blue-700 font-semibold mb-2">
                  <FaRegCalendarAlt color="#facc15" size={20} />
                  Cierra el:&nbsp;
                  <span className="italic">{new Date(v.end_at).toLocaleString()}</span>
                </div>
                {/* Badge de tipo de encuesta */}
                {v.tipo && (
                  <span className="inline-block mb-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-semibold">
                    {v.tipo}
                  </span>
                )}
                <span className="inline-block mb-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-semibold">
                  Estado: {v.estado}
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-6">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => navigate(`/votacion/${v.id}`)}
                  className="bg-gradient-to-r from-pink-500 via-blue-500 to-yellow-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:brightness-110 flex items-center gap-2 justify-center transition"
                >
                  <FaVoteYea size={20} /> Votar
                </motion.button>
                {/* Botón para compartir encuesta */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => navigate(`/compartir/${v.id}`)}
                  className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white font-bold py-2 px-4 rounded-xl shadow hover:brightness-110 flex items-center gap-2 justify-center transition"
                >
                  Compartir encuesta
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EncuestaDisponible;
