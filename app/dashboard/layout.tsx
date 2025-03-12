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
  ChevronLeftIcon,
  ChevronRightIcon,
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

function Sidebar({ items, role, logout, user, isCollapsed, toggleSidebar }: { 
  items: typeof menuItems[UserRole]
  role: UserRole
  logout: () => void
  user: any
  isCollapsed: boolean
  toggleSidebar: () => void
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
    <motion.aside 
      initial={false}
      animate={{ 
        width: isCollapsed ? 80 : 294 
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed h-screen backdrop-blur-sm bg-gradient-to-br from-[#05703f] via-[#024728] to-[#01231a] text-white shadow-2xl border-r border-white/5"
    >
      <motion.nav 
        className="flex flex-col h-full relative"
        initial={{ x: -294, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <button 
          onClick={toggleSidebar}
          className="absolute -right-3 bottom-24 bg-gradient-to-r from-[#008A4B]/70 to-[#006837]/70 rounded-full p-1.5 shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 z-10 backdrop-blur-sm"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 text-white" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4 text-white" />
          )}
        </button>

        <div className={`pt-8 ${isCollapsed ? 'px-0 flex justify-center' : 'pl-6'} pb-8 flex items-center gap-4`}>
          <Image 
            src="/ethos-circular-logo.svg" 
            alt="Logo" 
            width={isCollapsed ? 40 : 50} 
            height={isCollapsed ? 40 : 50} 
            className="transition-all duration-300 hover:scale-110 hover:rotate-[360deg]"
            priority 
          />
          {!isCollapsed && (
            <motion.div 
              className="flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="font-semibold text-sm tracking-tight truncate max-w-[180px]">{user?.email}</span>
              <span className="text-sm text-white/70">{role}</span>
            </motion.div>
          )}
        </div>

        <ul className={`flex-1 space-y-1 ${isCollapsed ? 'px-2' : 'p-4'}`}>
          {filteredItems.map((item) => {
            const isActive = item.href === "/dashboard" 
              ? pathname === item.href 
              : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group
                    ${isActive 
                      ? 'bg-white/15 text-white' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                  title={isCollapsed ? item.label : ""}
                >
                  <item.icon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-white/70'}`} />
                  {!isCollapsed && (
                    <motion.span 
                      className="font-medium tracking-wide"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
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

        <div className={`${isCollapsed ? 'px-2 pb-6' : 'p-4 pb-6'} border-t border-white/10`}>
          <button 
            onClick={logout}
            className={`w-full bg-gradient-to-r from-[#008A4B] to-[#006837] text-white py-3.5 ${isCollapsed ? 'px-2 mt-4' : 'px-4 mt-4'} rounded-xl font-medium
              hover:from-[#006837] hover:to-[#004d29] transition-all duration-300 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} group shadow-lg shadow-[#008A4B]/20`}
            title={isCollapsed ? "Cerrar sesión" : ""}
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                Cerrar sesión
              </motion.span>
            )}
          </button>
        </div>
      </motion.nav>
    </motion.aside>
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
        <Sidebar 
          items={menuItems[role]} 
          role={role} 
          logout={logout} 
          user={user} 
          isCollapsed={!isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
        <motion.div 
          className="flex-1 overflow-auto"
          initial={false}
          animate={{ 
            marginLeft: isSidebarOpen ? 294 : 80 
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <main className="p-8 min-h-screen">{children}</main>
        </motion.div>
        <NotificationProvider />
        <ContactInfoReminder />
      </div>
    </ProtectedRoute>
  )
} 