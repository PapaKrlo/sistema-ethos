import { Resend } from 'resend';

// Inicializar Resend con la API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Plantilla para usuarios con perfil cliente
const clienteEmailTemplate = (username: string, email: string, password: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #008A4B; color: white; padding: 10px 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .button { display: inline-block; background-color: #008A4B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenido a Ethos</h1>
    </div>
    <div class="content">
      <p>Hola ${username},</p>
      <p>Tu cuenta ha sido creada exitosamente en el sistema Ethos. A continuación, encontrarás tus credenciales de acceso:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Contraseña:</strong> ${password}</p>
      <p>Por favor, ingresa al portal para completar tu perfil y comenzar a utilizar nuestros servicios.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Ingresar al Portal</a></p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Ethos. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

// Plantilla para usuarios con perfil operacional
const operacionalEmailTemplate = (username: string, email: string, password: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #008A4B; color: white; padding: 10px 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .button { display: inline-block; background-color: #008A4B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenido a Ethos</h1>
    </div>
    <div class="content">
      <p>Hola ${username},</p>
      <p>Tu cuenta ha sido creada exitosamente en el sistema Ethos. A continuación, encontrarás tus credenciales de acceso:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Contraseña:</strong> ${password}</p>
      <p>Ya puedes ingresar al sistema con estas credenciales.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Ingresar al Portal</a></p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Ethos. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

// Función para enviar email a usuarios nuevos
export async function sendWelcomeEmail(
  username: string, 
  email: string, 
  password: string, 
  tipoUsuario: 'cliente' | 'operacional'
) {
  try {
    const template = tipoUsuario === 'cliente' 
      ? clienteEmailTemplate(username, email, password)
      : operacionalEmailTemplate(username, email, password);
    
    const subject = tipoUsuario === 'cliente'
      ? 'Bienvenido a Ethos - Completa tu perfil'
      : 'Bienvenido a Ethos - Tus credenciales de acceso';
    
    const { data, error } = await resend.emails.send({
      from: 'Ethos <no-reply@ethos.com>', // Reemplaza con tu dominio verificado en Resend
      to: email,
      subject: subject,
      html: template,
    });

    if (error) {
      console.error('Error al enviar email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error al enviar email:', error);
    return { success: false, error };
  }
} 