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

// API para procesar adjuntos de correos y subirlos a UploadThing
export async function POST(request: Request) {
  try {
    // Obtener el ID del correo
    const { emailId } = await request.json();
    
    if (!emailId) {
      return NextResponse.json({ error: 'Se requiere el emailId' }, { status: 400 });
    }
    
    console.log(`Procesando adjuntos para correo con ID: ${emailId}`);
    
    // Procesar los adjuntos
    const processedAttachments = await fetchAndProcessAttachments(emailId);
    
    if (!processedAttachments || processedAttachments.length === 0) {
      return NextResponse.json({ message: 'No se encontraron adjuntos para procesar' });
    }
    
    // Verificar si tenemos token y URL de Strapi
    const strapiToken = process.env.STRAPI_API_TOKEN;
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
    
    // Si tenemos configuración de Strapi, intentamos actualizar el registro
    if (strapiToken && graphqlUrl) {
      console.log('Usando configuración de Strapi para actualizar el registro');
      
      // Buscar el registro en Strapi
      const query = gql`
        query GetEmailTracking($emailId: String!) {
          emailTrackings(filters: { emailId: { eq: $emailId } }) {
            documentId
          }
        }
      `;
      
      console.log(`Consultando Strapi para email: ${emailId}`);
      console.log(`URL de GraphQL: ${graphqlUrl}`);
      
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${strapiToken}`,
        },
        body: JSON.stringify({ query, variables: { emailId } }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error en la respuesta de Strapi:', errorData);
        return NextResponse.json({ error: 'Error al verificar el correo en Strapi', details: errorData }, { status: 400 });
      }
      
      const data = await response.json();
      console.log('Respuesta de Strapi:', JSON.stringify(data, null, 2));
      
      const emailTrackingId = data.data?.emailTrackings?.[0]?.documentId;
      
      // Si existe, actualizar
      if (emailTrackingId) {
        console.log(`Actualizando adjuntos para el documento ID: ${emailTrackingId}`);
        
        const updateMutation = gql`
          mutation UpdateEmailAttachments($documentId: ID!, $attachments: [ComponentEmailAttachmentInput]) {
            updateEmailTracking(documentId: $documentId, data: {
              attachments: $attachments
            }) {
              documentId
            }
          }
        `;
        
        // Asegurar que los adjuntos están en el formato correcto para el componente
        // No incluimos ID para dejar que Strapi los genere y asigne correctamente
        const formattedAttachments = processedAttachments.map(attach => ({
          name: attach.name,
          url: attach.url,
          size: attach.size,
          mimeType: attach.mimeType
        }));
        
        // Consultar primero los adjuntos existentes
        const getAttachmentsQuery = gql`
          query GetExistingAttachments($documentId: ID!) {
            emailTracking(documentId: $documentId) {
              attachments {
                id
                name
                url
                size
                mimeType
              }
            }
          }
        `;
        
        try {
          // Obtener adjuntos existentes
          const getAttachmentsResponse = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${strapiToken}`,
            },
            body: JSON.stringify({
              query: getAttachmentsQuery,
              variables: { documentId: emailTrackingId }
            }),
          });
          
          if (!getAttachmentsResponse.ok) {
            throw new Error(`Error al obtener adjuntos existentes: ${await getAttachmentsResponse.text()}`);
          }
          
          const getAttachmentsData = await getAttachmentsResponse.json();
          
          // Si hay errores, continuar con la actualización normal
          if (getAttachmentsData.errors) {
            console.warn('Error consultando adjuntos existentes:', JSON.stringify(getAttachmentsData.errors, null, 2));
          }
          
          // Ejecutar la mutación para actualizar adjuntos
          const updateResponse = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${strapiToken}`,
            },
            body: JSON.stringify({
              query: updateMutation,
              variables: { documentId: emailTrackingId, attachments: formattedAttachments }
            }),
          });
          
          if (!updateResponse.ok) {
            const errorData = await updateResponse.text();
            console.error('Error actualizando adjuntos en Strapi:', errorData);
            return NextResponse.json({ error: 'Error al actualizar adjuntos en Strapi', details: errorData }, { status: 400 });
          }
          
          const updateData = await updateResponse.json();
          console.log('Respuesta de actualización:', JSON.stringify(updateData, null, 2));
          
          return NextResponse.json({ 
            message: 'Adjuntos procesados y actualizados en Strapi',
            attachments: formattedAttachments
          });
        } catch (error) {
          console.error('Error durante la actualización de adjuntos:', error);
          return NextResponse.json({ error: 'Error durante la actualización de adjuntos', details: error }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          message: 'No se encontró el registro de correo en Strapi',
          emailId,
          attachments: processedAttachments
        });
      }
    } else {
      // En modo desarrollo, simplemente devolver los adjuntos procesados
      console.log('No se encontró configuración de Strapi, devolviendo adjuntos procesados (modo dev)');
      return NextResponse.json({ 
        message: 'Adjuntos procesados correctamente (modo dev)',
        attachments: processedAttachments
      });
    }
  } catch (error) {
    console.error('Error procesando adjuntos:', error);
    return NextResponse.json({ error: 'Error procesando adjuntos', details: error }, { status: 500 });
  }
}

/**
 * Obtiene y procesa los adjuntos de un correo
 */
async function fetchAndProcessAttachments(emailId: string) {
  console.log(`Procesando adjuntos para email: ${emailId}`);
  
  try {
    // Verificar si tenemos configuración de IMAP
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    
    // Si es un entorno de prueba o no hay configuración de IMAP, devolver datos de prueba
    if (process.env.NODE_ENV === 'development' && (!emailUser || !emailPassword || !emailHost || !emailPort)) {
      console.log('Usando datos de prueba para adjuntos');
      return [
        {
          id: `test-attachment-${Date.now()}`,
          name: 'documento-prueba.pdf',
          url: 'https://example.com/documento-prueba.pdf',
          size: 12345,
          mimeType: 'application/pdf'
        }
      ];
    }
    
    // Configuración del servidor IMAP
    const imapConfig = {
      imap: {
        user: emailUser || '',
        password: emailPassword || '',
        host: emailHost || '',
        port: parseInt(emailPort || '993', 10),
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };
    
    // Conectar al servidor IMAP
    console.log('Conectando al servidor IMAP...');
    const connection = await Imap.connect(imapConfig);
    await connection.openBox('INBOX');
    
    // Buscar correo por ID
    const searchCriteria = [['HEADER', 'Message-ID', emailId]];
    const fetchOptions = {
      bodies: [''],
      struct: true
    };
    
    const messages = await connection.search(searchCriteria, fetchOptions);
    
    if (!messages || messages.length === 0) {
      console.log(`No se encontró el correo con ID ${emailId} en el servidor IMAP`);
      connection.end();
      return [];
    }
    
    console.log(`Se encontraron ${messages.length} mensajes con el ID ${emailId}`);
    const processedAttachments = [];
    
    // Procesar cada mensaje encontrado
    for (const message of messages) {
      if (!message.parts || message.parts.length === 0) continue;
      
      const part = message.parts.find((p: any) => p.which === '');
      if (!part) continue;
      
      console.log('Parseando correo...');
      const mail = await simpleParser(part.body);
      
      if (!mail.attachments || mail.attachments.length === 0) {
        console.log('El correo no tiene adjuntos');
        continue;
      }
      
      console.log(`Encontrados ${mail.attachments.length} adjuntos`);
      
      // Procesar cada adjunto
      for (const attachment of mail.attachments) {
        try {
          if (!attachment.content) {
            console.log('Adjunto sin contenido, omitiendo');
            continue;
          }
          
          // Generar un nombre seguro para el archivo
          const filename = attachment.filename || `adjunto_${Date.now()}`;
          console.log(`Procesando adjunto: ${filename}`);
          
          // Subir a UploadThing
          const utapi = new UTApi();
          const file = new UTFile(
            [Buffer.from(attachment.content)],
            filename,
            { type: attachment.contentType || 'application/octet-stream' }
          );
          
          console.log('Subiendo a UploadThing...');
          const uploadResult = await utapi.uploadFiles(file);
          console.log('Resultado subida:', JSON.stringify(uploadResult, null, 2));
          
          if (!uploadResult.data) {
            console.error('Error en respuesta de UploadThing:', uploadResult);
            continue;
          }
          
          processedAttachments.push({
            id: `att-${emailId}-${Date.now()}-${processedAttachments.length}`,
            name: filename,
            url: uploadResult.data.url || '',
            size: attachment.size || 0,
            mimeType: attachment.contentType || 'application/octet-stream'
          });
          
          console.log(`Adjunto procesado: ${filename}`);
        } catch (error) {
          console.error(`Error procesando adjunto: ${error}`);
        }
      }
    }
    
    connection.end();
    console.log(`Procesamiento completado: ${processedAttachments.length} adjuntos`);
    return processedAttachments;
  } catch (error) {
    console.error('Error obteniendo adjuntos:', error);
    
    // Si estamos en desarrollo, devolver datos de prueba en caso de error
    if (process.env.NODE_ENV === 'development') {
      console.log('Usando datos de prueba debido a error');
      return [
        {
          id: `error-test-attachment-${Date.now()}`,
          name: 'documento-error-prueba.pdf',
          url: 'https://example.com/documento-error-prueba.pdf',
          size: 54321,
          mimeType: 'application/pdf'
        }
      ];
    }
    
    return [];
  }
} 