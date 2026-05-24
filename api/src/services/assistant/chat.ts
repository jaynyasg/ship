import { randomUUID } from 'crypto';
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantSourceCounts,
} from '@ship/shared';
import { retrieveAssistantSources } from './retriever.js';
import { buildAssistantPrompt } from './prompt.js';
import { AssistantProviderError, generateAssistantAnswer } from './llm.js';
import type { AssistantRequestContext } from './types.js';

export async function answerAssistantQuestion(input: {
  request: AssistantChatRequest;
} & AssistantRequestContext): Promise<AssistantChatResponse> {
  try {
    const sources = await retrieveAssistantSources({
      userId: input.userId,
      workspaceId: input.workspaceId,
      workspaceRole: input.workspaceRole,
      isSuperAdmin: input.isSuperAdmin,
      message: input.request.message,
      routeContext: input.request.context,
    });

    if (sources.length === 0) {
      return response(
        'no_context',
        'I could not find enough Ship context to answer that. Try asking from a project, issue, timeline, or document page.',
        [],
        sourceCounts([]),
      );
    }

    const prompt = buildAssistantPrompt({
      request: input.request,
      sources,
    });
    const content = await generateAssistantAnswer({
      messages: prompt.messages,
      citationIds: prompt.citations.map((citation) => citation.id),
    });

    return response('answered', content, prompt.citations, sourceCounts(sources));
  } catch (error) {
    if (error instanceof AssistantProviderError) {
      return response(
        'error',
        'Ask Ship found relevant context, but the model provider could not complete the answer. Try again in a moment.',
        [],
        sourceCounts([]),
        { code: 'MODEL_ERROR', message: 'Assistant model provider failed' },
      );
    }

    console.error('Ask Ship retrieval error:', error);
    return response(
      'error',
      'Ask Ship could not retrieve Ship context for that question.',
      [],
      sourceCounts([]),
      { code: 'RETRIEVAL_ERROR', message: 'Assistant retrieval failed' },
    );
  }
}

function response(
  status: AssistantChatResponse['status'],
  content: string,
  citations: AssistantChatResponse['citations'],
  counts: AssistantSourceCounts,
  error?: AssistantChatResponse['error'],
): AssistantChatResponse {
  return {
    status,
    message: {
      id: randomUUID(),
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    },
    citations,
    sourceCounts: counts,
    error,
  };
}

function sourceCounts(sources: Array<{ sourceType: string }>): AssistantSourceCounts {
  const counts: AssistantSourceCounts = {
    documents: 0,
    projects: 0,
    programs: 0,
    issues: 0,
    weeks: 0,
    timeline: 0,
    files: 0,
    total: sources.length,
  };

  for (const source of sources) {
    if (source.sourceType === 'document') counts.documents++;
    if (source.sourceType === 'project') counts.projects++;
    if (source.sourceType === 'program') counts.programs++;
    if (source.sourceType === 'issue') counts.issues++;
    if (source.sourceType === 'week') counts.weeks++;
    if (source.sourceType === 'timeline') counts.timeline++;
    if (source.sourceType === 'file') counts.files++;
  }

  return counts;
}
