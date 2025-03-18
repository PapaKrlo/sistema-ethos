import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';

/**
 * Endpoint para obtener información sobre la sincronización
 * Proporciona la fecha de última sincronización y estadísticas
 */
export async function GET() {
  try {
    // Obtener la fecha de última sincronización de la caché
    const lastSyncTimestamp = await emailCache.get('last_sync_timestamp');
    
    // Obtener las estadísticas más recientes
    const cachedStats = await emailCache.get('email_stats');
    
    // Obtener metadatos desde Strapi (última vez que se actualizó un email)
    let strapiLastUpdated = null;
    
    try {
      // Intentar obtener la fecha del correo más reciente en Strapi
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_GRAPHQL_URL}/api/emails?sort=updatedAt:desc&pagination[limit]=1`, 
        {
          headers: {
            Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0 && data.data[0].attributes) {
          strapiLastUpdated = data.data[0].attributes.updatedAt;
        }
      }
    } catch (error) {
      console.error("Error al obtener fecha de actualización de Strapi:", error);
    }
    
    // Determinar la última fecha de actualización (la más reciente entre ambas fuentes)
    let lastUpdated = lastSyncTimestamp;
    
    if (strapiLastUpdated && (!lastSyncTimestamp || new Date(strapiLastUpdated) > new Date(lastSyncTimestamp))) {
      lastUpdated = strapiLastUpdated;
    }
    
    // Obtener conteo total de correos
    let totalEmails = 0;
    
    try {
      const countResponse = await fetch(
        `${process.env.NEXT_PUBLIC_GRAPHQL_URL}/api/emails/count`, 
        {
          headers: {
            Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
        }
      );
      
      if (countResponse.ok) {
        totalEmails = await countResponse.json();
      }
    } catch (error) {
      console.error("Error al obtener conteo de correos:", error);
    }
    
    return NextResponse.json({
      lastSyncTimestamp,
      strapiLastUpdated,
      lastUpdated,
      totalEmails,
      stats: cachedStats || null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error al obtener información de sincronización:', error);
    return NextResponse.json(
      { error: 'Error al obtener información de sincronización' },
      { status: 500 }
    );
  }
} 