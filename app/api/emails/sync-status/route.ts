import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';

export async function GET() {
  try {
    // Obtener el estado actual de la sincronización
    const inProgress = await emailCache.get('sync_in_progress');
    const lastLog = await emailCache.get('last_sync_log') || 'Esperando inicio de sincronización...';
    const total = parseInt((await emailCache.get('emails_count') as string) || '0', 10);
    const progress = parseInt((await emailCache.get('emails_processed') as string) || '0', 10);
    const attachmentLogs = await emailCache.get('attachment_logs') || [];

    // MEJORA: Detectar mensajes explícitos de finalización
    const syncEndedMessages = [
      'Sincronización completada', 
      'Sincronización de correos completada',
      'Ambos sistemas tienen',
      'No hay correos nuevos para sincronizar'
    ];
    
    const completionMessageDetected = syncEndedMessages.some(msg => 
      lastLog && lastLog.includes(msg)
    );

    // MEJORA: Mensaje de actividad en progreso
    const logIndicatesProgress = 
      lastLog.includes('Procesando') || 
      lastLog.includes('Sincronizando') || 
      lastLog.includes('Iniciando') ||
      lastLog.includes('Buscando') ||
      lastLog.includes('Recuperando');
    
    // Determinar el estado real de sincronización
    const syncInProgress = 
      inProgress === 'true' || 
      logIndicatesProgress || 
      (total > 0 && progress < total);
    
    // MEJORA: Si la sincronización está completada, NUNCA volver a 0%
    // Siempre mantener el último progreso/total para que no parezca que se reinicia
    let syncState = {
      inProgress: syncInProgress,
      completed: (completionMessageDetected || !syncInProgress) && progress > 0,
      status: '',
      lastLog,
      total: total || 0,
      progress: progress || 0,
      attachmentLogs,
      errorCount: 0
    };
    
    // MEJORA: Determinar estado y mensaje según la situación
    if (completionMessageDetected && !syncInProgress) {
      // Sincronización terminada 
      syncState.completed = true;
      syncState.inProgress = false;
      syncState.status = 'Sincronización completada';
      
      // CRUCIAL: Mantener el progreso y total para que no vuelva a 0%
      if (progress === 0 && total === 0 && lastLog.includes('Ambos sistemas tienen')) {
        // Extraer el número de correos del mensaje
        const match = lastLog.match(/Ambos sistemas tienen (\d+) correos/);
        if (match && match[1]) {
          const count = parseInt(match[1], 10);
          if (count > 0) {
            syncState.total = count;
            syncState.progress = count;
          }
        }
      }
    } else if (syncInProgress) {
      // Sincronización en progreso
      syncState.completed = false;
      syncState.inProgress = true;
      
      // Mensaje basado en el progreso actual
      if (progress === 0 && total === 0) {
        syncState.status = 'Iniciando sincronización...';
      } else if (progress === 0 && total > 0) {
        syncState.status = `Preparando sincronización de ${total} correos...`;
      } else if (progress > 0 && progress < total) {
        syncState.status = `Sincronizando correos... (${progress}/${total})`;
      } else if (progress > 0 && progress >= total) {
        syncState.status = 'Finalizando sincronización...';
      } else {
        syncState.status = 'Sincronizando correos...';
      }
    } else {
      // No está en progreso ni completado (estado indeterminado)
      syncState.status = 'Sincronización en espera...';
    }
    
    return NextResponse.json(syncState);
  } catch (error) {
    console.error('Error al obtener estado de sincronización:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de sincronización' },
      { status: 500 }
    );
  }
} 