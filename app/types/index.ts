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
    perfilOperacional?: {
      usuario: {
        username: string;
      };
    };
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