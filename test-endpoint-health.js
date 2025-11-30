/**
 * Test script for endpoint health feature
 * Run this in the browser console after opening the app
 */

// Test 1: Test probeEndpointHealth function directly
async function testEndpointProbe() {
  console.log('🧪 Testing endpoint health probe...\n');
  
  // Import the function (in browser, it's available via window or module)
  // For testing, we'll use fetch directly to simulate
  
  const testEndpoints = [
    { url: 'http://localhost:1234', name: 'LM Studio (Local)' },
    { url: 'http://localhost:11434', name: 'Ollama (Local)' },
    { url: 'http://invalid-endpoint-12345.com', name: 'Invalid Endpoint' },
    { url: 'https://api.openai.com', name: 'OpenAI API' },
  ];
  
  for (const endpoint of testEndpoints) {
    console.log(`\n📡 Testing: ${endpoint.name} (${endpoint.url})`);
    
    try {
      // Try /health first
      try {
        const healthResponse = await fetch(`${endpoint.url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        if (healthResponse.ok) {
          console.log('  ✅ /health endpoint exists and is healthy');
          const data = await healthResponse.json().catch(() => ({}));
          console.log('  📊 Health data:', data);
        } else {
          console.log(`  ⚠️ /health endpoint returned ${healthResponse.status}`);
        }
      } catch (healthError) {
        console.log('  ℹ️ /health endpoint not available, trying chat endpoint...');
        
        // Try chat endpoint
        try {
          const chatResponse = await fetch(`${endpoint.url}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'test',
              messages: [{ role: 'user', content: 'hi' }],
              max_tokens: 1
            }),
            signal: AbortSignal.timeout(5000)
          });
          
          if (chatResponse.ok) {
            console.log('  ✅ Chat endpoint is healthy');
            console.log(`  ⏱️ Status: ${chatResponse.status}`);
          } else {
            console.log(`  ⚠️ Chat endpoint returned ${chatResponse.status}`);
          }
        } catch (chatError) {
          console.log('  ❌ Chat endpoint failed:', chatError.message);
        }
      }
    } catch (error) {
      console.log('  ❌ Endpoint is offline:', error.message);
    }
  }
}

// Test 2: Test capability detection
async function testCapabilities(endpoint) {
  console.log(`\n🔍 Testing capabilities for: ${endpoint}\n`);
  
  const capabilities = {
    streaming: false,
    tools: false,
    systemPrompt: false,
    supportsModelsEndpoint: false
  };
  
  // Test 1: /v1/models
  try {
    const modelsResponse = await fetch(`${endpoint}/v1/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    if (modelsResponse.ok) {
      capabilities.supportsModelsEndpoint = true;
      const data = await modelsResponse.json();
      if (data.data && data.data.length > 0) {
        console.log('  ✅ Models endpoint available');
        console.log(`  📋 Found ${data.data.length} models`);
        console.log(`  🎯 First model: ${data.data[0].id}`);
      }
    }
  } catch {
    console.log('  ❌ Models endpoint not available');
  }
  
  // Test 2: Streaming
  try {
    const streamResponse = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
        stream: true
      }),
      signal: AbortSignal.timeout(3000)
    });
    
    if (streamResponse.ok) {
      const contentType = streamResponse.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        capabilities.streaming = true;
        console.log('  ✅ Streaming supported');
      } else {
        console.log('  ❌ Streaming not supported (wrong content-type)');
      }
    }
  } catch {
    console.log('  ❌ Streaming test failed');
  }
  
  // Test 3: System prompt
  try {
    const systemResponse = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test',
        messages: [
          { role: 'system', content: 'You are a test.' },
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 1
      }),
      signal: AbortSignal.timeout(3000)
    });
    
    if (systemResponse.ok) {
      capabilities.systemPrompt = true;
      console.log('  ✅ System prompt supported');
    }
  } catch {
    console.log('  ❌ System prompt test failed');
  }
  
  // Test 4: Tools
  try {
    const toolsResponse = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        tools: [{
          type: 'function',
          function: {
            name: 'test_function',
            description: 'A test function',
            parameters: { type: 'object', properties: {} }
          }
        }]
      }),
      signal: AbortSignal.timeout(3000)
    });
    
    if (toolsResponse.ok) {
      capabilities.tools = true;
      console.log('  ✅ Tools/function calling supported');
    }
  } catch {
    console.log('  ❌ Tools test failed');
  }
  
  console.log('\n📊 Capabilities Summary:', capabilities);
  return capabilities;
}

// Test 3: Test UI integration
function testUI() {
  console.log('\n🎨 Testing UI Integration...\n');
  console.log('1. Open Settings modal (Ctrl+, or click Settings button)');
  console.log('2. Enter an endpoint URL');
  console.log('3. Wait 1 second - auto-probe should trigger');
  console.log('4. Check for health status badge');
  console.log('5. Click "Check Health" button manually');
  console.log('6. Verify capability badges appear');
  console.log('7. Test with different endpoints');
}

// Export test functions
if (typeof window !== 'undefined') {
  window.testEndpointProbe = testEndpointProbe;
  window.testCapabilities = testCapabilities;
  window.testUI = testUI;
  
  console.log('✅ Test functions loaded!');
  console.log('Run in console:');
  console.log('  - testEndpointProbe() - Test endpoint probing');
  console.log('  - testCapabilities("http://localhost:1234") - Test capabilities');
  console.log('  - testUI() - Show UI test instructions');
}

