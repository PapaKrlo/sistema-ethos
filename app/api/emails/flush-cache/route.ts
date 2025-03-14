import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';

// Función auxiliar para manejar la lógica de limpieza de caché
async function handleCacheFlush(request: Request) {
  try {
    const url = new URL(request.url);
    const specificKey = url.searchParams.get('key');

    if (specificKey) {
      // Si se proporciona una clave específica, solo borrar esa clave
      await emailCache.del(specificKey);
      
      return NextResponse.json({ 
        success: true, 
        message: `Clave ${specificKey} eliminada correctamente` 
      });
    } else {
      // Si no se proporciona clave específica, limpiar todo
      // Limpiar todas las listas y conteos en caché
      await emailCache.invalidateEmailLists();
      await emailCache.invalidateCounts();
      
      // Eliminar bandera de sincronización si existe
      await emailCache.del('sync_in_progress');
      
      // Eliminar también la marca de error de Strapi
      await emailCache.del('strapi_query_error');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Caché de emails limpiada correctamente' 
      });
    }
  } catch (error) {
    console.error('Error al limpiar caché:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// Soportar método GET
export async function GET(request: Request) {
  return handleCacheFlush(request);
}

// Soportar método POST
export async function POST(request: Request) {
  return handleCacheFlush(request);
} 