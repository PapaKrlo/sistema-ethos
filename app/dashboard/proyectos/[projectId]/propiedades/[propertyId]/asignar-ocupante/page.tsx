"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/_components/ui/button";
import { useForm, FormProvider } from "react-hook-form";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { gql, useMutation, useQuery } from "@apollo/client";
import { StatusModal } from "@/_components/StatusModal";
import { useProject } from "@/dashboard/_hooks/useProject";
import { RadioGroup, RadioGroupItem } from "@/_components/ui/radio-group";
import { Label } from "@/_components/ui/label";
import { SimpleDocumentUpload } from "@/_components/SimpleDocumentUpload";

// Consulta para obtener los detalles de la propiedad
const GET_PROPERTY_DETAILS = gql`
  query Propiedad($documentId: ID!) {
    propiedad(documentId: $documentId) {
      documentId
      propietario {
        documentId
        tipoPersona
        datosPersonaNatural {
          razonSocial
        }
        datosPersonaJuridica {
          razonSocial
        }
      }
      ocupantes {
        documentId
        tipoOcupante
        perfilCliente {
          documentId
          tipoPersona
          datosPersonaNatural {
            razonSocial
          }
          datosPersonaJuridica {
            razonSocial
          }
        }
      }
    }
  }
`;

// Mutación para crear un ocupante
const CREATE_OCUPANTE = gql`
  mutation CrearOcupante($data: OcupanteInput!) {
    createOcupante(data: $data) {
      documentId
    }
  }
`;

// Mutación para crear un perfil de cliente
const CREATE_PERFIL_CLIENTE = gql`
  mutation CrearPerfilCliente($data: PerfilClienteInput!) {
    createPerfilCliente(data: $data) {
      documentId
    }
  }
`;

// Mutación para editar un ocupante
const UPDATE_OCUPANTE = gql`
  mutation ActualizarOcupante($documentId: ID!, $data: OcupanteInput!) {
    updateOcupante(documentId: $documentId, data: $data) {
      documentId
    }
  }
`;

// Mutación para eliminar un ocupante
const DELETE_OCUPANTE = gql`
  mutation EliminarOcupante($documentId: ID!) {
    deleteOcupante(documentId: $documentId) {
      documentId
    }
  }
`;

type TipoOcupante = "propietario" | "arrendatario" | "externo";
type TipoPersona = "Natural" | "Juridica";

