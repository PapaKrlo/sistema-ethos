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
  const [showThread, setShowThread] = useState(true);
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
      } catch (parseError) {
        // Ignorar errores de parseo
      }
      
      return dateString;
    }
  };
  
  // Formatear nombre del remitente
  const formatSender = (from: string) => {
    // Patrón para extraer nombre y email: "Nombre Apellido" <email@ejemplo.com>
    const match = from.match(/"?([^"<]+)"?\s*<?([^>]*)>?/);
    if (match) {
      const name = match[1].trim();
      const email = match[2].trim();
      return { name, email };
    }
    return { name: from, email: '' };
  };

  const formatRecipients = (recipients?: string) => {
    // Formatear múltiples destinatarios
    if (!recipients) return "";
    
    return recipients
      .split(",")
      .map(r => r.replace(/<.*?>/, "").trim())
      .join(", ");
  };

  const getInitials = (name: string) => {
    // Obtener iniciales del nombre
    const cleanName = name.replace(/<.*?>/, "").trim();
    const nameParts = cleanName.split(" ");
    if (nameParts.length === 0) return "?";
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
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
  
  // Funciones auxiliares para procesar contenido de correos
  const parseThreads = (content: string): ThreadMessage[] => {
    // Inicializar el array de mensajes de la conversación
    const thread: ThreadMessage[] = [];
    
    // Si no hay contenido, devolver vacío
    if (!content || content.trim() === '') {
      return thread;
    }
    
    // No aplicar límite al texto del correo para evitar cortar mensajes
    let remainingText = content;
    
    // Patrones que indican el inicio de un mensaje anterior
    const threadSeparators = [
      /De:\s+([^\n]+)\s+Enviado el:\s+([^\n]+)\s+Para:\s+([^\n]+)/i,
      /De:\s+([^\n]+)\s+Enviado:\s+([^\n]+)\s+Para:\s+([^\n]+)/i,
      /From:\s+([^\n]+)\s+Sent:\s+([^\n]+)\s+To:\s+([^\n]+)/i,
      /El\s+([^,]+),\s+([^<]+)\s+<([^>]+)>\s+escribió:/i,
      /On\s+([^,]+),\s+([^<]+)\s+<([^>]+)>\s+wrote:/i,
      />{3,}/,  // Múltiples símbolos ">" indican citas
      /_{5,}/,  // Líneas de guiones bajos (separadores de Outlook)
      /-{5,}/,  // Líneas de guiones (separadores comunes)
      /From: [^\n]+ <[^>]+>\s+Sent: [^\n]+/i,  // Formato Outlook en inglés
      /De: [^\n]+ <[^>]+>\s+Enviado: [^\n]+/i,  // Formato Outlook en español
      /-----Original Message-----/i,  // Mensaje original en inglés
      /-----Mensaje Original-----/i,  // Mensaje original en español
      /El\s+[^,]+,\s+a\s+las?\s+[^,]+,\s+[^\(]+\([^\)]+\)\s+escribió:/i, // Formato Gmail español
      /CC: /i,  // Líneas que comienzan con CC: suelen ser parte de headers
      /De:.*\n/i, // Cualquier línea que comience con "De:"
      /From:.*\n/i, // Cualquier línea que comience con "From:"
      /_{3,}\s*\n/i, // Líneas de guiones bajos con espacios
      /-{3,}\s*\n/i, // Líneas de guiones con espacios
      /\*De:\*/i, // De con asteriscos (negrita)
      /\*Enviado el:\*/i, // Enviado con asteriscos (negrita)
      /\*Para:\*/i, // Para con asteriscos (negrita)
      /_+\s*De:/i, // Línea de guiones seguida de "De:"
      /-+\s*De:/i, // Línea de guiones seguida de "De:"
      /^>+\s*De:/mi, // Línea que empieza con > seguida de "De:"
      /^>+\s*From:/mi, // Línea que empieza con > seguida de "From:"
      /\n-{3,}\n/i, // Línea con guiones separada por saltos de línea
      /\n_{3,}\n/i, // Línea con guiones bajos separada por saltos de línea
      /El .+ escribió:/i // El [fecha] escribió:
    ];
    
    // Buscar las posiciones de los separadores en el texto
    let parts: {position: number, text: string}[] = [];
    
    // Función para extraer las partes basadas en separadores
    const findSeparators = () => {
      for (const pattern of threadSeparators) {
        const matches = Array.from(remainingText.matchAll(new RegExp(pattern, 'gi')));
        for (const match of matches) {
          if (match.index !== undefined) {
            parts.push({
              position: match.index,
              text: match[0]
            });
          }
        }
      }
      return parts.sort((a, b) => a.position - b.position);
    };
    
    // Obtener todas las posiciones de separadores
    const separatorPositions = findSeparators();
    
    // Procesar cada segmento entre separadores
    for (let i = 0; i < separatorPositions.length; i++) {
      const currentPosition = separatorPositions[i].position;
      const nextPosition = i + 1 < separatorPositions.length 
                          ? separatorPositions[i + 1].position 
                          : remainingText.length;
                          
      // Extraer el segmento actual
      const segmentText = remainingText.substring(currentPosition, nextPosition);
      
      // Analizar el encabezado para obtener remitente y fecha
      let sender = "";
      let email = "";
      let date = "";
      
      // Extraer información de remitente
      const fromMatch = segmentText.match(/De:\s+([^\n<]+)(?:<([^>]+)>)?/i) || 
                       segmentText.match(/From:\s+([^\n<]+)(?:<([^>]+)>)?/i) ||
                       segmentText.match(/\*De:\*\s+([^\n<]+)(?:<([^>]+)>)?/i);
                       
      if (fromMatch) {
        sender = fromMatch[1]?.trim() || "";
        email = fromMatch[2]?.trim() || "";
        
        // Si no se encontró email en el formato anterior, buscarlo en otras partes
        if (!email) {
          const emailMatch = segmentText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
          if (emailMatch) {
            email = emailMatch[1];
          }
        }
      }
      
      // Extraer fecha
      const dateMatch = segmentText.match(/Enviado el:\s+([^\n]+)/i) || 
                      segmentText.match(/Enviado:\s+([^\n]+)/i) ||
                      segmentText.match(/\*Enviado el:\*\s+([^\n]+)/i) ||
                      segmentText.match(/\*Enviado:\*\s+([^\n]+)/i) ||
                      segmentText.match(/Sent:\s+([^\n]+)/i) ||
                      segmentText.match(/Date:\s+([^\n]+)/i) ||
                      segmentText.match(/Fecha:\s+([^\n]+)/i);
                      
      if (dateMatch) {
        date = dateMatch[1].trim();
      }
      
      // Extraer el contenido real del mensaje (después del encabezado)
      let content = segmentText;
      
      // Buscar el final del encabezado para extraer solo el contenido
      const headerEndPattern = /^.*(?:Para:|To:|CC:|CCO:|BCC:).*\n/m;
      const headerEndMatch = content.match(headerEndPattern);
      
      if (headerEndMatch && headerEndMatch.index !== undefined) {
        const headerEndPos = headerEndMatch.index + headerEndMatch[0].length;
        content = content.substring(headerEndPos).trim();
      } else {
        // Si no se encuentra el final del encabezado de la forma estándar,
        // buscar otros patrones comunes de encabezados
        const alternativeHeaderEnd = content.search(/^\s*(?:Asunto:|Subject:|Fecha:|Date:|Enviado:|Sent:)/mi);
        if (alternativeHeaderEnd > 0) {
          // Buscamos el final de la línea después del último elemento de encabezado
          const headerEndPos = content.indexOf('\n', alternativeHeaderEnd);
          if (headerEndPos > 0) {
            content = content.substring(headerEndPos + 1).trim();
          }
        }
      }
      
      // Limpieza adicional: eliminar líneas de separación y espacios excesivos
      content = content.replace(/^[\s>_-]*$/gm, ''); // Eliminar líneas que solo contienen separadores
      content = content.replace(/\n{3,}/g, '\n\n'); // Reducir múltiples saltos de línea
      
      // Si tenemos información suficiente del mensaje, agregarlo al hilo
      if (sender || date) {
        thread.push({
          id: `msg-${i}`,
          content: content && content.trim() ? content : "Sin contenido visible en este mensaje",
          date: date || "Fecha desconocida",
          sender: sender || "Remitente desconocido",
          email: email || undefined,
          from: sender || "Desconocido",
          to: "Desconocido",
          subject: "Parte del hilo"
        });
      }
    }
    
    // Si no se encontraron mensajes en el hilo, intentar métodos alternativos
    if (thread.length === 0) {
      // Método alternativo: dividir por líneas que comienzan con "De:" o "From:"
      const simpleThreads = extractSimpleThreads(remainingText);
      if (simpleThreads.length > 0) {
        return simpleThreads;
      }
      
      // Si aún no tenemos hilos, intentar dividir por separadores
      const blockThreads = extractBlockThreads(remainingText);
      if (blockThreads.length > 0) {
        return blockThreads;
      }
    }
    
    return thread;
  };

  // Extraer hilos simples basados en líneas "De:" o "From:"
  const extractSimpleThreads = (text: string): ThreadMessage[] => {
    const thread: ThreadMessage[] = [];
    const lines = text.split('\n');
    let currentMessage = "";
    let currentSender = "";
    let currentDate = "";
    let messageCount = 0;
    let inMessage = false;
    
    for (const line of lines) {
      const deMatch = line.match(/^De:\s+(.+)$/i);
      const fromMatch = line.match(/^From:\s+(.+)$/i);
      const dateMatch = line.match(/^(?:Enviado|Sent)(?:\sel)?:\s+(.+)$/i);
      
      if (deMatch || fromMatch) {
        // Si ya teníamos un mensaje, guardarlo antes de empezar uno nuevo
        if (currentMessage && currentSender) {
          thread.push({
            id: `simple-msg-${messageCount++}`,
            content: currentMessage.trim(),
            date: currentDate || "Fecha desconocida",
            sender: currentSender,
            from: currentSender,
            to: "Desconocido",
            subject: "Parte del hilo"
          });
        }
        
        // Iniciar un nuevo mensaje
        currentSender = (deMatch ? deMatch[1] : fromMatch![1]).trim();
        currentMessage = "";
        currentDate = "";
        inMessage = true;
      } else if (dateMatch && inMessage) {
        currentDate = dateMatch[1].trim();
      } else if (inMessage) {
        // Agregar la línea al mensaje actual
        currentMessage += line + "\n";
      }
    }
    
    // Agregar el último mensaje si existe
    if (currentMessage && currentSender) {
      thread.push({
        id: `simple-msg-${messageCount}`,
        content: cleanMessageContent(currentMessage),
        date: currentDate || "Fecha desconocida",
        sender: currentSender,
        from: currentSender,
        to: "Desconocido",
        subject: "Parte del hilo"
      });
    }
    
    return thread;
  };

  // Extraer hilos basados en bloques separados por líneas de guiones o guiones bajos
  const extractBlockThreads = (text: string): ThreadMessage[] => {
    const thread: ThreadMessage[] = [];
    const blockSeparators = [/-{3,}/g, /_{3,}/g];
    let blocks: string[] = [text];
    
    // Dividir por cada tipo de separador
    for (const separator of blockSeparators) {
      let newBlocks: string[] = [];
      for (const block of blocks) {
        const parts = block.split(separator);
        newBlocks = [...newBlocks, ...parts.filter(p => p.trim().length > 0)];
      }
      if (newBlocks.length > blocks.length) {
        blocks = newBlocks;
      }
    }
    
    // Procesar cada bloque para extraer información
    blocks.forEach((block, index) => {
      if (block.trim()) {
        let blockSender = "";
        let blockDate = "";
        let blockContent = block.trim();
        
        // Intentar extraer sender
        const senderMatch = block.match(/De:\s+([^\n]+)/i) || block.match(/From:\s+([^\n]+)/i);
        if (senderMatch) {
          blockSender = senderMatch[1].trim();
        }
        
        // Intentar extraer fecha
        const dateMatch = block.match(/(?:Enviado|Sent)(?:\sel)?:\s+([^\n]+)/i) || 
                         block.match(/(?:Date|Fecha):\s+([^\n]+)/i);
        if (dateMatch) {
          blockDate = dateMatch[1].trim();
        }
        
        thread.push({
          id: `block-msg-${index}`,
          content: blockContent,
          date: blockDate || "Fecha desconocida",
          sender: blockSender || `Parte ${index + 1} del mensaje`,
          from: blockSender || "Desconocido",
          to: "Desconocido",
          subject: "Parte del hilo"
        });
      }
    });
    
    return thread;
  };

  // Limpiar el contenido del mensaje para mostrar
  const cleanMessageContent = (content: string): string => {
    if (!content) return "";
    
    let cleanedContent = content.trim();
    
    // Eliminar líneas que solo contienen separadores
    cleanedContent = cleanedContent.replace(/^[\s>_-]*$/gm, '');
    
    // Reducir múltiples saltos de línea
    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');
    
    return cleanedContent;
  };
  
  // Extraer hilos de conversación del cuerpo del correo
  useEffect(() => {
    if (email) {
      // Intentar usar fullContent si está disponible, luego bodyContent, y si no preview
      const content = email.fullContent || (email as any).bodyContent || email.preview;
      
      // Procesar y extraer mensajes de la conversación de forma más simple
      const thread = parseThreads(content);
      setThreadMessages(thread);
      
      // Limpiar el contenido para mostrar
      let cleanedContent = cleanMessageContent(content);
      setCleanedContent(cleanedContent);
    }
  }, [email]);
  
  const sender = formatSender(email.from);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{email.subject}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="px-6 py-4 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{email.subject}</h3>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">{sender.name || "Remitente desconocido"}</span>{" "}
                    <span className="text-gray-400">&lt;{sender.email}&gt;</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Para: {formatRecipients(email.to)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {formatFullDate(email.receivedDate)}
                  </p>
                  <div className="flex justify-end gap-1 mt-2">
                    {email.status === "necesitaAtencion" && (
                      <Badge className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">
                        Necesita atención
                      </Badge>
                    )}
                    {email.status === "informativo" && (
                      <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                        Informativo
                      </Badge>
                    )}
                    {email.status === "respondido" && (
                      <Badge className="bg-green-50 text-green-700 hover:bg-green-50">
                        Respondido
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mostrar archivos adjuntos si existen */}
            {attachments.length > 0 ? (
              <div className="mt-4 border-t pt-2">
                <AttachmentList 
                  attachments={attachments.map((attachment: Attachment, index: number) => ({
                    id: `att-${email.id}-${index}`,
                    name: attachment.filename,
                    url: `/api/emails/attachments/${email.id}/${attachment.filename}`,
                    size: attachment.size,
                    mimeType: attachment.contentType || 'application/octet-stream'
                  }))} 
                />
              </div>
            ) : (
              <div className="mt-4 flex justify-end">
                <ProcessAttachmentsButton emailId={email.emailId} />
              </div>
            )}
            
            {/* Contenido del correo electrónico */}
            <div className="px-6 py-4 whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
              {/* Si hay hilos, mostrarlos como conversación */}
              {showThread && ((email as any).bodyContent || email.preview) && parseThreads((email as any).bodyContent || email.preview).length > 1 ? (
                <div className="border rounded-lg border-gray-200 divide-y divide-gray-200 bg-white">
                  {parseThreads((email as any).bodyContent || email.preview).map((thread, index) => {
                    // Determinar si es el mensaje principal o una respuesta/reenvío
                    const isMainMessage = index === 0;
                    const bgClass = isMainMessage ? "bg-white" : "bg-slate-50";
                    const senderFormatted = thread.from ? formatSender(thread.from) : { name: "Desconocido", email: "" };
                    
                    return (
                      <div key={index} className={`p-4 ${bgClass}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-2">
                            <Avatar className="h-8 w-8 mt-0.5">
                              <AvatarFallback>
                                {getInitials(thread.from || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">
                                {senderFormatted.name || senderFormatted.email || "Remitente desconocido"}
                              </p>
                              <div className="text-xs text-gray-500">
                                <p>Para: {thread.to || "Desconocido"}</p>
                                {thread.subject && thread.subject !== email.subject && (
                                  <p>Asunto: {thread.subject}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {thread.date ? formatFullDate(thread.date) : "Fecha desconocida"}
                          </div>
                        </div>
                        
                        <div className="text-sm border-l-2 border-gray-200 pl-3 mt-2">
                          {thread.content && thread.content.trim() ? (
                            <div 
                              className="text-gray-700"
                              dangerouslySetInnerHTML={{ 
                                __html: sanitizeHtml(thread.content
                                  .replace(/\n/g, "<br>")
                                  .replace(/(>+\s*)/g, '<span class="text-gray-500">$1</span>'))
                              }} 
                            />
                          ) : (
                            <p className="text-gray-500 italic">
                              Sin contenido visible en este mensaje
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Mostrar solo el contenido del mensaje principal sin hilos
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml((email as any).bodyContent || cleanedContent)
                      .replace(/\n/g, "<br>")
                      .replace(/(>+\s*)/g, '<span class="text-gray-500">$1</span>')
                  }} 
                />
              )}
            </div>
            
            {/* Mostrar hilos de conversación con mejor parsing */}
            {threadMessages.length > 0 && (
              <div className="mt-4 border-t pt-2">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="thread">
                    <AccordionTrigger className="text-sm font-medium text-gray-500">
                      {loading ? 
                        "Cargando conversación anterior..." : 
                        `Mostrar conversación completa (${threadMessages.length} mensajes)`
                      }
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                        {threadMessages.map((msg, index) => (
                          <div key={`thread-msg-${index}`} className="bg-gray-100 p-3 rounded text-sm mb-3 border border-gray-200">
                            <div className="text-xs space-y-1 text-gray-600 mb-2 font-medium flex justify-between">
                              <div>
                                {msg.sender && <div className="font-medium">{msg.sender}</div>}
                                {msg.email && <div className="text-xs">{msg.email}</div>}
                              </div>
                              {msg.date && <div>{msg.date}</div>}
                            </div>
                            <div className="whitespace-pre-line border-t pt-2 border-gray-300">{msg.content}</div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center py-2 px-6 border-y">
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => setShowThread(!showThread)}
            >
              {showThread ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Ocultar hilos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Mostrar hilos
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between">
          <Button variant="outline" onClick={onClose} className="mr-auto">
            Cancelar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={processAttachments}
            disabled={isUpdating}
          >
            <Paperclip className="h-4 w-4" />
            <span>{isUpdating ? 'Procesando...' : 'Procesar adjuntos'}</span>
            {isUpdating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
          
          <div className="flex justify-end gap-2">
            {email.status !== "necesitaAtencion" && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => updateEmailStatus(email.emailId, 'necesitaAtencion')}
                disabled={isUpdating}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Necesita atención
              </Button>
            )}
            
            {email.status !== "informativo" && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => updateEmailStatus(email.emailId, 'informativo')}
                disabled={isUpdating}
              >
                <Info className="h-4 w-4 mr-1" />
                Informativo
              </Button>
            )}
            
            {(email.status === "necesitaAtencion" || email.status === "informativo") && (
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => updateEmailStatus(email.emailId, 'respondido')}
                disabled={isUpdating}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar como respondido
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 