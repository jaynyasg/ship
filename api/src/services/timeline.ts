import { pool } from '../db/client.js';
import { VISIBILITY_FILTER_SQL } from '../middleware/visibility.js';

type TimelineScopeType = 'project' | 'program';
type TimelineDocumentType = 'program' | 'project' | 'sprint' | 'issue';

interface TimelineDocumentRow {
  id: string;
  title: string;
  document_type: TimelineDocumentType;
  properties?: Record<string, unknown> | null;
  archived_at?: Date | string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  started_at?: Date | string | null;
  completed_at?: Date | string | null;
  cancelled_at?: Date | string | null;
  sprint_start_date?: Date | string | null;
}

interface AssociationRow {
  document_id: string;
  related_id: string;
  relationship_type: 'program' | 'project' | 'sprint';
}

interface DependencyRow {
  source_id: string;
  target_id: string;
  metadata?: Record<string, unknown> | null;
  created_at?: Date | string | null;
  source_title: string;
  target_title: string;
  source_document_type: TimelineDocumentType;
  target_document_type: TimelineDocumentType;
  source_properties?: Record<string, unknown> | null;
  target_properties?: Record<string, unknown> | null;
  source_archived_at?: Date | string | null;
  target_archived_at?: Date | string | null;
  source_started_at?: Date | string | null;
  target_started_at?: Date | string | null;
  source_completed_at?: Date | string | null;
  target_completed_at?: Date | string | null;
  source_cancelled_at?: Date | string | null;
  target_cancelled_at?: Date | string | null;
}

export interface TimelineDependencyEdge {
  source_id: string;
  target_id: string;
  relationship_type: 'depends_on';
  source_in_scope: boolean;
  target_in_scope: boolean;
  source_title?: string;
  target_title?: string;
  source_document_type?: TimelineDocumentType;
  target_document_type?: TimelineDocumentType;
  target_status?: string | null;
  is_blocking: boolean;
}

export interface TimelineRow {
  id: string;
  title: string;
  document_type: TimelineDocumentType;
  status: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  program_ids: string[];
  project_ids: string[];
  sprint_ids: string[];
  dependency_ids: string[];
  blocker_ids: string[];
  blocks_ids: string[];
  blocked: boolean;
  overdue: boolean;
  at_risk: boolean;
  sprint_number?: number | null;
}

