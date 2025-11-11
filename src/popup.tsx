import './index.css';

/**
 * Popup Component
 * Displays the extension popup UI
 */
export default function Popup() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="space-y-4">
        {/* Header Section */}
        <div className="border-b border-indigo-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">External Memory</h1>
          <p className="text-sm text-gray-600 mt-1">
            Store AI conversations without vendor lock-in
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800">Status</h2>
            <p className="text-sm text-gray-600 mt-1">Configuration coming soon...</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800">Supported Platforms</h2>
            <ul className="text-sm text-gray-600 mt-1 space-y-1">
              <li>✓ ChatGPT</li>
              <li>✓ Claude</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-4 pt-4 border-t border-indigo-200">
          <p>v0.0.1</p>
        </div>
      </div>
    </div>
  );
}
