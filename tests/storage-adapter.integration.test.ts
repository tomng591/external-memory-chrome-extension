import { StorageAdapter } from '../src/adapters/StorageAdapter';
import { CapturedMessage } from '../src/types/Message';

/**
 * Integration tests for StorageAdapter interface
 * Tests verifying that StorageAdapter can be imported and implemented correctly
 */
describe('StorageAdapter Integration Tests', () => {
  it('should be importable from src/adapters', () => {
    // StorageAdapter is a type/interface, so we verify it exists by using it in type checking
    // This test ensures the import path works correctly
    const _adapter: StorageAdapter | null = null;
    expect(_adapter === null || typeof _adapter === 'object').toBe(true);
  });

  describe('Mock implementations', () => {
    /**
     * InMemory adapter - for testing and development
     */
    class InMemoryAdapter implements StorageAdapter {
      private messages: Map<string, CapturedMessage> = new Map();

      async save(message: CapturedMessage): Promise<void> {
        this.messages.set(message.id, message);
      }

      async retrieve(id: string): Promise<CapturedMessage | null> {
        return this.messages.get(id) || null;
      }

      async delete(id: string): Promise<void> {
        this.messages.delete(id);
      }

      async retrieveAll(conversationId?: string): Promise<CapturedMessage[]> {
        const messages = Array.from(this.messages.values());
        if (conversationId) {
          return messages.filter((msg) => msg.conversationId === conversationId);
        }
        return messages;
      }
    }

    it('should create InMemoryAdapter that implements StorageAdapter', () => {
      const adapter = new InMemoryAdapter();
      expect(adapter).toBeInstanceOf(InMemoryAdapter);
      expect(typeof adapter.save).toBe('function');
      expect(typeof adapter.retrieve).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.retrieveAll).toBe('function');
    });

    it('should swap between different adapter implementations', async () => {
      // Create two different implementations
      const inMemoryAdapter = new InMemoryAdapter();

      class AnotherAdapter implements StorageAdapter {
        private storage: CapturedMessage[] = [];

        async save(message: CapturedMessage): Promise<void> {
          this.storage.push(message);
        }

        async retrieve(id: string): Promise<CapturedMessage | null> {
          return this.storage.find((msg) => msg.id === id) || null;
        }

        async delete(id: string): Promise<void> {
          const index = this.storage.findIndex((msg) => msg.id === id);
          if (index > -1) {
            this.storage.splice(index, 1);
          }
        }

        async retrieveAll(conversationId?: string): Promise<CapturedMessage[]> {
          if (conversationId) {
            return this.storage.filter((msg) => msg.conversationId === conversationId);
          }
          return this.storage;
        }
      }

      const anotherAdapter = new AnotherAdapter();

      const testMessage: CapturedMessage = {
        id: 'integration-test-1',
        conversationId: 'conv-integration-1',
        role: 'user',
        content: 'Test message for integration',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      // Test with first adapter
      await inMemoryAdapter.save(testMessage);
      let result = await inMemoryAdapter.retrieve('integration-test-1');
      expect(result).toEqual(testMessage);

      // Test with second adapter
      await anotherAdapter.save(testMessage);
      result = await anotherAdapter.retrieve('integration-test-1');
      expect(result).toEqual(testMessage);

      // Verify they can be swapped transparently
      const adapters: StorageAdapter[] = [inMemoryAdapter, anotherAdapter];
      for (const adapter of adapters) {
        const retrieved = await adapter.retrieve('integration-test-1');
        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe('integration-test-1');
      }
    });

    it('should handle multiple messages across different conversations', async () => {
      const adapter = new InMemoryAdapter();

      const messages: CapturedMessage[] = [
        {
          id: 'msg-int-1',
          conversationId: 'conv-integration-a',
          role: 'user',
          content: 'Hello from conversation A',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'claude',
        },
        {
          id: 'msg-int-2',
          conversationId: 'conv-integration-a',
          role: 'assistant',
          content: 'Response in conversation A',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'claude',
        },
        {
          id: 'msg-int-3',
          conversationId: 'conv-integration-b',
          role: 'user',
          content: 'Hello from conversation B',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
      ];

      // Save all messages
      for (const message of messages) {
        await adapter.save(message);
      }

      // Verify retrieveAll returns all messages
      const allMessages = await adapter.retrieveAll();
      expect(allMessages).toHaveLength(3);

      // Verify filtering by conversationId works
      const convAMessages = await adapter.retrieveAll('conv-integration-a');
      expect(convAMessages).toHaveLength(2);
      expect(convAMessages.every((msg) => msg.conversationId === 'conv-integration-a')).toBe(true);

      const convBMessages = await adapter.retrieveAll('conv-integration-b');
      expect(convBMessages).toHaveLength(1);
      expect(convBMessages[0].conversationId).toBe('conv-integration-b');
    });

    it('should properly handle message deletion across adapters', async () => {
      const adapter = new InMemoryAdapter();

      const message: CapturedMessage = {
        id: 'msg-to-delete',
        conversationId: 'conv-delete-test',
        role: 'user',
        content: 'This message will be deleted',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'claude',
      };

      // Save, verify, delete, and verify deletion
      await adapter.save(message);
      let retrieved = await adapter.retrieve('msg-to-delete');
      expect(retrieved).not.toBeNull();

      await adapter.delete('msg-to-delete');
      retrieved = await adapter.retrieve('msg-to-delete');
      expect(retrieved).toBeNull();

      const allMessages = await adapter.retrieveAll();
      expect(allMessages.every((msg) => msg.id !== 'msg-to-delete')).toBe(true);
    });

    it('should support CapturedMessage fields including optional fields', async () => {
      const adapter = new InMemoryAdapter();

      const messageWithOptionalFields: CapturedMessage = {
        id: 'msg-with-optional-1',
        conversationId: 'conv-optional',
        role: 'assistant',
        content: 'Response with model info',
        rawHtml: '<p>Response with model info</p>',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        messageIndex: 5,
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      await adapter.save(messageWithOptionalFields);
      const retrieved = await adapter.retrieve('msg-with-optional-1');

      expect(retrieved).toEqual(messageWithOptionalFields);
      expect(retrieved?.model).toBe('gpt-4');
      expect(retrieved?.rawHtml).toBe('<p>Response with model info</p>');
      expect(retrieved?.messageIndex).toBe(5);
    });
  });

  describe('Interface contract verification', () => {
    it('should allow type-safe adapter implementations', () => {
      /**
       * Example of a type-safe implementation
       * This verifies that implementations must match the interface contract
       */
      const createAdapter = (): StorageAdapter => {
        return {
          async save(_message: CapturedMessage): Promise<void> {
            // Implementation
          },
          async retrieve(_id: string): Promise<CapturedMessage | null> {
            return null;
          },
          async delete(_id: string): Promise<void> {
            // Implementation
          },
          async retrieveAll(_conversationId?: string): Promise<CapturedMessage[]> {
            return [];
          },
        };
      };

      const adapter = createAdapter();
      expect(adapter).toBeDefined();
      expect(typeof adapter.save).toBe('function');
      expect(typeof adapter.retrieve).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.retrieveAll).toBe('function');
    });

    it('should ensure adapters return correct Promise types', async () => {
      class PromiseTypeAdapter implements StorageAdapter {
        async save(_message: CapturedMessage): Promise<void> {
          return undefined;
        }

        async retrieve(_id: string): Promise<CapturedMessage | null> {
          return null;
        }

        async delete(_id: string): Promise<void> {
          return undefined;
        }

        async retrieveAll(_conversationId?: string): Promise<CapturedMessage[]> {
          return [];
        }
      }

      const adapter = new PromiseTypeAdapter();

      // Verify Promise types
      const savePromise = adapter.save({
        id: 'test',
        conversationId: 'conv',
        role: 'user',
        content: 'test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      });
      expect(savePromise).toBeInstanceOf(Promise);
      await savePromise;

      const retrievePromise = adapter.retrieve('test');
      expect(retrievePromise).toBeInstanceOf(Promise);
      const result = await retrievePromise;
      expect(result === null || typeof result === 'object').toBe(true);

      const deletePromise = adapter.delete('test');
      expect(deletePromise).toBeInstanceOf(Promise);
      await deletePromise;

      const retrieveAllPromise = adapter.retrieveAll();
      expect(retrieveAllPromise).toBeInstanceOf(Promise);
      const results = await retrieveAllPromise;
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