export interface TimelineResponse {
  scope: {
    id: string;
    type: TimelineScopeType;
    title: string;
  };
  generated_at: string;
  rows: TimelineRow[];
  dependencies: TimelineDependencyEdge[];
  summary: {
    total_rows: number;
    dependency_count: number;
    blocked_count: number;
    overdue_count: number;
    at_risk_count: number;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.length > 0) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function toDateOnly(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function todayUtcDateOnly(): Date {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}

function calculateSprintDates(
  sprintNumber: number | null,
  workspaceStartDate: Date | string | null | undefined
): { start: string | null; end: string | null } {
  if (!sprintNumber || sprintNumber < 1) return { start: null, end: null };

  const startDate = toDate(workspaceStartDate);
  if (!startDate) return { start: null, end: null };

  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  start.setUTCDate(start.getUTCDate() + (sprintNumber - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function computeSprintStatus(plannedStart: string | null, plannedEnd: string | null): string {
  if (!plannedStart || !plannedEnd) return 'planning';
  const today = todayUtcDateOnly();
  const start = toDate(`${plannedStart}T00:00:00Z`);
  const end = toDate(`${plannedEnd}T00:00:00Z`);
  if (!start || !end) return 'planning';
  if (today < start) return 'upcoming';
  if (today > end) return 'completed';
  return 'active';
}

function statusForDocument(
  documentType: TimelineDocumentType,
  properties: Record<string, unknown>,
  archivedAt?: Date | string | null,
  plannedStart?: string | null,
  plannedEnd?: string | null
): string | null {
  if (archivedAt) return 'archived';

  if (documentType === 'issue') {
    return asString(properties.state) ?? 'backlog';
  }

  if (documentType === 'sprint') {
    return asString(properties.status) ?? computeSprintStatus(plannedStart ?? null, plannedEnd ?? null);
  }

  if (documentType === 'project') {
    if (properties.plan_validated !== undefined && properties.plan_validated !== null) return 'completed';
    return asString(properties.status) ?? 'planned';
  }

  return asString(properties.status) ?? 'active';
}

function isCompleteStatus(status: string | null): boolean {
  return status === 'done' || status === 'completed' || status === 'cancelled' || status === 'archived';
}

function isOverdue(plannedEnd: string | null, status: string | null): boolean {
  if (!plannedEnd || isCompleteStatus(status)) return false;
  const end = toDate(`${plannedEnd}T00:00:00Z`);
  return !!end && end < todayUtcDateOnly();
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)));
}

function earliest(values: Array<string | null>): string | null {
  const filtered = values.filter((value): value is string => !!value).sort();
  return filtered[0] ?? null;
}

function latest(values: Array<string | null>): string | null {
  const filtered = values.filter((value): value is string => !!value).sort();
  return filtered[filtered.length - 1] ?? null;
}

async function getScopeDocument(
  scopeType: TimelineScopeType,
  scopeId: string,
  workspaceId: string,
  userId: string,
  isAdmin: boolean
): Promise<{ id: string; title: string } | null> {
  const result = await pool.query(
    `SELECT id, title
     FROM documents d
     WHERE d.id = $1
       AND d.workspace_id = $2
       AND d.document_type = $3
       AND ${VISIBILITY_FILTER_SQL('d', '$4', '$5')}`,
    [scopeId, workspaceId, scopeType, userId, isAdmin]
  );
  return result.rows[0] ?? null;
}

async function getProjectTimelineDocuments(
  projectId: string,
  workspaceId: string,
  userId: string,
  isAdmin: boolean
): Promise<TimelineDocumentRow[]> {
  const result = await pool.query(
    `WITH project_sprints AS (
       SELECT d.id
       FROM documents d
       JOIN document_associations da
         ON da.document_id = d.id
        AND da.related_id = $1
        AND da.relationship_type = 'project'
       WHERE d.workspace_id = $2
         AND d.document_type = 'sprint'
     ),
     project_issues AS (
       SELECT DISTINCT d.id
       FROM documents d
       LEFT JOIN document_associations project_da
         ON project_da.document_id = d.id
        AND project_da.related_id = $1
        AND project_da.relationship_type = 'project'
       LEFT JOIN document_associations sprint_da
         ON sprint_da.document_id = d.id
        AND sprint_da.relationship_type = 'sprint'
       WHERE d.workspace_id = $2
         AND d.document_type = 'issue'
         AND (
           project_da.id IS NOT NULL
           OR sprint_da.related_id IN (SELECT id FROM project_sprints)
         )
     ),
     scope_ids AS (
       SELECT $1::uuid AS id
       UNION SELECT id FROM project_sprints
       UNION SELECT id FROM project_issues
     )
     SELECT d.id, d.title, d.document_type, d.properties, d.archived_at,
            d.created_at, d.updated_at, d.started_at, d.completed_at, d.cancelled_at,
            w.sprint_start_date
     FROM scope_ids s
     JOIN documents d ON d.id = s.id
     JOIN workspaces w ON w.id = d.workspace_id
     WHERE d.workspace_id = $2
       AND d.document_type IN ('project', 'sprint', 'issue')
       AND ${VISIBILITY_FILTER_SQL('d', '$3', '$4')}
     ORDER BY
       CASE d.document_type WHEN 'project' THEN 0 WHEN 'sprint' THEN 1 ELSE 2 END,
       COALESCE((d.properties->>'sprint_number')::int, 999999),
       d.title`,
    [projectId, workspaceId, userId, isAdmin]
  );
  return result.rows;
}

async function getProgramTimelineDocuments(
  programId: string,
  workspaceId: string,
  userId: string,
  isAdmin: boolean
): Promise<TimelineDocumentRow[]> {
  const result = await pool.query(
    `WITH program_projects AS (
       SELECT d.id
       FROM documents d
       JOIN document_associations da
         ON da.document_id = d.id
        AND da.related_id = $1
        AND da.relationship_type = 'program'
       WHERE d.workspace_id = $2
         AND d.document_type = 'project'
     ),
     program_sprints AS (
       SELECT DISTINCT d.id
       FROM documents d
       LEFT JOIN document_associations program_da
         ON program_da.document_id = d.id
        AND program_da.related_id = $1
        AND program_da.relationship_type = 'program'
       LEFT JOIN document_associations project_da
         ON project_da.document_id = d.id
        AND project_da.relationship_type = 'project'
       WHERE d.workspace_id = $2
         AND d.document_type = 'sprint'
         AND (
           program_da.id IS NOT NULL
           OR project_da.related_id IN (SELECT id FROM program_projects)
         )
     ),
     program_issues AS (
       SELECT DISTINCT d.id
       FROM documents d
       LEFT JOIN document_associations program_da
         ON program_da.document_id = d.id
        AND program_da.related_id = $1
        AND program_da.relationship_type = 'program'
       LEFT JOIN document_associations project_da
         ON project_da.document_id = d.id
        AND project_da.relationship_type = 'project'
       LEFT JOIN document_associations sprint_da
         ON sprint_da.document_id = d.id
        AND sprint_da.relationship_type = 'sprint'
       WHERE d.workspace_id = $2
         AND d.document_type = 'issue'
         AND (
           program_da.id IS NOT NULL
           OR project_da.related_id IN (SELECT id FROM program_projects)
           OR sprint_da.related_id IN (SELECT id FROM program_sprints)
         )
     ),
     scope_ids AS (
       SELECT $1::uuid AS id
       UNION SELECT id FROM program_projects
       UNION SELECT id FROM program_sprints
       UNION SELECT id FROM program_issues
     )
     SELECT d.id, d.title, d.document_type, d.properties, d.archived_at,
            d.created_at, d.updated_at, d.started_at, d.completed_at, d.cancelled_at,
            w.sprint_start_date
     FROM scope_ids s
     JOIN documents d ON d.id = s.id
     JOIN workspaces w ON w.id = d.workspace_id
     WHERE d.workspace_id = $2
       AND d.document_type IN ('program', 'project', 'sprint', 'issue')
       AND ${VISIBILITY_FILTER_SQL('d', '$3', '$4')}
     ORDER BY
       CASE d.document_type WHEN 'program' THEN 0 WHEN 'project' THEN 1 WHEN 'sprint' THEN 2 ELSE 3 END,
       COALESCE((d.properties->>'sprint_number')::int, 999999),
       d.title`,
    [programId, workspaceId, userId, isAdmin]
  );
  return result.rows;
}

async function getTimelineAssociations(documentIds: string[]): Promise<AssociationRow[]> {
  if (documentIds.length === 0) return [];

  const result = await pool.query(
    `SELECT document_id, related_id, relationship_type
     FROM document_associations
     WHERE document_id = ANY($1::uuid[])
       AND relationship_type IN ('program', 'project', 'sprint')`,
    [documentIds]
  );
  return result.rows;
}

async function getTimelineDependencies(
  documentIds: string[],
  workspaceId: string,
  userId: string,
  isAdmin: boolean
): Promise<DependencyRow[]> {
  if (documentIds.length === 0) return [];

  const result = await pool.query(
    `SELECT da.document_id as source_id,
            da.related_id as target_id,
            da.metadata,
            da.created_at,
            source_doc.title as source_title,
            target_doc.title as target_title,
            source_doc.document_type as source_document_type,
            target_doc.document_type as target_document_type,
            source_doc.properties as source_properties,
            target_doc.properties as target_properties,
            source_doc.archived_at as source_archived_at,
            target_doc.archived_at as target_archived_at,
            source_doc.started_at as source_started_at,
            target_doc.started_at as target_started_at,
            source_doc.completed_at as source_completed_at,
            target_doc.completed_at as target_completed_at,
            source_doc.cancelled_at as source_cancelled_at,
            target_doc.cancelled_at as target_cancelled_at
     FROM document_associations da
     JOIN documents source_doc ON source_doc.id = da.document_id
     JOIN documents target_doc ON target_doc.id = da.related_id
     WHERE da.relationship_type = 'depends_on'
       AND (da.document_id = ANY($1::uuid[]) OR da.related_id = ANY($1::uuid[]))
       AND source_doc.workspace_id = $2
       AND target_doc.workspace_id = $2
       AND ${VISIBILITY_FILTER_SQL('source_doc', '$3', '$4')}
       AND ${VISIBILITY_FILTER_SQL('target_doc', '$3', '$4')}
     ORDER BY da.created_at ASC`,
    [documentIds, workspaceId, userId, isAdmin]
  );
  return result.rows;
}

function buildBaseRows(documents: TimelineDocumentRow[], associations: AssociationRow[]): TimelineRow[] {
  const assocByDocument = new Map<string, AssociationRow[]>();
  for (const association of associations) {
    const current = assocByDocument.get(association.document_id) ?? [];
    current.push(association);
    assocByDocument.set(association.document_id, current);
  }

  const rows = documents.map((document): TimelineRow => {
    const properties = asRecord(document.properties);
    const documentAssociations = assocByDocument.get(document.id) ?? [];
    const sprintNumber = document.document_type === 'sprint' ? asNumber(properties.sprint_number) : null;
    const sprintDates = document.document_type === 'sprint'
      ? calculateSprintDates(sprintNumber, document.sprint_start_date)
      : { start: null, end: null };

    const plannedStart = toDateOnly(properties.planned_start_date)
      ?? toDateOnly(properties.start_date)
      ?? sprintDates.start;
    const plannedEnd = toDateOnly(properties.planned_end_date)
      ?? toDateOnly(properties.end_date)
      ?? toDateOnly(properties.target_date)
      ?? toDateOnly(properties.due_date)
      ?? sprintDates.end;
    const status = statusForDocument(document.document_type, properties, document.archived_at, plannedStart, plannedEnd);

    return {
      id: document.id,
      title: document.title,
      document_type: document.document_type,
      status,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      actual_start: toDateOnly(document.started_at) ?? toDateOnly(properties.started_at),
      actual_end: toDateOnly(document.completed_at) ?? toDateOnly(document.cancelled_at) ?? toDateOnly(properties.completed_at),
      program_ids: unique(documentAssociations.filter(a => a.relationship_type === 'program').map(a => a.related_id)),
      project_ids: unique(documentAssociations.filter(a => a.relationship_type === 'project').map(a => a.related_id)),
      sprint_ids: unique(documentAssociations.filter(a => a.relationship_type === 'sprint').map(a => a.related_id)),
      dependency_ids: [],
      blocker_ids: [],
      blocks_ids: [],
      blocked: false,
      overdue: false,
      at_risk: false,
      sprint_number: document.document_type === 'sprint' ? sprintNumber : undefined,
    };
  });

  const rowById = new Map(rows.map(row => [row.id, row]));

  for (const row of rows) {
    if (row.document_type === 'issue' && (!row.planned_start || !row.planned_end)) {
      const sprint = row.sprint_ids.map(id => rowById.get(id)).find(Boolean);
      if (sprint) {
        row.planned_start = row.planned_start ?? sprint.planned_start;
        row.planned_end = row.planned_end ?? sprint.planned_end;
      }
    }
  }

  for (const row of rows) {
    if (row.document_type !== 'project' && row.document_type !== 'program') continue;

    const childRows = row.document_type === 'program'
      ? rows.filter(candidate => candidate.id !== row.id)
      : rows.filter(candidate => candidate.project_ids.includes(row.id));

    if (!row.planned_start) {
      row.planned_start = earliest(childRows.map(child => child.planned_start));
    }
    if (!row.planned_end) {
      row.planned_end = latest(childRows.map(child => child.planned_end));
    }
  }

  for (const row of rows) {
    row.overdue = isOverdue(row.planned_end, row.status);
    row.at_risk = row.overdue;
  }

  return rows;
}

function buildDependencyEdges(dependencies: DependencyRow[], rows: TimelineRow[]): TimelineDependencyEdge[] {
  const rowById = new Map(rows.map(row => [row.id, row]));

  return dependencies.map((dependency): TimelineDependencyEdge => {
    const sourceRow = rowById.get(dependency.source_id);
    const targetRow = rowById.get(dependency.target_id);
    const targetStatus = targetRow?.status
      ?? statusForDocument(
        dependency.target_document_type,
        asRecord(dependency.target_properties),
        dependency.target_archived_at
      );

    return {
      source_id: dependency.source_id,
      target_id: dependency.target_id,
      relationship_type: 'depends_on',
      source_in_scope: !!sourceRow,
      target_in_scope: !!targetRow,
      source_title: dependency.source_title,
      target_title: dependency.target_title,
      source_document_type: dependency.source_document_type,
      target_document_type: dependency.target_document_type,
      target_status: targetStatus,
      is_blocking: !isCompleteStatus(targetStatus),
    };
  });
}

function applyDependencyFlags(rows: TimelineRow[], edges: TimelineDependencyEdge[]): void {
  const rowById = new Map(rows.map(row => [row.id, row]));

  for (const edge of edges) {
    const source = rowById.get(edge.source_id);
    const target = rowById.get(edge.target_id);

    if (source) {
      source.dependency_ids = unique([...source.dependency_ids, edge.target_id]);
      if (edge.is_blocking) {
        source.blocker_ids = unique([...source.blocker_ids, edge.target_id]);
        source.blocked = true;
      }
    }

    if (target) {
      target.blocks_ids = unique([...target.blocks_ids, edge.source_id]);
    }
  }

  for (const row of rows) {
    row.at_risk = row.blocked || row.overdue;
  }
}

function sortRows(rows: TimelineRow[]): TimelineRow[] {
  const rank: Record<TimelineDocumentType, number> = {
    program: 0,
    project: 1,
    sprint: 2,
    issue: 3,
  };

  return rows.sort((a, b) => {
    const startCompare = (a.planned_start ?? '9999-12-31').localeCompare(b.planned_start ?? '9999-12-31');
    if (startCompare !== 0) return startCompare;
    const rankCompare = rank[a.document_type] - rank[b.document_type];
    if (rankCompare !== 0) return rankCompare;
    return a.title.localeCompare(b.title);
  });
}

async function getTimeline(
  scopeType: TimelineScopeType,
  scopeId: string,
  workspaceId: string,
  userId: string,
  isAdmin: boolean
): Promise<TimelineResponse | null> {
  const scope = await getScopeDocument(scopeType, scopeId, workspaceId, userId, isAdmin);
  if (!scope) return null;

  const documents = scopeType === 'project'
    ? await getProjectTimelineDocuments(scopeId, workspaceId, userId, isAdmin)
    : await getProgramTimelineDocuments(scopeId, workspaceId, userId, isAdmin);
  const documentIds = documents.map(document => document.id);
  const associations = await getTimelineAssociations(documentIds);
  const dependencyRows = await getTimelineDependencies(documentIds, workspaceId, userId, isAdmin);

  const rows = buildBaseRows(documents, associations);
  const dependencies = buildDependencyEdges(dependencyRows, rows);
  applyDependencyFlags(rows, dependencies);

  const sortedRows = sortRows(rows);

  return {
    scope: {
      id: scope.id,
      type: scopeType,
      title: scope.title,
    },
    generated_at: new Date().toISOString(),
    rows: sortedRows,
    dependencies,
    summary: {
      total_rows: sortedRows.length,
      dependency_count: dependencies.length,
      blocked_count: sortedRows.filter(row => row.blocked).length,
      overdue_count: sortedRows.filter(row => row.overdue).length,
      at_risk_count: sortedRows.filter(row => row.at_risk).length,
    },
  };
}

export function getProjectTimeline(
  projectId: string,
  workspaceId: string,
  userId: string,
  isAdmin: boolean
): Promise<TimelineResponse | null> {
  return getTimeline('project', projectId, workspaceId, userId, isAdmin);
}

export function getProgramTimeline(
  programId: string,
  workspaceId: string,
  userId: string,
  isAdmin: boolean
): Promise<TimelineResponse | null> {
  return getTimeline('program', programId, workspaceId, userId, isAdmin);
}
