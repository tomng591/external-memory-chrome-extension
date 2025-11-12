/**
 * MessageFormatter Service
 *
 * Converts raw API data captured from fetch interception into canonical CapturedMessage objects.
 * Handles data from ChatGPT API responses (from Task 4.1 injected script).
 */

import { CapturedMessage } from '../types/Message';

/**
 * Generates a simple UUID-like string compatible with browser crypto
 * Format: timestamp-randomString
 */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Raw user message data from CHATGPT_MESSAGE_SENT event (Task 4.1)
 */
export interface RawUserMessage {
  conversationId: string;
  parentMessageId: string;
  model: string;
  messages: any[]; // Array of message objects
  timestamp: number;
}

/**
 * Raw assistant response data from CHATGPT_RESPONSE_COMPLETE event (Task 4.1)
 */
export interface RawAssistantResponse {
  conversationId: string;
  messageId: string;
  model: string;
  content: string; // Full accumulated content from chunks
  chunks?: Array<{ timestamp: number; content: string }>;
}

/**
 * Formats a raw user message from ChatGPT API into a canonical CapturedMessage
 *
 * @param raw - Raw user message data from fetch interception
 * @returns Formatted CapturedMessage with role='user'
 * @throws Error if required fields are missing or invalid
 *
 * @example
 * ```typescript
 * const formatted = formatUserMessage({
 *   conversationId: 'conv-123',
 *   parentMessageId: 'msg-456',
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: { parts: ['Hello'] } }],
 *   timestamp: 1699000000000
 * });
 * ```
 */
export function formatUserMessage(raw: RawUserMessage): CapturedMessage {
  // Validate required fields
  if (!raw.conversationId || !raw.model) {
    throw new Error('Missing required fields: conversationId or model');
  }

  if (!raw.messages || raw.messages.length === 0) {
    throw new Error('Message array is empty - no user message to extract');
  }

  // Find user message in the messages array
  // ChatGPT may send messages with different role formats, so we try multiple approaches
  let userMessage = raw.messages.find((msg: any) => msg.role === 'user');

  // If not found, try finding the last message with content that's not a system message
  if (!userMessage) {
    userMessage = raw.messages.find((msg: any) => {
      const role = msg.role || msg.role_id;
      return role && role !== 'system' && role !== 'metadata' && msg.content;
    });
  }

  // If still not found, use the last message with content
  if (!userMessage) {
    userMessage = raw.messages.filter((msg: any) => msg.content).reverse()[0];
  }

  if (!userMessage) {
    console.warn('[External Memory] No user message found in messages array');
    throw new Error('Cannot extract user message from messages array - all messages lack content');
  }

  // Extract content from message object
  let content = '';

  if (userMessage.content) {
    if (typeof userMessage.content === 'string') {
      // Direct string content
      content = userMessage.content;
    } else if (userMessage.content.parts && Array.isArray(userMessage.content.parts)) {
      // Content with parts array (ChatGPT format)
      content = userMessage.content.parts.join('');
    } else if (userMessage.content.content_type && userMessage.content.parts) {
      // Alternative format with content_type
      content = userMessage.content.parts.join('');
    }
  }

  if (!content) {
    console.warn('[External Memory] User message content is empty - message may be incomplete');
  }

  // Generate unique ID for the message
  // Use message ID from API if available, otherwise generate new one
  const messageId = userMessage.id || generateMessageId();

  return {
    id: messageId,
    conversationId: raw.conversationId,
    role: 'user',
    content: content,
    timestamp: raw.timestamp,
    capturedAt: Date.now(),
    model: raw.model,
    platform: 'chatgpt',
  };
}

/**
 * Formats a raw assistant response from ChatGPT API into a canonical CapturedMessage
 *
 * @param raw - Raw assistant response data from fetch interception
 * @returns Formatted CapturedMessage with role='assistant'
 * @throws Error if required fields are missing
 *
 * @example
 * ```typescript
 * const formatted = formatAssistantResponse({
 *   conversationId: 'conv-123',
 *   messageId: 'msg-ai-1',
 *   model: 'gpt-4',
 *   content: 'Full accumulated response',
 *   chunks: [{ timestamp: 1699000001000, content: 'Full...' }]
 * });
 * ```
 */
export function formatAssistantResponse(raw: RawAssistantResponse): CapturedMessage {
  // Validate required fields
  if (!raw.conversationId || !raw.messageId || !raw.model) {
    throw new Error('Missing required fields: conversationId, messageId, or model');
  }

  // Content can be empty (partial responses are valid)
  if (typeof raw.content !== 'string') {
    throw new Error('Content must be a string');
  }

  // Determine timestamp from chunks or use current time
  let messageTimestamp = Date.now();

  if (raw.chunks && raw.chunks.length > 0) {
    // Use timestamp from first chunk
    messageTimestamp = raw.chunks[0].timestamp;
  }

  return {
    id: raw.messageId,
    conversationId: raw.conversationId,
    role: 'assistant',
    content: raw.content,
    timestamp: messageTimestamp,
    capturedAt: Date.now(),
    model: raw.model,
    platform: 'chatgpt',
    // Optional: store chunk metadata for future use
    messageIndex: undefined, // Will be set by deduplicator if needed
  };
}

/**
 * Validates that a CapturedMessage has all required fields and valid data
 *
 * @param message - Message to validate
 * @returns true if message is valid, false otherwise
 * @example
 * ```typescript
 * if (validateMessage(message)) {
 *   await storageService.saveMessage(message);
 * }
 * ```
 */
export function validateMessage(message: CapturedMessage): boolean {
  // Check required fields
  if (!message.id || typeof message.id !== 'string') {
    console.warn('[External Memory] Message validation failed: invalid or missing id');
    return false;
  }

  if (!message.conversationId || typeof message.conversationId !== 'string') {
    console.warn('[External Memory] Message validation failed: invalid or missing conversationId');
    return false;
  }

  if (!message.role || (message.role !== 'user' && message.role !== 'assistant')) {
    console.warn('[External Memory] Message validation failed: invalid role');
    return false;
  }

  if (typeof message.content !== 'string') {
    console.warn('[External Memory] Message validation failed: invalid content');
    return false;
  }

  if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
    console.warn('[External Memory] Message validation failed: invalid timestamp');
    return false;
  }

  if (typeof message.capturedAt !== 'number' || message.capturedAt <= 0) {
    console.warn('[External Memory] Message validation failed: invalid capturedAt');
    return false;
  }

  if (!message.platform || (message.platform !== 'chatgpt' && message.platform !== 'claude')) {
    console.warn('[External Memory] Message validation failed: invalid platform');
    return false;
  }

  return true;
}
