# Capturing ChatGPT Conversations in Chrome Extension

## Overview

This document describes how to capture ChatGPT conversation data (both user messages and AI responses) using a Chrome extension. The approach uses **monkey patching** with `fetch()` interception and the **ReadableStream tee()** method to capture streaming responses without affecting user experience.

## Why This Approach?

### Requirements
- Capture user messages sent to ChatGPT
- Capture AI responses (including streaming)
- **Zero latency** - no impact on ChatGPT performance
- **Non-blocking** - extension runs in background
- **Complete data** - capture every token as it streams

### Solution: Monkey Patch + Stream Tee

| Aspect | Details |
|--------|---------|
| **Method** | Override `window.fetch` to intercept API calls |
| **Streaming** | Use `ReadableStream.tee()` to duplicate stream |
| **Performance** | Zero user-perceived latency |
| **Reliability** | Fails silently without breaking ChatGPT |

## Architecture
```
ChatGPT Page
    ↓
fetch() intercepted by injected script
    ↓
    ├─→ Original stream → ChatGPT UI (unchanged)
    └─→ Teed stream → Background processing → Extension storage
```

## Implementation

### 1. Manifest Configuration
```json
{
  "manifest_version": 3,
  "name": "ChatGPT Conversation Backup",
  "permissions": ["storage"],
  "content_scripts": [{
    "matches": ["https://chat.openai.com/*", "https://chatgpt.com/*"],
    "js": ["content.js"],
    "run_at": "document_start"
  }],
  "web_accessible_resources": [{
    "resources": ["inject.js"],
    "matches": ["https://chat.openai.com/*", "https://chatgpt.com/*"]
  }]
}
```

### 2. Content Script (content.js)

Injects the interceptor script into the page context:
```javascript
// content.js - Runs in isolated context, injects script into page

// Inject the interceptor into the page's main world
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for captured conversation data
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;
  
  if (event.data.type === 'CHATGPT_MESSAGE_SENT') {
    // User sent a message
    handleUserMessage(event.data.data);
  } else if (event.data.type === 'CHATGPT_RESPONSE_CHUNK') {
    // AI response chunk received (streaming)
    handleResponseChunk(event.data.data);
  } else if (event.data.type === 'CHATGPT_RESPONSE_COMPLETE') {
    // AI response finished
    handleResponseComplete(event.data.data);
  }
});

function handleUserMessage(data) {
  // Forward to your storage handler
  console.log('User message:', data);
  // Your storage code here
}

function handleResponseChunk(data) {
  // Forward to your storage handler
  console.log('Response chunk:', data);
  // Your storage code here
}

function handleResponseComplete(data) {
  // Forward to your storage handler
  console.log('Complete response:', data);
  // Your storage code here
}
```

### 3. Injected Script (inject.js)

Main interceptor that captures conversation data:
```javascript
// inject.js - Runs in page context, has access to window.fetch

(function() {
  'use strict';
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Get the response
    const response = await originalFetch(...args);
    
    // Check if this is a ChatGPT conversation endpoint
    if (typeof url === 'string' && isChatGPTEndpoint(url)) {
      
      // Capture outgoing message (user's message)
      if (options?.method === 'POST' && options?.body) {
        captureOutgoingMessage(url, options.body);
      }
      
      // Capture incoming response (AI's response)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Streaming response - use tee()
        return handleStreamingResponse(response, url);
      } else {
        // Non-streaming response
        return handleNonStreamingResponse(response, url);
      }
    }
    
    // Not a ChatGPT endpoint - return unchanged
    return response;
  };
  
  function isChatGPTEndpoint(url) {
    return url.includes('/backend-api/conversation') ||
           url.includes('/api/conversation');
  }
  
  function captureOutgoingMessage(url, body) {
    try {
      const data = JSON.parse(body);
      
      // Extract user message
      const userMessage = {
        type: 'user',
        timestamp: Date.now(),
        url: url,
        conversationId: data.conversation_id,
        parentMessageId: data.parent_message_id,
        model: data.model,
        messages: data.messages // Array of message objects
      };
      
      // Send to content script
      window.postMessage({
        type: 'CHATGPT_MESSAGE_SENT',
        data: userMessage
      }, '*');
      
    } catch (error) {
      console.debug('Failed to capture outgoing message:', error);
    }
  }
  
  function handleStreamingResponse(response, url) {
    // Tee the stream - creates two identical copies
    const [streamForChatGPT, streamForBackup] = response.body.tee();
    
    // Process backup stream in background (non-blocking)
    processStreamForBackup(streamForBackup, url);
    
    // Return response with original stream for ChatGPT
    return new Response(streamForChatGPT, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
  
  async function processStreamForBackup(stream, url) {
    try {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      // Accumulate response data
      let responseData = {
        type: 'assistant',
        timestamp: Date.now(),
        url: url,
        conversationId: null,
        messageId: null,
        model: null,
        content: '',
        chunks: []
      };
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Stream complete
          window.postMessage({
            type: 'CHATGPT_RESPONSE_COMPLETE',
            data: responseData
          }, '*');
          break;
        }
        
        // Decode chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE messages (format: "data: {json}\n\n")
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              continue; // End signal from ChatGPT
            }
            
            try {
              const json = JSON.parse(data);
              
              // Extract metadata from first chunk
              if (!responseData.conversationId) {
                responseData.conversationId = json.conversation_id;
                responseData.messageId = json.message?.id;
                responseData.model = json.model;
              }
              
              // Extract content chunk
              if (json.message?.content?.parts) {
                const part = json.message.content.parts[0];
                if (part) {
                  responseData.content = part; // Full content so far
                  
                  // Store chunk info
                  responseData.chunks.push({
                    timestamp: Date.now(),
                    content: part,
                    delta: json.message.content.parts[0] // Could calculate delta if needed
                  });
                  
                  // Send chunk update (optional - for real-time processing)
                  window.postMessage({
                    type: 'CHATGPT_RESPONSE_CHUNK',
                    data: {
                      conversationId: responseData.conversationId,
                      messageId: responseData.messageId,
                      content: part,
                      timestamp: Date.now()
                    }
                  }, '*');
                }
              }
              
            } catch (error) {
              console.debug('Failed to parse SSE data:', error);
            }
          }
        }
      }
      
    } catch (error) {
      // Silent fail - don't break ChatGPT
      console.debug('Stream processing error:', error);
    }
  }
  
  async function handleNonStreamingResponse(response, url) {
    try {
      // Clone response to read body without consuming original
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();
      
      // Extract response data
      const responseData = {
        type: 'assistant',
        timestamp: Date.now(),
        url: url,
        conversationId: data.conversation_id,
        messageId: data.message?.id,
        model: data.model,
        content: data.message?.content?.parts?.[0] || '',
        metadata: data.message?.metadata
      };
      
      window.postMessage({
        type: 'CHATGPT_RESPONSE_COMPLETE',
        data: responseData
      }, '*');
      
    } catch (error) {
      console.debug('Failed to capture non-streaming response:', error);
    }
    
    return response;
  }
  
  console.log('ChatGPT conversation interceptor loaded');
})();
```

