"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  XMarkIcon,
  UserCircleIcon,
  EnvelopeIcon,
  KeyIcon,
  UserIcon,
  BuildingOffice2Icon
} from "@heroicons/react/24/outline"
import { Button } from "../../_components/ui/button"
import { Input } from "../../_components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../_components/ui/select"
import { useAuth } from "../../_lib/auth/AuthContext"
import { gql, useQuery } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../_components/ui/dialog"
import { Label } from "../../_components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../_components/ui/tabs"
import { StatusModal } from "../../_components/StatusModal"
import { sendWelcomeEmail } from "../../services/email"
import { TableSkeleton } from "./_components/TableSkeleton"
import { ArrowDown, ArrowUp } from "lucide-react"
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "../../_components/ui/table"

// Consulta para obtener todos los usuarios
const GET_USERS = gql`
  query GetUsers {
    usersPermissionsUsers {
      documentId
      username
      email
      confirmed
      blocked
      perfil_operacional {
        documentId
        rol
        proyectosAsignados {
          documentId
          nombre
        }
      }
      perfil_cliente {
        documentId
        rol
        tipoPersona
        datosPersonaNatural {
          razonSocial
          cedula
        }
        datosPersonaJuridica {
          razonSocial
          rucPersonaJuridica {
            ruc
          }
        }
      }
    }
  }
`;

// Consulta para obtener perfiles de cliente
const GET_PERFILES_CLIENTE = gql`
  query GetPerfilesCliente {
    perfilesCliente(pagination: { limit: -1 }) {
      documentId
      tipoPersona
      rol
      datosPersonaNatural {
        razonSocial
        cedula
      }
      datosPersonaJuridica {
        razonSocial
        rucPersonaJuridica {
          ruc
        }
      }
      contactoAccesos {
        nombreCompleto
        email
      }
    }
  }
`;

// Consulta para obtener proyectos
const GET_PROYECTOS = gql`
  query GetProyectos {
    proyectos(pagination: { limit: -1 }) {
      documentId
      nombre
    }
  }
`;

