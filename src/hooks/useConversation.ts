import { useState, useEffect } from 'react';
import type { Message, SavedConversation } from '../types';

export const useConversation = () => {
  const loadConversation = (): Message[] => {
    try {
      const saved = localStorage.getItem('multiverse-current-conversation');
      if (saved) {
        const conversation = JSON.parse(saved);
        const loadedMessages = conversation.messages || [];
        // Ensure all messages have IDs and edited flags
        return loadedMessages.map((msg: any) => ({
          ...msg,
          id: msg.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          edited: msg.edited || false,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));
      }
    } catch (e) {
      console.warn('Failed to load conversation:', e);
    }
    return [];
  };

  const [messages, setMessages] = useState<Message[]>(loadConversation());

  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    try {
      const conversation = {
        messages: messages,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('multiverse-current-conversation', JSON.stringify(conversation));
    } catch (e) {
      console.warn('Failed to save conversation:', e);
    }
  }, [messages]);

  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem('multiverse-current-conversation');
  };

  const getSavedConversations = (): SavedConversation[] => {
    try {
      const saved = localStorage.getItem('multiverse-conversations');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    }
    return [];
  };

  const saveConversationToList = (model: string, endpoint: string) => {
    if (messages.length === 0) return;
    
    try {
      const conversations = getSavedConversations();
      const conversation: SavedConversation = {
        id: Date.now().toString(),
        title: messages[0]?.content.substring(0, 50) || 'New Conversation',
        messages: messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: model,
        endpoint: endpoint
      };
      conversations.unshift(conversation); // Add to beginning
      // Keep only last 50 conversations
      const limited = conversations.slice(0, 50);
      localStorage.setItem('multiverse-conversations', JSON.stringify(limited));
      return true;
    } catch (e) {
      console.warn('Failed to save conversation:', e);
      return false;
    }
  };

  const loadConversationFromList = (conversationId: string): { messages: Message[]; model: string; endpoint: string } | null => {
    try {
      const conversations = getSavedConversations();
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        return {
          messages: conversation.messages,
          model: conversation.model,
          endpoint: conversation.endpoint
        };
      }
    } catch (e) {
      console.warn('Failed to load conversation:', e);
    }
    return null;
  };

  const deleteConversation = (conversationId: string) => {
    try {
      const conversations = getSavedConversations();
      const filtered = conversations.filter(c => c.id !== conversationId);
      localStorage.setItem('multiverse-conversations', JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete conversation:', e);
    }
  };

  return {
    messages,
    setMessages,
    clearConversation,
    getSavedConversations,
    saveConversationToList,
    loadConversationFromList,
    deleteConversation
  };
};

