#!/usr/bin/env node

/**
 * Este script procesa adjuntos de correos almacenados en Strapi
 * Busca correos que no tienen adjuntos aún, consulta el servidor IMAP
 * para obtener los adjuntos y los sube a UploadThing.
 */

// Carga variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');

// Número máximo de correos a procesar por ejecución
const MAX_EMAILS = process.env.MAX_EMAILS_PER_RUN
  ? parseInt(process.env.MAX_EMAILS_PER_RUN)
  : 20;

// Intervalo entre procesamiento de emails (ms)
const PROCESSING_INTERVAL_MS = process.env.PROCESSING_INTERVAL_MS
  ? parseInt(process.env.PROCESSING_INTERVAL_MS)
  : 1000;

// URL base de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Función principal que procesa adjuntos de correos
 */
async function processAttachments() {
  console.log('Iniciando procesamiento de adjuntos de correos...');
  
  // Estadísticas de procesamiento
  const stats = {
    procesados: 0,
    exito: 0,
    errores: 0,
    adjuntosProcesados: 0,
    adjuntosConError: 0
  };
  
  // Verificar variables de entorno requeridas
  const requiredEnvVars = [
    'STRAPI_API_TOKEN',
    'NEXT_PUBLIC_GRAPHQL_URL', 
    'EMAIL_HOST', 
    'EMAIL_USER', 
    'EMAIL_PASSWORD'
  ];
  
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.error(`Error: Faltan variables de entorno: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  try {
    // Consultar Strapi para obtener correos sin adjuntos
    console.log('Consultando Strapi para obtener correos sin adjuntos...');
    
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
    const strapiToken = process.env.STRAPI_API_TOKEN;
    
    // Consulta GraphQL para obtener correos sin adjuntos o con pocos adjuntos
    const query = `
      query {
        emailTrackings(
          filters: {
            or: [
              { attachments: { size: { eq: 0 } } },
              { attachments: { url: { eq: "" } } }
            ]
          },
          pagination: { limit: ${MAX_EMAILS} }
        ) {
          documentId
          emailId
          attachments {
            name
            url
            size
          }
        }
      }
    `;
    
    const response = await axios.post(
      graphqlUrl,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${strapiToken}`,
        }
      }
    );
    
    if (response.data.errors) {
      console.error('Error en consulta GraphQL:', response.data.errors);
      return;
    }
    
    const emails = response.data.data?.emailTrackings || [];
    console.log(`Encontrados ${emails.length} correos para procesar adjuntos`);
    
    // Mostrar información detallada de los correos encontrados
    emails.forEach(email => {
      const adjuntos = email.attachments || [];
      const urlsVacias = adjuntos.filter(a => !a.url).length;
      console.log(`Email ID: ${email.emailId} - ${adjuntos.length} adjuntos (${urlsVacias} sin URL)`);
    });
    
    // Procesar cada correo
    for (const email of emails) {
      try {
        console.log(`Procesando adjuntos para correo ID: ${email.emailId}`);
        
        // Llamar al endpoint de procesamiento de adjuntos
        const processResponse = await axios.post(
          `${API_BASE_URL}/emails/process-attachments`,
          { emailId: email.emailId },
          { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000 // Aumentamos el timeout a 2 minutos para dar más tiempo
          }
        );
        
        // Verificar estado de la respuesta
        if (processResponse.status === 206) {
          console.log(`⚠️ Adjuntos procesados parcialmente para correo ${email.emailId}`);
          stats.adjuntosConError += processResponse.data.attachments?.filter(a => !a.url).length || 0;
          stats.exito++;
          stats.procesados++;
          stats.adjuntosProcesados += processResponse.data.attachments?.filter(a => a.url).length || 0;
          continue;
        }
        
        const attachmentsCount = processResponse.data.attachments?.length || 0;
        const totalProcessed = processResponse.data.totalProcessed || attachmentsCount;
        
        // Verificamos si hay adjuntos con problemas
        let adjuntosConProblemas = 0;
        if (processResponse.data.attachments) {
          adjuntosConProblemas = processResponse.data.attachments.filter(
            (att) => !att.url || att.url === '' || att.url.includes('example.com')
          ).length;
        }
        
        // Verificar si hay URLs reales
        const adjuntosReales = processResponse.data.attachments?.filter(
          (att) => att.url && att.url.startsWith('http') && !att.url.includes('example.com')
        ).length || 0;
        
        console.log(`✅ Procesados ${attachmentsCount} adjuntos para correo ${email.emailId}`);
        if (adjuntosConProblemas > 0) {
          console.log(`⚠️ Atención: ${adjuntosConProblemas} adjuntos no tienen URL válida después del procesamiento`);
        }
        
        if (adjuntosReales > 0) {
          console.log(`🆗 ${adjuntosReales} adjuntos con URL real para correo ${email.emailId}`);
        } else {
          console.log(`⛔ ¡NO HAY ADJUNTOS CON URL REAL para correo ${email.emailId}!`);
        }
        
        // Actualizar estadísticas
        stats.procesados++;
        stats.exito++;
        stats.adjuntosProcesados += attachmentsCount;
        stats.adjuntosConError += adjuntosConProblemas;
        
        // Esperar entre cada procesamiento para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, PROCESSING_INTERVAL_MS));
        
      } catch (error) {
        console.error(`❌ Error procesando adjuntos para correo ${email.emailId}:`, error.message);
        stats.procesados++;
        stats.errores++;
        
        // Mostrar respuesta del servidor si existe
        if (error.response) {
          console.error('Respuesta del servidor:', {
            status: error.response.status,
            data: error.response.data
          });
        }
      }
    }
    
    console.log('Procesamiento de adjuntos completado');
    
    // Mostrar resumen de estadísticas
    console.log('\n=== RESUMEN DE PROCESAMIENTO ===');
    console.log(`Correos procesados: ${stats.procesados}`);
    console.log(`Correos exitosos: ${stats.exito}`);
    console.log(`Correos con errores: ${stats.errores}`);
    console.log(`Adjuntos procesados: ${stats.adjuntosProcesados}`);
    console.log(`Adjuntos con errores: ${stats.adjuntosConError}`);
    console.log('===============================\n');
    
    return stats;
    
  } catch (error) {
    console.error('Error en el proceso de adjuntos:', error);
    process.exit(1);
  }
}

// Ejecutar el procesamiento
processAttachments()
  .then(() => {
    console.log('Procesamiento completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  }); 