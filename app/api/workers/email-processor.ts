// Importaciones con require para CommonJS
const { emailQueue, attachmentQueue } = require('../../lib/queue');
const { emailService } = require('../../lib/email');
const { emailCache } = require('../../lib/cache');
// Los tipos pueden mantenerse con la sintaxis de TypeScript
// import { EmailFetchJob, EmailProcessJob, AttachmentProcessJob } from '../../lib/email';

// Definición manual de tipos para evitar la importación ESM
type EmailFetchJob = {
  batchSize: number;
  startDate?: string;
  endDate?: string;
  refresh?: boolean;
  startIndex?: number;
  skipCache?: boolean;
};

type EmailProcessJob = {
  emailId: string;
  messageId: string;
  userId?: string;
  subject?: string;
  // Añadir otras propiedades que puedan ser necesarias
};

type AttachmentProcessJob = {
  attachmentId: string;
  emailId: string;
  messageId: string;
  userId?: string;
  filename?: string;
  // Añadir otras propiedades que puedan ser necesarias
};

/**
 * Worker para procesar trabajos de la cola de emails
 * Este archivo es ejecutado periódicamente por el servidor
 */

async function processEmailQueue() {
  console.log('Iniciando procesamiento de cola de emails...');
  
  // Procesar mensajes pendientes en la cola de emails
  try {
    // Recibir un mensaje de la cola (si hay alguno disponible)
    const message = await emailQueue.receiveMessage();
    
    if (!message) {
      console.log('No hay mensajes pendientes en la cola de emails');
      return;
    }
    
    console.log(`Procesando mensaje: ${message.streamId}`);
    const messageBody = message.body as EmailFetchJob | EmailProcessJob;
    
    // Determinar el tipo de mensaje y procesarlo
    if ('batchSize' in messageBody) {
      // Es un trabajo de tipo EmailFetchJob
      await handleFetchJob(messageBody as EmailFetchJob);
    } else if ('emailId' in messageBody && 'subject' in messageBody) {
      // Es un trabajo de tipo EmailProcessJob
      await handleProcessEmailJob(messageBody as EmailProcessJob);
    } else {
      console.error('Tipo de mensaje desconocido:', messageBody);
    }
    
    // Verificar el mensaje como completado
    await emailQueue.verifyMessage(message.streamId);
    console.log(`Mensaje ${message.streamId} procesado correctamente`);
    
  } catch (error) {
    console.error('Error al procesar cola de emails:', error);
  }
}

async function processAttachmentQueue() {
  console.log('Iniciando procesamiento de cola de adjuntos...');
  
  // Procesar mensajes pendientes en la cola de adjuntos
  try {
    // Recibir un mensaje de la cola (si hay alguno disponible)
    const message = await attachmentQueue.receiveMessage();
    
    if (!message) {
      console.log('No hay mensajes pendientes en la cola de adjuntos');
      return;
    }
    
    console.log(`Procesando adjunto: ${message.streamId}`);
    const messageBody = message.body as AttachmentProcessJob;
    
    // Debe ser un trabajo de tipo AttachmentProcessJob
    if ('emailId' in messageBody && 'filename' in messageBody) {
      await handleProcessAttachmentJob(messageBody);
    } else {
      console.error('Tipo de mensaje de adjunto desconocido:', messageBody);
    }
    
    // Verificar el mensaje como completado
    await attachmentQueue.verifyMessage(message.streamId);
    console.log(`Adjunto ${message.streamId} procesado correctamente`);
    
  } catch (error) {
    console.error('Error al procesar cola de adjuntos:', error);
  }
}

// Funciones auxiliares para procesar diferentes tipos de trabajos

async function handleFetchJob(job: EmailFetchJob) {
  console.log(`Procesando trabajo de obtención de correos, tamaño de lote: ${job.batchSize}`);
  
  // Usar el servicio de email para obtener correos
  const emails = await emailService.fetchEmails({
    batchSize: job.batchSize,
    startIndex: job.startIndex,
    skipCache: job.skipCache || false
  });
  
  console.log(`Se obtuvieron ${emails.length} correos`);
  
  // Procesar cada correo individualmente
  for (const email of emails) {
    // Encolar el procesamiento de cada correo
    await emailService.queueProcessEmail({
      emailId: email.emailId,
      from: email.from,
      to: email.to,
      subject: email.subject,
      receivedDate: email.receivedDate
    });
    
    // Si tiene adjuntos, encolarlos para procesamiento
    if (email.attachments && email.attachments.length > 0) {
      for (const attachment of email.attachments) {
        await emailService.queueProcessAttachment({
          emailId: email.emailId,
          filename: attachment.filename,
          contentType: attachment.contentType
        });
      }
    }
  }
  
  // Actualizar caché
  await emailCache.setEmailList('recent', emails, 1, job.batchSize);
  
  return emails;
}

async function handleProcessEmailJob(job: EmailProcessJob) {
  console.log(`Procesando correo: ${job.emailId} - ${job.subject}`);
  
  // Usar el servicio de email para procesar el correo completo
  const result = await emailService.processEmail(job);
  
  // Actualizar caché con el resultado
  await emailCache.setMetadata(job.emailId, result);
  
  return result;
}

async function handleProcessAttachmentJob(job: AttachmentProcessJob) {
  console.log(`Procesando adjunto: ${job.filename} del correo ${job.emailId}`);
  
  // Usar el servicio de email para procesar el adjunto
  const result = await emailService.processAttachment(job);
  
  return result;
}

// Exportaciones SOLO para CommonJS
module.exports = {
  processEmailQueue,
  processAttachmentQueue
}; 