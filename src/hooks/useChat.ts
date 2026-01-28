import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { getFriendlyErrorMessage } from '../utils/errorHandling';
import { createAppError, shouldRetry, getRetryDelay, type AppError } from '../types/errors';
import { renderMarkdown } from '../utils/markdown';
import { responseCache } from '../utils/cache';
import { logger } from '../utils/logger';
import { validateStreamingChunk } from '../schemas/llm';

interface UseChatProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  customEndpoint: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  recordMetrics: (promptLength: number, responseLength: number, totalTime: number, firstTokenLatency: number, tokensPerSecond: number) => void;
  recordError: () => void;
}

export const useChat = ({
  messages,
  setMessages,
  customEndpoint,
  apiKey,
  temperature,
  maxTokens,
  topP,
  showToast,
  recordMetrics,
  recordError
}: UseChatProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');
  const [responseContent, setResponseContent] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [lastError, setLastError] = useState<{ messageId: string; userMessage: Message; error: AppError; retryAttempt: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsThinking(false);
      setThinkingContent('');
      setResponseContent('');
      showToast('Generation stopped', 'info');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    logger.log('Starting message send...');
    
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      edited: false,
    };
    
    setMessages(prev => [...prev, newMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    
    // Record start time for metrics
    const startTime = Date.now();
    let firstTokenTime = Date.now();
    
    try {
      const endpoint = customEndpoint;

      const request = {
        messages: [...messages, newMessage],
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP,
        stream: true,
      };

      // Check cache first for non-streaming requests
      // Note: For streaming requests, we can't use cache directly, but we can check
      // if we have a cached non-streaming response for the same prompt
      const messagesForCache = [...messages, newMessage];
      logger.log('🔍 Checking cache...', {
        messageCount: messagesForCache.length,
        lastMessage: messagesForCache[messagesForCache.length - 1]?.content?.substring(0, 50),
        allMessages: messagesForCache.map(m => ({ role: m.role, content: m.content?.substring(0, 30) }))
      });
      
      const cachedResponse = responseCache.get<{ content: string; timestamp: number }>(
        endpoint,
        messagesForCache,
        {
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          stream: false
        }
      );

      // If we have a cached response, use it instead of making an API call
      if (cachedResponse && cachedResponse.content) {
        logger.log('✅ Cache hit! Using cached response', {
          contentLength: cachedResponse.content.length,
          timestamp: new Date(cachedResponse.timestamp).toLocaleTimeString()
        });
        
        // Simulate streaming for better UX
        setIsLoading(true);
        setResponseContent('');
        
        // Simulate token-by-token streaming from cache
        const cachedContent = cachedResponse.content;
        const words = cachedContent.split(' ');
        let currentIndex = 0;
        
        const streamInterval = setInterval(() => {
          if (currentIndex < words.length) {
            const chunk = words.slice(0, currentIndex + 1).join(' ');
            setResponseContent(chunk);
            currentIndex++;
          } else {
            clearInterval(streamInterval);
            setIsLoading(false);
            setResponseContent('');
            
            // Add final response to messages
            const assistantMessage: Message = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              role: 'assistant' as const,
              content: cachedContent,
              timestamp: new Date(),
              edited: false,
            };
            
            setMessages(prev => [...prev, assistantMessage]);
            
            // Record metrics for cached response (much faster)
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            recordMetrics(
              currentInput.length,
              cachedContent.length,
              totalTime,
              0, // First token latency is 0 for cache
              cachedContent.length / (totalTime / 1000)
            );
          }
        }, 20); // Fast streaming for cached responses
        
        return; // Exit early, don't make API call
      }
      
      logger.log('❌ Cache miss - making API request', {
        endpoint,
        messageCount: messages.length + 1,
        params: { temperature, max_tokens: maxTokens, top_p: topP }
      });
      logger.log('Request payload:', request);

      // Prefer Reachy agent only when the robot is actually connected.
      // Otherwise, fall back to direct chat completions for faster local usage.
      const reachyAgentUrl = 'http://localhost:9001'; // Reachy agent endpoint (fixed)
      let isReachyAgent = false;
      try {
        const healthController = new AbortController();
        const healthTimeoutId = setTimeout(() => healthController.abort(), 1200);
        const healthResponse = await fetch(`${reachyAgentUrl}/v1/agent/health`, {
          signal: healthController.signal,
        });
        clearTimeout(healthTimeoutId);
        if (healthResponse.ok) {
          const health = await healthResponse.json();
          const hardwareConnected = Boolean(health?.sensors_ok || health?.actuators_ok);
          // Use Reachy agent when it's reachable so it can attempt a hardware connection.
          isReachyAgent = true;
          logger.log('Reachy agent health check', { hardwareConnected, health });
        } else {
          logger.warn('Reachy agent health check failed', { status: healthResponse.status });
        }
      } catch (err) {
        logger.warn('Reachy agent health check unavailable, using direct chat completion', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      
      // Add timeout to prevent hanging requests (increased to 120 seconds for backend inference)
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds for backend inference

      let response: Response;
      
      if (isReachyAgent) {
        // Route through Reachy agent /v1/tasks endpoint
        // Extract the last user message as the prompt
        const prompt = newMessage.content;
        
        // Get backend routing from settings
        // Determine backend type from selected model
        let backendType: 'local' | 'aim' = 'local';
        let backendUrl = customEndpoint || 'http://localhost:1234';
        let backendModel = 'default';
        let aimModelId: string | undefined;
        let thinkingGestureEnabled = true;
        
        // Get settings from localStorage to determine backend
        try {
          const settingsStr = localStorage.getItem('multiverse-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            const selectedModel = settings.selectedModel || '';
            const endpoint = settings.customEndpoint || '';
            aimModelId = settings.aimModelId || undefined;
            thinkingGestureEnabled = settings.thinkingGestureEnabled ?? true;
            
            // Check model name first (most reliable)
            if (selectedModel.includes('AIM')) {
              backendType = 'aim';
              backendUrl = endpoint || 'http://localhost:8000';
              backendModel = aimModelId || 'Qwen/Qwen3-32B';
            } else if (selectedModel.includes('LM Studio')) {
              backendType = 'local';
              backendUrl = endpoint || 'http://localhost:1234';
              backendModel = 'default'; // LM Studio uses model from UI
            } else if (selectedModel.includes('Ollama')) {
              backendType = 'local';
              backendUrl = endpoint || 'http://localhost:11434';
              backendModel = 'default';
            } else if (selectedModel.includes('Custom')) {
              // For custom endpoints, detect from URL port
              // LM Studio uses port 1234 (works with any IP: 192.168.x.x:1234, localhost:1234, etc.)
              if (endpoint.includes(':1234')) {
                backendType = 'local';
                backendUrl = endpoint;
              } else if (endpoint.includes(':8000')) {
                backendType = 'aim';
                backendUrl = endpoint;
                backendModel = aimModelId || 'Qwen/Qwen3-32B';
              } else if (endpoint.includes(':11434')) {
                backendType = 'local';
                backendUrl = endpoint;
              } else {
                // Unknown custom endpoint, default to local
                backendType = 'local';
                backendUrl = endpoint || 'http://localhost:1234';
              }
            } else {
              // Fallback: detect from endpoint URL port if model name doesn't match
              // LM Studio uses port 1234 (any IP address)
              if (endpoint.includes(':1234')) {
                backendType = 'local';
                backendUrl = endpoint;
              } else if (endpoint.includes(':8000')) {
                backendType = 'aim';
                backendUrl = endpoint;
                backendModel = aimModelId || 'Qwen/Qwen3-32B';
              } else if (endpoint.includes(':11434')) {
                backendType = 'local';
                backendUrl = endpoint;
              } else {
                // Use provided endpoint as-is
                backendType = 'local';
                backendUrl = endpoint || 'http://localhost:1234';
              }
            }
          }
        } catch (e) {
          console.warn('Could not read settings for backend routing, using defaults:', e);
          // Default to LM Studio if settings can't be read
          backendType = 'local';
          backendUrl = customEndpoint || 'http://localhost:1234';
        }
        
        const taskRequest = {
          task_type: 'reachy_devops_copilot',
          input: {
            prompt: prompt,
            model: backendModel,
            thinking_gesture_enabled: thinkingGestureEnabled,
            stream_response: true
          },
          routing: {
            backend: backendType,
            base_url: backendUrl,
            api_key: apiKey || 'sk-your-api-key' // Use provided API key
          }
        };
        
        logger.log('Routing through Reachy agent /v1/tasks', { taskRequest, reachyAgentUrl });
        
        // Submit task to Reachy agent (always use localhost:9001)
        const taskResponse = await fetch(`${reachyAgentUrl}/v1/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
          },
          body: JSON.stringify(taskRequest),
          signal: controller.signal,
        });
        
        if (!taskResponse.ok) {
          const errorText = await taskResponse.text();
          logger.error('Task creation error:', errorText);
          throw new Error(`HTTP error! status: ${taskResponse.status} - ${errorText}`);
        }
        
        const taskStatus = await taskResponse.json();
        const taskId = taskStatus.task_id;
        
        logger.log('Task created, polling for completion', { taskId });
        
        // Poll for task completion
        let pollAttempts = 0;
        const maxPollAttempts = 180; // 3 minutes max (1 second intervals) - increased for backend inference
        let finalTaskStatus: any = null;
        
        logger.log('Starting to poll for task completion', { taskId, maxPollAttempts });
        
        while (pollAttempts < maxPollAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          
          if (controller.signal.aborted) {
            logger.warn('Polling aborted by controller', { taskId, pollAttempts });
            throw new Error('Request aborted');
          }
          
          try {
            const statusResponse = await fetch(`${reachyAgentUrl}/v1/tasks/${taskId}`, {
              headers: {
                ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
              },
              signal: controller.signal,
            });
            
            if (!statusResponse.ok) {
              logger.warn('Task status request failed', { taskId, status: statusResponse.status });
              throw new Error(`Failed to get task status: ${statusResponse.status}`);
            }
            
            finalTaskStatus = await statusResponse.json();
            
            logger.log('Task status poll', { 
              taskId, 
              state: finalTaskStatus.state, 
              pollAttempts,
              hasResult: !!finalTaskStatus.result 
            });
            
            if (finalTaskStatus.result?.content && finalTaskStatus.state !== 'completed') {
              setResponseContent(finalTaskStatus.result.content);
            }
            
            if (finalTaskStatus.state === 'completed') {
              logger.log('Task completed', { taskId, result: finalTaskStatus.result });
              break;
            } else if (finalTaskStatus.state === 'failed') {
              logger.error('Task failed', { taskId, error: finalTaskStatus.error });
              throw new Error(finalTaskStatus.error || 'Task failed');
            }
          } catch (fetchError: any) {
            // If it's an abort error, re-throw it
            if (fetchError.name === 'AbortError' || controller.signal.aborted) {
              logger.warn('Polling aborted during fetch', { taskId, pollAttempts });
              throw new Error('Request aborted');
            }
            // Otherwise, log and continue polling (network errors, etc.)
            logger.warn('Error polling task status, will retry', { 
              taskId, 
              error: fetchError.message,
              pollAttempts 
            });
          }
          
          pollAttempts++;
        }
        
        if (!finalTaskStatus || finalTaskStatus.state !== 'completed') {
          logger.error('Task did not complete within timeout', { 
            taskId, 
            finalState: finalTaskStatus?.state,
            pollAttempts 
          });
          throw new Error('Task did not complete within timeout');
        }
        
        // Extract response content
        const responseContent = finalTaskStatus.result?.content || '';
        
        if (!responseContent) {
          throw new Error('No response content in task result');
        }
        
        // Simulate streaming for better UX
        const words = responseContent.split(' ');
        let currentIndex = 0;
        
        const streamInterval = setInterval(() => {
          if (currentIndex < words.length) {
            const chunk = words.slice(0, currentIndex + 1).join(' ');
            setResponseContent(chunk);
            currentIndex++;
          } else {
            clearInterval(streamInterval);
            setIsLoading(false);
            setResponseContent('');
            
            // Add final response to messages
            const assistantMessage: Message = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              role: 'assistant' as const,
              content: responseContent,
              timestamp: new Date(),
              edited: false,
            };
            
            setMessages(prev => [...prev, assistantMessage]);
            
            // Record metrics
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            recordMetrics(
              currentInput.length,
              responseContent.length,
              totalTime,
              totalTime, // First token latency (approximate)
              responseContent.length / (totalTime / 1000)
            );
            
            clearTimeout(timeoutId);
          }
        }, 20); // Fast streaming
        
        return; // Exit early, don't process as streaming response
      }
      
      // Standard chat completions endpoint
      response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      logger.log('Response status:', response.status);
      logger.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedContent = '';
      let accumulatedThinking = '';
      let inThinkingMode = false;
      const decoder = new TextDecoder();
      
      // Streaming throttle: buffer tokens and render every 30-50ms
      let contentBuffer = '';
      let thinkingBuffer = '';
      let lastUpdateTime = Date.now();
      const THROTTLE_INTERVAL = 40; // 40ms = ~25fps, smooth but not too frequent
      let throttleTimer: number | null = null;
      
      const flushBuffers = () => {
        if (contentBuffer) {
          accumulatedContent += contentBuffer;
          setResponseContent(accumulatedContent);
          contentBuffer = '';
        }
        if (thinkingBuffer) {
          accumulatedThinking += thinkingBuffer;
          setThinkingContent(accumulatedThinking);
          thinkingBuffer = '';
        }
        lastUpdateTime = Date.now();
        throttleTimer = null;
      };
      
      const scheduleUpdate = () => {
        if (throttleTimer === null) {
          const timeSinceLastUpdate = Date.now() - lastUpdateTime;
          const delay = Math.max(0, THROTTLE_INTERVAL - timeSinceLastUpdate);
          
          throttleTimer = window.setTimeout(() => {
            flushBuffers();
          }, delay);
        }
      };

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

      logger.log('Starting to read stream...');
      let chunkCount = 0;
      let hasReceivedContent = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logger.log('Stream completed');
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value);
        logger.log(`Chunk ${chunkCount}:`, chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              // Validate with Zod schema
              const parsed = validateStreamingChunk(JSON.parse(data));
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
                  thinkingBuffer += cleanContent;
                  scheduleUpdate();
                  hasReceivedContent = true;
                } else {
                  const cleanContent = content.replace(/<think>|<\/think>|<thinking>|<\/thinking>/gi, '');
                  contentBuffer += cleanContent;
                  scheduleUpdate();
                  hasReceivedContent = true;
                  
                  if (!hasReceivedContent) {
                    firstTokenTime = Date.now() - startTime;
                  }
                }
              }
            } catch (e) {
              logger.error('Error parsing stream chunk:', e);
            }
          }
        }
      }

      // Flush any remaining buffered content
      if (throttleTimer !== null) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      flushBuffers();
      
      // Check if we received any content
      if (!hasReceivedContent) {
        logger.warn('No content received from stream, adding fallback message');
        accumulatedContent = 'I apologize, but I encountered an issue processing your request. Please try again.';
      }

      // Add final response to messages
      const assistantMessage: Message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        role: 'assistant' as const,
        content: accumulatedContent,
        timestamp: new Date(),
        edited: false,
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Cache the response for future use (non-streaming fallback)
      // Note: We cache the final accumulated content, not the stream
      // Use the same key format as the cache check (with stream: false)
      // IMPORTANT: Use the messages array BEFORE adding the assistant response
      // This matches what we used for the cache check
      try {
        const messagesForCache = [...messages, newMessage];
        logger.log('💾 Storing in cache...', {
          messageCount: messagesForCache.length,
          lastMessage: messagesForCache[messagesForCache.length - 1]?.content?.substring(0, 50),
          allMessages: messagesForCache.map(m => ({ role: m.role, content: m.content?.substring(0, 30) }))
        });
        
        responseCache.set(
          endpoint,
          messagesForCache,
          {
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            stream: false
          },
          {
            content: accumulatedContent,
            timestamp: Date.now()
          },
          10 * 60 * 1000 // 10 minutes TTL
        );
        logger.log('✅ Response cached successfully');
      } catch (error) {
        logger.warn('❌ Failed to cache response:', error);
      }

      // Record metrics for successful inference
      try {
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const firstTokenLatency = firstTokenTime - startTime;
        const tokensPerSecond = accumulatedContent.length / (totalTime / 1000);
        
        recordMetrics(
          currentInput.length,
          accumulatedContent.length,
          totalTime,
          firstTokenLatency,
          tokensPerSecond
        );
        
        logger.log('Inference completed:', {
          promptLength: currentInput.length,
          responseLength: accumulatedContent.length,
          totalTime,
          firstTokenLatency,
          tokensPerSecond
        });
      } catch (error) {
        logger.error('Error recording metrics:', error);
      }

    } catch (error) {
      logger.error('Error sending message:', error);
      
      // Create structured AppError
      const appError = createAppError(error, { endpoint: customEndpoint });
      
      // Check if error was due to abort (user stopped)
      if (appError.type === 'timeout' && error instanceof DOMException && error.name === 'AbortError') {
        // Check if this was a user-initiated abort (not timeout)
        const wasUserAbort = abortControllerRef.current === null;
        if (wasUserAbort) {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              role: 'assistant' as const,
              content: 'Generation stopped by user.',
              timestamp: new Date(),
              edited: false,
            } as Message,
          ]);
          showToast('Generation stopped', 'info');
          return;
        }
      }
      
      // Store error message with retry capability
      const errorMessageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      setMessages(prev => [
        ...prev,
        {
          id: errorMessageId,
          role: 'assistant' as const,
          content: `Error: ${appError.message}`,
          timestamp: new Date(),
          edited: false,
        } as Message,
      ]);
      
      // Show user-friendly error message
      showToast(appError.message, 'error');
      
        // Store error info for retry (only if retryable)
        if (appError.retryable) {
          setLastError({
            messageId: errorMessageId,
            userMessage: newMessage,
            error: appError,
            retryAttempt: lastError?.retryAttempt ?? 0,
          });
        } else {
          // Clear last error if not retryable
          setLastError(null);
        }
      
      // Record error metrics
      recordError();
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setThinkingContent('');
      setResponseContent('');
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = async (content: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    try {
      await navigator.clipboard.writeText(content);
      if (event?.currentTarget) {
        const button = event.currentTarget;
        const originalText = button.textContent;
        button.textContent = '✓ Copied';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
      showToast('Message copied to clipboard', 'success');
    } catch (err) {
      logger.error('Failed to copy message:', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    const newMessages = messages.filter(msg => msg.id !== messageId);
    setMessages(newMessages);
    showToast('Message deleted', 'info');
  };

  const handleStartEdit = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message && message.role === 'user') {
      setEditingMessageId(messageId);
      setEditContent(message.content);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== 'user') return;

    const message = messages[messageIndex];
    const originalContent = message.originalContent || message.content;
    const newContent = editContent.trim();

    if (newContent === message.content) {
      handleCancelEdit();
      return;
    }

    // Update the message
    const updatedMessages = messages.map((msg, idx) => {
      if (msg.id === messageId) {
        return {
          ...msg,
          content: newContent,
          edited: true,
          originalContent: originalContent,
        };
      }
      if (idx > messageIndex) {
        return null;
      }
      return msg;
    }).filter((msg): msg is Message => msg !== null);

    setMessages(updatedMessages);
    setEditingMessageId(null);
    setEditContent('');
    showToast('Message edited', 'success');

    // Regenerate response with edited message
    setIsLoading(true);
    const startTime = Date.now();
    let firstTokenTime = Date.now();

    try {
      const endpoint = customEndpoint;
      const request = {
        messages: updatedMessages.map(msg => ({ role: msg.role, content: msg.content })),
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP,
        stream: true,
      };

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedContent = '';
      let accumulatedThinking = '';
      let inThinkingMode = false;
      const decoder = new TextDecoder();

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

      let hasReceivedContent = false;

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
              // Validate with Zod schema
              const parsed = validateStreamingChunk(JSON.parse(data));
              if (parsed.choices[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;

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
                  hasReceivedContent = true;
                } else {
                  const cleanContent = content.replace(/<think>|<\/think>|<thinking>|<\/thinking>/gi, '');
                  accumulatedContent += cleanContent;
                  setResponseContent(accumulatedContent);
                  hasReceivedContent = true;
                  
                  if (!hasReceivedContent) {
                    firstTokenTime = Date.now() - startTime;
                  }
                }
              }
            } catch (parseError) {
              logger.error('Error parsing JSON:', parseError);
            }
          }
        }
      }

      if (!hasReceivedContent) {
        accumulatedContent = 'I apologize, but I encountered an issue processing your request. Please try again.';
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          role: 'assistant',
          content: accumulatedContent,
          timestamp: new Date(),
          edited: false,
        } as Message
      ]);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const tokensPerSecond = accumulatedContent.length > 0 ? (accumulatedContent.length / (totalTime / 1000)) : 0;

      recordMetrics(
        newContent.length,
        accumulatedContent.length,
        totalTime,
        firstTokenTime,
        tokensPerSecond
      );

    } catch (error) {
      logger.error('Error regenerating after edit:', error);
      const friendlyError = getFriendlyErrorMessage(error);
      showToast(friendlyError, 'error');
      
      const errorMessageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      setMessages(prev => [
        ...prev,
        {
          id: errorMessageId,
          role: 'assistant',
          content: `Error: ${friendlyError}`,
          timestamp: new Date(),
          edited: false,
        } as Message
      ]);
      
      const appError = createAppError(error, { endpoint: customEndpoint });
      if (appError.retryable) {
        setLastError({
          messageId: errorMessageId,
          userMessage: updatedMessages[messageIndex],
          error: appError,
          retryAttempt: 0,
        });
      }
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setThinkingContent('');
      setResponseContent('');
      abortControllerRef.current = null;
    }
  };

  const handleRetry = async () => {
    if (!lastError) return;

    const { error, retryAttempt } = lastError;
    
    // Check if we should retry
    if (!shouldRetry(error, retryAttempt)) {
      showToast('Maximum retry attempts reached', 'error');
      setLastError(null);
      return;
    }

    // Calculate retry delay
    const delay = getRetryDelay(error, retryAttempt);
    
    // For rate limits, show countdown
    if (error.type === 'rate_limit' && error.retryAfter) {
      showToast(`Rate limited. Retrying in ${error.retryAfter} seconds...`, 'info');
    } else if (delay > 0) {
      showToast(`Retrying in ${Math.ceil(delay / 1000)} seconds...`, 'info');
    }

    // Wait for retry delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Remove error message
    setMessages(prev => prev.filter(msg => msg.id !== lastError.messageId));
    
    // Increment retry attempt
    const newRetryAttempt = retryAttempt + 1;
    
    // Update lastError with new attempt count (will be cleared on success or final failure)
    setLastError({
      ...lastError,
      retryAttempt: newRetryAttempt,
    });

    const userMessage = lastError.userMessage;
    setInputMessage(userMessage.content);
    
    // Retry the request
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleRegenerateResponse = async () => {
    if (messages.length < 2) {
      showToast('No response to regenerate', 'error');
      return;
    }

    // Find the last user message and assistant response
    let lastUserIndex = -1;
    let lastAssistantIndex = -1;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && lastAssistantIndex === -1) {
        lastAssistantIndex = i;
      } else if (messages[i].role === 'user' && lastUserIndex === -1 && lastAssistantIndex !== -1) {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1 || lastAssistantIndex === -1) {
      showToast('No response to regenerate', 'error');
      return;
    }

    // Remove the last assistant response
    const messagesWithoutLastResponse = messages.slice(0, lastAssistantIndex);
    setMessages(messagesWithoutLastResponse);

    // Get the last user message
    const lastUserMessage = messages[lastUserIndex].content;
    
    // Clear any ongoing response
    setResponseContent('');
    setThinkingContent('');
    setIsThinking(false);
    
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: lastUserMessage,
      timestamp: new Date(),
      edited: false,
    };
    
    setIsLoading(true);
    
    const startTime = Date.now();
    let firstTokenTime = Date.now();
    
    try {
      const endpoint = customEndpoint;
      const request = {
        messages: [...messagesWithoutLastResponse, newMessage],
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP,
        stream: true,
      };

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedContent = '';
      let accumulatedThinking = '';
      let inThinkingMode = false;
      const decoder = new TextDecoder();

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

      let hasReceivedContent = false;
      
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
              // Validate with Zod schema
              const parsed = validateStreamingChunk(JSON.parse(data));
              if (parsed.choices[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;

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
                  hasReceivedContent = true;
                } else {
                  const cleanContent = content.replace(/<think>|<\/think>|<thinking>|<\/thinking>/gi, '');
                  accumulatedContent += cleanContent;
                  setResponseContent(accumulatedContent);
                  hasReceivedContent = true;
                  
                  if (!hasReceivedContent) {
                    firstTokenTime = Date.now() - startTime;
                  }
                }
              }
            } catch (parseError) {
              logger.error('Error parsing JSON:', parseError);
            }
          }
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const tokensPerSecond = accumulatedContent.length > 0 ? (accumulatedContent.length / (totalTime / 1000)) : 0;

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          role: 'assistant',
          content: accumulatedContent,
          timestamp: new Date(),
          edited: false,
        } as Message
      ]);
      setResponseContent('');
      setThinkingContent('');
      setIsThinking(false);
      setIsLoading(false);

      recordMetrics(
        lastUserMessage.length,
        accumulatedContent.length,
        totalTime,
        firstTokenTime,
        tokensPerSecond
      );

    } catch (error) {
      logger.error('Error regenerating response:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            role: 'assistant' as const,
            content: 'Generation stopped by user.',
            timestamp: new Date(),
            edited: false,
          } as Message,
        ]);
        showToast('Generation stopped', 'info');
      } else {
        const errorMessageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        setMessages(prev => [
          ...prev,
          {
            id: errorMessageId,
            role: 'assistant' as const,
            content: `Error: ${errorMessage}`,
            timestamp: new Date(),
            edited: false,
          } as Message,
        ]);
        const appError = createAppError(error, { endpoint: customEndpoint });
        showToast(appError.message, 'error');
        if (appError.retryable) {
          setLastError({
            messageId: errorMessageId,
            userMessage: newMessage,
            error: appError,
            retryAttempt: 0,
          });
        }
      }
      
      setIsLoading(false);
      setIsThinking(false);
      setThinkingContent('');
      setResponseContent('');
    }
  };

  // Clear lastError on successful message send
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const lastMessage = messages[messages.length - 1];
      if (lastError && lastMessage.role === 'assistant' && !lastMessage.content.startsWith('Error:')) {
        // Successfully sent after retry, clear error
        setLastError(null);
      }
    }
  }, [messages, isLoading, lastError]);

  return {
    inputMessage,
    setInputMessage,
    isLoading,
    isThinking,
    thinkingContent,
    responseContent,
    editingMessageId,
    editContent,
    setEditContent,
    lastError,
    handleSendMessage,
    handleKeyPress,
    handleStopGeneration,
    handleCopyMessage,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleRetry,
    handleRegenerateResponse,
    handleDeleteMessage,
    renderMarkdown
  };
};

