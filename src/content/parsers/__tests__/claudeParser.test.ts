import { parseMessages, getParserDebugInfo } from '../claudeParser';

describe('Claude Parser', () => {
  // Setup and teardown
  beforeEach(() => {
    // Clear the DOM before each test
    document.body.innerHTML = '';
    // Reset location to a known state
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/chat/test-conversation-id-12345',
        href: 'https://claude.ai/chat/test-conversation-id-12345',
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

    it('should parse a single user message from Claude DOM', () => {
      // Mock Claude DOM structure with a user message
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content">
            <span>Hello, Claude!</span>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello, Claude!',
        platform: 'claude',
        conversationId: 'test-conversation-id-12345',
      });
    });

    it('should parse a single assistant message from Claude DOM', () => {
      const messageHTML = `
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content">
            <span>Hello! I'm Claude. How can I help?</span>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        role: 'assistant',
        content: 'Hello! I\'m Claude. How can I help?',
        platform: 'claude',
      });
    });

    it('should parse multiple messages in sequence', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>What is 2+2?</span></div>
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>2+2 equals 4</span></div>
        </div>
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Thank you!</span></div>
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
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Message 1</span></div>
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>Message 2</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].messageIndex).toBe(1);
      expect(messages[1].messageIndex).toBe(2);
    });

    it('should handle malformed DOM elements gracefully', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Good message</span></div>
        </div>
        <div class="malformed">
          <!-- Empty message that will be skipped -->
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>Another good message</span></div>
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
          pathname: '/chat/abc-def-ghi-123',
          href: 'https://claude.ai/chat/abc-def-ghi-123',
        },
        writable: true,
      });

      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Test</span></div>
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
          href: 'https://claude.ai/share/some-share-id',
        },
        writable: true,
      });

      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Test</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].conversationId).toBe('unknown');
    });

    it('should assign unique IDs to each message', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Message 1</span></div>
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>Message 2</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].id).toBeDefined();
      expect(messages[1].id).toBeDefined();
      expect(messages[0].id).not.toBe(messages[1].id);
    });

    it('should set platform to "claude" for all messages', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Test</span></div>
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>Test</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      messages.forEach(msg => {
        expect(msg.platform).toBe('claude');
      });
    });

    it('should set capturedAt timestamp to current time', () => {
      const beforeParsing = Date.now();
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Test</span></div>
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
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Test message</span></div>
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
      expect(messages[0].platform).toBe('claude');
    });

    it('should handle messages with complex HTML content', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content">
            <p>This is <strong>bold</strong> text</p>
            <code>const x = 5;</code>
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
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span></span></div>
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>Real message</span></div>
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
        const className = role === 'user' ? 'user-message' : 'assistant-message';
        messageHTML += `
          <div class="${className}" data-message-role="${role}">
            <div class="message-content"><span>Message ${i + 1}</span></div>
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

    it('should detect role from data-message-role attribute', () => {
      const messageHTML = `
        <div data-message-role="user">
          <div class="message-content"><span>User message</span></div>
        </div>
        <div data-message-role="assistant">
          <div class="message-content"><span>Assistant message</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should detect role from class names', () => {
      const messageHTML = `
        <div class="human user-message">
          <div class="message-content"><span>User message</span></div>
        </div>
        <div class="claude assistant-message">
          <div class="message-content"><span>Assistant message</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should handle timestamp extraction or fallback', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Message with time</span></div>
          <time>2024-01-01</time>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].timestamp).toBeDefined();
      expect(typeof messages[0].timestamp).toBe('number');
      expect(messages[0].timestamp).toBeGreaterThan(0);
    });

    it('should handle alternative content selectors for Claude DOM', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <article class="prose">
            <p>Message using prose article</p>
          </article>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('Message using prose article');
    });
  });

  describe('getParserDebugInfo()', () => {
    it('should return debug information string', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Hello</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const debugInfo = getParserDebugInfo();

      expect(typeof debugInfo).toBe('string');
      expect(debugInfo).toContain('Claude Parser Debug Info');
      expect(debugInfo).toContain('test-conversation-id-12345');
      expect(debugInfo).toContain('Messages Found: 1');
    });

    it('should include message summary in debug info', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Test message content</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const debugInfo = getParserDebugInfo();

      expect(debugInfo).toContain('USER:');
      expect(debugInfo).toContain('Test message');
    });

    it('should show correct message count in debug info', () => {
      let messageHTML = '';
      for (let i = 0; i < 3; i++) {
        const role = i % 2 === 0 ? 'user' : 'assistant';
        const className = role === 'user' ? 'user-message' : 'assistant-message';
        messageHTML += `
          <div class="${className}" data-message-role="${role}">
            <div class="message-content"><span>Message ${i + 1}</span></div>
          </div>
        `;
      }
      document.body.innerHTML = messageHTML;

      const debugInfo = getParserDebugInfo();

      expect(debugInfo).toContain('Messages Found: 3');
    });
  });

  describe('Edge cases', () => {
    it('should handle deeply nested message structures', () => {
      const messageHTML = `
        <div class="outer">
          <div class="user-message" data-message-role="user">
            <div class="wrapper1">
              <div class="wrapper2">
                <div class="message-content">
                  <div class="paragraph">
                    <span>Nested message</span>
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
        <div class="user-message" data-message-role="user">
          <div class="message-content">   </div>
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>Real content</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Real content');
    });

    it('should handle special characters in content', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>Hello &amp; welcome! &lt;Test&gt;</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages[0].content).toBeDefined();
      expect(messages[0].content.length).toBeGreaterThan(0);
    });

    it('should handle markdown code blocks in messages', () => {
      const messageHTML = `
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content">
            <p>Here's some code:</p>
            <pre><code>function hello() { return "world"; }</code></pre>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBeTruthy();
      expect(messages[0].content.length).toBeGreaterThan(0);
    });

    it('should handle alternating user and assistant messages', () => {
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>User 1</span></div>
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>Assistant 1</span></div>
        </div>
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>User 2</span></div>
        </div>
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content"><span>Assistant 2</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(4);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('user');
      expect(messages[3].role).toBe('assistant');
    });

    it('should handle very long message content', () => {
      const longContent = 'This is a long message. '.repeat(50);
      const messageHTML = `
        <div class="user-message" data-message-role="user">
          <div class="message-content"><span>${longContent}</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].content.length).toBeGreaterThan(100);
    });

    it('should not include copy buttons or UI elements in content', () => {
      const messageHTML = `
        <div class="assistant-message" data-message-role="assistant">
          <div class="message-content">
            <span>Copy code</span>
            <code>const x = 5;</code>
          </div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      // Should not contain "Copy code" text
      expect(messages[0].content).not.toContain('Copy code');
    });
  });

  describe('Role detection', () => {
    it('should detect user role from various class indicators', () => {
      const messageHTML = `
        <div class="human">
          <div class="message-content"><span>User message</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
    });

    it('should detect assistant role from various class indicators', () => {
      const messageHTML = `
        <div class="claude">
          <div class="message-content"><span>Assistant message</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
    });

    it('should default to assistant when role is ambiguous', () => {
      const messageHTML = `
        <div data-message-id="test-msg" class="message-wrapper">
          <div class="message-content"><span>Ambiguous message</span></div>
        </div>
      `;
      document.body.innerHTML = messageHTML;

      const messages = parseMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
    });
  });
});
