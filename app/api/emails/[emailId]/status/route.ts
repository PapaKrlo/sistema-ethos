import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// En Next.js 15, los parámetros son una Promise
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  // Await para obtener los parámetros
  const { emailId } = await params;
  
  if (!emailId) {
    return NextResponse.json({ 
      success: false,
      error: 'Se requiere el ID del correo' 
    }, { status: 400 });
  }
  
  try {
    // Obtener los datos enviados en el cuerpo de la solicitud
    const body = await request.json();
    
    // Crear un nuevo objeto que incluya el emailId de la ruta
    const updatedBody = {
      ...body,
      emailId
    };
    
    // Redirigir a la implementación existente en /api/emails/update-status
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const redirectUrl = `${baseUrl}/api/emails/update-status`;
    
    // Enviar la solicitud con los datos actualizados
    const response = await fetch(redirectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedBody)
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error al actualizar estado del correo ${emailId}:`, error);
    return NextResponse.json({ 
      success: false,
      error: true,
      message: 'Error al actualizar estado del correo',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 