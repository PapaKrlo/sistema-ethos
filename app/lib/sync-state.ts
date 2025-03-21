import { emailCache } from './cache';

// Definir la interfaz para el estado de sincronización
export interface SyncState {
  inProgress: boolean;
  progress: number;
  total: number;
  errorCount: number;
  status: string;
  completed: boolean;
  startTime: number;
  endTime: number;
  [key: string]: any; // Para permitir propiedades adicionales
}

// Estado inicial
const initialState: SyncState = {
  inProgress: false,
  progress: 0,
  total: 0,
  errorCount: 0,
  status: '',
  completed: false,
  startTime: 0,
  endTime: 0
};

// Variable para almacenar el estado de sincronización
let syncState: SyncState = { ...initialState };

// Función para obtener el estado actual de sincronización
export const getSyncState = (): SyncState => ({ ...syncState });

// Función para actualizar el estado de sincronización
export const updateSyncState = (update: Partial<SyncState>) => {
  syncState = { ...syncState, ...update };
  // Guardar en caché para que esté disponible entre solicitudes
  try {
    emailCache.set('sync_state', syncState, 3600);
  } catch (error) {
    console.error('Error al guardar estado de sincronización en caché:', error);
  }
};

// Función para restablecer el estado a los valores iniciales
export const resetSyncState = () => {
  syncState = { ...initialState };
  try {
    emailCache.set('sync_state', syncState, 3600);
  } catch (error) {
    console.error('Error al restablecer estado de sincronización en caché:', error);
  }
};

// Inicializar el estado desde la caché si existe
export async function initSyncState() {
  try {
    const cachedState = await emailCache.get('sync_state');
    if (cachedState) {
      syncState = cachedState as SyncState;
    }
  } catch (error) {
    console.error('Error al recuperar estado de sincronización desde caché:', error);
  }
}

// Inicializar al cargar el módulo
initSyncState().catch(error => {
  console.error('Error al inicializar estado de sincronización:', error);
}); 