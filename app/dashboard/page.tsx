'use client'

import { SummaryCards } from "./_components/SummaryCards"
import { RecentRequests } from "./_components/RecentRequests"
import { Button } from "../_components/ui/button"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { gql, useQuery } from '@apollo/client'
import { 
  ArrowDownTrayIcon, 
  ArrowRightIcon,
  CalendarIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline"
import { useAuth } from '../_lib/auth/AuthContext'
import type { UserRole } from '../_lib/auth/AuthContext'

const containerAnimation = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemAnimation = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

// Consulta GraphQL para obtener las propiedades del cliente
const GET_CLIENT_PROPERTIES = gql`
  query GetClientProperties($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      propiedades {
        documentId
        imagen {
          documentId
          url
        }
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
        estadoUso
        estadoEntrega
        estadoDeConstruccion
        actividad
        montoFondoInicial
        montoAlicuotaOrdinaria
        areaTotal
        areasDesglosadas {
          area
          tipoDeArea
        }
        modoIncognito
      }
    }
  }
`;

// Interfaces para las propiedades
interface PropertyData {
  documentId: string;
  imagen?: {
    documentId: string;
    url: string;
  };
  identificadores?: {
    idSuperior: string;
    superior: string;
    idInferior: string;
    inferior: string;
  };
  estadoUso: string;
  estadoEntrega: string;
  estadoDeConstruccion: string;
  actividad: string;
  montoFondoInicial: number;
  montoAlicuotaOrdinaria: number;
  areaTotal: number;
  areasDesglosadas?: Array<{
    area: number;
    tipoDeArea: string;
  }>;
  modoIncognito: boolean;
}

interface Property {
  id: string;
  name: string;
  location: string;
  area: string;
  status?: string;
  image: string;
  lote: string;
  isRented: boolean;
}

// Configuración de acciones rápidas por rol
const quickActions: Record<UserRole, Array<{
  title: string
  description: string
  actionLabel: string
  href: string
  icon: React.ElementType
}>> = {
  'Jefe Operativo': [
    {
      title: "Añadir Propiedad",
      description: "Registra una nueva propiedad en el sistema",
      actionLabel: "Crear propiedad",
      href: "/dashboard/proyectos/nuevo",
      icon: BuildingOffice2Icon
    },
    {
      title: "Ver Reportes",
      description: "Accede a los reportes y estadísticas",
      actionLabel: "Ver reportes",
      href: "/dashboard/reportes",
      icon: ChartBarIcon
    }
  ],
  'Administrador': [
    {
      title: "Gestionar Usuarios",
      description: "Administra los usuarios del sistema",
      actionLabel: "Gestionar usuarios",
      href: "/dashboard/usuarios",
      icon: UserGroupIcon
    },
    {
      title: "Gestionar Solicitudes",
      description: "Administra las solicitudes del sistema",
      actionLabel: "Gestionar solicitudes",
      href: "/dashboard/solicitudes",
      icon: ClipboardDocumentListIcon
    },
    // {
    //   title: "Reportes",
    //   description: "Accede a los reportes que has creado",
    //   actionLabel: "Ver reportes",
    //   href: "/dashboard/reportes",
    //   icon: ChartBarIcon
    // }
  ],
  'Directorio': [
    {
      title: "Gestionar Usuarios",
      description: "Administra los usuarios del sistema",
      actionLabel: "Gestionar usuarios",
      href: "/dashboard/usuarios",
      icon: UserGroupIcon
    },
    {
      title: "Gestionar Solicitudes",
      description: "Administra las solicitudes del sistema",
      actionLabel: "Gestionar solicitudes",
      href: "/dashboard/solicitudes",
      icon: ClipboardDocumentListIcon
    },
    // {
    //   title: "Reportes",
    //   description: "Accede a los reportes que has creado",
    //   actionLabel: "Ver reportes",
    //   href: "/dashboard/reportes",
    //   icon: ChartBarIcon
    // }
  ],
  'Propietario': [
    {
      title: "Mis Propiedades",
      description: "Visualiza tus propiedades registradas",
      actionLabel: "Ver propiedades",
      href: "/dashboard/mis-propiedades",
      icon: BuildingOffice2Icon
    },
    {
      title: "Nueva Solicitud",
      description: "Crea una nueva solicitud de servicio",
      actionLabel: "Crear solicitud",
      href: "/dashboard/solicitudes/nuevo",
      icon: ClipboardDocumentListIcon
    },
    {
      title: "Mis Documentos",
      description: "Accede a tus documentos",
      actionLabel: "Ver documentos",
      href: "/dashboard/mis-documentos",
      icon: DocumentTextIcon
    }
  ],
  'Arrendatario': [
    {
      title: "Mi Alquiler",
      description: "Detalles de tu propiedad alquilada",
      actionLabel: "Ver detalles",
      href: "/dashboard/mi-alquiler",
      icon: BuildingOffice2Icon
    },
    {
      title: "Nueva Solicitud",
      description: "Crea una nueva solicitud de servicio",
      actionLabel: "Crear solicitud",
      href: "/dashboard/solicitudes/nuevo",
      icon: ClipboardDocumentListIcon
    },
    {
      title: "Mis Documentos",
      description: "Accede a tus documentos",
      actionLabel: "Ver documentos",
      href: "/dashboard/mis-documentos",
      icon: DocumentTextIcon
    }
  ]
}

// Contenido del dashboard por rol
const dashboardContent: Record<UserRole, {
  title: string
  description: string
}> = {
  'Jefe Operativo': {
    title: "Panel Operativo",
    description: "Gestión de propiedades y proyectos"
  },
  'Administrador': {
    title: "Panel Administrativo",
    description: "Gestión general del sistema"
  },
  'Directorio': {
    title: "Panel Directivo",
    description: "Supervisión y aprobaciones"
  },
  'Propietario': {
    title: "Mi Panel",
    description: "Gestión de tus propiedades"
  },
  'Arrendatario': {
    title: "Mi Panel",
    description: "Gestión de tu alquiler"
  }
}

// Estilos para los estados de las propiedades
const statusColors: Record<string, string> = {
  'enUso': 'bg-emerald-100 text-emerald-800',
  'disponible': 'bg-blue-100 text-blue-800',
  'enConstruccion': 'bg-amber-100 text-amber-800',
  'enRemodelacion': 'bg-purple-100 text-purple-800'
};

export default function DashboardPage() {
  const { user, role } = useAuth()
  
  if (!role) return null

  const content = dashboardContent[role]
  const actions = quickActions[role]

  // Roles que pueden ver solicitudes
  const canViewRequests = ['Administrador', 'Directorio', 'Propietario', 'Arrendatario']
  
  // Consulta GraphQL para obtener las propiedades del cliente
  const { data: clientData, loading: clientLoading } = useQuery(GET_CLIENT_PROPERTIES, {
    variables: { 
      documentId: user?.perfil_cliente?.documentId 
    },
    skip: !user?.perfil_cliente?.documentId || (role !== 'Propietario' && role !== 'Arrendatario')
  });
  
  // Propiedades del cliente (propietario o arrendatario)
  const properties: Property[] = clientData?.perfilCliente?.propiedades?.map((prop: PropertyData) => ({
    id: prop.documentId,
    name: ` ${prop.identificadores?.superior || ''} ${prop.identificadores?.idSuperior || ''}`,
    location: prop.actividad || '',
    area: `${prop.areaTotal || 0} m²`,
    status: prop.estadoUso || '',
    image: prop.imagen?.url || '/bodega.png',
    lote: `${prop.identificadores?.inferior || ''} ${prop.identificadores?.idInferior || ''}`,
    isRented: prop.estadoUso === 'enUso'
  })) || [];
  
  // Limitar a mostrar solo 3 propiedades en el dashboard
  const displayProperties = properties.slice(0, 3);
  const hasMoreProperties = properties.length > 3;
  const showProperties = (role === 'Propietario' || role === 'Arrendatario') && !clientLoading && properties.length > 0;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerAnimation}
      className="space-y-8"
    >
      {/* Header Section */}
      <motion.div 
        variants={itemAnimation}
        className="bg-white border rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="border-l-4 border-[#008A4B] px-8 py-6">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CalendarIcon className="w-5 h-5" />
            <span className="text-sm font-medium">
              {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{content.title}</h1>
          <p className="text-gray-600 mt-1">
            {content.description}
          </p>
        </div>
      </motion.div>

      {/* Summary Cards Section */}
      <motion.div variants={itemAnimation}>
        <SummaryCards role={role} />
      </motion.div>
      
      {/* Propiedades Section - Solo para propietarios y arrendatarios */}
      {showProperties && (
        <motion.div variants={itemAnimation}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Tus propiedades</h2>
            <Link 
              href={role === 'Propietario' ? "/dashboard/mis-propiedades" : "/dashboard/mi-alquiler"}
              className="text-[#008A4B] hover:text-[#006837] text-sm font-medium flex items-center gap-1"
            >
              Ver todas {hasMoreProperties && `(${properties.length})`}
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProperties.map((property: Property) => (
              <motion.div
                key={property.id}
                className="bg-white rounded-xl overflow-hidden border group hover:shadow-lg transition-all duration-200"
                whileHover={{ y: -4 }}
              >
                <div className="relative h-48">
                  <Image
                    src={property.image}
                    alt={property.name}
                    fill
                    className="object-cover"
                  />
                  {property.status && (
                    <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
                      {property.status}
                    </span>
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 px-2 py-1 rounded text-xs font-medium">
                    {property.area}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-lg">{property.name}</h3>
                  <p className="text-gray-500 text-sm mb-1">{property.lote}</p>
                  <p className="text-gray-500 text-sm">{property.location}</p>
                  <Link 
                    href={role === 'Propietario' ? `/dashboard/mis-propiedades/${property.id}` : `/dashboard/mi-alquiler/${property.id}`}
                    className="mt-4 inline-flex items-center text-[#008A4B] hover:text-[#006837] text-sm font-medium"
                  >
                    Ver detalles
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions Section */}
      <motion.div variants={itemAnimation}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((action, index) => (
            <QuickActionCard
              key={index}
              title={action.title}
              description={action.description}
              actionLabel={action.actionLabel}
              href={action.href}
              Icon={action.icon}
            />
          ))}
        </div>
      </motion.div>

      {/* Recent Requests Section - Solo visible para roles específicos */}
      {canViewRequests.includes(role) && (
        <motion.div variants={itemAnimation}>
          <RecentRequests role={role} />
        </motion.div>
      )}
    </motion.div>
  )
}

function QuickActionCard({ 
  title, 
  description, 
  actionLabel, 
  href,
  Icon
}: { 
  title: string
  description: string
  actionLabel: string
  href: string
  Icon: React.ElementType
}) {
  return (
    <motion.div 
      variants={itemAnimation}
      className="bg-white rounded-2xl border p-6 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-start gap-4">
        <div className="bg-[#008A4B]/10 rounded-xl p-3">
          <Icon className="w-6 h-6 text-[#008A4B]" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-500 mt-1 mb-4">{description}</p>
          <Link 
            href={href}
            className="inline-flex items-center text-[#008A4B] hover:text-[#006837] font-medium"
          >
            {actionLabel}
            <svg
              className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.div>
  )
} 