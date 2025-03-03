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

export default function NotificationProvider() {
  const [notification, setNotification] = useState<NotificationProps | null>(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Función para manejar eventos de notificación
    const handleShowNotification = (event: CustomEvent) => {
      const { type, title, message, duration = 3000 } = event.detail;
      
      // Ocultar cualquier notificación existente primero
      setVisible(false);
      
      // Pequeño delay para permitir la animación de salida
      setTimeout(() => {
        setNotification({ type, title, message });
        setVisible(true);
        
        // Auto ocultar después del tiempo especificado
        setTimeout(() => {
          setVisible(false);
        }, duration);
      }, 100);
    };
    
    // Escuchar el evento personalizado
    window.addEventListener('showNotification', handleShowNotification as EventListener);
    
    return () => {
      window.removeEventListener('showNotification', handleShowNotification as EventListener);
    };
  }, []);
  
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
  
  return (
    <div 
      className={`fixed top-4 right-4 z-50 max-w-sm transform transition-all duration-300 ease-in-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
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
            onClick={() => setVisible(false)}
            className="ml-4 flex-shrink-0 rounded-md p-1 hover:bg-gray-200/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 