import * as fs from 'fs/promises';
import * as path from 'path';
import { CapturedMessage } from '../types/Message';
import { StorageAdapter } from './StorageAdapter';

/**
 * ObsidianAdapter - Stores captured messages in an Obsidian vault
 *
 * Converts captured chat messages to markdown format with YAML frontmatter
 * and organizes them by conversation in a local vault directory structure.
 * Files are organized in conversations/YYYY-MM/ folders with timestamps in filenames.
 */
export class ObsidianAdapter implements StorageAdapter {
  private vaultPath: string;
  private conversationsPath: string;
  private messageIndex: Map<string, string> = new Map(); // message id -> file path

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
    this.conversationsPath = path.join(vaultPath, 'conversations');
  }

  /**
   * Initialize the vault structure if it doesn't exist
   */
  async ensureDirectoryStructure(): Promise<void> {
    try {
      // Verify vault path exists
      await fs.stat(this.vaultPath);
    } catch (error) {
      throw new Error(`Vault path does not exist: ${this.vaultPath}`);
    }

    try {
      // Create conversations directory
      await fs.mkdir(this.conversationsPath, { recursive: true });

      // Create current month folder
      const monthFolder = path.join(
        this.conversationsPath,
        this.getCurrentMonthFolder()
      );
      await fs.mkdir(monthFolder, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create vault directory structure: ${String(error)}`
      );
    }
  }

  /**
   * Save a single message to the vault
   * Groups messages by conversationId, appends to existing conversation files
   */
  async save(message: CapturedMessage): Promise<void> {
    try {
      // Ensure directory structure exists
      await this.ensureDirectoryStructure();

      // Get the month folder for this message
      const monthFolder = path.join(
        this.conversationsPath,
        this.getCurrentMonthFolder()
      );

      // Generate filename based on first message timestamp
      const fileName = this.generateFileName(message.conversationId, message.timestamp);
      const filePath = path.join(monthFolder, fileName);

      // Check if conversation file already exists
      let existingContent = '';
      let existingMessages: CapturedMessage[] = [];

      try {
        existingContent = await fs.readFile(filePath, 'utf-8');
        // Parse existing messages to check for duplicates
        existingMessages = this.parseMarkdownFile(existingContent);
      } catch (err) {
        // File doesn't exist yet, which is fine
      }

      // Check if message already exists (idempotency)
      if (existingMessages.some((m) => m.id === message.id)) {
        console.log(
          `[ObsidianAdapter] Message ${message.id} already exists in vault, skipping`
        );
        return;
      }

      // Add new message to existing messages
      const allMessages = [...existingMessages, message];

      // Generate complete file content with frontmatter
      const fileContent = this.conversationToFile(
        message.conversationId,
        allMessages
      );

      // Write file atomically using temp file
      const tempPath = filePath + '.tmp';
      await fs.writeFile(tempPath, fileContent, 'utf-8');

      // Rename temp file to final location
      try {
        await fs.rename(tempPath, filePath);
      } catch (err) {
        // Fallback to direct write if rename fails
        await fs.writeFile(filePath, fileContent, 'utf-8');
      }

      // Store message location for quick retrieval
      this.messageIndex.set(message.id, filePath);

      console.log(`[ObsidianAdapter] Message ${message.id} saved to ${filePath}`);
    } catch (error) {
      console.error('[ObsidianAdapter] Error saving message:', error);
      throw error;
    }
  }

  /**
   * Retrieve a single message by ID
   */
  async retrieve(id: string): Promise<CapturedMessage | null> {
    try {
      // First check if we have it in index
      const cachedPath = this.messageIndex.get(id);
      if (cachedPath) {
        try {
          const content = await fs.readFile(cachedPath, 'utf-8');
          const messages = this.parseMarkdownFile(content);
          const message = messages.find((m) => m.id === id);
          if (message) return message;
        } catch (err) {
          // File may have been deleted, fall through to directory search
        }
      }

      // Search through all conversation files
      const monthFolder = path.join(
        this.conversationsPath,
        this.getCurrentMonthFolder()
      );

      try {
        const files = await fs.readdir(monthFolder);

        for (const file of files) {
          if (!file.endsWith('.md')) continue;

          const filePath = path.join(monthFolder, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const messages = this.parseMarkdownFile(content);
          const message = messages.find((m) => m.id === id);

          if (message) {
            this.messageIndex.set(id, filePath);
            return message;
          }
        }
      } catch (err) {
        // Directory may not exist yet
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
      const cachedPath = this.messageIndex.get(id);
      if (!cachedPath) {
        // Try to find the message first
        const message = await this.retrieve(id);
        if (!message) {
          throw new Error(`Message ${id} not found`);
        }
      }

      const filePath = this.messageIndex.get(id);
      if (!filePath) {
        throw new Error(`Message ${id} not found`);
      }

      // Read all messages from file
      const content = await fs.readFile(filePath, 'utf-8');
      let messages = this.parseMarkdownFile(content);

      // Remove the message
      messages = messages.filter((m) => m.id !== id);

      if (messages.length === 0) {
        // Delete the file if no messages left
        await fs.unlink(filePath);
        this.messageIndex.delete(id);
        console.log(`[ObsidianAdapter] Message ${id} deleted (conversation file removed)`);
      } else {
        // Update file with remaining messages
        const conversationId = messages[0].conversationId;
        const fileContent = this.conversationToFile(conversationId, messages);
        await fs.writeFile(filePath, fileContent, 'utf-8');
        this.messageIndex.delete(id);
        console.log(`[ObsidianAdapter] Message ${id} deleted from vault`);
      }
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
      const allMessages: CapturedMessage[] = [];
      const monthFolder = path.join(
        this.conversationsPath,
        this.getCurrentMonthFolder()
      );

      try {
        const files = await fs.readdir(monthFolder);

        for (const file of files) {
          if (!file.endsWith('.md')) continue;

          const filePath = path.join(monthFolder, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const messages = this.parseMarkdownFile(content);

          if (conversationId) {
            allMessages.push(
              ...messages.filter((m) => m.conversationId === conversationId)
            );
          } else {
            allMessages.push(...messages);
          }
        }
      } catch (err) {
        // Directory may not exist yet, return empty array
      }

      return allMessages;
    } catch (error) {
      console.error('[ObsidianAdapter] Error retrieving all messages:', error);
      throw error;
    }
  }

  /**
   * Convert a single message to markdown format
   * Format: ## {Role} — {ISO Timestamp}
   */
  private messageToMarkdown(message: CapturedMessage): string {
    const roleDisplay = message.role === 'user' ? 'User' : 'Assistant';
    const isoTimestamp = this.formatTimestamp(message.timestamp);
    return `## ${roleDisplay} — ${isoTimestamp}\n\n${message.content}`;
  }

  /**
   * Convert a complete conversation to markdown file with YAML frontmatter
   */
  private conversationToFile(
    conversationId: string,
    messages: CapturedMessage[]
  ): string {
    if (messages.length === 0) {
      throw new Error('Cannot create conversation file with no messages');
    }

    // Generate YAML frontmatter
    const frontmatter = this.generateFrontmatter(conversationId, messages);

    // Convert all messages to markdown
    const markdownContent = messages
      .map((msg) => this.messageToMarkdown(msg))
      .join('\n\n');

    // Combine frontmatter and content
    return `${frontmatter}\n\n${markdownContent}\n`;
  }

  /**
   * Parse markdown file back to CapturedMessage array
   * Extracts messages from markdown sections and YAML frontmatter
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

      // Generate message ID from content hash (for parsing purposes)
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
  private generateFrontmatter(
    conversationId: string,
    messages: CapturedMessage[]
  ): string {
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
   * Generate standardized filename for a conversation
   * Format: YYYY-MM-DD-HH-mm-ss-{conversationId}.md
   */
  private generateFileName(conversationId: string, timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}-${conversationId}.md`;
  }

  /**
   * Get current month folder name in YYYY-MM format
   */
  private getCurrentMonthFolder(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get month tag in MMM-YYYY format (e.g., "nov-2025")
   */
  private getMonthTag(timestamp: number): string {
    const date = new Date(timestamp);
    const monthNames = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${month}-${year}`;
  }

  /**
   * Format Unix timestamp to ISO 8601 string
   * Example: "2025-11-12 10:30:45 UTC"
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
   * Parse ISO 8601 timestamp string back to Unix milliseconds
   */
  private parseTimestamp(timeStr: string): number {
    // Handle format: "2025-11-12 10:30:45 UTC"
    const regex = /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/;
    const match = timeStr.match(regex);

    if (!match) {
      return Date.now();
    }

    const [, year, month, day, hours, minutes, seconds] = match;
    const date = new Date(
      Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      )
    );

    return date.getTime();
  }
}
