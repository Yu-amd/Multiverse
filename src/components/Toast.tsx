import React, { useEffect, useRef } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const onCloseRef = useRef(onClose);
  
  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, 4000); // Auto-dismiss after 4 seconds (middle of 3-5 range)
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount

  const colors = {
    success: { bg: '#238636', border: '#2ea043' },
    error: { bg: '#da3633', border: '#f85149' },
    info: { bg: '#1f6feb', border: '#58a6ff' }
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  return (
    <div
      style={{
        position: 'relative',
        background: colors[type].bg,
        border: `1px solid ${colors[type].border}`,
        borderRadius: '6px',
        padding: '12px 16px',
        color: '#fff',
        fontSize: '0.9rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '200px',
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease-out',
        marginBottom: '10px'
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{icons[type]}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '0',
          lineHeight: '1'
        }}
      >
        ×
      </button>
    </div>
  );
};

