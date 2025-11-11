import { StorageAdapter } from '../StorageAdapter';
import { CapturedMessage } from '../../types/Message';

describe('StorageAdapter Interface', () => {
  it('should allow creating a class that implements StorageAdapter', () => {
    class MockAdapter implements StorageAdapter {
      async save(_message: CapturedMessage): Promise<void> {
        // Mock implementation
      }

      async retrieve(_id: string): Promise<CapturedMessage | null> {
        return null;
      }

      async delete(_id: string): Promise<void> {
        // Mock implementation
      }

      async retrieveAll(_conversationId?: string): Promise<CapturedMessage[]> {
        return [];
      }
    }

    const adapter = new MockAdapter();
    expect(adapter).toBeDefined();
  });

  it('should allow save method to accept CapturedMessage', async () => {
    class MockAdapter implements StorageAdapter {
      savedMessages: CapturedMessage[] = [];

      async save(message: CapturedMessage): Promise<void> {
        this.savedMessages.push(message);
      }

      async retrieve(_id: string): Promise<CapturedMessage | null> {
        return null;
      }

      async delete(_id: string): Promise<void> {
        // Mock implementation
      }

      async retrieveAll(_conversationId?: string): Promise<CapturedMessage[]> {
        return [];
      }
    }

    const adapter = new MockAdapter();
    const testMessage: CapturedMessage = {
      id: 'test-id-1',
      conversationId: 'conv-123',
      role: 'user',
      content: 'Test message',
      timestamp: Date.now(),
      capturedAt: Date.now(),
      platform: 'chatgpt',
    };

    await adapter.save(testMessage);
    expect(adapter.savedMessages).toHaveLength(1);
    expect(adapter.savedMessages[0]).toEqual(testMessage);
  });

  it('should allow retrieve method to return CapturedMessage or null', async () => {
    class MockAdapter implements StorageAdapter {
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

      async retrieveAll(_conversationId?: string): Promise<CapturedMessage[]> {
        return Array.from(this.messages.values());
      }
    }

    const adapter = new MockAdapter();
    const testMessage: CapturedMessage = {
      id: 'test-id-2',
      conversationId: 'conv-456',
      role: 'assistant',
      content: 'Test response',
      timestamp: Date.now(),
      capturedAt: Date.now(),
      platform: 'claude',
    };

    await adapter.save(testMessage);

    const retrieved = await adapter.retrieve('test-id-2');
    expect(retrieved).toEqual(testMessage);

    const notFound = await adapter.retrieve('non-existent-id');
    expect(notFound).toBeNull();
  });

  it('should allow delete method to remove messages', async () => {
    class MockAdapter implements StorageAdapter {
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

      async retrieveAll(_conversationId?: string): Promise<CapturedMessage[]> {
        return Array.from(this.messages.values());
      }
    }

    const adapter = new MockAdapter();
    const testMessage: CapturedMessage = {
      id: 'test-id-3',
      conversationId: 'conv-789',
      role: 'user',
      content: 'Message to delete',
      timestamp: Date.now(),
      capturedAt: Date.now(),
      platform: 'chatgpt',
    };

    await adapter.save(testMessage);
    let retrieved = await adapter.retrieve('test-id-3');
    expect(retrieved).not.toBeNull();

    await adapter.delete('test-id-3');
    retrieved = await adapter.retrieve('test-id-3');
    expect(retrieved).toBeNull();
  });

  it('should allow retrieveAll method with optional conversationId filter', async () => {
    class MockAdapter implements StorageAdapter {
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

    const adapter = new MockAdapter();

    const msg1: CapturedMessage = {
      id: 'msg-1',
      conversationId: 'conv-a',
      role: 'user',
      content: 'Message 1',
      timestamp: Date.now(),
      capturedAt: Date.now(),
      platform: 'chatgpt',
    };

    const msg2: CapturedMessage = {
      id: 'msg-2',
      conversationId: 'conv-a',
      role: 'assistant',
      content: 'Message 2',
      timestamp: Date.now(),
      capturedAt: Date.now(),
      platform: 'chatgpt',
    };

    const msg3: CapturedMessage = {
      id: 'msg-3',
      conversationId: 'conv-b',
      role: 'user',
      content: 'Message 3',
      timestamp: Date.now(),
      capturedAt: Date.now(),
      platform: 'claude',
    };

    await adapter.save(msg1);
    await adapter.save(msg2);
    await adapter.save(msg3);

    const allMessages = await adapter.retrieveAll();
    expect(allMessages).toHaveLength(3);

    const convAMessages = await adapter.retrieveAll('conv-a');
    expect(convAMessages).toHaveLength(2);
    expect(convAMessages.every((msg) => msg.conversationId === 'conv-a')).toBe(true);

    const convBMessages = await adapter.retrieveAll('conv-b');
    expect(convBMessages).toHaveLength(1);
    expect(convBMessages[0].conversationId).toBe('conv-b');
  });

  it('should have all required methods with correct Promise return types', async () => {
    class MockAdapter implements StorageAdapter {
      async save(_message: CapturedMessage): Promise<void> {
        // Mock implementation
      }

      async retrieve(_id: string): Promise<CapturedMessage | null> {
        return null;
      }

      async delete(_id: string): Promise<void> {
        // Mock implementation
      }

      async retrieveAll(_conversationId?: string): Promise<CapturedMessage[]> {
        return [];
      }
    }

    const adapter = new MockAdapter();

    // Verify all methods exist
    expect(typeof adapter.save).toBe('function');
    expect(typeof adapter.retrieve).toBe('function');
    expect(typeof adapter.delete).toBe('function');
    expect(typeof adapter.retrieveAll).toBe('function');

    // Verify they return Promises
    const saveResult = adapter.save({
      id: 'test',
      conversationId: 'conv',
      role: 'user',
      content: 'test',
      timestamp: Date.now(),
      capturedAt: Date.now(),
      platform: 'chatgpt',
    });
    expect(saveResult).toBeInstanceOf(Promise);

    const retrieveResult = adapter.retrieve('test');
    expect(retrieveResult).toBeInstanceOf(Promise);

    const deleteResult = adapter.delete('test');
    expect(deleteResult).toBeInstanceOf(Promise);

    const retrieveAllResult = adapter.retrieveAll();
    expect(retrieveAllResult).toBeInstanceOf(Promise);
  });
});
