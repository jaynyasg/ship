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
});
