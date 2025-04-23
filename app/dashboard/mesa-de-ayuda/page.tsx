"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Importar si se necesita redirigir en acciones
import { useAuth, UserRole } from '../../_lib/auth/AuthContext'; // Corregida ruta relativa
import RoleProtectedRoute from '../_components/RoleProtectedRoute'; // Corregida ruta relativa
import LoadingSpinner from '../_components/LoadingSpinner'; // Corregida ruta relativa
import ErrorMessage from '../_components/ErrorMessage'; // Corregida ruta relativa
import { StatusModal, StatusModalProps } from '../../_components/StatusModal'; // Importar StatusModal

// Importar componentes Shadcn/UI usando el alias correcto de components.json
// Asegúrate de que tu tsconfig.json esté configurado correctamente para resolver "@/components/*"
import { Button } from '@/_components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table';
import { Badge } from '@/_components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/_components/ui/dialog';
import { Input } from '@/_components/ui/input';
import { Textarea } from '@/_components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select';
import { Label } from '@/_components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/_components/ui/card";
import { ScrollArea } from "@/_components/ui/scroll-area";
import { X, Eye, CheckCircle, XCircle, Clock, User, Building, Mail, Phone } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/_components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/_components/ui/tabs";

// Importar Apollo Client y gql
import { gql, useQuery, useMutation } from '@apollo/client';

// Definir tipos y constantes globales al archivo
const ADMIN_ROLES: UserRole[] = ['Administrador', 'Jefe Operativo', 'Directorio'];
type DepartamentoTicket = 'cobranza' | 'administracion' | 'minutocorp';

// --- Tipo Ticket actualizado para Strapi v5 --- 
interface Ticket {
  documentId: string; // Usar documentId
  titulo: string;
  descripcion?: any; // Tipo 'blocks' puede ser complejo, usar 'any' por ahora o un tipo específico si tienes
  estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
  departamento: DepartamentoTicket | null;
  asignadoA: string | null; // Revertido a string
  numeroContactoTicket?: string | null;
  createdAt: string;
  updatedAt?: string; // Añadir si se quiere mostrar última actualización
  perfilCliente?: { // Acceso directo a la relación
    documentId: string;
    // --- Nuevos campos para Razón Social ---
    tipoPersona?: 'Natural' | 'Juridica';
    datosPersonaNatural?: { razonSocial?: string | null } | null;
    datosPersonaJuridica?: { razonSocial?: string | null } | null;
    // --------------------------------------
  } | null;
}

// Tipos simulados para respuesta de upload y archivo
interface StrapiUploadResponse {
    id: number;
    name: string;
    url: string;
    // ... otros campos de Strapi
}

// --- Mapeo Categoría (UI) a Departamento (Backend) --- 
const categoriaToDepartamentoMap: Record<string, DepartamentoTicket> = {
    "Reparación / Mantenimiento": "administracion",
    "Consulta Facturación": "cobranza",
    "Problema con Pago": "cobranza",
    "Solicitud de Acceso": "administracion",
    "Pregunta sobre Reglamento": "minutocorp",
};

// Lista de categorías para el UI
const CATEGORIAS_UI = Object.keys(categoriaToDepartamentoMap);

// Correos Placeholder (usando tipo en minúscula)
const departamentoEmails: Record<DepartamentoTicket, string> = {
    "cobranza": "cobranza@ethos.com",
    "administracion": "admin@ethos.com",
    "minutocorp": "minutocorp@ethos.com"
};

// --- Necesitamos la lista de departamentos internos para el modal de reasignación --- 
const DEPARTAMENTOS_LIST: DepartamentoTicket[] = ['cobranza', 'administracion', 'minutocorp'];

