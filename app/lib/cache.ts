import { Redis } from '@upstash/redis';

// Configuración de Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

// Prefijos para las claves de caché
const EMAIL_METADATA_PREFIX = 'ethos:email:metadata:';
const EMAIL_COUNT_PREFIX = 'ethos:email:count:';
const EMAIL_LIST_KEY = 'ethos:email:list';

// Tiempo de expiración de caché
const METADATA_TTL = 60 * 60 * 24; // 24 horas
const COUNT_TTL = 60 * 5; // 5 minutos
const LIST_TTL = 60 * 10; // 10 minutos

/**
 * Funciones para caché de metadatos de correos
 */
export const emailCache = {
  /**
   * Almacena metadatos de un correo electrónico en caché
   */
  async setMetadata(emailId: string, metadata: any): Promise<void> {
    await redis.set(
      `${EMAIL_METADATA_PREFIX}${emailId}`, 
      JSON.stringify(metadata),
      { ex: METADATA_TTL }
    );
  },

  /**
   * Obtiene metadatos de un correo electrónico desde caché
   */
  async getMetadata<T = any>(emailId: string): Promise<T | null> {
    const data = await redis.get<string>(`${EMAIL_METADATA_PREFIX}${emailId}`);
    if (!data) return null;
    
    try {
      // Comprobar si ya es un objeto o necesita ser parseado
      return typeof data === 'object' ? data as T : JSON.parse(data) as T;
    } catch (error) {
      console.error('Error al parsear datos de caché:', error);
      return null;
    }
  },

  /**
   * Almacena una lista paginada de correos en caché junto con estadísticas
   */
  async setEmailList(key: string, data: any, page: number = 1, pageSize: number = 20): Promise<void> {
    const cacheKey = `${EMAIL_LIST_KEY}:${key}:${page}:${pageSize}`;
    // Asegurarnos de que siempre sea un string
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    await redis.set(cacheKey, jsonData, { ex: LIST_TTL });
  },

  /**
   * Obtiene una lista paginada de correos desde caché
   */
  async getEmailList<T = any>(key: string, page: number = 1, pageSize: number = 20): Promise<T | null> {
    const cacheKey = `${EMAIL_LIST_KEY}:${key}:${page}:${pageSize}`;
    const data = await redis.get<string>(cacheKey);
    
    if (!data) return null;
    
    try {
      // Comprobar si ya es un objeto o necesita ser parseado
      return typeof data === 'object' ? data as T : JSON.parse(data) as T;
    } catch (error) {
      console.error('Error al parsear lista de correos en caché:', error);
      return null;
    }
  },

  /**
   * Almacena conteos en caché (total de correos, no leídos, etc.)
   */
  async setCount(key: string, count: number): Promise<void> {
    await redis.set(`${EMAIL_COUNT_PREFIX}${key}`, count, { ex: COUNT_TTL });
  },

  /**
   * Obtiene conteos desde caché
   */
  async getCount(key: string): Promise<number | null> {
    return await redis.get<number>(`${EMAIL_COUNT_PREFIX}${key}`);
  },

  /**
   * Invalida todas las entradas de caché relacionadas con listas de correos
   */
  async invalidateEmailLists(): Promise<void> {
    const keys = await redis.keys(`${EMAIL_LIST_KEY}:*`);
    if (keys.length > 0) {
      // Eliminar claves una por una ya que redis.del no acepta arrays en esta versión
      for (const key of keys) {
        await redis.del(key);
      }
    }
  },

  /**
   * Invalida todas las entradas de caché relacionadas con conteos
   */
  async invalidateCounts(): Promise<void> {
    const keys = await redis.keys(`${EMAIL_COUNT_PREFIX}*`);
    if (keys.length > 0) {
      // Eliminar claves una por una ya que redis.del no acepta arrays en esta versión
      for (const key of keys) {
        await redis.del(key);
      }
    }
  },

  /**
   * Establece un valor en la caché con un tiempo de expiración opcional
   * @param key Clave para guardar el valor
   * @param value Valor a guardar
   * @param expirationSeconds Tiempo de expiración en segundos (opcional)
   */
  async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    try {
      if (expirationSeconds) {
        await redis.set(key, value, { ex: expirationSeconds });
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      console.error(`Error al establecer clave ${key} en Redis:`, error);
    }
  },

  /**
   * Obtiene un valor de la caché
   * @param key Clave para obtener el valor
   * @returns El valor almacenado o null si no existe
   */
  async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch (error) {
      console.error(`Error al obtener clave ${key} de Redis:`, error);
      return null;
    }
  },

  /**
   * Elimina un valor de la caché
   * @param key Clave a eliminar
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Error al eliminar clave ${key} de Redis:`, error);
    }
  }
}; 