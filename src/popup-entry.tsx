import ReactDOM from 'react-dom/client';
import Popup from './popup';
import './index.css';

/**
 * Popup Entry Point
 * Renders the Popup component to the DOM
 */

console.log('[External Memory] Popup entry point loaded');

const rootElement = document.getElementById('popup-root');

if (!rootElement) {
  console.error('[External Memory] Could not find popup-root element');
  document.body.innerHTML = '<div style="padding: 10px; color: red;">Error: Could not find popup root element</div>';
} else {
  try {
    console.log('[External Memory] Creating React root');
    const root = ReactDOM.createRoot(rootElement);
    console.log('[External Memory] Rendering Popup component');
    root.render(<Popup />);
    console.log('[External Memory] Popup rendered successfully');
  } catch (error) {
    console.error('[External Memory] Failed to render popup:', error);
    document.body.innerHTML = `<div style="padding: 10px; color: red; font-family: monospace;">
      Error rendering popup: ${error instanceof Error ? error.message : String(error)}
    </div>`;
  }
}
