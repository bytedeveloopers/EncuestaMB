import { useMemo, useState } from "react";
import type { PanelRow, Resumen } from "./tiposResultados.ts";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


const colores = [
  '#f472b6', '#60a5fa', '#facc15', '#34d399', '#a78bfa', '#fb7185', '#38bdf8', '#fbbf24', '#4ade80', '#f87171'
];

type Props = {
  panelRows: PanelRow[];
  resumen?: Resumen | null;
};

export default function ResultadosEstadisticas({ panelRows, resumen }: Props) {
  const [modo, setModo] = useState<'barras' | 'pastel'>('barras');

  const totalPromedios = useMemo(
    () => panelRows.reduce((acc, r) => acc + (r.promedio_total ?? 0), 0),
    [panelRows]
  );

  const barrasData = useMemo(
    () => panelRows.map(r => ({
      name: r.evaluado_nombre,
      Promedio: Number(r.promedio_total ?? 0),
      Publico: Number(r.publico ?? 0),
      J1: Number(r.j1 ?? 0),
      J2: Number(r.j2 ?? 0),
      J3: Number(r.j3 ?? 0),
    })),
    [panelRows]
  );

  const pastelData = useMemo(
    () => {
      const sum = totalPromedios || 1;
      return panelRows.map(r => ({
        name: r.evaluado_nombre,
        value: Number(r.promedio_total ?? 0),
        pct: Math.round(((r.promedio_total ?? 0) * 100) / sum),
      }));
    },
    [panelRows, totalPromedios]
  );

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Resultados de la votación", 14, 22);
    let startY = 30;
    const tabla = panelRows.map((r, idx) => [idx + 1, r.evaluado_nombre, r.promedio_total ?? 0]);
    autoTable(doc, {
      startY,
      head: [["#", "Participante", "Promedio"]],
      body: tabla,
    });
    doc.save(`resultados_votacion.pdf`);
  }

  function exportExcel() {
    const libro = XLSX.utils.book_new();
    const datos = panelRows.map((r, idx) => ({ Puesto: idx + 1, Participante: r.evaluado_nombre, Promedio: r.promedio_total ?? 0 }));
    const hoja = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(libro, hoja, "Resultados");
    const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
    const archivo = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(archivo, `resultados_votacion.xlsx`);
  }

  if (!panelRows.length) {
    return <div className="text-center py-10 text-gray-500">No hay datos para mostrar.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded ${modo === "barras" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setModo("barras")}
        >
          Barras
        </button>
        <button
          className={`px-3 py-1 rounded ${modo === "pastel" ? "bg-yellow-500 text-white" : "bg-gray-200"}`}
          onClick={() => setModo("pastel")}
        >
          Pastel
        </button>
      </div>
      <div className="h-72 w-full bg-white/60 rounded-xl shadow p-3 mb-6">
        {modo === "barras" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barrasData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Promedio" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pastelData} dataKey="value" nameKey="name" outerRadius={90} label>
                {pastelData.map((_, i) => <Cell key={i} fill={colores[i % colores.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number, _n: string, p: any) => [`${v} (${p.payload.pct}%)`, p.payload.name]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="overflow-x-auto mb-6">
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
            {panelRows.map((r, idx) => {
              const total = totalPromedios;
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
      <div className="flex justify-center gap-4 mt-4">
        <button className="px-4 py-2 rounded bg-pink-500 text-white" onClick={exportPDF}>
          Exportar PDF
        </button>
        <button className="px-4 py-2 rounded bg-green-500 text-white" onClick={exportExcel}>
          Exportar Excel
        </button>
      </div>
      <div className="mt-6 text-center text-gray-600">
        Promedio general: <b>{resumen?.promedio_general ?? "-"}</b> · Votos público: <b>{resumen?.total_votos ?? 0}</b>
      </div>
    </div>
  );
}
