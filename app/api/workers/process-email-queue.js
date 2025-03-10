// Este script se ejecuta con el CLI de Next.js para tener acceso a todos los módulos
import { emailQueue } from '../../lib/queue';
import { emailService } from '../../lib/email';
import { emailCache } from '../../lib/cache';

/**
 * Procesa un mensaje de la cola de emails
 */
async function processQueue() {
  console.log('Iniciando procesamiento de cola de emails...');
  
  try {
    // Recibir un mensaje de la cola (si hay alguno disponible)
    const message = await emailQueue.receiveMessage();
    
    if (!message) {
      console.log('No hay mensajes pendientes en la cola de emails');
      return;
    }
    
    console.log(`Procesando mensaje: ${message.streamId}`);
    const messageBody = message.body;
    
    // Determinar el tipo de mensaje y procesarlo
    if (messageBody && 'batchSize' in messageBody) {
      // Es un trabajo de tipo EmailFetchJob
      await handleFetchJob(messageBody);
    } else if (messageBody && 'emailId' in messageBody && 'messageId' in messageBody) {
      // Es un trabajo de tipo EmailProcessJob
      await handleProcessEmailJob(messageBody);
    } else {
      console.error('Tipo de mensaje desconocido:', messageBody);
      // Rechazar el mensaje para que vuelva a la cola
      await emailQueue.rejectMessage(message);
      return;
    }
    
    // Confirmar el mensaje para eliminarlo de la cola
    await emailQueue.confirmMessage(message);
    console.log(`Mensaje ${message.streamId} procesado correctamente`);
    
  } catch (error) {
    console.error('Error al procesar cola de emails:', error);
  }
}

/**
 * Maneja un trabajo de obtención de emails
 */
async function handleFetchJob(job) {
  console.log(`Procesando trabajo de obtención de emails: batchSize=${job.batchSize}`);
  
  try {
    // Obtener emails desde el servidor
    const startIndex = job.startIndex || 0;
    const skipCache = job.skipCache || false;
    
    const { emails, hasMore } = await emailService.fetchEmails({
      startDate: job.startDate,
      endDate: job.endDate,
      batchSize: job.batchSize,
      startIndex,
      skipCache,
      refresh: job.refresh
    });
    
    console.log(`Obtenidos ${emails.length} emails. hasMore=${hasMore}`);
    
    // Procesar cada email
    for (const email of emails) {
      await emailService.queueProcessEmail(email);
    }
    
    // Si hay más emails, encolar otro trabajo para obtener el siguiente lote
    if (hasMore) {
      await emailService.queueFetchEmails({
        batchSize: job.batchSize,
        startDate: job.startDate,
        endDate: job.endDate,
        startIndex: startIndex + emails.length,
        refresh: job.refresh
      });
    }
    
    return { success: true, emailsProcessed: emails.length, hasMore };
    
  } catch (error) {
    console.error('Error en handleFetchJob:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Maneja un trabajo de procesamiento de un email individual
 */
async function handleProcessEmailJob(job) {
  console.log(`Procesando email: ${job.emailId} (${job.subject || 'Sin asunto'})`);
  
  try {
    // Procesar un email individual
    const result = await emailService.processEmail(job.emailId, job.messageId, job.userId);
    return result;
    
  } catch (error) {
    console.error(`Error al procesar email ${job.emailId}:`, error);
    return { success: false, error: String(error) };
  }
}

// Ejecutar la función principal
processQueue()
  .then(() => {
    console.log('Procesamiento de cola de emails completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal en processQueue:', error);
    process.exit(1);
  }); 