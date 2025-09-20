import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaTrashAlt, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { supabase } from "./lib/supabaseClient";

// ===== Tipos =====
export type EvaluadoInput = {
  nombre: string;
  descripcion?: string;
  imagen?: File | null;
  orden: number;
};

export type VotacionInput = {
  titulo: string;
  descripcion?: string;
  portada?: File | null;
  estado: "PROGRAMADA" | "ACTIVA" | "CERRADA";
  start_at: string;
  end_at: string;
  jurados: string[]; // IDs de jurados seleccionados
  jurado2: string;
  jurado3: string;
  evaluados: EvaluadoInput[];
};



async function uploadPublic(file: File, path: string): Promise<string> {
  // Ajusta el bucket si usas otro nombre
  const BUCKET = "mbencuestas";
  const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (up.error) throw new Error(up.error.message);
  // Ya que el frontend construye la URL pública, solo retorna la ruta relativa
  return path;
}

// Verifica si es admin y, si no existe en 'usuarios', lo registra como PUBLICO
async function isAdminAndRegister(): Promise<{ isAdmin: boolean; validEmail: boolean; userId: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { isAdmin: false, validEmail: false, userId: null };

  const validEmail = user.email.endsWith("@miumg.edu.gt");
  let { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    const { error: insertError } = await supabase
      .from("usuarios")
      .insert({
        id: user.id,
        nombre: user.user_metadata?.name || user.email,
        email: user.email,
        rol: "PUBLICO",
        activo: true,
      });
    if (insertError) return { isAdmin: false, validEmail, userId: user.id };
    ({ data } = await supabase.from("usuarios").select("rol").eq("id", user.id).single());
  }

  return { isAdmin: data?.rol === "ADMIN", validEmail, userId: user.id };
}

// ===== Esquema Zod =====
const schema = z.object({
  titulo: z.string().min(3).max(120),
  descripcion: z.string().optional(),
  portada: z.any().optional(),
  estado: z.enum(["PROGRAMADA", "ACTIVA", "CERRADA"]),
  start_at: z.string(),
  end_at: z.string(),
  jurado2: z.string().min(1, "Selecciona un jurado"),
  jurado3: z.string().min(1, "Selecciona un jurado"),
  evaluados: z.array(z.object({
    nombre: z.string().min(1),
    descripcion: z.string().optional(),
    imagen: z.any().optional(),
    orden: z.number(),
  })).min(2),
}).refine(
  (data: {
    jurado2: string;
    jurado3: string;
  }) => data.jurado2 !== data.jurado3,
  {
    message: "No puedes elegir el mismo jurado dos veces",
    path: ["jurado3"],
  }
);



