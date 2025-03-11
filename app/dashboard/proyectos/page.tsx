'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../_lib/auth/AuthContext"
import { gql, useQuery } from '@apollo/client'
import Image from "next/image"
import { Button } from "@/_components/ui/button"
import { PlusIcon } from "@heroicons/react/24/outline"
import { SkeletonProjectList } from "./_components/SkeletonProjectList"

// Consulta para obtener todos los proyectos (Directorio)
const GET_ALL_PROJECTS = gql`
  query GetAllProjects {
    proyectos {
      documentId
      nombre
      descripcion
      ubicacion
      perfiles_operacionales {
        documentId
        usuario {
          username
        }
      }
      unidadNegocio {
        nombre
      }
      fotoProyecto {
        url
      }
      createdAt
      updatedAt
      publishedAt
    }
  }
`;

// Consulta para obtener proyectos asignados (Jefe Operativo y Administrador)
const GET_ASSIGNED_PROJECTS = gql`
  query GetAssignedProjects($documentId: ID!) {
    perfilesOperacional(filters: { documentId: { eq: $documentId } }) {
      documentId
      proyectosAsignados {
        documentId
        nombre
        descripcion
        ubicacion
        perfiles_operacionales {
          documentId
          usuario {
            username
          }
        }
        unidadNegocio {
          nombre
        }
        fotoProyecto {
          url
        }
        createdAt
        updatedAt
        publishedAt
      }
    }
  }
`;

interface Project {
  id?: string;
  documentId: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  perfiles_operacionales?: Array<{
    documentId: string;
    usuario: {
      username: string;
    };
  }>;
  unidadNegocio?: {
    nombre: string;
  };
  fotoProyecto?: {
    url: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export default function ProyectosPage() {
  const { user, role } = useAuth()
  const router = useRouter()
  const [projectCount, setProjectCount] = useState(0) // Contador de proyectos
  const [prevProjectCount, setPrevProjectCount] = useState(0) // Historial del contador anterior
  const [firstLoad, setFirstLoad] = useState(true) // Indicador de primera carga

  // Verificar roles permitidos
  const allowedRoles = ['Jefe Operativo', 'Administrador', 'Directorio']
  
  useEffect(() => {
    if (!allowedRoles.includes(role || '')) {
      router.push("/dashboard")
    }
  }, [role, router])

  // Seleccionar la consulta apropiada según el rol
  const isDirectorio = role === 'Directorio'
  const query = isDirectorio ? GET_ALL_PROJECTS : GET_ASSIGNED_PROJECTS
  const variables = isDirectorio ? {} : { documentId: user?.perfil_operacional?.documentId }

  const { data, loading, error } = useQuery(query, {
    variables,
    skip: !user || (role !== 'Directorio' && !user?.perfil_operacional?.documentId),
    onCompleted: (data) => {
      // Actualizar el contador de proyectos para el skeleton basado en los datos cargados
      const loadedProjects = isDirectorio 
        ? data?.proyectos?.data?.length || 0
        : data?.perfilesOperacional?.[0]?.proyectosAsignados?.length || 0;
      
      // Guardar el contador anterior antes de actualizarlo
      setPrevProjectCount(projectCount);
      setProjectCount(loadedProjects);
      setFirstLoad(false);
    }
  })

  // Determinar el número de skeletons a mostrar durante la carga
  const skeletonCount = firstLoad ? 2 : (loading ? Math.max(prevProjectCount, 1) : projectCount);

  if (!allowedRoles.includes(role || '')) return null

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            {isDirectorio ? 'Todos los Proyectos' : 'Proyectos Asignados'}
          </h1>
          
          {(role === 'Administrador' || role === 'Directorio') && (
            <Button className="bg-[#008A4B] hover:bg-[#006837] flex items-center gap-2" onClick={() => router.push('/dashboard/proyectos/nuevo')}>
              <PlusIcon className="w-4 h-4" />
              Nuevo Proyecto
            </Button>
          )}
        </div>
        
        <SkeletonProjectList count={skeletonCount} />
      </div>
    )
  }

  if (error) {
    console.error('Error al cargar los proyectos:', error)
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar los proyectos. Por favor, intente más tarde.
      </div>
    )
  }

  // Procesar los datos según el rol
  const projects: Project[] = isDirectorio
    ? data?.proyectos?.data?.map((item: any) => ({
        id: item.id,
        ...item,
        perfiles_operacionales: item.perfiles_operacionales?.data?.map((perfil: any) => ({
          documentId: perfil.documentId,
          usuario: perfil.usuario?.data
        })) || [],
        unidadNegocio: item.unidadNegocio?.data,
        fotoProyecto: item.fotoProyecto?.data
      })) || []
    : data?.perfilesOperacional?.[0]?.proyectosAsignados || []


  if (projects.length === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        No se encontraron proyectos {!isDirectorio ? 'asignados' : ''}.
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isDirectorio ? 'Todos los Proyectos' : 'Proyectos Asignados'}
        </h1>
        
        {/* Aquí puedes agregar botones de acción según el rol */}
        {(role === 'Administrador' || role === 'Directorio') && (
        <Button className="bg-[#008A4B] hover:bg-[#006837] flex items-center gap-2" onClick={() => router.push('/dashboard/proyectos/nuevo')}>
          <PlusIcon className="w-4 h-4" />
          Nuevo Proyecto
        </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.documentId}
            className="bg-white rounded-xl overflow-hidden border hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            onClick={() => router.push(`/dashboard/proyectos/${project.documentId}`)}
          >
            {project.fotoProyecto?.url && (
              <div className="relative h-48">
                <Image
                  src={project.fotoProyecto.url}
                  alt={project.nombre}
                  fill
                  className="object-cover"
                />
                {project.unidadNegocio && (
                  <span className="absolute top-4 right-4 px-2 py-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs rounded-full">
                    {project.unidadNegocio.nombre}
                  </span>
                )}
              </div>
            )}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {project.nombre}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {project.ubicacion}
              </p>
              <p className="mt-4 text-sm text-gray-600 line-clamp-3">
                {project.descripcion}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 