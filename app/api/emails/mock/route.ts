import { NextResponse } from 'next/server';

// Definir la interfaz para los errores de GraphQL
interface GraphQLError {
  message: string;
  path?: string[];
  extensions?: {
    code?: string;
    stacktrace?: string[];
    error?: {
      name?: string;
      message?: string;
      details?: Record<string, any>;
    };
  };
}

// Interfaz para el formato que espera la página de correos
interface EmailFrontend {
  id: string;
  emailId: string;
  from: string;
  to: string;
  subject: string;
  receivedDate: string;
  status: "necesitaAtencion" | "informativo" | "respondido";
  lastResponseBy: "cliente" | "admin" | null;
  lastResponseDate: string | null;
  preview: string;
}

// Interfaz para la respuesta de Strapi
interface EmailTracking {
  documentId: string;
  emailId: string;
  from: string;
  to: string;
  subject: string;
  receivedDate: string;
  emailStatus: string;
  lastResponseBy: string | null;
  lastResponseDate: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Función para convertir datos de Strapi al formato frontend
function transformEmailData(emails: EmailTracking[]): EmailFrontend[] {
  return emails.map(email => {
    // Convertir emailStatus de Strapi a status del frontend
    let status: "necesitaAtencion" | "informativo" | "respondido" = "necesitaAtencion";
    if (email.emailStatus === "informativo") status = "informativo";
    else if (email.emailStatus === "respondido") status = "respondido";
    else if (email.emailStatus === "necesitaAtencion") status = "necesitaAtencion";
    
    // Generar un preview basado en el subject si no está disponible
    const preview = `Correo recibido: ${email.subject}`;
    
    return {
      id: email.documentId, // Usar documentId como id
      emailId: email.emailId,
      from: email.from,
      to: email.to || "soporte@ethos.com", // Valor por defecto si no existe
      subject: email.subject,
      receivedDate: email.receivedDate,
      status,
      lastResponseBy: email.lastResponseBy as "cliente" | "admin" | null,
      lastResponseDate: email.lastResponseDate,
      preview
    };
  });
}

// Datos de muestra para desarrollo
const mockEmailTrackings: EmailTracking[] = [
  {
    documentId: 'mock-1',
    emailId: 'email-123456',
    from: 'cliente@example.com',
    to: 'soporte@ethos.com',
    subject: 'Consulta sobre facturación',
    receivedDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 días atrás
    emailStatus: 'necesitaAtencion',
    lastResponseBy: null,
    lastResponseDate: null,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    publishedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    documentId: 'mock-2',
    emailId: 'email-789012',
    from: 'admin@ethos.com',
    to: 'propietario@example.com',
    subject: 'Actualización de alícuotas',
    receivedDate: new Date(Date.now() - 3600000 * 24 * 4).toISOString(), // 4 días atrás
    emailStatus: 'informativo',
    lastResponseBy: 'cliente',
    lastResponseDate: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 días atrás
    createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    publishedAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
  },
  {
    documentId: 'mock-3',
    emailId: 'email-345678',
    from: 'inquilino@example.com',
    to: 'soporte@ethos.com',
    subject: 'Problemas con acceso al edificio',
    receivedDate: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), // 1 día atrás
    emailStatus: 'respondido',
    lastResponseBy: 'admin',
    lastResponseDate: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 horas atrás
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    publishedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
  }
];

export async function GET(request: Request) {
  try {
    // Obtener URL base de Strapi según la configuración en Apollo Client
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
    const GRAPHQL_URL = baseUrl.endsWith('/graphql') ? baseUrl : `${baseUrl}/graphql`;
    const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
    
    // Imprimir primeros 10 caracteres del token para verificar
    const tokenPreview = STRAPI_TOKEN ? `${STRAPI_TOKEN.substring(0, 10)}...` : 'No configurado';
    
    if (!GRAPHQL_URL) {
      console.error('Error: URL de GraphQL no configurada');
      return NextResponse.json({ 
        error: 'Error de configuración del servidor',
        graphqlUrl: GRAPHQL_URL,
        tokenConfigured: STRAPI_TOKEN ? true : false,
        tokenPreview
      }, { status: 500 });
    }
    
    // Comprobar parámetros de URL
    const url = new URL(request.url);
    const useMock = url.searchParams.get('mock') === 'true';
    
    if (useMock) {
      console.log("Usando datos de muestra por solicitud explícita");
      // Transformar datos de muestra al formato frontend
      const transformedEmails = transformEmailData(mockEmailTrackings);
      return NextResponse.json({
        success: true,
        message: 'Datos de muestra proporcionados por solicitud',
        isMock: true,
        emails: transformedEmails,
        total: transformedEmails.length
      });
    }
    
    // Consulta para obtener datos reales de emailTrackings con estructura de Strapi 5
    const query = `
      query {
        emailTrackings(
          pagination: { page: 1, pageSize: 50 }
          sort: ["createdAt:desc"]
        ) {
          documentId
          emailId
          from
          to
          subject
          receivedDate
          emailStatus
          lastResponseBy
          lastResponseDate
          createdAt
          updatedAt
          publishedAt
        }
      }
    `;

    // Realizar la consulta a GraphQL con autenticación
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAPI_TOKEN}`
      },
      body: JSON.stringify({ query }),
    });
    
    // Verificar el estado de la respuesta
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error en la respuesta: ${response.status} ${response.statusText}`);
      console.error(`Detalle: ${errorText.substring(0, 200)}...`);
      
      throw new Error(`Error en la consulta: ${response.status} ${response.statusText}`);
    }
    
    // Procesar la respuesta
    const responseData = await response.json();
    
    // Verificar errores en la respuesta GraphQL
    if (responseData.errors) {
      console.error('Errores en la respuesta GraphQL:', JSON.stringify(responseData.errors, null, 2));
      
      return NextResponse.json({ 
        error: 'Error en la consulta GraphQL',
        details: responseData.errors,
        tokenPreview
      }, { status: 400 });
    }
    
    // Transformar los datos reales al formato esperado por el frontend
    const strapiEmails = responseData.data.emailTrackings || [];
    const transformedEmails = transformEmailData(strapiEmails);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Datos de emailTrackings obtenidos correctamente',
      tokenPreview,
      emails: transformedEmails,
      total: transformedEmails.length
    });
    
  } catch (error) {
    console.error('Error en la consulta a GraphQL:', error);
    
    // Proporcionar un error detallado
    return NextResponse.json({ 
      error: 'Error en la consulta a GraphQL',
      details: error instanceof Error ? error.message : JSON.stringify(error)
    }, { status: 500 });
  }
}