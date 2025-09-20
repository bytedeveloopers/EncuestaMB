import React from "react";

const Home: React.FC = () => (
  <div className="fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-400" style={{paddingTop: '72px'}}>
  <div className="w-full max-w-3xl mx-2 sm:mx-auto px-4 sm:px-8 py-10 sm:py-16 rounded-3xl shadow-2xl bg-white/30 backdrop-blur-lg flex flex-col items-center">
      <h1 className="text-5xl font-extrabold text-blue-900 mb-6 drop-shadow-lg text-center">¡Bienvenido!</h1>
      <p className="text-xl text-blue-800 mb-8 text-center">
        Has ingresado al sistema de encuestas.<br />
        Desde la barra superior puedes acceder a todas las funciones disponibles según tu perfil.<br />
        <span className="font-semibold text-purple-700">Participa, crea y consulta resultados en tiempo real.</span>
      </p>
      <img src="/vite.svg" alt="Logo" className="w-32 h-32 mb-6 animate-bounce" />
      <div className="text-lg text-gray-700 text-center">¡Gracias por ser parte de la comunidad!</div>
    </div>
  </div>
);

export default Home;
