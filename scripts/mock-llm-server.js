#!/usr/bin/env node

/**
 * Mock LLM Server for Testing
 * 
 * This is a simple OpenAI-compatible mock endpoint that:
 * - Accepts /v1/chat/completions requests
 * - Returns streaming responses
 * - Useful for CI/CD and local testing without a real LLM
 */

import http from 'http';

const PORT = process.env.MOCK_LLM_PORT || 1234;

// Mock response data
const MOCK_RESPONSES = [
  "Hello! I'm a mock AI assistant. How can I help you today?",
  "This is a simulated response from the mock LLM server.",
  "I'm here to help test your AI playground application!",
  "The mock server is working correctly. You can now test your app without a real LLM.",
];

function getRandomResponse() {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}

// Create streaming SSE chunks
function* generateStreamChunks(message) {
  const words = message.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    const content = (i === 0 ? words[i] : ' ' + words[i]);
    const chunk = {
      id: `chatcmpl-mock-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'mock-model',
      choices: [
        {
          index: 0,
          delta: {
            content: content,
          },
          finish_reason: null,
        },
      ],
    };
    
    yield `data: ${JSON.stringify(chunk)}\n\n`;
  }
  
  // Final chunk
  const finalChunk = {
    id: `chatcmpl-mock-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'mock-model',
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: 'stop',
      },
    ],
  };
  
  yield `data: ${JSON.stringify(finalChunk)}\n\n`;
  yield 'data: [DONE]\n\n';
}

// Request handler
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'mock-llm-server',
      port: PORT,
    }));
    return;
  }

  // Chat completions endpoint
  if (req.url === '/v1/chat/completions' && req.method === 'POST') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      let requestData;
      
      try {
        requestData = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const isStreaming = requestData.stream === true;

      if (isStreaming) {
        // Streaming response
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        const message = getRandomResponse();
        
        // Send chunks with slight delay to simulate real streaming
        const chunks = Array.from(generateStreamChunks(message));
        let index = 0;

        const interval = setInterval(() => {
          if (index < chunks.length) {
            res.write(chunks[index]);
            index++;
          } else {
            clearInterval(interval);
            res.end();
          }
        }, 50); // 50ms delay between chunks

      } else {
        // Non-streaming response
        const response = {
          id: `chatcmpl-mock-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'mock-model',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: getRandomResponse(),
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      }
    });
    
    return;
  }

  // Models endpoint (optional)
  if (req.url === '/v1/models' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      object: 'list',
      data: [
        {
          id: 'mock-model',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'mock',
        },
      ],
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start server
server.listen(PORT, () => {
  console.log(`🤖 Mock LLM Server running on http://localhost:${PORT}`);
  console.log(`📝 Endpoint: http://localhost:${PORT}/v1/chat/completions`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`\n✅ Ready to accept requests!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down mock server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down mock server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

