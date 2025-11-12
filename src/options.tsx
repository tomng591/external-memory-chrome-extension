import './index.css';
import { useState, Suspense, lazy, useEffect } from 'react';
import { FileSystemDirectoryHandle } from './types/FileSystemHandle';
import { getStoredDirectoryName } from './utils/handleStorage';

// Lazy load VaultDirectoryPicker with error boundary
const VaultDirectoryPicker = lazy(() =>
  import('./ui/VaultDirectoryPicker').catch(error => {
    console.error('[External Memory] Error loading VaultDirectoryPicker:', error);
    return { default: () => <div style={{ color: 'red' }}>Error loading directory picker</div> };
  })
);

/**
 * Options Page Component
 * Provides a full page interface for vault configuration
 */
export default function Options() {
  const [vaultSelected, setVaultSelected] = useState(false);
  const [vaultName, setVaultName] = useState('');

  // Load stored vault name on mount
  useEffect(() => {
    const loadStoredVaultName = async () => {
      const storedName = await getStoredDirectoryName();
      if (storedName) {
        setVaultName(storedName);
        setVaultSelected(true);
        console.log('[Options] Loaded stored vault name:', storedName);
      }
    };
    loadStoredVaultName();
  }, []);

  const handleDirectorySelected = (handle: FileSystemDirectoryHandle) => {
    setVaultSelected(true);
    setVaultName(handle.name);
  };

  const handleError = (error: Error) => {
    console.error('Vault directory picker error:', error);
  };

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 p-8 min-h-screen">
      <div className="max-w-2xl">
        {/* Header Section */}
        <div className="border-b border-indigo-200 pb-6 mb-6">
          <h1 className="text-4xl font-bold text-gray-900">External Memory Settings</h1>
          <p className="text-lg text-gray-600 mt-2">
            Configure your extension to store AI conversations
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Vault Configuration */}
          <div className="bg-white rounded-lg p-6 border border-indigo-200 shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📁 Vault Configuration</h2>
            <p className="text-gray-600 mb-4">
              Select the folder where you want to save your conversations. This folder will be used to store all extracted conversations as markdown files.
            </p>
            <Suspense fallback={<div>Loading...</div>}>
              <VaultDirectoryPicker
                onDirectorySelected={handleDirectorySelected}
                onError={handleError}
              />
            </Suspense>
            {vaultSelected && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <span className="text-green-700 text-lg">✓ Vault configured: <strong>{vaultName}</strong></span>
                <p className="text-green-600 text-sm mt-2">
                  Your conversations will be saved to this location.
                </p>
              </div>
            )}
          </div>

          {/* Information Sections */}
          <div className="bg-white rounded-lg p-6 border border-indigo-200 shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Supported Platforms</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="text-lg">✓ ChatGPT (chatgpt.com)</li>
              <li className="text-lg">✓ Claude (claude.ai)</li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 shadow-md">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">How to Use</h2>
            <ol className="space-y-3 text-gray-700 list-decimal list-inside">
              <li className="text-lg">Select your vault folder above</li>
              <li className="text-lg">Open ChatGPT or Claude in a browser tab</li>
              <li className="text-lg">Have a conversation with the AI</li>
              <li className="text-lg">Conversations will auto-save to your vault folder</li>
              <li className="text-lg">Check your vault folder for markdown files with the conversation</li>
            </ol>
          </div>

          {/* FAQ Section */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">FAQ</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800">Where are conversations saved?</h3>
                <p className="text-gray-600 mt-1">
                  Conversations are saved to the folder you selected above, organized in monthly subdirectories.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">What format are conversations saved in?</h3>
                <p className="text-gray-600 mt-1">
                  Conversations are saved as markdown files (.md) with metadata (frontmatter) and formatted messages.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Can I change the vault folder?</h3>
                <p className="text-gray-600 mt-1">
                  Yes, just select a different folder using the button above.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8 pt-6 border-t border-indigo-200">
          <p>External Memory v0.0.1</p>
          <p className="mt-1">Store AI conversations without vendor lock-in</p>
        </div>
      </div>
    </div>
  );
}
