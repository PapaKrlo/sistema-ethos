import { simpleParser } from 'mailparser';
import Imap from 'imap-simple';
import { UTApi, UTFile } from 'uploadthing/server';
import { getGqlClient } from '../lib/gql-client';
import { gql } from 'graphql-request';

// Inicializar UploadThing API
const utapi = new UTApi();

// Interfaz para tipar las respuestas de GraphQL
interface EmailTrackingResponse {
  emailTrackings?: Array<{
    documentId: string;
    emailId: string;
    emailStatus: string;
    from: string;
    subject: string;
    attachments?: Array<{
      id: string;
      name: string;
      url: string;
      size: number;
      mimeType: string;
    }>;
  }>;
}

export class EmailService {
  private graphqlUrl: string;
  private strapiToken: string;
  private emailConfig: any;
  
  constructor() {
    this.graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
    this.strapiToken = process.env.STRAPI_API_TOKEN || '';
    
    // Configuración del servidor IMAP
    this.emailConfig = {
      imap: {
        user: process.env.EMAIL_USER || 'administraciona3@almax.ec',
        password: process.env.EMAIL_PASSWORD || '',
        host: process.env.EMAIL_HOST || 'pop.telconet.cloud',
        port: parseInt(process.env.EMAIL_PORT || '993', 10),
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };
    
    console.log('EmailService inicializado con config:', {
      graphqlUrl: this.graphqlUrl ? 'configurado' : 'no configurado',
      strapiToken: this.strapiToken ? 'configurado' : 'no configurado',
      emailUser: process.env.EMAIL_USER ? 'configurado' : 'no configurado',
      emailHost: process.env.EMAIL_HOST ? 'configurado' : 'no configurado'
    });
  }
  
  /**
   * Obtiene un correo por su ID
   */
  async getEmailById(emailId: string) {
    try {
      console.log('Buscando email por ID:', emailId);
      const client = getGqlClient();
      const query = gql`
        query GetEmailById($emailId: String!) {
          emailTrackings(filters: { emailId: { eq: $emailId } }) {
            documentId
            emailId
            emailStatus
            from
            subject
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
      
      console.log('Enviando consulta a Strapi, URL:', this.graphqlUrl);
      console.log('Variables de consulta:', { emailId });
      
      const response = await client.request<EmailTrackingResponse>(query, { emailId });
      console.log('Respuesta de Strapi:', JSON.stringify(response, null, 2));
      
      return response.emailTrackings?.[0] || null;
    } catch (error: any) {
      console.error('Error detallado al obtener correo de Strapi:', error.message);
      if (error.response?.errors) {
        console.error('Errores GraphQL:', JSON.stringify(error.response.errors, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Procesa los adjuntos de un correo específico
   */
  async processAttachments(emailId: string) {
    try {
      // Verificar si el correo existe en Strapi
      const email = await this.getEmailById(emailId);
      
      if (!email) {
        throw new Error('No se encontró el correo en Strapi');
      }
      
      // Obtener adjuntos del correo de IMAP
      const processedAttachments = await this.fetchAndProcessAttachments(emailId);
      
      // Actualizar registro en Strapi con los adjuntos procesados
      if (processedAttachments.length > 0) {
        const client = getGqlClient();
        
        const updateMutation = gql`
          mutation UpdateEmailAttachments($documentId: ID!, $attachments: [ComponentEmailAttachmentInput]) {
            updateEmailTracking(documentId: $documentId, data: {
              attachments: $attachments
            }) {
              documentId
            }
          }
        `;
        
        await client.request(updateMutation, {
          documentId: email.documentId,
          attachments: processedAttachments
        });
      }
      
      return processedAttachments;
    } catch (error) {
      console.error('Error procesando adjuntos:', error);
      throw error;
    }
  }
  
  /**
   * Procesa los adjuntos pendientes de todos los correos
   */
  async processPendingAttachments() {
    try {
      // Obtener correos sin adjuntos procesados
      const client = getGqlClient();
      
      const query = gql`
        query GetEmailsWithoutAttachments {
          emailTrackings(
            filters: { 
              attachments: { null: true },
              createdAt: { gt: "${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}" }
            },
            pagination: { limit: 20 }
          ) {
            documentId
            emailId
          }
        }
      `;
      
      const response = await client.request<EmailTrackingResponse>(query);
      const emails = response.emailTrackings || [];
      
      console.log(`Se encontraron ${emails.length} correos sin adjuntos procesados`);
      
      const results = {
        processed: 0,
        errors: 0
      };
      
      // Procesar cada correo
      for (const email of emails) {
        try {
          const emailId = email.emailId;
          console.log(`Procesando adjuntos para correo: ${emailId}`);
          
          const attachments = await this.fetchAndProcessAttachments(emailId);
          
          if (attachments.length > 0) {
            // Actualizar en Strapi
            const updateMutation = gql`
              mutation UpdateEmailAttachments($documentId: ID!, $attachments: [ComponentEmailAttachmentInput]) {
                updateEmailTracking(documentId: $documentId, data: {
                  attachments: $attachments
                }) {
                  documentId
                }
              }
            `;
            
            await client.request(updateMutation, {
              documentId: email.documentId,
              attachments: attachments
            });
            
            console.log(`Adjuntos actualizados para correo: ${emailId}`);
            results.processed++;
          } else {
            console.log(`No se encontraron adjuntos para correo: ${emailId}`);
          }
        } catch (error) {
          console.error(`Error procesando adjuntos para correo ${email.documentId}:`, error);
          results.errors++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error procesando adjuntos pendientes:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene y procesa los adjuntos de un correo desde IMAP
   */
  private async fetchAndProcessAttachments(emailId: string) {
    try {
      // Obtener la información del correo desde el servidor IMAP
      const connection = await Imap.connect(this.emailConfig);
      await connection.openBox('INBOX');
      
      const searchCriteria = [['HEADER', 'Message-ID', emailId]];
      const fetchOptions = {
        bodies: [''],
        struct: true
      };
      
      const messages = await connection.search(searchCriteria, fetchOptions);
      
      if (!messages || messages.length === 0) {
        console.log(`No se encontró el correo con ID ${emailId}`);
        connection.end();
        return [];
      }
      
      const processedAttachments = [];
      
      for (const message of messages) {
        if (!message.parts || message.parts.length === 0) continue;
        
        const part = message.parts.find((p: { which: string }) => p.which === '');
        if (!part) continue;
        
        const mail = await simpleParser(part.body);
        
        if (!mail.attachments || mail.attachments.length === 0) {
          console.log('El correo no tiene adjuntos');
          continue;
        }
        
        for (const attachment of mail.attachments) {
          try {
            if (!attachment.content) {
              console.log('Adjunto sin contenido, omitiendo');
              continue;
            }
            
            // Generar un nombre seguro para el archivo
            const filename = attachment.filename || `adjunto_${Date.now()}`;
            
            // Subir a UploadThing con la corrección del UTFile
            console.log(`Subiendo adjunto: ${filename}`);
            const uploadResult = await utapi.uploadFiles(
              new UTFile(
                [Buffer.from(attachment.content)], // Primer argumento: array con el buffer
                filename,                          // Segundo argumento: nombre del archivo  
                {                                  // Tercer argumento: opciones
                  type: attachment.contentType || 'application/octet-stream'
                }
              )
            );
            
            console.log('Resultado de uploadFiles:', JSON.stringify(uploadResult, null, 2));
            
            processedAttachments.push({
              id: `att-${emailId}-${attachment.filename || 'unnamed'}-${Math.floor(Math.random() * 10000)}`,
              name: filename,
              url: uploadResult.data?.url || '',
              size: attachment.size || 0,
              mimeType: attachment.contentType || 'application/octet-stream'
            });
          } catch (error) {
            console.error('Error procesando adjunto:', error);
          }
        }
      }
      
      connection.end();
      return processedAttachments;
    } catch (error) {
      console.error('Error obteniendo adjuntos:', error);
      return [];
    }
  }
} 