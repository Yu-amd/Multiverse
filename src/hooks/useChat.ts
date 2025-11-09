import { useState, useRef } from 'react';
import type { Message } from '../types';
import { getFriendlyErrorMessage, isRetryableError } from '../utils/errorHandling';
import { renderMarkdown } from '../utils/markdown';
import { responseCache } from '../utils/cache';

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
  const [lastError, setLastError] = useState<{ messageId: string; userMessage: Message; error: Error } | null>(null);
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
    
    console.log('Starting message send...');
    
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
      console.log('🔍 Checking cache...', {
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
        console.log('✅ Cache hit! Using cached response', {
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
      
      console.log('❌ Cache miss - making API request', {
        endpoint,
        messageCount: messages.length + 1,
        params: { temperature, max_tokens: maxTokens, top_p: topP }
      });
      console.log('Request payload:', request);

      // Add timeout to prevent hanging requests
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

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
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

      console.log('Starting to read stream...');
      let chunkCount = 0;
      let hasReceivedContent = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream completed');
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value);
        console.log(`Chunk ${chunkCount}:`, chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
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
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }

      // Check if we received any content
      if (!hasReceivedContent) {
        console.warn('No content received from stream, adding fallback message');
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
        console.log('💾 Storing in cache...', {
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
        console.log('✅ Response cached successfully');
      } catch (error) {
        console.warn('❌ Failed to cache response:', error);
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
        
        console.log('Inference completed:', {
          promptLength: currentInput.length,
          responseLength: accumulatedContent.length,
          totalTime,
          firstTokenLatency,
          tokensPerSecond
        });
      } catch (error) {
        console.error('Error recording metrics:', error);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Check if error was due to abort
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
        // Store error message with retry capability
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
        
        // Show user-friendly error message
        const friendlyError = getFriendlyErrorMessage(error);
        showToast(friendlyError, 'error');
        
        // Store error info for retry (only if retryable)
        if (isRetryableError(error)) {
          setLastError({
            messageId: errorMessageId,
            userMessage: newMessage,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        } else {
          // Clear last error if not retryable
          setLastError(null);
        }
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
      console.error('Failed to copy message:', err);
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
              const parsed = JSON.parse(data);
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
              console.error('Error parsing JSON:', parseError);
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
      console.error('Error regenerating after edit:', error);
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
      
      setLastError({
        messageId: errorMessageId,
        userMessage: updatedMessages[messageIndex],
        error: error instanceof Error ? error : new Error(String(error)),
      });
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

    setMessages(prev => prev.filter(msg => msg.id !== lastError.messageId));
    setLastError(null);

    const userMessage = lastError.userMessage;
    setInputMessage(userMessage.content);
    
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
              const parsed = JSON.parse(data);
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
              console.error('Error parsing JSON:', parseError);
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
      console.error('Error regenerating response:', error);
      
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
        const friendlyError = getFriendlyErrorMessage(error);
        showToast(friendlyError, 'error');
        setLastError({
          messageId: errorMessageId,
          userMessage: newMessage,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
      
      setIsLoading(false);
      setIsThinking(false);
      setThinkingContent('');
      setResponseContent('');
    }
  };

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

