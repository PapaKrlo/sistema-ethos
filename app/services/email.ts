import { Resend } from 'resend';

// Inicializar Resend con la API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Plantilla para usuarios con perfil cliente
const clienteEmailTemplate = (username: string, email: string, password: string) => `
<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .header { background-color: #008A4B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .logo { max-width: 180px; height: auto; }
    .content { padding: 30px 20px; background-color: white; }
    .credentials { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #008A4B; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #777; padding-top: 20px; border-top: 1px solid #eee; }
    .button { display: inline-block; background-color: #008A4B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; margin: 15px 0; transition: background-color 0.3s; }
    .button:hover { background-color: #006d3b; }
    p { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo.svg" alt="Ethos Logo" class="logo" />
    </div>
    <div class="content">
      <p>Hola ${username},</p>
      <p>Tu cuenta ha sido creada exitosamente en el sistema Ethos. A continuación, encontrarás tus credenciales de acceso:</p>
      
      <div class="credentials">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Contraseña:</strong> ${password}</p>
      </div>
      
      <p>Por favor, ingresa al portal para completar tu perfil y comenzar a utilizar nuestros servicios.</p>
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Ingresar al Portal</a>
      </p>
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
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .header { background-color: #008A4B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .logo { max-width: 180px; height: auto; }
    .content { padding: 30px 20px; background-color: white; }
    .credentials { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #008A4B; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #777; padding-top: 20px; border-top: 1px solid #eee; }
    .button { display: inline-block; background-color: #008A4B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; margin: 15px 0; transition: background-color 0.3s; }
    .button:hover { background-color: #006d3b; }
    p { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo.svg" alt="Ethos Logo" class="logo" />
    </div>
    <div class="content">
      <p>Hola ${username},</p>
      <p>Tu cuenta ha sido creada exitosamente en el sistema Ethos. A continuación, encontrarás tus credenciales de acceso:</p>
      
      <div class="credentials">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Contraseña:</strong> ${password}</p>
      </div>
      
      <p>Ya puedes ingresar al sistema con estas credenciales.</p>
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Ingresar al Portal</a>
      </p>
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
      from: 'Ethos <no-reply@transactional.ethos.com.ec>', // Reemplaza con tu dominio verificado en Resend
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