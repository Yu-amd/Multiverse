import React, { useRef, useEffect } from 'react';
import type { Message } from '../types';
import { useChat } from '../hooks/useChat';
import { renderMarkdown } from '../utils/markdown';
import { VirtualizedMessages } from './VirtualizedMessages';

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
  handleDeleteMessage
}) => {
  const chatMessagesRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, thinkingContent, responseContent]);

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
          >
            ⚙️ Settings
          </button>
          <button 
            className="control-button"
            onClick={onOpenDashboard}
          >
            📊 Dashboard
          </button>
          <button 
            className="control-button"
            onClick={onOpenHistory}
          >
            💬 History
          </button>
          <button 
            className="clear-button"
            onClick={onClearChat}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="chat-messages" ref={chatMessagesRef} style={{ height: '100%', overflow: 'hidden' }}>
        <VirtualizedMessages
          messages={messages}
          renderMessage={(message, index) => {
            const isEditing = editingMessageId === message.id;
            const isError = message.content.startsWith('Error:');
            const canRetry = isError && lastError?.messageId === message.id;
            
            return (
              <div key={message.id} className={`message ${message.role}`} style={{ position: 'relative', paddingRight: '80px' }}>
                {showTimestamps && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '4px',
                    opacity: 0.8
                  }}>
                    {message.timestamp.toLocaleString()}
                    {message.edited && (
                      <span style={{ marginLeft: '8px', fontSize: '0.7rem', fontStyle: 'italic' }}>
                        (edited)
                      </span>
                    )}
                  </div>
                )}
                {isEditing && message.role === 'user' ? (
                  <div style={{ marginBottom: '10px' }}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
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
                    {canRetry && (
                      <div style={{ marginTop: '8px', padding: '8px', background: 'var(--error-color)', borderRadius: '4px', color: '#fff', fontSize: '0.85rem' }}>
                        <div style={{ marginBottom: '4px' }}>Request failed. Would you like to retry?</div>
                        <button
                          onClick={handleRetry}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            border: '1px solid #fff',
                            background: 'transparent',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          🔄 Retry
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
          <div className="thinking-section">
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
          <div className="response-section">
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
        {/* Connection Status Indicator */}
        {connectionStatus !== 'online' && (
          <div style={{
            padding: '8px 12px',
            marginBottom: '10px',
            borderRadius: '6px',
            background: connectionStatus === 'offline' ? 'var(--error-color)' : 'var(--warning-color)',
            color: '#fff',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>
              {connectionStatus === 'offline' ? '🔴' : '🟡'}
            </span>
            <span>
              {connectionStatus === 'offline' 
                ? 'Connection offline. Please check your network and endpoint.' 
                : 'Checking connection...'}
            </span>
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
            style={{
              flex: 1,
              resize: 'none'
            }}
          />
          {isLoading ? (
            <button 
              className="stop-button"
              onClick={handleStopGeneration}
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

