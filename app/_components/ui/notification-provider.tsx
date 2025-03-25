import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  Info,
  X
} from "lucide-react";

type NotificationType = "success" | "error" | "info";

interface NotificationProps {
  type: NotificationType;
  title: string;
  message: string;
}

interface CustomNotificationEvent extends CustomEvent {
  detail: {
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
  };
}

export default function NotificationProvider() {
  const [notification, setNotification] = useState<NotificationProps | null>(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Función para manejar eventos de notificación
    const handleShowNotification = (event: Event) => {
      const customEvent = event as CustomNotificationEvent;
      const { type, title, message, duration = 3000 } = customEvent.detail;
      
      // Ocultar cualquier notificación existente primero
      setVisible(false);
      
      // Limpiar cualquier timer existente
      const timerId = window.setTimeout(() => {
        // Configurar la nueva notificación
        setNotification({ type, title, message });
        setVisible(true);
        
        // Auto ocultar después del tiempo especificado
        window.setTimeout(() => {
          setVisible(false);
          
          // Eliminar completamente la notificación después de la transición
          window.setTimeout(() => {
            setNotification(null);
          }, 300); // Esperar a que termine la transición
        }, duration);
      }, notification ? 300 : 0); // Esperar solo si hay una notificación previa
    };
    
    // Escuchar el evento personalizado
    window.addEventListener('showNotification', handleShowNotification);
    
    return () => {
      window.removeEventListener('showNotification', handleShowNotification);
    };
  }, [notification]);
  
  // No renderizar nada si no hay notificación
  if (!notification) return null;
  
  const { type, title, message } = notification;
  
  // Determinar colores y iconos basados en el tipo
  const colors = {
    success: "bg-green-50 border-green-500 text-green-800",
    error: "bg-red-50 border-red-500 text-red-800",
    info: "bg-blue-50 border-blue-500 text-blue-800"
  };
  
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  };
  
  // Función para cerrar manualmente la notificación
  const closeNotification = () => {
    setVisible(false);
    // Eliminar completamente después de la transición
    setTimeout(() => {
      setNotification(null);
    }, 300);
  };
  
  return (
    <div 
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 right-4 z-50 max-w-sm transform transition-all duration-300 ease-in-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <div className={`rounded-lg border p-4 shadow-md ${colors[type]}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">{title}</h3>
            <div className="mt-1 text-sm opacity-90">
              <p>{message}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={closeNotification}
            className="ml-4 flex-shrink-0 rounded-md p-1 hover:bg-gray-200/20"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 