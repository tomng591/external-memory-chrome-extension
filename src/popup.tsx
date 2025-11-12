import './index.css';
import { useState, useEffect } from 'react';
import { getStoredDirectoryName } from './utils/handleStorage';

/**
 * Popup Component
 * Displays quick status and link to settings
 */
export default function Popup() {
  const [vaultSelected, setVaultSelected] = useState(false);
  const [vaultName, setVaultName] = useState('');

  // Load stored vault name on mount
  useEffect(() => {
    const loadStoredVaultName = async () => {
      const storedName = await getStoredDirectoryName();
      if (storedName) {
        setVaultName(storedName);
        setVaultSelected(true);
        console.log('[Popup] Loaded stored vault name:', storedName);
      }
    };
    loadStoredVaultName();
  }, []);

  const handleOpenSettings = () => {
    (chrome.runtime as any).openOptionsPage();
  };

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 p-4 min-h-screen">
      <div className="space-y-4 max-w-md">
        {/* Header */}
        <div className="border-b border-indigo-200 pb-3">
          <h1 className="text-2xl font-bold text-gray-900">External Memory</h1>
          <p className="text-xs text-gray-600 mt-1">AI conversation backup</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Status</h2>
          {vaultSelected ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl">✓</span>
              <div>
                <p className="text-sm font-medium text-green-700">Vault Configured</p>
                <p className="text-xs text-gray-600">{vaultName}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠</span>
              <p className="text-sm text-gray-600">Vault not configured</p>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={handleOpenSettings}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          ⚙️ Settings
        </button>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-3 border-t border-indigo-200">
          <p>v0.0.1</p>
        </div>
      </div>
    </div>
  );
}
