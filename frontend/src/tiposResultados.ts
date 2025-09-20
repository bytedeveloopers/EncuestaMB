export type PanelRow = {
  votacion_id: string;
  evaluado_id: string;
  evaluado_nombre: string;
  j1: number | null;
  j2: number | null;
  j3: number | null;
  publico: number | null;
  votos_publico: number | null;
  promedio_total: number | null;
};

export type Resumen = {
  votacion_id: string;
  promedio_general: number | null;
  total_votos: number | null;
};
