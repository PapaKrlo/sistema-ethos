"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "../../_lib/auth/AuthContext"
import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "@heroicons/react/24/outline"
import { gql, useQuery } from '@apollo/client'

const GET_CLIENT_PROPERTIES = gql`
  query GetClientProperties($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      propiedades {
        documentId
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
        actividad
        montoFondoInicial
        montoAlicuotaOrdinaria
        areaTotal
        areasDesglosadas {
          area
          tipoDeArea
        }
        modoIncognito
      }
    }
  }
`;

interface PropertySummaryData {
  id: string;
  lote: string;
  name: string;
  type: "bodega" | "ofibodega";
  address: string;
  totalAmount: number;
  dueDate: string;
  isRented: boolean;
  tenant?: {
    name: string;
    phone: string;
  };
  fees: Array<{
    concept: string;
    amount: number;
  }>;
  image?: string;
}

interface PropertyData {
  documentId: string;
  imagen?: {
    documentId: string;
    url: string;
  };
  identificadores?: {
    idSuperior: string;
    superior: string;
    idInferior: string;
    inferior: string;
  };
  estadoUso: string;
  estadoEntrega: string;
  estadoDeConstruccion: string;
  actividad: string;
  montoFondoInicial: number;
  montoAlicuotaOrdinaria: number;
  areaTotal: number;
  areasDesglosadas?: Array<{
    area: number;
    tipoDeArea: string;
  }>;
  modoIncognito: boolean;
}

export default function MisPropiedadesPage() {
  const { user, role } = useAuth()
  const router = useRouter()

  console.log('MisPropiedades - User:', user);
  console.log('MisPropiedades - Role:', role);
  console.log('MisPropiedades - DocumentId:', user?.perfil_cliente?.documentId);

  const { data, loading, error } = useQuery(GET_CLIENT_PROPERTIES, {
    variables: { 
      documentId: user?.perfil_cliente?.documentId 
    },
    skip: !user?.perfil_cliente?.documentId,
    onError: (error) => {
      console.error('MisPropiedades - Error en la consulta GraphQL:', {
        message: error.message,
        networkError: error.networkError,
        graphQLErrors: error.graphQLErrors,
      });
    },
    onCompleted: (data) => {
      console.log('MisPropiedades - Datos recibidos:', data);
    }
  });

  useEffect(() => {
    if (role !== "Propietario") {
      router.push("/dashboard")
    }
  }, [role, router])

  if (role !== "Propietario") return null

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  if (error) {
    console.error('Error al cargar las propiedades:', error);
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar las propiedades. Por favor, intente más tarde.
      </div>
    );
  }

  const properties: PropertySummaryData[] = data?.perfilCliente?.propiedades?.map((prop: PropertyData) => ({
    id: prop.documentId,
    lote: `${prop.identificadores?.inferior || ''} ${prop.identificadores?.idInferior || ''}`,
    name: `${prop.identificadores?.superior || ''} ${prop.identificadores?.idSuperior || ''}`,
    type: (prop.actividad?.toLowerCase()?.includes("bodega") || prop.identificadores?.superior?.toLowerCase()?.includes("bodega")) ? "bodega" : "ofibodega",
    address: prop.actividad || '',
    totalAmount: prop.montoAlicuotaOrdinaria || 0,
    dueDate: new Date().toISOString().split('T')[0],
    isRented: prop.estadoUso === 'enUso',
    tenant: undefined,
    fees: [
      {
        concept: "Alícuota ordinaria",
        amount: prop.montoAlicuotaOrdinaria || 0
      },
      {
        concept: "Fondo inicial",
        amount: prop.montoFondoInicial || 0
      }
    ],
    image: prop.imagen?.url || '/bodega.png'
  })) || [];

  if (properties.length === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        No se encontraron propiedades asociadas a tu perfil.
      </div>
    );
  }

  // Estilos para los estados de las propiedades
  const statusColors: Record<string, string> = {
    'enUso': 'bg-emerald-100 text-emerald-800',
    'disponible': 'bg-blue-100 text-blue-800',
    'enConstruccion': 'bg-amber-100 text-amber-800',
    'enRemodelacion': 'bg-purple-100 text-purple-800'
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mis Propiedades</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <motion.div
            key={property.id}
            className="bg-white rounded-xl overflow-hidden border group hover:shadow-lg transition-all duration-200"
            whileHover={{ y: -4 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative h-48">
              <Image
                src={property.image || '/bodega.png'}
                alt={property.name}
                fill
                className="object-cover"
              />
              {property.isRented && (
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  En uso
                </span>
              )}
              {!property.isRented && (
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Disponible
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium text-lg">{property.name}</h3>
              <p className="text-gray-500 text-sm mb-1">{property.lote}</p>
              <p className="text-gray-500 text-sm">{property.address}</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Alícuota total:</span>
                  <span className="font-medium text-gray-900">${property.totalAmount.toFixed(2)}</span>
                </div>
              </div>
              <Link 
                href={`/dashboard/mis-propiedades/${property.id}`}
                className="mt-4 inline-flex items-center text-[#008A4B] hover:text-[#006837] text-sm font-medium"
              >
                Ver detalles
                <ArrowRightIcon className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
} 