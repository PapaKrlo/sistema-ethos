export interface Property {
    imagen?: {
      url?: string;
      documentId: string;
    };
    documentId: string;
    identificadores: {
      idSuperior: string;
      superior: string;
      idInferior: string;
      inferior: string;
    };
    estadoUso: "enUso" | "disponible";
    estadoEntrega: string;
    estadoDeConstruccion: string;
    actividad?: string;
    montoFondoInicial: number;
    montoAlicuotaOrdinaria: number;
    areaTotal: number;
    areasDesglosadas?: {
      area: number;
      tipoDeArea: string;
    }[];
    modoIncognito: boolean;
    ocupantes: {
      perfilCliente: any;
      datosPersonaNatural: any;
      datosPersonaJuridica: any;
      tipoPersona: string;
      tipoOcupante: string;
    }[];
    propietario?: {
      tipoPersona: "Natural" | "Juridica";
      datosPersonaNatural?: {
        razonSocial: string;
        cedula?: string;
        ruc?: string;
      };
      datosPersonaJuridica?: {
        razonSocial: string;
        nombreComercial?: string;
      };
      contactoAccesos?: {
        nombreCompleto?: string;
        email?: string;
        telefono?: string;
      };
    };
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    documentId: string;
    nombre: string;
    descripcion: string;
    ubicacion: string;
    tasaBaseFondoInicial: number;
    tasaBaseAlicuotaOrdinaria: number;
    perfiles_operacionales?: Array<{
      documentId?: string;
      usuario: {
        username: string;
      };
    }>;
    unidadNegocio?: {
      nombre: string;
    };
    fotoProyecto?: {
      url: string;
    };
    propiedades: Property[];
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
} 