import { StorageService } from '../StorageService';
import { StorageAdapter } from '../../adapters/StorageAdapter';
import { CapturedMessage } from '../../types/Message';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockAdapter: jest.Mocked<StorageAdapter>;

  beforeEach(() => {
    mockAdapter = {
      save: jest.fn().mockResolvedValue(undefined),
      retrieve: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
      retrieveAll: jest.fn().mockResolvedValue([]),
    };
    storageService = new StorageService(mockAdapter);
  });

  describe('saveMessage', () => {
    it('should save a single message via adapter', async () => {
      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test message',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await storageService.saveMessage(message);

      expect(mockAdapter.save).toHaveBeenCalledWith(message);
      expect(mockAdapter.save).toHaveBeenCalledTimes(1);
    });

    it('should log successful message save', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await storageService.saveMessage(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[External Memory] Message saved: msg-1')
      );
      consoleSpy.mockRestore();
    });

    it('should throw error when adapter fails', async () => {
      const error = new Error('Storage failed');
      mockAdapter.save.mockRejectedValueOnce(error);

      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      await expect(storageService.saveMessage(message)).rejects.toThrow('Storage failed');
    });

    it('should log error when adapter fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Adapter error');
      mockAdapter.save.mockRejectedValueOnce(error);

      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      try {
        await storageService.saveMessage(message);
      } catch (_) {
        // Expected error
      }

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[External Memory] Error saving message msg-1'),
        error
      );
      errorSpy.mockRestore();
    });
  });

  describe('saveMessages', () => {
    it('should save multiple messages', async () => {
      const messages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Test 1',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Test 2',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
      ];

      await storageService.saveMessages(messages);

      expect(mockAdapter.save).toHaveBeenCalledTimes(2);
      expect(mockAdapter.save).toHaveBeenNthCalledWith(1, messages[0]);
      expect(mockAdapter.save).toHaveBeenNthCalledWith(2, messages[1]);
    });

    it('should handle empty message array', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await storageService.saveMessages([]);

      expect(mockAdapter.save).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[External Memory] No messages to save');
      consoleSpy.mockRestore();
    });

    it('should log number of messages being saved', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const messages: CapturedMessage[] = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: 'conv-1',
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      await storageService.saveMessages(messages);

      expect(consoleSpy).toHaveBeenCalledWith('[External Memory] Saving 5 message(s) to storage...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[External Memory] Successfully saved 5 message(s)'
      );
      consoleSpy.mockRestore();
    });

    it('should save messages sequentially', async () => {
      const callOrder: string[] = [];
      mockAdapter.save.mockImplementation((msg) => {
        callOrder.push(msg.id);
        return Promise.resolve();
      });

      const messages: CapturedMessage[] = Array.from({ length: 3 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: 'conv-1',
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt' as const,
      }));

      await storageService.saveMessages(messages);

      expect(callOrder).toEqual(['msg-0', 'msg-1', 'msg-2']);
    });

    it('should throw error if any message save fails', async () => {
      mockAdapter.save.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Failed'));

      const messages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Test 1',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Test 2',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
      ];

      await expect(storageService.saveMessages(messages)).rejects.toThrow('Failed');
    });
  });

  describe('retrieveMessage', () => {
    it('should retrieve a message by ID', async () => {
      const message: CapturedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        platform: 'chatgpt',
      };

      mockAdapter.retrieve.mockResolvedValueOnce(message);

      const result = await storageService.retrieveMessage('msg-1');

      expect(mockAdapter.retrieve).toHaveBeenCalledWith('msg-1');
      expect(result).toEqual(message);
    });

    it('should return null when message not found', async () => {
      mockAdapter.retrieve.mockResolvedValueOnce(null);

      const result = await storageService.retrieveMessage('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error when retrieval fails', async () => {
      mockAdapter.retrieve.mockRejectedValueOnce(new Error('Retrieval failed'));

      await expect(storageService.retrieveMessage('msg-1')).rejects.toThrow('Retrieval failed');
    });
  });

  describe('retrieveMessages', () => {
    it('should retrieve all messages', async () => {
      const messages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Test 1',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
      ];

      mockAdapter.retrieveAll.mockResolvedValueOnce(messages);

      const result = await storageService.retrieveMessages();

      expect(mockAdapter.retrieveAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(messages);
    });

    it('should retrieve messages filtered by conversation ID', async () => {
      const messages: CapturedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
      ];

      mockAdapter.retrieveAll.mockResolvedValueOnce(messages);

      const result = await storageService.retrieveMessages('conv-1');

      expect(mockAdapter.retrieveAll).toHaveBeenCalledWith('conv-1');
      expect(result).toEqual(messages);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message by ID', async () => {
      await storageService.deleteMessage('msg-1');

      expect(mockAdapter.delete).toHaveBeenCalledWith('msg-1');
    });

    it('should log successful message deletion', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await storageService.deleteMessage('msg-1');

      expect(consoleSpy).toHaveBeenCalledWith('[External Memory] Message deleted: msg-1');
      consoleSpy.mockRestore();
    });

    it('should throw error when deletion fails', async () => {
      mockAdapter.delete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(storageService.deleteMessage('msg-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle saving messages with different platforms', async () => {
      const messages: CapturedMessage[] = [
        {
          id: 'msg-chatgpt',
          conversationId: 'conv-1',
          role: 'user',
          content: 'ChatGPT message',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'chatgpt',
        },
        {
          id: 'msg-claude',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Claude message',
          timestamp: Date.now(),
          capturedAt: Date.now(),
          platform: 'claude',
        },
      ];

      await storageService.saveMessages(messages);

      expect(mockAdapter.save).toHaveBeenCalledTimes(2);
    });

    it('should handle messages with optional fields', async () => {
      const message: CapturedMessage = {
        id: 'msg-with-optional',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Response',
        rawHtml: '<p>Response</p>',
        timestamp: Date.now(),
        capturedAt: Date.now(),
        messageIndex: 2,
        model: 'gpt-4',
        platform: 'chatgpt',
      };

      await storageService.saveMessage(message);

      expect(mockAdapter.save).toHaveBeenCalledWith(message);
    });
  });
});
