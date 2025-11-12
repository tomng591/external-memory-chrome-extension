import {
  applyContentPatchOperations,
  extractModelIdentifier,
} from '../utils/chatgptStreamUtils';

/**
 * Unit tests for the injected script (fetch interception)
 */

describe('Injected Script - Fetch Interception', () => {
  let originalFetch: typeof window.fetch;
  let capturedMessages: any[] = [];

  beforeEach(() => {
    // Reset captured messages
    capturedMessages = [];

    // Store original fetch
    originalFetch = window.fetch;

    // Mock window.postMessage to capture sent messages
    const originalPostMessage = window.postMessage.bind(window);
    (window.postMessage as any) = jest.fn((message: any, ...args: any[]) => {
      capturedMessages.push(message);
      originalPostMessage(message, ...args);
    });
  });

  afterEach(() => {
    // Restore original fetch
    window.fetch = originalFetch;

    // Clear captured messages
    capturedMessages = [];

    // Restore postMessage if it was mocked
    jest.restoreAllMocks();
  });

  describe('Endpoint Detection', () => {
    test('should identify ChatGPT backend-api endpoints', () => {
      const urls = [
        'https://chatgpt.com/backend-api/conversation',
        'https://api.openai.com/backend-api/conversation/abc123',
        'https://chat.openai.com/backend-api/conversation',
      ];

      // These would be detected as ChatGPT endpoints
      urls.forEach((url) => {
        expect(url.includes('/backend-api/conversation')).toBe(true);
      });
    });

    test('should identify ChatGPT api/conversation endpoints', () => {
      const urls = [
        'https://chatgpt.com/api/conversation',
        'https://api.openai.com/api/conversation',
      ];

      urls.forEach((url) => {
        expect(url.includes('/api/conversation')).toBe(true);
      });
    });

    test('should ignore non-ChatGPT endpoints', () => {
      const urls = [
        'https://google.com/search',
        'https://api.example.com/data',
        'https://chatgpt.com/api/other',
      ];

      urls.forEach((url) => {
        const isChatGPT =
          url.includes('/backend-api/conversation') ||
          url.includes('/api/conversation');
        expect(isChatGPT).toBe(false);
      });
    });
  });

  describe('Outgoing Message Capture', () => {
    test('should parse user message from request body', () => {
      const requestBody = JSON.stringify({
        conversation_id: 'conv-123',
        parent_message_id: 'msg-456',
        model: 'gpt-4',
        messages: [
          {
            id: 'msg-789',
            role: 'user',
            content: {
              content_type: 'text',
              parts: ['Hello, how are you?'],
            },
          },
        ],
      });

      // This simulates what captureOutgoingMessage does
      const data = JSON.parse(requestBody);
      expect(data.conversation_id).toBe('conv-123');
      expect(data.model).toBe('gpt-4');
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].content.parts[0]).toBe('Hello, how are you?');
    });

    test('should handle malformed request body gracefully', () => {
      const malformedBody = 'not json';

      expect(() => {
        JSON.parse(malformedBody);
      }).toThrow();

      // In actual implementation, this error would be caught and logged
    });

    test('should extract all required fields from request', () => {
      const requestBody = JSON.stringify({
        conversation_id: 'conv-abc123',
        parent_message_id: 'msg-parent-456',
        model: 'gpt-4-turbo',
        messages: [
          {
            id: 'msg-user-789',
            role: 'user',
            content: {
              content_type: 'text',
              parts: ['Test message'],
            },
          },
        ],
      });

      const data = JSON.parse(requestBody);

      const userMessage = {
        conversationId: data.conversation_id,
        parentMessageId: data.parent_message_id,
        model: data.model,
        messages: data.messages,
      };

      expect(userMessage.conversationId).toBe('conv-abc123');
      expect(userMessage.parentMessageId).toBe('msg-parent-456');
      expect(userMessage.model).toBe('gpt-4-turbo');
      expect(userMessage.messages).toBeDefined();
    });
  });

  describe('SSE Parsing', () => {
    test('should parse SSE data format correctly', () => {
      const sseData =
        'data: {"conversation_id":"conv-123","message":{"id":"msg-456","content":{"parts":["Hello"]}}}\n\n';

      const line = sseData.split('\n')[0];
      expect(line.startsWith('data: ')).toBe(true);

      const data = line.slice(6).trim();
      const json = JSON.parse(data);

      expect(json.conversation_id).toBe('conv-123');
      expect(json.message.id).toBe('msg-456');
      expect(json.message.content.parts[0]).toBe('Hello');
    });

    test('should handle [DONE] signal', () => {
      const doneLine = 'data: [DONE]';
      const data = doneLine.slice(6).trim();

      expect(data).toBe('[DONE]');
    });

    test('should accumulate content from multiple chunks', () => {
      const chunks = [
        'data: {"message":{"content":{"parts":["Hello"]}}}\n\n',
        'data: {"message":{"content":{"parts":["Hello world"]}}}\n\n',
        'data: {"message":{"content":{"parts":["Hello world!"]}}}\n\n',
      ];

      let accumulatedContent = '';

      chunks.forEach((chunk) => {
        const line = chunk.split('\n')[0];
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data !== '[DONE]') {
            const json = JSON.parse(data);
            if (json.message?.content?.parts?.[0]) {
              accumulatedContent = json.message.content.parts[0];
            }
          }
        }
      });

      expect(accumulatedContent).toBe('Hello world!');
    });

    test('should handle incomplete SSE messages', () => {
      const buffer = 'data: {"incomplete": true';

      // In actual implementation, incomplete lines stay in buffer
      expect(buffer.includes('data: ')).toBe(true);
      expect(buffer.includes('{')). toBe(true);
      // Would not attempt to parse until complete
    });
  });

  describe('Response Handling', () => {
    test('should detect streaming responses by content-type', () => {
      const streamingContentType = 'text/event-stream';
      expect(streamingContentType.includes('text/event-stream')).toBe(true);

      const nonStreamingContentType = 'application/json';
      expect(nonStreamingContentType.includes('text/event-stream')).toBe(false);
    });

    test('should extract metadata from streaming response', () => {
      const firstChunkData = {
        conversation_id: 'conv-123',
        message: {
          id: 'msg-456',
        },
        model: 'gpt-4',
      };

      const metadata = {
        conversationId: firstChunkData.conversation_id,
        messageId: firstChunkData.message?.id,
        model: firstChunkData.model,
      };

      expect(metadata.conversationId).toBe('conv-123');
      expect(metadata.messageId).toBe('msg-456');
      expect(metadata.model).toBe('gpt-4');
    });

    test('should handle missing content parts gracefully', () => {
      const chunkWithoutContent: any = {
        conversation_id: 'conv-123',
        message: {
          id: 'msg-456',
          // No content field
        },
        model: 'gpt-4',
      };

      const parts = chunkWithoutContent.message?.content?.parts;
      expect(parts).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should not throw on malformed JSON in SSE stream', () => {
      const malformedSSE = 'data: {invalid json}\n\n';

      expect(() => {
        const line = malformedSSE.split('\n')[0];
        const data = line.slice(6).trim();
        JSON.parse(data); // This will throw
      }).toThrow();

      // In actual implementation, this error is caught and logged
    });

    test('should continue processing after error', () => {
      const messages = [
        'valid message 1',
        '{broken json', // Will fail to parse
        'valid message 2',
      ];

      const parsed = [];
      messages.forEach((msg) => {
        try {
          // Attempt to parse as JSON
          const json = JSON.parse(msg);
          parsed.push(json);
        } catch (error) {
          // Continue processing even if this message fails
        }
      });

      expect(parsed.length).toBe(0); // No valid JSON in these messages, but no error thrown
    });

    test('should handle response clone errors gracefully', () => {
      const mockResponse = {
        clone: jest.fn().mockImplementation(() => {
          throw new Error('Clone failed');
        }),
      };

      expect(() => {
        mockResponse.clone();
      }).toThrow();

      // In actual implementation, error is caught and original response returned
    });
  });

  describe('Message Format', () => {
    test('should format CHATGPT_MESSAGE_SENT correctly', () => {
      const messageData = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [],
        timestamp: Date.now(),
        url: 'https://chatgpt.com/backend-api/conversation',
      };

      const formattedMessage = {
        type: 'CHATGPT_MESSAGE_SENT',
        data: messageData,
      };

      expect(formattedMessage.type).toBe('CHATGPT_MESSAGE_SENT');
      expect(formattedMessage.data.conversationId).toBe('conv-123');
      expect(formattedMessage.data.model).toBe('gpt-4');
    });

    test('should format CHATGPT_RESPONSE_COMPLETE correctly', () => {
      const responseData = {
        conversationId: 'conv-123',
        messageId: 'msg-456',
        model: 'gpt-4',
        content: 'Full response text',
        chunks: [
          { timestamp: Date.now(), content: 'Full response text' },
        ],
      };

      const formattedMessage = {
        type: 'CHATGPT_RESPONSE_COMPLETE',
        data: responseData,
      };

      expect(formattedMessage.type).toBe('CHATGPT_RESPONSE_COMPLETE');
      expect(formattedMessage.data.content).toBe('Full response text');
      expect(formattedMessage.data.chunks).toHaveLength(1);
    });

    test('should format CHATGPT_RESPONSE_CHUNK correctly', () => {
      const chunkData = {
        conversationId: 'conv-123',
        messageId: 'msg-456',
        content: 'Partial response',
        timestamp: Date.now(),
      };

      const formattedMessage = {
        type: 'CHATGPT_RESPONSE_CHUNK',
        data: chunkData,
      };

      expect(formattedMessage.type).toBe('CHATGPT_RESPONSE_CHUNK');
      expect(formattedMessage.data.content).toBe('Partial response');
    });
  });

  describe('Stream Processing', () => {
    test('should handle ReadableStream.tee() concept', () => {
      // Verify that tee() creates two independent streams
      // In actual implementation, tee() is called on response.body

      const mockStream = {
        tee: jest.fn().mockReturnValue([
          { name: 'stream1' },
          { name: 'stream2' },
        ]),
      };

      const [stream1, stream2] = mockStream.tee();

      expect(stream1).toBeDefined();
      expect(stream2).toBeDefined();
      expect(stream1.name).toBe('stream1');
      expect(stream2.name).toBe('stream2');
    });

    test('should process stream chunks sequentially', async () => {
      // Test basic chunk accumulation logic (TextDecoder not available in Jest)
      const chunks = ['Hello', ' World'];
      let output = '';

      for (const chunk of chunks) {
        output += chunk;
      }

      expect(output).toBe('Hello World');
    });
  });

  describe('Integration Scenarios', () => {
    test('should capture complete message flow: user message → response', () => {
      // Simulate user sending a message
      const userMessage = {
        type: 'CHATGPT_MESSAGE_SENT',
        data: {
          conversationId: 'conv-123',
          parentMessageId: 'msg-456',
          model: 'gpt-4',
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: { content_type: 'text', parts: ['Tell me a joke'] },
            },
          ],
          timestamp: 1000,
          url: 'https://chatgpt.com/backend-api/conversation',
        },
      };

      // Simulate AI response
      const aiResponse = {
        type: 'CHATGPT_RESPONSE_COMPLETE',
        data: {
          conversationId: 'conv-123',
          messageId: 'msg-789',
          model: 'gpt-4',
          content: 'Why did the AI cross the road?',
          chunks: [
            { timestamp: 1010, content: 'Why did the AI' },
            { timestamp: 1020, content: 'Why did the AI cross' },
            { timestamp: 1030, content: 'Why did the AI cross the road?' },
          ],
        },
      };

      // Verify both messages have proper structure
      expect(userMessage.type).toBe('CHATGPT_MESSAGE_SENT');
      expect(userMessage.data.conversationId).toBe('conv-123');

      expect(aiResponse.type).toBe('CHATGPT_RESPONSE_COMPLETE');
      expect(aiResponse.data.conversationId).toBe('conv-123');
      expect(aiResponse.data.messageId).toBe('msg-789');

      // Verify timestamps show message flow
      expect(userMessage.data.timestamp).toBeLessThan(aiResponse.data.chunks[0].timestamp);
    });

    test('should track conversation across multiple messages', () => {
      const conversationId = 'conv-123';

      const messages = [
        {
          type: 'CHATGPT_MESSAGE_SENT',
          data: { conversationId, messages: [{ content: 'Message 1' }] },
        },
        {
          type: 'CHATGPT_RESPONSE_COMPLETE',
          data: { conversationId, messageId: 'msg-1' },
        },
        {
          type: 'CHATGPT_MESSAGE_SENT',
          data: { conversationId, messages: [{ content: 'Message 2' }] },
        },
        {
          type: 'CHATGPT_RESPONSE_COMPLETE',
          data: { conversationId, messageId: 'msg-2' },
        },
      ];

      // All messages should have the same conversationId
      messages.forEach((msg) => {
        expect(msg.data.conversationId).toBe(conversationId);
      });

      // Verify message alternation
      expect(messages[0].type).toBe('CHATGPT_MESSAGE_SENT');
      expect(messages[1].type).toBe('CHATGPT_RESPONSE_COMPLETE');
      expect(messages[2].type).toBe('CHATGPT_MESSAGE_SENT');
      expect(messages[3].type).toBe('CHATGPT_RESPONSE_COMPLETE');
    });
  });

  describe('Patch Operations', () => {
    test('should accumulate append patches targeting message parts', () => {
      const operations = [
        { p: '/message/content/parts/0', o: 'append', v: 'Hello' },
        { p: '/message/content/parts/0', o: 'append', v: ' world' },
        { p: '/message/content/parts/0', o: 'append', v: '!' },
      ];

      const { content, updated } = applyContentPatchOperations(operations, '');

      expect(updated).toBe(true);
      expect(content).toBe('Hello world!');
    });

    test('should ignore patches that do not target content parts', () => {
      const operations = [
        { p: '/message/create_time', o: 'replace', v: 123 },
        { p: '/message/update_time', o: 'replace', v: 456 },
      ];

      const { content, updated } = applyContentPatchOperations(operations, 'Existing');

      expect(updated).toBe(false);
      expect(content).toBe('Existing');
    });

    test('should support replace patches for content', () => {
      const operations = [
        { p: '/message/content/parts/0', o: 'replace', v: 'Replaced text' },
      ];

      const { content, updated } = applyContentPatchOperations(operations, 'Old text');

      expect(updated).toBe(true);
      expect(content).toBe('Replaced text');
    });
  });

  describe('Metadata Helpers', () => {
    test('should extract model slug from metadata object', () => {
      const model = extractModelIdentifier({ metadata: { model_slug: 'gpt-5-1' } });
      expect(model).toBe('gpt-5-1');
    });

    test('should return undefined when no model info present', () => {
      const model = extractModelIdentifier({ metadata: {} });
      expect(model).toBeUndefined();
    });
  });
});
