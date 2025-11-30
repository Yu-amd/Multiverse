/**
 * Session persistence utilities
 * Manages current session and last 3 sessions in localStorage
 */

import type { Message } from '../types';
import { logger } from './logger';

export interface SessionData {
  id: string;
  messages: Message[];
  settings: {
    selectedModel: string;
    customEndpoint: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  timestamp: number;
}

const CURRENT_SESSION_KEY = 'multiverse-current-session';
const SESSION_HISTORY_KEY = 'multiverse-session-history';
const MAX_HISTORY_SESSIONS = 3;

/**
 * Save current session
 */
export function saveCurrentSession(
  messages: Message[],
  settings: {
    selectedModel: string;
    customEndpoint: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
    topP: number;
  }
): void {
  try {
    const sessionData: SessionData = {
      id: 'current',
      messages,
      settings,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(sessionData));
    
    // Also add to history (will be managed by saveToHistory)
    logger.debug('Current session saved');
  } catch (error) {
    logger.warn('Failed to save current session:', error);
  }
}

/**
 * Load current session
 */
export function loadCurrentSession(): SessionData | null {
  try {
    const saved = localStorage.getItem(CURRENT_SESSION_KEY);
    if (saved) {
      const session = JSON.parse(saved) as SessionData;
      // Convert timestamp strings back to Date objects
      session.messages = session.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
      }));
      return session;
    }
  } catch (error) {
    logger.warn('Failed to load current session:', error);
  }
  return null;
}

/**
 * Save current session to history (keeps last 3)
 */
export function saveToHistory(
  messages: Message[],
  settings: {
    selectedModel: string;
    customEndpoint: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
    topP: number;
  }
): void {
  try {
    const history = getSessionHistory();
    const sessionData: SessionData = {
      id: `session-${Date.now()}`,
      messages,
      settings,
      timestamp: Date.now()
    };
    
    // Add to beginning
    history.unshift(sessionData);
    
    // Keep only last MAX_HISTORY_SESSIONS
    const limited = history.slice(0, MAX_HISTORY_SESSIONS);
    
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(limited));
    logger.debug('Session saved to history');
  } catch (error) {
    logger.warn('Failed to save session to history:', error);
  }
}

/**
 * Get session history (last 3 sessions)
 */
export function getSessionHistory(): SessionData[] {
  try {
    const saved = localStorage.getItem(SESSION_HISTORY_KEY);
    if (saved) {
      const history = JSON.parse(saved) as SessionData[];
      // Convert timestamp strings back to Date objects
      return history.map(session => ({
        ...session,
        messages: session.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
        }))
      }));
    }
  } catch (error) {
    logger.warn('Failed to load session history:', error);
  }
  return [];
}

/**
 * Load a session from history by ID
 */
export function loadSessionFromHistory(sessionId: string): SessionData | null {
  const history = getSessionHistory();
  return history.find(s => s.id === sessionId) || null;
}

/**
 * Clear all session data
 */
export function clearAllSessionData(): void {
  try {
    localStorage.removeItem(CURRENT_SESSION_KEY);
    localStorage.removeItem(SESSION_HISTORY_KEY);
    logger.debug('All session data cleared');
  } catch (error) {
    logger.warn('Failed to clear session data:', error);
  }
}

/**
 * Check if there's a recoverable session
 */
export function hasRecoverableSession(): boolean {
  const current = loadCurrentSession();
  return current !== null && current.messages.length > 0;
}

