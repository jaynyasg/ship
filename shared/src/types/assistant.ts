export type AssistantProvider = 'openai' | 'bedrock' | 'mock' | 'unconfigured';

export type AssistantIndexingStatus =
  | 'not_indexed'
  | 'indexing'
  | 'indexed'
  | 'unsupported'
  | 'failed';

export type AssistantSourceType =
  | 'document'
  | 'project'
  | 'program'
  | 'issue'
  | 'week'
  | 'timeline'
  | 'file';

export type AssistantMessageRole = 'user' | 'assistant';

export type AssistantChatStatus =
  | 'answered'
  | 'no_context'
  | 'unavailable'
  | 'rate_limited'
  | 'error';

export type AssistantErrorCode =
  | 'ASSISTANT_UNAVAILABLE'
  | 'MESSAGE_REQUIRED'
  | 'MESSAGE_TOO_LONG'
  | 'RATE_LIMITED'
  | 'MODEL_ERROR'
  | 'RETRIEVAL_ERROR';

export interface AssistantStatusResponse {
  enabled: boolean;
  available: boolean;
  provider: AssistantProvider;
  model: string | null;
  missingConfiguration: string[];
  uploadIndexing: {
    enabled: boolean;
    supportedMimeTypes: string[];
    maxExtractionBytes: number;
    statuses: AssistantIndexingStatus[];
  };
  limits: {
    maxMessageChars: number;
    maxHistoryMessages: number;
    maxContextChunks: number;
  };
}

export interface AssistantClientMessage {
  role: AssistantMessageRole;
  content: string;
}

export interface AssistantRouteContext {
  path?: string;
  documentId?: string;
  documentType?: string;
  projectId?: string;
}

export interface AssistantSourceFilters {
  sourceTypes?: AssistantSourceType[];
}

export interface AssistantChatRequest {
  message: string;
  history?: AssistantClientMessage[];
  context?: AssistantRouteContext;
  filters?: AssistantSourceFilters;
}

export interface AssistantCitation {
  id: string;
  sourceType: AssistantSourceType;
  sourceId: string;
  title: string;
  url: string;
  excerpt: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  content: string;
  createdAt: string;
}

export interface AssistantSourceCounts {
  documents: number;
  projects: number;
  programs: number;
  issues: number;
  weeks: number;
  timeline: number;
  files: number;
  total: number;
}

export interface AssistantError {
  code: AssistantErrorCode;
  message: string;
}

export interface AssistantChatResponse {
  status: AssistantChatStatus;
  message: AssistantMessage;
  citations: AssistantCitation[];
  sourceCounts: AssistantSourceCounts;
  error?: AssistantError;
}
