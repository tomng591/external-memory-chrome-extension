/**
 * Injected Script for External Memory Chrome Extension
 *
 * This script is injected into the page's MAIN world (same context as page scripts).
 * It serves as a bridge between the console and the isolated world content script.
 *
 * Communication Flow:
 * Console User → injected.ts (MAIN world) → custom DOM events → content/index.ts (isolated world)
 */

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

const pendingRequests = new Map<string, PendingRequest>();
let requestId = 0;

/**
 * Send a message to the content script and wait for response
 */
function sendToContentScript(action: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;

    // Setup timeout
    const timeout = setTimeout(() => {
      pendingRequests.delete(String(id));
      reject(new Error(`${action} request timeout (no response from content script)`));
    }, 5000);

    // Store pending request
    pendingRequests.set(String(id), { resolve, reject, timeout });

    // Create custom event to send to content script
    const event = new CustomEvent('__external_memory_request', {
      detail: { id, action, payload },
    });

    document.dispatchEvent(event);
  });
}

/**
 * Listen for responses from content script
 */
document.addEventListener('__external_memory_response', (event: any) => {
  const { id, success, data, error } = event.detail;
  const pending = pendingRequests.get(String(id));

  if (!pending) return;

  clearTimeout(pending.timeout);
  pendingRequests.delete(String(id));

  if (success) {
    pending.resolve(data);
  } else {
    pending.reject(new Error(error || 'Unknown error'));
  }
});

// Expose API to window for console access
const externalMemory = {
  /**
   * Detect the current platform (ChatGPT or Claude)
   */
  detectPlatform: async () => {
    try {
      const platform = await sendToContentScript('detect_platform');
      console.log(`[External Memory] Detected platform: ${platform}`);
      return platform;
    } catch (error) {
      console.error('[External Memory] Error detecting platform:', error);
      throw error;
    }
  },

  /**
   * Extract messages from the current page
   */
  extractMessages: async () => {
    try {
      const messages = await sendToContentScript('extract_messages');
      console.log(
        `%c[External Memory] Extracted ${messages.length} messages`,
        'color: #4CAF50; font-weight: bold;'
      );
      return messages;
    } catch (error) {
      console.error('[External Memory] Error extracting messages:', error);
      throw error;
    }
  },

  /**
   * Parse all messages from the current page
   */
  parseMessages: async () => {
    try {
      const messages = await sendToContentScript('parse_messages');
      console.log(
        `%c[External Memory] Parsed ${messages.length} messages`,
        'color: #4CAF50; font-weight: bold;'
      );
      return messages;
    } catch (error) {
      console.error('[External Memory] Error parsing messages:', error);
      throw error;
    }
  },

  /**
   * Send messages to service worker
   */
  sendMessages: async (messages?: any[]) => {
    try {
      const result = await sendToContentScript('send_messages', { messages });
      console.log(`[External Memory] Sent ${result.count} messages`);
      return result;
    } catch (error) {
      console.error('[External Memory] Error sending messages:', error);
      throw error;
    }
  },

  /**
   * Get debug information about parsed messages
   */
  getDebugInfo: async () => {
    try {
      const info = await sendToContentScript('get_debug_info');
      return info;
    } catch (error) {
      console.error('[External Memory] Error getting debug info:', error);
      throw error;
    }
  },

  /**
   * Get storage statistics from service worker
   */
  getStorageStats: async () => {
    try {
      console.log('[External Memory] Requesting storage stats from service worker...');
      const stats = await sendToContentScript('get_storage_stats');
      console.log('[External Memory] Storage Stats:', stats);
      if (stats.sampleMessages) {
        console.table(stats.sampleMessages);
      }
      return stats;
    } catch (error) {
      console.error('[External Memory] Error getting storage stats:', error);
      throw error;
    }
  },

  /**
   * Parse and pretty-print messages in console
   */
  testParser: async () => {
    try {
      const messages = await sendToContentScript('test_parser');
      console.log(
        `%c╔════════════════════════════════════════════════════════════╗
║        External Memory - Message Parser Test Results        ║
╚════════════════════════════════════════════════════════════╝`,
        'color: #2196F3; font-family: monospace;'
      );
      return messages;
    } catch (error) {
      console.error('[External Memory] Error in test parser:', error);
      throw error;
    }
  },
};

// Attach to window object for console access
(window as any).__externalMemory = externalMemory;

console.log(
  '%c✅ Message capture available in console! Try these commands:',
  'color: #4CAF50; font-weight: bold;'
);
console.log('  • window.__externalMemory.detectPlatform()   // Show detected platform');
console.log('  • window.__externalMemory.extractMessages()  // Extract messages');
console.log('  • window.__externalMemory.parseMessages()    // Get message array');
console.log('  • window.__externalMemory.sendMessages()     // Send to service worker');
console.log('  • window.__externalMemory.getStorageStats()  // Check stored messages');
console.log('  • window.__externalMemory.testParser()       // Pretty-printed results');
console.log('  • window.__externalMemory.getDebugInfo()     // Debug information');
console.log('');
console.log(
  '%c💡 Tip: If __externalMemory is undefined, reload this page (Ctrl+R / Cmd+R)',
  'color: #FF9800; font-style: italic;'
);
