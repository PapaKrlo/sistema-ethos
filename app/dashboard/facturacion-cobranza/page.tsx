'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { gql, useLazyQuery } from '@apollo/client';

// Definir interfaces para el tipado
interface Proyecto {
  id: string;
  documentId?: string;
  nombre: string;
  apiContifico: string;
}

interface Cliente {
  id: string;
  razonSocial: string;
  tipoPersona: string;
  datosPersonaNatural?: { razonSocial: string };
  datosPersonaJuridica?: { razonSocial: string };
}

interface IdentificadoresPropiedad {
  identificadorSuperior?: string;
  identificadorInferior?: string;
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

// Componentes de pestañas temporales mientras se implementan los componentes completos
const Tabs = ({ defaultValue, children, className }: { defaultValue: string, children: React.ReactNode, className: string }) => {
  const [activeTab, setActiveTab] = useState(defaultValue)
  return (
    <div className={className}>
      {React.Children.map(children, child => 
        React.cloneElement(child as React.ReactElement<any>, { activeTab, setActiveTab })
      )}
    </div>
  )
}

const TabsList = ({ children, className, activeTab, setActiveTab }: { children: React.ReactNode, className: string, activeTab: string, setActiveTab: (tab: string) => void }) => (
  <div className={className}>
    {React.Children.map(children, child => 
      React.cloneElement(child as React.ReactElement<any>, { activeTab, setActiveTab })
    )}
  </div>
)

const TabsTrigger = ({ value, children, activeTab, setActiveTab }: { value: string, children: React.ReactNode, activeTab: string, setActiveTab: (tab: string) => void }) => (
  <button 
    className={`px-4 py-2 ${activeTab === value ? 'font-semibold border-b-2 border-blue-500' : 'text-gray-500'}`}
    onClick={() => setActiveTab(value)}
  >
    {children}
  </button>
)

const TabsContent = ({ value, children, activeTab }: { value: string, children: React.ReactNode, activeTab: string }) => {
  if (value !== activeTab) return null
  return <div>{children}</div>
}

// Componentes de tarjeta temporales
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md ${className || ''}`}>{children}</div>
)

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 border-b">{children}</div>
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
  const [activeTab, setActiveTab] = useState('prefacturas');
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

  // Estado para las prefacturas pendientes
  const [prefacturasPendientes, setPrefacturasPendientes] = useState<any[]>([]);
  const [errorPrefacturas, setErrorPrefacturas] = useState<string | null>(null);

  // --- Hooks Apollo Client ---
  const [loadPrefacturas, { loading: isLoadingPrefacturas, error: apolloErrorPrefacturas }] = useLazyQuery(GET_PREFACTURAS_PENDIENTES, {
    variables: { estado: 'PendienteValidacion' },
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      console.log("GraphQL Data Prefacturas Received:", data);
      setPrefacturasPendientes(data?.facturas || []);
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
    console.log("Effect para cargarProyectos (Dropdown): jwtToken es:", jwtToken);
    const cargarProyectos = async () => {
      if (!jwtToken) {
        console.log("cargarProyectos: No JWT token state, skipping fetch.");
        setProyectos(proyectosPrueba);
        return;
      }
      if (!STRAPI_URL_BASE) { 
        console.error("cargarProyectos: STRAPI_URL_BASE no está definida.");
        setProyectos(proyectosPrueba); 
        return;
      }
      try {
        console.log(`cargarProyectos: Fetching from ${STRAPI_URL_BASE}/api/proyectos con token.`);
        // Especificar la estructura de respuesta esperada de Strapi v5
        const response = await axios.get<{ data: Proyecto[] }>(`${STRAPI_URL_BASE}/api/proyectos?populate=*`, { // Añadir populate=* si necesitas más campos
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          }
        }); 
        console.log("cargarProyectos: Respuesta de proyectos:", response.data);
        // Asegurarse de que data exista y sea un array
        if (response.data && Array.isArray(response.data.data)) {
           setProyectos(response.data.data); 
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
    
    cargarProyectos(); // Llamar a la función 
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
     }
  }, [jwtToken, loadPrefacturas]); 

  // Datos de prueba para desarrollo (Restaurado)
  const proyectosPrueba: Proyecto[] = [
    {
      id: '1',
      nombre: 'Almax 3',
      apiContifico: 'V9YjYbqMlMSv4IsuyCfYGiTVDedSNakcmpoRMHxKRW4',
    },
    {
      id: '2',
      nombre: 'Almax 2',
      apiContifico: 'API_KEY_DEMO_ALMAX2',
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

      const response = await axios.post(
        `${STRAPI_URL_BASE}/api/facturas/generar-prefacturas`, 
        { 
          periodo: periodo,
          // Enviar proyectoId (numérico) y los documentIds seleccionados (strings)
          proyectoId: parseInt(proyectoSeleccionadoId, 10), 
          propiedadesSeleccionadasIds: idsArray // <-- Ahora contiene documentIds (strings)
        } 
      );

      setResultadoGeneracion(response.data);
      // Refrescar la lista de pendientes después de generar
      loadPrefacturas(); 

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Facturación y Cobranza</h1>
      
      <Tabs defaultValue="prefacturas" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 border-b" activeTab={activeTab} setActiveTab={setActiveTab}>
          <TabsTrigger value="prefacturas" activeTab={activeTab} setActiveTab={setActiveTab}>Prefacturas</TabsTrigger>
          <TabsTrigger value="facturas" activeTab={activeTab} setActiveTab={setActiveTab}>Facturas</TabsTrigger>
          <TabsTrigger value="pagos" activeTab={activeTab} setActiveTab={setActiveTab}>Pagos</TabsTrigger>
          <TabsTrigger value="configuracion" activeTab={activeTab} setActiveTab={setActiveTab}>Configuración</TabsTrigger>
        </TabsList>
        
        <TabsContent value="prefacturas" activeTab={activeTab}>
          <Card className="w-full mb-6">
            <CardHeader>
              <CardTitle>Generar Prefacturas</CardTitle>
              <CardDescription>
                Inicie la generación de prefacturas para un periodo específico. 
                Actualmente se generarán para el servicio por defecto (ej: AOA3).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Selector de Proyecto */}
              <div className="mb-4">
                <label htmlFor="proyecto" className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto a Facturar:
                </label>
                <select 
                  id="proyecto"
                  value={proyectoSeleccionadoId || ''} 
                  onChange={(e) => setProyectoSeleccionadoId(e.target.value || null)}
                  className="p-2 border rounded w-full md:w-1/2"
                  disabled={isLoadingPropiedades} // Deshabilitar mientras cargan propiedades
                >
                  <option value="">-- Seleccione un Proyecto --</option>
                  {proyectos?.map(p => (
                    <option key={p.id} value={p.documentId}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="periodo" className="block text-sm font-medium text-gray-700 mb-1">
                  Periodo de Facturación (YYYY-MM):
                </label>
                <input 
                  type="month"
                  id="periodo"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="p-2 border rounded w-full md:w-1/3"
                  pattern="[0-9]{4}-[0-9]{2}"
                  required
                />
              </div>

              {/* Sección Tabla de Selección de Propiedades */}
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
              <button
                onClick={handleGenerarPrefacturas}
                disabled={isLoading}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow-md transition duration-150 ease-in-out 
                           ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          <Card className="w-full">
             <CardHeader>
               <CardTitle>Prefacturas Pendientes de Validación</CardTitle>
               <CardDescription>
                 Aquí aparecerán las prefacturas generadas que requieren aprobación.
               </CardDescription>
             </CardHeader>
             <CardContent>
                {/* Renderizado de la tabla de prefacturas pendientes */}
                {isLoadingPrefacturas && <p>Cargando prefacturas...</p>}
                {!isLoadingPrefacturas && (
                  <table className="min-w-full divide-y divide-gray-200 mt-4">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propiedad</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generada</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prefacturasPendientes.length > 0 ? (
                        prefacturasPendientes.map((factura) => {
                          // Acceder directamente a los campos
                          const sup = factura.propiedad?.identificadores?.superior;
                          const inf = factura.propiedad?.identificadores?.inferior;
                          const idSup = factura.propiedad?.identificadores?.idSuperior;
                          const idInf = factura.propiedad?.identificadores?.idInferior;
                          const propId = (sup || inf) ? `${sup || ''} ${idSup || ''}-${inf || ''} ${idInf || ''}` : 'N/A';

                          let razonSocialCliente = 'N/A';
                          if (factura.cliente?.tipoPersona === 'Natural') {
                            razonSocialCliente = factura.cliente.datosPersonaNatural?.razonSocial || 'N/A';
                          } else if (factura.cliente?.tipoPersona === 'Juridica') {
                            razonSocialCliente = factura.cliente.datosPersonaJuridica?.razonSocial || 'N/A';
                          }
                          
                          return (
                            // Usar factura.documentId como key
                            <tr key={factura.documentId}> 
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{factura.periodo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{razonSocialCliente}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{propId}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${factura.total?.toFixed(2) ?? '0.00'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {factura.fechaGeneracion ? new Date(factura.fechaGeneracion).toLocaleDateString() : '-'} 
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button className="text-indigo-600 hover:text-indigo-900 mr-2">Aprobar</button>
                                <button className="text-red-600 hover:text-red-900">Rechazar</button>
                              </td>
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
                )}
             </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="facturas" activeTab={activeTab}>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Facturas emitidas</CardTitle>
              <CardDescription>
                Consulte todas las facturas generadas y su estado actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Aquí se mostrarán las facturas emitidas y su estado.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pagos" activeTab={activeTab}>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Gestión de pagos</CardTitle>
              <CardDescription>
                Registre y verifique pagos realizados por los clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Aquí se mostrarán los pagos registrados y pendientes de verificación.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="configuracion" activeTab={activeTab}>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Configuración de facturación</CardTitle>
              <CardDescription>
                Configure las preferencias de facturación y reglas especiales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Aquí se mostrarán las opciones de configuración.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isLoadingPropiedades && <p>Cargando propiedades del proyecto...</p>}
      {errorProps && <p className="text-red-500">Error al cargar propiedades: {errorProps.message}</p>}
    </div>
  )
} 