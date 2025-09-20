

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";



const Registros: React.FC = () => {
  const [encuestas, setEncuestas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const ahora = new Date();

  useEffect(() => {
    async function fetchEncuestas() {
      setLoading(true);
      setError(null);
      // Leer desde la vista con los alias correctos
      const { data, error } = await supabase
        .from("votaciones_registros")
        .select("*")
        .order("creado_en", { ascending: false });
      if (error) setError(error.message);
      setEncuestas(data ?? []);
      setLoading(false);
    }
    fetchEncuestas();
  }, []);


  async function refetch() {
    const { data, error } = await supabase
      .from("votaciones_registros")
      .select("*")
      .order("creado_en", { ascending: false });
    if (error) setError(error.message);
    setEncuestas(data ?? []);
  }

  const eliminarEncuesta = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta encuesta? Esta acción no se puede deshacer.")) return;

    // Verifica si el DELETE realmente borró filas
    const { data, error } = await supabase
      .from("votaciones")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      setError("Error al eliminar: " + error.message);
      return;
    }

    // Si data.length === 0, no se borró nada (id no existía o RLS lo impidió)
    if (!data || data.length === 0) {
      setError("No se pudo eliminar (verifica permisos RLS o el ID).");
      return;
    }

    // Refresca desde la vista
    await refetch();
  };

  const esVencida = (fecha_cierre: string) => {
    if (!fecha_cierre) return false;
    return new Date(fecha_cierre) < ahora;
  };

  return (
    <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-400" style={{paddingTop: '72px'}}>
      <div className="w-full max-w-3xl mx-auto px-8 py-12 rounded-3xl shadow-2xl bg-white/30 backdrop-blur-lg flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-4 text-blue-900">Registros</h2>
        <p className="text-lg text-blue-800 mb-6 text-center">
          Visualización de registros de encuestas.
        </p>
        {loading ? (
          <div className="text-center text-blue-700">Cargando encuestas...</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : encuestas.length === 0 ? (
          <div className="text-center text-blue-700">No hay encuestas registradas.</div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2">
            {encuestas.map((enc) => {
              const expirada = esVencida(enc.fecha_cierre);
              return (
                <div
                  key={enc.id}
                  className={`rounded-2xl p-7 border-4 shadow-xl bg-white/90 flex flex-col gap-4 relative border-gradient ${expirada ? 'border-red-300' : 'border-blue-300'}`}
                  style={{
                    background: expirada
                      ? 'linear-gradient(135deg, #ffe5e9 0%, #fff 100%)'
                      : 'linear-gradient(135deg, #e0f2fe 0%, #fff 100%)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{expirada ? '⏰' : '✅'}</span>
                    <h2 className="text-2xl font-bold text-blue-900">{enc.titulo}</h2>
                  </div>
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full shadow ${expirada ? 'bg-gradient-to-r from-red-200 to-pink-200 text-red-700' : 'bg-gradient-to-r from-green-200 to-blue-200 text-blue-700'}`}>
                    {expirada ? 'Vencida' : `Activa hasta ${enc.fecha_cierre ? new Date(enc.fecha_cierre).toLocaleString() : '-'}`}
                  </span>
                  <div className="flex gap-2 flex-wrap mt-3">
                    <button
                      onClick={() => navigate(`/resultados/${enc.id}`)}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition"
                    >Ver resultados</button>
                    <button
                      onClick={() => eliminarEncuesta(enc.id)}
                      className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition"
                    >Eliminar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Registros;
