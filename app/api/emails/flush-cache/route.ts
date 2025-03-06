import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';

export async function GET() {
  try {
    // Limpiar todas las listas y conteos en caché
    await emailCache.invalidateEmailLists();
    await emailCache.invalidateCounts();
    
    // Eliminar bandera de sincronización si existe
    await emailCache.del('sync_in_progress');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Caché de emails limpiada correctamente' 
    });
  } catch (error) {
    console.error('Error al limpiar caché:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
} 