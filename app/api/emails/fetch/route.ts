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
export const maxDuration = 180; // This function can run for a maximum of 180 seconds

export async function GET(request: Request) {
  // Aumentar el tiempo límite para esta operación 
  // Señalizar al servidor para permitir más tiempo de respuesta
  const responseHeaders = new Headers();
  responseHeaders.set('Connection', 'keep-alive');
  
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
        // Iniciar un proceso en segundo plano para la sincronización real
        // Primero obtenemos los emails de IMAP de manera optimizada
        console.log('Buscando correos desde el servidor IMAP...');
        
        // Crear una conexión IMAP
        const imapConfig = getImapConfig();
        await emailCache.set('last_sync_log', 'Conectando al servidor IMAP...', 1800);
        const connection = await Imap.connect(imapConfig);
        console.log('Conexión establecida con el servidor IMAP');
        await emailCache.set('last_sync_log', 'Conexión establecida con el servidor IMAP', 1800);
        
        // Abrir la bandeja de entrada
        await connection.openBox('INBOX');
        console.log('Bandeja INBOX abierta');
        await emailCache.set('last_sync_log', 'Bandeja INBOX abierta', 1800);
        
        // Buscar solo IDs y fechas para comparar
        const searchCriteria = ['ALL'];
        const fetchOptions = {
          bodies: ['HEADER.FIELDS (DATE FROM SUBJECT MESSAGE-ID)'],
          struct: true
        };
        
        // Obtener solo los datos necesarios para identificar correos nuevos
        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`Encontrados ${messages.length} correos en el servidor`);
        await emailCache.set('last_sync_log', `Encontrados ${messages.length} correos en el servidor`, 1800);
        
        // Procesar mensajes para obtener solo los IDs que necesitamos
        const newEmailsToSync: ProcessedEmail[] = [];
        
        for (const msg of messages) {
          const headerPart = msg.parts.find((part: any) => part.which === 'HEADER.FIELDS (DATE FROM SUBJECT MESSAGE-ID)');
          if (!headerPart) continue;
          
          const emailId = String(msg.attributes.uid);
          if (!existingIds.has(emailId)) {
            try {
              // Asegurarnos que headerPart.body es un string antes de parsearlo
              const headerBody = typeof headerPart.body === 'string' 
                ? headerPart.body 
                : JSON.stringify(headerPart.body);
              
              // Usar el parser de encabezados de manera segura
              const parsedHeader = Imap.parseHeader(headerBody);
              
              // Extraer datos con validación
              const rawDate = parsedHeader.date && parsedHeader.date[0] ? parsedHeader.date[0] : '';
              const receivedDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();
              
              const from = parsedHeader.from && parsedHeader.from[0] ? parsedHeader.from[0] : '';
              const subject = parsedHeader.subject && parsedHeader.subject[0] ? parsedHeader.subject[0] : '(Sin asunto)';
              
              newEmailsToSync.push({
                id: emailId,
                emailId: emailId,
                from,
                to: '',  // Se completará después si es necesario
                subject,
                receivedDate,
                status: 'necesitaAtencion',
                lastResponseBy: null,
                preview: ''  // Se completará después si es necesario
              });
            } catch (headerError) {
              console.error(`Error al procesar encabezado del correo ${emailId}:`, headerError);
              // Añadir el correo con información básica
              newEmailsToSync.push({
                id: emailId,
                emailId: emailId,
                from: 'Error al procesar remitente',
                to: '',
                subject: 'Error al procesar asunto',
                receivedDate: new Date().toISOString(),
                status: 'necesitaAtencion',
                lastResponseBy: null,
                preview: 'Error al procesar el encabezado del correo'
              });
            }
          }
        }
        
        // Cerrar la conexión IMAP
        await connection.end();
        console.log('Conexión con servidor IMAP cerrada');
        await emailCache.set('last_sync_log', 'Conexión con servidor IMAP cerrada', 1800);
        
        console.log(`Identificados ${newEmailsToSync.length} correos nuevos para sincronizar`);
        await emailCache.set('last_sync_log', `Encontrados ${newEmailsToSync.length} correos nuevos`, 1800);
        
        // Si hay correos nuevos, iniciar procesamiento en segundo plano
        if (newEmailsToSync.length > 0) {
          await emailCache.set('emails_count', newEmailsToSync.length.toString(), 1800);
          await emailCache.set('emails_processed', '0', 1800);
          await emailCache.set('last_sync_log', `Preparando sincronización de ${newEmailsToSync.length} correos nuevos...`, 1800);
          
          // Responder inmediatamente con la información de los correos nuevos
          // Iniciar el procesamiento en segundo plano sin bloquear la respuesta
          (async () => {
            try {
              // Procesar los nuevos correos en lotes pequeños para no sobrecargar Strapi
              let processedCount = 0;
              const batchSize = 5;
              
              // Ahora vamos a obtener el contenido completo solo de los correos nuevos
              for (let i = 0; i < newEmailsToSync.length; i += batchSize) {
                const batch = newEmailsToSync.slice(i, i + batchSize);
                
                // Obtener el contenido detallado de estos correos
                const detailedContent = await fetchDetailedEmails(batch.map(email => email.emailId));
                
                // Procesar cada correo con su contenido detallado
                const promises = batch.map((email, index) => {
                  const detailed = detailedContent[index] || {};
                  return syncEmailWithStrapi(
                    email.emailId,
                    detailed.from || email.from,
                    detailed.to || email.to || '',
                    detailed.subject || email.subject,
                    email.receivedDate,
                    'necesitaAtencion',
                    null,
                    false, // silent
                    detailed.attachments,
                    detailed.preview || '',
                    detailed.fullContent || ''
                  );
                });
                
                // Esperar a que se complete el lote
                await Promise.all(promises);
                processedCount += batch.length;
                
                // Actualizar el progreso
                await emailCache.set('emails_processed', processedCount.toString(), 1800);
                await emailCache.set('last_sync_log', `Procesados ${processedCount}/${newEmailsToSync.length} correos nuevos`, 1800);
                
                // Pequeña pausa para no sobrecargar la API
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              // Completar sincronización
              await emailCache.set('last_sync_log', `Sincronización completada: ${processedCount} correos nuevos procesados`, 1800);
              
              // Actualizar estadísticas y caché
              const allStrapiEmails = await getEmailsFromStrapi();
              const stats = {
                necesitaAtencion: allStrapiEmails.filter(email => email.status === "necesitaAtencion").length,
                informativo: allStrapiEmails.filter(email => email.status === "informativo").length,
                respondido: allStrapiEmails.filter(email => email.status === "respondido").length
              };
              
              // Guardar en caché los emails actualizados
              await emailCache.setEmailList('all', { emails: allStrapiEmails, stats }, 1, -1);
              
              // Marcar sincronización como completada
              await emailCache.set('sync_in_progress', 'false', 1800);
              await emailCache.set('last_sync_timestamp', new Date().toISOString(), 60 * 60 * 24 * 30);
            } catch (asyncError) {
              console.error('Error en procesamiento asíncrono de correos:', asyncError);
              await emailCache.set('sync_in_progress', 'false', 1800);
              await emailCache.set('last_sync_log', `Error al sincronizar: ${asyncError instanceof Error ? asyncError.message : 'Error desconocido'}`, 1800);
            }
          })();
          
          // Responder inmediatamente con la información de correos nuevos
          return NextResponse.json({
            success: true,
            newEmails: newEmailsToSync.map(email => ({
              ...email,
              // Aplicar limpieza a los datos de retorno
              from: cleanEmailString(email.from),
              subject: cleanEmailString(email.subject || '')
            })),
            totalToProcess: newEmailsToSync.length,
            message: `Iniciando el procesamiento de ${newEmailsToSync.length} correos nuevos en segundo plano`,
            fromStrapi: true
          }, { headers: responseHeaders });
        } else {
          // No hay correos nuevos
          await emailCache.set('last_sync_log', 'No se encontraron correos nuevos para sincronizar', 1800);
          await emailCache.set('sync_in_progress', 'false', 1800);
          
          return NextResponse.json({
            success: true,
            newEmails: [],
            totalToProcess: 0,
            message: 'No se encontraron correos nuevos para sincronizar',
            fromStrapi: true
          }, { headers: responseHeaders });
        }
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
        // Asegurarnos que guardamos texto plano limpio, pero ahora podemos tener correos sin contenido
        fullContent: escapeForGraphQL(
          // Si no hay contenido completo ni preview, usar un mensaje estándar
          typeof fullContent === 'string' && fullContent.trim() 
            ? fullContent.trim() 
            : typeof preview === 'string' && preview.trim() && !preview.includes('Contenido no cargado para mejorar rendimiento')
              ? preview.trim()
              : 'Contenido no disponible - sincronización rápida'
        ),
        lastResponseBy: lastResponseBy || null
      }
    };
    
    // Log para depurar la longitud del contenido
    const contentLength = (fullContent || preview || '').length;
    console.log(`Longitud del contenido para ${emailId}: ${contentLength} caracteres`);

    try {
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
        const errorBody = await createResponse.text();
        console.error(`Error en la respuesta HTTP de Strapi (${createResponse.status}):`);
        // Solo mostrar los primeros 500 caracteres del error para evitar logs enormes
        console.error(`${errorBody.substring(0, 500)}${errorBody.length > 500 ? '...' : ''}`);
        
        // Si el error parece relacionado con el tamaño del contenido, intentar con contenido reducido
        if (contentLength > 10000 && (errorBody.includes('size') || errorBody.includes('large') || errorBody.includes('limit'))) {
          console.log(`Contenido demasiado grande (${contentLength} caracteres), reintentando con versión reducida`);
          
          // Realizar una mejor limpieza para truncar. Primero asegurarnos que tenemos texto plano
          let cleanContent = '';
          
          // Intentar obtener el mejor formato de texto disponible
          if (typeof fullContent === 'string' && fullContent.trim()) {
            // Si ya es texto plano, usarlo directamente
            cleanContent = fullContent.trim();
          } else if (typeof preview === 'string' && preview.trim()) {
            // Si hay una vista previa, usarla como respaldo
            cleanContent = preview.trim();
          } else {
            // Último recurso: texto vacío
            cleanContent = '';
          }
          
          // Limpiar cualquier marcador multipart que pudiera haber quedado
          cleanContent = cleanContent
            .replace(/--+[a-zA-Z0-9]+(--)?\r?\n/g, '')
            .replace(/Content-Type:[^\n]+\r?\n/g, '')
            .replace(/Content-Transfer-Encoding:[^\n]+\r?\n/g, '');
          
          // Truncar el contenido limpio
          const truncatedContent = cleanContent.substring(0, 10000) + '... (contenido truncado)';
          
          // Usar el resultado truncado
          createVariables.data.fullContent = escapeForGraphQL(truncatedContent);
          
          const retryResponse = await fetch(graphqlUrl, {
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
          
          if (!retryResponse.ok) {
            console.error(`Reintento fallido: ${await retryResponse.text().then(t => t.substring(0, 200))}`);
            return null;
          }
          
          const retryData = await retryResponse.json();
          if (retryData.errors) {
            console.error(`Error en reintento: ${JSON.stringify(retryData.errors, null, 2).substring(0, 200)}`);
            return null;
          }
          
          const retryId = retryData.data?.createEmailTracking?.documentId;
          if (retryId) {
            console.log(`Correo ${emailId} creado en Strapi con ID: ${retryId} (versión reducida)`);
            return retryId;
          }
          
          return null;
        }
        
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
  const maxLength = 25000; // Aumentamos el límite de 5000 a 25000 caracteres
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

// Función para obtener contenido detallado de emails
interface DetailedEmail {
  emailId: string;
  from?: string;
  to?: string;
  subject?: string;
  preview?: string;
  fullContent?: string;
  attachments?: Attachment[];
}

// Función auxiliar para obtener contenido detallado de correos
async function fetchDetailedEmails(emailIds: string[]): Promise<DetailedEmail[]> {
  try {
    if (emailIds.length === 0) return [];
    
    console.log(`Obteniendo contenido detallado para ${emailIds.length} correos (solo encabezados)`);
    
    // Crear conexión IMAP
    const imapConfig = getImapConfig();
    let connection;
    try {
      connection = await Imap.connect(imapConfig);
      await connection.openBox('INBOX');
    } catch (connError) {
      console.error('Error al conectar con el servidor IMAP:', connError);
      return emailIds.map(id => ({ emailId: id }));
    }
    
    // Preparar resultados
    const detailedEmails: DetailedEmail[] = [];
    
    try {
      // Procesar en lotes pequeños para mejor rendimiento
      const batchSize = 10; // Incrementado para mejorar rendimiento
      for (let i = 0; i < emailIds.length; i += batchSize) {
        const batchIds = emailIds.slice(i, i + batchSize);
        
        // Criterio de búsqueda optimizado para obtener solo encabezados
        const searchCriteria = ['ALL'];
        const fetchOptions = {
          bodies: ['HEADER'], // Solo obtener encabezados
          struct: false       // No necesitamos estructura
        };
        
        // Obtener mensajes
        const messages = await connection.search(searchCriteria, fetchOptions);
        
        // Filtrar solo los mensajes que necesitamos
        for (const emailId of batchIds) {
          // Buscar el mensaje con este ID
          const message = messages.find((msg: any) => String(msg.attributes.uid) === String(emailId));
          
          if (!message) {
            console.log(`No se encontró el correo con ID ${emailId}`);
            detailedEmails.push({ emailId });
            continue;
          }
          //console.log(message);
          // Obtener la parte del encabezado
          const headerPart = message.parts.find((part: any) => part.which === 'HEADER');
          if (!headerPart) {
            console.log(`No se pudo obtener el encabezado del correo ${emailId}`);
            detailedEmails.push({ emailId });
            continue;
          }
          
          // Parsear encabezados con manejo de errores
          let parsedHeader: { [key: string]: string[] } = {};
          try {
            // Asegurar que headerPart.body es un string o convertirlo a objeto
            let headerData;
            
            if (typeof headerPart.body === 'string') {
              // Intentar parsear como JSON si parece ser un objeto JSON
              if (headerPart.body.trim().startsWith('{')) {
                try {
                  headerData = JSON.parse(headerPart.body);
                } catch (jsonError) {
                  console.log('Error al parsear el encabezado como JSON, usando como string');
                  headerData = headerPart.body;
                }
              } else {
                headerData = headerPart.body;
              }
            } else if (typeof headerPart.body === 'object' && headerPart.body !== null) {
              // Ya es un objeto, usarlo directamente
              headerData = headerPart.body;
            } else {
              // Fallback: convertir a string
              headerData = JSON.stringify(headerPart.body);
            }
            
            // Si es un objeto, extraer directamente los campos que necesitamos
            if (typeof headerData === 'object' && headerData !== null) {
              console.log(`Extrayendo datos de encabezado para correo ${emailId}`);
              
              // Extraer datos de los campos relevantes
              const fromField = headerData.from || headerData.From || headerData['from'] || [];
              const toField = headerData.to || headerData.To || headerData['to'] || [];
              const subjectField = headerData.subject || headerData.Subject || headerData['subject'] || [];
              
              parsedHeader = {
                from: Array.isArray(fromField) ? fromField : [fromField?.toString() || ''],
                to: Array.isArray(toField) ? toField : [toField?.toString() || ''],
                subject: Array.isArray(subjectField) ? subjectField : [subjectField?.toString() || '']
              };
            } else {
              // Si es un string, usar el parser de Imap
              parsedHeader = Imap.parseHeader(headerData);
            }
          } catch (headerError) {
            console.error(`Error al procesar encabezado del correo ${emailId}:`, headerError);
            detailedEmails.push({ emailId });
            continue;
          }
          
          // Extraer datos básicos de los encabezados con manejo mejorado
          let from = '';
          if (parsedHeader.from && parsedHeader.from.length > 0) {
            from = parsedHeader.from[0] || '';
          }
          
          let to = '';
          if (parsedHeader.to && parsedHeader.to.length > 0) {
            to = parsedHeader.to[0] || '';
          }
          
          let subject = '(Sin asunto)';
          if (parsedHeader.subject && parsedHeader.subject.length > 0) {
            subject = parsedHeader.subject[0] || '(Sin asunto)';
          }
          
          // Verificar y limpiar los campos
          from = from ? cleanEmailString(from) : '';
          to = to ? cleanEmailString(to) : '';
          subject = subject ? cleanEmailString(subject) : '(Sin asunto)';
          
          console.log(`Datos extraídos: From: ${from.substring(0, 30)}... | To: ${to.substring(0, 30)}... | Subject: ${subject.substring(0, 30)}...`);
          
          // Crear una vista previa estándar para todos los correos
          const preview = 'Contenido no cargado para mejorar rendimiento. Sincronización rápida.';
          
          // Agregar a la lista de resultados
          detailedEmails.push({
            emailId,
            from: cleanEmailString(from),
            to: cleanEmailString(to),
            subject: cleanEmailString(subject),
            preview,
            // No incluir fullContent para acelerar sincronización
          });
          
          // Importante: No intentamos obtener el cuerpo del correo
        }
      }
    } finally {
      // Cerrar conexión siempre
      try {
        await connection.end();
        console.log('Conexión IMAP cerrada correctamente');
      } catch (closeError) {
        console.error('Error al cerrar conexión IMAP:', closeError);
      }
    }
    
    return detailedEmails;
  } catch (error) {
    console.error('Error al obtener contenido detallado de correos:', error);
    return emailIds.map(id => ({ emailId: id }));
  }
}

// Función auxiliar para eliminar etiquetas HTML conservando el texto
function stripHtml(html: string): string {
  if (!html) return '';
  
  // Reemplazar <br>, <p>, <div> con saltos de línea para mantener formato básico
  const textWithLineBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n')
    .replace(/<p[^>]*>/gi, '') 
    .replace(/<\/p>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<tr[^>]*>/gi, '')
    .replace(/<\/tr>\s*<tr[^>]*>/gi, '\n')
    .replace(/<td[^>]*>/gi, '')
    .replace(/<\/td>\s*<td[^>]*>/gi, ', ')
    .replace(/<\/td>/gi, ' ');
  
  // Eliminar todas las etiquetas HTML restantes
  const textWithoutTags = textWithLineBreaks.replace(/<[^>]*>/g, '');
  
  // Decodificar entidades HTML
  const decodedText = textWithoutTags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  
  // Normalizar espacios
  return decodedText
    .replace(/\n{3,}/g, '\n\n') // Reducir múltiples líneas vacías a máximo 2
    .replace(/\s+\n/g, '\n')    // Eliminar espacios antes de saltos de línea
    .replace(/\n\s+/g, '\n')    // Eliminar espacios después de saltos de línea
    .replace(/ {2,}/g, ' ')     // Reducir múltiples espacios a uno solo
    .trim();                    // Eliminar espacios al inicio y final
} 