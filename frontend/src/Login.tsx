import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'

interface LoginProps {
  onLogin?: () => void
}

export default function Login({ onLogin }: LoginProps) {
  // Lista de correos de administradores
  const adminEmails = [
    'mfrancoh5@miumg.edu.gt'
  ];
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const navigate = useNavigate()

  // Crea o actualiza el registro en 'usuarios' si no existe
  const ensureUserRow = async (userId: string, mail: string, nombre: string, rol: string) => {
    const { data: existing } = await supabase
      .from('usuarios')
      .select('id, activo')
      .eq('id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('usuarios').insert({
        id: userId,
        nombre,
        email: mail,
        rol,
        activo: true
      });
    } else {
      // Si existe pero está inactivo, lo reactiva
      if (!existing.activo) {
        await supabase.from('usuarios').update({ activo: true }).eq('id', userId);
      }
    }
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validar dominio
    if (!email.endsWith("@miumg.edu.gt")) {
      setError("Solo se permite acceso con correo institucional @miumg.edu.gt");
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // ---------- REGISTRO ----------
  const userRole = adminEmails.includes(email) ? "admin" : "user";
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: userRole }
          }
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        // Si "Confirm email" está OFF, Supabase devuelve sesión activa
        if (signUpData?.session && signUpData.user) {
          await ensureUserRow(signUpData.user.id, email, email.split("@")[0], userRole);
          onLogin?.();
          navigate("/");
          return;
        }

        // Si "Confirm email" está ON, no hay sesión todavía
        alert("Registro exitoso. Inicia sesión para continuar.");
        setIsRegister(false);
        return;
      }

      // ---------- LOGIN ----------
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Trae datos del usuario autenticado
      const userId = signInData?.user?.id;
      const nombre = signInData?.user?.user_metadata?.name || email.split("@")[0];
  const userRole = adminEmails.includes(email) ? "admin" : "user";
      if (userId) {
        await ensureUserRow(userId, email, nombre, userRole);
      }

      // Verifica que el usuario esté activo
      const { data: userData } = await supabase
        .from("usuarios")
        .select("nombre, activo")
        .eq("email", email)
        .single();

      if (!userData?.activo) {
        setError("Tu usuario está inactivo. Contacta al administrador.");
        return;
      }

      alert("Login exitoso: " + (userData?.nombre ?? email));
      onLogin?.();
      navigate("/");
    } catch (err: any) {
      setError(err?.message ?? "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-800 via-blue-700 to-blue-400">
      <div className="w-full max-w-2xl mx-2 sm:mx-auto px-4 sm:px-8 py-10 sm:py-16 rounded-3xl shadow-2xl bg-white/30 backdrop-blur-lg flex flex-col items-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-white/40 flex items-center justify-center mb-4">
            <svg
              className="w-16 h-16 text-purple-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.657 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-center text-white drop-shadow-lg">
            {isRegister ? 'Registrarse' : 'Iniciar sesión'}
          </h2>
        </div>

        <form
          onSubmit={handleLogin}
          className="w-full flex flex-col items-center gap-6"
        >
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-white/40 text-white placeholder-white border-b-2 border-purple-400 focus:outline-none focus:border-blue-400 rounded-t-lg text-base sm:text-lg"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-white/40 text-white placeholder-white border-b-2 border-purple-400 focus:outline-none focus:border-blue-400 rounded-t-lg text-base sm:text-lg"
            required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
          <div className="flex w-full max-w-md justify-between text-xs text-white mb-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-purple-600" />
              Recordarme
            </label>
            <a href="#" className="hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
          {error && <div className="text-red-300 text-sm text-center mb-2">{error}</div>}
          <button
            type="submit"
            className="w-full max-w-md py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold shadow hover:scale-105 transition-transform duration-300 text-lg"
            disabled={loading}
          >
            {loading
              ? isRegister
                ? 'Registrando...'
                : 'Ingresando...'
              : isRegister
              ? 'REGISTRARME'
              : 'LOGIN'}
          </button>
          <button
            type="button"
            className="w-full max-w-md py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold shadow hover:scale-105 transition-transform duration-300 text-lg"
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
            }}
          >
            {isRegister ? 'Ya tengo cuenta' : '¿No tienes cuenta? Regístrate'}
          </button>
        </form>
      </div>
    </div>
  )
}
