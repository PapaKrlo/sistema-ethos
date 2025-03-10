"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowDownTrayIcon,
  TableCellsIcon,
  Squares2X2Icon,
  MapPinIcon,
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  LockClosedIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "../../_lib/auth/AuthContext";
import { PropertyDirectoryFilters } from "../_components/PropertyDirectoryFilters";
import { gql, useQuery, ApolloClient, ApolloQueryResult } from "@apollo/client";
import { useApolloClient } from "@apollo/client";
import type { UserRole } from "../../_lib/auth/AuthContext";



// Consulta para obtener propiedades del cliente (Propietario y Arrendatario)
const GET_CLIENT_PROPERTIES = gql`
  query GetClientProperties($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      propiedades {
        documentId
        estadoDeConstruccion
        estadoEntrega
        estadoUso
        areaTotal
        imagen {
          url
        }
        areasDesglosadas {
          id
          area
          tasaAlicuotaOrdinariaEspecial
          tipoDeArea
          nombreAdicional
          tieneTasaAlicuotaOrdinariaEspecial
        }
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
        proyecto {
          documentId
          nombre
          unidadNegocio {
            nombre
          }
        }
        propietario {
          contactoAccesos {
            nombreCompleto
            telefono
            email
          }
        }
        modoIncognito
        ocupantes {
          tipoOcupante
          datosPersonaJuridica {
            razonSocial
          }
          datosPersonaNatural {
            razonSocial
          }
          perfilCliente {
            datosPersonaNatural {
              razonSocial
            }
            datosPersonaJuridica {
              razonSocial
            }
          }
        }
      }
    }
  }
`;

// Consulta para obtener todas las propiedades del proyecto
const GET_PROJECT_PROPERTIES = gql`
  query GetProjectProperties($documentId: ID!) {
    proyecto(documentId: $documentId) {
      documentId
      nombre
      propiedades(pagination: { limit: 100 }) {
        documentId
        estadoDeConstruccion
        estadoEntrega
        estadoUso
        areaTotal
        actividad
        imagen {
          url
        }
        areasDesglosadas {
          id
          area
          tasaAlicuotaOrdinariaEspecial
          tipoDeArea
          nombreAdicional
          tieneTasaAlicuotaOrdinariaEspecial
        }
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
        proyecto {
          documentId
          nombre
          unidadNegocio {
            nombre
          }
        }
        propietario {
          contactoAccesos {
            nombreCompleto
            telefono
            email
          }
        }
        modoIncognito
        ocupantes {
          tipoOcupante
          datosPersonaJuridica {
            razonSocial
          }
          datosPersonaNatural {
            razonSocial
          }
          perfilCliente {
            datosPersonaNatural {
              razonSocial
            }
            datosPersonaJuridica {
              razonSocial
            }
          }
        }
      }
    }
  }
`;

interface Property {
  id?: string;
  documentId: string;
  tipoPropiedad: string;

  estadoUso: string;
  estadoOcupacion: string;

  areaTotal: number;
  identificadores?: {
    idSuperior: string;
    superior: string;
    idInferior: string;
    inferior: string;
  };
  imagen?: {
    url: string;
  };
  proyecto?: {
    documentId?: string;
    nombre: string;
    unidadNegocio?: {
      nombre: string;
    };
  };
  propietario?: {
    contactoAccesos: {
      nombreCompleto: string;
      telefono: string;
      email: string;
    };
  };
  ocupantes?: Array<{
    tipoOcupante: string;
    datosPersonaJuridica?: {
      razonSocial: string;
    };
    datosPersonaNatural?: {
      razonSocial: string;
    };
    perfilCliente?: {
      datosPersonaNatural?: {
        razonSocial: string;
      };
      datosPersonaJuridica?: {
        razonSocial: string;
      };
    };
  }>;
  // Campos adicionales para la vista
  businessUnit?: string;
  project?: string;
  lote?: string;
  name?: string;
  rentalStatus?: string;
  image?: string;
  businessActivity?: string;
  occupantName?: string;
  occupantPhone?: string;
  occupantEmail?: string;
  occupantId?: string;
  modoIncognito?: boolean;
}

interface User {
  perfil_operacional?: {
    documentId: string;
    rol: "Jefe Operativo" | "Administrador" | "Directorio";
    proyectosAsignados: Array<{
      documentId: string;
      nombre: string;
    }>;
  };
  perfil_cliente?: {
    documentId: string;
  };
}

