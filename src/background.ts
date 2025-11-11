/**
 * Service Worker for External Memory Chrome Extension
 *
 * Handles background logic, message passing between content scripts,
 * and coordinates with storage systems.
 */

try {
  const timestamp = new Date().toISOString();
  console.log(`[External Memory] Service worker started at ${timestamp}`);
  console.log('[External Memory] Service worker initialized and ready');

  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener(
    (message: any, sender: any, sendResponse: any) => {
      try {
        console.log('[External Memory] Message received from:', sender.url);
        console.log('[External Memory] Message type:', message?.type);
        console.log('[External Memory] Message payload:', message);

        // Handle test message
        if (message?.type === 'test') {
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
