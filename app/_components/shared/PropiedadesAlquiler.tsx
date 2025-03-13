"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "../../_lib/auth/AuthContext";
import { gql, useQuery } from "@apollo/client";
import Image from "next/image";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

// Consulta para propiedades (propietario)
const GET_PROPIEDADES = gql`
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

// Consulta para alquileres (arrendatario)
const GET_ALQUILERES = gql`
  query GetClientRentals($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      ocupante {
        documentId
        propiedad {
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
          modoIncognito
          areasDesglosadas {
            area
            tipoDeArea
          }
        }
      }
    }
  }
`;

interface PropiedadesAlquilerProps {
  tipoVista: "propiedades" | "alquiler";
  titulo?: string;
  descripcion?: string;
}

export default function PropiedadesAlquiler({
  tipoVista,
  titulo,
  descripcion,
}: PropiedadesAlquilerProps) {
  const { user } = useAuth();

  // Establece títulos por defecto si no se proporcionan
  const tituloMostrado =
    titulo || (tipoVista === "propiedades" ? "Mis Propiedades" : "Mi Alquiler");
  const descripcionMostrada =
    descripcion ||
    (tipoVista === "propiedades"
      ? "Administra las propiedades de las que eres propietario"
      : "Administra las propiedades que tienes en alquiler");

  // Usar la consulta correspondiente al tipo de vista
  const query = tipoVista === "propiedades" ? GET_PROPIEDADES : GET_ALQUILERES;

  // Realizar la consulta
  const { data, loading, error } = useQuery(query, {
    variables: {
      documentId: user?.perfil_cliente?.documentId,
    },
    skip: !user?.perfil_cliente?.documentId,
    onError: (error) => {
      console.error(`Error en la consulta de ${tipoVista}:`, {
        message: error.message,
        networkError: error.networkError,
        graphQLErrors: error.graphQLErrors,
      });
    },
  });
  console.log(data);
  // Procesar datos según el tipo de vista
  const procesarDatos = () => {
    if (tipoVista === "propiedades") {
      if (!data?.perfilCliente?.propiedades) return [];
      
      return data.perfilCliente.propiedades.map((prop: any) => ({
        id: prop.documentId,
        lote: `${prop.identificadores?.inferior || ""} ${
          prop.identificadores?.idInferior || ""
        }`,
        name: `${prop.identificadores?.superior || ""} ${
          prop.identificadores?.idSuperior || ""
        }`,
        type:
          prop.actividad?.toLowerCase()?.includes("bodega") ||
          prop.identificadores?.superior?.toLowerCase()?.includes("bodega")
            ? "bodega"
            : "ofibodega",
        address: prop.actividad || "",
        totalAmount: prop.montoAlicuotaOrdinaria || 0,
        dueDate: new Date().toISOString().split("T")[0],
        isRented: prop.estadoUso === "enUso",
        image: prop.imagen?.url || "/bodega.png",
      }));
    } else {
      // Para alquileres, la estructura es diferente
      if (!data?.perfilCliente?.ocupante) return [];
      
      // Si hay un solo ocupante, lo convertimos en array
      const ocupantes = Array.isArray(data.perfilCliente.ocupante) 
        ? data.perfilCliente.ocupante 
        : [data.perfilCliente.ocupante];
      
      return ocupantes
        .filter((ocupante: any) => ocupante?.propiedad) // Filtrar entradas sin propiedad
        .map((ocupante: any) => {
          const prop = ocupante.propiedad;
          return {
            id: prop.documentId,
            lote: `${prop.identificadores?.inferior || ""} ${
              prop.identificadores?.idInferior || ""
            }`,
            name: `${prop.identificadores?.superior || ""} ${
              prop.identificadores?.idSuperior || ""
            }`,
            type:
              prop.actividad?.toLowerCase()?.includes("bodega") ||
              prop.identificadores?.superior?.toLowerCase()?.includes("bodega")
                ? "bodega"
                : "ofibodega",
            address: prop.actividad || "",
            totalAmount: prop.montoAlicuotaOrdinaria || 0,
            dueDate: new Date().toISOString().split("T")[0],
            isRented: true, // Si es un alquiler, siempre está en uso
            image: prop.imagen?.url || "/bodega.png",
          };
        });
    }
  };

  const propiedades = procesarDatos();

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar datos. Por favor, intente más tarde.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {tituloMostrado}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{descripcionMostrada}</p>
        </div>
     
      </div>

      {/* Contenido principal */}
      {propiedades.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {tipoVista === "propiedades"
              ? "No tienes propiedades registradas"
              : "No tienes propiedades en alquiler"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {tipoVista === "propiedades"
              ? "Comienza registrando tu primera propiedad"
              : "Explora propiedades disponibles para alquilar"}
          </p>
          <div className="mt-6">
            {tipoVista === "propiedades" ? (
              <Link href="/dashboard/agregar-propiedad">
                <button className="bg-[#008A4B] text-white px-4 py-2 rounded-md hover:bg-[#006837] transition-colors">
                  Agregar Propiedad
                </button>
              </Link>
            ) : (
              <Link href="/dashboard/buscar-propiedades">
                <button className="bg-[#008A4B] text-white px-4 py-2 rounded-md hover:bg-[#006837] transition-colors">
                  Buscar Propiedades
                </button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {propiedades.map((propiedad: any) => (
            <motion.div
              key={propiedad.id}
              className="bg-white rounded-xl overflow-hidden border group hover:shadow-lg transition-all duration-200"
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="relative h-48">
                <Image
                  src={propiedad.image || "/bodega.png"}
                  alt={propiedad.name}
                  fill
                  className="object-cover"
                />
                <span
                  className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
                    propiedad.isRented
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {propiedad.isRented ? "En uso" : "Disponible"}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-lg">{propiedad.name}</h3>
                <p className="text-gray-500 text-sm mb-1">{propiedad.lote}</p>
                <p className="text-gray-500 text-sm">{propiedad.address}</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      {tipoVista === "propiedades"
                        ? "Alícuota total:"
                        : "Monto mensual:"}
                    </span>
                    <span className="font-medium text-gray-900">
                      ${propiedad.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/${
                    tipoVista === "propiedades"
                      ? "mis-propiedades"
                      : "mi-alquiler"
                  }/${propiedad.id}`}
                  className="mt-4 inline-flex items-center text-[#008A4B] hover:text-[#006837] text-sm font-medium"
                >
                  Ver detalles
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Información adicional para la vista de alquiler
      {tipoVista === "alquiler" && propiedades.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información importante
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              • Los pagos de alícuotas deben realizarse antes de la fecha de
              vencimiento
            </li>
            <li>
              • Para cualquier consulta sobre los montos, contacte a la
              administración
            </li>
            <li>• Mantenga sus pagos al día para evitar recargos por mora</li>
            <li>
              • Cualquier modificación a la bodega debe ser consultada
              previamente
            </li>
          </ul>
        </div>
      )} */}
    </motion.div>
  );
}
