/**
 * Content Script for External Memory Chrome Extension
 *
 * This script runs in the context of ChatGPT (chatgpt.com) and Claude (claude.ai) pages.
 * It can access the DOM and intercept messages.
 */

import { parseMessages as chatgptParseMessages, getParserDebugInfo } from './parsers/chatgptParser';

try {
  const timestamp = new Date().toISOString();
  const message = `Content script loaded on ${window.location.href} at ${timestamp}`;

  console.log('[External Memory]', message);
  console.log('[External Memory] Extension initialized and ready to capture conversations');

  // Expose parser functions to window object for console testing
  // Usage in Chrome console: window.__externalMemory.parseMessages()
  const externalMemory = {
    /**
     * Parse all messages from the current ChatGPT conversation
     * @returns Array of parsed messages
     */
    parseMessages: () => {
      const messages = chatgptParseMessages();
      console.log(
        `%c[External Memory] Parsed ${messages.length} messages from ChatGPT`,
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
      const messages = chatgptParseMessages();
      console.log(
        `%c╔════════════════════════════════════════════════════════════╗
║        External Memory - ChatGPT Parser Test Results        ║
╚════════════════════════════════════════════════════════════╝`,
        'color: #2196F3; font-family: monospace;'
      );
      console.log(`%cConversation URL: ${window.location.href}`, 'color: #666;');
      console.log(`%cMessages Found: ${messages.length}`, 'color: #666;');
      console.log('');

      if (messages.length === 0) {
        console.log(
          '%cℹ️  No messages found. Make sure you have an active ChatGPT conversation.',
          'color: #FF9800;'
        );
      } else {
        console.log(
          `%c${messages.length} Message${messages.length !== 1 ? 's' : ''} extracted:`,
          'color: #4CAF50; font-weight: bold;'
        );
        console.table(
          messages.map(msg => ({
            Index: msg.messageIndex,
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
    '%c✅ Parser available in console! Try these commands:',
    'color: #4CAF50; font-weight: bold;'
  );
  console.log('  • window.__externalMemory.testParser()     // Pretty-printed results');
  console.log('  • window.__externalMemory.parseMessages()  // Raw message array');
  console.log('  • window.__externalMemory.getDebugInfo()   // Debug information');
  console.log('');
  console.log(
    '%c💡 Tip: If __externalMemory is undefined, reload this page (Ctrl+R / Cmd+R)',
    'color: #FF9800; font-style: italic;'
  );

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
