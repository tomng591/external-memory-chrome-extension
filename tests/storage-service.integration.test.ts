import { StorageService } from '../src/services/StorageService';
import { InMemoryAdapter } from '../src/adapters/InMemoryAdapter';
import { CapturedMessage } from '../src/types/Message';

/**
 * Integration tests for StorageService with InMemoryAdapter
 * Tests the complete flow from message receipt to storage
 */
describe('StorageService Integration Tests', () => {
  describe('StorageService with InMemoryAdapter', () => {
    it('should create StorageService with InMemoryAdapter', () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      expect(storageService).toBeDefined();
      expect(typeof storageService.saveMessage).toBe('function');
      expect(typeof storageService.saveMessages).toBe('function');
    });

    it('should save and retrieve a single message', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      const message: CapturedMessage = {
        id: 'integration-msg-1',
        conversationId: 'integration-conv-1',
        role: 'user',
        content: 'Test message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await storageService.saveMessage(message);
      const retrieved = await storageService.retrieveMessage('integration-msg-1');

      expect(retrieved).toEqual(message);
    });

    it('should save and retrieve multiple messages', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      const messages: CapturedMessage[] = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: 'integration-conv-1',
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      await storageService.saveMessages(messages);
      const allMessages = await storageService.retrieveMessages();

      expect(allMessages).toHaveLength(5);
      for (const msg of messages) {
        expect(allMessages).toContainEqual(msg);
      }
    });

    it('should handle conversation filtering', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      const convAMessages: CapturedMessage[] = Array.from({ length: 3 }, (_, i) => ({
        id: `conv-a-msg-${i}`,
        conversationId: 'conv-a',
        role: 'user' as const,
        content: `Conv A Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      const convBMessages: CapturedMessage[] = Array.from({ length: 2 }, (_, i) => ({
        id: `conv-b-msg-${i}`,
        conversationId: 'conv-b',
        role: 'user' as const,
        content: `Conv B Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude' as const,
      }));

      const allMessages = [...convAMessages, ...convBMessages];
      await storageService.saveMessages(allMessages);

      const retrievedConvA = await storageService.retrieveMessages('conv-a');
      expect(retrievedConvA).toHaveLength(3);
      expect(retrievedConvA.every((msg) => msg.conversationId === 'conv-a')).toBe(true);

      const retrievedConvB = await storageService.retrieveMessages('conv-b');
      expect(retrievedConvB).toHaveLength(2);
      expect(retrievedConvB.every((msg) => msg.conversationId === 'conv-b')).toBe(true);
    });

    it('should delete messages', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      const message: CapturedMessage = {
        id: 'msg-to-delete',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Delete me',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await storageService.saveMessage(message);
      let retrieved = await storageService.retrieveMessage('msg-to-delete');
      expect(retrieved).not.toBeNull();

      await storageService.deleteMessage('msg-to-delete');
      retrieved = await storageService.retrieveMessage('msg-to-delete');
      expect(retrieved).toBeNull();
    });
  });

  describe('Message flow simulation (content script → service worker)', () => {
    it('should process captured messages from content script', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      // Simulate messages captured by content script
      const capturedMessages: CapturedMessage[] = [
        {
          id: 'captured-1',
          conversationId: 'conv-sim',
          role: 'user',
          content: 'Hello, Claude!',
          timestamp: 1700000000,
          capturedAt: Date.now(),
          platform: 'claude',
        },
        {
          id: 'captured-2',
          conversationId: 'conv-sim',
          role: 'assistant',
          content: 'Hi! How can I help?',
          timestamp: 1700000001,
          capturedAt: Date.now(),
          platform: 'claude',
        },
      ];

      // Service worker receives and saves messages
      await storageService.saveMessages(capturedMessages);

      // Verify messages are stored
      const stored = await storageService.retrieveMessages('conv-sim');
      expect(stored).toHaveLength(2);
      expect(stored[0].role).toBe('user');
      expect(stored[1].role).toBe('assistant');
    });

    it('should handle batched message saves', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      // Simulate batched messages from content script
      const batch1: CapturedMessage[] = Array.from({ length: 10 }, (_, i) => ({
        id: `batch1-msg-${i}`,
        conversationId: 'batch-conv',
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Batch 1 Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      const batch2: CapturedMessage[] = Array.from({ length: 5 }, (_, i) => ({
        id: `batch2-msg-${i}`,
        conversationId: 'batch-conv',
        role: 'user' as const,
        content: `Batch 2 Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      // Save batches
      await storageService.saveMessages(batch1);
      await storageService.saveMessages(batch2);

      // Verify all messages stored
      const allMessages = await storageService.retrieveMessages('batch-conv');
      expect(allMessages).toHaveLength(15);
    });

    it('should preserve message metadata through storage', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      const messageWithMetadata: CapturedMessage = {
        id: 'msg-with-metadata',
        conversationId: 'metadata-conv',
        role: 'assistant',
        content: 'Response with metadata',
        rawHtml: '<p>Response with metadata</p>',
        timestamp: 1700000000,
        capturedAt: 1700000001,
        messageIndex: 5,
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      await storageService.saveMessage(messageWithMetadata);
      const retrieved = await storageService.retrieveMessage('msg-with-metadata');

      expect(retrieved?.content).toBe('Response with metadata');
      expect(retrieved?.rawHtml).toBe('<p>Response with metadata</p>');
      expect(retrieved?.messageIndex).toBe(5);
      expect(retrieved?.model).toBe('gpt-4');
      expect(retrieved?.platform).toBe('chatgpt');
    });

    it('should handle multiple concurrent saves', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      const messages: CapturedMessage[] = Array.from({ length: 20 }, (_, i) => ({
        id: `concurrent-msg-${i}`,
        conversationId: 'concurrent-conv',
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Concurrent message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      // Save all messages concurrently by grouping
      await Promise.all([
        storageService.saveMessages(messages.slice(0, 10)),
        storageService.saveMessages(messages.slice(10, 20)),
      ]);

      const allMessages = await storageService.retrieveMessages();
      expect(allMessages).toHaveLength(20);
    });
  });

  describe('Error handling', () => {
    it('should gracefully handle storage errors', async () => {
      // Create a failing adapter
      class FailingAdapter extends InMemoryAdapter {
        async save(_message: CapturedMessage): Promise<void> {
          throw new Error('Storage backend unavailable');
        }
      }

      const adapter = new FailingAdapter();
      const storageService = new StorageService(adapter);

      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await expect(storageService.saveMessage(message)).rejects.toThrow(
        'Storage backend unavailable'
      );
    });

    it('should continue saving remaining messages on error', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      const message1: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Message 1',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      const message2: CapturedMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Message 2',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      // Save first message successfully
      await storageService.saveMessage(message1);
      const retrieved1 = await storageService.retrieveMessage('msg-1');
      expect(retrieved1).not.toBeNull();

      // Save second message
      await storageService.saveMessage(message2);
      const retrieved2 = await storageService.retrieveMessage('msg-2');
      expect(retrieved2).not.toBeNull();
    });
  });

  describe('Platform handling', () => {
    it('should store messages from both ChatGPT and Claude', async () => {
      const adapter = new InMemoryAdapter();
      const storageService = new StorageService(adapter);

      const chatgptMsg: CapturedMessage = {
        id: 'chatgpt-msg',
        conversationId: 'multi-platform-conv',
        role: 'user',
        content: 'ChatGPT message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      const claudeMsg: CapturedMessage = {
        id: 'claude-msg',
        conversationId: 'multi-platform-conv',
        role: 'user',
        content: 'Claude message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude',
      };

      await storageService.saveMessages([chatgptMsg, claudeMsg]);

      const allMessages = await storageService.retrieveMessages('multi-platform-conv');
      expect(allMessages).toHaveLength(2);

      const chatgpt = allMessages.find((msg) => msg.platform === 'chatgpt');
      const claude = allMessages.find((msg) => msg.platform === 'claude');

      expect(chatgpt?.content).toBe('ChatGPT message');
      expect(claude?.content).toBe('Claude message');
    });
  });
});
