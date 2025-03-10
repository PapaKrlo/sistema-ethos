// Definiciones de tipos para funciones del procesador
type ProcessQueueFunction = () => Promise<void>;

// Se definirán al cargar el módulo
let processEmailQueue: ProcessQueueFunction;
let processAttachmentQueue: ProcessQueueFunction;

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

/**
 * Función principal que procesa ambas colas repetidamente
 */
async function runWorker() {
  console.log('Iniciando worker de procesamiento de emails...');
  console.log(`Configuración: max_iterations=${MAX_ITERATIONS}, interval=${WORKER_INTERVAL_MS}ms`);
  
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
      // Procesar ambas colas
      await processEmailQueue();
      await processAttachmentQueue();
      
      // Esperar antes de la siguiente iteración para no sobrecargar el sistema
      await new Promise(resolve => setTimeout(resolve, WORKER_INTERVAL_MS));
      
    } catch (error) {
      console.error('Error en worker de emails:', error);
      
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

// Si este script se ejecuta directamente (no importado como módulo)
if (require.main === module) {
  try {
    // Cargar el procesador dinámicamente para evitar problemas de sintaxis de importación
    const processor = require('./email-processor');
    
    // Asignar las funciones importadas
    processEmailQueue = processor.processEmailQueue;
    processAttachmentQueue = processor.processAttachmentQueue;
    
    // Iniciar worker
    runWorker()
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
    process.exit(1);
  }
}

// Para uso como módulo en ESM
export { runWorker }; 