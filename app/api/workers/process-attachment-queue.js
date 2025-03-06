// Este script se ejecuta con el CLI de Next.js para tener acceso a todos los módulos
import { attachmentQueue } from '../../lib/queue';
import { emailService } from '../../lib/email';

/**
 * Procesa un mensaje de la cola de adjuntos
 */
async function processQueue() {
  console.log('Iniciando procesamiento de cola de adjuntos...');
  
  try {
    // Recibir un mensaje de la cola (si hay alguno disponible)
    const message = await attachmentQueue.receiveMessage();
    
    if (!message) {
      console.log('No hay mensajes pendientes en la cola de adjuntos');
      return;
    }
    
    console.log(`Procesando adjunto: ${message.streamId}`);
    const messageBody = message.body;
    
    // Verificar que sea un trabajo de adjunto válido
    if (!messageBody || !messageBody.attachmentId || !messageBody.emailId) {
      console.error('Mensaje de adjunto inválido:', messageBody);
      // Rechazar el mensaje para que vuelva a la cola
      await attachmentQueue.rejectMessage(message);
      return;
    }
    
    // Procesar el adjunto
    const result = await handleProcessAttachmentJob(messageBody);
    
    // Confirmar el mensaje para eliminarlo de la cola
    await attachmentQueue.confirmMessage(message);
    console.log(`Adjunto ${messageBody.attachmentId} procesado correctamente:`, result);
    
  } catch (error) {
    console.error('Error al procesar cola de adjuntos:', error);
  }
}

/**
 * Maneja un trabajo de procesamiento de adjunto
 */
async function handleProcessAttachmentJob(job) {
  console.log(`Procesando adjunto: ${job.attachmentId} de email ${job.emailId} (${job.filename || 'Sin nombre'})`);
  
  try {
    // Procesar un adjunto individual
    const result = await emailService.processAttachment(job.attachmentId, job.emailId, job.messageId, job.userId);
    return result;
    
  } catch (error) {
    console.error(`Error al procesar adjunto ${job.attachmentId}:`, error);
    return { success: false, error: String(error) };
  }
}

// Ejecutar la función principal
processQueue()
  .then(() => {
    console.log('Procesamiento de cola de adjuntos completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal en processQueue:', error);
    process.exit(1);
  }); 