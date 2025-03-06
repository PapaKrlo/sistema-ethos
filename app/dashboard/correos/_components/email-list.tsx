"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../_components/ui/table";
import { Button } from "../../../_components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Info, MessageSquare, ArrowDown, ArrowUp, CheckCheck, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../_components/ui/tooltip";
import React from "react";

interface Email {
  id: string;
  emailId: string;
  from: string;
  subject: string;
  preview: string;
  receivedDate: string;
  status: "necesitaAtencion" | "informativo" | "respondido";
  lastResponseBy?: "cliente" | "admin" | null;
}

interface EmailListProps {
  emails: Email[];
  onOpenEmail: (email: Email) => void;
  onMarkAsInformative?: (emailId: string) => void;
  onMarkAsResponded?: (emailId: string) => void;
  onUpdateStatus?: (emailId: string, status: "necesitaAtencion" | "informativo" | "respondido") => void;
  emptyMessage?: string;
  showInformativeButton?: boolean;
  sortOrder?: "asc" | "desc";
  onChangeSortOrder?: (order: "asc" | "desc") => void;
}

export function EmailList({
  emails,
  onOpenEmail,
  onMarkAsInformative,
  onMarkAsResponded,
  onUpdateStatus,
  emptyMessage,
  showInformativeButton,
  sortOrder,
  onChangeSortOrder
}: EmailListProps) {
  // Referencia para controlar renderizados
  const renderCountRef = React.useRef<{[key: string]: number}>({});
  
  // Formatear fecha relativa (ej: "hace 2 horas")
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };
  
  // Formatear fecha con AM/PM
  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'de' yyyy 'a las' h:mm a", { locale: es });
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

  // Alternar el orden de clasificación
  const toggleSortOrder = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    
    // Controlar logs duplicados
    renderCountRef.current['toggleSortOrder'] = (renderCountRef.current['toggleSortOrder'] || 0) + 1;
    if (renderCountRef.current['toggleSortOrder'] % 2 === 1) {
      console.log(`EmailList: Cambiando orden de ${sortOrder} a ${newOrder}`);
    }
    
    // Evitar actualizaciones innecesarias por re-renders
    if (newOrder !== sortOrder && onChangeSortOrder) {
      onChangeSortOrder(newOrder);
    }
  };

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Remitente</TableHead>
            <TableHead>Asunto</TableHead>
            <TableHead 
              className="w-[400px] text-center cursor-pointer hover:bg-slate-50 pr-8" 
              onClick={toggleSortOrder}
            >
              <div className="flex items-center justify-center gap-1">
                Recibido
                {sortOrder === "asc" ? 
                  <ArrowDown className="h-4 w-4" /> : 
                  <ArrowUp className="h-4 w-4" />
                }
              </div>
            </TableHead>
            <TableHead className="text-right w-[180px] pl-8">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => {
            const sender = formatSender(email.from);
            return (
              <TableRow key={email.emailId} className="cursor-pointer hover:bg-slate-50" onClick={() => onOpenEmail(email)}>
                <TableCell className="font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <div className="font-medium">{sender.name}</div>
                        {sender.email && (
                          <div className="text-xs text-gray-500">{sender.email}</div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{email.from}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{email.subject}</span>
                    <span className="text-sm text-gray-500 truncate max-w-md">
                      {email.preview}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500 text-center pr-6">
                  <Tooltip>
                    <TooltipTrigger>
                      {formatRelativeDate(email.receivedDate)}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formatFullDate(email.receivedDate)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right pl-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    {email.status !== "necesitaAtencion" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Cambiamos a necesita_atencion a través de onUpdateStatus
                          if (onUpdateStatus) {
                            onUpdateStatus(email.emailId, "necesitaAtencion");
                          }
                        }}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Atención
                      </Button>
                    )}
                    
                    {email.status !== "respondido" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onMarkAsResponded) {
                            onMarkAsResponded(email.emailId);
                          }
                        }}
                      >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        Respondido
                      </Button>
                    )}
                    
                    {email.status !== "informativo" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onMarkAsInformative) {
                            onMarkAsInformative(email.emailId);
                          }
                        }}
                      >
                        <Info className="h-4 w-4 mr-1" />
                        Informativo
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
} 