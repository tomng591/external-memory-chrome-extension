import { InMemoryAdapter } from '../src/adapters/InMemoryAdapter';
import { CapturedMessage } from '../src/types/Message';

/**
 * Integration tests for InMemoryAdapter
 * Tests that verify the adapter works correctly in realistic scenarios
 */
describe('InMemoryAdapter Integration Tests', () => {
  describe('adapter initialization and readiness', () => {
    it('should create adapter and be ready to use', () => {
      const adapter = new InMemoryAdapter();
      expect(adapter).toBeDefined();
      expect(typeof adapter.save).toBe('function');
      expect(typeof adapter.retrieve).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.retrieveAll).toBe('function');
    });

    it('should start with empty storage', async () => {
      const adapter = new InMemoryAdapter();
      const messages = await adapter.retrieveAll();
      expect(messages).toEqual([]);
    });
  });

  describe('CRUD operations in sequence', () => {
    it('should perform complete CRUD cycle', async () => {
      const adapter = new InMemoryAdapter();

      // Create
      const message: CapturedMessage = {
        id: 'crud-test-1',
        conversationId: 'crud-conv',
        role: 'user',
        content: 'CRUD test message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await adapter.save(message);
      let all = await adapter.retrieveAll();
      expect(all).toHaveLength(1);

      // Read
      const retrieved = await adapter.retrieve('crud-test-1');
      expect(retrieved).toEqual(message);

      // Update
      const updated: CapturedMessage = {
        ...message,
        content: 'Updated CRUD test message',
      };

      await adapter.save(updated);
      const retrievedUpdated = await adapter.retrieve('crud-test-1');
      expect(retrievedUpdated?.content).toBe('Updated CRUD test message');

      // Delete
      await adapter.delete('crud-test-1');
      const deleted = await adapter.retrieve('crud-test-1');
      expect(deleted).toBeNull();

      all = await adapter.retrieveAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent save operations', async () => {
      const adapter = new InMemoryAdapter();

      const messages: CapturedMessage[] = Array.from({ length: 20 }, (_, i) => ({
        id: `concurrent-${i}`,
        conversationId: `conv-concurrent-${i % 5}`,
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Concurrent message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: i % 2 === 0 ? ('chatgpt' as const) : ('claude' as const),
      }));

      // Save all concurrently
      await Promise.all(messages.map((msg) => adapter.save(msg)));

      // Verify all were saved
      const all = await adapter.retrieveAll();
      expect(all).toHaveLength(20);

      // Verify each can be retrieved
      const retrievalPromises = messages.map((msg) =>
        adapter.retrieve(msg.id)
      );
      const retrieved = await Promise.all(retrievalPromises);
      expect(retrieved.every((msg) => msg !== null)).toBe(true);
    });

    it('should handle concurrent mixed operations', async () => {
      const adapter = new InMemoryAdapter();

      const messages: CapturedMessage[] = Array.from({ length: 5 }, (_, i) => ({
        id: `mixed-${i}`,
        conversationId: 'conv-mixed',
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      // Save messages
      await Promise.all(messages.map((msg) => adapter.save(msg)));

      // Perform mixed operations concurrently
      const operations = [
        adapter.save(messages[0]),
        adapter.retrieve('mixed-1'),
        adapter.retrieveAll('conv-mixed'),
        adapter.retrieve('mixed-2'),
        adapter.delete('mixed-3'),
        adapter.retrieveAll(),
      ];

      await Promise.all(operations);

      // Verify final state
      const final = await adapter.retrieveAll();
      expect(final.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('service layer integration scenario', () => {
    it('should work as a storage backend for service layer', async () => {
      const adapter = new InMemoryAdapter();

      // Simulate service layer saving conversation messages
      const conversationId = 'service-test-conv';
      const userMessage: CapturedMessage = {
        id: 'service-msg-1',
        conversationId,
        role: 'user',
        content: 'What is the weather?',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude',
      };

      const assistantMessage: CapturedMessage = {
        id: 'service-msg-2',
        conversationId,
        role: 'assistant',
        content: 'I do not have access to real-time weather data.',
        timestamp: Date.now() + 1000,
        capturedAt: Date.now() + 1000,
        model: 'claude-3-sonnet',
        platform: 'claude',
      };

      // Service saves messages
      await adapter.save(userMessage);
      await adapter.save(assistantMessage);

      // Service retrieves conversation
      const conversation = await adapter.retrieveAll(conversationId);
      expect(conversation).toHaveLength(2);
      expect(conversation[0].role).toBe('user');
      expect(conversation[1].role).toBe('assistant');

      // Service retrieves specific message
      const retrieved = await adapter.retrieve('service-msg-2');
      expect(retrieved?.model).toBe('claude-3-sonnet');
    });

    it('should maintain data persistence during session', async () => {
      const adapter = new InMemoryAdapter();

      // Session 1: Save messages
      const msg1: CapturedMessage = {
        id: 'session-msg-1',
        conversationId: 'persistent-conv',
        role: 'user',
        content: 'First message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      const msg2: CapturedMessage = {
        id: 'session-msg-2',
        conversationId: 'persistent-conv',
        role: 'assistant',
        content: 'Response',
        timestamp: Date.now() + 1000,
        capturedAt: Date.now() + 1000,
        platform: 'chatgpt',
      };

      await adapter.save(msg1);
      await adapter.save(msg2);

      // Session 2: Verify data still exists
      const retrieved1 = await adapter.retrieve('session-msg-1');
      const retrieved2 = await adapter.retrieve('session-msg-2');
      expect(retrieved1).toEqual(msg1);
      expect(retrieved2).toEqual(msg2);

      // Session 3: Retrieve conversation
      const allMessages = await adapter.retrieveAll('persistent-conv');
      expect(allMessages).toHaveLength(2);
    });
  });

  describe('conversation management', () => {
    it('should organize messages by conversation', async () => {
      const adapter = new InMemoryAdapter();

      const conversations = {
        'conv-1': [
          'Tell me a joke',
          'Why did the chicken cross the road?',
        ],
        'conv-2': [
          'What is AI?',
          'AI is artificial intelligence',
          'Can you explain machine learning?',
        ],
        'conv-3': ['Hello', 'Hi there!'],
      };

      let messageId = 1;

      // Save messages for multiple conversations
      for (const [convId, contents] of Object.entries(conversations)) {
        for (let i = 0; i < contents.length; i++) {
          const message: CapturedMessage = {
            id: `msg-${messageId++}`,
            conversationId: convId,
            role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
            content: contents[i],
            timestamp: Date.now() + i,
            capturedAt: Date.now() + i,
            platform: 'chatgpt' as const,
          };

          await adapter.save(message);
        }
      }

      // Verify each conversation has correct messages
      for (const [convId, expectedMessages] of Object.entries(conversations)) {
        const messages = await adapter.retrieveAll(convId);
        expect(messages).toHaveLength(expectedMessages.length);
        expect(messages.every((msg) => msg.conversationId === convId)).toBe(true);
      }

      // Verify total messages
      const allMessages = await adapter.retrieveAll();
      const totalExpected = Object.values(conversations).reduce(
        (sum, msgs) => sum + msgs.length,
        0
      );
      expect(allMessages).toHaveLength(totalExpected);
    });

    it('should support filtering empty conversations', async () => {
      const adapter = new InMemoryAdapter();

      const message: CapturedMessage = {
        id: 'filter-test',
        conversationId: 'populated-conv',
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await adapter.save(message);

      const emptyConv = await adapter.retrieveAll('empty-conv');
      expect(emptyConv).toEqual([]);

      const populatedConv = await adapter.retrieveAll('populated-conv');
      expect(populatedConv).toHaveLength(1);
    });
  });

  describe('message platform handling', () => {
    it('should preserve platform information across operations', async () => {
      const adapter = new InMemoryAdapter();

      const chatgptMsg: CapturedMessage = {
        id: 'platform-chatgpt',
        conversationId: 'multi-platform',
        role: 'user',
        content: 'ChatGPT message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      const claudeMsg: CapturedMessage = {
        id: 'platform-claude',
        conversationId: 'multi-platform',
        role: 'user',
        content: 'Claude message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude',
      };

      await adapter.save(chatgptMsg);
      await adapter.save(claudeMsg);

      const retrieved1 = await adapter.retrieve('platform-chatgpt');
      const retrieved2 = await adapter.retrieve('platform-claude');

      expect(retrieved1?.platform).toBe('chatgpt');
      expect(retrieved2?.platform).toBe('claude');
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle messages with special characters in content', async () => {
      const adapter = new InMemoryAdapter();

      const message: CapturedMessage = {
        id: 'special-chars',
        conversationId: 'special-conv',
        role: 'user',
        content: 'Special chars: <>&"\'`\n\t\\',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await adapter.save(message);
      const retrieved = await adapter.retrieve('special-chars');
      expect(retrieved?.content).toBe('Special chars: <>&"\'`\n\t\\');
    });

    it('should handle large message content', async () => {
      const adapter = new InMemoryAdapter();

      const largeContent = 'x'.repeat(100000);
      const message: CapturedMessage = {
        id: 'large-message',
        conversationId: 'large-conv',
        role: 'user',
        content: largeContent,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await adapter.save(message);
      const retrieved = await adapter.retrieve('large-message');
      expect(retrieved?.content).toHaveLength(100000);
    });

    it('should handle rapid operations without data corruption', async () => {
      const adapter = new InMemoryAdapter();

      const message: CapturedMessage = {
        id: 'rapid-test',
        conversationId: 'rapid-conv',
        role: 'user',
        content: 'Rapid test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      // Perform rapid operations
      await adapter.save(message);
      for (let i = 0; i < 100; i++) {
        await adapter.retrieve('rapid-test');
      }

      const final = await adapter.retrieve('rapid-test');
      expect(final).toEqual(message);
    });
  });
});
