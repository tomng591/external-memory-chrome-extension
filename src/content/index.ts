/**
 * Content Script for External Memory Chrome Extension
 *
 * This script runs in the context of ChatGPT (chatgpt.com) and Claude (claude.ai) pages.
 * It can access the DOM and intercept messages.
 */

import { parseMessages as chatgptParseMessages, getParserDebugInfo } from './parsers/chatgptParser';
import { parseMessages as claudeParseMessages } from './parsers/claudeParser';
import { CapturedMessage } from '../types/Message';

/**
 * Detects which platform (ChatGPT or Claude) the content script is running on
 * based on the current page URL.
 *
 * @returns 'chatgpt' | 'claude' | null if platform cannot be determined
 */
export function detectPlatform(): 'chatgpt' | 'claude' | null {
  const url = window.location.href;

  if (url.includes('chatgpt.com')) {
    return 'chatgpt';
  }

  if (url.includes('claude.ai')) {
    return 'claude';
  }

  return null;
}

/**
 * Extracts messages from the current page using the appropriate parser
 * based on the detected platform.
 *
 * @returns Array of CapturedMessage objects extracted from the current conversation
 */
export function extractMessages(): CapturedMessage[] {
  const platform = detectPlatform();

  if (platform === 'chatgpt') {
    return chatgptParseMessages();
  }

  if (platform === 'claude') {
    return claudeParseMessages();
  }

  console.warn('[External Memory] Unable to detect platform for message extraction');
  return [];
}

/**
 * Sends extracted messages to the service worker via chrome.runtime.sendMessage.
 * Messages are sent in batches to avoid overwhelming the service worker.
 *
 * @param messages - Array of CapturedMessage objects to send
 * @param batchSize - Number of messages per batch (default: 10)
 */
export async function sendMessages(
  messages: CapturedMessage[],
  batchSize: number = 10
): Promise<void> {
  if (messages.length === 0) {
    console.log('[External Memory] No messages to send');
    return;
  }

  const platform = detectPlatform();
  console.log(
    `[External Memory] Sending ${messages.length} messages from ${platform} to service worker`
  );

  // Send messages in batches
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);

    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'capture_messages',
            data: batch,
            platform: platform,
            timestamp: Date.now(),
          },
          (_response) => {
            const lastError = (chrome.runtime as any).lastError;
            if (lastError) {
              reject(lastError);
            } else {
              resolve();
            }
          }
        );
      });

      console.log(
        `[External Memory] Sent batch ${Math.floor(i / batchSize) + 1} with ${batch.length} messages`
      );
    } catch (error) {
      console.error('[External Memory] Error sending message batch:', error);
    }
  }

  console.log(`[External Memory] All ${messages.length} messages sent to service worker`);
}

