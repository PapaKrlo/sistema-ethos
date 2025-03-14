"use client"

import { useState, useEffect } from "react"
import { gql, useQuery } from '@apollo/client'
import { 
  DocumentArrowDownIcon, 
  MagnifyingGlassIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline"
import { Button } from "../../../_components/ui/button"
import { Input } from "../../../_components/ui/input"
import { Checkbox } from "../../../_components/ui/checkbox"
import type { UserRole } from '../../../_lib/auth/AuthContext'
import { utils, writeFile } from 'xlsx'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../_components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../_components/ui/tooltip"

// Consultas GraphQL
const GET_PROPIEDADES_PROYECTO_DOCUMENTOS = gql`
  query GetPropiedadesProyectoDocumentos($documentId: ID!) {
    proyecto(documentId: $documentId) {
      nombre
      propiedades(pagination: { limit: -1 }) {
        documentId
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
        actaEntregaPdf {
          documentId
          url
          fechaSubida
          nombre
        }
        escrituraPdf {
          documentId
          url
          fechaSubida
          nombre
        }
        contratoArrendamientoPdf {
          documentId
          url
          fechaSubida
          nombre
        }
        propietario {
          documentId
          tipoPersona
          datosPersonaNatural {
            cedula
            razonSocial
            cedulaPdf {
              documentId
              url
              fechaSubida
              nombre
            }
            rucPdf {
              documentId
              url
              fechaSubida
              nombre
            }
          }
          datosPersonaJuridica {
            razonSocial
            rucPersonaJuridica {
              ruc
              rucPdf {
                documentId
                url
                fechaSubida
                nombre
              }
            }
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
          }
        }
        ocupantes {
          tipoOcupante
          perfilCliente {
          datosPersonaNatural {
            razonSocial
            cedulaPdf {
              documentId
              url
              fechaSubida
              nombre
            }
            rucPdf {
              documentId
              url
              fechaSubida
              nombre
            }
          }
          datosPersonaJuridica {
            razonSocial
            rucPersonaJuridica {
              ruc
              rucPdf {
                documentId
                url
                fechaSubida
                nombre
              }
            }
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
            }
          }
          datosPersonaNatural {
            razonSocial
            cedulaPdf {
              documentId
              url
              fechaSubida
              nombre
            }
            rucPdf {
              documentId
              url
              fechaSubida
              nombre
            }
          }
          datosPersonaJuridica {
            razonSocial
            rucPersonaJuridica {
              ruc
              rucPdf {
                documentId
                url
                fechaSubida
                nombre
              }
            }
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
          }
        }
      }
    }
  }
`;

const GET_TODOS_PROYECTOS_DOCUMENTOS = gql`
  query GetTodosProyectosDocumentos {
    proyectos(pagination: { limit: 100 }) {
      documentId
      nombre
      propiedades(pagination: { limit: -1 }) {
        documentId
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
        actaEntregaPdf {
          documentId
          url
          fechaSubida
          nombre
        }
        escrituraPdf {
          documentId
          url
          fechaSubida
          nombre
        }
        contratoArrendamientoPdf {
          documentId
          url
          fechaSubida
          nombre
        }
        propietario {
          documentId
          tipoPersona
          datosPersonaNatural {
            cedula
            razonSocial
            cedulaPdf {
              documentId
              url
              fechaSubida
              nombre
            }
            rucPdf {
              documentId
              url
              fechaSubida
              nombre
            }
          }
          datosPersonaJuridica {
            razonSocial
            rucPersonaJuridica {
              ruc
              rucPdf {
                documentId
                url
                fechaSubida
                nombre
              }
            }
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
          }
        }
        ocupantes {
          tipoOcupante
          datosPersonaNatural {
            razonSocial
            cedulaPdf {
              documentId
              url
              fechaSubida
              nombre
            }
            rucPdf {
              documentId
              url
              fechaSubida
              nombre
            }
          }
          datosPersonaJuridica {
            razonSocial
            rucPersonaJuridica {
              ruc
              rucPdf {
                documentId
                url
                fechaSubida
                nombre
              }
            }
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
          }
          perfilCliente {
            datosPersonaNatural {
              razonSocial
              cedulaPdf {
                documentId
                url
                fechaSubida
                nombre
              }
              rucPdf {
                documentId
                url
                fechaSubida
                nombre
              }
            }
            datosPersonaJuridica {
              razonSocial
              rucPersonaJuridica {
                ruc
                rucPdf {
                  documentId
                  url
                  fechaSubida
                  nombre
                }
              }
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
            }
          }
        }
      }
    }
  }
`;

// Tipos para la propiedad
interface DocumentoPropiedad {
  tipo: string
  nombre: string
  presente: boolean
  url?: string
  documentId?: string
}

interface PropiedadDocumentos {
  documentId: string
  lote: string
  idLote: string
  bodega: string
  idBodega: string
  nombrePropietario: string
  nombreOcupante: string
  tipoOcupante: string
  estaArrendada: boolean
  proyecto: string
  documentos: DocumentoPropiedad[]
  porcentajeCompletitudPropiedad: number
  porcentajeCompletitudPropietario: number
  porcentajeCompletitudArrendatario: number
  porcentajeCompletitudTotal: number
  seleccionada?: boolean
}

// Props del componente
interface ReporteDocumentosProps {
  proyectoId: string
  unidadNegocioId: string
  role: UserRole | null
}

export function ReporteDocumentos({ proyectoId, unidadNegocioId, role }: ReporteDocumentosProps) {
  const [propiedadesDocumentos, setPropiedadesDocumentos] = useState<PropiedadDocumentos[]>([])
  const [propiedadesFiltradas, setPropiedadesFiltradas] = useState<PropiedadDocumentos[]>([])
  const [propiedadesSeleccionadas, setPropiedadesSeleccionadas] = useState<string[]>([])
  const [todasSeleccionadas, setTodasSeleccionadas] = useState<boolean>(false)
  const [busqueda, setBusqueda] = useState<string>("")
  const [cargando, setCargando] = useState<boolean>(false)
  
  // Porcentajes de completitud totales
  const [porcentajeTotalPropiedad, setPorcentajeTotalPropiedad] = useState<number>(0)
  const [porcentajeTotalPropietario, setPorcentajeTotalPropietario] = useState<number>(0)
  const [porcentajeTotalArrendatario, setPorcentajeTotalArrendatario] = useState<number>(0)
  const [porcentajeTotalGeneral, setPorcentajeTotalGeneral] = useState<number>(0)

  // Consulta GraphQL según el rol y los filtros seleccionados
  const { data: dataProyecto, loading: loadingProyecto } = useQuery(GET_PROPIEDADES_PROYECTO_DOCUMENTOS, {
    variables: { documentId: proyectoId },
    skip: !proyectoId
  })

  const { data: dataTodos, loading: loadingTodos } = useQuery(GET_TODOS_PROYECTOS_DOCUMENTOS, {
    skip: !!proyectoId || (role !== 'Directorio' && role !== 'Administrador')
  })

  // Procesar datos de documentos
  useEffect(() => {
    const procesarDocumentosPropiedades = (propiedades: any[], nombreProyecto: string = "") => {
      return propiedades.map(propiedad => {
        // Identificadores de la propiedad
        const identificadores = propiedad.identificadores || {}
        
        // Datos del propietario
        const propietario = propiedad.propietario || {}
        let nombrePropietario = ""
        
        if (propietario.tipoPersona === "Natural" && propietario.datosPersonaNatural) {
          nombrePropietario = propietario.datosPersonaNatural.razonSocial || ""
        } else if (propietario.tipoPersona === "Juridica" && propietario.datosPersonaJuridica) {
          nombrePropietario = propietario.datosPersonaJuridica.razonSocial || ""
        }
        
        // Verificar si la propiedad está arrendada
        const estaArrendada = propiedad.ocupantes?.some((o: any) => o.tipoOcupante === "arrendatario")
        
        // Datos del ocupante (solo arrendatarios)
        let ocupante: any = {}
        let nombreOcupante = ""
        let tipoOcupante = ""
        
        // Si está arrendada, necesitamos encontrar el ocupante de tipo arrendatario
        if (estaArrendada && propiedad.ocupantes?.length > 0) {
          // Encontrar el ocupante de tipo arrendatario
          ocupante = propiedad.ocupantes.find((o: any) => o.tipoOcupante === "arrendatario") || {}
          tipoOcupante = ocupante.tipoOcupante || ""
          
          // Extraer el nombre del ocupante según su tipo
          if (ocupante.datosPersonaNatural) {
            nombreOcupante = ocupante.datosPersonaNatural.razonSocial || ""
          } else if (ocupante.datosPersonaJuridica) {
            nombreOcupante = ocupante.datosPersonaJuridica.razonSocial || ""
          } else if (ocupante.perfilCliente) {
            if (ocupante.perfilCliente.datosPersonaNatural) {
              nombreOcupante = ocupante.perfilCliente.datosPersonaNatural.razonSocial || ""
            } else if (ocupante.perfilCliente.datosPersonaJuridica) {
              nombreOcupante = ocupante.perfilCliente.datosPersonaJuridica.razonSocial || ""
            }
          }
        }
        
        // Documentos requeridos según el tipo de persona y ocupante
        const documentos: DocumentoPropiedad[] = []
        
        // 1. DOCUMENTOS DE LA PROPIEDAD
        documentos.push({
          tipo: 'propiedad',
          nombre: 'Escritura',
          presente: !!propiedad.escrituraPdf?.documentId,
          url: propiedad.escrituraPdf?.url,
          documentId: propiedad.escrituraPdf?.documentId
        })
        
        documentos.push({
          tipo: 'propiedad',
          nombre: 'Acta de Entrega',
          presente: !!propiedad.actaEntregaPdf?.documentId,
          url: propiedad.actaEntregaPdf?.url,
          documentId: propiedad.actaEntregaPdf?.documentId
        })
        
        // 1.3 Contrato de arrendamiento (solo si está arrendada)
        if (estaArrendada) {
          console.log('Añadiendo contrato arrendamiento:', {
            propiedad: propiedad.documentId,
            contratoExiste: !!propiedad.contratoArrendamientoPdf?.documentId
          });
          
          documentos.push({
            tipo: 'propiedad',
            nombre: 'Contrato Arrendamiento',
            presente: !!propiedad.contratoArrendamientoPdf?.documentId,
            url: propiedad.contratoArrendamientoPdf?.url,
            documentId: propiedad.contratoArrendamientoPdf?.documentId
          })
        }
        
        // 2. DOCUMENTOS DEL PROPIETARIO
        if (propietario.tipoPersona === "Natural") {
          // 2.1 Para personas naturales
          documentos.push({
            tipo: 'propietario',
            nombre: 'Cédula',
            presente: !!propietario.datosPersonaNatural?.cedulaPdf?.documentId,
            url: propietario.datosPersonaNatural?.cedulaPdf?.url,
            documentId: propietario.datosPersonaNatural?.cedulaPdf?.documentId
          })
          
          // Solo si aplica RUC
          if (propietario.datosPersonaNatural?.aplicaRuc) {
            documentos.push({
              tipo: 'propietario',
              nombre: 'RUC',
              presente: !!propietario.datosPersonaNatural?.rucPdf?.documentId,
              url: propietario.datosPersonaNatural?.rucPdf?.url,
              documentId: propietario.datosPersonaNatural?.rucPdf?.documentId
            })
          }
        } else if (propietario.tipoPersona === "Juridica") {
          // RUC siempre es requerido para personas jurídicas
          const rucs = propietario.datosPersonaJuridica?.rucPersonaJuridica || []
          if (rucs.length > 0) {
            rucs.forEach((ruc: any, index: number) => {
              documentos.push({
                tipo: 'propietario',
                nombre: `RUC${rucs.length > 1 ? ` ${index + 1}` : ''}`,
                presente: !!ruc.rucPdf?.documentId,
                url: ruc.rucPdf?.url,
                documentId: ruc.rucPdf?.documentId
              })
            })
          } else {
            documentos.push({
              tipo: 'propietario',
              nombre: 'RUC',
              presente: false
            })
          }
          
          if (propietario.datosPersonaJuridica?.representanteLegalEsEmpresa) {
            // 2.2.2 Para personas jurídicas con representante legal que es empresa
            documentos.push({
              tipo: 'propietario',
              nombre: 'Autorización Representación',
              presente: !!propietario.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.documentId,
              url: propietario.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.url,
              documentId: propietario.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.documentId
            })
            
            documentos.push({
              tipo: 'propietario',
              nombre: 'Cédula RL',
              presente: !!propietario.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.documentId,
              url: propietario.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.url,
              documentId: propietario.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.documentId
            })
            
            // RUC de la empresa representante legal
            const rucsEmpresaRL = propietario.datosPersonaJuridica?.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal || []
            if (rucsEmpresaRL.length > 0) {
              rucsEmpresaRL.forEach((ruc: any, index: number) => {
                documentos.push({
                  tipo: 'propietario',
                  nombre: `RUC RL${rucsEmpresaRL.length > 1 ? ` ${index + 1}` : ''}`,
                  presente: !!ruc.rucPdf?.documentId,
                  url: ruc.rucPdf?.url,
                  documentId: ruc.rucPdf?.documentId
                })
              })
            } else {
              documentos.push({
                tipo: 'propietario',
                nombre: 'RUC RL',
                presente: false
              })
            }
          } else {
            // 2.2.1 Para personas jurídicas con representante legal que es persona natural
            documentos.push({
              tipo: 'propietario',
              nombre: 'Cédula RL',
              presente: !!propietario.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.documentId,
              url: propietario.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.url,
              documentId: propietario.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.documentId
            })
            
            documentos.push({
              tipo: 'propietario',
              nombre: 'Nombramiento RL',
              presente: !!propietario.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.documentId,
              url: propietario.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.url,
              documentId: propietario.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.documentId
            })
          }
        }
        
        // 3. DOCUMENTOS DEL ARRENDATARIO
        if (estaArrendada && ocupante) {
          console.log('Procesando documentos arrendatario:', {
            ocupante,
            tipoOcupante,
            nombreOcupante,
            tieneDataPersonaNatural: !!ocupante.datosPersonaNatural,
            tieneDataPersonaJuridica: !!ocupante.datosPersonaJuridica,
            tienePerfilCliente: !!ocupante.perfilCliente,
            perfilCliente: {
              tieneDataPersonaNatural: !!ocupante.perfilCliente?.datosPersonaNatural,
              tieneDataPersonaJuridica: !!ocupante.perfilCliente?.datosPersonaJuridica,
              razonSocial: ocupante.perfilCliente?.datosPersonaJuridica?.razonSocial || 
                          ocupante.perfilCliente?.datosPersonaNatural?.razonSocial
            }
          });
          
          // Verificar el tipo de arrendatario
          if (ocupante.datosPersonaNatural) {
            // 3.1 Arrendatario persona natural
            documentos.push({
              tipo: 'arrendatario',
              nombre: 'Cédula Arrendatario',
              presente: !!ocupante.datosPersonaNatural?.cedulaPdf?.documentId,
              url: ocupante.datosPersonaNatural?.cedulaPdf?.url,
              documentId: ocupante.datosPersonaNatural?.cedulaPdf?.documentId
            })
            
            // Solo si aplica RUC
            if (ocupante.datosPersonaNatural?.aplicaRuc) {
              documentos.push({
                tipo: 'arrendatario',
                nombre: 'RUC Arrendatario',
                presente: !!ocupante.datosPersonaNatural?.rucPdf?.documentId,
                url: ocupante.datosPersonaNatural?.rucPdf?.url,
                documentId: ocupante.datosPersonaNatural?.rucPdf?.documentId
              })
            }
          } else if (ocupante.datosPersonaJuridica) {
            // 3.2 Arrendatario persona jurídica
            // RUC siempre es requerido para personas jurídicas
            const rucs = ocupante.datosPersonaJuridica?.rucPersonaJuridica || []
            if (rucs.length > 0) {
              rucs.forEach((ruc: any, index: number) => {
                documentos.push({
                  tipo: 'arrendatario',
                  nombre: `RUC Arrendatario${rucs.length > 1 ? ` ${index + 1}` : ''}`,
                  presente: !!ruc.rucPdf?.documentId,
                  url: ruc.rucPdf?.url,
                  documentId: ruc.rucPdf?.documentId
                })
              })
            } else {
              documentos.push({
                tipo: 'arrendatario',
                nombre: 'RUC Arrendatario',
                presente: false
              })
            }
            
            if (ocupante.datosPersonaJuridica?.representanteLegalEsEmpresa) {
              // 3.2.2 Arrendatario persona jurídica con representante legal que es empresa
              documentos.push({
                tipo: 'arrendatario',
                nombre: 'Autorización Representación Arrendatario',
                presente: !!ocupante.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.documentId,
                url: ocupante.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.url,
                documentId: ocupante.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.documentId
              })
              
              documentos.push({
                tipo: 'arrendatario',
                nombre: 'Cédula RL Arrendatario',
                presente: !!ocupante.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.documentId,
                url: ocupante.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.url,
                documentId: ocupante.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.documentId
              })
              
              // RUC de la empresa representante legal del arrendatario
              const rucsEmpresaRL = ocupante.datosPersonaJuridica?.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal || []
              if (rucsEmpresaRL.length > 0) {
                rucsEmpresaRL.forEach((ruc: any, index: number) => {
                  documentos.push({
                    tipo: 'arrendatario',
                    nombre: `RUC RL Arrendatario${rucsEmpresaRL.length > 1 ? ` ${index + 1}` : ''}`,
                    presente: !!ruc.rucPdf?.documentId,
                    url: ruc.rucPdf?.url,
                    documentId: ruc.rucPdf?.documentId
                  })
                })
              } else {
                documentos.push({
                  tipo: 'arrendatario',
                  nombre: 'RUC RL Arrendatario',
                  presente: false
                })
              }
            } else {
              // 3.2.1 Arrendatario persona jurídica con representante legal que es persona natural
              documentos.push({
                tipo: 'arrendatario',
                nombre: 'Cédula RL Arrendatario',
                presente: !!ocupante.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.documentId,
                url: ocupante.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.url,
                documentId: ocupante.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.documentId
              })
              
              documentos.push({
                tipo: 'arrendatario',
                nombre: 'Nombramiento RL Arrendatario',
                presente: !!ocupante.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.documentId,
                url: ocupante.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.url,
                documentId: ocupante.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.documentId
              })
            }
          } else if (ocupante.perfilCliente) {
            // 3.3 Ocupante con perfilCliente
            if (ocupante.perfilCliente.datosPersonaNatural) {
              // Perfil cliente persona natural
              documentos.push({
                tipo: 'arrendatario',
                nombre: 'Cédula Arrendatario',
                presente: !!ocupante.perfilCliente.datosPersonaNatural?.cedulaPdf?.documentId,
                url: ocupante.perfilCliente.datosPersonaNatural?.cedulaPdf?.url,
                documentId: ocupante.perfilCliente.datosPersonaNatural?.cedulaPdf?.documentId
              })
              
              // Solo si aplica RUC
              if (ocupante.perfilCliente.datosPersonaNatural?.aplicaRuc) {
                documentos.push({
                  tipo: 'arrendatario',
                  nombre: 'RUC Arrendatario',
                  presente: !!ocupante.perfilCliente.datosPersonaNatural?.rucPdf?.documentId,
                  url: ocupante.perfilCliente.datosPersonaNatural?.rucPdf?.url,
                  documentId: ocupante.perfilCliente.datosPersonaNatural?.rucPdf?.documentId
                })
              }
            } else if (ocupante.perfilCliente.datosPersonaJuridica) {
              // Perfil cliente persona jurídica
              const rucs = ocupante.perfilCliente.datosPersonaJuridica?.rucPersonaJuridica || []
              if (rucs.length > 0) {
                rucs.forEach((ruc: any, index: number) => {
                  documentos.push({
                    tipo: 'arrendatario',
                    nombre: `RUC Arrendatario${rucs.length > 1 ? ` ${index + 1}` : ''}`,
                    presente: !!ruc.rucPdf?.documentId,
                    url: ruc.rucPdf?.url,
                    documentId: ruc.rucPdf?.documentId
                  })
                })
              } else {
                documentos.push({
                  tipo: 'arrendatario',
                  nombre: 'RUC Arrendatario',
                  presente: false
                })
              }
              
              if (ocupante.perfilCliente.datosPersonaJuridica?.representanteLegalEsEmpresa) {
                // Perfil cliente persona jurídica con representante legal que es empresa
                documentos.push({
                  tipo: 'arrendatario',
                  nombre: 'Autorización Representación Arrendatario',
                  presente: !!ocupante.perfilCliente.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.documentId,
                  url: ocupante.perfilCliente.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.url,
                  documentId: ocupante.perfilCliente.datosPersonaJuridica?.empresaRepresentanteLegal?.autorizacionRepresentacionPdf?.documentId
                })
                
                documentos.push({
                  tipo: 'arrendatario',
                  nombre: 'Cédula RL Arrendatario',
                  presente: !!ocupante.perfilCliente.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.documentId,
                  url: ocupante.perfilCliente.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.url,
                  documentId: ocupante.perfilCliente.datosPersonaJuridica?.empresaRepresentanteLegal?.cedulaRepresentanteLegalPdf?.documentId
                })
                
                // RUC de la empresa representante legal del arrendatario
                const rucsEmpresaRL = ocupante.perfilCliente.datosPersonaJuridica?.empresaRepresentanteLegal?.rucEmpresaRepresentanteLegal || []
                if (rucsEmpresaRL.length > 0) {
                  rucsEmpresaRL.forEach((ruc: any, index: number) => {
                    documentos.push({
                      tipo: 'arrendatario',
                      nombre: `RUC RL Arrendatario${rucsEmpresaRL.length > 1 ? ` ${index + 1}` : ''}`,
                      presente: !!ruc.rucPdf?.documentId,
                      url: ruc.rucPdf?.url,
                      documentId: ruc.rucPdf?.documentId
                    })
                  })
                } else {
                  documentos.push({
                    tipo: 'arrendatario',
                    nombre: 'RUC RL Arrendatario',
                    presente: false
                  })
                }
              } else {
                // Perfil cliente persona jurídica con representante legal que es persona natural
                documentos.push({
                  tipo: 'arrendatario',
                  nombre: 'Cédula RL Arrendatario',
                  presente: !!ocupante.perfilCliente.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.documentId,
                  url: ocupante.perfilCliente.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.url,
                  documentId: ocupante.perfilCliente.datosPersonaJuridica?.cedulaRepresentanteLegalPdf?.documentId
                })
                
                documentos.push({
                  tipo: 'arrendatario',
                  nombre: 'Nombramiento RL Arrendatario',
                  presente: !!ocupante.perfilCliente.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.documentId,
                  url: ocupante.perfilCliente.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.url,
                  documentId: ocupante.perfilCliente.datosPersonaJuridica?.nombramientoRepresentanteLegalPdf?.documentId
                })
              }
            }
          }
        }
        
        // Calcular porcentajes
        const docsPropiedad = documentos.filter(doc => doc.tipo === 'propiedad')
        const docsPropietario = documentos.filter(doc => doc.tipo === 'propietario')
        const docsArrendatario = documentos.filter(doc => doc.tipo === 'arrendatario')
        
        const porcentajePropiedad = docsPropiedad.length > 0
          ? Math.round((docsPropiedad.filter(doc => doc.presente).length / docsPropiedad.length) * 100)
          : 0
        
        const porcentajePropietario = docsPropietario.length > 0
          ? Math.round((docsPropietario.filter(doc => doc.presente).length / docsPropietario.length) * 100)
          : 0
        
        // Verificar y corregir el cálculo de porcentaje de arrendatario
        let porcentajeArrendatario = 0;
        if (estaArrendada) {
          console.log('PROPIEDAD ARRENDADA:', {
            documentId: propiedad.documentId,
            nombreOcupante,
            docsArrendatario: docsArrendatario.map(d => ({ nombre: d.nombre, presente: d.presente })),
            presentes: docsArrendatario.filter(doc => doc.presente).length,
            total: docsArrendatario.length
          });
          
          // Forzar un cálculo más simple y directo
          if (docsArrendatario.length > 0) {
            const presentes = docsArrendatario.filter(doc => doc.presente).length;
            porcentajeArrendatario = Math.round((presentes / docsArrendatario.length) * 100);
            console.log(`Porcentaje arrendatario calculado: ${presentes}/${docsArrendatario.length} = ${porcentajeArrendatario}%`);
          }
        }
        
        // Para el porcentaje total, considerar todos los documentos relevantes
        // (No incluir documentos de arrendatario si no está arrendada)
        const documentosRelevantes = estaArrendada 
          ? documentos 
          : documentos.filter(doc => doc.tipo !== 'arrendatario')
        
        const porcentajeTotal = documentosRelevantes.length > 0
          ? Math.round((documentosRelevantes.filter(doc => doc.presente).length / documentosRelevantes.length) * 100)
          : 0
        
        // Antes de retornar el objeto con los porcentajes, añadir una verificación final
        console.log('Porcentajes finales para propiedad', propiedad.documentId, {
          porcentajePropiedad,
          porcentajePropietario,
          porcentajeArrendatario,
          porcentajeTotal
        });
        
        return {
          documentId: propiedad.documentId,
          lote: identificadores.superior || "",
          idLote: identificadores.idSuperior || "",
          bodega: identificadores.inferior || "",
          idBodega: identificadores.idInferior || "",
          nombrePropietario,
          nombreOcupante,
          tipoOcupante,
          estaArrendada,
          proyecto: nombreProyecto,
          documentos,
          porcentajeCompletitudPropiedad: porcentajePropiedad,
          porcentajeCompletitudPropietario: porcentajePropietario,
          porcentajeCompletitudArrendatario: porcentajeArrendatario,
          porcentajeCompletitudTotal: porcentajeTotal
        }
      })
    }
    
    setCargando(true)
    
    if (dataProyecto?.proyecto?.propiedades) {
      const nombreProyecto = dataProyecto.proyecto.nombre || ""
      const propiedadesProcesadas = procesarDocumentosPropiedades(
        dataProyecto.proyecto.propiedades,
        nombreProyecto
      )
      setPropiedadesDocumentos(propiedadesProcesadas)
      setPropiedadesFiltradas(propiedadesProcesadas)
      
      // Calcular porcentajes generales
      if (propiedadesProcesadas.length > 0) {
        // Solo considerar propiedades arrendadas para el porcentaje de arrendatarios
        const propiedadesArrendadas = propiedadesProcesadas.filter(p => p.estaArrendada);
        console.log(`Total propiedades: ${propiedadesProcesadas.length}, Arrendadas: ${propiedadesArrendadas.length}`);
        
        const totalPropiedad = propiedadesProcesadas.reduce(
          (sum, prop) => sum + prop.porcentajeCompletitudPropiedad, 0
        ) / propiedadesProcesadas.length;
        
        const totalPropietario = propiedadesProcesadas.reduce(
          (sum, prop) => sum + prop.porcentajeCompletitudPropietario, 0
        ) / propiedadesProcesadas.length;
        
        // Calcular correctamente el porcentaje de arrendatario solo si hay propiedades arrendadas
        let totalArrendatario = 0;
        if (propiedadesArrendadas.length > 0) {
          // Sumar los porcentajes de completitud de arrendatarios solo de propiedades arrendadas
          const sumaPorcentajesArrendatarios = propiedadesArrendadas.reduce(
            (sum, prop) => sum + prop.porcentajeCompletitudArrendatario, 0
          );
          totalArrendatario = sumaPorcentajesArrendatarios / propiedadesArrendadas.length;
          console.log(`Suma porcentajes arrendatarios: ${sumaPorcentajesArrendatarios}, Promedio: ${totalArrendatario}`);
        }
        
        // Para el total general, considerar todos los documentos según su tipo
        const totalGeneral = propiedadesProcesadas.reduce(
          (sum, prop) => sum + prop.porcentajeCompletitudTotal, 0
        ) / propiedadesProcesadas.length;
        
        const totalesFinales = {
          propiedad: Math.round(totalPropiedad),
          propietario: Math.round(totalPropietario),
          arrendatario: Math.round(totalArrendatario),
          general: Math.round(totalGeneral)
        };
        
        console.log('PORCENTAJES TOTALES FINALES:', totalesFinales);
        
        setPorcentajeTotalPropiedad(totalesFinales.propiedad);
        setPorcentajeTotalPropietario(totalesFinales.propietario);
        setPorcentajeTotalArrendatario(totalesFinales.arrendatario);
        setPorcentajeTotalGeneral(totalesFinales.general);
      }
    } else if (dataTodos?.proyectos) {
      let todasLasPropiedades: PropiedadDocumentos[] = []
      
      dataTodos.proyectos.forEach((proyecto: any) => {
        if (proyecto.propiedades && proyecto.propiedades.length > 0) {
          const propiedadesProcesadas = procesarDocumentosPropiedades(
            proyecto.propiedades,
            proyecto.nombre
          )
          todasLasPropiedades = [...todasLasPropiedades, ...propiedadesProcesadas]
        }
      })
      
      setPropiedadesDocumentos(todasLasPropiedades)
      setPropiedadesFiltradas(todasLasPropiedades)
      
      // Calcular porcentajes generales
      if (todasLasPropiedades.length > 0) {
        // Solo considerar propiedades arrendadas para el porcentaje de arrendatarios
        const propiedadesArrendadas = todasLasPropiedades.filter(p => p.estaArrendada);
        console.log(`Total propiedades (todos los proyectos): ${todasLasPropiedades.length}, Arrendadas: ${propiedadesArrendadas.length}`);
        
        const totalPropiedad = todasLasPropiedades.reduce(
          (sum, prop) => sum + prop.porcentajeCompletitudPropiedad, 0
        ) / todasLasPropiedades.length;
        
        const totalPropietario = todasLasPropiedades.reduce(
          (sum, prop) => sum + prop.porcentajeCompletitudPropietario, 0
        ) / todasLasPropiedades.length;
        
        // Calcular correctamente el porcentaje de arrendatario solo si hay propiedades arrendadas
        let totalArrendatario = 0;
        if (propiedadesArrendadas.length > 0) {
          // Sumar los porcentajes de completitud de arrendatarios solo de propiedades arrendadas
          const sumaPorcentajesArrendatarios = propiedadesArrendadas.reduce(
            (sum, prop) => sum + prop.porcentajeCompletitudArrendatario, 0
          );
          totalArrendatario = sumaPorcentajesArrendatarios / propiedadesArrendadas.length;
          console.log(`Suma porcentajes arrendatarios (todos): ${sumaPorcentajesArrendatarios}, Promedio: ${totalArrendatario}`);
        }
        
        // Para el total general, considerar todos los documentos según su tipo
        const totalGeneral = todasLasPropiedades.reduce(
          (sum, prop) => sum + prop.porcentajeCompletitudTotal, 0
        ) / todasLasPropiedades.length;
        
        const totalesFinales = {
          propiedad: Math.round(totalPropiedad),
          propietario: Math.round(totalPropietario),
          arrendatario: Math.round(totalArrendatario),
          general: Math.round(totalGeneral)
        };
        
        console.log('PORCENTAJES TOTALES FINALES (TODOS):', totalesFinales);
        
        setPorcentajeTotalPropiedad(totalesFinales.propiedad);
        setPorcentajeTotalPropietario(totalesFinales.propietario);
        setPorcentajeTotalArrendatario(totalesFinales.arrendatario);
        setPorcentajeTotalGeneral(totalesFinales.general);
      }
    }
    
    setCargando(false)
  }, [dataProyecto, dataTodos])

  // Filtrar propiedades según el término de búsqueda
  useEffect(() => {
    if (!busqueda.trim()) {
      setPropiedadesFiltradas(propiedadesDocumentos)
      return
    }
    
    const busquedaLower = busqueda.toLowerCase()
    const filtradas = propiedadesDocumentos.filter(prop => 
      prop.lote.toLowerCase().includes(busquedaLower) ||
      prop.idLote.toLowerCase().includes(busquedaLower) ||
      prop.bodega.toLowerCase().includes(busquedaLower) ||
      prop.idBodega.toLowerCase().includes(busquedaLower) ||
      prop.nombrePropietario.toLowerCase().includes(busquedaLower) ||
      prop.nombreOcupante.toLowerCase().includes(busquedaLower) ||
      prop.proyecto.toLowerCase().includes(busquedaLower)
    )
    
    setPropiedadesFiltradas(filtradas)
  }, [busqueda, propiedadesDocumentos])

  // Manejar selección de propiedades
  const seleccionarPropiedad = (documentId: string) => {
    if (propiedadesSeleccionadas.includes(documentId)) {
      setPropiedadesSeleccionadas(prev => prev.filter(id => id !== documentId))
    } else {
      setPropiedadesSeleccionadas(prev => [...prev, documentId])
    }
  }

  // Seleccionar o deseleccionar todas las propiedades
  const seleccionarTodas = () => {
    if (todasSeleccionadas) {
      setPropiedadesSeleccionadas([])
    } else {
      setPropiedadesSeleccionadas(propiedadesFiltradas.map(prop => prop.documentId))
    }
    setTodasSeleccionadas(!todasSeleccionadas)
  }

  // Verificar si todas las propiedades están seleccionadas
  useEffect(() => {
    if (propiedadesFiltradas.length > 0 && propiedadesSeleccionadas.length === propiedadesFiltradas.length) {
      setTodasSeleccionadas(true)
    } else {
      setTodasSeleccionadas(false)
    }
  }, [propiedadesSeleccionadas, propiedadesFiltradas])

  // Exportar a Excel
  const exportarExcel = () => {
    // Filtrar solo las propiedades seleccionadas
    const propiedadesAExportar = propiedadesSeleccionadas.length > 0
      ? propiedadesFiltradas.filter(prop => propiedadesSeleccionadas.includes(prop.documentId))
      : propiedadesFiltradas

    // Preparar los datos para el Excel
    const datos = propiedadesAExportar.map(prop => {
      const documentosPropietario = prop.documentos
        .filter(doc => doc.tipo === 'propietario')
        .map(doc => `${doc.nombre}: ${doc.presente ? 'Sí' : 'No'}`)
        .join(', ')
      
      const documentosPropiedad = prop.documentos
        .filter(doc => doc.tipo === 'propiedad')
        .map(doc => `${doc.nombre}: ${doc.presente ? 'Sí' : 'No'}`)
        .join(', ')
      
      const documentosArrendatario = prop.documentos
        .filter(doc => doc.tipo === 'arrendatario')
        .map(doc => `${doc.nombre}: ${doc.presente ? 'Sí' : 'No'}`)
        .join(', ')
      
      return {
        'Proyecto': prop.proyecto,
        'Identificador # 1': `${prop.lote}${prop.idLote ? ` ${prop.idLote}` : ''}`,
        'Identificador # 2': `${prop.bodega}${prop.idBodega ? ` ${prop.idBodega}` : ''}`,
        'Propietario': prop.nombrePropietario,
        'Estado Ocupación': prop.estaArrendada ? 'Arrendado' : 'Uso propietario',
        'Arrendatario': prop.estaArrendada ? prop.nombreOcupante : 'N/A',
        '% Propiedad': prop.porcentajeCompletitudPropiedad,
        '% Propietario': prop.porcentajeCompletitudPropietario,
        '% Arrendatario': prop.estaArrendada ? prop.porcentajeCompletitudArrendatario : 'N/A',
        '% Total': prop.porcentajeCompletitudTotal,
        'Documentos Propiedad': documentosPropiedad,
        'Documentos Propietario': documentosPropietario,
        'Documentos Arrendatario': prop.estaArrendada ? documentosArrendatario : 'N/A'
      }
    })
    
    // Crear libro de Excel
    const libro = utils.book_new()
    const hoja = utils.json_to_sheet(datos)
    
    // Añadir hoja al libro
    utils.book_append_sheet(libro, hoja, 'Reporte Documentos')
    
    // Obtener nombre del archivo
    let nombreArchivo = 'reporte-documentos'
    if (proyectoId && propiedadesFiltradas.length > 0) {
      const nombreProyecto = propiedadesFiltradas[0]?.proyecto || ''
      nombreArchivo = `reporte-documentos-${nombreProyecto.toLowerCase().replace(/\s+/g, '-')}`
    }
    
    // Descargar archivo
    writeFile(libro, `${nombreArchivo}.xlsx`)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg">Reporte de Documentos</h2>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64"
              />
            </div>
            
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              onClick={exportarExcel}
              disabled={propiedadesFiltradas.length === 0 || (propiedadesSeleccionadas.length === 0 && propiedadesFiltradas.length > 0)}
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              Exportar {propiedadesSeleccionadas.length > 0 ? `(${propiedadesSeleccionadas.length})` : ''} Excel
            </Button>
          </div>
        </div>
        
        {/* Aquí mostraremos los porcentajes de completitud */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-500 mb-1">Documentos de Propiedades</h3>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{porcentajeTotalPropiedad}%</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5 mb-1">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full" 
                  style={{ width: `${porcentajeTotalPropiedad}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-500 mb-1">Documentos de Propietarios</h3>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{porcentajeTotalPropietario}%</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5 mb-1">
                <div 
                  className="bg-green-500 h-2.5 rounded-full" 
                  style={{ width: `${porcentajeTotalPropietario}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-500 mb-1">Documentos de Arrendatarios</h3>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{porcentajeTotalArrendatario}%</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5 mb-1">
                <div 
                  className="bg-orange-500 h-2.5 rounded-full" 
                  style={{ width: `${porcentajeTotalArrendatario}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-500 mb-1">Documentos Totales</h3>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{porcentajeTotalGeneral}%</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5 mb-1">
                <div 
                  className="bg-purple-500 h-2.5 rounded-full" 
                  style={{ width: `${porcentajeTotalGeneral}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabla de propiedades con sus documentos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {cargando || loadingProyecto || loadingTodos ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : propiedadesFiltradas.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No se encontraron propiedades que coincidan con los criterios seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {propiedadesFiltradas.length} {propiedadesFiltradas.length === 1 ? 'propiedad' : 'propiedades'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="seleccionar-todas"
                      checked={todasSeleccionadas} 
                      onCheckedChange={seleccionarTodas}
                    />
                    <label htmlFor="seleccionar-todas" className="text-sm text-gray-600 cursor-pointer">
                      Seleccionar todas
                    </label>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      Sel.
                    </TableHead>
                    <TableHead>
                      Proyecto
                    </TableHead>
                    <TableHead>
                      Propiedad
                    </TableHead>
                    <TableHead>
                      Propietario
                    </TableHead>
                    <TableHead>
                      Arrendatario
                    </TableHead>
                    <TableHead>
                      % Propiedad
                    </TableHead>
                    <TableHead>
                      % Propietario
                    </TableHead>
                    <TableHead>
                      % Arrendatario
                    </TableHead>
                    <TableHead>
                      % Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propiedadesFiltradas.map((propiedad) => {
                    // Documentos faltantes para tooltips
                    const docsPropiedadFaltantes = propiedad.documentos
                      .filter(doc => doc.tipo === 'propiedad' && !doc.presente)
                      .map(doc => doc.nombre);

                    const docsPropietarioFaltantes = propiedad.documentos
                      .filter(doc => doc.tipo === 'propietario' && !doc.presente)
                      .map(doc => doc.nombre);

                    const docsArrendatarioFaltantes = propiedad.documentos
                      .filter(doc => doc.tipo === 'arrendatario' && !doc.presente)
                      .map(doc => doc.nombre);

                    return (
                      <TableRow key={propiedad.documentId}>
                        <TableCell>
                          <Checkbox 
                            checked={propiedadesSeleccionadas.includes(propiedad.documentId)}
                            onCheckedChange={() => seleccionarPropiedad(propiedad.documentId)}
                          />
                        </TableCell>
                        <TableCell>{propiedad.proyecto}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {propiedad.lote && (
                              <span>
                                {propiedad.lote} 
                                {propiedad.idLote && <span className="ml-1">{propiedad.idLote}</span>}
                              </span>
                            )}
                            {propiedad.bodega && (
                              <span className="text-gray-500 text-sm">
                                {propiedad.bodega}
                                {propiedad.idBodega && <span className="ml-1">{propiedad.idBodega}</span>}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{propiedad.nombrePropietario}</TableCell>
                        <TableCell>
                          {propiedad.estaArrendada ? (
                            <div className="flex items-center">
                              {/* <span className="inline-flex mr-2 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Arrendado por:
                              </span> */}
                              <span className="">{propiedad.nombreOcupante || "(Sin nombre)"}</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              {/* <span className="inline-flex mr-2 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"> */}
                                <span className="text-gray-500">N/A</span>
                              {/* </span> */}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 group relative">
                            <span>{propiedad.porcentajeCompletitudPropiedad}%</span>
                            <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  propiedad.porcentajeCompletitudPropiedad < 33 
                                    ? 'bg-red-500' 
                                    : propiedad.porcentajeCompletitudPropiedad < 66
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${propiedad.porcentajeCompletitudPropiedad}%` }}
                              ></div>
                            </div>
                            {docsPropiedadFaltantes.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <InformationCircleIcon className="w-5 h-5 text-gray-500 hover:text-blue-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start" className="bg-black text-white p-2 w-48 z-[1000]">
                                  <p className="font-semibold mb-1">Documentos faltantes:</p>
                                  <ul className="list-disc pl-4">
                                    {docsPropiedadFaltantes.map(doc => (
                                      <li key={doc}>{doc}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 group relative">
                            <span>{propiedad.porcentajeCompletitudPropietario}%</span>
                            <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  propiedad.porcentajeCompletitudPropietario < 33 
                                    ? 'bg-red-500' 
                                    : propiedad.porcentajeCompletitudPropietario < 66
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${propiedad.porcentajeCompletitudPropietario}%` }}
                              ></div>
                            </div>
                            {docsPropietarioFaltantes.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <InformationCircleIcon className="w-5 h-5 text-gray-500 hover:text-blue-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start" className="bg-black text-white p-2 w-48 z-[1000]">
                                  <p className="font-semibold mb-1">Documentos faltantes:</p>
                                  <ul className="list-disc pl-4">
                                    {docsPropietarioFaltantes.map(doc => (
                                      <li key={doc}>{doc}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {propiedad.estaArrendada ? (
                            <div className="flex items-center gap-2 group relative">
                              <span>{propiedad.porcentajeCompletitudArrendatario}%</span>
                              <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    propiedad.porcentajeCompletitudArrendatario < 33 
                                      ? 'bg-red-500' 
                                      : propiedad.porcentajeCompletitudArrendatario < 66
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${propiedad.porcentajeCompletitudArrendatario}%` }}
                                ></div>
                              </div>
                              {docsArrendatarioFaltantes.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <InformationCircleIcon className="w-5 h-5 text-gray-500 hover:text-blue-500 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="start" className="bg-black text-white p-2 w-48 z-[1000]">
                                    <p className="font-semibold mb-1">Documentos faltantes:</p>
                                    <ul className="list-disc pl-4">
                                      {docsArrendatarioFaltantes.map(doc => (
                                        <li key={doc}>{doc}</li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{propiedad.porcentajeCompletitudTotal}%</span>
                            <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  propiedad.porcentajeCompletitudTotal < 33 
                                    ? 'bg-red-500' 
                                    : propiedad.porcentajeCompletitudTotal < 66
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${propiedad.porcentajeCompletitudTotal}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
} 