# Browser File System Access APIs: Research & Implementation Guide

## Overview

This document provides technical reference for implementing the Chrome File System Access API in the External Memory extension. It covers modern browser file system APIs, their capabilities, limitations, and fallback strategies.

## Table of Contents
1. [Chrome File System Access API](#chrome-file-system-access-api)
2. [IndexedDB Storage API](#indexeddb-storage-api)
3. [chrome.storage API](#chrome-storage-api)
4. [Implementation Strategy](#implementation-strategy)
5. [Error Handling](#error-handling)
6. [TypeScript Types](#typescript-types)

---

## Chrome File System Access API

### What It Is

The File System Access API is a modern web API that allows web applications and extensions to read and write files on the user's local file system, with explicit user permission.

**Official Docs**: https://developer.chrome.com/docs/capabilities/web-apis/file-system-access/

### Key APIs

#### 1. `window.showDirectoryPicker()`

Opens a native directory selection dialog.

```typescript
const directoryHandle = await window.showDirectoryPicker(options);
```

**Options**:
```typescript
interface DirectoryPickerOptions {
  id?: string;              // Persistent ID for remembering selection
  mode?: 'read' | 'readwrite';  // Default: 'read'
  startIn?: 'desktop' | 'documents' | 'downloads' | FileSystemHandle;
}
```

**Returns**: `FileSystemDirectoryHandle` object

**Permissions**: User must click button and approve directory access via browser dialog

**Error Cases**:
- `AbortError`: User cancelled directory picker
- `SecurityError`: Not allowed in sandboxed context (usually works in extensions)
- `NotAllowedError`: No permission to access directory

#### 2. `FileSystemDirectoryHandle` Object

Represents a directory with read/write access.

**Key Methods**:

```typescript
// Get or create a file in this directory
getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>

// Get or create a subdirectory
getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>

// Remove a file or directory
removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>

// Iterate through entries in directory
entries(): AsyncIterable<[string, FileSystemHandle]>

// Resolve path from one handle to another
resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>
```

#### 3. `FileSystemFileHandle` Object

Represents a file with read/write access.

**Key Methods**:

```typescript
// Create a writable stream for this file
createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>

// Get file as File object (readable)
getFile(): Promise<File>
```

#### 4. `FileSystemWritableFileStream` Object

A writable stream for writing to files.

**Key Methods**:

```typescript
// Write data (Uint8Array, string, or Blob)
write(data: Uint8Array | string | Blob): Promise<void>

// Seek to position in file
seek(position: number): Promise<void>

// Truncate file to specified size
truncate(size: number): Promise<void>

// Close and flush all writes
close(): Promise<void>
```

**Example Write Pattern**:
```typescript
const writable = await fileHandle.createWritable();
await writable.write("Hello World");
await writable.close();
```

### Browser Support

| Browser | Support | Version |
|---------|---------|---------|
| Chrome | ✅ | 86+ |
| Edge | ✅ | 86+ |
| Opera | ✅ | 72+ |
| Firefox | ⚠️ | Partial (behind flag) |
| Safari | ❌ | Not yet |

**Detection**:
```typescript
const supported = 'showDirectoryPicker' in window;
```

### Permissions & Security

1. **Permission Required**: User must explicitly grant directory access via browser dialog
2. **Per-Directory**: Permissions are per directory (users select folder, not individual files)
3. **Sandbox**: Works in content scripts and service workers (restricted contexts)
4. **Persistence**: FileSystemDirectoryHandle can be stored and reused
5. **Handle Serialization**: Handles can be saved via structured clone (IndexedDB, chrome.storage)

### Limitations

1. Cannot access system directories (e.g., `/etc`, `C:\Windows`)
2. Cannot list all directories on disk
3. Cannot create new top-level directories
4. Permission expires when stored handle becomes invalid
5. Not available in all browsers (need fallback for Safari, Firefox)

---

## IndexedDB Storage API

### What It Is

IndexedDB is a large-scale, NoSQL database built into browsers. Perfect for client-side storage of conversations as JSON.

**Official Docs**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

### Basic Operations

#### 1. Open Database

```typescript
const request = indexedDB.open('ExternalMemoryDB', 1);

request.onerror = () => console.error('Failed to open DB');
request.onsuccess = () => {
  const db = request.result;
};
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('conversations')) {
    db.createObjectStore('conversations', { keyPath: 'conversationId' });
  }
};
```

#### 2. Store Data

```typescript
const transaction = db.transaction(['conversations'], 'readwrite');
const store = transaction.objectStore('conversations');
const request = store.put({
  conversationId: 'conv-123',
  messages: [...],
  createdAt: Date.now(),
  lastUpdated: Date.now()
});

request.onsuccess = () => console.log('Stored');
request.onerror = () => console.error('Failed to store');
```

#### 3. Retrieve Data

```typescript
const transaction = db.transaction(['conversations'], 'readonly');
const store = transaction.objectStore('conversations');
const request = store.get('conv-123');

request.onsuccess = () => {
  const conversation = request.result;
};
```

#### 4. Query All

```typescript
const transaction = db.transaction(['conversations'], 'readonly');
const store = transaction.objectStore('conversations');
const request = store.getAll();

request.onsuccess = () => {
  const allConversations = request.result;
};
```

### Browser Support

| Browser | Support | Version |
|---------|---------|---------|
| Chrome | ✅ | 24+ |
| Firefox | ✅ | 16+ |
| Safari | ✅ | 10+ |
| Edge | ✅ | 12+ |
| Opera | ✅ | 15+ |

**Detection**:
```typescript
const supported = !!window.indexedDB;
```

### Advantages for This Project

1. ✅ Available in all browsers
2. ✅ Large storage capacity (typically 50MB+)
3. ✅ Good for storing JSON conversations
4. ✅ Built-in search and filtering
5. ✅ Async API (no blocking)

### Limitations

1. Not file system (can't create real markdown files)
2. Storage quota varies by browser
3. Data deleted if extension uninstalled
4. Can't directly access from file system

---

## chrome.storage API

### What It Is

Chrome-native storage API built into Chrome extensions. Limited capacity.

**Official Docs**: https://developer.chrome.com/docs/extensions/reference/storage/

### Storage Areas

1. **chrome.storage.local**: Persistent local storage (no sync across devices)
2. **chrome.storage.sync**: Synced across user's Chrome profile (limited to 100KB)
3. **chrome.storage.session**: Memory-only, cleared on browser close

### Basic Operations

#### Store FileSystemDirectoryHandle

```typescript
const directoryHandle = await window.showDirectoryPicker();
// Save handle for later use
await chrome.storage.local.set({
  'vaultDirectoryHandle': directoryHandle
});
```

#### Retrieve FileSystemDirectoryHandle

```typescript
const data = await chrome.storage.local.get('vaultDirectoryHandle');
const directoryHandle = data.vaultDirectoryHandle;

// Verify handle is still valid
try {
  await directoryHandle.queryPermission({ mode: 'readwrite' });
} catch (error) {
  console.log('Handle no longer valid');
}
```

### Browser Support

| Browser | Support | Version |
|---------|---------|---------|
| Chrome | ✅ | All |
| Edge | ✅ | All |
| Firefox | ⚠️ | Limited |
| Safari | ❌ | No |

### Advantages for This Project

1. ✅ Perfect for storing FileSystemDirectoryHandle
2. ✅ Persists across extension reloads
3. ✅ Simple API
4. ✅ Built into Chrome

### Limitations

1. Small capacity (5MB local, 100KB sync)
2. Chrome-extension-only (not web API)
3. Can't store large data structures

---

## Implementation Strategy

### Fallback Chain Architecture

```
┌─────────────────────────────────────────────────┐
│ Initialize Storage Adapter                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ 1. Load stored FileSystemDirectoryHandle       │
│    from chrome.storage.local                   │
│    ↓                                            │
│    Success → Use ObsidianAdapter with handle   │
│    │                                            │
│    Failure (handle invalid) → Continue to 2    │
│                                                 │
│ 2. Is File System API available?               │
│    ↓                                            │
│    Yes → Prompt user to select directory       │
│    │      Store handle in chrome.storage.local │
│    │      Use ObsidianAdapter                  │
│    │                                            │
│    No (Safari, old browser) → Continue to 3    │
│                                                 │
│ 3. Is IndexedDB available?                     │
│    ↓                                            │
│    Yes → Use IndexedDBAdapter                  │
│    │                                            │
│    No (very old browser) → Continue to 4       │
│                                                 │
│ 4. Use InMemoryAdapter (fallback)              │
│    (No persistence, only for current session)  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Directory Handle Lifecycle

```
User Selects Directory
    ↓
showDirectoryPicker() opens browser dialog
    ↓
User grants permission
    ↓
FileSystemDirectoryHandle returned
    ↓
Store in chrome.storage.local
    ↓
Use for file operations (read, write)
    ↓
If handle becomes invalid (permissions revoked):
    → Prompt user to re-select directory
    → Update stored handle
```

### Recommended Implementation Pattern

```typescript
// In service worker
let storageAdapter: StorageAdapter;

async function initializeStorage() {
  // 1. Try to load stored handle
  const stored = await chrome.storage.local.get('vaultDirectoryHandle');
  if (stored.vaultDirectoryHandle) {
    try {
      storageAdapter = new ObsidianAdapter(stored.vaultDirectoryHandle);
      console.log('Initialized with stored Obsidian vault');
      return;
    } catch (error) {
      console.warn('Stored vault handle invalid:', error);
    }
  }

  // 2. Check for File System API
  if ('showDirectoryPicker' in window) {
    console.log('File System API available');
    // User will select directory via UI
    // This happens later, not on startup
    // For now, use fallback
  }

  // 3. Try IndexedDB
  if (window.indexedDB) {
    storageAdapter = new IndexedDBAdapter();
    console.log('Initialized with IndexedDB adapter');
    return;
  }

  // 4. Fallback to InMemory
  storageAdapter = new InMemoryAdapter();
  console.log('Initialized with InMemoryAdapter (fallback)');
}

await initializeStorage();
```

---

## Error Handling

### FileSystemDirectoryHandle Errors

```typescript
try {
  const directoryHandle = await window.showDirectoryPicker();
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('User cancelled directory selection');
  } else if (error.name === 'SecurityError') {
    console.error('Security error - not allowed in this context');
  } else if (error.name === 'NotAllowedError') {
    console.error('Permission denied');
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Handle Validity Check

```typescript
async function isHandleValid(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    // Try to query permission
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch (error) {
    return false;
  }
}
```

### Write Error Recovery

```typescript
async function safeWrite(fileHandle: FileSystemFileHandle, content: string) {
  try {
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(content);
    await writable.close();
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.error('Permission denied for file write');
      throw new Error('No permission to write to vault');
    } else if (error.name === 'QuotaExceededError') {
      console.error('Disk space exceeded');
      throw new Error('Vault disk space exceeded');
    } else {
      throw error;
    }
  }
}
```

---

## TypeScript Types

### FileSystemHandle Types

```typescript
// File System API interfaces
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  queryPermission(descriptor?: PermissionDescriptor): Promise<PermissionStatus>;
  requestPermission(descriptor?: PermissionDescriptor): Promise<PermissionStatus>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>;
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>;
  entries(): AsyncIterable<[string, FileSystemHandle]>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface FileSystemGetFileOptions {
  create?: boolean;
}

interface FileSystemGetDirectoryOptions {
  create?: boolean;
}

interface FileSystemRemoveOptions {
  recursive?: boolean;
}

interface FileSystemWritableFileStream extends WritableStream<Uint8Array> {
  write(data: Uint8Array | string | Blob): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

// Global augmentation
declare global {
  interface Window {
    showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
  }
}

interface DirectoryPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: 'desktop' | 'documents' | 'downloads' | FileSystemHandle;
}
```

---

## References

### Official Documentation
- [Chrome File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access/)
- [MDN File System Access](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [IndexedDB API Reference](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

### Examples
- [Google's File System Access API Demo](https://github.com/GoogleChromeLabs/browser-fs-access)
- [MDN IndexedDB Examples](https://github.com/mdn/dom-examples/tree/master/indexeddb-api)

### Related Tasks
- Task 3.2: ObsidianAdapter implementation (Node.js version)
- Task 3.2.1: Browser-compatible refactor (this task)
- Task 3.3: Settings UI with directory picker

---

**Document Version**: 1.0
**Last Updated**: 2025-11-12
**Status**: Research Complete ✅
