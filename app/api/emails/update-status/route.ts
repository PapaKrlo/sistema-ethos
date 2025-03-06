import { NextResponse } from 'next/server';

// Definir la interfaz para la solicitud de actualización
interface UpdateStatusRequest {
  emailId: string;
  status: "necesitaAtencion" | "informativo" | "respondido";
}

export async function POST(request: Request) {
  try {
    // Obtener datos de la solicitud
    const data: UpdateStatusRequest = await request.json();
    
    // Validar datos de entrada
    if (!data.emailId || !data.status) {
      return NextResponse.json({ 
        success: false,
        error: 'Se requieren los campos emailId y status' 
      }, { status: 400 });
    }
    
    console.log(`Actualizando estado de email ${data.emailId} a ${data.status}`);
    
    // Convertir el estado del frontend al formato de Strapi
    // En Strapi 5, usamos exactamente el mismo formato para emailStatus
    const emailStatus = data.status;
    
    // Obtener URL base de Strapi
    const baseUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:1337/graphql';
    const GRAPHQL_URL = baseUrl;
    const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
    
    if (!GRAPHQL_URL) {
      console.error('Error: URL de GraphQL no configurada');
      return NextResponse.json({ 
        success: false,
        error: 'Error de configuración del servidor' 
      }, { status: 500 });
    }
    
    // En un entorno de desarrollo, intentar actualizar pero con fallback a simulación
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Primero, necesitamos encontrar el documentId correspondiente al emailId
    const findEmailQuery = `
      query FindEmail($emailId: String!) {
        emailTrackings(
          filters: {
            emailId: { eq: $emailId }
          }
        ) {
          documentId
          emailId
          emailStatus
        }
      }
    `;
    
    try {
      // Buscar el email
      const findResponse = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: JSON.stringify({ 
          query: findEmailQuery, 
          variables: { 
            emailId: String(data.emailId)
          } 
        }),
      });
      
      if (!findResponse.ok) {
        const errorText = await findResponse.text();
        console.error(`Error al buscar el email: ${findResponse.status} ${findResponse.statusText}`);
        console.error(`Detalle: ${errorText.substring(0, 500)}`);
        throw new Error(`Error al buscar el email: ${findResponse.status} ${findResponse.statusText}`);
      }
      
      const findData = await findResponse.json();
      
      // Verificar errores de GraphQL
      if (findData.errors) {
        console.error('Errores en la consulta GraphQL:', findData.errors);
        throw new Error('Error al buscar el email en GraphQL');
      }
      
      // Obtener el documentId
      const emails = findData.data?.emailTrackings || [];
      
      if (emails.length === 0) {
        console.error('No se encontró el email con ID:', data.emailId);
        
        if (isDevelopment) {
          console.log('⚠️ Error: email no encontrado');
           
          // Ya no simulamos éxito, devolvemos el error real para depuración
          return NextResponse.json({ 
            success: false,
            error: true, 
            message: 'No se encontró el email especificado',
            emailId: data.emailId, 
            status: data.status
          }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: false,
          error: true, 
          message: 'No se encontró el email especificado', 
          emailId: data.emailId 
        }, { status: 404 });
      }
      
      const documentId = emails[0].documentId;
      console.log(`Email encontrado. DocumentId: ${documentId}`);
      
      // Consulta GraphQL para actualizar el estado usando documentId
      const mutation = `
        mutation UpdateEmailStatus($documentId: ID!, $status: ENUM_EMAILTRACKING_EMAILSTATUS!) {
          updateEmailTracking(
            documentId: $documentId, 
            data: { 
              emailStatus: $status,
              lastResponseDate: "${new Date().toISOString()}",
              lastResponseBy: "admin"
            }
          ) {
            documentId
            emailStatus
            lastResponseBy
            lastResponseDate
            updatedAt
          }
        }
      `;
      
      console.log(`Actualizando email con documentId ${documentId} a estado ${emailStatus}`);
      
      // Realizar la mutación
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: JSON.stringify({ 
          query: mutation, 
          variables: { 
            documentId: String(documentId), 
            status: emailStatus 
          } 
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error en la respuesta: ${response.status} ${response.statusText}`);
        console.error(`Detalle: ${errorText.substring(0, 500)}`);
        throw new Error(`Error en la comunicación con Strapi: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      // Verificar errores de GraphQL
      if (responseData.errors) {
        console.error('Errores en la respuesta GraphQL:', responseData.errors);
        throw new Error('Error en la mutación GraphQL');
      }
      
      return NextResponse.json({ 
        success: true,
        data: responseData.data,
        message: 'Estado actualizado correctamente', 
        emailId: data.emailId, 
        documentId: documentId,
        status: data.status
      });
      
    } catch (error) {
      console.error('Error al actualizar estado en Strapi:', error);
      
      // Si estamos en desarrollo, mostrar el error en lugar de simularlo
      if (isDevelopment) {
        console.log('⚠️ Error real en desarrollo (sin simulación):', 
          error instanceof Error ? error.message : String(error));
        
        // Ya no simulamos éxito, devolvemos el error real para depuración
        return NextResponse.json({ 
          success: false,
          error: true, 
          message: error instanceof Error ? error.message : String(error),
          emailId: data.emailId, 
          status: data.status
        }, { status: 400 });
      }
      
      // En producción, devolver el error
      return NextResponse.json({ 
        success: false,
        error: true,
        message: 'Error al actualizar estado en Strapi',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error general al procesar solicitud:', error);
    return NextResponse.json({ 
      success: false,
      error: true, 
      message: 'Error al procesar la solicitud',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 