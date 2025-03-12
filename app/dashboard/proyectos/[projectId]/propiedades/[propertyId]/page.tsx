"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../../../../_components/ui/button";
import { formatNumber } from "../../../../../_lib/utils";
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  IdentificationIcon,
  UserPlusIcon,
  UserGroupIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { use } from "react";
import { useAuth } from "../../../../../_lib/auth/AuthContext";
import { gql, useQuery, useMutation } from "@apollo/client";
import Image from "next/image";
import { DocumentUploadButton } from "../../../../../_components/DocumentUploadButton";
import { UploadButton } from "../../../../../utils/uploadthing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../../../_components/ui/dialog";
import { ImageIcon, ImageMinus, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../../_components/ui/tooltip";

// Interfaces para los documentos
interface Document {
  url: string;
  fechaSubida: string;
  nombre: string;
  id: string;
}

interface ContactInfo {
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
  cedula?: string;
}

interface AreaDesglosada {
  id: string;
  area: number;
  tasaAlicuotaOrdinariaEspecial?: number;
  tipoDeArea: string;
  nombreAdicional?: string;
  tieneTasaAlicuotaOrdinariaEspecial: boolean;
}

interface RucDocument {
  ruc: string;
  rucPdf: Document;
}

interface EmpresaRepresentanteLegal {
  autorizacionRepresentacionPdf: Document;
  cedulaRepresentanteLegalPdf: Document;
  rucEmpresaRepresentanteLegal: RucDocument[];
  nombreComercial?: string;
  nombreRepresentanteLegalRL?: string;
  cedulaRepresentanteLegal?: string;
  direccionLegal?: string;
  observaciones?: string;
}

interface DatosPersonaJuridica {
  cedulaRepresentanteLegalPdf: Document;
  nombramientoRepresentanteLegalPdf: Document;
  rucPersonaJuridica: Array<RucDocument>;
  cedulaRepresentanteLegal: string;
  representanteLegalEsEmpresa: boolean;
  razonSocialRepresentanteLegal: string;
  razonSocial: string;
  nombreComercial?: string;
  empresaRepresentanteLegal?: EmpresaRepresentanteLegal;
}

interface DatosPersonaNatural {
  cedulaPdf: Document;
  rucPdf?: Document;
  aplicaRuc: boolean;
  cedula: string;
  ruc?: string;
  razonSocial: string;
}

interface Propietario {
  documentId: string;
  contactoAccesos: ContactInfo;
  contactoAdministrativo?: ContactInfo;
  contactoGerente?: ContactInfo;
  contactoProveedores?: ContactInfo;
  contratosArrendamiento?: {
    archivo: Document;
  }[];
  datosPersonaJuridica?: DatosPersonaJuridica;
  datosPersonaNatural?: DatosPersonaNatural;
  tipoPersona: "Natural" | "Juridica";
}

interface Ocupante {
  tipoOcupante: string;
  datosPersonaJuridica?: {
    razonSocialRepresentanteLegal: string;
    cedulaRepresentanteLegalPdf: Document;
    cedulaRepresentanteLegal: string;
    nombramientoRepresentanteLegalPdf: Document;
    rucPersonaJuridica: Array<RucDocument>;
    razonSocial: string;
    representanteLegalEsEmpresa: boolean;
    empresaRepresentanteLegal: EmpresaRepresentanteLegal;
  };
  datosPersonaNatural?: {
    cedulaPdf: Document;
    aplicaRuc: boolean;
    rucPdf?: Document;
    razonSocial: string;
    ruc?: string;
  };
  perfilCliente?: {
    datosPersonaNatural?: {
      cedulaPdf: Document;
      aplicaRuc: boolean;
      rucPdf?: Document;
      razonSocial: string;
      ruc?: string;
    };
    datosPersonaJuridica?: {
      cedulaRepresentanteLegal: string;
      razonSocialRepresentanteLegal: string;
      cedulaRepresentanteLegalPdf: Document;
      nombramientoRepresentanteLegalPdf: Document;
      rucPersonaJuridica: Array<RucDocument>;
      razonSocial: string;
      representanteLegalEsEmpresa: boolean;
      empresaRepresentanteLegal: EmpresaRepresentanteLegal;
    };
    contactoAccesos?: {
      nombreCompleto: string;
      email: string;
      telefono: string;
      cedula?: string;
    };
    contactoAdministrativo?: {
      email: string;
      telefono: string;
    };
    contactoGerente?: {
      email: string;
      telefono: string;
    };
    contactoProveedores?: {
      email: string;
      telefono: string;
    };
  };
}

interface Solicitud {
  detallesSolicitud: {
    descripcion: string;
    motivoSolicitud: string;
  };
}

interface Property {
  imagen: any;
  proyecto: {
    nombre: string;
    tasaBaseAlicuotaOrdinaria: number;
  };
  documentId: string;
  identificadores: {
    idSuperior: string;
    superior: string;
    idInferior: string;
    inferior: string;
  };
  estadoEntrega: "entregado" | "noEntregado";
  estadoUso: "enUso" | "disponible";
  estadoDeConstruccion:
    | "enPlanos"
    | "enConstruccion"
    | "obraGris"
    | "acabados"
    | "finalizada"
    | "remodelacion"
    | "demolicion"
    | "abandonada"
    | "paralizada";
  areaTotal: number;
  areasDesglosadas: AreaDesglosada[];
  montoFondoInicial: number;
  montoAlicuotaOrdinaria: number;
  modoIncognito: boolean;
  actaEntregaPdf?: Document;
  contratoArrendamientoPdf?: Document;
  escrituraPdf?: Document;
  codigoCatastral: string;
  propietario?: Propietario;
  ocupantes?: Ocupante[];
  solicitudes?: Solicitud[];
  pagos?: {
    encargadoDePago: string;
    fechaExpiracionEncargadoDePago: string;
  };
  actividad?: string;
  componentesAdicionales?: {
    adecuaciones?: Array<{
      costo: number;
      descripcion: string;
      documentosRespaldos: Array<{
        nombre: string;
        validoDesde: string;
        validoHasta: string;
        url: string;
      }>;
      estado: string;
      fechaRealizacion: string;
      responsable: string;
      tipoAdecuacion: string;
    }>;
    tieneTrampasGrasa: boolean;
    tieneAdecuaciones: boolean;
    trampasGrasa?: Array<{
      estado: string;
      descripcion: string;
      capacidad: number;
      tipo: string;
      ubicacionInterna: string;
      fechaInstalacion: string;
      documentosRespaldos: Array<{
        nombre: string;
        validoDesde: string;
        validoHasta: string;
        url: string;
      }>;
    }>;
    CuantasTrampasEstaObligadoATener?: number;
    ObligadoTrampaDeGrasa: boolean;
  };
}

const GET_PROPERTY_DETAILS = gql`
  query Propiedad($documentId: ID!) {
    propiedad(documentId: $documentId) {
      imagen {
        documentId
        url
      }
      pagos {
        encargadoDePago
        fechaExpiracionEncargadoDePago
      }
      actividad
      proyecto {
        nombre
        tasaBaseAlicuotaOrdinaria
      }
      actaEntregaPdf {
        documentId
        url
        fechaSubida
        nombre
      }
      areaTotal
      areasDesglosadas {
        id
        area
        tasaAlicuotaOrdinariaEspecial
        tipoDeArea
        nombreAdicional
        tieneTasaAlicuotaOrdinariaEspecial
      }
      codigoCatastral
      contratoArrendamientoPdf {
        documentId
        url
        fechaSubida
        nombre
      }
      documentId
      escrituraPdf {
        documentId
        url
        nombre
        fechaSubida
      }
      estadoDeConstruccion
      estadoEntrega
      estadoUso
      identificadores {
        idInferior
        idSuperior
        inferior
        superior
      }
      modoIncognito
      montoAlicuotaOrdinaria
      montoFondoInicial
      componentesAdicionales {
        adecuaciones {
          costo
          descripcion
          documentosRespaldos {
            nombre
            validoDesde
            validoHasta
            url
          }
          estado
          fechaRealizacion
          responsable
          tipoAdecuacion
        }
        tieneTrampasGrasa
        tieneAdecuaciones
        trampasGrasa {
          estado
          descripcion
          tipo
          ubicacionInterna
          fechaInstalacion
          documentosRespaldos {
            nombre
            validoDesde
            validoHasta
            url
          }
        }
        CuantasTrampasEstaObligadoATener
        ObligadoTrampaDeGrasa
      }
      propietario {
        documentId
        contactoAccesos {
          nombreCompleto
          telefono
          email
          cedula
        }
        contactoAdministrativo {
          email
          telefono
        }
        contactoGerente {
          email
          telefono
        }
        contactoProveedores {
          email
          telefono
        }
        contratosArrendamiento {
          archivo {
            documentId
            nombre
            fechaSubida
            url
          }
        }
        datosPersonaJuridica {
          cedulaRepresentanteLegalPdf {
            documentId
            nombre
            fechaSubida
            url
          }
          nombramientoRepresentanteLegalPdf {
            documentId
            nombre
            fechaSubida
            url
          }
          rucPersonaJuridica {
            ruc
            rucPdf {
              documentId
              nombre
              fechaSubida
              url
            }
          }
          cedulaRepresentanteLegal
          razonSocialRepresentanteLegal
          razonSocial
          representanteLegalEsEmpresa
          nombreComercial
          empresaRepresentanteLegal {
            autorizacionRepresentacionPdf {
              documentId
              nombre
              fechaSubida
              url
            }
            cedulaRepresentanteLegalPdf {
              documentId
              nombre
              fechaSubida
              url
            }
            rucEmpresaRepresentanteLegal {
              ruc
              rucPdf {
                documentId
                nombre
                fechaSubida
                url
              }
            }
            nombreComercial
            nombreRepresentanteLegalRL
            observaciones
            direccionLegal
            cedulaRepresentanteLegal
          }
        }
        datosPersonaNatural {
          cedulaPdf {
            documentId
            nombre
            fechaSubida
            url
          }
          rucPdf {
            documentId
            nombre
            fechaSubida
            url
          }
          aplicaRuc
          cedula
          ruc
          razonSocial
        }
        tipoPersona
      }
      ocupantes {
        documentId
        tipoOcupante
        datosPersonaJuridica {
          cedulaRepresentanteLegalPdf {
            documentId
            nombre
            fechaSubida
            url
          }
          nombramientoRepresentanteLegalPdf {
            documentId
            nombre
            fechaSubida
            url
          }
          rucPersonaJuridica {
            ruc
            rucPdf {
              documentId
              nombre
              fechaSubida
              url
            }
          }
          cedulaRepresentanteLegal
          razonSocialRepresentanteLegal
          razonSocial
          representanteLegalEsEmpresa
          nombreComercial
          empresaRepresentanteLegal {
            autorizacionRepresentacionPdf {
              documentId
              nombre
              fechaSubida
              url
            }
            cedulaRepresentanteLegalPdf {
              documentId
              nombre
              fechaSubida
              url
            }
            rucEmpresaRepresentanteLegal {
              ruc
              rucPdf {
                documentId
                nombre
                fechaSubida
                url
              }
            }
            nombreComercial
            nombreRepresentanteLegalRL
            observaciones
            direccionLegal
            cedulaRepresentanteLegal
          }
        }
        datosPersonaNatural {
          cedulaPdf {
            documentId
            nombre
            fechaSubida
            url
          }
          aplicaRuc
          ruc
          rucPdf {
            documentId
            nombre
            fechaSubida
            url
          }
          razonSocial
        }
        perfilCliente {
          documentId
          datosPersonaNatural {
            cedulaPdf {
              documentId
              nombre
              fechaSubida
              url
            }
            aplicaRuc
            rucPdf {
              documentId
              nombre
              fechaSubida
              url
            }
            razonSocial
          }
          datosPersonaJuridica {
            cedulaRepresentanteLegalPdf {
              documentId
              nombre
              fechaSubida
              url
            }
            nombramientoRepresentanteLegalPdf {
              documentId
              nombre
              fechaSubida
              url
            }
            rucPersonaJuridica {
              ruc
              rucPdf {
                documentId
                nombre
                fechaSubida
                url
              }
            }
            cedulaRepresentanteLegal
            razonSocialRepresentanteLegal
            razonSocial
            representanteLegalEsEmpresa
            nombreComercial
            empresaRepresentanteLegal {
              autorizacionRepresentacionPdf {
                documentId
                nombre
                fechaSubida
                url
              }
              cedulaRepresentanteLegalPdf {
                documentId
                nombre
                fechaSubida
                url
              }
              rucEmpresaRepresentanteLegal {
                ruc
                rucPdf {
                  documentId
                  nombre
                  fechaSubida
                  url
                }
              }
              nombreComercial
              nombreRepresentanteLegalRL
              observaciones
              direccionLegal
              cedulaRepresentanteLegal
            }
          }
          contactoAccesos {
            nombreCompleto
            email
            telefono
            cedula
          }
          contactoAdministrativo {
            email
            telefono
          }
          contactoGerente {
            email
            telefono
          }
          contactoProveedores {
            email
            telefono
          }
        }
      }
      solicitudes {
        tipoSolicitud
        estado
        fechaCreacion
        fechaActualizacion
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

interface UploadQueueItem {
  url: string;
  name: string;
  field: string;
  type: "property" | "propietario" | "ocupante";
  ocupante?: any;
}

// Cambiar de Promise[] a objeto con metadata
const uploadQueue: UploadQueueItem[] = [];
let isProcessing = false;

// Añadir este componente CheckmarkIcon dentro del archivo
const CheckmarkIcon = () => (
  <motion.svg
    className="w-6 h-6 text-[#008A4B]"
    viewBox="0 0 24 24"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{
      type: "spring",
      stiffness: 260,
      damping: 20,
    }}
  >
    <motion.path
      fill="none"
      strokeWidth="3"
      stroke="currentColor"
      d="M5.5 12.5l4.5 4.5 8.5-8.5"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5 }}
    />
  </motion.svg>
);

// Añadir un nuevo prop para la ruta de retorno
interface PageProps {
  params: Promise<{ projectId: string; propertyId: string }>;
  searchParams: Promise<{ from?: string }>;
}

// Mutación para actualizar una propiedad
const UPDATE_PROPERTY_MUTATION = gql`
  mutation ActualizarPropiedad($documentId: ID!, $data: PropiedadInput!) {
    updatePropiedad(documentId: $documentId, data: $data) {
      documentId
    }
  }
`;

export default function PropertyDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { projectId, propertyId } = use(params);
  const { from } = use(searchParams);
  const { role } = useAuth();
  const router = useRouter();

  // Verificar si el usuario tiene permisos de administración
  const isAdmin = role === "Administrador" || role === "Directorio";

  const { data, loading, error, refetch } = useQuery(GET_PROPERTY_DETAILS, {
    variables: { documentId: propertyId },
    skip: !propertyId,
  });
  // console.log(data?.propiedad.ocupantes);
  const [crearArchivo] = useMutation(CREATE_ARCHIVO);
  const [updateProperty] = useMutation(UPDATE_PROPERTY_MUTATION);
  const [showLoading, setShowLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  if (error) {
    console.error("Error al cargar la propiedad:", error);
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar la propiedad. Por favor, intente más tarde.
      </div>
    );
  }

  const property: Property = data?.propiedad;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Funciones para contar documentos del propietario
  const getRequiredDocsCount = (property: Property) => {
    if (!property.propietario) return 0;
    
    // Solo contar documentos según el tipo de persona
    if (property.propietario.tipoPersona === "Juridica" && property.propietario.datosPersonaJuridica) {
      if (property.propietario.datosPersonaJuridica.representanteLegalEsEmpresa) {
        // Para persona jurídica con representante legal que es empresa:
        // 1. Todos los RUCs de la persona jurídica (uno por cada RUC añadido)
        // 2. Autorización de representación
        // 3. Cédula del representante legal de la empresa RL
        // 4. Todos los RUCs de la empresa representante legal (uno por cada RUC añadido)
        
        // Contar cuántos RUCs tiene la persona jurídica
        const cantidadRucsPersonaJuridica = property.propietario.datosPersonaJuridica.rucPersonaJuridica && 
                                          property.propietario.datosPersonaJuridica.rucPersonaJuridica.length > 0 
                                          ? property.propietario.datosPersonaJuridica.rucPersonaJuridica.length 
                                          : 0;
        
        // Contar cuántos RUCs tiene la empresa representante legal
        const cantidadRucsEmpresaRL = property.propietario.datosPersonaJuridica.empresaRepresentanteLegal && 
                                    property.propietario.datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal && 
                                    property.propietario.datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal.length > 0
                                    ? property.propietario.datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal.length
                                    : 0;
        
        return 2 + // Autorización + Cédula del representante legal de la empresa RL
               cantidadRucsPersonaJuridica + // Todos los RUCs de persona jurídica
               cantidadRucsEmpresaRL; // Todos los RUCs de empresa representante legal
      } else {
        // Para persona jurídica con representante legal que es persona natural:
        // 1. Todos los RUCs de la persona jurídica (uno por cada RUC añadido)
        // 2. Nombramiento de representante legal
        // 3. Cédula del representante legal
        
        // Contar cuántos RUCs tiene la persona jurídica
        const cantidadRucsPersonaJuridica = property.propietario.datosPersonaJuridica.rucPersonaJuridica && 
                                          property.propietario.datosPersonaJuridica.rucPersonaJuridica.length > 0 
                                          ? property.propietario.datosPersonaJuridica.rucPersonaJuridica.length 
                                          : 0;
        
        return 2 + // Nombramiento + Cédula del representante legal
               cantidadRucsPersonaJuridica; // Todos los RUCs de persona jurídica
      }
    } else if (property.propietario.tipoPersona === "Natural" && property.propietario.datosPersonaNatural) {
      // Para persona natural:
      // 1. Cédula (siempre)
      // 2. RUC (solo si aplica)
      return 1 + (property.propietario.datosPersonaNatural.aplicaRuc ? 1 : 0);
    }
    return 0;
  };

  const getUploadedDocsCount = (property: Property) => {
    if (!property.propietario) return 0;
    
    // Solo contar documentos según el tipo de persona
    if (property.propietario.tipoPersona === "Juridica" && property.propietario.datosPersonaJuridica) {
      const esEmpresaRL = property.propietario.datosPersonaJuridica.representanteLegalEsEmpresa;
      
      if (esEmpresaRL) {
        // Si el representante legal es una empresa
        const docsSubidos = [
          // Autorización de representación
          property.propietario.datosPersonaJuridica.empresaRepresentanteLegal?.autorizacionRepresentacionPdf,
          
          // Cédula del representante legal de la empresa RL
          property.propietario.datosPersonaJuridica.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf,
        ];
        
        // Añadir todos los RUCs de la persona jurídica
        if (property.propietario.datosPersonaJuridica.rucPersonaJuridica && 
            property.propietario.datosPersonaJuridica.rucPersonaJuridica.length > 0) {
          property.propietario.datosPersonaJuridica.rucPersonaJuridica.forEach(ruc => {
            if (ruc.rucPdf) {
              docsSubidos.push(ruc.rucPdf);
            }
          });
        }
        
        // Añadir todos los RUCs de la empresa representante legal
        if (property.propietario.datosPersonaJuridica.empresaRepresentanteLegal && 
            property.propietario.datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal && 
            property.propietario.datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal.length > 0) {
          property.propietario.datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal.forEach(ruc => {
            if (ruc.rucPdf) {
              docsSubidos.push(ruc.rucPdf);
            }
          });
        }
        
        return docsSubidos.filter(Boolean).length;
      } else {
        // Si el representante legal es persona natural
        const docsSubidos = [
          // Cédula del representante legal
          property.propietario.datosPersonaJuridica.cedulaRepresentanteLegalPdf,
          
          // Nombramiento del representante legal
          property.propietario.datosPersonaJuridica.nombramientoRepresentanteLegalPdf
        ];
        
        // Añadir todos los RUCs de la persona jurídica
        if (property.propietario.datosPersonaJuridica.rucPersonaJuridica && 
            property.propietario.datosPersonaJuridica.rucPersonaJuridica.length > 0) {
          property.propietario.datosPersonaJuridica.rucPersonaJuridica.forEach(ruc => {
            if (ruc.rucPdf) {
              docsSubidos.push(ruc.rucPdf);
            }
          });
        }
        
        return docsSubidos.filter(Boolean).length;
      }
    } else if (property.propietario.tipoPersona === "Natural" && property.propietario.datosPersonaNatural) {
      const docs = [
        property.propietario.datosPersonaNatural.cedulaPdf,
        ...(property.propietario.datosPersonaNatural.aplicaRuc
          ? [property.propietario.datosPersonaNatural.rucPdf]
          : []),
      ];
      return docs.filter(Boolean).length;
    }
    return 0;
  };

  // Actualizar la lógica de documentos requeridos para la propiedad
  const getPropertyRequiredDocsCount = (property: Property) => {
    const baseRequiredDocs = 2; // escritura y acta de entrega
    const needsArrendamientoDoc = property.ocupantes?.some(
      (ocupante) => ocupante.tipoOcupante === "arrendatario"
    );
    return baseRequiredDocs + (needsArrendamientoDoc ? 1 : 0);
  };

  const getPropertyUploadedDocsCount = (property: Property) => {
    const docs = [
      property.escrituraPdf,
      property.actaEntregaPdf,
      ...(property.ocupantes?.some(
        (ocupante) => ocupante.tipoOcupante === "arrendatario"
      )
        ? [property.contratoArrendamientoPdf]
        : []),
    ];
    return docs.filter(Boolean).length;
  };

  const processUploadQueue = async () => {
    if (isProcessing || uploadQueue.length === 0) return;

    isProcessing = true;
    try {
      // Procesar cada item en la cola en orden
      while (uploadQueue.length > 0) {
        const nextUpload = uploadQueue.shift();
        if (nextUpload) {
          const { url, name, field, type, ocupante } = nextUpload;

          // Crear archivo
          const { data: archivoData } = await crearArchivo({
            variables: {
              data: {
                nombre: name,
                url: url,
                tipoArchivo: "pdf",
                fechaSubida: new Date().toISOString(),
              },
            },
          });

          const archivoId = archivoData?.createArchivo?.documentId;
          if (!archivoId) throw new Error("No se pudo crear el archivo");

          // Obtener datos actuales
          let currentData = null;
          if (type === "propietario") {
            const { data: propData } = await refetch();
            currentData = propData.propiedad.propietario;
          } else if (type === "ocupante") {
            const { data: propData } = await refetch();
            if (ocupante?.tipoOcupante === "arrendatario") {
              currentData = propData.propiedad.ocupantes.find(
                (o: any) =>
                  o.perfilCliente?.documentId ===
                  ocupante.perfilCliente?.documentId
              )?.perfilCliente;
            } else {
              currentData = propData.propiedad.ocupantes.find(
                (o: any) => o.documentId === ocupante.documentId
              );
            }
          }

          // Actualizar documento
          const response = await fetch("/api/documentos", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              documentId:
                type === "property"
                  ? propertyId
                  : type === "propietario"
                  ? property.propietario?.documentId
                  : type === "ocupante" &&
                    ocupante?.tipoOcupante === "arrendatario"
                  ? ocupante?.perfilCliente?.documentId
                  : ocupante?.documentId,
              field,
              archivoId,
              type,
              currentData,
              tipoOcupante:
                type === "ocupante" ? ocupante?.tipoOcupante : undefined,
            }),
          });

          if (!response.ok) {
            throw new Error("Error updating document field");
          }

          await refetch();
        }
      }
    } finally {
      isProcessing = false;
    }
  };

  const handleDocumentUpload = async (
    url: string,
    name: string,
    field: string,
    type: "property" | "propietario" | "ocupante" = "property",
    ocupante?: any
  ) => {
    // Agregar a la cola con toda la información necesaria
    uploadQueue.push({ url, name, field, type, ocupante });

    // Crear una promesa que se resolverá cuando se procese este item
    const promise = new Promise<void>((resolve, reject) => {
      const checkQueue = setInterval(() => {
        if (
          !uploadQueue.some(
            (item) =>
              item.url === url && item.field === field && item.type === type
          )
        ) {
          clearInterval(checkQueue);
          resolve();
        }
      }, 100);
    });

    // Intentar procesar la cola
    processUploadQueue();

    // Retornar la promesa para que el DocumentUploadButton pueda mostrar el estado
    return promise;
  };

  // Función auxiliar para obtener la información de contacto según el encargado de pago
  const getContactInfo = (property: Property) => {
    if (!property.pagos?.encargadoDePago) {
      return property.propietario;
    }

    const encargadoDePago = property.pagos.encargadoDePago.toLowerCase();
    
    if (encargadoDePago === 'propietario') {
      return property.propietario;
    }

    // Si el encargado es ocupante, buscar el ocupante correspondiente
    const ocupante = property.ocupantes?.find(
      (o) => o.tipoOcupante.toLowerCase() === encargadoDePago
    );

    if (ocupante?.perfilCliente) {
      const contactInfo = {
        contactoAccesos: ocupante.perfilCliente.contactoAccesos || null,
        contactoAdministrativo: ocupante.perfilCliente.contactoAdministrativo || null,
        contactoGerente: ocupante.perfilCliente.contactoGerente || null,
        contactoProveedores: ocupante.perfilCliente.contactoProveedores || null
      };

      // Verificar si hay al menos un contacto con información
      const hasAnyContact = Object.values(contactInfo).some(contact => contact !== null);
      
      if (hasAnyContact) {
        return contactInfo;
      }
    }

    // Si no se encuentra información del ocupante o no tiene contactos, devolver la del propietario
    return property.propietario;
  };

  const handleRemoveImage = async () => {
    if (!property?.documentId) return;
    
    if (confirm("¿Estás seguro de eliminar la imagen de la propiedad?")) {
      setShowLoading(true);
      try {
        await updateProperty({
          variables: {
            documentId: property.documentId,
            data: {
              imagen: null
            }
          }
        });
        
        // Refrescar los datos después de eliminar la imagen
        refetch();
      } catch (error) {
        console.error("Error al eliminar la imagen:", error);
      } finally {
        setShowLoading(false);
      }
    }
  };
  // Función para cambiar la imagen
  const handleChangeImage = async (url: string, name: string) => {
    if (!property?.documentId) return;
    
    setUploadingImage(true);
    try {
      const { data: fileData } = await crearArchivo({
        variables: {
          data: {
            nombre: name,
            url: url,
            tipoArchivo: "imagen",
            fechaSubida: new Date().toISOString()
          }
        }
      });

      if (fileData?.createArchivo) {
        await updateProperty({
          variables: {
            documentId: property.documentId,
            data: {
              imagen: fileData.createArchivo.documentId
            }
          }
        });
        
        // Refrescar los datos después de cambiar la imagen
        refetch();
        setShowImageModal(false);
      }
    } catch (error) {
      console.error("Error al cambiar la imagen:", error);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Banner y detalles principales */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="relative h-64 w-full">
          <Link
            href={
              from === "propietarios"
                ? "/dashboard/propietarios"
                : `/dashboard/proyectos/${projectId}`
            }
            className="absolute top-6 left-6 z-10"
          >
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-8 h-8 bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
            >
              <ArrowLeftIcon className="w-4 h-4 text-white" />
            </Button>
          </Link>
          {isAdmin && (
            <div className="absolute top-6 right-6 z-10 flex gap-2">
              {/* Se elimina el botón de Asignar Propietario de aquí */}
            </div>
          )}
          <div className="relative">
            {property.imagen?.url ? (
              <div className="h-64 w-full">
                <Image
                  src={property.imagen.url}
                  alt={`${property.identificadores.superior} ${property.identificadores.idSuperior}`}
                  width={1200}
                  height={256}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="w-full min-h-[250px] flex items-center justify-center bg-gray-50">
                <BuildingOffice2Icon className="w-16 h-16 text-gray-400" />
              </div>
            )}
            
            {/* Menú de opciones para la imagen */}
            {role !== "Propietario" && (
              <div className="absolute top-4 right-4 z-10">
                <div className="relative group">
                  <button className="bg-white/90 hover:bg-white rounded-full p-2 transition-all shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                    <div className="p-1">
                      <button 
                        onClick={() => setShowImageModal(true)}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Cambiar imagen
                      </button>
                      
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/editar`)}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                          >
                            <BuildingOffice2Icon className="h-4 w-4 mr-2" />
                            Editar Propiedad
                          </button>
                          
                          {!property.propietario ? (
                            <button 
                              onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-propietario`)}
                              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                              <UserPlusIcon className="h-4 w-4 mr-2" />
                              Asignar Propietario
                            </button>
                          ) : (
                            <>
                            <button 
                              onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/editar-propietario`)}
                              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                             <UserIcon className="h-4 w-4 mr-2" />
                              Editar Propietario
                            </button>
                            <button 
                              onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-propietario`)}
                              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                              <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
                              Reasignar Propietario
                            </button>
                            <button 
                            onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-ocupante`)}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                          >
                            <UserPlusIcon className="h-4 w-4 mr-2" />
                              {property?.ocupantes && property?.ocupantes?.length > 0 ? "Manejar Ocupantes" : "Asignar Ocupante"}
                            </button>
                            </>
                          )}
                        </>
                      )}
                      
                      {property.imagen && (
                        <button 
                          onClick={handleRemoveImage}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-md"
                        >
                          <ImageMinus className="h-4 w-4 mr-2" />
                          Eliminar imagen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-semibold">
                  {property.identificadores.superior}{" "}
                  {property.identificadores.idSuperior}
                </h1>
                <p className="text-white/90 mt-2">
                  {property.identificadores.inferior}{" "}
                  {property.identificadores.idInferior}
                </p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm`}
                >
                  {formatNumber(property.areaTotal, true)} m²
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Información básica */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Código Catastral
                </h3>
                <p className="text-base font-medium mt-1">
                  {property.codigoCatastral ? property.codigoCatastral : "-"}
                </p>
              </div>
              {property.ocupantes && property.ocupantes.length > 0 ? (
                <div className="mt-4 space-y-1">
                  <h3 className="text-sm font-medium text-gray-500">
                    Ocupante
                  </h3>
                  <p className="text-base mt-1">
                    {property.ocupantes[0].datosPersonaJuridica?.razonSocial ||
                      property.ocupantes[0].datosPersonaNatural?.razonSocial ||
                      property.ocupantes[0].perfilCliente?.datosPersonaJuridica
                        ?.razonSocial ||
                      property.ocupantes[0].perfilCliente?.datosPersonaNatural
                        ?.razonSocial}
                  </p>
                  <h3 className="text-sm font-medium text-gray-500">RUC</h3>
                  <p className="text-base mt-1">
                    {property.ocupantes[0].datosPersonaJuridica
                      ?.rucPersonaJuridica[0]?.ruc ||
                      property.ocupantes[0].datosPersonaNatural?.ruc ||
                      property.ocupantes[0].perfilCliente?.datosPersonaJuridica
                        ?.rucPersonaJuridica[0]?.ruc ||
                      property.ocupantes[0].perfilCliente?.datosPersonaNatural
                        ?.ruc ||
                      "-"}
                  </p>
                  <h3 className="text-sm text-gray-500">Actividad</h3>
                  {property.actividad ? (
                    <p className="text-base mt-1">
                      {property.actividad.replaceAll("_", " ")}
                    </p>
                  ) : (
                    <p className="text-base mt-1">-</p>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-1">
                  <h3 className="text-sm font-medium text-gray-500">
                    Ocupante
                  </h3>
                  <p className="text-base mt-1">No hay ocupantes asignados</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Estado de Uso
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    property.estadoUso === "enUso"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {property.estadoUso === "enUso" ? "En uso" : "Disponible"}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Estado de Ocupación
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    property.ocupantes?.some(
                      (ocupante) => ocupante.tipoOcupante === "propietario"
                    )
                      ? "bg-purple-100 text-purple-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {property.ocupantes?.some(
                    (ocupante) => ocupante.tipoOcupante === "propietario"
                  )
                    ? "Uso propietario"
                    : "Arrendado"}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Estado de Construcción
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    property.estadoDeConstruccion === "finalizada"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {property.estadoDeConstruccion.charAt(0).toUpperCase() +
                    property.estadoDeConstruccion.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Áreas */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">Áreas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">
                Área Total
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="ml-1 inline-flex items-center">
                      <InfoIcon className="h-4 w-4 text-gray-500 relative top-[2px]" />
                    </TooltipTrigger>
                    <TooltipContent className="text-center max-w-[300px] text-sm">
                      <p>Superficie total de la propiedad, incluyendo todas las áreas de uso privativo sobre las cuales el propietario tiene derecho de uso.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <p className="mt-1 text-2xl font-light">
                {formatNumber(property.areaTotal, true)} m²
              </p>
            </div>

            {property.areasDesglosadas &&
              property.areasDesglosadas.length > 0 &&
              property.areasDesglosadas.map((area) => (
                <div key={area.id} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    Área {area.tipoDeArea === "adicional" && area.nombreAdicional 
                      ? area.nombreAdicional.charAt(0).toUpperCase() + area.nombreAdicional.slice(1) 
                      : area.tipoDeArea === "util" 
                        ? "Útil" 
                        : area.tipoDeArea.charAt(0).toUpperCase() + area.tipoDeArea.slice(1)}
                    {area.tipoDeArea === "util" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="ml-1 inline-flex items-center">
                            <InfoIcon className="h-4 w-4 text-gray-500 relative top-[2px]" />
                          </TooltipTrigger>
                          <TooltipContent className="text-center max-w-[300px] text-sm">
                            <p>Espacio exclusivo dentro de la propiedad destinado específicamente a el uso operativo de la misma.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </h3>
                  <p className="mt-1 text-xl font-light">
                    {formatNumber(area.area, true)} m²
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Tasa: ${formatNumber(
                      area.tieneTasaAlicuotaOrdinariaEspecial 
                        ? (area.tasaAlicuotaOrdinariaEspecial || 0.00) 
                        : (property.proyecto.tasaBaseAlicuotaOrdinaria || 0.00)
                    )}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Montos */}
        <div className="bg-white rounded-xl border p-4 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">
            Valores Asociados a la Propiedad
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-500">
                {property.proyecto.nombre == "Almax 2"
                  ? "Aporte Patrimonial"
                  : "Fondo Inicial"}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="ml-1 inline-flex items-center">
                      <InfoIcon className="h-4 w-4 text-gray-500 relative top-[2px]" />
                    </TooltipTrigger>
                    <TooltipContent className="text-center max-w-[300px] text-sm">
                      <p>Pago unico que se realiza al recibir la propiedad y que esta destinado para cubrir gastos de arranque de poryecto y posibles gastos extraordinarios que se puedan dar a futuro porducto de mantenimientos generales y/o catastrofes naturales que afecten la integridad del centro.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <p className="mt-1 text-lg font-light">
                ${formatNumber(property.montoFondoInicial)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-500">
                Alícuota Ordinaria
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="ml-1 inline-flex items-center">
                      <InfoIcon className="h-4 w-4 text-gray-500 relative top-[2px]" />
                    </TooltipTrigger>
                    <TooltipContent className="text-center max-w-[300px] text-sm">
                      <p>Cuota mensual que cada propietario debe cancelar para el mantenimiento y conservación de las áreas comunes del centro al que pertenece la propiedad.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <p className="mt-1 text-lg font-light">
                ${formatNumber(property.montoAlicuotaOrdinaria)}
              </p>
            </div>
            {property.pagos && (
              <div className="col-span-2 bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-500">
                  Información de Pago
                </h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Encargado de pago:</span>{" "}
                    {property.pagos.encargadoDePago.charAt(0).toUpperCase() +
                      property.pagos.encargadoDePago.slice(1) || "-"}
                  </p>
                  {property.pagos.fechaExpiracionEncargadoDePago && (
                    <p className="text-sm">
                      <span className="font-medium">Fecha de expiración:</span>{" "}
                      {formatDate(
                        property.pagos.fechaExpiracionEncargadoDePago
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Información de Contacto */}
        {property.propietario && (
          <div className="bg-white rounded-xl border p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">
              Información de Contacto {property.pagos?.encargadoDePago && `(${property.pagos.encargadoDePago})`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Contacto Accesos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Contacto Accesos
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <UserIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm">
                      <span className="font-medium">
                        {getContactInfo(property)?.contactoAccesos?.nombreCompleto || "-"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <IdentificationIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm">
                      <span className="font-medium">
                        {getContactInfo(property)?.contactoAccesos?.cedula || "-"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm">
                      <span className="font-medium">
                        {getContactInfo(property)?.contactoAccesos?.telefono || "-"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2 w-full">
                    <EnvelopeIcon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="overflow-hidden w-full">
                      <a
                        href={`mailto:${getContactInfo(property)?.contactoAccesos?.email}`}
                        className="text-sm font-medium text-[#008A4B] hover:underline break-all"
                      >
                        {getContactInfo(property)?.contactoAccesos?.email || "-"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contacto Gerente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Contacto Gerente
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm">
                      <span className="font-medium">
                        {getContactInfo(property)?.contactoGerente?.telefono || "-"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2 w-full">
                    <EnvelopeIcon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="overflow-hidden w-full">
                      <a
                        href={`mailto:${getContactInfo(property)?.contactoGerente?.email}`}
                        className="text-sm font-medium text-[#008A4B] hover:underline break-all"
                      >
                        {getContactInfo(property)?.contactoGerente?.email || "-"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contacto Proveedores */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Contacto Proveedores
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm">
                      <span className="font-medium">
                        {getContactInfo(property)?.contactoProveedores?.telefono || "-"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2 w-full">
                    <EnvelopeIcon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="overflow-hidden w-full">
                      <a
                        href={`mailto:${getContactInfo(property)?.contactoProveedores?.email}`}
                        className="text-sm font-medium text-[#008A4B] hover:underline break-all"
                      >
                        {getContactInfo(property)?.contactoProveedores?.email || "-"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contacto Administrativo */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Contacto Administrativo
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm">
                      <span className="font-medium">
                        {getContactInfo(property)?.contactoAdministrativo?.telefono || "-"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2 w-full">
                    <EnvelopeIcon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="overflow-hidden w-full">
                      <a
                        href={`mailto:${getContactInfo(property)?.contactoAdministrativo?.email}`}
                        className="text-sm font-medium text-[#008A4B] hover:underline break-all"
                      >
                        {getContactInfo(property)?.contactoAdministrativo?.email || "-"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documentos - Full Width */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Información de la Propiedad</h2>
        </div>
        <div className="space-y-4">
          {/* Progress Indicator para documentos de propiedad */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              Documentos de la Propiedad
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {getPropertyUploadedDocsCount(property) ===
                getPropertyRequiredDocsCount(property) ? (
                  <div className="flex items-center gap-2 text-[#008A4B]">
                    <CheckmarkIcon />
                    <span className="text-sm font-medium">Completo</span>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium">
                      {`${getPropertyUploadedDocsCount(
                        property
                      )}/${getPropertyRequiredDocsCount(property)}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      documentos subidos
                    </div>
                  </>
                )}
              </div>
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#008A4B]"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      (getPropertyUploadedDocsCount(property) /
                        getPropertyRequiredDocsCount(property)) *
                      100
                    }%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
          {/* Documentos de la propiedad */}
          <div className="space-y-4">
            {/* Escritura */}
            <DocumentUploadButton
              documentType="Escritura"
              propertyId={propertyId}
              onUploadComplete={(url: string, name: string) =>
                handleDocumentUpload(url, name, "escrituraPdf", "property")
              }
              currentDocument={property.escrituraPdf}
            />

            {/* Acta de Entrega */}
            <DocumentUploadButton
              documentType="Acta de Entrega"
              propertyId={propertyId}
              onUploadComplete={(url: string, name: string) =>
                handleDocumentUpload(url, name, "actaEntregaPdf", "property")
              }
              currentDocument={property.actaEntregaPdf}
            />

            {/* Contrato de Arrendamiento - solo si la propiedad está arrendada */}
            {property.ocupantes?.some(
              (ocupante) => ocupante.tipoOcupante === "arrendatario"
            ) && (
              <DocumentUploadButton
                documentType="Contrato de Arrendamiento"
                propertyId={propertyId}
                onUploadComplete={(url: string, name: string) =>
                  handleDocumentUpload(
                    url,
                    name,
                    "contratoArrendamientoPdf",
                    "property"
                  )
                }
                currentDocument={property.contratoArrendamientoPdf}
              />
            )}
          </div>
        </div>

        {!property.propietario ? (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay propietario</h3>
            <p className="mt-1 text-sm text-gray-500 mb-6">
              Asigna un propietario a esta propiedad para comenzar.
            </p>
            {isAdmin && (
              <Button
                className="bg-[#008A4B] hover:bg-[#006837] text-white"
                onClick={() =>
                  router.push(
                    `/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-propietario`
                  )
                }
              >
                Asignar Propietario
              </Button>
            )}
          </div>
        ) : (
          // ... código existente del propietario ...
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">
                  Documentos del Propietario
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {property.propietario.tipoPersona === "Juridica"
                    ? property.propietario.datosPersonaJuridica
                        ?.representanteLegalEsEmpresa
                      ? "Persona Jurídica con Empresa Representante Legal"
                      : "Persona Jurídica"
                    : "Persona Natural"}
                </p>
              </div>
              {/* Progress Indicator for Owner Documents */}
              {(property.propietario.datosPersonaJuridica ||
                property.propietario.datosPersonaNatural) && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getUploadedDocsCount(property) ===
                    getRequiredDocsCount(property) ? (
                      <div className="flex items-center gap-2 text-[#008A4B]">
                        <CheckmarkIcon />
                        <span className="text-sm font-medium">Completo</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-medium">
                          {`${getUploadedDocsCount(
                            property
                          )}/${getRequiredDocsCount(property)}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          documentos subidos
                        </div>
                      </>
                    )}
                  </div>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#008A4B]"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${
                          (getUploadedDocsCount(property) /
                            getRequiredDocsCount(property)) *
                          100
                        }%`,
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Nueva sección de información detallada del propietario */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-base font-semibold text-gray-900">
                  Información del Propietario
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-propietario`)}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowsRightLeftIcon className="h-3 w-3 mr-1" />
                    Reasignar
                  </button>
                </div>
              </div>

              {/* Información para Persona Jurídica */}
              {property.propietario.tipoPersona === "Juridica" && property.propietario.datosPersonaJuridica && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Razón Social</p>
                    <p className="text-sm font-medium">
                      {property.propietario.datosPersonaJuridica.razonSocial}
                    </p>
                  </div>

                  {property.propietario.datosPersonaJuridica
                    .nombreComercial && (
                    <div>
                      <p className="text-sm text-gray-500">Nombre Comercial</p>
                      <p className="text-sm font-medium">
                        {property.propietario.datosPersonaJuridica
                          .nombreComercial || "-"}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500">RUC</p>
                    <p className="text-sm font-medium">
                      {property.propietario.datosPersonaJuridica.rucPersonaJuridica
                        .map((ruc) => ruc.ruc)
                        .join(", ")}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Representante Legal</p>
                    <p className="text-sm font-medium">
                      {property.propietario.datosPersonaJuridica
                        .razonSocialRepresentanteLegal || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Cédula del Representante Legal
                    </p>
                    <p className="text-sm font-medium">
                      {property.propietario.datosPersonaJuridica
                        .cedulaRepresentanteLegal || "-"}
                    </p>
                  </div>

                  {/* Información adicional cuando el representante legal es una empresa */}
                  {property.propietario.datosPersonaJuridica
                    .representanteLegalEsEmpresa &&
                    property.propietario.datosPersonaJuridica
                      .empresaRepresentanteLegal && (
                      <>
                        <div className="pt-2 border-t">
                          <p className="text-sm font-semibold text-gray-900 mb-2">
                            Información de la Empresa Representante Legal
                          </p>

                          {property.propietario.datosPersonaJuridica
                            .empresaRepresentanteLegal.nombreComercial && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Nombre Comercial
                              </p>
                              <p className="text-sm font-medium">
                                {property.propietario.datosPersonaJuridica
                                  .empresaRepresentanteLegal.nombreComercial ||
                                  "-"}
                              </p>
                            </div>
                          )}

                          <div className="mt-2">
                            <p className="text-sm text-gray-500">
                              RUC de la Empresa
                            </p>
                            <p className="text-sm font-medium">
                              {property.propietario.datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal
                                .map((rucDoc) => rucDoc.ruc)
                                .join(", ") || "-"}
                            </p>
                          </div>

                          {property.propietario.datosPersonaJuridica
                            .empresaRepresentanteLegal
                            .nombreRepresentanteLegalRL && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Nombre del Representante Legal
                              </p>
                              <p className="text-sm font-medium">
                                {property.propietario.datosPersonaJuridica
                                  .empresaRepresentanteLegal
                                  .nombreRepresentanteLegalRL || "-"}
                              </p>
                            </div>
                          )}

                          {property.propietario.datosPersonaJuridica
                            .empresaRepresentanteLegal
                            .cedulaRepresentanteLegal && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Cédula del Representante Legal
                              </p>
                              <p className="text-sm font-medium">
                                {property.propietario.datosPersonaJuridica
                                  .empresaRepresentanteLegal
                                  .cedulaRepresentanteLegal || "-"}
                              </p>
                            </div>
                          )}

                          {property.propietario.datosPersonaJuridica
                            .empresaRepresentanteLegal.direccionLegal && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Dirección Legal
                              </p>
                              <p className="text-sm font-medium">
                                {property.propietario.datosPersonaJuridica
                                  .empresaRepresentanteLegal.direccionLegal ||
                                  "-"}
                              </p>
                            </div>
                          )}

                          {property.propietario.datosPersonaJuridica
                            .empresaRepresentanteLegal.observaciones && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Observaciones
                              </p>
                              <p className="text-sm font-medium">
                                {property.propietario.datosPersonaJuridica
                                  .empresaRepresentanteLegal.observaciones ||
                                  "-"}
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                </div>
              )}

              {/* Información para Persona Natural */}
              {property.propietario.tipoPersona === "Natural" && property.propietario.datosPersonaNatural && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Nombre/Razón Social</p>
                    <p className="text-sm font-medium">
                      {property.propietario.datosPersonaNatural.razonSocial}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Cédula</p>
                    <p className="text-sm font-medium">
                      {property.propietario.datosPersonaNatural.cedula}
                    </p>
                  </div>

                  {property.propietario.datosPersonaNatural.aplicaRuc &&
                    property.propietario.datosPersonaNatural.ruc && (
                      <div>
                        <p className="text-sm text-gray-500">RUC</p>
                        <p className="text-sm font-medium">
                          {property.propietario.datosPersonaNatural.ruc}
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Listado de Documentos del Propietario */}
            <div className="space-y-4">
              {property.propietario.tipoPersona === "Juridica" && property.propietario.datosPersonaJuridica && (
                <>
                  {/* RUC de la empresa (siempre requerido para persona jurídica) */}
                  {property.propietario.datosPersonaJuridica.rucPersonaJuridica.map(
                    (rucDoc, index) => (
                      <DocumentUploadButton
                        key={index}
                        documentType="RUC"
                        propertyId={propertyId}
                        onUploadComplete={(url: string, name: string) =>
                          handleDocumentUpload(
                            url,
                            name,
                            `datosPersonaJuridica.rucPersonaJuridica[${index}]`,
                            "propietario"
                          )
                        }
                        currentDocument={rucDoc.rucPdf}
                      />
                    )
                  )}

                  {property.propietario.datosPersonaJuridica.representanteLegalEsEmpresa ? (
                    // Si el representante legal es una empresa
                    <>
                      {/* Autorización de representación */}
                      <DocumentUploadButton
                        documentType="Autorización de representación"
                        propertyId={propertyId}
                        onUploadComplete={(url: string, name: string) =>
                          handleDocumentUpload(
                            url,
                            name,
                            "datosPersonaJuridica.empresaRepresentanteLegal.autorizacionRepresentacionPdf",
                            "propietario"
                          )
                        }
                        currentDocument={
                          property.propietario.datosPersonaJuridica
                            .empresaRepresentanteLegal?.autorizacionRepresentacionPdf
                        }
                      />

                      {/* Cédula del representante legal de la empresa RL */}
                      <DocumentUploadButton
                        documentType="Cédula del representante legal de la empresa RL"
                        propertyId={propertyId}
                        onUploadComplete={(url: string, name: string) =>
                          handleDocumentUpload(
                            url,
                            name,
                            "datosPersonaJuridica.empresaRepresentanteLegal.cedulaRepresentanteLegalPdf",
                            "propietario"
                          )
                        }
                        currentDocument={
                          property.propietario.datosPersonaJuridica
                            .empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf
                        }
                      />

                      {/* RUCs de la empresa representante legal */}
                      {property.propietario.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal.map(
                        (rucDoc, index) => (
                          <DocumentUploadButton
                            key={index}
                            documentType={`RUC de la empresa representante legal ${index + 1}`}
                            propertyId={propertyId}
                            onUploadComplete={(url: string, name: string) =>
                              handleDocumentUpload(
                                url,
                                name,
                                `datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal[${index}]`,
                                "propietario"
                              )
                            }
                            currentDocument={rucDoc.rucPdf}
                          />
                        )
                      )}
                    </>
                  ) : (
                    // Si el representante legal es persona natural
                    <>
                      {/* Cédula del representante legal */}
                      <DocumentUploadButton
                        documentType="Cédula del representante legal"
                        propertyId={propertyId}
                        onUploadComplete={(url: string, name: string) =>
                          handleDocumentUpload(
                            url,
                            name,
                            "datosPersonaJuridica.cedulaRepresentanteLegalPdf",
                            "propietario"
                          )
                        }
                        currentDocument={
                          property.propietario.datosPersonaJuridica
                            .cedulaRepresentanteLegalPdf
                        }
                      />

                      {/* Nombramiento del representante legal */}
                      <DocumentUploadButton
                        documentType="Nombramiento del representante legal"
                        propertyId={propertyId}
                        onUploadComplete={(url: string, name: string) =>
                          handleDocumentUpload(
                            url,
                            name,
                            "datosPersonaJuridica.nombramientoRepresentanteLegalPdf",
                            "propietario"
                          )
                        }
                        currentDocument={
                          property.propietario.datosPersonaJuridica
                            .nombramientoRepresentanteLegalPdf
                        }
                      />
                    </>
                  )}
                </>
              )}

              {/* Mantener la parte de persona natural igual */}
              {property.propietario.tipoPersona === "Natural" && property.propietario.datosPersonaNatural && (
                <>
                  {/* Cédula */}
                  <DocumentUploadButton
                    documentType="Cédula"
                    propertyId={propertyId}
                    onUploadComplete={(url: string, name: string) =>
                      handleDocumentUpload(
                        url,
                        name,
                        "datosPersonaNatural.cedulaPdf",
                        "propietario"
                      )
                    }
                    currentDocument={
                      property.propietario.datosPersonaNatural.cedulaPdf
                    }
                  />

                  {/* RUC (si aplica) */}
                  {property.propietario.datosPersonaNatural.aplicaRuc && (
                    <DocumentUploadButton
                      documentType="RUC"
                      propertyId={propertyId}
                      onUploadComplete={(url: string, name: string) =>
                        handleDocumentUpload(
                          url,
                          name,
                          "datosPersonaNatural.rucPdf",
                          "propietario"
                        )
                      }
                      currentDocument={
                        property.propietario.datosPersonaNatural.rucPdf
                      }
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ocupantes */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Ocupantes</h2>
          {Boolean(property.ocupantes?.length) && (
            <Button
              onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-ocupante`)}
              className="bg-[#008A4B] text-white hover:bg-[#006837]"
            >
              Agregar Ocupante
            </Button>
          )}
        </div>

        {property.ocupantes?.length ? (
          <div className="space-y-6">
            {property.ocupantes.map((ocupante, index) => {
              // Si es propietario, solo mostrar mensaje
              if (ocupante.tipoOcupante === "propietario") {
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      El ocupante de esta propiedad es el propietario
                    </p>
                  </div>
                );
              }

              // Determinar la fuente de datos según el tipo de ocupante
              const datosPersonaJuridica =
                ocupante.tipoOcupante === "arrendatario"
                  ? ocupante.perfilCliente?.datosPersonaJuridica
                  : ocupante.datosPersonaJuridica;

              const datosPersonaNatural =
                ocupante.tipoOcupante === "arrendatario"
                  ? ocupante.perfilCliente?.datosPersonaNatural
                  : ocupante.datosPersonaNatural;

              // Calcular documentos requeridos y subidos
              const getDocumentCounts = () => {
                let totalRequired = 0;
                let totalUploaded = 0;

                // Para ocupantes con datos de persona jurídica
                if (ocupante.datosPersonaJuridica) {
                  const esEmpresaRL = ocupante.datosPersonaJuridica.representanteLegalEsEmpresa;
                  
                  if (esEmpresaRL) {
                    // Contar cuántos RUCs tiene la persona jurídica
                    const cantidadRucsPersonaJuridica = ocupante.datosPersonaJuridica.rucPersonaJuridica?.length || 0;
                    
                    // Contar cuántos RUCs tiene la empresa representante legal
                    const cantidadRucsEmpresaRL = ocupante.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal?.length || 0;
                    
                    // Documentos requeridos
                    totalRequired = 2 + cantidadRucsPersonaJuridica + cantidadRucsEmpresaRL;
                    
                    // Documentos subidos
                    const docsSubidos = [
                      ocupante.datosPersonaJuridica.empresaRepresentanteLegal?.autorizacionRepresentacionPdf,
                      ocupante.datosPersonaJuridica.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf,
                      ...(ocupante.datosPersonaJuridica.rucPersonaJuridica || []).map(ruc => ruc.rucPdf),
                      ...(ocupante.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal || []).map(ruc => ruc.rucPdf)
                    ];
                    
                    totalUploaded = docsSubidos.filter(Boolean).length;
                  } else {
                    // Contar cuántos RUCs tiene la persona jurídica
                    const cantidadRucsPersonaJuridica = ocupante.datosPersonaJuridica.rucPersonaJuridica?.length || 0;
                    
                    // Documentos requeridos
                    totalRequired = 2 + cantidadRucsPersonaJuridica;
                    
                    // Documentos subidos
                    const docsSubidos = [
                      ocupante.datosPersonaJuridica.cedulaRepresentanteLegalPdf,
                      ocupante.datosPersonaJuridica.nombramientoRepresentanteLegalPdf,
                      ...(ocupante.datosPersonaJuridica.rucPersonaJuridica || []).map(ruc => ruc.rucPdf)
                    ];
                    
                    totalUploaded = docsSubidos.filter(Boolean).length;
                  }
                } 
                // Para ocupantes con datos de persona natural
                else if (ocupante.datosPersonaNatural) {
                  totalRequired = 1 + (ocupante.datosPersonaNatural.aplicaRuc ? 1 : 0);
                  
                  const docsSubidos = [
                    ocupante.datosPersonaNatural.cedulaPdf,
                    ocupante.datosPersonaNatural.aplicaRuc ? ocupante.datosPersonaNatural.rucPdf : null
                  ];
                  
                  totalUploaded = docsSubidos.filter(Boolean).length;
                }
                // Para ocupantes con perfil de cliente
                else if (ocupante.perfilCliente) {
                  if (ocupante.perfilCliente.datosPersonaJuridica) {
                    const esEmpresaRL = ocupante.perfilCliente.datosPersonaJuridica.representanteLegalEsEmpresa;
                    
                    if (esEmpresaRL) {
                      // Contar cuántos RUCs tiene la persona jurídica
                      const cantidadRucsPersonaJuridica = ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica?.length || 0;
                      
                      // Contar cuántos RUCs tiene la empresa representante legal
                      const cantidadRucsEmpresaRL = ocupante.perfilCliente.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal?.length || 0;
                      
                      // Documentos requeridos
                      totalRequired = 2 + cantidadRucsPersonaJuridica + cantidadRucsEmpresaRL;
                      
                      // Documentos subidos
                      const docsSubidos = [
                        ocupante.perfilCliente.datosPersonaJuridica.empresaRepresentanteLegal?.autorizacionRepresentacionPdf,
                        ocupante.perfilCliente.datosPersonaJuridica.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf,
                        ...(ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica || []).map(ruc => ruc.rucPdf),
                        ...(ocupante.perfilCliente.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal || []).map(ruc => ruc.rucPdf)
                      ];
                      
                      totalUploaded = docsSubidos.filter(Boolean).length;
                    } else {
                      // Contar cuántos RUCs tiene la persona jurídica
                      const cantidadRucsPersonaJuridica = ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica?.length || 0;
                      
                      // Documentos requeridos
                      totalRequired = 2 + cantidadRucsPersonaJuridica;
                      
                      // Documentos subidos
                      const docsSubidos = [
                        ocupante.perfilCliente.datosPersonaJuridica.cedulaRepresentanteLegalPdf,
                        ocupante.perfilCliente.datosPersonaJuridica.nombramientoRepresentanteLegalPdf,
                        ...(ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica || []).map(ruc => ruc.rucPdf)
                      ];
                      
                      totalUploaded = docsSubidos.filter(Boolean).length;
                    }
                  } else if (ocupante.perfilCliente.datosPersonaNatural) {
                    totalRequired = 1 + (ocupante.perfilCliente.datosPersonaNatural.aplicaRuc ? 1 : 0);
                    
                    const docsSubidos = [
                      ocupante.perfilCliente.datosPersonaNatural.cedulaPdf,
                      ocupante.perfilCliente.datosPersonaNatural.aplicaRuc ? ocupante.perfilCliente.datosPersonaNatural.rucPdf : null
                    ];
                    
                    totalUploaded = docsSubidos.filter(Boolean).length;
                  }
                }

                return { required: totalRequired, uploaded: totalUploaded };
              };

              const { required, uploaded } = getDocumentCounts();

              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">
                        {ocupante.tipoOcupante.charAt(0).toUpperCase() +
                          ocupante.tipoOcupante.slice(1)}
                      </h3>
                      {/* Mostrar razón social */}
                      {(datosPersonaJuridica?.razonSocial ||
                        datosPersonaNatural?.razonSocial) && (
                        <p className="text-sm text-gray-600 mt-1">
                          {datosPersonaJuridica?.razonSocial ||
                            datosPersonaNatural?.razonSocial}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Progress Indicator for Occupant Documents */}
                      {(() => {
                        let totalRequired = 0;
                        let totalUploaded = 0;

                        // Para ocupantes con datos de persona jurídica
                        if (ocupante.datosPersonaJuridica) {
                          const esEmpresaRL = ocupante.datosPersonaJuridica.representanteLegalEsEmpresa;
                          
                          if (esEmpresaRL) {
                            // Contar cuántos RUCs tiene la persona jurídica
                            const cantidadRucsPersonaJuridica = ocupante.datosPersonaJuridica.rucPersonaJuridica?.length || 0;
                            
                            // Contar cuántos RUCs tiene la empresa representante legal
                            const cantidadRucsEmpresaRL = ocupante.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal?.length || 0;
                            
                            // Documentos requeridos
                            totalRequired = 2 + cantidadRucsPersonaJuridica + cantidadRucsEmpresaRL;
                            
                            // Documentos subidos
                            const docsSubidos = [
                              ocupante.datosPersonaJuridica.empresaRepresentanteLegal?.autorizacionRepresentacionPdf,
                              ocupante.datosPersonaJuridica.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf,
                              ...(ocupante.datosPersonaJuridica.rucPersonaJuridica || []).map(ruc => ruc.rucPdf),
                              ...(ocupante.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal || []).map(ruc => ruc.rucPdf)
                            ];
                            
                            totalUploaded = docsSubidos.filter(Boolean).length;
                          } else {
                            // Contar cuántos RUCs tiene la persona jurídica
                            const cantidadRucsPersonaJuridica = ocupante.datosPersonaJuridica.rucPersonaJuridica?.length || 0;
                            
                            // Documentos requeridos
                            totalRequired = 2 + cantidadRucsPersonaJuridica;
                            
                            // Documentos subidos
                            const docsSubidos = [
                              ocupante.datosPersonaJuridica.cedulaRepresentanteLegalPdf,
                              ocupante.datosPersonaJuridica.nombramientoRepresentanteLegalPdf,
                              ...(ocupante.datosPersonaJuridica.rucPersonaJuridica || []).map(ruc => ruc.rucPdf)
                            ];
                            
                            totalUploaded = docsSubidos.filter(Boolean).length;
                          }
                        } 
                        // Para ocupantes con datos de persona natural
                        else if (ocupante.datosPersonaNatural) {
                          totalRequired = 1 + (ocupante.datosPersonaNatural.aplicaRuc ? 1 : 0);
                          
                          const docsSubidos = [
                            ocupante.datosPersonaNatural.cedulaPdf,
                            ocupante.datosPersonaNatural.aplicaRuc ? ocupante.datosPersonaNatural.rucPdf : null
                          ];
                          
                          totalUploaded = docsSubidos.filter(Boolean).length;
                        }
                        // Para ocupantes con perfil de cliente
                        else if (ocupante.perfilCliente) {
                          if (ocupante.perfilCliente.datosPersonaJuridica) {
                            const esEmpresaRL = ocupante.perfilCliente.datosPersonaJuridica.representanteLegalEsEmpresa;
                            
                            if (esEmpresaRL) {
                              // Contar cuántos RUCs tiene la persona jurídica
                              const cantidadRucsPersonaJuridica = ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica?.length || 0;
                              
                              // Contar cuántos RUCs tiene la empresa representante legal
                              const cantidadRucsEmpresaRL = ocupante.perfilCliente.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal?.length || 0;
                              
                              // Documentos requeridos
                              totalRequired = 2 + cantidadRucsPersonaJuridica + cantidadRucsEmpresaRL;
                              
                              // Documentos subidos
                              const docsSubidos = [
                                ocupante.perfilCliente.datosPersonaJuridica.empresaRepresentanteLegal?.autorizacionRepresentacionPdf,
                                ocupante.perfilCliente.datosPersonaJuridica.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf,
                                ...(ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica || []).map(ruc => ruc.rucPdf),
                                ...(ocupante.perfilCliente.datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal || []).map(ruc => ruc.rucPdf)
                              ];
                              
                              totalUploaded = docsSubidos.filter(Boolean).length;
                            } else {
                              // Contar cuántos RUCs tiene la persona jurídica
                              const cantidadRucsPersonaJuridica = ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica?.length || 0;
                              
                              // Documentos requeridos
                              totalRequired = 2 + cantidadRucsPersonaJuridica;
                              
                              // Documentos subidos
                              const docsSubidos = [
                                ocupante.perfilCliente.datosPersonaJuridica.cedulaRepresentanteLegalPdf,
                                ocupante.perfilCliente.datosPersonaJuridica.nombramientoRepresentanteLegalPdf,
                                ...(ocupante.perfilCliente.datosPersonaJuridica.rucPersonaJuridica || []).map(ruc => ruc.rucPdf)
                              ];
                              
                              totalUploaded = docsSubidos.filter(Boolean).length;
                            }
                          } else if (ocupante.perfilCliente.datosPersonaNatural) {
                            totalRequired = 1 + (ocupante.perfilCliente.datosPersonaNatural.aplicaRuc ? 1 : 0);
                            
                            const docsSubidos = [
                              ocupante.perfilCliente.datosPersonaNatural.cedulaPdf,
                              ocupante.perfilCliente.datosPersonaNatural.aplicaRuc ? ocupante.perfilCliente.datosPersonaNatural.rucPdf : null
                            ];
                            
                            totalUploaded = docsSubidos.filter(Boolean).length;
                          }
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-600">
                              <b>{totalUploaded}/{totalRequired}</b>  documentos subidos
                            </div>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[#008A4B] h-2 rounded-full"
                                style={{
                                  width: `${(totalUploaded / totalRequired) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Información detallada del ocupante */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">
                      Información del Ocupante
                    </h4>

                    {/* Información para Persona Jurídica */}
                    {datosPersonaJuridica && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">Razón Social</p>
                          <p className="text-sm font-medium">
                            {datosPersonaJuridica.razonSocial}
                          </p>
                        </div>
                        {datosPersonaJuridica.rucPersonaJuridica &&
                          datosPersonaJuridica.rucPersonaJuridica.length >
                            0 && (
                            <div>
                              <p className="text-sm text-gray-500">RUC</p>
                              <p className="text-sm font-medium">
                                {datosPersonaJuridica.rucPersonaJuridica
                                  .map((ruc) => ruc.ruc)
                                  .join(", ")}
                              </p>
                            </div>
                          )}
                        {/* Nombre Comercial (oculto) */}

                        {/* Información del Representante Legal */}
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="text-sm font-semibold text-gray-900 mb-3">
                            Información del Representante Legal
                          </h5>
                          
                          {datosPersonaJuridica.representanteLegalEsEmpresa ? (
                            // Si el representante legal es una empresa
                            <>
                              <div>
                                <p className="text-sm text-gray-500">Empresa Representante Legal</p>
                                <p className="text-sm font-medium">
                                  {datosPersonaJuridica.empresaRepresentanteLegal?.nombreComercial}
                                </p>
                              </div>

                              {datosPersonaJuridica.empresaRepresentanteLegal?.nombreRepresentanteLegalRL && (
                                <div>
                                  <p className="text-sm text-gray-500">Nombre del Representante Legal RL</p>
                                  <p className="text-sm font-medium">
                                    {datosPersonaJuridica.empresaRepresentanteLegal.nombreRepresentanteLegalRL}
                                  </p>
                                </div>
                              )}

                              {datosPersonaJuridica.empresaRepresentanteLegal?.cedulaRepresentanteLegal && (
                                <div>
                                  <p className="text-sm text-gray-500">Cédula del Representante Legal RL</p>
                                  <p className="text-sm font-medium">
                                    {datosPersonaJuridica.empresaRepresentanteLegal.cedulaRepresentanteLegal}
                                  </p>
                                </div>
                              )}

                              {datosPersonaJuridica.empresaRepresentanteLegal?.direccionLegal && (
                                <div>
                                  <p className="text-sm text-gray-500">Dirección Legal</p>
                                  <p className="text-sm font-medium">
                                    {datosPersonaJuridica.empresaRepresentanteLegal.direccionLegal}
                                  </p>
                                </div>
                              )}

                              {datosPersonaJuridica.empresaRepresentanteLegal?.observaciones && (
                                <div>
                                  <p className="text-sm text-gray-500">Observaciones</p>
                                  <p className="text-sm font-medium">
                                    {datosPersonaJuridica.empresaRepresentanteLegal.observaciones}
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            // Si el representante legal es persona natural
                            <>
                              <div>
                                <p className="text-sm text-gray-500">Nombre del Representante Legal</p>
                                <p className="text-sm font-medium">
                                  {datosPersonaJuridica.razonSocialRepresentanteLegal}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 mt-2">Cédula del Representante Legal</p>
                                <p className="text-sm font-medium">
                                  {datosPersonaJuridica.cedulaRepresentanteLegal}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Información para Persona Natural */}
                    {datosPersonaNatural && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">
                            Nombre/Razón Social
                          </p>
                          <p className="text-sm font-medium">
                            {datosPersonaNatural.razonSocial}
                          </p>
                        </div>

                        {datosPersonaNatural.aplicaRuc && (
                          <div>
                            <p className="text-sm text-gray-500">RUC</p>
                            <p className="text-sm font-medium">
                              {datosPersonaNatural.ruc || "-"}
                            </p>
                          </div>
                        )}

                        {/* Contactos del ocupante si tiene perfil cliente */}
                        {ocupante.perfilCliente && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">
                              Información de Contacto
                            </h5>
                            <div className="space-y-3">
                              {ocupante.perfilCliente.contactoAccesos && (
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Contacto de Accesos
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente.contactoAccesos
                                          .nombreCompleto
                                      }
                                    </p>
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente.contactoAccesos
                                          .telefono
                                      }
                                    </p>
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente.contactoAccesos
                                          .email
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                              {ocupante.perfilCliente
                                .contactoAdministrativo && (
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Contacto Administrativo
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente
                                          .contactoAdministrativo.telefono
                                      }
                                    </p>
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente
                                          .contactoAdministrativo.email
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                              {ocupante.perfilCliente.contactoGerente && (
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Contacto Gerente
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente.contactoGerente
                                          .telefono
                                      }
                                    </p>
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente.contactoGerente
                                          .email
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                              {ocupante.perfilCliente.contactoProveedores && (
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Contacto Proveedores
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente
                                          .contactoProveedores.telefono
                                      }
                                    </p>
                                    <p className="text-sm">
                                      {
                                        ocupante.perfilCliente
                                          .contactoProveedores.email
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Documentos del Ocupante */}
                  <div className="space-y-4">
                    {datosPersonaJuridica && (
                      <>
                        {/* RUC */}
                        {datosPersonaJuridica.rucPersonaJuridica.map(
                          (rucDoc, index) => (
                            <DocumentUploadButton
                              key={index}
                              documentType="RUC"
                              propertyId={propertyId}
                              onUploadComplete={(url: string, name: string) =>
                                handleDocumentUpload(
                                  url,
                                  name,
                                  `datosPersonaJuridica.rucPersonaJuridica[${index}]`,
                                  "ocupante",
                                  ocupante
                                )
                              }
                              currentDocument={rucDoc.rucPdf}
                            />
                          )
                        )}

                        {datosPersonaJuridica.representanteLegalEsEmpresa ? (
                          // Si el representante legal es una empresa
                          <>
                            {/* Autorización de representación */}
                            <DocumentUploadButton
                              documentType="Autorización de representación"
                              propertyId={propertyId}
                              onUploadComplete={(url: string, name: string) =>
                                handleDocumentUpload(
                                  url,
                                  name,
                                  "datosPersonaJuridica.empresaRepresentanteLegal.autorizacionRepresentacionPdf",
                                  "ocupante",
                                  ocupante
                                )
                              }
                              currentDocument={
                                datosPersonaJuridica.empresaRepresentanteLegal
                                  ?.autorizacionRepresentacionPdf
                              }
                            />

                            {/* Cédula del representante legal de la empresa RL */}
                            <DocumentUploadButton
                              documentType="Cédula del representante legal de la empresa RL"
                              propertyId={propertyId}
                              onUploadComplete={(url: string, name: string) =>
                                handleDocumentUpload(
                                  url,
                                  name,
                                  "datosPersonaJuridica.empresaRepresentanteLegal.cedulaRepresentanteLegalPdf",
                                  "ocupante",
                                  ocupante
                                )
                              }
                              currentDocument={
                                datosPersonaJuridica.empresaRepresentanteLegal
                                  ?.cedulaRepresentanteLegalPdf
                              }
                            />

                            {/* RUCs de la empresa representante legal */}
                            {datosPersonaJuridica.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal.map(
                              (rucDoc, index) => (
                                <DocumentUploadButton
                                  key={index}
                                  documentType={`RUC de la empresa representante legal ${index + 1}`}
                                  propertyId={propertyId}
                                  onUploadComplete={(url: string, name: string) =>
                                    handleDocumentUpload(
                                      url,
                                      name,
                                      `datosPersonaJuridica.empresaRepresentanteLegal.rucEmpresaRepresentanteLegal[${index}]`,
                                      "ocupante",
                                      ocupante
                                    )
                                  }
                                  currentDocument={rucDoc.rucPdf}
                                />
                              )
                            )}
                          </>
                        ) : (
                          // Si el representante legal es persona natural
                          <>
                            {/* Cédula del representante legal */}
                            <DocumentUploadButton
                              documentType="Cédula del representante legal"
                              propertyId={propertyId}
                              onUploadComplete={(url: string, name: string) =>
                                handleDocumentUpload(
                                  url,
                                  name,
                                  "datosPersonaJuridica.cedulaRepresentanteLegalPdf",
                                  "ocupante",
                                  ocupante
                                )
                              }
                              currentDocument={datosPersonaJuridica.cedulaRepresentanteLegalPdf}
                            />

                            {/* Nombramiento del representante legal */}
                            <DocumentUploadButton
                              documentType="Nombramiento del representante legal"
                              propertyId={propertyId}
                              onUploadComplete={(url: string, name: string) =>
                                handleDocumentUpload(
                                  url,
                                  name,
                                  "datosPersonaJuridica.nombramientoRepresentanteLegalPdf",
                                  "ocupante",
                                  ocupante
                                )
                              }
                              currentDocument={datosPersonaJuridica.nombramientoRepresentanteLegalPdf}
                            />
                          </>
                        )}
                      </>
                    )}

                    {datosPersonaNatural && (
                      <>
                        {/* Cédula */}
                        <DocumentUploadButton
                          documentType="Cédula"
                          propertyId={propertyId}
                          onUploadComplete={(url: string, name: string) =>
                            handleDocumentUpload(
                              url,
                              name,
                              "datosPersonaNatural.cedulaPdf",
                              "ocupante",
                              ocupante
                            )
                          }
                          currentDocument={datosPersonaNatural.cedulaPdf}
                        />

                        {/* RUC (si aplica) */}
                        {datosPersonaNatural.aplicaRuc && (
                          <DocumentUploadButton
                            documentType="RUC"
                            propertyId={propertyId}
                            onUploadComplete={(url: string, name: string) =>
                              handleDocumentUpload(
                                url,
                                name,
                                "datosPersonaNatural.rucPdf",
                                "ocupante",
                                ocupante
                              )
                            }
                            currentDocument={datosPersonaNatural.rucPdf}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ocupantes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {property.propietario ? "Asigna un ocupante a esta propiedad para comenzar." : "Asigna un propietario primero."}
            </p>
            <div className="mt-6">
              <Button
                onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-ocupante`)}
                className="bg-[#008A4B] text-white hover:bg-[#006837]"
                disabled={property.propietario == null}
              >
                Asignar Ocupante
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Solicitudes Recientes */}
      {property.solicitudes && property.solicitudes.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-6">Solicitudes Recientes</h2>
          <div className="space-y-4">
            {property.solicitudes.map((solicitud, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">
                  {solicitud.detallesSolicitud.motivoSolicitud}
                </h3>
                <p className="text-sm text-gray-500">
                  {solicitud.detallesSolicitud.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección de Trampas de Grasa */}
      <div className="p-6 border-t">
        <h2 className="text-xl font-semibold mb-6">Trampas de Grasa</h2>

        <div className="space-y-6">
          {/* Estado de obligatoriedad */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <h2 className="text-sm text-gray-500 mr-3">Obligatoriedad:</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  property.componentesAdicionales?.ObligadoTrampaDeGrasa
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {property.componentesAdicionales?.ObligadoTrampaDeGrasa
                  ? "Obligado a tener trampas de grasa"
                  : "No obligado a tener trampas de grasa"}
              </span>
            </div>

            {property.componentesAdicionales?.ObligadoTrampaDeGrasa && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">
                    Trampas requeridas
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">
                    {
                      property.componentesAdicionales
                        .CuantasTrampasEstaObligadoATener
                    }
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">
                    Trampas instaladas
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">
                    {property.componentesAdicionales.trampasGrasa?.length || 0}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lista de trampas instaladas */}
          {property.componentesAdicionales?.trampasGrasa &&
          property.componentesAdicionales.trampasGrasa.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {property.componentesAdicionales.trampasGrasa.map(
                (trampa, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl border p-6 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Trampa {index + 1}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {trampa.descripcion}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trampa.estado === "activa"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {trampa.estado}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Capacidad:</span>
                        <span className="font-medium">
                          {formatNumber(trampa.capacidad)} litros
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tipo:</span>
                        <span className="font-medium">{trampa.tipo}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Ubicación:</span>
                        <span className="font-medium">
                          {trampa.ubicacionInterna}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Fecha instalación:
                        </span>
                        <span className="font-medium">
                          {new Date(
                            trampa.fechaInstalacion
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {trampa.documentosRespaldos &&
                    trampa.documentosRespaldos.length > 0 ? (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Documentos de respaldo
                        </h4>
                        <div className="space-y-2">
                          {trampa.documentosRespaldos.map((doc, docIndex) => (
                            <a
                              key={docIndex}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-blue-600 hover:text-blue-800"
                            >
                              {doc.nombre}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        Documentos de respaldo pendientes
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm"> </p>
          )}
        </div>
      </div>

      {/* Sección de Adecuaciones */}
      {/* <div className="p-6 border-t">
          <h2 className="text-xl font-semibold mb-6">Adecuaciones</h2>
          
          {property.componentesAdicionales?.adecuaciones && property.componentesAdicionales.adecuaciones.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {property.componentesAdicionales.adecuaciones.map((adecuacion, index) => (
                <div key={index} className="bg-white rounded-xl border p-6 space-y-4">
                  <div className="flex justify-between items-start">
            <div>
                      <h3 className="font-semibold text-gray-900">Adecuación {index + 1}</h3>
                      <p className="text-sm text-gray-500">{adecuacion.descripcion}</p>
            </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      adecuacion.estado === "completada" 
                        ? "bg-green-100 text-green-800" 
                        : adecuacion.estado === "en_proceso"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {adecuacion.estado.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Costo:</span>
                      <span className="font-medium">${formatNumber(adecuacion?.costo)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tipo:</span>
                      <span className="font-medium">{adecuacion.tipoAdecuacion}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Responsable:</span>
                      <span className="font-medium">{adecuacion.responsable}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fecha realización:</span>
                      <span className="font-medium">{new Date(adecuacion.fechaRealizacion).toLocaleDateString()}</span>
          </div>
        </div>

                  {adecuacion.documentosRespaldos && adecuacion.documentosRespaldos.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Documentos de respaldo</h4>
                      <div className="space-y-2">
                        {adecuacion.documentosRespaldos.map((doc, docIndex) => (
                          <a
                            key={docIndex}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-blue-600 hover:text-blue-800"
                          >
                            {doc.nombre}
                            <div className="text-xs text-gray-500">
                              Válido: {new Date(doc.validoDesde).toLocaleDateString()} - {new Date(doc.validoHasta).toLocaleDateString()}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay adecuaciones registradas</p>
          )}
        </div> */}
      
      {/* Modal para cambiar la imagen */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar imagen de la propiedad</DialogTitle>
            <DialogDescription>
              Sube una nueva imagen para la propiedad.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {property.imagen?.url && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 mb-4">
                <Image 
                  src={property.imagen.url}
                  alt="Imagen actual"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm">Imagen actual</span>
                </div>
              </div>
            )}
            
            <UploadButton
              endpoint="propertyImage"
              onClientUploadComplete={async (res) => {
                try {
                  setUploadingImage(true);
                  if (res && res[0]) {
                    await handleChangeImage(res[0].ufsUrl, res[0].name);
                  }
                } finally {
                  setUploadingImage(false);
                }
              }}
              onUploadError={(error: Error) => {
                console.error("Error uploading:", error);
                setUploadingImage(false);
              }}
              onUploadBegin={() => {
                setUploadingImage(true);
              }}
              appearance={{
                button: "w-full border border-[#008A4B] !text-[#008A4B] hover:bg-[#008A4B] hover:!text-white text-sm font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2",
                allowedContent: "hidden"
              }}
              content={{
                button({ ready }) {
                  if (ready) {
                    return (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                        </svg>
                        <span>{uploadingImage ? "Subiendo..." : "Subir nueva imagen"}</span>
                      </>
                    );
                  }
                  return "Cargando...";
                }
              }}
              disabled={uploadingImage}
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
