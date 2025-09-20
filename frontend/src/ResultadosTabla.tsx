
import type { PanelRow, Resumen } from "./tiposResultados.ts";

type Props = {
  panelRows: PanelRow[];
  resumen?: Resumen | null;
};

export default function ResultadosTabla({ panelRows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[700px] w-full text-sm bg-white/90 rounded-2xl shadow-xl border border-blue-200 mb-8">
        <thead>
          <tr className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
            <th className="p-3 text-center">#</th>
            <th className="p-3 text-left">Participante</th>
            <th className="p-3 text-center">J1</th>
            <th className="p-3 text-center">J2</th>
            <th className="p-3 text-center">J3</th>
            <th className="p-3 text-center">Público</th>
            <th className="p-3 text-center">Votos públicos</th>
            <th className="p-3 text-center">Promedio total</th>
          </tr>
        </thead>
        <tbody>
          {panelRows.map((r, idx) => (
            <tr key={r.evaluado_id} className={idx === 0 ? "bg-yellow-50" : idx % 2 === 0 ? "bg-white" : "bg-blue-50"}>
              <td className={`p-3 text-center font-bold ${idx === 0 ? 'text-yellow-700' : 'text-blue-900'}`}>{idx === 0 ? '🏆' : idx + 1}</td>
              <td className="p-3 font-semibold text-lg">{r.evaluado_nombre}</td>
              <td className="p-3 text-center">{r.j1 ?? '-'}</td>
              <td className="p-3 text-center">{r.j2 ?? '-'}</td>
              <td className="p-3 text-center">{r.j3 ?? '-'}</td>
              <td className="p-3 text-center">{r.publico ?? '-'}</td>
              <td className="p-3 text-center">{r.votos_publico ?? '-'}</td>
              <td className={`p-3 text-center font-bold ${idx === 0 ? 'text-yellow-700' : 'text-blue-900'}`}>{r.promedio_total ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