try {
  const timestamp = new Date().toISOString();
  const message = `Content script loaded on ${window.location.href} at ${timestamp}`;

  console.log('[External Memory]', message);
  console.log('[External Memory] Extension initialized and ready to capture conversations');

  // Expose parser functions to window object for console testing
  // Usage in Chrome console: window.__externalMemory.parseMessages()
  const externalMemory = {
    /**
     * Detect the current platform (ChatGPT or Claude)
     * @returns 'chatgpt' | 'claude' | null
     */
    detectPlatform: () => {
      const platform = detectPlatform();
      console.log(`[External Memory] Detected platform: ${platform}`);
      return platform;
    },

    /**
     * Extract messages from the current page
     * @returns Array of extracted CapturedMessage objects
     */
    extractMessages: () => {
      const messages = extractMessages();
      console.log(
        `%c[External Memory] Extracted ${messages.length} messages`,
        'color: #4CAF50; font-weight: bold;'
      );
      return messages;
    },

    /**
     * Send messages to service worker
     * @param messages - Optional: array of messages to send (default: extract current page)
     */
    sendMessages: async (messages?: CapturedMessage[]) => {
      const messagesToSend = messages || extractMessages();
      await sendMessages(messagesToSend);
      console.log(`[External Memory] Sent ${messagesToSend.length} messages`);
    },

    /**
     * Parse all messages from the current page
     * @returns Array of parsed messages
     */
    parseMessages: () => {
      const messages = extractMessages();
      console.log(
        `%c[External Memory] Parsed ${messages.length} messages`,
        'color: #4CAF50; font-weight: bold;'
      );
      return messages;
    },

    /**
     * Get debug information about parsed messages
     * @returns Debug info string
     */
    getDebugInfo: () => {
      return getParserDebugInfo();
    },

    /**
     * Parse and pretty-print messages in console
     * @returns Array of parsed messages (same as parseMessages but with formatted output)
     */
    testParser: () => {
      const messages = extractMessages();
      const platform = detectPlatform();
      console.log(
        `%c╔════════════════════════════════════════════════════════════╗
║        External Memory - Message Parser Test Results        ║
╚════════════════════════════════════════════════════════════╝`,
        'color: #2196F3; font-family: monospace;'
      );
      console.log(`%cPlatform: ${platform}`, 'color: #666;');
      console.log(`%cConversation URL: ${window.location.href}`, 'color: #666;');
      console.log(`%cMessages Found: ${messages.length}`, 'color: #666;');
      console.log('');

      if (messages.length === 0) {
        console.log(
          '%cℹ️  No messages found. Make sure you have an active conversation.',
          'color: #FF9800;'
        );
      } else {
        console.log(
          `%c${messages.length} Message${messages.length !== 1 ? 's' : ''} extracted:`,
          'color: #4CAF50; font-weight: bold;'
        );
        console.table(
          messages.map(msg => ({
            Index: msg.messageIndex || '-',
            Role: msg.role.toUpperCase(),
            Content: msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : ''),
            ID: msg.id.substring(0, 12) + '...',
            Timestamp: new Date(msg.timestamp).toLocaleTimeString(),
          }))
        );
      }

      console.log('');
      console.log(
        '%cFull message objects available:',
        'color: #9C27B0; font-style: italic;'
      );
      console.log('Copy and paste to console: copy(__externalMemory.parseMessages())');

      return messages;
    },
  };

  // Attach to window object for console access
  (window as any).__externalMemory = externalMemory;

  console.log(
    '%c✅ Message capture available in console! Try these commands:',
    'color: #4CAF50; font-weight: bold;'
  );
  console.log('  • window.__externalMemory.detectPlatform()  // Show detected platform');
  console.log('  • window.__externalMemory.extractMessages() // Extract messages');
  console.log('  • window.__externalMemory.parseMessages()   // Get message array');
  console.log('  • window.__externalMemory.sendMessages()    // Send to service worker');
  console.log('  • window.__externalMemory.testParser()      // Pretty-printed results');
  console.log('  • window.__externalMemory.getDebugInfo()    // Debug information');
  console.log('');
  console.log(
    '%c💡 Tip: If __externalMemory is undefined, reload this page (Ctrl+R / Cmd+R)',
    'color: #FF9800; font-style: italic;'
  );

  // Auto-capture and send messages on page load (when DOM is ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      console.log('[External Memory] DOM content loaded, auto-capturing messages...');
      const messages = extractMessages();
      if (messages.length > 0) {
        console.log(
          `[External Memory] Auto-captured ${messages.length} messages, sending to service worker...`
        );
        await sendMessages(messages);
      }
    });
  } else {
    // DOM is already loaded
    console.log('[External Memory] DOM already loaded, auto-capturing messages...');
    const messages = extractMessages();
    if (messages.length > 0) {
      console.log(
        `[External Memory] Auto-captured ${messages.length} messages, sending to service worker...`
      );
      sendMessages(messages).catch((error) => {
        console.error('[External Memory] Error auto-sending messages:', error);
      });
    }
  }

  // Send test message to service worker
  try {
    const testMessage = {
      type: 'test',
      data: 'Hello from content script',
      timestamp: Date.now(),
    };

    chrome.runtime.sendMessage(testMessage, (response) => {
      try {
        console.log('[External Memory] Response received from service worker:', response);
      } catch (error) {
        console.error('[External Memory] Error handling response:', error);
      }
    });

    console.log('[External Memory] Message sent to service worker:', testMessage);
  } catch (error) {
    console.error('[External Memory] Error sending message to service worker:', error);
  }
} catch (error) {
  console.error('[External Memory] Error in content script initialization:', error);
}
