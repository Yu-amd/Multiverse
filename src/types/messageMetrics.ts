/**
 * Message-level metrics for latency and throughput tracking
 */

export interface MessageMetrics {
  messageId: string;
  timeToFirstToken: number; // milliseconds
  totalTime: number; // milliseconds
  tokensPerSecond: number;
  tokensIn: number;
  tokensOut: number;
  promptLength: number;
  responseLength: number;
}

export interface SessionMetrics {
  totalMessages: number;
  averageTimeToFirstToken: number;
  averageTokensPerSecond: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTime: number;
  messages: MessageMetrics[];
}

