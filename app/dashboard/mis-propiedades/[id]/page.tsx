"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "../../../_lib/auth/AuthContext";
import { gql, useQuery, useMutation } from "@apollo/client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  UserIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const GET_PROPERTY_DETAIL = gql`
  query GetPropertyDetail($documentId: ID!) {
    propiedad(documentId: $documentId) {
      documentId
      actividad
      montoFondoInicial
      montoAlicuotaOrdinaria
      escrituraPdf {
        documentId
        url
        nombre
      }
      actaEntregaPdf {
        documentId
        url
        nombre
      }
      contratoArrendamientoPdf {
        documentId
        url
        nombre
      }
      pagos {
        encargadoDePago
        fechaExpiracionEncargadoDePago
      }
      imagen {
        documentId
        url
      }
      identificadores {
        idSuperior
        superior
        idInferior
        inferior
      }
      estadoUso
      estadoEntrega
      estadoDeConstruccion
      areaTotal
      areasDesglosadas {
        area
        tipoDeArea
      }
      modoIncognito
    }
  }
`;

const UPDATE_INCOGNITO_MODE = gql`
  mutation UpdateIncognitoMode($documentId: ID!, $data: PropiedadInput!) {
    updatePropiedad(documentId: $documentId, data: $data) {
      documentId
    }
  }
