import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../db/client.js';
import { retrieveAssistantSources } from './retriever.js';

describe('retrieveAssistantSources', () => {
  const testRunId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const workspaceName = `Assistant Retriever ${testRunId}`;
  const uniqueTerm = `retriever-${testRunId}`;
  const userOneEmail = `assistant-retriever-1-${testRunId}@ship.local`;
  const userTwoEmail = `assistant-retriever-2-${testRunId}@ship.local`;

  let workspaceId: string;
  let userOneId: string;
  let userTwoId: string;
  let projectId: string;

  beforeAll(async () => {
    const workspaceResult = await pool.query(
      'INSERT INTO workspaces (name) VALUES ($1) RETURNING id',
      [workspaceName],
    );
    workspaceId = workspaceResult.rows[0].id;

    const userOneResult = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'test-hash', 'Assistant Retriever One')
       RETURNING id`,
      [userOneEmail],
    );
    userOneId = userOneResult.rows[0].id;

    const userTwoResult = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'test-hash', 'Assistant Retriever Two')
       RETURNING id`,
      [userTwoEmail],
    );
    userTwoId = userTwoResult.rows[0].id;

    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $2, 'member'), ($1, $3, 'member')`,
      [workspaceId, userOneId, userTwoId],
    );

    await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, content, created_by, visibility)
       VALUES
         ($1, 'wiki', $2, $3, $4, 'workspace'),
         ($1, 'wiki', $5, $6, $7, 'private')`,
      [
        workspaceId,
        `Workspace visible ${uniqueTerm}`,
        JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Visible context ${uniqueTerm}` }] }] }),
        userOneId,
        `Private hidden ${uniqueTerm}`,
        JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Hidden private context ${uniqueTerm}` }] }] }),
        userTwoId,
      ],
    );

    const projectResult = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, properties, created_by, visibility)
       VALUES ($1, 'project', $2, $3, $4, 'workspace')
       RETURNING id`,
      [
        workspaceId,
        `Assistant Launch ${uniqueTerm}`,
        JSON.stringify({ status: 'active', target_date: '2026-06-15' }),
        userOneId,
      ],
    );
    projectId = projectResult.rows[0].id;

    const sprintResult = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, properties, created_by, visibility)
       VALUES ($1, 'sprint', $2, $3, $4, 'workspace')
       RETURNING id`,
      [
        workspaceId,
        `Week 22 ${uniqueTerm}`,
        JSON.stringify({ sprint_number: 22, start_date: '2026-05-25', end_date: '2026-05-31' }),
        userOneId,
      ],
    );

    const blockerResult = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, content, properties, created_by, visibility)
       VALUES ($1, 'issue', $2, $3, $4, $5, 'workspace')
       RETURNING id`,
      [
        workspaceId,
        `Complete security review ${uniqueTerm}`,
        JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Security review must finish before launch.' }] }] }),
        JSON.stringify({ state: 'todo', priority: 'high' }),
        userOneId,
      ],
    );

    const blockedResult = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, content, properties, created_by, visibility)
       VALUES ($1, 'issue', $2, $3, $4, $5, 'workspace')
       RETURNING id`,
      [
        workspaceId,
        `Launch feature rollout ${uniqueTerm}`,
        JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rollout is waiting on security review approval.' }] }] }),
        JSON.stringify({ state: 'todo', priority: 'high' }),
        userOneId,
      ],
    );

    const weeklyPlanResult = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, content, properties, created_by, visibility)
       VALUES ($1, 'weekly_plan', 'Week 22 Plan', $2, $3, $4, 'workspace')
       RETURNING id`,
      [
        workspaceId,
        JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: `This week focuses on assistant rollout and citation verification ${uniqueTerm}.` }] }],
        }),
        JSON.stringify({ week_number: 22, project_id: projectId }),
        userOneId,
      ],
    );

    await pool.query(
      `INSERT INTO document_associations (document_id, related_id, relationship_type)
       VALUES
         ($1, $2, 'project'),
         ($3, $2, 'project'),
         ($4, $2, 'project'),
         ($3, $5, 'sprint'),
         ($4, $5, 'sprint'),
         ($4, $3, 'depends_on'),
         ($6, $2, 'project')`,
      [
        sprintResult.rows[0].id,
        projectId,
        blockerResult.rows[0].id,
        blockedResult.rows[0].id,
        sprintResult.rows[0].id,
        weeklyPlanResult.rows[0].id,
      ],
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM documents WHERE workspace_id = $1', [workspaceId]);
    await pool.query('DELETE FROM workspace_memberships WHERE workspace_id = $1', [workspaceId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userOneId, userTwoId]);
    await pool.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
  });

  it('returns workspace-visible sources but excludes another user private document', async () => {
    const sources = await retrieveAssistantSources({
      userId: userOneId,
      workspaceId,
      workspaceRole: 'member',
      message: uniqueTerm,
      maxSources: 8,
    });

    expect(sources.map((source) => source.title)).toContain(`Workspace visible ${uniqueTerm}`);
    expect(sources.map((source) => source.title)).not.toContain(`Private hidden ${uniqueTerm}`);
  });

  it('adds structured project context with issue counts and blocking dependencies', async () => {
    const sources = await retrieveAssistantSources({
      userId: userOneId,
      workspaceId,
      workspaceRole: 'member',
      message: 'What is blocked for this project?',
      routeContext: {
        documentId: projectId,
        documentType: 'project',
      },
      maxSources: 8,
    });

    const projectSource = sources.find((source) => source.title === `Assistant Launch ${uniqueTerm} work summary`);
    expect(projectSource).toBeDefined();
    expect(projectSource?.sourceType).toBe('project');
    expect(projectSource?.excerpt).toContain(`Launch feature rollout ${uniqueTerm}`);
    expect(projectSource?.excerpt).toContain(`Complete security review ${uniqueTerm}`);
    expect(projectSource?.excerpt).toContain('Issue states: todo: 2');
    expect(projectSource?.excerpt).toContain('Blocking dependencies:');
  });

  it('adds associated weekly plan and retro content as week sources', async () => {
    const sources = await retrieveAssistantSources({
      userId: userOneId,
      workspaceId,
      workspaceRole: 'member',
      message: 'What does the weekly plan say about assistant rollout?',
      routeContext: {
        documentId: projectId,
        documentType: 'project',
      },
      maxSources: 10,
    });

    const weekSource = sources.find((source) => source.sourceType === 'week' && source.title.includes('Week 22 plan'));
    expect(weekSource).toBeDefined();
    expect(weekSource?.excerpt).toContain(`assistant rollout and citation verification ${uniqueTerm}`);
  });
});