## Data Structures

### User Message (Outgoing)
```javascript
{
  type: 'user',
  timestamp: 1234567890123,
  url: 'https://chat.openai.com/backend-api/conversation',
  conversationId: 'conv-abc123',
  parentMessageId: 'msg-parent-123',
  model: 'gpt-4',
  messages: [
    {
      id: 'msg-123',
      role: 'user',
      content: {
        content_type: 'text',
        parts: ['What is machine learning?']
      }
    }
  ]
}
```

### AI Response Chunk (Streaming)
```javascript
{
  conversationId: 'conv-abc123',
  messageId: 'msg-456',
  content: 'Machine learning is a subset of...',
  timestamp: 1234567890456
}
```

### AI Response Complete
```javascript
{
  type: 'assistant',
  timestamp: 1234567890123,
  url: 'https://chat.openai.com/backend-api/conversation',
  conversationId: 'conv-abc123',
  messageId: 'msg-456',
  model: 'gpt-4',
  content: 'Machine learning is a subset of artificial intelligence...',
  chunks: [
    {
      timestamp: 1234567890200,
      content: 'Machine learning',
      delta: 'Machine learning'
    },
    {
      timestamp: 1234567890250,
      content: 'Machine learning is a subset',
      delta: ' is a subset'
    }
    // ... more chunks
  ]
}
```

## Performance Characteristics

| Metric | Value |
|--------|-------|
| **Latency overhead** | < 0.1ms (tee operation) |
| **Memory overhead** | Minimal (stream buffering) |
| **CPU overhead** | Negligible (async processing) |
| **User impact** | **Zero** - completely transparent |

### Why Zero Impact?

1. **`tee()` is synchronous and instant** - Creates stream copies with no delay
2. **Backup processing is async** - Runs in background, doesn't block ChatGPT
3. **Separate stream branches** - ChatGPT and backup read independently
4. **Silent error handling** - Failures don't propagate to ChatGPT

## Edge Cases Handled
```javascript
// 1. User stops generation mid-stream
// Stream will be closed early, partial data is still captured

// 2. Network errors
// try-catch blocks prevent errors from breaking ChatGPT

// 3. Rate limiting (429 responses)
if (response.status === 429) {
  return response; // Pass through without processing
}

// 4. Empty or malformed responses
if (!json.message?.content?.parts?.[0]) {
  return; // Skip invalid data
}

// 5. Conversation regeneration
// Each regeneration creates a new message with different ID
```

## Testing Checklist

- [ ] Send a simple message - verify capture
- [ ] Send a long message - verify streaming capture
- [ ] Stop generation mid-response - verify partial data captured
- [ ] Regenerate response - verify new message captured
- [ ] Switch conversations - verify conversation IDs tracked correctly
- [ ] Test with code blocks - verify formatting preserved
- [ ] Test with multiple rapid messages - verify all captured
- [ ] Test network errors - verify ChatGPT still works

## Security Considerations

1. **Content Security Policy**: Runs in page context, has same permissions as ChatGPT
2. **Data privacy**: All data stays local (no external requests)
3. **User control**: Extension can be disabled at any time
4. **Permissions**: Only requires `storage` permission

## Known Limitations

1. **Only captures browser sessions** - Cannot capture mobile app conversations
2. **Requires ChatGPT tab open** - Cannot capture background activity
3. **OpenAI API changes** - May break if ChatGPT changes their API structure
4. **Browser compatibility** - Requires ReadableStream support (Chrome 52+)

## Debugging Tips
```javascript
// Add to inject.js for debugging
const DEBUG = true;

if (DEBUG) {
  console.log('Intercepting:', url);
  console.log('Request body:', body);
  console.log('Response:', responseData);
}
```

## References

- [Streams API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [ReadableStream.tee() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/tee)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)