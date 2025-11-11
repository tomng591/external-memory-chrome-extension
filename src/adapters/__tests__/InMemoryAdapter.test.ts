import { InMemoryAdapter } from '../InMemoryAdapter';
import { CapturedMessage } from '../../types/Message';

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  describe('save and retrieve', () => {
    it('should save a single message', async () => {
      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await adapter.save(message);

      const retrieved = await adapter.retrieve('msg-1');
      expect(retrieved).toEqual(message);
    });

    it('should save and retrieve a message with optional fields', async () => {
      const message: CapturedMessage = {
        id: 'msg-with-optional',
        conversationId: 'conv-2',
        role: 'assistant',
        content: 'Response with metadata',
        rawHtml: '<p>Response with metadata</p>',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        messageIndex: 2,
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      await adapter.save(message);

      const retrieved = await adapter.retrieve('msg-with-optional');
      expect(retrieved).toEqual(message);
      expect(retrieved?.model).toBe('gpt-4');
      expect(retrieved?.rawHtml).toBe('<p>Response with metadata</p>');
      expect(retrieved?.messageIndex).toBe(2);
    });
  });

  describe('retrieve', () => {
    it('should return null for non-existent message', async () => {
      const retrieved = await adapter.retrieve('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should retrieve exact message saved', async () => {
      const message: CapturedMessage = {
        id: 'exact-msg',
        conversationId: 'conv-3',
        role: 'user',
        content: 'Exact test',
        timestamp: 12345,
        capturedAt: 12346,
        platform: 'claude',
      };

      await adapter.save(message);

      const retrieved = await adapter.retrieve('exact-msg');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('exact-msg');
      expect(retrieved?.content).toBe('Exact test');
      expect(retrieved?.timestamp).toBe(12345);
      expect(retrieved?.capturedAt).toBe(12346);
    });
  });

  describe('delete', () => {
    it('should delete a message', async () => {
      const message: CapturedMessage = {
        id: 'msg-to-delete',
        conversationId: 'conv-4',
        role: 'user',
        content: 'Delete me',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await adapter.save(message);
      let retrieved = await adapter.retrieve('msg-to-delete');
      expect(retrieved).not.toBeNull();

      await adapter.delete('msg-to-delete');
      retrieved = await adapter.retrieve('msg-to-delete');
      expect(retrieved).toBeNull();
    });

    it('should not throw error when deleting non-existent message', async () => {
      await expect(adapter.delete('non-existent-id')).resolves.toBeUndefined();
    });

    it('should not affect other messages when deleting', async () => {
      const msg1: CapturedMessage = {
        id: 'msg-1-keep',
        conversationId: 'conv-5',
        role: 'user',
        content: 'Keep me',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      const msg2: CapturedMessage = {
        id: 'msg-2-delete',
        conversationId: 'conv-5',
        role: 'assistant',
        content: 'Delete me',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await adapter.save(msg1);
      await adapter.save(msg2);

      await adapter.delete('msg-2-delete');

      const kept = await adapter.retrieve('msg-1-keep');
      const deleted = await adapter.retrieve('msg-2-delete');

      expect(kept).toEqual(msg1);
      expect(deleted).toBeNull();
    });
  });

  describe('retrieveAll', () => {
    it('should retrieve all messages when no filter provided', async () => {
      const messages: CapturedMessage[] = [
        {
          id: 'all-msg-1',
          conversationId: 'conv-6',
          role: 'user',
          content: 'Message 1',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
        {
          id: 'all-msg-2',
          conversationId: 'conv-7',
          role: 'assistant',
          content: 'Message 2',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'claude',
        },
      ];

      for (const msg of messages) {
        await adapter.save(msg);
      }

      const all = await adapter.retrieveAll();
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(messages[0]);
      expect(all).toContainEqual(messages[1]);
    });

    it('should return empty array when no messages exist', async () => {
      const all = await adapter.retrieveAll();
      expect(all).toEqual([]);
    });

    it('should filter messages by conversationId', async () => {
      const convA_msg1: CapturedMessage = {
        id: 'convA-msg-1',
        conversationId: 'conv-a',
        role: 'user',
        content: 'Conv A Message 1',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      const convA_msg2: CapturedMessage = {
        id: 'convA-msg-2',
        conversationId: 'conv-a',
        role: 'assistant',
        content: 'Conv A Message 2',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      const convB_msg1: CapturedMessage = {
        id: 'convB-msg-1',
        conversationId: 'conv-b',
        role: 'user',
        content: 'Conv B Message 1',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude',
      };

      await adapter.save(convA_msg1);
      await adapter.save(convA_msg2);
      await adapter.save(convB_msg1);

      const convAMessages = await adapter.retrieveAll('conv-a');
      expect(convAMessages).toHaveLength(2);
      expect(convAMessages).toContainEqual(convA_msg1);
      expect(convAMessages).toContainEqual(convA_msg2);
      expect(
        convAMessages.every((msg) => msg.conversationId === 'conv-a')
      ).toBe(true);

      const convBMessages = await adapter.retrieveAll('conv-b');
      expect(convBMessages).toHaveLength(1);
      expect(convBMessages[0]).toEqual(convB_msg1);
    });

    it('should return empty array for non-existent conversationId', async () => {
      const message: CapturedMessage = {
        id: 'msg-conv-test',
        conversationId: 'conv-x',
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await adapter.save(message);

      const result = await adapter.retrieveAll('non-existent-conv');
      expect(result).toEqual([]);
    });
  });

  describe('update existing message', () => {
    it('should overwrite message when saving with same ID', async () => {
      const original: CapturedMessage = {
        id: 'update-test',
        conversationId: 'conv-8',
        role: 'user',
        content: 'Original content',
        timestamp: 1000,
        capturedAt: 1001,
        platform: 'chatgpt',
      };

      const updated: CapturedMessage = {
        id: 'update-test',
        conversationId: 'conv-8',
        role: 'user',
        content: 'Updated content',
        timestamp: 2000,
        capturedAt: 2001,
        platform: 'chatgpt',
      };

      await adapter.save(original);
      let retrieved = await adapter.retrieve('update-test');
      expect(retrieved?.content).toBe('Original content');

      await adapter.save(updated);
      retrieved = await adapter.retrieve('update-test');
      expect(retrieved?.content).toBe('Updated content');
      expect(retrieved?.timestamp).toBe(2000);
    });
  });

  describe('async behavior', () => {
    it('should return Promises for all methods', async () => {
      const message: CapturedMessage = {
        id: 'async-test',
        conversationId: 'conv-9',
        role: 'user',
        content: 'Async test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude',
      };

      const savePromise = adapter.save(message);
      expect(savePromise).toBeInstanceOf(Promise);
      await savePromise;

      const retrievePromise = adapter.retrieve('async-test');
      expect(retrievePromise).toBeInstanceOf(Promise);
      await retrievePromise;

      const deletePromise = adapter.delete('async-test');
      expect(deletePromise).toBeInstanceOf(Promise);
      await deletePromise;

      const retrieveAllPromise = adapter.retrieveAll();
      expect(retrieveAllPromise).toBeInstanceOf(Promise);
      await retrieveAllPromise;
    });

    it('should handle multiple concurrent saves', async () => {
      const messages: CapturedMessage[] = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-msg-${i}`,
        conversationId: `conv-concurrent`,
        role: 'user' as const,
        content: `Concurrent message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      await Promise.all(messages.map((msg) => adapter.save(msg)));

      const allMessages = await adapter.retrieveAll();
      expect(allMessages).toHaveLength(5);
    });

    it('should resolve promises immediately for in-memory operations', async () => {
      const message: CapturedMessage = {
        id: 'immediate-test',
        conversationId: 'conv-10',
        role: 'user',
        content: 'Immediate test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      const start = performance.now();
      await adapter.save(message);
      const end = performance.now();

      expect(end - start).toBeLessThan(10); // Should be nearly instantaneous
    });
  });

  describe('multiple saves and operations', () => {
    it('should handle multiple saves without data loss', async () => {
      const messages: CapturedMessage[] = Array.from({ length: 10 }, (_, i) => ({
        id: `multi-msg-${i}`,
        conversationId: `multi-conv-${i % 3}`,
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
        timestamp: Date.now() + i,
        capturedAt: Date.now() + i,
        platform: i % 2 === 0 ? ('chatgpt' as const) : ('claude' as const),
      }));

      for (const msg of messages) {
        await adapter.save(msg);
      }

      const all = await adapter.retrieveAll();
      expect(all).toHaveLength(10);

      for (const msg of messages) {
        const retrieved = await adapter.retrieve(msg.id);
        expect(retrieved).toEqual(msg);
      }
    });
  });
});
