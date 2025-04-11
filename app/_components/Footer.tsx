export default function Footer() {
  return (
    <footer className="bg-[#024728] text-white md:py-6 pt-9 relative overflow-hidden">
      <div className="container mx-auto text-center space-y-4 relative z-10 min-h-[0px] md:min-h-[120px] lg:min-h-[150px] xl:min-h-[170px] 2xl:min-h-[200px]">
        <p className="text-sm">© 2025 Ethos S.A.S. Todos los derechos reservados.</p>
        <div className="space-x-6 text-sm">
          {/* <a href="#" className="underline hover:text-gray-200">
            Proyectos
          </a> */}
          <a href="#" className="underline hover:text-gray-200">
            Políticas de privacidad
          </a>
          <a href="#" className="underline hover:text-gray-200">
            Términos y condiciones
          </a>
        </div>
      </div>
      {/* Logo ETHOS cortado */}
      <div className="relative md:absolute md:bottom-[-4%] bottom-[-10%] left-1/2 transform -translate-x-1/2 md:w-7/12 w-11/12">
        <img
          src="/logo.svg"
          alt="ETHOS S.A.S"
          className="w-full 2xl:pt-4 md:pt-0 pt-8"
        />
      </div>
    </footer>
  )
}

