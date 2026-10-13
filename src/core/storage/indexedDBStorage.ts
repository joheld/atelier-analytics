import { WorksheetTab, CalculatedField, Parameter, DatasetMeta } from '../ast/types';

const DB_NAME = 'atelier_analytics_db_v1';
const DB_VERSION = 1;
const DATASET_STORE = 'datasets';
const SESSION_STORAGE_KEY = 'atelier_active_session_v1';

export interface PersistedDatasetRecord {
  id: string;
  fileName: string;
  blob: Blob;
  fileType: string;
  meta?: DatasetMeta;
  updatedAt: number;
}

export interface ActiveSessionSnapshot {
  version: 1;
  updatedAt: number;
  activeTabId: string;
  sheets: WorksheetTab[];
  calculatedFields: CalculatedField[];
  parameters: Parameter[];
  theme: 'light' | 'dark';
  currentDatasetId?: string;
  currentDatasetName?: string;
}

/**
 * Opens or initializes the Atelier Analytics IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB no está disponible en este entorno.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DATASET_STORE)) {
        db.createObjectStore(DATASET_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists a dataset Blob into IndexedDB
 */
export async function saveDatasetBlob(
  id: string,
  fileName: string,
  blob: Blob,
  meta?: DatasetMeta
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATASET_STORE, 'readwrite');
      const store = tx.objectStore(DATASET_STORE);

      const record: PersistedDatasetRecord = {
        id,
        fileName,
        blob,
        fileType: blob.type || 'application/octet-stream',
        meta,
        updatedAt: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[Storage] Error al persistir dataset en IndexedDB:', err);
  }
}

/**
 * Retrieves a persisted dataset record from IndexedDB by id
 */
export async function getDatasetBlob(id: string): Promise<PersistedDatasetRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATASET_STORE, 'readonly');
      const store = tx.objectStore(DATASET_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve((request.result as PersistedDatasetRecord) || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[Storage] Error al recuperar dataset desde IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieves the most recently saved dataset record from IndexedDB
 */
export async function getLatestDatasetBlob(): Promise<PersistedDatasetRecord | null> {
  const all = await getAllDatasetBlobs();
  return all.length > 0 ? all[0] : null;
}

/**
 * Retrieves all saved dataset records from IndexedDB
 */
export async function getAllDatasetBlobs(): Promise<PersistedDatasetRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATASET_STORE, 'readonly');
      const store = tx.objectStore(DATASET_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as PersistedDatasetRecord[]) || [];
        records.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[Storage] Error al buscar datasets en IndexedDB:', err);
    return [];
  }
}

/**
 * Deletes a dataset record from IndexedDB
 */
export async function deleteDatasetBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATASET_STORE, 'readwrite');
      const store = tx.objectStore(DATASET_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[Storage] Error al eliminar dataset en IndexedDB:', err);
  }
}

/**
 * Clears all datasets from IndexedDB
 */
export async function clearAllDatasets(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATASET_STORE, 'readwrite');
      const store = tx.objectStore(DATASET_STORE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[Storage] Error al limpiar datasets en IndexedDB:', err);
  }
}

// In-memory fallback for environments where window.localStorage is not defined (e.g. Node/Vitest)
let memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore[key] ?? null;
  } catch {
    return memoryStore[key] ?? null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    } else {
      memoryStore[key] = value;
    }
  } catch {
    memoryStore[key] = value;
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    } else {
      delete memoryStore[key];
    }
  } catch {
    delete memoryStore[key];
  }
}

/**
 * Saves workbook active session state to localStorage / fallback storage
 */
export function saveActiveSession(snapshot: ActiveSessionSnapshot): void {
  try {
    safeSetItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[Storage] Error al guardar sesión en localStorage:', err);
  }
}

/**
 * Loads workbook active session state from localStorage / fallback storage
 */
export function getActiveSession(): ActiveSessionSnapshot | null {
  try {
    const raw = safeGetItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSessionSnapshot;
  } catch (err) {
    console.warn('[Storage] Error al leer sesión de localStorage:', err);
    return null;
  }
}

/**
 * Clears workbook active session from localStorage / fallback storage
 */
export function clearActiveSession(): void {
  try {
    safeRemoveItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('[Storage] Error al limpiar sesión de localStorage:', err);
  }
}
