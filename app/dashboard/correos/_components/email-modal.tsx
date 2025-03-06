"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../_components/ui/dialog";
import { Button } from "../../../_components/ui/button";
import { Label } from "../../../_components/ui/label";
import { Textarea } from "../../../_components/ui/textarea";
import { format, parse, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Send, Paperclip, ChevronDown, ChevronUp, File, CheckCheck, Info, AlertCircle, FileIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../_components/ui/accordion";
import { Avatar, AvatarFallback } from "../../../_components/ui/avatar";
import { sanitizeHtml } from "../../../_utils/sanitize-html";
import { Badge } from "../../../_components/ui/badge";
import { AttachmentList } from './attachment-list';
import { ProcessAttachmentsButton } from './process-attachments-button';
import { 
  parseEmailAddress, 
  parseRecipientsList, 
  cleanEmailString, 
  getInitials, 
  formatFileSize 
} from "../../../utils/email-formatters";

interface Email {
  id: string;
  documentId?: string;
  emailId: string;
  from: string;
  subject: string;
  preview: string;
  bodyContent?: string;
  fullContent?: string;
  receivedDate: string;
  status: "necesitaAtencion" | "informativo" | "respondido";
  lastResponseBy?: "cliente" | "admin" | null;
  to?: string;
  attachments?: Attachment[];
}

interface ThreadMessage {
  from: string;
  to: string;
  subject: string;
  date: string;
  content: string;
  id?: string;
  sender?: string;
  email?: string;
}

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  content?: string; // Base64 para imágenes
}

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email;
  onUpdateStatus?: (emailId: string, status: "necesitaAtencion" | "informativo" | "respondido") => Promise<void>;
}

interface AttachmentProps {
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
  }> | null;
}

