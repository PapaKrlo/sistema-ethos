#!/usr/bin/env node

// Este archivo es un puente entre Node.js y nuestro código TypeScript
console.log('Iniciando worker desde el script puente...');

// Requiriendo ts-node para registrar el soporte de TypeScript
try {
  require('ts-node').register({
    project: 'tsconfig.json',
    transpileOnly: true
  });
  
  // Ahora podemos importar nuestro archivo TypeScript
  const processor = require('./email-processor.ts');
  
  console.log('Módulo del procesador cargado correctamente');
  
  // Verificar que las funciones existan
  if (typeof processor.processEmailQueue !== 'function' || 
      typeof processor.processAttachmentQueue !== 'function') {
    console.error('Error: Las funciones del procesador no están disponibles');
    process.exit(1);
  }
  
  // Bucle principal del worker
  async function run() {
    console.log('Iniciando procesamiento de colas...');
    
    let iterations = 0;
    const maxIterations = process.env.WORKER_MAX_ITERATIONS 
      ? parseInt(process.env.WORKER_MAX_ITERATIONS) 
      : 100;
      
    const interval = process.env.WORKER_INTERVAL_MS
      ? parseInt(process.env.WORKER_INTERVAL_MS)
      : 1000;
    
    let shouldContinue = true;
    
    // Manejar señales de terminación
    process.on('SIGINT', () => {
      console.log('Recibida señal SIGINT, finalizando worker...');
      shouldContinue = false;
    });
    
    process.on('SIGTERM', () => {
      console.log('Recibida señal SIGTERM, finalizando worker...');
      shouldContinue = false;
    });
    
    while (shouldContinue && (iterations < maxIterations || maxIterations <= 0)) {
      iterations++;
      
      try {
        // Procesar ambas colas
        await processor.processEmailQueue();
        await processor.processAttachmentQueue();
        
        // Esperar antes de la siguiente iteración
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        console.error('Error en worker de emails:', error);
        
        // Esperar un poco más largo si hay error
        await new Promise(resolve => setTimeout(resolve, interval * 5));
      }
      
      // Mostrar estado cada 10 iteraciones
      if (iterations % 10 === 0) {
        console.log(`Worker ejecutando, iteración ${iterations}`);
      }
    }
    
    console.log(`Worker finalizado después de ${iterations} iteraciones.`);
  }
  
  // Ejecutar el worker
  run()
    .then(() => {
      console.log('Worker completado correctamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error fatal en worker:', error);
      process.exit(1);
    });
    
} catch (error) {
  console.error('Error al inicializar el worker:', error);
  console.error(error.stack);
  process.exit(1);
} 