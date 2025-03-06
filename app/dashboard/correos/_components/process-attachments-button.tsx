import { useState } from 'react';
import { Button } from '../../../_components/ui/button';
import { Loader2, Paperclip } from 'lucide-react';

interface ProcessAttachmentsButtonProps {
  emailId: string;
}

export function ProcessAttachmentsButton({ emailId }: ProcessAttachmentsButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleProcessAttachments = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/emails/process-attachments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      });
      
      if (!response.ok) {
        throw new Error(`Error al procesar adjuntos: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Mostrar notificación de éxito
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showNotification', {
          detail: {
            type: 'success',
            title: 'Adjuntos procesados',
            message: `Se han procesado ${result.attachments?.length || 0} adjuntos`
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error: any) {
      // Mostrar notificación de error
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showNotification', {
          detail: {
            type: 'error',
            title: 'Error',
            message: error.message || "Ocurrió un error al procesar los adjuntos"
          }
        });
        window.dispatchEvent(event);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-1"
      onClick={handleProcessAttachments}
      disabled={isProcessing}
    >
      <Paperclip className="h-4 w-4" />
      <span>{isProcessing ? 'Procesando...' : 'Procesar adjuntos'}</span>
      {isProcessing && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
    </Button>
  );
} 