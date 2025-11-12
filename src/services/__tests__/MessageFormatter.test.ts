/**
 * Unit tests for MessageFormatter service
 */

import {
  formatUserMessage,
  formatAssistantResponse,
  validateMessage,
  RawUserMessage,
  RawAssistantResponse,
} from '../MessageFormatter';
import { CapturedMessage } from '../../types/Message';

describe('MessageFormatter', () => {
  describe('formatUserMessage()', () => {
    it('should format valid user message correctly', () => {
      const raw: RawUserMessage = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          {
            id: 'msg-user-1',
            role: 'user',
            content: { content_type: 'text', parts: ['Hello ChatGPT'] },
          },
        ],
        timestamp: 1699000000000,
      };

      const formatted = formatUserMessage(raw);

      expect(formatted).toEqual(
        expect.objectContaining({
          conversationId: 'conv-123',
          role: 'user',
          content: 'Hello ChatGPT',
          timestamp: 1699000000000,
          model: 'gpt-4',
          platform: 'chatgpt',
        })
      );
      expect(formatted.id).toBeTruthy();
      expect(formatted.capturedAt).toBeTruthy();
    });

    it('should handle messages array with multiple items', () => {
      const raw: RawUserMessage = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          { role: 'system', content: { parts: ['System prompt'] } },
          { role: 'assistant', content: { parts: ['Previous response'] } },
          {
            role: 'user',
            content: { content_type: 'text', parts: ['New question'] },
          },
        ],
        timestamp: 1699000000000,
      };

      const formatted = formatUserMessage(raw);

      expect(formatted.content).toBe('New question');
      expect(formatted.role).toBe('user');
    });

    it('should handle messages with multiple parts', () => {
      const raw: RawUserMessage = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: { content_type: 'text', parts: ['Part 1', ' Part 2'] },
          },
        ],
        timestamp: 1699000000000,
      };

      const formatted = formatUserMessage(raw);

      expect(formatted.content).toBe('Part 1 Part 2');
    });

    it('should handle string content directly', () => {
      const raw: RawUserMessage = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Direct string content',
          },
        ],
        timestamp: 1699000000000,
      };

      const formatted = formatUserMessage(raw);

      expect(formatted.content).toBe('Direct string content');
    });

    it('should throw error on empty messages array', () => {
      const raw: RawUserMessage = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [],
        timestamp: 1699000000000,
      };

      expect(() => formatUserMessage(raw)).toThrow();
    });

    it('should throw error on missing conversationId', () => {
      const raw: any = {
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [{ role: 'user', content: { parts: ['Hello'] } }],
        timestamp: 1699000000000,
      };

      expect(() => formatUserMessage(raw)).toThrow();
    });

    it('should throw error on missing model', () => {
      const raw: any = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        messages: [{ role: 'user', content: { parts: ['Hello'] } }],
        timestamp: 1699000000000,
      };

      expect(() => formatUserMessage(raw)).toThrow();
    });

    it('should generate unique message ID', () => {
      const raw: RawUserMessage = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: { content_type: 'text', parts: ['Hello'] },
          },
        ],
        timestamp: 1699000000000,
      };

      const formatted1 = formatUserMessage(raw);
      const formatted2 = formatUserMessage(raw);

      // IDs should be different (generated new ones)
      expect(formatted1.id).not.toBe(formatted2.id);
    });

    it('should use provided message id if available', () => {
      const raw: RawUserMessage = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          {
            id: 'custom-msg-id',
            role: 'user',
            content: { content_type: 'text', parts: ['Hello'] },
          },
        ],
        timestamp: 1699000000000,
      };

      const formatted = formatUserMessage(raw);

      expect(formatted.id).toBe('custom-msg-id');
    });
  });

  describe('formatAssistantResponse()', () => {
    it('should format valid assistant response correctly', () => {
      const raw: RawAssistantResponse = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: 'This is the assistant response.',
        chunks: [
          { timestamp: 1699000001000, content: 'This is the assistant response.' },
        ],
      };

      const formatted = formatAssistantResponse(raw);

      expect(formatted).toEqual(
        expect.objectContaining({
          id: 'msg-ai-1',
          conversationId: 'conv-123',
          role: 'assistant',
          content: 'This is the assistant response.',
          model: 'gpt-4',
          platform: 'chatgpt',
        })
      );
      expect(formatted.timestamp).toBe(1699000001000);
      expect(formatted.capturedAt).toBeTruthy();
    });

    it('should handle empty content', () => {
      const raw: RawAssistantResponse = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: '',
        chunks: [],
      };

      const formatted = formatAssistantResponse(raw);

      // Should still create valid message (partial response)
      expect(formatted.content).toBe('');
      expect(formatted.id).toBe('msg-ai-1');
      expect(formatted.role).toBe('assistant');
    });

    it('should use timestamp from first chunk', () => {
      const chunkTimestamp = 1699000001000;
      const raw: RawAssistantResponse = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: 'Response',
        chunks: [
          { timestamp: chunkTimestamp, content: 'Response' },
          { timestamp: 1699000002000, content: ' more' },
        ],
      };

      const formatted = formatAssistantResponse(raw);

      expect(formatted.timestamp).toBe(chunkTimestamp);
    });

    it('should fallback to current time if no chunks', () => {
      const raw: RawAssistantResponse = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: 'Response',
      };

      const beforeTime = Date.now();
      const formatted = formatAssistantResponse(raw);
      const afterTime = Date.now();

      expect(formatted.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(formatted.timestamp).toBeLessThanOrEqual(afterTime + 10); // Allow small margin
    });

    it('should throw error on missing conversationId', () => {
      const raw: any = {
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: 'Response',
      };

      expect(() => formatAssistantResponse(raw)).toThrow();
    });

    it('should throw error on missing messageId', () => {
      const raw: any = {
        conversationId: 'conv-123',
        model: 'gpt-4',
        content: 'Response',
      };

      expect(() => formatAssistantResponse(raw)).toThrow();
    });

    it('should throw error on missing model', () => {
      const raw: any = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        content: 'Response',
      };

      expect(() => formatAssistantResponse(raw)).toThrow();
    });

    it('should throw error on non-string content', () => {
      const raw: any = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: { invalid: 'object' },
      };

      expect(() => formatAssistantResponse(raw)).toThrow();
    });
  });

  describe('validateMessage()', () => {
    it('should validate complete message', () => {
      const msg: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
        timestamp: 1699000000000,
        capturedAt: Date.now(),
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      expect(validateMessage(msg)).toBe(true);
    });

    it('should reject missing id', () => {
      const msg: any = {
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
        timestamp: 1699000000000,
        capturedAt: Date.now(),
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      expect(validateMessage(msg)).toBe(false);
    });

    it('should reject missing conversationId', () => {
      const msg: any = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: 1699000000000,
        capturedAt: Date.now(),
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      expect(validateMessage(msg)).toBe(false);
    });

    it('should reject invalid role', () => {
      const msg: any = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'invalid',
        content: 'Hello',
        timestamp: 1699000000000,
        capturedAt: Date.now(),
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      expect(validateMessage(msg)).toBe(false);
    });

    it('should reject invalid content type', () => {
      const msg: any = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 123, // Should be string
        timestamp: 1699000000000,
        capturedAt: Date.now(),
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      expect(validateMessage(msg)).toBe(false);
    });

    it('should reject invalid timestamp', () => {
      const msg: any = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
        timestamp: -1, // Invalid
        capturedAt: Date.now(),
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      expect(validateMessage(msg)).toBe(false);
    });

    it('should reject invalid capturedAt', () => {
      const msg: any = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
        timestamp: 1699000000000,
        capturedAt: 0, // Invalid
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      expect(validateMessage(msg)).toBe(false);
    });

    it('should reject invalid platform', () => {
      const msg: any = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
        timestamp: 1699000000000,
        capturedAt: Date.now(),
        model: 'gpt-4',
        platform: 'invalid',
      };

      expect(validateMessage(msg)).toBe(false);
    });
  });
});
