import { NextResponse } from 'next/server';
import { emailCache } from '../../../lib/cache';
import { UTApi, UTFile } from 'uploadthing/server';

// Endpoint para procesar adjuntos de correos en segundo plano
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    
    // Verificar que la solicitud viene de Vercel Cron
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar si ya hay un proceso en marcha
    const isProcessing = await emailCache.get('processing_attachments');
    if (isProcessing === 'true') {
      return NextResponse.json({
        message: 'Ya hay un proceso de adjuntos en marcha',
        success: true
      });
    }
    
    // Marcar que el proceso ha iniciado
    await emailCache.set('processing_attachments', 'true', 1800); // 30 minutos máximo
    
    try {
      // Obtener emails desde Strapi que no tienen adjuntos procesados
      const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
      const strapiToken = process.env.STRAPI_API_TOKEN || '';
      
      if (!graphqlUrl || !strapiToken) {
        throw new Error('Configuración incompleta para Strapi');
      }
      
      // Consulta para obtener emails sin adjuntos procesados
      const query = `
        query {
          emailTrackings(
            filters: {
              attachments: { size: { eq: 0 } }
            },
            pagination: { limit: 10 }
          ) {
            data {
              id
              attributes {
                emailId
              }
            }
          }
        }
      `;
      
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${strapiToken}`,
        },
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      const emails = data.data?.emailTrackings?.data || [];
      
      console.log(`Encontrados ${emails.length} correos sin adjuntos procesados`);
      
      // Procesar cada correo encontrado
      const results = [];
      
      for (const email of emails) {
        try {
          // Llamar al endpoint de procesamiento de adjuntos
          const processResult = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/emails/process-attachments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              emailId: email.attributes.emailId
            }),
          });
          
          const result = await processResult.json();
          results.push({
            emailId: email.attributes.emailId,
            success: processResult.ok,
            message: result.message || result.error,
            attachmentsCount: result.attachments?.length || 0
          });
          
          // Esperar un poco entre cada procesamiento para no sobrecargar el servidor
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`Error procesando adjuntos para correo ${email.attributes.emailId}:`, error);
          results.push({
            emailId: email.attributes.emailId,
            success: false,
            message: error.message || 'Error desconocido'
          });
        }
      }
      
      // Finalizar el proceso
      await emailCache.del('processing_attachments');
      
      return NextResponse.json({
        success: true,
        message: `Procesados adjuntos para ${results.length} correos`,
        results
      });
    } catch (error: any) {
      console.error('Error en el procesamiento de adjuntos:', error);
      await emailCache.del('processing_attachments');
      return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error en cron de adjuntos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 