export default function AsignarOcupantePage() {
  const router = useRouter();
  const params = useParams();
  const [paso, setPaso] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tipoOcupante, setTipoOcupante] = useState<TipoOcupante | null>(null);
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>("Natural");
  const [ocupanteAEliminar, setOcupanteAEliminar] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const { projectId, propertyId } = params;
  const { mutate } = useProject(typeof projectId === 'string' ? projectId : null);
  const [createOcupante] = useMutation(CREATE_OCUPANTE);
  const [createPerfilCliente] = useMutation(CREATE_PERFIL_CLIENTE);
  const [updateOcupante] = useMutation(UPDATE_OCUPANTE);
  const [deleteOcupante] = useMutation(DELETE_OCUPANTE);

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
  const [documentos, setDocumentos] = useState<{
    cedulaPdf: { documentId: string; url: string; nombre: string } | null;
    rucPdf: { documentId: string; url: string; nombre: string } | null;
    cedulaRepresentanteLegalPdf: { documentId: string; url: string; nombre: string } | null;
    nombramientoRepresentanteLegalPdf: { documentId: string; url: string; nombre: string } | null;
    autorizacionRepresentacionPdf: { documentId: string; url: string; nombre: string } | null;
    cedulaRepresentanteLegalEmpresaPdf: { documentId: string; url: string; nombre: string } | null;
  }>({
    cedulaPdf: null,
    rucPdf: null,
    cedulaRepresentanteLegalPdf: null,
    nombramientoRepresentanteLegalPdf: null,
    autorizacionRepresentacionPdf: null,
    cedulaRepresentanteLegalEmpresaPdf: null,
  });

  // Estados para RUCs
  interface RucItem {
    ruc: string;
    rucPdf: { documentId: string; url: string; nombre: string } | null;
  }

  const [rucsPersonaJuridica, setRucsPersonaJuridica] = useState<RucItem[]>([
    { ruc: '', rucPdf: null }
  ]);
  const [rucsEmpresaRepresentante, setRucsEmpresaRepresentante] = useState<RucItem[]>([
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

  const methods = useForm();

  // Consulta para obtener los detalles de la propiedad
  const { data: propertyData, loading } = useQuery(GET_PROPERTY_DETAILS, {
    variables: { documentId: propertyId },
    skip: !propertyId
  });

  // Si la propiedad no tiene propietario, redirigir
  useEffect(() => {
    if (propertyData && !propertyData.propiedad.propietario) {
      router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
    }
  }, [propertyData, router, projectId, propertyId]);

  const getNombrePropietario = () => {
    if (!propertyData?.propiedad.propietario) return "";
    
    const propietario = propertyData.propiedad.propietario;
    return propietario.tipoPersona === "Natural" 
      ? propietario.datosPersonaNatural?.razonSocial 
      : propietario.datosPersonaJuridica?.razonSocial;
  };

  // Si está cargando, mostrar indicador de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  const getNombreOcupante = (ocupante: any) => {
    if (!ocupante.perfilCliente) return "";
    return ocupante.perfilCliente.tipoPersona === "Natural"
      ? ocupante.perfilCliente.datosPersonaNatural?.razonSocial
      : ocupante.perfilCliente.datosPersonaJuridica?.razonSocial;
  };

  const handleDeleteOcupante = async () => {
    try {
      setIsLoading(true);
      await deleteOcupante({
        variables: {
          documentId: ocupanteAEliminar
        }
      });
      setShowConfirmDelete(false);
      setShowSuccessModal(true);
      if (typeof projectId === 'string') {
        mutate();
      }
    } catch (error: any) {
      console.error("Error al eliminar ocupante:", error);
      setErrorMessage(error.message || "Ha ocurrido un error al eliminar el ocupante");
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasoInicial = () => {
    const ocupantes = propertyData?.propiedad.ocupantes || [];
    
    return (
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-medium mb-4">Ocupantes de la Propiedad</h2>
        
        {ocupantes.length > 0 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-base font-medium text-gray-700">Ocupantes Actuales:</h3>
              {ocupantes.map((ocupante: any) => (
                <div key={ocupante.documentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{getNombreOcupante(ocupante)}</p>
                    <p className="text-sm text-gray-500 capitalize">{ocupante.tipoOcupante}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOcupanteAEliminar(ocupante.documentId);
                      setShowConfirmDelete(true);
                    }}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="pt-6 border-t">
              <Button
                type="button"
                onClick={() => {
                  setPaso(1);
                }}
                className="w-full bg-[#008A4B] text-white hover:bg-[#006837]"
              >
                Agregar Nuevo Ocupante
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-500">No hay ocupantes asignados a esta propiedad.</p>
            <Button
              type="button"
              onClick={() => {
                setPaso(1);
              }}
              className="bg-[#008A4B] text-white hover:bg-[#006837]"
            >
              Agregar Primer Ocupante
            </Button>
          </div>
        )}
      </div>
    );
  };

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      
      if (tipoOcupante === "propietario") {
        // Crear ocupante relacionado al propietario
        await createOcupante({
          variables: {
            data: {
              tipoOcupante: "propietario",
              perfilCliente: propertyData.propiedad.propietario.documentId,
              propiedad: propertyId
            }
          }
        });
      } else if (tipoOcupante === "externo") {
        // Para ocupantes externos, crear directamente el ocupante con la información
        let ocupanteData: any = {
          tipoOcupante: "externo",
          propiedad: propertyId,
          tipoPersona,
        };

        if (tipoPersona === "Natural") {
          ocupanteData.datosPersonaNatural = {
            razonSocial: nombreCompleto,
            cedula,
            cedulaPdf: documentos.cedulaPdf?.documentId,
          };

          if (aplicaRuc) {
            ocupanteData.datosPersonaNatural.aplicaRuc = true;
            ocupanteData.datosPersonaNatural.ruc = ruc;
            ocupanteData.datosPersonaNatural.rucPdf = documentos.rucPdf?.documentId;
          }
        } else {
          ocupanteData.datosPersonaJuridica = {
            razonSocial,
            nombreComercial,
            rucPersonaJuridica: rucsPersonaJuridica.map(rucItem => ({
              ruc: rucItem.ruc,
              rucPdf: rucItem.rucPdf?.documentId
            })),
            representanteLegalEsEmpresa: esEmpresaRepresentante,
          };

          if (esEmpresaRepresentante) {
            ocupanteData.datosPersonaJuridica.empresaRepresentanteLegal = {
              nombreComercial: empresaRepresentanteLegal.nombreComercial,
              direccionLegal: empresaRepresentanteLegal.direccionLegal,
              observaciones: empresaRepresentanteLegal.observaciones,
              razonSocialRepresentanteLegalRL: empresaRepresentanteLegal.nombreRepresentanteLegalRL,
              cedulaRepresentanteLegal: empresaRepresentanteLegal.cedulaRepresentanteLegal,
              autorizacionRepresentacionPdf: documentos.autorizacionRepresentacionPdf?.documentId,
              cedulaRepresentanteLegalPdf: documentos.cedulaRepresentanteLegalEmpresaPdf?.documentId,
              rucEmpresaRepresentanteLegal: rucsEmpresaRepresentante.map(rucItem => ({
                ruc: rucItem.ruc,
                rucPdf: rucItem.rucPdf?.documentId
              }))
            };
          } else {
            ocupanteData.datosPersonaJuridica.razonSocialRepresentanteLegal = nombreRepresentante;
            ocupanteData.datosPersonaJuridica.cedulaRepresentanteLegal = cedulaRepresentante;
            ocupanteData.datosPersonaJuridica.cedulaRepresentanteLegalPdf = documentos.cedulaRepresentanteLegalPdf?.documentId;
            ocupanteData.datosPersonaJuridica.nombramientoRepresentanteLegalPdf = documentos.nombramientoRepresentanteLegalPdf?.documentId;
          }
        }

        // Agregar datos de contacto directamente al ocupante
        if (Object.values(contactoAccesos).some(val => val !== '')) {
          ocupanteData.contactoAccesos = contactoAccesos;
        }
        if (Object.values(contactoAdministrativo).some(val => val !== '')) {
          ocupanteData.contactoAdministrativo = contactoAdministrativo;
        }
        if (Object.values(contactoGerente).some(val => val !== '')) {
          ocupanteData.contactoGerente = contactoGerente;
        }
        if (Object.values(contactoProveedores).some(val => val !== '')) {
          ocupanteData.contactoProveedores = contactoProveedores;
        }

        // Crear el ocupante externo directamente
        await createOcupante({
          variables: {
            data: ocupanteData
          }
        });
      } else {
        // Para arrendatarios, mantener la lógica existente de crear perfil de cliente
        let perfilClienteData: any = {
          rol: "Arrendatario",
          tipoPersona,
        };

        if (tipoPersona === "Natural") {
          perfilClienteData.datosPersonaNatural = {
            razonSocial: nombreCompleto,
            cedula,
            cedulaPdf: documentos.cedulaPdf?.documentId,
          };

          if (aplicaRuc) {
            perfilClienteData.datosPersonaNatural.ruc = ruc;
            perfilClienteData.datosPersonaNatural.rucPdf = documentos.rucPdf?.documentId;
          }
        } else {
          perfilClienteData.datosPersonaJuridica = {
            razonSocial,
            nombreComercial,
            rucPersonaJuridica: rucsPersonaJuridica.map(rucItem => ({
              ruc: rucItem.ruc,
              rucPdf: rucItem.rucPdf?.documentId
            })),
            representanteLegalEsEmpresa: esEmpresaRepresentante,
          };

          if (esEmpresaRepresentante) {
            perfilClienteData.datosPersonaJuridica.empresaRepresentanteLegal = {
              nombreComercial: empresaRepresentanteLegal.nombreComercial,
              direccionLegal: empresaRepresentanteLegal.direccionLegal,
              observaciones: empresaRepresentanteLegal.observaciones,
              razonSocialRepresentanteLegalRL: empresaRepresentanteLegal.nombreRepresentanteLegalRL,
              cedulaRepresentanteLegal: empresaRepresentanteLegal.cedulaRepresentanteLegal,
              autorizacionRepresentacionPdf: documentos.autorizacionRepresentacionPdf?.documentId,
              cedulaRepresentanteLegalPdf: documentos.cedulaRepresentanteLegalEmpresaPdf?.documentId,
              rucEmpresaRepresentanteLegal: rucsEmpresaRepresentante.map(rucItem => ({
                ruc: rucItem.ruc,
                rucPdf: rucItem.rucPdf?.documentId
              }))
            };
          } else {
            perfilClienteData.datosPersonaJuridica.razonSocialRepresentanteLegal = nombreRepresentante;
            perfilClienteData.datosPersonaJuridica.cedulaRepresentanteLegal = cedulaRepresentante;
            perfilClienteData.datosPersonaJuridica.cedulaRepresentanteLegalPdf = documentos.cedulaRepresentanteLegalPdf?.documentId;
            perfilClienteData.datosPersonaJuridica.nombramientoRepresentanteLegalPdf = documentos.nombramientoRepresentanteLegalPdf?.documentId;
          }
        }

        // Agregar datos de contacto al perfil de cliente
        if (Object.values(contactoAccesos).some(val => val !== '')) {
          perfilClienteData.contactoAccesos = contactoAccesos;
        }
        if (Object.values(contactoAdministrativo).some(val => val !== '')) {
          perfilClienteData.contactoAdministrativo = contactoAdministrativo;
        }
        if (Object.values(contactoGerente).some(val => val !== '')) {
          perfilClienteData.contactoGerente = contactoGerente;
        }
        if (Object.values(contactoProveedores).some(val => val !== '')) {
          perfilClienteData.contactoProveedores = contactoProveedores;
        }

        // Crear el perfil de cliente
        const { data: perfilClienteResponse } = await createPerfilCliente({
          variables: {
            data: perfilClienteData
          }
        });

        // Crear el ocupante
        await createOcupante({
          variables: {
            data: {
              tipoOcupante: "arrendatario",
              perfilCliente: perfilClienteResponse.createPerfilCliente.documentId,
              propiedad: propertyId
            }
          }
        });
      }

      setShowSuccessModal(true);
      if (typeof projectId === 'string') {
        mutate();
      }
    } catch (error: any) {
      console.error("Error al gestionar ocupante:", error);
      setErrorMessage(error.message || "Ha ocurrido un error al gestionar el ocupante");
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
              {ocupanteAEliminar ? "Eliminar Ocupante" : "Asignar Ocupante"}
            </h1>
            <p className="text-gray-500">
              {paso === 0 
                ? "Gestiona los ocupantes de esta propiedad"
                : "Selecciona quién ocupa esta propiedad"}
            </p>
          </div>
        </div>
        {paso > 0 && (
          <span className="text-sm text-gray-500">
            Paso {paso} de {ocupanteAEliminar ? "1" : "2"}
          </span>
        )}
      </div>

      {/* Indicador de progreso */}
      {paso > 0 && (
        <div className="flex gap-2 mb-6">
          <div className={`flex-1 h-2 rounded-full ${paso >= 1 ? 'bg-[#008A4B]' : 'bg-gray-200'}`} />
          {ocupanteAEliminar && (
            <div className={`flex-1 h-2 rounded-full ${paso >= 2 ? 'bg-[#008A4B]' : 'bg-gray-200'}`} />
          )}
        </div>
      )}

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          {paso === 0 ? (
            renderPasoInicial()
          ) : paso === 1 ? (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-medium mb-4">¿Quién ocupa esta propiedad?</h2>
              
              <RadioGroup
                value={tipoOcupante || ""}
                onValueChange={(value: string) => setTipoOcupante(value as TipoOcupante)}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="propietario" id="propietario" />
                  <Label htmlFor="propietario">
                    El propietario ({getNombrePropietario()})
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="arrendatario" id="arrendatario" />
                  <Label htmlFor="arrendatario">Un arrendatario</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="externo" id="externo" />
                  <Label htmlFor="externo">Un externo</Label>
                </div>
              </RadioGroup>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tipo de Persona */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-medium mb-4">Tipo de Persona</h2>
                <div className="flex gap-4">
                  <button
                    type="button"
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
                    type="button"
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
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-medium mb-4">
                  {tipoPersona === "Natural" ? "Datos Personales" : "Datos de la Empresa"}
                </h2>
                {tipoPersona === "Natural" ? (
                  <div className="space-y-4">
                    {/* Campos para persona natural */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={nombreCompleto}
                        onChange={(e) => setNombreCompleto(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cédula
                      </label>
                      <input
                        type="text"
                        value={cedula}
                        onChange={(e) => setCedula(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cédula (PDF)
                      </label>
                      <SimpleDocumentUpload
                        onUploadComplete={(documentId, url, name) => {
                          setDocumentos({ ...documentos, cedulaPdf: { documentId, url, nombre: name } });
                        }}
                        currentDocument={documentos.cedulaPdf || undefined}
                        label="cédula"
                        onDelete={() => {
                          setDocumentos({ ...documentos, cedulaPdf: null });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={aplicaRuc}
                          onChange={(e) => setAplicaRuc(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          ¿Aplica RUC?
                        </label>
                      </div>
                      {aplicaRuc && (
                        <div className="space-y-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              RUC
                            </label>
                            <input
                              type="text"
                              value={ruc}
                              onChange={(e) => setRuc(e.target.value)}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              RUC (PDF)
                            </label>
                            <SimpleDocumentUpload
                              onUploadComplete={(documentId, url, name) => {
                                setDocumentos({ ...documentos, rucPdf: { documentId, url, nombre: name } });
                              }}
                              currentDocument={documentos.rucPdf || undefined}
                              label="RUC"
                              onDelete={() => {
                                setDocumentos({ ...documentos, rucPdf: null });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Campos para persona jurídica */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Razón Social
                      </label>
                      <input
                        type="text"
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Comercial
                      </label>
                      <input
                        type="text"
                        value={nombreComercial}
                        onChange={(e) => setNombreComercial(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        RUCs
                      </label>
                      {rucsPersonaJuridica.map((rucItem, index) => (
                        <div key={index} className="space-y-2 mb-4">
                          <input
                            type="text"
                            value={rucItem.ruc}
                            onChange={(e) => {
                              const newRucs = [...rucsPersonaJuridica];
                              newRucs[index].ruc = e.target.value;
                              setRucsPersonaJuridica(newRucs);
                            }}
                            className="w-full p-2 border rounded-lg"
                            placeholder="Ingrese RUC"
                          />
                          <SimpleDocumentUpload
                            onUploadComplete={(documentId, url, name) => {
                              const newRucs = [...rucsPersonaJuridica];
                              newRucs[index].rucPdf = { documentId, url, nombre: name };
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
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRucsPersonaJuridica([...rucsPersonaJuridica, { ruc: '', rucPdf: null }])}
                        className="mt-2"
                      >
                        Agregar RUC
                      </Button>
                    </div>

                    {/* Representante Legal */}
                    <div className="space-y-4">
                      <h3 className="text-base font-medium text-gray-700">Representante Legal</h3>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={esEmpresaRepresentante}
                          onChange={(e) => setEsEmpresaRepresentante(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          ¿El representante legal es una empresa?
                        </label>
                      </div>

                      {esEmpresaRepresentante ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nombre Comercial de la Empresa Representante
                            </label>
                            <input
                              type="text"
                              value={empresaRepresentanteLegal.nombreComercial}
                              onChange={(e) => setEmpresaRepresentanteLegal({
                                ...empresaRepresentanteLegal,
                                nombreComercial: e.target.value
                              })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Dirección Legal
                            </label>
                            <input
                              type="text"
                              value={empresaRepresentanteLegal.direccionLegal}
                              onChange={(e) => setEmpresaRepresentanteLegal({
                                ...empresaRepresentanteLegal,
                                direccionLegal: e.target.value
                              })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Observaciones
                            </label>
                            <textarea
                              value={empresaRepresentanteLegal.observaciones}
                              onChange={(e) => setEmpresaRepresentanteLegal({
                                ...empresaRepresentanteLegal,
                                observaciones: e.target.value
                              })}
                              className="w-full p-2 border rounded-lg"
                              rows={3}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nombre del Representante Legal de la Empresa RL
                            </label>
                            <input
                              type="text"
                              value={empresaRepresentanteLegal.nombreRepresentanteLegalRL}
                              onChange={(e) => setEmpresaRepresentanteLegal({
                                ...empresaRepresentanteLegal,
                                nombreRepresentanteLegalRL: e.target.value
                              })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cédula del Representante Legal de la Empresa RL
                            </label>
                            <input
                              type="text"
                              value={empresaRepresentanteLegal.cedulaRepresentanteLegal}
                              onChange={(e) => setEmpresaRepresentanteLegal({
                                ...empresaRepresentanteLegal,
                                cedulaRepresentanteLegal: e.target.value
                              })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              RUCs de la Empresa Representante
                            </label>
                            {rucsEmpresaRepresentante.map((rucItem, index) => (
                              <div key={index} className="space-y-2 mb-4">
                                <input
                                  type="text"
                                  value={rucItem.ruc}
                                  onChange={(e) => {
                                    const newRucs = [...rucsEmpresaRepresentante];
                                    newRucs[index].ruc = e.target.value;
                                    setRucsEmpresaRepresentante(newRucs);
                                  }}
                                  className="w-full p-2 border rounded-lg"
                                  placeholder="Ingrese RUC"
                                />
                                <SimpleDocumentUpload
                                  onUploadComplete={(documentId, url, name) => {
                                    const newRucs = [...rucsEmpresaRepresentante];
                                    newRucs[index].rucPdf = { documentId, url, nombre: name };
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
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setRucsEmpresaRepresentante([...rucsEmpresaRepresentante, { ruc: '', rucPdf: null }])}
                              className="mt-2"
                            >
                              Agregar RUC
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Autorización de Representación
                              </label>
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
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cédula del Representante Legal RL
                              </label>
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
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nombre del Representante Legal
                            </label>
                            <input
                              type="text"
                              value={nombreRepresentante}
                              onChange={(e) => setNombreRepresentante(e.target.value)}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cédula del Representante Legal
                            </label>
                            <input
                              type="text"
                              value={cedulaRepresentante}
                              onChange={(e) => setCedulaRepresentante(e.target.value)}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cédula del Representante Legal (PDF)
                              </label>
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
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombramiento del Representante Legal
                              </label>
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

              {/* Datos de Contacto */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-medium mb-4">Datos de Contacto</h2>
                
                {/* Contacto para Accesos */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-base font-medium text-gray-700">Contacto para Accesos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={contactoAccesos.nombreCompleto}
                        onChange={(e) => setContactoAccesos({
                          ...contactoAccesos,
                          nombreCompleto: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cédula
                      </label>
                      <input
                        type="text"
                        value={contactoAccesos.cedula}
                        onChange={(e) => setContactoAccesos({
                          ...contactoAccesos,
                          cedula: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={contactoAccesos.telefono}
                        onChange={(e) => setContactoAccesos({
                          ...contactoAccesos,
                          telefono: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contactoAccesos.email}
                        onChange={(e) => setContactoAccesos({
                          ...contactoAccesos,
                          email: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacto Administrativo */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-base font-medium text-gray-700">Contacto Administrativo</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={contactoAdministrativo.telefono}
                        onChange={(e) => setContactoAdministrativo({
                          ...contactoAdministrativo,
                          telefono: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contactoAdministrativo.email}
                        onChange={(e) => setContactoAdministrativo({
                          ...contactoAdministrativo,
                          email: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacto Gerente */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-base font-medium text-gray-700">Contacto Gerente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={contactoGerente.telefono}
                        onChange={(e) => setContactoGerente({
                          ...contactoGerente,
                          telefono: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contactoGerente.email}
                        onChange={(e) => setContactoGerente({
                          ...contactoGerente,
                          email: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacto Proveedores */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-gray-700">Contacto Proveedores</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={contactoProveedores.telefono}
                        onChange={(e) => setContactoProveedores({
                          ...contactoProveedores,
                          telefono: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contactoProveedores.email}
                        onChange={(e) => setContactoProveedores({
                          ...contactoProveedores,
                          email: e.target.value
                        })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-500"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Volver
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-gray-300"
              >
                Cancelar
              </Button>
              {paso === 1 ? (
                tipoOcupante === "propietario" ? (
                  <Button
                    type="submit"
                    className="bg-[#008A4B] text-white hover:bg-[#006837]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        <span>Guardando...</span>
                      </div>
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setPaso(2)}
                    className="bg-[#008A4B] text-white hover:bg-[#006837]"
                    disabled={!tipoOcupante}
                  >
                    Siguiente
                  </Button>
                )
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaso(1)}
                    className="border-gray-300"
                  >
                    Anterior
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#008A4B] text-white hover:bg-[#006837]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        <span>Guardando...</span>
                      </div>
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </FormProvider>

      {/* Modal de confirmación de eliminación */}
      {showConfirmDelete && (
        <StatusModal
          open={showConfirmDelete}
          type="error"
          title="¿Eliminar ocupante?"
          message="¿Estás seguro de que deseas eliminar este ocupante? Esta acción no se puede deshacer."
          onClose={() => {
            setShowConfirmDelete(false);
            setOcupanteAEliminar(null);
          }}
          onOpenChange={(open) => setShowConfirmDelete(open)}
          actionLabel={isLoading ? "Eliminando..." : "Eliminar"}
          onAction={handleDeleteOcupante}
        />
      )}

      {/* Modal de éxito */}
      {showSuccessModal && (
        <StatusModal
          open={showSuccessModal}
          type="success"
          title="¡Operación exitosa!"
          message={ocupanteAEliminar 
            ? "El ocupante ha sido eliminado exitosamente."
            : "El ocupante ha sido asignado exitosamente a la propiedad."}
          onClose={() => {
            setShowSuccessModal(false);
            router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
          }}
          onOpenChange={(open) => setShowSuccessModal(open)}
          actionLabel="Ver Propiedad"
          onAction={() => {
            router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
          }}
        />
      )}

      {/* Modal de error */}
      {showErrorModal && (
        <StatusModal
          open={showErrorModal}
          type="error"
          title="Error"
          message={errorMessage}
          onClose={() => setShowErrorModal(false)}
          actionLabel="Intentar nuevamente"
          onAction={() => {
            setShowErrorModal(false);
            if (ocupanteAEliminar) {
              handleDeleteOcupante();
            } else {
              methods.handleSubmit(onSubmit)();
            }
          }}
          onOpenChange={(open) => setShowErrorModal(open)}
        />
      )}
    </motion.div>
  );
} 