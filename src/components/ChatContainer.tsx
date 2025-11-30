import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Message } from '../types';
import { useChat } from '../hooks/useChat';
import { renderMarkdown } from '../utils/markdown';
import { VirtualizedMessages, type VirtualizedMessagesRef } from './VirtualizedMessages';
import { useProfiles } from '../hooks/useProfiles';
import type { PromptSet } from '../types/profiles';

interface ChatContainerProps {
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
  connectionStatus: 'online' | 'offline' | 'checking';
  showTimestamps: boolean;
  isMobile: boolean;
  isROGAllyX: boolean;
  onClearChat: () => void;
  onOpenSettings: () => void;
  onOpenDashboard: () => void;
  onOpenHistory: () => void;
  handleDeleteMessage: (messageId: string) => void;
  onStopGenerationRef?: React.MutableRefObject<(() => void) | null>;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  setMessages,
  customEndpoint,
  apiKey,
  temperature,
  maxTokens,
  topP,
  showToast,
  recordMetrics,
  recordError,
  connectionStatus,
  showTimestamps,
  isMobile,
  isROGAllyX,
  onClearChat,
  onOpenSettings,
  onOpenDashboard,
  onOpenHistory,
  handleDeleteMessage,
  onStopGenerationRef
}) => {
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const virtualizedMessagesRef = useRef<VirtualizedMessagesRef>(null);
  
  // Prompt set management
  const { profiles } = useProfiles();
  const [selectedPromptSetId, setSelectedPromptSetId] = useState<string | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState<number>(0);
  const [isRunningPromptSet, setIsRunningPromptSet] = useState(false);
  
  // Find the active profile (if any) to get its prompt sets
  const activeProfile = profiles.find(p => 
    p.endpoint === customEndpoint && 
    p.apiKey === (apiKey || undefined) &&
    p.temperature === temperature &&
    p.maxTokens === maxTokens &&
    p.topP === topP
  );
  const availablePromptSets = activeProfile?.promptSets || [];

  const {
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
    handleRegenerateResponse
  } = useChat({
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
  });

  // Store prompt set queue for sequential execution
  const promptSetQueueRef = useRef<{ prompts: string[]; name: string; currentIndex: number } | null>(null);
  const lastProcessedAssistantMessageIdRef = useRef<string | null>(null);
  const isProcessingNextPromptRef = useRef<boolean>(false);
  
  // Track if we should auto-send when inputMessage is set by prompt set
  const shouldAutoSendRef = useRef<boolean>(false);
  
  // Auto-send when inputMessage is set by prompt set execution
  useEffect(() => {
    if (shouldAutoSendRef.current && inputMessage.trim() && !isLoading && isRunningPromptSet) {
      shouldAutoSendRef.current = false;
      // Small delay to ensure state is stable
      setTimeout(() => {
        handleSendMessage();
      }, 50);
    }
  }, [inputMessage, isLoading, isRunningPromptSet, handleSendMessage]);
  
  // Sequential prompt set execution
  const runPromptSet = useCallback((promptSet: PromptSet) => {
    if (isLoading || isRunningPromptSet) return;
    
    setIsRunningPromptSet(true);
    setCurrentPromptIndex(0);
    isProcessingNextPromptRef.current = false;
    lastProcessedAssistantMessageIdRef.current = null;
    
    // Find the last assistant message ID before we start (if any)
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      lastProcessedAssistantMessageIdRef.current = lastAssistantMessage.id;
    }
    
    promptSetQueueRef.current = {
      prompts: promptSet.prompts,
      name: promptSet.name,
      currentIndex: 0
    };
    
    // Start with first prompt
    const firstPrompt = promptSet.prompts[0];
    if (!firstPrompt.trim()) {
      setIsRunningPromptSet(false);
      return;
    }
    
    // Set flag to auto-send, then set the message
    shouldAutoSendRef.current = true;
    setInputMessage(firstPrompt);
  }, [isLoading, isRunningPromptSet, messages]);
  
  // Watch for new assistant messages to know when to send next prompt
  useEffect(() => {
    if (!promptSetQueueRef.current || !isRunningPromptSet || isProcessingNextPromptRef.current || isLoading || isThinking) {
      return;
    }
    
    // Find the most recent assistant message
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    
    // Check if we have a new assistant message that we haven't processed yet
    if (lastAssistantMessage && 
        lastAssistantMessage.id !== lastProcessedAssistantMessageIdRef.current) {
      
      // This is a new assistant response, mark it as processed
      lastProcessedAssistantMessageIdRef.current = lastAssistantMessage.id;
      
      const queue = promptSetQueueRef.current;
      const nextIndex = queue.currentIndex + 1;
      
      if (nextIndex < queue.prompts.length) {
        // Mark that we're processing to prevent duplicate triggers
        isProcessingNextPromptRef.current = true;
        queue.currentIndex = nextIndex;
        
        // Wait a bit before sending next prompt
        setTimeout(() => {
          setCurrentPromptIndex(nextIndex);
          // Set flag to auto-send, then set the message
          shouldAutoSendRef.current = true;
          setInputMessage(queue.prompts[nextIndex]);
          // Reset processing flag after a delay to allow next iteration
          setTimeout(() => {
            isProcessingNextPromptRef.current = false;
          }, 500);
        }, 1000);
      } else {
        // All prompts completed
        setIsRunningPromptSet(false);
        setCurrentPromptIndex(0);
        setSelectedPromptSetId(null);
        promptSetQueueRef.current = null;
        lastProcessedAssistantMessageIdRef.current = null;
        isProcessingNextPromptRef.current = false;
        showToast(`Completed prompt set "${queue.name}"`, 'success');
      }
    }
  }, [messages, isLoading, isThinking, isRunningPromptSet, handleSendMessage, showToast]);

  const handlePromptSetSelect = (promptSetId: string) => {
    const promptSet = availablePromptSets.find(ps => ps.id === promptSetId);
    if (promptSet && !isLoading && !isRunningPromptSet) {
      runPromptSet(promptSet);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    // Use the ref from VirtualizedMessages for reliable scrolling
    if (virtualizedMessagesRef.current) {
      virtualizedMessagesRef.current.scrollToBottom();
    }
    // Also try scrolling the parent container in case streaming content is outside virtualized area
    if (chatMessagesRef.current) {
      requestAnimationFrame(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      });
    }
  }, []);

  // Throttled scroll for streaming content using requestAnimationFrame
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const SCROLL_THROTTLE_MS = 16; // ~60fps (16ms per frame)

  const throttledScrollToBottom = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollTimeRef.current < SCROLL_THROTTLE_MS) {
      // Schedule scroll for next frame if we're throttling
      if (scrollAnimationFrameRef.current === null) {
        scrollAnimationFrameRef.current = requestAnimationFrame(() => {
          scrollAnimationFrameRef.current = null;
          lastScrollTimeRef.current = Date.now();
          scrollToBottom();
        });
      }
    } else {
      // Scroll immediately if enough time has passed
      lastScrollTimeRef.current = now;
      scrollToBottom();
    }
  }, [scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Continuous auto-scroll during streaming (throttled to ~60fps)
  useEffect(() => {
    if (isThinking || isLoading) {
      // Scroll immediately on every content update for smooth, continuous rendering
      if (thinkingContent || responseContent) {
        // Use requestAnimationFrame for immediate smooth scrolling
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    }
  }, [thinkingContent, responseContent, isThinking, isLoading, scrollToBottom]);

  // Observe streaming content sections for size changes and auto-scroll
  const thinkingSectionRef = useRef<HTMLDivElement>(null);
  const responseSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isThinking && !isLoading) return;

    const observer = new ResizeObserver(() => {
      // When streaming content grows, scroll to bottom (throttled)
      throttledScrollToBottom();
    });

    if (thinkingSectionRef.current) {
      observer.observe(thinkingSectionRef.current);
    }
    if (responseSectionRef.current) {
      observer.observe(responseSectionRef.current);
    }

    return () => {
      observer.disconnect();
      // Clean up any pending animation frame
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }
    };
  }, [isThinking, isLoading, throttledScrollToBottom]);

  // Expose stop generation function for keyboard shortcuts
  useEffect(() => {
    if (onStopGenerationRef) {
      onStopGenerationRef.current = handleStopGeneration;
    }
  }, [handleStopGeneration, onStopGenerationRef]);

  return (
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
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            ⚙️ Settings
          </button>
          <button 
            className="control-button"
            onClick={onOpenDashboard}
            aria-label="Open performance dashboard"
          >
            📊 Dashboard
          </button>
          <button 
            className="control-button"
            onClick={onOpenHistory}
            aria-label="Open conversation history"
          >
            💬 History
          </button>
          <button 
            className="clear-button"
            onClick={onClearChat}
            aria-label="Clear chat conversation"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="chat-messages" ref={chatMessagesRef} style={{ 
        height: '100%', 
        overflowY: 'auto', 
        overflowX: 'hidden',
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative'
      }}>
        <VirtualizedMessages
          ref={virtualizedMessagesRef}
          messages={messages}
          renderMessage={(message, index) => {
            const isEditing = editingMessageId === message.id;
            const isError = message.content.startsWith('Error:');
            const canRetry = isError && lastError?.messageId === message.id && lastError.error.retryable;
            const errorInfo = canRetry ? lastError.error : null;
            
            return (
              <div key={message.id} className={`message ${message.role}`} style={{ position: 'relative', paddingRight: '80px' }}>
                {(showTimestamps || message.metrics) && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '4px',
                    opacity: 0.8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    {showTimestamps && (
                      <span>
                        {message.timestamp.toLocaleString()}
                        {message.edited && (
                          <span style={{ marginLeft: '4px', fontSize: '0.7rem', fontStyle: 'italic' }}>
                            (edited)
                          </span>
                        )}
                      </span>
                    )}
                    {message.metrics && message.role === 'assistant' && (
                      <span style={{ 
                        display: 'inline-flex', 
                        gap: '8px',
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '4px'
                      }}>
                        {message.metrics.timeToFirstToken !== undefined && (
                          <span title="Time to first token">
                            ⚡ {(message.metrics.timeToFirstToken / 1000).toFixed(2)}s
                          </span>
                        )}
                        {message.metrics.tokensPerSecond !== undefined && (
                          <span title="Tokens per second">
                            🚀 {message.metrics.tokensPerSecond.toFixed(1)} tok/s
                          </span>
                        )}
                        {message.metrics.totalTime !== undefined && (
                          <span title="Total response time">
                            ⏱️ {(message.metrics.totalTime / 1000).toFixed(2)}s
                          </span>
                        )}
                        {(message.metrics.tokensIn !== undefined || message.metrics.tokensOut !== undefined) && (
                          <span title="Token counts">
                            📊 {message.metrics.tokensIn || 0}→{message.metrics.tokensOut || 0}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
                {isEditing && message.role === 'user' ? (
                  <div style={{ marginBottom: '10px' }}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      aria-label="Edit message"
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--input-border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        resize: 'vertical'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          handleCancelEdit();
                        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          handleSaveEdit(message.id);
                        }
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={() => handleSaveEdit(message.id)}
                        disabled={!editContent.trim() || editContent.trim() === message.content}
                        aria-label="Save edited message and regenerate response"
                        aria-disabled={!editContent.trim() || editContent.trim() === message.content}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid var(--success-color)',
                          background: 'var(--success-color)',
                          color: '#fff',
                          cursor: editContent.trim() && editContent.trim() !== message.content ? 'pointer' : 'not-allowed',
                          fontSize: '0.85rem',
                          opacity: editContent.trim() && editContent.trim() !== message.content ? 1 : 0.5
                        }}
                      >
                        ✓ Save & Regenerate
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        aria-label="Cancel editing message"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'transparent',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                      style={{ 
                        wordBreak: 'break-word',
                        lineHeight: '1.5'
                      }}
                    />
                    {canRetry && errorInfo && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '12px', 
                        background: 'var(--error-color)', 
                        borderRadius: '6px', 
                        color: '#fff', 
                        fontSize: '0.85rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        <div style={{ marginBottom: '8px', fontWeight: 500 }}>
                          {errorInfo.type === 'rate_limit' 
                            ? '⏱️ Rate limit exceeded'
                            : errorInfo.type === 'network'
                            ? '🌐 Network error'
                            : errorInfo.type === 'timeout'
                            ? '⏰ Request timeout'
                            : errorInfo.type === 'server'
                            ? '🔧 Server error'
                            : '❌ Request failed'}
                        </div>
                        <div style={{ marginBottom: '8px', opacity: 0.9, fontSize: '0.8rem' }}>
                          {errorInfo.message}
                        </div>
                        {errorInfo.type === 'rate_limit' && errorInfo.retryAfter && (
                          <div style={{ 
                            marginBottom: '8px', 
                            padding: '6px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            ⏳ Retry after {errorInfo.retryAfter} seconds
                          </div>
                        )}
                        {lastError.retryAttempt > 0 && (
                          <div style={{ 
                            marginBottom: '8px', 
                            fontSize: '0.75rem',
                            opacity: 0.8
                          }}>
                            Retry attempt: {lastError.retryAttempt} / 3
                          </div>
                        )}
                        <button
                          onClick={handleRetry}
                          disabled={isLoading}
                          aria-label="Retry failed request"
                          style={{
                            padding: '6px 16px',
                            borderRadius: '4px',
                            border: '1px solid #fff',
                            background: isLoading ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                            opacity: isLoading ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!isLoading) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isLoading) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            }
                          }}
                        >
                          {isLoading ? '⏳ Retrying...' : '🔄 Retry'}
                        </button>
                      </div>
                    )}
                  </>
                )}
                <div style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  right: '8px', 
                  display: 'flex', 
                  gap: '4px' 
                }}>
                  <button
                    onClick={(e) => handleCopyMessage(message.content, e)}
                    aria-label={`Copy ${message.role} message to clipboard`}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      opacity: 0.7,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                    title="Copy message"
                  >
                    📋
                  </button>
                  {message.role === 'user' && !isEditing && (
                    <button
                      onClick={() => handleStartEdit(message.id)}
                      aria-label="Edit this message"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        opacity: 0.7,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                      title="Edit message"
                    >
                      ✏️
                    </button>
                  )}
                  {message.role === 'assistant' && index === messages.length - 1 && !isError && (
                    <button
                      onClick={handleRegenerateResponse}
                      aria-label="Regenerate AI response"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        opacity: 0.7,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.borderColor = 'var(--success-color)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                      title="Regenerate response"
                    >
                      🔄
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      opacity: 0.7,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.borderColor = 'var(--error-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                    title="Delete message"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          }}
          itemHeight={120}
          overscan={3}
          className="virtualized-messages"
        />
        
        {/* Thinking Section */}
        {isThinking && thinkingContent && (
          <div 
            ref={thinkingSectionRef} 
            className="thinking-section" 
            role="status" 
            aria-live="polite" 
            aria-label="AI thinking process"
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: '10px',
              flexShrink: 0
            }}
          >
            <div className="thinking-header">
              🤔 Thinking...
            </div>
            <div 
              className="thinking-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(thinkingContent) }}
              style={{ 
                wordBreak: 'break-word',
                lineHeight: '1.5'
              }}
            />
          </div>
        )}
        
        {/* Response Section */}
        {responseContent && (
          <div 
            ref={responseSectionRef} 
            className="response-section" 
            role="status" 
            aria-live="polite" 
            aria-label="AI response"
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: '10px',
              flexShrink: 0
            }}
          >
            <div className="response-header">
              💬 Response
            </div>
            <div 
              className="response-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(responseContent) }}
              style={{ 
                wordBreak: 'break-word',
                lineHeight: '1.5'
              }}
            />
          </div>
        )}
      </div>

      <div className="chat-input-area">
        {/* Connection Status Indicator - Only show when actually offline, not when checking */}
        {connectionStatus === 'offline' && (
          <div role="alert" aria-live="assertive" style={{
            padding: '8px 12px',
            marginBottom: '10px',
            borderRadius: '6px',
            background: 'var(--error-color)',
            color: '#fff',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span aria-hidden="true">🔴</span>
            <span>Connection offline. Please check your network and endpoint.</span>
          </div>
        )}
        
        {/* Prompt Set Selector */}
        {availablePromptSets.length > 0 && (
          <div style={{
            marginBottom: '10px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <label style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}>
              Prompt Set:
            </label>
            <select
              value={selectedPromptSetId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedPromptSetId(e.target.value);
                  // Automatically start running the selected prompt set
                  const promptSet = availablePromptSets.find(ps => ps.id === e.target.value);
                  if (promptSet && !isLoading && !isRunningPromptSet) {
                    handlePromptSetSelect(e.target.value);
                  }
                } else {
                  setSelectedPromptSetId(null);
                }
              }}
              disabled={isLoading || isRunningPromptSet}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                cursor: (isLoading || isRunningPromptSet) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || isRunningPromptSet) ? 0.6 : 1
              }}
              aria-label="Select prompt set to run automatically"
              title="Selecting a prompt set will automatically run all prompts sequentially"
            >
              <option value="">-- Select a prompt set --</option>
              {availablePromptSets.map(promptSet => (
                <option key={promptSet.id} value={promptSet.id}>
                  {promptSet.name} ({promptSet.prompts.length} prompts)
                </option>
              ))}
            </select>
            {isRunningPromptSet && (
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500
              }}>
                <span>⏳ Running...</span>
                <span>({currentPromptIndex + 1}/{availablePromptSets.find(ps => ps.id === selectedPromptSetId)?.prompts.length || 0})</span>
              </div>
            )}
          </div>
        )}
        
        <div className="chat-input-container" style={{ 
          display: 'flex', 
          gap: '10px', 
          alignItems: 'flex-end',
          flexDirection: 'row'
        }}>
          <textarea
            className="chat-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            aria-label="Chat message input"
            aria-describedby="chat-input-help"
            style={{
              flex: 1,
              resize: 'none'
            }}
          />
          <span id="chat-input-help" className="sr-only">
            Type your message and press Enter to send, or Shift+Enter for a new line
          </span>
          {isLoading ? (
            <button 
              className="stop-button"
              onClick={handleStopGeneration}
              aria-label="Stop response generation"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                background: 'transparent',
                border: '1px solid #f85149',
                cursor: 'pointer',
                width: isROGAllyX ? '60px' : '44px',
                height: isROGAllyX ? '60px' : '44px',
                minWidth: isROGAllyX ? '60px' : '44px',
                minHeight: isROGAllyX ? '60px' : '44px',
                borderRadius: '6px',
                flexShrink: 0,
                alignSelf: 'flex-end',
                color: '#f85149',
                fontSize: isROGAllyX ? '1.2rem' : '1rem'
              }}
              title="Stop generation"
            >
              ⏹️
            </button>
          ) : (
            <button 
              className="send-button"
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim()}
              aria-label="Send message"
              aria-disabled={!inputMessage.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                background: 'transparent',
                border: '1px solid #d2a8ff',
                cursor: !inputMessage.trim() ? 'not-allowed' : 'pointer',
                opacity: !inputMessage.trim() ? 0.5 : 1,
                width: isROGAllyX ? '60px' : '44px',
                height: isROGAllyX ? '60px' : '44px',
                minWidth: isROGAllyX ? '60px' : '44px',
                minHeight: isROGAllyX ? '60px' : '44px',
                borderRadius: '6px',
                overflow: 'hidden',
                flexShrink: 0,
                alignSelf: 'flex-end'
              }}
            >
              <img 
                src="/multiverse_icon.png" 
                alt="Multiverse" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.textContent = '✈️';
                }}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

