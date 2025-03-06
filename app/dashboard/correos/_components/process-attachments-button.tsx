'use client';

import { useState } from 'react';
import { Button } from '../../../_components/ui/button';
import { Loader2 } from 'lucide-react';

interface ProcessAttachmentsButtonProps {
  emailId: string;
  isDisabled?: boolean;
  onSuccess?: () => void;
}

export function ProcessAttachmentsButton({ 
  emailId, 
  isDisabled = false,
  onSuccess
}: ProcessAttachmentsButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessAttachments = async () => {
    if (isProcessing || isDisabled) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/emails/process-attachments-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Notificar éxito
      window.dispatchEvent(
        new CustomEvent('notification', {
          detail: {
            type: 'success',
            message: 'Adjuntos procesados correctamente',
          },
        })
      );
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error al procesar adjuntos:', error);
      
      // Notificar error
      window.dispatchEvent(
        new CustomEvent('notification', {
          detail: {
            type: 'error',
            message: 'Error al procesar adjuntos',
          },
        })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      className='mt-3'
      variant="secondary"
      onClick={handleProcessAttachments}
      disabled={isProcessing || isDisabled}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        'Procesar adjuntos'
      )}
    </Button>
  );
} 