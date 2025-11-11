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

  /**
   * Listen for requests from the injected script (MAIN world)
   * and send responses back via custom events
   */
  document.addEventListener('__external_memory_request', async (event: any) => {
    const { id, action, payload } = event.detail;

    try {
      let result: any;

      switch (action) {
        case 'detect_platform':
          result = detectPlatform();
          break;

        case 'extract_messages':
          result = extractMessages();
          break;

        case 'parse_messages':
          result = extractMessages();
          break;

        case 'send_messages':
          const messagesToSend = payload?.messages || extractMessages();
          await sendMessages(messagesToSend);
          result = { count: messagesToSend.length };
          break;

        case 'get_debug_info':
          result = getParserDebugInfo();
          break;

        case 'get_storage_stats':
          result = await getStorageStats();
          break;

        case 'test_parser':
          const testMessages = extractMessages();
          const testPlatform = detectPlatform();
          console.log(
            `%c╔════════════════════════════════════════════════════════════╗
║        External Memory - Message Parser Test Results        ║
╚════════════════════════════════════════════════════════════╝`,
            'color: #2196F3; font-family: monospace;'
          );
          console.log(`%cPlatform: ${testPlatform}`, 'color: #666;');
          console.log(`%cConversation URL: ${window.location.href}`, 'color: #666;');
          console.log(`%cMessages Found: ${testMessages.length}`, 'color: #666;');
          console.log('');

          if (testMessages.length === 0) {
            console.log(
              '%cℹ️  No messages found. Make sure you have an active conversation.',
              'color: #FF9800;'
            );
          } else {
            console.log(
              `%c${testMessages.length} Message${testMessages.length !== 1 ? 's' : ''} extracted:`,
              'color: #4CAF50; font-weight: bold;'
            );
            console.table(
              testMessages.map(msg => ({
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
          result = testMessages;
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Send successful response back to injected script
      document.dispatchEvent(
        new CustomEvent('__external_memory_response', {
          detail: { id, success: true, data: result },
        })
      );
    } catch (error) {
      // Send error response back to injected script
      document.dispatchEvent(
        new CustomEvent('__external_memory_response', {
          detail: {
            id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      );
    }
  });

  /**
   * Helper function to get storage stats from service worker
   */
  function getStorageStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(
          { type: 'get_storage_stats' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (response?.received && response?.data) {
              resolve(response.data);
            } else {
              reject(new Error(response?.error || 'Failed to get storage stats'));
            }
          }
        );

        setTimeout(() => {
          reject(new Error('Storage stats request timeout'));
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  }

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

  // Inject the injected script into the page (MAIN world)
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.type = 'module';
    script.onload = () => {
      console.log('[External Memory] Injected script loaded successfully');
    };
    script.onerror = () => {
      console.error('[External Memory] Failed to load injected script');
    };
    document.documentElement.appendChild(script);
  } catch (error) {
    console.error('[External Memory] Error injecting script:', error);
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
