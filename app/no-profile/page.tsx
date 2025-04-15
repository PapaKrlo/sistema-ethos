'use client'

import Image from 'next/image'
import { useAuth } from '../_lib/auth/AuthContext'
import { motion } from 'framer-motion'

export default function NoProfilePage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#024728] h-[70px] flex items-center justify-center">
        <Image src="/logo.svg" alt="Logo" width={150} height={50} priority />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="border-l-4 border-[#008A4B] px-8 py-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">
              Cuenta sin Perfil Asignado
            </h1>
            <p className="text-gray-600 mb-6">
              Hola {user?.username}, tu cuenta ha sido creada exitosamente pero aún no tiene un perfil asignado. 
              Por favor, contacta al administrador del sistema para que te asigne uno de los siguientes perfiles:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-8">
              <li>Jefe Operativo</li>
              <li>Administrador</li>
              <li>Directorio</li>
              <li>Propietario</li>
              <li>Arrendatario</li>
            </ul>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Email de contacto: mmera@ethos.com.ec
              </p>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
} 