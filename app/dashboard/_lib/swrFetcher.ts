import { DocumentNode } from 'graphql';
import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { client as apolloClient } from '../../_lib/apollo/apolloClient';

export interface QueryOptions {
  variables?: Record<string, any>;
  skip?: boolean;
  client?: ApolloClient<NormalizedCacheObject>;
}

// Función fetcher para SWR que trabaja con Apollo Client
export async function apolloFetcher<T = any>(
  key: { query: DocumentNode; options?: QueryOptions }
): Promise<T> {
  const { query, options = {} } = key;
  const { variables = {}, skip = false, client: customClient } = options;
  
  // Si skip es true, no ejecutar la consulta
  if (skip) {
    return Promise.resolve({} as T);
  }

  // Usar el cliente proporcionado o el predeterminado
  const client = customClient || apolloClient;
  
  try {
    const { data } = await client.query({
      query,
      variables,
      fetchPolicy: 'network-only', // Siempre consultar al servidor
    });
    
    return data as T;
  } catch (error) {
    console.error('Error en apolloFetcher:', error);
    throw error;
  }
} 