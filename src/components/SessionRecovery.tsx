import React from 'react';
import { loadCurrentSession, clearAllSessionData } from '../utils/sessionPersistence';
import type { Message } from '../types';

interface SessionRecoveryProps {
  onRestore: (messages: Message[], settings: {
    selectedModel: string;
    customEndpoint: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
    topP: number;
  }) => void;
  onDismiss: () => void;
}

export const SessionRecovery: React.FC<SessionRecoveryProps> = ({
  onRestore,
  onDismiss
}) => {
  const handleRestore = () => {
    const session = loadCurrentSession();
    if (session) {
      onRestore(session.messages, session.settings);
      onDismiss();
    }
  };

  const handleDismiss = () => {
    onDismiss();
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all session data? This cannot be undone.')) {
      clearAllSessionData();
      onDismiss();
    }
  };

  const session = loadCurrentSession();
  if (!session || session.messages.length === 0) {
    return null;
  }

  const messageCount = session.messages.length;
  const timeAgo = Math.floor((Date.now() - session.timestamp) / 1000 / 60); // minutes ago

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: 'var(--bg-secondary)',
        border: '2px solid var(--accent-color)',
        borderRadius: '8px',
        padding: '16px 20px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: 'var(--text-primary)',
          marginBottom: '4px'
        }}>
          📋 Restore Last Session?
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: 'var(--text-secondary)' 
        }}>
          Found a previous session with {messageCount} message{messageCount !== 1 ? 's' : ''} from {timeAgo < 1 ? 'just now' : `${timeAgo} minute${timeAgo !== 1 ? 's' : ''} ago`}
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap' 
      }}>
        <button
          onClick={handleRestore}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: 'var(--accent-color)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            flex: 1,
            minWidth: '120px'
          }}
          aria-label="Restore last session"
        >
          ✅ Restore
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '14px',
            flex: 1,
            minWidth: '120px'
          }}
          aria-label="Dismiss session recovery"
        >
          Dismiss
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid var(--error-color)',
            background: 'transparent',
            color: 'var(--error-color)',
            cursor: 'pointer',
            fontSize: '14px',
            flex: 1,
            minWidth: '120px'
          }}
          aria-label="Clear all session data"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
};

