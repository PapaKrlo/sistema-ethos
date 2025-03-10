'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '../../_lib/auth/AuthContext'
import { gql, useQuery, useMutation } from '@apollo/client'
import { Button } from '../../_components/ui/button'
import { Input } from '../../_components/ui/input'
import { Label } from '../../_components/ui/label'
import { StatusModal } from '../../_components/StatusModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../_components/ui/tabs"

const GET_PERFIL_CLIENTE = gql`
  query GetPerfilCliente($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      documentId
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
      contactoAccesos {
        nombreCompleto
        email
        telefono
      }
      contactoGerente {
        email
        telefono
      }
      contactoAdministrativo {
        email
        telefono
      }
      contactoProveedores {
        email
        telefono
      }
    }
  }
`;

const UPDATE_PERFIL_CLIENTE = gql`
  mutation UpdatePerfilCliente($documentId: ID!, $data: PerfilClienteInput!) {
    updatePerfilCliente(documentId: $documentId, data: $data) {
      documentId
      contactoAccesos {
        nombreCompleto
        email
        telefono
      }
      contactoGerente {
        email
        telefono
      }
      contactoAdministrativo {
        email
        telefono
      }
      contactoProveedores {
        email
        telefono
      }
    }
  }
`;

interface ContactoForm {
  nombreCompleto?: string;
  email: string;
  telefono: string;
}

