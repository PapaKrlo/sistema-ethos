import { NextRequest, NextResponse } from "next/server";
import * as Imap from "imap";
import { simpleParser } from "mailparser";
import * as dotenv from "dotenv";

// Interfaces para tipos
interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions: { rejectUnauthorized: boolean };
  authTimeout: number;
  connTimeout: number; // Añadido tiempo de espera para conexión
}

interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

// Cargar variables de entorno
dotenv.config();

export async function GET(req: NextRequest) {
  // Obtener el ID del correo y el nombre del archivo
  const searchParams = req.nextUrl.searchParams;
  const emailId = searchParams.get('id');
  const filename = searchParams.get('filename');
  const debug = searchParams.get('debug') === 'true';
  
  if (!emailId || !filename) {
    return NextResponse.json(
      { error: "Se requiere el ID del correo y el nombre del archivo" },
      { status: 400 }
    );
  }
  
  // Crear variables locales no anulables
  const safeEmailId: string = emailId;
  const safeFilename: string = filename;
  
  try {
    // Configurar conexión IMAP con tiempos de espera más cortos pero suficientes
    const imapConfig: ImapConfig = {
      user: process.env.EMAIL_USER || 'administraciona3@almax.ec',
      password: process.env.EMAIL_PASSWORD || '',
      host: process.env.EMAIL_HOST || 'pop.telconet.cloud',
      port: Number(process.env.EMAIL_PORT) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000, // Reducir a 10 segundos (era 30000)
      connTimeout: 10000  // Reducir a 10 segundos
    };
    
    console.log("Iniciando descarga de adjunto simplificada:", {
      emailId: safeEmailId,
      filename: safeFilename,
      serverConfig: {
        user: imapConfig.user,
        host: imapConfig.host,
        port: imapConfig.port
      }
    });
    
    // Función simplificada para buscar adjuntos
    const getAttachment = () => {
      return new Promise<EmailAttachment>((resolve, reject) => {
        const imap = new Imap(imapConfig);
        
        // Timeout global más corto
        const globalTimeout = setTimeout(() => {
          try { imap.end(); } catch (e) { }
          reject(new Error("Tiempo de espera agotado (15s)"));
        }, 15000); // Reducir a 15 segundos (era 60000)
        
        // Si ocurre un error, limpiar y rechazar
        const handleError = (err: Error, phase: string) => {
          clearTimeout(globalTimeout);
          try { imap.end(); } catch (e) { }
          reject(new Error(`Error en fase "${phase}": ${err.message}`));
        };
        
        // Evento ready
        imap.once('ready', () => {
          imap.openBox('INBOX', false, (err: Error | null, box: any) => {
            if (err) {
              handleError(err, "abrir_buzon");
              return;
            }
            
            // Simplificar: Buscar directamente ALL para obtener todos los mensajes
            // Esta estrategia es menos eficiente pero más confiable
            imap.search(['ALL'], (err: Error | null, results: number[]) => {
              if (err) {
                handleError(err, "busqueda");
                return;
              }
              
              if (results.length === 0) {
                handleError(new Error('No se encontraron mensajes'), "sin_resultados");
                return;
              }
              
              // Obtener todos los mensajes
              const f = imap.fetch(results, { 
                bodies: '',
                struct: true,
                markSeen: false
              });
              
              let attachment: EmailAttachment | null = null;
              let messagesProcessed = 0;
              const totalMessages = results.length;
              
              // Timeout para la fase de procesamiento de mensajes
              const fetchTimeout = setTimeout(() => {
                handleError(new Error("Tiempo de espera agotado al procesar mensajes"), "procesamiento");
              }, 12000); // 12 segundos para procesar mensajes
              
              f.on('message', (msg: any, seqno: number) => {
                let msgInfo = { uid: "", messageId: "" };
                
                // Verificar UID para identificar correo
                msg.on('attributes', (attrs: any) => {
                  if (attrs && attrs.uid) {
                    msgInfo.uid = attrs.uid.toString();
                  }
                });
                
                msg.on('body', (stream: any, info: any) => {
                  let buffer = '';
                  
                  stream.on('data', (chunk: Buffer) => {
                    buffer += chunk.toString('utf8');
                  });
                  
                  stream.once('end', () => {
                    // Si ya encontramos el adjunto, saltar el procesamiento
                    if (attachment) return;
                    
                    simpleParser(buffer)
                      .then(parsed => {
                        messagesProcessed++;
                        
                        // Actualizar messageId si está disponible
                        if (parsed.messageId) {
                          msgInfo.messageId = parsed.messageId;
                        }
                        
                        // Verificar si es el correo que buscamos
                        const isMatchingEmail = 
                          msgInfo.uid === safeEmailId || 
                          msgInfo.messageId === safeEmailId || 
                          msgInfo.messageId === `<${safeEmailId}>`;
                        
                        // Si es el correo correcto, buscar el adjunto
                        if (isMatchingEmail) {
                          if (parsed.attachments && parsed.attachments.length > 0) {
                            // Buscar adjunto por nombre
                            for (const att of parsed.attachments) {
                              const attFilename = att.filename || '';
                              
                              if (attFilename === safeFilename) {
                                attachment = {
                                  filename: attFilename,
                                  contentType: att.contentType,
                                  content: att.content
                                };
                                break;
                              }
                            }
                          }
                        }
                        
                        // Verificar si hemos terminado de procesar todos los mensajes
                        if (messagesProcessed === totalMessages || attachment) {
                          clearTimeout(fetchTimeout);
                          clearTimeout(globalTimeout);
                          
                          imap.end();
                          
                          if (attachment) {
                            resolve(attachment);
                          } else {
                            reject(new Error(`Adjunto '${safeFilename}' no encontrado en el correo con ID '${safeEmailId}'`));
                          }
                        }
                      })
                      .catch(err => {
                        console.error("Error al parsear correo:", err);
                      });
                  });
                });
              });
              
              f.once('error', (err: Error) => {
                clearTimeout(fetchTimeout);
                handleError(err, "fetch_error");
              });
              
              f.once('end', () => {
                clearTimeout(fetchTimeout);
                
                if (!attachment) {
                  handleError(new Error(`Adjunto '${safeFilename}' no encontrado después de procesar ${messagesProcessed} mensajes`), "sin_adjunto");
                }
              });
            });
          });
        });
        
        imap.once('error', (err: Error) => {
          handleError(err, "imap_error");
        });
        
        imap.connect();
      });
    };
    
    try {
      const attachment = await getAttachment();
      
      // Verificar que el contenido existe y tiene longitud
      if (!attachment.content || !attachment.content.length) {
        return NextResponse.json(
          { error: "Contenido del adjunto vacío o inválido" },
          { status: 500 }
        );
      }
      
      // Enviar el archivo como respuesta con headers optimizados
      return new NextResponse(attachment.content, {
        headers: {
          'Content-Type': attachment.contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
          'Content-Length': attachment.content.length.toString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'X-Content-Type-Options': 'nosniff'
        },
      });
    } catch (error: any) {
      console.error("Error al obtener adjunto:", error.message);
      return NextResponse.json(
        { error: `No se pudo obtener el adjunto: ${error.message || 'Error desconocido'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error general:", error);
    return NextResponse.json(
      { error: `Error al procesar la solicitud: ${error.message || 'Error desconocido'}` },
      { status: 500 }
    );
  }
}