export default function UsuariosPage() {
  const router = useRouter()
  const { user, role } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: "success" | "error";
  }>({
    open: false,
    title: "",
    message: "",
    type: "success",
  })
  
  // Formulario para crear usuario
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    tipoUsuario: "cliente", // cliente o operacional
    perfilClienteId: "",
    rolOperacional: "Jefe Operativo",
    proyectosAsignados: [] as string[]
  })

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<'username' | 'email' | 'tipo'>('username');

  // Restringir acceso solo a directorio y administrador
  if (!["Administrador", "Directorio"].includes(role as string)) {
    router.push('/dashboard')
    return null
  }

  // Consulta para obtener usuarios
  const { data: usersData, loading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery(GET_USERS, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  })

  // Consulta para obtener perfiles de cliente
  const { data: perfilesClienteData, loading: perfilesClienteLoading } = useQuery(GET_PERFILES_CLIENTE, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  })

  // Consulta para obtener proyectos
  const { data: proyectosData, loading: proyectosLoading } = useQuery(GET_PROYECTOS, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  })

  // Detectar cuando está refrescando datos
  useEffect(() => {
    if (usersData) {
      setIsRefetching(false)
    }
  }, [usersData])

  // Función para crear un usuario
  const handleCreateUser = async () => {
    try {
      setIsProcessing(true);
      
      // Validar formulario
      if (!formData.username || !formData.email || !formData.password) {
        setStatusModal({
          open: true,
          title: "Error",
          message: "Por favor completa todos los campos obligatorios",
          type: "error",
        })
        setIsProcessing(false);
        return
      }

      // Crear usuario usando REST
      try {
        console.log("Intentando crear usuario usando REST");
        
        const registerResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/auth/local/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password
          })
        });
        
        if (!registerResponse.ok) {
          const errorText = await registerResponse.text();
          console.error("Error en la respuesta de registro:", errorText);
          throw new Error(`Error al registrar usuario: ${registerResponse.status} ${registerResponse.statusText}. Detalles: ${errorText}`);
        }
        
        const userData = await registerResponse.json();
        console.log("Respuesta de creación de usuario:", JSON.stringify(userData, null, 2));
        
        // Obtener el token JWT y el ID interno del usuario directamente de la respuesta
        const jwt = userData.jwt;
        const userId = userData.user.documentId; // ID interno
        
        // Enviar correo de bienvenida según el tipo de usuario
        try {
          const tipoUsuario = formData.tipoUsuario === "cliente" ? "cliente" : "operacional";
          
          // Llamar a la API para enviar el correo
          const emailResponse = await fetch('/api/emails/welcome', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: formData.username,
              email: formData.email,
              password: formData.password,
              tipoUsuario: tipoUsuario
            })
          });
          
          if (!emailResponse.ok) {
            const emailErrorText = await emailResponse.text();
            console.error("Error al enviar correo de bienvenida:", emailErrorText);
          } else {
            console.log(`Correo de bienvenida enviado a ${formData.email}`);
          }
        } catch (emailError) {
          console.error("Error al enviar correo de bienvenida:", emailError);
          // No interrumpimos el flujo si falla el envío del correo
        }
        
        if (formData.tipoUsuario === "cliente") {
          // Vincular usuario a perfil de cliente usando REST
          if (formData.perfilClienteId) {
            try {
              console.log("Intentando vincular usuario a perfil cliente usando REST. UserId:", userId, "PerfilClienteId:", formData.perfilClienteId);
              
              // Buscar el perfil cliente por documentId para obtener su ID interno
              const perfilClienteResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/perfiles-cliente?filters[documentId][$eq]=${formData.perfilClienteId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${jwt}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!perfilClienteResponse.ok) {
                const errorText = await perfilClienteResponse.text();
                console.error("Error en la respuesta de búsqueda de perfil cliente:", errorText);
                throw new Error(`Error al buscar perfil cliente: ${perfilClienteResponse.status} ${perfilClienteResponse.statusText}. Detalles: ${errorText}`);
              }
              
              const perfilClienteData = await perfilClienteResponse.json();
              console.log("Resultado de búsqueda de perfil cliente:", JSON.stringify(perfilClienteData, null, 2));
              
              if (!perfilClienteData.data || perfilClienteData.data.length === 0) {
                throw new Error(`No se encontró el perfil cliente con documentId ${formData.perfilClienteId}`);
              }
              
              const perfilClienteId = perfilClienteData.data[0].documentId;
              console.log("ID interno del perfil cliente encontrado:", perfilClienteId);
              
              // Obtener datos completos del perfil cliente
              const getPerfilClienteResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/perfiles-cliente/${perfilClienteId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${jwt}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!getPerfilClienteResponse.ok) {
                const errorText = await getPerfilClienteResponse.text();
                console.error("Error al obtener datos del perfil cliente:", errorText);
                throw new Error(`Error al obtener datos del perfil cliente: ${getPerfilClienteResponse.status} ${getPerfilClienteResponse.statusText}. Detalles: ${errorText}`);
              }
              
              const perfilClienteCompleto = await getPerfilClienteResponse.json();
              console.log("Datos actuales del perfil cliente:", JSON.stringify(perfilClienteCompleto, null, 2));
              
              // Extraer datos del perfil cliente omitiendo el id
              const { id, documentId, createdAt, updatedAt, ...perfilClienteSinId } = perfilClienteCompleto.data;
              console.log("Datos del perfil cliente sin id:", JSON.stringify(perfilClienteSinId, null, 2));
              
              // Actualizar el perfil cliente con el usuario creado
              const updatePerfilResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/perfiles-cliente/${perfilClienteId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${jwt}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  data: {
                    ...perfilClienteSinId,
                    usuario: userId,
                    publishedAt: new Date().toISOString()
                  }
                })
              });
              
              if (!updatePerfilResponse.ok) {
                const errorText = await updatePerfilResponse.text();
                console.error("Error en la respuesta de actualización del perfil cliente:", errorText);
                throw new Error(`Error al actualizar perfil cliente: ${updatePerfilResponse.status} ${updatePerfilResponse.statusText}. Detalles: ${errorText}`);
              }
              
              const updatePerfilData = await updatePerfilResponse.json();
              console.log("Resultado de actualización de perfil cliente:", JSON.stringify(updatePerfilData, null, 2));
            } catch (linkError) {
              console.error("Error al vincular usuario a perfil cliente:", linkError);
              if (linkError instanceof Error) {
                console.error("Mensaje de error:", linkError.message);
                console.error("Stack trace:", linkError.stack);
              }
              
              // Mostrar mensaje de advertencia pero continuar con el flujo
              setStatusModal({
                open: true,
                title: "Advertencia",
                message: `El usuario se creó correctamente, pero hubo un problema al vincularlo al perfil de cliente: ${linkError instanceof Error ? linkError.message : 'Error desconocido'}. El usuario puede ser vinculado manualmente más tarde.`,
                type: "error",
              });
              
              // Cerrar modal y limpiar formulario
              setIsCreateModalOpen(false);
              setFormData({
                username: "",
                email: "",
                password: "",
                tipoUsuario: "cliente",
                perfilClienteId: "",
                rolOperacional: "Jefe Operativo",
                proyectosAsignados: []
              });
              
              // Actualizar lista de usuarios
              refetchUsers();
              setIsProcessing(false);
              return; // Salir de la función para evitar mostrar el mensaje de éxito
            }
          }
        } else {
          // Crear perfil operacional usando REST
          try {
            console.log("Intentando crear perfil operacional usando REST. UserId:", userId);
            
            // Crear el perfil operacional directamente con el ID interno del usuario
            const createPerfilResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/perfiles-operacional`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                data: {
                  usuario: userId,
                  rol: formData.rolOperacional,
                  proyectosAsignados: formData.proyectosAsignados
                }
              })
            });
            
            if (!createPerfilResponse.ok) {
              const errorText = await createPerfilResponse.text();
              console.error("Error en la respuesta de creación de perfil:", errorText);
              throw new Error(`Error al crear perfil operacional: ${createPerfilResponse.status} ${createPerfilResponse.statusText}. Detalles: ${errorText}`);
            }
            
            const createPerfilData = await createPerfilResponse.json();
            console.log("Resultado de creación de perfil operacional:", JSON.stringify(createPerfilData, null, 2));
          } catch (perfilError) {
            console.error("Error al crear perfil operacional:", perfilError);
            if (perfilError instanceof Error) {
              console.error("Mensaje de error:", perfilError.message);
              console.error("Stack trace:", perfilError.stack);
            }
            
            // Mostrar mensaje de advertencia pero continuar con el flujo
            setStatusModal({
              open: true,
              title: "Advertencia",
              message: `El usuario se creó correctamente, pero hubo un problema al crear su perfil operacional: ${perfilError instanceof Error ? perfilError.message : 'Error desconocido'}. El perfil puede ser creado manualmente más tarde.`,
              type: "error",
            });
            
            // Cerrar modal y limpiar formulario
            setIsCreateModalOpen(false);
            setFormData({
              username: "",
              email: "",
              password: "",
              tipoUsuario: "cliente",
              perfilClienteId: "",
              rolOperacional: "Jefe Operativo",
              proyectosAsignados: []
            });
            
            // Actualizar lista de usuarios
            refetchUsers();
            setIsProcessing(false);
            return; // Salir de la función para evitar mostrar el mensaje de éxito
          }
        }
        
        // Mostrar mensaje de éxito
        setStatusModal({
          open: true,
          title: "Usuario creado",
          message: "El usuario ha sido creado exitosamente",
          type: "success",
        });
        
        // Cerrar modal y limpiar formulario
        setIsCreateModalOpen(false);
        setFormData({
          username: "",
          email: "",
          password: "",
          tipoUsuario: "cliente",
          perfilClienteId: "",
          rolOperacional: "Jefe Operativo",
          proyectosAsignados: []
        });
        
        setIsProcessing(false);
        
        // Actualizar lista de usuarios
        refetchUsers();
        
      } catch (error: any) {
        setIsProcessing(false);
        console.error("Error al crear usuario:", error);
        
        if (error instanceof Error) {
          console.error("Mensaje de error:", error.message);
          console.error("Stack trace:", error.stack);
        }
        
        let errorMessage = "Ha ocurrido un error al crear el usuario. Por favor, intenta nuevamente.";
        
        // Intentar obtener un mensaje de error más específico
        if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
        
        setStatusModal({
          open: true,
          title: "Error",
          message: errorMessage,
          type: "error",
        });
      }
    } catch (error: any) {
      setIsProcessing(false);
      console.error("Error general:", error);
      
      if (error instanceof Error) {
        console.error("Mensaje de error:", error.message);
        console.error("Stack trace:", error.stack);
      }
      
      setStatusModal({
        open: true,
        title: "Error",
        message: `Ha ocurrido un error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        type: "error",
      });
    }
  }

  // Filtrar usuarios según búsqueda
  const filteredUsers = usersData?.usersPermissionsUsers?.filter((user: any) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.perfil_cliente?.datosPersonaNatural?.razonSocial || "").toLowerCase().includes(searchLower) ||
      (user.perfil_cliente?.datosPersonaJuridica?.razonSocial || "").toLowerCase().includes(searchLower) ||
      (user.perfil_operacional?.rol || "").toLowerCase().includes(searchLower)
    )
  }) || []

  // Obtener perfiles de cliente disponibles
  const perfilesCliente = perfilesClienteData?.perfilesCliente || []

  // Obtener proyectos disponibles
  const proyectos = proyectosData?.proyectos || []

  // Función para manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Función para manejar cambios en proyectos asignados (multiselect)
  const handleProyectosChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options
    const selectedProyectos: string[] = []
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedProyectos.push(options[i].value)
      }
    }
    setFormData(prev => ({ ...prev, proyectosAsignados: selectedProyectos }))
  }

  // Función para ordenar usuarios
  const toggleSortOrder = (field: 'username' | 'email' | 'tipo') => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc'); // Por defecto, orden ascendente al cambiar el campo
    }
  };

  // Aplicar ordenamiento a los usuarios
  const getSortedUsers = () => {
    if (!filteredUsers) return [];
    
    return [...filteredUsers].sort((a, b) => {
      if (sortField === 'username') {
        const comparison = a.username.localeCompare(b.username);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else if (sortField === 'email') {
        const comparison = a.email.localeCompare(b.email);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        // Ordenar por tipo de usuario
        const tipoA = a.perfil_cliente ? "Cliente" : "Operacional";
        const tipoB = b.perfil_cliente ? "Cliente" : "Operacional";
        const comparison = tipoA.localeCompare(tipoB);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">
            Administra los usuarios del sistema y sus perfiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isRefetching && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#008A4B] mr-2"></div>
              Actualizando...
            </div>
          )}
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isRefetching || usersLoading}
            className={`flex items-center gap-2 ${isRefetching || usersLoading ? 'bg-[#008A4B]/70' : 'bg-[#008A4B] hover:bg-[#006837]'} text-white`}
          >
            <PlusIcon className="w-5 h-5" />
            Crear Usuario
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, email o perfil..."
            disabled={usersLoading}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg ${usersLoading ? 'bg-gray-50 text-gray-400' : 'focus:outline-none focus:ring-2 focus:ring-[#008A4B]/20 focus:border-[#008A4B]'}`}
            autoComplete="off"
          />
        </div>
        {searchQuery && !usersLoading && (
          <Button
            variant="ghost"
            onClick={() => setSearchQuery("")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Results count - Solo mostrar cuando no está cargando */}
      {!usersLoading && (
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-700">
            {filteredUsers.length} usuarios
          </div>
        </div>
      )}

      {/* Table o Skeleton según estado */}
      {(usersLoading && !usersData) || (perfilesClienteLoading && !perfilesClienteData) || (proyectosLoading && !proyectosData) ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSortOrder('username')}
                >
                  <div className="flex items-center gap-1">
                    Usuario
                    {sortField === 'username' && (
                      sortOrder === "asc" ? 
                        <ArrowUp className="h-4 w-4 ml-1" /> : 
                        <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-gray-700 hidden sm:table-cell"
                  onClick={() => toggleSortOrder('email')}
                >
                  <div className="flex items-center gap-1">
                    Email
                    {sortField === 'email' && (
                      sortOrder === "asc" ? 
                        <ArrowUp className="h-4 w-4 ml-1" /> : 
                        <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-gray-700 hidden md:table-cell"
                  onClick={() => toggleSortOrder('tipo')}
                >
                  <div className="flex items-center gap-1">
                    Tipo
                    {sortField === 'tipo' && (
                      sortOrder === "asc" ? 
                        <ArrowUp className="h-4 w-4 ml-1" /> : 
                        <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Rol</TableHead>
                <TableHead className="hidden xl:table-cell text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                    <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm font-medium">No hay usuarios que coincidan con la búsqueda</p>
                  </TableCell>
                </TableRow>
              ) : (
                getSortedUsers().map((user: any) => {
                  // Determinar tipo de usuario
                  const tipoUsuario = user.perfil_cliente ? "Cliente" : "Operacional";
                  
                  // Determinar perfil según tipo
                  let perfil = "";
                  if (tipoUsuario === "Cliente") {
                    if (user.perfil_cliente?.datosPersonaNatural) {
                      perfil = user.perfil_cliente.datosPersonaNatural.razonSocial || "Cliente";
                    } else if (user.perfil_cliente?.datosPersonaJuridica) {
                      perfil = user.perfil_cliente.datosPersonaJuridica.razonSocial || "Cliente";
                    } else {
                      perfil = "Cliente";
                    }
                  } else {
                    perfil = user.perfil_operacional?.rol || "Operacional";
                  }
                  
                  // Estado como clase CSS
                  const estadoClase = user.blocked 
                    ? "bg-red-100 text-red-800" 
                    : user.confirmed 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800";
                      
                  // Estado como texto
                  const estadoTexto = user.blocked 
                    ? "Bloqueado" 
                    : user.confirmed 
                      ? "Activo" 
                      : "Pendiente";
                  
                  return (
                    <TableRow key={user.documentId} className="hover:bg-gray-50">
                      <TableCell className="py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="ml-3 overflow-hidden">
                            <div className="text-sm font-medium text-gray-900 truncate">{user.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden sm:table-cell">
                        <div className="text-sm text-gray-900 xl:whitespace-nowrap overflow-hidden overflow-ellipsis">{user.email}</div>
                      </TableCell>
                      
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm text-gray-900">{tipoUsuario}</div>
                      </TableCell>
                      
                      <TableCell className="hidden lg:table-cell overflow-hidden">
                        <div>
                          <div className="text-sm text-gray-900 truncate">{perfil}</div>
                          {user.perfil_operacional?.proyectosAsignados?.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {user.perfil_operacional.proyectosAsignados.map((p: any) => p.nombre).join(", ")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden xl:table-cell text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoClase}`}>
                          {estadoTexto}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal para crear usuario */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="cliente" onValueChange={(value: string) => setFormData(prev => ({ ...prev, tipoUsuario: value }))}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cliente">Usuario Cliente</TabsTrigger>
              <TabsTrigger value="operacional">Usuario Operacional</TabsTrigger>
            </TabsList>
            
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario <span className="text-red-500">*</span></Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleFormChange}
                    placeholder="Ingrese nombre de usuario"
                    autoComplete="off"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="Ingrese email"
                    autoComplete="off"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña <span className="text-red-500">*</span></Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    placeholder="Ingrese contraseña"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              
              <TabsContent value="cliente" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="perfilClienteId">Perfil de Cliente</Label>
                  <Select
                    onValueChange={(value) => {
                      handleFormChange({
                        target: {
                          name: "perfilClienteId",
                          value
                        }
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }}
                    value={formData.perfilClienteId}
                  >
                    <SelectTrigger className="w-full" id="perfilClienteId">
                      <SelectValue placeholder="Seleccionar perfil de cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {perfilesCliente.map((perfil: any) => (
                        <SelectItem key={perfil.documentId} value={perfil.documentId}>
                          {perfil.tipoPersona === "Natural" 
                            ? `${perfil.datosPersonaNatural?.razonSocial} (${perfil.datosPersonaNatural?.cedula})` 
                            : `${perfil.datosPersonaJuridica?.razonSocial} (${perfil.datosPersonaJuridica?.rucPersonaJuridica?.[0]?.ruc})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Si no selecciona un perfil, el usuario deberá ser vinculado manualmente después.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="operacional" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="rolOperacional">Rol Operacional <span className="text-red-500">*</span></Label>
                  <Select
                    onValueChange={(value) => {
                      handleFormChange({
                        target: {
                          name: "rolOperacional",
                          value
                        }
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }}
                    value={formData.rolOperacional}
                  >
                    <SelectTrigger className="w-full" id="rolOperacional">
                      <SelectValue placeholder="Seleccionar rol operacional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jefe Operativo">Jefe Operativo</SelectItem>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                      <SelectItem value="Directorio">Directorio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="proyectosAsignados">Proyectos Asignados</Label>
                  <select
                    id="proyectosAsignados"
                    name="proyectosAsignados"
                    multiple
                    value={formData.proyectosAsignados}
                    onChange={handleProyectosChange}
                    className="w-full h-32 border rounded-md p-2"
                  >
                    {proyectos.map((proyecto: any) => (
                      <option key={proyecto.documentId} value={proyecto.documentId}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Mantén presionado Ctrl (o Cmd en Mac) para seleccionar múltiples proyectos.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              className="bg-[#008A4B] text-white hover:bg-[#006837]"
              disabled={isProcessing}
            >
              {isProcessing && (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              )}
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de estado */}
      <StatusModal
        open={statusModal.open}
        onOpenChange={(open: boolean) => setStatusModal(prev => ({ ...prev, open }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />
    </motion.div>
  )
}