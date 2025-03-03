import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configuración del servidor SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.telconet.cloud',
  port: 587,
  secure: false,
  auth: {
    user: 'administraciona3@almax.ec',
    pass: process.env.EMAIL_PASSWORD || '', // Debe configurarse en .env
  },
  tls: {
    rejectUnauthorized: false, // Solo para desarrollo
  },
});

interface SendEmailRequest {
  emailId: string;
  response: string;
  to?: string;
  subject?: string;
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as SendEmailRequest;
    const { emailId, response, to, subject } = data;

    // Buscar el correo en Strapi para obtener los datos necesarios
    const query = `
      query {
        emailTrackings(filters: { emailId: { eq: "${emailId}" } }) {
          data {
            id
            attributes {
              from
              to
              subject
            }
          }
        }
      }
    `;

    const strapiResponse = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    });

    const strapiData = await strapiResponse.json();
    const emailData = strapiData.data?.emailTrackings?.data[0];
    
    // Usar datos de Strapi si están disponibles, o caer en los parámetros
    const recipientEmail = to || (emailData?.attributes?.from || 'destinatario@ejemplo.com');
    const emailSubject = subject ? `Re: ${subject}` : (emailData?.attributes?.subject ? `Re: ${emailData.attributes.subject}` : 'Re: Respuesta automática');

    // Enviar correo
    await transporter.sendMail({
      from: 'administraciona3@almax.ec',
      to: recipientEmail,
      subject: emailSubject,
      text: response,
      // Podríamos agregar HTML para correos más elaborados
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${response.replace(/\n/g, '<br>')}</div>`,
    });

    // Actualizar estado en Strapi
    if (emailData) {
      const updateQuery = `
        mutation {
          updateEmailTracking(id: ${emailData.id}, data: {
            emailStatus: respondido,
            lastResponseBy: "admin",
            lastResponseDate: "${new Date().toISOString()}"
          }) {
            data {
              id
              attributes {
                emailStatus
                lastResponseDate
              }
            }
          }
        }
      `;

      await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({ query: updateQuery }),
      });
      
      // Almacenar la respuesta en un objeto que se enviará al cliente
      // El cliente puede almacenar esto en localStorage como solución temporal
      const responseData = {
        emailId,
        responseId: `response-${Date.now()}`,
        content: response,
        date: new Date().toISOString(),
        sentBy: "admin"
      };

      return NextResponse.json({ 
        success: true, 
        message: 'Correo enviado correctamente', 
        responseData // Incluir los datos de la respuesta
      });
    }

    return NextResponse.json({ success: true, message: 'Correo enviado correctamente' });
  } catch (error: any) {
    console.error('Error al enviar correo:', error.message);
    return NextResponse.json(
      { error: `Error al enviar correo: ${error.message}` },
      { status: 500 }
    );
  }
} 