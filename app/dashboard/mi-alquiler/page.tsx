"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "../../_lib/auth/AuthContext"
import { PropertySummary } from "../_components/PropertySummary"
import { gql, useQuery } from '@apollo/client'

const GET_CLIENT_PROPERTIES = gql`
  query GetClientProperties($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      propiedades {
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
        }
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
}

interface PropertyData {
  documentId: string;
  tipoPropiedad: string;
  numeroPropiedad: string;
  estadoUso: string;
  estadoOcupacion: string;
  metraje: number;
  areaUtil: number;
  areaTotal: number;
  tipoUso: string;
  alicuotas?: Array<{
    concepto: string;
    monto: number;
    fechaVencimiento: string;
  }>;
  propietario?: {
    nombre: string;
    telefono: string;
  };
}

export default function MiAlquilerPage() {
  const { user, role } = useAuth()
  const router = useRouter()

  console.log('MiAlquiler - User:', user);
  console.log('MiAlquiler - Role:', role);
  console.log('MiAlquiler - DocumentId:', user?.perfil_cliente?.documentId);

  const { data, loading, error } = useQuery(GET_CLIENT_PROPERTIES, {
    variables: { 
      documentId: user?.perfil_cliente?.documentId 
    },
    skip: !user?.perfil_cliente?.documentId,
    onError: (error) => {
      console.error('MiAlquiler - Error en la consulta GraphQL:', {
        message: error.message,
        networkError: error.networkError,
        graphQLErrors: error.graphQLErrors,
      });
    },
    onCompleted: (data) => {
      console.log('MiAlquiler - Datos recibidos:', data);
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
    console.error('Error al cargar las propiedades:', error);
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar las propiedades. Por favor, intente más tarde.
      </div>
    );
  }

  const properties: PropertySummaryData[] = data?.perfilCliente?.propiedades?.map((prop: PropertyData) => ({
    id: prop.documentId,
    lote: prop.numeroPropiedad,
    name: `${prop.tipoPropiedad} ${prop.numeroPropiedad}`,
    type: prop.tipoPropiedad.toLowerCase() === "bodega" ? "bodega" : "ofibodega",
    address: prop.tipoUso,
    totalAmount: prop.alicuotas?.reduce((sum, alicuota) => sum + alicuota.monto, 0) || 0,
    dueDate: prop.alicuotas?.[0]?.fechaVencimiento || new Date().toISOString().split('T')[0],
    isRented: true,
    tenant: undefined,
    fees: prop.alicuotas?.map(alicuota => ({
      concept: alicuota.concepto,
      amount: alicuota.monto
    })) || []
  })) || [];

  if (properties.length === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        No se encontraron propiedades alquiladas asociadas a tu perfil.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mi Alquiler</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.map((property) => (
          <PropertySummary 
            key={property.id} 
            property={property} 
            viewMode="tenant"
          />
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Información importante</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Los pagos de alícuotas deben realizarse antes de la fecha de vencimiento</li>
          <li>• Para cualquier consulta sobre los montos, contacte a la administración</li>
          <li>• Mantenga sus pagos al día para evitar recargos por mora</li>
          <li>• Cualquier modificación a la bodega debe ser consultada previamente</li>
        </ul>
      </div>
    </div>
  )
} 