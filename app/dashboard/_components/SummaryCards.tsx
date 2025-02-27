'use client'

import { motion } from "framer-motion"
import { ArrowRightIcon } from "@heroicons/react/24/outline"
import { PieChart, Pie, ResponsiveContainer, Cell } from "recharts"
import type { UserRole } from '../../_lib/auth/AuthContext'
import { useAuth } from '../../_lib/auth/AuthContext'
import { gql, useQuery } from '@apollo/client'
import Image from 'next/image'
import Link from 'next/link'

const GET_CLIENT_PROPERTIES = gql`
  query GetClientProperties($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      propiedades {
        documentId
        tipoPropiedad
        numeroPropiedad
        estadoUso
        estadoOcupacion
        metraje
        areaUtil
        areaTotal
        tipoUso
      }
    }
  }
`;

const GET_ALMAX2_PROPERTIES = gql`
  query GetAlmax2Properties {
    propiedades(where: { proyecto: { nombre: { equals: "Almax 2" } } }) {
      documentId
      estadoUso
      estadoOcupacion
      escrituraPdf {
        documentId
      }
      actaEntregaPdf {
        documentId
      }
      contratoArrendamientoPdf {
        documentId
      }
      propietario {
        datosPersonaJuridica {
          cedulaRepresentanteLegalPdf {
            documentId
          }
          nombramientoRepresentanteLegalPdf {
            documentId
          }
          rucPersonaJuridica {
            rucPdf {
              documentId
            }
          }
          representanteLegalEsEmpresa
          empresaRepresentanteLegal {
            autorizacionRepresentacionPdf {
              documentId
            }
            cedulaRepresentanteLegalPdf {
              documentId
            }
            rucEmpresaRepresentanteLegal {
              rucPdf {
                documentId
              }
            }
          }
        }
        datosPersonaNatural {
          cedulaPdf {
            documentId
          }
          rucPdf {
            documentId
          }
          aplicaRuc
        }
        tipoPersona
      }
      ocupantes {
        tipoOcupante
      }
    }
  }
`;

interface SummaryCardsProps {
  role: UserRole
}

interface ChartData {
  name: string
  value: number
}

interface Chart {
  title: string
  subtitle: string
  value: string
  data: ChartData[]
}

interface Property {
  id: string
  name: string
  location: string
  area: string
  status?: string
  image: string
}

interface PropertyData {
  documentId: string
  tipoPropiedad: string
  numeroPropiedad: string
  estadoUso: string
  estadoOcupacion: string
  metraje: number
  areaUtil: number
  areaTotal: number
  tipoUso: string
}

interface Almax2Property {
  documentId: string;
  estadoUso: string;
  estadoOcupacion: string;
  escrituraPdf?: { documentId: string };
  actaEntregaPdf?: { documentId: string };
  contratoArrendamientoPdf?: { documentId: string };
  propietario?: {
    datosPersonaJuridica?: {
      cedulaRepresentanteLegalPdf?: { documentId: string };
      nombramientoRepresentanteLegalPdf?: { documentId: string };
      rucPersonaJuridica?: Array<{
        rucPdf?: { documentId: string };
      }>;
      representanteLegalEsEmpresa: boolean;
      empresaRepresentanteLegal?: {
        autorizacionRepresentacionPdf?: { documentId: string };
        cedulaRepresentanteLegalPdf?: { documentId: string };
        rucEmpresaRepresentanteLegal?: Array<{
          rucPdf?: { documentId: string };
        }>;
      };
    };
    datosPersonaNatural?: {
      cedulaPdf?: { documentId: string };
      rucPdf?: { documentId: string };
      aplicaRuc: boolean;
    };
    tipoPersona: string;
  };
  ocupantes?: Array<{
    tipoOcupante: string;
  }>;
}

type RoleData = {
  charts?: Chart[]
  properties?: Property[]
}

// Datos de ejemplo para los charts - esto se mantiene para los roles operativos
const mockData: Record<string, RoleData> = {
  'jefeoperativo': {
    charts: [
      {
        title: "Propiedades activas",
        subtitle: "95% de ocupación",
        value: "195 / 205",
        data: [
          { name: "Ocupadas", value: 195 },
          { name: "Disponibles", value: 10 }
        ]
      }
    ]
  },
  'administrador': {
    charts: [
      {
        title: "Propiedades activas",
        subtitle: "95% de ocupación",
        value: "195 / 205",
        data: [
          { name: "Ocupadas", value: 195 },
          { name: "Disponibles", value: 10 }
        ]
      },
      {
        title: "Solicitudes pendientes",
        subtitle: "100% por resolver",
        value: "3 / 3",
        data: [
          { name: "Pendientes", value: 3 }
        ]
      }
    ]
  },
  'directorio': {
    charts: [
      {
        title: "Propiedades activas",
        subtitle: "95% de ocupación",
        value: "195 / 205",
        data: [
          { name: "Ocupadas", value: 195 },
          { name: "Disponibles", value: 10 }
        ]
      },
      {
        title: "Solicitudes pendientes",
        subtitle: "100% por resolver",
        value: "3 / 3",
        data: [
          { name: "Pendientes", value: 3 }
        ]
      }
    ]
  }
};

