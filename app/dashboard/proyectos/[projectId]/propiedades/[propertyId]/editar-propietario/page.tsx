"use client";

import { useState, use, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../../../../../../_components/ui/button";
import {
  ArrowLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { gql, useQuery, useMutation } from "@apollo/client";
import { SimpleDocumentUpload } from "@/_components/SimpleDocumentUpload";
import { StatusModal } from "@/_components/StatusModal";
import { useAuth } from "../../../../../../_lib/auth/AuthContext";

// Query para obtener los datos de la propiedad y el propietario
const GET_PROPERTY = gql`
  query GetProperty($documentId: ID!) {
    propiedad(documentId: $documentId) {
      documentId
      propietario {
        documentId
        tipoPersona
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
        datosPersonaNatural {
          cedula
          cedulaPdf {
            documentId
            url
            fechaSubida
            nombre
          }
          aplicaRuc
          ruc
          rucPdf {
            documentId
            url
            fechaSubida
            nombre
          }
          razonSocial
        }
        datosPersonaJuridica {
          razonSocial
          nombreComercial
          razonSocialRepresentanteLegal
          cedulaRepresentanteLegal
          representanteLegalEsEmpresa
          cedulaRepresentanteLegalPdf {
            documentId
            url
            fechaSubida
            nombre
          }
          nombramientoRepresentanteLegalPdf {
            documentId
            url
            fechaSubida
            nombre
          }
          rucPersonaJuridica {
            ruc
            rucPdf {
              documentId
              url
              fechaSubida
              nombre
            }
          }
          empresaRepresentanteLegal {
            nombreComercial
            nombreRepresentanteLegalRL
            cedulaRepresentanteLegal
            direccionLegal
            observaciones
            autorizacionRepresentacionPdf {
              documentId
              url
              fechaSubida
              nombre
            }
            cedulaRepresentanteLegalPdf {
              documentId
              url
              fechaSubida
              nombre
            }
            rucEmpresaRepresentanteLegal {
              ruc
              rucPdf {
                documentId
                url
                fechaSubida
                nombre
              }
            }
          }
        }
      }
    }
  }
`;

// Mutación para actualizar el perfil del cliente
const UPDATE_PERFIL_CLIENTE = gql`
  mutation UpdatePerfilCliente(
    $documentId: ID!
    $data: PerfilClienteInput!
  ) {
    updatePerfilCliente(
      documentId: $documentId
      data: $data
    ) {
      documentId
      tipoPersona
    }
  }
`;

interface PageProps {
  params: Promise<{ projectId: string; propertyId: string }>;
}

export default function EditarPropietarioPage({ params }: PageProps) {
  const { projectId, propertyId } = use(params);
  const router = useRouter();
  const { role } = useAuth();
  const [paso, setPaso] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Estados para el formulario
  const [tipoPersona, setTipoPersona] = useState<"Natural" | "Juridica">("Natural");

  // Estados para persona natural
  const [cedula, setCedula] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [aplicaRuc, setAplicaRuc] = useState(false);
  const [ruc, setRuc] = useState("");

  // Estados para persona jurídica
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [nombreRepresentante, setNombreRepresentante] = useState("");
  const [cedulaRepresentante, setCedulaRepresentante] = useState("");
  const [esEmpresaRepresentante, setEsEmpresaRepresentante] = useState(false);

  // Estados para documentos
  const [documentos, setDocumentos] = useState({
    cedulaPdf: null as any,
    rucPdf: null as any,
    cedulaRepresentanteLegalPdf: null as any,
    nombramientoRepresentanteLegalPdf: null as any,
    autorizacionRepresentacionPdf: null as any,
    cedulaRepresentanteLegalEmpresaPdf: null as any,
  });

  // Estados para RUCs
  const [rucsPersonaJuridica, setRucsPersonaJuridica] = useState<any[]>([
    { ruc: '', rucPdf: null }
  ]);
  const [rucsEmpresaRepresentante, setRucsEmpresaRepresentante] = useState<any[]>([
    { ruc: '', rucPdf: null }
  ]);

  // Estados para empresa representante legal
  const [empresaRepresentanteLegal, setEmpresaRepresentanteLegal] = useState({
    nombreComercial: '',
    direccionLegal: '',
    observaciones: '',
    nombreRepresentanteLegalRL: '',
    cedulaRepresentanteLegal: '',
  });

  // Estados para contactos
  const [contactoAccesos, setContactoAccesos] = useState({
    nombreCompleto: '',
    telefono: '',
    email: '',
    cedula: ''
  });

  const [contactoAdministrativo, setContactoAdministrativo] = useState({
    telefono: '',
    email: ''
  });

  const [contactoGerente, setContactoGerente] = useState({
    telefono: '',
    email: ''
  });

  const [contactoProveedores, setContactoProveedores] = useState({
    telefono: '',
    email: ''
  });

  // Consulta para obtener los datos de la propiedad
  const { data: propertyData, loading: propertyLoading } = useQuery(GET_PROPERTY, {
    variables: { documentId: propertyId },
    onCompleted: (data) => {
      const propietario = data.propiedad.propietario;
      if (propietario) {
        // Establecer tipo de persona
        setTipoPersona(propietario.tipoPersona);

        // Cargar datos de contacto
        if (propietario.contactoAccesos) {
          setContactoAccesos(propietario.contactoAccesos);
        }
        if (propietario.contactoAdministrativo) {
          setContactoAdministrativo(propietario.contactoAdministrativo);
        }
        if (propietario.contactoGerente) {
          setContactoGerente(propietario.contactoGerente);
        }
        if (propietario.contactoProveedores) {
          setContactoProveedores(propietario.contactoProveedores);
        }

        // Cargar datos según tipo de persona
        if (propietario.tipoPersona === "Natural") {
          const datosNatural = propietario.datosPersonaNatural;
          if (datosNatural) {
            setCedula(datosNatural.cedula || "");
            setNombreCompleto(datosNatural.razonSocial || "");
            setAplicaRuc(datosNatural.aplicaRuc || false);
            setRuc(datosNatural.ruc || "");
            
            // Cargar documentos
            setDocumentos(prev => ({
              ...prev,
              cedulaPdf: datosNatural.cedulaPdf || null,
              rucPdf: datosNatural.rucPdf || null
            }));
          }
        } else {
          const datosJuridica = propietario.datosPersonaJuridica;
          if (datosJuridica) {
            setRazonSocial(datosJuridica.razonSocial || "");
            setNombreComercial(datosJuridica.nombreComercial || "");
            setNombreRepresentante(datosJuridica.razonSocialRepresentanteLegal || "");
            setCedulaRepresentante(datosJuridica.cedulaRepresentanteLegal || "");
            setEsEmpresaRepresentante(datosJuridica.representanteLegalEsEmpresa || false);

            // Cargar RUCs
            if (datosJuridica.rucPersonaJuridica && datosJuridica.rucPersonaJuridica.length > 0) {
              setRucsPersonaJuridica(datosJuridica.rucPersonaJuridica);
            }

            // Cargar documentos
            setDocumentos(prev => ({
              ...prev,
              cedulaRepresentanteLegalPdf: datosJuridica.cedulaRepresentanteLegalPdf || null,
              nombramientoRepresentanteLegalPdf: datosJuridica.nombramientoRepresentanteLegalPdf || null
            }));

            // Cargar datos de empresa representante si aplica
            if (datosJuridica.representanteLegalEsEmpresa && datosJuridica.empresaRepresentanteLegal) {
              const empresaRL = datosJuridica.empresaRepresentanteLegal;
              setEmpresaRepresentanteLegal({
                nombreComercial: empresaRL.nombreComercial || "",
                direccionLegal: empresaRL.direccionLegal || "",
                observaciones: empresaRL.observaciones || "",
                nombreRepresentanteLegalRL: empresaRL.nombreRepresentanteLegalRL || "",
                cedulaRepresentanteLegal: empresaRL.cedulaRepresentanteLegal || ""
              });

              // Cargar RUCs de la empresa representante
              if (empresaRL.rucEmpresaRepresentanteLegal && empresaRL.rucEmpresaRepresentanteLegal.length > 0) {
                setRucsEmpresaRepresentante(empresaRL.rucEmpresaRepresentanteLegal);
              }

              // Cargar documentos de la empresa representante
              setDocumentos(prev => ({
                ...prev,
                autorizacionRepresentacionPdf: empresaRL.autorizacionRepresentacionPdf || null,
                cedulaRepresentanteLegalEmpresaPdf: empresaRL.cedulaRepresentanteLegalPdf || null
              }));
            }
          }
        }
      }
    }
  });

  // Mutación para actualizar el perfil
  const [updatePerfilCliente] = useMutation(UPDATE_PERFIL_CLIENTE);

  // Redirección para usuarios sin permiso
  useEffect(() => {
    // Jefe Operativo no puede editar propietarios
    if (role === "Jefe Operativo") {
      router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
    }
  }, [role, router, projectId, propertyId]);
  
  // Si el usuario es Jefe Operativo, no renderizar el contenido
  if (role === "Jefe Operativo") {
    return null;
  }

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Función auxiliar para limpiar objetos vacíos y campos __typename
      const cleanEmptyFields = (obj: any) => {
        if (!obj) return undefined;
        const cleaned = Object.entries(obj).reduce((acc: any, [key, value]) => {
          if (value && value !== '' && key !== '__typename') {
            acc[key] = value;
          }
          return acc;
        }, {});
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
      };

      // Limpiar los datos de contacto
      const contactos = {
        contactoAccesos: cleanEmptyFields({
          nombreCompleto: contactoAccesos.nombreCompleto,
          email: contactoAccesos.email,
          telefono: contactoAccesos.telefono,
          cedula: contactoAccesos.cedula
        }),
        contactoAdministrativo: cleanEmptyFields({
          email: contactoAdministrativo.email,
          telefono: contactoAdministrativo.telefono
        }),
        contactoGerente: cleanEmptyFields({
          email: contactoGerente.email,
          telefono: contactoGerente.telefono
        }),
        contactoProveedores: cleanEmptyFields({
          email: contactoProveedores.email,
          telefono: contactoProveedores.telefono
        })
      };

      // Preparar los datos según el tipo de persona
      const perfilClienteData = {
        rol: "Propietario",
        tipoPersona,
        ...(tipoPersona === "Natural" ? {
          datosPersonaNatural: {
            cedula,
            razonSocial: nombreCompleto,
            ...(aplicaRuc && { ruc }),
            ...(documentos.cedulaPdf?.documentId && { cedulaPdf: documentos.cedulaPdf.documentId }),
            ...(aplicaRuc && documentos.rucPdf?.documentId && { rucPdf: documentos.rucPdf.documentId })
          }
        } : {
          datosPersonaJuridica: {
            razonSocial,
            nombreComercial,
            rucPersonaJuridica: rucsPersonaJuridica.map(ruc => ({
              ruc: ruc.ruc,
              ...(ruc.rucPdf?.documentId && { rucPdf: ruc.rucPdf.documentId })
            })),
            razonSocialRepresentanteLegal: nombreRepresentante,
            cedulaRepresentanteLegal: cedulaRepresentante,
            nombramientoRepresentanteLegalPdf: documentos.nombramientoRepresentanteLegalPdf?.documentId,
            cedulaRepresentanteLegalPdf: documentos.cedulaRepresentanteLegalPdf?.documentId,
            representanteLegalEsEmpresa: esEmpresaRepresentante,
            ...(documentos.cedulaRepresentanteLegalPdf?.documentId && {
              cedulaRepresentanteLegalPdf: documentos.cedulaRepresentanteLegalPdf.documentId
            }),
            ...(documentos.nombramientoRepresentanteLegalPdf?.documentId && {
              nombramientoRepresentanteLegalPdf: documentos.nombramientoRepresentanteLegalPdf.documentId
            }),
            ...(esEmpresaRepresentante && {
              empresaRepresentanteLegal: {
                ...empresaRepresentanteLegal,
                rucEmpresaRepresentanteLegal: rucsEmpresaRepresentante.map(ruc => ({
                  ruc: ruc.ruc,
                  ...(ruc.rucPdf?.documentId && { rucPdf: ruc.rucPdf.documentId })
                })),
                ...(documentos.autorizacionRepresentacionPdf?.documentId && {
                  autorizacionRepresentacionPdf: documentos.autorizacionRepresentacionPdf.documentId
                }),
                ...(documentos.cedulaRepresentanteLegalEmpresaPdf?.documentId && {
                  cedulaRepresentanteLegalPdf: documentos.cedulaRepresentanteLegalEmpresaPdf.documentId
                })
              }
            })
          }
        }),
        // Solo incluir los contactos que tienen datos
        ...(contactos.contactoAccesos && { contactoAccesos: contactos.contactoAccesos }),
        ...(contactos.contactoAdministrativo && { contactoAdministrativo: contactos.contactoAdministrativo }),
        ...(contactos.contactoGerente && { contactoGerente: contactos.contactoGerente }),
        ...(contactos.contactoProveedores && { contactoProveedores: contactos.contactoProveedores })
      };

      console.log('Datos a enviar:', JSON.stringify(perfilClienteData, null, 2));

      // Actualizar el perfil del cliente
      try {
        const { data: updateResponse } = await updatePerfilCliente({
          variables: {
            documentId: propertyData.propiedad.propietario.documentId,
            data: perfilClienteData
          }
        });
        console.log('Respuesta:', updateResponse);
        
        // Mostrar modal de éxito
        setShowSuccessModal(true);
      } catch (error: any) {
        console.error('Error detallado:', {
          message: error.message,
          graphQLErrors: error.graphQLErrors,
          networkError: error.networkError,
          extraInfo: error.extraInfo
        });
        throw error;
      }
    } catch (error: any) {
      console.error('Error completo:', error);
      let errorMessage = 'Ocurrió un error al actualizar el propietario.';
      if (error.graphQLErrors) {
        errorMessage += '\n' + error.graphQLErrors.map((e: any) => e.message).join('\n');
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
            <h1 className="text-2xl font-semibold">Editar Propietario</h1>
            <p className="text-gray-500">
              Modifica la información del propietario
            </p>
          </div>
        </div>
        <span className="text-sm text-gray-500">Paso {paso} de 2</span>
      </div>

      {/* Contenido del formulario */}
      {propertyLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#008A4B] mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Cargando datos del propietario...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pasos */}
          <div className="flex gap-2 mb-6">
            <div className={`flex-1 h-2 rounded-full ${paso >= 1 ? 'bg-[#008A4B]' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${paso >= 2 ? 'bg-[#008A4B]' : 'bg-gray-200'}`} />
          </div>

          {/* Contenido según el paso */}
          {paso === 1 ? (
            <div className="space-y-6">
              {/* Tipo de Persona */}
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

              {/* Campos según tipo de persona */}
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

                  {/* Documentos persona natural */}
                  <div className="space-y-4">
                    <h4 className="text-base font-medium">Documentos Requeridos</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <SimpleDocumentUpload
                        onUploadComplete={(documentId, url, name) => {
                          setDocumentos({
                            ...documentos,
                            cedulaPdf: { documentId, url, nombre: name }
                          });
                        }}
                        currentDocument={documentos.cedulaPdf || undefined}
                        
                        label="cédula"
                        onDelete={() => {
                          setDocumentos({ ...documentos, cedulaPdf: null });
                        }}
                      />
                    </div>
                  </div>

                  {/* Checkbox para RUC */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aplicaRuc}
                      onChange={(e) => setAplicaRuc(e.target.checked)}
                      id="aplicaRuc"
                    />
                    <label htmlFor="aplicaRuc" className="text-sm text-gray-700">
                      ¿Tiene RUC?
                    </label>
                  </div>

                  {/* Campo de RUC condicional */}
                  {aplicaRuc && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          RUC
                        </label>
                        <input
                          type="text"
                          value={ruc}
                          onChange={(e) => setRuc(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <SimpleDocumentUpload
                        onUploadComplete={(documentId, url, name) => {
                          setDocumentos({
                            ...documentos,
                            rucPdf: { documentId, url, nombre: name }
                          });
                        }}
                        currentDocument={documentos.rucPdf || undefined}
                        label="RUC"
                        onDelete={() => {
                          setDocumentos({ ...documentos, rucPdf: null });
                        }}
                      />
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

                  {/* RUCs de la empresa */}
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">RUCs de la Empresa</h3>
                    {rucsPersonaJuridica.map((rucItem, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={rucItem.ruc}
                            onChange={(e) => {
                              const newRucs = [...rucsPersonaJuridica];
                              newRucs[index].ruc = e.target.value;
                              setRucsPersonaJuridica(newRucs);
                            }}
                            placeholder="Número de RUC"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <SimpleDocumentUpload
                          onUploadComplete={(documentId, url, name) => {
                            const newRucs = [...rucsPersonaJuridica];
                            newRucs[index].rucPdf = { 
                              documentId,
                              url, 
                              nombre: name 
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
                              setRucsPersonaJuridica(rucs => rucs.filter((_, i) => i !== index));
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
                      onClick={() => setRucsPersonaJuridica(rucs => [...rucs, { ruc: '', rucPdf: null }])}
                      className="mt-2"
                    >
                      + Agregar otro RUC
                    </Button>
                  </div>

                  {/* Sección de Representante Legal */}
                  <div className="space-y-4">
                    <h4 className="text-base font-medium">Representante Legal</h4>
                    
                    {/* Nombre del Representante Legal (siempre visible) */}
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
                        onChange={(e) => setEsEmpresaRepresentante(e.target.checked)}
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
                        <h3 className="text-lg font-medium mb-4">Datos de la Empresa Representante Legal</h3>
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
                              Cédula del Representante Legal Empresa RL
                            </label>
                            <input
                              type="text"
                              value={empresaRepresentanteLegal.cedulaRepresentanteLegal}
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
                            <h4 className="text-base font-medium">RUCs de la Empresa Representante</h4>
                            {rucsEmpresaRepresentante.map((rucItem, index) => (
                              <div key={index} className="flex gap-4 items-start">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={rucItem.ruc}
                                    onChange={(e) => {
                                      const newRucs = [...rucsEmpresaRepresentante];
                                      newRucs[index].ruc = e.target.value;
                                      setRucsEmpresaRepresentante(newRucs);
                                    }}
                                    placeholder="Número de RUC"
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <SimpleDocumentUpload
                                  onUploadComplete={(documentId, url, name) => {
                                    const newRucs = [...rucsEmpresaRepresentante];
                                    newRucs[index].rucPdf = { 
                                      documentId,
                                      url, 
                                      nombre: name 
                                    };
                                    setRucsEmpresaRepresentante(newRucs);
                                  }}
                                  currentDocument={rucItem.rucPdf || undefined}
                                  label="RUC"
                                  onDelete={() => {
                                    const newRucs = [...rucsEmpresaRepresentante];
                                    newRucs[index].rucPdf = null;
                                    setRucsEmpresaRepresentante(newRucs);
                                  }}
                                />
                                {index > 0 && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      setRucsEmpresaRepresentante(rucs => rucs.filter((_, i) => i !== index));
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
                              onClick={() => setRucsEmpresaRepresentante(rucs => [...rucs, { ruc: '', rucPdf: null }])}
                              className="mt-2"
                            >
                             + Agregar otro RUC
                            </Button>
                          </div>

                          {/* Documentos de la Empresa Representante */}
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">Documentos Requeridos</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <SimpleDocumentUpload
                                onUploadComplete={(documentId, url, name) => {
                                  setDocumentos({
                                    ...documentos,
                                    autorizacionRepresentacionPdf: { documentId, url, nombre: name }
                                  });
                                }}
                                currentDocument={documentos.autorizacionRepresentacionPdf || undefined}
                                label="autorización de representación"
                                onDelete={() => {
                                  setDocumentos({ ...documentos, autorizacionRepresentacionPdf: null });
                                }}
                              />
                              <SimpleDocumentUpload
                                onUploadComplete={(documentId, url, name) => {
                                  setDocumentos({
                                    ...documentos,
                                    cedulaRepresentanteLegalEmpresaPdf: { documentId, url, nombre: name }
                                  });
                                }}
                                currentDocument={documentos.cedulaRepresentanteLegalEmpresaPdf || undefined}
                                label="cédula del representante legal RL"
                                onDelete={() => {
                                  setDocumentos({ ...documentos, cedulaRepresentanteLegalEmpresaPdf: null });
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
                            onChange={(e) => setCedulaRepresentante(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border rounded-lg"
                          />
                        </div>

                        {/* Documentos del Representante Legal */}
                        <div className="space-y-4">
                          <h4 className="text-base font-medium">Documentos del Representante Legal</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <SimpleDocumentUpload
                              onUploadComplete={(documentId, url, name) => {
                                setDocumentos({
                                  ...documentos,
                                  cedulaRepresentanteLegalPdf: { documentId, url, nombre: name }
                                });
                              }}
                              currentDocument={documentos.cedulaRepresentanteLegalPdf || undefined}
                              label="cédula del representante legal"
                              onDelete={() => {
                                setDocumentos({ ...documentos, cedulaRepresentanteLegalPdf: null });
                              }}
                            />
                            <SimpleDocumentUpload
                              onUploadComplete={(documentId, url, name) => {
                                setDocumentos({
                                  ...documentos,
                                  nombramientoRepresentanteLegalPdf: { documentId, url, nombre: name }
                                });
                              }}
                              currentDocument={documentos.nombramientoRepresentanteLegalPdf || undefined}
                              label="nombramiento del representante legal"
                              onDelete={() => {
                                setDocumentos({ ...documentos, nombramientoRepresentanteLegalPdf: null });
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
              {['Accesos', 'Administrativo', 'Gerente', 'Proveedores'].map((tipo) => (
                <div key={tipo} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Contacto {tipo}</h3>
                  <div className="space-y-4">
                    {tipo === 'Accesos' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          value={contactoAccesos.nombreCompleto}
                          onChange={(e) => setContactoAccesos({
                            ...contactoAccesos,
                            nombreCompleto: e.target.value
                          })}
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
                        onChange={(e) => eval(`setContacto${tipo}`)({
                          ...eval(`contacto${tipo}`),
                          telefono: e.target.value
                        })}
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
                        onChange={(e) => eval(`setContacto${tipo}`)({
                          ...eval(`contacto${tipo}`),
                          email: e.target.value
                        })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    {tipo === 'Accesos' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Cédula
                        </label>
                        <input
                          type="text"
                          value={contactoAccesos.cedula}
                          onChange={(e) => setContactoAccesos({
                            ...contactoAccesos,
                            cedula: e.target.value
                          })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botones de navegación */}
      <div className="flex justify-between pt-6 border-t">
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-500 flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Volver
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
              onClick={() => setPaso(p => p - 1)}
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
                  <span>Actualizando...</span>
                </div>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <StatusModal
          open={showSuccessModal}
          onOpenChange={(open) => setShowSuccessModal(open)}
          type="success"
          title="¡Propietario actualizado exitosamente!"
          message="Los cambios han sido guardados correctamente."
          onClose={() => setShowSuccessModal(false)}
          actionLabel="Volver a la Propiedad"
          onAction={() => {
            router.push(
              `/dashboard/proyectos/${projectId}/propiedades/${propertyId}`
            );
          }}
        />
      )}

      {/* Modal de error */}
      {showErrorModal && (
        <StatusModal
          open={showErrorModal}
          onOpenChange={(open) => setShowErrorModal(open)}
          type="error"
          title="Error al actualizar el propietario"
          message={errorMessage}
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