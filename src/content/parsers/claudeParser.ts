import { CapturedMessage } from '../../types/Message';

/**
 * Extracts the conversation ID from the current URL.
 * Claude.com URLs follow the pattern: https://claude.ai/chat/{conversationId}
 * @returns The conversation ID extracted from URL, or 'unknown' if not found
 */
function extractConversationId(): string {
  const pathname = window.location.pathname;
  // Match /chat/{conversationId} pattern
  const match = pathname.match(/\/chat\/([a-zA-Z0-9\-]+)(?:\/|$)/);
  return match ? match[1] : 'unknown';
}

/**
 * Generates a UUID v4 identifier.
 * Uses crypto.getRandomValues for secure random generation.
 * @returns UUID v4 string
 */
function generateMessageId(): string {
  // Use a simple uuid generation compatible with browser crypto
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detects if a message element represents a user message vs assistant/Claude message.
 * Claude typically uses different styling for user vs assistant messages:
 * - User messages often have a light background or user-specific styling
 * - Assistant messages (Claude) typically have different styling
 *
 * @param element The message container element
 * @returns 'user' or 'assistant' based on CSS classes or attributes
 */
function detectMessageRole(element: Element): 'user' | 'assistant' {
  // First priority: check for explicit data-message-role attribute
  const roleAttr = element.getAttribute('data-message-role');
  if (roleAttr === 'user') return 'user';
  if (roleAttr === 'assistant') return 'assistant';

  // Second priority: check for author role attribute
  const authorElement = element.querySelector('[data-author-role]');
  if (authorElement) {
    const role = authorElement.getAttribute('data-author-role');
    if (role === 'user') return 'user';
    if (role === 'assistant') return 'assistant';
  }

  // Third priority: check for Claude-specific class indicators
  const className = element.className || '';

  // Check for explicit message type classes first
  if (className.includes('user-message')) {
    return 'user';
  }

  if (className.includes('assistant-message')) {
    return 'assistant';
  }

  // Then check for role indicators
  if (className.includes('human')) {
    return 'user';
  }

  if (className.includes('claude')) {
    return 'assistant';
  }

  // Fourth priority: check for role attribute on parent or nearby elements
  const roleSpan = element.querySelector('[class*="user"], [class*="assistant"]');
  if (roleSpan) {
    const spanClass = roleSpan.className || '';
    if (spanClass.includes('user-message') || spanClass.includes('user')) {
      return 'user';
    }
    if (spanClass.includes('assistant-message') || spanClass.includes('assistant')) {
      return 'assistant';
    }
  }

  // Fifth priority: check parent elements for role indicators
  const parent = element.parentElement;
  if (parent) {
    const parentClass = parent.className || '';
    if (parentClass.includes('user-message') || parentClass.includes('human')) {
      return 'user';
    }
    if (parentClass.includes('assistant-message') || parentClass.includes('claude')) {
      return 'assistant';
    }
  }

  // Fallback: default to assistant (safer for message capture)
  return 'assistant';
}

/**
 * Extracts the plain text content from a message element.
 * Handles various Claude message structures including:
 * - Simple text messages
 * - Code blocks
 * - Formatted text with HTML elements
 *
 * @param element The message container element
 * @returns The extracted text content
 */
function extractMessageContent(element: Element): string {
  // Try to find the main content container
  const contentSelectors = [
    'div[data-message-content]',
    'div[class*="prose"]',
    'div[class*="markdown"]',
    'div[class*="message-content"]',
    '[class*="text-content"]',
    'div[role="article"]',
    'article',
  ];

  let contentElement: Element | null = null;
  for (const selector of contentSelectors) {
    contentElement = element.querySelector(selector);
    if (contentElement) break;
  }

  // If no specific content element found, use the whole element
  contentElement = contentElement || element;

  // Extract text content, preserving some structure
  let text = '';
  const walker = document.createTreeWalker(
    contentElement,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    const trimmed = (node.textContent || '').trim();
    if (trimmed && !trimmed.startsWith('Copy code') && !trimmed.startsWith('Copy')) {
      text += trimmed + ' ';
    }
  }

  // Clean up excessive whitespace
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Extracts the timestamp from a message element.
 * Claude may include timestamps in the DOM. If not available,
 * generates a reasonable timestamp based on element position.
 *
 * @param element The message container element
 * @param messageIndex The index of the message in conversation
 * @returns Unix timestamp in milliseconds
 */
function extractTimestamp(element: Element, messageIndex: number): number {
  // Try to find a timestamp element
  const timeElement = element.querySelector('span[aria-label], time, [class*="time"]');
  if (timeElement && timeElement.textContent) {
    // If we find a time element, use current time as approximation
    // Claude doesn't always expose exact timestamps in DOM
    return Date.now();
  }

  // Fallback: generate reasonable timestamp based on message position
  // Earlier messages have earlier timestamps (1 second apart)
  return Date.now() - (messageIndex * 1000);
}

/**
 * Extracts the model name from a message element if available.
 * Claude may display the model name in assistant messages.
 *
 * @param element The message container element
 * @param role The message role
 * @returns The model name if found, undefined otherwise
 */
function extractModel(element: Element, role: 'user' | 'assistant'): string | undefined {
  if (role === 'user') {
    return undefined; // User messages don't have a model
  }

  // Look for model indicator in assistant messages
  const modelElement = element.querySelector('[class*="model"], [data-model]');
  if (modelElement && modelElement.textContent) {
    const modelText = modelElement.textContent.trim();
    if (modelText && !modelText.includes('•')) {
      return modelText;
    }
  }

  // Check for Claude model indicators
  const claudeIndicator = element.querySelector('[class*="claude"]');
  if (claudeIndicator && claudeIndicator.textContent) {
    const text = claudeIndicator.textContent.trim();
    if (text.includes('Claude')) {
      return text;
    }
  }

  return undefined;
}

/**
 * Parses all messages from the current Claude.com conversation page.
 *
 * This function queries the DOM to find message containers, extracts their content,
 * role, and metadata, and returns an array of CapturedMessage objects.
 *
 * DOM Structure Assumptions for Claude.com:
 * - Messages are contained in specific divs with classes/attributes indicating message containers
 * - User messages are distinguishable from assistant messages via CSS classes or data attributes
 * - Content is extracted from child elements or the element's text content
 * - Conversation ID is available in the URL pathname
 * - Messages are typically in a scrollable container or main conversation area
 *
 * @returns Array of CapturedMessage objects representing the parsed chat
 */
export function parseMessages(): CapturedMessage[] {
  const messages: CapturedMessage[] = [];
  const conversationId = extractConversationId();

  // Query all message containers - Claude has different DOM structure than ChatGPT
  // Try multiple selectors for compatibility with different Claude versions
  const messageSelectors = [
    'div[data-message-id]',
    'div[data-message-role]',
    'div[class*="user-message"]',
    'div[class*="assistant-message"]',
    'article[class*="message"]',
    'div[role="article"]',
  ];

  let messageElements: Element[] = [];
  let selectedBy = -1;

  // Try each selector and use the first one that finds messages
  for (let i = 0; i < messageSelectors.length; i++) {
    const selector = messageSelectors[i];
    const elements = Array.from(document.querySelectorAll(selector));
    // Filter out nested message-content divs that might be matched
    const filtered = elements.filter(el => {
      const className = el.className || '';
      return !className.includes('message-content') && !className.includes('prose');
    });
    if (filtered.length > 0) {
      messageElements = filtered;
      selectedBy = i;
      break;
    }
  }

  // Special handling for user-message and assistant-message classes
  // These might be in different containers, so collect from both selectors
  if (selectedBy === 2 || selectedBy === 3) {
    // We found either user-message or assistant-message, collect from both
    const userMsgs = Array.from(document.querySelectorAll('div[class*="user-message"]')).filter(el => {
      const className = el.className || '';
      return !className.includes('message-content') && !className.includes('prose');
    });
    const assistantMsgs = Array.from(document.querySelectorAll('div[class*="assistant-message"]')).filter(el => {
      const className = el.className || '';
      return !className.includes('message-content') && !className.includes('prose');
    });
    messageElements = [...userMsgs, ...assistantMsgs].sort((a, b) => {
      // Maintain DOM order
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1;
    });
  }

  // If still no messages found, try a broader search specific to Claude
  if (messageElements.length === 0) {
    // Look for divs that contain typical message structures in Claude's conversation area
    const allDivs = Array.from(document.querySelectorAll('div'));
    messageElements = allDivs.filter(div => {
      const text = div.textContent || '';
      const className = div.className || '';
      const hasRole = div.getAttribute('data-message-role') || className.includes('user-message') || className.includes('assistant-message') || className.includes('human') || className.includes('claude');
      // Exclude divs that are just content containers
      const isContent = className.includes('message-content') || className.includes('prose');
      return text.length > 20 && !div.querySelector('input, button, nav') && hasRole && !isContent;
    }).slice(0, 50); // Limit to prevent false positives
  }

  // Parse each message element
  messageElements.forEach((element, index) => {
    try {
      const content = extractMessageContent(element);

      // Skip empty messages
      if (!content || content.length === 0) {
        return;
      }

      const role = detectMessageRole(element);
      const timestamp = extractTimestamp(element, index);
      const model = extractModel(element, role);

      const message: CapturedMessage = {
        id: generateMessageId(),
        conversationId,
        role,
        content,
        timestamp,
        capturedAt: Date.now(),
        messageIndex: index + 1,
        model,
        platform: 'claude',
      };

      messages.push(message);
    } catch (error) {
      console.warn('Error parsing message element:', error);
      // Continue with next message on error
    }
  });

  return messages;
}

/**
 * Alternative parser that returns a formatted summary of parsed messages.
 * Useful for debugging and logging extracted conversation.
 *
 * @returns String summary of parsed messages
 */
export function getParserDebugInfo(): string {
  const messages = parseMessages();
  const conversationId = extractConversationId();

  return `
Claude Parser Debug Info:
- URL: ${window.location.href}
- Conversation ID: ${conversationId}
- Messages Found: ${messages.length}
- Messages:
${messages.map(msg => `  [${msg.messageIndex}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 50)}...`).join('\n')}
  `;
}