export function EmailModal({ isOpen, onClose, email, onUpdateStatus }: EmailModalProps) {
  const [showThread, setShowThread] = useState(false);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleanedContent, setCleanedContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Formatear fecha completa con formato de 24 horas
  const formatFullDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d 'de' MMMM 'de' yyyy HH:mm", { locale: es });
    } catch (e) {
      // Si falla el formateo, intentar normalizar el string de fecha
      try {
        // Para fechas en formato "día de mes de año a las HH:MM a.m./p.m."
        const normalizedDate = dateString
          .replace(/a\.\s*m\./i, 'AM')
          .replace(/p\.\s*m\./i, 'PM')
          .replace(/a las/i, '');
        
        // Intentar parsear con diferentes formatos
        const possibleDate = parse(normalizedDate, "d 'de' MMMM 'de' yyyy HH:mm", new Date(), { locale: es }) ||
                            parse(normalizedDate, "d 'de' MMMM 'de' yyyy h:mm a", new Date(), { locale: es });
        
        if (possibleDate && !isNaN(possibleDate.getTime())) {
          return format(possibleDate, "d 'de' MMMM 'de' yyyy HH:mm", { locale: es });
        }
      } catch (innerError) {
        console.error("Error al parsear fecha normalizada:", innerError);
      }
      
      // Si todo falla, mostrar la fecha original
      return dateString;
    }
  };
  
  // Reemplazamos la función formatSender por la utilidad parseEmailAddress
  
  // Reemplazamos la función formatRecipients para usar la nueva utilidad
  const displayRecipients = (recipients?: string) => {
    if (!recipients) return 'Sin destinatarios';
    
    // Usamos la utilidad para obtener una lista limpia de destinatarios
    const recipientList = parseRecipientsList(recipients);
    
    // Si hay muchos destinatarios, mostrar un resumen
    if (recipientList.length > 3) {
      return `${recipientList[0].name} y ${recipientList.length - 1} más`;
    }
    
    // De lo contrario, mostrar todos los nombres
    return recipientList.map(r => r.name).join(', ');
  };
  
  // La función getInitials ahora es parte de las utilidades
  
  // La función formatFileSize ahora es parte de las utilidades
  
  // Detectar fechas en texto
  const extractDateFromText = (text: string): string | null => {
    // Patrones comunes de fechas en emails
    const datePatterns = [
      /(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo),\s+(\d{1,2})\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\s+(\d{1,2}):(\d{2})/i,
      /(?:enviado el|sent on|date):\s*([^\n<]+)/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
    
    return null;
  };
  
  // Función para calcular similitud entre dos textos
  function calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    // Normalizar los textos
    const normalize = (text: string) => {
      return text.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();
    };
    
    const normalizedText1 = normalize(text1);
    const normalizedText2 = normalize(text2);
    
    // Si el texto es muy corto, no es confiable
    if (normalizedText1.length < 10 || normalizedText2.length < 10) return 0;
    
    // Calcula cuánto del texto1 está contenido en el texto2
    let containedChars = 0;
    const minLength = Math.min(normalizedText1.length, normalizedText2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (normalizedText1.includes(normalizedText2.substring(i, i + 5))) {
        containedChars += 5;
      }
    }
    
    // Devolver porcentaje de similitud
    return containedChars / minLength;
  }

  // Función para parsear los hilos de correos
  function parseThreads(content: string): ThreadMessage[] {
    if (!content) return [];
    
    // Separadores comunes en hilos de correo
    const separators = [
      /^--+\s*Original Message\s*--+$/m,
      /^--+\s*Forwarded Message\s*--+$/m,
      /^On .+ wrote:$/m,
      /^El .+ escribió:$/m,
      /^From:.*\n(?:Sent|Date):.*\nTo:.*\nSubject:.*/m,
    ];
    
    let threads: ThreadMessage[] = [];
    
    // Intentar separar por los separadores comunes
    let remainingContent = content;
    
    for (const separator of separators) {
      const parts = remainingContent.split(separator);
      if (parts.length > 1) {
        // El primer fragmento es el mensaje actual
        remainingContent = parts[0].trim();
        
        // Los fragmentos siguientes son hilos anteriores
        for (let i = 1; i < parts.length; i++) {
          const threadContent = parts[i].trim();
          
          // Intentar extraer remitente y fecha
          const fromMatch = threadContent.match(/^From:\s*(.+?)(?:\n|$)/m);
          const dateMatch = threadContent.match(/^(?:Sent|Date):\s*(.+?)(?:\n|$)/m);
          
          // Si no tiene suficiente contenido o es muy similar al mensaje principal, omitir
          if (threadContent.length < 50 || calculateSimilarity(remainingContent, threadContent) > 0.7) {
            continue;
          }
          
          threads.push({
            id: `thread-${i}`,
            from: fromMatch ? fromMatch[1].trim() : "Desconocido",
            date: dateMatch ? dateMatch[1].trim() : "Fecha desconocida",
            content: threadContent,
            to: "Desconocido",
            subject: "Parte del hilo",
            sender: fromMatch ? fromMatch[1].trim() : "Desconocido"
          });
        }
        
        break; // Si encontramos un separador, no seguimos buscando
      }
    }
    
    // Si no hay separadores o no se encontraron hilos, intentamos dividir por bloques
    if (threads.length === 0) {
      const blocks = content.split(/\n\s*\n\s*\n+/);
      
      if (blocks.length > 1) {
        // El primer bloque es el mensaje actual
        remainingContent = blocks[0].trim();
        
        // Procesar los bloques restantes
        for (let i = 1; i < blocks.length; i++) {
          const blockContent = blocks[i].trim();
          
          // Intentar identificar un formato de remitente
          const senderMatch = blockContent.match(/^([^:]+):(.+?)(?:\n|$)/);
          
          // Si el bloque es muy pequeño o muy similar al principal, omitir
          if (blockContent.length < 50 || calculateSimilarity(remainingContent, blockContent) > 0.7) {
            continue;
          }
          
          threads.push({
            id: `block-${i}`,
            from: senderMatch ? senderMatch[1].trim() : "Desconocido",
            sender: senderMatch ? senderMatch[1].trim() : "Mensaje anterior",
            content: blockContent,
            to: "Desconocido",
            subject: "Parte del hilo",
            date: "Fecha desconocida"
          });
        }
      }
    }
    
    return threads;
  }
  
  // Extraer hilos de conversación del cuerpo del correo
  useEffect(() => {
    if (email?.fullContent) {
      // Limpiamos el contenido con nuestra función de limpieza
      const cleanedFullContent = cleanEmailString(email.fullContent);
      setCleanedContent(cleanedFullContent);
      
      // Parsear los hilos de correo
      try {
        const parsedThreads = parseThreads(cleanedFullContent);
        setThreadMessages(parsedThreads);
      } catch (err) {
        console.error("Error al parsear hilos:", err);
        setThreadMessages([]);
      }
    }
  }, [email]);
  
  const sender = parseEmailAddress(email.from);

  // Función para actualizar el estado de un correo
  const updateEmailStatus = async (emailId: string, status: 'necesitaAtencion' | 'informativo' | 'respondido') => {
    setIsUpdating(true);
    try {
      console.log(`Intentando actualizar correo ${emailId} a estado: ${status}`);
      
      const response = await fetch('/api/emails/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emailId, 
          status,
          skipRefresh: true // Añadir param para evitar el refetch innecesario
        }),
      });

      // Verificar respuesta HTTP
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error HTTP al actualizar estado: ${response.status} - ${response.statusText}`);
        console.error(`Detalle: ${errorText.substring(0, 200)}`);
        throw new Error(`Error al actualizar estado: ${response.status} - ${response.statusText}`);
      }

      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no es JSON:', text.substring(0, 100) + '...');
        throw new Error('La respuesta del servidor no es JSON');
      }

      const data = await response.json();
      
      // Verificar explícitamente si la respuesta indica un error
      if (data.error || data.success === false) {
        const errorMessage = data.message || data.error || 'Error desconocido al actualizar estado';
        console.error('Error en respuesta de API:', errorMessage, data);
        throw new Error(errorMessage);
      }
      
      // Si llegamos aquí y no hay error, consideramos que fue exitoso
      // incluso si no hay un campo success explícito
      console.log('Actualización de estado completada con éxito:', data);

      // Actualizar el estado del correo en la interfaz
      onUpdateStatus?.(emailId, status);
      
      // Cerrar el modal si es necesario
      if (status !== 'necesitaAtencion') {
        onClose();
      }
      
      // Mostrar notificación de éxito
      if (typeof window !== 'undefined') {
        const statusLabel = 
          status === 'necesitaAtencion' ? 'requiere atención' : 
          status === 'informativo' ? 'informativo' : 'respondido';
          
        const event = new CustomEvent('showNotification', {
          detail: {
            type: 'success',
            title: 'Estado actualizado',
            message: `El correo ha sido marcado como "${statusLabel}"`
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error: any) {
      console.error('Error al actualizar estado:', error);
      // Mostrar notificación de error
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showNotification', {
          detail: {
            type: 'error',
            title: 'Error',
            message: error.message || "Ocurrió un error al actualizar el estado del correo"
          }
        });
        window.dispatchEvent(event);
      }
      setIsUpdating(false);
    }
  };

  // Generar una lista de archivos adjuntos simulados para demostración
  // En producción, estos vendrían de la API
  const sampleAttachments: Attachment[] = [
    {
      filename: "factura.pdf",
      contentType: "application/pdf",
      size: 245000
    },
    {
      filename: "imagen.jpg",
      contentType: "image/jpeg",
      size: 1200000
    }
  ];

  // Usar adjuntos desde el email o los de muestra para demostración
  const attachments = email.attachments || (email.subject.toLowerCase().includes("adjunto") ? sampleAttachments : []);

  // Añadir esta función dentro del componente EmailModal
  const processAttachments = async () => {
    try {
      setIsUpdating(true);
      
      const response = await fetch('/api/emails/process-attachments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId: email.emailId }),
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
      setIsUpdating(false);
    }
  };

  // Mostrar los hilos solo si hay mensajes significativos para mostrar
  const hasSignificantThreads = threadMessages.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl">{email.subject}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {formatFullDate(email.receivedDate)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-6">
            <div className="flex items-center mb-1">
              <Avatar className="h-9 w-9 mr-2">
                <AvatarFallback className="bg-blue-500 text-white">
                  {getInitials(parseEmailAddress(email.from).name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {parseEmailAddress(email.from).name}
                </div>
                <div className="text-xs text-gray-500">
                  {parseEmailAddress(email.from).email}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 ml-11 mb-3">
              Para: {displayRecipients(email.to)}
            </div>
            
            {/* Contenido del email */}
            <div className="mt-6 text-sm border rounded-md p-4 bg-gray-50 overflow-auto">
              {cleanedContent && (
                <div
                  className="text-gray-800 prose prose-sm max-w-none"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {cleanedContent}
                </div>
              )}
            </div>
          </div>
          
          {/* Adjuntos */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Adjuntos</h3>
              <AttachmentList attachments={email.attachments.map(att => ({
                id: att.filename || `att-${Math.random().toString(36).substr(2, 9)}`,
                name: att.filename || 'archivo.txt',
                url: att.content || '',
                size: att.size || 0,
                mimeType: att.contentType || 'application/octet-stream'
              }))} />
              
              {email.emailId && (
                <ProcessAttachmentsButton 
                  emailId={email.emailId}
                  isDisabled={isUpdating}
                />
              )}
            </div>
          )}
          
          {/* Sección de correos anteriores (hilos) */}
          {hasSignificantThreads && (
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full text-gray-500 flex items-center justify-center gap-2"
                onClick={() => setShowThread(prev => !prev)}
              >
                {showThread ? (
                  <>Ocultar conversación anterior <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Mostrar conversación anterior <ChevronDown className="h-4 w-4" /></>
                )}
              </Button>
              
              {showThread && (
                <div className="mt-4 border-t pt-4">
                  {threadMessages.map((message, index) => (
                    <div key={index} className="mb-6 last:mb-0">
                      <div className="flex items-center mb-2">
                        <Avatar className="h-7 w-7 mr-2">
                          <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                            {getInitials(message.from || message.sender || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {message.from || message.sender || 'Desconocido'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {message.date || 'Fecha desconocida'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-9 text-xs border rounded-md p-3 bg-gray-50">
                        <div style={{ whiteSpace: 'pre-wrap' }} className="text-gray-700">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer con botones de acción */}
        <DialogFooter className="px-6 py-4 border-t mt-auto shrink-0">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {/* Botones de estado */}
              {email.status !== "necesitaAtencion" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => updateEmailStatus(email.emailId, "necesitaAtencion")}
                  disabled={isUpdating}
                >
                  <AlertCircle className="h-4 w-4" />
                  Marcar para atención
                </Button>
              )}
              {email.status !== "informativo" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => updateEmailStatus(email.emailId, "informativo")}
                  disabled={isUpdating}
                >
                  <Info className="h-4 w-4" />
                  Marcar como informativo
                </Button>
              )}
              {email.status !== "respondido" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => updateEmailStatus(email.emailId, "respondido")}
                  disabled={isUpdating}
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar como respondido
                </Button>
              )}
            </div>
            
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 