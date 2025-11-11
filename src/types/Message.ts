/**
 * Message types and interfaces for Chrome extension communication
 */

/**
 * Base message interface for all communication between content script and service worker
 */
export interface Message {
  type: string;
  data: any;
  timestamp: number;
}

/**
 * Test message - used for verifying communication channel works
 */
export interface TestMessage extends Message {
  type: 'test';
  data: string;
}

/**
 * Test response message - service worker response to test message
 */
export interface TestResponse extends Message {
  type: 'test_response';
  data: string;
}

/**
 * Generic response interface for service worker responses
 */
export interface ServiceWorkerResponse {
  received: boolean;
  timestamp: number;
  error?: string;
  data?: any;
}

/**
 * Type alias for platform sources
 */
export type Platform = 'chatgpt' | 'claude';

/**
 * Type alias for message sender role
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Represents a captured message from ChatGPT or Claude conversations.
 * This interface defines the canonical structure for all captured chat messages
 * across the extension (content scripts, service workers, storage adapters).
 */
export interface CapturedMessage {
  /**
   * Unique message identifier (UUID v4)
   * Generated when message is captured to ensure no duplicates
   */
  id: string;

  /**
   * Conversation identifier extracted from the URL
   * For ChatGPT: extracted from https://chatgpt.com/c/{conversationId}
   * For Claude: extracted from https://claude.ai/chat/{conversationId}
   */
  conversationId: string;

  /**
   * Role of the message sender
   */
  role: MessageRole;

  /**
   * Plain text content of the message
   */
  content: string;

  /**
   * Original HTML content from DOM (optional)
   * Preserves formatting, code blocks, links, and other HTML structure
   * Useful for more accurate message reconstruction
   */
  rawHtml?: string;

  /**
   * Unix timestamp when the message was originally sent in the chat
   */
  timestamp: number;

  /**
   * Unix timestamp when the extension captured/parsed this message
   * Useful for debugging sync issues and tracking capture latency
   */
  capturedAt: number;

  /**
   * Position of message in the conversation (1-indexed)
   * Helps maintain conversation order and detect missing messages
   */
  messageIndex?: number;

  /**
   * The LLM model that generated this message (if applicable)
   * Examples: 'gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-opus'
   */
  model?: string;

  /**
   * Source platform where this message was captured
   */
  platform: Platform;
}
