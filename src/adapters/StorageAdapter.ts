import { CapturedMessage } from '../types/Message';

/**
 * StorageAdapter Interface
 *
 * Defines the contract for all storage backend implementations. This interface
 * ensures a consistent API for saving, retrieving, and deleting captured messages
 * regardless of the underlying storage backend (InMemory, Obsidian, Google Docs, etc.).
 *
 * All methods are asynchronous to support both synchronous and asynchronous backends.
 */
export interface StorageAdapter {
  /**
   * Save a single message to the storage backend
   *
   * @param message - The CapturedMessage to save
   * @returns A Promise that resolves when the message has been successfully saved
   * @throws Implementations may throw errors for invalid messages or storage failures
   *
   * @example
   * ```typescript
   * const message: CapturedMessage = {
   *   id: 'uuid-1234',
   *   conversationId: 'conv-5678',
   *   role: 'user',
   *   content: 'Hello, Claude!',
   *   timestamp: Date.now(),
   *   capturedAt: Date.now(),
   *   platform: 'claude'
   * };
   * await adapter.save(message);
   * ```
   */
  save(message: CapturedMessage): Promise<void>;

  /**
   * Retrieve a single message by its unique identifier
   *
   * @param id - The unique message identifier (UUID v4)
   * @returns A Promise that resolves to the CapturedMessage if found, or null if not found
   * @throws Implementations may throw errors for storage access failures
   *
   * @example
   * ```typescript
   * const message = await adapter.retrieve('uuid-1234');
   * if (message) {
   *   console.log(`Found message: ${message.content}`);
   * } else {
   *   console.log('Message not found');
   * }
   * ```
   */
  retrieve(id: string): Promise<CapturedMessage | null>;

  /**
   * Delete a single message by its unique identifier
   *
   * @param id - The unique message identifier (UUID v4)
   * @returns A Promise that resolves when the message has been successfully deleted
   * @throws Implementations may throw errors if message not found or storage failures occur
   *
   * @example
   * ```typescript
   * await adapter.delete('uuid-1234');
   * ```
   */
  delete(id: string): Promise<void>;

  /**
   * Retrieve all messages, optionally filtered by conversation ID
   *
   * @param conversationId - Optional. If provided, only returns messages from this conversation
   * @returns A Promise that resolves to an array of CapturedMessages matching the criteria
   *          Returns empty array if no messages found
   * @throws Implementations may throw errors for storage access failures
   *
   * @example
   * ```typescript
   * // Get all messages from all conversations
   * const allMessages = await adapter.retrieveAll();
   *
   * // Get all messages from a specific conversation
   * const convMessages = await adapter.retrieveAll('conv-5678');
   * ```
   */
  retrieveAll(conversationId?: string): Promise<CapturedMessage[]>;
}
