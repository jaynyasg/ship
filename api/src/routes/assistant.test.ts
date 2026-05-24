import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../app.js';
import { pool } from '../db/client.js';

describe('Assistant API', () => {
  const app = createApp('http://localhost:5173');
  const testRunId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const testEmail = `assistant-${testRunId}@ship.local`;
  const testWorkspaceName = `Assistant Test ${testRunId}`;

  let sessionCookie: string;
  let csrfToken: string;
  let testWorkspaceId: string;
  let testUserId: string;
  let testDocumentId: string;

  const originalEnv = {
    SHIP_ASSISTANT_ENABLED: process.env.SHIP_ASSISTANT_ENABLED,
    SHIP_ASSISTANT_PROVIDER: process.env.SHIP_ASSISTANT_PROVIDER,
    SHIP_ASSISTANT_MODEL: process.env.SHIP_ASSISTANT_MODEL,
    SHIP_ASSISTANT_UPLOAD_INDEXING: process.env.SHIP_ASSISTANT_UPLOAD_INDEXING,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  beforeAll(async () => {
    const workspaceResult = await pool.query(
      `INSERT INTO workspaces (name) VALUES ($1)
       RETURNING id`,
      [testWorkspaceName],
    );
    testWorkspaceId = workspaceResult.rows[0].id;

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'test-hash', 'Assistant Test User')
       RETURNING id`,
      [testEmail],
    );
    testUserId = userResult.rows[0].id;

    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [testWorkspaceId, testUserId],
    );

    const sessionId = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO sessions (id, user_id, workspace_id, expires_at)
       VALUES ($1, $2, $3, now() + interval '1 hour')`,
      [sessionId, testUserId, testWorkspaceId],
    );
    sessionCookie = `session_id=${sessionId}`;

    const csrfRes = await request(app)
      .get('/api/csrf-token')
      .set('Cookie', sessionCookie);
    csrfToken = csrfRes.body.token;
    const connectSidCookie = csrfRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
    if (connectSidCookie) {
      sessionCookie = `${sessionCookie}; ${connectSidCookie}`;
    }

    const documentResult = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, content, created_by)
       VALUES ($1, 'wiki', 'Launch Risk Brief', $2, $3)
       RETURNING id`,
      [
        testWorkspaceId,
        JSON.stringify({
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'The launch risk is blocked by API readiness.' }],
          }],
        }),
        testUserId,
      ],
    );
    testDocumentId = documentResult.rows[0].id;
  });

  beforeEach(() => {
    process.env.SHIP_ASSISTANT_ENABLED = 'true';
    process.env.SHIP_ASSISTANT_PROVIDER = 'openai';
    delete process.env.SHIP_ASSISTANT_MODEL;
    delete process.env.SHIP_ASSISTANT_UPLOAD_INDEXING;
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(async () => {
    restoreEnv('SHIP_ASSISTANT_ENABLED', originalEnv.SHIP_ASSISTANT_ENABLED);
    restoreEnv('SHIP_ASSISTANT_PROVIDER', originalEnv.SHIP_ASSISTANT_PROVIDER);
    restoreEnv('SHIP_ASSISTANT_MODEL', originalEnv.SHIP_ASSISTANT_MODEL);
    restoreEnv('SHIP_ASSISTANT_UPLOAD_INDEXING', originalEnv.SHIP_ASSISTANT_UPLOAD_INDEXING);
    restoreEnv('OPENAI_API_KEY', originalEnv.OPENAI_API_KEY);

    await pool.query('DELETE FROM sessions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM documents WHERE id = $1', [testDocumentId]);
    await pool.query('DELETE FROM workspace_memberships WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM workspaces WHERE id = $1', [testWorkspaceId]);
  });

  it('GET /api/assistant/status returns 401 without authentication', async () => {
    const res = await request(app).get('/api/assistant/status');

    expect(res.status).toBe(401);
  });

  it('GET /api/assistant/status returns unavailable when provider key is missing', async () => {
    const res = await request(app)
      .get('/api/assistant/status')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.available).toBe(false);
    expect(res.body.provider).toBe('openai');
    expect(res.body.missingConfiguration).toContain('OPENAI_API_KEY');
  });

  it('POST /api/assistant/chat enforces CSRF for session-authenticated requests', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .set('Cookie', sessionCookie)
      .send({ message: 'What is blocked?' });

    expect(res.status).toBe(403);
  });

  it('POST /api/assistant/chat rejects empty messages', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ message: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('MESSAGE_REQUIRED');
  });

  it('POST /api/assistant/chat rejects over-long messages', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ message: 'x'.repeat(4001) });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('MESSAGE_TOO_LONG');
  });

  it('POST /api/assistant/chat returns controlled unavailable response when provider is not configured', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ message: 'What projects are at risk?' });

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unavailable');
    expect(res.body.error.code).toBe('ASSISTANT_UNAVAILABLE');
    expect(res.body.citations).toEqual([]);
  });

  it('POST /api/assistant/chat returns a cited answer when mock provider and workspace context are available', async () => {
    process.env.SHIP_ASSISTANT_PROVIDER = 'mock';

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ message: 'What is the launch risk?' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('answered');
    expect(res.body.message.content).toContain('[S1]');
    expect(res.body.citations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'Launch Risk Brief',
        sourceType: 'document',
      }),
    ]));
    expect(res.body.sourceCounts.total).toBeGreaterThan(0);
  });

  it('OpenAPI JSON includes assistant paths', async () => {
    const res = await request(app).get('/api/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.paths['/assistant/status']).toBeDefined();
    expect(res.body.paths['/assistant/chat']).toBeDefined();
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
