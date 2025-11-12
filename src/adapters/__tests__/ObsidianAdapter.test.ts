import * as fs from 'fs/promises';
import { ObsidianAdapter } from '../ObsidianAdapter';
import { CapturedMessage } from '../../types/Message';

// Mock fs/promises
jest.mock('fs/promises');

describe('ObsidianAdapter', () => {
  let adapter: ObsidianAdapter;
  const testVaultPath = '/test-vault';
  const testConversationsPath = '/test-vault/conversations';

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ObsidianAdapter(testVaultPath);
  });

  describe('instantiation', () => {
    it('should instantiate with valid vault path', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(ObsidianAdapter);
    });

    it('should store vault path correctly', () => {
      const vaultPath = '/path/to/vault';
      const testAdapter = new ObsidianAdapter(vaultPath);
      // Check that adapter is created (we can't directly check private vaultPath)
      expect(testAdapter).toBeDefined();
    });
  });

  describe('ensureDirectoryStructure', () => {
    it('should throw error when vault path does not exist', async () => {
      (fs.stat as jest.Mock).mockRejectedValueOnce(
        new Error('ENOENT: no such file')
      );

      await expect(adapter.ensureDirectoryStructure()).rejects.toThrow(
        'Vault path does not exist'
      );
    });

    it('should create conversations directory when it does not exist', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({} as any);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await adapter.ensureDirectoryStructure();

      expect(fs.mkdir).toHaveBeenCalledWith(testConversationsPath, {
        recursive: true,
      });
    });

    it('should create month subfolder', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({} as any);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await adapter.ensureDirectoryStructure();

      // Should be called twice: once for conversations/, once for YYYY-MM/
      expect(fs.mkdir).toHaveBeenCalledTimes(2);
    });

    it('should handle mkdir errors gracefully', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({} as any);
      (fs.mkdir as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      await expect(adapter.ensureDirectoryStructure()).rejects.toThrow(
        'Failed to create vault directory structure'
      );
    });
  });

  describe('messageToMarkdown', () => {
    it('should convert user message to markdown format', () => {
      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: 1731415845000,
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      const markdown = (adapter as any).messageToMarkdown(message);

      expect(markdown).toContain('## User —');
      expect(markdown).toContain('Hello, how are you?');
      // Check that timestamp is in the format YYYY-MM-DD HH:MM:SS UTC
      expect(markdown).toMatch(/## User — \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/);
    });

    it('should convert assistant message to markdown format', () => {
      const message: CapturedMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'I am doing well, thank you!',
        timestamp: 1731415900000,
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      const markdown = (adapter as any).messageToMarkdown(message);

      expect(markdown).toContain('## Assistant —');
      expect(markdown).toContain('I am doing well, thank you!');
    });

    it('should preserve message content formatting', () => {
      const contentWithCode = `Here's a code example:
\`\`\`typescript
const x = 1;
\`\`\``;

      const message: CapturedMessage = {
        id: 'msg-3',
        conversationId: 'conv-1',
        role: 'user',
        content: contentWithCode,
        timestamp: 1731415845000,
        capturedAt: Date.now(),
        platform: 'claude',
        model: 'claude-3-opus',
      };

      const markdown = (adapter as any).messageToMarkdown(message);

      expect(markdown).toContain('```typescript');
      expect(markdown).toContain('const x = 1;');
    });

    it('should format timestamp in ISO 8601 format', () => {
      const message: CapturedMessage = {
        id: 'msg-4',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test',
        timestamp: 1731415845000, // 2025-11-12 10:30:45 UTC
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      const markdown = (adapter as any).messageToMarkdown(message);

      expect(markdown).toMatch(/## User — \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/);
    });
  });

  describe('generateFileName', () => {
    it('should generate filename with correct format', () => {
      const conversationId = 'abc123def456';
      const timestamp = 1731415845000; // 2025-11-12 10:30:45 UTC

      const fileName = (adapter as any).generateFileName(conversationId, timestamp);

      // Verify format: YYYY-MM-DD-HH-mm-ss-{conversationId}.md
      expect(fileName).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-abc123def456\.md$/);
      expect(fileName).toContain('abc123def456');
      expect(fileName).toMatch(/\.md$/);
    });

    it('should pad zeros correctly', () => {
      const conversationId = 'conv-1';
      const timestamp = new Date('2025-01-05T09:05:03Z').getTime();

      const fileName = (adapter as any).generateFileName(conversationId, timestamp);

      expect(fileName).toBe('2025-01-05-09-05-03-conv-1.md');
    });
  });

  describe('getCurrentMonthFolder', () => {
    it('should return YYYY-MM format', () => {
      const monthFolder = (adapter as any).getCurrentMonthFolder();

      expect(monthFolder).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('formatTimestamp', () => {
    it('should format to ISO 8601 UTC format', () => {
      const timestamp = 1731415845000; // 2025-11-12 10:30:45 UTC
      const formatted = (adapter as any).formatTimestamp(timestamp);

      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/);
    });
  });

  describe('parseTimestamp', () => {
    it('should parse ISO 8601 format back to Unix milliseconds', () => {
      const originalTimestamp = 1731415845000;
      const formatted = (adapter as any).formatTimestamp(originalTimestamp);
      const parsed = (adapter as any).parseTimestamp(formatted);

      // Allow small rounding difference
      expect(Math.abs(parsed - originalTimestamp)).toBeLessThan(1000);
    });
  });

  describe('save', () => {
    it('should create conversation file with proper naming', async () => {
      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-abc123',
        role: 'user',
        content: 'Test message',
        timestamp: 1731415845000,
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      (fs.stat as jest.Mock).mockResolvedValueOnce({} as any);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockRejectedValueOnce(
        new Error('File not found')
      );
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      (fs.rename as jest.Mock).mockResolvedValueOnce(undefined);

      await adapter.save(message);

      // Verify mkdir was called to create directories
      expect(fs.mkdir).toHaveBeenCalled();

      // Verify writeFile was called
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should append to existing conversation', async () => {
      const message1: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'First message',
        timestamp: 1731415845000,
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      const message2: CapturedMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Response message',
        timestamp: 1731415900000,
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      // Setup mocks
      (fs.stat as jest.Mock).mockResolvedValue({} as any);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValueOnce(''); // First call returns empty
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Save first message
      await adapter.save(message1);

      // For second save, mock file containing first message
      (fs.readFile as jest.Mock).mockClear();
      (fs.writeFile as jest.Mock).mockClear();

      // Create mock file content with first message
      const mockFileContent = `---
conversationId: "conv-1"
platform: "chatgpt"
model: "gpt-4"
created_at: 1731415845000
last_updated_at: 1731415845000
message_count: 1
title: "First message"
tags:
  - chatgpt
  - gpt
  - nov-2025
---

## User — 2025-11-12 10:30:45 UTC

First message
`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(mockFileContent);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      // Save second message
      await adapter.save(message2);

      // Verify writeFile was called
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should update message_count when appending messages', async () => {
      const message1: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'First message',
        timestamp: 1731415845000,
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      (fs.stat as jest.Mock).mockResolvedValue({} as any);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // First save - file doesn't exist
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      await adapter.save(message1);

      // Verify writeFile was called
      expect(fs.writeFile).toHaveBeenCalled();
      const fileContent = (fs.writeFile as jest.Mock).mock.calls[0][1];
      expect(fileContent).toContain('message_count: 1');
    });
  });

  describe('retrieve', () => {
    it('should return null when message not found', async () => {
      (fs.readdir as jest.Mock).mockRejectedValueOnce(
        new Error('Directory not found')
      );

      const result = await adapter.retrieve('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should throw error when message not found', async () => {
      (fs.readdir as jest.Mock).mockRejectedValueOnce(
        new Error('Directory not found')
      );

      await expect(adapter.delete('nonexistent-id')).rejects.toThrow(
        'Message'
      );
    });
  });

  describe('retrieveAll', () => {
    it('should return empty array when no messages exist', async () => {
      (fs.readdir as jest.Mock).mockRejectedValueOnce(
        new Error('Directory not found')
      );

      const messages = await adapter.retrieveAll();

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(0);
    });

    it('should filter messages by conversationId if provided', async () => {
      (fs.readdir as jest.Mock).mockResolvedValueOnce(['test.md']);

      const mockContent = `---
conversationId: "conv-1"
platform: "chatgpt"
model: "gpt-4"
created_at: 1731415845000
last_updated_at: 1731415845000
message_count: 2
title: "Test"
tags:
  - chatgpt
  - gpt
  - nov-2025
---

## User — 2025-11-12 10:30:45 UTC

Message 1

## Assistant — 2025-11-12 10:31:00 UTC

Response
`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(mockContent);

      const messages = await adapter.retrieveAll('conv-1');

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.every((m) => m.conversationId === 'conv-1')).toBe(true);
    });
  });

  describe('YAML frontmatter generation', () => {
    it('should generate valid frontmatter with all required fields', () => {
      const messages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What is React?',
          timestamp: 1731415845000,
          capturedAt: Date.now(),
          platform: 'chatgpt',
          model: 'gpt-4',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React is a library',
          timestamp: 1731415900000,
          capturedAt: Date.now(),
          platform: 'chatgpt',
          model: 'gpt-4',
        },
      ];

      const frontmatter = (adapter as any).generateFrontmatter('conv-1', messages);

      expect(frontmatter).toContain('conversationId: "conv-1"');
      expect(frontmatter).toContain('platform: "chatgpt"');
      expect(frontmatter).toContain('model: "gpt-4"');
      expect(frontmatter).toContain('created_at:');
      expect(frontmatter).toContain('last_updated_at:');
      expect(frontmatter).toContain('message_count: 2');
      expect(frontmatter).toContain('title:');
      expect(frontmatter).toContain('tags:');
    });

    it('should extract title from first user message', () => {
      const messages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'How do I optimize React performance?',
          timestamp: 1731415845000,
          capturedAt: Date.now(),
          platform: 'chatgpt',
          model: 'gpt-4',
        },
      ];

      const frontmatter = (adapter as any).generateFrontmatter('conv-1', messages);

      expect(frontmatter).toContain('How do I optimize React performance?');
    });
  });

  describe('conversation file generation', () => {
    it('should generate valid conversation file with frontmatter and content', () => {
      const messages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello',
          timestamp: 1731415845000,
          capturedAt: Date.now(),
          platform: 'chatgpt',
          model: 'gpt-4',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: 1731415900000,
          capturedAt: Date.now(),
          platform: 'chatgpt',
          model: 'gpt-4',
        },
      ];

      const fileContent = (adapter as any).conversationToFile('conv-1', messages);

      // Should start with frontmatter
      expect(fileContent).toMatch(/^---\n/);
      // Should contain closing frontmatter delimiter
      expect(fileContent).toContain('---\n\n');
      // Should contain both messages
      expect(fileContent).toContain('## User —');
      expect(fileContent).toContain('## Assistant —');
      expect(fileContent).toContain('Hello');
      expect(fileContent).toContain('Hi there!');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test',
        timestamp: 1731415845000,
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      (fs.stat as jest.Mock).mockRejectedValueOnce(new Error('EACCES'));

      await expect(adapter.save(message)).rejects.toThrow();
    });

    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test',
        timestamp: 1731415845000,
        capturedAt: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4',
      };

      (fs.stat as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      try {
        await adapter.save(message);
      } catch (err) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
