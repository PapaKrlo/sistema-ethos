import { useState, useEffect, useCallback } from 'react';

// Definir tipos
export interface Email {
  id: string;
  emailId: string;
  from: string;
  subject: string;
  receivedDate: string;
  status: "necesita_atencion" | "informativo" | "respondido";
  lastResponseBy: "cliente" | "admin" | null;
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
  
  // Función para obtener emails del servidor
  const fetchEmails = useCallback(async (refresh = false) => {
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
        
        const response = await fetch(url);
        
        // Si es 404, intentamos con la URL fallback (sin parámetros)
        if (response.status === 404 && refresh) {
          console.log("Error 404, intentando fallback sin parámetros de refresh");
          const fallbackResponse = await fetch('/api/emails/fetch');
          
          if (fallbackResponse.ok) {
            const responseData = await fallbackResponse.json();
            setData(responseData);
            setError(null);
            return;
          }
        }
        
        if (!response.ok) {
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
        
        setData(responseData);
        setError(null);
      } catch (err: any) {
        console.error(`Error al obtener emails (intento ${retryCount + 1}/${maxRetries + 1}):`, err);
        
        // Si aún no hemos alcanzado el máximo de reintentos, intentamos de nuevo
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Reintentando conexión (${retryCount}/${maxRetries})...`);
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
      fetchEmails(true);
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [revalidateOnFocus, fetchEmails]);
  
  // Función para forzar una actualización (refresh) con datos nuevos del servidor
  const refreshEmails = async () => {
    try {
      await fetchEmails(true);
      // Mostrar notificación de éxito si todo salió bien
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showNotification', {
          detail: {
            type: 'success',
            title: 'Actualizado',
            message: 'Bandeja de correos actualizada correctamente'
          }
        });
        window.dispatchEvent(event);
      }
      return data;
    } catch (err) {
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
    setData(prevData => {
      if (!prevData) return null;
      
      // Copia profunda para evitar mutaciones
      const newEmails = prevData.emails.map(email => 
        email.id === emailId ? { ...email, ...updates } : email
      );
      
      // Calcular nuevas estadísticas si se cambia el estado
      let newStats = { ...prevData.stats };
      
      if (updates.status) {
        const oldEmail = prevData.emails.find(e => e.id === emailId);
        if (oldEmail && oldEmail.status !== updates.status) {
          // Reducir contador del estado anterior
          if (oldEmail.status === "necesita_atencion") newStats.necesitaAtencion--;
          else if (oldEmail.status === "informativo") newStats.informativo--;
          else if (oldEmail.status === "respondido") newStats.respondido--;
          
          // Aumentar contador del nuevo estado
          if (updates.status === "necesita_atencion") newStats.necesitaAtencion++;
          else if (updates.status === "informativo") newStats.informativo++;
          else if (updates.status === "respondido") newStats.respondido++;
        }
      }
      
      // Retornar un nuevo objeto con los datos actualizados
      return { 
        emails: newEmails, 
        stats: newStats 
      };
    });
  }, []);
  
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