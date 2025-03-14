import { DocumentNode } from 'graphql';
import { client } from '../../../_lib/apollo/apolloClient';

export type QueryOptions = {
  variables?: Record<string, any>;
  skip?: boolean;
};

/**
 * Función para realizar consultas GraphQL utilizando el cliente de Apollo
 * Optimizada para ser utilizada con SWR
 */
export const apolloFetcher = async ({ 
  query, 
  options = {}, 
  key // key se usa para identificar la consulta en la caché
}: { 
  query: DocumentNode; 
  options?: QueryOptions;
  key: string;
}) => {
  if (options.skip) {
    return null;
  }

  try {
    console.log(`Ejecutando consulta para clave: ${key}`);
    const { data } = await client.query({
      query,
      variables: options.variables || {},
      fetchPolicy: 'network-only', // Asegurarse de obtener datos frescos
    });
    
    return data;
  } catch (error) {
    console.error('Error en apolloFetcher:', error);
    throw error;
  }
};

/**
 * Función para revalidar manualmente una clave de caché
 * @param key Clave de la caché a revalidar
 */
export const revalidateCache = async (key: string) => {
  // Intentar buscar el evento SWR para revalidar
  try {
    // Utilizamos un evento personalizado para comunicarnos con los hooks SWR
    window.dispatchEvent(
      new CustomEvent('swr-revalidate', {
        detail: { key }
      })
    );
    
    console.log(`Revalidación solicitada para: ${key}`);
    return true;
  } catch (error) {
    console.error('Error al revalidar caché:', error);
    return false;
  }
};

/**
 * Función para limpiar la caché SWR de manera manual
 * @param keyPattern Patrón de clave para limpiar (exacto o regex)
 */
export const clearCache = (keyPattern: string | RegExp) => {
  try {
    window.dispatchEvent(
      new CustomEvent('swr-clear-cache', {
        detail: { keyPattern }
      })
    );
    
    console.log(`Limpieza de caché solicitada para: ${keyPattern}`);
    return true;
  } catch (error) {
    console.error('Error al limpiar caché:', error);
    return false;
  }
}; 