export default function PerfilPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState('accesos')
  const [formData, setFormData] = useState({
    accesos: {
      nombreCompleto: '',
      email: '',
      telefono: ''
    },
    gerente: {
      email: '',
      telefono: ''
    },
    administrativo: {
      email: '',
      telefono: ''
    },
    proveedores: {
      email: '',
      telefono: ''
    }
  })
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

  // Consultar perfil cliente
  const { data, loading } = useQuery(GET_PERFIL_CLIENTE, {
    variables: {
      documentId: user?.perfil_cliente?.documentId
    },
    skip: !user?.perfil_cliente?.documentId
  })

  // Mutación para actualizar perfil
  const [updatePerfilCliente] = useMutation(UPDATE_PERFIL_CLIENTE)

  // Cargar datos existentes
  useEffect(() => {
    if (data?.perfilCliente) {
      const perfil = data.perfilCliente
      setFormData({
        accesos: {
          nombreCompleto: perfil.contactoAccesos?.[0]?.nombreCompleto || '',
          email: perfil.contactoAccesos?.[0]?.email || '',
          telefono: perfil.contactoAccesos?.[0]?.telefono || ''
        },
        gerente: {
          email: perfil.contactoGerente?.email || '',
          telefono: perfil.contactoGerente?.telefono || ''
        },
        administrativo: {
          email: perfil.contactoAdministrativo?.email || '',
          telefono: perfil.contactoAdministrativo?.telefono || ''
        },
        proveedores: {
          email: perfil.contactoProveedores?.email || '',
          telefono: perfil.contactoProveedores?.telefono || ''
        }
      })
    }
  }, [data])
  // Si no es un perfil cliente, redirigir al dashboard
  if (!user?.perfil_cliente) {
    router.push('/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Preparar los datos para actualizar
      const updateData = {
        contactoAccesos: formData.accesos.nombreCompleto || formData.accesos.email || formData.accesos.telefono ? [{
          nombreCompleto: formData.accesos.nombreCompleto || "",
          email: formData.accesos.email || "",
          telefono: formData.accesos.telefono || ""
        }] : [],
        contactoGerente: formData.gerente.email || formData.gerente.telefono ? {
          email: formData.gerente.email || "",
          telefono: formData.gerente.telefono || ""
        } : null,
        contactoAdministrativo: formData.administrativo.email || formData.administrativo.telefono ? {
          email: formData.administrativo.email || "",
          telefono: formData.administrativo.telefono || ""
        } : null,
        contactoProveedores: formData.proveedores.email || formData.proveedores.telefono ? {
          email: formData.proveedores.email || "",
          telefono: formData.proveedores.telefono || ""
        } : null
      }

      // Actualizar perfil
      const { data: updateResult } = await updatePerfilCliente({
        variables: {
          documentId: user?.perfil_cliente?.documentId,
          data: updateData
        }
      })

      if (updateResult?.updatePerfilCliente) {
        setStatusModal({
          open: true,
          title: "¡Éxito!",
          message: "Tu información de contacto ha sido actualizada",
          type: "success"
        })
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      setStatusModal({
        open: true,
        title: "Error",
        message: "Hubo un error al actualizar tu información. Por favor intenta nuevamente.",
        type: "error"
      })
    }

    setIsProcessing(false)
  }

  const handleInputChange = (tab: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab as keyof typeof formData],
        [name]: value
      }
    }))
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mi Perfil</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona tu información de contacto
        </p>
      </div>

      {/* Información del perfil */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h2>
        
        {/* Datos del perfil */}
        <div className="mb-6 space-y-2">
          <p className="text-sm text-gray-500">Tipo de Persona</p>
          <p className="font-medium">{data?.perfilCliente?.tipoPersona}</p>
          
          <p className="text-sm text-gray-500 mt-4">
            {data?.perfilCliente?.tipoPersona === 'Natural' ? 'Nombre' : 'Razón Social'}
          </p>
          <p className="font-medium">
            {data?.perfilCliente?.tipoPersona === 'Natural'
              ? data?.perfilCliente?.datosPersonaNatural?.razonSocial
              : data?.perfilCliente?.datosPersonaJuridica?.razonSocial}
          </p>
          
          <p className="text-sm text-gray-500 mt-4">
            {data?.perfilCliente?.tipoPersona === 'Natural' ? 'Cédula' : 'RUC'}
          </p>
          <p className="font-medium">
            {data?.perfilCliente?.tipoPersona === 'Natural'
              ? data?.perfilCliente?.datosPersonaNatural?.cedula
              : data?.perfilCliente?.datosPersonaJuridica?.rucPersonaJuridica?.[0]?.ruc}
          </p>
        </div>

        {/* Formulario de contactos */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Contacto</h3>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="accesos">Accesos</TabsTrigger>
              <TabsTrigger value="gerente">Gerente</TabsTrigger>
              <TabsTrigger value="administrativo">Administrativo</TabsTrigger>
              <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            </TabsList>

            <TabsContent value="accesos" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nombreCompleto">Nombre Completo</Label>
                <Input
                  id="nombreCompleto"
                  name="nombreCompleto"
                  value={formData.accesos.nombreCompleto}
                  onChange={handleInputChange('accesos')}
                  placeholder="Ingresa el nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.accesos.email}
                  onChange={handleInputChange('accesos')}
                  placeholder="Ingresa el email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.accesos.telefono}
                  onChange={handleInputChange('accesos')}
                  placeholder="Ingresa el teléfono"
                />
              </div>
            </TabsContent>

            <TabsContent value="gerente" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.gerente.email}
                  onChange={handleInputChange('gerente')}
                  placeholder="Ingresa el email del gerente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.gerente.telefono}
                  onChange={handleInputChange('gerente')}
                  placeholder="Ingresa el teléfono del gerente"
                />
              </div>
            </TabsContent>

            <TabsContent value="administrativo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.administrativo.email}
                  onChange={handleInputChange('administrativo')}
                  placeholder="Ingresa el email del contacto administrativo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.administrativo.telefono}
                  onChange={handleInputChange('administrativo')}
                  placeholder="Ingresa el teléfono del contacto administrativo"
                />
              </div>
            </TabsContent>

            <TabsContent value="proveedores" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.proveedores.email}
                  onChange={handleInputChange('proveedores')}
                  placeholder="Ingresa el email para proveedores"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.proveedores.telefono}
                  onChange={handleInputChange('proveedores')}
                  placeholder="Ingresa el teléfono para proveedores"
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button
            type="submit"
            className="w-full bg-[#008A4B] text-white hover:bg-[#006837]"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </form>
      </div>

      {/* Modal de estado */}
      <StatusModal
        open={statusModal.open}
        onOpenChange={(open) => setStatusModal(prev => ({ ...prev, open }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />
    </motion.div>
  )
} 