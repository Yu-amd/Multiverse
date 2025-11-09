// Analytics utilities for conversation statistics

import type { Message, SavedConversation } from '../types';

/**
 * Estimate token count from text
 * Rough approximation: 1 token ≈ 4 characters or 0.75 words
 */
export const estimateTokens = (text: string): number => {
  // Simple estimation: average of character-based and word-based estimates
  const charEstimate = text.length / 4;
  const wordEstimate = text.split(/\s+/).filter(w => w.length > 0).length * 1.33;
  return Math.round((charEstimate + wordEstimate) / 2);
};

/**
 * Calculate word count for a conversation
 */
export const calculateWordCount = (messages: Message[]): number => {
  return messages.reduce((total, msg) => {
    const words = msg.content.split(/\s+/).filter(w => w.length > 0);
    return total + words.length;
  }, 0);
};

/**
 * Calculate token usage for a conversation
 */
export const calculateTokenUsage = (messages: Message[]): { input: number; output: number; total: number } => {
  let inputTokens = 0;
  let outputTokens = 0;

  messages.forEach(msg => {
    const tokens = estimateTokens(msg.content);
    if (msg.role === 'user') {
      inputTokens += tokens;
    } else {
      outputTokens += tokens;
    }
  });

  return {
    input: inputTokens,
    output: outputTokens,
    total: inputTokens + outputTokens
  };
};

/**
 * Helper function to convert timestamp to Date object
 */
const toDate = (timestamp: Date | string): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

/**
 * Calculate average response time for a conversation
 * Estimates based on message timestamps
 */
export const calculateAverageResponseTime = (messages: Message[]): number => {
  if (messages.length < 2) return 0;

  let totalTime = 0;
  let responseCount = 0;

  for (let i = 1; i < messages.length; i++) {
    const prevMsg = messages[i - 1];
    const currentMsg = messages[i];

    // Only calculate if previous was user message and current is assistant
    if (prevMsg.role === 'user' && currentMsg.role === 'assistant') {
      try {
        const prevTime = toDate(prevMsg.timestamp);
        const currentTime = toDate(currentMsg.timestamp);
        const timeDiff = currentTime.getTime() - prevTime.getTime();
        if (timeDiff > 0 && timeDiff < 300000) { // Ignore unrealistic times (> 5 minutes)
          totalTime += timeDiff;
          responseCount++;
        }
      } catch (e) {
        // Skip invalid timestamps
        console.warn('Invalid timestamp in message:', e);
      }
    }
  }

  return responseCount > 0 ? totalTime / responseCount : 0;
};

/**
 * Get most used models from saved conversations
 */
export const getMostUsedModels = (conversations: SavedConversation[]): Array<{ model: string; count: number }> => {
  const modelCounts = new Map<string, number>();

  conversations.forEach(conv => {
    const count = modelCounts.get(conv.model) || 0;
    modelCounts.set(conv.model, count + 1);
  });

  return Array.from(modelCounts.entries())
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Calculate overall analytics from all conversations
 */
export interface ConversationAnalytics {
  totalConversations: number;
  totalMessages: number;
  totalWords: number;
  totalTokens: { input: number; output: number; total: number };
  averageMessagesPerConversation: number;
  averageWordsPerConversation: number;
  averageResponseTime: number;
  mostUsedModels: Array<{ model: string; count: number }>;
  totalConversationTime: number; // Total time span of all conversations
}

export const calculateOverallAnalytics = (conversations: SavedConversation[]): ConversationAnalytics => {
  if (conversations.length === 0) {
    return {
      totalConversations: 0,
      totalMessages: 0,
      totalWords: 0,
      totalTokens: { input: 0, output: 0, total: 0 },
      averageMessagesPerConversation: 0,
      averageWordsPerConversation: 0,
      averageResponseTime: 0,
      mostUsedModels: [],
      totalConversationTime: 0
    };
  }

  let totalMessages = 0;
  let totalWords = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalResponseTime = 0;
  let responseCount = 0;
  let earliestDate = new Date();
  let latestDate = new Date(0);

  conversations.forEach(conv => {
    try {
      // Ensure messages have Date objects for timestamps
      const messagesWithDates = conv.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
      }));

      totalMessages += messagesWithDates.length;
      const wordCount = calculateWordCount(messagesWithDates);
      totalWords += wordCount;
      
      const tokenUsage = calculateTokenUsage(messagesWithDates);
      totalInputTokens += tokenUsage.input;
      totalOutputTokens += tokenUsage.output;

      const avgResponseTime = calculateAverageResponseTime(messagesWithDates);
      if (avgResponseTime > 0) {
        totalResponseTime += avgResponseTime;
        responseCount++;
      }

      // Track date range
      const createdAt = new Date(conv.createdAt);
      if (createdAt < earliestDate) earliestDate = createdAt;
      if (createdAt > latestDate) latestDate = createdAt;
    } catch (e) {
      console.warn('Error processing conversation:', e);
      // Continue with other conversations
    }
  });

  const totalConversationTime = latestDate.getTime() - earliestDate.getTime();

  return {
    totalConversations: conversations.length,
    totalMessages,
    totalWords,
    totalTokens: {
      input: totalInputTokens,
      output: totalOutputTokens,
      total: totalInputTokens + totalOutputTokens
    },
    averageMessagesPerConversation: totalMessages / conversations.length,
    averageWordsPerConversation: totalWords / conversations.length,
    averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
    mostUsedModels: getMostUsedModels(conversations),
    totalConversationTime
  };
};

/**
 * Calculate analytics for a single conversation
 */
export interface SingleConversationAnalytics {
  wordCount: number;
  tokenUsage: { input: number; output: number; total: number };
  averageResponseTime: number;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  duration: number; // Time span of conversation in ms
}

export const calculateConversationAnalytics = (conversation: SavedConversation): SingleConversationAnalytics => {
  // Ensure messages have Date objects for timestamps
  const messagesWithDates = conversation.messages.map(msg => ({
    ...msg,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
  }));

  const wordCount = calculateWordCount(messagesWithDates);
  const tokenUsage = calculateTokenUsage(messagesWithDates);
  const averageResponseTime = calculateAverageResponseTime(messagesWithDates);
  
  const userMessages = messagesWithDates.filter(m => m.role === 'user');
  const assistantMessages = messagesWithDates.filter(m => m.role === 'assistant');

  let duration = 0;
  if (messagesWithDates.length > 0) {
    try {
      const firstMsg = messagesWithDates[0];
      const lastMsg = messagesWithDates[messagesWithDates.length - 1];
      const firstTime = toDate(firstMsg.timestamp);
      const lastTime = toDate(lastMsg.timestamp);
      duration = lastTime.getTime() - firstTime.getTime();
    } catch (e) {
      console.warn('Error calculating conversation duration:', e);
      duration = 0;
    }
  }

  return {
    wordCount,
    tokenUsage,
    averageResponseTime,
    messageCount: messagesWithDates.length,
    userMessageCount: userMessages.length,
    assistantMessageCount: assistantMessages.length,
    duration
  };
};

/**
 * Format duration in milliseconds to human-readable string
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
};

/**
 * Format large numbers with commas
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

