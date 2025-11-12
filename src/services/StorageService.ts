import { StorageAdapter } from '../adapters/StorageAdapter';
import { CapturedMessage } from '../types/Message';

/**
 * StorageService - Service layer for message persistence
 *
 * Acts as the intermediary between the service worker and storage adapters.
 * Provides a clean API for saving messages regardless of the underlying storage backend.
 *
 * @example
 * ```typescript
 * const adapter = new InMemoryAdapter();
 * const storageService = new StorageService(adapter);
 * await storageService.saveMessage(message);
 * ```
 */
export class StorageService {
  /**
   * Create a new StorageService instance
   *
   * @param adapter - The storage adapter to use for persistence
   */
  constructor(private adapter: StorageAdapter) {}

  /**
   * Save a single message to storage
   *
   * @param message - The CapturedMessage to save
   * @returns Promise that resolves when the message is saved
   * @throws Error if the storage operation fails
   *
   * @example
   * ```typescript
   * await storageService.saveMessage(message);
   * ```
   */
  async saveMessage(message: CapturedMessage): Promise<void> {
    try {
      await this.adapter.save(message);
      console.log(
        `[External Memory] Message saved: ${message.id} from ${message.platform} (${message.role})`
      );
    } catch (error) {
      console.error(`[External Memory] Error saving message ${message.id}:`, error);
      throw error;
    }
  }

  /**
   * Save multiple messages to storage
   *
   * Messages are saved sequentially to maintain order and allow proper error handling.
   * If a save fails, the error is logged and thrown, stopping further saves.
   *
   * @param messages - Array of CapturedMessage objects to save
   * @returns Promise that resolves when all messages are saved
   * @throws Error if any storage operation fails
   *
   * @example
   * ```typescript
   * await storageService.saveMessages([msg1, msg2, msg3]);
   * ```
   */
  async saveMessages(messages: CapturedMessage[]): Promise<void> {
    if (messages.length === 0) {
      console.log('[External Memory] No messages to save');
      return;
    }

    try {
      console.log(`[External Memory] Saving ${messages.length} message(s) to storage...`);

      // Save messages sequentially to maintain order and allow proper error handling
      for (const message of messages) {
        await this.adapter.save(message);
      }

      console.log(`[External Memory] Successfully saved ${messages.length} message(s)`);
    } catch (error) {
      console.error('[External Memory] Error saving messages:', error);
      throw error;
    }
  }

  /**
   * Retrieve a message by ID
   *
   * @param id - The message ID to retrieve
   * @returns Promise resolving to the message or null if not found
   */
  async retrieveMessage(id: string): Promise<CapturedMessage | null> {
    try {
      return await this.adapter.retrieve(id);
    } catch (error) {
      console.error(`[External Memory] Error retrieving message ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve all messages, optionally filtered by conversation ID
   *
   * @param conversationId - Optional conversation ID to filter by
   * @returns Promise resolving to array of messages
   */
  async retrieveMessages(conversationId?: string): Promise<CapturedMessage[]> {
    try {
      return await this.adapter.retrieveAll(conversationId);
    } catch (error) {
      console.error('[External Memory] Error retrieving messages:', error);
      throw error;
    }
  }

  /**
   * Delete a message by ID
   *
   * @param id - The message ID to delete
   * @returns Promise that resolves when the message is deleted
   */
  async deleteMessage(id: string): Promise<void> {
    try {
      await this.adapter.delete(id);
      console.log(`[External Memory] Message deleted: ${id}`);
    } catch (error) {
      console.error(`[External Memory] Error deleting message ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get storage statistics for debugging
   * Returns counts and sample data about stored messages
   *
   * @returns Promise resolving to storage stats object
   */
  async getStorageStats(): Promise<{
    totalMessages: number;
    conversations: { [conversationId: string]: number };
    sampleMessages: Array<{
      id: string;
      conversationId: string;
      role: string;
      platform: string;
      contentPreview: string;
    }>;
  }> {
    try {
      const allMessages = await this.adapter.retrieveAll();

      // Count messages by conversation
      const conversationCounts: { [conversationId: string]: number } = {};
      allMessages.forEach((msg) => {
        conversationCounts[msg.conversationId] =
          (conversationCounts[msg.conversationId] || 0) + 1;
      });

      // Get sample of first 5 messages
      const sampleMessages = allMessages.slice(0, 5).map((msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        role: msg.role,
        platform: msg.platform,
        contentPreview: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
      }));

      return {
        totalMessages: allMessages.length,
        conversations: conversationCounts,
        sampleMessages,
      };
    } catch (error) {
      console.error('[External Memory] Error getting storage stats:', error);
      throw error;
    }
  }
}
