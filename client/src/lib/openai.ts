// This file is for any client-side OpenAI utilities if needed
// Most OpenAI calls should be made from the server for security

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  id: string;
  messages: ChatMessage[];
  updatedAt: string;
}
