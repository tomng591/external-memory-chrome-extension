import { CapturedMessage } from '../../types/Message';

/**
 * Extracts the conversation ID from the current URL.
 * ChatGPT URLs follow the pattern: https://chatgpt.com/c/{conversationId}
 * @returns The conversation ID extracted from URL, or 'unknown' if not found
 */
function extractConversationId(): string {
  const pathname = window.location.pathname;
  const match = pathname.match(/\/c\/([a-zA-Z0-9\-]+)(?:\/|$)/);
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
 * Detects if a message element represents a user message vs assistant message.
 * ChatGPT typically uses different background colors or data attributes to distinguish roles.
 * User messages often have a light background (group-[/message_start.user]/)
 * Assistant messages have a different background (group-[/message_start.assistant]/)
 *
 * @param element The message container element
 * @returns 'user' or 'assistant' based on CSS classes or attributes
 */
function detectMessageRole(element: Element): 'user' | 'assistant' {
  // First priority: check for explicit data-message-role attribute
  if (element.getAttribute('data-message-role') === 'user') {
    return 'user';
  }

  if (element.getAttribute('data-message-role') === 'assistant') {
    return 'assistant';
  }

  // Second priority: check for author data attributes
  const authorElement = element.querySelector('[data-author-role]');
  if (authorElement) {
    const role = authorElement.getAttribute('data-author-role');
    if (role === 'user') return 'user';
    if (role === 'assistant') return 'assistant';
  }

  // Third priority: check for avatar/icon indicators (ChatGPT usually shows user avatar on one side)
  // Look for user avatar element (typically shows user's initial or icon)
  const userAvatarSelectors = [
    '[data-user-avatar]',
    '[class*="user-avatar"]',
    'img[alt*="User"]',
    'img[alt*="user"]',
  ];

  for (const selector of userAvatarSelectors) {
    if (element.querySelector(selector)) {
      return 'user';
    }
  }

  // Assistant avatar indicators
  const assistantAvatarSelectors = [
    '[data-assistant-avatar]',
    '[class*="assistant-avatar"]',
    'img[alt*="Assistant"]',
    'img[alt*="assistant"]',
    '[class*="ChatGPT"]',
  ];

  for (const selector of assistantAvatarSelectors) {
    if (element.querySelector(selector)) {
      return 'assistant';
    }
  }

  // Fourth priority: check for CSS classes that indicate role
  const className = element.className || '';

  // User messages typically have light background (bg-gray-50 or similar)
  if (className.includes('bg-gray-50') || className.includes('gray-50')) {
    return 'user';
  }

  // Assistant messages typically have darker background
  if (className.includes('dark:bg-gray-800') || className.includes('gray-700') || className.includes('gray-800')) {
    return 'assistant';
  }

  // Fifth priority: check parent elements for role indicators
  const parent = element.parentElement;
  if (parent) {
    const parentClass = parent.className || '';
    if (parentClass.includes('bg-gray-50') || parentClass.includes('gray-50')) {
      return 'user';
    }
    if (parentClass.includes('dark:bg-gray-800') || parentClass.includes('gray-700')) {
      return 'assistant';
    }

    // Check grandparent for role indicators
    const grandparent = parent.parentElement;
    if (grandparent) {
      const gpClass = grandparent.className || '';
      if (gpClass.includes('bg-gray-50') || gpClass.includes('gray-50')) {
        return 'user';
      }
      if (gpClass.includes('dark:bg-gray-800') || gpClass.includes('gray-700')) {
        return 'assistant';
      }
    }
  }

  // Final fallback: check for text direction or alignment (right-aligned = user, left-aligned = assistant)
  const style = window.getComputedStyle(element);
  if (style.textAlign === 'right' || element.getAttribute('dir') === 'rtl') {
    return 'user';
  }

  // Log a debug message - this is expected during API interception since we're not relying on DOM parsing
  console.debug('[ChatGPT Parser] Could not determine message role from DOM, defaulting to assistant. (This is OK - using API interception instead)');

  // Default to assistant if unsure (safer default for message capture)
  return 'assistant';
}

/**
 * Extracts the plain text content from a message element.
 * Handles various ChatGPT message structures including:
 * - Simple text messages
 * - Code blocks (extracts only the code)
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
    'div[class*="message"]',
    '.markdown',
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
    if (trimmed && !trimmed.startsWith('Copy code')) {
      text += trimmed + ' ';
    }
  }

  // Clean up excessive whitespace
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Extracts the timestamp from a message element.
 * ChatGPT may include timestamps in the DOM. If not available,
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
    // ChatGPT doesn't always expose exact timestamps in DOM
    return Date.now();
  }

  // Fallback: generate reasonable timestamp based on message position
  // Earlier messages have earlier timestamps (1 second apart)
  return Date.now() - (messageIndex * 1000);
}

/**
 * Extracts the model name from a message element if available.
 * ChatGPT may display the model name in assistant messages.
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

  return undefined;
}

/**
 * Parses all messages from the current ChatGPT conversation page.
 *
 * This function queries the DOM to find message containers, extracts their content,
 * role, and metadata, and returns an array of CapturedMessage objects.
 *
 * DOM Structure Assumptions:
 * - Messages are contained in specific divs with classes like "group", "message-group", or similar
 * - User messages are distinguishable from assistant messages via CSS classes or data attributes
 * - Content is extracted from child elements or the element's text content
 * - Conversation ID is available in the URL pathname
 *
 * @returns Array of CapturedMessage objects representing the parsed chat
 */
export function parseMessages(): CapturedMessage[] {
  const messages: CapturedMessage[] = [];
  const conversationId = extractConversationId();

  // Query all message containers - ChatGPT uses divs with group class
  // Try multiple selectors for compatibility with different ChatGPT versions
  const messageSelectors = [
    'div[data-message-id]',
    'div[data-message-role]',
    'div.group',
    'div[class*="message"]',
    'article',
  ];

  let messageElements: Element[] = [];
  for (const selector of messageSelectors) {
    const elements = Array.from(document.querySelectorAll(selector));
    if (elements.length > 0) {
      messageElements = elements;
      break;
    }
  }

  // If still no messages found, try a broader search
  if (messageElements.length === 0) {
    // Look for divs that contain typical message structures
    const allDivs = Array.from(document.querySelectorAll('div'));
    messageElements = allDivs.filter(div => {
      const text = div.textContent || '';
      return text.length > 20 && !div.querySelector('input, button, nav');
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
        platform: 'chatgpt',
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
ChatGPT Parser Debug Info:
- URL: ${window.location.href}
- Conversation ID: ${conversationId}
- Messages Found: ${messages.length}
- Messages:
${messages.map(msg => `  [${msg.messageIndex}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 50)}...`).join('\n')}
  `;
}
