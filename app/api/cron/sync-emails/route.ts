import { NextRequest, NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';
import { emailQueue } from '../../../lib/queue';

// Token para autorización simple (debe coincidir con el configurado en vercel.json)
const CRON_SECRET = process.env.CRON_SECRET || 'default_cron_secret';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Máximo 60 segundos (limitación del plan hobby de Vercel)

/**
 * Endpoint para la sincronización periódica de correos. Llamado via Cron Job de Vercel
 * @param request Solicitud entrante
 */
export async function GET(request: NextRequest) {
  console.log('Iniciando sincronización periódica de correos');
  
  try {
    // Verificar autorización mediante token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      console.log('Intento de sincronización sin autorización válida');
      return new NextResponse(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar si ya hay un trabajo de sincronización en progreso
    const syncInProgress = await emailCache.get('sync_in_progress');
    if (syncInProgress) {
      console.log('Ya hay una sincronización en progreso. Saltando.');
      return NextResponse.json({
        success: true,
        message: 'Sincronización ya en progreso. Saltando.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Marcar el inicio de la sincronización (con expiración de 15 minutos por si falla)
    await emailCache.set('sync_in_progress', 'true', 60 * 15);
    
    try {
      // Verificar la última actualización
      const lastSync = await emailCache.get('last_sync_timestamp');
      const now = new Date().toISOString();
      
      console.log(`Última sincronización: ${lastSync || 'Nunca'}`);
      
      // Encolar trabajo de obtención de correos con tamaño de lote adecuado
      await emailQueue.sendMessage({
        batchSize: 100, // Procesar 100 correos a la vez
        startIndex: 0,
        skipCache: true // Forzar obtención fresca desde la fuente
      });
      
      // Actualizar timestamp de última sincronización
      await emailCache.set('last_sync_timestamp', now);
      
      console.log('Trabajo de sincronización encolado correctamente');
      
      return NextResponse.json({
        success: true,
        message: 'Sincronización encolada correctamente',
        timestamp: now,
        lastSync: lastSync || null
      });
    } finally {
      // Siempre eliminar el bloqueo de sincronización, incluso si hay error
      await emailCache.del('sync_in_progress');
    }
  } catch (error) {
    console.error('Error en sincronización de correos:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Error en sincronización',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 