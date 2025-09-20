import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

// 👇 Solo en desarrollo, útil para depurar en la consola del navegador
if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}
