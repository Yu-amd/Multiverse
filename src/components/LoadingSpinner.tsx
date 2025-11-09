import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 20,
  color,
  className = ''
}) => {
  return (
    <div
      className={`loading-spinner ${className}`}
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, size / 10)}px solid ${color || 'var(--border-color)'}`,
        borderTopColor: color || 'var(--accent-color)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        display: 'inline-block'
      }}
      aria-label="Loading"
      role="status"
    />
  );
};

