import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';
import { syncEmails } from '../../../lib/email-sync';

// Definir la interfaz para el estado de sincronización
export interface SyncState {
  inProgress: boolean;
  progress: number;
  total: number;
  errorCount: number;
  status: string;
  completed: boolean;
  startTime: number;
  endTime: number;
  [key: string]: any; // Para permitir propiedades adicionales
}

// Variable global para almacenar el estado de sincronización
let syncState: SyncState = {
  inProgress: false,
  progress: 0,
  total: 0,
  errorCount: 0,
  status: '',
  completed: false,
  startTime: 0,
  endTime: 0
};

// Función para obtener el estado actual de sincronización
export const getSyncState = (): SyncState => ({ ...syncState });

// Función para actualizar el estado de sincronización
export const updateSyncState = (update: Partial<SyncState>) => {
  syncState = { ...syncState, ...update };
  // Guardar en caché para que esté disponible entre solicitudes
  try {
    emailCache.set('sync_state', syncState, 3600);
  } catch (error) {
    console.error('Error al guardar estado de sincronización en caché:', error);
  }
};

// Inicializar el estado desde la caché si existe
export async function initSyncState() {
  try {
    const cachedState = await emailCache.get('sync_state');
    if (cachedState) {
      syncState = cachedState as SyncState;
    }
  } catch (error) {
    console.error('Error al recuperar estado de sincronización desde caché:', error);
  }
}

// Endpoint para iniciar sincronización forzada
export async function POST(request: Request) {
  try {
    // Verificar si ya hay una sincronización en curso
    if (syncState.inProgress) {
      return NextResponse.json({
        success: false,
        error: 'Ya hay una sincronización en curso',
        syncState
      }, { status: 409 }); // Conflict
    }
    
    // Obtener parámetros de la petición
    const { force = false } = await request.json();
    const url = new URL(request.url);
    const getAllEmails = url.searchParams.get('getAllEmails') === 'true';
    
    // Inicializar el estado de sincronización
    updateSyncState({
      inProgress: true,
      progress: 0,
      total: 0,
      errorCount: 0,
      status: 'Iniciando sincronización...',
      completed: false,
      startTime: Date.now(),
      endTime: 0
    });
    
    // Iniciar sincronización en segundo plano
    syncEmails(force, getAllEmails, 1000)
      .then(() => {
        // Marcar como completado cuando termine
        updateSyncState({
          inProgress: false,
          completed: true,
          status: 'Sincronización completada',
          endTime: Date.now()
        });
        
        // Limpiar el estado después de 5 minutos
        setTimeout(() => {
          if (syncState.completed) {
            updateSyncState({
              progress: 0,
              total: 0,
              errorCount: 0,
              status: '',
              completed: false,
              startTime: 0,
              endTime: 0
            });
          }
        }, 5 * 60 * 1000);
      })
      .catch((error: Error) => {
        console.error('Error en sincronización:', error);
        updateSyncState({
          inProgress: false,
          status: `Error: ${error.message}`,
          errorCount: syncState.errorCount + 1,
          endTime: Date.now()
        });
      });
    
    return NextResponse.json({
      success: true,
      message: 'Sincronización iniciada',
      syncState
    });
  } catch (error: any) {
    console.error('Error al iniciar sincronización:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al iniciar sincronización'
    }, { status: 500 });
  }
}

// Inicializar estado al cargar el módulo
initSyncState(); 