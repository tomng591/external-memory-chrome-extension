/**
 * Handle Storage Utility
 *
 * Manages persistence of FileSystemDirectoryHandle objects using IndexedDB.
 * chrome.storage.local cannot serialize these objects, so we use IndexedDB instead.
 */

import { FileSystemDirectoryHandle } from '../types/FileSystemHandle';

const DB_NAME = 'ExternalMemoryHandles';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'vaultDirectoryHandle';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens or creates the IndexedDB database for storing handles
 */
function getDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[HandleStorage] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
          console.log('[HandleStorage] Created object store:', STORE_NAME);
        }
      };
    } catch (error) {
      console.error('[HandleStorage] Error initializing database:', error);
      reject(error);
    }
  });

  return dbPromise;
}

/**
 * Stores a FileSystemDirectoryHandle in IndexedDB
 */
export async function storeDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  dirName: string
): Promise<void> {
  try {
    const db = await getDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const data = {
      handle: handle,
      name: dirName,
      timestamp: Date.now(),
    };

    const request = store.put(data, HANDLE_KEY);

    return new Promise((resolve, reject) => {
      request.onerror = () => {
        console.error('[HandleStorage] Error storing handle:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log('[HandleStorage] Successfully stored directory handle:', dirName);
        resolve();
      };
    });
  } catch (error) {
    console.error('[HandleStorage] Failed to store directory handle:', error);
    throw error;
  }
}

/**
 * Retrieves a FileSystemDirectoryHandle from IndexedDB
 */
export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    console.log('[HandleStorage] Opening database to retrieve handle...');
    const db = await getDatabase();
    console.log('[HandleStorage] Database opened, creating transaction...');

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(HANDLE_KEY);

    return new Promise((resolve, reject) => {
      request.onerror = () => {
        console.error('[HandleStorage] IndexedDB error retrieving handle:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        const data = request.result;
        console.log('[HandleStorage] IndexedDB query complete, data:', data ? 'found' : 'not found');
        if (data?.handle) {
          console.log('[HandleStorage] ✓ Retrieved directory handle from IndexedDB:', data.name);
          resolve(data.handle as FileSystemDirectoryHandle);
        } else {
          console.log('[HandleStorage] ⚠️  No stored directory handle found in IndexedDB');
          if (!data) {
            console.log('[HandleStorage] Object store appears to be empty or key does not exist');
          }
          resolve(null);
        }
      };

      // Add timeout to catch stuck requests
      setTimeout(() => {
        if (request.readyState === 'pending') {
          console.warn('[HandleStorage] IndexedDB request timeout - handle retrieval taking too long');
          reject(new Error('IndexedDB request timeout'));
        }
      }, 5000);
    });
  } catch (error) {
    console.error('[HandleStorage] Exception while retrieving directory handle:', error);
    if (error instanceof Error) {
      console.error('[HandleStorage] Error details:', error.message);
    }
    return null;
  }
}

/**
 * Removes the stored FileSystemDirectoryHandle from IndexedDB
 */
export async function removeDirectoryHandle(): Promise<void> {
  try {
    const db = await getDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(HANDLE_KEY);

    return new Promise((resolve, reject) => {
      request.onerror = () => {
        console.error('[HandleStorage] Error removing handle:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log('[HandleStorage] Successfully removed directory handle');
        resolve();
      };
    });
  } catch (error) {
    console.error('[HandleStorage] Failed to remove directory handle:', error);
    throw error;
  }
}

/**
 * Gets the stored directory name from chrome.storage.local (metadata only)
 */
export async function getStoredDirectoryName(): Promise<string | null> {
  try {
    const result = await (chrome.storage as any).local.get('vaultDirectoryName');
    return result.vaultDirectoryName || null;
  } catch (error) {
    console.error('[HandleStorage] Error getting directory name:', error);
    return null;
  }
}

/**
 * Stores directory name in chrome.storage.local (metadata only)
 */
export async function storeDirectoryName(dirName: string): Promise<void> {
  try {
    await (chrome.storage as any).local.set({
      vaultDirectoryName: dirName,
      vaultDirectorySelectedAt: Date.now(),
    });
    console.log('[HandleStorage] Stored directory name:', dirName);
  } catch (error) {
    console.error('[HandleStorage] Error storing directory name:', error);
    throw error;
  }
}
