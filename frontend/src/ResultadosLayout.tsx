import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import type { PanelRow, Resumen } from "./tiposResultados.ts";
import ResultadosTabla from "./ResultadosTabla";
import ResultadosEstadisticas from "./ResultadosEstadisticas";

export default function ResultadosLayout() {
  const { id } = useParams();
  const location = useLocation();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const raw = sp.get("tab");
  const activeTab: "tabla" | "estadisticas" = raw === "estadisticas" ? "estadisticas" : "tabla";
  const [panelRows, setPanelRows] = useState<PanelRow[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Panel
    const { data: panel, error: e1 } = await supabase
      .from("panel_resultados_por_votacion")
      .select("votacion_id,evaluado_id,evaluado_nombre,j1,j2,j3,publico,votos_publico,promedio_total")
      .eq("votacion_id", id)
      .order("promedio_total", { ascending: false });
    if (e1) { setError(e1.message); setLoading(false); return; }
    setPanelRows(panel ?? []);
    // Resumen
    const { data: res, error: e2 } = await supabase
      .from("promedios_por_votacion")
      .select("votacion_id,promedio_general,total_votos")
      .eq("votacion_id", id)
      .limit(1)
      .maybeSingle();
    if (e2) { setError(e2.message); setLoading(false); return; }
    setResumen(res ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    refetch();
    const ch = supabase
      .channel(`rt-resultados-${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "votos", filter: `votacion_id=eq.${id}` },
        refetch
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "puntuaciones", filter: `votacion_id=eq.${id}` },
        refetch
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, refetch]);


  function gotoTab(next: "tabla" | "estadisticas") {
    if (next === "estadisticas") {
      navigate("/estadisticas");
    } else {
      setSp(prev => {
        const p = new URLSearchParams(prev);
        p.set("tab", next);
        return p;
      }, { replace: false });
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-2">Resultados</h2>
      <div className="flex gap-2 mt-2 mb-4">
        <button
          onClick={() => gotoTab("tabla")}
          className={`px-3 py-1 rounded ${activeTab === "tabla" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Tabla
        </button>
        <button
          onClick={() => gotoTab("estadisticas")}
          className={`px-3 py-1 rounded ${activeTab === "estadisticas" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Estadísticas
        </button>
      </div>
      {loading ? (
        <div className="text-center py-10">Cargando…</div>
      ) : error ? (
        <div className="text-center text-red-600 py-10">{error}</div>
      ) : (
        <div>
          {activeTab === "tabla" ? (
            <ResultadosTabla panelRows={panelRows} resumen={resumen} />
          ) : (
            <ResultadosEstadisticas panelRows={panelRows} resumen={resumen} />
          )}
        </div>
      )}
    </div>
  );
}
