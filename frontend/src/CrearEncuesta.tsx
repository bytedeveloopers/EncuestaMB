import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { supabase } from "./lib/supabaseClient";
import { useNavigate } from "react-router-dom";


const schema = z.object({
  titulo: z.string().min(3).max(120),
  descripcion: z.string().optional(),
  estado: z.enum(["PROGRAMADA", "ACTIVA", "CERRADA"]),
  start_at: z.string(),
  end_at: z.string(),
  jurados: z.array(z.string()).min(2, "Debes asignar 2 jurados").max(2, "Solo puedes asignar 2 jurados")
});

type FormInput = z.infer<typeof schema>;

const CrearEncuesta: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [jurados, setJurados] = useState<{id: string, nombre: string, email: string}[]>([]);
  const [loadingJurados, setLoadingJurados] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email || !user.email.endsWith("@miumg.edu.gt")) {
        setIsAdminUser(false);
        setLoading(false);
        return;
      }
      // Verifica rol en la tabla usuarios
      const { data } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .single();
      setIsAdminUser(data?.rol === "ADMIN");
      setUserId(user.id);
      setLoading(false);
    }
    checkAdmin();
  }, []);

  // Obtener jurados
  useEffect(() => {
    async function fetchJurados() {
      setLoadingJurados(true);
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, email, rol")
        .eq("rol", "JURADO");
      if (!error && data) {
        setJurados(data);
      }
      setLoadingJurados(false);
    }
    fetchJurados();
  }, []);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      estado: "PROGRAMADA",
      start_at: dayjs().format("YYYY-MM-DDTHH:mm"),
      end_at: dayjs().add(1, "day").format("YYYY-MM-DDTHH:mm"),
      jurados: [],
    },
  });

  const { register, handleSubmit, formState } = form;

  const onSubmit = async (data: FormInput) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      // Validación de fechas
      const startISO = dayjs(data.start_at).toISOString();
      const endISO = dayjs(data.end_at).toISOString();
      if (!dayjs(endISO).isAfter(dayjs(startISO))) {
        throw new Error("La fecha de fin debe ser posterior a la de inicio.");
      }
      // Crear votación
      const { data: created, error: insErr } = await supabase
        .from("votaciones")
        .insert({
          titulo: data.titulo,
          descripcion: data.descripcion ?? null,
          estado: data.estado,
          start_at: startISO,
          end_at: endISO,
          j1_admin: userId,
          portada_url: null,
          jurados: data.jurados // puedes ajustar el nombre del campo según tu modelo
        })
        .select("id")
        .single();
      if (insErr || !created?.id) throw new Error(insErr?.message || "No se pudo crear la encuesta");
      navigate(`/resultados/${created.id}`, { replace: true });
    } catch (e: any) {
      setErrorMsg(e.message ?? "Error inesperado al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Verificando acceso...</div>;
  }
  if (!isAdminUser) {
    return <div className="flex items-center justify-center h-screen text-red-600">Acceso solo para administradores institucionales.</div>;
  }

  return (
    <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-400" style={{paddingTop: '72px'}}>
      <div className="w-full max-w-2xl mx-auto px-8 py-16 rounded-3xl shadow-2xl bg-white/30 backdrop-blur-lg flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-4 text-blue-900">Crear Encuesta</h2>
        <p className="text-lg text-blue-800 mb-6 text-center">
          Aquí el admin podrá crear nuevas encuestas.
        </p>
        {errorMsg && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 p-3">
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-6">
          <input
            type="text"
            placeholder="Título de la encuesta"
            {...register("titulo")}
            className="w-full px-4 py-2 rounded border"
            required
            minLength={3}
            maxLength={120}
          />
          <textarea
            placeholder="Descripción"
            {...register("descripcion")}
            className="w-full px-4 py-2 rounded border"
            rows={3}
          />
          <select {...register("estado")} className="w-full px-4 py-2 rounded border">
            <option value="PROGRAMADA">Programada</option>
            <option value="ACTIVA">Activa</option>
            <option value="CERRADA">Cerrada</option>
          </select>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-semibold mb-2">Inicio</label>
              <input type="datetime-local" {...register("start_at")}
                className="w-full p-2 rounded border" />
            </div>
            <div className="flex-1">
              <label className="block font-semibold mb-2">Fin</label>
              <input type="datetime-local" {...register("end_at")}
                className="w-full p-2 rounded border" />
            </div>
          </div>
          {/* Select de jurados */}
          <label className="block font-semibold">Asignar jurados (elige 2):</label>
          {loadingJurados ? (
            <div className="text-blue-700">Cargando jurados...</div>
          ) : (
            <select
              {...register("jurados")}
              className="w-full px-4 py-2 rounded border"
              multiple
              size={jurados.length > 2 ? 4 : jurados.length}
            >
              {jurados.map(j => (
                <option key={j.id} value={j.id}>
                  {j.nombre || j.email}
                </option>
              ))}
            </select>
          )}
          {formState.errors.jurados && (
            <div className="text-red-600 text-sm">{formState.errors.jurados.message as string}</div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold shadow hover:scale-105 transition-transform duration-300 text-lg"
            disabled={formState.isSubmitting || saving}
          >
            Guardar y publicar
          </button>
        </form>
      </div>
    </div>
  );
};

export default CrearEncuesta;
