import { GraphQLClient } from 'graphql-request';

/**
 * Obtiene un cliente GraphQL configurado para comunicarse con Strapi
 */
export function getGqlClient() {
  const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
  const strapiToken = process.env.STRAPI_API_TOKEN || '';
  
  console.log('Configuración GraphQL:', { 
    graphqlUrl: graphqlUrl ? graphqlUrl : 'no configurado',
    hasToken: !!strapiToken
  });
  
  if (!graphqlUrl) {
    throw new Error('URL de GraphQL no configurada');
  }
  
  if (!strapiToken) {
    throw new Error('Token de Strapi no configurado');
  }
  
  const client = new GraphQLClient(graphqlUrl, {
    headers: {
      Authorization: `Bearer ${strapiToken}`,
      'Content-Type': 'application/json'
    },
  });
  
  return client;
} 