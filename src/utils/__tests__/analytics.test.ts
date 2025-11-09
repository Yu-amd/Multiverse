import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  calculateWordCount,
  calculateTokenUsage,
  calculateAverageResponseTime,
  formatDuration,
  formatNumber
} from '../analytics';
import type { Message } from '../../types';

describe('analytics utilities', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens correctly', () => {
      expect(estimateTokens('hello world')).toBeGreaterThan(0);
      expect(estimateTokens('')).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'word '.repeat(1000);
      expect(estimateTokens(longText)).toBeGreaterThan(100);
    });
  });

  describe('calculateWordCount', () => {
    it('should count words in messages', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Hello world', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Hi there', timestamp: new Date() }
      ];
      
      expect(calculateWordCount(messages)).toBe(4);
    });

    it('should handle empty messages', () => {
      expect(calculateWordCount([])).toBe(0);
    });
  });

  describe('calculateTokenUsage', () => {
    it('should calculate token usage', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Hi', timestamp: new Date() }
      ];
      
      const usage = calculateTokenUsage(messages);
      expect(usage.input).toBeGreaterThan(0);
      expect(usage.output).toBeGreaterThan(0);
      expect(usage.total).toBe(usage.input + usage.output);
    });
  });

  describe('calculateAverageResponseTime', () => {
    it('should calculate average response time', () => {
      const messages: Message[] = [
        { 
          id: '1', 
          role: 'user', 
          content: 'Hello', 
          timestamp: new Date('2024-01-01T00:00:00Z')
        },
        { 
          id: '2', 
          role: 'assistant', 
          content: 'Hi', 
          timestamp: new Date('2024-01-01T00:00:01Z')
        }
      ];
      
      const avgTime = calculateAverageResponseTime(messages);
      expect(avgTime).toBeGreaterThan(0);
      expect(avgTime).toBeLessThanOrEqual(1000); // 1 second
    });

    it('should handle messages without timestamps', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() }
      ];
      
      expect(calculateAverageResponseTime(messages)).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(1000)).toContain('1');
      expect(formatDuration(60000)).toContain('1');
      expect(formatDuration(3600000)).toContain('1');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0ms');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(5)).toBe('5');
      expect(formatNumber(100)).toBe('100');
    });
  });
});

