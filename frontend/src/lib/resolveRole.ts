import { supabase } from "./supabaseClient";

export type AppRole = "ADMIN" | "JURADO" | "PUBLICO";

export async function resolveMyRole(): Promise<AppRole> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "PUBLICO";

  // 1) JWT (app_metadata.role)
  const jwtRole =
    (user.app_metadata as any)?.role?.toString()?.toUpperCase() || "";

  // 2) Fila en public.usuarios
  const { data: row } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  const dbRole = row?.rol?.toString()?.toUpperCase() || "";

  if (jwtRole === "ADMIN" || dbRole === "ADMIN") return "ADMIN";
  if (dbRole === "JURADO") return "JURADO";
  return "PUBLICO";
}
