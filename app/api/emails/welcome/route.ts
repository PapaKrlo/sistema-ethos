import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '../../../services/email';

interface WelcomeEmailRequest {
  username: string;
  email: string;
  password: string;
  tipoUsuario: 'cliente' | 'operacional';
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as WelcomeEmailRequest;
    const { username, email, password, tipoUsuario } = data;

    // Validar datos
    if (!username || !email || !password || !tipoUsuario) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Enviar correo
    const result = await sendWelcomeEmail(username, email, password, tipoUsuario);

    if (!result.success) {
      return NextResponse.json(
        { error: `Error al enviar correo: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Correo de bienvenida enviado correctamente' 
    });
  } catch (error: any) {
    console.error('Error al enviar correo de bienvenida:', error.message);
    return NextResponse.json(
      { error: `Error al enviar correo: ${error.message}` },
      { status: 500 }
    );
  }
} 