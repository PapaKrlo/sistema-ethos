import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';

// Interface requerida para el código
interface EmailMetadata {
  id: string;
  emailId: string;
  from: string;
  to: string;
  subject: string;
  receivedDate: string;
  status: string;
  lastResponseBy: string | null;
  preview: string;
  fullContent?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

interface ProcessedEmail {
  id: string;
  emailId: string;
  from: string;
  to: string;
  subject: string;
  receivedDate: string;
  status: string;
  lastResponseBy: string | null;
  preview: string;
  fullContent?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

// Interfaz para el resultado de la caché de emails
interface EmailCacheResult {
  emails: ProcessedEmail[];
  stats: {
    necesitaAtencion: number;
    informativo: number;
    respondido: number;
  };
}

// Mapear estados de Strapi a la API
const mapStrapiStatus = (status: string) => {
  if (!status) return "necesitaAtencion";
  
  // Mapear el estado a la convención de nombres con camelCase
  switch (status) {
    case "necesitaAtencion":
      return "necesitaAtencion";
    case "respondido":
      return "respondido";
    case "informativo":
      return "informativo";
    default:
      return "necesitaAtencion";
  }
};

// Función para limpiar cadenas de texto de correo electrónico
function cleanEmailString(emailString: string): string {
  if (!emailString) return '';
  
  // Eliminar caracteres de escape (\")
  return emailString
    .replace(/\\"/g, '"')   // Reemplazar \" por "
    .replace(/\\'/g, "'")   // Reemplazar \' por '
    .replace(/\\n/g, '\n')  // Reemplazar \n por salto de línea real
    .replace(/\\t/g, '\t')  // Reemplazar \t por tabulación real
    .replace(/\\\\r/g, '\r'); // Reemplazar \\r por retorno de carro real
}

export async function GET(request: Request) {
  // Señalizar al servidor para permitir más tiempo de respuesta
  const responseHeaders = new Headers();
  responseHeaders.set('Connection', 'keep-alive');
  
  try {
    // Intentar obtener emails desde cache primero
    console.log("Obteniendo emails desde caché...");
    const cachedEmails = await emailCache.getEmailList<EmailCacheResult>('all');
    if (cachedEmails) {
      console.log(`Retornando ${cachedEmails.emails.length} emails desde caché`);
      
      // Aplicar limpieza a los campos de correo
      const cleanedEmails = {
        ...cachedEmails,
        emails: cachedEmails.emails.map((email: ProcessedEmail) => ({
          ...email,
          from: cleanEmailString(email.from),
          to: cleanEmailString(email.to || ''),
          subject: cleanEmailString(email.subject),
          preview: cleanEmailString(email.preview)
        }))
      };
      
      return NextResponse.json(cleanedEmails);
    }
    
    // Si no hay datos en caché, obtener desde Strapi
    console.log("Obteniendo emails desde Strapi directamente");
    const strapiEmails = await getEmailsFromStrapi();
    
    if (strapiEmails && strapiEmails.length > 0) {
      console.log(`Obtenidos ${strapiEmails.length} correos desde Strapi`);
      
      // Calcular estadísticas
      const stats = {
        necesitaAtencion: strapiEmails.filter(e => e.status === "necesitaAtencion").length,
        informativo: strapiEmails.filter(e => e.status === "informativo").length,
        respondido: strapiEmails.filter(e => e.status === "respondido").length
      };
      
      // Guardar en caché
      await emailCache.setEmailList('all', { emails: strapiEmails, stats }, 1, -1);
      
      return NextResponse.json({
        emails: strapiEmails,
        stats,
        fromStrapi: true
      });
    }
    
    // Si no hay datos en Strapi
    return NextResponse.json({
      emails: [],
      stats: {
        necesitaAtencion: 0,
        informativo: 0,
        respondido: 0
      },
      fromStrapi: true
    });
    
  } catch (error: any) {
    console.error("Error al procesar solicitud:", error.message, error.stack);
    
    // Intentar recuperar desde caché
    const cachedEmails = await emailCache.getEmailList<EmailCacheResult>('all');
    if (cachedEmails) {
      return NextResponse.json({
        emails: cachedEmails.emails,
        stats: cachedEmails.stats,
        fromCache: true,
        error: "Se produjo un error pero se recuperaron datos de caché"
      });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Función para obtener emails directamente desde Strapi
async function getEmailsFromStrapi(): Promise<ProcessedEmail[]> {
  try {
    console.log("Obteniendo emails desde Strapi (API GraphQL)");
    
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
    const strapiToken = process.env.STRAPI_API_TOKEN || '';
    
    if (!graphqlUrl || !strapiToken) {
      console.error('Error: URL de GraphQL o token de Strapi no configurados');
      return [];
    }
    
    const query = `
      query {
        emailTrackings(pagination: { limit: 1000 }) {
          documentId
          emailId
          emailStatus
          from
          to
          subject
          receivedDate
          lastResponseBy
          fullContent
          publishedAt
        }
      }
    `;
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${strapiToken}`,
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      console.error(`Error al obtener correos de Strapi: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.errors) {
      console.error(`Error de GraphQL: ${JSON.stringify(data.errors, null, 2)}`);
      return [];
    }
    
    if (!data.data?.emailTrackings) {
      console.error('Estructura de datos inesperada en la respuesta de Strapi');
      return [];
    }
    
    // Mapear los emails de Strapi al formato que necesitamos
    const mappedEmails = data.data.emailTrackings.map((track: any) => {
      // Crear una vista previa del contenido si está disponible
      let preview = "";
      if (track.fullContent) {
        preview = cleanEmailString(track.fullContent).substring(0, 100).trim() + (track.fullContent.length > 100 ? "..." : "");
      }
      
      // Crear y retornar la entidad de email procesada con campos limpios
      return {
        documentId: track.documentId,
        emailId: track.emailId,
        from: cleanEmailString(track.from),
        to: cleanEmailString(track.to || ''),
        subject: cleanEmailString(track.subject),
        receivedDate: track.receivedDate,
        status: mapStrapiStatus(track.emailStatus),
        lastResponseBy: track.lastResponseBy,
        preview: preview,
        fullContent: cleanEmailString(track.fullContent)
      };
    });
    
    return mappedEmails;
  } catch (error) {
    console.error('Error al obtener correos desde Strapi:', error);
    return [];
  }
} 