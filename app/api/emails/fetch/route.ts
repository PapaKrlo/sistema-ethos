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
    
    // Determinar si debemos hacer refresh de los datos
    const shouldRefresh = refreshParam === 'true';
    
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
    
    // Analizar parámetros de la solicitud
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const force = searchParams.get('force') === 'true';
    const getAllEmails = searchParams.get('getAllEmails') === 'true';
    
    // Si se solicita un refresh y force, ignorar caché y obtener todos los emails
    const forceRefresh = refresh && force;
    
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '500');
    const updateFromStrapi = searchParams.get('updateFromStrapi') === 'true';
    const silent = searchParams.get('silent') === 'true';
    const prioritizeStrapi = searchParams.get('prioritizeStrapi') === 'true' || true; // Por defecto, priorizar datos de Strapi
    
    // Determinar la clave de caché a usar
    const cacheKey = 'recent';
    
    // Verificar si hay un error reciente con Strapi
    const strapiErrorKey = 'strapi_query_error';
    const lastStrapiError = await emailCache.get(strapiErrorKey);
    
    // Verificar si ya hay una sincronización en curso
    const syncInProgressKey = 'sync_in_progress';
    const syncInProgress = await emailCache.get(syncInProgressKey);
    
    // Si se solicita un refresh y tenemos forzado + getAllEmails, sincronizar todos los correos
    if (forceRefresh && getAllEmails) {
      console.log("Sincronizando todos los correos de IMAP con Strapi (forzado)...");
      
      // Comprobar si debemos evitar iniciar sincronización automática
      if (!noAutoRefetch) {
        // Iniciar sincronización en background con parámetros para obtener todos los correos
        syncEmailsBackground({
          getAllEmails: true,
          batchSize: 1000,
          page: 1,
          force: true,
          silent: false
        });
      } else {
        console.log("Omitiendo sincronización en segundo plano debido a encabezado x-no-auto-refetch");
      }
      
      // Devolver correos desde Strapi mientras se sincroniza
      const strapiEmails = await getEmailsFromStrapi();
      
      console.log(`Mostrando ${strapiEmails.length} correos desde Strapi mientras se sincroniza...`);
      
      // Calcular estadísticas
      const stats = {
        necesitaAtencion: strapiEmails.filter(email => email.status === "necesitaAtencion").length,
        informativo: strapiEmails.filter(email => email.status === "informativo").length,
        respondido: strapiEmails.filter(email => email.status === "respondido").length
      };
      
      return NextResponse.json({ emails: strapiEmails, stats });
    }
    
    // Si hay un error reciente con Strapi o ya hay una sincronización en curso,
    // vamos directamente a los datos en cache
    if (lastStrapiError || syncInProgress === 'true') {
      console.log('Usando caché debido a error reciente en Strapi o sincronización en curso');
      
      // Obtener datos de la caché
      const cachedData = await emailCache.getEmailList<EmailCacheResult>(cacheKey);
      
      if (cachedData && cachedData.emails && cachedData.emails.length > 0) {
        return NextResponse.json({
          emails: cachedData.emails,
          stats: cachedData.stats,
          fromCache: true,
          strapiError: !!lastStrapiError,
          syncInProgress: syncInProgress === 'true'
        });
      }
    }
    
    try {
      // Primero, intentar obtener datos desde Strapi si se prioriza Strapi y no hay error reciente
      if (prioritizeStrapi && !lastStrapiError) {
        // Obtener emails desde Strapi directamente
        const strapiEmails = await getEmailsFromStrapi();
        
        if (strapiEmails && strapiEmails.length > 0) {
          if (!silent) console.log(`Mostrando ${strapiEmails.length} correos desde Strapi mientras se sincroniza...`);
          
          // Calcular estadísticas
          const stats = {
            necesitaAtencion: strapiEmails.filter(e => e.status === "necesitaAtencion").length,
            informativo: strapiEmails.filter(e => e.status === "informativo").length,
            respondido: strapiEmails.filter(e => e.status === "respondido").length
          };
          
          // Iniciar sincronización en segundo plano si se solicita refresco y no hay una en curso
          const shouldSync = refresh && syncInProgress !== 'true';
          
          if (shouldSync && !noAutoRefetch) {
            // No esperamos a que termine, lo hacemos en segundo plano
            syncEmailsBackground({
              getAllEmails: getAllEmails,
              batchSize: pageSize,
              page: page,
              force: true,
              silent: silent
            }).catch(err => 
              console.error('Error en sincronización en segundo plano:', err)
            );
          } else if (syncInProgress === 'true') {
            console.log('Ya hay una sincronización en curso. No se iniciará otra.');
          } else if (noAutoRefetch) {
            console.log('Omitiendo sincronización en segundo plano debido a encabezado x-no-auto-refetch');
          }
          
          // Devolver datos de Strapi inmediatamente
          return NextResponse.json({
            emails: strapiEmails,
            stats,
            fromStrapi: true,
            isSyncing: shouldSync
          });
        }
      }
      
      // Si no hay datos de Strapi o no se prioriza, continuar con el flujo normal
      
      // Si se solicita actualizar desde Strapi, hacerlo primero
      if (updateFromStrapi) {
        if (!silent) console.log('Actualizando estados desde Strapi...');
        const updateResult = await updateEmailStatusesFromStrapi();
        if (!silent) console.log(`Estados actualizados desde Strapi: ${updateResult?.count || 0} correos`);
      }
      
      // Verificar si ya hay una sincronización en curso (verificamos de nuevo por si cambió)
      const syncInProgressCheck = await emailCache.get('sync_in_progress');
      
      if (!syncInProgressCheck) {
        // Marcar que hay una sincronización en curso
        await emailCache.set('sync_in_progress', 'true', 600); // 10 minutos máximo
        
        try {
          if (!silent) console.log('Iniciando sincronización de correos...');
          
          // Obtener correos desde el servidor IMAP
          const emails = await emailService.fetchEmails({
            batchSize: getAllEmails ? -1 : pageSize,
            startIndex: (page - 1) * pageSize,
            skipCache: true
          });
          
          // Sincronizar correos con Strapi si refresh es true o se forzó actualización
          if ((refresh || force) && !noAutoRefetch) {
            console.log(`Sincronizando ${emails.length} correos con Strapi...`);
            const syncPromises = emails.map(email => 
              syncEmailWithStrapi(
                email.emailId,
                email.from,
                email.to,
                email.subject,
                email.receivedDate,
                email.status,
                email.lastResponseBy,
                silent,
                email.attachments,
                email.preview,
                email.fullContent
              )
            );
            
            // Procesar en lotes para no sobrecargar Strapi
            const batchSize = 5;
            let syncedCount = 0;
            
            for (let i = 0; i < syncPromises.length; i += batchSize) {
              const batch = syncPromises.slice(i, i + batchSize);
              await Promise.all(batch);
              syncedCount += batch.length;
              if (!silent && i + batchSize < syncPromises.length) {
                console.log(`Sincronizados ${syncedCount}/${syncPromises.length} correos...`);
              }
            }
            
            console.log('Sincronización con Strapi completada');
          } else if (noAutoRefetch) {
            console.log('Omitiendo sincronización con Strapi debido a encabezado x-no-auto-refetch');
          } else if (!refresh && !force) {
            console.log('No se solicitó refresh ni force, omitiendo sincronización con Strapi');
          }
          
          // Calcular las estadísticas
          const stats = {
            necesitaAtencion: emails.filter((e: ProcessedEmail) => e.status === "necesitaAtencion").length,
            informativo: emails.filter((e: ProcessedEmail) => e.status === "informativo").length,
            respondido: emails.filter((e: ProcessedEmail) => e.status === "respondido").length
          };
          
          // Guardar en caché como un objeto con emails y stats
          const cacheData: EmailCacheResult = { emails, stats };
          await emailCache.setEmailList(cacheKey, cacheData, page, pageSize);
          
          // Registrar la finalización en el log
          const completionMessage = `Sincronización completada: ${emails.length} correos procesados`;
          await emailCache.set('last_sync_log', completionMessage, 1800);
          
          if (!silent) console.log(completionMessage);
          
          // Eliminar marca de sincronización en curso
          await emailCache.del('sync_in_progress');
          
          return NextResponse.json({
            emails,
            stats,
            fromCache: false,
            refreshQueued: true
          });
        } catch (syncError) {
          // Marcar que la sincronización ha terminado con error
          await emailCache.set('sync_in_progress', 'false', 1800);
          throw syncError;
        }
      } else {
        // Si ya hay una sincronización en curso, intentar usar caché o esperar un poco
        if (!silent) console.log('Ya hay una sincronización en curso, esperando datos desde caché...');
        
        // Esperar un poco para dar tiempo a que se procesen algunos correos
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Intentar de nuevo desde caché
        const cachedData = await emailCache.getEmailList<EmailCacheResult>(cacheKey, page, pageSize);
        if (cachedData) {
          return NextResponse.json({
            emails: cachedData.emails,
            stats: cachedData.stats,
            fromCache: true,
            syncInProgress: true
          });
        }
        
        // Si aún no hay datos en caché, hacer una obtención mínima
        const emails = await emailService.fetchEmails({
          batchSize: Math.min(5, pageSize), // Limitar a máximo 5 para no sobrecargar
          startIndex: (page - 1) * pageSize,
          skipCache: false
        });
        
        // Intentar sincronizar con Strapi solo si se forzó actualización explícitamente
        if (force) {
          console.log(`Sincronizando ${emails.length} correos con Strapi (durante sincronización en progreso)...`);
          const syncPromises = emails.map(email => 
            syncEmailWithStrapi(
              email.emailId,
              email.from,
              email.to,
              email.subject,
              email.receivedDate,
              email.status,
              email.lastResponseBy,
              silent,
              email.attachments,
              email.preview,
              email.fullContent
            )
          );
          
          await Promise.all(syncPromises);
          console.log('Sincronización con Strapi completada (durante sincronización en progreso)');
        }
        
        const stats = {
          necesitaAtencion: emails.filter((e: ProcessedEmail) => e.status === "necesitaAtencion").length,
          informativo: emails.filter((e: ProcessedEmail) => e.status === "informativo").length,
          respondido: emails.filter((e: ProcessedEmail) => e.status === "respondido").length
        };
        
        return NextResponse.json({
          emails,
          stats,
          fromCache: false,
          syncInProgress: true
        });
      }
    } catch (error: any) {
      console.error("Error al obtener correos:", error.message);
      
      // Intentar recuperar datos de caché si hay error
      try {
        const cachedData = await emailCache.getEmailList<EmailCacheResult>('recent', page, pageSize);
        if (cachedData) {
          return NextResponse.json({
            emails: cachedData.emails,
            stats: cachedData.stats,
            fromCache: true,
            error: "Se produjo un error pero se recuperaron datos de caché"
          });
        }
      } catch (cacheError) {
        console.error("Error al recuperar de caché:", cacheError);
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

    // Solo mostrar log en modo verbose
    if (VERBOSE_LOGGING && !silent) {
      console.log(`Buscando si el correo ${emailId} ya existe...`);
    }

    // Implementar un mecanismo de reintentos para mejorar la resiliencia
    const maxRetries = 2;
    let retryCount = 0;
    let checkResponse;
    
    while (retryCount <= maxRetries) {
      try {
        checkResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiToken}`,
          },
          body: JSON.stringify({ query: checkQuery }),
        });
        
        break; // Si no hay error, salimos del bucle
      } catch (error: any) {
        // Manejar errores de red (como socket cerrado)
        console.error(`Error de conexión en intento ${retryCount + 1}/${maxRetries + 1}:`, error.message || error);
        console.error(`Detalles adicionales: ${error.code || 'Sin código'}, ${error.name || 'Sin nombre'}`);
        
        // Si todavía tenemos reintentos disponibles, intentar de nuevo
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Reintentando conexión con Strapi (intento ${retryCount}/${maxRetries})...`);
          // Esperar antes de reintentar (2 segundos * número de intento)
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          continue;
        }
        
        // Si hemos agotado los reintentos, retornar null
        console.error('Se agotaron los reintentos para conectar con Strapi');
        return null;
      }
    }

    // Si no tenemos respuesta después de todos los reintentos, retornar null
    if (!checkResponse) {
      console.error('No se pudo obtener respuesta de Strapi después de reintentos');
      return null;
    }

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
      // El correo ya existe, procesarlo preservando su estado
      const existingEmail = checkData.data.emailTrackings[0];
      
      // Solo mostrar log en modo verbose
      if (VERBOSE_LOGGING && !silent) {
        console.log(`Correo encontrado: ${existingEmail.emailId}, estado actual: ${existingEmail.emailStatus}`);
      }
      
      // CAMBIO IMPORTANTE: Preservar el estado existente a menos que se proporcione uno nuevo explícitamente
      // Si no se proporciona un nuevo estado o si el estado es "necesitaAtencion" (predeterminado),
      // mantener el estado actual para evitar revertir categorizaciones manuales
      let newStatus = existingEmail.emailStatus;
      
      // Solo actualizar el estado si se proporciona uno explícito y no es igual al estado predeterminado
      if (status && status !== "necesitaAtencion" && existingEmail.emailStatus !== status) {
        newStatus = mapStrapiStatus(status);
        if (VERBOSE_LOGGING && !silent) {
          console.log(`Actualizando estado del correo ${emailId} de ${existingEmail.emailStatus} a ${newStatus}`);
        }
      } else {
        if (VERBOSE_LOGGING && !silent) {
          console.log(`Preservando estado actual del correo: ${existingEmail.emailStatus}`);
        }
      }
      
      // NUEVA ESTRATEGIA: Realizar actualizaciones en 2 pasos para evitar conflictos
      // Paso 1: Actualizar solo datos básicos y preservar el estado
      try {
        // Crear la mutación de actualización básica (sin adjuntos)
        const updateBasicMutation = `
          mutation UpdateEmailBasic($documentId: ID!, $data: EmailTrackingInput!) {
            updateEmailTracking(
              documentId: $documentId,
              data: $data
            ) {
              documentId
              emailId
              emailStatus
            }
          }
        `;
        
        // Preparar variables para la mutación de datos básicos
        const updateBasicVariables: {
          documentId: string;
          data: {
            emailStatus: string;
            fullContent?: string;
            lastResponseBy?: string | null;
          }
        } = {
          documentId: existingEmail.documentId,
          data: {
            emailStatus: newStatus,
            lastResponseBy: lastResponseBy || existingEmail.lastResponseBy
          }
        };
        
        // Añadir contenido solo si está presente
        if (preview || fullContent) {
          updateBasicVariables.data.fullContent = escapeForGraphQL(fullContent || preview || '');
        }
        
        // Ejecutar actualización de datos básicos
        const updateBasicResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiToken}`,
          },
          body: JSON.stringify({ 
            query: updateBasicMutation,
            variables: updateBasicVariables
          }),
        });
        
        if (!updateBasicResponse.ok) {
          console.error(`Error al actualizar datos básicos: ${updateBasicResponse.status}`);
          // No interrumpir el proceso, devolver el ID existente
          return existingEmail.documentId;
        }
        
        const updateBasicData = await updateBasicResponse.json();
        
        if (updateBasicData.errors) {
          console.error('Errores al actualizar datos básicos:', JSON.stringify(updateBasicData.errors, null, 2));
          // No interrumpir el proceso, devolver el ID existente
          return existingEmail.documentId;
        }
        
        // Solo mostrar log en modo verbose
        if (VERBOSE_LOGGING && !silent) {
          console.log(`Datos básicos del correo ${emailId} actualizados correctamente`);
        }
        
        // Paso 2: Si hay adjuntos, manejarlos por separado en un proceso asíncrono
        if (attachments && attachments.length > 0) {
          // En lugar de incluir adjuntos en la actualización principal, 
          // programar una tarea asíncrona para procesarlos después
          setTimeout(async () => {
            try {
              // Aquí se delegaría el procesamiento a un worker o queue
              console.log(`Programando procesamiento asíncrono de ${attachments.length} adjuntos para correo ${emailId}`);
              
              // Este código se ejecutará después, sin bloquear la actualización principal
              // y sin arriesgar el estado del correo si falla
            } catch (attachmentError) {
              console.error(`Error al programar procesamiento de adjuntos para ${emailId}:`, attachmentError);
              // Error en adjuntos no afecta el estado del correo
            }
          }, 100);
        }
        
        return existingEmail.documentId;
      } catch (updateError) {
        console.error('Error al actualizar el correo:', updateError);
        // A pesar del error, devolvemos el ID existente para no perder la referencia
        return existingEmail.documentId;
      }
    }
    
    // Si el correo no existe, lo creamos con la configuración adecuada
    // Asegurarnos de que usamos el mismo formato que espera Strapi
    const strapiStatus = mapStrapiStatus(status || "necesitaAtencion");
    
    // Crear la mutación de creación (sin adjuntos inicialmente)
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
    
    // Preparar variables para la mutación sin incluir adjuntos
    const createVariables: {
      data: {
        emailId: string;
        from: string;
        to: string;
        subject: string;
        receivedDate: string;
        emailStatus: string;
        fullContent?: string;
        lastResponseBy?: string | null;
      }
    } = {
      data: {
        emailId: String(emailId),
        from: escapeForGraphQL(from),
        to: escapeForGraphQL(to),
        subject: escapeForGraphQL(subject),
        receivedDate: receivedDate,
        emailStatus: strapiStatus
      }
    };
    
    // Añadir campos opcionales
    if (preview || fullContent) {
      createVariables.data.fullContent = escapeForGraphQL(fullContent || preview || '');
    }
    
    if (lastResponseBy) {
      createVariables.data.lastResponseBy = lastResponseBy;
    }
    
    // Ejecutar la mutación de creación (sin adjuntos)
    try {
      // Solo mostrar log en modo verbose
      if (VERBOSE_LOGGING && !silent) {
        console.log(`Creando nuevo registro para el correo ${emailId}...`);
      }
      
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
      
      // Obtener los datos de la respuesta
      const createData = await createResponse.json();
      
      // Verificar si hay errores
      if (createData.errors) {
        console.error(`Error en la respuesta de Strapi: ${JSON.stringify(createData.errors)}`);
        return null;
      }
      
      // Obtener el ID del documento creado
      const newId = createData.data?.createEmailTracking?.documentId;
      
      if (newId) {
        // Actualizar el caché para este correo
        if (!silent) {
          console.log(`Correo ${emailId} creado en Strapi con ID: ${newId}`);
        }
        
        // Si hay adjuntos, programar un procesamiento asíncrono
        if (attachments && attachments.length > 0) {
          setTimeout(async () => {
            // Aquí se delegaría el procesamiento a un worker o queue
            console.log(`Programando procesamiento asíncrono de ${attachments.length} adjuntos para correo nuevo ${emailId}`);
          }, 100);
        }
        
        return newId;
      } else {
        console.error(`No se pudo obtener el ID del correo creado para ${emailId}`);
        return null;
      }
    } catch (createError) {
      console.error('Error al crear el correo:', createError);
      return null;
    }
  } catch (error) {
    console.error('Error al sincronizar correo con Strapi:', error);
    return null;
  }
}

// Función auxiliar para extraer texto de direcciones de correo electrónico
function getAddressText(address: AddressObject | AddressObject[] | undefined): string {
  if (!address) return '';
  
  // Si es un array, tomar el primer elemento
  if (Array.isArray(address)) {
    return address.length > 0 && 'text' in address[0] ? address[0].text : '';
  }
  
  // Si es un objeto único
  return 'text' in address ? address.text : '';
}

// Función para generar correos de muestra para desarrollo
function generateMockEmails(): ProcessedEmail[] {
  return [
    {
      id: 'mock-1',
      emailId: 'email-123456',
      from: 'cliente@example.com',
      to: 'soporte@ethos.com',
      subject: 'Consulta sobre facturación',
      receivedDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 días atrás
      status: 'necesitaAtencion',
      lastResponseBy: null,
      preview: 'Estimados, tengo una consulta sobre mi última factura. Me aparece un cargo que no reconozco por $150 correspondiente a "gastos administrativos extra". ¿Podrían detallarme a qué corresponde este cobro?\n\nGracias de antemano por su ayuda.\n\nCordialmente,\nCliente Ejemplo',
      fullContent: 'Estimados, tengo una consulta sobre mi última factura. Me aparece un cargo que no reconozco por $150 correspondiente a "gastos administrativos extra". ¿Podrían detallarme a qué corresponde este cobro?\n\nGracias de antemano por su ayuda.\n\nCordialmente,\nCliente Ejemplo'
    },
    {
      id: 'mock-2',
      emailId: 'email-789012',
      from: 'admin@ethos.com',
      to: 'propietario@example.com',
      subject: 'Actualización de alícuotas',
      receivedDate: new Date(Date.now() - 3600000 * 24 * 4).toISOString(), // 4 días atrás
      status: 'informativo',
      lastResponseBy: 'cliente',
      preview: 'Se informa a todos los propietarios que a partir del próximo mes habrá un incremento del 5% en las alícuotas mensuales debido al aumento en los costos de mantenimiento y servicios. Este ajuste fue aprobado en la última reunión de la junta directiva.\n\nSi requiere más información, no dude en contactarnos.\n\nAdministración',
      fullContent: 'Se informa a todos los propietarios que a partir del próximo mes habrá un incremento del 5% en las alícuotas mensuales debido al aumento en los costos de mantenimiento y servicios. Este ajuste fue aprobado en la última reunión de la junta directiva.\n\nSi requiere más información, no dude en contactarnos.\n\nAdministración'
    },
    {
      id: 'mock-3',
      emailId: 'email-345678',
      from: 'inquilino@example.com',
      to: 'soporte@ethos.com',
      subject: 'Problemas con acceso al edificio',
      receivedDate: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), // 1 día atrás
      status: 'respondido',
      lastResponseBy: 'admin',
      preview: 'Buenos días, quería reportar que ayer tuve problemas para ingresar al edificio con mi tarjeta de acceso. El sistema no reconoció mi credencial y tuve que esperar casi 30 minutos hasta que llegó el guardia de seguridad.\n\n¿Podrían verificar qué sucede con mi tarjeta?\n\nGracias,\nPedro Inquilino\n\n----- Respuesta del administrador -----\n\nEstimado Pedro,\n\nLamentamos los inconvenientes. Hemos revisado el sistema y detectamos que su tarjeta no fue actualizada en la última programación de seguridad. Ya hemos corregido el problema y su acceso debería funcionar correctamente ahora.\n\nSaludos cordiales,\nDepartamento de Administración',
      fullContent: 'Buenos días, quería reportar que ayer tuve problemas para ingresar al edificio con mi tarjeta de acceso. El sistema no reconoció mi credencial y tuve que esperar casi 30 minutos hasta que llegó el guardia de seguridad.\n\n¿Podrían verificar qué sucede con mi tarjeta?\n\nGracias,\nPedro Inquilino\n\n----- Respuesta del administrador -----\n\nEstimado Pedro,\n\nLamentamos los inconvenientes. Hemos revisado el sistema y detectamos que su tarjeta no fue actualizada en la última programación de seguridad. Ya hemos corregido el problema y su acceso debería funcionar correctamente ahora.\n\nSaludos cordiales,\nDepartamento de Administración'
    },
    {
      id: 'mock-4',
      emailId: 'email-567890',
      from: 'proveedor@servicios.com',
      to: 'administracion@ethos.com',
      subject: 'RE: Cotización servicios de mantenimiento',
      receivedDate: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 días atrás
      status: 'necesitaAtencion',
      lastResponseBy: 'cliente',
      preview: 'Estimados señores,\n\nAdjunto la cotización solicitada para los servicios de mantenimiento de áreas verdes y jardines. La propuesta incluye servicios semanales con 2 jardineros y todos los insumos necesarios.\n\nQuedo atento a sus comentarios.\n\nSaludos,\nCarlos Proveedor\nGerente de Servicios\n\n-----Original Message-----\nFrom: administracion@ethos.com\nSent: Monday, January 10, 2025 11:20 AM\nTo: proveedor@servicios.com\nSubject: Cotización servicios de mantenimiento\n\nEstimado proveedor,\n\nSolicitamos una cotización para el mantenimiento de áreas verdes del complejo residencial por un período de 12 meses. Requerimos servicio semanal con al menos 2 jardineros y que incluyan todos los insumos necesarios.\n\nQuedamos atentos.\n\nAdministración ALMAX',
      fullContent: 'Estimados señores,\n\nAdjunto la cotización solicitada para los servicios de mantenimiento de áreas verdes y jardines. La propuesta incluye servicios semanales con 2 jardineros y todos los insumos necesarios.\n\nQuedo atento a sus comentarios.\n\nSaludos,\nCarlos Proveedor\nGerente de Servicios\n\n-----Original Message-----\nFrom: administracion@ethos.com\nSent: Monday, January 10, 2025 11:20 AM\nTo: proveedor@servicios.com\nSubject: Cotización servicios de mantenimiento\n\nEstimado proveedor,\n\nSolicitamos una cotización para el mantenimiento de áreas verdes del complejo residencial por un período de 12 meses. Requerimos servicio semanal con al menos 2 jardineros y que incluyan todos los insumos necesarios.\n\nQuedamos atentos.\n\nAdministración ALMAX'
    },
    {
      id: 'mock-5',
      emailId: 'email-678901',
      from: 'propietario@ejemplo.com',
      to: 'administracion@ethos.com',
      subject: 'Solicitud de aclaración sobre nueva normativa',
      receivedDate: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 horas atrás
      status: 'necesitaAtencion',
      lastResponseBy: null,
      preview: 'Estimada Administración,\n\nHe recibido la circular sobre la nueva normativa de estacionamiento pero tengo algunas dudas sobre cómo afectará a los propietarios con más de un vehículo. La circular menciona restricciones pero no especifica cuáles.\n\n¿Podrían aclarar este punto?\n\nGracias,\nJuan Propietario\n\n\nDe: Juan Propietario <propietario@ejemplo.com>\nEnviado el: lunes, 5 de enero de 2025 10:30\nPara: administracion@ethos.com\nAsunto: Re: Cambios en normativa de uso de áreas comunes\n\nBuenos días,\n\nAcuso recibo de la nueva normativa. La revisaré y les escribiré si tengo dudas.\n\nSaludos,\nJuan\n\n> El 3 ene 2025, a las 9:15, Administración Ethos <administracion@ethos.com> escribió:\n>\n> Estimados propietarios:\n>\n> Les informamos que a partir del 1 de febrero entrarán en vigor cambios en la normativa de uso de áreas comunes y estacionamientos. Adjuntamos el documento completo para su revisión.\n>\n> Administración',
      fullContent: 'Estimada Administración,\n\nHe recibido la circular sobre la nueva normativa de estacionamiento pero tengo algunas dudas sobre cómo afectará a los propietarios con más de un vehículo. La circular menciona restricciones pero no especifica cuáles.\n\n¿Podrían aclarar este punto?\n\nGracias,\nJuan Propietario\n\n\nDe: Juan Propietario <propietario@ejemplo.com>\nEnviado el: lunes, 5 de enero de 2025 10:30\nPara: administracion@ethos.com\nAsunto: Re: Cambios en normativa de uso de áreas comunes\n\nBuenos días,\n\nAcuso recibo de la nueva normativa. La revisaré y les escribiré si tengo dudas.\n\nSaludos,\nJuan\n\n> El 3 ene 2025, a las 9:15, Administración Ethos <administracion@ethos.com> escribió:\n>\n> Estimados propietarios:\n>\n> Les informamos que a partir del 1 de febrero entrarán en vigor cambios en la normativa de uso de áreas comunes y estacionamientos. Adjuntamos el documento completo para su revisión.\n>\n> Administración'
    },
    {
      id: 'mock-6',
      emailId: 'email-901234',
      from: 'vecino@residencial.com',
      to: 'administracion@ethos.com',
      subject: 'Solicitud de mantenimiento urgente',
      receivedDate: new Date(Date.now() - 3600000 * 36).toISOString(), // 36 horas atrás
      status: 'necesitaAtencion',
      lastResponseBy: null,
      preview: 'Buenas tardes,\n\nSolicito urgentemente mantenimiento para la tubería de agua en mi departamento. Hay una filtración que está afectando al departamento del piso inferior.\n\nPor favor envíen un técnico lo antes posible.\n\nAtentamente,\nSusana Vecino\nDepartamento 502\nTel: 555-1234\n\n_________________________________\nDe: Susana Vecino\nadministraciona3@almax.ec\nlunes, 24 de febrero de 2025 16:44\nYa detecté de dónde viene la filtración. Es una conexión bajo el lavabo que está goteando.\n\n_________________________________\nDe: Susana Vecino\nadministraciona3@almax.ec\nlunes, 17 de febrero de 2025 13:40\nAún no he recibido respuesta. La situación se está agravando.\n\n_________________________________\nDe: Susana Vecino\nadministraciona3@almax.ec\nlunes, 10 de febrero de 2025 13:54\nBuenos días, ¿han revisado mi solicitud anterior?'
    }
  ];
}

// Función para actualizar estados de correos desde Strapi
async function updateEmailStatusesFromStrapi() {
  console.log('Actualizando estados desde Strapi...');
  // Obtener todos los correos de Strapi
  const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
  const strapiToken = process.env.STRAPI_API_TOKEN || '';
  
  if (!graphqlUrl || !strapiToken) {
    console.error('Error: URL de GraphQL o token de Strapi no configurados');
    throw new Error('Configuración incompleta para Strapi');
  }
  
  // Corregimos la estructura de la consulta para que coincida con el esquema actual de Strapi
  // Aumentamos el límite a 1000 para asegurar que se obtengan todos los correos
  const query = `
    query {
      emailTrackings(pagination: { limit: 1000 }) {
        documentId
        emailId
        emailStatus
        lastResponseBy
      }
    }
  `;
  
  try {
    console.log('Enviando consulta a Strapi para obtener estados de emails...');
    
    // Implementar mecanismo de reintentos
    const maxRetries = 2;
    let retryCount = 0;
    let response;
    
    // Bucle de reintento
    while (retryCount <= maxRetries) {
      try {
        response = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiToken}`,
          },
          body: JSON.stringify({ query }),
          signal: AbortSignal.timeout(30000) // 30 segundos de timeout
        });
        break; // Si llega aquí, la solicitud tuvo éxito
      } catch (fetchError) {
        retryCount++;
        if (retryCount > maxRetries) throw fetchError;
        console.log(`Reintentando consulta a Strapi (${retryCount}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, 2000)); // Esperar 2 segundos antes de reintentar
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Error en la respuesta de Strapi: ${response?.status} ${response?.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`Error de GraphQL: ${JSON.stringify(data.errors, null, 2)}`);
    }
    
    // Obtener los correos de Strapi con la estructura correcta
    const strapiEmails = data.data.emailTrackings.map((item: any) => ({
      documentId: item.documentId,
      emailId: item.emailId,
      emailStatus: item.emailStatus,
      lastResponseBy: item.lastResponseBy
    }));
    
    console.log(`Se obtuvieron ${strapiEmails.length} registros de correos desde Strapi`);
    
    // Actualizar la caché con los estados de Strapi
    const cachedData = await emailCache.getEmailList<EmailCacheResult>('recent');
    
    if (!cachedData) {
      console.log('No hay datos en caché para actualizar');
      return { count: 0 };
    }
    
    let updatedCount = 0;
    
    // Actualizar cada correo en la caché con su estado en Strapi
    const updatedEmails = cachedData.emails.map(email => {
      // Buscar el correo en Strapi por emailId
      const strapiEmail = strapiEmails.find((item: any) => 
        item.emailId === email.emailId
      );
      
      if (strapiEmail) {
        // Mapear el estado de Strapi al formato de la API
        const strapiStatus = strapiEmail.emailStatus;
        const apiStatus = mapStrapiStatus(strapiStatus);
        
        // Si el estado es diferente, actualizarlo
        if (email.status !== apiStatus) {
          updatedCount++;
          return {
            ...email,
            status: apiStatus,
            lastResponseBy: strapiEmail.lastResponseBy || email.lastResponseBy
          };
        }
      }
      
      return email;
    });
    
    // Actualizar estadísticas
    const stats = {
      necesitaAtencion: updatedEmails.filter((e: ProcessedEmail) => e.status === "necesitaAtencion").length,
      informativo: updatedEmails.filter((e: ProcessedEmail) => e.status === "informativo").length,
      respondido: updatedEmails.filter((e: ProcessedEmail) => e.status === "respondido").length
    };
    
    // Guardar en caché
    await emailCache.setEmailList('recent', { emails: updatedEmails, stats });
    
    console.log('Caché actualizada con estados desde Strapi');
    return { success: true, count: updatedCount };
  } catch (error) {
    console.error('Error al obtener correos desde Strapi:', error);
    throw error;
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
      // Registrar este error para evitar reintentos inmediatos
      await emailCache.set('strapi_query_error', Date.now().toString(), 60 * 10); // 10 minutos de TTL
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
          attachments {
            name
            url
            size
            mimeType
          }
        }
      }
    `;
    
    // Verificar si ya hemos intentado esta consulta recientemente y falló
    const strapiErrorKey = 'strapi_query_error';
    const lastErrorTime = await emailCache.get(strapiErrorKey);
    
    if (lastErrorTime) {
      // Comprobar si ha pasado al menos 5 minutos desde el último error
      const errorTime = parseInt(lastErrorTime, 10);
      const now = Date.now();
      const timeSinceError = now - errorTime;
      
      // Si el error fue hace menos de 5 minutos, no intentar de nuevo
      if (timeSinceError < 5 * 60 * 1000) {
        console.log(`Omitiendo consulta a Strapi debido a error reciente (hace ${Math.round(timeSinceError/1000)} segundos)`);
        return [];
      }
    }
    
    // Implementar un mecanismo de reintentos controlado
    const maxRetries = 2;
    let retryCount = 0;
    let lastError: unknown = null;
    
    while (retryCount <= maxRetries) {
      try {
        // Implementar un mecanismo de timeout más robusto
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout
        
        try {
          const response = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${strapiToken}`,
            },
            body: JSON.stringify({ query }),
            signal: controller.signal
          });
          
          // Limpiar el timeout ya que la solicitud se completó
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.error(`Error al obtener correos de Strapi (intento ${retryCount + 1}/${maxRetries + 1}): ${response.status} ${response.statusText}`);
            
            // Si es un error 5xx, reintentar
            if (response.status >= 500) {
              retryCount++;
              if (retryCount <= maxRetries) {
                console.log(`Reintentando en ${retryCount * 2} segundos...`);
                await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
                continue;
              }
            }
            
            // Para otros errores, registrar y devolver vacío
            await emailCache.set(strapiErrorKey, Date.now().toString(), 60 * 10); // 10 minutos de TTL
            return [];
          }
          
          // Resetear el error si la consulta tuvo éxito
          await emailCache.del(strapiErrorKey);
          
          const data = await response.json();
          
          if (data.errors) {
            console.error(`Error de GraphQL (intento ${retryCount + 1}/${maxRetries + 1}): ${JSON.stringify(data.errors, null, 2)}`);
            
            // Reintentar para errores de GraphQL que podrían ser temporales
            retryCount++;
            if (retryCount <= maxRetries) {
              console.log(`Reintentando en ${retryCount * 2} segundos...`);
              await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
              continue;
            }
            
            // Si agotamos los reintentos, registrar y devolver vacío
            await emailCache.set(strapiErrorKey, Date.now().toString(), 60 * 10); // 10 minutos de TTL
            return [];
          }
          
          if (!data.data?.emailTrackings) {
            console.error('Estructura de datos inesperada en la respuesta de Strapi');
            await emailCache.set(strapiErrorKey, Date.now().toString(), 60 * 10); // 10 minutos de TTL
            return [];
          }
          
          // Aplicar limpieza antes de retornar
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
              fullContent: cleanEmailString(track.fullContent),
              attachments: (track.attachments || []).map((att: any) => ({
                filename: att.name,
                contentType: att.mimeType,
                size: att.size
              }))
            };
          });
          
          return mappedEmails;
        } catch (fetchError: unknown) {
          // Limpiar el timeout en caso de error
          clearTimeout(timeoutId);
          
          // Guardar el error para reportarlo si agotamos los reintentos
          lastError = fetchError;
          
          // Verificar si el error es por timeout
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.error(`Error: La solicitud a Strapi excedió el tiempo límite (timeout) - intento ${retryCount + 1}/${maxRetries + 1}`);
          } else {
            console.error(`Error al realizar la solicitud a Strapi (intento ${retryCount + 1}/${maxRetries + 1}):`, fetchError);
          }
          
          // Reintentar para cualquier error de red
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`Reintentando en ${retryCount * 2} segundos...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
            continue;
          }
          
          // Si agotamos los reintentos, registrar y devolver vacío
          await emailCache.set(strapiErrorKey, Date.now().toString(), 60 * 10); // 10 minutos de TTL
          return [];
        }
      } catch (error) {
        // Este catch es para errores inesperados en el bucle de reintentos
        console.error(`Error inesperado al obtener correos desde Strapi (intento ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        // Reintentar para cualquier error
        retryCount++;
        if (retryCount <= maxRetries) {
          console.log(`Reintentando en ${retryCount * 2} segundos...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
          continue;
        }
        
        // Si agotamos los reintentos, registrar y devolver vacío
        await emailCache.set(strapiErrorKey, Date.now().toString(), 60 * 10); // 10 minutos de TTL
        return [];
      }
    }
    
    // Si llegamos aquí, es porque agotamos los reintentos sin éxito
    console.error('Se agotaron los reintentos para obtener correos desde Strapi');
    await emailCache.set(strapiErrorKey, Date.now().toString(), 60 * 10); // 10 minutos de TTL
    return [];
  } catch (error) {
    // Este catch es para errores en la función principal
    console.error('Error general al obtener correos desde Strapi:', error);
    // Almacenar el momento del error para evitar reintentos frecuentes
    await emailCache.set('strapi_query_error', Date.now().toString(), 60 * 10); // 10 minutos de TTL
    return [];
  }
}

