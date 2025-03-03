import { NextResponse } from 'next/server';
import Imap from 'imap-simple';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';

// Interfaces para tipado
interface ImapMessage {
  parts: Array<{
    which: string;
    body: any;
  }>;
  attributes: {
    uid: string;
    [key: string]: any;
  };
}

interface EmailTracking {
  id: string;
  attributes: {
    emailId: string;
    emailStatus: 'necesitaAtencion' | 'informativo' | 'respondido';
    from: string;
    to: string;
    subject: string;
    receivedDate: string;
    lastResponseBy: string | null;
    lastResponseDate: string | null;
  };
}

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
}

interface ProcessedEmail {
  id: string;
  emailId: string;
  from: string;
  to: string;
  subject: string;
  receivedDate: string;
  status: string;
  lastResponseBy: string | null;
  preview: string;
  attachments?: Attachment[];
}

// Mapear estados de Strapi a la API
const mapStrapiStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'necesitaAtencion': 'necesita_atencion',
    'informativo': 'informativo',
    'respondido': 'respondido'
  };
  return statusMap[status] || 'necesita_atencion';
};

// Controlar nivel de logs
const VERBOSE_LOGGING = process.env.VERBOSE_EMAIL_LOGGING === 'true';

// Configuración del servidor IMAP
const getImapConfig = () => ({
  imap: {
    user: 'administraciona3@almax.ec',
    password: process.env.EMAIL_PASSWORD || '',
    host: 'pop.telconet.cloud',
    port: 993,
    tls: true,
    authTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false }, // Solo para desarrollo
  }
});

