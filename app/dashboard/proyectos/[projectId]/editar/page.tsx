'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../_lib/auth/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '../../../../_components/ui/button'
import { Input } from '../../../../_components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../_components/ui/select'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { ArrowLeftIcon, DocumentArrowUpIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { gql, useMutation, useQuery } from '@apollo/client'
import { StatusModal } from '../../../../_components/StatusModal'
import { UploadButton } from '@/utils/uploadthing'
import Image from 'next/image'
import { use } from 'react'
import { ImageIcon } from 'lucide-react'

// Consultas GraphQL
const GET_PROJECT_DETAILS = gql`
  query GetProjectDetails($documentId: ID!) {
    proyecto(documentId: $documentId) {
      documentId
      nombre
      descripcion
      ubicacion
      perfiles_operacionales {
        documentId
        usuario {
          username
        }
      }
      unidadNegocio {
        documentId
        nombre
      }
      fotoProyecto {
        documentId
        nombre
        url
        fechaSubida
      }
    }
  }
`;

const GET_UNIDADES_NEGOCIO = gql`
  query GetUnidadesNegocio {
    unidadesNegocio {
      documentId
      nombre
    }
  }
`;

const GET_PERFILES_OPERACIONALES = gql`
  query GetPerfilesOperacionales {
    perfilesOperacional {
      documentId
      usuario {
        username
      }
    }
  }
`;

const CREATE_ARCHIVO = gql`
  mutation CreateArchivo($data: ArchivoInput!) {
    createArchivo(data: $data) {
      documentId
      nombre
      url
      fechaSubida
      tipoArchivo
    }
  }
`;

const UPDATE_PROYECTO = gql`
  mutation UpdateProyecto($documentId: ID!, $data: ProyectoInput!) {
    updateProyecto(documentId: $documentId, data: $data) {
      documentId
      nombre
      descripcion
      ubicacion
      perfiles_operacionales {
        documentId
        usuario {
          username
        }
      }
    }
  }
`;

// Interfaces
interface ProjectFormData {
  nombre: string;
  descripcion: string;
  ubicacion: string;
  perfiles_operacionales: string[];
  unidadNegocio: string;
  fotoProyecto?: {
    documentId: string;
    nombre: string;
    url: string;
    fechaSubida: string;
  };
}

export default function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { role } = useAuth()
  const router = useRouter()
  const [uploadingImage, setUploadingImage] = useState(false)
  const [statusModal, setStatusModal] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({
    show: false,
    success: false,
    message: '',
  })

  // Redirección para usuarios sin permiso
  useEffect(() => {
    // Solo admin y directorio pueden acceder a esta página
    if (role !== 'Administrador' && role !== 'Directorio') {
      router.push('/dashboard/proyectos')
    }
  }, [role, router]);
  
  // Si el usuario no tiene permisos, no renderizar el contenido
  if (role !== 'Administrador' && role !== 'Directorio') {
    return null
  }

  // Obtener detalles del proyecto
  const { data: projectData, loading: loadingProject, error: errorProject } = useQuery(GET_PROJECT_DETAILS, {
    variables: { documentId: projectId },
    onError: (error) => {
      console.error("Error al cargar detalles del proyecto:", error);
      setStatusModal({
        show: true,
        success: false,
        message: 'Error al cargar los detalles del proyecto. Por favor, inténtalo de nuevo.'
      });
    }
  });

  // Obtener unidades de negocio y perfiles operacionales
  const { data: unidadesNegocioData, loading: loadingUnidades, error: errorUnidades } = useQuery(GET_UNIDADES_NEGOCIO, {
    onError: (error) => {
      console.error("Error al cargar unidades de negocio:", error);
    }
  });
  
  const { data: perfilesOperacionalesData, loading: loadingPerfiles, error: errorPerfiles } = useQuery(GET_PERFILES_OPERACIONALES, {
    onError: (error) => {
      console.error("Error al cargar perfiles operacionales:", error);
    }
  });

  const methods = useForm<ProjectFormData>({
    defaultValues: {
      nombre: '',
      descripcion: '',
      ubicacion: '',
      perfiles_operacionales: [],
      unidadNegocio: '',
    }
  });

  // Cargar datos del proyecto cuando estén disponibles
  useEffect(() => {
    // Asegurarse de que tanto los datos del proyecto como las opciones de unidad de negocio estén cargados
    if (projectData?.proyecto && unidadesNegocioData?.unidadesNegocio) {
      const proyecto = projectData.proyecto;
      methods.reset({
        nombre: proyecto.nombre || '',
        descripcion: proyecto.descripcion || '',
        ubicacion: proyecto.ubicacion || '',
        perfiles_operacionales: proyecto.perfiles_operacionales?.map((perfil: any) => perfil.documentId) || [],
        unidadNegocio: proyecto.unidadNegocio?.documentId || '',
        fotoProyecto: proyecto.fotoProyecto || undefined
      });
    }
    // Depender de los datos específicos y la función reset estable
  }, [projectData?.proyecto, unidadesNegocioData?.unidadesNegocio, methods.reset]);

  const [crearArchivo] = useMutation(CREATE_ARCHIVO);
  const [actualizarProyecto] = useMutation(UPDATE_PROYECTO);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      // Actualizar el proyecto
      const { data: proyectoResponse } = await actualizarProyecto({
        variables: {
          documentId: projectId,
          data: {
            nombre: data.nombre,
            descripcion: data.descripcion,
            perfiles_operacionales: data.perfiles_operacionales,
            unidadNegocio: data.unidadNegocio,
            fotoProyecto: data.fotoProyecto?.documentId,
          }
        }
      });

      // Mostrar mensaje de éxito
      setStatusModal({
        show: true,
        success: true,
        message: '¡Proyecto actualizado con éxito!'
      });

      // Redireccionar a la página del proyecto
      setTimeout(() => {
        router.push(`/dashboard/proyectos/${projectId}`);
      }, 2000);
    } catch (error) {
      console.error('Error al actualizar el proyecto:', error);
      setStatusModal({
        show: true,
        success: false,
        message: 'Error al actualizar el proyecto. Por favor, inténtalo de nuevo.'
      });
    }
  };

  // Función para agregar un perfil operacional
  const agregarPerfilOperacional = (perfilId: string) => {
    const perfilesActuales = methods.getValues('perfiles_operacionales') || [];
    if (!perfilesActuales.includes(perfilId)) {
      methods.setValue('perfiles_operacionales', [...perfilesActuales, perfilId]);
    }
  };

  // Función para eliminar un perfil operacional
  const eliminarPerfilOperacional = (perfilId: string) => {
    const perfilesActuales = methods.getValues('perfiles_operacionales') || [];
    methods.setValue('perfiles_operacionales', perfilesActuales.filter(id => id !== perfilId));
  };

  // Función para obtener el nombre de usuario de un perfil por su ID
  const getNombrePerfilPorId = (perfilId: string) => {
    const perfil = perfilesOperacionalesData?.perfilesOperacional?.find(
      (p: any) => p.documentId === perfilId
    );
    return perfil?.usuario?.username || 'Usuario desconocido';
  };

  if (loadingProject) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  if (errorProject) {
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar los detalles del proyecto. Por favor, intente más tarde.
      </div>
    );
  }

  // console.log(projectData?.proyecto.unidadNegocio.nombre)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-4 space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/proyectos/${projectId}`)}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-semibold">Editar Proyecto</h1>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          {/* Información básica */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-medium">Información del Proyecto</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nombre del Proyecto <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...methods.register('nombre', { required: true })}
                    placeholder="Ej: Parque Empresarial Colón"
                    className={`${methods.formState.errors.nombre ? 'border-red-500' : ''}`}
                  />
                  {methods.formState.errors.nombre && (
                    <p className="text-red-500 text-xs">Este campo es requerido</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Ubicación
                  </label>
                  <Input
                    {...methods.register('ubicacion')}
                    placeholder="Ej: Vía a Daule Km 7.5"
                    disabled={true} // No se puede editar la ubicación
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">La ubicación no se puede modificar</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  {...methods.register('descripcion')}
                  placeholder="Descripción detallada del proyecto..."
                  className="w-full text-sm font-medium min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008A4B] focus:border-transparent resize-none align-top"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Unidad de Negocio
                  </label>
                  <Controller
                    name="unidadNegocio"
                    control={methods.control}
                    render={({ field }) => {
                      return (
                        <Select
                          disabled={loadingUnidades}
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar unidad de negocio" />
                          </SelectTrigger>
                          <SelectContent>
                            {unidadesNegocioData?.unidadesNegocio?.map((unidad: any) => (
                              <SelectItem key={unidad.documentId} value={unidad.documentId}>
                                {unidad.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }}
                  />
                  {errorUnidades && (
                    <p className="text-amber-500 text-xs">No se pudieron cargar las unidades de negocio</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Administradores del Proyecto
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(value) => {
                        if (value && value !== "") {
                          agregarPerfilOperacional(value);
                        }
                      }}>
                        <SelectTrigger disabled={loadingPerfiles}>
                          <SelectValue placeholder="Seleccionar perfil operacional" />
                        </SelectTrigger>
                        <SelectContent>
                          {perfilesOperacionalesData?.perfilesOperacional?.map((perfil: any) => {
                            const perfilesSeleccionados = methods.watch('perfiles_operacionales') || [];
                            // No mostrar perfiles ya seleccionados
                            if (!perfilesSeleccionados.includes(perfil.documentId)) {
                              return (
                                <SelectItem key={perfil.documentId} value={perfil.documentId}>
                                  {perfil?.usuario?.username}
                                </SelectItem>
                              );
                            }
                            return null;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Lista de perfiles seleccionados */}
                    <div className="mt-2 space-y-2">
                      {methods.watch('perfiles_operacionales')?.map((perfilId: string) => (
                        <div key={perfilId} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                          <span className="text-sm">{getNombrePerfilPorId(perfilId)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarPerfilOperacional(perfilId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {errorPerfiles && (
                    <p className="text-amber-500 text-xs">No se pudieron cargar los perfiles operacionales</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Foto del Proyecto
                </label>
                <div className="border rounded-lg p-4 flex flex-col items-center justify-center">
                  {methods.watch('fotoProyecto') ? (
                    <div className="relative w-full h-48 mb-4">
                      <Image
                        src={methods.watch('fotoProyecto')?.url || ''}
                        alt="Foto del proyecto"
                        fill
                        className="object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => methods.setValue('fotoProyecto', undefined)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full">
                      <UploadButton
                        endpoint="propertyImage"
                        appearance={{
                          button: `border border-[#008A4B] !text-[#008A4B] hover:bg-[#008A4B] hover:!text-white text-sm font-medium px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                            uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                          }`,
                          allowedContent: "hidden"
                        }}
                        content={{
                          button({ ready, isUploading }) {
                            if (ready) {
                              return (
                                <>
                                  <ImageIcon className="w-4 h-4" />
                                  <span>{isUploading || uploadingImage ? "Subiendo..." : "Subir imagen"}</span>
                                  {isUploading && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#008A4B] ml-2"></div>
                                  )}
                                </>
                              );
                            }
                          }
                        }}
                        onUploadBegin={() => {
                          setUploadingImage(true);
                        }}
                        onClientUploadComplete={async (res) => {
                          try {
                            const { data } = await crearArchivo({
                              variables: {
                                data: {
                                  nombre: res[0].name,
                                  url: res[0].url,
                                  tipoArchivo: "imagen",
                                  fechaSubida: new Date().toISOString()
                                }
                              }
                            });
                            methods.setValue('fotoProyecto', data.createArchivo);
                          } catch (error) {
                            console.error("Error al crear archivo:", error);
                          } finally {
                            setUploadingImage(false);
                          }
                        }}
                        onUploadError={(error: Error) => {
                          console.error("Error al subir imagen:", error);
                          setUploadingImage(false);
                        }}
                        className="ut-button:bg-[#008A4B] ut-button:ut-readying:bg-[#008A4B]/80 ut-button:ut-uploading:bg-[#008A4B]/80"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/proyectos/${projectId}`)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#008A4B] hover:bg-[#006837]"
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Subiendo imagen...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </FormProvider>

      {/* Modal de estado - Solo se muestra cuando statusModal.show es true */}
      {statusModal.show && (
        <StatusModal
          open={statusModal.show}
          onOpenChange={(open) => setStatusModal({ ...statusModal, show: open })}
          type={statusModal.success ? "success" : "error"}
          title={statusModal.success ? "¡Éxito!" : "Error"}
          message={statusModal.message}
          onClose={() => setStatusModal({ ...statusModal, show: false })}
          actionLabel="Cerrar"
          onAction={() => setStatusModal({ ...statusModal, show: false })}
        />
      )}
    </motion.div>
  )
} 