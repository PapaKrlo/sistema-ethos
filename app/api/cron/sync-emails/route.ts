import { NextRequest, NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';
// Importar función de sincronización mejorada
import { syncEmailsBackground } from '../../emails/fetch/route';

// Token para autorización simple (debe coincidir con el configurado en vercel.json)
const CRON_SECRET = process.env.CRON_SECRET || 'default_cron_secret';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Ajustado a 60 segundos (límite del plan gratuito de Vercel)

/**
 * Endpoint para la sincronización periódica de correos. Llamado via Cron Job de Vercel
 * Inicia la sincronización pero no espera a que termine, ya que debe completarse en 60s
 * @param request Solicitud entrante
 */
export async function GET(request: NextRequest) {
  console.log('Iniciando sincronización periódica programada de correos');
  
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
    if (syncInProgress === 'true') {
      console.log('Ya hay una sincronización en progreso. Saltando.');
      return NextResponse.json({
        success: true,
        message: 'Sincronización ya en progreso. Saltando.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar la última actualización
    const lastSync = await emailCache.get('last_sync_timestamp');
    const now = new Date().toISOString();
    
    console.log(`Última sincronización: ${lastSync || 'Nunca'}`);
    
    // IMPORTANTE: Solo iniciamos el proceso y retornamos inmediatamente
    // No esperamos a que termine para cumplir con la limitación de 60 segundos
    try {
      console.log('Iniciando sincronización automática diaria');
      
      // Marcar como en progreso
      await emailCache.set('sync_in_progress', 'true', 1800);
      await emailCache.set('last_sync_log', 'Iniciando sincronización programada diaria...', 1800);
      
      // Iniciar la sincronización pero NO esperamos con await
      // Esto permite que el cron job termine rápidamente dentro del límite de 60s
      syncEmailsBackground({
        getAllEmails: true,
        force: true,           // Forzar la sincronización incluso si parece que ya está todo sincronizado
        silent: false,         // Mostrar logs para debugging
        updateFromStrapi: true // Actualizar estados desde Strapi al finalizar
      }).catch(error => {
        console.error('Error en sincronización automática (capturado):', error);
        // Asegurarse de que se libere el bloqueo en caso de error
        emailCache.set('sync_in_progress', 'false', 60);
        emailCache.set('last_sync_log', `Error en sincronización programada: ${error.message || 'Error desconocido'}`, 1800);
      });
      
      console.log('Sincronización iniciada correctamente, continuará en segundo plano');
      
      return NextResponse.json({
        success: true,
        message: 'Sincronización iniciada correctamente, continuará en segundo plano',
        timestamp: now,
        lastSync: lastSync || null
      });
    } catch (syncError) {
      console.error('Error al iniciar sincronización automática diaria:', syncError);
      return NextResponse.json({
        success: false,
        error: 'Error al iniciar la sincronización',
        message: syncError instanceof Error ? syncError.message : 'Error desconocido',
        timestamp: now
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error en endpoint de sincronización programada:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Error en sincronización',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 