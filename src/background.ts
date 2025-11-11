/**
 * Service Worker / Background Script
 * Stub implementation for Task 1.2 testing
 */

console.log('[External Memory] Service worker started');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((_message: unknown, sender: any, sendResponse: any) => {
  console.log('[External Memory] Message received from', sender.url);
  // Handler to be implemented in Task 1.6
  sendResponse({ received: true });
});
