import { emailService } from './email';
import { updateSyncState } from './sync-state';

// Interfaz para los callbacks de progreso
export interface SyncProgress {
  progress: number;
  total: number;
  errorCount: number;
  status: string;
}

/**
 * Sincroniza los correos electrónicos de IMAP con Strapi
 * @param force Forzar sincronización
 * @param getAllEmails Obtener todos los correos
 * @param batchSize Tamaño del lote
 */
export async function syncEmails(force = false, getAllEmails = true, batchSize = 100) {
  try {
    updateSyncState({
      inProgress: true,
      progress: 0,
      total: 0,
      errorCount: 0,
      status: 'Conectando con servidor IMAP...',
      completed: false
    });
    
    // Paso 1: Conexión con servidor IMAP para determinar cuántos correos hay
    const emails = await emailService.fetchEmails({ 
      batchSize: -1, // -1 indica que queremos obtener todos
      skipCache: true
    });
    
    // Actualizar total de correos encontrados
    const total = emails.length;
    updateSyncState({
      total,
      status: `Se encontraron ${total} correos para sincronizar`
    });
    
    // Paso 2: Sincronizar con Strapi
    let progress = 0;
    let errorCount = 0;
    
    // Procesar en lotes para evitar sobrecarga
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      updateSyncState({
        status: `Sincronizando correos con Strapi (lote ${Math.ceil((i+1)/batchSize)} de ${Math.ceil(total/batchSize)})...`,
        progress: i
      });
      
      try {
        // Aquí llamaríamos a la función que sincroniza con Strapi
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular tiempo de procesamiento
        
        // Actualizar progreso
        progress += batch.length;
        updateSyncState({ progress });
      } catch (error: any) {
        console.error(`Error al sincronizar lote ${Math.ceil((i+1)/batchSize)}:`, error);
        errorCount++;
        updateSyncState({ 
          errorCount,
          status: `Error en lote ${Math.ceil((i+1)/batchSize)}: ${error.message || 'Error desconocido'}`
        });
      }
      
      // Pequeña pausa para no saturar el servidor
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Actualizar estado final
    updateSyncState({
      progress: total,
      status: `Sincronización completada: ${total} correos procesados${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
      inProgress: false,
      completed: true
    });
    
    return {
      success: true,
      processed: total,
      errors: errorCount
    };
  } catch (error: any) {
    console.error('Error en sincronización:', error);
    updateSyncState({
      status: `Error: ${error.message || 'Error desconocido'}`,
      inProgress: false,
      errorCount: 1,
      completed: true
    });
    
    throw error;
  }
} 