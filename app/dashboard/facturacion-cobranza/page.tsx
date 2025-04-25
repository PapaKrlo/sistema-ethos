'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { gql, useLazyQuery } from '@apollo/client';
import Image from 'next/image'; // Importar Image si se usan fotos de proyecto

// Definir interfaces para el tipado
interface Proyecto {
  id: string;
  documentId: string; // Asegurarse que documentId siempre esté presente
  nombre: string;
  apiContifico: string;
  fotoProyecto?: { url: string }; // Añadir opcionalmente para la tarjeta
  ubicacion?: string; // Añadir opcionalmente para la tarjeta
  descripcion?: string; // Añadir opcionalmente para la tarjeta
}

interface Cliente {
  id: string;
  razonSocial: string;
  tipoPersona: string;
  datosPersonaNatural?: { razonSocial: string };
  datosPersonaJuridica?: { razonSocial: string };
}

interface IdentificadoresPropiedad {
  idSuperior?: string;
  superior?: string;
  idInferior?: string;
  inferior?: string;
}

interface Propiedad {
  id: string;
  identificadores?: IdentificadoresPropiedad;
}

interface ItemFactura {
  descripcion: string;
  codigoServicio: string;
  cantidad: number;
  precioUnitario: number;
  porcentajeIva: number;
}

// Interfaz para la Factura (según lo que necesitamos mostrar)
interface Factura {
  id: number;
  documentId: string; // Asegurarse que documentId siempre esté presente
  periodo: string;
  fechaGeneracion: string;
  total: number;
  cliente: Cliente;
  propiedad: Propiedad;
  estado: string;
  // ItemsFactura?: ItemFactura[]; // Podríamos añadir si se necesita detalle
}

// Query GraphQL para obtener prefacturas pendientes (Estructura Strapi v5)
const GET_PREFACTURAS_PENDIENTES = gql`
  query GetPrefacturasPendientes($estado: String!) {
    facturas(filters: { estado: { eq: $estado } }, pagination: { limit: -1 }) {
      # Directamente los campos bajo facturas
      documentId
      periodo
      fechaGeneracion
      total
      estado
      cliente { 
        # Directamente los campos bajo cliente
        documentId 
        tipoPersona
        datosPersonaNatural {
          razonSocial
        }
        datosPersonaJuridica {
          razonSocial
        }
      }
      propiedad { 
        # Directamente los campos bajo propiedad
        documentId 
        identificadores {
          idSuperior
          superior
          idInferior
          inferior
        }
      }
    }
  }
`;

// Query GraphQL para obtener propiedades de un proyecto
const GET_PROPIEDADES_PROYECTO = gql`
  query GetPropiedadesProyecto($proyectoId: ID!) {
    propiedades(filters: { proyecto: { documentId: { eq: $proyectoId } } }, pagination: { limit: -1 }) {
      documentId
      identificadores {
        idSuperior
        superior
        idInferior
        inferior
      }
      pagos { # Para mostrar encargado de pago si se quiere
        encargadoDePago
      }
    }
  }
`;

// Interfaz para Propiedad con datos para la tabla de selección
interface PropiedadSeleccion {
  id: number;
  documentId: string;
  identificadores?: {
    idSuperior?: string;
    superior?: string;
    idInferior?: string;
    inferior?: string;
  };
  pagos?: {
    encargadoDePago?: string;
  };
}

// Componentes de tarjeta temporales (Simplificados ya que no usamos Tabs)
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md ${className || ''}`}>{children}</div>
)

const CardHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-4 border-b ${className || ''}`}>{children}</div>
)

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xl font-semibold">{children}</h3>
)

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-gray-500 mt-1">{children}</p>
)

const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4">{children}</div>
)

