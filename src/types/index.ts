export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  edited?: boolean;
  originalContent?: string;
  metrics?: {
    timeToFirstToken?: number; // milliseconds
    totalTime?: number; // milliseconds
    tokensPerSecond?: number;
    tokensIn?: number;
    tokensOut?: number;
  };
}

export interface SavedConversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  model: string;
  endpoint: string;
}

