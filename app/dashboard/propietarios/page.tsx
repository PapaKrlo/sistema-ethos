'use client'

import { motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import { 
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  BuildingOffice2Icon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  ClipboardIcon,
  EllipsisVerticalIcon,
  TrashIcon
} from "@heroicons/react/24/outline"
import { Button } from "../../_components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from '../../_lib/auth/AuthContext'
import { gql, useQuery, useMutation } from '@apollo/client'
import { StatusModal } from "../../_components/StatusModal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select"
import useSWR from 'swr';
import { apolloFetcher, QueryOptions } from '../_lib/swrFetcher';
import { useApolloClient } from '@apollo/client';
import { TableSkeleton } from "./_components/TableSkeleton";

// Consulta para obtener todas las propiedades (Directorio)
const GET_ALL_PROPERTIES = gql`
  query GetAllProperties {
    propiedades(pagination: { limit: -1 }) {
      documentId
      identificadores {
        idSuperior
        superior
        idInferior
        inferior
      }
      estadoUso
      actividad
      propietario {
        documentId
        contactoAccesos {
          nombreCompleto
          telefono
          email
        }
        contactoAdministrativo {
          telefono
          email
        }
        contactoGerente {
          telefono
          email
        }
        contactoProveedores {
          telefono
          email
        }
        tipoPersona
        datosPersonaNatural {
          cedula
          ruc
          razonSocial
        }
        datosPersonaJuridica {
          razonSocial
          nombreComercial
          rucPersonaJuridica {
            ruc
          }
        }
      }
      ocupantes {
        tipoOcupante
        datosPersonaJuridica {
          razonSocial
          rucPersonaJuridica {
            ruc
          }
        }
        datosPersonaNatural {
          razonSocial
          ruc
        }
        perfilCliente {
          datosPersonaNatural {
            razonSocial
            ruc
          }
          datosPersonaJuridica {
            razonSocial
            rucPersonaJuridica {
              ruc
            }
          }
          contactoAccesos {
            nombreCompleto
            telefono
            email
          }
          contactoAdministrativo {
            telefono
            email
          }
          contactoGerente {
            telefono
            email
          }
          contactoProveedores {
            telefono
            email
          }
        }
      }
      proyecto {
        documentId
        nombre
      }
    }
  }
`;

// Consulta para obtener propiedades por proyecto (Jefe Operativo y Administrador)
const GET_PROPERTIES_BY_PROJECT = gql`
  query GetPropertiesByProject($projectId: ID!) {
    proyecto(documentId: $projectId) {
      propiedades(pagination: { limit: -1 }) {
        documentId
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
        estadoUso
        actividad
        propietario {
          documentId
          contactoAccesos {
            nombreCompleto
            telefono
            email
          }
          contactoAdministrativo {
            telefono
            email
          }
          contactoGerente {
            telefono
            email
          }
          contactoProveedores {
            telefono
            email
          }
          tipoPersona
          datosPersonaNatural {
            cedula
            ruc
            razonSocial
          }
          datosPersonaJuridica {
            razonSocial
            nombreComercial
            rucPersonaJuridica {
              ruc
            }
          }
        }
        ocupantes {
          tipoOcupante
          datosPersonaJuridica {
            razonSocial
            rucPersonaJuridica {
              ruc
            }
          }
          datosPersonaNatural {
            razonSocial
            ruc
          }
          perfilCliente {
            datosPersonaNatural {
              razonSocial
              ruc
            }
            datosPersonaJuridica {
              razonSocial
              rucPersonaJuridica {
                ruc
              }
            }
            contactoAccesos {
              nombreCompleto
              telefono
              email
            }
            contactoAdministrativo {
              telefono
              email
            }
            contactoGerente {
              telefono
              email
            }
            contactoProveedores {
              telefono
              email
            }
          }
        }
      }
    }
  }
`;

// Nueva consulta para obtener propiedades de múltiples proyectos
const GET_PROPERTIES_BY_MULTIPLE_PROJECTS = gql`
  query GetPropertiesByMultipleProjects {
    proyectos(pagination: { limit: -1 }) {
      documentId
      nombre
      propiedades(pagination: { limit: -1 }) {
        documentId
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
        estadoUso
        actividad
        propietario {
          documentId
          contactoAccesos {
            nombreCompleto
            telefono
            email
          }
          contactoAdministrativo {
            telefono
            email
          }
          contactoGerente {
            telefono
            email
          }
          contactoProveedores {
            telefono
            email
          }
          tipoPersona
          datosPersonaNatural {
            cedula
            ruc
            razonSocial
          }
          datosPersonaJuridica {
            razonSocial
            nombreComercial
            rucPersonaJuridica {
              ruc
            }
          }
        }
        ocupantes {
          tipoOcupante
          datosPersonaJuridica {
            razonSocial
            rucPersonaJuridica {
              ruc
            }
          }
          datosPersonaNatural {
            razonSocial
            ruc
          }
          perfilCliente {
            datosPersonaNatural {
              razonSocial
              ruc
            }
            datosPersonaJuridica {
              razonSocial
              rucPersonaJuridica {
                ruc
              }
            }
            contactoAccesos {
              nombreCompleto
              telefono
              email
            }
            contactoAdministrativo {
              telefono
              email
            }
            contactoGerente {
              telefono
              email
            }
            contactoProveedores {
              telefono
              email
            }
          }
        }
      }
    }
  }
`;

// Mutación para eliminar un propietario
const DELETE_PROPIETARIO = gql`
  mutation EliminarPropietario($documentId: ID!) {
    deletePropietario(documentId: $documentId) {
      documentId
    }
  }
`;

// Mutación para desasignar un propietario de una propiedad
const DESASIGNAR_PROPIETARIO = gql`
  mutation DesasignarPropietario($propiedadId: ID!) {
    updatePropiedad(
      documentId: $propiedadId
      data: { propietario: null }
    ) {
      documentId
    }
  }
`;

interface ContactInfo {
  nombreCompleto: string;
  telefono: string;
  email: string;
}

interface Property {
  id?: string;
  documentId: string;
  identificadores: {
    idSuperior: string;
    superior: string;
    idInferior: string;
    inferior: string;
  };
  estadoUso: string;
  actividad?: string;
  proyecto?: {
    documentId: string;
    nombre: string;
  };
  propietario?: {
    contactoAccesos: ContactInfo;
    contactoAdministrativo?: ContactInfo;
    contactoGerente?: ContactInfo;
    contactoProveedores?: ContactInfo;
    tipoPersona: "Natural" | "Juridica";
    datosPersonaNatural?: {
      cedula: string;
      ruc?: string;
      razonSocial: string;
    };
    datosPersonaJuridica?: {
      razonSocial: string;
      nombreComercial?: string;
      rucPersonaJuridica: Array<{
        ruc: string;
      }>;
    };
    documentId?: string;
  };
  ocupantes?: Array<{
    tipoOcupante: string;
    datosPersonaJuridica?: {
      razonSocial: string;
      rucPersonaJuridica: Array<{
        ruc: string;
      }>;
    };
    datosPersonaNatural?: {
      razonSocial: string;
      ruc?: string;
    };
    perfilCliente?: {
      datosPersonaNatural?: {
        razonSocial: string;
        ruc?: string;
      };
      datosPersonaJuridica?: {
        razonSocial: string;
        rucPersonaJuridica: Array<{
          ruc: string;
        }>;
      };
      contactoAccesos?: ContactInfo;
      contactoAdministrativo?: ContactInfo;
      contactoGerente?: ContactInfo;
      contactoProveedores?: ContactInfo;
    };
  }>;
}

type Ocupante = NonNullable<Property['ocupantes']>[number];

const getOccupantName = (ocupante: Ocupante) => {
  if (!ocupante) return null;
  
  if (ocupante.perfilCliente?.datosPersonaJuridica?.razonSocial) {
    return {
      nombre: ocupante.perfilCliente.datosPersonaJuridica.razonSocial,
      tipo: ocupante.tipoOcupante,
      ruc: ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica?.[0]?.ruc
    };
  }
  
  if (ocupante.perfilCliente?.datosPersonaNatural?.razonSocial) {
    return {
      nombre: ocupante.perfilCliente.datosPersonaNatural.razonSocial,
      tipo: ocupante.tipoOcupante,
      ruc: ocupante.perfilCliente.datosPersonaNatural.ruc
    };
  }
  
  if (ocupante.datosPersonaJuridica?.razonSocial) {
    return {
      nombre: ocupante.datosPersonaJuridica.razonSocial,
      tipo: ocupante.tipoOcupante,
      ruc: ocupante.datosPersonaJuridica.rucPersonaJuridica?.[0]?.ruc
    };
  }
  
  if (ocupante.datosPersonaNatural?.razonSocial) {
    return {
      nombre: ocupante.datosPersonaNatural.razonSocial,
      tipo: ocupante.tipoOcupante,
      ruc: ocupante.datosPersonaNatural.ruc
    };
  }
  
  return null;
};

export default function OccupantsPage() {
  const router = useRouter()
  const { user, role } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLot, setSelectedLot] = useState("Todos")
  const [isRefetching, setIsRefetching] = useState(false)
  const [viewMode, setViewMode] = useState<"properties" | "owners">("properties")
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<{
    identificador: string | null;
    idSuperior: string | null;
    idInferior: string | null;
  }>({
    identificador: null,
    idSuperior: null,
    idInferior: null
  })
  const [openMenuOwnerId, setOpenMenuOwnerId] = useState<string | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [showDeleteResultModal, setShowDeleteResultModal] = useState(false)
  const [deleteModalType, setDeleteModalType] = useState<"success" | "error">("success")
  const [deleteModalMessage, setDeleteModalMessage] = useState("")
  const [ownerToDelete, setOwnerToDelete] = useState<{id: string, name: string, propertiesCount: number} | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Cliente Apollo para operaciones manuales
  const apolloClient = useApolloClient();
  
  // Mutaciones
  const [deletePropietario] = useMutation(DELETE_PROPIETARIO);
  const [desasignarPropietario] = useMutation(DESASIGNAR_PROPIETARIO);
  
  // Referencia para cerrar el menú al hacer clic fuera
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Efecto para cerrar el menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuOwnerId(null);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  // Restringir acceso solo a admin, directorio y jefe operativo
  if (!["Jefe Operativo", "Administrador", "Directorio"].includes(role as string)) {
    router.push('/dashboard')
    return null
  }

  // Opciones para la consulta
  const queryOptions: QueryOptions = {
    variables:
      (role as string) === "Directorio"
        ? {}
        : (role as string) === "Jefe Operativo" || (role as string) === "Administrador"
          ? {}
          : { projectId: user?.perfil_operacional?.proyectosAsignados?.[0]?.documentId || "" },
    skip: !user || ((role as string) !== "Directorio" && !user?.perfil_operacional?.proyectosAsignados?.[0]?.documentId),
  };

  // Determinar qué consulta usar según el rol
  const query = (role as string) === "Directorio"
    ? GET_ALL_PROPERTIES
    : (role as string) === "Jefe Operativo" || (role as string) === "Administrador"
      ? GET_PROPERTIES_BY_MULTIPLE_PROJECTS
      : GET_PROPERTIES_BY_PROJECT;

  // Usar SWR para la consulta con clave única basada en el rol
  const { data, error, mutate: refetch } = useSWR(
    { 
      query,
      options: queryOptions,
      key: `propietarios-${role}-${user?.perfil_operacional?.documentId || 'all'}`
    },
    apolloFetcher,
    {
      revalidateOnFocus: false,     // No revalidar al cambiar de pestaña y volver
      revalidateOnReconnect: true,  // Revalidar cuando se recupera la conexión
      revalidateIfStale: true,      // Revalidar si los datos están obsoletos
      dedupingInterval: 5000,       // Intervalo de deduplicación (5 segundos)
      focusThrottleInterval: 10000, // Acelerar revalidación cuando está en foco (10 segundos)
      errorRetryCount: 3,           // Reintentar 3 veces en caso de error
    }
  );
  
  const isLoading = !data && !error;

  const handleRefresh = async () => {
    setIsRefetching(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Error al actualizar:", error);
    }
    setIsRefetching(false);
  };

  // Procesar datos de propiedades según la estructura de respuesta
  let properties: Property[] = [];

  if (data) {
    const typedData = data as Record<string, any>;
    
    if ((role as string) === "Directorio" && 'propiedades' in typedData) {
      properties = (typedData.propiedades)?.map((item: any) => ({
        ...item,
        proyecto: null,
      })) || [];
    } else if (((role as string) === "Jefe Operativo" || (role as string) === "Administrador") && 'proyectos' in typedData) {
      // Extraer propiedades de múltiples proyectos
      properties = (typedData.proyectos)?.flatMap((proyecto: any) =>
        proyecto.propiedades?.map((propiedad: any) => ({
          ...propiedad,
          proyecto: {
            documentId: proyecto.documentId,
            nombre: proyecto.nombre,
          },
        })) || []
      ) || [];
    } else if ('proyecto' in typedData) {
      // Extraer propiedades de un solo proyecto
      properties = (typedData.proyecto)?.propiedades?.map((item: any) => ({
        ...item,
        proyecto: {
          documentId: typedData.proyecto.documentId,
          nombre: typedData.proyecto.nombre,
        },
      })) || [];
    }
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setSelectedLot("Todos")
    setActiveFilters({
      identificador: null,
      idSuperior: null,
      idInferior: null
    })
  }

  const filteredProperties = properties?.filter(property => {
    // Filtro por búsqueda de texto
    const matchesSearch = 
      searchQuery === "" || 
      property.ocupantes?.some(ocupante => {
        const ocupanteInfo = getOccupantName(ocupante);
        return ocupanteInfo?.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      }) ||
      (property.propietario?.datosPersonaNatural?.razonSocial || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (property.propietario?.datosPersonaJuridica?.razonSocial || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (property.propietario?.contactoAccesos?.nombreCompleto || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Filtro por identificador superior (tipo)
    const matchesIdentificador = !activeFilters.identificador || 
      property.identificadores.superior.toLowerCase() === activeFilters.identificador.toLowerCase();

    // Filtro por identificador superior (número)
    const matchesIdSuperior = !activeFilters.idSuperior || 
      property.identificadores.idSuperior === activeFilters.idSuperior;

    // Filtro por identificador inferior (número)
    const matchesIdInferior = !activeFilters.idInferior || 
      property.identificadores.idInferior === activeFilters.idInferior;

    return matchesSearch && matchesIdentificador && matchesIdSuperior && matchesIdInferior;
  });

  // Agrupar propiedades por propietario
  const getOwnerName = (property: Property) => {
    if (!property.propietario) return 'Sin propietario';
    return property.propietario.datosPersonaNatural?.razonSocial || 
           property.propietario.datosPersonaJuridica?.razonSocial || 
           property.propietario.contactoAccesos?.nombreCompleto || 
           'Sin nombre';
  };

  const getOwnerIdentifier = (property: Property) => {
    if (!property.propietario) return 'sin-propietario';
    
    // Usar el documentId del propietario como identificador único si está disponible
    if (property.propietario.documentId) {
      return property.propietario.documentId;
    }
    
    // Si no hay documentId del propietario, crear un identificador basado en sus datos
    const name = getOwnerName(property);
    const cedula = property.propietario.datosPersonaNatural?.cedula || '';
    const ruc = property.propietario.datosPersonaNatural?.ruc || 
               property.propietario.datosPersonaJuridica?.rucPersonaJuridica?.[0]?.ruc || '';
    
    // Crear un identificador único basado en los datos del propietario, no de la propiedad
    return `${name}-${cedula}-${ruc}`.toLowerCase().replace(/\s+/g, '-');
  };
  
  const ownerGroups = properties?.reduce((groups: Record<string, {
    name: string,
    properties: Property[],
    tipoPersona?: "Natural" | "Juridica",
    cedula?: string,
    ruc?: string,
    contacto?: ContactInfo,
    documentId?: string,
    propertyId: string
  }>, property) => {
    if (!property.propietario) return groups;
    
    const ownerIdentifier = getOwnerIdentifier(property);
    const ownerName = getOwnerName(property);
    
    // Si el propietario ya existe en el grupo, agregar la propiedad a su lista
    if (groups[ownerIdentifier]) {
      groups[ownerIdentifier].properties.push(property);
    } else {
      // Si es un nuevo propietario, crear un nuevo grupo
      groups[ownerIdentifier] = {
        name: ownerName,
        properties: [property],
        tipoPersona: property.propietario.tipoPersona,
        cedula: property.propietario.datosPersonaNatural?.cedula,
        ruc: property.propietario.datosPersonaNatural?.ruc || 
             property.propietario.datosPersonaJuridica?.rucPersonaJuridica?.[0]?.ruc,
        contacto: property.propietario.contactoAccesos,
        documentId: property.propietario.documentId,
        propertyId: property.documentId
      };
    }
    
    return groups;
  }, {});

  // Convertir el objeto de grupos de propietarios a un array
  const ownersArray = ownerGroups ? Object.values(ownerGroups) : [];
  
  // Mensaje de depuración para verificar el número total de propietarios
  console.log(`Número total de propietarios (sin filtrar): ${ownersArray.length}`);
  
  // Propiedades sin propietario asignado
  const propertiesWithoutOwner = properties?.filter(property => !property.propietario);
  console.log(`Número de propiedades sin propietario asignado: ${propertiesWithoutOwner?.length}`);

  // Ordenar propietarios por nombre
  const sortedOwners = ownersArray.sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Filtrar propietarios según la búsqueda
  const filteredOwners = sortedOwners.filter(owner => 
    owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (owner.cedula || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (owner.ruc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (owner.contacto?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (owner.contacto?.telefono || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    owner.properties.some(property => 
      (property.documentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (property.proyecto?.nombre || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Propiedades del propietario seleccionado
  const selectedOwnerProperties = selectedOwner 
    ? ownerGroups[selectedOwner]?.properties || []
    : [];

  // Extraer valores únicos para los identificadores superiores (torres, bloques, etc.)
  const getUniqueIdentificadoresSuperiores = () => {
    if (!properties?.length) return [];
    const identificadores = properties
      .map((p: Property) => p.identificadores?.superior)
      .filter((value: string, index: number, self: string[]) => 
        value && self.indexOf(value) === index
      ) as string[];
    return identificadores;
  };
  
  // Extraer valores únicos para los números de identificadores superiores
  const getUniqueIdSuperiores = () => {
    if (!properties?.length) return [];
    
    // Si hay un filtro de tipo de identificador activo, solo mostrar los números de ese tipo
    if (activeFilters.identificador) {
      return properties
        .filter((p: Property) => p.identificadores?.superior?.toLowerCase() === activeFilters.identificador?.toLowerCase())
        .map((p: Property) => p.identificadores?.idSuperior)
        .filter((value: string, index: number, self: string[]) => 
          value && self.indexOf(value) === index
        ) as string[];
    }
    
    // Si no hay filtro activo, mostrar todos los números
    return properties
      .map((p: Property) => p.identificadores?.idSuperior)
      .filter((value: string, index: number, self: string[]) => 
        value && self.indexOf(value) === index
      ) as string[];
  };
  
  // Extraer valores únicos para los números de identificadores inferiores
  const getUniqueIdInferiores = () => {
    if (!properties?.length) return [];
    
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
      .map((p: Property) => p.identificadores?.idInferior)
      .filter((value: string, index: number, self: string[]) => 
        value && self.indexOf(value) === index
      ) as string[];
  };

  const handleFilterChange = (filterType: 'identificador' | 'idSuperior' | 'idInferior', value: string | null) => {
    // Si el valor es "all", tratarlo como null para limpiarlo
    const processedValue = value === "all" ? null : value;
    
    const newFilters = { ...activeFilters };
    
    // Actualizar el filtro seleccionado
    newFilters[filterType] = processedValue;
    
    // Limpiar filtros dependientes
    if (filterType === 'identificador') {
      newFilters.idSuperior = null;
      newFilters.idInferior = null;
    } else if (filterType === 'idSuperior') {
      newFilters.idInferior = null;
    }
    
    setActiveFilters(newFilters);
  };

  // Función para manejar la eliminación de un propietario
  const handleDeleteOwner = (ownerId: string) => {
    const owner = ownerGroups[ownerId];
    if (owner) {
      setOwnerToDelete({
        id: ownerId,
        name: owner.name,
        propertiesCount: owner.properties.length
      });
      setShowDeleteConfirmModal(true);
    }
  };
  
  // Función para confirmar la eliminación de un propietario
  const confirmDeleteOwner = async () => {
    if (!ownerToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // Si el propietario tiene propiedades asignadas, primero desasignarlas
      if (ownerToDelete.propertiesCount > 0) {
        const owner = ownerGroups[ownerToDelete.id];
        
        // Desasignar el propietario de todas sus propiedades
        for (const property of owner.properties) {
          await desasignarPropietario({
            variables: {
              propiedadId: property.documentId
            }
          });
        }
      }
      
      // Eliminar el propietario
      await deletePropietario({
        variables: {
          documentId: ownerToDelete.id
        }
      });
      
      // Mostrar mensaje de éxito
      setDeleteModalType("success");
      setDeleteModalMessage(`El propietario ${ownerToDelete.name} ha sido eliminado correctamente.`);
      
    } catch (error: any) {
      console.error("Error al eliminar propietario:", error);
      
      // Mostrar mensaje de error
      setDeleteModalType("error");
      setDeleteModalMessage(`Error al eliminar al propietario: ${error.message || "Ha ocurrido un error desconocido"}`);
    } finally {
      setIsDeleting(false);
      
      // Cerrar el modal de confirmación y mostrar el de resultado
      setShowDeleteConfirmModal(false);
      setShowDeleteResultModal(true);
    }
  };

  const handleDeleteResultClose = () => {
    setShowDeleteResultModal(false);
    setOwnerToDelete(null);
    
    // Refrescar los datos si la eliminación fue exitosa
    if (deleteModalType === "success") {
      refetch();
    }
  };

  // Función para copiar al portapapeles con mensaje temporal
  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Función para exportar propietarios a CSV
  const exportToCSV = () => {
    // Determinar qué datos exportar según la vista actual
    if (viewMode === "owners") {
      // Exportar propietarios filtrados
      const headers = [
        'Nombre', 
        'Tipo', 
        'Cédula/RUC', 
        'Email', 
        'Teléfono', 
        'Número de Propiedades',
        'Proyecto'
      ].join(',');
      
      const rows = filteredOwners.map(owner => {
        return [
          `"${owner.name}"`,
          `"${owner.tipoPersona || ''}"`,
          `"${owner.cedula || owner.ruc || ''}"`,
          `"${owner.contacto?.email || ''}"`,
          `"${owner.contacto?.telefono || ''}"`,
          `"${owner.properties.length}"`,
          `"${owner.properties[0].proyecto?.nombre || ''}"`
        ].join(',');
      });
      
      const csvContent = [headers, ...rows].join('\n');
      
      // Crear un blob y un enlace para descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'propietarios.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Exportar propiedades filtradas
      const headers = [
        'Propiedad Superior',
        'Propiedad Inferior',
        'Propietario',
        'Tipo Propietario',
        'Identificación',
        'Ocupante',
        'Tipo Ocupante',
        'Proyecto'
      ].join(',');
      
      const rows = filteredProperties.map(property => {
        const propietarioNombre = property.propietario?.datosPersonaNatural?.razonSocial || 
                                 property.propietario?.datosPersonaJuridica?.razonSocial || 
                                 'Sin propietario';
        
        const identificacion = property.propietario?.datosPersonaNatural?.cedula ? 
                              `Cédula: ${property.propietario.datosPersonaNatural.cedula}` : 
                              property.propietario?.datosPersonaJuridica?.rucPersonaJuridica?.[0]?.ruc ? 
                              `RUC: ${property.propietario.datosPersonaJuridica.rucPersonaJuridica[0].ruc}` : 
                              "-";
        
        // Obtener información del primer ocupante si existe
        const ocupanteInfo = property.ocupantes?.[0] ? getOccupantName(property.ocupantes[0]) : null;
        
        return [
          `"${property.identificadores.superior} ${property.identificadores.idSuperior}"`,
          `"${property.identificadores.inferior} ${property.identificadores.idInferior}"`,
          `"${propietarioNombre}"`,
          `"${property.propietario?.tipoPersona || '-'}"`,
          `"${identificacion}"`,
          `"${ocupanteInfo?.nombre || 'Sin ocupante'}"`,
          `"${ocupanteInfo?.tipo || '-'}"`,
          `"${property.proyecto?.nombre || '-'}"`
        ].join(',');
      });
      
      const csvContent = [headers, ...rows].join('\n');
      
      // Crear un blob y un enlace para descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'propiedades.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Propietarios y ocupantes</h1>
            <p className="text-gray-500 mt-1">
              {role === "Directorio" 
                ? "Todas las propiedades" 
                : `Propiedades de ${user?.perfil_operacional?.proyectosAsignados?.slice(0,5).map(p => p.nombre).join(', ')}${(user?.perfil_operacional?.proyectosAsignados?.length ?? 0) > 5 ? '...' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={handleRefresh}
              disabled={isRefetching}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
              title="Actualizar datos"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-[#008A4B] hover:bg-[#00723e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008A4B]"
            >
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Exportar {viewMode === "owners" ? "propietarios" : "propiedades"} a CSV
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => {
              setViewMode("properties");
              setSelectedOwner(null);
            }}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              viewMode === "properties"
                ? "bg-[#008A4B] text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Vista de Propiedades
          </button>
          <button
            onClick={() => {
              setViewMode("owners");
              setSelectedOwner(null);
            }}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              viewMode === "owners"
                ? "bg-[#008A4B] text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Vista de Propietarios
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
          <div className="relative flex-1 max-w-lg md:pb-0">
            <label htmlFor="search" className="block text-xs font-medium text-gray-600 mb-1 h-4">
              Buscar
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full pl-10 pr-3 py-2 h-10 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={viewMode === "owners" 
                  ? "Por nombre de propietario, identificación o contacto..." 
                  : "Por nombre de propietario u ocupante..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Filtros adicionales para la vista de propiedades */}
          {viewMode === "properties" && (
            <div className="flex items-end flex-wrap gap-4">
              {getUniqueIdentificadoresSuperiores().length > 0 && (
                <div className="w-48">
                  <label htmlFor="identificador" className="block text-xs font-medium text-gray-600 mb-1 h-4">
                    Tipo de Identificador
                  </label>
                  <Select
                    value={activeFilters.identificador || "all"}
                    onValueChange={(value) => handleFilterChange('identificador', value === "all" ? null : value)}
                  >
                    <SelectTrigger id="identificador" className="w-full h-10 bg-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">Todos</SelectItem>
                      {getUniqueIdentificadoresSuperiores().map((identificador) => (
                        <SelectItem key={identificador} value={identificador}>
                          {identificador}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Filtro de número superior (dropdown) */}
              {activeFilters.identificador && getUniqueIdSuperiores().length > 0 && (
                <div className="w-48">
                  <label htmlFor="idSuperior" className="block text-xs font-medium text-gray-600 mb-1 h-4">
                    {`${activeFilters.identificador} #`}
                  </label>
                  <Select
                    value={activeFilters.idSuperior || "all"}
                    onValueChange={(value) => handleFilterChange('idSuperior', value === "all" ? null : value)}
                  >
                    <SelectTrigger id="idSuperior" className="w-full h-10 bg-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">Todos</SelectItem>
                      {getUniqueIdSuperiores().map((idSuperior) => (
                        <SelectItem key={idSuperior} value={idSuperior}>
                          {idSuperior}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Filtro de número inferior (dropdown) */}
              {activeFilters.idSuperior && getUniqueIdInferiores().length > 0 && (
                <div className="w-48">
                  <label htmlFor="idInferior" className="block text-xs font-medium text-gray-600 mb-1 h-4">
                    {properties.find(p => 
                      p.identificadores?.superior === activeFilters.identificador && 
                      p.identificadores?.idSuperior === activeFilters.idSuperior
                    )?.identificadores?.inferior || 'Identificador Inferior'} #
                  </label>
                  <Select
                    value={activeFilters.idInferior || "all"}
                    onValueChange={(value) => handleFilterChange('idInferior', value === "all" ? null : value)}
                  >
                    <SelectTrigger id="idInferior" className="w-full h-10 bg-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">Todos</SelectItem>
                      {getUniqueIdInferiores().map((idInferior) => (
                        <SelectItem key={idInferior} value={idInferior}>
                          {idInferior}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
          {(searchQuery || activeFilters.identificador || activeFilters.idSuperior || activeFilters.idInferior) && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 h-10 self-end"
            >
              <XMarkIcon className="w-5 h-5" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Skeleton for table only */}
        <TableSkeleton mode={viewMode} />
      </motion.div>
    );
  }

  if (error) {
    console.error('Error al cargar las propiedades:', error);
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar las propiedades. Por favor, intente más tarde.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Propietarios y ocupantes</h1>
          <p className="text-gray-500 mt-1">
            {role === "Directorio" 
              ? "Todas las propiedades" 
              : `Propiedades de ${user?.perfil_operacional?.proyectosAsignados?.slice(0,5).map(p => p.nombre).join(', ')}${(user?.perfil_operacional?.proyectosAsignados?.length ?? 0) > 5 ? '...' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isRefetching && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#008A4B] mr-2"></div>
              Actualizando...
            </div>
          )}
          <Button 
            variant="ghost" 
            onClick={handleRefresh}
            disabled={isRefetching}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
            title="Actualizar datos"
          >
            <ArrowPathIcon className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-[#008A4B] hover:bg-[#00723e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008A4B]"
          >
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
            Exportar {viewMode === "owners" ? "propietarios" : "propiedades"} a CSV
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex border rounded-lg overflow-hidden">
        <button
          onClick={() => {
            setViewMode("properties");
            setSelectedOwner(null);
          }}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            viewMode === "properties"
              ? "bg-[#008A4B] text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Vista de Propiedades
        </button>
        <button
          onClick={() => {
            setViewMode("owners");
            setSelectedOwner(null);
          }}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            viewMode === "owners"
              ? "bg-[#008A4B] text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Vista de Propietarios
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
        <div className="relative flex-1 max-w-lg md:pb-0">
          <label htmlFor="search" className="block text-xs font-medium text-gray-600 mb-1 h-4">
            Buscar
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              name="search"
              id="search"
              className="block w-full pl-10 pr-3 py-2 h-10 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder={viewMode === "owners" 
                ? "Por nombre de propietario, identificación o contacto..." 
                : "Por nombre de propietario u ocupante..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Filtros adicionales para la vista de propiedades */}
        {viewMode === "properties" && (
          <div className="flex items-end flex-wrap gap-4">
            {/* Filtro de tipo de identificador (dropdown) */}
            {getUniqueIdentificadoresSuperiores().length > 0 && (
              <div className="w-48">
                <label htmlFor="identificador" className="block text-xs font-medium text-gray-600 mb-1 h-4">
                  Tipo de Identificador
                </label>
                <Select
                  value={activeFilters.identificador || "all"}
                  onValueChange={(value) => handleFilterChange('identificador', value === "all" ? null : value)}
                >
                  <SelectTrigger id="identificador" className="w-full h-10 bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todos</SelectItem>
                    {getUniqueIdentificadoresSuperiores().map((identificador) => (
                      <SelectItem key={identificador} value={identificador}>
                        {identificador}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Filtro de número superior (dropdown) */}
            {activeFilters.identificador && getUniqueIdSuperiores().length > 0 && (
              <div className="w-48">
                <label htmlFor="idSuperior" className="block text-xs font-medium text-gray-600 mb-1 h-4">
                  {`${activeFilters.identificador} #`}
                </label>
                <Select
                  value={activeFilters.idSuperior || "all"}
                  onValueChange={(value) => handleFilterChange('idSuperior', value === "all" ? null : value)}
                >
                  <SelectTrigger id="idSuperior" className="w-full h-10 bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todos</SelectItem>
                    {getUniqueIdSuperiores().map((idSuperior) => (
                      <SelectItem key={idSuperior} value={idSuperior}>
                        {idSuperior}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Filtro de número inferior (dropdown) */}
            {activeFilters.idSuperior && getUniqueIdInferiores().length > 0 && (
              <div className="w-48">
                <label htmlFor="idInferior" className="block text-xs font-medium text-gray-600 mb-1 h-4">
                  {properties.find(p => 
                    p.identificadores?.superior === activeFilters.identificador && 
                    p.identificadores?.idSuperior === activeFilters.idSuperior
                  )?.identificadores?.inferior || 'Identificador Inferior'} #
                </label>
                <Select
                  value={activeFilters.idInferior || "all"}
                  onValueChange={(value) => handleFilterChange('idInferior', value === "all" ? null : value)}
                >
                  <SelectTrigger id="idInferior" className="w-full h-10 bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todos</SelectItem>
                    {getUniqueIdInferiores().map((idInferior) => (
                      <SelectItem key={idInferior} value={idInferior}>
                        {idInferior}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
        
        {(searchQuery || activeFilters.identificador || activeFilters.idSuperior || activeFilters.idInferior) && (
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 h-10 self-end"
          >
            <XMarkIcon className="w-5 h-5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Filtros activos */}
      {viewMode === "properties" && (activeFilters.identificador || activeFilters.idSuperior || activeFilters.idInferior) && (
        <div className="flex flex-wrap gap-2 mt-2">
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

      {/* Results count */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-700">
          {viewMode === "properties" 
            ? `${filteredProperties.length} propiedades encontradas`
            : `${filteredOwners.length} propietarios encontrados`
          }
        </div>
      </div>

      {/* Propietarios View */}
      {viewMode === "owners" && !selectedOwner && (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propietario
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identificación
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propiedades
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Propietario
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOwners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm font-medium">No hay propietarios registrados</p>
                  </td>
                </tr>
              ) : (
                filteredOwners.map((owner, index) => {
                  // Encontrar el ID del propietario en el objeto ownerGroups
                  const ownerId = Object.keys(ownerGroups).find(
                    key => ownerGroups[key] === owner
                  ) || '';
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{owner.name}</div>
                        {owner.contacto?.email && (
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <EnvelopeIcon className="w-3 h-3 mr-1" />
                            {owner.contacto.email}
                          </div>
                        )}
                        {owner.contacto?.telefono && (
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <PhoneIcon className="w-3 h-3 mr-1" />
                            {owner.contacto.telefono}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{owner.tipoPersona || "-"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {owner.cedula ? `Cédula: ${owner.cedula}` : owner.ruc ? `RUC: ${owner.ruc}` : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{owner.properties[0].proyecto?.nombre || "-"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                            {owner.properties.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => copyToClipboard(owner.documentId || owner.properties[0].documentId)}
                          className="inline-flex items-center px-2 py-1 border border-[#008A4B] rounded-md text-xs font-medium text-[#008A4B] hover:bg-[#008A4B] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008A4B] relative"
                          title="Copiar ID del propietario"
                        >
                          <ClipboardIcon className="h-3 w-3 mr-1" />
                          Copiar ID
                          {copiedId === (owner.documentId || owner.properties[0].documentId) && (
                            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                              ¡Copiado!
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            className="text-[#008A4B] hover:text-[#006837]"
                            onClick={() => {
                              if (ownerId) {
                                setSelectedOwner(ownerId);
                              }
                            }}
                          >
                            Ver propiedades
                          </Button>
                          
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuOwnerId(openMenuOwnerId === ownerId ? null : ownerId)}
                              className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            </button>
                            
                            {openMenuOwnerId === ownerId && (
                              <div 
                                ref={menuRef}
                                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                              >
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setOpenMenuOwnerId(null);
                                      handleDeleteOwner(ownerId);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                  >
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    Eliminar propietario
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Propiedades de un Propietario */}
      {viewMode === "owners" && selectedOwner && (
        <>
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedOwner(null)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Volver a la lista de propietarios
            </Button>
          </div>
          
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {ownerGroups[selectedOwner]?.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Tipo de persona</p>
                <p className="text-sm font-medium">{ownerGroups[selectedOwner]?.tipoPersona || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Identificación</p>
                <p className="text-sm font-medium">
                  {ownerGroups[selectedOwner]?.cedula 
                    ? `Cédula: ${ownerGroups[selectedOwner]?.cedula}` 
                    : ownerGroups[selectedOwner]?.ruc 
                      ? `RUC: ${ownerGroups[selectedOwner]?.ruc}` 
                      : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contacto</p>
                {ownerGroups[selectedOwner]?.contacto?.email && (
                  <div className="flex items-center text-sm mt-1">
                    <EnvelopeIcon className="w-4 h-4 mr-1 text-gray-500" />
                    <a href={`mailto:${ownerGroups[selectedOwner]?.contacto?.email}`} className="text-[#008A4B] hover:underline">
                      {ownerGroups[selectedOwner]?.contacto?.email}
                    </a>
                  </div>
                )}
                {ownerGroups[selectedOwner]?.contacto?.telefono && (
                  <div className="flex items-center text-sm mt-1">
                    <PhoneIcon className="w-4 h-4 mr-1 text-gray-500" />
                    <a href={`tel:${ownerGroups[selectedOwner]?.contacto?.telefono}`} className="text-[#008A4B] hover:underline">
                      {ownerGroups[selectedOwner]?.contacto?.telefono}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-4">Propiedades ({selectedOwnerProperties.length})</h3>
          
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propiedad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ocupante
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Ver propiedad</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedOwnerProperties.map((property) => {
                  const ocupanteInfo = property.ocupantes?.[0] ? getOccupantName(property.ocupantes[0]) : null;
                  
                  return (
                    <tr key={property.documentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {property.identificadores.superior} {property.identificadores.idSuperior}
                          </div>
                          <div className="text-sm text-gray-500">
                            {property.identificadores.inferior} {property.identificadores.idInferior}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{property.proyecto?.nombre || "-"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{property.estadoUso === "enUso" ? "En uso" : "Disponible"}</div>
                          <div className="text-sm text-gray-500">{property.ocupantes?.some(ocupante => ocupante.tipoOcupante === "arrendatario") ? "Arrendado" : "Uso propietario"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {property.ocupantes && property.ocupantes.length > 0 ? (
                            property.ocupantes.map((ocupante, index) => {
                              const ocupanteInfo = getOccupantName(ocupante);
                              if (!ocupanteInfo) return null;
                              
                              return (
                                <div key={index} className="flex flex-col">
                                  <div className="text-sm font-medium text-gray-900">
                                    {ocupanteInfo.nombre}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {ocupanteInfo.tipo}
                                  </div>
                                  {index < property.ocupantes!.length - 1 && (
                                    <div className="my-2 border-t border-gray-200"></div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-sm text-gray-500">Sin ocupantes</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button 
                          variant="ghost" 
                          className="text-[#008A4B] hover:text-[#006837]"
                          onClick={() => router.push(`/dashboard/proyectos/${property.proyecto?.documentId}/propiedades/${property.documentId}?from=propietarios`)}
                        >
                          Ver propiedad
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Table de Propiedades */}
      {viewMode === "properties" && (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ocupante
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propietario
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identificación
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propiedad
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Ver propiedad</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={role === "Directorio" ? 6 : 5} className="px-6 py-10 text-center text-gray-500">
                    <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm font-medium">No hay propietarios ni ocupantes registrados</p>
                    {role !== "Directorio" && (
                      <p className="mt-1 text-sm">en {user?.perfil_operacional?.proyectosAsignados?.slice(0,5).map(p => p.nombre).join(', ')}{(user?.perfil_operacional?.proyectosAsignados?.length ?? 0) > 5 ? '...' : ''} </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProperties.map((property) => {
                  const ocupanteInfo = property.ocupantes?.[0] ? getOccupantName(property.ocupantes[0]) : null;
                  
                  return (
                    <tr key={property.documentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {property.ocupantes && property.ocupantes.length > 0 ? (
                            property.ocupantes.map((ocupante, index) => {
                              const ocupanteInfo = getOccupantName(ocupante);
                              if (!ocupanteInfo) return null;
                              
                              return (
                                <div key={index} className="flex flex-col">
                                  <div className="text-sm font-medium text-gray-900">
                                    {ocupanteInfo.nombre}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {ocupanteInfo.tipo}
                                  </div>
                                  {index < property.ocupantes!.length - 1 && (
                                    <div className="my-2 border-t border-gray-200"></div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-sm text-gray-500">Sin ocupantes</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {property.propietario?.datosPersonaNatural?.razonSocial || property.propietario?.datosPersonaJuridica?.razonSocial || 'Sin propietario registrado'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{property.propietario?.tipoPersona || "-"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {property.propietario?.datosPersonaNatural?.cedula ? `Cédula: ${property.propietario?.datosPersonaNatural?.cedula}` : property.propietario?.datosPersonaJuridica?.rucPersonaJuridica?.[0]?.ruc ? `RUC: ${property.propietario?.datosPersonaJuridica?.rucPersonaJuridica?.[0]?.ruc}` : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {property.identificadores.superior} {property.identificadores.idSuperior}
                          </div>
                          <div className="text-sm text-gray-500">
                            {property.identificadores.inferior} {property.identificadores.idInferior}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{property.proyecto?.nombre}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button 
                          variant="ghost" 
                          className="text-[#008A4B] hover:text-[#006837]"
                          onClick={() => router.push(`/dashboard/proyectos/${property.proyecto?.documentId}/propiedades/${property.documentId}?from=propietarios`)}
                        >
                          Ver propiedad
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación para eliminar propietario usando StatusModal */}
      <StatusModal
        open={showDeleteConfirmModal}
        onOpenChange={setShowDeleteConfirmModal}
        type="error"
        title="Eliminar propietario"
        message={ownerToDelete?.propertiesCount 
          ? `Este propietario (${ownerToDelete.name}) tiene asignadas ${ownerToDelete.propertiesCount} propiedades. ¿Estás seguro de que deseas eliminarlo?` 
          : `¿Estás seguro de que deseas eliminar al propietario ${ownerToDelete?.name}?`}
        actionLabel={isDeleting ? "Eliminando..." : "Eliminar"}
        onAction={confirmDeleteOwner}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteConfirmModal(false);
            setOwnerToDelete(null);
          }
        }}
      />

      {/* Modal de resultado de la eliminación */}
      <StatusModal
        open={showDeleteResultModal}
        onOpenChange={setShowDeleteResultModal}
        type={deleteModalType}
        title={deleteModalType === "success" ? "Propietario eliminado" : "Error al eliminar"}
        message={deleteModalMessage}
        onClose={handleDeleteResultClose}
      />
    </motion.div>
  )
} 