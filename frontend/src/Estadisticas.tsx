import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { Bar, Pie } from "react-chartjs-2";
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { motion } from "framer-motion";

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const colores = [
  '#f472b6', '#60a5fa', '#facc15', '#34d399', '#a78bfa', '#fb7185', '#38bdf8', '#fbbf24', '#4ade80', '#f87171'
];

const Estadisticas: React.FC = () => {
  const [panel, setPanel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoGrafico, setTipoGrafico] = useState<'barras' | 'pastel'>('barras');

  // Auto-actualización cada 10 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function fetchPanel() {
      setLoading(true);
      // Trae los resultados de la vista panel_resultados_por_votacion
      const { data } = await supabase
        .from("panel_resultados_por_votacion")
        .select("evaluado_id, evaluado_nombre, promedio_total")
        .order('promedio_total', { ascending: false });
      setPanel(data ?? []);
      setLoading(false);
    }
    fetchPanel();
    interval = setInterval(fetchPanel, 10000);
    return () => clearInterval(interval);
  }, []);

  // Exportar PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Resultados de la votación", 14, 22);
    let startY = 30;
    const tabla = panel.map((r, idx) => [idx + 1, r.evaluado_nombre, r.promedio_total ?? 0]);
    autoTable(doc, {
      startY,
      head: [["#", "Participante", "Promedio"]],
      body: tabla,
    });
    doc.save(`resultados_votacion.pdf`);
  };

  // Exportar Excel
  const exportarExcel = () => {
    const libro = XLSX.utils.book_new();
    const datos = panel.map((r, idx) => ({ Puesto: idx + 1, Participante: r.evaluado_nombre, Promedio: r.promedio_total ?? 0 }));
    const hoja = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(libro, hoja, "Resultados");
    const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
    const archivo = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(archivo, `resultados_votacion.xlsx`);
  };

  // Datos para gráficos
  const labels = panel.map(r => r.evaluado_nombre);
  const dataValores = panel.map(r => r.promedio_total ?? 0);
  const chartColors = labels.map((_, i) => colores[i % colores.length]);

  return (
    <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-400" style={{paddingTop: '72px'}}>
      <div className="w-full max-w-2xl mx-auto px-8 py-16 rounded-3xl shadow-2xl bg-white/30 backdrop-blur-lg flex flex-col items-center">
        <motion.h2
          className="text-3xl font-bold mb-4 text-blue-900"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Estadísticas en Tiempo Real
        </motion.h2>
        <p className="text-lg text-blue-800 mb-6 text-center">
          Visualiza las estadísticas de la votación.
        </p>
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setTipoGrafico('barras')}
            className={`px-4 py-2 rounded-full font-bold shadow transition ${
              tipoGrafico === 'barras'
                ? 'bg-gradient-to-r from-blue-500 to-pink-400 text-white'
                : 'bg-white/80 text-blue-700 border border-blue-200'
            }`}
          >
            Barras
          </button>
          <button
            onClick={() => setTipoGrafico('pastel')}
            className={`px-4 py-2 rounded-full font-bold shadow transition ${
              tipoGrafico === 'pastel'
                ? 'bg-gradient-to-r from-yellow-400 to-pink-400 text-white'
                : 'bg-white/80 text-yellow-700 border border-yellow-200'
            }`}
          >
            Pastel
          </button>
        </div>
        {loading ? (
          <div className="text-blue-700">Cargando...</div>
        ) : (
          <motion.div
            className="w-full mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {tipoGrafico === 'barras' ? (
              <Bar
                data={{
                  labels,
                  datasets: [
                    {
                      label: 'Promedio',
                      data: dataValores,
                      backgroundColor: chartColors,
                      borderRadius: 8,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: '#e0e7ef' } },
                  },
                }}
                height={220}
              />
            ) : (
              <Pie
                data={{
                  labels,
                  datasets: [
                    {
                      data: dataValores,
                      backgroundColor: chartColors,
                      borderColor: '#fff',
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: { color: '#374151', font: { size: 14 } },
                    },
                    tooltip: { enabled: true },
                  },
                }}
                height={220}
              />
            )}
          </motion.div>
        )}
        {/* Tabla de resultados */}
        {!loading && (
          <div className="w-full overflow-x-auto mb-8">
            <table className="min-w-[500px] w-full text-sm bg-white/80 rounded-xl shadow border border-blue-100">
              <thead>
                <tr>
                  <th className="p-2 text-xs sm:text-sm">#</th>
                  <th className="p-2 text-xs sm:text-sm">Participante</th>
                  <th className="p-2 text-xs sm:text-sm">Promedio</th>
                  <th className="p-2 text-xs sm:text-sm">% del total</th>
                </tr>
              </thead>
              <tbody>
                {panel.map((r, idx) => {
                  const total = panel.reduce((acc, x) => acc + (x.promedio_total ?? 0), 0);
                  const porcentaje = total > 0 ? ((r.promedio_total ?? 0) / total) * 100 : 0;
                  return (
                    <tr key={r.evaluado_id}>
                      <td className="p-2 text-center font-bold">{idx + 1}</td>
                      <td className="p-2">{r.evaluado_nombre}</td>
                      <td className="p-2 text-center">{r.promedio_total ?? 0}</td>
                      <td className="p-2 text-center">{porcentaje.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Botones de exportación */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 via-blue-500 to-yellow-400 hover:brightness-110 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl shadow-lg transition text-xs sm:text-base"
          >
            Exportar PDF
          </button>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 bg-gradient-to-r from-green-400 to-blue-400 hover:brightness-110 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl shadow-lg transition text-xs sm:text-base"
          >
            Exportar Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Estadisticas;
