import { Redis } from '@upstash/redis';

// Configuración de Redis
const redis = new Redis({
  url: process.env.REDIS_URL as string,
  token: process.env.REDIS_TOKEN as string,
});

// TTL predeterminado (30 minutos)
const DEFAULT_TTL = 30 * 60;

// Prefijo para claves de propietarios
const PROPIETARIOS_PREFIX = 'propietarios:';

/**
 * Guarda datos en Redis con una clave específica
 */
export async function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    const cacheKey = `${PROPIETARIOS_PREFIX}${key}`;
    // Convertir a JSON para almacenar metadata junto con los datos
    const cacheData = JSON.stringify({
      data,
      timestamp: Date.now(),
    });
    
    await redis.set(cacheKey, cacheData, { ex: ttl });
  } catch (error) {
    console.error(`Error al guardar en caché: ${error}`);
  }
}

/**
 * Obtiene datos de Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = `${PROPIETARIOS_PREFIX}${key}`;
    const cached = await redis.get<string>(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    // Extraer los datos del objeto almacenado
    const { data } = JSON.parse(cached);
    return data as T;
  } catch (error) {
    console.error(`Error al obtener de caché: ${error}`);
    return null;
  }
}

/**
 * Invalida una clave específica en Redis
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    const cacheKey = `${PROPIETARIOS_PREFIX}${key}`;
    await redis.del(cacheKey);
  } catch (error) {
    console.error(`Error al invalidar caché: ${error}`);
  }
}

/**
 * Invalida todas las claves de propietarios en Redis
 */
export async function invalidateAllPropietariosCache(): Promise<void> {
  try {
    const keys = await redis.keys(`${PROPIETARIOS_PREFIX}*`);
    
    for (const key of keys) {
      await redis.del(key);
    }
  } catch (error) {
    console.error(`Error al invalidar todas las cachés: ${error}`);
  }
} 