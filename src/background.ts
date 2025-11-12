/**
 * Service Worker for External Memory Chrome Extension
 *
 * Handles background logic, message passing between content scripts,
 * and coordinates with storage systems.
 */

import { StorageService } from './services/StorageService';
import { InMemoryAdapter } from './adapters/InMemoryAdapter';
import { ObsidianAdapter as ObsidianAdapterBrowser } from './adapters/ObsidianAdapter.browser';
import { isFileSystemAPIAvailable } from './types/FileSystemHandle';
import { CapturedMessage } from './types/Message';
import { getDirectoryHandle } from './utils/handleStorage';

try {
  const timestamp = new Date().toISOString();
  console.log(`[External Memory] Service worker started at ${timestamp}`);

  // Initialize storage adapter with fallback chain
  let storageAdapter: any;
  let adapterChainLog = '';

  async function initializeStorageAdapter() {
    // 1. Try to load stored FileSystemDirectoryHandle from IndexedDB
    console.log('[External Memory] Initializing storage adapter with fallback chain...');

    try {
      console.log('[External Memory] Attempting to retrieve vault directory handle from IndexedDB...');
      const directoryHandle = await getDirectoryHandle();

      if (directoryHandle) {
        console.log('[External Memory] ✓ Found stored vault handle in IndexedDB');
        try {
          // Validate that the handle still has permission
          console.log('[External Memory] Validating handle permissions...');
          const permission = await directoryHandle.queryPermission({ mode: 'readwrite' });
          console.log(`[External Memory] Handle permission status: ${permission}`);

          if (permission === 'granted') {
            storageAdapter = new ObsidianAdapterBrowser(directoryHandle);
            adapterChainLog = `Obsidian (Browser API) - using stored vault directory: ${directoryHandle.name}`;
            console.log(`[External Memory] ✅ ${adapterChainLog}`);
            return;
          } else {
            console.warn('[External Memory] ⚠️  Handle permission not granted (status:', permission, ')');
            console.log('[External Memory] Trying to request permission from user...');
            try {
              const permissionResult = await directoryHandle.requestPermission({ mode: 'readwrite' });
              if (permissionResult === 'granted') {
                storageAdapter = new ObsidianAdapterBrowser(directoryHandle);
                adapterChainLog = `Obsidian (Browser API) - using stored vault directory: ${directoryHandle.name}`;
                console.log(`[External Memory] ✅ ${adapterChainLog}`);
                return;
              }
            } catch (permError) {
              console.warn('[External Memory] Could not request permission:', permError);
            }
            console.log('[External Memory] Falling back to InMemoryAdapter');
          }
        } catch (error) {
          console.warn('[External Memory] Stored vault handle invalid or inaccessible:', error);
          console.log('[External Memory] This may happen if the handle lost its context');
        }
      } else {
        console.log('[External Memory] ℹ️  No stored vault handle found in IndexedDB');
      }
    } catch (error) {
      console.error('[External Memory] Error accessing IndexedDB for vault handle:', error);
    }

    // 2. Check for File System API availability
    if (isFileSystemAPIAvailable()) {
      console.log('[External Memory] ✓ Chrome File System Access API available');
      console.log('[External Memory] ⚠️  ACTION REQUIRED: Open extension popup and select vault directory');
    } else {
      console.log('[External Memory] Chrome File System Access API not available (Chrome 86+ required)');
    }

    // 3. Fallback to InMemoryAdapter (temporary storage until user selects vault)
    storageAdapter = new InMemoryAdapter();
    adapterChainLog = 'InMemoryAdapter (temporary - waiting for vault directory selection)';
    console.log(`[External Memory] ${adapterChainLog}`);
    console.log('[External Memory] ℹ️  Messages will persist once you select a vault directory in the extension popup');
  }

  // Initialize storage adapter synchronously or asynchronously
  const initPromise = initializeStorageAdapter();

  // Create storage service once adapter is ready
  let storageService: StorageService;

  initPromise.then(() => {
    storageService = new StorageService(storageAdapter);
    console.log(
      `[External Memory] Storage service initialized with: ${adapterChainLog}`
    );
    console.log('[External Memory] Service worker initialized and ready');
  }).catch((error) => {
    console.error('[External Memory] Fatal error initializing storage adapter:', error);
    // Fallback to InMemory if all else fails
    storageAdapter = new InMemoryAdapter();
    storageService = new StorageService(storageAdapter);
    console.log('[External Memory] Service worker initialized with emergency fallback (InMemoryAdapter)');
  });

  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener(
    (message: any, sender: any, sendResponse: any) => {
      try {
        console.log('[External Memory] Message received from:', sender.url);
        console.log('[External Memory] Message type:', message?.type);

        // Handle captured messages from content script
        if (message?.type === 'capture_messages') {
          console.log(
            `[External Memory] Processing capture_messages: ${message?.data?.length || 0} messages from ${message?.platform}`
          );

          // Save messages to storage
          const messagesToSave: CapturedMessage[] = message?.data || [];

          // Save messages asynchronously but respond immediately
          if (storageService) {
            storageService
              .saveMessages(messagesToSave)
              .then(() => {
                const adapterName = adapterChainLog.split(' -')[0];
                console.log(
                  `[External Memory] Successfully saved ${messagesToSave.length} message(s) to ${adapterName}`
                );
              })
              .catch((error) => {
                console.error('[External Memory] Error saving messages to storage:', error);
              });
          } else {
            console.warn('[External Memory] Storage service not yet initialized, message save delayed');
          }

          const response = {
            type: 'capture_messages_response',
            data: 'Messages received and queued for storage',
            timestamp: Date.now(),
            received: true,
            messageCount: messagesToSave.length,
          };

          console.log('[External Memory] Sending response back to content script');
          sendResponse(response);
        }
        // Handle storage stats request (for debugging)
        else if (message?.type === 'get_storage_stats') {
          console.log('[External Memory] Retrieving storage statistics');

          storageService
            .getStorageStats()
            .then((stats) => {
              console.log('[External Memory] Storage stats retrieved:', stats);
              sendResponse({
                type: 'storage_stats_response',
                data: stats,
                timestamp: Date.now(),
                received: true,
              });
            })
            .catch((error) => {
              console.error('[External Memory] Error getting storage stats:', error);
              sendResponse({
                type: 'storage_stats_response',
                error: String(error),
                timestamp: Date.now(),
                received: false,
              });
            });

          return true; // Keep connection open for async response
        }
        // Handle test message
        else if (message?.type === 'test') {
          console.log('[External Memory] Processing test message');

          const response = {
            type: 'test_response',
            data: 'Message received by service worker',
            timestamp: Date.now(),
            received: true,
          };

          console.log('[External Memory] Sending response back to content script:', response);
          sendResponse(response);
        } else {
          // Default response for unknown message types
          console.log('[External Memory] Received unknown message type, sending default response');
          sendResponse({
            received: true,
            timestamp: Date.now(),
            data: 'Message acknowledged',
          });
        }
      } catch (error) {
        console.error('[External Memory] Error handling message:', error);
        sendResponse({ received: false, error: String(error), timestamp: Date.now() });
      }
    }
  );
} catch (error) {
  console.error('[External Memory] Fatal error in service worker initialization:', error);
}
