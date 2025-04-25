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
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline"
import { useAuth } from '../_lib/auth/AuthContext'
import type { UserRole } from '../_lib/auth/AuthContext'
import { UserCircle } from "lucide-react"
import ProtectedRoute from '../_components/ProtectedRoute'
import NotificationProvider from '../_components/ui/notification-provider'
import { ContactInfoReminder } from './_components/ContactInfoReminder'
import { useState, useEffect } from 'react'

// Interfaz para los elementos del menú, incluyendo sub-items opcionales
interface MenuItem {
  label: string;
  icon: any;
  href?: string; // href es opcional si hay subItems
  subItems?: Array<{ label: string; href: string }>;
}

// Menús específicos por rol usando la nueva interfaz
const menuItems: Record<UserRole, Array<MenuItem>> = {
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
    },
    {
      label: "Reportes",
      icon: ChartBarIcon,
      href: "/dashboard/reportes"
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
    },
    {
      label: "Reportes",
      icon: ChartBarIcon,
      href: "/dashboard/reportes"
    },
    { // Elemento Facturación y Cobranza con sub-items
      label: "Facturación y Cobranza",
      icon: CurrencyDollarIcon,
      // href: "/dashboard/facturacion-cobranza", // Opcional: enlace directo al primer sub-item
      subItems: [
        { label: "Prefacturas", href: "/dashboard/facturacion-cobranza" },
        { label: "Facturas", href: "/dashboard/facturacion-cobranza/facturas" },
        { label: "Pagos", href: "/dashboard/facturacion-cobranza/pagos" },
        { label: "Configuración", href: "/dashboard/facturacion-cobranza/configuracion" }
      ]
    },
    {
      label: "Mesa de Ayuda",
      icon: ChatBubbleBottomCenterTextIcon,
      href: "/dashboard/mesa-de-ayuda"
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
    },
    {
      label: "Reportes",
      icon: ChartBarIcon,
      href: "/dashboard/reportes"
    },
    { // Elemento Facturación y Cobranza con sub-items
      label: "Facturación y Cobranza",
      icon: CurrencyDollarIcon,
      subItems: [
        { label: "Prefacturas", href: "/dashboard/facturacion-cobranza" },
        { label: "Facturas", href: "/dashboard/facturacion-cobranza/facturas" },
        { label: "Pagos", href: "/dashboard/facturacion-cobranza/pagos" },
        { label: "Configuración", href: "/dashboard/facturacion-cobranza/configuracion" }
      ]
    },
    {
      label: "Mesa de Ayuda",
      icon: ChatBubbleBottomCenterTextIcon,
      href: "/dashboard/mesa-de-ayuda"
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
    },
    {
      label: "Mesa de Ayuda",
      icon: ChatBubbleBottomCenterTextIcon,
      href: "/dashboard/mesa-de-ayuda"
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
    // {
    //   label: "Solicitudes",
    //   icon: ClipboardDocumentListIcon,
    //   href: "/dashboard/solicitudes"
    // },
    {
      label: "Perfil",
      icon: UserCircle,
      href: "/dashboard/perfil"
    },
    {
      label: "Mesa de Ayuda",
      icon: ChatBubbleBottomCenterTextIcon,
      href: "/dashboard/mesa-de-ayuda"
    }
  ]
}

// Estado para elementos desplegados
type ExpandedState = {
  [key: string]: boolean;
};

