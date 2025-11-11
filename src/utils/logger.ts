/**
 * Logging utility for External Memory extension
 * Provides consistent logging across content scripts and service worker
 */

const EXTENSION_PREFIX = '[External Memory]';

/**
 * Log a message with consistent formatting
 */
export function logMessage(context: string, message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = `${EXTENSION_PREFIX} [${timestamp}] [${context}] ${message}`;

  if (data) {
    console.log(logEntry, data);
  } else {
    console.log(logEntry);
  }
}

/**
 * Log an error with consistent formatting
 */
export function logError(context: string, error: any): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const logEntry = `${EXTENSION_PREFIX} [${timestamp}] [${context}] ERROR: ${errorMessage}`;

  console.error(logEntry, error);
}

/**
 * Log a message being sent
 */
export function logMessageSent(type: string, data?: any): void {
  logMessage('CONTENT_SCRIPT', `Message sent: type=${type}`, data);
}

/**
 * Log a message being received
 */
export function logMessageReceived(context: string, type: string, data?: any): void {
  logMessage(context, `Message received: type=${type}`, data);
}

/**
 * Log a response being sent
 */
export function logResponseSent(type: string, data?: any): void {
  logMessage('SERVICE_WORKER', `Response sent: type=${type}`, data);
}

/**
 * Log a response being received
 */
export function logResponseReceived(type: string, data?: any): void {
  logMessage('CONTENT_SCRIPT', `Response received: type=${type}`, data);
}
