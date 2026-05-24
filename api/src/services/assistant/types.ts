import type {
  AssistantCitation,
  AssistantRouteContext,
  AssistantSourceType,
} from '@ship/shared';

export interface AssistantRequestContext {
  userId: string;
  workspaceId: string;
  workspaceRole?: string | null;
  isSuperAdmin?: boolean;
}

export interface AssistantRetrievedSource {
  sourceType: AssistantSourceType;
  sourceId: string;
  title: string;
  url: string;
  excerpt: string;
  score: number;
}

export interface AssistantRetrievalInput extends AssistantRequestContext {
  message: string;
  routeContext?: AssistantRouteContext;
  maxSources?: number;
}

export interface PromptBuildResult {
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  citations: AssistantCitation[];
}
