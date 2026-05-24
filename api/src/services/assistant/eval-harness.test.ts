import { describe, expect, it } from 'vitest';
import type { AssistantChatResponse } from '@ship/shared';
import { evaluateAssistantResponses } from './eval-harness.js';

describe('assistant eval harness', () => {
  it('scores required citations and answer terms', () => {
    const response: AssistantChatResponse = {
      status: 'answered',
      message: {
        id: 'msg-1',
        role: 'assistant',
        content: 'The launch is blocked by security review.',
        createdAt: '2026-05-24T00:00:00.000Z',
      },
      citations: [{
        id: 'S1',
        sourceType: 'document',
        sourceId: '00000000-0000-0000-0000-000000000001',
        title: 'Launch Risk Brief',
        url: '/documents/00000000-0000-0000-0000-000000000001',
        excerpt: 'Security review must finish before launch.',
      }],
      sourceCounts: {
        documents: 1,
        projects: 0,
        programs: 0,
        issues: 0,
        weeks: 0,
        timeline: 0,
        files: 0,
        total: 1,
      },
    };

    const report = evaluateAssistantResponses([
      {
        id: 'blocked-launch',
        question: 'What blocks launch?',
        expectedCitationTitles: ['Launch Risk Brief'],
        requiredAnswerTerms: ['blocked', 'security review'],
      },
    ], {
      'blocked-launch': response,
    });

    expect(report.total).toBe(1);
    expect(report.passed).toBe(1);
    expect(report.score).toBe(1);
    expect(report.cases[0]!.checks).toEqual({
      cited: true,
      expectedCitations: true,
      requiredTerms: true,
    });
  });

  it('reports missing expected evidence without hiding partial credit', () => {
    const report = evaluateAssistantResponses([
      {
        id: 'missing',
        question: 'What blocks launch?',
        expectedCitationTitles: ['Launch Risk Brief'],
        requiredAnswerTerms: ['security review'],
      },
    ], {
      missing: {
        status: 'answered',
        message: {
          id: 'msg-2',
          role: 'assistant',
          content: 'Launch risk exists.',
          createdAt: '2026-05-24T00:00:00.000Z',
        },
        citations: [],
        sourceCounts: {
          documents: 0,
          projects: 0,
          programs: 0,
          issues: 0,
          weeks: 0,
          timeline: 0,
          files: 0,
          total: 0,
        },
      },
    });

    expect(report.passed).toBe(0);
    expect(report.cases[0]!.score).toBe(0);
    expect(report.cases[0]!.missingCitationTitles).toEqual(['Launch Risk Brief']);
    expect(report.cases[0]!.missingTerms).toEqual(['security review']);
  });
});
