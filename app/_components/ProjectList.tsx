import { motion } from "framer-motion";

export default function ProjectList() {
  return (
    <section className="py-16 px-8">
      <h2 className="font-dmSans font-bold text-5xl text-center mb-16">Nuestros Proyectos</h2>
      
      {/* Mobile layout (1x4) */}
      <div className="container mx-auto sm:hidden flex flex-col space-y-6">
        <ProjectCard 
          image="/proyectos-propiedades.png"
          title="Propiedades"
          className="h-[300px]"
        />
        <ProjectCard 
          image="/proyectos-residenciales.png"
          title="Residenciales"
          className="h-[300px]"
        />
        <ProjectCard 
          image="/proyectos-centros-operaciones.png"
          title="Centros de operaciones"
          className="h-[300px]"
        />
        <ProjectCard 
          image="/proyectos-plazas-comerciales.png"
          title="Plazas comerciales"
          className="h-[300px]"
        />
      </div>

      {/* Tablet layout (2x2) */}
      <div className="hidden sm:grid lg:hidden container mx-auto grid-cols-2 gap-6">
        <ProjectCard 
          image="/proyectos-propiedades.png"
          title="Propiedades"
          className="h-[350px]"
        />
        <ProjectCard 
          image="/proyectos-residenciales.png"
          title="Residenciales"
          className="h-[350px]"
        />
        <ProjectCard 
          image="/proyectos-centros-operaciones.png"
          title="Centros de operaciones"
          className="h-[350px]"
        />
        <ProjectCard 
          image="/proyectos-plazas-comerciales.png"
          title="Plazas comerciales"
          className="h-[350px]"
        />
      </div>

      {/* Large screen layout (complex with smaller text) */}
      <div className="hidden lg:grid xl:hidden container mx-auto grid-cols-12 gap-6">
        {/* Left column - Propiedades */}
        <div className="col-span-4">
          <ProjectCard 
            image="/proyectos-propiedades.png"
            title="Propiedades"
            className="h-[488px]"
          />
        </div>

        {/* Middle column - Residenciales */}
        <div className="col-span-3">
          <ProjectCard 
            image="/proyectos-residenciales.png"
            title="Residenciales"
            className="h-[488px]"
          />
        </div>

        {/* Right column - Stacked images */}
        <div className="col-span-5 space-y-6">
          <ProjectCard 
            image="/proyectos-centros-operaciones.png"
            title="Centros de operaciones"
            className="h-[198px]"
          />
          <ProjectCard 
            image="/proyectos-plazas-comerciales.png"
            title="Plazas comerciales"
            className="h-[270px]"
          />
        </div>
      </div>

      {/* XL screen layout */}
      <div className="hidden xl:grid container mx-auto grid-cols-12 gap-6">
        {/* Left column - Propiedades */}
        <div className="col-span-4">
          <ProjectCard 
            image="/proyectos-propiedades.png"
            title="Propiedades"
            className="h-[488px]"
          />
        </div>

        {/* Middle column - Residenciales */}
        <div className="col-span-3">
          <ProjectCard 
            image="/proyectos-residenciales.png"
            title="Residenciales"
            className="h-[488px]"
          />
        </div>

        {/* Right column - Stacked images */}
        <div className="col-span-5 space-y-6">
          <ProjectCard 
            image="/proyectos-centros-operaciones.png"
            title="Centros de operaciones"
            className="h-[198px]"
          />
          <ProjectCard 
            image="/proyectos-plazas-comerciales.png"
            title="Plazas comerciales"
            className="h-[270px]"
          />
        </div>
      </div>
    </section>
  )
}

// Componente reutilizable para las cards con efectos hover
function ProjectCard({ image, title, className = "" }: { image: string, title: string, className?: string }) {
  return (
    <motion.div 
      className={`relative w-full overflow-hidden group ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative w-full h-full">
        <div className="absolute inset-0 w-full h-full">
          <motion.img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300"></div>
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <motion.div
            initial={{ y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-white font-dmSans font-bold text-2xl lg:text-[28px] xl:text-[35px] transform group-hover:scale-105 transition-transform duration-300">
              {title}
            </h3>
            {/* <p className="text-white/0 group-hover:text-white/90 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 text-sm mt-2">
            Haz clic para explorar más
              Haz clic para explorar más sobre {title.toLowerCase()}
            </p> */}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

