import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversation } from '../../hooks/useConversation';
import type { Message } from '../../types';

describe('Conversation History Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save conversation to history', async () => {
    const { result } = renderHook(() => useConversation());
    
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      { id: '2', role: 'assistant', content: 'Hi there', timestamp: new Date() }
    ];

    act(() => {
      result.current.setMessages(messages);
    });

    // Save to history (title is auto-generated from first message)
    act(() => {
      result.current.saveConversationToList('LM Studio', 'http://localhost:1234');
    });

    await waitFor(() => {
      const saved = result.current.getSavedConversations();
      expect(saved.length).toBe(1);
      expect(saved[0].title).toBe('Hello'); // Auto-generated from first message
      expect(saved[0].messages).toHaveLength(2);
    });
  });

  it('should load conversation from history', async () => {
    const { result } = renderHook(() => useConversation());
    
    // Create and save a conversation
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      { id: '2', role: 'assistant', content: 'Hi there', timestamp: new Date() }
    ];

    act(() => {
      result.current.setMessages(messages);
    });
    
    await waitFor(() => {
      expect(result.current.messages.length).toBe(2);
    });

    act(() => {
      result.current.saveConversationToList('LM Studio', 'http://localhost:1234');
    });

    await waitFor(() => {
      const saved = result.current.getSavedConversations();
      expect(saved.length).toBe(1);
    });
    
    // Load conversation
    const saved = result.current.getSavedConversations();
    expect(saved.length).toBe(1);
    
    const loaded = result.current.loadConversationFromList(saved[0].id);
    
    expect(loaded).not.toBeNull();
    if (loaded) {
      act(() => {
        result.current.setMessages(loaded.messages);
      });
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Hello');
      });
    }
  });

  it('should delete conversation from history', async () => {
    const { result } = renderHook(() => useConversation());
    
    // Create and save a conversation
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() }
    ];

    act(() => {
      result.current.setMessages(messages);
    });
    
    await waitFor(() => {
      expect(result.current.messages.length).toBe(1);
    });

    act(() => {
      result.current.saveConversationToList('LM Studio', 'http://localhost:1234');
    });

    await waitFor(() => {
      const saved = result.current.getSavedConversations();
      expect(saved.length).toBe(1);
    });

    // Delete conversation
    const saved = result.current.getSavedConversations();
    act(() => {
      result.current.deleteConversation(saved[0].id);
    });

    await waitFor(() => {
      const savedAfter = result.current.getSavedConversations();
      expect(savedAfter.length).toBe(0);
    });
  });

  it('should rename conversation in history', async () => {
    const { result } = renderHook(() => useConversation());
    
    // Create and save a conversation
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() }
    ];

    act(() => {
      result.current.setMessages(messages);
    });
    
    await waitFor(() => {
      expect(result.current.messages.length).toBe(1);
    });

    act(() => {
      result.current.saveConversationToList('LM Studio', 'http://localhost:1234');
    });
    
    // Wait for save to complete
    await waitFor(() => {
      const saved = result.current.getSavedConversations();
      expect(saved.length).toBe(1);
    });
    
    // Rename conversation
    const saved = result.current.getSavedConversations();
    act(() => {
      result.current.renameConversation(saved[0].id, 'New Title');
    });

    await waitFor(() => {
      const savedAfter = result.current.getSavedConversations();
      expect(savedAfter.length).toBe(1);
      expect(savedAfter[0].title).toBe('New Title');
    });
  });

  it('should clear current conversation', async () => {
    const { result } = renderHook(() => useConversation());
    
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() }
    ];

    act(() => {
      result.current.setMessages(messages);
    });

    await waitFor(() => {
      expect(result.current.messages.length).toBe(1);
    });

    // Clear conversation
    act(() => {
      result.current.clearConversation();
    });

    await waitFor(() => {
      expect(result.current.messages.length).toBe(0);
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


