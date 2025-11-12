import {
  applyContentPatchOperations,
  extractModelIdentifier,
} from './utils/chatgptStreamUtils';

/**
 * Injected Script for ChatGPT API Interception
 *
 * This script runs in the page context (MAIN world) and intercepts fetch calls
 * to capture ChatGPT API requests and responses in real-time.
 *
 * Communication Flow:
 * window.fetch (intercepted) → postMessage to content script → service worker → storage
 *
 * Key Features:
 * - Zero-latency capture using ReadableStream.tee()
 * - Captures both user messages and AI responses
 * - Silent failure - doesn't break ChatGPT if errors occur
 */

(function () {
  'use strict';

  const originalFetch = window.fetch;

  /**
   * Helper to convert RequestInfo | URL to string
   * Handles Request objects, URL objects, and strings
   */
  function getUrlString(url: RequestInfo | URL): string {
    if (typeof url === 'string') {
      return url;
    }
    // Handle Request objects - they have a .url property
    if (url instanceof Request) {
      return url.url;
    }
    // Handle URL objects
    return url.toString();
  }

  /**
   * Detects if a URL is a ChatGPT API endpoint
   * ChatGPT uses patterns like:
   * - /backend-api/conversation (standard)
   * - /backend-api/f/conversation (with /f/ prefix for functions/tools)
   * - /api/conversation
   */
  function isChatGPTEndpoint(url: RequestInfo | URL): boolean {
    const urlString = getUrlString(url);
    return (
      urlString.includes('/backend-api/conversation') ||
      urlString.includes('/backend-api/f/conversation') ||
      urlString.includes('/api/conversation')
    );
  }

  /**
   * Captures outgoing user message from request body
   */
  function captureOutgoingMessage(
    url: RequestInfo | URL,
    body: BodyInit | undefined
  ): void {
    try {
      if (!body) return;

      // Convert body to string if needed
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const data = JSON.parse(bodyString);

      // Debug: Log request structure to understand where conversation_id is
      console.log(
        '%c[DEBUG] Request body keys:',
        'color: #FFC107;',
        Object.keys(data)
      );

      const userMessage = {
        type: 'CHATGPT_MESSAGE_SENT',
        data: {
          conversationId: data.conversation_id,
          parentMessageId: data.parent_message_id,
          model: data.model,
          messages: data.messages, // Array of message objects
          timestamp: Date.now(),
          url: getUrlString(url),
        },
      };

      // Send to content script via postMessage
      console.log(
        '%c[API Capture] User message sent',
        'color: #FF9800;',
        { conversationId: data.conversation_id, model: data.model }
      );
      window.postMessage(userMessage, '*');
    } catch (error) {
      console.debug(
        '[External Memory] Failed to capture outgoing message:',
        error
      );
    }
  }

  /**
   * Processes streaming response using ReadableStream.tee()
   * Creates two identical branches: one for ChatGPT, one for backup capture
   */
  async function handleStreamingResponse(
    response: Response,
    url: RequestInfo | URL
  ): Promise<Response> {
    try {
      // Tee the stream - creates two identical copies
      const [streamForChatGPT, streamForBackup] = response.body!.tee();

      // Process backup stream in background (non-blocking)
      processStreamForBackup(streamForBackup, url).catch((error) => {
        console.debug('[External Memory] Stream processing error:', error);
      });

      // Return response with original stream for ChatGPT
      return new Response(streamForChatGPT, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.debug(
        '[External Memory] Failed to handle streaming response:',
        error
      );
      return response;
    }
  }

  /**
   * Processes the backup stream from tee()
   * Parses SSE format and extracts message data
   */
  async function processStreamForBackup(
    stream: ReadableStream<Uint8Array>,
    url: RequestInfo | URL
  ): Promise<void> {
    try {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const responseData: any = {
        type: 'assistant',
        timestamp: Date.now(),
        url: getUrlString(url),
        conversationId: null,
        messageId: null,
        model: null,
        content: '',
        chunks: [],
      };

      const updateTrackedContent = (nextContent: string): void => {
        if (!nextContent || nextContent === responseData.content) {
          return;
        }

        responseData.content = nextContent;
        responseData.chunks.push({
          timestamp: Date.now(),
          content: nextContent,
        });

        window.postMessage(
          {
            type: 'CHATGPT_RESPONSE_CHUNK',
            data: {
              conversationId: responseData.conversationId,
              messageId: responseData.messageId,
              content: nextContent,
              timestamp: Date.now(),
            },
          },
          '*'
        );
      };

      const updateModelFromSources = (...sources: any[]): void => {
        if (responseData.model) {
          return;
        }

        for (const source of sources) {
          const model = extractModelIdentifier(source);
          if (model) {
            responseData.model = model;
            console.log(
              '%c[API Capture] Model detected from stream',
              'color: #8BC34A;',
              {
                model,
                sourceKeys: source ? Object.keys(source) : 'n/a',
              }
            );
            break;
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream complete
          console.log(
            '%c[API Capture] Response complete',
            'color: #4CAF50;',
            {
              conversationId: responseData.conversationId,
              messageId: responseData.messageId,
              chunkCount: responseData.chunks.length,
              contentLength: responseData.content.length,
              fullContent: responseData.content,
              firstChunkPreview: responseData.chunks[0]?.content.substring(0, 100),
            }
          );
          window.postMessage(
            {
              type: 'CHATGPT_RESPONSE_COMPLETE',
              data: responseData,
            },
            '*'
          );
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process SSE messages (format: "data: {json}\n\n")
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              continue; // End signal from ChatGPT
            }

            try {
              const json = JSON.parse(data);

              updateModelFromSources(
                json,
                json.metadata,
                json.v,
                json.v?.metadata
              );

              const hasMessage = !!json.message || !!json.v?.message;
              const hasResumeToken = !!json.token;
              const isMetadata = json.type && ['conversation_detail_metadata', 'resume_conversation_token'].includes(json.type);

              if (hasMessage || hasResumeToken) {
                // Process message or token chunk
              }

              // Handle both direct message format and patch format (json.v.message)
              const message = json.message || json.v?.message;
              const convId = json.conversation_id || json.v?.conversation_id;

              if (message) {
                updateModelFromSources(message, message.metadata);
              }

              const messageRole = message?.author?.role;

              // Extract metadata from first ASSISTANT chunk with actual TEXT content
              // SKIP system messages (role: "system") - they contain metadata, not actual responses
              // SKIP non-text content types (model_editable_context, etc)
              const contentType = message?.content?.content_type;
              const isTextContent = contentType === 'text';

              if (message && messageRole === 'assistant' && isTextContent && !responseData.messageId) {
                responseData.messageId = message.id;
                responseData.model = message.model || responseData.model;
                console.log(
                  '%c[API Capture] Response started',
                  'color: #2196F3;',
                  { conversationId: convId, model: message.model, messageId: message.id, role: messageRole, contentType }
                );
              }

              // Extract conversation_id from resume token or message
              if (!responseData.conversationId) {
                responseData.conversationId = json.conversation_id || json.v?.conversation_id;
              }

              // Extract content chunk - ChatGPT sends content in parts array
              // NOTE: Content builds up across multiple chunks with the SAME messageId
              // Once we detect the first TEXT message, extract content from ALL subsequent chunks with that messageId
              if (responseData.messageId && message?.id === responseData.messageId && message?.content?.parts && message.content.parts.length > 0) {
                const part = message.content.parts[0];

                // Handle both string and object content formats
                let content: string | undefined;
                if (typeof part === 'string') {
                  content = part;
                } else if (typeof part === 'object' && part !== null) {
                  // If it's an object, check for common text fields
                  const partObj = part as any;
                  content = partObj.text || partObj.content || partObj.value || JSON.stringify(part);
                }

                // Accumulate content from parts (replace/update with latest version)
                if (content && content.length > 0) {
                  updateTrackedContent(content);
                }
              }

              const patchOperations = Array.isArray(json.v)
                ? json.v
                : Array.isArray((json as any).ops)
                  ? (json as any).ops
                  : null;

              if (patchOperations && responseData.messageId) {
                const { content: patchedContent, updated } = applyContentPatchOperations(
                  patchOperations,
                  responseData.content || ''
                );

                if (updated) {
                  updateTrackedContent(patchedContent);
                }
              }
            } catch (error) {
              console.debug(
                '[External Memory] Failed to parse SSE data:',
                error,
                'Raw line:',
                line.substring(0, 100)
              );
            }
          }
        }
      }
    } catch (error) {
      // Silent fail - don't break ChatGPT
      console.debug('[External Memory] Stream processing error:', error);
    }
  }

  /**
   * Handles non-streaming responses
   * Clones response to read JSON without consuming the original
   */
  async function handleNonStreamingResponse(
    response: Response,
    url: RequestInfo | URL
  ): Promise<Response> {
    try {
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();

      const responseData = {
        type: 'assistant',
        timestamp: Date.now(),
        url: getUrlString(url),
        conversationId: data.conversation_id,
        messageId: data.message?.id,
        model: data.model,
        content: data.message?.content?.parts?.[0] || '',
        chunks: [],
      };

      window.postMessage(
        {
          type: 'CHATGPT_RESPONSE_COMPLETE',
          data: responseData,
        },
        '*'
      );

      return response;
    } catch (error) {
      console.debug(
        '[External Memory] Failed to capture non-streaming response:',
        error
      );
      return response;
    }
  }

  /**
   * Override window.fetch to intercept API calls
   */
  window.fetch = async function (
    url: RequestInfo | URL,
    options?: RequestInit
  ): Promise<Response> {
    const urlString = getUrlString(url);
    const isChatGPT = isChatGPTEndpoint(url);

    // Log ALL fetch calls to see what ChatGPT is calling
    // Filter out very short URLs to reduce noise, but show important ones
    if (urlString.includes('conversation') || urlString.includes('/backend-api/')) {
      console.log('%c[FETCH INTERCEPTED]', 'color: #FF5722; font-weight: bold;', urlString.substring(0, 150));
    }

    // Log ChatGPT endpoint matches
    if (isChatGPT) {
      console.log(
        '%c[Fetch] ChatGPT endpoint detected! 🎯',
        'color: #9C27B0; font-weight: bold;',
        urlString
      );
    }

    // Get the original response
    const response = await originalFetch(url, options as any);

    try {
      // Check if this is a ChatGPT endpoint
      if (isChatGPT) {
        console.log(
          '%c[Fetch] Processing ChatGPT response',
          'color: #9C27B0;',
          { method: options?.method, hasBody: !!options?.body }
        );

        // Capture outgoing message (user's message)
        if (options?.method === 'POST' && options?.body) {
          console.log('[Fetch] Attempting to capture message body');
          captureOutgoingMessage(url, options.body);
        }

        // Capture incoming response (AI's response)
        const contentType = response.headers.get('content-type');
        console.log('[Fetch] Response content-type:', contentType);

        if (contentType?.includes('text/event-stream')) {
          // Streaming response - use tee()
          console.log('[Fetch] Detected streaming response, using tee()');
          return await handleStreamingResponse(response, url);
        } else {
          // Non-streaming response
          console.log('[Fetch] Non-streaming response');
          return await handleNonStreamingResponse(response, url);
        }
      }
    } catch (error) {
      console.error(
        '[External Memory] Error intercepting fetch:',
        error
      );
    }

    // Not a ChatGPT endpoint or error occurred - return unchanged response
    return response;
  };

  console.log(
    '%c[External Memory] ChatGPT conversation interceptor loaded ✓',
    'color: #4CAF50; font-weight: bold; font-size: 12px;'
  );
  console.log('%cFetch interception active - capturing ChatGPT API calls', 'color: #2196F3;');

  // Expose debug API for testing
  (window as any).__chatgptInterceptorDebug = {
    fetchInterceptionActive: true,
    testEndpoints: () => {
      console.log('Testing ChatGPT endpoints:');
      console.log(
        '  ✓ /backend-api/conversation detected',
        'https://chatgpt.com/backend-api/conversation'.includes('/backend-api/conversation')
      );
      console.log(
        '  ✓ /api/conversation detected',
        'https://chatgpt.com/api/conversation'.includes('/api/conversation')
      );
    },
  };

  console.log(
    '%c💡 Debug: Call window.__chatgptInterceptorDebug.testEndpoints() to verify',
    'color: #FF9800; font-style: italic;'
  );
})();
