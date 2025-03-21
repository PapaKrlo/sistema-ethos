import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';

// Función para manejar solicitudes POST para limpiar el estado de sincronización
export async function POST() {
  try {
    // Eliminar la marca de sincronización en progreso
    await emailCache.del('sync_in_progress');
    
    // Limpiar todos los estados relacionados con la sincronización
    await emailCache.del('emails_processed');
    await emailCache.del('emails_count');
    
    // Establecer explícitamente el estado completado
    await emailCache.set('sync_completed', 'true', 1800);
    
    // Registrar en el log que se ha forzado la finalización
    await emailCache.set('last_sync_log', `Sincronización finalizada manualmente por el usuario a las ${new Date().toLocaleTimeString()}`, 1800);
    
    console.log('Estado de sincronización limpiado manualmente');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Estado de sincronización limpiado correctamente',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error al limpiar estado de sincronización:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
} 