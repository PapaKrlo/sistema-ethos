"use client";

import { useState, use, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../../../../../../_components/ui/button";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { gql, useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { SimpleDocumentUpload } from "@/_components/SimpleDocumentUpload";
import { StatusModal } from "@/_components/StatusModal";

const SEARCH_PROPIETARIOS = gql`
  query BuscarPerfilesCliente($searchTerm: String!, $documentId: ID) {
    perfilesCliente(
      filters: {
        or: [
          { documentId: { eq: $documentId } }
          { datosPersonaNatural: { razonSocial: { containsi: $searchTerm } } }
          { datosPersonaNatural: { cedula: { containsi: $searchTerm } } }
          { datosPersonaJuridica: { razonSocial: { containsi: $searchTerm } } }
          {
            datosPersonaJuridica: {
              rucPersonaJuridica: { ruc: { containsi: $searchTerm } }
            }
          }
        ]
        rol: { eq: "Propietario" }
      }
    ) {
      documentId
      tipoPersona
      datosPersonaNatural {
        cedula
        razonSocial
      }
      datosPersonaJuridica {
        razonSocial
        rucPersonaJuridica {
          ruc
        }
      }
    }
  }
`;

const ASIGNAR_PROPIETARIO = gql`
  mutation AsignarPropietario($propiedadId: ID!, $propietarioId: ID!) {
    updatePropiedad(
      documentId: $propiedadId
      data: { propietario: $propietarioId }
    ) {
      documentId
      propietario {
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
      }
    }
  }
`;

const GET_PROPERTY_DETAILS = gql`
  query GetPropertyDetails($propertyId: ID!) {
    propiedad(documentId: $propertyId) {
      documentId
      identificadores {
        idSuperior
        superior
        idInferior
        inferior
      }
      propietario {
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
      }
    }
  }
`;

const VERIFY_RUC_EXISTS = gql`
  query VerificarRucExistente($ruc: String!) {
    perfilesCliente(
      filters: {
        or: [
          { datosPersonaNatural: { ruc: { eq: $ruc } } }
          { datosPersonaJuridica: { rucPersonaJuridica: { ruc: { eq: $ruc } } } }
        ]
      }
    ) {
      documentId
      tipoPersona
      datosPersonaNatural {
        razonSocial
        cedula
        ruc
      }
      datosPersonaJuridica {
        razonSocial
        rucPersonaJuridica {
          ruc
        }
      }
    }
  }
`;

const CREATE_PERFIL_CLIENTE = gql`
  mutation CreatePerfilCliente($data: PerfilClienteInput!) {
    createPerfilCliente(data: $data) {
      documentId
      tipoPersona
      rol
      datosPersonaNatural {
        cedula
        razonSocial
        ruc
        cedulaPdf {
          documentId
          url
        }
        rucPdf {
          documentId
          url
        }
      }
      datosPersonaJuridica {
        razonSocial
        nombreComercial
        rucPersonaJuridica {
          ruc
          rucPdf {
            documentId
            url
          }
        }
        representanteLegalEsEmpresa
        cedulaRepresentanteLegalPdf {
          documentId
          url
        }
        nombramientoRepresentanteLegalPdf {
          documentId
          url
        }
        empresaRepresentanteLegal {
          autorizacionRepresentacionPdf {
            documentId
            url
          }
          cedulaRepresentanteLegalPdf {
            documentId
            url
          }
          rucEmpresaRepresentanteLegal {
            ruc
            rucPdf {
              documentId
              url
            }
          }
        }
      }
      contactoAccesos {
        nombreCompleto
        telefono
        email
      }
      contactoAdministrativo {
        telefono
        email
      }
      contactoGerente {
        telefono
        email
      }
      contactoProveedores {
        telefono
        email
      }
    }
  }
`;

interface PageProps {
  params: Promise<{ projectId: string; propertyId: string }>;
}

export default function AsignarPropietarioPage({ params }: PageProps) {
  const { projectId, propertyId } = use(params);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tipoPersona, setTipoPersona] = useState<"Natural" | "Juridica">(
    "Natural"
  );

  // Estados para validación de RUC
  const [rucError, setRucError] = useState("");
  const [isValidatingRuc, setIsValidatingRuc] = useState(false);
  const [rucsJuridicaErrors, setRucsJuridicaErrors] = useState<string[]>([]);
  const [rucsEmpresaRepresentanteErrors, setRucsEmpresaRepresentanteErrors] = useState<string[]>([]);

  // Hook para verificar RUC
  const [verificarRuc] = useLazyQuery(VERIFY_RUC_EXISTS, {
    fetchPolicy: "network-only",
  });

  // Función para validar un RUC
  const validarRuc = async (rucValue: string, tipo: 'natural' | 'juridica' | 'representante', index?: number) => {
    if (!rucValue || rucValue.length < 10) return;
    
    setIsValidatingRuc(true);
    try {
      const { data } = await verificarRuc({ variables: { ruc: rucValue } });
      
      const rucExiste = data?.perfilesCliente?.length > 0;
      
      if (rucExiste) {
        // Obtener la razón social del propietario existente
        const clienteExistente = data.perfilesCliente[0];
        const razonSocialExistente = clienteExistente.tipoPersona === "Natural" 
          ? clienteExistente.datosPersonaNatural?.razonSocial
          : clienteExistente.datosPersonaJuridica?.razonSocial;
        
        const mensaje = `Este RUC ya está registrado para "${razonSocialExistente || 'Propietario existente'}"`;
        
        if (tipo === 'natural') {
          setRucError(mensaje);
        } else if (tipo === 'juridica' && index !== undefined) {
          const newErrors = [...rucsJuridicaErrors];
          newErrors[index] = mensaje;
          setRucsJuridicaErrors(newErrors);
        } else if (tipo === 'representante' && index !== undefined) {
          const newErrors = [...rucsEmpresaRepresentanteErrors];
          newErrors[index] = mensaje;
          setRucsEmpresaRepresentanteErrors(newErrors);
        }
      } else {
        if (tipo === 'natural') {
          setRucError("");
        } else if (tipo === 'juridica' && index !== undefined) {
          const newErrors = [...rucsJuridicaErrors];
          newErrors[index] = "";
          setRucsJuridicaErrors(newErrors);
        } else if (tipo === 'representante' && index !== undefined) {
          const newErrors = [...rucsEmpresaRepresentanteErrors];
          newErrors[index] = "";
          setRucsEmpresaRepresentanteErrors(newErrors);
        }
      }
    } catch (error) {
      console.error("Error al validar RUC:", error);
    } finally {
      setIsValidatingRuc(false);
    }
  };

  // Consulta para obtener los datos de la propiedad
  const { data: propertyData, loading: propertyLoading } = useQuery(GET_PROPERTY_DETAILS, {
    variables: { propertyId },
    fetchPolicy: "cache-and-network",
  });

  // Obtener los datos de la propiedad
  const property = propertyData?.propiedad;
  const hasOwner = !!property?.propietario;
  const propertyIdentifier = property?.identificadores ? 
    `${property.identificadores.superior} ${property.identificadores.idSuperior} ${property.identificadores.inferior} ${property.identificadores.idInferior}` : 
    'la propiedad';

  // Form states para persona natural
  const [cedula, setCedula] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [aplicaRuc, setAplicaRuc] = useState(false);
  const [ruc, setRuc] = useState("");

  // Manejar cambio del RUC para persona natural
  const handleRucChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRuc(value);
    
    // Validar RUC después de un pequeño retraso para no hacer muchas consultas
    if (value.length >= 10) {
      const timeoutId = setTimeout(() => {
        validarRuc(value, 'natural');
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setRucError("");
    }
  };

  // Form states adicionales para persona jurídica
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [cedulaRepresentante, setCedulaRepresentante] = useState("");
  const [nombreRepresentante, setNombreRepresentante] = useState("");
  const [esEmpresaRepresentante, setEsEmpresaRepresentante] = useState(false);

  const [selectedPropietario, setSelectedPropietario] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Para persona jurídica - campos repetibles
  const [rucsPersonaJuridica, setRucsPersonaJuridica] = useState<RucDoc[]>([
    { ruc: "", rucPdf: null },
  ]);
  const [rucsEmpresaRepresentante, setRucsEmpresaRepresentante] = useState<
    RucDoc[]
  >([{ ruc: "", rucPdf: null }]);

  // Modificar los estados de contacto
  const [contactoAccesos, setContactoAccesos] = useState({
    nombreCompleto: "",
    telefono: "",
    email: "",
    cedula: "",
  });

  const [contactoAdministrativo, setContactoAdministrativo] = useState({
    telefono: "",
    email: "",
  });

  const [contactoGerente, setContactoGerente] = useState({
    telefono: "",
    email: "",
  });

  const [contactoProveedores, setContactoProveedores] = useState({
    telefono: "",
    email: "",
  });

  // Agregar estos estados adicionales para empresa representante legal
  const [empresaRepresentanteLegal, setEmpresaRepresentanteLegal] = useState({
    nombreComercial: "",
    direccionLegal: "",
    observaciones: "",
    nombreRepresentanteLegalRL: "",
    cedulaRepresentanteLegal: "",
  });

  // Definir interfaces para los documentos
  interface DocumentoSimple {
    documentId?: string;
    url: string;
    nombre: string;
  }

  interface RucDoc {
    ruc: string;
    rucPdf: DocumentoSimple | null;
  }

  // Agregar estados para los documentos
  const [documentos, setDocumentos] = useState({
    cedulaPdf: null as DocumentoSimple | null,
    rucPdf: null as DocumentoSimple | null,
    cedulaRepresentanteLegalPdf: null as DocumentoSimple | null,
    nombramientoRepresentanteLegalPdf: null as DocumentoSimple | null,
    autorizacionRepresentacionPdf: null as DocumentoSimple | null,
    cedulaRepresentanteLegalEmpresaPdf: null as DocumentoSimple | null,
  });

  const { data: searchResults, loading } = useQuery(SEARCH_PROPIETARIOS, {
    variables: { searchTerm, documentId: searchTerm },
    skip: searchTerm.length < 3,
  });

  const [asignarPropietario] = useMutation(ASIGNAR_PROPIETARIO);
  const [createPerfilCliente] = useMutation(CREATE_PERFIL_CLIENTE);

  // Agregar estado para el paso actual
  const [paso, setPaso] = useState(1);

  // Agregar estado para modal de error
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Inicializar arrays de errores para RUCs de empresa
  useEffect(() => {
    if (rucsPersonaJuridica.length > rucsJuridicaErrors.length) {
      setRucsJuridicaErrors(prev => [...prev, ...Array(rucsPersonaJuridica.length - prev.length).fill("")]);
    }
    
    if (rucsEmpresaRepresentante.length > rucsEmpresaRepresentanteErrors.length) {
      setRucsEmpresaRepresentanteErrors(prev => [...prev, ...Array(rucsEmpresaRepresentante.length - prev.length).fill("")]);
    }
  }, [rucsPersonaJuridica.length, rucsEmpresaRepresentante.length]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Verificar si hay errores de RUC antes de enviar
      const tieneErroresRuc = 
        (aplicaRuc && rucError) || 
        rucsJuridicaErrors.some(error => error) || 
        rucsEmpresaRepresentanteErrors.some(error => error);
      
      if (tieneErroresRuc) {
        setErrorMessage("Hay RUCs que ya están registrados para otros propietarios. Por favor, revise los mensajes de error y corrija la información antes de continuar.");
        setShowErrorModal(true);
        setIsLoading(false);
        return;
      }

      // Función auxiliar para limpiar objetos vacíos
      const cleanEmptyFields = (obj: any) => {
        const cleaned = Object.entries(obj).reduce((acc: any, [key, value]) => {
          if (value && value !== "") {
            acc[key] = value;
          }
          return acc;
        }, {});
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
      };

      // Limpiar los datos de contacto
      const contactos = {
        contactoAccesos: cleanEmptyFields(contactoAccesos),
        contactoAdministrativo: cleanEmptyFields(contactoAdministrativo),
        contactoGerente: cleanEmptyFields(contactoGerente),
        contactoProveedores: cleanEmptyFields(contactoProveedores),
      };

      // Preparar los datos según el tipo de persona
      const perfilClienteData = {
        rol: "Propietario",
        tipoPersona,
        ...(tipoPersona === "Natural"
          ? {
              datosPersonaNatural: {
                cedula,
                razonSocial: nombreCompleto,
                ...(aplicaRuc && { ruc }),
                ...(documentos.cedulaPdf?.documentId && {
                  cedulaPdf: documentos.cedulaPdf.documentId,
                }),
                ...(aplicaRuc &&
                  documentos.rucPdf?.documentId && {
                    rucPdf: documentos.rucPdf.documentId,
                  }),
              },
            }
          : {
              datosPersonaJuridica: {
                razonSocialRepresentanteLegal: nombreRepresentante,
                cedulaRepresentanteLegal: cedulaRepresentante,
                razonSocial,
                nombreComercial,
                rucPersonaJuridica: rucsPersonaJuridica.map((ruc) => ({
                  ruc: ruc.ruc,
                  ...(ruc.rucPdf?.documentId && {
                    rucPdf: ruc.rucPdf.documentId,
                  }),
                })),
                representanteLegalEsEmpresa: esEmpresaRepresentante,
                ...(documentos.cedulaRepresentanteLegalPdf?.documentId && {
                  cedulaRepresentanteLegalPdf:
                    documentos.cedulaRepresentanteLegalPdf.documentId,
                }),
                ...(documentos.nombramientoRepresentanteLegalPdf
                  ?.documentId && {
                  nombramientoRepresentanteLegalPdf:
                    documentos.nombramientoRepresentanteLegalPdf.documentId,
                }),
                ...(esEmpresaRepresentante && {
                  empresaRepresentanteLegal: {
                    ...empresaRepresentanteLegal,
                    rucEmpresaRepresentanteLegal: rucsEmpresaRepresentante.map(
                      (ruc) => ({
                        ruc: ruc.ruc,
                        ...(ruc.rucPdf?.documentId && {
                          rucPdf: ruc.rucPdf.documentId,
                        }),
                      })
                    ),
                    ...(documentos.autorizacionRepresentacionPdf
                      ?.documentId && {
                      autorizacionRepresentacionPdf:
                        documentos.autorizacionRepresentacionPdf.documentId,
                    }),
                    ...(documentos.cedulaRepresentanteLegalEmpresaPdf
                      ?.documentId && {
                      cedulaRepresentanteLegalPdf:
                        documentos.cedulaRepresentanteLegalEmpresaPdf
                          .documentId,
                    }),
                  },
                }),
              },
            }),
        // Solo incluir los contactos que tienen datos
        ...(contactos.contactoAccesos && {
          contactoAccesos: contactos.contactoAccesos,
        }),
        ...(contactos.contactoAdministrativo && {
          contactoAdministrativo: contactos.contactoAdministrativo,
        }),
        ...(contactos.contactoGerente && {
          contactoGerente: contactos.contactoGerente,
        }),
        ...(contactos.contactoProveedores && {
          contactoProveedores: contactos.contactoProveedores,
        }),
      };

      console.log(
        "Datos a enviar:",
        JSON.stringify(perfilClienteData, null, 2)
      );

      // Crear el perfil del cliente
      try {
        const { data: perfilClienteResponse } = await createPerfilCliente({
          variables: {
            data: perfilClienteData,
          },
        });
        console.log("Respuesta:", perfilClienteResponse);
        // Si se creó exitosamente, asignar a la propiedad
        if (perfilClienteResponse?.createPerfilCliente?.documentId) {
          await asignarPropietario({
            variables: {
              propiedadId: propertyId,
              propietarioId:
                perfilClienteResponse.createPerfilCliente.documentId,
            },
          });

          // Mostrar modal de éxito
          setShowSuccessModal(true);
        }
      } catch (error: any) {
        console.error("Error detallado:", {
          message: error.message,
          graphQLErrors: error.graphQLErrors,
          networkError: error.networkError,
          extraInfo: error.extraInfo,
        });
        throw error;
      }
    } catch (error: any) {
      console.error("Error completo:", error);
      let errorMessage = "Ocurrió un error al crear el propietario.";
      if (error.graphQLErrors) {
        errorMessage +=
          "\n" + error.graphQLErrors.map((e: any) => e.message).join("\n");
      }
      setErrorMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6 p-6"
    >
      {/* Header con botón de retroceso */}
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-500"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {propertyLoading ? 'Cargando...' : 
                hasOwner ? (
                  <span>
                    Reasignar propietario a <span className="text-[#008A4B] font-thin">{propertyIdentifier}</span>
                  </span>
                ) : (
                  <span>
                    Asignar propietario a <span className="text-[#008A4B] font-thin">{propertyIdentifier}</span>
                  </span>
                )}
            </h1>
            <p className="text-gray-500">
              Ingresa la información del propietario
            </p>
          </div>
        </div>
        <span className="text-sm text-gray-500">Paso {paso} de 2</span>
      </div>

      {!showCreateForm ? (
        <div className="bg-white rounded-xl border p-6 space-y-6">
          {/* Mensaje informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Consejo:</strong> Si está corrigiendo propietarios
              duplicados, puede buscar por el ID del propietario para
              identificar con precisión al propietario correcto.
            </p>
          </div>

          {/* Buscador */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula, RUC o ID del propietario..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Resultados de búsqueda */}
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#008A4B] mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">
                Buscando propietarios...
              </p>
            </div>
          ) : searchResults?.perfilesCliente?.length > 0 ? (
            <div className="space-y-4">
              {searchResults.perfilesCliente.map((perfil: any) => (
                <button
                  key={perfil.documentId}
                  className={`w-full text-left p-4 border rounded-lg transition-colors ${
                    selectedPropietario?.documentId === perfil.documentId
                      ? "border-[#008A4B] bg-[#008A4B]/5"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedPropietario(perfil)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {perfil.tipoPersona === "Natural"
                          ? perfil.datosPersonaNatural.razonSocial
                          : perfil.datosPersonaJuridica.razonSocial}
                      </p>
                      <p className="text-sm text-gray-500">
                        {perfil.tipoPersona === "Natural"
                          ? `Cédula: ${perfil.datosPersonaNatural.cedula}`
                          : `RUC: ${perfil.datosPersonaJuridica.rucPersonaJuridica[0]?.ruc}`}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {perfil.tipoPersona}
                    </span>
                  </div>
                </button>
              ))}

              {/* Botón de asignar */}
              {selectedPropietario && (
                <div className="pt-4 border-t">
                  <Button
                    className="w-full bg-[#008A4B] text-white hover:bg-[#006837]"
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        await asignarPropietario({
                          variables: {
                            propiedadId: propertyId,
                            propietarioId: selectedPropietario.documentId,
                          },
                        });
                        setShowSuccessModal(true);
                      } catch (error) {
                        console.error("Error al asignar propietario:", error);
                        setErrorMessage(
                          "Error al asignar propietario. Por favor intente nuevamente."
                        );
                        setShowErrorModal(true);
                      }
                      setIsLoading(false);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        <span>Asignando...</span>
                      </div>
                    ) : (
                      "Asignar Propietario Seleccionado"
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            searchTerm.length >= 3 && (
              <div className="text-center py-4 text-gray-500">
                No se encontraron propietarios
              </div>
            )
          )}

          {/* Botón para crear nuevo */}
          <div className="flex flex-col items-center pt-4 border-t">
            <p className="text-sm text-gray-500 mb-4">
              ¿No lo has creado? Crea un nuevo propietario
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-[#008A4B] text-white hover:bg-[#006837]"
            >
              <PlusCircleIcon className="w-5 h-5" />
              Crear nuevo propietario
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pasos */}
          <div className="flex gap-2 mb-6">
            <div
              className={`flex-1 h-2 rounded-full ${
                paso >= 1 ? "bg-[#008A4B]" : "bg-gray-200"
              }`}
            />
            <div
              className={`flex-1 h-2 rounded-full ${
                paso >= 2 ? "bg-[#008A4B]" : "bg-gray-200"
              }`}
            />
          </div>

          {/* Contenido del formulario */}
          {paso === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Persona
                </label>
                <div className="flex gap-4">
                  <button
                    className={`px-4 py-2 rounded-lg ${
                      tipoPersona === "Natural"
                        ? "bg-[#008A4B] text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => setTipoPersona("Natural")}
                  >
                    Persona Natural
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg ${
                      tipoPersona === "Juridica"
                        ? "bg-[#008A4B] text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => setTipoPersona("Juridica")}
                  >
                    Persona Jurídica
                  </button>
                </div>
              </div>

              {/* Campos básicos según tipo de persona */}
              {tipoPersona === "Natural" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cédula
                    </label>
                    <input
                      type="text"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  {/* Checkbox para RUC */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aplicaRuc}
                      onChange={(e) => setAplicaRuc(e.target.checked)}
                      id="aplicaRuc"
                    />
                    <label
                      htmlFor="aplicaRuc"
                      className="text-sm text-gray-700"
                    >
                      ¿Tiene RUC?
                    </label>
                  </div>
                  {/* Campo de RUC condicional */}
                  {aplicaRuc && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        RUC
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={ruc}
                          onChange={handleRucChange}
                          className={`mt-1 w-full px-3 py-2 border rounded-lg ${
                            rucError ? "border-red-500 pr-10" : ""
                          }`}
                        />
                        {isValidatingRuc && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#008A4B] border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                      {rucError && (
                        <p className="mt-1 text-sm text-red-600">{rucError}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Razón Social
                    </label>
                    <input
                      type="text"
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      value={nombreComercial}
                      onChange={(e) => setNombreComercial(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  {/* Mover la sección de RUCs aquí */}
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">
                      RUCs de la Empresa
                    </h3>
                    {rucsPersonaJuridica.map((rucItem, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="flex-1">
                          <div className="relative">
                            <input
                              type="text"
                              value={rucItem.ruc}
                              onChange={(e) => {
                                const value = e.target.value;
                                const newRucs = [...rucsPersonaJuridica];
                                newRucs[index].ruc = value;
                                setRucsPersonaJuridica(newRucs);
                                
                                // Validar después de un breve retraso
                                if (value.length >= 10) {
                                  const timeoutId = setTimeout(() => {
                                    validarRuc(value, 'juridica', index);
                                  }, 500);
                                  return () => clearTimeout(timeoutId);
                                } else {
                                  const newErrors = [...rucsJuridicaErrors];
                                  newErrors[index] = "";
                                  setRucsJuridicaErrors(newErrors);
                                }
                              }}
                              placeholder="Número de RUC"
                              className={`w-full px-3 py-2 border rounded-lg ${
                                rucsJuridicaErrors[index] ? "border-red-500 pr-10" : ""
                              }`}
                            />
                            {isValidatingRuc && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#008A4B] border-t-transparent"></div>
                              </div>
                            )}
                          </div>
                          {rucsJuridicaErrors[index] && (
                            <p className="mt-1 text-sm text-red-600">{rucsJuridicaErrors[index]}</p>
                          )}
                        </div>
                        <SimpleDocumentUpload
                          onUploadComplete={(documentId, url, name) => {
                            const newRucs = [...rucsPersonaJuridica];
                            newRucs[index].rucPdf = {
                              documentId,
                              url,
                              nombre: name,
                            };
                            setRucsPersonaJuridica(newRucs);
                          }}
                          currentDocument={rucItem.rucPdf || undefined}
                          label="RUC"
                          onDelete={() => {
                            const newRucs = [...rucsPersonaJuridica];
                            newRucs[index].rucPdf = null;
                            setRucsPersonaJuridica(newRucs);
                          }}
                        />
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setRucsPersonaJuridica((rucs) =>
                                rucs.filter((_, i) => i !== index)
                              );
                              // También eliminar el error correspondiente
                              setRucsJuridicaErrors(prev => prev.filter((_, i) => i !== index));
                            }}
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setRucsPersonaJuridica((rucs) => [
                          ...rucs,
                          { ruc: "", rucPdf: null },
                        ])
                      }
                      className="mt-2"
                    >
                      + Agregar otro RUC
                    </Button>
                  </div>

                  {/* Sección de Representante Legal */}
                  <div className="space-y-4">
                    <h4 className="text-base font-medium">
                      Representante Legal
                    </h4>

                    {/* Razón Social del Representante Legal (siempre visible) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Razón Social del Representante Legal
                      </label>
                      <input
                        type="text"
                        value={nombreRepresentante}
                        onChange={(e) => setNombreRepresentante(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    {/* Checkbox empresa representante */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={esEmpresaRepresentante}
                        onChange={(e) =>
                          setEsEmpresaRepresentante(e.target.checked)
                        }
                        id="esEmpresaRepresentante"
                      />
                      <label
                        htmlFor="esEmpresaRepresentante"
                        className="text-sm text-gray-700"
                      >
                        ¿El representante legal es una empresa?
                      </label>
                    </div>

                    {/* Campos según tipo de representante */}
                    {esEmpresaRepresentante ? (
                      // Si es empresa representante
                      <div className="border rounded-lg p-4 mt-4">
                        <h3 className="text-lg font-medium mb-4">
                          Datos de la Empresa Representante Legal
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Nombre Comercial
                            </label>
                            <input
                              type="text"
                              value={empresaRepresentanteLegal.nombreComercial}
                              onChange={(e) =>
                                setEmpresaRepresentanteLegal({
                                  ...empresaRepresentanteLegal,
                                  nombreComercial: e.target.value,
                                })
                              }
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Dirección Legal
                            </label>
                            <input
                              type="text"
                              value={empresaRepresentanteLegal.direccionLegal}
                              onChange={(e) =>
                                setEmpresaRepresentanteLegal({
                                  ...empresaRepresentanteLegal,
                                  direccionLegal: e.target.value,
                                })
                              }
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Nombre del Representante Legal Empresa RL
                            </label>
                            <input
                              type="text"
                              value={
                                empresaRepresentanteLegal.nombreRepresentanteLegalRL
                              }
                              onChange={(e) =>
                                setEmpresaRepresentanteLegal({
                                  ...empresaRepresentanteLegal,
                                  nombreRepresentanteLegalRL: e.target.value,
                                })
                              }
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Cédula del Representante Legal Empresa RL
                            </label>
                            <input
                              type="text"
                              value={
                                empresaRepresentanteLegal.cedulaRepresentanteLegal
                              }
                              onChange={(e) =>
                                setEmpresaRepresentanteLegal({
                                  ...empresaRepresentanteLegal,
                                  cedulaRepresentanteLegal: e.target.value,
                                })
                              }
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Observaciones
                            </label>
                            <textarea
                              value={empresaRepresentanteLegal.observaciones}
                              onChange={(e) =>
                                setEmpresaRepresentanteLegal({
                                  ...empresaRepresentanteLegal,
                                  observaciones: e.target.value,
                                })
                              }
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                              rows={3}
                            />
                          </div>

                          {/* RUCs de la Empresa Representante */}
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">
                              RUCs de la Empresa Representante
                            </h4>
                            {rucsEmpresaRepresentante.map((rucItem, index) => (
                              <div
                                key={index}
                                className="flex gap-4 items-start"
                              >
                                <div className="flex-1">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={rucItem.ruc}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const newRucs = [
                                          ...rucsEmpresaRepresentante,
                                        ];
                                        newRucs[index].ruc = value;
                                        setRucsEmpresaRepresentante(newRucs);
                                        
                                        // Validar RUC
                                        if (value.length >= 10) {
                                          const timeoutId = setTimeout(() => {
                                            validarRuc(value, 'representante', index);
                                          }, 500);
                                          return () => clearTimeout(timeoutId);
                                        } else {
                                          const newErrors = [...rucsEmpresaRepresentanteErrors];
                                          newErrors[index] = "";
                                          setRucsEmpresaRepresentanteErrors(newErrors);
                                        }
                                      }}
                                      placeholder="Número de RUC"
                                      className={`w-full px-3 py-2 border rounded-lg ${
                                        rucsEmpresaRepresentanteErrors[index] ? "border-red-500 pr-10" : ""
                                      }`}
                                    />
                                    {isValidatingRuc && (
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#008A4B] border-t-transparent"></div>
                                      </div>
                                    )}
                                  </div>
                                  {rucsEmpresaRepresentanteErrors[index] && (
                                    <p className="mt-1 text-sm text-red-600">{rucsEmpresaRepresentanteErrors[index]}</p>
                                  )}
                                </div>
                                <SimpleDocumentUpload
                                  onUploadComplete={(documentId, url, name) => {
                                    const newRucs = [
                                      ...rucsEmpresaRepresentante,
                                    ];
                                    newRucs[index].rucPdf = {
                                      documentId,
                                      url,
                                      nombre: name,
                                    };
                                    setRucsEmpresaRepresentante(newRucs);
                                  }}
                                  currentDocument={rucItem.rucPdf || undefined}
                                  label="RUC"
                                  onDelete={() => {
                                    const newRucs = [
                                      ...rucsEmpresaRepresentante,
                                    ];
                                    newRucs[index].rucPdf = null;
                                    setRucsEmpresaRepresentante(newRucs);
                                  }}
                                />
                                {index > 0 && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      setRucsEmpresaRepresentante((rucs) =>
                                        rucs.filter((_, i) => i !== index)
                                      );
                                      // También eliminar el error correspondiente
                                      setRucsEmpresaRepresentanteErrors(prev => 
                                        prev.filter((_, i) => i !== index)
                                      );
                                    }}
                                  >
                                    <XMarkIcon className="w-5 h-5" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setRucsEmpresaRepresentante((rucs) => [
                                  ...rucs,
                                  { ruc: "", rucPdf: null },
                                ])
                              }
                              className="mt-2"
                            >
                              + Agregar otro RUC
                            </Button>
                          </div>

                          {/* Documentos de la Empresa Representante */}
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">
                              Documentos Requeridos
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <SimpleDocumentUpload
                                onUploadComplete={(documentId, url, name) => {
                                  setDocumentos({
                                    ...documentos,
                                    autorizacionRepresentacionPdf: {
                                      documentId,
                                      url,
                                      nombre: name,
                                    },
                                  });
                                }}
                                currentDocument={
                                  documentos.autorizacionRepresentacionPdf ||
                                  undefined
                                }
                                label="autorización de representación"
                                onDelete={() => {
                                  setDocumentos({
                                    ...documentos,
                                    autorizacionRepresentacionPdf: null,
                                  });
                                }}
                              />
                              <SimpleDocumentUpload
                                onUploadComplete={(documentId, url, name) => {
                                  setDocumentos({
                                    ...documentos,
                                    cedulaRepresentanteLegalEmpresaPdf: {
                                      documentId,
                                      url,
                                      nombre: name,
                                    },
                                  });
                                }}
                                currentDocument={
                                  documentos.cedulaRepresentanteLegalEmpresaPdf ||
                                  undefined
                                }
                                label="cédula del representante legal RL"
                                onDelete={() => {
                                  setDocumentos({
                                    ...documentos,
                                    cedulaRepresentanteLegalEmpresaPdf: null,
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Si es persona natural como representante
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Cédula del Representante Legal
                          </label>
                          <input
                            type="text"
                            value={cedulaRepresentante}
                            onChange={(e) =>
                              setCedulaRepresentante(e.target.value)
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-lg"
                          />
                        </div>

                        {/* Documentos del Representante Legal */}
                        <div className="space-y-4">
                          <h4 className="text-base font-medium">
                            Documentos del Representante Legal
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <SimpleDocumentUpload
                              onUploadComplete={(documentId, url, name) => {
                                setDocumentos({
                                  ...documentos,
                                  cedulaRepresentanteLegalPdf: {
                                    documentId,
                                    url,
                                    nombre: name,
                                  },
                                });
                              }}
                              currentDocument={
                                documentos.cedulaRepresentanteLegalPdf ||
                                undefined
                              }
                              label="cédula del representante legal"
                              onDelete={() => {
                                setDocumentos({
                                  ...documentos,
                                  cedulaRepresentanteLegalPdf: null,
                                });
                              }}
                            />
                            <SimpleDocumentUpload
                              onUploadComplete={(documentId, url, name) => {
                                setDocumentos({
                                  ...documentos,
                                  nombramientoRepresentanteLegalPdf: {
                                    documentId,
                                    url,
                                    nombre: name,
                                  },
                                });
                              }}
                              currentDocument={
                                documentos.nombramientoRepresentanteLegalPdf ||
                                undefined
                              }
                              label="nombramiento del representante legal"
                              onDelete={() => {
                                setDocumentos({
                                  ...documentos,
                                  nombramientoRepresentanteLegalPdf: null,
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Formulario de Contactos */}
              <div className="space-y-6">
                {["Accesos", "Administrativo", "Gerente", "Proveedores"].map(
                  (tipo) => (
                    <div key={tipo} className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-4">
                        Contacto {tipo}
                      </h3>
                      <div className="space-y-4">
                        {tipo === "Accesos" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Nombre Completo
                            </label>
                            <input
                              type="text"
                              value={contactoAccesos.nombreCompleto}
                              onChange={(e) =>
                                setContactoAccesos({
                                  ...contactoAccesos,
                                  nombreCompleto: e.target.value,
                                })
                              }
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            value={eval(`contacto${tipo}`).telefono}
                            onChange={(e) =>
                              eval(`setContacto${tipo}`)({
                                ...eval(`contacto${tipo}`),
                                telefono: e.target.value,
                              })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Correo Electrónico
                          </label>
                          <input
                            type="email"
                            value={eval(`contacto${tipo}`).email}
                            onChange={(e) =>
                              eval(`setContacto${tipo}`)({
                                ...eval(`contacto${tipo}`),
                                email: e.target.value,
                              })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        {tipo === "Accesos" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Cédula
                            </label>
                            <input
                              type="text"
                              value={contactoAccesos.cedula}
                              onChange={(e) =>
                                setContactoAccesos({
                                  ...contactoAccesos,
                                  cedula: e.target.value,
                                })
                              }
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botones de navegación */}
      <div className="flex justify-between pt-6 border-t">
        {showCreateForm && (
          <>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setPaso(1); // Reset del paso al volver a búsqueda
                }}
                className="text-gray-500 flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Volver a búsqueda
              </Button>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="border-gray-300"
              >
                Cancelar
              </Button>
              {paso > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setPaso((p) => p - 1)}
                  className="border-gray-300"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Anterior
                </Button>
              )}
              {paso < 2 ? (
                <Button
                  className="bg-[#008A4B] text-white hover:bg-[#006837]"
                  onClick={() => setPaso(2)}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  className="bg-[#008A4B] text-white hover:bg-[#006837]"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Creando...</span>
                    </div>
                  ) : (
                    "Crear y Asignar"
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <StatusModal
          open={showSuccessModal}
          type="success"
          title="¡Propietario asignado exitosamente!"
          message="El propietario ha sido vinculado correctamente a la propiedad."
          onOpenChange={(open) => setShowSuccessModal(open)}
          onClose={() => setShowSuccessModal(false)}
          actionLabel="Volver a la Propiedad"
          onAction={() => {
            router.push(
              `/dashboard/proyectos/${projectId}/propiedades/${propertyId}`
            );
          }}
        />
      )}

      {showErrorModal && (
        <StatusModal
          open={showErrorModal}
          type="error"
          title="Error al crear el propietario"
          message={errorMessage}
          onOpenChange={(open) => setShowErrorModal(open)}
          onClose={() => setShowErrorModal(false)}
          actionLabel="Intentar nuevamente"
          onAction={() => {
            setShowErrorModal(false);
            handleSubmit();
          }}
        />
      )}
    </motion.div>
  );
}