`;

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, role } = useAuth();
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const documentId = unwrappedParams.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const [updateIncognitoMode, { loading: updatingIncognito }] = useMutation(UPDATE_INCOGNITO_MODE, {
    onCompleted: (data) => {
      console.log("Modo incógnito actualizado:", data);
    },
    onError: (error) => {
      console.error("Error al actualizar modo incógnito:", error);
    }
  });

  const toggleIncognitoMode = async () => {
    if (property) {
      try {
        await updateIncognitoMode({
          variables: {
            documentId: documentId,
            data: {
              modoIncognito: !property.modoIncognito
            }
          },
          refetchQueries: [
            {
              query: GET_PROPERTY_DETAIL,
              variables: { documentId }
            }
          ]
        });
        setMenuOpen(false);
      } catch (error) {
        console.error("Error al cambiar modo incógnito:", error);
      }
    }
  };

  const { data, loading, error } = useQuery(GET_PROPERTY_DETAIL, {
    variables: {
      documentId: documentId,
    },
    skip: !documentId,
    onError: (error) => {
      console.error("PropertyDetail - Error en la consulta GraphQL:", {
        message: error.message,
        networkError: error.networkError,
        graphQLErrors: error.graphQLErrors,
      });
    },
    onCompleted: (data) => {
      console.log("PropertyDetail - Datos recibidos:", data);
    },
  });

  useEffect(() => {
    if (role !== "Propietario") {
      router.push("/dashboard");
    }
  }, [role, router]);

  if (role !== "Propietario") return null;

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  if (error) {
    console.error("Error al cargar los detalles de la propiedad:", error);
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar los detalles de la propiedad. Por favor, intente más
        tarde.
      </div>
    );
  }

  const property = data?.propiedad;

  if (!property) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        No se encontró la propiedad solicitada.
      </div>
    );
  }

  // Obtener información de la propiedad
  const propertyIdentifier = property.identificadores?.idInferior || '';
  const propertyType = property.actividad || 'Propiedad';
  const propertyLocation = property.identificadores?.superior || '';
  const propertyStatus = property.estadoUso || '';
  const propertyArea = property.areaTotal || 0;
  const propertyImage = property.imagen?.url || '/bodega.png';

  // Formatear los identificadores de manera más clara
  const formattedSuperior = property.identificadores?.superior ? `${property.identificadores.superior} ${property.identificadores.idSuperior}` : '';
  const formattedInferior = property.identificadores?.inferior ? `${property.identificadores.inferior} ${property.identificadores.idInferior}` : '';

  const totalAmount = property.montoAlicuotaOrdinaria || 0;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/mis-propiedades"
          className="inline-flex items-center text-gray-600 hover:text-[#008A4B] transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Volver a mis propiedades
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
        <div className="relative h-64">
          <Image
            src={propertyImage}
            alt={`Propiedad ${formattedInferior || propertyIdentifier}`}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="p-6 text-white">
              <h1 className="text-3xl font-bold">
                {formattedInferior || `Propiedad ${propertyIdentifier}`}
              </h1>
              <p className="text-white/80 mt-2 flex items-center">
                <MapPinIcon className="w-5 h-5 mr-2" />
                {formattedSuperior || propertyLocation}
              </p>
            </div>
          </div>
          
          {/* Menú de opciones */}
          <div className="absolute top-4 right-4">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="bg-white/90 p-2 rounded-full hover:bg-white transition-colors"
            >
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-700" />
            </button>
            
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border overflow-hidden z-10">
                <button 
                  onClick={toggleIncognitoMode}
                  className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 transition-colors"
                  disabled={updatingIncognito}
                >
                  {property.modoIncognito ? (
                    <>
                      <EyeIcon className="w-5 h-5 mr-2 text-gray-600" />
                      <span>Desactivar modo incógnito</span>
                    </>
                  ) : (
                    <>
                      <EyeSlashIcon className="w-5 h-5 mr-2 text-gray-600" />
                      <span>Activar modo incógnito</span>
                    </>
                  )}
                </button>
                <Link 
                  href={`/dashboard/solicitudes/nuevo?propiedad=${documentId}`}
                  className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 transition-colors"
                >
                  <PencilSquareIcon className="w-5 h-5 mr-2 text-gray-600" />
                  <span>Crear solicitud</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="bg-white border rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <BuildingOffice2Icon className="w-5 h-5 mr-2 text-[#008A4B]" />
                  Detalles de la propiedad
                </h2>

                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500 mb-1">Identificadores</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">{property.identificadores?.superior}</p>
                        <p className="font-medium">{property.identificadores?.idSuperior}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{property.identificadores?.inferior}</p>
                        <p className="font-medium">{property.identificadores?.idInferior}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500 mb-1">Actividad</p>
                    <p className="font-medium">{property.actividad || "No especificada"}</p>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500 mb-1">Área Total</p>
                    <p className="font-medium">{propertyArea} m²</p>
                  </div>

                  {property.areasDesglosadas && property.areasDesglosadas.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Áreas desglosadas</p>
                      <div className="space-y-2">
                        {property.areasDesglosadas.map((area: { tipoDeArea: string; area: number }, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-gray-700">{area.tipoDeArea}</span>
                            <span className="font-medium">{area.area} m²</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-[#008A4B]" />
                  Estado de la propiedad
                </h2>

                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500 mb-1">Estado de uso</p>
                    {propertyStatus === "enUso" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        En uso
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Disponible
                      </span>
                    )}
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500 mb-1">Estado de entrega</p>
                    {property.estadoEntrega === "entregado" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Entregado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        No entregado
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Estado de construcción</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {property.estadoDeConstruccion || 'No disponible'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white border rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <CurrencyDollarIcon className="w-5 h-5 mr-2 text-[#008A4B]" />
                  Información financiera
                </h2>
                
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500 mb-1">Monto fondo inicial</p>
                    <p className="font-medium text-lg">${property.montoFondoInicial?.toFixed(2) || '0.00'}</p>
                  </div>
                  
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500 mb-1">Monto alícuota ordinaria</p>
                    <p className="font-medium text-lg">${property.montoAlicuotaOrdinaria?.toFixed(2) || '0.00'}</p>
                  </div>
                  
                  {property.pagos && (
                    <>
                      <div className="border-b pb-3">
                        <p className="text-sm text-gray-500 mb-1">Encargado de pago</p>
                        <p className="font-medium">{property.pagos.encargadoDePago || 'No especificado'}</p>
                      </div>
                      
                      {property.pagos.fechaExpiracionEncargadoDePago && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Fecha expiración</p>
                          <p className="font-medium">{new Date(property.pagos.fechaExpiracionEncargadoDePago).toLocaleDateString('es-ES')}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white border rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  Documentos
                </h2>
                <div className="space-y-3">
                  {property.escrituraPdf ? (
                    <a 
                      href={property.escrituraPdf.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium">Escritura</span>
                      <span className="text-[#008A4B]">Ver documento</span>
                    </a>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-500">
                      <span>Escritura no disponible</span>
                    </div>
                  )}

                  {property.actaEntregaPdf ? (
                    <a 
                      href={property.actaEntregaPdf.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium">Acta de entrega</span>
                      <span className="text-[#008A4B]">Ver documento</span>
                    </a>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-500">
                      <span>Acta de entrega no disponible</span>
                    </div>
                  )}

                  {property.contratoArrendamientoPdf ? (
                    <a 
                      href={property.contratoArrendamientoPdf.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium">Contrato de arrendamiento</span>
                      <span className="text-[#008A4B]">Ver documento</span>
                    </a>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-500">
                      <span>Contrato de arrendamiento no disponible</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <h2 className="text-xl font-semibold">Modo incógnito</h2>
                    <div className="relative ml-2">
                      <button
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <InformationCircleIcon className="w-5 h-5" />
                      </button>
                      {showTooltip && (
                        <div className="absolute z-10 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg -left-36 bottom-full mb-2">
                          <p>Al tener modo incógnito desactivado, otros propietarios podrán ver tu propiedad en el directorio para contactarse contigo. Actívalo si prefieres mantener tu propiedad privada.</p>
                          <div className="absolute w-3 h-3 bg-gray-800 transform rotate-45 left-1/2 -ml-1.5 -bottom-1.5"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {property.modoIncognito ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <EyeSlashIcon className="w-3.5 h-3.5 mr-1" />
                        Activado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <EyeIcon className="w-3.5 h-3.5 mr-1" />
                        Desactivado
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-gray-500 mt-2 text-sm">
                  {property.modoIncognito 
                    ? "Tu propiedad está oculta para otros propietarios en el directorio." 
                    : "Tu propiedad es visible para otros propietarios en el directorio."}
                </p>
                <button
                  onClick={toggleIncognitoMode}
                  disabled={updatingIncognito}
                  className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                >
                  {updatingIncognito ? (
                    <span>Actualizando...</span>
                  ) : property.modoIncognito ? (
                    <>
                      <EyeIcon className="w-4 h-4 mr-2" />
                      <span>Desactivar modo incógnito</span>
                    </>
                  ) : (
                    <>
                      <EyeSlashIcon className="w-4 h-4 mr-2" />
                      <span>Activar modo incógnito</span>
                    </>
                  )}
                </button>
              </div>

              {/* <div className="bg-white border rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Acciones
                </h2>
                <div className="flex flex-col gap-4">
                  <Link
                    href={`/dashboard/solicitudes/nuevo?propiedad=${documentId}`}
                    className="bg-[#008A4B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#006837] transition-colors text-center"
                  >
                    Crear solicitud
                  </Link>
                  <Link
                    href={`/dashboard/mis-documentos?propiedad=${documentId}`}
                    className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
                  >
                    Ver documentos
                  </Link>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
