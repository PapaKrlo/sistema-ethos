import useSWR from 'swr';
import { gql } from '@apollo/client';
import { client } from '../../_lib/apollo/apolloClient';
import type { Project, Property } from '../../types';
import { useState } from 'react';

// Consulta para obtener los detalles del proyecto sin propiedades
const GET_PROJECT_DETAILS = gql`
  query GetProjectDetails($documentId: ID!) {
    proyecto(documentId: $documentId) {
      documentId
      nombre
      descripcion
      ubicacion
      tasaBaseFondoInicial
      tasaBaseAlicuotaOrdinaria
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

// Consulta para obtener las propiedades paginadas
const GET_PROJECT_PROPERTIES = gql`
  query GetProjectProperties($documentId: ID!, $limit: Int!, $offset: Int!) {
    proyecto(documentId: $documentId) {
      propiedades(pagination: { limit: $limit, start: $offset }) {
        imagen {
          documentId
          url
        }
        documentId
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
        ocupantes {
          tipoOcupante
        }
        propietario {
          tipoPersona
          datosPersonaNatural {
            razonSocial
            cedula
            ruc
          }
          datosPersonaJuridica {
            razonSocial
            nombreComercial
          }
          contactoAccesos {
            nombreCompleto
            email
            telefono
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

// Consulta para obtener solo las estadísticas del proyecto
const GET_PROJECT_STATS = gql`
  query GetProjectStats($documentId: ID!) {
    proyecto(documentId: $documentId) {
      propiedades(pagination: { limit: -1 }) {
        documentId
        estadoUso
        areaTotal
        areasDesglosadas {
          area
        }
      }
    }
  }
`;

const projectFetcher = async (projectId: string): Promise<Project> => {
  try {
    const { data } = await client.query({
      query: GET_PROJECT_DETAILS,
      variables: { documentId: projectId },
      fetchPolicy: "cache-first" as const,
    });

    if (!data || !data.proyecto) {
      throw new Error('No se encontraron datos del proyecto');
    }

    return {
      ...data.proyecto,
      perfiles_operacionales: data.proyecto?.perfiles_operacionales || [],
      unidadNegocio: data.proyecto?.unidadNegocio,
      fotoProyecto: data.proyecto?.fotoProyecto,
      propiedades: [] // Inicialmente vacío, se cargará con la paginación
    };
  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
};

const propertiesFetcher = async (projectId: string, limit: number, offset: number): Promise<Property[]> => {
  try {
    const { data } = await client.query({
      query: GET_PROJECT_PROPERTIES,
      variables: { 
        documentId: projectId,
        limit,
        offset
      },
      fetchPolicy: "cache-first" as const,
    });

    if (!data || !data.proyecto || !data.proyecto.propiedades) {
      return [];
    }

    return data.proyecto.propiedades;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
};

const statsFetcher = async (projectId: string): Promise<{
  totalCount: number;
  activeCount: number;
  totalArea: number;
}> => {
  try {
    const { data } = await client.query({
      query: GET_PROJECT_STATS,
      variables: { documentId: projectId },
      fetchPolicy: "cache-first" as const,
    });

    if (!data || !data.proyecto || !data.proyecto.propiedades) {
      return { totalCount: 0, activeCount: 0, totalArea: 0 };
    }

    const properties = data.proyecto.propiedades;
    const totalCount = properties.length;
    const activeCount = properties.filter((p: any) => p.estadoUso === 'enUso').length;
    const totalArea = properties.reduce((sum: number, prop: any) => {
      const areaTotal = prop.areaTotal || 0;
      return sum + areaTotal;
    }, 0);

    return { totalCount, activeCount, totalArea };
  } catch (error) {
    console.error('Error fetching project stats:', error);
    return { totalCount: 0, activeCount: 0, totalArea: 0 };
  }
};

// Tipado correcto para el provider de caché
type CacheMap = Map<string, any>;

const localStorageProvider = () => {
  if (typeof window === 'undefined') return new Map() as CacheMap;
  
  const map = new Map(
    JSON.parse(localStorage.getItem('app-cache') || '[]')
  ) as CacheMap;
  
  window.addEventListener('beforeunload', () => {
    const appCache = JSON.stringify(Array.from(map.entries()));
    localStorage.setItem('app-cache', appCache);
  });

  return map;
};

export function useProject(projectId: string | null) {
  const { data: project, error: projectError, mutate } = useSWR<Project>(
    projectId ? `project-${projectId}` : null,
    projectId ? () => projectFetcher(projectId) : null,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 segundos - evitar múltiples peticiones en corto tiempo
      loadingTimeout: 3000,
      onErrorRetry: (error: any, key, config, revalidate, { retryCount }) => {
        if (error.status === 404) return;
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  const { data: stats, error: statsError } = useSWR(
    projectId ? `project-stats-${projectId}` : null,
    projectId ? () => statsFetcher(projectId) : null,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 segundos
      onErrorRetry: (error: any, key, config, revalidate, { retryCount }) => {
        if (error.status === 404) return;
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  // Mejora para memorizar los resultados de las propiedades cargadas
  const propertiesCache = useState<Map<string, Property[]>>(new Map());

  return {
    project,
    stats,
    isLoading: (!projectError && !project) || (!statsError && !stats),
    isError: projectError || statsError,
    mutate,
    fetchProperties: async (limit: number, offset: number) => {
      if (!projectId) return [];
      
      // Intentar obtener del cache primero
      const cacheKey = `${projectId}-${limit}-${offset}`;
      const cachedData = propertiesCache[0].get(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
      
      // Si no está en caché, hacer la petición
      const properties = await propertiesFetcher(projectId, limit, offset);
      
      // Guardar en caché
      propertiesCache[0].set(cacheKey, properties);
      
      return properties;
    }
  };
} 