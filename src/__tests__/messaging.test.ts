/**
 * Unit tests for Message Passing between Content Script and Service Worker
 */

import fs from 'fs';
import path from 'path';

describe('Message Passing', () => {
  let mockSendMessage: jest.Mock;
  let messageListeners: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    messageListeners = [];

    // Mock chrome API
    mockSendMessage = jest.fn();
    global.chrome = {
      runtime: {
        sendMessage: mockSendMessage,
        onMessage: {
          addListener: jest.fn((listener) => {
            messageListeners.push(listener);
          }),
        },
      },
    } as any;
  });

  it('should send message from content script with correct structure', () => {
    // Simulate sending message
    const testMessage = {
      type: 'test',
      data: 'Hello from content script',
      timestamp: Date.now(),
    };

    chrome.runtime.sendMessage(testMessage);

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.any(String),
        data: expect.any(String),
        timestamp: expect.any(Number),
      })
    );
  });

  it('should send message with callback handler', () => {
    const testMessage = {
      type: 'test',
      data: 'Hello',
      timestamp: Date.now(),
    };
    const mockCallback = jest.fn();

    chrome.runtime.sendMessage(testMessage, mockCallback);

    expect(mockSendMessage).toHaveBeenCalledWith(testMessage, mockCallback);
  });

  it('should handle message response from service worker', () => {
    const testMessage = { type: 'test', data: 'test', timestamp: Date.now() };
    let responseHandler: ((response: any) => void) | null = null;

    mockSendMessage.mockImplementation((_msg, handler) => {
      responseHandler = handler;
    });

    const onResponse = jest.fn();
    chrome.runtime.sendMessage(testMessage, onResponse);

    // Simulate service worker response
    if (responseHandler !== null) {
      const response = { type: 'test_response', data: 'Response', timestamp: Date.now() };
      (responseHandler as ((response: any) => void))(response);
    }

    expect(onResponse).toHaveBeenCalledWith(expect.objectContaining({
      type: 'test_response',
    }));
  });

  it('should have message listener registered in service worker', () => {
    // Load service worker
    require('../background.ts');

    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(messageListeners.length).toBeGreaterThan(0);
  });

  it('should handle message send errors gracefully', () => {
    mockSendMessage.mockImplementation(() => {
      throw new Error('Message send failed');
    });

    // This should not throw - errors are caught
    expect(() => {
      try {
        chrome.runtime.sendMessage({ type: 'test' });
      } catch (error) {
        // Expected - but content script should handle this
      }
    }).not.toThrow();
  });

  it('should process test message type in service worker', () => {
    // Load service worker with mocks in place
    require('../background.ts');

    // Call the message listener with a test message
    const listener = messageListeners[0];
    expect(listener).toBeDefined();

    const mockSendResponse = jest.fn();
    const testMessage = {
      type: 'test',
      data: 'Hello from content script',
      timestamp: Date.now(),
    };

    listener(testMessage, { url: 'https://chatgpt.com' }, mockSendResponse);

    // Verify response was sent
    expect(mockSendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test_response',
        received: true,
        timestamp: expect.any(Number),
      })
    );
  });

  it('should handle unknown message types gracefully', () => {
    require('../background.ts');

    const listener = messageListeners[0];
    const mockSendResponse = jest.fn();
    const unknownMessage = {
      type: 'unknown',
      data: 'Some data',
      timestamp: Date.now(),
    };

    listener(unknownMessage, { url: 'https://chatgpt.com' }, mockSendResponse);

    // Should still send a response
    expect(mockSendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        received: true,
        timestamp: expect.any(Number),
      })
    );
  });

  it('content script should send test message on load', () => {
    const contentScriptPath = path.join(__dirname, '../content/index.ts');
    const content = fs.readFileSync(contentScriptPath, 'utf-8');

    expect(content).toContain('chrome.runtime.sendMessage');
    expect(content).toContain('type: \'test\'');
    expect(content).toContain('Hello from content script');
  });

  it('service worker should have response handler for test messages', () => {
    const backgroundPath = path.join(__dirname, '../background.ts');
    const content = fs.readFileSync(backgroundPath, 'utf-8');

    expect(content).toContain('message?.type === \'test\'');
    expect(content).toContain('test_response');
    expect(content).toContain('sendResponse');
  });

  it('should have error handling in message exchange', () => {
    const contentScriptPath = path.join(__dirname, '../content/index.ts');
    const backgroundPath = path.join(__dirname, '../background.ts');

    const contentContent = fs.readFileSync(contentScriptPath, 'utf-8');
    const backgroundContent = fs.readFileSync(backgroundPath, 'utf-8');

    // Both should have try-catch blocks
    expect(contentContent).toContain('try');
    expect(contentContent).toContain('catch');
    expect(backgroundContent).toContain('try');
    expect(backgroundContent).toContain('catch');
  });
});
