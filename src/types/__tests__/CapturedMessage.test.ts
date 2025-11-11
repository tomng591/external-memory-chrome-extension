import { CapturedMessage, MessageRole, Platform } from '../Message';

describe('CapturedMessage Interface', () => {
  describe('required fields', () => {
    it('should allow creating a valid CapturedMessage with all required fields', () => {
      const message: CapturedMessage = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        conversationId: 'conv-abc123',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      expect(message.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(message.conversationId).toBe('conv-abc123');
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, how are you?');
      expect(message.timestamp).toBeDefined();
      expect(message.capturedAt).toBeDefined();
      expect(message.platform).toBe('chatgpt');
    });

    it('should enforce role union type with user role', () => {
      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user' as MessageRole,
        content: 'Test message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      expect(message.role).toBe('user');
    });

    it('should enforce role union type with assistant role', () => {
      const message: CapturedMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant' as MessageRole,
        content: 'Assistant response',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude'
      };

      expect(message.role).toBe('assistant');
    });

    it('should enforce platform union type with chatgpt', () => {
      const message: CapturedMessage = {
        id: 'msg-3',
        conversationId: 'conv-2',
        role: 'user',
        content: 'ChatGPT test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as Platform
      };

      expect(message.platform).toBe('chatgpt');
    });

    it('should enforce platform union type with claude', () => {
      const message: CapturedMessage = {
        id: 'msg-4',
        conversationId: 'conv-2',
        role: 'assistant',
        content: 'Claude test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude' as Platform
      };

      expect(message.platform).toBe('claude');
    });
  });

  describe('optional fields', () => {
    it('should allow optional rawHtml field', () => {
      const messageWithoutHtml: CapturedMessage = {
        id: 'msg-5',
        conversationId: 'conv-3',
        role: 'user',
        content: 'No HTML',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      expect(messageWithoutHtml.rawHtml).toBeUndefined();

      const messageWithHtml: CapturedMessage = {
        id: 'msg-6',
        conversationId: 'conv-3',
        role: 'user',
        content: 'With HTML',
        rawHtml: '<div>With HTML</div>',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      expect(messageWithHtml.rawHtml).toBe('<div>With HTML</div>');
    });

    it('should allow optional messageIndex field', () => {
      const messageWithoutIndex: CapturedMessage = {
        id: 'msg-7',
        conversationId: 'conv-4',
        role: 'user',
        content: 'No index',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      expect(messageWithoutIndex.messageIndex).toBeUndefined();

      const messageWithIndex: CapturedMessage = {
        id: 'msg-8',
        conversationId: 'conv-4',
        role: 'user',
        content: 'With index',
        messageIndex: 1,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      expect(messageWithIndex.messageIndex).toBe(1);
    });

    it('should allow optional model field', () => {
      const messageWithoutModel: CapturedMessage = {
        id: 'msg-9',
        conversationId: 'conv-5',
        role: 'assistant',
        content: 'No model',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      expect(messageWithoutModel.model).toBeUndefined();

      const messageWithModel: CapturedMessage = {
        id: 'msg-10',
        conversationId: 'conv-5',
        role: 'assistant',
        content: 'With model',
        model: 'gpt-4',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      expect(messageWithModel.model).toBe('gpt-4');
    });

    it('should allow all optional fields together', () => {
      const messageWithAllOptional: CapturedMessage = {
        id: 'msg-11',
        conversationId: 'conv-6',
        role: 'assistant',
        content: 'Full message with all fields',
        rawHtml: '<p>Full message with all fields</p>',
        timestamp: 1699000000000,
        capturedAt: 1699000001000,
        messageIndex: 5,
        model: 'claude-3-sonnet',
        platform: 'claude'
      };

      expect(messageWithAllOptional.id).toBe('msg-11');
      expect(messageWithAllOptional.rawHtml).toBe('<p>Full message with all fields</p>');
      expect(messageWithAllOptional.messageIndex).toBe(5);
      expect(messageWithAllOptional.model).toBe('claude-3-sonnet');
    });
  });

  describe('timestamp fields', () => {
    it('should store Unix timestamps as numbers', () => {
      const now = Date.now();
      const message: CapturedMessage = {
        id: 'msg-12',
        conversationId: 'conv-7',
        role: 'user',
        content: 'Timestamp test',
        timestamp: now,
        capturedAt: now + 100,
        platform: 'chatgpt'
      };

      expect(typeof message.timestamp).toBe('number');
      expect(typeof message.capturedAt).toBe('number');
      expect(message.capturedAt).toBeGreaterThan(message.timestamp);
    });
  });

  describe('type exports', () => {
    it('should export MessageRole type', () => {
      const userRole: MessageRole = 'user';
      const assistantRole: MessageRole = 'assistant';

      expect(userRole).toBe('user');
      expect(assistantRole).toBe('assistant');
    });

    it('should export Platform type', () => {
      const chatgptPlatform: Platform = 'chatgpt';
      const claudePlatform: Platform = 'claude';

      expect(chatgptPlatform).toBe('chatgpt');
      expect(claudePlatform).toBe('claude');
    });
  });

  describe('interface validation', () => {
    it('should create messages for both platforms', () => {
      const chatgptMessage: CapturedMessage = {
        id: 'msg-13',
        conversationId: 'chatgpt-conv',
        role: 'user',
        content: 'ChatGPT content',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt'
      };

      const claudeMessage: CapturedMessage = {
        id: 'msg-14',
        conversationId: 'claude-conv',
        role: 'assistant',
        content: 'Claude content',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude'
      };

      expect(chatgptMessage.platform).toBe('chatgpt');
      expect(claudeMessage.platform).toBe('claude');
    });
  });
});
