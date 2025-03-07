"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "../../../_lib/auth/AuthContext"
import { gql, useQuery } from '@apollo/client'
import Image from 'next/image'
import Link from 'next/link'
import { use } from 'react'
import { 
  ArrowLeftIcon, 
  BuildingOffice2Icon,
  DocumentTextIcon,
  UserIcon,
  CurrencyDollarIcon,
  MapPinIcon
} from "@heroicons/react/24/outline"

const GET_PROPERTY_DETAIL = gql`
  query GetPropertyDetail($documentId: ID!) {
    propiedad(documentId: $documentId) {
      documentId
      tipoPropiedad
      numeroPropiedad
      codigoCatastral
      estadoEntrega
      estadoUso
      estadoOcupacion
      tipoUso
      metraje
      areaUtil
      areaTotal
      areaAdicional
      parqueo
      areaParqueo
      tieneMezzanine
      areaMezzanine
      varios
      areaVarios
      autorizacionDirectorio
      modoIncognito
      ocupanteExterno
      alicuotas {
        concepto
        monto
        fechaVencimiento
      }
      propietario {
        nombre
        telefono
        email
      }
    }
  }
`;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RentalDetailPage({ params }: PageProps) {
  const { id: propertyId } = use(params);
  const { user, role } = useAuth()
  const router = useRouter()

  const { data, loading, error } = useQuery(GET_PROPERTY_DETAIL, {
    variables: { 
      documentId: propertyId
    },
    skip: !propertyId,
    onError: (error) => {
      console.error('RentalDetail - Error en la consulta GraphQL:', {
        message: error.message,
        networkError: error.networkError,
        graphQLErrors: error.graphQLErrors,
      });
    },
    onCompleted: (data) => {
      console.log('RentalDetail - Datos recibidos:', data);
    }
  });

  useEffect(() => {
    if (role !== "Arrendatario") {
      router.push("/dashboard")
    }
  }, [role, router])

  if (role !== "Arrendatario") return null

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  if (error) {
    console.error('Error al cargar los detalles del alquiler:', error);
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar los detalles del alquiler. Por favor, intente más tarde.
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

  const totalAmount = property.alicuotas?.reduce((sum: number, alicuota: any) => sum + alicuota.monto, 0) || 0;
  const nextPaymentDate = property.alicuotas?.[0]?.fechaVencimiento 
    ? new Date(property.alicuotas[0].fechaVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'No disponible';

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/dashboard/mi-alquiler"
          className="inline-flex items-center text-gray-600 hover:text-[#008A4B] transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Volver a mi alquiler
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
        <div className="relative h-64">
          <Image
            src="/bodega.png"
            alt={`${property.tipoPropiedad} ${property.numeroPropiedad}`}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="p-6 text-white">
              <h1 className="text-3xl font-bold">{property.tipoPropiedad} {property.numeroPropiedad}</h1>
              <p className="text-white/80 mt-2 flex items-center">
                <MapPinIcon className="w-5 h-5 mr-2" />
                {property.tipoUso}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BuildingOffice2Icon className="w-5 h-5 mr-2 text-[#008A4B]" />
                Información de la propiedad
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-medium">{property.tipoPropiedad}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Número</p>
                    <p className="font-medium">{property.numeroPropiedad}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Estado</p>
                    <p className="font-medium">{property.estadoOcupacion}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Uso</p>
                    <p className="font-medium">{property.tipoUso}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Área Total</p>
                    <p className="font-medium">{property.areaTotal} m²</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Área Útil</p>
                    <p className="font-medium">{property.areaUtil} m²</p>
                  </div>
                </div>
                
                {property.parqueo && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Parqueo</p>
                    <p className="font-medium">{property.areaParqueo} m²</p>
                  </div>
                )}
                
                {property.tieneMezzanine && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Mezzanine</p>
                    <p className="font-medium">{property.areaMezzanine} m²</p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-[#008A4B]" />
                  Información del propietario
                </h2>
                
                <div className="bg-blue-50 p-6 rounded-xl mb-6">
                  <h3 className="font-medium text-blue-800 mb-2">Datos de contacto</h3>
                  <p className="text-blue-700 mb-1"><strong>Nombre:</strong> {property.propietario?.nombre || 'No disponible'}</p>
                  <p className="text-blue-700 mb-1"><strong>Teléfono:</strong> {property.propietario?.telefono || 'No disponible'}</p>
                  <p className="text-blue-700"><strong>Email:</strong> {property.propietario?.email || 'No disponible'}</p>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <CurrencyDollarIcon className="w-5 h-5 mr-2 text-[#008A4B]" />
                  Información de pagos
                </h2>
                
                <div className="bg-emerald-50 p-6 rounded-xl mb-6">
                  <h3 className="font-medium text-emerald-800 mb-2">Próximo pago</h3>
                  <p className="text-emerald-700 mb-1"><strong>Monto:</strong> ${totalAmount.toFixed(2)}</p>
                  <p className="text-emerald-700"><strong>Fecha de vencimiento:</strong> {nextPaymentDate}</p>
                </div>
                
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-medium mb-3">Desglose de alícuotas</h3>
                  <div className="space-y-3">
                    {property.alicuotas && property.alicuotas.length > 0 ? (
                      <>
                        {property.alicuotas.map((alicuota: any, index: number) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                            <span className="text-gray-700">{alicuota.concepto}</span>
                            <span className="font-medium">${alicuota.monto.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-3 font-semibold">
                          <span>Total</span>
                          <span>${totalAmount.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No hay alícuotas registradas</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex gap-4">
            <Link 
              href={`/dashboard/solicitudes/nuevo?propiedad=${property.documentId}`}
              className="bg-[#008A4B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#006837] transition-colors"
            >
              Crear solicitud
            </Link>
            <Link 
              href={`/dashboard/mis-documentos?propiedad=${property.documentId}`}
              className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Ver documentos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 