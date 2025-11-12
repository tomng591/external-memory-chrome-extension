import ReactDOM from 'react-dom/client';
import Options from './options';
import './index.css';

/**
 * Options Entry Point
 * Renders the Options component to the DOM
 */

console.log('[External Memory] Options entry point loaded');

const rootElement = document.getElementById('options-root');

if (!rootElement) {
  console.error('[External Memory] Could not find options-root element');
  document.body.innerHTML = '<div style="padding: 10px; color: red;">Error: Could not find options root element</div>';
} else {
  try {
    console.log('[External Memory] Creating React root');
    const root = ReactDOM.createRoot(rootElement);
    console.log('[External Memory] Rendering Options component');
    root.render(<Options />);
    console.log('[External Memory] Options rendered successfully');
  } catch (error) {
    console.error('[External Memory] Failed to render options:', error);
    document.body.innerHTML = `<div style="padding: 10px; color: red; font-family: monospace;">
      Error rendering options: ${error instanceof Error ? error.message : String(error)}
    </div>`;
  }
}
