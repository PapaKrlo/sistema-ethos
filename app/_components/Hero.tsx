import { motion } from "framer-motion";

export default function Hero() {
  return (
    <div className="relative h-[759px] bg-black overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/almax3-cover.jpg')] bg-cover bg-center transform scale-105 hover:scale-100 transition-transform duration-[2000ms]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-7xl font-bold text-center max-w-[450px] mb-6 bg-clip-text bg-gradient-to-r from-white to-gray-300">
            Gestión de propiedades.
          </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl text-center max-w-[450px] mb-12 text-gray-300"
        >
          Manejamos propiedades con los más altos estándares de calidad y servicio.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-4"
        >
          {/* <button className="bg-[#008A4B] hover:bg-[#006837] text-white font-semibold py-3 px-8 rounded-lg transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#008A4B]/30">
            Ver proyectos
          </button> */}
          {/* <button className="border-2 border-white/80 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg transform transition-all duration-300 hover:scale-105">
            Contáctanos
          </button> */}
        </motion.div>
      </div>
    </div>
  )
}

