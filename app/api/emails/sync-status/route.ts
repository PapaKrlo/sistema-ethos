import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';

export async function GET() {
  try {
    // Obtener el estado actual de la sincronización
    const inProgress = await emailCache.get('sync_in_progress');
    const lastLog = await emailCache.get('last_sync_log') || 'Esperando inicio de sincronización...';
    const total = parseInt((await emailCache.get('emails_count') as string) || '0', 10);
    const progress = parseInt((await emailCache.get('emails_processed') as string) || '0', 10);

    // Detectar mensajes explícitos de finalización
    const syncEndedMessages = [
      'Sincronización completada', 
      'No se encontraron correos nuevos',
      'completados'
    ];
    
    const completionMessageDetected = syncEndedMessages.some(msg => 
      lastLog && lastLog.includes(msg)
    );

    // Determinar si hay actividad en progreso
    const logIndicatesProgress = 
      lastLog.includes('Procesando') || 
      lastLog.includes('Sincronizando') || 
      lastLog.includes('Iniciando') ||
      lastLog.includes('Buscando');
    
    // Determinar el estado real de sincronización
    const syncInProgress = 
      inProgress === 'true' || 
      logIndicatesProgress || 
      (total > 0 && progress < total);
    
    // Crear el objeto de estado de sincronización
    let syncState = {
      inProgress: syncInProgress,
      completed: (completionMessageDetected || !syncInProgress) && progress > 0,
      status: '',
      lastLog,
      total: total || 0,
      progress: progress || 0
    };
    
    // Determinar mensaje según la situación
    if (completionMessageDetected && !syncInProgress) {
      // Sincronización terminada 
      syncState.completed = true;
      syncState.inProgress = false;
      syncState.status = 'Sincronización completada';
      
      // Mantener el progreso y total para que no vuelva a 0%
      if (progress === 0 && total === 0 && lastLog.includes('No se encontraron correos nuevos')) {
        syncState.status = 'No se encontraron correos nuevos';
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
      // No está en progreso ni completado
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