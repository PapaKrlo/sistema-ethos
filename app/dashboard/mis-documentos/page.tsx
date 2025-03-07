"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "../../_lib/auth/AuthContext"
import { gql, useQuery } from '@apollo/client'
import {
  DocumentIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from "@heroicons/react/24/outline"

// Consulta para obtener documentos del perfil cliente
const GET_CLIENT_DOCUMENTS = gql`
  query GetClientDocuments($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      documentId
      tipoPersona
      datosPersonaNatural {
        cedula
        razonSocial
        cedulaPdf {
          documentId
          nombre
          url
          fechaSubida
        }
        rucPdf {
          documentId
          nombre
          url
          fechaSubida
        }
      }
      datosPersonaJuridica {
        razonSocial
        nombreComercial
        rucPersonaJuridica {
          ruc
          rucPdf {
            documentId
            nombre
            url
            fechaSubida
          }
        }
        cedulaRepresentanteLegalPdf {
          documentId
          nombre
          url
          fechaSubida
        }
        nombramientoRepresentanteLegalPdf {
          documentId
          nombre
          url
          fechaSubida
        }
        empresaRepresentanteLegal {
          nombreComercial
          autorizacionRepresentacionPdf {
            documentId
            nombre
            url
            fechaSubida
          }
          cedulaRepresentanteLegalPdf {
            documentId
            nombre
            url
            fechaSubida
          }
          rucEmpresaRepresentanteLegal {
            ruc
            rucPdf {
              documentId
              nombre
              url
              fechaSubida
            }
          }
        }
      }
      propiedades {
        documentId
        identificadores {
          idInferior
          idSuperior
          inferior
          superior
        }
        escrituraPdf {
          documentId
          nombre
          url
          fechaSubida
        }
        actaEntregaPdf {
          documentId
          nombre
          url
          fechaSubida
        }
        contratoArrendamientoPdf {
          documentId
          nombre
          url
          fechaSubida
        }
      }
    }
  }
`;

interface Propiedad {
  documentId: string;
  identificadores?: {
    idInferior: string;
    idSuperior: string;
    inferior: string;
    superior: string;
  };
  escrituraPdf?: {
    documentId: string;
    nombre: string;
    url: string;
    fechaSubida: string;
  };
  actaEntregaPdf?: {
    documentId: string;
    nombre: string;
    url: string;
    fechaSubida: string;
  };
  contratoArrendamientoPdf?: {
    documentId: string;
    nombre: string;
    url: string;
    fechaSubida: string;
  };
}

interface Documento {
  documentId: string;
  nombre: string;
  url: string;
  fechaSubida: string;
  tipo: string;
  categoria: string;
  relacionadoCon?: string;
}

export default function MisDocumentosPage() {
  const { user, role } = useAuth()
  const router = useRouter()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [filtro, setFiltro] = useState<string>("todos")

  // Verificar si el usuario tiene un perfil de cliente
  const documentId = user?.perfil_cliente?.documentId

  const { data, loading, error } = useQuery(GET_CLIENT_DOCUMENTS, {
    variables: { documentId },
    skip: !documentId,
    onCompleted: (data) => {
      if (data?.perfilCliente) {
        const docsArray: Documento[] = []
        const perfil = data.perfilCliente

        // Procesar documentos de persona natural
        if (perfil.tipoPersona === "Natural" && perfil.datosPersonaNatural) {
          if (perfil.datosPersonaNatural.cedulaPdf) {
            docsArray.push({
              ...perfil.datosPersonaNatural.cedulaPdf,
              tipo: "Cédula",
              categoria: "Identificación"
            })
          }
          
          if (perfil.datosPersonaNatural.rucPdf) {
            docsArray.push({
              ...perfil.datosPersonaNatural.rucPdf,
              tipo: "RUC",
              categoria: "Identificación"
            })
          }
        }

        // Procesar documentos de persona jurídica
        if (perfil.tipoPersona === "Juridica" && perfil.datosPersonaJuridica) {
          if (perfil.datosPersonaJuridica.rucPersonaJuridica?.[0]?.rucPdf) {
            docsArray.push({
              ...perfil.datosPersonaJuridica.rucPersonaJuridica[0].rucPdf,
              tipo: "RUC",
              categoria: "Identificación"
            })
          }
          
          if (perfil.datosPersonaJuridica.cedulaRepresentanteLegalPdf) {
            docsArray.push({
              ...perfil.datosPersonaJuridica.cedulaRepresentanteLegalPdf,
              tipo: "Cédula Representante Legal",
              categoria: "Identificación"
            })
          }
          
          if (perfil.datosPersonaJuridica.nombramientoRepresentanteLegalPdf) {
            docsArray.push({
              ...perfil.datosPersonaJuridica.nombramientoRepresentanteLegalPdf,
              tipo: "Nombramiento Representante Legal",
              categoria: "Legal"
            })
          }
          
          // Documentos de empresa representante legal
          if (perfil.datosPersonaJuridica.empresaRepresentanteLegal) {
            const empresa = perfil.datosPersonaJuridica.empresaRepresentanteLegal
            
            if (empresa.autorizacionRepresentacionPdf) {
              docsArray.push({
                ...empresa.autorizacionRepresentacionPdf,
                tipo: "Autorización de Representación",
                categoria: "Legal"
              })
            }
            
            if (empresa.cedulaRepresentanteLegalPdf) {
              docsArray.push({
                ...empresa.cedulaRepresentanteLegalPdf,
                tipo: "Cédula Representante Legal (Empresa)",
                categoria: "Identificación"
              })
            }
            
            if (empresa.rucEmpresaRepresentanteLegal?.[0]?.rucPdf) {
              docsArray.push({
                ...empresa.rucEmpresaRepresentanteLegal[0].rucPdf,
                tipo: "RUC Empresa Representante Legal",
                categoria: "Identificación"
              })
            }
          }
        }

        // Procesar documentos de propiedades
        if (perfil.propiedades && perfil.propiedades.length > 0) {
          perfil.propiedades.forEach((propiedad: Propiedad) => {
            const identificador = `${propiedad.identificadores?.superior || ''} ${propiedad.identificadores?.idSuperior || ''} - ${propiedad.identificadores?.inferior || ''} ${propiedad.identificadores?.idInferior || ''}`
            
            if (propiedad.escrituraPdf) {
              docsArray.push({
                ...propiedad.escrituraPdf,
                tipo: "Escritura",
                categoria: "Propiedad",
                relacionadoCon: identificador.trim()
              })
            }
            
            if (propiedad.actaEntregaPdf) {
              docsArray.push({
                ...propiedad.actaEntregaPdf,
                tipo: "Acta de Entrega",
                categoria: "Propiedad",
                relacionadoCon: identificador.trim()
              })
            }
            
            if (propiedad.contratoArrendamientoPdf) {
              docsArray.push({
                ...propiedad.contratoArrendamientoPdf,
                tipo: "Contrato de Arrendamiento",
                categoria: "Propiedad",
                relacionadoCon: identificador.trim()
              })
            }
          })
        }

        setDocumentos(docsArray)
      }
    }
  })

  // Redirigir si el usuario no es propietario o arrendatario
  useEffect(() => {
    if (role !== "Propietario" && role !== "Arrendatario") {
      router.push("/dashboard")
    }
  }, [role, router])

  if (role !== "Propietario" && role !== "Arrendatario") return null

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error al cargar los documentos. Por favor, intente más tarde.
      </div>
    )
  }

  const documentosFiltrados = filtro === "todos" 
    ? documentos 
    : documentos.filter(doc => doc.categoria === filtro)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mis Documentos</h1>
      
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFiltro("todos")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filtro === "todos" 
              ? "bg-[#008A4B] text-white" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFiltro("Identificación")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filtro === "Identificación" 
              ? "bg-[#008A4B] text-white" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Identificación
        </button>
        <button
          onClick={() => setFiltro("Legal")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filtro === "Legal" 
              ? "bg-[#008A4B] text-white" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Legal
        </button>
        <button
          onClick={() => setFiltro("Propiedad")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filtro === "Propiedad" 
              ? "bg-[#008A4B] text-white" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Propiedad
        </button>
      </div>
      
      {documentosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay documentos</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron documentos en esta categoría.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Relacionado Con
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentosFiltrados.map((documento) => (
                  <tr key={documento.documentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <DocumentIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{documento.nombre || "Documento sin nombre"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{documento.tipo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        documento.categoria === "Identificación" 
                          ? "bg-blue-100 text-blue-800" 
                          : documento.categoria === "Legal" 
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                      }`}>
                        {documento.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{documento.relacionadoCon || "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {documento.fechaSubida 
                          ? new Date(documento.fechaSubida).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }) 
                          : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-3">
                        <a 
                          href={documento.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#008A4B] hover:text-[#006837] inline-flex items-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Ver
                        </a>
                        <a 
                          href={documento.url} 
                          download 
                          className="text-[#008A4B] hover:text-[#006837] inline-flex items-center"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                          Descargar
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
} 