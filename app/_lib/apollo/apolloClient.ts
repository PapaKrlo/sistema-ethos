import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from "@apollo/client/link/error";

// Asegurarnos de que la URL termine en /graphql
const getGraphQLEndpoint = () => {
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
  return baseUrl.endsWith('/graphql') ? baseUrl : `${baseUrl}/graphql`;
};

const httpLink = createHttpLink({
  uri: getGraphQLEndpoint(),
  credentials: 'same-origin',
});

// Añadir manejo de errores
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  }

  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
    console.log('URL utilizada:', getGraphQLEndpoint());
  }
});

const authLink = setContext((_, { headers }) => {
  // Obtener el token del localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  
  console.log('Apollo - URL:', getGraphQLEndpoint());
  console.log('Apollo - Token:', token ? 'Presente' : 'No presente');
  console.log('Apollo - Headers:', headers);

  // Retornar los headers con el token y el tipo de contenido
  const updatedHeaders = {
    ...headers,
    authorization: token ? `Bearer ${token}` : "",
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  console.log('Apollo - Headers actualizados:', updatedHeaders);
  
  return {
    headers: updatedHeaders
  }
});

export const client = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          perfilCliente: {
            merge: true,
          },
          proyecto: {
            // Usar el documentId como clave para identificar proyectos
            keyArgs: ["documentId"],
            // Función de fusión personalizada para el campo proyecto
            merge(existing, incoming, { args }) {
              // Si no hay datos existentes, simplemente devolver los datos entrantes
              if (!existing) return incoming;
              
              // Si los datos entrantes tienen propiedades, pero los existentes no
              if (incoming?.propiedades && !existing.propiedades) {
                return {
                  ...existing,
                  ...incoming
                };
              }
              
              // Si los datos existentes tienen propiedades, pero los entrantes no
              if (!incoming?.propiedades && existing.propiedades) {
                return {
                  ...incoming,
                  propiedades: existing.propiedades
                };
              }
              
              // Si ambos tienen propiedades, combinarlos
              if (incoming?.propiedades && existing.propiedades) {
                return {
                  ...existing,
                  ...incoming,
                  propiedades: incoming.propiedades
                };
              }
              
              // En cualquier otro caso, devolver los datos entrantes
              return incoming;
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
}); 