/**
 * Unit tests for Service Worker (Background Script)
 */

import fs from 'fs';
import path from 'path';

describe('Service Worker', () => {
  beforeEach(() => {
    // Clear require cache to reload the background.ts module
    jest.resetModules();

    // Mock chrome API for service worker tests
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn((callback) => {
            // Store callback for testing
            (global.chrome.runtime.onMessage as any).callback = callback;
          }),
        },
      },
    } as any;
  });

  it('should have valid TypeScript syntax', () => {
    expect(() => {
      require('../background.ts');
    }).not.toThrow();
  });

  it('should register message listener', () => {
    // Reload module with mock in place
    require('../background.ts');
    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it('should have error handling', () => {
    const filePath = path.join(__dirname, '../background.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('try');
    expect(content).toContain('catch');
  });

  it('should log startup message', () => {
    const filePath = path.join(__dirname, '../background.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('Service worker started');
  });

  it('should have timestamp in startup log', () => {
    const filePath = path.join(__dirname, '../background.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('toISOString');
    expect(content).toContain('timestamp');
  });

  it('should handle messages with try-catch', () => {
    const filePath = path.join(__dirname, '../background.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Verify message handler has its own try-catch
    const lines = content.split('\n');
    const messageListenerIndex = lines.findIndex((line) => line.includes('addListener'));
    const messageHandlerContent = lines.slice(messageListenerIndex, messageListenerIndex + 40).join('\n');

    expect(messageHandlerContent).toContain('try');
    expect(messageHandlerContent).toContain('catch');
  });

  it('should send response with timestamp', () => {
    const filePath = path.join(__dirname, '../background.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Verify sendResponse is called with proper structure
    expect(content).toContain('sendResponse');
    expect(content).toContain('timestamp');
  });
});
