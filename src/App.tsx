import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { metricsCollector, ModelMetrics, SystemMetrics, CompositeMetrics } from './metrics';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('LM Studio (Local)');
  const [customEndpoint, setCustomEndpoint] = useState('http://localhost:1234');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(0.9);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');
  const [responseContent, setResponseContent] = useState('');
  const [showApiInfo, setShowApiInfo] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState('model');
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [compositeMetrics, setCompositeMetrics] = useState<CompositeMetrics | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isROGAllyX, setIsROGAllyX] = useState(false);
  
  // Ref for auto-scrolling chat messages
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll chat messages to bottom
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  // Initialize metrics collection
  useEffect(() => {
    metricsCollector.startCollection(2000); // Update every 2 seconds
    
    // Update metrics state
    const updateMetrics = () => {
      setModelMetrics(metricsCollector.getModelMetrics());
      setSystemMetrics(metricsCollector.getSystemMetrics());
      setCompositeMetrics(metricsCollector.getCompositeMetrics());
    };
    
    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);
    
    return () => {
      clearInterval(interval);
      metricsCollector.stopCollection();
    };
  }, []);

  // Responsive design detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // ROG Ally X: Simplified detection - any reasonably large screen
      // This will trigger for most desktop/laptop screens and gaming devices
      const isROGAllyXSize = width >= 1024 || height >= 1024;
      
      // For testing: Force ROG Ally X layout
      const forceROGAllyX = window.location.search.includes('rog-ally') || 
                           localStorage.getItem('force-rog-ally') === 'true';
      
      setIsROGAllyX(isROGAllyXSize || forceROGAllyX);
      
      // Mobile: width < 768px OR height < 600px (for handheld devices like ROG Ally)
      setIsMobile((width < 768 || height < 600) && !isROGAllyXSize && !forceROGAllyX);
      
      // Tablet: 768px <= width < 1024px AND height >= 600px
      setIsTablet(width >= 768 && width < 1024 && height >= 600 && !isROGAllyXSize && !forceROGAllyX);
      
      // Debug logging
      console.log('Screen size:', width, 'x', height);
      console.log('ROG Ally X detected:', isROGAllyXSize || forceROGAllyX);
      console.log('Layout:', isROGAllyXSize || forceROGAllyX ? 'ROG Ally X' : 
                  (width < 768 || height < 600) ? 'Mobile' : 
                  (width >= 768 && width < 1024) ? 'Tablet' : 'Desktop');
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Auto-scroll when thinking content updates
  useEffect(() => {
    if (isThinking && thinkingContent) {
      scrollToBottom();
    }
  }, [isThinking, thinkingContent]);

  // Auto-scroll when response content updates
  useEffect(() => {
    if (responseContent) {
      scrollToBottom();
    }
  }, [responseContent]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const newMessage = {
      role: 'user' as const,
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    
    // Record start time for metrics
    const startTime = Date.now();
    const firstTokenTime = Date.now();
    
    try {
      // Determine endpoint
      const endpoint = selectedModel === 'Custom Endpoint' ? customEndpoint : 
                      selectedModel === 'Ollama (Local)' ? 'http://localhost:11434' : 
                      'http://localhost:1234';

      const request = {
        messages: [...messages, newMessage],
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP,
        stream: true,
      };

      const response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedContent = '';
      let accumulatedThinking = '';
      let inThinkingMode = false;
      const decoder = new TextDecoder();

      // Thinking markers
      const thinkingStartMarkers = [
        '<thinking>', '<reasoning>', '<internal>', '<think>',
        'let me think', 'i need to', 'first, let me',
        'step 1:', 'analysis:', 'reasoning:',
        'processing...', 'analyzing...', 'computing...'
      ];

      const thinkingEndMarkers = [
        '</thinking>', '</reasoning>', '</internal>', '</think>',
        'now i can', 'based on this', 'therefore',
        'in conclusion', 'so the answer', 'here\'s what i found'
      ];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;

                // Check if we're entering thinking mode
                if (!inThinkingMode) {
                  const lowerContent = content.toLowerCase();
                  const hasThinkingMarker = thinkingStartMarkers.some(marker =>
                    lowerContent.includes(marker)
                  );

                  if (hasThinkingMarker) {
                    inThinkingMode = true;
                    setIsThinking(true);
                    const cleanContent = content.replace(/<think>|<\/think>|<thinking>|<\/thinking>/gi, '').trim();
                    accumulatedThinking = cleanContent;
                    setThinkingContent(accumulatedThinking);
                    continue;
                  }
                }

                // Check if we're exiting thinking mode
                if (inThinkingMode) {
                  const lowerContent = content.toLowerCase();
                  const hasEndMarker = thinkingEndMarkers.some(marker =>
                    lowerContent.includes(marker)
                  );

                  if (hasEndMarker) {
                    inThinkingMode = false;
                    setIsThinking(false);
                    const cleanContent = content.replace(/<think>|<\/think>|<thinking>|<\/thinking>/gi, '').trim();
                    accumulatedContent = cleanContent;
                    setResponseContent(accumulatedContent);
                    continue;
                  }
                }

                if (inThinkingMode) {
                  const cleanContent = content.replace(/<think>|<\/think>|<thinking>|<\/thinking>/gi, '');
                  accumulatedThinking += cleanContent;
                  setThinkingContent(accumulatedThinking);
                } else {
                  const cleanContent = content.replace(/<think>|<\/think>|<thinking>|<\/thinking>/gi, '');
                  accumulatedContent += cleanContent;
                  setResponseContent(accumulatedContent);
                }
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }

      // Add final response to messages
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: accumulatedContent,
          timestamp: new Date(),
        },
      ]);

      // Record metrics for successful inference
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const firstTokenLatency = firstTokenTime - startTime;
      const tokensPerSecond = accumulatedContent.length / (totalTime / 1000);
      
      metricsCollector.recordInference(
        currentInput.length,
        accumulatedContent.length,
        totalTime,
        firstTokenLatency,
        tokensPerSecond,
        'FP16' // Default quantization format
      );

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          timestamp: new Date(),
        },
      ]);
      
      // Record error metrics
      metricsCollector.recordError();
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setThinkingContent('');
      setResponseContent('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getPythonCode());
      alert('Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const getPythonCode = () => {
    const endpoint = selectedModel === 'Custom Endpoint' ? customEndpoint : 
                    selectedModel === 'Ollama (Local)' ? 'http://localhost:11434' : 
                    'http://localhost:1234';
    
    // Create a clean conversation history without empty messages
    const cleanMessages = messages.filter(msg => msg.content.trim() !== '');
    const conversationHistory = cleanMessages.map(msg => 
      `            {"role": "${msg.role}", "content": ${JSON.stringify(msg.content)}}`
    ).join(',\n');
    
    const currentMessage = inputMessage.trim() || "Hello, how can you help me?";
    
    return `# AI Model API Integration with Streaming
import requests
import json

def chat_with_model_stream(message, endpoint="${endpoint}", conversation_history=None):
    """Send a message to an AI model endpoint with streaming response"""
    
    headers = {
        "Content-Type": "application/json"${apiKey ? `,\n        "Authorization": "Bearer ${apiKey}"` : ''}
    }
    
    # Build conversation history
    if conversation_history is None:
        messages = [
${conversationHistory || '            {"role": "system", "content": "You are a helpful AI assistant."}'},
            {"role": "user", "content": message}
        ]
    else:
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant."},
            *conversation_history,
            {"role": "user", "content": message}
        ]
    
    payload = {
        "messages": messages,
        "temperature": ${temperature},
        "max_tokens": ${maxTokens},
        "top_p": ${topP},
        "stream": True
    }
    
    try:
        response = requests.post(f"{endpoint}/v1/chat/completions", 
                               headers=headers, json=payload, timeout=30, stream=True)
        response.raise_for_status()
        
        print("AI Response: ", end="", flush=True)
        
        ai_response = ""
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]
                    if data.strip() == '[DONE]':
                        break
                    try:
                        parsed = json.loads(data)
                        if 'choices' in parsed and len(parsed['choices']) > 0:
                            delta = parsed['choices'][0].get('delta', {})
                            if 'content' in delta:
                                content = delta['content']
                                print(content, end="", flush=True)
                                ai_response += content
                    except json.JSONDecodeError:
                        continue
        
        print()  # New line after streaming
        return ai_response
        
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Error: {e}")

def chat_with_model(message, endpoint="${endpoint}"):
    """Send a message to an AI model endpoint (non-streaming)"""
    
    headers = {
        "Content-Type": "application/json"${apiKey ? `,\n        "Authorization": "Bearer ${apiKey}"` : ''}
    }
    
    # Build conversation history
    messages = [
${conversationHistory || '        {"role": "system", "content": "You are a helpful AI assistant."}'},
        {"role": "user", "content": message}
    ]
    
    payload = {
        "messages": messages,
        "temperature": ${temperature},
        "max_tokens": ${maxTokens},
        "top_p": ${topP},
        "stream": False
    }
    
    try:
        response = requests.post(f"{endpoint}/v1/chat/completions", 
                               headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result['choices'][0]['message']['content']
        
    except requests.exceptions.RequestException as e:
        return f"Error: {e}"
    except KeyError as e:
        return f"Error: Unexpected response format - {e}"
    except Exception as e:
        return f"Error: {e}"

# Interactive chat loop
def interactive_chat(endpoint="${endpoint}"):
    """Interactive chat loop - type 'quit' to exit"""
    print("🤖 AI Chat Assistant")
    print("Type 'quit' to exit the chat")
    print("-" * 40)
    
    conversation_history = []
    
    while True:
        try:
            # Get user input
            user_input = input("\\nYou: ").strip()
            
            # Check for quit command
            if user_input.lower() in ['quit', 'exit', 'bye', 'goodbye']:
                print("👋 Goodbye! Thanks for chatting!")
                break
            
            if not user_input:
                print("Please enter a message or type 'quit' to exit.")
                continue
            
            # Add user message to conversation
            conversation_history.append({"role": "user", "content": user_input})
            
            # Get AI response with streaming
            print("\\nAI: ", end="", flush=True)
            ai_response = chat_with_model_stream(user_input, endpoint, conversation_history)
            
            # Add AI response to conversation history
            if ai_response:
                conversation_history.append({"role": "assistant", "content": ai_response})
            
        except KeyboardInterrupt:
            print("\\n\\n👋 Goodbye! Thanks for chatting!")
            break
        except Exception as e:
            print(f"\\nError: {e}")
            print("Please try again or type 'quit' to exit.")

# Example usage
if __name__ == "__main__":
    # Interactive chat loop
    interactive_chat()
    
    # Or single message examples:
    # print("=== Single Message Examples ===")
    # message = ${JSON.stringify(currentMessage)}
    # chat_with_model_stream(message)
    # response = chat_with_model(message)
    # print(f"AI Response: {response}")`;
  };

  return (
    <div className="app-container">
      <div className={`content-wrapper ${isROGAllyX ? 'rog-ally-layout' : isMobile ? 'mobile-layout' : isTablet ? 'tablet-layout' : 'desktop-layout'}`}>
        {/* Chat Container */}
        <div className="chat-container">
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              gap: isMobile ? '8px' : '10px', 
              marginBottom: isMobile ? '15px' : '20px',
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}>
              <button 
                className="control-button"
                onClick={() => setShowSettings(true)}
              >
                ⚙️ Settings
              </button>
              <button 
                className="control-button"
                onClick={() => setShowDashboard(true)}
              >
                📊 Dashboard
              </button>
              <button 
                className="clear-button"
                onClick={handleClearChat}
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          <div className="chat-messages" ref={chatMessagesRef}>
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div>{message.content}</div>
              </div>
            ))}
            
            {/* Thinking Section */}
            {isThinking && thinkingContent && (
              <div className="thinking-section">
                <div className="thinking-header">
                  🤔 Thinking...
                </div>
                <div className="thinking-content">
                  {thinkingContent}
                </div>
              </div>
            )}
            
            {/* Response Section */}
            {responseContent && (
              <div className="response-section">
                <div className="response-header">
                  💬 Response
                </div>
                <div className="response-content">
                  {responseContent}
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-area">
            <div className="chat-input-container">
              <textarea
                className="chat-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
              />
              <button 
                className="send-button"
                onClick={handleSendMessage} 
                disabled={!inputMessage.trim() || isLoading}
              >
                {isLoading ? '⏳' : '✈️'}
              </button>
            </div>
          </div>
        </div>

        {/* Code Panel */}
        <div className="code-panel">
          <div className="code-header">
            <h3 className="code-title">Code Preview</h3>
            <div className="code-header-controls">
              <button 
                className="info-button"
                onClick={() => setShowApiInfo(true)}
              >
                ℹ️ Info
              </button>
              <button 
                className="copy-button"
                onClick={handleCopyCode}
              >
                📋 Copy
              </button>
            </div>
          </div>

          <div className="code-preview">
            <pre className="code-content">
              <code>{getPythonCode()}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowSettings(false)}
        >
          <div 
            style={{
              background: '#2a2a2a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: isMobile ? '15px' : '20px',
              maxWidth: isMobile ? '95%' : '500px',
              width: '90%',
              maxHeight: isMobile ? '90vh' : '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#e0e0e0' }}>Model Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                style={{
                  background: '#cc4444',
                  color: '#e0e0e0',
                  border: '1px solid #aa3333',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
                Model Provider
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  const newModel = e.target.value;
                  setSelectedModel(newModel);
                  // Auto-update endpoint based on selection
                  if (newModel === 'Ollama (Local)') {
                    setCustomEndpoint('http://localhost:11434');
                  } else if (newModel === 'LM Studio (Local)') {
                    setCustomEndpoint('http://localhost:1234');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  background: '#1a1a1a',
                  color: '#e0e0e0',
                  fontFamily: 'inherit'
                }}
              >
                <option value="LM Studio (Local)">LM Studio (Local)</option>
                <option value="Ollama (Local)">Ollama (Local)</option>
                <option value="Custom Endpoint">Custom Endpoint</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
                Endpoint URL
              </label>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder={
                  selectedModel === 'Ollama (Local)' ? 'http://localhost:11434' :
                  selectedModel === 'LM Studio (Local)' ? 'http://localhost:1234' :
                  'http://localhost:1234'
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  background: '#1a1a1a',
                  color: '#e0e0e0',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                {selectedModel === 'LM Studio (Local)' && 'Default: http://localhost:1234'}
                {selectedModel === 'Ollama (Local)' && 'Default: http://localhost:11434'}
                {selectedModel === 'Custom Endpoint' && 'Enter your custom endpoint URL'}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
                API Key (Optional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key if required"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  background: '#1a1a1a',
                  color: '#e0e0e0',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range"
                min="100"
                max="4096"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
                Top P: {topP}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
                Layout Settings
              </label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                marginBottom: '10px'
              }}>
                <input
                  type="checkbox"
                  id="rog-ally-toggle"
                  checked={localStorage.getItem('force-rog-ally') === 'true'}
                  onChange={(e) => {
                    localStorage.setItem('force-rog-ally', e.target.checked.toString());
                    window.location.reload();
                  }}
                  style={{ transform: 'scale(1.2)' }}
                />
                <label htmlFor="rog-ally-toggle" style={{ color: '#e0e0e0', cursor: 'pointer' }}>
                  🎮 Force ROG Ally X Layout (Bigger Fonts)
                </label>
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#888',
                marginTop: '5px'
              }}>
                Current Layout: {isROGAllyX ? 'ROG Ally X' : isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Info Modal */}
      {showApiInfo && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowApiInfo(false)}
        >
          <div 
            style={{
              background: '#2a2a2a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: isMobile ? '15px' : '20px',
              maxWidth: isMobile ? '95%' : '600px',
              width: '90%',
              maxHeight: isMobile ? '90vh' : '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#e0e0e0' }}>API Integration Guide</h2>
              <button 
                onClick={() => setShowApiInfo(false)}
                style={{
                  background: '#cc4444',
                  color: '#e0e0e0',
                  border: '1px solid #aa3333',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
        </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '10px' }}>🚀 Supported Endpoints</h3>
              <ul style={{ color: '#d1d5db', paddingLeft: '20px' }}>
                <li><strong>LM Studio:</strong> http://localhost:1234 (default)</li>
                <li><strong>Ollama:</strong> http://localhost:11434 (default)</li>
                <li><strong>Custom:</strong> Any OpenAI-compatible endpoint</li>
              </ul>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '10px' }}>⚙️ Parameters</h3>
              <ul style={{ color: '#d1d5db', paddingLeft: '20px' }}>
                <li><strong>Temperature:</strong> Controls randomness (0.0-2.0)</li>
                <li><strong>Max Tokens:</strong> Maximum response length (100-4096)</li>
                <li><strong>Top P:</strong> Nucleus sampling parameter (0.0-1.0)</li>
                <li><strong>API Key:</strong> Optional authentication token</li>
              </ul>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '10px' }}>🔧 Setup Instructions</h3>
              <div style={{ color: '#d1d5db', fontSize: '0.9rem' }}>
                <p><strong>LM Studio:</strong></p>
                <ol style={{ paddingLeft: '20px', marginBottom: '15px' }}>
                  <li>Download and install LM Studio</li>
                  <li>Load a model (e.g., Llama 2, Code Llama)</li>
                  <li>Start the local server on port 1234</li>
                </ol>
                
                <p><strong>Ollama:</strong></p>
                <ol style={{ paddingLeft: '20px', marginBottom: '15px' }}>
                  <li>Install Ollama: <code style={{ background: '#1a1a1a', padding: '2px 4px', borderRadius: '3px' }}>curl -fsSL https://ollama.ai/install.sh | sh</code></li>
                  <li>Pull a model: <code style={{ background: '#1a1a1a', padding: '2px 4px', borderRadius: '3px' }}>ollama pull llama2</code></li>
                  <li>Start server: <code style={{ background: '#1a1a1a', padding: '2px 4px', borderRadius: '3px' }}>ollama serve</code></li>
                </ol>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '10px' }}>💡 Features</h3>
              <ul style={{ color: '#d1d5db', paddingLeft: '20px' }}>
                <li>Real-time streaming responses</li>
                <li>Thinking vs Response detection</li>
                <li>Interactive code generation</li>
                <li>Multiple model support</li>
                <li>Parameter tuning</li>
              </ul>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '10px' }}>🐛 Troubleshooting</h3>
              <ul style={{ color: '#d1d5db', paddingLeft: '20px' }}>
                <li>Check if your model server is running</li>
                <li>Verify the endpoint URL is correct</li>
                <li>Ensure the model is loaded and ready</li>
                <li>Check browser console for error messages</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Modal */}
      {showDashboard && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDashboard(false)}
        >
          <div 
            style={{
              background: '#2a2a2a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: isMobile ? '15px' : '20px',
              maxWidth: isMobile ? '95%' : '90%',
              width: '90%',
              maxHeight: isMobile ? '90vh' : '85vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#e0e0e0' }}>📊 Performance Dashboard</h2>
              <button 
                onClick={() => setShowDashboard(false)}
                style={{
                  background: '#cc4444',
                  color: '#e0e0e0',
                  border: '1px solid #aa3333',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* Dashboard Tabs */}
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={() => setActiveDashboardTab('model')}
                style={{
                  background: activeDashboardTab === 'model' ? '#0066cc' : '#444',
                  color: '#e0e0e0',
                  border: '1px solid #555',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.8rem' : '1rem'
                }}
              >
                🧠 Model Metrics
              </button>
              <button 
                onClick={() => setActiveDashboardTab('system')}
                style={{
                  background: activeDashboardTab === 'system' ? '#0066cc' : '#444',
                  color: '#e0e0e0',
                  border: '1px solid #555',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.8rem' : '1rem'
                }}
              >
                ⚙️ System Metrics
              </button>
              <button 
                onClick={() => setActiveDashboardTab('composite')}
                style={{
                  background: activeDashboardTab === 'composite' ? '#0066cc' : '#444',
                  color: '#e0e0e0',
                  border: '1px solid #555',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.8rem' : '1rem'
                }}
              >
                📊 Composite Insights
              </button>
            </div>

            {/* Dashboard Content */}
            <div style={{ 
              background: '#1a1a1a', 
              border: '1px solid #333', 
              borderRadius: '6px', 
              padding: '20px',
              minHeight: '400px',
              maxHeight: '60vh',
              overflow: 'auto'
            }}>
              {activeDashboardTab === 'model' && (
                <div>
                  <h3 style={{ color: '#3b82f6', marginBottom: '15px' }}>🧠 Model-Level Metrics</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Latency</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Prompt-to-first-token: <span style={{ color: '#00ff00' }}>{modelMetrics?.promptToFirstToken.toFixed(1) || '--'} ms</span></div>
                        <div>Total response time: <span style={{ color: '#00ff00' }}>{modelMetrics?.totalResponseTime.toFixed(1) || '--'} ms</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Token Throughput</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Tokens/sec: <span style={{ color: '#00ff00' }}>{modelMetrics?.tokensPerSecond.toFixed(1) || '--'} t/s</span></div>
                        <div>Tokens in/out: <span style={{ color: '#00ff00' }}>{modelMetrics?.tokensIn || '--'} / {modelMetrics?.tokensOut || '--'}</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Context Utilization</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Prompt length: <span style={{ color: '#00ff00' }}>{modelMetrics?.promptLength || '--'} tokens</span></div>
                        <div>Max tokens: <span style={{ color: '#00ff00' }}>{modelMetrics?.maxTokens || '--'} tokens</span></div>
                        <div>Utilization: <span style={{ color: '#00ff00' }}>{modelMetrics?.contextUtilization.toFixed(1) || '--'}%</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Performance</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Active requests: <span style={{ color: '#00ff00' }}>{modelMetrics?.activeRequests || '--'}</span></div>
                        <div>Quantization: <span style={{ color: '#00ff00' }}>{modelMetrics?.quantizationFormat || '--'}</span></div>
                        <div>Cache hit rate: <span style={{ color: '#00ff00' }}>{modelMetrics?.cacheHitRate.toFixed(1) || '--'}%</span></div>
                        <div>Errors: <span style={{ color: '#ff4444' }}>{modelMetrics?.errorCount || '--'}</span></div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: '#1a2a1a', padding: '15px', borderRadius: '6px', border: '1px solid #00aa00' }}>
                    <h4 style={{ color: '#00ff00', marginBottom: '10px' }}>💡 Real-time Status</h4>
                    <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                      <div>Current model: <span style={{ color: '#00ff00' }}>{selectedModel}</span></div>
                      <div>Endpoint: <span style={{ color: '#00ff00' }}>{customEndpoint}</span></div>
                      <div>Temperature: <span style={{ color: '#00ff00' }}>{temperature}</span></div>
                      <div>Max tokens: <span style={{ color: '#00ff00' }}>{maxTokens}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {activeDashboardTab === 'system' && (
                <div>
                  <h3 style={{ color: '#3b82f6', marginBottom: '15px' }}>⚙️ System-Level Metrics</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 CPU Utilization</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Overall: <span style={{ color: '#00ff00' }}>{systemMetrics?.cpuUtilization.toFixed(1) || '--'}%</span></div>
                        <div>Per-core avg: <span style={{ color: '#00ff00' }}>{systemMetrics?.cpuPerCore ? (systemMetrics.cpuPerCore.reduce((a, b) => a + b, 0) / systemMetrics.cpuPerCore.length).toFixed(1) : '--'}%</span></div>
                        <div>Thread count: <span style={{ color: '#00ff00' }}>{systemMetrics?.threadCount || '--'}</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 GPU Utilization</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Compute: <span style={{ color: '#00ff00' }}>{systemMetrics?.gpuUtilization.toFixed(1) || '--'}%</span></div>
                        <div>Memory: <span style={{ color: '#00ff00' }}>{systemMetrics?.gpuMemoryUsage.toFixed(0) || '--'} MB</span></div>
                        <div>Temperature: <span style={{ color: '#00ff00' }}>{systemMetrics?.gpuTemperature.toFixed(1) || '--'}°C</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Memory</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>RAM usage: <span style={{ color: '#00ff00' }}>{systemMetrics?.ramUsage.toFixed(0) || '--'} MB</span></div>
                        <div>Swap activity: <span style={{ color: '#00ff00' }}>{systemMetrics?.swapActivity.toFixed(0) || '--'} MB</span></div>
                        <div>Available: <span style={{ color: '#00ff00' }}>{systemMetrics?.availableMemory.toFixed(0) || '--'} MB</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Power & Thermal</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Power draw: <span style={{ color: '#00ff00' }}>{systemMetrics?.powerDraw.toFixed(1) || '--'} W</span></div>
                        <div>CPU temp: <span style={{ color: '#00ff00' }}>{systemMetrics?.cpuTemperature.toFixed(1) || '--'}°C</span></div>
                        <div>Throttling: <span style={{ color: systemMetrics?.isThrottling ? '#ff4444' : '#00ff00' }}>{systemMetrics?.isThrottling ? 'Yes' : 'No'}</span></div>
                        <div>Battery: <span style={{ color: '#00ff00' }}>{systemMetrics?.batteryLevel.toFixed(1) || '--'}%</span></div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: '#1a2a1a', padding: '15px', borderRadius: '6px', border: '1px solid #00aa00' }}>
                    <h4 style={{ color: '#00ff00', marginBottom: '10px' }}>💡 System Status</h4>
                    <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                      <div>Disk I/O: <span style={{ color: '#00ff00' }}>{systemMetrics?.diskIO.toFixed(1) || '--'} MB/s</span></div>
                      <div>Network: <span style={{ color: '#00ff00' }}>{systemMetrics?.networkThroughput.toFixed(1) || '--'} MB/s</span></div>
                      <div>Process PID: <span style={{ color: '#00ff00' }}>{systemMetrics?.processId || '--'}</span></div>
                      <div>Uptime: <span style={{ color: '#00ff00' }}>{systemMetrics?.uptime ? Math.floor(systemMetrics.uptime / 3600) + 'h ' + Math.floor((systemMetrics.uptime % 3600) / 60) + 'm' : '--'}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {activeDashboardTab === 'composite' && (
                <div>
                  <h3 style={{ color: '#3b82f6', marginBottom: '15px' }}>📊 Composite Insight Metrics</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Energy Efficiency</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Tokens/sec per Watt: <span style={{ color: '#00ff00' }}>{compositeMetrics?.tokensPerWatt.toFixed(2) || '--'} t/s/W</span></div>
                        <div>Power efficiency: <span style={{ color: '#00ff00' }}>{compositeMetrics?.powerEfficiency.toFixed(1) || '--'}</span></div>
                        <div>Battery drain rate: <span style={{ color: '#00ff00' }}>{compositeMetrics?.batteryDrainRate.toFixed(2) || '--'}%/min</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Response Quality</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Response time per token: <span style={{ color: '#00ff00' }}>{compositeMetrics?.responseTimePerToken.toFixed(1) || '--'} ms/token</span></div>
                        <div>Decoding smoothness: <span style={{ color: '#00ff00' }}>{compositeMetrics?.decodingSmoothness.toFixed(1) || '--'}/10</span></div>
                        <div>Quality score: <span style={{ color: '#00ff00' }}>{compositeMetrics?.qualityScore.toFixed(1) || '--'}/10</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Resource Balance</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>CPU-GPU balance: <span style={{ color: '#00ff00' }}>{compositeMetrics?.cpuGpuBalance.toFixed(2) || '--'}</span></div>
                        <div>Memory efficiency: <span style={{ color: '#00ff00' }}>{compositeMetrics?.memoryEfficiency.toFixed(1) || '--'}%</span></div>
                        <div>Load distribution: <span style={{ color: '#00ff00' }}>{compositeMetrics?.loadDistribution || '--'}</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '6px', border: '1px solid '#444' }}>
                      <h4 style={{ color: '#ff8c00', marginBottom: '10px' }}>🔹 Thermal Performance</h4>
                      <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                        <div>Thermal efficiency: <span style={{ color: '#00ff00' }}>{compositeMetrics?.thermalEfficiency.toFixed(1) || '--'}/10</span></div>
                        <div>Sustained duration: <span style={{ color: '#00ff00' }}>{compositeMetrics?.sustainedDuration.toFixed(1) || '--'} min</span></div>
                        <div>Throttle threshold: <span style={{ color: '#ff4444' }}>{compositeMetrics?.throttleThreshold.toFixed(1) || '--'}°C</span></div>
                        <div>Performance curve: <span style={{ color: '#00ff00' }}>{compositeMetrics?.performanceCurve || '--'}</span></div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: '#1a2a1a', padding: '15px', borderRadius: '6px', border: '1px solid #00aa00' }}>
                    <h4 style={{ color: '#00ff00', marginBottom: '10px' }}>💡 Performance Insights</h4>
                    <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                      <div>Optimal settings detected: <span style={{ color: '#00ff00' }}>{compositeMetrics?.optimalSettings || '--'}</span></div>
                      <div>Recommended adjustments: <span style={{ color: '#ffaa00' }}>{compositeMetrics?.recommendedAdjustments || '--'}</span></div>
                      <div>Performance trend: <span style={{ color: '#00ff00' }}>{compositeMetrics?.performanceTrend || '--'}</span></div>
                      <div>Efficiency rating: <span style={{ color: '#00ff00' }}>{compositeMetrics?.efficiencyRating.toFixed(1) || '--'}/10</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

export default App;