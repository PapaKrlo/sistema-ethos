'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../_lib/auth/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '../../../_components/ui/button'
import { Input } from '../../../_components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../_components/ui/select'
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form'
import { ArrowLeftIcon, DocumentArrowUpIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { gql, useMutation, useQuery } from '@apollo/client'
import { StatusModal } from '../../../_components/StatusModal'
import { UploadButton } from '@/utils/uploadthing'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'

// Consultas GraphQL
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

const CREATE_PROYECTO = gql`
  mutation CreateProyecto($data: ProyectoInput!) {
    createProyecto(data: $data) {
      documentId
      nombre
      descripcion
      ubicacion
      tasaBaseFondoInicial
      tasaBaseAlicuotaOrdinaria
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
  tasaBaseFondoInicial: number;
  tasaBaseAlicuotaOrdinaria: number;
  alicuotasExtraordinarias: Array<{
    descripcion: string;
    monto: number;
    fechaInicio: string;
    fechaFin: string;
  }>;
}

export default function NewProjectPage() {
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

  // Solo admin y directorio pueden acceder a esta página
  if (role !== 'Administrador' && role !== 'Directorio') {
    router.push('/dashboard')
    return null
  }

  // Obtener unidades de negocio y perfiles operacionales
  const { data: unidadesNegocioData, loading: loadingUnidades, error: errorUnidades } = useQuery(GET_UNIDADES_NEGOCIO, {
    onError: (error) => {
      console.error("Error al cargar unidades de negocio:", error);
      // No mostramos el modal de error aquí para evitar que aparezca al cargar
    }
  });
  
  const { data: perfilesOperacionalesData, loading: loadingPerfiles, error: errorPerfiles } = useQuery(GET_PERFILES_OPERACIONALES, {
    onError: (error) => {
      console.error("Error al cargar perfiles operacionales:", error);
      // No mostramos el modal de error aquí para evitar que aparezca al cargar
    }
  });

  const methods = useForm<ProjectFormData>({
    defaultValues: {
      nombre: '',
      descripcion: '',
      ubicacion: '',
      perfiles_operacionales: [],
      unidadNegocio: '',
      tasaBaseFondoInicial: 5,
      tasaBaseAlicuotaOrdinaria: 0,
      alicuotasExtraordinarias: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: 'alicuotasExtraordinarias'
  });

  const [crearArchivo] = useMutation(CREATE_ARCHIVO);
  const [crearProyecto] = useMutation(CREATE_PROYECTO);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      // Crear el proyecto
      const { data: proyectoResponse } = await crearProyecto({
        variables: {
          data: {
            nombre: data.nombre,
            descripcion: data.descripcion,
            ubicacion: data.ubicacion,
            perfiles_operacionales: data.perfiles_operacionales,
            unidadNegocio: data.unidadNegocio,
            fotoProyecto: data.fotoProyecto?.documentId,
            tasaBaseFondoInicial: data.tasaBaseFondoInicial,
            tasaBaseAlicuotaOrdinaria: data.tasaBaseAlicuotaOrdinaria,
            alicuotasExtraordinarias: data.alicuotasExtraordinarias.map(alicuota => ({
              descripcion: alicuota.descripcion,
              monto: alicuota.monto,
              fechaInicio: alicuota.fechaInicio,
              fechaFin: alicuota.fechaFin
            }))
          }
        }
      });

      // Mostrar mensaje de éxito
      setStatusModal({
        show: true,
        success: true,
        message: '¡Proyecto creado con éxito!'
      });

      // Redireccionar a la página del proyecto
      setTimeout(() => {
        router.push(`/dashboard/proyectos/${proyectoResponse.createProyecto.documentId}`);
      }, 2000);
    } catch (error) {
      console.error('Error al crear el proyecto:', error);
      setStatusModal({
        show: true,
        success: false,
        message: 'Error al crear el proyecto. Por favor, inténtalo de nuevo.'
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-4 space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/proyectos')}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-semibold">Crear Nuevo Proyecto</h1>
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
                    Ubicación <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...methods.register('ubicacion', { required: true })}
                    placeholder="Ej: Vía a Daule Km 7.5"
                    className={`${methods.formState.errors.ubicacion ? 'border-red-500' : ''}`}
                  />
                  {methods.formState.errors.ubicacion && (
                    <p className="text-red-500 text-xs">Este campo es requerido</p>
                  )}
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
                    render={({ field }) => (
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
                    )}
                  />
                  {errorUnidades && (
                    <p className="text-amber-500 text-xs">No se pudieron cargar las unidades de negocio</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Perfiles Operacionales
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
                            // No mostramos el modal aquí, solo un mensaje de error debajo del botón
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

          {/* Tasas y Alícuotas */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-medium">Tasas y Alícuotas</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tasa Base Fondo Inicial ($/m²)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...methods.register('tasaBaseFondoInicial', { 
                      valueAsNumber: true,
                      min: 0
                    })}
                    placeholder="5.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tasa Base Alícuota Ordinaria ($/m²)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...methods.register('tasaBaseAlicuotaOrdinaria', { 
                      valueAsNumber: true,
                      min: 0
                    })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">Alícuotas Extraordinarias</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({
                      descripcion: '',
                      monto: 0,
                      fechaInicio: '',
                      fechaFin: ''
                    })}
                    className="flex items-center gap-1 text-[#008A4B] border-[#008A4B]/30 hover:bg-[#008A4B]/10"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Agregar
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">Alícuota Extraordinaria #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Descripción <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...methods.register(`alicuotasExtraordinarias.${index}.descripcion`, { required: true })}
                          placeholder="Ej: Renovación de fachada"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Monto ($/m²) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...methods.register(`alicuotasExtraordinarias.${index}.monto`, { 
                            required: true,
                            valueAsNumber: true,
                            min: 0
                          })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Fecha Inicio <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          {...methods.register(`alicuotasExtraordinarias.${index}.fechaInicio`, { required: true })}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Fecha Fin <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          {...methods.register(`alicuotasExtraordinarias.${index}.fechaFin`, { required: true })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        </div>
      </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/proyectos')}
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
                'Crear Proyecto'
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