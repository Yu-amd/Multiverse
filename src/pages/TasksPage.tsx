import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatContainer } from '../components/ChatContainer';
import { CodePanel } from '../components/CodePanel';
import './TasksPage.css';

interface TasksPageProps {
  messages?: any[];
  setMessages?: (messages: any[]) => void;
  customEndpoint?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  recordMetrics?: (promptLength: number, responseLength: number, totalTime: number, firstTokenLatency: number, tokensPerSecond: number) => void;
  recordError?: () => void;
  connectionStatus?: 'online' | 'offline' | 'checking';
  showTimestamps?: boolean;
  isMobile?: boolean;
  isTablet?: boolean;
  isROGAllyX?: boolean;
  onClearChat?: () => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  handleDeleteMessage?: (messageId: string) => void;
  onOpenApiInfo?: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = (props) => {
  const [searchParams] = useSearchParams();
  const [inputMessage, setInputMessage] = useState('');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const stopGenerationRef = useRef<(() => void) | null>(null);
  const inputMessageRef = useRef<string>('');

  return (
    <div className="tasks-page">
      <div className="tasks-page-content">
        {/* Chat Container - Full Width */}
        <div className="chat-wrapper">
          <ChatContainer
            {...props}
            onStopGenerationRef={stopGenerationRef}
            onToggleCodePreview={() => setShowCodePreview(!showCodePreview)}
            showCodePreview={showCodePreview}
          />
        </div>

        {/* Code Panel - Overlay when shown */}
        {showCodePreview && (
          <div className="code-preview-overlay" onClick={() => setShowCodePreview(false)}>
            <div className="code-preview-panel" onClick={(e) => e.stopPropagation()}>
              <div className="code-preview-header">
                <h3>Code Preview</h3>
                <button
                  className="code-preview-close-button"
                  onClick={() => setShowCodePreview(false)}
                  aria-label="Close code preview"
                >
                  ✕
                </button>
              </div>
              <CodePanel
                messages={props.messages || []}
                inputMessage={inputMessage}
                customEndpoint={props.customEndpoint || ''}
                apiKey={props.apiKey || ''}
                temperature={props.temperature || 0.7}
                maxTokens={props.maxTokens || 2048}
                topP={props.topP || 1.0}
                showToast={props.showToast || (() => {})}
                onOpenApiInfo={props.onOpenApiInfo || (() => {})}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

