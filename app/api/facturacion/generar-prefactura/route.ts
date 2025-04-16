import { NextRequest, NextResponse } from 'next/server';

// URL del microservicio Contifico
const CONTIFICO_SERVICE_URL = process.env.CONTIFICO_SERVICE_URL || 'http://localhost:3010';

export async function POST(request: NextRequest) {
  try {
    const datos = await request.json();
    
    // Validar datos mínimos requeridos
    if (!datos.apiContifico) {
      return NextResponse.json(
        { success: false, message: 'API Key de Contifico no proporcionada' },
        { status: 400 }
      );
    }
    
    // Llamar al microservicio de Contifico
    const response = await fetch(`${CONTIFICO_SERVICE_URL}/api/v1/facturacion/generar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...datos,
        esPrefactura: true, // Asegurar que sea una prefactura
      }),
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.message || 'Error al generar prefactura');
    }
    
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Error en API route /api/facturacion/generar-prefactura:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al generar prefactura',
        error: error.toString()
      },
      { status: 500 }
    );
  }
} 