const statusColors: Record<string, string> = {
  'En venta': 'bg-emerald-100 text-emerald-800',
  'En renta': 'bg-blue-100 text-blue-800',
  'Arrendada': 'bg-gray-100 text-gray-800'
};

export function SummaryCards({ role }: SummaryCardsProps) {
  const { user } = useAuth();
  const roleKey = role.toLowerCase().replace(/\s+/g, '');

  console.log('SummaryCards - User:', user);
  console.log('SummaryCards - Role:', role);
  console.log('SummaryCards - RoleKey:', roleKey);
  console.log('SummaryCards - DocumentId:', user?.perfil_cliente?.documentId);

  // Consulta para propiedades de Almax 2
  const { data: almax2Data, loading: almax2Loading } = useQuery(GET_ALMAX2_PROPERTIES, {
    skip: roleKey !== 'jefeoperativo' && roleKey !== 'administrador' && roleKey !== 'directorio'
  });

  // Consulta GraphQL para obtener las propiedades del cliente
  const { data: clientData, loading: clientLoading, error } = useQuery(GET_CLIENT_PROPERTIES, {
    variables: { 
      documentId: user?.perfil_cliente?.documentId 
    },
    skip: !user?.perfil_cliente?.documentId || (roleKey !== 'propietario' && roleKey !== 'arrendatario')
  });

  // Calcular estadísticas de Almax 2
  const calculateAlmax2Stats = () => {
    if (!almax2Data?.propiedades) return null;

    const properties = almax2Data.propiedades as Almax2Property[];
    const totalProperties = properties.length;
    const occupiedProperties = properties.filter((p: Almax2Property) => p.estadoUso === 'enUso').length;

    // Calcular porcentaje de documentos subidos
    let totalRequiredDocs = 0;
    let totalUploadedDocs = 0;

    properties.forEach((property: Almax2Property) => {
      // Documentos de la propiedad
      const baseRequiredDocs = 2; // escritura y acta de entrega
      const needsArrendamientoDoc = property.ocupantes?.some(
        (ocupante) => ocupante.tipoOcupante === "arrendatario"
      );
      const propertyRequiredDocs = baseRequiredDocs + (needsArrendamientoDoc ? 1 : 0);
      
      let propertyUploadedDocs = [
        property.escrituraPdf,
        property.actaEntregaPdf,
        needsArrendamientoDoc ? property.contratoArrendamientoPdf : null
      ].filter(Boolean).length;

      // Documentos del propietario
      if (property.propietario?.datosPersonaJuridica) {
        const isEmpresaRL = property.propietario.datosPersonaJuridica.representanteLegalEsEmpresa;
        
        // Calcular documentos requeridos
        if (isEmpresaRL) {
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
          
          const propietarioRequiredDocs = 2 + // Autorización + Cédula del representante legal de la empresa RL
                                        cantidadRucsPersonaJuridica + // Todos los RUCs de persona jurídica
                                        cantidadRucsEmpresaRL; // Todos los RUCs de empresa representante legal
          
          // Documentos subidos
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
          
          const propietarioUploadedDocs = docsSubidos.filter(Boolean).length;
          
          totalRequiredDocs += propietarioRequiredDocs;
          totalUploadedDocs += propietarioUploadedDocs;
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
          
          const propietarioRequiredDocs = 2 + // Nombramiento + Cédula del representante legal
                                        cantidadRucsPersonaJuridica; // Todos los RUCs de persona jurídica
          
          // Documentos subidos
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
          
          const propietarioUploadedDocs = docsSubidos.filter(Boolean).length;
          
          totalRequiredDocs += propietarioRequiredDocs;
          totalUploadedDocs += propietarioUploadedDocs;
        }
      } else if (property.propietario?.datosPersonaNatural) {
        const propietarioRequiredDocs = 1 + (property.propietario.datosPersonaNatural.aplicaRuc ? 1 : 0);
        const propietarioUploadedDocs = [
          property.propietario.datosPersonaNatural.cedulaPdf,
          property.propietario.datosPersonaNatural.aplicaRuc ? property.propietario.datosPersonaNatural.rucPdf : null
        ].filter(Boolean).length;

        totalRequiredDocs += propietarioRequiredDocs;
        totalUploadedDocs += propietarioUploadedDocs;
      }

      totalRequiredDocs += propertyRequiredDocs;
      totalUploadedDocs += propertyUploadedDocs;
    });

    const docsPercentage = totalRequiredDocs > 0 ? (totalUploadedDocs / totalRequiredDocs) * 100 : 0;

    return {
      totalProperties,
      occupiedProperties,
      docsPercentage: Math.round(docsPercentage)
    };
  };

  // Si estamos cargando datos
  if (clientLoading || almax2Loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  // Si hay un error en la consulta
  if (error) {
    console.error('Error al cargar las propiedades:', error);
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar las propiedades. Por favor, intente más tarde.
      </div>
    );
  }

  // Para roles operativos, mostrar estadísticas de Almax 2
  if (roleKey === 'jefeoperativo' || roleKey === 'administrador' || roleKey === 'directorio') {
    const almax2Stats = calculateAlmax2Stats();
    if (!almax2Stats) return null;

    const charts = [
      {
        title: "Propiedades Almax 2",
        subtitle: `${Math.round((almax2Stats.occupiedProperties / almax2Stats.totalProperties) * 100)}% de ocupación`,
        value: `${almax2Stats.occupiedProperties} / ${almax2Stats.totalProperties}`,
        data: [
          { name: "Ocupadas", value: almax2Stats.occupiedProperties },
          { name: "Disponibles", value: almax2Stats.totalProperties - almax2Stats.occupiedProperties }
        ]
      },
      {
        title: "Documentación",
        subtitle: "Estado de documentos",
        value: `${almax2Stats.docsPercentage}% completado`,
        data: [
          { name: "Completado", value: almax2Stats.docsPercentage },
          { name: "Pendiente", value: 100 - almax2Stats.docsPercentage }
        ]
      }
    ];

    return (
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart, index) => (
          <div 
            key={index}
            className="bg-white rounded-2xl border p-8 group hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-medium">{chart.title}</h2>
              <p className="text-gray-500 text-md mt-2">{chart.subtitle}</p>
              <div className="text-3xl font-light my-8">{chart.value}</div>
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chart.data}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={90}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {chart.data.map((entry, index) => (
                        <Cell 
                          key={index} 
                          fill={index === 0 ? "#024728" : "#E5E7EB"} 
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <motion.button 
                className="mt-8 flex items-center gap-2 text-gray-600 hover:text-[#008A4B] text-base font-medium group-hover:text-[#008A4B] transition-colors"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                Ver detalles
                <ArrowRightIcon className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        ))}
      </motion.div>
    );
  }

  // Para propietarios y arrendatarios que ven sus propiedades
  const properties: Property[] = clientData?.perfilCliente?.propiedades?.map((prop: PropertyData) => ({
    id: prop.documentId,
    name: `${prop.tipoPropiedad} ${prop.numeroPropiedad}`,
    location: prop.tipoUso,
    area: `${prop.areaTotal} m²`,
    status: prop.estadoOcupacion,
    image: '/bodega.png'
  })) || [];

  if (properties.length === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        No se encontraron propiedades asociadas a tu perfil.
      </div>
    );
  }

  return (
    <motion.div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Tus propiedades</h2>
        <Link 
          href={roleKey === 'propietario' ? "/dashboard/mis-propiedades" : "/dashboard/mi-alquiler"}
          className="text-[#008A4B] hover:text-[#006837] text-sm font-medium"
        >
          Ver todas
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <motion.div
            key={property.id}
            className="bg-white rounded-xl overflow-hidden border group hover:shadow-lg transition-all duration-200"
            whileHover={{ y: -4 }}
          >
            <div className="relative h-48">
              <Image
                src={property.image}
                alt={property.name}
                fill
                className="object-cover"
              />
              {property.status && (
                <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
                  {property.status}
                </span>
              )}
              <div className="absolute top-4 left-4 bg-white/90 px-2 py-1 rounded text-xs font-medium">
                {property.area}
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold">{property.name}</h3>
              <p className="text-gray-500 text-sm">{property.location}</p>
              <Link 
                href={`/dashboard/${roleKey === 'propietario' ? 'mis-propiedades' : 'mi-alquiler'}/${property.id}`}
                className="mt-4 text-[#008A4B] hover:text-[#006837] text-sm font-medium flex items-center gap-2"
              >
                Ver detalles
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
} 