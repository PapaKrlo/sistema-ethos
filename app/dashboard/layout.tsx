"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  HomeIcon, 
  BuildingOffice2Icon,
  UserGroupIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  ArrowLeftOnRectangleIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline"
import { useAuth } from '../_lib/auth/AuthContext'
import type { UserRole } from '../_lib/auth/AuthContext'
import { UserCircle } from "lucide-react"
import ProtectedRoute from '../_components/ProtectedRoute'
import NotificationProvider from '../_components/ui/notification-provider'
import { ContactInfoReminder } from './_components/ContactInfoReminder'
import { useState } from 'react'

// Menús específicos por rol
const menuItems: Record<UserRole, Array<{ label: string; icon: any; href: string }>> = {
  'Jefe Operativo': [
    {
      label: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      label: "Proyectos",
      icon: BuildingOffice2Icon,
      href: "/dashboard/proyectos"
    },
    {
      label: "Ocupantes y propietarios",
      icon: UserGroupIcon,
      href: "/dashboard/propietarios"
    }
  ],
  'Administrador': [
    {
      label: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      label: "Proyectos",
      icon: BuildingOffice2Icon,
      href: "/dashboard/proyectos"
    },
    {
      label: "Solicitudes",
      icon: ClipboardDocumentListIcon,
      href: "/dashboard/solicitudes"
    },
    // {
    //   label: "Directorio",
    //   icon: BuildingStorefrontIcon,
    //   href: "/dashboard/directorio"
    // },
    {
      label: "Ocupantes y propietarios",
      icon: UserGroupIcon,
      href: "/dashboard/propietarios"
    },
    {
      label: "Correos",
      icon: EnvelopeIcon,
      href: "/dashboard/correos"
    },
    {
      label: "Usuarios",
      icon: UserCircle,
      href: "/dashboard/usuarios"
    }
  ],
  'Directorio': [
    {
      label: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      label: "Proyectos",
      icon: BuildingOffice2Icon,
      href: "/dashboard/proyectos"
    },
    {
      label: "Solicitudes",
      icon: ClipboardDocumentListIcon,
      href: "/dashboard/solicitudes"
    },
    {
      label: "Directorio",
      icon: BuildingStorefrontIcon,
      href: "/dashboard/directorio"
    },
    {
      label: "Ocupantes y propietarios",
      icon: UserGroupIcon,
      href: "/dashboard/propietarios"
    },
    {
      label: "Usuarios",
      icon: UserCircle,
      href: "/dashboard/usuarios"
    }
  ],
  'Propietario': [
    {
      label: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      label: "Mis Propiedades",
      icon: BuildingOffice2Icon,
      href: "/dashboard/mis-propiedades"
    },
    {
      label: "Directorio",
      icon: BuildingStorefrontIcon,
      href: "/dashboard/directorio"
    },
    {
      label: "Mis Documentos",
      icon: DocumentTextIcon,
      href: "/dashboard/mis-documentos"
    },
    {
      label: "Solicitudes",
      icon: ClipboardDocumentListIcon,
      href: "/dashboard/solicitudes"
    },
    {
      label: "Perfil",
      icon: UserCircle,
      href: "/dashboard/perfil"
    }
  ],
  'Arrendatario': [
    {
      label: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      label: "Mi Alquiler",
      icon: BuildingOffice2Icon,
      href: "/dashboard/mi-alquiler"
    },
    {
      label: "Directorio",
      icon: BuildingStorefrontIcon,
      href: "/dashboard/directorio"
    },
    {
      label: "Mis Documentos",
      icon: DocumentTextIcon,
      href: "/dashboard/mis-documentos"
    },
    {
      label: "Solicitudes",
      icon: ClipboardDocumentListIcon,
      href: "/dashboard/solicitudes"
    },
    {
      label: "Perfil",
      icon: UserCircle,
      href: "/dashboard/perfil"
    }
  ]
}

function Sidebar({ items, role, logout, user }: { 
  items: typeof menuItems[UserRole]
  role: UserRole
  logout: () => void
  user: any
}) {
  const pathname = usePathname()
  
  // Filtrar elementos del menú según el usuario
  const filteredItems = items.filter(item => {
    // Solo mostrar el elemento "Correos" al usuario administraciona3
    if (item.href === "/dashboard/correos") {
      return user?.email === 'administraciona3@almax.ec' || user?.username === 'administraciona3';
    }
    return true;
  });

  return (
    <aside className="w-[294px] fixed h-screen backdrop-blur-sm bg-gradient-to-br from-[#05703f] via-[#024728] to-[#01231a] text-white shadow-2xl border-r border-white/5">
      <motion.nav 
        className="flex flex-col h-full"
        initial={{ x: -294, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="pt-8 pl-6 pb-8 flex items-center gap-4">
          <Image 
            src="/ethos-circular-logo.svg" 
            alt="Logo" 
            width={50} 
            height={50} 
            className="transition-all duration-300 hover:scale-110 hover:rotate-[360deg]"
            priority 
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight truncate max-w-[180px]">{user?.email}</span>
            <span className="text-sm text-white/70">{role}</span>
          </div>
        </div>

        <ul className="flex-1 space-y-1 p-4">
          {filteredItems.map((item) => {
            const isActive = item.href === "/dashboard" 
              ? pathname === item.href 
              : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group
                    ${isActive 
                      ? 'bg-white/15 text-white' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-white/70'}`} />
                  <span className="font-medium tracking-wide">{item.label}</span>
                  {isActive && (
                    <motion.div
                      className="absolute left-0 w-1.5 h-8 bg-white rounded-r-full shadow-lg shadow-white/20"
                      layoutId="activeIndicator"
                      transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    />
                  )}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={false}
                  />
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={logout}
            className="w-full bg-gradient-to-r from-[#008A4B] to-[#006837] text-white py-3 px-4 rounded-xl font-medium
              hover:from-[#006837] hover:to-[#004d29] transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-[#008A4B]/20"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
            Cerrar sesión
          </button>
        </div>
      </motion.nav>
    </aside>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  if (!user || !role) {
    // console.log('No hay usuario o rol:', { user, role })
    return null
  }

  // Verificar si el rol es válido
  if (!menuItems[role]) {
    console.log('Rol no válido:', role)
    return null
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex overflow-hidden bg-gray-100">
        <Sidebar items={menuItems[role]} role={role} logout={logout} user={user} />
        <div className="flex-1 ml-[294px] overflow-auto">
          <main className="p-8 min-h-screen">{children}</main>
        </div>
        <NotificationProvider />
        <ContactInfoReminder />
      </div>
    </ProtectedRoute>
  )
} 