export default function FacturacionCobranzaPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = ('0' + (today.getMonth() + 1)).slice(-2);
    return `${year}-${month}`;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultadoGeneracion, setResultadoGeneracion] = useState<{ generadas: number; errores: number; omitidas: number; detallesErrores?: any[] } | null>(null);
  const [errorGeneracion, setErrorGeneracion] = useState<string | null>(null);
  
  // Estados para selección de propiedades
  const [propiedadesProyecto, setPropiedadesProyecto] = useState<PropiedadSeleccion[]>([]);
  const [propiedadesAFacturarIds, setPropiedadesAFacturarIds] = useState<Set<string>>(new Set());
  const [selectedPrefacturaIds, setSelectedPrefacturaIds] = useState<Set<string>>(new Set()); // Estado para selección múltiple de prefacturas

  // Estado para las prefacturas pendientes
  const [prefacturasPendientes, setPrefacturasPendientes] = useState<Factura[]>([]); // Usar Factura[]
  const [errorPrefacturas, setErrorPrefacturas] = useState<string | null>(null);

  // --- Hooks Apollo Client ---
  const [loadPrefacturas, { loading: isLoadingPrefacturas, error: apolloErrorPrefacturas }] = useLazyQuery(GET_PREFACTURAS_PENDIENTES, {
    variables: { estado: 'PendienteValidacion' },
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      console.log("GraphQL Data Prefacturas Received:", data);
      // Asegurarse que data.facturas es un array antes de actualizar el estado
      const facturasData = Array.isArray(data?.facturas) ? data.facturas : [];
      setPrefacturasPendientes(facturasData);
    },
    onError: (error) => {
      console.error("Error fetching prefacturas pendientes with GraphQL:", error);
      setErrorPrefacturas(`Error al cargar prefacturas: ${error.message}`);
      setPrefacturasPendientes([]);
    }
  });

  const [loadPropiedades, { loading: isLoadingPropiedades, error: errorProps }] = useLazyQuery(GET_PROPIEDADES_PROYECTO, {
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      console.log("Propiedades del proyecto recibidas:", data);
      const props = data?.propiedades || [];
      setPropiedadesProyecto(props);
      setPropiedadesAFacturarIds(new Set(props.map((p: PropiedadSeleccion) => p.documentId)));
    },
    onError: (error) => {
      console.error("Error cargando propiedades del proyecto:", error);
      setPropiedadesProyecto([]);
      setPropiedadesAFacturarIds(new Set());
    }
  });

  // --- Estados y Variables Adicionales ---
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const STRAPI_URL_BASE = process.env.NEXT_PUBLIC_STRAPI_API_URL;

  // --- Effects ---
  // Leer token inicial
  useEffect(() => {
    const storedToken = localStorage.getItem('jwt');
    console.log("Token leído de localStorage:", storedToken);
    setJwtToken(storedToken);
  }, []);

  // Cargar Proyectos iniciales (Dropdown)
  useEffect(() => {
    console.log("Effect para cargarProyectos: jwtToken es:", jwtToken);
    const cargarProyectos = async () => {
      if (!jwtToken) {
        console.log("cargarProyectos: No JWT token state, skipping fetch.");
        setProyectos(proyectosPrueba); // Usar datos de prueba si no hay token
        return;
      }
      if (!STRAPI_URL_BASE) {
        console.error("cargarProyectos: STRAPI_URL_BASE no está definida.");
        setProyectos(proyectosPrueba); // Usar datos de prueba si URL base no está definida
        return;
      }
      try {
        console.log(`cargarProyectos: Fetching from ${STRAPI_URL_BASE}/api/proyectos con token.`);
        // Incluir populate para fotoProyecto si se va a usar
        const response = await axios.get<{ data: Proyecto[] }>(`${STRAPI_URL_BASE}/api/proyectos?populate[0]=fotoProyecto`, {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          }
        });
        console.log("cargarProyectos: Respuesta de proyectos:", response.data);
        if (response.data && Array.isArray(response.data.data)) {
          // Mapear para asegurar que documentId esté presente
          const proyectosConDocId = response.data.data.map(p => ({
            ...p,
            documentId: p.documentId || String(p.id) // Fallback a 'id' si 'documentId' no viene
          }));
          setProyectos(proyectosConDocId);
        } else {
          console.warn("La respuesta de la API de proyectos no tiene el formato esperado { data: [...] }.");
          setProyectos(proyectosPrueba); // Usar datos de prueba si la estructura es incorrecta
        }
      } catch (error) {
        console.error('Error al cargar proyectos:', error);
        console.log('Usando datos de prueba para desarrollo');
        setProyectos(proyectosPrueba);
      }
    };
    
    cargarProyectos();
  }, [STRAPI_URL_BASE, jwtToken]);

  // Cargar Propiedades del Proyecto seleccionado
  useEffect(() => {
    if (proyectoSeleccionadoId && jwtToken) { 
      console.log(`Effect: Proyecto ID ${proyectoSeleccionadoId} seleccionado, cargando propiedades...`);
      loadPropiedades({ variables: { proyectoId: proyectoSeleccionadoId } });
    } else {
      setPropiedadesProyecto([]);
      setPropiedadesAFacturarIds(new Set());
    }
  }, [proyectoSeleccionadoId, jwtToken, loadPropiedades]);

  // Cargar Prefacturas Pendientes iniciales
  useEffect(() => {
     if (jwtToken) {
       console.log("Effect: Token listo, ejecutando loadPrefacturas...");
       loadPrefacturas();
     } else {
       console.log("Effect: Token aún no listo, esperando para cargar prefacturas...");
       setPrefacturasPendientes([]);
       setSelectedPrefacturaIds(new Set()); // Limpiar selección si no hay token
     }
  }, [jwtToken, loadPrefacturas]); 

  // Datos de prueba para desarrollo (Restaurado y asegurando documentId)
  const proyectosPrueba: Proyecto[] = [
    {
      id: '1',
      documentId: '1', // Asegurar documentId
      nombre: 'Almax 3',
      apiContifico: 'V9YjYbqMlMSv4IsuyCfYGiTVDedSNakcmpoRMHxKRW4',
      ubicacion: 'Urb Santa Fe 28',
      descripcion: 'Centro de bodegas inteligentes...'
    },
    {
      id: '2',
      documentId: '2', // Asegurar documentId
      nombre: 'Almax 2',
      apiContifico: 'API_KEY_DEMO_ALMAX2',
      ubicacion: 'Km 14 Via Daule',
      descripcion: 'Otro complejo logístico...'
    }
  ];

  // --- Handlers ---

  // Manejador para cambio de checkbox individual
  const handleCheckboxChange = (propiedadDocumentId: string) => {
    setPropiedadesAFacturarIds(prevIds => {
      const newIds = new Set(prevIds);
      if (newIds.has(propiedadDocumentId)) {
        newIds.delete(propiedadDocumentId);
      } else {
        newIds.add(propiedadDocumentId);
      }
      return newIds;
    });
  };

  // Manejador para seleccionar/deseleccionar todas
  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      // Seleccionar todas usando documentId
      setPropiedadesAFacturarIds(new Set(propiedadesProyecto.map(p => p.documentId)));
    } else {
      // Deseleccionar todas
      setPropiedadesAFacturarIds(new Set());
    }
  };

  // Manejador para seleccionar/deseleccionar todas las prefacturas pendientes
  const handleSelectAllPrefacturasChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedPrefacturaIds(new Set(prefacturasPendientes.map(p => p.documentId)));
    } else {
      setSelectedPrefacturaIds(new Set());
    }
  };

  // Manejador para cambio de checkbox individual de prefactura pendiente
  const handlePrefacturaCheckboxChange = (prefacturaDocumentId: string) => {
    setSelectedPrefacturaIds(prevIds => {
      const newIds = new Set(prevIds);
      if (newIds.has(prefacturaDocumentId)) {
        newIds.delete(prefacturaDocumentId);
      } else {
        newIds.add(prefacturaDocumentId);
      }
      return newIds;
    });
  };

  const handleGenerarPrefacturas = async () => {
    setIsLoading(true);
    setErrorGeneracion(null);
    setResultadoGeneracion(null);

    // Validar que se haya seleccionado un proyecto y periodo
    if (!proyectoSeleccionadoId) {
      setErrorGeneracion('Por favor, seleccione un proyecto.');
      setIsLoading(false);
      return;
    }
    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      setErrorGeneracion('Formato de periodo inválido. Use YYYY-MM.');
      setIsLoading(false);
      return;
    }
    // Validar que se hayan seleccionado propiedades
    if (propiedadesAFacturarIds.size === 0) {
      setErrorGeneracion('Por favor, seleccione al menos una propiedad para facturar.');
      setIsLoading(false);
      return;
    }

    try {
      console.log("Valor de STRAPI_URL_BASE en handleGenerar:", STRAPI_URL_BASE);
      if (!STRAPI_URL_BASE) {
        throw new Error("La URL base de Strapi no está definida.");
      }

      // Convertir el Set de IDs a un Array
      const idsArray = Array.from(propiedadesAFacturarIds);

      // Enviar proyectoId (numérico si tu API lo espera así, si no, enviar documentId directamente)
      // Asegúrate que tu backend espera 'proyectoId' como número o 'proyectoDocumentId' como string
      const proyectoIdNumerico = parseInt(proyectoSeleccionadoId, 10); // Convertir a número si es necesario

      const response = await axios.post(
        `${STRAPI_URL_BASE}/api/facturas/generar-prefacturas`,
        {
          periodo: periodo,
          proyectoId: proyectoIdNumerico, // o proyectoDocumentId: proyectoSeleccionadoId si el backend espera string
          propiedadesSeleccionadasIds: idsArray
        }
      );

      setResultadoGeneracion(response.data);
      // Refrescar la lista de pendientes y limpiar selección después de generar
      loadPrefacturas();
      setSelectedPrefacturaIds(new Set()); // Limpiar selección después de generar

    } catch (error: any) {
      console.error('Error al generar prefacturas:', error);
      const message = error.response?.data?.error?.message || 
                      error.response?.data?.message || 
                      error.message || 
                      'Error desconocido al contactar el backend.';
      setErrorGeneracion(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder para acciones masivas
  const handleAprobarSeleccionadas = () => {
    console.log("Aprobar prefacturas seleccionadas:", Array.from(selectedPrefacturaIds));
    // Aquí iría la lógica para llamar a la API/mutación de aprobación
    alert(`Aprobar ${selectedPrefacturaIds.size} prefacturas (simulado).`);
  };

  const handleRechazarSeleccionadas = () => {
    console.log("Rechazar prefacturas seleccionadas:", Array.from(selectedPrefacturaIds));
    // Aquí iría la lógica para llamar a la API/mutación de rechazo
    alert(`Rechazar ${selectedPrefacturaIds.size} prefacturas (simulado).`);
  };

  // Calcular suma total de prefacturas pendientes
  const totalPrefacturasPendientes = prefacturasPendientes.reduce((sum, factura) => {
    // Asegurarse de que factura.total sea un número antes de sumar
    const totalValue = typeof factura.total === 'number' ? factura.total : 0;
    return sum + totalValue;
  }, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Facturación y Cobranza</h1>

      {/* Card para Generar Prefacturas */}
      <Card className="w-full mb-6">
        <CardHeader className="flex justify-between items-start">
          <div>
            <CardTitle>Generar Prefacturas</CardTitle>
            <CardDescription>
              Actualmente se generan con el servicio de "Alicuota Ordinaria Almax 3 (AOA3)".
            </CardDescription>
          </div>
          {/* Selector de Periodo a la derecha */}
          <div className="flex-shrink-0 ml-4">
             <label htmlFor="periodo" className="block text-sm font-medium text-gray-700 mb-1 text-right">
               Periodo a facturar:
             </label>
             <input
               type="month"
               id="periodo"
               value={periodo}
               onChange={(e) => setPeriodo(e.target.value)}
               className="p-2 border rounded w-full" // Ajustar ancho si es necesario
               pattern="[0-9]{4}-[0-9]{2}"
               required
             />
           </div>
        </CardHeader>
        <CardContent>
          {/* Selector de Proyecto con Tarjetas */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proyecto a Facturar:
            </label>
            {proyectos.length === 0 && !jwtToken && (
                 <p className="text-gray-500 italic">Cargando proyectos...</p>
               )}
            {proyectos.length === 0 && jwtToken && (
                 <p className="text-gray-500 italic">No se encontraron proyectos.</p> // O mensaje si la carga falló
             )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {proyectos?.map(p => (
                <div
                  key={p.documentId}
                  onClick={() => setProyectoSeleccionadoId(p.documentId)}
                  className={`bg-white rounded-lg border p-4 cursor-pointer transition-all duration-150 ease-in-out hover:shadow-md ${
                    proyectoSeleccionadoId === p.documentId
                      ? 'ring-2 ring-offset-2 ring-blue-500 border-blue-500 shadow-lg' // Estilo seleccionado
                      : 'border-gray-200 hover:border-gray-300' // Estilo no seleccionado
                  } ${isLoadingPropiedades ? 'opacity-50 cursor-not-allowed' : ''}`} // Deshabilitar visualmente durante carga
                  aria-disabled={isLoadingPropiedades}
                >
                  {p.fotoProyecto?.url && (
                    <div className="relative h-32 mb-3 rounded overflow-hidden">
                      <Image
                        src={p.fotoProyecto.url}
                        alt={p.nombre}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" // Ajustar según breakpoints
                        className="object-cover"
                      />
                    </div>
                  )}
                  <h4 className="font-semibold text-gray-800 truncate">{p.nombre}</h4>
                  {p.ubicacion && <p className="text-xs text-gray-500 truncate">{p.ubicacion}</p>}
                </div>
              ))}
            </div>
            {isLoadingPropiedades && <p className="mt-2 text-sm text-gray-600">Cargando detalles del proyecto...</p>}
          </div>

          {/* Sección Tabla de Selección de Propiedades (solo si hay proyecto seleccionado) */}
          {proyectoSeleccionadoId && (
            <div className="mt-6 border-t pt-6">
              <h4 className="text-lg font-medium mb-3">Seleccionar Propiedades a Facturar</h4>
              {isLoadingPropiedades && <p>Cargando propiedades...</p>}
              {errorProps && <p className="text-red-500">Error al cargar propiedades: {errorProps.message}</p>}
              {!isLoadingPropiedades && !errorProps && propiedadesProyecto.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input 
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            checked={propiedadesProyecto.length > 0 && propiedadesAFacturarIds.size === propiedadesProyecto.length}
                            onChange={handleSelectAllChange}
                            aria-label="Seleccionar todas las propiedades"
                          />
                        </th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identificador</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Encargado Pago</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {propiedadesProyecto.map((prop) => {
                        const idSup = prop.identificadores?.idSuperior;
                        const sup = prop.identificadores?.superior;
                        const idInf = prop.identificadores?.idInferior;
                        const inf = prop.identificadores?.inferior;
                        const propIdDisplay = (sup || inf) ? `${sup || ''} ${idSup || ''}-${inf || ''} ${idInf || ''}`.trim() : `ID: ${prop.id}`;
                        
                        return (
                          <tr key={prop.documentId}>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <input 
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                checked={propiedadesAFacturarIds.has(prop.documentId)}
                                onChange={() => handleCheckboxChange(prop.documentId)}
                              />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{propIdDisplay}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{prop.pagos?.encargadoDePago ? prop.pagos.encargadoDePago : 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-600 mt-2">
                    {propiedadesAFacturarIds.size} de {propiedadesProyecto.length} propiedades seleccionadas.
                  </p>
                </div>
              )}
              {!isLoadingPropiedades && !errorProps && propiedadesProyecto.length === 0 && (
                <p className="text-gray-500 italic">No se encontraron propiedades para este proyecto.</p>
              )}
            </div>
          )}

          {/* Botón Generar */}
          <div className="mt-6"> {/* Añadido div para margen superior */}
            <button
              onClick={handleGenerarPrefacturas}
              disabled={isLoading || !proyectoSeleccionadoId || propiedadesAFacturarIds.size === 0} // Deshabilitar si no hay proyecto o propiedades seleccionadas
              className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow-md transition duration-150 ease-in-out
                         ${(isLoading || !proyectoSeleccionadoId || propiedadesAFacturarIds.size === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </span>
              ) : (
                'Generar Prefacturas'
              )}
            </button>
          </div>

          {resultadoGeneracion && (
            <div className="mt-4 p-4 border rounded border-green-200 bg-green-50 text-green-800">
              <p className="font-semibold">Generación completada:</p>
              <ul className="list-disc list-inside ml-4">
                <li>Prefacturas generadas (simuladas): {resultadoGeneracion.generadas}</li>
                <li>Propiedades omitidas: {resultadoGeneracion.omitidas}</li>
                <li>Errores encontrados: {resultadoGeneracion.errores}</li>
              </ul>
              {resultadoGeneracion.detallesErrores && resultadoGeneracion.detallesErrores.length > 0 && (
                 <details className="mt-2">
                   <summary className="cursor-pointer text-sm text-green-700">Ver detalles de errores</summary>
                   <pre className="text-xs bg-green-100 p-2 rounded mt-1 overflow-auto">
                     {JSON.stringify(resultadoGeneracion.detallesErrores, null, 2)}
                   </pre>
                 </details>
              )}
            </div>
          )}
          {errorGeneracion && (
            <div className="mt-4 p-4 border rounded bg-red-50 border-red-200 text-red-800">
              <p className="font-semibold">Error:</p>
              <p>{errorGeneracion}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card para Prefacturas Pendientes */}
      <Card className="w-full mt-8"> {/* Añadido margen superior */}
         <CardHeader className="flex justify-between items-start"> {/* Modificado para flex layout */}
           <div> {/* Contenedor para título y descripción */} 
             <CardTitle>Prefacturas Pendientes de Validación</CardTitle>
             <CardDescription>
               Aquí aparecerán las prefacturas generadas que requieren aprobación.
             </CardDescription>
           </div>
           <div className="text-right"> {/* Contenedor para el total */} 
             <p className="text-sm font-medium text-gray-500">Total Pendiente:</p>
             <p className="text-xl font-semibold text-gray-800">
               ${totalPrefacturasPendientes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
           </div>
         </CardHeader>
         <CardContent>
            {/* Botones de Acción Masiva */}
            {prefacturasPendientes.length > 0 && (
              <div className="mb-4 flex space-x-2">
                 <button
                   onClick={handleAprobarSeleccionadas}
                   disabled={selectedPrefacturaIds.size === 0}
                   className={`px-4 py-2 text-sm font-medium rounded border ${selectedPrefacturaIds.size > 0 ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                 >
                   Aprobar ({selectedPrefacturaIds.size})
                 </button>
                 <button
                   onClick={handleRechazarSeleccionadas}
                   disabled={selectedPrefacturaIds.size === 0}
                   className={`px-4 py-2 text-sm font-medium rounded border ${selectedPrefacturaIds.size > 0 ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'}`}
                 >
                   Rechazar ({selectedPrefacturaIds.size})
                 </button>
              </div>
            )}

            {/* Renderizado de la tabla de prefacturas pendientes */}
            {isLoadingPrefacturas && <p>Cargando prefacturas...</p>}
            {errorPrefacturas && <p className="text-red-500">{errorPrefacturas}</p>}
            {!isLoadingPrefacturas && (
              <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200 border">
                   <thead className="bg-gray-50">
                     <tr>
                       <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"> {/* Checkbox col */}
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            checked={prefacturasPendientes.length > 0 && selectedPrefacturaIds.size === prefacturasPendientes.length}
                            onChange={handleSelectAllPrefacturasChange}
                            aria-label="Seleccionar todas las prefacturas"
                            disabled={prefacturasPendientes.length === 0} // Deshabilitar si no hay prefacturas
                          />
                       </th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propiedad</th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generada</th>
                       {/*<th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>*/} {/* Columna de acciones individuales eliminada */}
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {prefacturasPendientes.length > 0 ? (
                       prefacturasPendientes.map((factura) => {
                         // Acceder directamente a los campos asegurando que factura no sea null/undefined
                         const sup = factura?.propiedad?.identificadores?.superior;
                         const inf = factura?.propiedad?.identificadores?.inferior;
                         const idSup = factura?.propiedad?.identificadores?.idSuperior;
                         const idInf = factura?.propiedad?.identificadores?.idInferior;
                         const propId = (sup || inf) ? `${sup || ''} ${idSup || ''}-${inf || ''} ${idInf || ''}`.trim() : 'N/A';

                         let razonSocialCliente = 'N/A';
                         if (factura?.cliente?.tipoPersona === 'Natural') {
                           razonSocialCliente = factura.cliente.datosPersonaNatural?.razonSocial || 'N/A';
                         } else if (factura?.cliente?.tipoPersona === 'Juridica') {
                           razonSocialCliente = factura.cliente.datosPersonaJuridica?.razonSocial || 'N/A';
                         }

                         return (
                           // Usar factura.documentId como key
                           <tr key={factura.documentId}>
                             <td className="px-4 py-2 whitespace-nowrap">
                               <input
                                 type="checkbox"
                                 className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                 checked={selectedPrefacturaIds.has(factura.documentId)}
                                 onChange={() => handlePrefacturaCheckboxChange(factura.documentId)}
                                 aria-labelledby={`prefactura-${factura.documentId}`}
                               />
                             </td>
                             <td id={`prefactura-${factura.documentId}-periodo`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{factura.periodo}</td>
                             <td id={`prefactura-${factura.documentId}-cliente`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{razonSocialCliente}</td>
                             <td id={`prefactura-${factura.documentId}-propiedad`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{propId}</td>
                             <td id={`prefactura-${factura.documentId}-total`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${factura.total?.toFixed(2) ?? '0.00'}</td>
                             <td id={`prefactura-${factura.documentId}-generada`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                               {factura.fechaGeneracion ? new Date(factura.fechaGeneracion).toLocaleDateString() : '-'}
                             </td>
                             {/*<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                               <button className="text-indigo-600 hover:text-indigo-900 mr-2">Aprobar</button>
                               <button className="text-red-600 hover:text-red-900">Rechazar</button>
                             </td>*/} {/* Acciones individuales eliminadas */}
                           </tr>
                         );
                       })
                     ) : (
                       <tr>
                         <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No hay prefacturas pendientes de validación.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>
            )}
            {/* Mensaje si hay error cargando prefacturas */}
            {errorPrefacturas && (
              <div className="mt-4 p-4 border rounded bg-red-50 border-red-200 text-red-800">
                  <p className="font-semibold">Error al cargar prefacturas:</p>
                  <p>{errorPrefacturas}</p>
              </div>
            )}
         </CardContent>
      </Card>
    </div>
  )
} 