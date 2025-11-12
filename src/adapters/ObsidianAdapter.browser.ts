import { CapturedMessage } from '../types/Message';
import { StorageAdapter } from './StorageAdapter';
import {
  FileSystemDirectoryHandle,
  FileSystemFileHandle,
  isHandleValid,
} from '../types/FileSystemHandle';

/**
 * ObsidianAdapter (Browser-Compatible Version)
 *
 * Stores captured messages in an Obsidian vault directory using
 * Chrome File System Access API. Works with user-selected directory.
 * Converts messages to markdown format with YAML frontmatter.
 */
export class ObsidianAdapter implements StorageAdapter {
  private directoryHandle: FileSystemDirectoryHandle;
  private messageIndex: Map<string, { handle: FileSystemFileHandle; content: string }> = new Map();

  /**
   * Create an ObsidianAdapter with a FileSystemDirectoryHandle
   * @param directoryHandle - Handle to the Obsidian vault directory
   */
  constructor(directoryHandle: FileSystemDirectoryHandle) {
    this.directoryHandle = directoryHandle;
  }

  /**
   * Verify the directory handle is still valid
   */
  private async ensureHandleValid(): Promise<void> {
    const valid = await isHandleValid(this.directoryHandle, 'readwrite');
    if (!valid) {
      throw new Error('Vault directory handle is no longer valid. Please re-select the vault directory.');
    }
  }

  /**
   * Ensure the vault directory structure exists
   */
  private async ensureDirectoryStructure(): Promise<void> {
    try {
      await this.ensureHandleValid();

      // Get or create conversations directory
      const conversationsHandle = await this.directoryHandle.getDirectoryHandle('conversations', {
        create: true,
      });

      // Get or create current month directory
      const monthFolder = this.getCurrentMonthFolder();
      await conversationsHandle.getDirectoryHandle(monthFolder, { create: true });

      console.log('[ObsidianAdapter] Vault structure verified');
    } catch (error) {
      console.error('[ObsidianAdapter] Error ensuring directory structure:', error);
      throw error;
    }
  }

  /**
   * Save a message to the vault
   * All messages in the same conversation are stored in the SAME file
   */
  async save(message: CapturedMessage): Promise<void> {
    try {
      await this.ensureDirectoryStructure();

      // Get conversations directory
      const conversationsHandle = await this.directoryHandle.getDirectoryHandle('conversations');
      const monthFolder = this.getCurrentMonthFolder();
      const monthHandle = await conversationsHandle.getDirectoryHandle(monthFolder);

      // Use conversation ID as filename (not message timestamp)
      // This ensures all messages in the same conversation go to the same file
      const fileName = `${message.conversationId}.md`;
      let fileHandle = await monthHandle.getFileHandle(fileName, { create: true });

      // Read existing file if it exists
      let existingMessages: CapturedMessage[] = [];
      try {
        const file = await fileHandle.getFile();
        const content = await file.text();

        // Only parse if file has content (avoid "no frontmatter" warning for empty files)
        if (content.trim().length > 0) {
          existingMessages = this.parseMarkdownFile(content);
        }
      } catch (err) {
        // File is empty or doesn't exist yet, which is fine
        console.log(`[ObsidianAdapter] Starting new conversation file for ${message.conversationId}`);
      }

      // Check for duplicates (idempotency)
      if (existingMessages.some((m) => m.id === message.id)) {
        console.log(`[ObsidianAdapter] Message ${message.id} already exists in vault, skipping`);
        return;
      }

      // Add new message
      existingMessages.push(message);

      // Generate file content (all messages in this conversation)
      const fileContent = this.conversationToFile(message.conversationId, existingMessages);

      // Write to file
      const writable = await fileHandle.createWritable({ keepExistingData: false });
      await writable.write(fileContent);
      await writable.close();

      this.messageIndex.set(message.id, {
        handle: fileHandle,
        content: fileContent,
      });

      console.log(
        `[ObsidianAdapter] Message ${message.id} saved to conversation file: ${fileName}`
      );
    } catch (error) {
      console.error('[ObsidianAdapter] Error saving message:', error);
      throw error;
    }
  }

