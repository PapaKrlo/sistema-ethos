import { NextResponse } from 'next/server';
import Imap from 'imap-simple';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';

// Importar servicios de email y caché
import { emailService } from '../../../lib/email';
import { emailCache } from '../../../lib/cache';
import { emailQueue } from '../../../lib/queue';

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

// Interfaces para tipado
interface ImapMessage {
  parts: Array<{
    which: string;
    body: any;
  }>;
  attributes: {
    uid: string;
    [key: string]: any;
  };
}

interface EmailTracking {
  id: string;
  attributes: {
    emailId: string;
    emailStatus: 'necesitaAtencion' | 'informativo' | 'respondido';
    from: string;
    to: string;
    subject: string;
    receivedDate: string;
    lastResponseBy: string | null;
    lastResponseDate: string | null;
  };
}

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
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
  attachments?: Attachment[];
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

// Función para mapear estados de API a formato Strapi
function mapToStrapiStatus(status: string) {
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
}

// Controlar nivel de logs
const VERBOSE_LOGGING = process.env.VERBOSE_EMAIL_LOGGING === 'true';

// Configuración del servidor IMAP
const getImapConfig = () => ({
  imap: {
    user: 'administraciona3@almax.ec',
    password: process.env.EMAIL_PASSWORD || '',
    host: 'pop.telconet.cloud',
    port: 993,
    tls: true,
    authTimeout: 30000,
    tlsOptions: { rejectUnauthorized: false }, // Solo para desarrollo
  }
});

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
  try {
    // Verificar si esta es una solicitud automática para evitar bucles
    const noAutoRefetch = request.headers.get('x-no-auto-refetch') === 'true';
    
    // Obtener parámetros de la petición
    const requestUrl = new URL(request.url);
    const refreshParam = requestUrl.searchParams.get('refresh');
    const onlyNewParam = requestUrl.searchParams.get('onlyNew');
    
    // Determinar si debemos hacer refresh de los datos
    const shouldRefresh = refreshParam === 'true';
    const onlyNew = onlyNewParam === 'true';
    
    // Intentar obtener emails desde cache primero
    if (!shouldRefresh) {
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
    }
    
    // Si se solicita obtener solo los nuevos correos
    if (shouldRefresh && onlyNew) {
      // Obtener los IDs de correos existentes
      const existingEmails = await getEmailsFromStrapi();
      const existingIds = new Set(existingEmails.map(email => email.emailId));
      
      console.log(`Encontrados ${existingIds.size} correos existentes en Strapi`);
      
      // Marcar inicio de sincronización
      await emailCache.set('sync_in_progress', 'true', 600);
      await emailCache.set('last_sync_log', 'Buscando correos nuevos...', 1800);
      
      try {
        // Obtener todos los correos desde IMAP
        const allEmails = await emailService.fetchEmails({
          batchSize: -1, // Obtener todos los correos disponibles
          skipCache: true
        });
        
        console.log(`Obtenidos ${allEmails.length} correos desde IMAP`);
        await emailCache.set('last_sync_log', `Obtenidos ${allEmails.length} correos desde IMAP`, 1800);
        
        // Identificar los correos nuevos (que no existen en Strapi)
        const newEmails = allEmails.filter(email => !existingIds.has(email.emailId));
        
        console.log(`Identificados ${newEmails.length} correos nuevos para sincronizar`);
        await emailCache.set('last_sync_log', `Encontrados ${newEmails.length} correos nuevos`, 1800);
        await emailCache.set('emails_count', newEmails.length.toString(), 1800);
        await emailCache.set('emails_processed', '0', 1800);
        
        // Definir el contador de procesados fuera del bloque condicional
        let processedCount = 0;
        
        // Si hay correos nuevos, procesarlos
        if (newEmails.length > 0) {
          await emailCache.set('last_sync_log', `Comenzando a procesar ${newEmails.length} correos nuevos...`, 1800);
          
          // Procesar los nuevos correos en lotes para no sobrecargar Strapi
          const batchSize = 5;
          
          for (let i = 0; i < newEmails.length; i += batchSize) {
            const batch = newEmails.slice(i, i + batchSize);
            const promises = batch.map(email => 
              syncEmailWithStrapi(
                email.emailId,
                email.from,
                email.to,
                email.subject,
                email.receivedDate,
                email.status,
                email.lastResponseBy,
                false, // silent
                undefined, // Sin adjuntos
                email.preview,
                email.fullContent
              )
            );
            
            await Promise.all(promises);
            processedCount += batch.length;
            
            // Actualizar el progreso
            await emailCache.set('emails_processed', processedCount.toString(), 1800);
            await emailCache.set('last_sync_log', `Procesados ${processedCount}/${newEmails.length} correos nuevos`, 1800);
          }
          
          // Completar sincronización
          await emailCache.set('last_sync_log', `Sincronización completada: ${processedCount} correos nuevos procesados`, 1800);
        } else {
          await emailCache.set('last_sync_log', 'No se encontraron correos nuevos para sincronizar', 1800);
        }
        
        // Obtener estadísticas actualizadas
        const allStrapiEmails = await getEmailsFromStrapi();
        const stats = {
          necesitaAtencion: allStrapiEmails.filter(email => email.status === "necesitaAtencion").length,
          informativo: allStrapiEmails.filter(email => email.status === "informativo").length,
          respondido: allStrapiEmails.filter(email => email.status === "respondido").length
        };
        
        // Marcar sincronización como completada
        await emailCache.set('sync_in_progress', 'false', 1800);
        await emailCache.set('last_sync_timestamp', new Date().toISOString(), 60 * 60 * 24 * 30);
        
        // Guardar en caché los emails actualizados
        await emailCache.setEmailList('all', { emails: allStrapiEmails, stats }, 1, -1);
        
        // Retornar el resultado
        return NextResponse.json({
          emails: allStrapiEmails,
          stats,
          newEmails: newEmails,
          totalProcessed: processedCount,
          fromStrapi: true
        });
      } catch (error) {
        console.error('Error al sincronizar correos nuevos:', error);
        await emailCache.set('sync_in_progress', 'false', 1800);
        await emailCache.set('last_sync_log', `Error al sincronizar: ${error instanceof Error ? error.message : 'Error desconocido'}`, 1800);
        throw error;
      }
    }
    
    // Si no se especificó onlyNew, caemos en el flujo normal
    try {
      // Obtener emails desde Strapi directamente
      const strapiEmails = await getEmailsFromStrapi();
      
      if (strapiEmails && strapiEmails.length > 0) {
        console.log(`Mostrando ${strapiEmails.length} correos desde Strapi`);
        
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
      
      // Si no hay emails en Strapi, obtener desde IMAP
      console.log('Obteniendo emails desde IMAP...');
      const emails = await emailService.fetchEmails({
        batchSize: 100,
        skipCache: true
      });
      
      console.log(`Obtenidos ${emails.length} emails desde IMAP`);
      
      // Calcular estadísticas
      const stats = {
        necesitaAtencion: emails.filter(e => e.status === "necesitaAtencion").length,
        informativo: emails.filter(e => e.status === "informativo").length,
        respondido: emails.filter(e => e.status === "respondido").length
      };
      
      // Guardar en caché
      await emailCache.setEmailList('all', { emails, stats }, 1, -1);
      
      return NextResponse.json({
        emails,
        stats,
        fromImap: true
      });
    } catch (error) {
      console.error('Error al obtener emails:', error);
      
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
      
      throw error;
    }
  } catch (error: any) {
    console.error("Error al procesar solicitud:", error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Función para sincronizar un correo con Strapi
async function syncEmailWithStrapi(
  emailId: string,
  from: string,
  to: string,
  subject: string,
  receivedDate: string,
  status: string | null,
  lastResponseBy: string | null,
  silent: boolean = false,
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>,
  preview?: string,
  fullContent?: string
): Promise<string | null> {
  try {
    // Verificar las variables de entorno necesarias
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
    const strapiToken = process.env.STRAPI_API_TOKEN || '';
    
    if (!graphqlUrl || !strapiToken) {
      console.error('Error: URL de GraphQL o token de Strapi no están configurados');
      return null;
    }
    
    // Verificar si ya existe - actualizada para usar la estructura correcta
    const checkQuery = `
      query {
        emailTrackings(filters: { emailId: { eq: "${String(emailId)}" } }) {
          documentId
          emailId
          emailStatus
          lastResponseBy
        }
      }
    `;

    // Hacer consulta a Strapi
    const checkResponse = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${strapiToken}`,
      },
      body: JSON.stringify({ query: checkQuery }),
    });
    
    // Verificar si la respuesta fue exitosa
    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error(`Error en la respuesta al verificar correo: ${checkResponse.status} ${checkResponse.statusText}`);
      console.error(`Detalle: ${errorText.substring(0, 500)}`);
      return null;
    }

    const checkData = await checkResponse.json();
    
    // Verificar errores de GraphQL en la verificación
    if (checkData.errors) {
      console.error('Errores al verificar si el correo existe:', JSON.stringify(checkData.errors, null, 2));
      return null;
    }
    
    const exists = checkData.data?.emailTrackings && checkData.data.emailTrackings.length > 0;
    
    if (exists) {
      // El correo ya existe, no hacer nada
      return checkData.data.emailTrackings[0].documentId;
    }
    
    // Si el correo no existe, crearlo
    const strapiStatus = mapStrapiStatus(status || "necesitaAtencion");
    
    const createMutation = `
      mutation CreateEmail($data: EmailTrackingInput!) {
        createEmailTracking(
          data: $data
        ) {
          documentId
          emailId
          emailStatus
        }
      }
    `;
    
    const createVariables = {
      data: {
        emailId: String(emailId),
        from: escapeForGraphQL(from),
        to: escapeForGraphQL(to),
        subject: escapeForGraphQL(subject),
        receivedDate: receivedDate,
        emailStatus: strapiStatus,
        fullContent: escapeForGraphQL(fullContent || preview || ''),
        lastResponseBy: lastResponseBy || null
      }
    };
    
    const createResponse = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${strapiToken}`,
      },
      body: JSON.stringify({ 
        query: createMutation,
        variables: createVariables
      }),
    });
    
    if (!createResponse.ok) {
      console.error(`Error en la respuesta HTTP de Strapi (${createResponse.status}): ${await createResponse.text()}`);
      return null;
    }
    
    const createData = await createResponse.json();
    
    if (createData.errors) {
      console.error(`Error en la respuesta de Strapi: ${JSON.stringify(createData.errors)}`);
      return null;
    }
    
    const newId = createData.data?.createEmailTracking?.documentId;
    
    if (newId) {
      console.log(`Correo ${emailId} creado en Strapi con ID: ${newId}`);
      return newId;
    } else {
      console.error(`No se pudo obtener el ID del correo creado para ${emailId}`);
      return null;
    }
  } catch (error) {
    console.error('Error al sincronizar correo con Strapi:', error);
    return null;
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

// Función para escapar texto para consultas GraphQL
function escapeForGraphQL(text: string): string {
  if (!text) return "";
  
  // Limitar la longitud del texto para evitar problemas con textos muy largos
  const maxLength = 5000;
  let truncatedText = text;
  if (text.length > maxLength) {
    truncatedText = text.substring(0, maxLength) + "...";
  }
  
  // Escapar comillas dobles, barras invertidas y caracteres de nueva línea
  return truncatedText
    .replace(/\\/g, '\\\\') // Escapar barras invertidas primero
    .replace(/"/g, '\\"')   // Escapar comillas dobles
    .replace(/\n/g, '\\n')  // Convertir saltos de línea
    .replace(/\r/g, '')     // Eliminar retornos de carro
    .replace(/\t/g, ' ')    // Convertir tabulaciones en espacios
    .replace(/\f/g, '')     // Eliminar form feeds
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Eliminar caracteres de control
} 