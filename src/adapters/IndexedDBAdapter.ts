import { CapturedMessage } from '../types/Message';
import { StorageAdapter } from './StorageAdapter';

/**
 * IndexedDB-based storage adapter for storing conversations
 *
 * Used as fallback when Chrome File System Access API is not available.
 * Stores conversations as JSON in IndexedDB for persistence across sessions.
 */
export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'ExternalMemoryDB';
  private readonly storeName = 'conversations';
  private readonly dbVersion = 1;

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[IndexedDBAdapter] Error opening database:', request.error);
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDBAdapter] Database initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create conversations object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'conversationId' });
          // Create index on timestamp for sorting
          store.createIndex('timestamp', 'lastUpdated', { unique: false });
          console.log('[IndexedDBAdapter] Created object store and indexes');
        }
      };
    });
  }

  /**
   * Save a message to IndexedDB
   */
  async save(message: CapturedMessage): Promise<void> {
    try {
      const db = await this.initDB();

      // Get or create conversation record
      const conversation = await this.getConversationRecord(message.conversationId);

      // Add message to conversation
      if (!conversation.messages) {
        conversation.messages = [];
      }

      // Check for duplicates (idempotency)
      if (conversation.messages.some((m) => m.id === message.id)) {
        console.log(
          `[IndexedDBAdapter] Message ${message.id} already exists, skipping`
        );
        return;
      }

      conversation.messages.push(message);
      conversation.lastUpdated = Date.now();
      conversation.messageCount = conversation.messages.length;

      // Store in IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(conversation);

        request.onerror = () => {
          console.error('[IndexedDBAdapter] Error saving to database:', request.error);
          reject(new Error(`Failed to save message: ${request.error}`));
        };

        request.onsuccess = () => {
          console.log(
            `[IndexedDBAdapter] Message ${message.id} saved to ${message.conversationId}`
          );
          resolve();
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] Error in save:', error);
      throw error;
    }
  }

  /**
   * Retrieve a message by ID
   */
  async retrieve(id: string): Promise<CapturedMessage | null> {
    try {
      const allConversations = await this.getAllConversations();

      // Search through all conversations for the message
      for (const conversation of allConversations) {
        if (conversation.messages) {
          const message = conversation.messages.find((m) => m.id === id);
          if (message) {
            return message;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('[IndexedDBAdapter] Error retrieving message:', error);
      throw error;
    }
  }

  /**
   * Delete a message from IndexedDB
   */
  async delete(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      const allConversations = await this.getAllConversations();

      // Find the message and remove it
      for (const conversation of allConversations) {
        if (conversation.messages) {
          const messageIndex = conversation.messages.findIndex((m) => m.id === id);
          if (messageIndex !== -1) {
            conversation.messages.splice(messageIndex, 1);
            conversation.messageCount = conversation.messages.length;
            conversation.lastUpdated = Date.now();

            // Update or delete the conversation
            return new Promise((resolve, reject) => {
              const transaction = db.transaction([this.storeName], 'readwrite');
              const store = transaction.objectStore(this.storeName);

              let request;
              if (conversation.messages.length === 0) {
                // Delete the entire conversation if no messages left
                request = store.delete(conversation.conversationId);
                console.log(
                  `[IndexedDBAdapter] Message ${id} deleted (conversation removed)`
                );
              } else {
                // Update the conversation with remaining messages
                request = store.put(conversation);
                console.log(`[IndexedDBAdapter] Message ${id} deleted`);
              }

              request.onerror = () => {
                console.error('[IndexedDBAdapter] Error deleting from database:', request.error);
                reject(new Error(`Failed to delete message: ${request.error}`));
              };

              request.onsuccess = () => {
                resolve();
              };
            });
          }
        }
      }

      throw new Error(`Message ${id} not found`);
    } catch (error) {
      console.error('[IndexedDBAdapter] Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Retrieve all messages, optionally filtered by conversation ID
   */
  async retrieveAll(conversationId?: string): Promise<CapturedMessage[]> {
    try {
      const allConversations = await this.getAllConversations();
      const allMessages: CapturedMessage[] = [];

      for (const conversation of allConversations) {
        if (conversation.messages) {
          if (conversationId) {
            allMessages.push(
              ...conversation.messages.filter((m) => m.conversationId === conversationId)
            );
          } else {
            allMessages.push(...conversation.messages);
          }
        }
      }

      return allMessages;
    } catch (error) {
      console.error('[IndexedDBAdapter] Error retrieving all messages:', error);
      throw error;
    }
  }

  /**
   * Get a conversation record by ID
   */
  private async getConversationRecord(
    conversationId: string
  ): Promise<ConversationRecord> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(conversationId);

      request.onerror = () => {
        reject(new Error(`Failed to get conversation: ${request.error}`));
      };

      request.onsuccess = () => {
        const conversation = request.result as ConversationRecord | undefined;
        if (conversation) {
          resolve(conversation);
        } else {
          // Create new conversation record
          resolve({
            conversationId,
            messages: [],
            platform: 'chatgpt',
            model: 'unknown',
            createdAt: Date.now(),
            lastUpdated: Date.now(),
            messageCount: 0,
          });
        }
      };
    });
  }

  /**
   * Get all conversations from the database
   */
  private async getAllConversations(): Promise<ConversationRecord[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get all conversations: ${request.error}`));
      };

      request.onsuccess = () => {
        const conversations = request.result as ConversationRecord[];
        resolve(conversations);
      };
    });
  }

  /**
   * Serialize conversations to markdown format for export
   */
  async serializeToMarkdown(): Promise<string> {
    try {
      const allConversations = await this.getAllConversations();
      let markdown = '# External Memory - Conversations Export\n\n';
      markdown += `Exported at: ${new Date().toISOString()}\n`;
      markdown += `Total conversations: ${allConversations.length}\n\n`;

      for (const conversation of allConversations) {
        if (conversation.messages && conversation.messages.length > 0) {
          markdown += `## ${conversation.conversationId}\n\n`;
          markdown += `- Platform: ${conversation.platform}\n`;
          markdown += `- Model: ${conversation.model}\n`;
          markdown += `- Messages: ${conversation.messageCount}\n`;
          markdown += `- Created: ${new Date(conversation.createdAt).toISOString()}\n\n`;

          for (const message of conversation.messages) {
            const roleDisplay = message.role === 'user' ? 'User' : 'Assistant';
            const isoTimestamp = this.formatTimestamp(message.timestamp);
            markdown += `### ${roleDisplay} — ${isoTimestamp}\n\n`;
            markdown += `${message.content}\n\n`;
          }

          markdown += '---\n\n';
        }
      }

      return markdown;
    } catch (error) {
      console.error('[IndexedDBAdapter] Error serializing to markdown:', error);
      throw error;
    }
  }

  /**
   * Clear all data from the database
   */
  async clear(): Promise<void> {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => {
          reject(new Error(`Failed to clear database: ${request.error}`));
        };

        request.onsuccess = () => {
          console.log('[IndexedDBAdapter] Database cleared');
          resolve();
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] Error clearing database:', error);
      throw error;
    }
  }

  /**
   * Format Unix timestamp to ISO 8601
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  }
}

/**
 * Internal interface for IndexedDB conversation records
 */
interface ConversationRecord {
  conversationId: string;
  messages: CapturedMessage[];
  platform: string;
  model: string;
  createdAt: number;
  lastUpdated: number;
  messageCount: number;
}
