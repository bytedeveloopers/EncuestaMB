import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabaseClient';
import CompartirEncuesta from './CompartirEncuesta';

const VotacionPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [votacion, setVotacion] = useState<any>(null);
  const [evaluados, setEvaluados] = useState<any[]>([]);
  const [respuestas, setRespuestas] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [checkingVoto, setCheckingVoto] = useState(true); // Nuevo: para saber si estamos verificando si ya votó
  const [yaVoto, setYaVoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Traer votación
      const { data: votData, error: votErr } = await supabase
        .from('votaciones')
        .select('*')
        .eq('id', id)
        .single();
      if (votErr || !votData) {
        setErrorMsg('No se encontró la votación.');
        setLoading(false);
        return;
      }
      setVotacion(votData);
      // Traer evaluados
      const { data: evalData } = await supabase
        .from('evaluados')
        .select('*')
        .eq('votacion_id', id);
      setEvaluados(evalData ?? []);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  // Verificar si el usuario ya votó (jurado o público)
  useEffect(() => {
    async function checkVoto() {
      setCheckingVoto(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingVoto(false);
        return;
      }
      // Detectar rol
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single();
      let yaVotado = false;
      if (perfil?.rol === 'JURADO' || perfil?.rol === 'ADMIN') {
        // Jurado: buscar en puntuaciones
        const { data: puntData } = await supabase
          .from('puntuaciones')
          .select('evaluado_id')
          .eq('votacion_id', id)
          .eq('jurado_id', user.id);
        if (puntData && Array.isArray(puntData) && evaluados.length > 0) {
          const evaluadoIds = evaluados.map(ev => ev.id);
          const votosIds = puntData.map(v => v.evaluado_id);
          yaVotado = evaluadoIds.every(eid => votosIds.includes(eid));
        }
      } else {
        // Público: buscar en votos
        const { data: votosData } = await supabase
          .from('votos')
          .select('evaluado_id')
          .eq('votacion_id', id)
          .eq('voter_id', user.id);
        if (votosData && Array.isArray(votosData) && evaluados.length > 0) {
          const evaluadoIds = evaluados.map(ev => ev.id);
          const votosIds = votosData.map(v => v.evaluado_id);
          yaVotado = evaluadoIds.every(eid => votosIds.includes(eid));
        }
      }
      setYaVoto(yaVotado);
      setCheckingVoto(false);
      if (yaVotado) {
        navigate(`/resultados/${id}?tab=tabla`, { replace: true });
      }
    }
    if (evaluados.length > 0) checkVoto();
  }, [id, evaluados, navigate]);

  const handleChange = (evaluadoId: string, valor: number) => {
    setRespuestas({ ...respuestas, [evaluadoId]: valor });
  };

// Helper para obtener la URL pública del bucket
function getPublicImageUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const bucket = 'mbencuestas';
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Helper para mostrar foto o placeholder
const FotoEvaluado = ({ url, nombre }: { url?: string; nombre: string }) => (
  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-300 flex items-center justify-center bg-gray-100 mr-4">
    {url && url.trim() !== '' ? (
      <img src={getPublicImageUrl(url)} alt={nombre} className="w-full h-full object-cover object-center" style={{ minWidth: '100%', minHeight: '100%' }} />
    ) : (
      <span className="text-blue-400 text-2xl font-bold">{nombre[0]}</span>
    )}
  </div>
);

  const enviarVoto = async () => {
    setErrorMsg(null);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('Debes iniciar sesión para votar.');
      setLoading(false);
      return;
    }
    // Validar que todos los evaluados tengan puntaje 0-10
    for (const ev of evaluados) {
      const v = respuestas[ev.id];
      if (typeof v !== 'number' || isNaN(v) || v < 0 || v > 10) {
        setErrorMsg('Debes puntuar a todos los participantes (0-10).');
        setLoading(false);
        return;
      }
    }
    // Detectar rol del usuario
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();
    let insertado = false;
    if (perfil?.rol === 'JURADO' || perfil?.rol === 'ADMIN') {
      // Insertar en puntuaciones (jurados)
      const { data: ya, error: eSel } = await supabase
        .from('puntuaciones')
        .select('evaluado_id')
        .eq('votacion_id', id)
        .eq('jurado_id', user.id);
      if (eSel) {
        setErrorMsg('No se pudieron verificar puntuaciones previas: ' + eSel.message);
        setLoading(false);
        return;
      }
      const yaVotados = new Set((ya ?? []).map(r => r.evaluado_id));
      const rows = evaluados
        .filter(ev => !yaVotados.has(ev.id))
        .map(ev => ({
          votacion_id: id,
          evaluado_id: ev.id,
          jurado_id: user.id,
          puntaje: respuestas[ev.id],
        }));
      if (rows.length > 0) {
        const { error } = await supabase.from('puntuaciones').insert(rows);
        if (error) {
          setErrorMsg(`Error al guardar la puntuación: ${error.message}`);
          setLoading(false);
          return;
        }
        insertado = true;
      }
    } else {
      // Insertar en votos (público)
      const { data: ya, error: eSel } = await supabase
        .from('votos')
        .select('evaluado_id')
        .eq('votacion_id', id)
        .eq('voter_id', user.id);
      if (eSel) {
        setErrorMsg('No se pudieron verificar votos previos: ' + eSel.message);
        setLoading(false);
        return;
      }
      const yaVotados = new Set((ya ?? []).map(r => r.evaluado_id));
      const rows = evaluados
        .filter(ev => !yaVotados.has(ev.id))
        .map(ev => ({
          votacion_id: id,
          evaluado_id: ev.id,
          voter_id: user.id,
          valor: respuestas[ev.id],
        }));
      if (rows.length > 0) {
        const { error } = await supabase.from('votos').insert(rows);
        if (error) {
          setErrorMsg(`Error al guardar el voto: ${error.message}`);
          setLoading(false);
          return;
        }
        insertado = true;
      }
    }
    // Refrescar verificación tras votar
    setTimeout(() => {
      setLoading(false);
      setYaVoto(true);
      navigate(`/resultados/${id}?tab=tabla`, { replace: true });
    }, insertado ? 400 : 0); // Pequeño delay para que Supabase actualice
  };

  if (loading || checkingVoto) return <div className="text-center">Cargando...</div>;
  if (errorMsg) return <div className="text-center text-red-600">{errorMsg}</div>;
  if (!votacion) return <div className="text-center text-red-600">No se encontró la votación.</div>;

  // Si ya votó, no renderizar nada (el useEffect ya redirige)
  if (yaVoto) return null;

  return (
    <div className="px-2 py-8 max-w-2xl mx-auto">
      <motion.h1
        className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-800"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {votacion.titulo}
      </motion.h1>
      <div className="mb-8 grid gap-6">
        <p className="text-lg font-semibold text-gray-700 mb-3 text-center">Puntúa a cada participante (0-10):</p>
        {evaluados.map((ev, idx) => (
          <motion.div
            key={ev.id}
            className="mb-2 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 shadow-lg border border-blue-100 flex flex-col sm:flex-row items-center gap-4"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
          >
            <FotoEvaluado url={ev.imagen_url} nombre={ev.nombre} />
            <span className="flex-1 font-semibold text-blue-900 text-lg text-center sm:text-left">{ev.nombre}</span>
            <input
              type="number"
              min={0}
              max={10}
              step="0.1"
              value={typeof respuestas[ev.id] === 'number' && !isNaN(respuestas[ev.id]) ? respuestas[ev.id] : ''}
              onChange={e => {
                const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                handleChange(ev.id, val);
              }}
              className="w-20 border-2 border-purple-300 rounded-lg p-2 text-center text-lg"
              required
            />
          </motion.div>
        ))}
      </div>
      <div className="flex justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          onClick={enviarVoto}
          className="w-full sm:w-auto py-3 px-6 rounded-md bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-bold shadow-lg transition"
        >
          Enviar voto
        </motion.button>
      </div>
    </div>
  );
};

export default VotacionPage;
