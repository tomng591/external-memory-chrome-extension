import { detectPlatform, extractMessages, sendMessages } from '../index';
import * as chatgptParser from '../parsers/chatgptParser';
import * as claudeParser from '../parsers/claudeParser';
import { CapturedMessage } from '../../types/Message';

// Mock the parsers
jest.mock('../parsers/chatgptParser');
jest.mock('../parsers/claudeParser');

// Mock chrome runtime
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
  },
};

(global as any).chrome = mockChrome;

describe('Content Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectPlatform', () => {
    it('should detect ChatGPT platform from URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://chatgpt.com/c/abc123',
        },
        writable: true,
      });

      const platform = detectPlatform();
      expect(platform).toBe('chatgpt');
    });

    it('should detect Claude platform from URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://claude.ai/chat/xyz789',
        },
        writable: true,
      });

      const platform = detectPlatform();
      expect(platform).toBe('claude');
    });

    it('should return null for unknown platform', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com',
        },
        writable: true,
      });

      const platform = detectPlatform();
      expect(platform).toBeNull();
    });

    it('should handle chatgpt.com with different URL patterns', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://chatgpt.com/c/conversation123/edit',
        },
        writable: true,
      });

      const platform = detectPlatform();
      expect(platform).toBe('chatgpt');
    });

    it('should handle claude.ai with different URL patterns', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://claude.ai/chat/conversation456/settings',
        },
        writable: true,
      });

      const platform = detectPlatform();
      expect(platform).toBe('claude');
    });
  });

  describe('extractMessages', () => {
    it('should extract messages from ChatGPT parser when on ChatGPT', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://chatgpt.com/c/abc123',
        },
        writable: true,
      });

      const testMessages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
      ];

      (chatgptParser.parseMessages as jest.Mock).mockReturnValue(testMessages);

      const messages = extractMessages();
      expect(messages).toEqual(testMessages);
      expect(chatgptParser.parseMessages).toHaveBeenCalled();
    });

    it('should extract messages from Claude parser when on Claude', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://claude.ai/chat/xyz789',
        },
        writable: true,
      });

      const testMessages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello Claude',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'claude',
        },
      ];

      (claudeParser.parseMessages as jest.Mock).mockReturnValue(testMessages);

      const messages = extractMessages();
      expect(messages).toEqual(testMessages);
      expect(claudeParser.parseMessages).toHaveBeenCalled();
    });

    it('should return empty array when platform is unknown', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com',
        },
        writable: true,
      });

      const messages = extractMessages();
      expect(messages).toEqual([]);
      expect(chatgptParser.parseMessages).not.toHaveBeenCalled();
      expect(claudeParser.parseMessages).not.toHaveBeenCalled();
    });

    it('should call the appropriate parser for multiple calls', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://chatgpt.com/c/test',
        },
        writable: true,
      });

      const msg1: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'First call',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      (chatgptParser.parseMessages as jest.Mock).mockReturnValue([msg1]);

      extractMessages();
      extractMessages();

      expect(chatgptParser.parseMessages).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendMessages', () => {
    it('should send messages to service worker', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://chatgpt.com/c/abc123',
        },
        writable: true,
      });

      const testMessages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
      ];

      mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
        callback({});
      });

      await sendMessages(testMessages);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
      const call = (mockChrome.runtime.sendMessage as jest.Mock).mock.calls[0];
      expect(call[0].type).toBe('capture_messages');
      expect(call[0].data).toEqual(testMessages);
      expect(call[0].platform).toBe('chatgpt');
    });

    it('should handle empty message array', async () => {
      await sendMessages([]);

      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should batch messages when sending large arrays', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://claude.ai/chat/xyz',
        },
        writable: true,
      });

      const testMessages: CapturedMessage[] = Array.from({ length: 25 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: 'conv-1',
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude' as const,
      }));

      mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
        callback({});
      });

      await sendMessages(testMessages, 10);

      // Should be called 3 times for 25 messages with batch size 10 (10, 10, 5)
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should use default batch size of 10', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://chatgpt.com/c/abc',
        },
        writable: true,
      });

      const testMessages: CapturedMessage[] = Array.from({ length: 25 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: 'conv-1',
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
        callback({});
      });

      await sendMessages(testMessages);

      // Should be called 3 times for 25 messages with default batch size 10
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in message transmission gracefully', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://chatgpt.com/c/abc',
        },
        writable: true,
      });

      const testMessages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
      ];

      const error = new Error('Message transmission failed');
      mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
        (mockChrome.runtime as any).lastError = error;
        callback(undefined);
      });

      // Should not throw, just log error and continue
      // The function catches errors and logs them without rejecting
      await expect(sendMessages(testMessages)).resolves.not.toThrow();
    });

    it('should preserve message data in transmission', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://claude.ai/chat/xyz',
        },
        writable: true,
      });

      const testMessages: CapturedMessage[] = [
        {
          id: 'msg-with-metadata',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Response with metadata',
          rawHtml: '<p>Response with metadata</p>',
          timestamp: 1234567890,
          capturedAt: 1234567891,
          messageIndex: 2,
          model: 'claude-3-sonnet',
          platform: 'claude',
        },
      ];

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        // Verify data is preserved
        expect(message.data[0].id).toBe('msg-with-metadata');
        expect(message.data[0].model).toBe('claude-3-sonnet');
        expect(message.data[0].rawHtml).toBe('<p>Response with metadata</p>');
        callback({});
      });

      await sendMessages(testMessages);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should detect platform, extract, and send messages', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://chatgpt.com/c/conversation123',
        },
        writable: true,
      });

      const testMessages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: Date.now() + 1000,
          capturedAt: Date.now() + 1000,
          platform: 'chatgpt',
        },
      ];

      (chatgptParser.parseMessages as jest.Mock).mockReturnValue(testMessages);
      mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
        callback({});
      });

      // Detect platform
      const platform = detectPlatform();
      expect(platform).toBe('chatgpt');

      // Extract messages
      const extracted = extractMessages();
      expect(extracted).toHaveLength(2);

      // Send messages
      await sendMessages(extracted);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
      const messageData = (mockChrome.runtime.sendMessage as jest.Mock).mock.calls[0][0];
      expect(messageData.platform).toBe('chatgpt');
      expect(messageData.data).toEqual(testMessages);
    });
  });
});
