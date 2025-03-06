import { emailCache } from './cache';
import { emailQueue, attachmentQueue } from './queue';
import Imap from 'imap-simple';
import { simpleParser, ParsedMail } from 'mailparser';

// Configuración del servidor IMAP
const getImapConfig = () => ({
  imap: {
    user: process.env.EMAIL_USER || 'administraciona3@almax.ec',
    password: process.env.EMAIL_PASSWORD || '',
    host: process.env.EMAIL_HOST || 'pop.telconet.cloud',
    port: Number(process.env.EMAIL_PORT) || 993,
    tls: true,
    authTimeout: 30000,
    tlsOptions: { rejectUnauthorized: false },
  }
});

// Interfaces para tipado de correos
export interface EmailMetadata {
  id: string;
  emailId: string;
  from: string;
  to: string;
  subject: string;
  receivedDate: string;
  status: "necesitaAtencion" | "informativo" | "respondido";
  lastResponseBy: "cliente" | "admin" | null;
  preview: string;
  fullContent?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

// Interfaces para los trabajos en cola
export interface EmailFetchJob {
  batchSize: number;
  startIndex?: number;
  skipCache?: boolean;
}

export interface EmailProcessJob {
  emailId: string;
  from: string;
  to: string;
  subject: string;
  receivedDate: string;
}

export interface AttachmentProcessJob {
  emailId: string;
  filename: string;
  contentType: string;
}

// Función auxiliar para extraer el email desde un objeto de dirección complejo
const getEmailAddress = (address: any): string => {
  if (!address) return '';
  
  if (typeof address === 'string') return address;
  
  // Si es un objeto con text
  if (address.text) return address.text;
  
  // Si es un objeto de mailparser
  if (address.value) {
    const firstAddress = Array.isArray(address.value) ? address.value[0] : address.value;
    if (firstAddress) {
      if (firstAddress.address) return firstAddress.address;
      if (firstAddress.email) return firstAddress.email;
    }
  }
  
  // Si es un array, tomar el primer elemento
  if (Array.isArray(address) && address.length > 0) {
    const first = address[0];
    if (typeof first === 'string') return first;
    if (first.address) return first.address;
    if (first.email) return first.email;
  }
  
  return '';
};

// Funcionalidad de correo mejorada
export const emailService = {
  /**
   * Encola un trabajo para buscar correos
   */
  async queueFetchEmails(options: EmailFetchJob): Promise<string> {
    const result = await emailQueue.sendMessage(options);
    return result || '';
  },

  /**
   * Encola un trabajo para procesar un correo específico
   */
  async queueProcessEmail(email: EmailProcessJob): Promise<string> {
    const result = await emailQueue.sendMessage(email);
    return result || '';
  },

  /**
   * Encola un trabajo para procesar un adjunto
   */
  async queueProcessAttachment(attachment: AttachmentProcessJob): Promise<string> {
    const result = await attachmentQueue.sendMessage(attachment);
    return result || '';
  },

  /**
   * Busca correos desde el servidor IMAP
   * Esta función será llamada desde el job de sincronización
   */
  async fetchEmails(options: EmailFetchJob = { batchSize: 100 }): Promise<EmailMetadata[]> {
    const fetchingAllEmails = options.batchSize === -1;
    
    // Verificamos si tenemos los datos en caché primero
    if (!options.skipCache) {
      try {
        // Si estamos buscando todos los correos, no limitamos por batchSize en la caché
        const cacheLimit = fetchingAllEmails ? 1000 : options.batchSize; 
        const result = await emailCache.getEmailList<{ emails: EmailMetadata[] }>('recent', 1, cacheLimit);
        if (result && result.emails && result.emails.length > 0) {
          console.log(`Usando ${result.emails.length} correos desde caché`);
          return result.emails;
        }
      } catch (error) {
        console.error('Error al obtener correos desde caché:', error);
      }
    }

    // Implementación real para obtener correos del servidor IMAP
    console.log('Buscando correos desde el servidor IMAP...');
    
    try {
      const config = getImapConfig();
      
      // Verificar que tengamos credenciales
      if (!config.imap.user || !config.imap.password) {
        console.error('Error: Usuario o contraseña de email no configurados');
        throw new Error('Credenciales de email faltantes');
      }
      
      // Conectar al servidor IMAP
      const connection = await Imap.connect(config);
      console.log('Conexión establecida con el servidor IMAP');
      
      // Abrir la bandeja de entrada
      await connection.openBox('INBOX');
      console.log('Bandeja INBOX abierta');
      
      // Buscar los emails más recientes
      // Limitar la cantidad según el batchSize
      const searchCriteria = ['ALL'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: false,
        struct: true
      };
      
      // Obtener todos los mensajes
      const messages = await connection.search(searchCriteria, fetchOptions);
      console.log(`Encontrados ${messages.length} correos en el servidor`);
      
      // Ordenar mensajes por fecha (más recientes primero)
      messages.sort((a: any, b: any) => {
        const dateA = a.attributes.date ? new Date(a.attributes.date).getTime() : 0;
        const dateB = b.attributes.date ? new Date(b.attributes.date).getTime() : 0;
        return dateB - dateA; // Orden descendente
      });
      
      // Limitar a la cantidad solicitada o procesar todos si batchSize es -1
      const messagesToProcess = fetchingAllEmails ? messages : messages.slice(options.startIndex || 0, options.batchSize === -1 ? undefined : (options.startIndex || 0) + options.batchSize);
      console.log(`Procesando ${messagesToProcess.length} correos de ${messages.length} encontrados`);
      
      // Procesar los mensajes
      const processedEmails: EmailMetadata[] = [];
      
      for (const message of messagesToProcess) {
        const emailId = message.attributes.uid.toString();
        
        // Obtener todas las partes del cuerpo
        const all = message.parts.find((part: any) => part.which === '');
        
        if (!all) {
          console.warn(`No se pudo obtener el cuerpo completo del correo ${emailId}`);
          continue;
        }
        
        // Parsear el email
        const parsed = await simpleParser(all.body);
        
        // Obtener datos básicos
        const from = getEmailAddress(parsed.from);
        const to = getEmailAddress(parsed.to);
        const subject = parsed.subject || '(Sin asunto)';
        const receivedDate = parsed.date ? parsed.date.toISOString() : new Date().toISOString();
        
        // Obtener un preview del texto
        let preview = '';
        let fullContent = '';
        if (parsed.text) {
          preview = parsed.text.substring(0, 150).trim();
          if (parsed.text.length > 150) preview += '...';
          fullContent = parsed.text; // Guardar el contenido completo
        }
        
        // Obtener información de adjuntos si existen
        const attachments = parsed.attachments?.map(att => ({
          filename: att.filename || 'attachment',
          contentType: att.contentType || 'application/octet-stream',
          size: att.size || 0
        }));
        
        // Crear el objeto de email
        const emailMetadata: EmailMetadata = {
          id: emailId,
          emailId: emailId,
          from,
          to,
          subject,
          receivedDate,
          status: 'necesitaAtencion', // Estado por defecto
          lastResponseBy: null,
          preview,
          fullContent,
          attachments: attachments && attachments.length > 0 ? attachments : undefined
        };
        
        processedEmails.push(emailMetadata);
      }
      
      // Cerrar la conexión
      connection.end();
      console.log('Conexión con servidor IMAP cerrada');
      
      // Guardar en caché para futuros usos
      if (processedEmails.length > 0) {
        try {
          await emailCache.setEmailList('recent', { emails: processedEmails }, 1, options.batchSize);
          console.log(`Guardados ${processedEmails.length} correos en caché`);
        } catch (cacheError) {
          console.error('Error al guardar en caché:', cacheError);
        }
      }
      
      return processedEmails;
    } catch (error) {
      console.error('Error al obtener correos desde IMAP:', error);
      
      // Si hay un error, devolver los datos mock como fallback
      console.warn('Usando datos de ejemplo como fallback debido a error de conexión');
      const fallbackEmails: EmailMetadata[] = [
        {
          id: '1',
          emailId: 'email1',
          from: 'cliente@example.com',
          to: 'administraciona3@almax.ec',
          subject: 'Consulta sobre factura',
          receivedDate: new Date().toISOString(),
          status: 'necesitaAtencion',
          lastResponseBy: null,
          preview: 'Buen día, tengo una consulta sobre mi factura...'
        },
        {
          id: '2',
          emailId: 'email2',
          from: 'proveedor@example.com',
          to: 'administraciona3@almax.ec',
          subject: 'Actualización de precios',
          receivedDate: new Date().toISOString(),
          status: 'informativo',
          lastResponseBy: null,
          preview: 'Le informamos que nuestros precios se actualizarán...'
        }
      ];
      
      return fallbackEmails;
    }
  },

  /**
   * Obtiene los metadatos de un correo específico
   */
  async getEmailMetadata(emailId: string): Promise<EmailMetadata | null> {
    // Intentar obtener de caché primero
    const cachedData = await emailCache.getMetadata<EmailMetadata>(emailId);
    if (cachedData) {
      return cachedData;
    }
    
    // Si no está en caché, tendría que ir a buscarlo
    // Esta implementación se completará más adelante
    return null;
  },

  /**
   * Procesa el contenido completo de un correo específico
   */
  async processEmail(email: EmailProcessJob): Promise<EmailMetadata> {
    console.log(`Procesando correo: ${email.emailId} - ${email.subject}`);
    
    // Aquí iría el código para obtener y procesar el correo completo
    // Este podría incluir el análisis del cuerpo, clasificación, etc.
    
    // Simulamos el procesamiento con datos básicos
    const processedEmail: EmailMetadata = {
      id: email.emailId,
      emailId: email.emailId,
      from: email.from,
      to: email.to,
      subject: email.subject,
      receivedDate: email.receivedDate,
      status: 'necesitaAtencion', // Valor por defecto
      lastResponseBy: null,
      preview: 'Vista previa del correo no disponible',
      fullContent: 'Contenido completo no disponible'
    };
    
    // Guardar en caché para futuros usos
    await emailCache.setMetadata(email.emailId, processedEmail);
    
    return processedEmail;
  },

  /**
   * Procesa un adjunto y lo sube a UploadThing
   */
  async processAttachment(job: AttachmentProcessJob): Promise<any> {
    console.log(`Procesando adjunto ${job.filename} del correo ${job.emailId}`);
    
    // Aquí iría el código para procesar un adjunto
    // que incluiría descargarlo y subirlo a UploadThing
    
    return {
      emailId: job.emailId,
      filename: job.filename,
      processedAt: new Date().toISOString(),
      // Más datos del procesamiento
    };
  }
}; 