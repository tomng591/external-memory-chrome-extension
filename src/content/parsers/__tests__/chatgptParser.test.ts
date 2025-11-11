import { parseMessages, getParserDebugInfo } from '../chatgptParser';

describe('ChatGPT Parser', () => {
  // Setup and teardown
  beforeEach(() => {
    // Clear the DOM before each test
    document.body.innerHTML = '';
    // Reset location to a known state
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/c/test-conversation-id-12345',
        href: 'https://chatgpt.com/c/test-conversation-id-12345',
      },
      writable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('parseMessages()', () => {
    it('should return empty array when no messages are present', () => {
      document.body.innerHTML = '<div>No messages</div>';
      const messages = parseMessages();

      expect(messages).toEqual([]);
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should parse a single user message from ChatGPT DOM', () => {
      // Mock ChatGPT DOM structure with a user message
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose">
              <span>Hello, ChatGPT!</span>
            </div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello, ChatGPT!',
        platform: 'chatgpt',
        conversationId: 'test-conversation-id-12345',
      });
    });

    it('should parse a single assistant message from ChatGPT DOM', () => {
      const messageHTML = `
        <div class="group">
          <div class="dark:bg-gray-800" data-message-role="assistant">
            <div class="prose">
              <span>Hello! I'm ChatGPT. How can I help?</span>
            </div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        role: 'assistant',
        content: 'Hello! I\'m ChatGPT. How can I help?',
        platform: 'chatgpt',
      });
    });

    it('should parse multiple messages in sequence', () => {
      const messageHTML = `
        <div class="message-group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>What is 2+2?</span></div>
          </div>
        </div>
        <div class="message-group">
          <div class="dark:bg-gray-800" data-message-role="assistant">
            <div class="prose"><span>2+2 equals 4</span></div>
          </div>
        </div>
        <div class="message-group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Thank you!</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toContain('What is 2+2?');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toContain('2+2 equals 4');
      expect(messages[2].role).toBe('user');
      expect(messages[2].content).toContain('Thank you!');
    });

    it('should correctly assign message indices', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Message 1</span></div>
          </div>
        </div>
        <div class="group">
          <div class="dark:bg-gray-800" data-message-role="assistant">
            <div class="prose"><span>Message 2</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].messageIndex).toBe(1);
      expect(messages[1].messageIndex).toBe(2);
    });

    it('should handle malformed DOM elements gracefully', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Good message</span></div>
          </div>
        </div>
        <div class="group malformed">
          <!-- Empty message that will be skipped -->
        </div>
        <div class="group">
          <div class="dark:bg-gray-800" data-message-role="assistant">
            <div class="prose"><span>Another good message</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      // Should still parse the valid messages and skip empty ones
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(m => m.content.includes('Good message'))).toBe(true);
    });

    it('should extract conversation ID from URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/c/abc-def-ghi-123',
          href: 'https://chatgpt.com/c/abc-def-ghi-123',
        },
        writable: true,
      });

      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Test</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].conversationId).toBe('abc-def-ghi-123');
    });

    it('should use "unknown" as conversationId if URL pattern does not match', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/share/some-share-id',
          href: 'https://chatgpt.com/share/some-share-id',
        },
        writable: true,
      });

      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Test</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].conversationId).toBe('unknown');
    });

    it('should assign unique IDs to each message', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Message 1</span></div>
          </div>
        </div>
        <div class="group">
          <div class="dark:bg-gray-800" data-message-role="assistant">
            <div class="prose"><span>Message 2</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].id).toBeDefined();
      expect(messages[1].id).toBeDefined();
      expect(messages[0].id).not.toBe(messages[1].id);
    });

    it('should set platform to "chatgpt" for all messages', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Test</span></div>
          </div>
        </div>
        <div class="group">
          <div class="dark:bg-gray-800" data-message-role="assistant">
            <div class="prose"><span>Test</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      messages.forEach(msg => {
        expect(msg.platform).toBe('chatgpt');
      });
    });

    it('should set capturedAt timestamp to current time', () => {
      const beforeParsing = Date.now();
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Test</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();
      const afterParsing = Date.now();

      expect(messages[0].capturedAt).toBeGreaterThanOrEqual(beforeParsing);
      expect(messages[0].capturedAt).toBeLessThanOrEqual(afterParsing);
    });

    it('should conform to CapturedMessage interface', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Test message</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      // Check all required fields are present
      expect(messages[0]).toHaveProperty('id');
      expect(messages[0]).toHaveProperty('conversationId');
      expect(messages[0]).toHaveProperty('role');
      expect(messages[0]).toHaveProperty('content');
      expect(messages[0]).toHaveProperty('timestamp');
      expect(messages[0]).toHaveProperty('capturedAt');
      expect(messages[0]).toHaveProperty('platform');

      // Check types
      expect(typeof messages[0].id).toBe('string');
      expect(typeof messages[0].conversationId).toBe('string');
      expect(messages[0].role).toMatch(/user|assistant/);
      expect(typeof messages[0].content).toBe('string');
      expect(typeof messages[0].timestamp).toBe('number');
      expect(typeof messages[0].capturedAt).toBe('number');
      expect(messages[0].platform).toBe('chatgpt');
    });

    it('should handle messages with complex HTML content', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose">
              <p>This is <strong>bold</strong> text</p>
              <code>const x = 5;</code>
            </div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBeTruthy();
      expect(messages[0].content.length).toBeGreaterThan(0);
    });

    it('should skip messages with no content', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span></span></div>
          </div>
        </div>
        <div class="group">
          <div class="dark:bg-gray-800" data-message-role="assistant">
            <div class="prose"><span>Real message</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
    });

    it('should parse 5+ messages without errors', () => {
      let messageHTML = '';
      for (let i = 0; i < 5; i++) {
        const role = i % 2 === 0 ? 'user' : 'assistant';
        const bgClass = role === 'user' ? 'bg-gray-50' : 'dark:bg-gray-800';
        messageHTML += `
          <div class="group">
            <div class="${bgClass}" data-message-role="${role}">
              <div class="prose"><span>Message ${i + 1}</span></div>
            </div>
          </div>
        `;
      }
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(5);
      messages.forEach((msg, index) => {
        expect(msg.content).toContain(`Message ${index + 1}`);
      });
    });
  });

  describe('getParserDebugInfo()', () => {
    it('should return debug information string', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Hello</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const debugInfo = getParserDebugInfo();

      expect(typeof debugInfo).toBe('string');
      expect(debugInfo).toContain('ChatGPT Parser Debug Info');
      expect(debugInfo).toContain('test-conversation-id-12345');
      expect(debugInfo).toContain('Messages Found: 1');
    });

    it('should include message summary in debug info', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Test message content</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const debugInfo = getParserDebugInfo();

      expect(debugInfo).toContain('USER:');
      expect(debugInfo).toContain('Test message');
    });
  });

  describe('Edge cases', () => {
    it('should handle deeply nested message structures', () => {
      const messageHTML = `
        <div class="outer">
          <div class="group">
            <div class="wrapper1">
              <div class="wrapper2">
                <div class="bg-gray-50" data-message-role="user">
                  <div class="prose">
                    <div class="paragraph">
                      <span>Nested message</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('Nested message');
    });

    it('should handle whitespace-only messages by skipping them', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose">   </div>
          </div>
        </div>
        <div class="group">
          <div class="dark:bg-gray-800" data-message-role="assistant">
            <div class="prose"><span>Real content</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Real content');
    });

    it('should handle special characters in content', () => {
      const messageHTML = `
        <div class="group">
          <div class="bg-gray-50" data-message-role="user">
            <div class="prose"><span>Hello &amp; welcome! &lt;Test&gt;</span></div>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].content).toBeDefined();
      expect(messages[0].content.length).toBeGreaterThan(0);
    });
  });
});