// Exportar la función syncEmailsBackground para que pueda ser utilizada por el cronjob
export async function syncEmailsBackground(
  options: {
    getAllEmails?: boolean,
    batchSize?: number,
    page?: number,
    force?: boolean,
    silent?: boolean,
    updateFromStrapi?: boolean,
    prioritizeStrapi?: boolean
  } = {}
) {
  try {
    console.log('Iniciando sincronización de correos en segundo plano...');
    
    // Marcar que hay una sincronización en curso
    await emailCache.set('sync_in_progress', 'true', 1800); // 30 minutos máximo
    await emailCache.set('last_sync_log', 'Iniciando sincronización de correos en segundo plano...', 1800);
    
    // Obtener correos desde el servidor IMAP
    const emails = await emailService.fetchEmails({
      batchSize: options.getAllEmails ? -1 : options.batchSize || 1000,
      startIndex: (options.page || 1 - 1) * (options.batchSize || 1000),
      skipCache: true
    });
    
    // Mensaje de log exacto que se muestra en consola
    const foundEmailsMessage = `Encontrados ${emails.length} correos en el servidor`;
    console.log(foundEmailsMessage);
    await emailCache.set('last_sync_log', foundEmailsMessage, 1800);
    
    // Guardar información sobre el total de correos para monitoreo
    await emailCache.set('emails_count', emails.length.toString(), 1800);
    await emailCache.set('emails_processed', '0', 1800);
    
    // Mensaje de log exacto que se muestra en consola
    const processingEmailsMessage = `Procesando ${emails.length} correos de ${emails.length} encontrados`;
    console.log(processingEmailsMessage);
    await emailCache.set('last_sync_log', processingEmailsMessage, 1800);
    
    if (!options.silent) console.log(`Guardados ${emails.length} correos en caché`);
    
    // Sincronizar con Strapi (si hay correos para sincronizar)
    if (emails.length > 0) {
      if (!options.silent) console.log(`Sincronizando ${emails.length} correos con Strapi en segundo plano...`);
      
      // Actualizar log
      await emailCache.set('last_sync_log', `Sincronizando ${emails.length} correos con Strapi en segundo plano...`, 1800);
      
      let processedCount = 0;
      
      // Procesar correos en orden (uno por uno para evitar sobrecarga)
      for (const email of emails) {
        try {
          await syncEmailWithStrapi(
            email.emailId,
            email.from,
            email.to,
            email.subject,
            email.receivedDate,
            email.status,
            email.lastResponseBy,
            options.silent,
            email.attachments,
            email.preview,
            email.fullContent
          );
          
          // Incrementar contador de procesados
          processedCount++;
          
          // Si hay adjuntos, registrar mensaje de procesamiento
          if (email.attachments && email.attachments.length > 0) {
            const attachmentMessage = `Programando procesamiento asíncrono de ${email.attachments.length} adjuntos para correo ${email.emailId}`;
            console.log(attachmentMessage);
            
            // Guardar mensaje de adjuntos en caché
            let attachmentLogs = await emailCache.get('attachment_logs');
            
            // Asegurarse de que attachmentLogs sea un array
            if (!attachmentLogs) {
              attachmentLogs = [];
            } else if (!Array.isArray(attachmentLogs)) {
              // Si por alguna razón no es un array, convertirlo a uno
              attachmentLogs = [String(attachmentLogs)];
            }
            
            // Agregar el nuevo mensaje y mantener solo los últimos 5
            attachmentLogs = [...attachmentLogs, attachmentMessage].slice(-5);
            await emailCache.set('attachment_logs', attachmentLogs, 1800);
            
            // Actualizar también el último log para que se muestre en la UI
            await emailCache.set('last_sync_log', attachmentMessage, 1800);
          }
          
          // Actualizar progreso en caché cada 5 correos
          if (processedCount % 5 === 0 || processedCount === emails.length) {
            await emailCache.set('emails_processed', processedCount.toString(), 1800);
            const processingStatusMessage = `Sincronizados ${processedCount}/${emails.length} correos...`;
            await emailCache.set('last_sync_log', processingStatusMessage, 1800);
            
            if (!options.silent) console.log(processingStatusMessage);
          }
        } catch (err) {
          console.error(`Error al sincronizar correo ${email.emailId}:`, err);
        }
      }
      
      const completionMessage = `Sincronización completada: ${processedCount} exitosos, ${emails.length - processedCount} fallidos`;
      await emailCache.set('last_sync_log', completionMessage, 1800);
      
      if (!options.silent) console.log(completionMessage);
    } else {
      // No hay correos para sincronizar
      await emailCache.set('last_sync_log', 'No hay correos nuevos para sincronizar', 1800);
      
      if (!options.silent) console.log('No hay correos para sincronizar');
    }
    
    // Actualizar estados desde Strapi al finalizar
    if (!options.silent) console.log('Actualizando estados desde Strapi...');
    await emailCache.set('last_sync_log', 'Actualizando estados desde Strapi...', 1800);
    await updateEmailStatusesFromStrapi();
    await emailCache.set('last_sync_log', 'Sincronización de correos completada', 1800);
    
    if (!options.silent) console.log('Sincronización de correos completada');
    
    // IMPORTANTE: Marcar que la sincronización ha terminado SOLO AL FINAL del proceso completo
    await emailCache.set('sync_in_progress', 'false', 1800);
    
    return { success: true, emailsCount: emails.length };
  } catch (error) {
    console.error('Error en sincronización de correos en segundo plano:', error);
    
    // Marcar que la sincronización ha terminado con error
    await emailCache.set('sync_in_progress', 'false', 1800);
    await emailCache.set('last_sync_log', `Error en sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`, 1800);
    
    throw error;
  }
}

// Función para formatear adjuntos para Strapi
function formatAttachmentsForStrapi(attachments?: Attachment[]): string {
  if (!attachments || attachments.length === 0) {
    return "[]";
  }
  
  // Limitar el número de adjuntos para evitar problemas
  const maxAttachments = 5;
  const limitedAttachments = attachments.slice(0, maxAttachments);
  
  // Convertir a JSON y eliminar caracteres problemáticos
  try {
    const attachmentsArray = limitedAttachments.map((att, index) => ({
      id: `att-${index}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: att.filename || `adjunto_${index}`,
      url: "", // Este campo se actualizará después cuando se procesen los attachments
      size: att.size || 0,
      mimeType: att.contentType || 'application/octet-stream'
    }));
    
    // Usar formato de array para GraphQL en lugar de string JSON
    return JSON.stringify(attachmentsArray)
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  } catch (error) {
    console.error('Error al formatear adjuntos:', error);
    return "[]";
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