  /**
   * Retrieve a message by ID
   */
  async retrieve(id: string): Promise<CapturedMessage | null> {
    try {
      await this.ensureHandleValid();

      // Get conversations directory
      const conversationsHandle = await this.directoryHandle.getDirectoryHandle('conversations');
      const monthFolder = this.getCurrentMonthFolder();
      const monthHandle = await conversationsHandle.getDirectoryHandle(monthFolder);

      // Iterate through files in month folder
      for await (const [, handle] of monthHandle.entries()) {
        if (handle.kind === 'file' && handle.name.endsWith('.md')) {
          const file = await (handle as FileSystemFileHandle).getFile();
          const content = await file.text();
          const messages = this.parseMarkdownFile(content);

          const message = messages.find((m) => m.id === id);
          if (message) {
            return message;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('[ObsidianAdapter] Error retrieving message:', error);
      throw error;
    }
  }

  /**
   * Delete a message from the vault
   */
  async delete(id: string): Promise<void> {
    try {
      await this.ensureHandleValid();

      // Get conversations directory
      const conversationsHandle = await this.directoryHandle.getDirectoryHandle('conversations');
      const monthFolder = this.getCurrentMonthFolder();
      const monthHandle = await conversationsHandle.getDirectoryHandle(monthFolder);

      // Find and update the file containing this message
      for await (const [fileName, handle] of monthHandle.entries()) {
        if (handle.kind === 'file' && handle.name.endsWith('.md')) {
          const file = await (handle as FileSystemFileHandle).getFile();
          const content = await file.text();
          let messages = this.parseMarkdownFile(content);

          // Check if this file contains the message
          if (messages.find((m) => m.id === id)) {
            // Remove the message
            messages = messages.filter((m) => m.id !== id);

            if (messages.length === 0) {
              // Delete the file if no messages left
              await monthHandle.removeEntry(fileName);
              console.log(`[ObsidianAdapter] Message ${id} deleted (file removed)`);
            } else {
              // Update the file with remaining messages
              const conversationId = messages[0].conversationId;
              const newContent = this.conversationToFile(conversationId, messages);
              const writable = await (handle as FileSystemFileHandle).createWritable({ keepExistingData: false });
              await writable.write(newContent);
              await writable.close();
              console.log(`[ObsidianAdapter] Message ${id} deleted from vault`);
            }

            this.messageIndex.delete(id);
            return;
          }
        }
      }

      throw new Error(`Message ${id} not found`);
    } catch (error) {
      console.error('[ObsidianAdapter] Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Retrieve all messages, optionally filtered by conversation ID
   */
  async retrieveAll(conversationId?: string): Promise<CapturedMessage[]> {
    try {
      await this.ensureHandleValid();

      const allMessages: CapturedMessage[] = [];

      // Get conversations directory
      const conversationsHandle = await this.directoryHandle.getDirectoryHandle('conversations');
      const monthFolder = this.getCurrentMonthFolder();
      const monthHandle = await conversationsHandle.getDirectoryHandle(monthFolder);

      // Iterate through all markdown files
      for await (const [, handle] of monthHandle.entries()) {
        if (handle.kind === 'file' && handle.name.endsWith('.md')) {
          const file = await (handle as FileSystemFileHandle).getFile();
          const content = await file.text();
          const messages = this.parseMarkdownFile(content);

          if (conversationId) {
            allMessages.push(...messages.filter((m) => m.conversationId === conversationId));
          } else {
            allMessages.push(...messages);
          }
        }
      }

      return allMessages;
    } catch (error) {
      console.error('[ObsidianAdapter] Error retrieving all messages:', error);
      throw error;
    }
  }

  /**
   * Convert a single message to markdown format
   */
  private messageToMarkdown(message: CapturedMessage): string {
    const roleDisplay = message.role === 'user' ? 'User' : 'Assistant';
    const isoTimestamp = this.formatTimestamp(message.timestamp);
    return `## ${roleDisplay} — ${isoTimestamp}\n\n${message.content}`;
  }

  /**
   * Convert a complete conversation to markdown file with YAML frontmatter
   */
  private conversationToFile(conversationId: string, messages: CapturedMessage[]): string {
    if (messages.length === 0) {
      throw new Error('Cannot create conversation file with no messages');
    }

    const frontmatter = this.generateFrontmatter(conversationId, messages);
    const markdownContent = messages.map((msg) => this.messageToMarkdown(msg)).join('\n\n');

    return `${frontmatter}\n\n${markdownContent}\n`;
  }

  /**
   * Parse markdown file back to CapturedMessage array
   */
  private parseMarkdownFile(content: string): CapturedMessage[] {
    const messages: CapturedMessage[] = [];

    // Split frontmatter from content
    const parts = content.split('---');
    if (parts.length < 3) {
      console.warn('[ObsidianAdapter] Invalid markdown format, no frontmatter found');
      return messages;
    }

    const frontmatterStr = parts[1];
    const markdownContent = parts.slice(2).join('---').trim();

    // Parse frontmatter
    let conversationId = '';
    let platform: 'chatgpt' | 'claude' = 'chatgpt';
    let model = '';

    const lines = frontmatterStr.split('\n');
    for (const line of lines) {
      if (line.startsWith('conversationId:')) {
        conversationId = line.split(':')[1].trim().replace(/"/g, '');
      }
      if (line.startsWith('platform:')) {
        const p = line.split(':')[1].trim().replace(/"/g, '');
        if (p === 'chatgpt' || p === 'claude') {
          platform = p;
        }
      }
      if (line.startsWith('model:')) {
        model = line.split(':')[1].trim().replace(/"/g, '');
      }
    }

    // Parse messages from markdown
    const messageRegex = /## (User|Assistant) — ([^\n]+)\n\n([\s\S]*?)(?=## (?:User|Assistant)|$)/g;
    let match;

    while ((match = messageRegex.exec(markdownContent)) !== null) {
      const role = match[1].toLowerCase() as 'user' | 'assistant';
      const timestamp = this.parseTimestamp(match[2]);
      const content = match[3].trim();

      // Generate message ID from content hash
      const messageId = `msg-${Math.random().toString(36).substr(2, 9)}`;

      messages.push({
        id: messageId,
        conversationId,
        role,
        content,
        timestamp,
        capturedAt: Date.now(),
        platform,
        model,
      });
    }

    return messages;
  }

  /**
   * Generate YAML frontmatter for a conversation
   */
  private generateFrontmatter(conversationId: string, messages: CapturedMessage[]): string {
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    // Extract title from first user message
    let title = 'Conversation';
    const firstUserMsg = messages.find((m) => m.role === 'user');
    if (firstUserMsg) {
      title = firstUserMsg.content.substring(0, 100).replace(/\n/g, ' ');
    }

    // Generate tags
    const tags = [
      firstMessage.platform,
      firstMessage.model ? firstMessage.model.split('-')[0] : 'unknown',
      this.getMonthTag(firstMessage.timestamp),
    ];

    const tagStr = tags.map((tag) => `  - ${tag}`).join('\n');

    return `---
conversationId: "${conversationId}"
platform: "${firstMessage.platform}"
model: "${firstMessage.model || 'unknown'}"
created_at: ${firstMessage.timestamp}
last_updated_at: ${lastMessage.timestamp}
message_count: ${messages.length}
title: "${title}"
tags:
${tagStr}
---`;
  }

  /**
   * Get current month folder name
   */
  private getCurrentMonthFolder(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get month tag
   */
  private getMonthTag(timestamp: number): string {
    const date = new Date(timestamp);
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${month}-${year}`;
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

  /**
   * Parse ISO 8601 timestamp to Unix milliseconds
   */
  private parseTimestamp(timeStr: string): number {
    const regex = /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/;
    const match = timeStr.match(regex);

    if (!match) {
      return Date.now();
    }

    const [, year, month, day, hours, minutes, seconds] = match;
    const date = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds))
    );

    return date.getTime();
  }
}
