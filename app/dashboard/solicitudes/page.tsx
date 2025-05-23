"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../_lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { gql, useQuery, useMutation } from "@apollo/client";
import {
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperClipIcon,
  PlusCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  ArrowPathIcon,
  UserPlusIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "../../_components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../_components/ui/dialog";
import { Input } from "../../_components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../_components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../_components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "../../_components/ui/card";
import { Badge } from "../../_components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../_components/ui/table";
import { Label } from "../../_components/ui/label";
import toast from "react-hot-toast";
import { UploadButton } from "@/utils/uploadthing";

// Componente Textarea personalizado
const Textarea = ({
  className = "",
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) => {
  return (
    <textarea
      className={`flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008A4B] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      rows={rows}
      {...props}
    />
  );
};

// Componente SELECT custom con valores
const SelectField = ({
  value,
  onChange,
  disabled,
  placeholder,
  children,
  className,
}: {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Select
      disabled={disabled}
      value={value || ""}
      onValueChange={onChange}
      defaultValue={value || ""}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
};

// Opción para SelectField
const Option = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => {
  return <SelectItem value={value}>{children}</SelectItem>;
};

// Consulta para obtener solicitudes
const GET_SOLICITUDES = gql`
  query GetSolicitudes($filters: SolicitudFiltersInput) {
    solicitudes(sort: "fechaActualizacion:desc", filters: $filters) {
      documentId
      tipoSolicitud
      estado
      fechaCreacion
      fechaActualizacion
      detallesSolicitud {
        descripcion
        detallesVenta {
          potencialComprador
          rucComprador
        }
        detallesRenta {
          fechaInicioArrendamiento
          fechaFinArrendamiento
          potencialArrendatario
          CondicionesEspeciales
          rucArrendador
        }
      }
      solicitante {
        documentId
        username
        email
      }
      revisor {
        documentId
        username
      }
      propiedad {
        documentId
        codigoCatastral
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
        proyecto {
          documentId
          nombre
        }
      }

      # Documentos
      documentos {
        tipoDocumento
        pdf {
          documentId
          nombre
          url
          createdAt
        }
      }

      # Historial
      historialCambios {
        fecha
        usuario {
          documentId
          username
          email
        }
        accion
        descripcion
        estadoAnterior
        estadoNuevo
      }

      # Apelación
      apelacion
      detallesApelacion

      # Comentarios
      comentarios {
        contenido
        fecha
        usuario {
          documentId
          username
          email
        }
        adjuntos {
          documentId
          url
          name
        }
      }
    }
  }
`;

// Consulta para obtener propiedades de un usuario
const GET_PROPIEDADES_USUARIO = gql`
  query GetPropiedadesUsuario($userId: ID!) {
    usersPermissionsUser(documentId: $userId) {
      perfil_cliente {
        propiedades {
          documentId
          codigoCatastral
          identificadores {
            idSuperior
            superior
            idInferior
            inferior
          }
        }
      }
    }
  }
`;

// Mutación para crear una solicitud
const CREATE_SOLICITUD = gql`
  mutation CreateSolicitud(
    $tipoSolicitud: ENUM_SOLICITUD_TIPOSOLICITUD!
    $estado: ENUM_SOLICITUD_ESTADO!
    $solicitante: ID!
    $propiedad: ID!
    $detallesSolicitud: ComponentSolicitudDetallesInput
    $historialCambios: [ComponentSolicitudHistorialInput]
    $fechaCreacion: DateTime!
    $fechaActualizacion: DateTime!
  ) {
    createSolicitud(
      data: {
        tipoSolicitud: $tipoSolicitud
        estado: $estado
        fechaCreacion: $fechaCreacion
        fechaActualizacion: $fechaActualizacion
        solicitante: $solicitante
        propiedad: $propiedad
        detallesSolicitud: $detallesSolicitud
        historialCambios: $historialCambios
      }
    ) {
      documentId
      tipoSolicitud
      estado
      fechaCreacion
      fechaActualizacion
      solicitante {
        documentId
        username
        email
      }
      revisor {
        documentId
        username
      }
      propiedad {
        documentId
        codigoCatastral
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
      }
      detallesSolicitud {
        descripcion
        detallesVenta {
          potencialComprador
          rucComprador
        }
        detallesRenta {
          fechaInicioArrendamiento
          fechaFinArrendamiento
          potencialArrendatario
          CondicionesEspeciales
          rucArrendador
        }
      }
    }
  }
`;

// Mutación para actualizar una solicitud
const UPDATE_SOLICITUD = gql`
  mutation UpdateSolicitud($documentId: ID!, $data: SolicitudInput!) {
    updateSolicitud(documentId: $documentId, data: $data) {
      documentId
      estado
    }
  }
`;

// Mutación para añadir un documento
const ADD_DOCUMENTO = gql`
  mutation AddDocumento(
    $solicitudId: ID!
    $tipoDocumento: String!
    $pdf: Upload!
  ) {
    updateSolicitud(
      documentId: $solicitudId
      data: { documentos: [{ tipoDocumento: $tipoDocumento, pdf: $pdf }] }
    ) {
      documentId
      documentos {
        tipoDocumento
        pdf {
          documentId
          url
          name
        }
      }
    }
  }
`;

// Mutación para añadir un comentario
const ADD_COMENTARIO = gql`
  mutation AddComentario(
    $solicitudId: ID!
    $comentariosCompletos: [ComponentSolicitudComentarioInput]
  ) {
    updateSolicitud(
      documentId: $solicitudId
      data: { comentarios: $comentariosCompletos }
    ) {
      documentId
      comentarios {
        contenido
        fecha
        usuario {
          documentId
          username
        }
        adjuntos {
          documentId
          url
          name
        }
      }
    }
  }
`;

// Añadir la mutación para crear archivo
const CREATE_ARCHIVO = gql`
  mutation CreateArchivo($data: ArchivoInput!) {
    createArchivo(data: $data) {
      documentId
      nombre
      url
      tipoArchivo
    }
  }
`;

const UPDATE_PROPIEDAD = gql`
  mutation UpdatePropiedad($documentId: ID!, $data: PropiedadInput!) {
    updatePropiedad(documentId: $documentId, data: $data) {
      documentId
    }
  }
`;
// Funciones de ayuda
const formatearFecha = (fecha: string | null) => {
  if (!fecha) return "N/A";
  return format(new Date(fecha), "dd/MM/yyyy", { locale: es });
};

const colorEstado = (estado: string) => {
  const colores: Record<string, string> = {
    pendiente_certificado: "bg-yellow-100 text-yellow-800",
    revision_certificado: "bg-blue-200 text-blue-800",
    certificado_aprobado: "bg-green-100 text-green-800",
    pendiente_directorio: "bg-purple-100 text-purple-800", // Nuevo estado
    directorio_aprobado: "bg-green-200 text-green-800", // Nuevo estado
    certificado_rechazado: "bg-red-100 text-red-800",
    pendiente_plan_pagos: "bg-purple-100 text-purple-800",
    plan_pagos_aprobado: "bg-green-100 text-green-800",
    pendiente_contrato: "bg-yellow-100 text-yellow-800",
    revision_contrato: "bg-blue-100 text-blue-800",
    contrato_aprobado: "bg-green-100 text-green-800",
    contrato_rechazado: "bg-red-100 text-red-800",
    compraventa_aprobada: "bg-green-100 text-green-800",
    compraventa_rechazada: "bg-red-100 text-red-800",
    rechazado: "bg-red-100 text-red-800",
    documento_rechazado: "bg-orange-100 text-orange-800", // Nuevo estado
    solicitud_cerrada: "bg-gray-100 text-gray-800", // Nuevo estado
    aprobado: "bg-green-100 text-green-800",
  };

  return colores[estado] || "bg-gray-100 text-gray-800";
};

// Interfaces actualizadas para Strapi 5
interface Propiedad {
  id: string | undefined;
  codigoCatastral: string;
  identificadores: {
    idSuperior: string;
    superior: string;
    idInferior: string;
    inferior: string;
  };
  proyecto: {
    documentId: string;
    nombre: string;
  };
}

interface Usuario {
  documentId?: string;
  id: string | undefined;
  username: string;
  email: string;
}

interface DetallesVenta {
  precioVenta?: string;
  fechaPropuestaEscrituracion?: string;
  potencialComprador?: string;
  condicionesEspeciales?: string;
}

interface DetallesRenta {
  precioRenta?: string;
  duracionContrato?: string;
  fechaInicioDeseada?: string;
  fechaInicioArrendamiento?: string;
  fechaFinArrendamiento?: string;
  potencialArrendatario?: string;
  condicionesEspeciales?: string;
}

interface Documento {
  tipoDocumento: string;
  pdf: {
    documentId?: string;
    id?: string;
    name: string;
    url: string;
    createdAt?: string;
  };
}

interface HistorialCambio {
  fecha: string;
  usuario: {
    documentId?: string;
    id: string | undefined;
    username: string;
    email: string;
  };
  accion: string;
  descripcion: string;
  estadoAnterior?: string;
  estadoNuevo: string;
}

interface Comentario {
  contenido: string;
  fecha: string;
  usuario: {
    documentId?: string;
    id: string | undefined;
    username: string;
    email: string;
  };
  adjuntos: {
    id: string | any;
    url: string;
    name: string;
  }[];
}

interface Solicitud {
  id: string | any;
  tipoSolicitud: "venta" | "renta";
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  descripcion?: string;
  solicitante: Usuario;
  propiedad: Propiedad;
  detallesSolicitud: {
    descripcion: string;
    detallesVenta?: DetallesVenta;
    detallesRenta?: DetallesRenta;
  };
  historialCambios: HistorialCambio[];
  documentos: Documento[];
  comentarios: Comentario[];
  apelacion?: boolean;
  detallesApelacion?: string;
  revisor?: Usuario;
}

// Componentes reutilizables
const SubirDocumentoForm = ({
  tipoDocumento,
  onSubmit,
  label,
}: {
  tipoDocumento: string;
  onSubmit: (file: File) => void;
  label: string;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const [createArchivo] = useMutation(CREATE_ARCHIVO);

  const handleUploadComplete = async (res: { url: string; name: string }[]) => {
    if (res.length === 0) return;

    setIsUploading(true);
    try {
      // Crear archivo en la base de datos
      const { data: archivoData } = await createArchivo({
        variables: {
          data: {
            nombre: res[0].name,
            url: res[0].url,
            tipoArchivo: "pdf",
            fechaSubida: new Date().toISOString(),
          },
        },
      });

      // eslint-disable-next-line no-console
      console.log("Archivo creado:", archivoData);

      // Guardar información del archivo subido para mostrar confirmación
      setUploadedFile({
        name: res[0].name,
        url: res[0].url,
      });

      // Pasar archivo creado al manejador
      onSubmit({
        id: archivoData.createArchivo.documentId,
        name: res[0].name,
        url: res[0].url,
      } as any);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error al crear archivo:", error);

      // Mostrar mensaje de error al usuario
      toast.error("Error al crear el archivo. Por favor intente nuevamente.");

      // Mostrar detalles específicos del error en la consola
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error("Mensaje de error:", error.message);

        // Si es un error de GraphQL, mostrar detalles adicionales
        if ("graphQLErrors" in error) {
          // eslint-disable-next-line no-console
          console.error("GraphQL errors:", (error as any).graphQLErrors);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };
  console.log("uploadedFile", uploadedFile);
  if (uploadedFile) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-center">
        <DocumentIcon className="h-5 w-5 text-green-500 mr-2" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            ¡Documento subido con éxito!
          </p>
          <p className="text-xs text-green-600">{uploadedFile.name}</p>
        </div>
        <a
          href={uploadedFile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          Ver
        </a>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-6 max-w-md">
      <div className="flex flex-col items-center justify-center space-y-2">
        <UploadButton
          endpoint="propertyDocument"
          onUploadBegin={() => setIsUploading(true)}
          onClientUploadComplete={handleUploadComplete}
          onUploadError={(error: Error) => {
            console.error("Error uploading:", error);
            setIsUploading(false);
          }}
          appearance={{
            button: `border border-gray-300 text-gray-700 hover:bg-gray-50 !text-[#008A4B] text-sm font-medium px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
              isUploading ? "opacity-50 cursor-not-allowed" : ""
            }`,
            allowedContent: "hidden",
          }}
          content={{
            button({ ready }) {
              if (!ready) return "Cargando...";
              if (isUploading) {
                return (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent" />
                    <span>Subiendo...</span>
                  </>
                );
              }
              return (
                <>
                  <DocumentIcon className="w-5 h-5" />
                  <span>{label}</span>
                </>
              );
            },
          }}
        />
      </div>
    </div>
  );
};

const MostrarDocumentos = ({
  documentos,
  tipoDocumento = "", // Hacemos el tipo opcional
}: {
  documentos: Array<any>;
  tipoDocumento?: string;
}) => {
  console.log("Documentos:", documentos);
  // Si se proporciona un tipo, filtramos por él, de lo contrario mostramos todos
  const docsAMostrar = tipoDocumento
    ? documentos.filter((doc: any) => doc.tipoDocumento === tipoDocumento)
    : documentos;

  const docsFormateados = docsAMostrar.map((doc: any) => {
    // Asegurar formato consistente
    return {
      tipoDocumento: doc.tipoDocumento,
      pdf: doc.pdf ||
        doc.archivo || {
          name: "Documento sin nombre",
          url: "",
        },
    };
  });

  if (docsFormateados.length === 0) {
    return (
      <p className="text-sm text-gray-500">No hay documentos disponibles.</p>
    );
  }

  // Función para obtener un nombre legible del tipo de documento
  const getNombreTipoDocumento = (tipo: string) => {
    const tipos: Record<string, string> = {
      certificadoExpensas: "Certificado de Expensas",
      contratoCompraVenta: "Contrato de Compraventa",
      contratoArrendamiento: "Contrato de Arrendamiento",
      escritura: "Escritura",
      planPagos: "Plan de Pagos",
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="space-y-2">
      {docsFormateados.map((doc: any, index: number) => (
        <div
          key={index}
          className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
        >
          <div className="flex flex-col">
            <div className="flex items-center">
              <DocumentIcon className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium">
                {doc.pdf.nombre || "Documento"}
              </span>
            </div>
            <span className="text-xs text-gray-500 ml-7">
              {getNombreTipoDocumento(doc.tipoDocumento)}
            </span>
          </div>
          <a
            href={doc.pdf.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            Ver
          </a>
        </div>
      ))}
    </div>
  );
};

const ModalRechazo = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (motivo: string) => Promise<void>;
}) => {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo) return;

    setEnviando(true);
    try {
      await onSubmit(motivo);
    } catch (error) {
      console.error("Error al rechazar solicitud:", error);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Rechazar Solicitud
          </h3>
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo del rechazo
              </label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
                rows={4}
                placeholder="Indique el motivo por el cual rechaza esta solicitud..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!motivo || enviando}
              >
                {enviando ? "Enviando..." : "Rechazar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

const ModalCrearSolicitud = ({
  onClose,
  onSubmit,
  userId,
}: {
  onClose: () => void;
  onSubmit: (datos: {
    tipoSolicitud: string;
    propiedadId: string;
    detallesSolicitud: {
      descripcion: string;
      detallesVenta?: {
        potencialComprador?: string;
        rucComprador?: string;
      };
      detallesRenta?: {
        fechaInicioArrendamiento?: string;
        fechaFinArrendamiento?: string;
        potencialArrendatario?: string;
        rucArrendador?: string;
        condicionesEspeciales?: string;
      };
    };
  }) => Promise<void>;
  userId: string | undefined;
}) => {
  const [cargando, setCargando] = useState(false);
  const [tipoSolicitud, setTipoSolicitud] = useState("venta");
  const [propiedadId, setPropiedadId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Detalles de venta
  const [potencialComprador, setPotencialComprador] = useState("");
  const [rucComprador, setRucComprador] = useState("");
  // Detalles de renta
  const [fechaInicioArrendamiento, setFechaInicioArrendamiento] = useState("");
  const [fechaFinArrendamiento, setFechaFinArrendamiento] = useState("");
  const [potencialArrendatario, setPotencialArrendatario] = useState("");
  const [rucArrendador, setRucArrendador] = useState("");
  const [condicionesEspeciales, setCondicionesEspeciales] = useState("");

  // Obtener propiedades del usuario
  const { data: propiedadesData, loading: cargandoPropiedades } = useQuery(
    GET_PROPIEDADES_USUARIO,
    {
      variables: { userId },
      skip: !userId,
    }
  );

  // Mostrar las propiedades al cargar los datos
  useEffect(() => {
    if (propiedadesData?.usersPermissionsUser?.perfil_cliente?.propiedades) {
      console.log("Propiedades cargadas:");
      propiedadesData.usersPermissionsUser.perfil_cliente.propiedades.forEach(
        (propiedad: any, index: number) => {
          console.log(`Propiedad ${index + 1}:`, {
            documentId: propiedad.documentId,
            identificadores: propiedad.identificadores,
          });
        }
      );
    }
  }, [propiedadesData]);

  // Depuración de valores
  useEffect(() => {
    if (propiedadesData) {
      console.log("Datos de propiedades:", propiedadesData);
      console.log("Propiedad ID:", propiedadId);
    }
  }, [propiedadesData, propiedadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    // Log de los datos del formulario
    console.log("Datos del formulario a enviar:", {
      tipoSolicitud,
      propiedadId,
      descripcion,
      detallesSolicitud: {
        descripcion,
        detallesVenta:
          tipoSolicitud === "venta"
            ? {
                potencialComprador,
                rucComprador,
              }
            : undefined,
        detallesRenta:
          tipoSolicitud === "renta"
            ? {
                fechaInicioArrendamiento,
                fechaFinArrendamiento,
                potencialArrendatario,
                rucArrendador,
                condicionesEspeciales,
              }
            : undefined,
      },
    });

    try {
      const datos = {
        tipoSolicitud,
        propiedadId,
        detallesSolicitud: {
          descripcion,
          ...(tipoSolicitud === "venta"
            ? {
                detallesVenta: {
                  potencialComprador: potencialComprador || undefined,
                  rucComprador: rucComprador || undefined,
                },
              }
            : {
                detallesRenta: {
                  fechaInicioArrendamiento:
                    fechaInicioArrendamiento || undefined,
                  fechaFinArrendamiento: fechaFinArrendamiento || undefined,
                  potencialArrendatario: potencialArrendatario || undefined,
                  rucArrendador: rucArrendador || undefined,
                  condicionesEspeciales: condicionesEspeciales || undefined,
                },
              }),
        },
      };

      await onSubmit(datos);
    } catch (error) {
      console.error("Error al crear solicitud:", error);
      setError("Error al crear la solicitud");
    } finally {
      setCargando(false);
    }
  };
  console.log(propiedadId);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Crear Nueva Solicitud
          </h3>

          <form onSubmit={handleSubmit} className="mt-4">
            {/* Campos principales */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Solicitud
                </label>
                <SelectField value={tipoSolicitud} onChange={setTipoSolicitud}>
                  <Option value="venta">Venta</Option>
                  <Option value="renta">Arrendamiento</Option>
                </SelectField>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Propiedad
                </label>
                <SelectField
                  value={propiedadId}
                  onChange={setPropiedadId}
                  disabled={cargandoPropiedades}
                  placeholder="Selecciona una propiedad"
                >
                  {propiedadesData?.usersPermissionsUser?.perfil_cliente?.propiedades?.map(
                    (propiedad: any) => (
                      <Option
                        key={propiedad.documentId}
                        value={propiedad.documentId}
                      >
                        {propiedad.identificadores.superior +
                          " " +
                          propiedad.identificadores.idSuperior +
                          " " +
                          propiedad.identificadores.inferior +
                          " " +
                          propiedad.identificadores.idInferior}
                      </Option>
                    )
                  )}
                </SelectField>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                  rows={3}
                  placeholder="Describa brevemente el motivo de su solicitud..."
                />
              </div>
            </div>

            {/* Detalles específicos según tipo de solicitud */}
            <Tabs value={tipoSolicitud} onValueChange={setTipoSolicitud}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="venta" className="flex-1">
                  Venta
                </TabsTrigger>
                <TabsTrigger value="renta" className="flex-1">
                  Arrendamiento
                </TabsTrigger>
              </TabsList>

              <TabsContent value="venta" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Potencial Comprador (Opcional)
                  </label>
                  <Input
                    type="text"
                    value={potencialComprador}
                    onChange={(e) => setPotencialComprador(e.target.value)}
                    placeholder="Nombre del potencial comprador"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUC del Comprador (Opcional)
                  </label>
                  <Input
                    type="text"
                    value={rucComprador}
                    onChange={(e) => setRucComprador(e.target.value)}
                    placeholder="RUC del comprador"
                  />
                </div>
              </TabsContent>

              <TabsContent value="renta" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Inicio (Opcional)
                    </label>
                    <Input
                      type="date"
                      value={fechaInicioArrendamiento}
                      onChange={(e) =>
                        setFechaInicioArrendamiento(e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Fin (Opcional)
                    </label>
                    <Input
                      type="date"
                      value={fechaFinArrendamiento}
                      onChange={(e) => setFechaFinArrendamiento(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Potencial Arrendatario (Opcional)
                  </label>
                  <Input
                    type="text"
                    value={potencialArrendatario}
                    onChange={(e) => setPotencialArrendatario(e.target.value)}
                    placeholder="Nombre del potencial arrendatario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUC del Arrendador (Opcional)
                  </label>
                  <Input
                    type="text"
                    value={rucArrendador}
                    onChange={(e) => setRucArrendador(e.target.value)}
                    placeholder="RUC del arrendador"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condiciones Especiales (Opcional)
                  </label>
                  <Textarea
                    value={condicionesEspeciales}
                    onChange={(e) => setCondicionesEspeciales(e.target.value)}
                    rows={3}
                    placeholder="Condiciones especiales de arrendamiento..."
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={cargando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!descripcion || cargando}>
                {cargando ? "Creando..." : "Crear Solicitud"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

// Constante para representar "Todos" en los filtros
const TODOS_VALUE = "todos";

export default function SolicitudesPage() {
  const { user: usuario, role: rol } = useAuth();
  const router = useRouter();

  const [filtros, setFiltros] = useState<{
    tipoSolicitud: string | null;
    estado: string | null;
  }>({
    tipoSolicitud: TODOS_VALUE, // <--- Cambiado de null a TODOS_VALUE
    estado: TODOS_VALUE, // <--- Cambiado de null a TODOS_VALUE
  });

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [solicitudActiva, setSolicitudActiva] = useState<Solicitud | null>(
    null
  );
  const [mostrarModal, setMostrarModal] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solicitudesCount, setSolicitudesCount] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  // Determinar si hay filtros activos
  const filtrosActivos =
    busqueda !== "" ||
    filtros.estado !== TODOS_VALUE ||
    filtros.tipoSolicitud !== TODOS_VALUE; // <--- Nueva variable

  // Redirección si no tiene permisos
  useEffect(() => {
    if (
      !usuario ||
      (rol !== "Propietario" && rol !== "Administrador" && rol !== "Directorio")
    ) {
      router.push("/dashboard");
    }
  }, [usuario, rol, router]);

  // Preparar filtros para la consulta GraphQL
  const getFilters = () => {
    let filters: any = { and: [] };

    // Filtrar por usuario si es propietario o arrendatario
    if (rol === "Propietario" || rol === "Arrendatario") {
      filters.and.push({
        solicitante: {
          email: {
            eq: usuario?.email,
          },
        },
      });
    }

    // Filtrar por estado
    if (filtros.estado && filtros.estado !== TODOS_VALUE) {
      filters.and.push({
        estado: {
          eq: filtros.estado,
        },
      });
    }

    // Filtrar por tipo de solicitud
    if (filtros.tipoSolicitud && filtros.tipoSolicitud !== TODOS_VALUE) {
      filters.and.push({
        tipoSolicitud: {
          eq: filtros.tipoSolicitud,
        },
      });
    }

    // Filtrar por término de búsqueda
    if (busqueda) {
      filters.and.push({
        or: [
          {
            descripcion: {
              containsi: busqueda,
            },
          },
          {
            propiedad: {
              nombre: {
                containsi: busqueda,
              },
            },
          },
        ],
      });
    }

    return filters.and.length > 0 ? filters : {};
  };

  // Consulta GraphQL para obtener solicitudes
  const {
    data: solicitudesData,
    loading: loadingSolicitudes,
    error: errorSolicitudes,
    refetch,
  } = useQuery(GET_SOLICITUDES, {
    variables: {
      filters: getFilters(),
    },
    fetchPolicy: "network-only",
  });

  // Actualizar estado de una solicitud
  const [updateSolicitud] = useMutation(UPDATE_SOLICITUD);
  const [updatePropiedad] = useMutation(UPDATE_PROPIEDAD);
  // Subir documento
  const [addDocumento] = useMutation(ADD_DOCUMENTO);

  // Crear solicitud
  const [createSolicitud] = useMutation(CREATE_SOLICITUD);

  // Agregar comentario
  const [addComentario] = useMutation(ADD_COMENTARIO);

  // Actualizar lista de solicitudes cuando cambian los datos
  useEffect(() => {
    console.log("Datos de solicitudes recibidos:", solicitudesData);
    if (solicitudesData?.solicitudes) {
      setSolicitudes(solicitudesData.solicitudes.map(adaptarSolicitud));
      setSolicitudesCount(solicitudesData.solicitudes.length);
      setLoading(false);
    } else if (solicitudesData?.solicitudes) {
      // Si no hay data pero sí hay solicitudes, podría ser que la estructura haya cambiado
      console.log("Estructura de solicitudes:", solicitudesData.solicitudes);
      try {
        const solicitudesAdaptadas = Array.isArray(solicitudesData.solicitudes)
          ? solicitudesData.solicitudes.map(adaptarSolicitud)
          : [];
        setSolicitudes(solicitudesAdaptadas);
        setSolicitudesCount(solicitudesAdaptadas.length);
        setLoading(false);
      } catch (error) {
        console.error("Error al procesar solicitudes:", error);
        setError("Error al procesar las solicitudes");
        setLoading(false);
      }
    }
  }, [solicitudesData]);

  // Actualizar error
  useEffect(() => {
    if (errorSolicitudes) {
      setError("Error al cargar las solicitudes");
      setLoading(false);
    }
  }, [errorSolicitudes]);

  // Manejadores de eventos
  const handleCrearSolicitud = async (datos: any) => {
    try {
      setCargando(true);

      const ahora = new Date().toISOString();

      const { data } = await createSolicitud({
        variables: {
          tipoSolicitud: datos.tipoSolicitud,
          estado: "pendiente_certificado",
          solicitante: usuario?.id,
          propiedad: datos.propiedadId,
          detallesSolicitud: datos.detallesSolicitud,
          historialCambios: [
            {
              fecha: ahora,
              usuario: usuario?.id,
              accion: "creacion",
              descripcion: "Solicitud creada",
              estadoNuevo: "pendiente_certificado",
            },
          ],
          fechaCreacion: ahora,
          fechaActualizacion: ahora,
        },
      });

      console.log("Solicitud creada:", data);
      setSolicitudes([...solicitudes, adaptarSolicitud(data.createSolicitud)]);

      // Cerrar modal y mostrar mensaje de éxito
      setMostrarModal(null);
      toast.success("La solicitud ha sido creada exitosamente");
    } catch (error) {
      console.error("Error al crear solicitud:", error);
      toast.error("Hubo un problema al crear la solicitud");
    } finally {
      setCargando(false);
    }
  };

  const handleActualizarEstado = async (
    solicitudId: string,
    nuevoEstado: string,
    accion: string,
    descripcion: string
  ) => {
    try {
      // eslint-disable-next-line no-console
      console.log("Actualizando estado:", {
        solicitudId,
        nuevoEstado,
        accion,
        descripcion,
        estadoAnterior: solicitudActiva?.estado,
      });

      // Preparar el historial existente
      const historialExistente =
        solicitudActiva?.historialCambios?.map((h) => ({
          fecha: h.fecha,
          usuario:
            typeof h.usuario === "object" ? h.usuario?.documentId : h.usuario,
          accion: h.accion,
          descripcion: h.descripcion,
          estadoAnterior: h.estadoAnterior,
          estadoNuevo: h.estadoNuevo,
        })) || [];

      // Crear nuevo registro de historial
      const nuevoRegistro = {
        fecha: new Date().toISOString(),
        usuario: usuario?.documentId,
        accion: accion,
        descripcion: descripcion,
        estadoAnterior: solicitudActiva?.estado,
        estadoNuevo: nuevoEstado,
      };

      // Combinar historial existente con nuevo registro
      const historialCompleto = [...historialExistente, nuevoRegistro];

      // Verificar si es un contrato de arrendamiento aprobado
      const esContratoArrendamientoAprobado =
        solicitudActiva?.tipoSolicitud === "renta" &&
        accion === "aprobacion" &&
        descripcion.includes("Contrato de Arrendamiento aprobado");

      // Si es aprobación de contrato de arrendamiento, relacionar con la propiedad
      if (esContratoArrendamientoAprobado) {
        console.log("Se detectó aprobación de contrato de arrendamiento");

        // Buscar el documento del contrato
        const contratoDoc = solicitudActiva?.documentos?.find(
          (doc) => doc.tipoDocumento === "contratoArrendamiento"
        );

        if (contratoDoc && contratoDoc.pdf) {
          console.log("Documento de contrato encontrado:", contratoDoc);

          // Relacionar el contrato con la propiedad
          try {
            // Ejecutar la mutación usando el cliente de Apollo directamente

            // Obtener el ID del documento
            const docId = contratoDoc.pdf.documentId || contratoDoc.pdf.id;

            await updatePropiedad({
              variables: {
                documentId: solicitudActiva.propiedad.id,
                data: {
                  contratoArrendamientoPdf: docId,
                },
              },
            });

            console.log("Contrato relacionado con la propiedad correctamente");
          } catch (error) {
            console.error("Error al relacionar contrato con propiedad:", error);
          }
        } else {
          console.warn(
            "No se encontró el documento de contrato de arrendamiento en la solicitud"
          );
        }
      }

      const { data } = await updateSolicitud({
        variables: {
          documentId: solicitudId,
          data: {
            estado: nuevoEstado,
            fechaActualizacion: new Date().toISOString(),
            historialCambios: historialCompleto,
          },
        },
      });

      // eslint-disable-next-line no-console
      console.log("Estado actualizado con éxito a:", nuevoEstado);

      // Actualizar solicitud activa en la interfaz
      if (solicitudActiva) {
        const solicitudActualizada = {
          ...solicitudActiva,
          estado: nuevoEstado,
          fechaActualizacion: new Date().toISOString(),
          historialCambios: [
            ...(solicitudActiva.historialCambios || []),
            {
              fecha: new Date().toISOString(),
              usuario: {
                id: usuario?.documentId,
                username: usuario?.username || "",
                email: usuario?.email || "",
              },
              accion,
              descripcion,
              estadoAnterior: solicitudActiva.estado,
              estadoNuevo: nuevoEstado,
            },
          ],
        };

        // Actualizar el estado local
        setSolicitudActiva(solicitudActualizada);

        // Actualizar la lista de solicitudes
        setSolicitudes(
          solicitudes.map((s) =>
            s.id === solicitudId ? solicitudActualizada : s
          )
        );
      }

      await refetch();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error al actualizar estado:", error);

      // Mostrar detalles específicos del error
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error("Mensaje de error:", error.message);
        // eslint-disable-next-line no-console
        console.error("Stack trace:", error.stack);

        // Si es un error de GraphQL, mostrar detalles adicionales
        if ("graphQLErrors" in error) {
          // eslint-disable-next-line no-console
          console.error("GraphQL errors:", (error as any).graphQLErrors);
        }
      }

      setError("Error al actualizar el estado de la solicitud");
    }
  };

  const handleSubirDocumento = async (
    solicitudId: string,
    tipoDocumento: string,
    archivo: any
  ) => {
    try {
      setCargando(true);
      setError("");

      // eslint-disable-next-line no-console
      console.log("Iniciando subida de documento:", {
        solicitudId,
        tipoDocumento,
        archivo,
      });
      console.log("solicitudActiva", solicitudActiva);
      // Preparar los documentos existentes en el formato esperado por la API
      const documentosExistentes =
        solicitudActiva?.documentos?.map((d) => ({
          tipoDocumento: d.tipoDocumento,
          pdf: d.pdf?.documentId || null,
        })) || [];

      // Crear el nuevo documento
      const nuevoDocumentoAPI = {
        tipoDocumento,
        pdf: archivo.id,
      };

      // Combinar documentos existentes con el nuevo
      const documentosCompletos = [...documentosExistentes, nuevoDocumentoAPI];

      // eslint-disable-next-line no-console
      console.log("Documentos a enviar:", {
        documentosExistentes: documentosExistentes.map((d) => d.pdf),
        nuevoDocumento: nuevoDocumentoAPI,
        documentosCompletos: documentosCompletos.map((d) => d.pdf),
      });

      // Añadir el documento a la solicitud
      const { data } = await updateSolicitud({
        variables: {
          documentId: solicitudId,
          data: {
            documentos: documentosCompletos,
          },
        },
      });

      // eslint-disable-next-line no-console
      console.log("Respuesta de updateSolicitud:", data);

      // Actualizar estado local
      if (solicitudActiva) {
        // Crear documento en el formato correcto para la interfaz
        const nuevoDocumento: Documento = {
          tipoDocumento,
          pdf: archivo.id,
        };

        // eslint-disable-next-line no-console
        console.log("Nuevo documento creado:", nuevoDocumento);

        // Crear copia de la solicitud activa con el nuevo documento
        const solicitudActualizada = {
          ...solicitudActiva,
          documentos: [...(solicitudActiva.documentos || []), nuevoDocumento],
        };

        // eslint-disable-next-line no-console
        console.log("Solicitud actualizada:", solicitudActualizada);

        // Actualizar lista de solicitudes
        setSolicitudes(
          solicitudes.map((s) =>
            s.id === solicitudId ? solicitudActualizada : s
          )
        );

        // Actualizar solicitud activa
        setSolicitudActiva(solicitudActualizada);
      }

      // eslint-disable-next-line no-console
      console.log(
        "Documento subido exitosamente. tipoDocumento:",
        tipoDocumento
      );
      toast.success("Documento subido correctamente");

      // Refrescar los datos
      await refetch();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error al subir documento:", error);
      // Mostrar detalles del error si está disponible
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error("Mensaje de error:", error.message);
        // eslint-disable-next-line no-console
        console.error("Stack trace:", error.stack);
      }
      setError("Error al subir el documento");
      toast.error("Error al subir el documento");
    } finally {
      setCargando(false);
    }
  };

  const handleAgregarComentario = async (
    solicitudId: string,
    contenido: string,
    archivo?: File
  ) => {
    try {
      setCargando(true);
      setError("");

      let archivoId;

      // Si hay un archivo, subirlo primero usando uploadthing
      if (archivo) {
        // eslint-disable-next-line no-console
        console.log("Subiendo archivo para comentario:", archivo.name);

        // Aquí deberíamos usar uploadthing, pero como no podemos hacerlo directamente desde aquí,
        // vamos a mostrar un mensaje informativo
        toast.error(
          "Por favor use el botón de adjuntar archivo en lugar de arrastrar archivos"
        );
        return;
      }

      const ahora = new Date().toISOString();

      // Preparar los comentarios existentes en el formato esperado por la API
      const comentariosExistentes =
        solicitudActiva?.comentarios?.map((c) => ({
          contenido: c.contenido,
          fecha: c.fecha,
          usuario: typeof c.usuario === "object" ? c.usuario.id : c.usuario,
          adjuntos:
            c.adjuntos?.map((a) => (typeof a === "object" ? a.id : a)) || [],
        })) || [];

      // Crear el nuevo comentario
      const nuevoComentario = {
        contenido,
        fecha: ahora,
        usuario: usuario?.id,
        adjuntos: archivoId ? [archivoId] : [],
      };

      // Combinar comentarios existentes con el nuevo
      const comentariosCompletos = [...comentariosExistentes, nuevoComentario];

      // eslint-disable-next-line no-console
      console.log("Agregando comentario:", {
        solicitudId,
        comentariosCompletos: comentariosCompletos.length,
        nuevoComentario,
      });

      // Añadir el comentario a la solicitud
      const { data } = await addComentario({
        variables: {
          solicitudId,
          comentariosCompletos,
        },
      });

      // eslint-disable-next-line no-console
      console.log("Respuesta de addComentario:", data);

      // Actualizar estado local con los datos devueltos por la API
      if (solicitudActiva && data?.updateSolicitud) {
        // Convertir los comentarios de la API al formato de la interfaz local
        const comentariosActualizados = data.updateSolicitud.comentarios.map(
          (c: any) => ({
            contenido: c.contenido,
            fecha: c.fecha,
            usuario: {
              id: c.usuario?.documentId,
              username: c.usuario?.username || "",
              email: c.usuario?.email || "",
            },
            adjuntos: (c.adjuntos || []).map((a: any) => ({
              id: a.documentId,
              url: a.url,
              name: a.name,
            })),
          })
        );

        // Actualizar la solicitud activa con los comentarios de la API
        setSolicitudActiva({
          ...solicitudActiva,
          comentarios: comentariosActualizados,
        });

        // Actualizar la lista de solicitudes
        setSolicitudes(
          solicitudes.map((s) =>
            s.id === solicitudId
              ? { ...s, comentarios: comentariosActualizados }
              : s
          )
        );
      } else {
        // Si no hay datos de la API, actualizar localmente
        if (solicitudActiva) {
          // Crear comentario en el formato de la interfaz Comentario
          const nuevoComentario: Comentario = {
            contenido,
            fecha: ahora,
            usuario: {
              id: usuario?.documentId,
              username: usuario?.username || "",
              email: usuario?.email || "",
            },
            adjuntos: [], // Ya no manejamos adjuntos aquí
          };

          // Añadir el nuevo comentario a la lista existente
          const comentariosActualizados: Comentario[] = [
            ...(solicitudActiva.comentarios || []),
            nuevoComentario,
          ];

          setSolicitudActiva({
            ...solicitudActiva,
            comentarios: comentariosActualizados,
          });
        }
      }

      // Limpiar formulario
      const form = document.getElementById("formComentario") as HTMLFormElement;
      if (form) form.reset();
    } catch (error) {
      console.error("Error al agregar comentario:", error);
      setError("Error al agregar el comentario");
    } finally {
      setCargando(false);
    }
  };

  // Adaptamos los comentarios para manejar formatos antiguos y nuevos
  const procesarComentario = (comentario: any) => {
    // Si tiene la estructura antigua
    if (comentario.usuario && comentario.usuario.data) {
      return {
        contenido: comentario.contenido,
        fecha: comentario.fecha,
        usuario: {
          id: comentario.usuario.documentId,
          username: comentario.usuario?.username || "",
          email: comentario.usuario?.email || "",
        },
        adjuntos:
          comentario.adjuntos?.map((adj: any) => {
            if (adj) {
              return {
                id: adj?.id || adj.documentId,
                url: adj?.url,
                name: adj?.name,
              };
            }
            return adj;
          }) || [],
      };
    }
    // Si ya está en el formato nuevo
    return comentario;
  };

  // Usamos este método para procesar historial de cambios
  const procesarHistorialCambio = (cambio: any) => {
    // Si tiene la estructura antigua
    if (cambio.usuario && cambio.usuario.data) {
      return {
        fecha: cambio.fecha,
        usuario: {
          id: cambio.usuario.documentId,
          username: cambio.usuario?.username || "",
          email: cambio.usuario?.email || "",
        },
        accion: cambio.accion,
        descripcion: cambio.descripcion,
        estadoAnterior: cambio.estadoAnterior,
        estadoNuevo: cambio.estadoNuevo,
      };
    }
    // Si ya está en el formato nuevo
    return cambio;
  };

  // Método para adaptar los datos de solicitudes al modelo nuevo
  const adaptarSolicitud = (solicitud: any): Solicitud => {
    // Si tiene attributes, la convertimos al nuevo formato
    if (solicitud) {
      const solicitanteData = solicitud.solicitante;
      const propiedadData = solicitud.propiedad;
      const revisorData = solicitud.revisor;

      const solicitante: Usuario = solicitanteData
        ? {
            id: solicitanteData.documentId || undefined,
            username: solicitanteData?.username || "",
            email: solicitanteData?.email || "",
          }
        : {
            id: undefined,
            username: "Desconocido",
            email: "",
          };

      const propiedad: Propiedad = propiedadData
        ? {
            id: propiedadData.documentId || undefined,
            codigoCatastral: propiedadData?.codigoCatastral || "",
            identificadores: propiedadData?.identificadores || "",
            proyecto: propiedadData?.proyecto || undefined,
          }
        : {
            id: undefined,
            codigoCatastral: "Propiedad sin datos",
            identificadores: {
              idSuperior: "Propiedad sin datos",
              superior: "Propiedad sin datos",
              idInferior: "Propiedad sin datos",
              inferior: "Propiedad sin datos",
            },
            proyecto: {
              documentId: "",
              nombre: "Proyecto sin datos",
            },
          };
      const revisor: Usuario | undefined = revisorData
        ? {
            id: revisorData.documentId || undefined,
            username: revisorData.username || "",
            email: revisorData.email || "",
          }
        : undefined;

      return {
        id: solicitud.documentId,
        tipoSolicitud: solicitud.tipoSolicitud as "venta" | "renta",
        estado: solicitud.estado,
        fechaCreacion: solicitud.fechaCreacion,
        fechaActualizacion: solicitud.fechaActualizacion,
        descripcion: solicitud.descripcion,
        solicitante: solicitante,
        propiedad: propiedad,
        detallesSolicitud: solicitud.detallesSolicitud,
        historialCambios: (solicitud.historialCambios || []).map(
          procesarHistorialCambio
        ),
        documentos: (solicitud.documentos || []).map((doc: any) => {
          return {
            tipoDocumento: doc.tipoDocumento,
            pdf: doc.pdf ||
              doc.archivo || {
                name: "Documento sin nombre",
                url: "",
              },
          };
        }),
        comentarios: (solicitud.comentarios || []).map(procesarComentario),
        apelacion: solicitud.apelacion,
        detallesApelacion: solicitud.detallesApelacion,
        revisor: revisor,
      };
    }

    // Si ya está en el formato nuevo, verificamos que tenga los campos mínimos necesarios
    return {
      id: solicitud?.documentId || solicitud?.id, // Usar documentId si está disponible, id como respaldo
      tipoSolicitud: solicitud?.tipoSolicitud as "venta" | "renta",
      estado: solicitud?.estado,
      fechaCreacion: solicitud?.fechaCreacion,
      fechaActualizacion: solicitud?.fechaActualizacion,
      descripcion: solicitud?.descripcion,
      solicitante: solicitud?.solicitante || {
        id: undefined,
        username: "Desconocido",
        email: "",
      },
      propiedad: solicitud?.propiedad || {
        id: undefined,
        nombre: "Propiedad sin datos",
      },
      detallesSolicitud: solicitud?.detallesSolicitud,
      historialCambios: solicitud?.historialCambios || [],
      documentos: solicitud?.documentos || [],
      comentarios: solicitud?.comentarios || [],
      apelacion: solicitud?.apelacion,
      detallesApelacion: solicitud?.detallesApelacion,
      revisor: solicitud?.revisor,
    };
  };

  // Renderizado de la interfaz
  if (!usuario) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  // Determinar qué acciones mostrar según el estado actual y rol
  const getAccionesDisponibles = () => {
    if (!solicitudActiva) return null;

    const estado = solicitudActiva.estado;
    const tipoSolicitud = solicitudActiva.tipoSolicitud;

    if (rol === "Propietario" || rol === "Arrendatario") {
      // Acciones específicas para el propietario
      switch (estado) {
        case "aprobado":
          return (
            <div className="space-y-4">
              <p className="text-sm text-green-600">
                Su solicitud ha sido aprobada. Esperando a que el administrador
                finalice el proceso.
              </p>
            </div>
          );
        case "pendiente_certificado":
          return (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Su solicitud está siendo revisada. El administrador deberá subir
                el certificado de expensas para continuar con el proceso.
              </p>
            </div>
          );

        case "certificado_rechazado":
          return (
            <div className="space-y-4">
              <p className="text-sm text-red-600">
                Su certificado de expensas ha sido rechazado.
              </p>
              {!solicitudActiva.apelacion && (
                <div>
                  <p className="text-sm mb-2">
                    Puede solicitar un plan de pagos para regularizar su
                    situación.
                  </p>
                  <Button
                    onClick={async () => {
                      await updateSolicitud({
                        variables: {
                          documentId: solicitudActiva.id,
                          data: {
                            apelacion: true,
                            estado: "pendiente_plan_pagos",
                            fechaActualizacion: new Date().toISOString(),
                            historialCambios: [
                              {
                                fecha: new Date().toISOString(),
                                usuario: usuario?.documentId,
                                accion: "apelacion",
                                descripcion: "Solicitud de plan de pagos",
                                estadoAnterior: "certificado_rechazado",
                                estadoNuevo: "pendiente_plan_pagos",
                              },
                            ],
                          },
                        },
                      });
                      refetch();
                    }}
                  >
                    Solicitar Plan de Pagos
                  </Button>
                </div>
              )}
            </div>
          );

        //case "certificado_aprobado":
        case "plan_pagos_aprobado":
          // Este caso ahora solo se usa para el flujo alternativo (plan de pagos)
          // El flujo principal usa directorio_aprobado
          const tipoContrato =
            tipoSolicitud === "venta"
              ? "contratoCompraVenta"
              : "contratoArrendamiento";
          const labelContrato =
            tipoSolicitud === "venta"
              ? "Promesa de compraventa"
              : "Contrato de Arrendamiento";

          return (
            <div className="space-y-4">
              <p className="text-sm text-green-600">
                {estado === "plan_pagos_aprobado"
                  ? "Su plan de pagos ha sido aprobado. "
                  : "Su certificado ha sido aprobado. "}
                Por favor suba el {labelContrato}.
              </p>
              <SubirDocumentoForm
                tipoDocumento={tipoContrato}
                onSubmit={(file) =>
                  handleSubirDocumento(solicitudActiva.id, tipoContrato, file)
                }
                label={`Subir ${labelContrato}`}
              />
              <Button
                onClick={() =>
                  handleActualizarEstado(
                    solicitudActiva.id,
                    "revision_contrato",
                    "cambio_estado",
                    "Promesa de compraventa"
                  )
                }
              >
                Enviar a revisión
              </Button>
            </div>
          );

        case "compraventa_aprobada":
          return (
            <div className="space-y-4">
              <p className="text-sm text-green-600">
                Su contrato de compraventa ha sido aprobado. Por favor suba la
                escritura.
              </p>
              <SubirDocumentoForm
                tipoDocumento="escritura"
                onSubmit={(file) =>
                  handleSubirDocumento(solicitudActiva.id, "escritura", file)
                }
                label="Subir Escritura"
              />
              <Button
                onClick={() =>
                  handleActualizarEstado(
                    solicitudActiva.id,
                    "revision_escritura",
                    "cambio_estado",
                    "Escritura subida"
                  )
                }
              >
                Enviar a revisión
              </Button>
            </div>
          );
        case "directorio_aprobado":
          const tipoContratoAprobado =
            tipoSolicitud === "venta"
              ? "contratoCompraVenta"
              : "contratoArrendamiento";
          const labelContratoAprobado =
            tipoSolicitud === "venta"
              ? "Promesa de compraventa"
              : "Contrato de Arrendamiento";

          return (
            <div className="space-y-4">
              <p className="text-sm text-green-600">
                Su solicitud ha sido aprobada por el directorio. Por favor suba
                el {labelContratoAprobado}.
              </p>
              <SubirDocumentoForm
                tipoDocumento={tipoContratoAprobado}
                onSubmit={(file) =>
                  handleSubirDocumento(
                    solicitudActiva.id,
                    tipoContratoAprobado,
                    file
                  )
                }
                label={`Subir ${labelContratoAprobado}`}
              />
              <Button
                onClick={() =>
                  handleActualizarEstado(
                    solicitudActiva.id,
                    "revision_contrato",
                    "cambio_estado",
                    "Contrato subido"
                  )
                }
              >
                Enviar a revisión
              </Button>
            </div>
          );

        case "rechazado":
          return (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-800 font-medium">
                  Su solicitud ha sido rechazada.
                </p>
                {solicitudActiva.comentarios &&
                  solicitudActiva.comentarios.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Motivo:</p>
                      <p className="text-sm text-gray-700">
                        {
                          solicitudActiva.comentarios
                            .filter(
                              (c) =>
                                c.usuario.id !==
                                  solicitudActiva.solicitante.id &&
                                c.contenido.startsWith("Motivo de rechazo:")
                            )
                            .slice(-1)[0]?.contenido
                        }
                      </p>
                    </div>
                  )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() =>
                    handleActualizarEstado(
                      solicitudActiva.id,
                      "pendiente_plan_pagos",
                      "solicitud_plan",
                      "El propietario ha solicitado un plan de pagos"
                    )
                  }
                >
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Solicitar plan de pago
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    handleActualizarEstado(
                      solicitudActiva.id,
                      "solicitud_cerrada",
                      "cierre",
                      "El propietario ha cerrado la solicitud"
                    )
                  }
                >
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Cerrar solicitud
                </Button>
              </div>
            </div>
          );

        case "solicitud_cerrada":
          return (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-800 font-medium text-sm">
                Esta solicitud ha sido cerrada por el propietario.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                No se requieren más acciones para esta solicitud.
              </p>
            </div>
          );

        case "documento_rechazado":
          // Determinar qué tipo de documento fue rechazado basado en el historial
          const ultimoRechazo = solicitudActiva.historialCambios
            .filter((h) => h.accion === "rechazo")
            .sort(
              (a, b) =>
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
            )[0];

          // Si no hay historial de rechazo, mostrar un mensaje genérico
          if (!ultimoRechazo) {
            return (
              <div className="space-y-4">
                <p className="text-sm text-red-600">
                  Su documento ha sido rechazado. Por favor, suba un nuevo
                  documento corregido.
                </p>
              </div>
            );
          }

          // Determinar el estado anterior para saber qué documento fue rechazado
          const estadoAnterior = ultimoRechazo.estadoAnterior || "";

          let tipoDocumento = "";
          let label = "";
          let siguienteEstado = "";

          if (estadoAnterior === "revision_contrato") {
            tipoDocumento =
              solicitudActiva.tipoSolicitud === "venta"
                ? "contratoCompraVenta"
                : "contratoArrendamiento";
            label =
              solicitudActiva.tipoSolicitud === "venta"
                ? "Contrato de Compraventa"
                : "Contrato de Arrendamiento";
            siguienteEstado = "revision_contrato";
          } else if (estadoAnterior === "revision_escritura") {
            tipoDocumento = "escritura";
            label = "Escritura";
            siguienteEstado = "revision_escritura";
          } else {
            // Para otros tipos de documentos que se puedan rechazar en el futuro
            tipoDocumento = "documento";
            label = "Documento";
            siguienteEstado = "revision_documento";
          }

          return (
            <div className="space-y-4">
              <p className="text-sm text-red-600">
                Su {label} ha sido rechazado. Por favor, corrija los problemas y
                suba el documento nuevamente.
              </p>
              {ultimoRechazo.descripcion && (
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-red-800">
                    Motivo del rechazo:
                  </p>
                  <p className="text-sm text-red-700">
                    {ultimoRechazo.descripcion}
                  </p>
                </div>
              )}
              <SubirDocumentoForm
                tipoDocumento={tipoDocumento}
                onSubmit={(file) =>
                  handleSubirDocumento(solicitudActiva.id, tipoDocumento, file)
                }
                label={`Subir ${label} corregido`}
              />
              <Button
                onClick={() =>
                  handleActualizarEstado(
                    solicitudActiva.id,
                    siguienteEstado,
                    "cambio_estado",
                    `${label} corregido enviado a revisión`
                  )
                }
              >
                Enviar a revisión
              </Button>
            </div>
          );

        default:
          return (
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-blue-800 text-sm">
                Su solicitud está siendo procesada. Por favor espere.
              </p>
            </div>
          );
      }
    } else if (["Administrador", "Directorio"].includes(rol || "")) {
      // Acciones para administradores
      switch (estado) {
        case "aprobado":
          const esTipoVentaAdmin = solicitudActiva.tipoSolicitud === "venta";
          const tipoOcupanteAdmin = esTipoVentaAdmin
            ? "propietario"
            : "ocupante";
          const rutaAsignacionAdmin = esTipoVentaAdmin
            ? "asignar-propietario"
            : "asignar-ocupante";

          // Obtener información del propietario/ocupante actual
          const ocupanteActualAdmin =
            solicitudActiva.solicitante?.username || "No especificado";
          console.log("solicitudActiva en aprobado", solicitudActiva);
          return (
            <div className="space-y-4">
              <p className="text-sm text-green-600">
                La solicitud de {solicitudActiva.tipoSolicitud} ha sido
                aprobada. Ahora puede reasignar el {tipoOcupanteAdmin} de la
                propiedad.
              </p>
              <p className="text-sm text-gray-600 font-bold">
                Nota: Va a tener que crear el perfil del nuevo{" "}
                {tipoOcupanteAdmin} en el proceso de asignación.
              </p>

              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Información actual:
                </h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">
                    {tipoOcupanteAdmin.charAt(0).toUpperCase() +
                      tipoOcupanteAdmin.slice(1)}{" "}
                    actual:
                  </span>{" "}
                  {ocupanteActualAdmin}
                </p>
                {solicitudActiva.propiedad?.identificadores && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Propiedad:</span>{" "}
                    {solicitudActiva.propiedad.identificadores.superior}{" "}
                    {solicitudActiva.propiedad.identificadores.idSuperior},{" "}
                    {solicitudActiva.propiedad.identificadores.inferior}{" "}
                    {solicitudActiva.propiedad.identificadores.idInferior}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    // Redirigir a la página de asignación correspondiente
                    window.location.href = `/dashboard/proyectos/${solicitudActiva.propiedad?.proyecto?.documentId}/propiedades/${solicitudActiva.propiedad?.id}/${rutaAsignacionAdmin}`;
                  }}
                >
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Reasignar {tipoOcupanteAdmin}
                </Button>
              </div>
            </div>
          );
        case "pendiente_plan_pagos":
          if (rol === "Administrador") {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  El propietario ha solicitado un plan de pagos. Por favor suba
                  el plan acordado.
                </p>

                <SubirDocumentoForm
                  tipoDocumento="planPagos"
                  onSubmit={(file) =>
                    handleSubirDocumento(solicitudActiva.id, "planPagos", file)
                  }
                  label="Subir Plan de Pagos"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    handleActualizarEstado(
                      solicitudActiva.id,
                      "revision_plan_pagos",
                      "aprobacion",
                      "Plan de pagos aprobado"
                    )
                  }
                >
                  Enviar el Plan de Pagos aprobado
                </Button>
              </div>
            );
          } else {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  El propietario ha solicitado un plan de pagos. El
                  administrador subirá el plan de pagos acordado.
                </p>
              </div>
            );
          }
        case "revision_plan_pagos":
          if (rol === "Directorio") {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Revise el plan de pagos y apruebe o rechace.
                </p>

                <MostrarDocumentos
                  tipoDocumento="planPagos"
                  documentos={solicitudActiva.documentos || []}
                />

                <div className="flex space-x-4 mt-4">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      handleActualizarEstado(
                        solicitudActiva.id,
                        "plan_pagos_aprobado",
                        "aprobacion",
                        "Plan de pagos aprobado"
                      )
                    }
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Aprobar Plan de Pagos
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setMostrarModal("rechazo")}
                  >
                    <XCircleIcon className="h-5 w-5 mr-2" />
                    Rechazar Plan
                  </Button>
                </div>
              </div>
            );
          } else {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  El plan de pagos está siendo revisado por el directorio.
                </p>
              </div>
            );
          }

        case "revision_contrato":
          const tipoContrato =
            solicitudActiva.tipoSolicitud === "venta"
              ? "contratoCompraVenta"
              : "contratoArrendamiento";

          const siguienteEstado =
            solicitudActiva.tipoSolicitud === "venta"
              ? "compraventa_aprobada"
              : "aprobado";

          const label =
            solicitudActiva.tipoSolicitud === "venta"
              ? "Contrato de Compraventa"
              : "Contrato de Arrendamiento";

          if (rol === "Administrador") {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  El {label} está siendo revisado por el directorio.
                </p>
              </div>
            );
          } else {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Revise el {label} y apruebe o rechace.
                </p>

                <MostrarDocumentos
                  tipoDocumento={tipoContrato}
                  documentos={solicitudActiva.documentos || []}
                />

                <div className="flex space-x-4 mt-4">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      handleActualizarEstado(
                        solicitudActiva.id,
                        siguienteEstado,
                        "aprobacion",
                        `${label} aprobado`
                      )
                    }
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Aprobar {label}
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setMostrarModal("rechazo")}
                  >
                    <XCircleIcon className="h-5 w-5 mr-2" />
                    Rechazar {label}
                  </Button>
                </div>
              </div>
            );
          }

        case "revision_escritura":
          if (rol === "Directorio") {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  La escritura está siendo revisada por el administrador.
                </p>
              </div>
            );
          } else {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Revise la escritura y apruebe o rechace.
                </p>

                <MostrarDocumentos
                  tipoDocumento="escritura"
                  documentos={solicitudActiva.documentos || []}
                />

                <div className="flex space-x-4 mt-4">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      handleActualizarEstado(
                        solicitudActiva.id,
                        "aprobado",
                        "aprobacion",
                        "Escritura aprobada, proceso completado"
                      )
                    }
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Aprobar Escritura
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setMostrarModal("rechazo")}
                  >
                    <XCircleIcon className="h-5 w-5 mr-2" />
                    Rechazar Escritura
                  </Button>
                </div>
              </div>
            );
          }

        case "pendiente_certificado":
          if (rol === "Administrador") {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Debe subir el certificado de expensas y decidir si el
                  propietario está al día con sus pagos.
                </p>

                {/* Si ya hay un certificado subido, mostrarlo */}
                {/* {solicitudActiva.documentos && solicitudActiva.documentos.some(doc => doc.tipoDocumento === "certificadoExpensas") ? (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Certificado subido:</p>
                    <MostrarDocumentos 
                      documentos={solicitudActiva.documentos} 
                    />
                  </div>
                ) : ( */}
                <MostrarDocumentos
                  tipoDocumento="certificadoExpensas"
                  documentos={solicitudActiva.documentos || []}
                />
                <SubirDocumentoForm
                  tipoDocumento="certificadoExpensas"
                  onSubmit={(file) =>
                    handleSubirDocumento(
                      solicitudActiva.id,
                      "certificadoExpensas",
                      file
                    )
                  }
                  label="Subir Certificado de Expensas"
                />
                {/* )} */}

                <div className="flex space-x-4 mt-4">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      await handleActualizarEstado(
                        solicitudActiva.id,
                        "pendiente_directorio",
                        "aprobacion",
                        "Certificado de expensas aprobado"
                      );
                      toast.success("Certificado de expensas aprobado");
                    }}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Propietario al día - Aprobar
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setMostrarModal("rechazo")}
                  >
                    <XCircleIcon className="h-5 w-5 mr-2" />
                    Propietario en mora - Rechazar
                  </Button>
                </div>
              </div>
            );
          } else {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  La solicitud está siendo revisada. El administrador verificará
                  el estado de expensas y lo subirá si el propietario está al
                  día.
                </p>
              </div>
            );
          }

        case "pendiente_directorio":
          console.log("solicitudActiva", solicitudActiva);
          if (rol === "Directorio") {
            console.log("Entra a directorio");
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  El administrador ha verificado que el propietario está al día
                  con sus expensas o que un plan de pagos haya sido acordado.
                  Como miembro del directorio, debe aprobar o rechazar esta
                  solicitud.
                </p>

                <MostrarDocumentos documentos={solicitudActiva.documentos} />

                <div className="flex space-x-4 mt-4">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      handleActualizarEstado(
                        solicitudActiva.id,
                        "directorio_aprobado",
                        "aprobacion",
                        "Expensas o plan de pagos aprobado por el directorio"
                      )
                    }
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Aprobar Solicitud
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setMostrarModal("rechazo")}
                  >
                    <XCircleIcon className="h-5 w-5 mr-2" />
                    Rechazar Solicitud
                  </Button>
                </div>
              </div>
            );
          } else if (rol === "Administrador") {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  La solicitud está pendiente de aprobación por parte del
                  directorio.
                </p>

                <MostrarDocumentos documentos={solicitudActiva.documentos} />
              </div>
            );
          } else {
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Su certificado de expensas ha sido aprobado por el
                  administrador. La solicitud está pendiente de aprobación por
                  parte del directorio.
                </p>

                <MostrarDocumentos documentos={solicitudActiva.documentos} />
              </div>
            );
          }

        case "directorio_aprobado":
          const tipoContratoAprobado =
            tipoSolicitud === "venta"
              ? "contratoCompraVenta"
              : "contratoArrendamiento";
          const labelContratoAprobado =
            tipoSolicitud === "venta"
              ? "Contrato de Compraventa"
              : "Contrato de Arrendamiento";

          return (
            <div className="space-y-4">
              <p className="text-sm text-green-600">
                La solicitud ha sido aprobada por el directorio. Esperando al
                propietario para finalizar el proceso.
              </p>
            </div>
          );

        default:
          return (
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-blue-800 text-sm">
                Esperando acción del propietario.
              </p>
            </div>
          );
      }
    }

    return null;
  };

  // Renderizado condicional para el modal de rechazo
  const renderModalRechazo = () => {
    if (mostrarModal !== "rechazo" || !solicitudActiva) return null;

    return (
      <ModalRechazo
        onClose={() => setMostrarModal(null)}
        onSubmit={async (motivo) => {
          try {
            // Determinar si es un rechazo de documento (excepto plan de pagos o expensas)
            const esRechazoDocumento =
              solicitudActiva.estado === "revision_contrato" ||
              solicitudActiva.estado === "revision_escritura" ||
              solicitudActiva.estado.includes("revision_");

            // Excluir plan de pagos y certificado de expensas
            const esDocumentoExcluido =
              solicitudActiva.estado === "revision_plan_pagos" ||
              solicitudActiva.estado === "revision_certificado";

            // Definir el nuevo estado según el tipo de documento
            const nuevoEstado =
              esRechazoDocumento && !esDocumentoExcluido
                ? "documento_rechazado"
                : "rechazado";

            // Preparar el historial existente
            const historialExistente =
              solicitudActiva?.historialCambios?.map((h) => ({
                fecha: h.fecha,
                usuario:
                  typeof h.usuario === "object" ? h.usuario?.id : h.usuario,
                accion: h.accion,
                descripcion: h.descripcion,
                estadoAnterior: h.estadoAnterior,
                estadoNuevo: h.estadoNuevo,
              })) || [];

            // Crear nuevo registro de historial
            const nuevoRegistro = {
              fecha: new Date().toISOString(),
              usuario: usuario?.documentId,
              accion: "rechazo",
              descripcion: `Documento rechazado: ${motivo}`,
              estadoAnterior: solicitudActiva.estado,
              estadoNuevo: nuevoEstado,
            };

            // Combinar historial existente con nuevo registro
            const historialCompleto = [...historialExistente, nuevoRegistro];

            // Preparar los comentarios existentes
            const comentariosExistentes =
              solicitudActiva?.comentarios?.map((c) => ({
                contenido: c.contenido,
                fecha: c.fecha,
                usuario:
                  typeof c.usuario === "object" ? c.usuario.id : c.usuario,
                adjuntos:
                  c.adjuntos?.map((a) => (typeof a === "object" ? a.id : a)) ||
                  [],
              })) || [];

            // Crear nuevo comentario
            const nuevoComentario = {
              contenido: "Motivo de rechazo: " + motivo,
              fecha: new Date().toISOString(),
              usuario: usuario?.documentId,
              adjuntos: [],
            };

            // Combinar comentarios existentes con el nuevo
            const comentariosCompletos = [
              ...comentariosExistentes,
              nuevoComentario,
            ];

            const { data } = await updateSolicitud({
              variables: {
                documentId: solicitudActiva.id,
                data: {
                  estado: nuevoEstado,
                  fechaActualizacion: new Date().toISOString(),
                  historialCambios: historialCompleto,
                  comentarios: comentariosCompletos,
                },
              },
            });

            // Actualizar solicitud activa en la interfaz
            if (solicitudActiva) {
              const solicitudActualizada = {
                ...solicitudActiva,
                estado: nuevoEstado,
                fechaActualizacion: new Date().toISOString(),
                historialCambios: [
                  ...(solicitudActiva.historialCambios || []),
                  {
                    fecha: new Date().toISOString(),
                    usuario: {
                      id: usuario?.documentId,
                      username: usuario?.username || "",
                      email: usuario?.email || "",
                    },
                    accion: "rechazo",
                    descripcion: "Solicitud rechazada",
                    estadoAnterior: solicitudActiva.estado,
                    estadoNuevo: nuevoEstado,
                  },
                ],
                comentarios: [
                  ...(solicitudActiva.comentarios || []),
                  {
                    contenido: motivo,
                    fecha: new Date().toISOString(),
                    usuario: {
                      id: usuario?.documentId,
                      username: usuario?.username || "",
                      email: usuario?.email || "",
                    },
                    adjuntos: [],
                  },
                ],
              };

              // Actualizar el estado local
              setSolicitudActiva(solicitudActualizada);

              // Actualizar la lista de solicitudes
              setSolicitudes(
                solicitudes.map((s) =>
                  s.id === solicitudActiva.id ? solicitudActualizada : s
                )
              );
            }

            setMostrarModal(null);
            await refetch();
          } catch (error) {
            console.error("Error al rechazar solicitud:", error);
            toast.error("Error al rechazar la solicitud");
          }
        }}
      />
    );
  };
  // Renderizar modal de creación de solicitud
  const renderModalCrearSolicitud = () => {
    if (mostrarModal !== "crear") return null;

    return (
      <ModalCrearSolicitud
        onClose={() => setMostrarModal(null)}
        onSubmit={handleCrearSolicitud}
        userId={usuario?.documentId}
      />
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes</h1>
          <p className="text-gray-500">
            Gestione sus solicitudes de{" "}
            {rol === "Propietario" ? "venta y arriendo" : "propiedades"}
          </p>
        </div>

        {rol === "Propietario" && (
          <Button
            onClick={() => setMostrarModal("crear")}
            className="mt-4 sm:mt-0"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Nueva Solicitud
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          {/* Cambiado de grid a flex para md y superior, ajustado el gap */}
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-2">
            <div className="flex-grow">
              {" "}
              {/* Input de búsqueda ocupa espacio disponible */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar solicitudes..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <SelectField
                value={filtros.estado}
                onChange={(value) => setFiltros({ ...filtros, estado: value })}
              >
                <Option value={TODOS_VALUE}>Todos</Option>
                <Option value="pendiente_certificado">
                  Pendiente Certificado
                </Option>
                <Option value="revision_certificado">
                  Revisión Certificado
                </Option>
                <Option value="certificado_aprobado">
                  Certificado Aprobado
                </Option>
                <Option value="pendiente_directorio">
                  Pendiente Directorio
                </Option>
                <Option value="directorio_aprobado">Directorio Aprobado</Option>
                <Option value="certificado_rechazado">
                  Certificado Rechazado
                </Option>
                <Option value="pendiente_plan_pagos">
                  Pendiente Plan de Pagos
                </Option>
                <Option value="plan_pagos_aprobado">
                  Plan de Pagos Aprobado
                </Option>
                <Option value="revision_plan_pagos">
                  En Revisión (Plan de Pagos)
                </Option>
                <Option value="revision_contrato">
                  En Revisión (Contrato)
                </Option>
                <Option value="compraventa_aprobada">
                  Compraventa Aprobada
                </Option>
                <Option value="revision_escritura">
                  En Revisión (Escritura)
                </Option>
                <Option value="rechazado">Rechazado</Option>
                <Option value="solicitud_cerrada">Solicitud Cerrada</Option>
                <Option value="aprobado">Aprobado</Option>
              </SelectField>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Solicitud
              </label>
              <SelectField
                value={filtros.tipoSolicitud}
                onChange={(value) =>
                  setFiltros({ ...filtros, tipoSolicitud: value })
                }
              >
                <Option value={TODOS_VALUE}>Todos</Option>
                <Option value="venta">Venta</Option>
                <Option value="renta">Arrendamiento</Option>
              </SelectField>
            </div>

            {/* Mostrar el botón solo si hay filtros activos */}
            {filtrosActivos && (
              <div className="md:ml-auto">
                {" "}
                {/* Empuja el botón a la derecha en md+ */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiltros({
                      estado: TODOS_VALUE, // <--- Cambiado de null a TODOS_VALUE
                      tipoSolicitud: TODOS_VALUE, // <--- Cambiado de null a TODOS_VALUE
                    });
                    setBusqueda("");
                  }}
                  className="w-full md:w-auto" // Ancho completo en móvil, auto en md+
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista de solicitudes */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader className="px-4 py-3 border-b">
              <div className="flex justify-between items-center">
                <h2 className="font-medium">
                  Solicitudes ({solicitudesCount})
                </h2>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100vh-280px)] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">Cargando solicitudes...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">{error}</div>
              ) : solicitudes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No se encontraron solicitudes
                </div>
              ) : (
                <div className="">
                  {solicitudes.map((solicitud) => (
                    <div
                      key={solicitud.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer flex flex-col gap-3 ${
                        solicitudActiva?.id === solicitud.id
                          ? "border-l-4 border-[#008A4B] border-t-0 border-r-0 border-b-0"
                          : ""
                      }`}
                      onClick={() => setSolicitudActiva(solicitud)}
                    >
                      {/* Cambiar a flex-col por defecto, md:flex-row para pantallas medianas y superiores */}
                      {/* Alinear items al inicio en col, centrar en row (md) */}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1 md:gap-2">
                        {/* Contenedor izquierdo (Tipo y Estado) */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium bg-gray-100 px-3 rounded-full flex-shrink-0">
                            {solicitud.tipoSolicitud === "venta"
                              ? "Venta"
                              : "Renta"}
                          </span>
                          <Badge 
                            className={`${colorEstado(solicitud.estado)} whitespace-nowrap overflow-hidden text-ellipsis`}
                          >
                            {solicitud.estado
                              .replace(/_/g, " ")
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </Badge>
                        </div>
                        {/* Fecha (sin flex-shrink-0) */}
                        <span className="text-xs text-gray-500">
                          {formatearFecha(solicitud.fechaCreacion)}
                        </span>
                      </div>

                      <h3 className="font-medium text-lg">
                        {`${solicitud.propiedad?.identificadores?.superior} ${
                          solicitud.propiedad?.identificadores?.idSuperior
                        } ${solicitud.propiedad?.identificadores?.inferior} ${
                          solicitud.propiedad?.identificadores?.idInferior ||
                          "N/A"
                        }`}
                      </h3>

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <UserIcon className="h-4 w-4" />
                          <span>
                            {solicitud.solicitante?.username ||
                              "Usuario desconocido"}
                          </span>
                        </div>
                        {/* <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSolicitudActiva(solicitud);
                          }}
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Ver
                        </Button> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalle de la solicitud seleccionada */}
        <div className="md:col-span-2">
          <Card className="h-full">
            {!solicitudActiva ? (
              <div className="flex items-center justify-center h-[calc(100vh-280px)] text-gray-500">
                <div className="text-center">
                  <DocumentIcon className="h-16 w-16 mx-auto text-gray-300" />
                  <p className="mt-2">
                    Seleccione una solicitud para ver detalles
                  </p>
                </div>
              </div>
            ) : (
              <>
                <CardHeader className="px-6 py-4 border-b">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <h2 className="text-lg font-medium">
                        Solicitud de{" "}
                        {solicitudActiva.tipoSolicitud === "venta"
                          ? "Venta"
                          : "Renta"}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {`${
                          solicitudActiva?.propiedad?.identificadores.superior +
                            " " +
                            solicitudActiva?.propiedad?.identificadores
                              .idSuperior +
                            " " +
                            solicitudActiva?.propiedad?.identificadores
                              .inferior +
                            " " +
                            solicitudActiva?.propiedad?.identificadores
                              .idInferior || "N/A"
                        }`}
                      </p>
                    </div>
                    <Badge
                      className={`mt-2 sm:mt-0 ${colorEstado(
                        solicitudActiva.estado
                      )}`}
                    >
                      {solicitudActiva.estado
                        .split("_")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 h-[calc(100vh-350px)] overflow-y-auto">
                  <Tabs defaultValue="detalles">
                    <TabsList className="mb-4">
                      <TabsTrigger value="detalles">Detalles</TabsTrigger>
                      <TabsTrigger value="documentos">Documentos</TabsTrigger>
                      <TabsTrigger value="historial">Historial</TabsTrigger>
                      <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
                    </TabsList>

                    {/* Pestaña de detalles */}
                    <TabsContent value="detalles" className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Información General
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500">Tipo</p>
                            <p className="capitalize">
                              {solicitudActiva.tipoSolicitud}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Estado</p>
                            <p className="capitalize">
                              {solicitudActiva.estado
                                .split("_")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              Fecha de Creación
                            </p>
                            <p>
                              {formatearFecha(solicitudActiva.fechaCreacion)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              Última Actualización
                            </p>
                            <p>
                              {formatearFecha(
                                solicitudActiva.fechaActualizacion
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {solicitudActiva.detallesSolicitud.descripcion && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Descripción
                          </h3>
                          <p className="bg-gray-50 p-4 rounded-lg text-sm">
                            {solicitudActiva.detallesSolicitud.descripcion}
                          </p>
                        </div>
                      )}

                      {/* Detalles específicos según tipo de solicitud */}
                      {solicitudActiva.tipoSolicitud === "venta" &&
                        solicitudActiva.detallesSolicitud.detallesVenta && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                              Detalles de Venta
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                              {solicitudActiva.detallesSolicitud.detallesVenta
                                .precioVenta && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Precio de Venta
                                  </p>
                                  <p>
                                    {
                                      solicitudActiva.detallesSolicitud
                                        .detallesVenta.precioVenta
                                    }
                                  </p>
                                </div>
                              )}

                              {solicitudActiva.detallesSolicitud.detallesVenta
                                .potencialComprador && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Potencial Comprador
                                  </p>
                                  <p>
                                    {
                                      solicitudActiva.detallesSolicitud
                                        .detallesVenta.potencialComprador
                                    }
                                  </p>
                                </div>
                              )}

                              {solicitudActiva.detallesSolicitud.detallesVenta
                                .condicionesEspeciales && (
                                <div className="md:col-span-2">
                                  <p className="text-xs text-gray-500">
                                    Condiciones Especiales
                                  </p>
                                  <p>
                                    {
                                      solicitudActiva.detallesSolicitud
                                        .detallesVenta.condicionesEspeciales
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {solicitudActiva.tipoSolicitud === "renta" &&
                        solicitudActiva.detallesSolicitud.detallesRenta && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                              Detalles de Arrendamiento
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                              {solicitudActiva.detallesSolicitud.detallesRenta
                                .fechaInicioDeseada && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Fecha de Inicio Deseada
                                  </p>
                                  <p>
                                    {formatearFecha(
                                      solicitudActiva.detallesSolicitud
                                        .detallesRenta.fechaInicioDeseada
                                    )}
                                  </p>
                                </div>
                              )}

                              {solicitudActiva.detallesSolicitud.detallesRenta
                                .fechaInicioArrendamiento && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Fecha de Inicio de Arrendamiento
                                  </p>
                                  <p>
                                    {formatearFecha(
                                      solicitudActiva.detallesSolicitud
                                        .detallesRenta.fechaInicioArrendamiento
                                    )}
                                  </p>
                                </div>
                              )}

                              {solicitudActiva.detallesSolicitud.detallesRenta
                                .fechaFinArrendamiento && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Fecha de Fin de Arrendamiento
                                  </p>
                                  <p>
                                    {formatearFecha(
                                      solicitudActiva.detallesSolicitud
                                        .detallesRenta.fechaFinArrendamiento
                                    )}
                                  </p>
                                </div>
                              )}

                              {solicitudActiva.detallesSolicitud.detallesRenta
                                .potencialArrendatario && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Potencial Arrendatario
                                  </p>
                                  <p>
                                    {
                                      solicitudActiva.detallesSolicitud
                                        .detallesRenta.potencialArrendatario
                                    }
                                  </p>
                                </div>
                              )}

                              {solicitudActiva.detallesSolicitud.detallesRenta
                                .condicionesEspeciales && (
                                <div className="md:col-span-2">
                                  <p className="text-xs text-gray-500">
                                    Condiciones Especiales
                                  </p>
                                  <p>
                                    {
                                      solicitudActiva.detallesSolicitud
                                        .detallesRenta.condicionesEspeciales
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Acciones disponibles */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Acciones Disponibles
                        </h3>
                        {getAccionesDisponibles()}
                      </div>
                    </TabsContent>

                    {/* Pestaña de documentos */}
                    <TabsContent value="documentos">
                      <div className="space-y-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Documentos
                        </h3>

                        {!solicitudActiva.documentos ||
                        solicitudActiva.documentos.length === 0 ? (
                          <div className="text-center p-6 border border-dashed border-gray-300 rounded-lg">
                            <p className="text-sm text-gray-500">
                              No hay documentos asociados a esta solicitud.
                            </p>
                          </div>
                        ) : (
                          <MostrarDocumentos
                            documentos={solicitudActiva.documentos}
                          />
                        )}
                      </div>
                    </TabsContent>

                    {/* Pestaña de historial */}
                    <TabsContent value="historial">
                      <div className="space-y-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Historial de Cambios
                        </h3>

                        {!solicitudActiva.historialCambios ||
                        solicitudActiva.historialCambios.length === 0 ? (
                          <div className="text-center p-6 border border-dashed border-gray-300 rounded-lg">
                            <p className="text-sm text-gray-500">
                              No hay cambios registrados.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {solicitudActiva.historialCambios
                              .sort(
                                (a: any, b: any) =>
                                  new Date(b.fecha).getTime() -
                                  new Date(a.fecha).getTime()
                              )
                              .map((cambio: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="border-l-2 border-blue-500 pl-4 py-2"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">
                                        {cambio.descripcion}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Usuario:{" "}
                                        {cambio.usuario?.username ||
                                          cambio.usuario?.id ||
                                          "Desconocido"}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      {formatearFecha(cambio.fecha)}
                                    </p>
                                  </div>

                                  {cambio.estadoAnterior &&
                                    cambio.estadoNuevo && (
                                      <div className="mt-2 text-sm">
                                        <p>
                                          <span className="text-gray-500">
                                            Estado anterior:{" "}
                                          </span>
                                          <span className="capitalize">
                                            {cambio.estadoAnterior.replace(
                                              /_/g,
                                              " "
                                            )}
                                          </span>
                                        </p>
                                        <p>
                                          <span className="text-gray-500">
                                            Nuevo estado:{" "}
                                          </span>
                                          <span className="capitalize">
                                            {cambio.estadoNuevo.replace(
                                              /_/g,
                                              " "
                                            )}
                                          </span>
                                        </p>
                                      </div>
                                    )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Pestaña de comentarios */}
                    <TabsContent value="comentarios">
                      <div className="space-y-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Comentarios
                        </h3>

                        {!solicitudActiva.comentarios ||
                        solicitudActiva.comentarios.length === 0 ? (
                          <div className="text-center p-6 border border-dashed border-gray-300 rounded-lg mb-4">
                            <p className="text-sm text-gray-500">
                              No hay comentarios en esta solicitud.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4 mb-6">
                            {[...solicitudActiva.comentarios]
                              .sort(
                                (a: any, b: any) =>
                                  new Date(a.fecha).getTime() -
                                  new Date(b.fecha).getTime()
                              )
                              .map((comentario: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="border rounded-lg p-4"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium">
                                      {comentario.usuario?.username ||
                                        "Usuario"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatearFecha(comentario.fecha)}
                                    </div>
                                  </div>
                                  <p className="text-sm">
                                    {comentario.contenido}
                                  </p>

                                  {comentario.adjuntos &&
                                    comentario.adjuntos.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {comentario.adjuntos.map(
                                          (adjunto: any, idx: number) => (
                                            <a
                                              key={idx}
                                              href={adjunto.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                                            >
                                              <PaperClipIcon className="h-3 w-3 mr-1" />
                                              {adjunto.name}
                                            </a>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Formulario de comentarios */}
                        <form
                          className="border rounded-lg p-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const comentario = (
                              form.elements.namedItem(
                                "comentario"
                              ) as HTMLTextAreaElement
                            ).value;
                            const archivo = (
                              form.elements.namedItem(
                                "archivo"
                              ) as HTMLInputElement
                            ).files?.[0];

                            if (comentario) {
                              handleAgregarComentario(
                                solicitudActiva.id,
                                comentario,
                                archivo
                              );
                              form.reset();
                            }
                          }}
                        >
                          <h4 className="text-sm font-medium mb-2">
                            Agregar Comentario
                          </h4>
                          <div className="mb-3">
                            <Textarea
                              name="comentario"
                              placeholder="Escriba su comentario aquí..."
                              rows={3}
                              required
                            />
                          </div>
                          <div className="mb-3">
                            <label className="block text-sm mb-1">
                              Adjuntar Archivo (Opcional)
                            </label>
                            <Input type="file" name="archivo" />
                          </div>
                          <Button type="submit">Enviar Comentario</Button>
                        </form>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Modales */}
      {renderModalRechazo()}
      {renderModalCrearSolicitud()}
    </div>
  );
}
