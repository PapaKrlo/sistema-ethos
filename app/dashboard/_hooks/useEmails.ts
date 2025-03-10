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
  const minFetchIntervalMs = 5000; // Mínimo 5 segundos entre peticiones
  
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
          cache: 'no-store'  // Asegurar que no usamos caché del navegador
        });
        
        if (!response.ok) {
          // Si es un error y se solicitó refresh, intentar con refresh explícito
          if (refresh) {
            console.log("Intentando con parámetro refresh explícito");
            const refreshResponse = await fetch('/api/emails/fetch?refresh=true', {
              cache: 'no-store'
            });
            
            if (refreshResponse.ok) {
              const responseData = await refreshResponse.json();
              
              // No reemplazar datos si ya tenemos actualizaciones pendientes
              // que podrían perderse al establecer el nuevo estado
              if (updateQueueRef.current.length > 0) {
                console.log(`⚠️ Se encontraron ${updateQueueRef.current.length} actualizaciones pendientes, guardando datos pero manteniendo las actualizaciones.`);
                // Establecer datos pero después disparar un efecto para reaplicar actualizaciones
                setData(responseData);
              } else {
                setData(responseData);
              }
              
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
        
        // Guardar los datos sin perder actualizaciones pendientes
        if (updateQueueRef.current.length > 0) {
          console.log(`⚠️ Guardando datos del servidor pero manteniendo ${updateQueueRef.current.length} actualizaciones pendientes`);
        }
        
        setData(responseData);
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
  
  // Cargar emails al montar el componente
  useEffect(() => {
    if (shouldFetchOnMount) {
      fetchEmails();
    }
  }, [shouldFetchOnMount, fetchEmails]);
  
  // Configurar refresco automático si está habilitado
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchEmails(true);
      }, refreshInterval);
      
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, fetchEmails]);
  
  // Configurar revalidación al enfocar la ventana
  useEffect(() => {
    if (!revalidateOnFocus) return;
    
    const handleFocus = () => {
      // Solo revalidar si ha pasado al menos minFetchIntervalMs desde la última petición
      const now = Date.now();
      if (now - lastFetchTimeRef.current >= minFetchIntervalMs) {
        fetchEmails(true);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [revalidateOnFocus, fetchEmails]);
  
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
      // En lugar de filtrar por timestamp, vamos a reaplicar TODAS las actualizaciones 
      // sobre los nuevos datos recibidos del servidor
      if (updateQueueRef.current.length > 0) {
        console.log(`🔄 Reaplicando ${updateQueueRef.current.length} actualizaciones después de obtener nuevos datos`);
        
        // Debemos esperar hasta el próximo ciclo para asegurarnos de que los datos se han actualizado
        setTimeout(() => {
          // Crear una copia local para evitar problemas si la cola cambia durante el procesamiento
          const pendingUpdates = [...updateQueueRef.current];
          
          // Procesar cada actualización y actualizar el estado de forma inmediata
          pendingUpdates.forEach(item => {
            const { emailId, updates } = item;
            
            // Verificar si el correo aún existe en los datos actualizados
            const emailExists = data.emails.some(e => e.emailId === emailId);
            if (!emailExists) {
              console.warn(`⚠️ No se encontró el correo ${emailId} en los datos actualizados para reaplicar cambios`);
              return;
            }
            
            console.log(`🔄 Reaplicando actualización para correo ${emailId}: ${JSON.stringify(updates)}`);
            
            // Aplicar la actualización directamente al estado
            setData(prevData => {
              if (!prevData) return null;
              
              // Copiar datos para modificar
              const updatedEmails = [...prevData.emails];
              const updatedStats = { ...prevData.stats };
              
              // Encontrar el correo y actualizarlo
              const emailIndex = updatedEmails.findIndex(e => e.emailId === emailId);
              if (emailIndex === -1) return prevData; // Si no se encuentra, no hacer nada
              
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
              
              // Registrar los nuevos contadores para debug
              console.log(`📊 Contadores actualizados: NA=${updatedStats.necesitaAtencion}, INF=${updatedStats.informativo}, RESP=${updatedStats.respondido}`);
              
              return {
                emails: updatedEmails,
                stats: updatedStats
              };
            });
          });
        }, 10);
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