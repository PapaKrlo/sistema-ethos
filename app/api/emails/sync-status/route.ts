import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';
import { getSyncState, SyncState } from '../sync/route';

export async function GET() {
  try {
    // Obtener el estado actual desde la memoria global o caché
    let syncState = getSyncState();
    
    // Si no hay datos en memoria, intentar recuperar de la caché
    if (!syncState || Object.keys(syncState).length === 0) {
      try {
        const cachedState = await emailCache.get('sync_state');
        if (cachedState) {
          syncState = cachedState as SyncState;
        } else {
          // Si no hay datos en caché, intentamos obtener información del proceso actual
          const syncInProgress = await emailCache.get('sync_in_progress');
          const syncTotal = await emailCache.get('emails_count') || 0;
          const syncProgress = await emailCache.get('emails_processed') || 0;
          
          // Si hay una sincronización en curso según la caché pero no tenemos estado,
          // creamos un estado aproximado basado en los datos disponibles
          if (syncInProgress === 'true') {
            syncState = {
              inProgress: true,
              progress: parseInt(syncProgress as string, 10) || 0,
              total: parseInt(syncTotal as string, 10) || 0,
              errorCount: 0,
              status: 'Sincronizando correos...',
              completed: false,
              startTime: Date.now() - 60000, // Estimamos que comenzó hace 1 minuto
              endTime: 0
            };
          } else {
            // Si no hay datos en caché, devolver estado por defecto
            syncState = {
              inProgress: false,
              progress: 0,
              total: 0,
              errorCount: 0,
              status: '',
              completed: false,
              startTime: 0,
              endTime: 0
            };
          }
        }
      } catch (error) {
        console.error('Error al recuperar estado de caché:', error);
      }
    }
    
    // Obtener datos adicionales de la caché para enriquecer la respuesta
    try {
      // CRÍTICO: Verificar directamente si hay sincronización en curso
      // y sobreescribir cualquier estado que diga lo contrario
      const syncInProgress = await emailCache.get('sync_in_progress');
      if (syncInProgress === 'true') {
        // Si hay sincronización en curso según la caché, forzar inProgress=true y completed=false
        // sin importar lo que diga syncState
        syncState.inProgress = true;
        syncState.completed = false;
        syncState.status = 'Sincronizando correos...';
      }
      
      // También verificar si tenemos emails por procesar
      const emailsCount = await emailCache.get('emails_count');
      const emailsProcessed = await emailCache.get('emails_processed');
      
      if (emailsCount && emailsProcessed) {
        const total = parseInt(emailsCount as string, 10);
        const processed = parseInt(emailsProcessed as string, 10);
        
        // Si hay emails por procesar, considerarlo como en progreso
        if (total > 0 && processed < total) {
          syncState.inProgress = true;
          syncState.completed = false;
          // Si no hay un status explícito, establecer uno basado en el progreso
          if (!syncState.status || syncState.status === 'Sincronización finalizada') {
            const percent = Math.floor((processed / total) * 100);
            syncState.status = `Sincronizando correos (${percent}%)`;
          }
        }
      }
      
      // Si el estado no tiene total pero tenemos la cuenta de emails, usarla
      if (syncState.total === 0 && syncState.inProgress) {
        const emailsCount = await emailCache.get('emails_count');
        if (emailsCount) {
          syncState.total = parseInt(emailsCount as string, 10);
        }
      }
      
      // Si el progreso es 0 pero hay emails procesados, actualizar
      if (syncState.progress === 0 && syncState.inProgress) {
        const emailsProcessed = await emailCache.get('emails_processed');
        if (emailsProcessed) {
          syncState.progress = parseInt(emailsProcessed as string, 10);
        }
      }
      
      // Enriquecer con mensaje de logs si está disponible
      const lastSyncLog = await emailCache.get('last_sync_log');
      if (lastSyncLog) {
        syncState.lastLog = lastSyncLog;
      }
      
      // Recopilar mensajes de procesamiento de adjuntos para incluirlos
      const attachmentLogs = await emailCache.get('attachment_logs');
      if (attachmentLogs) {
        syncState.attachmentLogs = attachmentLogs;
      }
      
      // Incluir información de la consola sobre "Procesando X correos"
      if (syncState.inProgress && syncState.total > 0) {
        const consoleMessage = `Procesando ${syncState.total} correos de ${syncState.total} encontrados`;
        if (!syncState.lastLog || !syncState.lastLog.includes("Procesando")) {
          syncState.lastLog = consoleMessage;
        }
      }
    } catch (error) {
      console.error('Error al enriquecer estado con datos de caché:', error);
    }
    
    // Calcular tiempo transcurrido si está en progreso
    if (syncState.inProgress && syncState.startTime > 0) {
      const elapsedSeconds = Math.floor((Date.now() - syncState.startTime) / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      
      syncState = {
        ...syncState,
        elapsedTime: `${minutes}m ${seconds}s`
      };
    }
    
    // Calcular tiempo que tomó si está completado
    if (syncState.completed && syncState.startTime > 0 && syncState.endTime > 0) {
      const totalSeconds = Math.floor((syncState.endTime - syncState.startTime) / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      syncState = {
        ...syncState,
        processingTime: `${minutes}m ${seconds}s`
      };
    }
    
    return NextResponse.json(syncState);
  } catch (error: any) {
    console.error('Error al obtener estado de sincronización:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener estado de sincronización'
    }, { status: 500 });
  }
} 