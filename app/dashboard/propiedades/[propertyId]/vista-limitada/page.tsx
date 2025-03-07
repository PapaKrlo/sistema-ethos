"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftIcon, UserIcon, PhoneIcon, EnvelopeIcon, BuildingOffice2Icon, IdentificationIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { use } from "react";
import { useAuth } from "../../../../_lib/auth/AuthContext";
import { gql, useQuery } from "@apollo/client";
import Image from "next/image";

// Interfaces
interface ContactInfo {
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
}

interface Property {
  imagen?: {
    url: string;
  };
  proyecto: {
    nombre: string;
  };
  documentId: string;
  identificadores: {
    idSuperior: string;
    superior: string;
    idInferior: string;
    inferior: string;
  };
  estadoUso: string;
  areaTotal: number;
  codigoCatastral: string;
  actividad?: string;
  modoIncognito: boolean;
  propietario?: {
    contactoAccesos: ContactInfo;
  };
  ocupantes?: Array<{
    tipoOcupante: string;
    datosPersonaJuridica?: {
      razonSocial: string;
    };
    datosPersonaNatural?: {
      razonSocial: string;
    };
    perfilCliente?: {
      datosPersonaNatural?: {
        razonSocial: string;
      };
      datosPersonaJuridica?: {
        razonSocial: string;
      };
    };
  }>;
}

// Consulta GraphQL para propiedades (solo información limitada)
const GET_PROPERTY_LIMITED_DETAILS = gql`
  query GetPropertyLimitedDetails($documentId: ID!) {
    propiedad(documentId: $documentId) {
      documentId
      identificadores {
        idSuperior
        superior
        idInferior
        inferior
      }
      imagen {
        url
      }
      proyecto {
        nombre
      }
      estadoUso
      areaTotal
      codigoCatastral
      actividad
      modoIncognito
      propietario {
        contactoAccesos {
          nombreCompleto
          email
          telefono
        }
      }
      ocupantes {
        tipoOcupante
        datosPersonaJuridica {
          razonSocial
        }
        datosPersonaNatural {
          razonSocial
        }
        perfilCliente {
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

interface PageProps {
  params: Promise<{ propertyId: string }>;
}

export default function PropertyLimitedView({ params }: PageProps) {
  const { propertyId } = use(params);
  const { role } = useAuth();
  const router = useRouter();

  // Verificar si el usuario tiene rol adecuado
  useEffect(() => {
    if (!["Propietario", "Arrendatario"].includes(role as string)) {
      router.push("/dashboard");
    }
  }, [role, router]);

  const { data, loading, error } = useQuery(GET_PROPERTY_LIMITED_DETAILS, {
    variables: { documentId: propertyId },
    skip: !propertyId,
  });

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    console.error("Error al cargar la propiedad:", error);
    return (
      <div className="w-full p-4 text-center text-red-600 font-light">
        Error al cargar la propiedad. Por favor, intente más tarde.
      </div>
    );
  }

  const property: Property = data?.propiedad;

  // Obtener el nombre del ocupante si existe
  const getOcupanteName = () => {
    if (!property?.ocupantes || property.ocupantes.length === 0) return "No asignado";
    
    const ocupante = property.ocupantes[0];
    
    if (ocupante.datosPersonaJuridica?.razonSocial) {
      return ocupante.datosPersonaJuridica.razonSocial;
    } else if (ocupante.datosPersonaNatural?.razonSocial) {
      return ocupante.datosPersonaNatural.razonSocial;
    } else if (ocupante.perfilCliente?.datosPersonaJuridica?.razonSocial) {
      return ocupante.perfilCliente.datosPersonaJuridica.razonSocial;
    } else if (ocupante.perfilCliente?.datosPersonaNatural?.razonSocial) {
      return ocupante.perfilCliente.datosPersonaNatural.razonSocial;
    }
    
    return "No asignado";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/dashboard/directorio"
        className="inline-flex items-center text-gray-400 hover:text-emerald-500 mb-8 transition-colors font-light"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Volver al directorio
      </Link>

      <div className="relative overflow-hidden rounded-2xl shadow-lg bg-white mb-8">
        {/* Cabecera con imagen */}
        <div className="relative h-56 md:h-64">
          {property?.imagen?.url ? (
            <>
              <Image
                src={property.imagen.url}
                alt={`Imagen de propiedad ${property.identificadores?.superior || ''} ${property.identificadores?.idSuperior || ''}`}
                fill
                className="object-cover"
                priority
              />
             
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-emerald-500/20 to-emerald-600/20">
              <BuildingOffice2Icon className="w-20 h-20 text-emerald-500/30" />
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 p-6 text-white">
          
            <h1 className="text-2xl md:text-3xl font-medium">
              {property?.identificadores ? `${property.identificadores.superior} ${property.identificadores.idSuperior}` : 'Propiedad'}
            </h1>
            <p className="text-sm text-gray-200 mt-1">
              {property?.identificadores ? `${property.identificadores.inferior} ${property.identificadores.idInferior}` : ''}
            </p>
          </div>
        </div>

        {/* Información principal */}
        <div className="px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Información básica */}
            <div>
              <h2 className="text-lg font-light text-gray-800 border-b border-gray-100 pb-2 mb-6">Información básica</h2>
              
              <div className="space-y-5">
                <div className="flex items-center">
                  <span className="text-gray-400 font-light w-40">Estado</span>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    property?.estadoUso === "Disponible" || property?.estadoUso === "disponible"
                      ? "bg-green-50 text-green-600"
                      : "bg-blue-50 text-blue-600"
                  }`}>
                    {property?.estadoUso}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-400 font-light w-40">Código catastral</span>
                  <span className="text-gray-700 font-light">{property?.codigoCatastral || "No asignado"}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-400 font-light w-40">Área total</span>
                  <span className="text-gray-700 font-light">{property?.areaTotal ? `${property.areaTotal} m²` : "No disponible"}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-400 font-light w-40">Actividad</span>
                  <span className="text-gray-700 font-light">{property?.actividad || "No especificada"}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-400 font-light w-40">Ocupante</span>
                  <span className="text-gray-700 font-light">{getOcupanteName()}</span>
                </div>
              </div>
            </div>

            {/* Contacto de accesos */}
            <div>
              <h2 className="text-lg font-light text-gray-800 border-b border-gray-100 pb-2 mb-6">Contacto de accesos</h2>
              
              {property?.propietario?.contactoAccesos && 
               (property.propietario.contactoAccesos.nombreCompleto || 
                property.propietario.contactoAccesos.telefono || 
                property.propietario.contactoAccesos.email) ? (
                <div className="space-y-5">
                  <div className="flex items-center">
                    <span className="text-gray-400 font-light w-40">Nombre</span>
                    <span className="text-gray-700 font-light">{property.propietario.contactoAccesos.nombreCompleto || "No disponible"}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-gray-400 font-light w-40">Teléfono</span>
                    <span className="text-gray-700 font-light">{property.propietario.contactoAccesos.telefono || "No disponible"}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-gray-400 font-light w-40">Email</span>
                    <span className="text-gray-700 font-light">{property.propietario.contactoAccesos.email || "No disponible"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 font-light">No hay información de contacto disponible</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 