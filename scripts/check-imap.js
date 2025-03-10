#!/usr/bin/env node

/**
 * Script para comprobar la conexión al servidor IMAP
 * y listar los correos disponibles
 */

// Carga variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');

async function testImapConnection() {
  console.log('Comprobando conexión a servidor IMAP...');
  
  // Verificar variables de entorno requeridas
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 993;
  
  if (!emailUser || !emailPassword || !emailHost) {
    console.error('Error: Faltan credenciales IMAP. Verifica las variables de entorno.');
    process.exit(1);
  }
  
  console.log(`Conectando a ${emailHost}:${emailPort} como ${emailUser}...`);
  
  try {
    // Configuración para conexión IMAP
    const config = {
      imap: {
        user: emailUser,
        password: emailPassword,
        host: emailHost,
        port: emailPort,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000,
        debug: console.log  // Mostrar debug de la conexión
      }
    };
    
    // Conectar al servidor IMAP
    const connection = await Imap.connect(config);
    console.log('Conexión IMAP establecida con éxito!');
    
    // Abrir el buzón 'INBOX'
    await connection.openBox('INBOX');
    console.log('Buzón INBOX abierto. Buscando correos...');
    
    // Buscar los últimos 5 mensajes
    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT'],
      markSeen: false,
      limit: 5
    };
    
    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Se encontraron ${messages.length} mensajes.`);
    
    // Mostrar información de los mensajes
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const headerPart = message.parts.find(part => part.which === 'HEADER');
      const headers = headerPart.body;
      
      console.log(`\nMensaje ${i+1}:`);
      console.log(`UID: ${message.attributes.uid}`);
      console.log(`Asunto: ${headers.subject[0]}`);
      console.log(`De: ${headers.from[0]}`);
      console.log(`Fecha: ${headers.date[0]}`);
      
      // Verificar si tiene adjuntos
      const textPart = message.parts.find(part => part.which === 'TEXT');
      if (textPart) {
        try {
          const parsed = await simpleParser(textPart.body);
          const attachmentsCount = parsed.attachments?.length || 0;
          console.log(`Adjuntos: ${attachmentsCount}`);
          
          if (attachmentsCount > 0) {
            console.log('Lista de adjuntos:');
            parsed.attachments.forEach((att, i) => {
              console.log(`  [${i+1}] ${att.filename} (${att.contentType})`);
            });
          }
        } catch (error) {
          console.error(`Error al parsear el mensaje: ${error.message}`);
        }
      }
    }
    
    // Cerrar la conexión
    connection.end();
    console.log('\nPrueba completada.');
    
  } catch (error) {
    console.error('Error en la conexión IMAP:', error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testImapConnection()
  .then(() => {
    console.log('Fin de la prueba');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  }); 