import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { Message } from '../types';

interface VirtualizedMessagesProps {
  messages: Message[];
  renderMessage: (message: Message, index: number) => React.ReactNode;
  itemHeight?: number;
  overscan?: number;
  className?: string;
}

/**
 * Virtual scrolling component for chat messages
 * Only renders visible messages plus a buffer (overscan)
 */
export const VirtualizedMessages: React.FC<VirtualizedMessagesProps> = ({
  messages,
  renderMessage,
  itemHeight = 100, // Estimated average height per message
  overscan = 5, // Number of items to render outside visible area
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());

  // Measure container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        // Get the parent container height if available
        const parent = containerRef.current.parentElement;
        if (parent) {
          setContainerHeight(parent.clientHeight);
        } else {
          setContainerHeight(containerRef.current.clientHeight);
        }
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    // Use ResizeObserver for more accurate height tracking
    if (containerRef.current?.parentElement) {
      const resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });
      resizeObserver.observe(containerRef.current.parentElement);
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateHeight);
      };
    }
    
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate visible range
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    if (messages.length === 0) {
      return { startIndex: 0, endIndex: 0, totalHeight: 0, offsetY: 0 };
    }

    // Calculate cumulative heights
    let cumulativeHeight = 0;
    const heights: number[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const height = itemHeights.get(i) || itemHeight;
      heights.push(height);
      cumulativeHeight += height;
    }

    // Find start index
    let start = 0;
    let currentHeight = 0;
    for (let i = 0; i < messages.length; i++) {
      if (currentHeight + heights[i] > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
      currentHeight += heights[i];
    }

    // Find end index
    const visibleHeight = scrollTop + containerHeight;
    let end = messages.length - 1;
    currentHeight = 0;
    for (let i = 0; i < messages.length; i++) {
      currentHeight += heights[i];
      if (currentHeight > visibleHeight) {
        end = Math.min(messages.length - 1, i + overscan);
        break;
      }
    }

    // Calculate offset for first visible item
    let offset = 0;
    for (let i = 0; i < start; i++) {
      offset += heights[i];
    }

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: cumulativeHeight,
      offsetY: offset
    };
  }, [messages.length, scrollTop, containerHeight, itemHeight, overscan, itemHeights]);

  // Measure actual item heights
  const measureRef = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const newHeights = new Map(itemHeights);
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
        newHeights.set(index, entry.contentRect.height);
      });
      setItemHeights(newHeights);
    });

    measureRef.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [itemHeights]);

  // Render visible messages
  const visibleMessages = useMemo(() => {
    return messages.slice(startIndex, endIndex + 1).map((message, relativeIndex) => {
      const absoluteIndex = startIndex + relativeIndex;
      return (
        <div
          key={message.id}
          ref={(el) => {
            if (el) {
              measureRef.current.set(absoluteIndex, el);
            } else {
              measureRef.current.delete(absoluteIndex);
            }
          }}
          data-index={absoluteIndex}
          style={{
            minHeight: itemHeight,
            position: 'relative'
          }}
        >
          {renderMessage(message, absoluteIndex)}
        </div>
      );
    });
  }, [messages, startIndex, endIndex, renderMessage, itemHeight]);

  // For small message lists, render all messages (no virtualization)
  if (messages.length <= 20) {
    return (
      <div 
        ref={containerRef} 
        className={className}
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0
        }}
      >
        {messages.map((message, index) => (
          <div key={message.id}>
            {renderMessage(message, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        flex: 1,
        minHeight: 0
      }}
    >
      {/* Spacer for items above visible area */}
      <div style={{ height: offsetY }} />
      
      {/* Visible messages */}
      {visibleMessages}
      
      {/* Spacer for items below visible area */}
      <div style={{ height: Math.max(0, totalHeight - offsetY - containerHeight) }} />
    </div>
  );
};

