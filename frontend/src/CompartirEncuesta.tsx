import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import QRCode from 'react-qr-code';
import { FaLink, FaQrcode, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface Props {
  encuestaId?: string;
}

const CompartirEncuesta: React.FC<Props> = ({ encuestaId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const id = encuestaId || params.get('votacionId') || '';
  const [isAdmin, setIsAdmin] = useState(false);
  const [yaVoto, setYaVoto] = useState(false);
  React.useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('usuarios').select('rol').eq('id', user.id).single();
      setIsAdmin(data?.rol === 'ADMIN');
      // Verificar si ya votó
      if (id && data?.rol === 'ADMIN') {
        const { data: voto } = await supabase
          .from('votos')
          .select('id')
          .eq('votacion_id', id)
          .eq('voter_id', user.id)
          .single();
        setYaVoto(!!voto);
      }
    })();
  }, [id]);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQR, setMostrarQR] = useState(false);
  const url = `${window.location.origin}/votacion/${id}`;

  const copiarAlPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error('Error al copiar enlace', err);
      alert('Error al copiar enlace');
    }
  };

  return (
    <div className="space-y-4 text-center pt-8 sm:pt-16 flex flex-col items-center min-h-[60vh]">
      {isAdmin && id && !yaVoto && (
        <button
          className="mb-4 px-6 py-3 bg-gradient-to-r from-blue-500 via-pink-400 to-yellow-400 text-white rounded-xl font-semibold shadow-lg hover:brightness-110 transition-all duration-200"
          onClick={() => navigate(`/votacion/${id}`)}
        >
          Votar ahora como juez
        </button>
      )}
  <div className="flex flex-col sm:flex-row justify-center gap-4 flex-wrap w-full max-w-md mx-auto px-2 sm:px-0 mt-2">
        <button
          onClick={copiarAlPortapapeles}
          aria-label="Copiar enlace"
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold shadow transition-all
            ${copiado
              ? 'bg-gradient-to-r from-green-400 to-blue-400 text-white'
              : 'bg-gradient-to-r from-blue-500 to-pink-400 text-white hover:brightness-110'
            }`}
        >
          {copiado ? <FaCheckCircle className="animate-bounce" /> : <FaLink />}
          {copiado ? '¡Copiado!' : 'Copiar enlace'}
        </button>

        <button
          onClick={() => setMostrarQR(!mostrarQR)}
          aria-label="Mostrar u ocultar QR"
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold shadow transition-all
            ${mostrarQR
              ? 'bg-gradient-to-r from-yellow-400 to-pink-400 text-white'
              : 'bg-gradient-to-r from-gray-200 to-blue-100 text-blue-800 hover:brightness-110'
            }`}
        >
          {mostrarQR ? <FaTimes /> : <FaQrcode />}
          {mostrarQR ? 'Ocultar QR' : 'Mostrar QR'}
        </button>
      </div>

      {mostrarQR && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block p-5 mt-2 bg-white/90 border-2 border-yellow-300 rounded-2xl shadow-xl"
        >
          <QRCode value={url} size={180} bgColor="#fff" fgColor="#1e293b" />
          <p className="text-xs mt-3 text-blue-700 font-semibold">Escanea este código</p>
          <p className="text-xs break-all mt-1 text-gray-500">{url}</p>
        </motion.div>
      )}
    </div>
  );
};

export default CompartirEncuesta;
