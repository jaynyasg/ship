import type { AssistantChatResponse } from '@ship/shared';

export interface AssistantEvalCase {
  id: string;
  question: string;
  expectedCitationTitles?: string[];
  requiredAnswerTerms?: string[];
}

export interface AssistantEvalCaseResult {
  id: string;
  passed: boolean;
  score: number;
  checks: {
    cited: boolean;
    expectedCitations: boolean;
    requiredTerms: boolean;
  };
  missingCitationTitles: string[];
  missingTerms: string[];
}

export interface AssistantEvalReport {
  total: number;
  passed: number;
  score: number;
  cases: AssistantEvalCaseResult[];
}

export function evaluateAssistantResponses(
  cases: AssistantEvalCase[],
  responses: Record<string, AssistantChatResponse>,
): AssistantEvalReport {
  const results = cases.map((testCase) => evaluateAssistantResponse(testCase, responses[testCase.id]));
  const passed = results.filter((result) => result.passed).length;
  const score = results.length === 0
    ? 0
    : Number((results.reduce((sum, result) => sum + result.score, 0) / results.length).toFixed(3));

  return {
    total: results.length,
    passed,
    score,
    cases: results,
  };
}

export function evaluateAssistantResponse(
  testCase: AssistantEvalCase,
  response: AssistantChatResponse | undefined,
): AssistantEvalCaseResult {
  const citationTitles = new Set((response?.citations ?? []).map((citation) => citation.title.toLowerCase()));
  const answer = response?.message.content.toLowerCase() ?? '';
  const expectedTitles = testCase.expectedCitationTitles ?? [];
  const requiredTerms = testCase.requiredAnswerTerms ?? [];

  const missingCitationTitles = expectedTitles
    .filter((title) => !citationTitles.has(title.toLowerCase()));
  const missingTerms = requiredTerms
    .filter((term) => !answer.includes(term.toLowerCase()));

  const cited = (response?.citations.length ?? 0) > 0;
  const expectedCitations = missingCitationTitles.length === 0;
  const requiredAnswerTerms = missingTerms.length === 0;
  const score = [
    cited,
    expectedCitations,
    requiredAnswerTerms,
  ].filter(Boolean).length / 3;

  return {
    id: testCase.id,
    passed: score === 1,
    score: Number(score.toFixed(3)),
    checks: {
      cited,
      expectedCitations,
      requiredTerms: requiredAnswerTerms,
    },
    missingCitationTitles,
    missingTerms,
  };
}
