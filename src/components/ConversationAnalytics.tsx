import React from 'react';
import type { SavedConversation } from '../types';
import { 
  calculateOverallAnalytics, 
  calculateConversationAnalytics, 
  formatDuration, 
  formatNumber 
} from '../utils/analytics';

interface ConversationAnalyticsProps {
  conversations: SavedConversation[];
  selectedConversation?: SavedConversation | null;
  isMobile: boolean;
}

export const ConversationAnalytics: React.FC<ConversationAnalyticsProps> = ({
  conversations,
  selectedConversation,
  isMobile
}) => {
  const overallAnalytics = calculateOverallAnalytics(conversations);
  const conversationAnalytics = selectedConversation 
    ? calculateConversationAnalytics(selectedConversation)
    : null;

  return (
    <div style={{ padding: isMobile ? '10px' : '20px' }}>
      {/* Overall Statistics */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          color: 'var(--text-primary)', 
          fontWeight: 600, 
          marginBottom: '15px',
          fontSize: isMobile ? '1.1rem' : '1.2rem'
        }}>
          📊 Overall Statistics
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
          gap: '15px' 
        }}>
          <div className="metric-card">
            <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Total Conversations
            </h4>
            <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {formatNumber(overallAnalytics.totalConversations)}
            </div>
          </div>

          <div className="metric-card">
            <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Total Messages
            </h4>
            <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {formatNumber(overallAnalytics.totalMessages)}
            </div>
          </div>

          <div className="metric-card">
            <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Total Words
            </h4>
            <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {formatNumber(overallAnalytics.totalWords)}
            </div>
          </div>

          <div className="metric-card">
            <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Total Tokens
            </h4>
            <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {formatNumber(overallAnalytics.totalTokens.total)}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Input: {formatNumber(overallAnalytics.totalTokens.input)} • 
                Output: {formatNumber(overallAnalytics.totalTokens.output)}
              </div>
            </div>
          </div>

          <div className="metric-card">
            <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Avg Messages/Conversation
            </h4>
            <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {overallAnalytics.averageMessagesPerConversation.toFixed(1)}
            </div>
          </div>

          <div className="metric-card">
            <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Avg Words/Conversation
            </h4>
            <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {formatNumber(Math.round(overallAnalytics.averageWordsPerConversation))}
            </div>
          </div>

          <div className="metric-card">
            <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Avg Response Time
            </h4>
            <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {overallAnalytics.averageResponseTime > 0 
                ? formatDuration(overallAnalytics.averageResponseTime)
                : 'N/A'}
            </div>
          </div>

          <div className="metric-card">
            <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Time Span
            </h4>
            <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {overallAnalytics.totalConversationTime > 0
                ? formatDuration(overallAnalytics.totalConversationTime)
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Most Used Models */}
      {overallAnalytics.mostUsedModels.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontWeight: 600, 
            marginBottom: '15px',
            fontSize: isMobile ? '1.1rem' : '1.2rem'
          }}>
            🔝 Most Used Models
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overallAnalytics.mostUsedModels.slice(0, 5).map((item, index) => (
              <div
                key={item.model}
                style={{
                  background: 'var(--metric-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ 
                    color: 'var(--accent-color)', 
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {item.model}
                  </span>
                </div>
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.9rem'
                }}>
                  {item.count} {item.count === 1 ? 'conversation' : 'conversations'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Conversation Analytics */}
      {conversationAnalytics && selectedConversation && (
        <div>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontWeight: 600, 
            marginBottom: '15px',
            fontSize: isMobile ? '1.1rem' : '1.2rem'
          }}>
            📈 Current Conversation
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
            gap: '15px' 
          }}>
            <div className="metric-card">
              <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                Word Count
              </h4>
              <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                {formatNumber(conversationAnalytics.wordCount)}
              </div>
            </div>

            <div className="metric-card">
              <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                Token Usage
              </h4>
              <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                {formatNumber(conversationAnalytics.tokenUsage.total)}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Input: {formatNumber(conversationAnalytics.tokenUsage.input)} • 
                  Output: {formatNumber(conversationAnalytics.tokenUsage.output)}
                </div>
              </div>
            </div>

            <div className="metric-card">
              <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                Messages
              </h4>
              <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                {conversationAnalytics.messageCount}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  User: {conversationAnalytics.userMessageCount} • 
                  Assistant: {conversationAnalytics.assistantMessageCount}
                </div>
              </div>
            </div>

            <div className="metric-card">
              <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                Avg Response Time
              </h4>
              <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                {conversationAnalytics.averageResponseTime > 0
                  ? formatDuration(conversationAnalytics.averageResponseTime)
                  : 'N/A'}
              </div>
            </div>

            <div className="metric-card">
              <h4 className="metric-title" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                Duration
              </h4>
              <div className="metric-value" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                {conversationAnalytics.duration > 0
                  ? formatDuration(conversationAnalytics.duration)
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

