import { AUTOSAVE_DB_NAME, AUTOSAVE_DB_VERSION, AUTOSAVE_STORE_NAME, AUTOSAVE_DEBOUNCE_MS } from '../constants';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(AUTOSAVE_DB_NAME, AUTOSAVE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUTOSAVE_STORE_NAME)) {
        db.createObjectStore(AUTOSAVE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function saveCanvasData(pageId: string, canvas: HTMLCanvasElement): Promise<void> {
  try {
    const db = await openDB();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;

    const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(AUTOSAVE_STORE_NAME);
    store.put(blob, pageId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently fail — autosave is best-effort
  }
}

export async function loadCanvasData(pageId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readonly');
    const store = tx.objectStore(AUTOSAVE_STORE_NAME);
    const request = store.get(pageId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearCanvasData(pageId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(AUTOSAVE_STORE_NAME);
    store.delete(pageId);
  } catch {
    // best-effort
  }
}

/**
 * Creates a debounced autosave function for a given page.
 * Returns `{ trigger, cancel }`.
 */
export function createAutosaver(pageId: string) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const trigger = (canvas: HTMLCanvasElement) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveCanvasData(pageId, canvas);
      timer = null;
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { trigger, cancel };
}
