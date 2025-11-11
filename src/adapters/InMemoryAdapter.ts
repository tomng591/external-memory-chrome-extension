import { StorageAdapter } from './StorageAdapter';
import { CapturedMessage } from '../types/Message';

/**
 * InMemoryAdapter - A simple in-memory storage implementation
 *
 * This adapter stores messages in a Map data structure in memory.
 * It serves as both a testing storage backend for the MVP and a reference
 * implementation for other adapters (Obsidian, Google Docs, etc.).
 *
 * Note: Data is only persisted during the lifetime of the extension
 * and will be cleared when the service worker is unloaded.
 *
 * @example
 * ```typescript
 * const adapter = new InMemoryAdapter();
 * const message: CapturedMessage = {
 *   id: 'uuid-123',
 *   conversationId: 'conv-456',
 *   role: 'user',
 *   content: 'Hello',
 *   timestamp: Date.now(),
 *   capturedAt: Date.now(),
 *   platform: 'claude'
 * };
 * await adapter.save(message);
 * const retrieved = await adapter.retrieve('uuid-123');
 * ```
 */
export class InMemoryAdapter implements StorageAdapter {
  /**
   * Internal storage Map
   * Key: message ID (UUID v4)
   * Value: CapturedMessage object
   */
  private messages: Map<string, CapturedMessage> = new Map();

  /**
   * Save a message to the in-memory store
   *
   * @param message - The CapturedMessage to save
   * @returns Promise that resolves when the message is saved
   */
  async save(message: CapturedMessage): Promise<void> {
    this.messages.set(message.id, message);
  }

  /**
   * Retrieve a message by ID from the in-memory store
   *
   * @param id - The message ID to retrieve
   * @returns Promise resolving to the message if found, null otherwise
   */
  async retrieve(id: string): Promise<CapturedMessage | null> {
    return this.messages.get(id) || null;
  }

  /**
   * Delete a message by ID from the in-memory store
   *
   * @param id - The message ID to delete
   * @returns Promise that resolves when the message is deleted
   */
  async delete(id: string): Promise<void> {
    this.messages.delete(id);
  }

  /**
   * Retrieve all messages, optionally filtered by conversation ID
   *
   * @param conversationId - Optional conversation ID to filter by
   * @returns Promise resolving to an array of messages
   */
  async retrieveAll(conversationId?: string): Promise<CapturedMessage[]> {
    const allMessages = Array.from(this.messages.values());

    if (conversationId) {
      return allMessages.filter((msg) => msg.conversationId === conversationId);
    }

    return allMessages;
  }
}