export default function CrearVotacionPage() {
  const navigate = useNavigate();

  // ===== Jurados (debe ir al inicio) =====
  const [jurados, setJurados] = useState<{id: string, nombre: string}[]>([]);
  const [loadingJurados, setLoadingJurados] = useState(true);
  useEffect(() => {
    async function fetchJurados() {
      setLoadingJurados(true);
      const { data, error } = await supabase
        .from("jurados_disponibles")
        .select("id, nombre")
        .order("nombre", { ascending: true });
      if (!error && data) {
        setJurados(data);
      }
      setLoadingJurados(false);
    }
    fetchJurados();
  }, []);

  // ===== Cámara evaluados =====
  const [showCameraEval, setShowCameraEval] = useState<Record<number, boolean>>({});
  const videoRefEval = useRef<Record<number, HTMLVideoElement | null>>({});
  const canvasRefEval = useRef<Record<number, HTMLCanvasElement | null>>({});

  useEffect(() => {
    Object.entries(showCameraEval).forEach(([idx, show]) => {
      const i = Number(idx);
      if (show && videoRefEval.current[i]) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            if (videoRefEval.current[i]) videoRefEval.current[i]!.srcObject = stream;
          })
          .catch(() => setShowCameraEval((prev) => ({ ...prev, [i]: false })));
      } else if (!show && videoRefEval.current[i] && videoRefEval.current[i]!.srcObject) {
        const tracks = (videoRefEval.current[i]!.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoRefEval.current[i]!.srcObject = null;
      }
    });
  }, [showCameraEval]);

  // ===== Acceso =====
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [validEmail, setValidEmail] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    isAdminAndRegister()
      .then(({ isAdmin, validEmail, userId }) => {
        setIsAdminUser(isAdmin);
        setValidEmail(validEmail);
        setUserId(userId);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && (!isAdminUser || !validEmail)) {
      navigate("/", { replace: true });
    }
  }, [loading, isAdminUser, validEmail, navigate]);

  // ===== Form =====
  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      portada: null,
      estado: "PROGRAMADA",
      start_at: dayjs().format("YYYY-MM-DDTHH:mm"),
      end_at: dayjs().add(1, "day").format("YYYY-MM-DDTHH:mm"),
      jurado2: "",
      jurado3: "",
      evaluados: [
        { nombre: "", descripcion: "", imagen: null, orden: 1 },
        { nombre: "", descripcion: "", imagen: null, orden: 2 },
      ],
    },
  });

  const { control, handleSubmit, watch, setValue, formState, register } = form;
  const { fields, append, remove, swap } = useFieldArray({ control, name: "evaluados" });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ===== Submit =====
  const onSubmit = async (data: VotacionInput) => {
    setSaving(true);
    setErrorMsg(null);

    try {
      if (!userId) throw new Error("Sesión inválida");

      // Validación temporal
      const startISO = dayjs(data.start_at).toISOString();
      const endISO = dayjs(data.end_at).toISOString();
      if (!dayjs(endISO).isAfter(dayjs(startISO))) {
        throw new Error("La fecha de fin debe ser posterior a la de inicio.");
      }

      // Jurados seleccionados
      const j2_id = data.jurado2;
      const j3_id = data.jurado3;

      // Insert votación (sin portada)
      const { data: created, error: insErr } = await supabase
        .from("votaciones")
        .insert({
          titulo: data.titulo,
          descripcion: data.descripcion ?? null,
          estado: data.estado,
          start_at: startISO,
          end_at: endISO,
          j1_admin: userId,
          j2_user: j2_id,
          j3_user: j3_id,
          portada_url: null,
        })
        .select("id")
        .single();

      if (insErr || !created?.id) throw new Error(insErr?.message || "No se pudo crear la votación");
      const votacionId = created.id as string;

      // Evaluados + subida de imagen si hay
      const evaluadosToInsert: any[] = [];
      for (const ev of data.evaluados) {
        let imgUrl: string | null = null;
        if (ev.imagen instanceof File) {
          imgUrl = await uploadPublic(
            ev.imagen,
            `evaluados/votaciones/${votacionId}/${ev.orden}_${Date.now()}.jpg`
          );
        }
        evaluadosToInsert.push({
          votacion_id: votacionId,
          nombre: ev.nombre,
          descripcion: ev.descripcion ?? null,
          orden: ev.orden,
          imagen_url: imgUrl,
        });
      }

      if (evaluadosToInsert.length) {
        const { error: evalErr } = await supabase.from("evaluados").insert(evaluadosToInsert);
        if (evalErr) throw new Error(evalErr.message || "No se pudieron guardar los evaluados.");
      }

      // Éxito
  navigate(`/compartir-encuesta?votacionId=${votacionId}`, { replace: true });
    } catch (e: any) {
      setErrorMsg(e.message ?? "Error inesperado al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ===== UI =====
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Verificando acceso...</div>;
  }
  if (!isAdminUser || !validEmail) {
    return null;
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900 via-pink-200 to-yellow-100 p-2 md:p-6"
      style={{ paddingTop: "72px" }}
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-pink-300 opacity-30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-300 opacity-30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-yellow-200 opacity-20 rounded-full blur-2xl animate-pulse" />
      </div>

      <motion.div
        className="w-full max-w-4xl bg-white/90 rounded-3xl shadow-2xl border border-blue-100 p-4 md:p-12 mt-24 mb-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <motion.h2
          className="text-4xl font-extrabold text-blue-700 mb-10 text-center drop-shadow-xl tracking-tight"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Crear nueva votación
        </motion.h2>

        {errorMsg && (
          <motion.div
            className="mb-6 rounded-xl bg-red-100 border border-red-300 text-red-700 p-4 text-lg shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* Información general */}
          <motion.div
            className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  {...form.register("titulo")}
                  className={`peer w-full px-4 py-3 rounded-2xl border-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition placeholder:text-gray-400 text-lg ${formState.errors.titulo ? 'border-red-400 animate-pulse' : 'border-blue-200'}`}
                  required
                  minLength={3}
                  maxLength={120}
                  placeholder="Ejemplo: Elección de mejor proyecto"
                  id="titulo"
                />
                <label
                  htmlFor="titulo"
                  className="absolute left-4 top-1 text-blue-700 bg-white/80 px-2 rounded transition-all duration-200
                    peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
                    peer-focus:top-1 peer-focus:text-blue-700 peer-focus:text-lg
                    peer:not(:placeholder-shown):top-1 peer:not(:placeholder-shown):text-sm
                    font-bold pointer-events-none z-10"
                >
                  Título *
                </label>
                {formState.errors.titulo && (
                  <span className="text-red-500 text-sm animate-bounce">
                    El título es obligatorio y debe tener al menos 3 caracteres.
                  </span>
                )}
              </div>

              <div className="relative">
                <textarea
                  {...form.register("descripcion")}
                  className="peer w-full px-4 py-3 rounded-2xl border-2 border-yellow-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition placeholder:text-gray-400 text-lg"
                  rows={3}
                  placeholder="Describe brevemente la votación..."
                  id="descripcion"
                />
                <label
                  htmlFor="descripcion"
                  className="absolute left-4 top-1 text-yellow-700 bg-white/80 px-2 rounded transition-all duration-200
                    peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
                    peer-focus:top-1 peer-focus:text-yellow-700 peer-focus:text-lg
                    peer:not(:placeholder-shown):top-1 peer:not(:placeholder-shown):text-sm
                    font-bold pointer-events-none z-10"
                >
                  Descripción
                </label>
              </div>

              {/* Galería de fotos de evaluados (preview) */}
              <div className="mb-6">
                <label className="block font-bold mb-2 text-blue-700">Fotos de los proyectos</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {fields.map((field, idx) => {
                    const imgFile = watch(`evaluados.${idx}.imagen`);
                    return (
                      <div key={field.id} className="flex flex-col items-center group">
                        <div className="relative w-32 h-32 flex items-center justify-center rounded-xl shadow-lg border bg-white overflow-hidden">
                          {imgFile instanceof File ? (
                            <img src={URL.createObjectURL(imgFile)} alt={`Proyecto ${idx+1}`} className="w-full h-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-105 cursor-pointer" tabIndex={0} aria-label={`Foto del proyecto ${idx+1}`} />
                          ) : (
                            <span className="flex flex-col items-center justify-center text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h2l.4 2M7 7h10l1 2h2M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              <span className="text-xs">Sin foto</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-700 text-center mt-2 font-semibold truncate max-w-[120px]">{watch(`evaluados.${idx}.nombre`) || `Proyecto ${idx+1}`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block font-bold mb-2 text-blue-700">Estado</label>
                <select
                  {...form.register("estado")}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg placeholder:text-gray-400"
                >
                  <option value="PROGRAMADA">Programada</option>
                  <option value="ACTIVA">Activa</option>
                  <option value="CERRADA">Cerrada</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    type="datetime-local"
                    {...form.register("start_at")}
                    id="inicio"
                    className="peer w-full px-4 py-3 rounded-2xl border-2 border-blue-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  />
                  <label
                    htmlFor="inicio"
                    className="absolute left-4 top-1 text-blue-700 bg-white/80 px-2 rounded transition-all peer-focus:top-1 peer-focus:text-blue-700 peer-focus:text-lg font-bold pointer-events-none z-10"
                  >
                    Inicio
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="datetime-local"
                    {...form.register("end_at")}
                    id="fin"
                    className="peer w-full px-4 py-3 rounded-2xl border-2 border-blue-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg placeholder:text-gray-400"
                  />
                  <label
                    htmlFor="fin"
                    className="absolute left-4 top-1 text-blue-700 bg-white/80 px-2 rounded transition-all peer-focus:top-1 peer-focus:text-blue-700 peer-focus:text-lg font-bold pointer-events-none z-10"
                  >
                    Fin
                  </label>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Jurados */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="font-bold mb-2">Jurados</h3>
            <div className="mb-2">
              J1 (Admin): <span className="font-mono">(usuario actual)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2">Jurado 2</label>
                {loadingJurados ? (
                  <div className="text-blue-700">Cargando jurados...</div>
                ) : (
                  <select
                    {...register("jurado2")}
                    className="w-full p-2 rounded-xl border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  >
                    <option value="">Selecciona jurado</option>
                    {jurados.map(j => (
                      <option key={j.id} value={j.id}>{j.nombre}</option>
                    ))}
                  </select>
                )}
                {formState.errors.jurado2 && (
                  <div className="text-red-600 text-sm mt-1">{formState.errors.jurado2.message as string}</div>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-2">Jurado 3</label>
                {loadingJurados ? (
                  <div className="text-blue-700">Cargando jurados...</div>
                ) : (
                  <select
                    {...register("jurado3")}
                    className="w-full p-2 rounded-xl border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  >
                    <option value="">Selecciona jurado</option>
                    {jurados.map(j => (
                      <option key={j.id} value={j.id}>{j.nombre}</option>
                    ))}
                  </select>
                )}
                {formState.errors.jurado3 && (
                  <div className="text-red-600 text-sm mt-1">{formState.errors.jurado3.message as string}</div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Evaluados */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="font-bold mb-2">Participantes/Evaluados</h3>

            <AnimatePresence>
              {fields.map((field, idx) => (
                <motion.div
                  key={field.id}
                  className="border-4 border-blue-200 bg-white/90 shadow-xl p-4 rounded-2xl mb-4 space-y-2 relative"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block font-semibold mb-2">Nombre *</label>
                      <input
                        type="text"
                        {...form.register(`evaluados.${idx}.nombre`)}
                        className="w-full p-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
                        required
                        placeholder="Nombre del participante"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-2">Descripción</label>
                      <input
                        type="text"
                        {...form.register(`evaluados.${idx}.descripcion`)}
                        className="w-full p-2 rounded-xl border-2 border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                        placeholder="Descripción breve"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-2">Imagen</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setValue(
                              `evaluados.${idx}.imagen`,
                              e.target.files?.[0] ?? null
                            )
                          }
                        />
                        <button
                          type="button"
                          className="bg-blue-500 text-white px-2 py-1 rounded shadow hover:bg-blue-600 transition text-xs"
                          onClick={() =>
                            setShowCameraEval((prev) => ({ ...prev, [idx]: true }))
                          }
                        >
                          Tomar foto
                        </button>

                        {(() => {
                          const imgFile = watch(`evaluados.${idx}.imagen`);
                          return imgFile instanceof File ? (
                            <img
                              src={URL.createObjectURL(imgFile)}
                              alt="Imagen participante"
                              className="mt-1 rounded shadow w-16 h-16 object-cover border"
                            />
                          ) : null;
                        })()}

                        {showCameraEval[idx] && (
                          <div className="mt-2 flex flex-col items-center gap-2">
                            <video
                              ref={(el) => {
                                videoRefEval.current[idx] = el;
                              }}
                              autoPlay
                              playsInline
                              className="rounded border shadow w-20 h-20 object-cover"
                            />
                            <canvas
                              ref={(el) => {
                                canvasRefEval.current[idx] = el;
                              }}
                              style={{ display: "none" }}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-xs"
                                onClick={async () => {
                                  const video = videoRefEval.current[idx];
                                  const canvas = canvasRefEval.current[idx];
                                  if (video && canvas) {
                                    canvas.width = video.videoWidth;
                                    canvas.height = video.videoHeight;
                                    canvas
                                      .getContext("2d")
                                      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
                                    canvas.toBlob((blob) => {
                                      if (blob) {
                                        setValue(
                                          `evaluados.${idx}.imagen`,
                                          new File([blob], `evaluado_${idx + 1}.jpg`, {
                                            type: "image/jpeg",
                                          })
                                        );
                                        setShowCameraEval((prev) => ({
                                          ...prev,
                                          [idx]: false,
                                        }));
                                      }
                                    }, "image/jpeg");
                                  }
                                }}
                              >
                                Capturar
                              </button>
                              <button
                                type="button"
                                className="bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500 text-xs"
                                onClick={() =>
                                  setShowCameraEval((prev) => ({ ...prev, [idx]: false }))
                                }
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-2">Orden</label>
            <input
              type="number"
              {...form.register(`evaluados.${idx}.orden`, { value: idx + 1 })}
              className="w-full p-2 rounded-xl border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              min={1}
              readOnly
              aria-label={`Orden participante ${idx+1}`}
            />
                    </div>

                    <div className="flex flex-col gap-2 items-center justify-end">
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 transition"
                        onClick={() => remove(idx)}
                        disabled={fields.length <= 2}
                        title="Eliminar participante"
                      >
                        <FaTrashAlt size={18} />
                      </button>
                      {idx > 0 && (
                        <button
                          type="button"
                          className="text-blue-500 hover:text-blue-700 transition"
                          onClick={() => swap(idx, idx - 1)}
                          title="Subir participante"
                        >
                          <FaArrowUp size={18} />
                        </button>
                      )}
                      {idx < fields.length - 1 && (
                        <button
                          type="button"
                          className="text-blue-500 hover:text-blue-700 transition"
                          onClick={() => swap(idx, idx + 1)}
                          title="Bajar participante"
                        >
                          <FaArrowDown size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="flex justify-end">
            <button
              type="button"
              className="bg-green-500 text-white px-4 py-2 rounded-xl shadow hover:bg-green-600 transition flex items-center gap-2"
              onClick={() =>
                append({ nombre: "", descripcion: "", imagen: null, orden: fields.length + 1 })
              }
            >
              <FaPlus /> Agregar participante
            </button>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-700 text-white px-8 py-3 rounded-2xl shadow-lg hover:bg-blue-800 transition text-xl font-bold flex items-center gap-2"
            >
              {saving ? "Guardando..." : "Crear votación"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
