'use client'

import { useEffect, useState } from 'react'
import { Badge } from "../../_components/ui/badge"
import type { UserRole } from '../../_lib/auth/AuthContext'
import { gql, useQuery } from '@apollo/client'
import { useAuth } from '../../_lib/auth/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

// Consulta para obtener solicitudes recientes
const GET_SOLICITUDES_RECIENTES = gql`
  query GetSolicitudesRecientes($filters: SolicitudFiltersInput) {
    solicitudes(
      sort: "fechaActualizacion:desc"
      filters: $filters
      pagination: { limit: 4 }
    ) {
      documentId
      tipoSolicitud
      estado
      fechaCreacion
      fechaActualizacion
      detallesSolicitud {
        descripcion
      }
      propiedad {
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        } 
        proyecto {
          nombre
        }
      }
    }
  }
`;

interface RecentRequestsProps {
  role: UserRole
}

interface Solicitud {
  id: string;
  tipoSolicitud: string;
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  detallesSolicitud?: {
    descripcion?: string;
  };
  propiedad?: {
    identificadores?: {
      idSuperior?: string;
      superior?: string;
      idInferior?: string;
      inferior?: string;
    };
    proyecto?: {
      nombre?: string;
    };
  };
}

const statusStyles: Record<string, string> = {
  pendiente_certificado: "bg-yellow-100 text-yellow-800",
  pendiente_revision: "bg-yellow-100 text-yellow-800",
  en_revision: "bg-blue-100 text-blue-800",
  aprobado: "bg-green-100 text-green-800",
  rechazado: "bg-red-100 text-red-800",
  cancelado: "bg-gray-100 text-gray-800",
  completado: "bg-green-100 text-green-800"
};

// Función para formatear fecha
const formatearFecha = (fecha: string | null) => {
  if (!fecha) return "N/A";
  return format(new Date(fecha), "dd/MM/yyyy", { locale: es });
};

// Función para obtener identificador de propiedad
const obtenerIdentificadorPropiedad = (propiedad: any) => {
  if (!propiedad || !propiedad.identificadores) return "N/A";
  
  const { superior, idSuperior, inferior, idInferior } = propiedad.identificadores;
  return `${superior || ''} ${idSuperior || ''} - ${inferior || ''} ${idInferior || ''}`;
};

export function RecentRequests({ role }: RecentRequestsProps) {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Si el rol es Jefe Operativo, no puede ver solicitudes
  if (role === "Jefe Operativo" as UserRole) {
    return (
      <div className="min-w-full divide-y divide-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propiedad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                No tienes acceso a las solicitudes
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  
  // Preparar filtros para la consulta GraphQL
  const getFilters = () => {
    let filters: any = { and: [] };
    
    // Filtrar por usuario si es propietario o arrendatario
    if (role === "Propietario" || role === "Arrendatario") {
      filters.and.push({
        solicitante: {
          email: {
            eq: user?.email
          }
        }
      });
    }
    
    return filters.and.length > 0 ? filters : {};
  };
  
  // Consulta GraphQL para obtener solicitudes recientes
  const { data, loading: loadingSolicitudes, error: errorSolicitudes } = useQuery(GET_SOLICITUDES_RECIENTES, {
    variables: {
      filters: getFilters()
    },
    fetchPolicy: "network-only",
    skip: !user || role === "Jefe Operativo" as UserRole
  });
  
  // Actualizar lista de solicitudes cuando cambian los datos
  useEffect(() => {
    if (data?.solicitudes) {
      const solicitudesAdaptadas = data.solicitudes.map((sol: any) => ({
        id: sol.documentId,
        tipoSolicitud: sol.tipoSolicitud,
        estado: sol.estado,
        fechaCreacion: sol.fechaCreacion,
        fechaActualizacion: sol.fechaActualizacion,
        detallesSolicitud: sol.detallesSolicitud,
        propiedad: sol.propiedad
      }));
      setSolicitudes(solicitudesAdaptadas);
      setLoading(false);
    }
  }, [data]);
  
  // Actualizar error
  useEffect(() => {
    if (errorSolicitudes) {
      setError("Error al cargar las solicitudes");
      setLoading(false);
    }
  }, [errorSolicitudes]);

  if (loading) {
    return (
      <div className="min-w-full divide-y divide-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propiedad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                Cargando solicitudes recientes...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-w-full divide-y divide-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propiedad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-red-500">
                <div className="flex items-center justify-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span>Error al cargar las solicitudes</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (!solicitudes || solicitudes.length === 0) {
    return (
      <div className="min-w-full divide-y divide-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propiedad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                No tienes solicitudes pendientes <br />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="min-w-full divide-y divide-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Propiedad
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {solicitudes.map((solicitud) => (
            <tr key={solicitud.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                {solicitud.tipoSolicitud === "venta" ? "Venta" : "Renta"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {obtenerIdentificadorPropiedad(solicitud.propiedad)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={statusStyles[solicitud.estado] || "bg-gray-100 text-gray-800"}>
                  {solicitud.estado.replace(/_/g, ' ')}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-1">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                {formatearFecha(solicitud.fechaActualizacion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 