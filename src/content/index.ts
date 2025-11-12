/**
 * Content Script for External Memory Chrome Extension
 *
 * This script runs in the context of ChatGPT (chatgpt.com) and Claude (claude.ai) pages.
 * It can access the DOM and intercept messages.
 */

import { parseMessages as chatgptParseMessages, getParserDebugInfo } from './parsers/chatgptParser';
import { parseMessages as claudeParseMessages } from './parsers/claudeParser';
import { CapturedMessage } from '../types/Message';
import {
  formatUserMessage,
  formatAssistantResponse,
  validateMessage,
  RawUserMessage,
  RawAssistantResponse,
} from '../services/MessageFormatter';

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
            if ((chrome.runtime as any).lastError) {
              reject(new Error((chrome.runtime as any).lastError.message));
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
  async function injectScript() {
    try {
      console.log('[External Memory] Attempting to inject script...');

      const script = document.createElement('script');
      const injectedUrl = (chrome.runtime as any).getURL('injected.js');

      console.log('[External Memory] Injected script URL:', injectedUrl);
      console.log('[External Memory] chrome.runtime available:', !!chrome.runtime);
      console.log('[External Memory] chrome.runtime.getURL available:', !!(chrome.runtime as any).getURL);

      script.src = injectedUrl;
      script.onload = () => {
        console.log('[External Memory] ✓ Injected script loaded successfully');
      };
      script.onerror = (error) => {
        console.error('[External Memory] ✗ Failed to load injected script:', error);
      };

      console.log('[External Memory] Script element created, type:', script.type);
      console.log('[External Memory] Appending script to document.head...');

      // Try appending to head first, then documentElement
      if (document.head) {
        document.head.appendChild(script);
        console.log('[External Memory] Script appended to head successfully');
      } else {
        document.documentElement.appendChild(script);
        console.log('[External Memory] Script appended to documentElement successfully');
      }

      // Wait a bit to see if script loaded
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log('[External Memory] Injection complete');
    } catch (error) {
      console.error('[External Memory] Error injecting script:', error);
    }
  }

  // Try to inject as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectScript);
  } else {
    injectScript();
  }

  /**
   * Listen for postMessages from injected script (fetch interception)
   * These events contain captured API data that should be forwarded to the service worker
   */
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin (injected script)
    if (event.source !== window) return;

    try {
      const { type, data } = event.data;

      if (!type || !data) return;

      // Handle fetch-intercepted messages from injected script
      switch (type) {
        case 'CHATGPT_MESSAGE_SENT': {
          console.log(
            '[External Memory] Captured user message via API interception:',
            data
          );

          // DEBUG: Log the structure of messages array to help diagnose issues
          if (data?.messages) {
            console.log('[External Memory] DEBUG - Messages array structure:');
            data.messages.forEach((msg: any, idx: number) => {
              console.log(`  [${idx}] role: ${msg.role}, content type: ${typeof msg.content}`, msg.content);
            });
          }

          try {
            // Format raw API data into canonical CapturedMessage
            const formattedMessage = formatUserMessage(data as RawUserMessage);

            // Validate formatted message
            if (!validateMessage(formattedMessage)) {
              console.error('[External Memory] Formatted message failed validation');
              break;
            }

            console.log('[External Memory] Message formatted and sent to service worker');

            // Forward formatted message to service worker
            chrome.runtime.sendMessage(
              {
                type: 'chatgpt_message_sent',
                data: formattedMessage,
                timestamp: Date.now(),
              },
              () => {
                if ((chrome.runtime as any).lastError) {
                  console.debug(
                    '[External Memory] Error sending message to service worker:',
                    (chrome.runtime as any).lastError
                  );
                } else {
                  console.debug(
                    '[External Memory] Message sent to service worker successfully'
                  );
                }
              }
            );
          } catch (error) {
            console.debug('[External Memory] Error formatting user message:', error);
          }
          break;
        }

        case 'CHATGPT_RESPONSE_CHUNK':
          console.debug(
            '[External Memory] Captured response chunk via API interception:',
            data
          );
          // Optionally forward chunk updates to service worker
          // (can be used for real-time progress updates)
          break;

        case 'CHATGPT_RESPONSE_COMPLETE': {
          console.log(
            '[External Memory] Captured complete response via API interception:',
            data
          );

          try {
            // Format raw API data into canonical CapturedMessage
            const formattedMessage = formatAssistantResponse(data as RawAssistantResponse);

            // Validate formatted message
            if (!validateMessage(formattedMessage)) {
              console.error('[External Memory] Formatted message failed validation');
              break;
            }

            console.log('[External Memory] Message formatted and sent to service worker');

            // Forward formatted message to service worker
            chrome.runtime.sendMessage(
              {
                type: 'chatgpt_response_complete',
                data: formattedMessage,
                timestamp: Date.now(),
              },
              () => {
                if ((chrome.runtime as any).lastError) {
                  console.debug(
                    '[External Memory] Error sending response to service worker:',
                    (chrome.runtime as any).lastError
                  );
                } else {
                  console.debug(
                    '[External Memory] Response sent to service worker successfully'
                  );
                }
              }
            );
          } catch (error) {
            console.debug('[External Memory] Error formatting assistant response:', error);
          }
          break;
        }

        default:
          // Ignore unknown message types
          break;
      }
    } catch (error) {
      console.debug('[External Memory] Error processing postMessage:', error);
    }
  });

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
