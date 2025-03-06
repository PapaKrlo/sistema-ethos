import { NextResponse } from 'next/server';
import { gql } from 'graphql-request';
import { UTApi } from 'uploadthing/server';

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
    
    if (existingAttachments.length === 0) {
      return NextResponse.json({ message: 'No hay adjuntos que procesar para este correo' });
    }
    
    // Actualizar URLs de los adjuntos si es necesario o cualquier otro procesamiento
    // Este es el lugar donde podrías agregar lógica adicional para procesar 
    // los adjuntos sin necesidad de hacer llamadas IMAP
    
    return NextResponse.json({ 
      message: 'Adjuntos procesados correctamente',
      attachments: existingAttachments
    });
    
  } catch (error) {
    console.error('Error procesando adjuntos localmente:', error);
    return NextResponse.json({ error: 'Error procesando adjuntos localmente', details: error }, { status: 500 });
  }
} 