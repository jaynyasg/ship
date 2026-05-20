/**
 * Timeline schemas - Microsoft Project-inspired read model
 */

import { z, registry } from '../registry.js';
import { UuidSchema, DateSchema, DateTimeSchema } from './common.js';

export const TimelineScopeTypeSchema = z.enum(['project', 'program']).openapi({
  description: 'Timeline scope type',
});

export const TimelineDocumentTypeSchema = z.enum(['program', 'project', 'sprint', 'issue']).openapi({
  description: 'Document types that can appear as timeline rows',
});

export const TimelineDependencyEdgeSchema = z.object({
  source_id: UuidSchema,
  target_id: UuidSchema,
  relationship_type: z.literal('depends_on'),
  source_in_scope: z.boolean(),
  target_in_scope: z.boolean(),
  source_title: z.string().optional(),
  target_title: z.string().optional(),
  source_document_type: TimelineDocumentTypeSchema.optional(),
  target_document_type: TimelineDocumentTypeSchema.optional(),
  target_status: z.string().nullable().optional(),
  is_blocking: z.boolean(),
}).openapi('TimelineDependencyEdge');

registry.register('TimelineDependencyEdge', TimelineDependencyEdgeSchema);

export const TimelineRowSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  document_type: TimelineDocumentTypeSchema,
  status: z.string().nullable(),
  planned_start: DateSchema.nullable(),
  planned_end: DateSchema.nullable(),
  actual_start: DateSchema.nullable(),
  actual_end: DateSchema.nullable(),
  program_ids: z.array(UuidSchema),
  project_ids: z.array(UuidSchema),
  sprint_ids: z.array(UuidSchema),
  dependency_ids: z.array(UuidSchema),
  blocker_ids: z.array(UuidSchema),
  blocks_ids: z.array(UuidSchema),
  blocked: z.boolean(),
  overdue: z.boolean(),
  at_risk: z.boolean(),
  sprint_number: z.number().int().positive().nullable().optional(),
}).openapi('TimelineRow');

registry.register('TimelineRow', TimelineRowSchema);

export const TimelineResponseSchema = z.object({
  scope: z.object({
    id: UuidSchema,
    type: TimelineScopeTypeSchema,
    title: z.string(),
  }),
  generated_at: DateTimeSchema,
  rows: z.array(TimelineRowSchema),
  dependencies: z.array(TimelineDependencyEdgeSchema),
  summary: z.object({
    total_rows: z.number().int(),
    dependency_count: z.number().int(),
    blocked_count: z.number().int(),
    overdue_count: z.number().int(),
    at_risk_count: z.number().int(),
  }),
}).openapi('TimelineResponse');

registry.register('TimelineResponse', TimelineResponseSchema);

registry.registerPath({
  method: 'get',
  path: '/projects/{id}/timeline',
  tags: ['Projects'],
  summary: 'Get project timeline',
  description: 'Returns a bounded timeline read model for a project, including related weeks, issues, dependency edges, and blocked/at-risk flags.',
  request: {
    params: z.object({
      id: UuidSchema,
    }),
  },
  responses: {
    200: {
      description: 'Project timeline',
      content: {
        'application/json': {
          schema: TimelineResponseSchema,
        },
      },
    },
    404: {
      description: 'Project not found',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/programs/{id}/timeline',
  tags: ['Programs'],
  summary: 'Get program timeline',
  description: 'Returns a bounded timeline read model for a program, including related projects, weeks, issues, dependency edges, and blocked/at-risk flags.',
  request: {
    params: z.object({
      id: UuidSchema,
    }),
  },
  responses: {
    200: {
      description: 'Program timeline',
      content: {
        'application/json': {
          schema: TimelineResponseSchema,
        },
      },
    },
    404: {
      description: 'Program not found',
    },
  },
});
