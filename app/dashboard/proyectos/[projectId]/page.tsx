"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../../_components/ui/button";
import { formatNumber } from "../../../_lib/utils";
import { 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingOffice2Icon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { use } from 'react';
import { useAuth } from '../../../_lib/auth/AuthContext';
import { gql, useQuery } from '@apollo/client';
import PropertyCard from './_components/PropertyCard';
import SkeletonCard from './_components/SkeletonCard';
import type { Project, Property } from '../../../types';
import { useProject } from '../../_hooks/useProject';
import LoadingSpinner from '../../_components/LoadingSpinner';
import ErrorMessage from '../../_components/ErrorMessage';

// const GET_PROJECT_DETAILS = gql`
//   query GetProjectDetails($documentId: ID!) {
//     proyecto(documentId: $documentId) {
//       documentId
//       nombre
//       descripcion
//       ubicacion
//       tasaBaseFondoInicial
//       tasaBaseAlicuotaOrdinaria
//       perfiles_operacionales {
//         documentId
//         usuario {
//           username
//         }
//       }
//       unidadNegocio {
//         nombre
//       }
//       fotoProyecto {
//         url
//       }
//       propiedades(pagination: { limit: -1 }) {
//         imagen {
//           documentId
//           url
//         }
//         documentId
//         identificadores {
//           idSuperior
//           superior
//           idInferior
//           inferior
//         }
//         estadoUso
//         estadoEntrega
//         estadoDeConstruccion
//         actividad
//         montoFondoInicial
//         montoAlicuotaOrdinaria
//         areaTotal
//         areasDesglosadas {
//           area
//           tipoDeArea
//         }
//         modoIncognito
//         ocupantes {
//           tipoOcupante
//         }
//         propietario {
//           tipoPersona
//           datosPersonaNatural {
//             razonSocial
//             cedula
//             ruc
//           }
//           datosPersonaJuridica {
//             razonSocial
//             nombreComercial
//           }
//           contactoAccesos {
//             nombreCompleto
//             email
//             telefono
//           }
//         }
//         createdAt
//         updatedAt
//       }
//       createdAt
//       updatedAt
//       publishedAt
//     }
//   }
// `;

// interface AreaDesglosada {
//   nombre: string;
//   valor: number;
//   unidad: string;
// }

// interface AlicuotaExtraordinaria {
//   descripcion: string;
//   monto: number;
//   fechaInicio: string;
//   fechaFin: string;
// }

// Constantes para la paginación
const ITEMS_PER_PAGE = 30;

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { role } = useAuth();
  const router = useRouter();
  const { project, stats, isLoading, isError, fetchProperties } = useProject(projectId);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Cerrar el menú de opciones cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptionsMenu) {
        setShowOptionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsMenu]);

  const isAdmin = role === 'Administrador' || role === 'Directorio';

  // Estados para las propiedades y la paginación
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [hasMoreProperties, setHasMoreProperties] = useState(true);
  const [page, setPage] = useState(0);
  
  // Estados para los filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    tipoOcupacion: string | null;
    actividad: string | null;
    estadoUso: string | null;
    identificador: string | null;
    idSuperior: string | null;
    idInferior: string | null;
  }>({
    tipoOcupacion: null,
    actividad: null,
    estadoUso: null,
    identificador: null,
    idSuperior: null,
    idInferior: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState<string | null>(null);

  // Cargar propiedades iniciales cuando el proyecto esté disponible
  useEffect(() => {
    if (project) {
      loadInitialProperties();
    }
  }, [project]);

  // Función para cargar las propiedades iniciales
  const loadInitialProperties = async () => {
    setIsLoadingProperties(true);
    try {
      const initialProperties = await fetchProperties(ITEMS_PER_PAGE, 0);
      setProperties(initialProperties);
      setFilteredProperties(initialProperties);
      setPage(1);
      setHasMoreProperties(initialProperties.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error al cargar propiedades iniciales:", error);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  // Función para cargar más propiedades
  const loadMoreProperties = async () => {
    if (!hasMoreProperties || isLoadingProperties) return;
    
    setIsLoadingProperties(true);
    try {
      const offset = page * ITEMS_PER_PAGE;
      const moreProperties = await fetchProperties(ITEMS_PER_PAGE, offset);
      
      if (moreProperties.length === 0) {
        setHasMoreProperties(false);
      } else {
        const newProperties = [...properties, ...moreProperties];
        setProperties(newProperties);
        setPage(prev => prev + 1);
        setHasMoreProperties(moreProperties.length === ITEMS_PER_PAGE);
        
        // Aplicar filtros a las nuevas propiedades
        applyFilters(newProperties);
      }
    } catch (error) {
      console.error("Error al cargar más propiedades:", error);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  // Función para aplicar filtros a las propiedades
  const applyFilters = (propsToFilter = properties) => {
    let filtered = [...propsToFilter];
    
    // Aplicar búsqueda por texto
    if (searchTerm) {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
      
      filtered = filtered.filter((property) => {
        // Texto completo de identificadores para búsqueda
        const identificadoresText = `${property.identificadores?.superior || ''} ${property.identificadores?.idSuperior || ''} ${property.identificadores?.inferior || ''} ${property.identificadores?.idInferior || ''}`.toLowerCase();
        
        // Texto del propietario para búsqueda
        const propietarioText = property.propietario ? (
          property.propietario.tipoPersona === "Natural" 
            ? (property.propietario.datosPersonaNatural?.razonSocial || '').toLowerCase()
            : (property.propietario.datosPersonaJuridica?.razonSocial || '').toLowerCase()
        ) : '';
        
        // Verificar si todos los términos de búsqueda están presentes
        return searchTerms.every(term => 
          identificadoresText.includes(term) || propietarioText.includes(term)
        );
      });
    }
    
    // Aplicar filtro de tipo de ocupación
    if (activeFilters.tipoOcupacion) {
      if (activeFilters.tipoOcupacion === 'arrendado') {
        filtered = filtered.filter((property) => 
          property.ocupantes?.some(ocupante => ocupante.tipoOcupante === "arrendatario") || false
        );
      } else if (activeFilters.tipoOcupacion === 'propietario') {
        filtered = filtered.filter((property) => 
          !(property.ocupantes?.some(ocupante => ocupante.tipoOcupante === "arrendatario") || false)
        );
      }
    }
    
    // Aplicar filtro de actividad
    if (activeFilters.actividad) {
      filtered = filtered.filter((property) => 
        property.actividad === activeFilters.actividad
      );
    }
    
    // Aplicar filtro de estado de uso
    if (activeFilters.estadoUso) {
      filtered = filtered.filter((property) => 
        property.estadoUso === activeFilters.estadoUso
      );
    }

    // Aplicar filtros de identificadores superiores (tipo)
    if (activeFilters.identificador) {
      filtered = filtered.filter((property) => 
        property.identificadores?.superior?.toLowerCase() === activeFilters.identificador?.toLowerCase()
      );
    }
    
    // Aplicar filtros de identificadores superiores (número)
    if (activeFilters.idSuperior) {
      filtered = filtered.filter((property) => 
        property.identificadores?.idSuperior === activeFilters.idSuperior
      );
    }
    
    // Aplicar filtros de identificadores inferiores (tipo)
    if (activeFilters.idInferior) {
      filtered = filtered.filter((property) => 
        property.identificadores?.idInferior === activeFilters.idInferior
      );
    }
    
    // Aplicar ordenamiento
    if (sortOption) {
      filtered.sort((a, b) => {
        // Función auxiliar para convertir cualquier formato de fecha a timestamp
        const getTimestamp = (dateStr: string | null | undefined): number => {
          if (!dateStr) return 0;
          try {
            return new Date(dateStr).getTime();
          } catch (e) {
            console.error("Error al convertir fecha:", dateStr, e);
            return 0;
          }
        };

        switch (sortOption) {
          case 'newest':
            const timestampA = getTimestamp(a.createdAt);
            const timestampB = getTimestamp(b.createdAt);
            if (timestampA === 0 || timestampB === 0) {
              return b.documentId.localeCompare(a.documentId);
            }
            return timestampB - timestampA;
          case 'oldest':
            const timestampAOld = getTimestamp(a.createdAt);
            const timestampBOld = getTimestamp(b.createdAt);
            if (timestampAOld === 0 || timestampBOld === 0) {
              return a.documentId.localeCompare(b.documentId);
            }
            return timestampAOld - timestampBOld;
          case 'recently_updated':
            const updatedA = getTimestamp(a.updatedAt);
            const updatedB = getTimestamp(b.updatedAt);
            if (updatedA === 0 || updatedB === 0) {
              const createdA = getTimestamp(a.createdAt);
              const createdB = getTimestamp(b.createdAt);
              if (createdA === 0 || createdB === 0) {
                return b.documentId.localeCompare(a.documentId);
              }
              return createdB - createdA;
            }
            return updatedB - updatedA;
          case 'area_desc':
            return (b.areaTotal || 0) - (a.areaTotal || 0);
          case 'area_asc':
            return (a.areaTotal || 0) - (b.areaTotal || 0);
          case 'alpha_asc':
            const idTextA = `${a.identificadores?.superior || ''} ${a.identificadores?.idSuperior || ''} ${a.identificadores?.inferior || ''} ${a.identificadores?.idInferior || ''}`.toLowerCase();
            const idTextB = `${b.identificadores?.superior || ''} ${b.identificadores?.idSuperior || ''} ${b.identificadores?.inferior || ''} ${b.identificadores?.idInferior || ''}`.toLowerCase();
            return idTextA.localeCompare(idTextB);
          case 'alpha_desc':
            const idTextADesc = `${a.identificadores?.superior || ''} ${a.identificadores?.idSuperior || ''} ${a.identificadores?.inferior || ''} ${a.identificadores?.idInferior || ''}`.toLowerCase();
            const idTextBDesc = `${b.identificadores?.superior || ''} ${b.identificadores?.idSuperior || ''} ${b.identificadores?.inferior || ''} ${b.identificadores?.idInferior || ''}`.toLowerCase();
            return idTextBDesc.localeCompare(idTextADesc);
          default:
            return 0;
        }
      });
    }
    
    setFilteredProperties(filtered);
  };

  // Aplicar filtros cuando cambien las propiedades o los filtros
  useEffect(() => {
    applyFilters();
  }, [searchTerm, activeFilters, sortOption, properties]);

  // Extraer valores únicos para los filtros
  const getUniqueActividades = () => {
    if (!properties.length) return [];
    const actividades = properties
      .map((p) => p.actividad)
      .filter((value, index, self) => 
        value && self.indexOf(value) === index
      ) as string[];
    return actividades;
  };

  // Extraer valores únicos para los identificadores superiores (manzanas, bloques, etc.)
  const getUniqueIdentificadoresSuperiores = () => {
    if (!properties.length) return [];
    const identificadores = properties
      .map((p) => p.identificadores?.superior)
      .filter((value, index, self) => 
        value && self.indexOf(value) === index
      ) as string[];
    return identificadores;
  };
  
  // Extraer valores únicos para los números de identificadores superiores
  const getUniqueIdSuperiores = () => {
    if (!properties.length) return [];
    
    // Si hay un filtro de tipo de identificador activo, solo mostrar los números de ese tipo
    if (activeFilters.identificador) {
      return properties
        .filter(p => p.identificadores?.superior?.toLowerCase() === activeFilters.identificador?.toLowerCase())
        .map(p => p.identificadores?.idSuperior)
        .filter((value, index, self) => 
          value && self.indexOf(value) === index
        ) as string[];
    }
    
    // Si no hay filtro activo, mostrar todos los números
    return properties
      .map(p => p.identificadores?.idSuperior)
      .filter((value, index, self) => 
        value && self.indexOf(value) === index
      ) as string[];
  };
  
  // Extraer valores únicos para los números de identificadores inferiores
  const getUniqueIdInferiores = () => {
    if (!properties.length) return [];
    
    // Aplicar filtros en cascada
    let filteredProps = [...properties];
    
    if (activeFilters.identificador) {
      filteredProps = filteredProps.filter(p => 
        p.identificadores?.superior?.toLowerCase() === activeFilters.identificador?.toLowerCase()
      );
    }
    
    if (activeFilters.idSuperior) {
      filteredProps = filteredProps.filter(p => 
        p.identificadores?.idSuperior === activeFilters.idSuperior
      );
    }
    
    return filteredProps
      .map(p => p.identificadores?.idInferior)
      .filter((value, index, self) => 
        value && self.indexOf(value) === index
      ) as string[];
  };

  const handleFilterChange = (filterType: 'tipoOcupacion' | 'actividad' | 'estadoUso' | 'identificador' | 'idSuperior' | 'idInferior', value: string | null) => {
    // Si cambiamos el tipo de identificador, resetear los filtros de números
    if (filterType === 'identificador' && value !== activeFilters.identificador) {
      setActiveFilters(prev => ({
        ...prev,
        [filterType]: prev[filterType] === value ? null : value,
        idSuperior: null,
        idInferior: null
      }));
    } 
    // Si cambiamos el número superior, resetear el filtro de número inferior
    else if (filterType === 'idSuperior' && value !== activeFilters.idSuperior) {
      setActiveFilters(prev => ({
        ...prev,
        [filterType]: prev[filterType] === value ? null : value,
        idInferior: null
      }));
    } 
    // Para otros filtros, comportamiento normal
    else {
      setActiveFilters(prev => ({
        ...prev,
        [filterType]: prev[filterType] === value ? null : value
      }));
    }
  };

  const handleSortChange = (value: string | null) => {
    setSortOption(value === sortOption ? null : value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters({
      tipoOcupacion: null,
      actividad: null,
      estadoUso: null,
      identificador: null,
      idSuperior: null,
      idInferior: null
    });
    setSortOption(null);
    applyFilters(properties); // Re-aplicar con filtros limpios
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage message={'Ocurrió un error al cargar los detalles del proyecto.'} />;
  if (!project || !stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Banner y detalles principales */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="relative h-64">
          <Link href="/dashboard/proyectos">
            <Button
              variant="outline"
              size="icon"
              className="absolute top-6 left-6 z-10 rounded-full w-8 h-8 bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
            >
              <ArrowLeftIcon className="w-4 h-4 text-white" />
            </Button>
          </Link>
          {isAdmin && (
            <div className="absolute top-6 right-6 z-10">
              <div className="relative group">
                <button className="bg-white/90 hover:bg-white rounded-full p-2 transition-all shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <div className="p-1">
                    <button 
                      onClick={() => router.push(`/dashboard/proyectos/${projectId}/editar`)}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                      Editar Proyecto
                    </button>
                    <button 
                      onClick={() => router.push(`/dashboard/proyectos/${projectId}/nueva-propiedad`)}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Nueva Propiedad
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Image
            src={project.fotoProyecto?.url || "/ofibodega.png"}
            alt={project.nombre}
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-semibold">{project.nombre}</h1>
                <p className="text-white/90 mt-2">{project.ubicacion}</p>
              </div>
              {project.unidadNegocio && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
                  {project.unidadNegocio.nombre}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Descripción del proyecto */}
        <div className="p-6 border-t">
          <div className="max-w-3xl">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Sobre el proyecto</h2>
            <p className="text-gray-600">{project.descripcion}</p>
            
            {/* Perfiles Operacionales */}
            {project.perfiles_operacionales && project.perfiles_operacionales.length > 0 && (
              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-900 mb-2">Administradores</h3>
                <div className="flex flex-wrap gap-2">
                  {project.perfiles_operacionales.map((perfil, index) => (
                    <span 
                      key={perfil.documentId || index} 
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                    >
                      {perfil.usuario?.username}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <div className="text-3xl font-light">
          ${project.tasaBaseAlicuotaOrdinaria}
          </div>
          <div className="text-gray-500 mt-1">Tasa Base Alícuota Ordinaria</div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="text-3xl font-light">
          ${project.tasaBaseFondoInicial}
          </div>
          <div className="text-gray-500 mt-1">Tasa Base Fondo Inicial</div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="text-3xl font-light">{stats.totalCount}</div>
          <div className="text-gray-500 mt-1">Propiedades Totales</div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="text-3xl font-light">
            {formatNumber(stats.totalArea, true)} m²
          </div>
          <div className="text-gray-500 mt-1">Área Total</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por identificadores (ej: manzana 2 solar 3) o propietario"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008A4B]/20 focus:border-[#008A4B]"
            />
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="w-4 h-4" />
            Filtros
            {(Object.values(activeFilters).some(filter => filter !== null) || sortOption) && (
              <span className="flex items-center justify-center w-5 h-5 bg-[#008A4B] text-white rounded-full text-xs">
                {Object.values(activeFilters).filter(filter => filter !== null).length + (sortOption ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>
        
        {/* Filtros expandibles */}
        {showFilters && (
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Filtros</h3>
              {(Object.values(activeFilters).some(filter => filter !== null) || sortOption) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Ordenar por</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={sortOption === 'alpha_asc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('alpha_asc')}
                    className={sortOption === 'alpha_asc' ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                  >
                    Identificador A-Z
                  </Button>
                  <Button
                    variant={sortOption === 'alpha_desc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('alpha_desc')}
                    className={sortOption === 'alpha_desc' ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                  >
                    Identificador Z-A
                  </Button>
                  <Button
                    variant={sortOption === 'area_desc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('area_desc')}
                    className={sortOption === 'area_desc' ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                  >
                    Mayor área
                  </Button>
                  <Button
                    variant={sortOption === 'area_asc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('area_asc')}
                    className={sortOption === 'area_asc' ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                  >
                    Menor área
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Tipo de ocupación</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeFilters.tipoOcupacion === 'arrendado' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('tipoOcupacion', 'arrendado')}
                    className={activeFilters.tipoOcupacion === 'arrendado' ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                  >
                    Arrendado
                  </Button>
                  <Button
                    variant={activeFilters.tipoOcupacion === 'propietario' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('tipoOcupacion', 'propietario')}
                    className={activeFilters.tipoOcupacion === 'propietario' ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                  >
                    Uso Propietario
                  </Button>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Estado de uso</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeFilters.estadoUso === 'enUso' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('estadoUso', 'enUso')}
                    className={activeFilters.estadoUso === 'enUso' ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                  >
                    En uso
                  </Button>
                  <Button
                    variant={activeFilters.estadoUso === 'disponible' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('estadoUso', 'disponible')}
                    className={activeFilters.estadoUso === 'disponible' ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                  >
                    Disponible
                  </Button>
                </div>
              </div>
              
              {getUniqueActividades().length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Actividad</p>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueActividades().map((actividad) => (
                      <Button
                        key={actividad}
                        variant={activeFilters.actividad === actividad ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('actividad', actividad)}
                        className={activeFilters.actividad === actividad ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                      >
                        {actividad.replaceAll("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {getUniqueIdentificadoresSuperiores().length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Tipo de Identificador</p>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueIdentificadoresSuperiores().map((identificador) => (
                      <Button
                        key={identificador}
                        variant={activeFilters.identificador === identificador ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('identificador', identificador)}
                        className={activeFilters.identificador === identificador ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                      >
                        {identificador}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {activeFilters.identificador && getUniqueIdSuperiores().length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{`${activeFilters.identificador} #`}</p>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueIdSuperiores().map((idSuperior) => (
                      <Button
                        key={idSuperior}
                        variant={activeFilters.idSuperior === idSuperior ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('idSuperior', idSuperior)}
                        className={activeFilters.idSuperior === idSuperior ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                      >
                        {idSuperior}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {activeFilters.idSuperior && getUniqueIdInferiores().length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    {properties.find(p => 
                      p.identificadores?.superior === activeFilters.identificador && 
                      p.identificadores?.idSuperior === activeFilters.idSuperior
                    )?.identificadores?.inferior || 'Identificador Inferior'} #
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueIdInferiores().map((idInferior) => (
                      <Button
                        key={idInferior}
                        variant={activeFilters.idInferior === idInferior ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('idInferior', idInferior)}
                        className={activeFilters.idInferior === idInferior ? 'bg-[#008A4B] hover:bg-[#006837]' : ''}
                      >
                        {idInferior}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Filtros activos */}
        {(Object.values(activeFilters).some(filter => filter !== null) || sortOption) && (
          <div className="flex flex-wrap gap-2">
            {sortOption && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {sortOption === 'area_desc' ? 'Mayor área' :
                 sortOption === 'area_asc' ? 'Menor área' :
                 sortOption === 'alpha_asc' ? 'Identificador A-Z' :
                 sortOption === 'alpha_desc' ? 'Identificador Z-A' : ''}
                <XMarkIcon 
                  className="w-4 h-4 ml-1 cursor-pointer" 
                  onClick={() => setSortOption(null)}
                />
              </span>
            )}
            {activeFilters.tipoOcupacion && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {activeFilters.tipoOcupacion === 'arrendado' ? 'Arrendado' : 'Uso Propietario'}
                <XMarkIcon 
                  className="w-4 h-4 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('tipoOcupacion', null)}
                />
              </span>
            )}
            {activeFilters.estadoUso && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {activeFilters.estadoUso === 'enUso' ? 'En uso' : 'Disponible'}
                <XMarkIcon 
                  className="w-4 h-4 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('estadoUso', null)}
                />
              </span>
            )}
            {activeFilters.actividad && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {activeFilters.actividad.replaceAll("_", " ")}
                <XMarkIcon 
                  className="w-4 h-4 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('actividad', null)}
                />
              </span>
            )}
            {activeFilters.identificador && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {activeFilters.identificador}
                <XMarkIcon 
                  className="w-4 h-4 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('identificador', null)}
                />
              </span>
            )}
            {activeFilters.idSuperior && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {activeFilters.identificador} {activeFilters.idSuperior}
                <XMarkIcon 
                  className="w-4 h-4 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('idSuperior', null)}
                />
              </span>
            )}
            {activeFilters.idInferior && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {properties.find(p => 
                  p.identificadores?.superior === activeFilters.identificador && 
                  p.identificadores?.idSuperior === activeFilters.idSuperior
                )?.identificadores?.inferior || 'Identificador'} {activeFilters.idInferior}
                <XMarkIcon 
                  className="w-4 h-4 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('idInferior', null)}
                />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Properties Grid */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        {properties.length > 0 && filteredProperties.length > 0 ? (
          <>
            <div className="p-4 border-b">
              <div className="text-sm text-gray-500">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'propiedad' : 'propiedades'}
                {filteredProperties.length < properties.length && ` (filtradas de ${properties.length})`}
                {properties.length < stats.totalCount && ` de ${stats.totalCount} totales`}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.documentId}
                  property={property}
                  projectId={projectId}
                  projectImage={property.imagen?.url}
                />
              ))}
            </div>
            {hasMoreProperties && (
              <div className="p-6 pt-0 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={loadMoreProperties}
                  disabled={isLoadingProperties}
                  className="text-[#008A4B] border-[#008A4B]/30 hover:bg-[#008A4B]/10"
                >
                  {isLoadingProperties ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#008A4B] mr-2"></div>
                  ) : null}
                  Cargar más propiedades
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {properties.length === 0 ? (
              isLoadingProperties ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {Array(6).fill(0).map((_, index) => (
                    <SkeletonCard key={index} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 leading-relaxed">
                  No hay propiedades registradas en este proyecto. <br />
                  {isAdmin && "Puedes agregar una nueva propiedad en los 3 puntos de la esquina superior derecha."}
                </p>
              )
            ) : (
              <div className="space-y-4">
                <p>No se encontraron propiedades con los filtros seleccionados.</p>
                
                <div className="flex flex-col items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="text-[#008A4B] border-[#008A4B]/30 hover:bg-[#008A4B]/10"
                  >
                    Limpiar filtros
                  </Button>
                  
                  {hasMoreProperties && (
                    <div className="mt-6">
                      <p className="mb-4 text-md">¿No encuentras lo que buscas? Prueba a cargar más propiedades:</p>
                      <Button 
                        variant="default" 
                        onClick={loadMoreProperties}
                        disabled={isLoadingProperties}
                        className="bg-[#008A4B] hover:bg-[#006837]"
                      >
                        {isLoadingProperties ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                            Cargando...
                          </>
                        ) : (
                          "Cargar más propiedades"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Mostrar skeletons mientras se cargan más propiedades */}
        {isLoadingProperties && properties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-6 pb-6">
            {Array(3).fill(0).map((_, index) => (
              <SkeletonCard key={`loading-more-${index}`} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
