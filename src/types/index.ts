export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  edited?: boolean;
  originalContent?: string;
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

