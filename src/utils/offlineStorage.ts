/**
 * Offline Storage using IndexedDB
 * Stores data locally when offline and syncs when back online
 */

const DB_NAME = "agroeye_offline";
const DB_VERSION = 1;
const STORES = {
  SYNC_QUEUE: "sync_queue",
  CACHED_DATA: "cached_data",
};

interface SyncQueueItem {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

let db: IDBDatabase | null = null;

export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Sync queue store
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
        syncStore.createIndex("timestamp", "timestamp", { unique: false });
        syncStore.createIndex("table", "table", { unique: false });
      }

      // Cached data store
      if (!database.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cacheStore = database.createObjectStore(STORES.CACHED_DATA, { keyPath: "key" });
        cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };
  });
}

// Add item to sync queue
export async function addToSyncQueue(
  table: string,
  operation: SyncQueueItem["operation"],
  data: Record<string, unknown>
): Promise<void> {
  const database = await initOfflineDB();
  
  const item: SyncQueueItem = {
    id: `${table}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    table,
    operation,
    data,
    timestamp: Date.now(),
    retries: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.add(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all pending sync items
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.SYNC_QUEUE, "readonly");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove item from sync queue
export async function removeFromSyncQueue(id: string): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Update retry count
export async function updateSyncItemRetries(id: string, retries: number): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.retries = retries;
        store.put(item);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Cache data locally
export async function cacheData(
  key: string,
  data: unknown,
  ttlMinutes: number = 60
): Promise<void> {
  const database = await initOfflineDB();

  const item: CachedData = {
    key,
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.CACHED_DATA, "readwrite");
    const store = tx.objectStore(STORES.CACHED_DATA);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.CACHED_DATA, "readonly");
    const store = tx.objectStore(STORES.CACHED_DATA);
    const request = store.get(key);

    request.onsuccess = () => {
      const item = request.result as CachedData | undefined;
      if (item && item.expiresAt > Date.now()) {
        resolve(item.data as T);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Clear expired cache
export async function clearExpiredCache(): Promise<void> {
  const database = await initOfflineDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.CACHED_DATA, "readwrite");
    const store = tx.objectStore(STORES.CACHED_DATA);
    const index = store.index("expiresAt");
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Get sync queue count
export async function getSyncQueueCount(): Promise<number> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.SYNC_QUEUE, "readonly");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