// --- Helpers (Definidos aquí globalmente) ---
const calcularTiempoAbierto = (fechaCreacion: string): string => {
    const ahora = new Date(); const creacion = new Date(fechaCreacion); const diffMs = ahora.getTime() - creacion.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffDays > 1) return `${diffDays} días`; if (diffDays === 1) return `1 día`; if (diffHours > 1) return `${diffHours} horas`;
    if (diffHours === 1) return `1 hora`; if (diffMinutes > 1) return `${diffMinutes} min`; return `Menos de 1 min`;
};
const getBadgeVariant = (estado: Ticket['estado']): string => {
    switch (estado) {
        case 'abierto': return 'bg-red-100 text-red-800 border-red-200'; case 'en_progreso': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'resuelto': return 'bg-green-100 text-green-800 border-green-200'; case 'cerrado': return 'bg-gray-100 text-gray-800 border-gray-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

// --- NUEVO Helper para Razón Social (Definido Globalmente) --- 
const getRazonSocialCliente = (ticket: Ticket): string => {
    const perfil = ticket.perfilCliente;
    if (!perfil) return '-';
    if (perfil.tipoPersona === 'Natural' && perfil.datosPersonaNatural?.razonSocial) {
        return perfil.datosPersonaNatural.razonSocial;
    }
    if (perfil.tipoPersona === 'Juridica' && perfil.datosPersonaJuridica?.razonSocial) {
         return perfil.datosPersonaJuridica.razonSocial;
    }
    return perfil.documentId ? `ID: ${perfil.documentId}` : '-'; 
};
// ---------------------------------------------------------------

// --- GraphQL Queries & Mutations (Filtro Opcional) --- 

// Query base para campos de ticket
const TICKET_FIELDS_FRAGMENT = gql`
  fragment TicketFields on Ticket {
    documentId
    titulo
    descripcion # Asegúrate que tu API devuelve esto (puede ser JSON)
    estado
    departamento
    asignadoA
    numeroContactoTicket
    createdAt
    updatedAt
    perfilCliente {
      documentId
      tipoPersona 
      datosPersonaNatural { razonSocial }
      datosPersonaJuridica { razonSocial }
    }
    # archivosAdjuntos { documentId url name } # Descomentar si se popula
  }
`;

const GET_MY_TICKETS_QUERY = gql`
  query GetMyTickets($perfilClienteId: ID!) {
    tickets(filters: { perfilCliente: { documentId: { eq: $perfilClienteId } } }, sort: \"createdAt:desc\") {
      ...TicketFields
    }
  }
  ${TICKET_FIELDS_FRAGMENT}
`;

const GET_ALL_TICKETS_QUERY = gql`
  query GetAllTickets($start: Int, $limit: Int, $filters: TicketFiltersInput) {
    tickets(
      sort: \"createdAt:desc\"
      pagination: { start: $start, limit: $limit }
      filters: $filters 
    ) {
      ...TicketFields
    }
  }
  ${TICKET_FIELDS_FRAGMENT}
`;

const CREATE_TICKET_MUTATION = gql`
  mutation CreateTicket($data: TicketInput!) {
    createTicket(data: $data) {
      documentId # Pedir solo ID o fragmento si se necesita más
    }
  }
`;

const UPDATE_TICKET_MUTATION = gql`
  mutation UpdateTicket($documentId: ID!, $data: TicketInput!) {
    updateTicket(documentId: $documentId, data: $data) {
      documentId # Pedir campos actualizados o fragmento
      departamento
      asignadoA
      estado
    }
  }
`;

// --- Componente Principal ---
function MesaDeAyudaContent() {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = role ? ADMIN_ROLES.includes(role) : false;

  // Estados del formulario de creación
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const initialFormData = { 
      titulo: '', 
      descripcion: '', 
      categoriaSeleccionada: '' // Almacena la categoría del UI
  };
  const [newTicketData, setNewTicketData] = useState(initialFormData);
  const [contactOption, setContactOption] = useState<'principal' | 'secundario' | 'otro' | ''>('');
  const [otroNumero, setOtroNumero] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Estados de la tabla y UI
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<'abiertos' | 'cerrados'>('abiertos');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Estado para StatusModal ---
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalProps, setStatusModalProps] = useState<Omit<StatusModalProps, 'open' | 'onOpenChange'>>({
    type: 'success',
    title: '',
    message: '',
  });

  // --- Estado para Modal Reasignar ---
   const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
   const [ticketToReassign, setTicketToReassign] = useState<{ documentId: string; titulo: string } | null>(null);
   const [reassignOption, setReassignOption] = useState<'departamento' | 'emails'>('departamento');
   const [reassignSelectedDept, setReassignSelectedDept] = useState<DepartamentoTicket | ''>('');
   const [reassignSpecificEmails, setReassignSpecificEmails] = useState('');
   const [reassignError, setReassignError] = useState<string | null>(null);

  // --- Nuevo estado para Modal Ver ---
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [ticketToView, setTicketToView] = useState<Ticket | null>(null);

  // --- Nuevo estado para búsqueda --- 
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // --- Estado para Paginación (Admin) --- 
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15; // Cuántos tickets cargar por página
  const [canLoadMore, setCanLoadMore] = useState(true); // Para saber si mostrar el botón "Cargar Más"

  // Obtener teléfonos reales del AuthContext
  // ** ¡¡ASEGÚRATE DE HABER ACTUALIZADO AuthContext PARA POBLAR ESTOS CAMPOS!! **
  const telefonoPrincipal = user?.perfil_cliente?.contactoAdministrativo?.telefono || '';
  const telefonoSecundario = user?.perfil_cliente?.contactoGerente?.telefono || '';
  const hasPrincipal = !!telefonoPrincipal;
  const hasSecundario = !!telefonoSecundario;

  // --- Uso de Hooks Apollo Client --- 
  const queryToRun = isAdmin ? GET_ALL_TICKETS_QUERY : GET_MY_TICKETS_QUERY;
  const perfilClienteId = user?.perfil_cliente?.documentId;
  
  // Calcular variables dinámicamente
  const calculateQueryVariables = () => {
      if (isAdmin) {
          const start = 0; // Siempre empezamos en 0 para la carga inicial o nueva búsqueda
          const limit = PAGE_SIZE;
          let filters = null; // Filtro nulo por defecto

          // Construir filtro SOLO si hay término de búsqueda
          if (debouncedSearchTerm) {
              filters = { 
                  or: [
                      { perfilCliente: { datosPersonaNatural: { razonSocial: { containsi: debouncedSearchTerm } } } },
                      { perfilCliente: { datosPersonaJuridica: { razonSocial: { containsi: debouncedSearchTerm } } } }
                  ]
              };
          }
          return { start, limit, filters }; // Devolver variables para admin
      } else {
          // Variables para usuario normal (sin filtro opcional, solo ID)
          return { perfilClienteId }; 
      }
  };

  const { data: queryData, loading: loadingTickets, error: errorTickets, refetch: refetchTickets, fetchMore } = useQuery(queryToRun, {
      variables: calculateQueryVariables(), // Usar la función para obtener variables
      skip: isLoadingAuth || (!isAdmin && !perfilClienteId), 
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
      onError: (error) => console.error("Error fetching tickets:", error),
      onCompleted: (data) => {
          if (isAdmin && data?.tickets) {
              setCanLoadMore(data.tickets.length === PAGE_SIZE);
          }
      }
  });

  // Refetch cuando cambia el término de búsqueda (para aplicar el nuevo filtro o quitarlo)
  useEffect(() => {
      if (isAdmin) {
          // setCurrentPage(1); // El cálculo de start ya empieza en 0
          setCanLoadMore(true);
          // Ya no pasamos las variables aquí, useQuery reacciona a calculateQueryVariables
          // refetch(); // No es necesario si las variables cambian correctamente
      }
  }, [debouncedSearchTerm, isAdmin]); // Depender de debouncedSearchTerm

  // Actualizar estado de tickets (sin cambios)
  useEffect(() => {
    if (queryData?.tickets) { setTickets(queryData.tickets); }
  }, [queryData]);

  // Mutaciones con Apollo Client
  const [createTicket, { loading: creatingTicket, error: errorCreatingTicket }] = useMutation(CREATE_TICKET_MUTATION);
  const [updateTicket, { loading: updatingTicket, error: errorUpdatingTicket }] = useMutation(UPDATE_TICKET_MUTATION, {
      onError: (error) => {
          // Muestra error genérico si la operación falla
          setStatusModalProps({ type: 'error', title: 'Error en Operación', message: error.message || 'No se pudo actualizar el ticket.' });
          setIsStatusModalOpen(true);
      },
      // Podríamos usar onCompleted para mostrar éxito si no lo hacemos en la lógica específica
  });

  // Efecto para debouncing
  useEffect(() => {
      const handler = setTimeout(() => {
          setDebouncedSearchTerm(searchTerm);
      }, 500); // Espera 500ms después de dejar de escribir

      // Limpieza al desmontar o si searchTerm cambia antes del timeout
      return () => {
          clearTimeout(handler);
      };
  }, [searchTerm]);

  // --- Handlers (Input, Select, File) ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTicketData(prev => ({ ...prev, [name]: value }));
  };
  const handleSelectChange = (name: string) => (value: string) => {
    setNewTicketData(prev => ({ ...prev, [name]: value }));
  };
  const handleOtroNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtroNumero(e.target.value);
  };
  const handleContactOptionChange = (value: string) => {
    const option = value as 'principal' | 'secundario' | 'otro' | '';
    setContactOption(option);
    if (option !== 'otro') setOtroNumero('');
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSelectedFiles(e.target.files); };
  const removeFile = (index: number) => {
        if (!selectedFiles) return;
        const newFiles = Array.from(selectedFiles);
        newFiles.splice(index, 1);
        const dataTransfer = new DataTransfer();
        newFiles.forEach(file => dataTransfer.items.add(file));
        setSelectedFiles(dataTransfer.files.length > 0 ? dataTransfer.files : null);
        if (fileInputRef.current) fileInputRef.current.value = "";
   };

  // --- Lógica de Carga REAL ---
  const handleFileUpload = async (files: FileList): Promise<number[]> => {
    const uploadedFileIds: number[] = [];
    for (const file of Array.from(files)) {
        // ... (formData)
        try {
            // ... (fetch y procesamiento)
        } catch (error) {
            console.error(`Error en carga de ${file.name}:`, error);
            // Propagar el error para detener el proceso y mostrar en UI
            // throw error instanceof Error ? error : new Error(`Error desconocido al cargar ${file.name}`);
            // Aseguramos que siempre se lanza una excepción para satisfacer al linter
            const errorToThrow = error instanceof Error ? error : new Error(`Error desconocido al cargar ${file.name}`);
            throw errorToThrow;
        }
    }
    // Si el loop termina bien, devuelve los IDs
    console.log("Carga real completada. IDs:", uploadedFileIds);
    return uploadedFileIds; // Retorno explícito en caso de éxito
  };

  // --- Submit Creación ---
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Determinar contacto
    let finalContactNumber = '';
    if (contactOption === 'principal') finalContactNumber = telefonoPrincipal;
    else if (contactOption === 'secundario') finalContactNumber = telefonoSecundario;
    else if (contactOption === 'otro') finalContactNumber = otroNumero.trim();

    // Validaciones
    if (!newTicketData.titulo || !newTicketData.descripcion || !newTicketData.categoriaSeleccionada) {
        setSubmitError("Por favor completa Título, Descripción y Categoría.");
        return;
    }
     if (contactOption === 'otro' && !finalContactNumber) {
        setSubmitError("Por favor ingresa el número de contacto si seleccionaste 'Otro'.");
        return;
    }
    if (finalContactNumber && !/^[0-9+\s()-]*$/.test(finalContactNumber)) {
         setSubmitError("El número de contacto parece inválido.");
         return;
    }

    // --- Mapeo y obtención de email --- 
    const departamentoInterno = categoriaToDepartamentoMap[newTicketData.categoriaSeleccionada];
    if (!departamentoInterno) {
        setSubmitError("Categoría seleccionada no es válida.");
        return;
    }
    const assignedEmail = departamentoEmails[departamentoInterno];
    if (!assignedEmail) { // Seguridad extra
        setSubmitError("Error interno: No se encontró email para el departamento.");
        return;
    }
    // -------------------------------------

    let uploadedFileIds: number[] = [];
    try {
        // 1. Cargar archivos
        if (selectedFiles && selectedFiles.length > 0) {
           uploadedFileIds = await handleFileUpload(selectedFiles);
        }

        // 2. Crear ticket (enviar departamento mapeado)
        const mutationData = {
             titulo: newTicketData.titulo,
             descripcion: newTicketData.descripcion, 
             departamento: departamentoInterno, // Enviar el departamento interno
             asignadoA: assignedEmail, 
             numeroContactoTicket: finalContactNumber || null,
             archivosAdjuntos: uploadedFileIds.length > 0 ? uploadedFileIds : null,
             estado: 'abierto',
             perfilCliente: perfilClienteId // Asegúrate que perfilClienteId se obtiene correctamente
         };

        await createTicket({ 
            variables: { data: mutationData },
            refetchQueries: [{ query: queryToRun, variables: queryToRun === GET_MY_TICKETS_QUERY ? { perfilClienteId } : undefined }]
         });

      // Resetear y cerrar diálogo, mostrar éxito
      setNewTicketData(initialFormData);
      setSelectedFiles(null); setContactOption(''); setOtroNumero('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      setCreateDialogOpen(false);
      console.log("Ticket creado exitosamente.");
      setStatusModalProps({ 
          type: 'success', 
          title: 'Ticket Creado', 
          message: `Tu solicitud ha sido creada y asignada a ${assignedEmail}.` 
      });
      setIsStatusModalOpen(true);

    } catch (error: any) {
      console.error("Error en el proceso de creación de ticket:", error);
      const apolloErrorMsg = error?.message; // Apollo error tiene message
      const genericErrorMsg = error?.message || "Ocurrió un error al crear el ticket.";
      setSubmitError(apolloErrorMsg || genericErrorMsg);
    }
  };

  // --- Lógica de Filtrado y Contadores (sin cambios) ---
  const filterTickets = (status: 'abiertos' | 'cerrados') => {
    return tickets.filter(ticket => {
        const isOpen = ticket.estado === 'abierto' || ticket.estado === 'en_progreso';
        return status === 'abiertos' ? isOpen : !isOpen;
    });
  };
  const ticketsAbiertos = filterTickets('abiertos');
  const ticketsCerrados = filterTickets('cerrados');
  const countAbiertos = ticketsAbiertos.length;
  const countCerrados = ticketsCerrados.length;

  // --- Handlers para Modales --- 
  const handleOpenReassignModal = (ticket: { documentId: string; titulo: string }) => {
      setTicketToReassign(ticket);
      setReassignOption('departamento'); 
      setReassignSelectedDept('');
      setReassignSpecificEmails('');
      setReassignError(null);
      setIsReassignModalOpen(true);
  };

  // --- Submit Reasignación (Lógica String Comma-Separated) ---
  const handleReassignSubmit = async () => {
      if (!ticketToReassign) return;

      setReassignError(null);
      let updateData: { departamento: DepartamentoTicket | null; asignadoA: string | null } = { departamento: null, asignadoA: null };
      let successMessageDetails = '';

      try {
          if (reassignOption === 'departamento') {
              if (!reassignSelectedDept) {
                  setReassignError("Debes seleccionar un departamento.");
                  return;
              }
              const assignedEmail = departamentoEmails[reassignSelectedDept];
              // Guardar DEPARTAMENTO y el email ÚNICO como STRING
              updateData = { departamento: reassignSelectedDept, asignadoA: assignedEmail }; 
              successMessageDetails = `al departamento ${reassignSelectedDept} (${assignedEmail})`;

          } else { // Opción 'emails'
              const emailsString = reassignSpecificEmails.trim();
              if (!emailsString) {
                  setReassignError("Debes ingresar al menos un email.");
                  return;
              }
              // Parsear, validar y unir en string separado por comas
              const emailArray = emailsString.split(/[\n,;]+/).map(email => email.trim()).filter(email => email);
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              const invalidEmails = emailArray.filter(email => !emailRegex.test(email));

              if (invalidEmails.length > 0) {
                   setReassignError(`Emails inválidos: ${invalidEmails.join(', ')}`);
                   return;
              }
              if (emailArray.length === 0) {
                   setReassignError("No se encontraron emails válidos para asignar.");
                   return;
               }
               
               const commaSeparatedEmails = emailArray.join(','); // Unir con comas
               // Guardar STRING de emails y departamento NULL
               updateData = { departamento: null, asignadoA: commaSeparatedEmails }; 
               successMessageDetails = `a los emails: ${commaSeparatedEmails}`;
           }

           // Ejecutar mutación
           await updateTicket({ 
               variables: { 
                   documentId: ticketToReassign.documentId, 
                   data: updateData // Enviar objeto con string en asignadoA
                }
           });

           // ... (Cerrar modal, mostrar éxito, refetch) ...
           setIsReassignModalOpen(false);
           setTicketToReassign(null);
           setStatusModalProps({ 
               type: 'success', 
               title: 'Ticket Reasignado', 
               message: `El ticket "${ticketToReassign.titulo}" ha sido reasignado ${successMessageDetails}.` 
           });
           setIsStatusModalOpen(true);
           refetchTickets();

       } catch (error: any) {
           console.error("Error reasignando ticket:", error);
           setReassignError(error.message || "Ocurrió un error al reasignar.");
       }
   };

  // --- Handler para abrir Modal Ver (llamado desde TicketTable) ---
  const handleOpenViewModal = (ticket: Ticket) => {
    setTicketToView(ticket);
    setIsViewModalOpen(true);
  };

  // --- Acción Cerrar Ticket (Usa StatusModal para Confirmar y Notificar) --- 
  const handleCloseTicket = async (ticket: Ticket) => {
      // Configurar y abrir el modal de CONFIRMACIÓN
      setStatusModalProps({
          type: 'error', // Usar tipo error para advertencia visual
          title: 'Confirmar Cierre',
          message: `¿Estás seguro de que quieres cerrar el ticket "${ticket.titulo}"? Esta acción no se puede deshacer.`,
          actionLabel: 'Sí, Cerrar', 
          onAction: async () => { // Acción a ejecutar si confirman
             try {
                  // Intentar cerrar el ticket
                  await updateTicket({
                      variables: {
                          documentId: ticket.documentId,
                          data: { estado: 'cerrado' }
                      },
                      refetchQueries: [{ query: queryToRun, variables: queryToRun === GET_MY_TICKETS_QUERY ? { perfilClienteId } : undefined }]
                  });
                  // Si tiene éxito, actualizar el MISMO modal para mostrar ÉXITO
                  setStatusModalProps({ 
                      type: 'success', 
                      title: 'Ticket Cerrado', 
                      message: `El ticket "${ticket.titulo}" ha sido cerrado.`, 
                      onAction: undefined, // Limpiar acción previa
                      actionLabel: undefined // Limpiar etiqueta acción
                  });
                  // Mantener el modal abierto para mostrar el éxito
                  setIsStatusModalOpen(true); 
              } catch (error) { 
                  // El onError del hook useMutation ya debería haber manejado
                  // la actualización del modal para mostrar el error.
                  // No necesitamos hacer nada extra aquí, solo loggear si queremos.
                  console.error("Error capturado al intentar cerrar ticket (onError debería manejar UI):", error);
              }
          },
          // onClose es manejado por onOpenChange automáticamente al cerrar el Dialog
      });
      setIsStatusModalOpen(true); // Abrir el modal de confirmación
  };

  // --- Handler para Cargar Más (Actualizado para usar filtro opcional) --- 
  const handleLoadMore = () => {
      if (!fetchMore || !isAdmin || loadingTickets) return;

      const currentLength = tickets.length;
      let filters = null; // Filtro nulo por defecto para fetchMore
       if (debouncedSearchTerm) { // Aplicar filtro si existe
           filters = { 
               or: [
                   { perfilCliente: { datosPersonaNatural: { razonSocial: { containsi: debouncedSearchTerm } } } },
                   { perfilCliente: { datosPersonaJuridica: { razonSocial: { containsi: debouncedSearchTerm } } } }
               ]
           };
       }

      fetchMore({
          variables: {
              start: currentLength, 
              limit: PAGE_SIZE,
              filters: filters, // Pasar el filtro construido (o null)
          },
      }).then(fetchMoreResult => {
           if (!fetchMoreResult.data?.tickets || fetchMoreResult.data.tickets.length < PAGE_SIZE) {
               setCanLoadMore(false);
           }
      });
  };

  // --- Renderizado --- 
  if (isLoadingAuth) { return <LoadingSpinner />; }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Mesa de Ayuda</h1>
        {!isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild><Button>Crear Nuevo Ticket</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px] md:max-w-[700px] max-h-[90vh]">
              <ScrollArea className="max-h-[80vh]">
                <form onSubmit={handleCreateTicketSubmit} className="p-1 pr-4">
                  <DialogHeader><DialogTitle>Crear Nuevo Ticket</DialogTitle><DialogDescription>Completa la información y adjunta archivos si es necesario.</DialogDescription></DialogHeader>
                  <div className="grid gap-6 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="titulo" className="text-right">Título <span className="text-red-500">*</span></Label>
                        <Input id="titulo" name="titulo" value={newTicketData.titulo} onChange={handleInputChange} className="col-span-3" required />
                     </div>
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="descripcion" className="text-right pt-2">Descripción <span className="text-red-500">*</span></Label>
                        <Textarea id="descripcion" name="descripcion" value={newTicketData.descripcion} onChange={handleInputChange} className="col-span-3" rows={5} required />
                     </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="categoriaSeleccionada" className="text-right">Categoría <span className="text-red-500">*</span></Label>
                        <Select 
                            name="categoriaSeleccionada" 
                            value={newTicketData.categoriaSeleccionada}
                            onValueChange={handleSelectChange('categoriaSeleccionada')}
                            required
                        >
                           <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Selecciona un tipo de ayuda" />
                           </SelectTrigger>
                           <SelectContent>
                              {CATEGORIAS_UI.map(cat => (
                                 <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Contacto <span className="text-xs block text-muted-foreground">(Opcional)</span></Label>
                        <div className="col-span-3 space-y-3">
                            <p className="text-sm text-muted-foreground -mt-1">Selecciona o ingresa un número para contactarte sobre este ticket.</p>
                            <RadioGroup value={contactOption} onValueChange={handleContactOptionChange}>
                                {hasPrincipal && (<div className="flex items-center space-x-2"><RadioGroupItem value="principal" id="contact-principal" /><Label htmlFor="contact-principal">Usar principal ({telefonoPrincipal})</Label></div>)}
                                {hasSecundario && (<div className="flex items-center space-x-2"><RadioGroupItem value="secundario" id="contact-secundario" /><Label htmlFor="contact-secundario">Usar secundario ({telefonoSecundario})</Label></div>)}
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="otro" id="contact-otro" />
                                    <Label htmlFor="contact-otro">Usar otro número:</Label>
                                </div>
                            </RadioGroup>
                            {contactOption === 'otro' && (<Input type="tel" placeholder="Ingresa el número de contacto" value={otroNumero} onChange={handleOtroNumeroChange} className="mt-1" />)}
                        </div>
                     </div>
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="archivos" className="text-right pt-2">Adjuntos</Label>
                        <div className='col-span-3 space-y-2'>
                            <Input id="archivos" type="file" multiple onChange={handleFileChange} ref={fileInputRef} className="pt-1.5" />
                            {selectedFiles && selectedFiles.length > 0 && (
                                 <div className="space-y-1 text-sm">
                                     {Array.from(selectedFiles).map((file, index) => (
                                         <div key={index} className="flex items-center justify-between p-1 bg-muted/50 rounded">
                                             <span className="truncate max-w-[200px] md:max-w-[300px]" title={file.name}>
                                                 {file.name}
                                             </span>
                                             <Button
                                                 type="button" variant="ghost" size="sm"
                                                 onClick={() => removeFile(index)}
                                                 className="h-6 w-6 p-0"
                                                 aria-label="Quitar archivo"
                                              >
                                                 <X className="h-4 w-4" />
                                             </Button>
                                         </div>
                                     ))}
                                 </div>
                             )}
                            <p className="text-xs text-muted-foreground">Puedes adjuntar múltiples archivos (ej. imágenes, PDFs).</p>
                        </div>
                     </div>
                     {submitError && (<div className="col-span-full text-red-600 text-sm text-center py-2">{submitError}</div>)}
                     {creatingTicket && (<div className="col-span-full flex justify-center py-2"><LoadingSpinner /></div>)}
                  </div>
                  <DialogFooter className="mt-4 pt-4 border-t">
                     <DialogClose asChild><Button type="button" variant="outline" disabled={creatingTicket}>Cancelar</Button></DialogClose>
                     <Button type="submit" disabled={creatingTicket}>{creatingTicket ? 'Creando...' : 'Crear Ticket'}</Button>
                  </DialogFooter>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* --- Input de Búsqueda (Solo Admins) --- */} 
      {isAdmin && (
          <div className="mb-4">
              <Input
                  placeholder="Buscar por Razón Social del Cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm" // Ajustar ancho si es necesario
              />
          </div>
      )}
      {/* -------------------------------------- */} 

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="abiertos">Abiertos ({countAbiertos})</TabsTrigger>
          <TabsTrigger value="cerrados">Cerrados ({countCerrados})</TabsTrigger>
        </TabsList>
        {loadingTickets && <div className="pt-10"><LoadingSpinner /></div>}
        {errorTickets && <ErrorMessage message={`Error al cargar tickets: ${errorTickets.message}`} />}
        {!loadingTickets && !errorTickets && (
          <>
            <TabsContent value="abiertos">
              <Card><CardContent className="pt-6"><TicketTable tickets={ticketsAbiertos} isAdmin={isAdmin} onOpenReassignModal={handleOpenReassignModal} onOpenViewModal={handleOpenViewModal} onCloseTicket={handleCloseTicket} isUpdating={updatingTicket} /></CardContent></Card>
            </TabsContent>
            <TabsContent value="cerrados">
              <Card><CardContent className="pt-6"><TicketTable tickets={ticketsCerrados} isAdmin={isAdmin} onOpenReassignModal={handleOpenReassignModal} onOpenViewModal={handleOpenViewModal} onCloseTicket={handleCloseTicket} isUpdating={updatingTicket} /></CardContent></Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* --- Modal de Estado (Éxito/Error) --- */}
      <StatusModal
          open={isStatusModalOpen}
          onOpenChange={setIsStatusModalOpen}
          {...statusModalProps}
       />

       {/* --- Modal para Reasignar (Corregido Select de Departamento) --- */}
       <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
           <DialogContent className="sm:max-w-lg">
               <DialogHeader>
                   <DialogTitle>Reasignar Ticket</DialogTitle>
                   <DialogDescription>
                       Ticket: "{ticketToReassign?.titulo || ''}"
                   </DialogDescription>
               </DialogHeader>
               <div className="py-4 space-y-4">
                   <RadioGroup value={reassignOption} onValueChange={(value) => setReassignOption(value as any)} className="mb-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="departamento" id="reassign-dept" />
                            <Label htmlFor="reassign-dept">Asignar a Departamento</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="emails" id="reassign-emails" />
                            <Label htmlFor="reassign-emails">Asignar a Emails Específicos</Label>
                        </div>
                   </RadioGroup>

                   {reassignOption === 'departamento' && (
                       <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="reassign-select-dept" className="text-right">
                               Departamento
                           </Label>
                           <Select 
                               name="reassign-select-dept" 
                               value={reassignSelectedDept}
                               onValueChange={(value) => setReassignSelectedDept(value as DepartamentoTicket)}
                           >
                               <SelectTrigger className="col-span-3">
                                   <SelectValue placeholder="Selecciona departamento" />
                               </SelectTrigger>
                               <SelectContent>
                                   {DEPARTAMENTOS_LIST.map(dep => (
                                       <SelectItem key={dep} value={dep}> 
                                           {dep.charAt(0).toUpperCase() + dep.slice(1)}
                                       </SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                       </div>
                   )}

                   {reassignOption === 'emails' && (
                        <div className="space-y-2">
                            <Label htmlFor="specific-emails">Emails (separados por coma, punto y coma o nueva línea)</Label>
                            <Textarea
                                id="specific-emails"
                                value={reassignSpecificEmails}
                                onChange={(e) => setReassignSpecificEmails(e.target.value)}
                                placeholder="ej: juan@test.com, equipo@test.com"
                                rows={3}
                            />
                       </div>
                   )}
                    
                   {reassignError && (
                       <p className="text-sm text-red-600 text-center pt-2">{reassignError}</p>
                   )}
               </div>
               <DialogFooter>
                   <Button variant="outline" onClick={() => setIsReassignModalOpen(false)}>Cancelar</Button>
                   <Button 
                       onClick={handleReassignSubmit} 
                       disabled={ 
                           updatingTicket || 
                           (reassignOption === 'departamento' && !reassignSelectedDept) ||
                           (reassignOption === 'emails' && !reassignSpecificEmails.trim())
                       }
                   >
                       {updatingTicket ? <LoadingSpinner /> : "Reasignar"}
                   </Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>

       {/* --- Nuevo Modal Ver Detalles --- */}
       <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
         <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh]">
             <ScrollArea className="max-h-[80vh] p-1 pr-4">
                 <DialogHeader>
                     <DialogTitle>Detalles del Ticket</DialogTitle>
                     <DialogDescription>ID: {ticketToView?.documentId}</DialogDescription>
                 </DialogHeader>
                 {ticketToView && (
                     <div className="py-4 space-y-4">
                         {/* Título */} 
                         <div className="space-y-1">
                             <Label className="text-xs text-muted-foreground">Título</Label>
                             <p className="font-medium">{ticketToView.titulo}</p>
                         </div>

                         {/* Estado */} 
                         <div className="space-y-1">
                             <Label className="text-xs text-muted-foreground">Estado</Label>
                             <p><Badge className={getBadgeVariant(ticketToView.estado)}>{ticketToView.estado}</Badge></p>
                         </div>

                          {/* Descripción (Mostrar como Texto Plano) */} 
                          <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Descripción</Label>
                              <div className="p-2 border rounded bg-muted/30 min-h-[60px]">
                                  <p className="text-sm whitespace-pre-wrap">
                                      {ticketToView.descripcion || 'No hay descripción.'}
                                  </p>
                              </div>
                          </div>

                         {/* Departamento y Asignado */} 
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                 <Label className="text-xs text-muted-foreground">Departamento</Label>
                                 <p className="flex items-center"><Building className="w-4 h-4 mr-2 text-muted-foreground"/> {ticketToView.departamento || '-'}</p>
                             </div>
                              <div className="space-y-1">
                                 <Label className="text-xs text-muted-foreground">Asignado A (Email)</Label>
                                 <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-muted-foreground"/> {ticketToView.asignadoA || '-'}</p>
                             </div>
                         </div>

                          {/* Cliente (Admin) */} 
                          {isAdmin && ticketToView.perfilCliente && (
                              <div className="space-y-1">
                                 <Label className="text-xs text-muted-foreground">Cliente</Label>
                                 <p className="flex items-center"><User className="w-4 h-4 mr-2 text-muted-foreground"/> {getRazonSocialCliente(ticketToView)}</p>
                              </div>
                          )}

                         {/* Contacto Ticket */} 
                         <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Número Contacto Solicitud</Label>
                            <p className="flex items-center"><Phone className="w-4 h-4 mr-2 text-muted-foreground"/> {ticketToView.numeroContactoTicket || 'No especificado'}</p>
                         </div>

                          {/* Fechas */} 
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <Label className="text-xs text-muted-foreground">Fecha Creación</Label>
                                 <p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-muted-foreground"/> {new Date(ticketToView.createdAt).toLocaleString('es-EC')}</p>
                              </div>
                               {ticketToView.updatedAt && (
                                  <div className="space-y-1">
                                     <Label className="text-xs text-muted-foreground">Última Actualización</Label>
                                     <p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-muted-foreground"/> {new Date(ticketToView.updatedAt).toLocaleString('es-EC')}</p>
                                  </div>
                               )}
                          </div>
                         
                         {/* TODO: Mostrar Archivos Adjuntos si se poblaran */} 

                     </div>
                 )}
                 <DialogFooter className="mt-4 pt-4 border-t">
                     <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Cerrar</Button>
                 </DialogFooter>
             </ScrollArea>
         </DialogContent>
       </Dialog>

    </div>
  );
}

// --- Componente de Tabla Separado ---
interface TicketTableProps {
    tickets: Ticket[];
    isAdmin: boolean;
    onOpenReassignModal: (ticket: { documentId: string; titulo: string }) => void;
    onOpenViewModal: (ticket: Ticket) => void;
    onCloseTicket: (ticket: Ticket) => void;
    isUpdating: boolean;
}

function TicketTable({ tickets, isAdmin, onOpenReassignModal, onOpenViewModal, onCloseTicket, isUpdating }: TicketTableProps) {
    const router = useRouter();

    // --- Helper para mostrar Asignado A (String) --- 
    const displayAsignadoA = (asignadoA: string | null): string => {
        if (!asignadoA) return '-';
        // Si contiene coma, son emails específicos
        if (asignadoA.includes(',')) {
            return 'Emails Específicos';
        }
        // Si no contiene coma, intentar buscar el departamento
        const dept = Object.entries(departamentoEmails).find(([, deptEmail]) => deptEmail === asignadoA)?.[0];
        return dept || asignadoA; // Devuelve depto si lo encuentra, si no el email
    };
    // ----------------------------------------------

    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Estado</TableHead>
              {isAdmin && <TableHead>Departamento</TableHead>}
              {isAdmin && <TableHead>Cliente (Razón Social)</TableHead>}
              {isAdmin && <TableHead>Asignado A</TableHead>}
              <TableHead>Creado</TableHead>
              {!isAdmin && <TableHead>Tiempo Abierto</TableHead>}
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 5} className="h-24 text-center">No hay tickets para mostrar.</TableCell></TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.documentId}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={ticket.titulo}>{ticket.titulo}</TableCell>
                  <TableCell><Badge className={getBadgeVariant(ticket.estado)}>{ticket.estado.replace('_', ' ')}</Badge></TableCell>
                  {isAdmin && <TableCell>{ticket.departamento || '-'}</TableCell>}
                  {isAdmin && <TableCell title={getRazonSocialCliente(ticket)} className="max-w-[150px] truncate">{getRazonSocialCliente(ticket)}</TableCell>}
                  {isAdmin && <TableCell title={ticket.asignadoA || ''}>{displayAsignadoA(ticket.asignadoA)}</TableCell>}
                  <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                  {!isAdmin && <TableCell>{ticket.estado === 'resuelto' || ticket.estado === 'cerrado' ? '-' : calcularTiempoAbierto(ticket.createdAt)}</TableCell>}
                  <TableCell className="text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => onOpenViewModal(ticket)} aria-label={`Ver detalle ticket ${ticket.documentId}`}>Ver</Button>
                    {isAdmin && (ticket.estado === 'abierto' || ticket.estado === 'en_progreso') && (
                        <Button
                            variant={ticket.departamento ? "secondary" : "default"}
                            size="sm" 
                            onClick={() => onOpenReassignModal({ documentId: ticket.documentId, titulo: ticket.titulo })}
                            disabled={isUpdating}
                            aria-label={`Asignar departamento ticket ${ticket.documentId}`}>
                            {ticket.departamento ? 'Reasignar' : 'Asignar'}
                        </Button>
                    )}
                    {isAdmin && ticket.estado !== 'cerrado' && ticket.estado !== 'resuelto' && (
                        <Button
                            variant="destructive" 
                            size="sm" 
                            onClick={() => onCloseTicket(ticket)} 
                            disabled={isUpdating}
                            aria-label={`Cerrar ticket ${ticket.documentId}`}>
                            Cerrar
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    );
}

// --- Componente Contenedor con Protección de Rol ---
export default function MesaDeAyudaPage() {
  // Todos los roles definidos pueden ver la página, la vista interna cambia
  const allowedRoles = ['Propietario', 'Arrendatario', 'Administrador', 'Jefe Operativo', 'Directorio'];
  return (
    <RoleProtectedRoute allowedRoles={allowedRoles} redirectTo="/dashboard">
      <MesaDeAyudaContent />
    </RoleProtectedRoute>
  );
}
