/**
 * TypeScript definitions for Chrome File System Access API
 * These types define the FileSystemDirectoryHandle and FileSystemFileHandle
 * interfaces used for browser-based file system access in the extension.
 */

/**
 * Base interface for all file system handles
 */
export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;

  queryPermission(descriptor?: PermissionDescriptor): Promise<PermissionStatus>;
  requestPermission(descriptor?: PermissionDescriptor): Promise<PermissionStatus>;
}

/**
 * Represents a file handle with read/write capabilities
 */
export interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';

  /**
   * Get the file as a File object for reading
   */
  getFile(): Promise<File>;

  /**
   * Create a writable stream for writing to the file
   */
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
}

/**
 * Represents a directory handle with file/subdirectory access
 */
export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';

  /**
   * Get or create a file in this directory
   */
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;

  /**
   * Get or create a subdirectory in this directory
   */
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>;

  /**
   * Remove a file or directory
   */
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>;

  /**
   * Iterate through all entries in this directory
   */
  entries(): AsyncIterable<[string, FileSystemHandle]>;

  /**
   * Resolve a path from this handle to a possible descendant
   */
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
}

/**
 * Options for creating a writable file stream
 */
export interface FileSystemCreateWritableOptions {
  /**
   * If true, the file contents are preserved.
   * If false (default), the file is truncated.
   */
  keepExistingData?: boolean;
}

/**
 * Options for getting a file handle
 */
export interface FileSystemGetFileOptions {
  /**
   * If true, creates the file if it doesn't exist
   */
  create?: boolean;
}

/**
 * Options for getting a directory handle
 */
export interface FileSystemGetDirectoryOptions {
  /**
   * If true, creates the directory if it doesn't exist
   */
  create?: boolean;
}

/**
 * Options for removing entries
 */
export interface FileSystemRemoveOptions {
  /**
   * If true, removes recursively (for directories with contents)
   */
  recursive?: boolean;
}

/**
 * Writable stream interface for file operations
 */
export interface FileSystemWritableFileStream extends WritableStream<Uint8Array | string> {
  /**
   * Write data to the file
   */
  write(data: Uint8Array | string | Blob): Promise<void>;

  /**
   * Seek to a position in the file
   */
  seek(position: number): Promise<void>;

  /**
   * Truncate the file to a specific size
   */
  truncate(size: number): Promise<void>;

  /**
   * Close the stream and flush all writes
   */
  close(): Promise<void>;
}

/**
 * Options for directory picker dialog
 */
export interface DirectoryPickerOptions {
  /**
   * Unique identifier for the directory selection
   * Used to remember the user's last selection
   */
  id?: string;

  /**
   * Access mode requested
   */
  mode?: 'read' | 'readwrite';

  /**
   * Suggested starting location for the picker
   */
  startIn?: 'desktop' | 'documents' | 'downloads' | FileSystemHandle;
}

/**
 * Permission descriptor for querying/requesting permissions
 */
export interface PermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

/**
 * Permission status values
 */
export type PermissionStatus = 'granted' | 'denied' | 'prompt';

/**
 * Global augmentation to add File System Access API to window
 */
declare global {
  interface Window {
    /**
     * Opens a directory picker dialog for selecting a folder
     * Returns a FileSystemDirectoryHandle for the selected directory
     */
    showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;

    /**
     * Opens a file picker dialog for selecting a file
     */
    showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;

    /**
     * Opens a file save dialog
     */
    showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
  }
}

/**
 * Utility type to check if File System API is available
 * Works in both popup (window) and service worker (globalThis) contexts
 */
export function isFileSystemAPIAvailable(): boolean {
  // Check for window (popup context)
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    return true;
  }
  // Check for globalThis (service worker context)
  if (typeof globalThis !== 'undefined' && 'showDirectoryPicker' in globalThis) {
    return true;
  }
  return false;
}

/**
 * Utility function to check if a handle has valid permissions
 */
export async function isHandleValid(
  handle: FileSystemDirectoryHandle | FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
  try {
    const permission = await handle.queryPermission({ mode });
    return permission === 'granted';
  } catch (error) {
    return false;
  }
}
