import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Obtener el emailId del query string
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      return NextResponse.json({ error: 'Se requiere emailId' }, { status: 400 });
    }

    console.log(`Buscando respuestas para el email con ID: ${emailId}`);

    // Consulta GraphQL para obtener la información del email
    const query = `
      query {
        emailTrackings(filters: { emailId: { eq: "${emailId}" } }) {
          data {
            id
            attributes {
              emailStatus
              lastResponseDate
              lastResponseBy
              subject
            }
          }
        }
      }
    `;

    // Hacer la consulta a Strapi
    const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    
    // Verificar si hay datos
    if (!result.data?.emailTrackings?.data || result.data.emailTrackings.data.length === 0) {
      // Si no hay datos, retornar un array vacío
      return NextResponse.json({ 
        responses: [],
        message: "No se encontraron respuestas para este correo" 
      });
    }
    
    // Extraer los datos del email
    const emailData = result.data.emailTrackings.data[0];
    const emailAttributes = emailData.attributes;
    
    // Si el correo está marcado como respondido, crear una respuesta simulada
    if (emailAttributes.emailStatus === "respondido" && emailAttributes.lastResponseDate) {
      // Crear respuesta simulada con la información disponible
      const simulatedResponse = {
        id: `simulated-${Date.now()}`,
        content: `Este correo fue respondido por ${emailAttributes.lastResponseBy || 'el administrador'}. No se almacena el contenido completo de las respuestas en el sistema.`,
        date: emailAttributes.lastResponseDate,
        sentBy: emailAttributes.lastResponseBy || "admin"
      };
      
      return NextResponse.json({
        responses: [simulatedResponse],
        emailStatus: emailAttributes.emailStatus,
        lastResponseDate: emailAttributes.lastResponseDate,
        lastResponseBy: emailAttributes.lastResponseBy
      });
    }
    
    // Si no está marcado como respondido, devolver array vacío
    return NextResponse.json({ 
      responses: [],
      emailStatus: emailAttributes.emailStatus,
      message: "Este correo no ha sido respondido aún"
    });
    
  } catch (error: any) {
    console.error('Error al buscar respuestas:', error.message);
    return NextResponse.json(
      { error: `Error al buscar respuestas: ${error.message}` },
      { status: 500 }
    );
  }
} 