interface Ocupante {
  tipoOcupante: string;
  datosPersonaJuridica?: {
    razonSocial: string;
  };
  datosPersonaNatural?: {
    razonSocial: string;
  };
  perfilCliente?: {
    datosPersonaNatural?: {
      razonSocial: string;
    };
    datosPersonaJuridica?: {
      razonSocial: string;
    };
  };
}

export default function DirectorioPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const client = useApolloClient();
  const [filteredProperties, setFiltereredProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(30);
  
  // Propiedades a mostrar (limitadas por displayLimit)
  const displayedProperties = useMemo(() => {
    return filteredProperties.slice(0, displayLimit);
  }, [filteredProperties, displayLimit]);
  
  // Función para cargar más propiedades
  const loadMore = () => {
    setDisplayLimit(prevLimit => prevLimit + 30);
  };

  // Verificar acceso - solo para propietarios y arrendatarios
  useEffect(() => {
    if (!["Propietario", "Arrendatario"].includes(role as string)) {
      router.push("/dashboard");
    }
  }, [role, router]);

  if (!["Propietario", "Arrendatario"].includes(role as string)) return null;

  const { data, loading, error } = useQuery(GET_CLIENT_PROPERTIES, {
    variables: { documentId: user?.perfil_cliente?.documentId || "" },
    skip: !user || !user?.perfil_cliente?.documentId,
  });

  // Procesar los datos según el rol y actualizar filteredProperties
  useEffect(() => {
    if (loading) {
      setIsLoading(true);
      return;
    }
    
    if (data) {
      setIsLoading(true); // Mantener cargando mientras procesamos los datos
      console.log('Data received:', data);
      
      // Extraer primero las propiedades del usuario
      const userProperties = data?.perfilCliente?.propiedades || [];
      
      // Recopilar los proyectos a los que pertenecen estas propiedades
      const projectIds = new Set<string>();
      userProperties.forEach((prop: any) => {
        if (prop.proyecto?.documentId) {
          projectIds.add(prop.proyecto.documentId);
        }
      });
      
      // Añadir a la lista proyectos a consultar
      const projectsToFetch = Array.from(projectIds);
      console.log('Proyectos a consultar:', projectsToFetch);
      
      // Consultar todas las propiedades de estos proyectos
      if (projectsToFetch.length > 0) {
        Promise.all(
          projectsToFetch.map((projectId) => 
            client.query({
              query: GET_PROJECT_PROPERTIES,
              variables: { documentId: projectId }
            })
          )
        ).then((results: ApolloQueryResult<any>[]) => {
          let allPropertiesFromProjects: Property[] = [];
          
          // Recopilar propiedades de todos los proyectos
          results.forEach((result: ApolloQueryResult<any>) => {
            const projectProperties = result.data?.proyecto?.propiedades || [];
            console.log(`Propiedades del proyecto ${result.data?.proyecto?.nombre}:`, projectProperties.length);
            allPropertiesFromProjects = [...allPropertiesFromProjects, ...projectProperties];
          });
          
          // Ya no filtramos propiedades con modoIncognito = true, ahora las mostramos todas
          console.log('Total de propiedades encontradas:', allPropertiesFromProjects.length);
          
          // Actualizar el estado con todas las propiedades
          setAllProperties(allPropertiesFromProjects);
          setFiltereredProperties(allPropertiesFromProjects);
          setIsLoading(false); // Finalizar carga
        }).catch((error) => {
          console.error('Error al cargar propiedades de proyectos:', error);
          setIsLoading(false); // Finalizar carga incluso con error
        });
      } else {
        setIsLoading(false); // Finalizar carga si no hay proyectos
      }
    } else if (error) {
      console.error('Error al cargar datos del cliente:', error);
      setIsLoading(false); // Finalizar carga en caso de error
    }
  }, [data, loading, error, client]);

  useEffect(() => {
    if (searchQuery && allProperties.length > 0) {
      const query = searchQuery.toLowerCase();
      const filtered = allProperties.filter(
        (p) =>
          (p.identificadores?.superior?.toLowerCase().includes(query) || '') ||
          (p.identificadores?.idSuperior?.toLowerCase().includes(query) || '') ||
          (p.identificadores?.inferior?.toLowerCase().includes(query) || '') ||
          (p.identificadores?.idInferior?.toLowerCase().includes(query) || '') 
  
      );
      setFiltereredProperties(filtered);
    } else if (allProperties.length > 0) {
      setFiltereredProperties(allProperties);
    }
  }, [searchQuery, allProperties]);

  // Redirigir a la página de detalle adecuada según el rol
  const handlePropertyClick = (projectId: string, propertyId: string) => {
    if (["Propietario", "Arrendatario"].includes(role as string)) {
      router.push(`/dashboard/propiedades/${propertyId}/vista-limitada`);
    } else {
      router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  if (error) {
    console.error("Error al cargar las propiedades:", error);
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar las propiedades. Por favor, intente más tarde.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Directorio de Propiedades</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-1 p-2 border rounded-md ${
              viewMode === "table" ? "bg-gray-100 border-gray-300" : "border-gray-200"
            }`}
          >
            <TableCellsIcon className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Tabla</span>
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`inline-flex items-center gap-1 p-2 border rounded-md ${
              viewMode === "cards" ? "bg-gray-100 border-gray-300" : "border-gray-200"
            }`}
          >
            <Squares2X2Icon className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Tarjetas</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por identificador..."
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-t-2 border-b-2 border-emerald-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Cargando propiedades...</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron propiedades</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyecto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Identificador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metraje
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado de Uso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedProperties.map((property) => (
                    <tr 
                      key={property.documentId} 
                      className={`hover:bg-gray-50 cursor-pointer ${property.modoIncognito ? 'opacity-75' : ''}`}
                      onClick={() => handlePropertyClick(property.proyecto?.documentId || '', property.documentId)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {property.proyecto?.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {property.identificadores ? `${property.identificadores.superior} ${property.identificadores.idSuperior} - ${property.identificadores.inferior} ${property.identificadores.idInferior}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {property.areaTotal} m²
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {property.modoIncognito ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Información privada
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium
                            ${
                              property.estadoUso === "Disponible"
                                ? "bg-green-100 text-green-800"
                                : property.estadoUso === "enUso"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {property.estadoUso}
                          </span>
                        )}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {property.modoIncognito && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <LockClosedIcon className="w-3 h-3" />
                            Privado
                          </span>
                        )}
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Botón de cargar más */}
          {displayLimit < filteredProperties.length && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                className="px-4 py-2 bg-white border border-gray-200 hover:border-emerald-500 text-emerald-700 font-medium rounded-md transition-colors mt-4"
              >
                Cargar más propiedades ({filteredProperties.length - displayLimit} restantes)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProperties.map((property) => (
              <motion.div
                key={property.documentId}
                className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer ${property.modoIncognito ? 'relative' : ''}`}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => handlePropertyClick(property.proyecto?.documentId || '', property.documentId)}
              >
                <div className="relative h-48">
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm text-emerald-600">
                      {property.proyecto?.nombre}
                    </div>
                  </div>
                  {/* {property.modoIncognito && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1">
                        <LockClosedIcon className="w-3 h-3" />
                        Privado
                      </div>
                    </div>
                  )} */}
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center relative">
                    {property.imagen?.url ? (
                      <>
                        <Image
                          src={property.imagen.url}
                          alt={`Imagen de propiedad ${property.identificadores ? `${property.identificadores.superior} ${property.identificadores.idSuperior}` : ''}`}
                          fill
                          className="object-cover"
                        />
                        {property.modoIncognito && (
                          <div className="absolute inset-0 bg-white/20 z-5"></div>
                        )}
                      </>
                    ) : (
                      <BuildingOffice2Icon className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {property.identificadores ? `${property.identificadores.superior} ${property.identificadores.idSuperior} - ${property.identificadores.inferior} ${property.identificadores.idInferior}` : 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{property.areaTotal} m²</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!property.modoIncognito && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium
                          ${
                            property.estadoUso === "Disponible"
                              ? "bg-green-100 text-green-800"
                              : property.estadoUso === "enUso"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {property.estadoUso}
                        </span>
                      )}
                    </div>
                  </div>
                  {!property.modoIncognito && (
                    <div className="mt-4 text-sm text-gray-500">
                      {property.proyecto?.unidadNegocio?.nombre || ''}
                    </div>
                  )}
                  {property.modoIncognito && (
                    <div className="mt-4 text-sm text-gray-500 italic">
                      Información adicional privada
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Botón de cargar más */}
          {displayLimit < filteredProperties.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                className="px-4 py-2 bg-white border border-gray-200 hover:border-emerald-500 text-emerald-700 font-medium rounded-md transition-colors mt-4"
              >
                Cargar más propiedades ({filteredProperties.length - displayLimit} restantes)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

