import ReactDOM from 'react-dom/client';
import Popup from './popup';
import './index.css';

/**
 * Popup Entry Point
 * Renders the Popup component to the DOM
 */

const rootElement = document.getElementById('popup-root');

if (!rootElement) {
  console.error('[External Memory] Could not find popup-root element');
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Popup />);
  } catch (error) {
    console.error('[External Memory] Failed to render popup:', error);
  }
}
