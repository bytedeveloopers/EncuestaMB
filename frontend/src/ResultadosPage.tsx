import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { motion } from 'framer-motion';

const ResultadosPage: React.FC = () => {
  const { id } = useParams();
  const [ranking, setRanking] = useState<any[]>([]);
  const [panel, setPanel] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any | null>(null);
  const [evaluados, setEvaluados] = useState<any[]>([]);
  // Helpers para cálculos globales
  const round2 = (x: number | null | undefined) => x == null ? null : Math.round(x * 100) / 100;

  // Estados para los cálculos globales
  const [globalJurados, setGlobalJurados] = useState<number | null>(null);
  const [globalPublico, setGlobalPublico] = useState<number | null>(null);
  const [globalTotal, setGlobalTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  // Nueva función para traer panel, ranking y resumen
  async function refetchResultados() {
    setLoading(true);
    setErrorMsg(null);
    // 1) panel: N filas (no .single)
    const { data: panelData, error: panelError } = await supabase
      .from('panel_resultados_por_votacion')
      .select('*')
      .eq('votacion_id', id)
      .order('promedio_total', { ascending: false });

    // 2) ranking: N filas (no .single)
    const { data: rankingData } = await supabase
      .from('ranking_por_votacion')
      .select('*')
      .eq('votacion_id', id)
      .order('puesto', { ascending: true });

    // 3) promedio general: 0..1 fila (sí .maybeSingle)
    const { data: resumenData } = await supabase
      .from('promedios_por_votacion')
      .select('*')
      .eq('votacion_id', id)
      .limit(1)
      .maybeSingle();

    if (panelError) {
      setErrorMsg('No se pudieron cargar los resultados.');
      setPanel([]);
      setRanking([]);
      setResumen(null);
      setLoading(false);
      return;
    }
    setPanel(panelData ?? []);
    setRanking(rankingData ?? []);
    setResumen(resumenData ?? null);

    // Consulta evaluados para obtener imagen
    const evaluadoIds = (panelData ?? []).map((r: any) => r.evaluado_id);
    if (evaluadoIds.length > 0) {
      const { data: evalData } = await supabase
        .from('evaluados')
        .select('id,imagen_url')
        .in('id', evaluadoIds);
      setEvaluados(evalData ?? []);
    } else {
      setEvaluados([]);
    }

    // Cálculos globales (usando panelData)
    // Jurados: promedio simple de todas las calificaciones J1/J2/J3 (ignora nulls)
    const juradosNotas: number[] = [];
    (panelData ?? []).forEach(r => {
      ['j1','j2','j3'].forEach(k => {
        const v = r[k];
        if (typeof v === 'number') juradosNotas.push(v);
      });
    });
    const globalJuradosCalc = juradosNotas.length ? round2(juradosNotas.reduce((a,b)=>a+b,0)/juradosNotas.length) : null;
    setGlobalJurados(globalJuradosCalc);

    // Público: promedio ponderado por cantidad de votos
    const pubSum = (panelData ?? []).reduce((s,r) => s + ((r.publico ?? 0) * (r.votos_publico ?? 0)), 0);
    const pubDen = (panelData ?? []).reduce((s,r) => s + (r.votos_publico ?? 0), 0);
    const globalPublicoCalc = pubDen ? round2(pubSum / pubDen) : null;
    setGlobalPublico(globalPublicoCalc);

    // Total: promedio de la columna promedio_total por evaluado
    const totRows = (panelData ?? []).filter(r => typeof r.promedio_total === 'number').length;
    const totSum = (panelData ?? []).reduce((s,r) => s + (typeof r.promedio_total === 'number' ? r.promedio_total : 0), 0);
    const globalTotalCalc = totRows ? round2(totSum / totRows) : null;
    setGlobalTotal(globalTotalCalc);

    setLoading(false);
  }

  // useEffect para cargar datos al montar y suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!id) return;
    refetchResultados();

    const handle = () => {
      refetchResultados();
    };

    const channel = supabase
      .channel(`rt-votacion-${id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'votos', filter: `votacion_id=eq.${id}` },
        handle
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'puntuaciones', filter: `votacion_id=eq.${id}` },
        handle
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Helper para obtener la URL pública del bucket
  function getPublicImageUrl(path: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const bucket = 'mbencuestas';
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  return (
    <div className="container mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Resultados de la votación</h2>
      {/* Encabezado con los cálculos globales */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base mb-4">
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">
          Jurados: {globalJurados ?? '-'}
        </span>
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold">
          Público: {globalPublico ?? '-'}
        </span>
        <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-semibold">
          Total: {globalTotal ?? '-'}
        </span>
      </div>
      {loading ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-blue-700 text-lg">Cargando...</motion.p>
      ) : errorMsg ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-red-500 text-lg">{errorMsg}</motion.p>
      ) : panel.length === 0 ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-500 text-lg">No hay resultados disponibles.</motion.p>
      ) : (
        <div className="w-full overflow-x-auto mb-8">
          <table className="min-w-[700px] w-full text-sm bg-white/90 rounded-2xl shadow-xl border border-blue-200">
            <thead>
              <tr className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
                <th className="p-3 text-center min-w-[40px]">#</th>
                <th className="p-3 text-left min-w-[160px]">Participante</th>
                <th className="p-3 text-center min-w-[60px]">J1</th>
                <th className="p-3 text-center min-w-[60px]">J2</th>
                <th className="p-3 text-center min-w-[60px]">J3</th>
                <th className="p-3 text-center min-w-[80px]">Público</th>
                <th className="p-3 text-center min-w-[80px]">Votos públicos</th>
                <th className="p-3 text-center min-w-[100px]">Promedio total</th>
              </tr>
            </thead>
            <tbody>
              {panel.map((r, idx) => {
                const evalInfo = evaluados.find(ev => ev.id === r.evaluado_id);
                const isFirst = idx === 0;
                return (
                  <tr key={idx} className={isFirst ? "bg-yellow-50" : idx % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                    <td className={`p-3 text-center font-bold ${isFirst ? 'text-yellow-700' : 'text-blue-900'}`}>{isFirst ? '🏆' : idx + 1}</td>
                    <td className="p-3 flex items-center gap-3 min-w-[160px]">
                      {evalInfo?.imagen_url ? (
                        <img src={getPublicImageUrl(evalInfo.imagen_url)} alt={r.evaluado_nombre} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover object-center border-2 ${isFirst ? 'border-yellow-400' : 'border-blue-300'} shadow`} />
                      ) : (
                        <span className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center text-blue-400 font-bold shadow ${isFirst ? 'border-2 border-yellow-400' : 'border-2 border-blue-300'}`}>{r.evaluado_nombre[0]}</span>
                      )}
                      <span className={`font-semibold text-base sm:text-lg truncate max-w-[100px] sm:max-w-none ${isFirst ? 'text-yellow-700' : 'text-blue-900'}`}>{r.evaluado_nombre}</span>
                    </td>
                    <td className="p-3 text-center">{r.j1 ?? '-'}</td>
                    <td className="p-3 text-center">{r.j2 ?? '-'}</td>
                    <td className="p-3 text-center">{r.j3 ?? '-'}</td>
                    <td className="p-3 text-center">{r.publico ?? '-'}</td>
                    <td className="p-3 text-center">{r.votos_publico ?? '-'}</td>
                    <td className={`p-3 text-center font-bold ${isFirst ? 'text-yellow-700' : 'text-blue-900'}`}>{r.promedio_total ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ResultadosPage;
