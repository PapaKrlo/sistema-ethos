import { NextResponse } from 'next/server';
import { syncEmails } from '../../../lib/email-sync';
import { getSyncState, updateSyncState } from '../../../lib/sync-state';

// Endpoint para obtener el estado de sincronización
export async function GET() {
  return NextResponse.json(getSyncState());
}

// Endpoint para iniciar sincronización forzada
export async function POST(request: Request) {
  try {
    // Verificar si ya hay una sincronización en curso
    const syncState = getSyncState();
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
      status: 'Sincronizando correos nuevos...',
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
          const currentState = getSyncState();
          if (currentState.completed) {
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
          errorCount: getSyncState().errorCount + 1,
          endTime: Date.now()
        });
      });
    
    return NextResponse.json({
      success: true,
      message: 'Sincronización iniciada',
      syncState: getSyncState()
    });
  } catch (error: any) {
    console.error('Error al iniciar sincronización:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al iniciar sincronización'
    }, { status: 500 });
  }
} 