import { NextResponse } from 'next/server';
import { gql } from 'graphql-request';
import { UTApi } from 'uploadthing/server';
import { emailCache } from '../../../lib/cache';

// API para procesar adjuntos de correos que ya están en Strapi (sin IMAP)
export async function POST(request: Request) {
  try {
    // Obtener el ID del correo
    const { emailId } = await request.json();
    
    if (!emailId) {
      return NextResponse.json({ error: 'Se requiere el emailId' }, { status: 400 });
    }
    
    console.log(`Procesando adjuntos localmente para correo con ID: ${emailId}`);
    
    // Verificar si tenemos token y URL de Strapi
    const strapiToken = process.env.STRAPI_API_TOKEN;
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
    
    // Si no tenemos configuración de Strapi, no podemos continuar
    if (!strapiToken || !graphqlUrl) {
      return NextResponse.json({ error: 'No hay configuración de Strapi disponible' }, { status: 500 });
    }
    
    // Intentar obtener datos desde caché primero
    const cacheKey = `email_attachments:${emailId}`;
    const cachedData = await emailCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Usando datos en caché para correo: ${emailId}`);
      try {
        const parsedData = JSON.parse(cachedData);
        return NextResponse.json(parsedData);
      } catch (error) {
        console.warn('Error al parsear datos en caché:', error);
        // Si hay error al parsear, continuamos con la consulta a Strapi
      }
    }
    
    // Buscar el registro en Strapi
    const query = gql`
      query GetEmailTracking($emailId: String!) {
        emailTrackings(filters: { emailId: { eq: $emailId } }) {
          documentId
          attachments {
            id
            name
            url
            size
            mimeType
          }
          fullContent
        }
      }
    `;
    
    console.log(`Consultando Strapi para email: ${emailId}`);
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${strapiToken}`,
      },
      body: JSON.stringify({ query, variables: { emailId } }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error en la respuesta de Strapi:', errorData);
      return NextResponse.json({ error: 'Error al verificar el correo en Strapi', details: errorData }, { status: 400 });
    }
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('Errores GraphQL:', JSON.stringify(data.errors, null, 2));
      return NextResponse.json({ error: 'Error en la consulta GraphQL', details: data.errors }, { status: 400 });
    }
    
    const emailTracking = data.data?.emailTrackings?.[0];
    
    if (!emailTracking) {
      return NextResponse.json({ error: 'No se encontró el correo en Strapi' }, { status: 404 });
    }
    
    const existingAttachments = emailTracking.attachments || [];
    
    let responseData;
    
    if (existingAttachments.length === 0) {
      // Si no hay adjuntos, pero tenemos contenido, podemos generar un archivo HTML
      if (emailTracking.fullContent) {
        // Crear un HTML para descargar con el contenido del correo
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Correo - ${emailId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .email-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
              .email-header { border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h2>Contenido del correo</h2>
                <p><strong>ID:</strong> ${emailId}</p>
              </div>
              <div class="email-content">
                ${emailTracking.fullContent}
              </div>
            </div>
          </body>
          </html>
        `;
        
        // Agregar un adjunto virtual con el contenido HTML
        responseData = { 
          message: 'Contenido del correo preparado para descargar',
          htmlContent: htmlContent
        };
      } else {
        responseData = { message: 'No hay adjuntos que procesar para este correo' };
      }
    } else {
      // Validar y formatear los adjuntos existentes
      const processedAttachments = existingAttachments.map((attachment: { 
        id: string, 
        name?: string, 
        url?: string, 
        size?: number, 
        mimeType?: string 
      }) => {
        return {
          id: attachment.id,
          name: attachment.name || 'archivo.txt',
          url: attachment.url || '',
          size: attachment.size || 0,
          mimeType: attachment.mimeType || 'application/octet-stream'
        };
      });
      
      responseData = { 
        message: 'Adjuntos procesados correctamente',
        attachments: processedAttachments,
        // Incluir el contenido HTML por si se necesita mostrar
        htmlContent: emailTracking.fullContent || ''
      };
    }
    
    // Guardar en caché por 30 minutos
    await emailCache.set(cacheKey, JSON.stringify(responseData), 60 * 30);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error procesando adjuntos localmente:', error);
    return NextResponse.json({ error: 'Error procesando adjuntos localmente', details: error }, { status: 500 });
  }
} 