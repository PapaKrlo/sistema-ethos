import { NextResponse } from 'next/server';
import { simpleParser } from 'mailparser';
import Imap from 'imap-simple';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { UTApi, UTFile } from 'uploadthing/server';
import { getGqlClient } from '../../../lib/gql-client';
import { emailCache } from '../../../lib/cache';
import { gql } from 'graphql-request';

// Limita el número de uploads concurrentes
const MAX_CONCURRENT_UPLOADS = 3;

// Definir tipo para los elementos de la cola
interface QueueItem {
  uploadFn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const uploadQueue: QueueItem[] = [];
let activeUploads = 0;

// Función para gestionar la cola de uploads
async function processUploadQueue() {
  if (activeUploads >= MAX_CONCURRENT_UPLOADS || uploadQueue.length === 0) {
    return;
  }
  
  activeUploads++;
  const next = uploadQueue.shift();
  
  try {
    const result = await next!.uploadFn();
    next!.resolve(result);
  } catch (error) {
    next!.reject(error);
  } finally {
    activeUploads--;
    processUploadQueue(); // Procesar siguiente elemento en la cola
  }
}

// Función para añadir un upload a la cola
function queueUpload(uploadFn: () => Promise<any>): Promise<any> {
  return new Promise((resolve, reject) => {
    uploadQueue.push({
      uploadFn,
      resolve,
      reject
    });
    
    // Iniciar el procesamiento si no está activo
    if (activeUploads < MAX_CONCURRENT_UPLOADS) {
      processUploadQueue();
    }
  });
}

// API para procesar adjuntos de correos y subirlos a UploadThing
export async function POST(request: Request) {
  const startTime = Date.now();
  const logId = `attachment-job-${Date.now()}`;
  
  console.log(`[${logId}] Iniciando procesamiento de adjuntos`);
  
  try {
    // Obtener el ID del correo
    const { emailId } = await request.json();
    
    if (!emailId) {
      return NextResponse.json({ error: 'Se requiere el emailId' }, { status: 400 });
    }
    
    console.log(`[${logId}] Procesando adjuntos para correo con ID: ${emailId}`);
    
    // Procesar los adjuntos
    const processedAttachments = await fetchAndProcessAttachments(emailId, logId);
    
    // Calcular tiempo transcurrido
    const timeElapsed = (Date.now() - startTime) / 1000;
    
    if (!processedAttachments || processedAttachments.length === 0) {
      console.log(`[${logId}] No se encontraron adjuntos para procesar (${timeElapsed.toFixed(2)}s)`);
      return NextResponse.json({ message: 'No se encontraron adjuntos para procesar' });
    }
    
    console.log(`[${logId}] Procesados ${processedAttachments.length} adjuntos en ${timeElapsed.toFixed(2)}s`);
    
    // Verificar si hay adjuntos sin URLs válidas
    const hasInvalidAttachments = processedAttachments.some(att => {
      return !att.url || !att.url.startsWith('http') || att.url.includes('example.com');
    });
    
    if (hasInvalidAttachments) {
      console.warn(`[${logId}] Hay adjuntos sin URL válida, no se actualizará Strapi`);
      return NextResponse.json({
        message: "Adjuntos procesados parcialmente, algunos sin URL válida",
        attachments: processedAttachments
      }, { status: 206 }); // 206 Partial Content
    }

    // Verificar si tenemos token y URL de Strapi
    const strapiToken = process.env.STRAPI_API_TOKEN;
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
    
    // Si tenemos configuración de Strapi y hay adjuntos, intentamos actualizar
    if (strapiToken && graphqlUrl && processedAttachments.length > 0) {
      console.log(`[${logId}] Usando configuración de Strapi para actualizar el registro`);
      
      try {
        // Consultar primero para obtener el documentId
        const getEmailQuery = gql`
          query GetEmailById($emailId: String!) {
            emailTrackings(filters: { emailId: { eq: $emailId } }) {
              documentId
            }
          }
        `;
        
        const client = getGqlClient();
        const emailData = await client.request<{ emailTrackings: { documentId: string }[] }>(getEmailQuery, { emailId });
        
        if (!emailData.emailTrackings || emailData.emailTrackings.length === 0) {
          console.error(`[${logId}] No se encontró el email con ID ${emailId} en Strapi`);
          return NextResponse.json({
            message: "Adjuntos procesados pero no se pudo actualizar Strapi",
            attachments: processedAttachments
          }, { status: 206 });
        }
        
        const documentId = emailData.emailTrackings[0].documentId;
        
        // Actualizar mediante mutación GraphQL
        const updateMutation = gql`
          mutation UpdateEmailAttachments($documentId: ID!, $attachments: [ComponentEmailAttachmentInput]) {
            updateEmailTracking(
              documentId: $documentId, 
              data: {
                attachments: $attachments
              }
            ) {
              documentId
            }
          }
        `;
        
        // Formatear los adjuntos sin incluir IDs para que Strapi los genere
        const formattedAttachments = processedAttachments
          .filter(attach => attach.url && !attach.error) // Solo incluir adjuntos válidos
          .map(attach => ({
            name: attach.name,
            url: attach.url,
            size: attach.size || 0,
            mimeType: attach.mimeType || 'application/octet-stream'
          }));
        
        // Ejecutar la mutación
        const updateResult = await client.request(updateMutation, {
          documentId,
          attachments: formattedAttachments
        });
        
        console.log(`[${logId}] Actualización exitosa de adjuntos en Strapi:`, JSON.stringify(updateResult, null, 2));
      } catch (error) {
        console.error(`[${logId}] Error actualizando adjuntos en Strapi:`, error);
        // Continuamos aunque haya error, devolvemos los adjuntos de todas formas
      }
    }
    
    // Devolver la respuesta con los adjuntos procesados
    return NextResponse.json({
      message: "Adjuntos procesados correctamente",
      attachments: processedAttachments,
      totalProcessed: processedAttachments.length,
      elapsedTime: timeElapsed
    });
  } catch (error) {
    console.error('Error procesando adjuntos:', error);
    return NextResponse.json({ error: 'Error procesando adjuntos', details: error }, { status: 500 });
  }
}

/**
 * Obtiene y procesa los adjuntos de un correo
 */
async function fetchAndProcessAttachments(emailId: string, logId: string) {
  console.log(`[${logId}] Procesando adjuntos para email: ${emailId}`);
  const startTime = Date.now();
  
  try {
    // Configuración del servidor IMAP
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 993;

    // Verificar que tengamos todas las credenciales necesarias
    if (!emailUser || !emailPassword || !emailHost) {
      console.error(`[${logId}] Error: Faltan credenciales IMAP necesarias para procesar adjuntos`);
      throw new Error('Configuración IMAP incompleta');
    }

    // Mostrar información de conexión (sin contraseña)
    console.log(`[${logId}] Conectando a servidor IMAP: ${emailHost}:${emailPort} como ${emailUser}`);
    
    // Configuración para conexión IMAP
    const config = {
      imap: {
        user: emailUser,
        password: emailPassword,
        host: emailHost,
        port: emailPort,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000,
        debug: console.log  // Añadir debug para ver los mensajes IMAP
      }
    };

    // Conectar al servidor IMAP y buscar por Message-ID o asunto
    console.log(`[${logId}] Iniciando conexión IMAP...`);
    const imapConnection = await Imap.connect(config);
    console.log(`[${logId}] Conexión IMAP establecida con éxito`);
    
    // Abrir el buzón INBOX
    console.log(`[${logId}] Abriendo carpeta INBOX...`);
    await imapConnection.openBox('INBOX');
    
    // Buscar todos los mensajes para encontrar coincidencias
    console.log(`[${logId}] Buscando mensajes...`);
    const searchCriteria = ['ALL']; // Buscar todos los mensajes
    const fetchOptions = {
      bodies: [''],
      struct: true
    };

    const messages = await imapConnection.search(searchCriteria, fetchOptions);
    console.log(`[${logId}] Encontrados ${messages.length} mensajes en total`);

    if (messages.length === 0) {
      console.log(`[${logId}] No hay mensajes en el servidor IMAP`);
      await imapConnection.end();
      return [];
    }

    // Intentar encontrar el mensaje que corresponde al emailId
    let targetMessage = null;
    
    for (const message of messages) {
      try {
        const part = message.parts.find((p: any) => p.which === '');
        if (!part) continue;
        
        // Parsear el mensaje para identificarlo
        const parsed = await simpleParser(part.body);
        const messageId = parsed.messageId || '';
        const subject = parsed.subject || '';
        
        // Buscar alguna coincidencia con el emailId que buscamos
        if (messageId.includes(emailId) || subject.includes(emailId)) {
          console.log(`[${logId}] Encontrado mensaje para ID ${emailId}:`, {
            uid: message.attributes.uid,
            subject
          });
          targetMessage = message;
          break;
        }
      } catch (err) {
        console.error(`[${logId}] Error al parsear mensaje:`, err);
      }
    }
    
    if (!targetMessage) {
      console.log(`[${logId}] No se encontró mensaje para ID ${emailId}`);
      await imapConnection.end();
      return [];
    }
    
    // Procesar el mensaje encontrado para extraer adjuntos
    const part = targetMessage.parts.find((p: any) => p.which === '');
    if (!part) {
      console.log(`[${logId}] Mensaje sin contenido`);
      await imapConnection.end();
      return [];
    }
    
    // Parsear el mensaje completo
    const mail = await simpleParser(part.body);
    
    if (!mail.attachments || mail.attachments.length === 0) {
      console.log(`[${logId}] El correo no tiene adjuntos`);
      await imapConnection.end();
      return [];
    }
    
    console.log(`[${logId}] Encontrados ${mail.attachments.length} adjuntos`);
    
    // Procesar cada adjunto
    const processedAttachments = [];
    for (const attachment of mail.attachments) {
      try {
        if (!attachment.content) {
          console.error(`[${logId}] El adjunto no tiene contenido`);
          continue;
        }
        
        // Generar un nombre seguro para el archivo
        const filename = attachment.filename || `adjunto_${Date.now()}`;
        console.log(`[${logId}] Procesando adjunto: ${filename} (${attachment.contentType || 'unknown'})`);
        
        // Subir a UploadThing usando nuestra cola
        console.log(`[${logId}] Añadiendo a cola de UploadThing...`);
        let uploadResult;
        
        try {
          uploadResult = await queueUpload(async () => {
            console.log(`[${logId}] Iniciando subida para: ${filename}`);
            const utapi = new UTApi();
            const file = new UTFile(
              // Asegurarnos de que el contenido esté en formato Buffer
              [Buffer.isBuffer(attachment.content) ? attachment.content : Buffer.from(attachment.content)],
              filename,
              { type: attachment.contentType || 'application/octet-stream' }
            );
            
            console.log(`[${logId}] Subiendo ${filename} (${file.type}) a UploadThing...`);
            const result = await utapi.uploadFiles(file);
            console.log(`[${logId}] Subida completada para ${filename}:`, JSON.stringify(result, null, 2));
            return result;
          });
        } catch (uploadError: any) {
          console.error(`[${logId}] Error subiendo a UploadThing: ${uploadError.message}`);
          // Seguimos con el próximo adjunto en caso de error
          processedAttachments.push({
            id: `att-error-${emailId}-${Date.now()}-${processedAttachments.length}`,
            name: filename,
            url: '', // URL vacía indica error
            size: attachment.size || 0,
            mimeType: attachment.contentType || 'application/octet-stream',
            error: uploadError.message
          });
          continue;
        }
        
        if (!uploadResult.data) {
          console.error(`[${logId}] Error en respuesta de UploadThing:`, uploadResult);
          processedAttachments.push({
            id: `att-error-${emailId}-${Date.now()}-${processedAttachments.length}`,
            name: filename,
            url: '', // URL vacía indica error
            size: attachment.size || 0,
            mimeType: attachment.contentType || 'application/octet-stream',
            error: 'No data in upload result'
          });
          continue;
        }
        
        processedAttachments.push({
          id: `att-${emailId}-${Date.now()}-${processedAttachments.length}`,
          name: filename,
          url: uploadResult.data.url || '',
          size: attachment.size || 0,
          mimeType: attachment.contentType || 'application/octet-stream'
        });
        
        console.log(`[${logId}] Adjunto procesado: ${filename}`);
      } catch (error) {
        console.error(`[${logId}] Error procesando adjunto: ${error}`);
      }
    }
    
    await imapConnection.end();
    console.log(`[${logId}] Procesamiento completado: ${processedAttachments.length} adjuntos`);
    return processedAttachments;
  } catch (error) {
    console.error(`[${logId}] Error obteniendo adjuntos:`, error);
    
    // No usar datos de prueba en ningún caso, devolver array vacío
    return [];
    
    // Si estamos en desarrollo, devolver datos de prueba en caso de error
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('Usando datos de prueba debido a error');
    //   return [
    //     {
    //       id: `error-test-attachment-${Date.now()}`,
    //       name: 'documento-error-prueba.pdf',
    //       url: 'https://example.com/documento-error-prueba.pdf',
    //       size: 54321,
    //       mimeType: 'application/pdf'
    //     }
    //   ];
    // }
    
    // return [];
  }
} 