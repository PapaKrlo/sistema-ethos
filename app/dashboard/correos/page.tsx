"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../_lib/auth/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../_components/ui/card";
import { Badge } from "../../_components/ui/badge";
import { Button } from "../../_components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../_components/ui/tabs";
import { Loader2, Mail, AlertTriangle, ListFilter, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { EmailModal } from "./_components/email-modal";
import { EmailList } from "./_components/email-list";
import { EmailStats } from "./_components/email-stats";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../_components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../_components/ui/dropdown-menu";
import { useEmails } from "../_hooks/useEmails";
import type { Email } from "../_hooks/useEmails";

// Opciones de cantidad para mostrar
const displayOptions = [20, 50, 100];

export default function CorreosPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  
  // Usar el hook de emails con SWR
  const { 
    emails, 
    stats, 
    isLoading, 
    isRefreshing, 
    error, 
    refreshEmails, 
    updateEmail 
  } = useEmails({ 
    // Desactivar refresco automático para evitar el efecto "tieso"
    refreshInterval: undefined,
    revalidateOnFocus: false
  });

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("necesita_atencion");
  const [totalEmails, setTotalEmails] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewThreads, setViewThreads] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const renderCountRef = useRef<{[key: string]: number}>({});

  // Verificar si el usuario tiene permisos para ver esta página
  useEffect(() => {
    // Si no hay usuario o no está autorizado, redirigir
    if (user) {
      const isAuthorized = 
        user.email === 'administraciona3@almax.ec' || 
        user.username === 'administraciona3';
      
      if (!isAuthorized) {
        // Redirigir al dashboard si no tiene permisos
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  // Si el usuario no tiene el correo correcto, mostrar mensaje
  if (user && user.email !== 'administraciona3@almax.ec' && user.username !== 'administraciona3') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-4 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acceso restringido</h1>
        <p className="text-gray-600 max-w-md">
          Este módulo solo está disponible para el usuario administrador del correo administraciona3@almax.ec.
        </p>
        <Button 
          className="mt-6" 
          onClick={() => router.push('/dashboard')}
        >
          Volver al dashboard
        </Button>
      </div>
    );
  }

  // Actualizar orden cuando cambia
  const handleSortChange = (value: string) => {
    // Controlar logs duplicados
    renderCountRef.current['handleSortChange'] = (renderCountRef.current['handleSortChange'] || 0) + 1;
    if (renderCountRef.current['handleSortChange'] % 2 === 1) { // Solo mostrar en renders impares
      console.log("Cambiando orden a:", value);
    }
    
    // Comprobar si realmente ha cambiado el orden
    if (value !== sortOrder) {
      // Aplicar el nuevo orden SIN ACTIVAR REFRESHING
      setSortOrder(value as 'newest' | 'oldest');
      
      // La ordenación se maneja solo en el cliente, no necesitamos actualizar desde el servidor
      if (renderCountRef.current['handleSortChange'] % 2 === 1) {
        console.log("Orden actualizado, recalculando correos filtrados...");
      }
    } else {
      if (renderCountRef.current['handleSortChange'] % 2 === 1) {
        console.log("Mismo orden seleccionado, no es necesario actualizar");
      }
    }
  };

  // Efecto para calcular el total de emails
  useEffect(() => {
    setTotalEmails(emails.length);
  }, [emails]);

  // Cambiar el límite de correos mostrados sin recargar
  const handleDisplayLimitChange = (value: string) => {
    setDisplayLimit(Number(value));
  };

  // Optimización: Usar React.useMemo para calcular los correos filtrados
  const filteredEmails = useMemo(() => {
    // Controlar logs duplicados
    renderCountRef.current['filteredEmails'] = (renderCountRef.current['filteredEmails'] || 0) + 1;
    if (renderCountRef.current['filteredEmails'] % 2 === 1) { // Solo mostrar en renderizados impares
      console.log("Recalculando emails filtrados con orden:", sortOrder);
    }
    
    // Primero filtramos por estado
    const filtered = emails.filter((email) => email.status === activeTab);
    
    // Aplicamos el orden directamente en el useMemo
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.receivedDate).getTime();
      const dateB = new Date(b.receivedDate).getTime();
      // Aplicar el criterio de ordenación según sortOrder
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    }).slice(0, displayLimit);
  }, [emails, activeTab, displayLimit, sortOrder]);

  // Optimización: Usar React.useMemo para los hilos de correo
  const emailsToDisplay = useMemo(() => {
    // Controlar logs duplicados
    renderCountRef.current['emailsToDisplay'] = (renderCountRef.current['emailsToDisplay'] || 0) + 1;
    if (renderCountRef.current['emailsToDisplay'] % 2 === 1) { // Solo mostrar en renderizados impares
      console.log("Recalculando hilos de correo");
    }
    
    if (!viewThreads) return filteredEmails;
    
    // Agrupar por asunto (simplificado)
    const threadMap = new Map();
    filteredEmails.forEach(email => {
      const normalizedSubject = email.subject.replace(/^(Re:|RE:|Fwd:|FWD:)\s*/g, '').trim();
      if (!threadMap.has(normalizedSubject)) {
        threadMap.set(normalizedSubject, []);
      }
      threadMap.get(normalizedSubject).push(email);
    });
    
    // Mostrar solo el email más reciente de cada hilo
    return Array.from(threadMap.values())
      .map(thread => thread.sort((a: Email, b: Email) => 
        new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())[0]
      );
  }, [filteredEmails, viewThreads]);

  // Obtener el conteo de emails por categoría de manera optimizada
  const emailCount = useMemo(() => 
    emails.filter(email => email.status === activeTab).length,
  [emails, activeTab]);
  
  // Callback para actualizar la pestaña activa de manera optimizada
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);
  
  // Callback para abrir email optimizado
  const handleOpenEmail = useCallback((email: Email) => {
    setSelectedEmail(email);
    setModalOpen(true);
  }, []);

  // Marcar correo como informativo
  const handleMarkAsInformative = async (emailId: string) => {
    try {
      await fetch(`/api/emails/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          emailId, 
          status: "informativo" 
        }),
      });
      
      // Actualizar estado local
      updateEmail(emailId, { status: "informativo" as const });
      
      // Actualizar estadísticas
      updateEmail(emailId, { lastResponseBy: "admin" });
    } catch (error) {
      console.error("Error al marcar como informativo:", error);
    }
  };

  // Marcar correo como respondido
  const handleMarkAsResponded = async (emailId: string) => {
    try {
      await fetch(`/api/emails/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          emailId, 
          status: "respondido" 
        }),
      });
      
      // Actualizar estado local
      updateEmail(emailId, { status: "respondido" as const, lastResponseBy: "admin" });
      
      // Actualizar estadísticas
      updateEmail(emailId, { lastResponseBy: "admin" });
    } catch (error) {
      console.error("Error al marcar como respondido:", error);
    }
  };

  // Función general para actualizar el estado de un correo
  const handleUpdateStatus = async (emailId: string, newStatus: "necesita_atencion" | "informativo" | "respondido") => {
    try {
      // Encontrar el correo y su estado actual
      const emailToUpdate = emails.find(email => email.id === emailId);
      if (!emailToUpdate) {
        console.error(`No se encontró el correo con ID ${emailId}`);
        return;
      }
      
      const currentStatus = emailToUpdate.status;
      
      // No hacer nada si el estado no cambia
      if (currentStatus === newStatus) {
        return;
      }
      
      // Actualizar estado local de manera optimista
      updateEmail(emailId, { 
        status: newStatus,
        // Si se marca como respondido, actualizar lastResponseBy
        ...(newStatus === "respondido" ? { lastResponseBy: "admin" } : {})
      });
      
      // Si acabamos de mover un correo a otra pestaña, probablemente queramos cambiar a esa pestaña 
      // para ver el resultado (solo para respondido)
      if (newStatus === "respondido") {
        setModalOpen(false); // Cerrar el modal si está abierto
        
        // Opcional: cambiar a la pestaña correspondiente después de un breve retardo
        setTimeout(() => {
          setActiveTab(newStatus);
        }, 300);
      }
      
      // Llamar a la API para actualizar el estado SIN CAUSAR REFETCH
      const response = await fetch(`/api/emails/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          emailId, 
          status: newStatus,
          skipRefresh: true // Añadimos un parámetro para evitar refresh automático
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        // Si hay error, revertir el cambio
        updateEmail(emailId, { status: currentStatus });
        
        // Mostrar mensaje de error
        console.error("Error al actualizar estado:", result.message || "Error desconocido");
        
        // Usar el sistema de notificaciones
        if (typeof window !== 'undefined') {
          // Mostrar notificación de error
          const event = new CustomEvent('showNotification', {
            detail: {
              type: 'error',
              title: 'Error',
              message: result.message || "No se pudo actualizar el estado del correo"
            }
          });
          window.dispatchEvent(event);
        }
        return;
      }
      
      // Mostrar notificación de éxito
      if (typeof window !== 'undefined') {
        const statusLabel = 
          newStatus === 'necesita_atencion' ? 'requiere atención' : 
          newStatus === 'informativo' ? 'informativo' : 'respondido';
          
        const event = new CustomEvent('showNotification', {
          detail: {
            type: 'success',
            title: 'Estado actualizado',
            message: `El correo ha sido marcado como "${statusLabel}"`
          }
        });
        window.dispatchEvent(event);
      }
      
    } catch (error) {
      console.error(`Error al cambiar estado a ${newStatus}:`, error);
    }
  };

  // Alternar vista de hilos
  const toggleThreadView = () => {
    setViewThreads(prev => !prev);
  };

  // Manejar refresh de correos
  const handleRefresh = async () => {
    try {
      // El refreshEmails ahora ya muestra notificaciones internamente
      await refreshEmails();
      // Solo actualizamos la fecha después de refresh exitoso
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error al refrescar correos:", error);
      // Las notificaciones de error ya son manejadas por refreshEmails
    }
  };

  // Establecer la fecha de última actualización al cargar los correos
  useEffect(() => {
    if (emails.length > 0 && !lastUpdated) {
      setLastUpdated(new Date());
    }
  }, [emails, lastUpdated]);

  // Formatear la fecha de última actualización
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return '';
    
    // Formatear la fecha en español
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(lastUpdated);
  }, [lastUpdated]);

  return (
    <div className="container mx-auto py-6">
      {/* Elemento oculto para rastrear el estado de refreshing */}
      <div id="refreshing-indicator" data-refreshing={isRefreshing.toString()} style={{ display: 'none' }}></div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Correos</h1>
        <div className="flex flex-col items-end">
          <Button onClick={handleRefresh} disabled={isRefreshing} className="mb-1">
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </>
            )}
          </Button>
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Último actualizado: {formattedLastUpdated}
            </span>
          )}
        </div>
      </div>

      <EmailStats stats={stats} />

      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Bandeja de Entrada</CardTitle>
              <CardDescription>
                Gestiona tus correos según su estado y prioridad
              </CardDescription>
            </div>
            <div className="flex flex-col items-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex gap-2">
                    <ListFilter className="h-4 w-4" />
                    Opciones
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Configuración de vista</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center justify-between cursor-pointer" onClick={toggleThreadView}>
                    Vista de conversaciones
                    <input type="checkbox" checked={viewThreads} onChange={() => {}} className="ml-2" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Correos a mostrar</DropdownMenuLabel>
                  {displayOptions.map(option => (
                    <DropdownMenuItem 
                      key={option} 
                      className="cursor-pointer" 
                      onClick={() => handleDisplayLimitChange(option.toString())}
                    >
                      {option} correos
                      {displayLimit === option && <span className="ml-2">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-xs text-gray-500 mt-1">
                {emailsToDisplay.length} - {emailCount} correos en esta categoría
              </span>
              {viewThreads && (
                <span className="text-xs text-gray-500 mt-1">
                  Vista de conversaciones activa - mostrando solo el último mensaje de cada hilo
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="necesita_atencion" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="necesita_atencion">
                Necesita Atención
                <Badge className="ml-2 bg-red-500 text-white">{stats.necesitaAtencion}</Badge>
              </TabsTrigger>
              <TabsTrigger value="informativo">
                Informativo
                <Badge className="ml-2 bg-gray-200 text-gray-800">{stats.informativo}</Badge>
              </TabsTrigger>
              <TabsTrigger value="respondido">
                Respondido
                <Badge className="ml-2 border border-gray-300 bg-transparent">{stats.respondido}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="necesita_atencion">
              {isLoading && !emails.length ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : emailsToDisplay.length > 0 ? (
                <EmailList 
                  emails={emailsToDisplay} 
                  onOpenEmail={handleOpenEmail} 
                  onMarkAsInformative={handleMarkAsInformative} 
                  onMarkAsResponded={handleMarkAsResponded}
                  onUpdateStatus={handleUpdateStatus}
                  emptyMessage="No hay correos que necesiten atención"
                  showInformativeButton={true}
                  sortOrder={sortOrder}
                  onChangeSortOrder={handleSortChange}
                />
              ) : (
                <div className="flex justify-center py-8 text-gray-500">
                  No hay correos que necesiten atención
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="informativo">
              {isLoading && !emails.length ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : emailsToDisplay.length > 0 ? (
                <EmailList 
                  emails={emailsToDisplay} 
                  onOpenEmail={handleOpenEmail} 
                  onMarkAsInformative={handleMarkAsInformative}
                  onMarkAsResponded={handleMarkAsResponded}
                  onUpdateStatus={handleUpdateStatus}
                  emptyMessage="No hay correos informativos"
                  showInformativeButton={false}
                  sortOrder={sortOrder}
                  onChangeSortOrder={handleSortChange}
                />
              ) : (
                <div className="flex justify-center py-8 text-gray-500">
                  No hay correos informativos
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="respondido">
              {isLoading && !emails.length ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : emailsToDisplay.length > 0 ? (
                <EmailList 
                  emails={emailsToDisplay} 
                  onOpenEmail={handleOpenEmail}
                  onMarkAsInformative={handleMarkAsInformative}
                  onMarkAsResponded={handleMarkAsResponded}
                  onUpdateStatus={handleUpdateStatus}
                  emptyMessage="No hay correos respondidos"
                  showInformativeButton={false}
                  sortOrder={sortOrder}
                  onChangeSortOrder={handleSortChange}
                />
              ) : (
                <div className="flex justify-center py-8 text-gray-500">
                  No hay correos respondidos
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedEmail && (
        <EmailModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          email={selectedEmail}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
} 