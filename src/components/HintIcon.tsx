import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface HintIconProps {
  text: string;
}

export const HintIcon: React.FC<HintIconProps> = ({ text }) => {
  const [tooltipState, setTooltipState] = useState<{ top: number; right: number } | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | null>(null);
  
  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setTooltipState({
          top: rect.top - 10,
          right: window.innerWidth - rect.right
        });
      }
    });
  };
  
  const handleMouseLeave = () => {
    // Small delay to prevent flicker when moving between icon and tooltip
    timeoutRef.current = window.setTimeout(() => {
      setTooltipState(null);
    }, 50);
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const tooltipContent = tooltipState ? (
    <div
      style={{
        position: 'fixed',
        bottom: 'auto',
        top: `${tooltipState.top}px`,
        right: `${tooltipState.right}px`,
        transform: 'translateY(-100%)',
        padding: '14px 18px',
        background: 'var(--tooltip-bg)',
        border: '2px solid var(--tooltip-border)',
        borderRadius: '10px',
        color: 'var(--tooltip-text)',
        fontSize: '0.95rem',
        lineHeight: '1.6',
        zIndex: 99999,
        minWidth: '280px',
        maxWidth: '450px',
        whiteSpace: 'normal',
        boxShadow: `0 10px 30px var(--tooltip-shadow), 0 4px 12px rgba(0, 0, 0, 0.15)`,
        fontWeight: 400,
        pointerEvents: 'none'
      }}
      onMouseEnter={() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }}
      onMouseLeave={handleMouseLeave}
    >
      {text}
      {/* Arrow pointing down */}
      <div
        style={{
          position: 'absolute',
          bottom: '-8px',
          right: '20px',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid var(--tooltip-border)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          right: '22px',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid var(--bg-primary)'
        }}
      />
    </div>
  ) : null;
  
  return (
    <>
      <span
        ref={iconRef}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'var(--tooltip-icon-bg)',
          color: 'var(--tooltip-icon-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'all 0.2s',
          border: '1px solid var(--tooltip-border)'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        ?
      </span>
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
};

