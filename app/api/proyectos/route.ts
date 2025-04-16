import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// URL base de la API de Strapi
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Datos de prueba para desarrollo
const proyectosPrueba = [
  {
    id: '1',
    nombre: 'Almax 3',
    apiContifico: 'V9YjYbqMlMSv4IsuyCfYGiTVDedSNakcmpoRMHxKRW4',
  },
  {
    id: '2',
    nombre: 'Almax 2',
    apiContifico: 'API_KEY_DEMO_ALMAX2',
  }
];

export async function GET() {
  try {
    // Para desarrollo, simplemente devolvemos datos de prueba
    // En producción, activar esta parte para autenticar con Strapi
    /*
    const token = cookies().has('jwt') ? cookies().get('jwt')?.value : null;
    
    if (token) {
      // Consultar a Strapi para obtener los proyectos
      const response = await fetch(`${STRAPI_URL}/api/proyectos?populate=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transformar los datos para simplificar la estructura
        const proyectos = data.data.map((proyecto: any) => ({
          id: proyecto.id,
          nombre: proyecto.attributes.nombre,
          apiContifico: proyecto.attributes.apiContifico || '',
          descripcion: proyecto.attributes.descripcion || '',
          ubicacion: proyecto.attributes.ubicacion || '',
        }));

        return NextResponse.json(proyectos);
      }
    }
    */
    
    // Si no hay token o falla la petición, devolver datos de prueba
    return NextResponse.json(proyectosPrueba);
  } catch (error: any) {
    console.error('Error en API route /api/proyectos:', error);
    
    // En caso de error, también devolvemos los datos de prueba
    return NextResponse.json(proyectosPrueba);
  }
} 