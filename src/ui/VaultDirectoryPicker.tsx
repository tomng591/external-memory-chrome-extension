import React, { useState } from 'react';
import { FileSystemDirectoryHandle, isFileSystemAPIAvailable } from '../types/FileSystemHandle';
import { storeDirectoryHandle, storeDirectoryName } from '../utils/handleStorage';

interface VaultDirectoryPickerProps {
  onDirectorySelected?: (handle: FileSystemDirectoryHandle) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

/**
 * VaultDirectoryPicker Component
 *
 * Allows users to select an Obsidian vault directory using the
 * Chrome File System Access API. Falls back gracefully if API not available.
 */
export const VaultDirectoryPicker: React.FC<VaultDirectoryPickerProps> = ({
  onDirectorySelected,
  onError,
  disabled = false,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>('No vault selected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable] = useState(isFileSystemAPIAvailable());

  const handlePickDirectory = async () => {
    if (!apiAvailable) {
      const errMsg = 'File System Access API not available in this browser. Using IndexedDB for storage instead.';
      setError(errMsg);
      if (onError) {
        onError(new Error(errMsg));
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[VaultDirectoryPicker] Opening directory picker...');
      const directoryHandle = await window.showDirectoryPicker({
        id: 'obsidian-vault',
        mode: 'readwrite',
        startIn: 'documents',
      });

      console.log('[VaultDirectoryPicker] Directory selected:', directoryHandle.name);
      console.log('[VaultDirectoryPicker] Storing directory handle in IndexedDB...');

      // Store the handle in IndexedDB (chrome.storage.local cannot serialize FileSystemDirectoryHandle)
      try {
        await storeDirectoryHandle(directoryHandle, directoryHandle.name);
        console.log('[VaultDirectoryPicker] Successfully stored handle in IndexedDB');
      } catch (storageError) {
        console.error('[VaultDirectoryPicker] Failed to store in IndexedDB:', storageError);
        // Don't fail - continue anyway, we'll at least store the name
      }

      try {
        await storeDirectoryName(directoryHandle.name);
        console.log('[VaultDirectoryPicker] Successfully stored directory name in chrome.storage');
      } catch (nameError) {
        console.error('[VaultDirectoryPicker] Failed to store directory name:', nameError);
      }

      setSelectedPath(directoryHandle.name);
      console.log('[VaultDirectoryPicker] Vault directory selected:', directoryHandle.name);

      if (onDirectorySelected) {
        onDirectorySelected(directoryHandle);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      console.error('[VaultDirectoryPicker] Caught error - name:', error.name, 'message:', error.message);

      if (error.name === 'AbortError') {
        setError('Directory selection cancelled. Please try again.');
        console.log('[VaultDirectoryPicker] User cancelled directory selection');
      } else if (error.name === 'NotAllowedError') {
        setError('Permission denied. Please grant access to the directory.');
      } else if (error.name === 'SecurityError') {
        setError('Security error. File System API may not be available in this context.');
      } else if (error.name === 'DataCloneError') {
        setError('Error storing directory. Please try again.');
        console.error('[VaultDirectoryPicker] DataCloneError - handle may not be cloneable');
      } else {
        setError(`Error: ${error.message}`);
      }

      console.error('[VaultDirectoryPicker] Full error object:', error);

      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vault-directory-picker">
      <div className="picker-section">
        <label className="picker-label">Obsidian Vault Directory</label>

        <div className="picker-status">
          <span className="status-text">{selectedPath}</span>
          {apiAvailable && (
            <span className="status-badge api-available" title="File System API available">
              ✓
            </span>
          )}
          {!apiAvailable && (
            <span className="status-badge api-unavailable" title="Using IndexedDB fallback">
              ⚠
            </span>
          )}
        </div>

        <button
          onClick={handlePickDirectory}
          disabled={disabled || isLoading}
          className="picker-button"
          title={apiAvailable ? 'Click to select your Obsidian vault folder' : 'File System API not available'}
        >
          {isLoading ? '⏳ Selecting...' : '📁 Choose Vault Folder'}
        </button>

        {error && (
          <div className="picker-error">
            <span className="error-icon">⚠</span>
            <span className="error-message">{error}</span>
          </div>
        )}

        <div className="picker-info">
          <p className="info-text">
            {apiAvailable
              ? 'Select your Obsidian vault folder. Conversations will be saved as markdown files in the vault.'
              : 'File System API not available. Your conversations will be saved to browser storage (IndexedDB) instead.'}
          </p>
        </div>
      </div>

      <style>{`
        .vault-directory-picker {
          padding: 12px;
          background-color: #f5f5f5;
          border-radius: 6px;
          margin: 8px 0;
        }

        .picker-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .picker-label {
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }

        .picker-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background-color: white;
          border-radius: 4px;
          border: 1px solid #ddd;
          min-height: 28px;
        }

        .status-text {
          flex: 1;
          font-size: 13px;
          color: #666;
          word-break: break-word;
        }

        .status-badge {
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
        }

        .status-badge.api-available {
          background-color: #e8f5e9;
          color: #2e7d32;
        }

        .status-badge.api-unavailable {
          background-color: #fff3e0;
          color: #e65100;
        }

        .picker-button {
          padding: 8px 12px;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .picker-button:hover:not(:disabled) {
          background-color: #1565c0;
        }

        .picker-button:disabled {
          background-color: #bdbdbd;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .picker-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          background-color: #ffebee;
          border-radius: 4px;
          border-left: 3px solid #d32f2f;
        }

        .error-icon {
          flex-shrink: 0;
          color: #d32f2f;
          font-weight: bold;
        }

        .error-message {
          color: #c62828;
          font-size: 12px;
          line-height: 1.4;
        }

        .picker-info {
          padding: 8px;
          background-color: #e3f2fd;
          border-radius: 4px;
        }

        .info-text {
          margin: 0;
          color: #1565c0;
          font-size: 12px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};

export default VaultDirectoryPicker;
