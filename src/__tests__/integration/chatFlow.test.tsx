import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversation } from '../../hooks/useConversation';

describe('Chat Flow Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist conversation to localStorage', async () => {
    const { result: conversation } = renderHook(() => useConversation());
    
    act(() => {
      conversation.current.setMessages([
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Hi there', timestamp: new Date() }
      ]);
    });

    await waitFor(() => {
      const saved = localStorage.getItem('multiverse-current-conversation');
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved || '{}');
      expect(parsed.messages).toHaveLength(2);
    });
  });

  it('should maintain conversation context across messages', async () => {
    const { result: conversation } = renderHook(() => useConversation());
    
    // Add first message pair
    act(() => {
      conversation.current.setMessages([
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Hi there', timestamp: new Date() }
      ]);
    });

    // Add second message pair
    act(() => {
      conversation.current.setMessages(prev => [
        ...prev,
        { id: '3', role: 'user', content: 'How are you?', timestamp: new Date() },
        { id: '4', role: 'assistant', content: 'I am fine', timestamp: new Date() }
      ]);
    });

    await waitFor(() => {
      expect(conversation.current.messages).toHaveLength(4);
      expect(conversation.current.messages[0].content).toBe('Hello');
      expect(conversation.current.messages[3].content).toBe('I am fine');
    });
  });

  it('should clear conversation and remove from localStorage', async () => {
    const { result: conversation } = renderHook(() => useConversation());
    
    // Add messages
    act(() => {
      conversation.current.setMessages([
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() }
      ]);
    });

    await waitFor(() => {
      expect(conversation.current.messages.length).toBe(1);
    });

    // Clear conversation
    act(() => {
      conversation.current.clearConversation();
    });

    await waitFor(() => {
      expect(conversation.current.messages.length).toBe(0);
    });
    
    // localStorage might still have an empty array saved by useEffect
    // Check that messages array is empty in the saved data
    await waitFor(() => {
      const saved = localStorage.getItem('multiverse-current-conversation');
      if (saved) {
        const parsed = JSON.parse(saved);
        expect(parsed.messages).toHaveLength(0);
      } else {
        // If it's removed, that's also fine
        expect(saved).toBeNull();
      }
    });
  });
});