function Sidebar({ items, role, logout, user, isCollapsed, toggleSidebar }: {
  items: MenuItem[] // Usar la nueva interfaz
  role: UserRole
  logout: () => void
  user: any
  isCollapsed: boolean
  toggleSidebar: () => void
}) {
  const pathname = usePathname()
  // Estado para controlar qué items están expandidos
  const [expandedItems, setExpandedItems] = useState<ExpandedState>(() => {
    // Inicializar como expandido si la ruta actual pertenece a un sub-item
    const initialState: ExpandedState = {};
    items.forEach(item => {
      if (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href))) {
        initialState[item.label] = true;
      }
    });
    return initialState;
  });

  // Función para manejar el click en un item padre
  const handleToggleExpand = (label: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  // Filtrar elementos del menú según el usuario
  const filteredItems = items.filter(item => {
    // Solo mostrar el elemento "Correos" al usuario administraciona3
    if (item.href === "/dashboard/correos") {
      return user?.email === 'administraciona3@almax.ec' || user?.username === 'administraciona3';
    }
    // Ocultar elementos sin href y sin subitems (si los hubiera)
    if (!item.href && !item.subItems) return false;
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
      <div className="flex flex-col h-full">
        {/* Restaurar sección superior con logo y user info */}
        <div className={`pt-8 ${isCollapsed ? 'px-0 flex justify-center' : 'pl-6'} pb-8 flex items-center gap-4 relative`}>
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
          {/* Botón colapsar/expandir (estilo anterior) */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 bottom-2 bg-gradient-to-r from-[#008A4B]/70 to-[#006837]/70 rounded-full p-1.5 shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 z-10 backdrop-blur-sm"
            aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4 text-white" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        {/* Menú principal */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isParentActive = item.subItems?.some(sub => pathname.startsWith(sub.href)) || false;
            const isActive = (!item.subItems && pathname === item.href) || isParentActive;
            const isExpanded = expandedItems[item.label] || false;

            if (item.subItems) {
              // Renderizar item padre desplegable
              return (
                <div key={item.label}>
                  <button
                    onClick={() => handleToggleExpand(item.label)}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors duration-150 ${
                      isParentActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className={`w-6 h-6 shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && (
                      <span className="flex-1 text-left">{item.label}</span>
                    )}
                     {!isCollapsed && (isExpanded ? <ChevronUpIcon className="w-4 h-4 ml-2 shrink-0" /> : <ChevronDownIcon className="w-4 h-4 ml-2 shrink-0" />)}
                  </button>
                  {/* Sub-items (mostrados si están expandidos y el sidebar no está colapsado) */}
                  {!isCollapsed && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-1 ml-5 pl-4 border-l border-white/10 space-y-1"
                    >
                      {item.subItems.map((subItem) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.label}
                            href={subItem.href}
                            className={`flex items-center p-2 rounded-md text-sm transition-colors duration-150 ${
                              isSubActive ? 'bg-white/10 text-white font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              );
            } else if (item.href) {
              // Renderizar item simple (enlace directo)
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center p-3 rounded-lg transition-colors duration-150 ${
                    isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : undefined} // Tooltip cuando está colapsado
                >
                  <Icon className={`w-6 h-6 shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            }
            return null; // No renderizar si no tiene href ni subItems
          })}
        </nav>

        {/* Footer del Sidebar (Usuario y Logout) */}
        <div className={`${isCollapsed ? 'px-2 pb-6' : 'p-4 pb-6'} mt-auto border-t border-white/10`}>
           <button
             onClick={logout}
             className={`w-full bg-gradient-to-r from-[#008A4B] to-[#006837] text-white py-3.5 ${isCollapsed ? 'px-2' : 'px-4'} rounded-xl font-medium
               hover:from-[#006837] hover:to-[#004d29] transition-all duration-300 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} group shadow-lg shadow-[#008A4B]/20`}
             title={isCollapsed ? "Cerrar sesión" : ""}
           >
             <ArrowLeftOnRectangleIcon className={`w-5 h-5 transition-transform duration-300 ${!isCollapsed ? 'group-hover:-translate-x-1' : ''}`} />
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
      </div>
    </motion.aside>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, logout, isLoading, hasPermission /* quitar hasPermission si no se usa aquí */ } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // --- Lógica de Protección (movida desde ProtectedRoute) ---
  useEffect(() => {
    // Redirigir si no está cargando y no hay usuario (y no estamos en /auth)
    if (!isLoading && !user && !pathname.startsWith('/auth')) {
      console.log('DashboardLayout: No user found, redirecting to login.');
      router.push('/login');
    }
    // Podríamos añadir lógica de permisos aquí si fuera necesario para el layout general,
    // pero usualmente se maneja en páginas específicas o componentes.
  }, [user, isLoading, router, pathname]);

  // Mostrar spinner mientras carga
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  // Si no hay usuario después de cargar (y no estamos en /auth), no renderizar nada 
  // (la redirección ya debería estar en proceso desde useEffect)
  if (!user && !pathname.startsWith('/auth')) {
     return null;
  }
  // --- Fin Lógica de Protección ---

  // Función para colapsar/expandir el sidebar
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Validar que el rol exista y tenga items definidos
  const currentMenuItems = role && menuItems[role] ? menuItems[role] : []

  // Si estamos en una ruta de autenticación, solo renderizar children (ej. la página de login)
  if (pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  // Renderizar layout completo si el usuario está autenticado
  return (
    // Ya no se necesita <ProtectedRoute>
    <>
      <NotificationProvider />
      <div className="flex h-screen bg-[#f8fafc]">
        {user && role && ( // Asegurarse de tener usuario y rol para el sidebar
          <Sidebar
            items={currentMenuItems}
            role={role}
            logout={logout}
            user={user}
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
          />
        )}
        <motion.main
          initial={false}
          animate={{ marginLeft: user && role ? (isSidebarCollapsed ? 80 : 294) : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {user && role && <ContactInfoReminder />}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </div>
        </motion.main>
      </div>
    </>
    // Fin del wrapper eliminado
  )
} 