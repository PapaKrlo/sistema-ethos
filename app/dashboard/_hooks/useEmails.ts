import { useState, useEffect, useCallback, useRef } from 'react';

// Cola de actualizaciones pendientes para evitar condiciones de carrera
interface UpdateQueueItem {
  emailId: string;
  updates: Partial<Email>;
  timestamp: number;
}

// Definir tipos
export interface Email {
  id: string;
  documentId?: string;
  emailId: string;
  from: string;
  subject: string;
  receivedDate: string;
  status: "necesitaAtencion" | "informativo" | "respondido";
  lastResponseBy?: "cliente" | "admin" | null;
  preview: string;
}

interface EmailResponse {
  emails: Email[];
  stats: {
    necesitaAtencion: number;
    informativo: number;
    respondido: number;
  };
}

interface UseEmailsOptions {
  refreshInterval?: number | undefined; // tiempo en ms para refresco automático, undefined para desactivar
  shouldFetchOnMount?: boolean; // si debería hacer fetch automáticamente al montar
  revalidateOnFocus?: boolean; // si debería revalidar cuando la ventana recupera el foco
  dedupingInterval?: number; // intervalo para evitar peticiones duplicadas
}

export function useEmails(options: UseEmailsOptions = {}) {
  const { 
    shouldFetchOnMount = true,
    refreshInterval = undefined,
    revalidateOnFocus = false, 
  } = options;
  
  // Estados para los emails y estadísticas
  const [data, setData] = useState<EmailResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Referencia para controlar peticiones en vuelo
  const fetchInProgressRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const minFetchIntervalMs = 10000; // Mínimo 10 segundos entre peticiones (aumentado de 5 segundos)
  const debounceUpdateMs = 50; // Esperar 50ms antes de aplicar actualizaciones para agruparlas
  
  // Referencia para la cola de actualizaciones
  const updateQueueRef = useRef<UpdateQueueItem[]>([]);
  
  // Cargar la cola de actualizaciones desde localStorage al iniciar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedQueue = localStorage.getItem('emailUpdateQueue');
        if (savedQueue) {
          const parsedQueue = JSON.parse(savedQueue) as UpdateQueueItem[];
          
          // Solo restaurar las actualizaciones si son válidas
          if (Array.isArray(parsedQueue) && parsedQueue.length > 0) {
            console.log(`📂 Cargados ${parsedQueue.length} elementos de la cola desde localStorage`);
            updateQueueRef.current = parsedQueue;
          }
        }
      } catch (error) {
        console.error('Error al cargar cola desde localStorage:', error);
      }
    }
  }, []);
  
  // Función para obtener emails del servidor
  const fetchEmails = useCallback(async (refresh = false) => {
    // Log para debuggear las llamadas a fetchEmails
    console.log(`📩 fetchEmails llamado con refresh=${refresh}. Actualizaciones pendientes: ${updateQueueRef.current.length}`);
    
    // Evitar múltiples peticiones simultáneas
    if (fetchInProgressRef.current) {
      console.log("⚠️ fetchEmails: Ya hay una petición en curso, ignorando");
      return;
    }
    
    // Comprobar frecuencia mínima entre peticiones
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    if (timeSinceLastFetch < minFetchIntervalMs) {
      console.log(`⏱️ fetchEmails: Demasiadas peticiones. Espera ${Math.ceil((minFetchIntervalMs - timeSinceLastFetch) / 1000)} segundos.`);
      return;
    }
    
    // Marcar inicio de petición y actualizar tiempo
    fetchInProgressRef.current = true;
    lastFetchTimeRef.current = now;
    
    const url = refresh ? '/api/emails/fetch?refresh=true' : '/api/emails/fetch';
    const maxRetries = 2; // Número máximo de reintentos
    let retryCount = 0;
    
    const attemptFetch = async () => {
      try {
        const isInitialFetch = !data;
        if (isInitialFetch) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        
        // Intentar usar la API con caché primero
        const response = await fetch('/api/emails/fetch', {
          cache: 'no-store',  // Asegurar que no usamos caché del navegador
          headers: {
            'x-no-auto-refetch': 'true' // Indicar al servidor que esta es una petición manual
          }
        });
        
        if (!response.ok) {
          // Si es un error y se solicitó refresh, intentar con refresh explícito
          if (refresh) {
            console.log("Intentando con parámetro refresh explícito");
            const refreshResponse = await fetch('/api/emails/fetch?refresh=true', {
              cache: 'no-store',
              headers: {
                'x-no-auto-refetch': 'true'
              }
            });
            
            if (refreshResponse.ok) {
              const responseData = await refreshResponse.json();
              setData(responseData);
              setError(null);
              return;
            }
          }
          
          // Si es un 404, intentar usar datos en caché si están disponibles
          if (response.status === 404 && data) {
            console.log("Error 404, utilizando datos en caché");
            // No actualizamos los datos pero tampoco mostramos error al usuario
            return;
          }
          
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        
        if (responseData.error) {
          throw new Error(responseData.error);
        }
        
        // Evitar actualizaciones si no hay cambios reales
        const hasChanges = !data || 
          JSON.stringify(data.stats) !== JSON.stringify(responseData.stats) ||
          data.emails.length !== responseData.emails.length;
          
        if (hasChanges) {
          console.log("📊 Se detectaron cambios en los datos, actualizando estado");
          setData(responseData);
        } else {
          console.log("🔄 No hay cambios significativos en los datos, evitando re-render");
        }
        
        setError(null);
      } catch (err: any) {
        console.error(`Error al obtener emails (intento ${retryCount + 1}/${maxRetries + 1}):`, err);
        
        // Si aún no hemos alcanzado el máximo de reintentos, intentamos de nuevo
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Reintentando conexión (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo antes de reintentar
          return attemptFetch(); // Llamada recursiva
        }
        
        // Si ya agotamos los reintentos, propagamos el error
        // Pero si tenemos datos previos, seguimos usándolos
        if (data) {
          console.log("Usando datos en caché tras error persistente");
          // Mostrar notificación de error al usuario
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('showNotification', {
              detail: {
                type: 'warning',
                title: 'Advertencia',
                message: 'No se pudieron obtener correos nuevos. Usando datos en caché.'
              }
            });
            window.dispatchEvent(event);
          }
        } else {
          setError(err);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        // Marcar fin de petición
        fetchInProgressRef.current = false;
      }
    };
    
    await attemptFetch();
  }, [data]);
  
  // Cargar emails al montar el componente (solo una vez)
  useEffect(() => {
    if (shouldFetchOnMount) {
      fetchEmails();
    }
    
    // Función de limpieza que se ejecuta al desmontar
    return () => {
      // Limpiar cualquier petición pendiente
      fetchInProgressRef.current = false;
    };
  }, [shouldFetchOnMount, fetchEmails]);
  
  // Configurar refresco automático si está habilitado (desactivado por defecto)
  useEffect(() => {
    // Deshabilitamos esta característica para evitar el bucle de refetches
    if (refreshInterval && refreshInterval > 0) {
      console.log(`⏱️ Configurando refresco automático cada ${refreshInterval / 1000} segundos`);
      
      const intervalId = setInterval(() => {
        if (!fetchInProgressRef.current) {
          console.log("🔄 Refrescando automáticamente emails...");
          fetchEmails(true);
        } else {
          console.log("⚠️ Omitiendo refresco automático porque hay una petición en curso");
        }
      }, refreshInterval);
      
      return () => {
        console.log("🛑 Limpiando intervalo de refresco automático");
        clearInterval(intervalId);
      };
    }
    
    return undefined;
  }, [refreshInterval, fetchEmails]);
  
  // Configurar revalidación al enfocar la ventana (desactivado por defecto)
  useEffect(() => {
    if (!revalidateOnFocus) return undefined;
    
    const handleFocus = () => {
      // Solo revalidar si ha pasado al menos minFetchIntervalMs desde la última petición
      const now = Date.now();
      if (now - lastFetchTimeRef.current >= minFetchIntervalMs && !fetchInProgressRef.current) {
        console.log("👁️ La ventana recibió foco, refrescando emails...");
        fetchEmails(true);
      } else {
        console.log("⚠️ Omitiendo refresco por foco debido a tiempo mínimo o petición en curso");
      }
    };
    
    console.log("👁️ Configurando revalidación al enfocar la ventana");
    window.addEventListener('focus', handleFocus);
    
    return () => {
      console.log("🛑 Limpiando evento de foco");
      window.removeEventListener('focus', handleFocus);
    };
  }, [revalidateOnFocus, fetchEmails, minFetchIntervalMs]);
  
  // Función para forzar una actualización (refresh) con datos nuevos del servidor
  const refreshEmails = async () => {
    try {
      // Log para debuggear
      console.log(`🔄 refreshEmails llamado. Ruta: ${new Error().stack}`);
      
      // Evitar múltiples peticiones simultáneas
      if (fetchInProgressRef.current) {
        console.log("⚠️ refreshEmails: Ya hay una petición en curso. Ignorando solicitud de refresh.");
        // Mostrar notificación al usuario
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('showNotification', {
            detail: {
              type: 'info',
              title: 'Información',
              message: 'Actualización en progreso, espere un momento'
            }
          });
          window.dispatchEvent(event);
        }
        return data;
      }
      
      // Verificar tiempo mínimo entre peticiones
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;
      if (timeSinceLastFetch < minFetchIntervalMs) {
        console.log(`⏱️ refreshEmails: Demasiado pronto para refrescar. Espere ${Math.ceil((minFetchIntervalMs - timeSinceLastFetch) / 1000)} segundos.`);
        // Mostrar notificación al usuario
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('showNotification', {
            detail: {
              type: 'info',
              title: 'Información',
              message: `Refrescando demasiado rápido, espere ${Math.ceil((minFetchIntervalMs - timeSinceLastFetch) / 1000)} segundos`
            }
          });
          window.dispatchEvent(event);
        }
        return data;
      }
      
      // Forzar un refresh explícito
      console.log("🔄 Iniciando refetch manual forzado");
      await fetchEmails(true);
      
      // Mostrar notificación de éxito si todo salió bien
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showNotification', {
          detail: {
            type: 'success',
            title: 'Actualización completada',
            message: 'Los correos se han actualizado correctamente'
          }
        });
        window.dispatchEvent(event);
      }
      return data;
    } catch (err: any) {
      console.error("Error al refrescar emails:", err);
      // Mostrar notificación de error al usuario
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showNotification', {
          detail: {
            type: 'error',
            title: 'Error',
            message: 'No se pudieron actualizar los correos'
          }
        });
        window.dispatchEvent(event);
      }
      throw err;
    }
  };
  
  // Función para actualizar localmente un email específico (sin hacer fetch)
  const updateEmail = useCallback((emailId: string, updates: Partial<Email>) => {
    console.log(`📝 Agregando actualización a la cola: ${emailId} → ${JSON.stringify(updates)}`);
    
    // Verificar si ya existe una actualización para este correo en la cola
    const existingUpdateIndex = updateQueueRef.current.findIndex(item => item.emailId === emailId);
    
    // Crear el nuevo item de actualización
    const queueItem: UpdateQueueItem = {
      emailId,
      updates,
      timestamp: Date.now()
    };
    
    // Si ya existe, reemplazarlo; si no, añadirlo
    if (existingUpdateIndex !== -1) {
      // Combinar las actualizaciones (la nueva prevalece)
      const existingUpdates = updateQueueRef.current[existingUpdateIndex].updates;
      queueItem.updates = { ...existingUpdates, ...updates };
      updateQueueRef.current[existingUpdateIndex] = queueItem;
      console.log(`🔄 Actualizada entrada existente en la cola para ${emailId}`);
    } else {
      // Añadir nuevo item a la cola
      updateQueueRef.current.push(queueItem);
      console.log(`➕ Nueva entrada añadida a la cola para ${emailId}`);
    }
    
    // Guardar estado de la cola en localStorage para persistencia
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('emailUpdateQueue', JSON.stringify(updateQueueRef.current));
        console.log(`💾 Cola guardada en localStorage con ${updateQueueRef.current.length} elementos`);
      } catch (error) {
        console.error('Error al guardar cola en localStorage:', error);
      }
    }
    
    setData(prevData => {
      if (!prevData) return null;
      
      // Reconstruir la lista aplicando todas las actualizaciones en orden cronológico
      let updatedEmails = [...prevData.emails];
      let updatedStats = { ...prevData.stats };
      
      // Aplicar todas las actualizaciones en la cola
      updateQueueRef.current.forEach(item => {
        const { emailId, updates } = item;
        
        // Buscar el email que se va a actualizar
        const emailIndex = updatedEmails.findIndex(e => e.emailId === emailId);
        if (emailIndex === -1) return; // Email no encontrado
        
        const oldEmail = updatedEmails[emailIndex];
        
        // Crear el email actualizado
        const updatedEmail = { ...oldEmail, ...updates };
        
        // Actualizar el email en la lista
        updatedEmails[emailIndex] = updatedEmail;
        
        // Actualizar estadísticas si cambió el estado
        if (updates.status && oldEmail.status !== updates.status) {
          // Reducir contador del estado anterior
          if (oldEmail.status === "necesitaAtencion") updatedStats.necesitaAtencion--;
          else if (oldEmail.status === "informativo") updatedStats.informativo--;
          else if (oldEmail.status === "respondido") updatedStats.respondido--;
          
          // Aumentar contador del nuevo estado
          if (updates.status === "necesitaAtencion") updatedStats.necesitaAtencion++;
          else if (updates.status === "informativo") updatedStats.informativo++;
          else if (updates.status === "respondido") updatedStats.respondido++;
        }
      });
      
      console.log(`📊 Estado actual de estadísticas: NA=${updatedStats.necesitaAtencion}, INF=${updatedStats.informativo}, RESP=${updatedStats.respondido}`);
      
      // Retornar un nuevo objeto con los datos actualizados
      return { 
        emails: updatedEmails, 
        stats: updatedStats 
      };
    });
  }, []);
  
  // Limpiar la cola de actualizaciones cuando se reciben nuevos datos del servidor
  useEffect(() => {
    if (data) {
      // Solo aplicar esto si hay actualizaciones pendientes y si no estamos en medio de un fetch
      if (updateQueueRef.current.length > 0 && !fetchInProgressRef.current) {
        console.log(`🔄 Reaplicando ${updateQueueRef.current.length} actualizaciones después de obtener nuevos datos`);
        
        // Usar una bandera para evitar el bucle infinito
        const pendingUpdates = [...updateQueueRef.current];
        
        // Limpiar la cola para evitar replicaciones
        // Ya hemos grabado las actualizaciones en el servidor, ahora podemos limpiar la cola
        updateQueueRef.current = [];
        
        // Actualizar el localStorage con la cola vacía
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('emailUpdateQueue', JSON.stringify(updateQueueRef.current));
            console.log(`🧹 Cola limpiada en localStorage después de aplicar actualizaciones`);
          } catch (error) {
            console.error('Error al guardar cola vacía en localStorage:', error);
          }
        }
        
        // Prevenir múltiples actualizaciones rápidas
        setTimeout(() => {
          // Solo si no hay un fetch en progreso
          if (!fetchInProgressRef.current) {
            // Crear una única actualización de estado para todas las modificaciones
            setData(prevData => {
              if (!prevData) return null;
              
              // Copiar datos para modificar
              const updatedEmails = [...prevData.emails];
              const updatedStats = { ...prevData.stats };
              
              // Aplicar todas las actualizaciones pendientes de una vez
              pendingUpdates.forEach(item => {
                const { emailId, updates } = item;
                
                // Verificar si el correo aún existe en los datos actualizados
                const emailIndex = updatedEmails.findIndex(e => e.emailId === emailId);
                if (emailIndex === -1) return;
                
                const oldEmail = updatedEmails[emailIndex];
                updatedEmails[emailIndex] = { ...oldEmail, ...updates };
                
                // Actualizar estadísticas si cambió el estado
                if (updates.status && oldEmail.status !== updates.status) {
                  // Reducir contador del estado anterior
                  if (oldEmail.status === "necesitaAtencion") updatedStats.necesitaAtencion--;
                  else if (oldEmail.status === "informativo") updatedStats.informativo--;
                  else if (oldEmail.status === "respondido") updatedStats.respondido--;
                  
                  // Aumentar contador del nuevo estado
                  if (updates.status === "necesitaAtencion") updatedStats.necesitaAtencion++;
                  else if (updates.status === "informativo") updatedStats.informativo++;
                  else if (updates.status === "respondido") updatedStats.respondido++;
                }
              });
              
              return {
                emails: updatedEmails,
                stats: updatedStats
              };
            });
          }
        }, debounceUpdateMs);
      }
    }
  }, [data]);
  
  // Devolver un objeto con la misma interfaz que tenía con SWR
  return {
    emails: data?.emails || [],
    stats: data?.stats || { necesitaAtencion: 0, informativo: 0, respondido: 0 },
    isLoading,
    isRefreshing,
    error,
    refreshEmails,
    updateEmail
  };
} 