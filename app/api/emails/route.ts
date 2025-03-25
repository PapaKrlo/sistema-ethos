import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Redirigir a la implementación existente en /api/emails/fetch
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUrl = `${baseUrl}/api/emails/fetch`;
  
  try {
    const response = await fetch(redirectUrl, {
      method: 'GET',
      headers: request.headers
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al redirigir a /api/emails/fetch:', error);
    return NextResponse.json({ 
      error: 'Error al obtener correos',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 