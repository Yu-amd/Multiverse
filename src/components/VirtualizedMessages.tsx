import React, { useRef, useEffect, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import type { Message } from '../types';

interface VirtualizedMessagesProps {
  messages: Message[];
  renderMessage: (message: Message, index: number) => React.ReactNode;
  itemHeight?: number;
  overscan?: number;
  className?: string;
}

export interface VirtualizedMessagesRef {
  scrollToBottom: () => void;
  scrollToTop: () => void;
  getScrollContainer: () => HTMLElement | null;
}

/**
 * Virtual scrolling component for chat messages
 * Only renders visible messages plus a buffer (overscan)
 */
export const VirtualizedMessages = forwardRef<VirtualizedMessagesRef, VirtualizedMessagesProps>(({
  messages,
  renderMessage,
  itemHeight: initialItemHeight = 100, // Initial estimate, will be refined
  overscan = 5, // Number of items to render outside visible area
  className = ''
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const [estimatedItemHeight, setEstimatedItemHeight] = useState(initialItemHeight);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      // Try scrolling the container itself first
      if (containerRef.current) {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }
        });
      }
      // Also try scrolling the parent container (for streaming content outside virtualized area)
      if (containerRef.current?.parentElement) {
        requestAnimationFrame(() => {
          const parent = containerRef.current?.parentElement;
          if (parent) {
            parent.scrollTop = parent.scrollHeight;
          }
        });
      }
    },
    scrollToTop: () => {
      if (containerRef.current) {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
        });
      }
      // Also try scrolling the parent container
      if (containerRef.current?.parentElement) {
        requestAnimationFrame(() => {
          const parent = containerRef.current?.parentElement;
          if (parent) {
            parent.scrollTop = 0;
          }
        });
      }
    },
    getScrollContainer: () => (containerRef.current?.parentElement as HTMLElement) || containerRef.current
  }), []);

  // Measure container height with improved detection
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        // Try multiple methods to get accurate height
        let height = 0;
        
        // Method 1: Use getBoundingClientRect for more accurate measurement
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.height > 0) {
          height = rect.height;
        }
        
        // Method 2: Use parent element if container height is 0
        if (height === 0) {
          const parent = containerRef.current.parentElement;
          if (parent) {
            const parentRect = parent.getBoundingClientRect();
            if (parentRect.height > 0) {
              height = parentRect.height;
            } else {
              // Method 3: Use computed styles as fallback
              const computedStyle = window.getComputedStyle(parent);
              const heightValue = computedStyle.height;
              if (heightValue && heightValue !== 'auto' && heightValue !== '0px') {
                height = parseFloat(heightValue);
              }
            }
          }
        }
        
        // Method 4: Use clientHeight as last resort
        if (height === 0 && containerRef.current.clientHeight > 0) {
          height = containerRef.current.clientHeight;
        }
        
        // Only update if we got a valid height
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    };

    // Initial measurement
    updateHeight();
    
    // Use ResizeObserver for dynamic height tracking
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      // Observe the container itself
      resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });
      resizeObserver.observe(containerRef.current);
      
      // Also observe parent if available
      if (containerRef.current.parentElement) {
        resizeObserver.observe(containerRef.current.parentElement);
      }
    }
    
    // Also listen to window resize
    window.addEventListener('resize', updateHeight);
    
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
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

    // Calculate cumulative heights using measured heights or improved estimate
    let cumulativeHeight = 0;
    const heights: number[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      // Use measured height if available, otherwise use improved estimate
      const height = itemHeights.get(i) || estimatedItemHeight;
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
  }, [messages.length, scrollTop, containerHeight, estimatedItemHeight, overscan, itemHeights]);

  // Measure actual item heights and improve estimation
  const measureRef = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const newHeights = new Map(itemHeights);
      const measuredHeights: number[] = [];
      
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
        const height = entry.contentRect.height;
        newHeights.set(index, height);
        measuredHeights.push(height);
      });
      
      setItemHeights(newHeights);
      
      // Improve height estimation by calculating average from measured heights
      if (measuredHeights.length > 0) {
        const averageHeight = measuredHeights.reduce((sum, h) => sum + h, 0) / measuredHeights.length;
        // Update estimated height with weighted average (70% new, 30% old) for stability
        setEstimatedItemHeight(prev => prev === initialItemHeight 
          ? averageHeight 
          : averageHeight * 0.7 + prev * 0.3
        );
      }
    });

    measureRef.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [itemHeights, initialItemHeight]);
  
  // Calculate average height from first few measured messages for better initial estimation
  useEffect(() => {
    if (itemHeights.size > 0 && itemHeights.size <= 5) {
      // For the first few messages, calculate average
      const heights = Array.from(itemHeights.values());
      const average = heights.reduce((sum, h) => sum + h, 0) / heights.length;
      if (average > 0 && estimatedItemHeight === initialItemHeight) {
        setEstimatedItemHeight(average);
      }
    }
  }, [itemHeights.size, initialItemHeight, estimatedItemHeight]);

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
            minHeight: estimatedItemHeight,
            position: 'relative'
          }}
        >
          {renderMessage(message, absoluteIndex)}
        </div>
      );
    });
  }, [messages, startIndex, endIndex, renderMessage, estimatedItemHeight]);

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
});

VirtualizedMessages.displayName = 'VirtualizedMessages';

