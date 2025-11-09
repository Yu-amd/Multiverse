import React from 'react';
import type { Message, SavedConversation } from '../types';

interface ConversationHistoryModalProps {
  showConversationHistory: boolean;
  onClose: () => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  setSelectedModel: (model: string) => void;
  setCustomEndpoint: (endpoint: string) => void;
  getSavedConversations: () => SavedConversation[];
  saveConversationToList: () => void;
  loadConversationFromList: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  exportConversation: (format: 'json' | 'markdown' | 'txt') => void;
  importConversation: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isMobile: boolean;
}

export const ConversationHistoryModal: React.FC<ConversationHistoryModalProps> = ({
  showConversationHistory,
  onClose,
  messages,
  setMessages,
  setSelectedModel,
  setCustomEndpoint,
  getSavedConversations,
  saveConversationToList,
  loadConversationFromList,
  deleteConversation,
  exportConversation,
  importConversation,
  isMobile
}) => {
  if (!showConversationHistory) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
    >
      <div 
        className="modal-content"
        style={{
          padding: isMobile ? '15px' : '20px',
          maxWidth: isMobile ? '95%' : '600px',
          width: '90%',
          maxHeight: isMobile ? '90vh' : '80vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">💬 Conversation History</h2>
          <button 
            className="modal-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Export/Import Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportConversation('json')}
            disabled={messages.length === 0}
            style={{
              background: messages.length === 0 ? 'var(--button-bg)' : 'var(--success-color)',
              color: messages.length === 0 ? 'var(--text-secondary)' : '#fff',
              border: '1px solid',
              borderColor: messages.length === 0 ? 'var(--border-color)' : 'var(--success-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: messages.length === 0 ? 0.7 : 1
            }}
          >
            📥 Export JSON
          </button>
          <button
            onClick={() => exportConversation('markdown')}
            disabled={messages.length === 0}
            style={{
              background: messages.length === 0 ? 'var(--button-bg)' : 'var(--success-color)',
              color: messages.length === 0 ? 'var(--text-secondary)' : '#fff',
              border: '1px solid',
              borderColor: messages.length === 0 ? 'var(--border-color)' : 'var(--success-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: messages.length === 0 ? 0.7 : 1
            }}
          >
            📥 Export Markdown
          </button>
          <button
            onClick={() => exportConversation('txt')}
            disabled={messages.length === 0}
            style={{
              background: messages.length === 0 ? 'var(--button-bg)' : 'var(--success-color)',
              color: messages.length === 0 ? 'var(--text-secondary)' : '#fff',
              border: '1px solid',
              borderColor: messages.length === 0 ? 'var(--border-color)' : 'var(--success-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: messages.length === 0 ? 0.7 : 1
            }}
          >
            📥 Export TXT
          </button>
          <label
            style={{
              background: 'var(--success-color)',
              color: '#fff',
              border: '1px solid var(--success-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'inline-block'
            }}
          >
            📤 Import
            <input
              type="file"
              accept=".json"
              onChange={importConversation}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={saveConversationToList}
            disabled={messages.length === 0}
            style={{
              background: messages.length === 0 ? 'var(--button-bg)' : 'var(--accent-color)',
              color: messages.length === 0 ? 'var(--text-secondary)' : '#fff',
              border: '1px solid',
              borderColor: messages.length === 0 ? 'var(--border-color)' : 'var(--accent-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: messages.length === 0 ? 0.7 : 1
            }}
          >
            💾 Save to History
          </button>
        </div>

        {/* Saved Conversations List */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '15px' }}>Saved Conversations</h3>
          {getSavedConversations().length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No saved conversations yet. Save your current conversation to see it here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {getSavedConversations().map((conv) => (
                <div
                  key={conv.id}
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
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => loadConversationFromList(conv.id)}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                      {conv.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {conv.messages.length} messages • {new Date(conv.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {conv.model} • {conv.endpoint}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setMessages(conv.messages);
                        setSelectedModel(conv.model);
                        setCustomEndpoint(conv.endpoint);
                        onClose();
                      }}
                      style={{
                        background: 'transparent',
                        color: 'var(--accent-color)',
                        border: '1px solid var(--accent-color)',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this conversation?')) {
                          deleteConversation(conv.id);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        color: 'var(--error-color)',
                        border: '1px solid var(--error-color)',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

