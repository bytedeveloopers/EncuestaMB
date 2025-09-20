import React, { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

// tipos de rol
type Role = "ADMIN" | "JURADO" | "PUBLICO" | null;

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [nombre, setNombre] = useState<string>("");
  const [role, setRole] = useState<Role>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // resolver rol real
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");
      setNombre(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "");

      // 1) rol desde el token JWT
      const jwtRole =
        (user.app_metadata as any)?.role?.toString()?.toUpperCase() || "";

      // 2) rol desde la tabla usuarios
      const { data: row } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .single();

      const dbRole = row?.rol?.toString()?.toUpperCase() || "";

      if (jwtRole === "ADMIN" || dbRole === "ADMIN") {
        setRole("ADMIN");
      } else if (dbRole === "JURADO") {
        setRole("JURADO");
      } else {
        setRole("PUBLICO");
      }
    })();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between items-center fixed top-0 left-0 w-full z-50 shadow-lg">
      <div className="font-bold text-xl flex items-center gap-4">
        EncuestaMB
        <span className="bg-white text-blue-700 px-2 py-1 rounded text-xs font-semibold">
          {nombre ? `${nombre} · ` : ""}
          {role === "ADMIN"
            ? "Administrador"
            : role === "JURADO"
            ? "Jurado"
            : role === "PUBLICO"
            ? "Usuario"
            : "Cargando..."}
        </span>
      </div>
      {/* Menú desktop */}
      <div className="hidden md:flex gap-4 items-center">
        <Link to="/" className="hover:underline">Home</Link>
        {role === "ADMIN" && <><Link to="/registros" className="hover:underline">Registros</Link><Link to="/crear-votacion" className="hover:underline">Crear Votación</Link><Link to="/encuesta-disponible" className="hover:underline">Encuesta Disponible</Link></>}
        {role === "JURADO" && <><Link to="/encuesta-disponible" className="hover:underline">Encuesta Disponible</Link><Link to="/estadisticas" className="hover:underline">Estadísticas</Link></>}
        {role === "PUBLICO" && <><Link to="/encuesta-disponible" className="hover:underline">Encuesta Disponible</Link></>}
        <button onClick={handleLogout} className="ml-4 px-3 py-1 bg-red-500 rounded hover:bg-red-700 transition-colors">Cerrar sesión</button>
      </div>
      {/* Menú móvil */}
      <div className="md:hidden flex items-center">
        <button onClick={() => setMenuOpen(!menuOpen)} className="focus:outline-none">
          {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>
      {/* Drawer menú móvil */}
      <div className={`fixed top-0 left-0 w-full h-full bg-blue-900/80 z-50 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden`}> 
        <div className="flex flex-col gap-6 p-8 pt-20 text-lg">
          <button onClick={() => setMenuOpen(false)} className="self-end mb-4"><FaTimes size={28} /></button>
          <Link to="/" className="hover:underline" onClick={() => setMenuOpen(false)}>Home</Link>
          {role === "ADMIN" && <><Link to="/registros" className="hover:underline" onClick={() => setMenuOpen(false)}>Registros</Link><Link to="/crear-votacion" className="hover:underline" onClick={() => setMenuOpen(false)}>Crear Votación</Link><Link to="/encuesta-disponible" className="hover:underline" onClick={() => setMenuOpen(false)}>Encuesta Disponible</Link></>}
          {role === "JURADO" && <><Link to="/encuesta-disponible" className="hover:underline" onClick={() => setMenuOpen(false)}>Encuesta Disponible</Link><Link to="/estadisticas" className="hover:underline" onClick={() => setMenuOpen(false)}>Estadísticas</Link></>}
          {role === "PUBLICO" && <><Link to="/encuesta-disponible" className="hover:underline" onClick={() => setMenuOpen(false)}>Encuesta Disponible</Link></>}
          <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="mt-4 px-3 py-2 bg-red-500 rounded hover:bg-red-700 transition-colors">Cerrar sesión</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