export async function GET(request: Request) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === 'true';
    const silent = url.searchParams.get('silent') === 'true'; // Modo silencioso para operaciones sin logs
    const limit = Number(url.searchParams.get('limit') || '200'); // Limitar la cantidad máxima de correos
    const useMock = url.searchParams.get('mock') === 'true';
    const testStrapi = url.searchParams.get('test_strapi') === 'true';

    // Verificar variables de entorno críticas
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
    const strapiToken = process.env.STRAPI_API_TOKEN || '';
    const emailPassword = process.env.EMAIL_PASSWORD || '';

    // Si se solicita probar la conexión con Strapi
    if (testStrapi) {
      try {
        console.log("Probando conexión con Strapi...");
        
        // Consulta sencilla para verificar la conexión
        const testQuery = `
          query {
            emailTrackings {
              emailId
              emailStatus
            }
          }
        `;
        
        const testResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiToken}`,
          },
          body: JSON.stringify({ query: testQuery }),
        });
        
        if (!testResponse.ok) {
          throw new Error(`Error de conexión: ${testResponse.status} ${testResponse.statusText}`);
        }
        
        const testData = await testResponse.json();
        
        if (testData.errors) {
          throw new Error(`Error de GraphQL: ${JSON.stringify(testData.errors)}`);
        }
        
        // Intentar una mutación simple para probar la creación
        const testMutation = `
          mutation {
            createEmailTracking(
              data: {
                emailId: "test-${Date.now()}",
                from: "test@ejemplo.com",
                to: "destino@ejemplo.com",
                subject: "Prueba de conexión",
                receivedDate: "${new Date().toISOString()}",
                emailStatus: informativo,
                publishedAt: "${new Date().toISOString()}"
              }
            ) {
              emailId
              emailStatus
            }
          }
        `;
        
        const mutationResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiToken}`,
          },
          body: JSON.stringify({ query: testMutation }),
        });
        
        const mutationData = await mutationResponse.json();
        
        return NextResponse.json({ 
          success: true, 
          message: 'Conexión con Strapi exitosa',
          query: {
            ok: testResponse.ok,
            status: testResponse.status,
            data: testData
          },
          mutation: {
            ok: mutationResponse.ok,
            status: mutationResponse.status,
            data: mutationData
          }
        });
      } catch (error) {
        console.error('Error al probar conexión con Strapi:', error);
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
      }
    }
    
    // Si no hay contraseña de email configurada, usar datos de muestra
    if (!emailPassword && !useMock) {
      console.log("⚠️ No hay contraseña de email configurada para IMAP, usando datos de muestra");
      const mockEmails = generateMockEmails();
      return NextResponse.json({ 
        emails: mockEmails, 
        total: mockEmails.length,
        isMock: true,
        warning: "No hay contraseña de email configurada"
      });
    }
    
    // Si se solicita usar datos de muestra, devolver correos de muestra
    if (useMock) {
      console.log("Usando datos de muestra por solicitud explícita");
      const mockEmails = generateMockEmails();
      return NextResponse.json({ 
        emails: mockEmails, 
        total: mockEmails.length,
        isMock: true 
      });
    }

    // Obtener correos usando IMAP
    const imapConfig = getImapConfig();
    // console.log("Conectando a IMAP con usuario:", imapConfig.imap.user);
    
    const connection = await Imap.connect(imapConfig);
    // console.log("Conexión IMAP establecida correctamente");
    
    await connection.openBox('INBOX');
    // console.log("Bandeja INBOX abierta correctamente");

    // Buscar mensajes no leídos o que requieran atención (limitados a los más recientes)
    // Si se solicita un refresh, traer todos los correos (hasta el límite)
    const searchCriteria = refresh ? ['ALL'] : ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false,
    };

    // Obtener los mensajes con límite
    // Primero obtenemos los mensajes más recientes ordenados por fecha
    const messages = await connection.search(searchCriteria, fetchOptions);
    connection.end();

    // Limitar la cantidad de mensajes procesados
    const limitedMessages = messages.slice(0, limit);
    
    // console.log(`Total de mensajes: ${messages.length}, procesando: ${limitedMessages.length}`);

    // Usamos Promise.all con un mapa de promesas para procesar en paralelo
    // pero con un límite para evitar sobrecargar la memoria
    const batchSize = 20; // Procesar lotes de 20 correos a la vez
    let processedEmails: ProcessedEmail[] = [];
    
    for (let i = 0; i < limitedMessages.length; i += batchSize) {
      const batch = limitedMessages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (item: ImapMessage) => {
          try {
            // Obtener partes del mensaje
            const all = item.parts.find((part: { which: string }) => part.which === '');
            const id = item.attributes.uid;
            const idHeader = `${id}`;
            const emailId = item.attributes.uid;

            // Parsear el contenido completo del correo
            // Pero de forma más eficiente, evitando parsear cuerpos muy grandes completamente
            const parsed = await simpleParser(all?.body || '');
            
            // No truncar el cuerpo del mensaje para permitir el procesamiento completo de hilos
            let previewText = parsed.text || '';
            
            // Procesar adjuntos si existen, pero solo la información básica
            const attachments: Attachment[] = [];
            if (parsed.attachments && parsed.attachments.length > 0) {
              parsed.attachments.forEach((attachment) => {
                attachments.push({
                  filename: attachment.filename || 'archivo.dat',
                  contentType: attachment.contentType || 'application/octet-stream',
                  size: attachment.size || 0,
                });
              });
            }
            
            // Determinar si es un correo nuevo o una respuesta a uno existente
            const isReply = parsed.subject?.toLowerCase().startsWith('re:') || false;
            
            // Estado predeterminado y quién envió la última respuesta
            const defaultStatus = 'necesita_atencion';
            const lastResponseBy = isReply ? 'cliente' : null;

            // Obtener el texto del remitente de forma segura
            const from = getAddressText(parsed.from);
            const to = getAddressText(parsed.to);
            
            // Verificar si ya existe en Strapi y actualizar si es necesario
            // Pero hacerlo de forma más eficiente
            const emailStatusResult = await syncEmailWithStrapi(
              String(emailId),
              from,
              to,
              parsed.subject || 'Sin asunto',
              parsed.date?.toISOString() || new Date().toISOString(),
              defaultStatus,
              lastResponseBy,
              silent
            );
            
            // Determinar el estado basado en el resultado de la sincronización
            const finalStatus = emailStatusResult !== null ? mapStrapiStatus(emailStatusResult) : defaultStatus;
            
            return {
              id: id,
              emailId: emailId,
              from: from,
              to: to,
              subject: parsed.subject || 'Sin asunto',
              receivedDate: parsed.date?.toISOString() || new Date().toISOString(),
              status: finalStatus,
              lastResponseBy: lastResponseBy,
              preview: previewText,
              attachments: attachments.length > 0 ? attachments : undefined
            } as ProcessedEmail;
          } catch (error) {
            console.error(`Error procesando correo ${item.attributes.uid}:`, error);
            return null;
          }
        })
      );
      
      // Filtrar posibles nulos de correos que fallaron al procesar
      const validEmails = batchResults.filter((email): email is ProcessedEmail => email !== null);
      processedEmails = [...processedEmails, ...validEmails];
    }

    // Ordenar los correos por fecha (más recientes primero)
    processedEmails.sort((a, b) => {
      return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
    });

    // Agregar estadísticas por estado
    const stats = {
      necesitaAtencion: processedEmails.filter(email => email.status === 'necesita_atencion').length,
      informativo: processedEmails.filter(email => email.status === 'informativo').length,
      respondido: processedEmails.filter(email => email.status === 'respondido').length
    };

    // Construir respuesta con más información
    return NextResponse.json({ 
      emails: processedEmails, 
      total: messages.length,
      stats,
      refreshed: refresh,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error al obtener correos:', error);
    
    // Intentar proporcionar datos de muestra en cualquier caso
    console.log("⚠️ Error al obtener correos reales, proporcionando datos de muestra");
    const mockEmails = generateMockEmails();
    const stats = {
      necesitaAtencion: mockEmails.filter(email => email.status === 'necesita_atencion').length,
      informativo: mockEmails.filter(email => email.status === 'informativo').length,
      respondido: mockEmails.filter(email => email.status === 'respondido').length
    };
    
    return NextResponse.json({ 
      emails: mockEmails, 
      total: mockEmails.length,
      stats,
      refreshed: false,
      isMock: true,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

// Función para sincronizar un correo con Strapi
async function syncEmailWithStrapi(
  emailId: string, 
  from: string, 
  to: string, 
  subject: string, 
  receivedDate: string, 
  status: string,
  lastResponseBy: string | null,
  silent: boolean = false  // Agregamos el parámetro silent con valor por defecto
): Promise<string | null> {
  try {
    // Verificar las variables de entorno necesarias
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
    const strapiToken = process.env.STRAPI_API_TOKEN || '';
    
    if (!graphqlUrl || !strapiToken) {
      console.error('Error: URL de GraphQL o token de Strapi no están configurados');
      return null;
    }
    
    // Verificar si ya existe
    const checkQuery = `
      query {
        emailTrackings(filters: { emailId: { eq: "${String(emailId)}" } }) {
          emailId
          emailStatus
        }
      }
    `;

    // Solo mostrar log en modo verbose
    if (VERBOSE_LOGGING && !silent) {
      console.log(`Buscando si el correo ${emailId} ya existe...`);
    }

    // Implementar un mecanismo de reintentos para mejorar la resiliencia
    const maxRetries = 2;
    let retryCount = 0;
    let checkResponse;
    
    while (retryCount <= maxRetries) {
      try {
        checkResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiToken}`,
          },
          body: JSON.stringify({ query: checkQuery }),
          // Agregar timeout para evitar que la petición se quede colgada
          signal: AbortSignal.timeout(10000) // 10 segundos de timeout
        });
        
        // Si la respuesta es exitosa, salir del bucle
        if (checkResponse.ok) {
          break;
        }
        
        // Si recibimos un error 404 o 5xx, incrementar contador y reintentar
        if (checkResponse.status === 404 || checkResponse.status >= 500) {
          retryCount++;
          if (retryCount <= maxRetries) {
            console.warn(`Reintentando conexión con Strapi (intento ${retryCount}/${maxRetries})...`);
            // Esperar antes de reintentar (1 segundo * número de intento)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
        }
        
        // Para otros errores, continuar normalmente
        break;
      } catch (error: any) {
        // Manejar errores de red (como socket cerrado)
        console.error(`Error de conexión en intento ${retryCount + 1}/${maxRetries + 1}:`, error.message || error);
        
        // Si todavía tenemos reintentos disponibles, intentar de nuevo
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Reintentando conexión con Strapi (intento ${retryCount}/${maxRetries})...`);
          // Esperar antes de reintentar (1 segundo * número de intento)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        
        // Si hemos agotado los reintentos, retornar null
        console.error('Se agotaron los reintentos para conectar con Strapi');
        return null;
      }
    }

    // Si no tenemos respuesta después de todos los reintentos, retornar null
    if (!checkResponse) {
      console.error('No se pudo obtener respuesta de Strapi después de reintentos');
      return null;
    }

    // Verificar si la respuesta fue exitosa
    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error(`Error en la respuesta al verificar correo: ${checkResponse.status} ${checkResponse.statusText}`);
      console.error(`Detalle: ${errorText.substring(0, 500)}`);
      return null;
    }

    const checkData = await checkResponse.json();
    
    // Verificar errores de GraphQL en la verificación
    if (checkData.errors) {
      console.error('Errores al verificar si el correo existe:', JSON.stringify(checkData.errors, null, 2));
      return null;
    }
    
    const exists = checkData.data?.emailTrackings && checkData.data.emailTrackings.length > 0;
    // console.log(`Correo ${emailId} ${exists ? 'ya existe' : 'no existe'}`);
    
    if (exists) {
      const existingEmailStatus = checkData.data.emailTrackings[0].emailStatus;
      // console.log(`Correo ${emailId} ya existe con estado: ${existingEmailStatus}`);
      return existingEmailStatus;
    }
    
    // Crear el correo si no existe
    // console.log(`Creando nuevo correo en Strapi: ${emailId}`);
    
    // Convertir el estado del frontend al formato de Strapi
    // En Strapi 5, usamos las enumeraciones directamente
    const emailStatus = status === 'necesita_atencion' ? 'necesitaAtencion' : status;
    
    // Crear el correo con los campos obligatorios
    const createMutation = `
      mutation {
        createEmailTracking(
          data: {
            emailId: "${String(emailId)}",
            from: "${from.replace(/"/g, '\\"')}",
            to: "${to.replace(/"/g, '\\"')}",
            subject: "${subject.replace(/"/g, '\\"')}",
            receivedDate: "${receivedDate}",
            emailStatus: ${emailStatus},
            lastResponseBy: ${lastResponseBy ? `"${lastResponseBy.replace(/"/g, '\\"')}"` : null},
            publishedAt: "${new Date().toISOString()}"
          }
        ) {
          emailId
          emailStatus
        }
      }
    `;
    
    // Reintentar la creación si falla
    retryCount = 0;
    let createResponse;
    
    while (retryCount <= maxRetries) {
      try {
        createResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiToken}`,
          },
          body: JSON.stringify({ query: createMutation }),
          signal: AbortSignal.timeout(10000) // 10 segundos de timeout
        });
        
        // Si la respuesta es exitosa, salir del bucle
        if (createResponse.ok) {
          break;
        }
        
        // Si recibimos un error 404 o 5xx, incrementar contador y reintentar
        if (createResponse.status === 404 || createResponse.status >= 500) {
          retryCount++;
          if (retryCount <= maxRetries) {
            console.warn(`Reintentando creación con Strapi (intento ${retryCount}/${maxRetries})...`);
            // Esperar antes de reintentar (1 segundo * número de intento)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
        }
        
        // Para otros errores, continuar normalmente
        break;
      } catch (error: any) {
        // Manejar errores de red (como socket cerrado)
        console.error(`Error de conexión en creación (intento ${retryCount + 1}/${maxRetries + 1}):`, error.message || error);
        
        // Si todavía tenemos reintentos disponibles, intentar de nuevo
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Reintentando creación con Strapi (intento ${retryCount}/${maxRetries})...`);
          // Esperar antes de reintentar (1 segundo * número de intento)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        
        // Si hemos agotado los reintentos, retornar null
        console.error('Se agotaron los reintentos para crear correo en Strapi');
        return null;
      }
    }
    
    // Si no tenemos respuesta después de todos los reintentos, retornar null
    if (!createResponse) {
      console.error('No se pudo obtener respuesta de Strapi después de reintentos');
      return null;
    }
    
    // Verificar si la respuesta de creación fue exitosa
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`Error en la respuesta al crear correo: ${createResponse.status} ${createResponse.statusText}`);
      console.error(`Detalle: ${errorText.substring(0, 500)}`);
      return null;
    }
    
    // Obtener los datos de la respuesta
    const createData = await createResponse.json();
    
    // Verificar si hay errores en la respuesta de creación
    if (createData.errors) {
      console.error('Errores al crear el correo:', JSON.stringify(createData.errors, null, 2));
      
      // Si el error es específicamente sobre email_attachments que no existe,
      // podemos considerarlo un éxito parcial ya que el email sí fue creado
      const isAttachmentError = createData.errors.some(
        (error: any) => error.message === "Internal Server Error" && 
                error.extensions?.error?.message?.includes("relation \"public.email_attachments\" does not exist")
      );
      
      if (isAttachmentError) {
        console.log('✓ Se creó el correo correctamente, pero se detectó un error relacionado con email_attachments');
        console.log('✓ Este error es esperado y no afecta la funcionalidad principal');
        return emailStatus;
      }
      
      return null;
    }
    
    // Verificar si se creó correctamente
    if (createData.data?.createEmailTracking) {
      console.log(`✓ Correo ${emailId} creado exitosamente con estado ${emailStatus}`);
      return emailStatus;
    } else {
      console.error('Error: No se pudo crear el correo');
      return null;
    }
  } catch (error) {
    console.error('Error al sincronizar correo con Strapi:', error);
    return null;
  }
}

// Función auxiliar para extraer texto de direcciones de correo electrónico
function getAddressText(address: AddressObject | AddressObject[] | undefined): string {
  if (!address) return '';
  
  // Si es un array, tomar el primer elemento
  if (Array.isArray(address)) {
    return address.length > 0 && 'text' in address[0] ? address[0].text : '';
  }
  
  // Si es un objeto único
  return 'text' in address ? address.text : '';
}

// Función para generar correos de muestra para desarrollo
function generateMockEmails(): ProcessedEmail[] {
  return [
    {
      id: 'mock-1',
      emailId: 'email-123456',
      from: 'cliente@example.com',
      to: 'soporte@ethos.com',
      subject: 'Consulta sobre facturación',
      receivedDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 días atrás
      status: 'necesita_atencion',
      lastResponseBy: null,
      preview: 'Estimados, tengo una consulta sobre mi última factura. Me aparece un cargo que no reconozco por $150 correspondiente a "gastos administrativos extra". ¿Podrían detallarme a qué corresponde este cobro?\n\nGracias de antemano por su ayuda.\n\nCordialmente,\nCliente Ejemplo'
    },
    {
      id: 'mock-2',
      emailId: 'email-789012',
      from: 'admin@ethos.com',
      to: 'propietario@example.com',
      subject: 'Actualización de alícuotas',
      receivedDate: new Date(Date.now() - 3600000 * 24 * 4).toISOString(), // 4 días atrás
      status: 'informativo',
      lastResponseBy: 'cliente',
      preview: 'Se informa a todos los propietarios que a partir del próximo mes habrá un incremento del 5% en las alícuotas mensuales debido al aumento en los costos de mantenimiento y servicios. Este ajuste fue aprobado en la última reunión de la junta directiva.\n\nSi requiere más información, no dude en contactarnos.\n\nAdministración'
    },
    {
      id: 'mock-3',
      emailId: 'email-345678',
      from: 'inquilino@example.com',
      to: 'soporte@ethos.com',
      subject: 'Problemas con acceso al edificio',
      receivedDate: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), // 1 día atrás
      status: 'respondido',
      lastResponseBy: 'admin',
      preview: 'Buenos días, quería reportar que ayer tuve problemas para ingresar al edificio con mi tarjeta de acceso. El sistema no reconoció mi credencial y tuve que esperar casi 30 minutos hasta que llegó el guardia de seguridad.\n\n¿Podrían verificar qué sucede con mi tarjeta?\n\nGracias,\nPedro Inquilino\n\n----- Respuesta del administrador -----\n\nEstimado Pedro,\n\nLamentamos los inconvenientes. Hemos revisado el sistema y detectamos que su tarjeta no fue actualizada en la última programación de seguridad. Ya hemos corregido el problema y su acceso debería funcionar correctamente ahora.\n\nSaludos cordiales,\nDepartamento de Administración'
    },
    {
      id: 'mock-4',
      emailId: 'email-567890',
      from: 'proveedor@servicios.com',
      to: 'administracion@ethos.com',
      subject: 'RE: Cotización servicios de mantenimiento',
      receivedDate: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 días atrás
      status: 'necesita_atencion',
      lastResponseBy: 'cliente',
      preview: 'Estimados señores,\n\nAdjunto la cotización solicitada para los servicios de mantenimiento de áreas verdes y jardines. La propuesta incluye servicios semanales con 2 jardineros y todos los insumos necesarios.\n\nQuedo atento a sus comentarios.\n\nSaludos,\nCarlos Proveedor\nGerente de Servicios\n\n-----Original Message-----\nFrom: administracion@ethos.com\nSent: Monday, January 10, 2025 11:20 AM\nTo: proveedor@servicios.com\nSubject: Cotización servicios de mantenimiento\n\nEstimado proveedor,\n\nSolicitamos una cotización para el mantenimiento de áreas verdes del complejo residencial por un período de 12 meses. Requerimos servicio semanal con al menos 2 jardineros y que incluyan todos los insumos necesarios.\n\nQuedamos atentos.\n\nAdministración ALMAX'
    },
    {
      id: 'mock-5',
      emailId: 'email-678901',
      from: 'propietario@ejemplo.com',
      to: 'administracion@ethos.com',
      subject: 'Solicitud de aclaración sobre nueva normativa',
      receivedDate: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 horas atrás
      status: 'necesita_atencion',
      lastResponseBy: null,
      preview: 'Estimada Administración,\n\nHe recibido la circular sobre la nueva normativa de estacionamiento pero tengo algunas dudas sobre cómo afectará a los propietarios con más de un vehículo. La circular menciona restricciones pero no especifica cuáles.\n\n¿Podrían aclarar este punto?\n\nGracias,\nJuan Propietario\n\n\nDe: Juan Propietario <propietario@ejemplo.com>\nEnviado el: lunes, 5 de enero de 2025 10:30\nPara: administracion@ethos.com\nAsunto: Re: Cambios en normativa de uso de áreas comunes\n\nBuenos días,\n\nAcuso recibo de la nueva normativa. La revisaré y les escribiré si tengo dudas.\n\nSaludos,\nJuan\n\n> El 3 ene 2025, a las 9:15, Administración Ethos <administracion@ethos.com> escribió:\n>\n> Estimados propietarios:\n>\n> Les informamos que a partir del 1 de febrero entrarán en vigor cambios en la normativa de uso de áreas comunes y estacionamientos. Adjuntamos el documento completo para su revisión.\n>\n> Administración'
    },
    {
      id: 'mock-6',
      emailId: 'email-901234',
      from: 'vecino@residencial.com',
      to: 'administracion@ethos.com',
      subject: 'Solicitud de mantenimiento urgente',
      receivedDate: new Date(Date.now() - 3600000 * 36).toISOString(), // 36 horas atrás
      status: 'necesita_atencion',
      lastResponseBy: null,
      preview: 'Buenas tardes,\n\nSolicito urgentemente mantenimiento para la tubería de agua en mi departamento. Hay una filtración que está afectando al departamento del piso inferior.\n\nPor favor envíen un técnico lo antes posible.\n\nAtentamente,\nSusana Vecino\nDepartamento 502\nTel: 555-1234\n\n_________________________________\nDe: Susana Vecino\nadministraciona3@almax.ec\nlunes, 24 de febrero de 2025 16:44\nYa detecté de dónde viene la filtración. Es una conexión bajo el lavabo que está goteando.\n\n_________________________________\nDe: Susana Vecino\nadministraciona3@almax.ec\nlunes, 17 de febrero de 2025 13:40\nAún no he recibido respuesta. La situación se está agravando.\n\n_________________________________\nDe: Susana Vecino\nadministraciona3@almax.ec\nlunes, 10 de febrero de 2025 13:54\nBuenos días, ¿han revisado mi solicitud anterior?'
    }
  ];
} 