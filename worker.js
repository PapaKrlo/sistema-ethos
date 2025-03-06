#!/usr/bin/env node

/**
 * Este script inicia un worker para procesar colas de correos electrónicos
 * Utiliza dotenv para cargar variables de entorno
 */

// Carga variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

// Importar axios para hacer llamadas HTTP
const axios = require('axios');

// Número máximo de iteraciones antes de salir
const MAX_ITERATIONS = process.env.WORKER_MAX_ITERATIONS
  ? parseInt(process.env.WORKER_MAX_ITERATIONS)
  : 100;

// Intervalo entre procesamiento de mensajes (ms)
const WORKER_INTERVAL_MS = process.env.WORKER_INTERVAL_MS
  ? parseInt(process.env.WORKER_INTERVAL_MS)
  : 1000;

// Flag para indicar si el worker debe continuar ejecutándose
let shouldContinue = true;

// Definir la URL base de la API de Next.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Función principal que procesa ambas colas repetidamente
 */
async function runWorker() {
  console.log('Iniciando worker de procesamiento de emails...');
  console.log(`Configuración: max_iterations=${MAX_ITERATIONS}, interval=${WORKER_INTERVAL_MS}ms`);
  
  // Revisar variables de entorno requeridas
  const requiredEnvVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN', 
    'EMAIL_HOST', 
    'EMAIL_USER', 
    'EMAIL_PASSWORD'
  ];
  
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.error(`Error: Faltan variables de entorno: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  console.log('Variables de entorno requeridas encontradas');
  
  let iterations = 0;
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('Recibida señal SIGINT, finalizando worker...');
    shouldContinue = false;
  });
  
  process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM, finalizando worker...');
    shouldContinue = false;
  });
  
  // Ejecutar el bucle principal hasta que se alcance el máximo o se reciba una señal
  while (shouldContinue && (iterations < MAX_ITERATIONS || MAX_ITERATIONS <= 0)) {
    iterations++;
    
    try {
      // Procesar emails llamando a la API de fetch
      console.log('Procesando emails...');
      const emailResponse = await axios.get(`${API_BASE_URL}/emails/fetch?worker=true`);
      console.log(`Respuesta del procesamiento de emails: ${emailResponse.status}`);
      
      if (emailResponse.data && emailResponse.data.emails) {
        console.log(`Procesados ${emailResponse.data.emails.length} emails`);
      }
      
      // Esperar antes de la siguiente iteración para no sobrecargar el sistema
      await new Promise(resolve => setTimeout(resolve, WORKER_INTERVAL_MS));
      
    } catch (error) {
      console.error('Error en worker de emails:', error.message);
      
      // Mostrar respuesta del servidor si existe
      if (error.response) {
        console.error('Respuesta del servidor:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      // Esperar un poco más largo si hay error para evitar bucles de error
      await new Promise(resolve => setTimeout(resolve, WORKER_INTERVAL_MS * 5));
    }
    
    // Mostrar estado cada 10 iteraciones
    if (iterations % 10 === 0) {
      console.log(`Worker ejecutando, iteración ${iterations}`);
    }
  }
  
  console.log(`Worker finalizado después de ${iterations} iteraciones.`);
}

// Iniciar el worker
runWorker()
  .then(() => {
    console.log('Worker completado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal en worker:', error);
    process.exit(1);
  }); 