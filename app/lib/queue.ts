import { Redis } from '@upstash/redis';
import { Queue } from '@upstash/queue';

// Configuración de Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

// Necesario debido a conflictos de tipos entre versiones diferentes de @upstash/redis
// Estamos utilizando cualquier (any) aquí porque Queue espera una instancia Redis específica
// de su propia dependencia interna
const redisInstance = redis as any;

// Cola para procesamiento de correos
export const emailQueue = new Queue({
  redis: redisInstance,
  queueName: 'ethos:emails:queue',
  concurrencyLimit: 5, // Procesar hasta 5 correos a la vez
  visibilityTimeout: 300000, // 5 minutos para procesar antes de reintentar
});

// Cola para procesamiento de adjuntos
export const attachmentQueue = new Queue({
  redis: redisInstance,
  queueName: 'ethos:attachments:queue',
  concurrencyLimit: 3, // Procesar hasta 3 adjuntos a la vez
  visibilityTimeout: 600000, // 10 minutos para procesar antes de reintentar
}); 