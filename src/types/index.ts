export type SuggestionType = 'QUESTION TO ASK' | 'TALKING POINT' | 'ANSWER' | 'FACT-CHECK';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  preview: string;
  feedback?: 'up' | 'down' | null;
}

export interface SuggestionBatch {
  id: string;
  batchNumber: number;
  timestamp: Date;
  suggestions: Suggestion[];
}

export interface TranscriptChunk {
  id: string;
  timestamp: Date;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AppSettings {
  groqApiKey: string;
  suggestionPrompt: string;
  detailedAnswerPrompt: string;
  chatPrompt: string;
  suggestionContextWindow: number; // number of recent transcript chunks to use
  detailedAnswerContextWindow: number;
  autoRefreshInterval: number; // seconds
}

export interface SessionExport {
  exportedAt: string;
  transcript: Array<{ timestamp: string; text: string }>;
  suggestionBatches: Array<{
    batchNumber: number;
    timestamp: string;
    suggestions: Array<{ type: string; preview: string }>;
  }>;
  chat: Array<{ role: string; content: string; timestamp: string }>;
}

export type MeetingMode = 'interview' | 'sales' | 'brainstorm' | 'lecture' | 'general';

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  deadline?: string;
}
