"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { gql, useQuery } from '@apollo/client'
import { useAuth } from '../../_lib/auth/AuthContext'
import { 
  DocumentArrowDownIcon, 
  DocumentChartBarIcon, 
  ChartBarIcon, 
  TableCellsIcon, 
  ArrowPathIcon
} from "@heroicons/react/24/outline"

// Componentes
import { ReporteDocumentos } from "./_components/ReporteDocumentos"
import { Spinner } from "../../_components/ui/spinner"
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../_components/ui/select"
import { Button } from "../../_components/ui/button"

// Definir las consultas GraphQL necesarias
const GET_PROYECTOS_ASIGNADOS = gql`
  query GetProyectosAsignados($documentId: ID!) {
    perfilOperacional(documentId: $documentId) {
      proyectosAsignados {
        documentId
        nombre
      }
    }
  }
`;

const GET_TODOS_PROYECTOS = gql`
  query GetTodosProyectos {
    proyectos(pagination: { limit: 100 }) {
      documentId
      nombre
      unidadNegocio {
        documentId
        nombre
      }
    }
  }
`;

// Tipos
interface Proyecto {
  documentId: string
  nombre: string
  unidadNegocio?: {
    documentId: string
    nombre: string
  }
}

// Animaciones
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

export default function ReportesPage() {
  const { user, role } = useAuth()
  const [tipoReporte, setTipoReporte] = useState<string>("documentos")
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>("")
  const [unidadNegocioSeleccionada, setUnidadNegocioSeleccionada] = useState<string>("")
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [unidadesNegocio, setUnidadesNegocio] = useState<{documentId: string, nombre: string}[]>([])

  // Consultar proyectos según el rol
  const { data: dataProyectosAsignados, loading: loadingProyectosAsignados } = useQuery(GET_PROYECTOS_ASIGNADOS, {
    variables: { 
      documentId: user?.perfil_operacional?.documentId
    },
    skip: !user?.perfil_operacional?.documentId || role === 'Directorio'
  })

  const { data: dataTodosProyectos, loading: loadingTodosProyectos } = useQuery(GET_TODOS_PROYECTOS, {
    skip: role !== 'Directorio' && role !== 'Administrador'
  })

  // Actualizar proyectos disponibles según el rol
  useEffect(() => {
    if (role === 'Jefe Operativo' && dataProyectosAsignados?.perfilOperacional?.proyectosAsignados) {
      setProyectos(dataProyectosAsignados.perfilOperacional.proyectosAsignados)
      if (dataProyectosAsignados.perfilOperacional.proyectosAsignados.length > 0) {
        setProyectoSeleccionado(dataProyectosAsignados.perfilOperacional.proyectosAsignados[0].documentId)
      }
    } else if (role === 'Administrador' && dataProyectosAsignados?.perfilOperacional?.proyectosAsignados) {
      setProyectos(dataProyectosAsignados.perfilOperacional.proyectosAsignados)
      if (dataProyectosAsignados.perfilOperacional.proyectosAsignados.length > 0) {
        setProyectoSeleccionado(dataProyectosAsignados.perfilOperacional.proyectosAsignados[0].documentId)
      }
    } else if (role === 'Directorio' && dataTodosProyectos?.proyectos) {
      setProyectos(dataTodosProyectos.proyectos)
      
      // Extraer unidades de negocio únicas
      const unidades = dataTodosProyectos.proyectos.reduce((acc: any[], proyecto: Proyecto) => {
        if (proyecto.unidadNegocio && !acc.some(u => u.documentId === proyecto.unidadNegocio?.documentId)) {
          acc.push({
            documentId: proyecto.unidadNegocio.documentId,
            nombre: proyecto.unidadNegocio.nombre
          })
        }
        return acc
      }, [])
      
      setUnidadesNegocio(unidades)
    }
  }, [dataProyectosAsignados, dataTodosProyectos, role])

  // Filtrar proyectos por unidad de negocio
  const proyectosFiltrados = unidadNegocioSeleccionada && unidadNegocioSeleccionada !== "all" && role === 'Directorio' 
    ? proyectos.filter(proyecto => proyecto.unidadNegocio?.documentId === unidadNegocioSeleccionada)
    : proyectos

  // Cargar el componente de reporte correcto según el tipo seleccionado
  const renderReporte = () => {
    // Asegurarse de pasar un string vacío si proyectoSeleccionado es "all"
    const finalProyectoId = proyectoSeleccionado === "all" ? "" : proyectoSeleccionado;
    const finalUnidadNegocioId = unidadNegocioSeleccionada === "all" ? "" : unidadNegocioSeleccionada;

    switch (tipoReporte) {
      case "documentos":
        return <ReporteDocumentos 
          proyectoId={finalProyectoId} 
          unidadNegocioId={finalUnidadNegocioId}
          role={role}
        />
      default:
        return <ReporteDocumentos 
          proyectoId={finalProyectoId} 
          unidadNegocioId={finalUnidadNegocioId}
          role={role}
        />
    }
  }

  // Si está cargando, mostrar spinner
  if (loadingProyectosAsignados || loadingTodosProyectos) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerAnimation}
      className="space-y-6"
    >
      <motion.div variants={itemAnimation} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-gray-500">Genera y exporta reportes del sistema</p>
        </div>
      </motion.div>

      {/* Selector de tipo de reporte */}
      <motion.div variants={itemAnimation} className="bg-white rounded-xl shadow p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
            <Select value={tipoReporte} onValueChange={(value) => setTipoReporte(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona el tipo de reporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documentos">Reporte de Documentos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* {propiedadesFiltradas?.length} {propiedadesFiltradas?.length === 1 ? 'propiedad' : 'propiedades'} */}

          {/* Filtro por unidad de negocio (solo para Directorio) */}
          {role === 'Directorio' && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Negocio</label>
              <Select 
                value={unidadNegocioSeleccionada || "all"} 
                onValueChange={(value) => {
                  setUnidadNegocioSeleccionada(value)
                  setProyectoSeleccionado("all")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas las unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las unidades</SelectItem>
                  {unidadesNegocio.map(unidad => (
                    <SelectItem key={unidad.documentId} value={unidad.documentId}>
                      {unidad.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selector de proyectos */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {role === 'Jefe Operativo' ? 'Proyecto Asignado' : 'Proyecto'}
            </label>
            <Select 
              value={proyectoSeleccionado || "all"} 
              onValueChange={(value) => setProyectoSeleccionado(value)}
              disabled={role === 'Jefe Operativo' && proyectosFiltrados.length === 1}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={role !== 'Jefe Operativo' ? "Todos los proyectos" : ""} />
              </SelectTrigger>
              <SelectContent>
                {role !== 'Jefe Operativo' && (
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                )}
                {proyectosFiltrados.map(proyecto => (
                  <SelectItem key={proyecto.documentId} value={proyecto.documentId}>
                    {proyecto.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Contenido del reporte */}
      <motion.div variants={itemAnimation} className="bg-white rounded-xl shadow p-6">
        {renderReporte()}
      </motion.div>
    </motion.div>
  )
} 