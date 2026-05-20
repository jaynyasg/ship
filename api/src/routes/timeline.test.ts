import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import crypto from 'crypto'
import { createApp } from '../app.js'
import { pool } from '../db/client.js'

describe('Timeline read model API', () => {
  const app = createApp()
  const testRunId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const testEmail = `timeline-${testRunId}@ship.local`
  const testWorkspaceName = `Timeline Test ${testRunId}`

  let sessionCookie: string
  let testWorkspaceId: string
  let testUserId: string
  let programId: string
  let projectId: string
  let sprint1Id: string
  let sprint2Id: string
  let issue1Id: string
  let issue2Id: string

  async function createDocument(
    documentType: string,
    title: string,
    properties: Record<string, unknown> = {},
    extraColumns = ''
  ): Promise<string> {
    const result = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, properties, created_by ${extraColumns})
       VALUES ($1, $2, $3, $4, $5 ${extraColumns ? ', now()' : ''})
       RETURNING id`,
      [testWorkspaceId, documentType, title, JSON.stringify(properties), testUserId]
    )
    return result.rows[0].id
  }

  beforeAll(async () => {
    const workspaceResult = await pool.query(
      `INSERT INTO workspaces (name, sprint_start_date)
       VALUES ($1, '2026-01-05')
       RETURNING id`,
      [testWorkspaceName]
    )
    testWorkspaceId = workspaceResult.rows[0].id

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'test-hash', 'Timeline Test User')
       RETURNING id`,
      [testEmail]
    )
    testUserId = userResult.rows[0].id

    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [testWorkspaceId, testUserId]
    )

    programId = await createDocument('program', 'Timeline Program')
    projectId = await createDocument('project', 'Timeline Project')
    sprint1Id = await createDocument('sprint', 'Week 1', { sprint_number: 1 })
    sprint2Id = await createDocument('sprint', 'Week 2', { sprint_number: 2 })
    issue1Id = await createDocument('issue', 'Build foundation', { state: 'in_progress' }, ', started_at')
    issue2Id = await createDocument('issue', 'Ship UI', { state: 'todo' })

    await pool.query(
      `INSERT INTO document_associations (document_id, related_id, relationship_type)
       VALUES
         ($1, $2, 'program'),
         ($3, $1, 'project'),
         ($4, $1, 'project'),
         ($5, $1, 'project'),
         ($5, $3, 'sprint'),
         ($6, $1, 'project'),
         ($6, $4, 'sprint'),
         ($6, $5, 'depends_on')`,
      [projectId, programId, sprint1Id, sprint2Id, issue1Id, issue2Id]
    )

    const sessionId = crypto.randomBytes(32).toString('hex')
    await pool.query(
      `INSERT INTO sessions (id, user_id, workspace_id, expires_at)
       VALUES ($1, $2, $3, now() + interval '1 hour')`,
      [sessionId, testUserId, testWorkspaceId]
    )
    sessionCookie = `session_id=${sessionId}`
  })

  afterAll(async () => {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [testUserId])
    await pool.query('DELETE FROM documents WHERE workspace_id = $1', [testWorkspaceId])
    await pool.query('DELETE FROM workspace_memberships WHERE user_id = $1', [testUserId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    await pool.query('DELETE FROM workspaces WHERE id = $1', [testWorkspaceId])
  })

  it('returns project timeline rows, dependency edges, and risk flags', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/timeline`)
      .set('Cookie', sessionCookie)

    expect(response.status).toBe(200)
    expect(response.body.scope).toMatchObject({
      id: projectId,
      type: 'project',
      title: 'Timeline Project',
    })

    const rows = response.body.rows as Array<Record<string, unknown>>
    const rowIds = rows.map(row => row.id)
    expect(rowIds).toEqual(expect.arrayContaining([projectId, sprint1Id, sprint2Id, issue1Id, issue2Id]))

    const sprint1 = rows.find(row => row.id === sprint1Id)
    expect(sprint1).toMatchObject({
      document_type: 'sprint',
      sprint_number: 1,
      planned_start: '2026-01-05',
      planned_end: '2026-01-11',
    })

    const blockedIssue = rows.find(row => row.id === issue2Id)
    expect(blockedIssue).toMatchObject({
      document_type: 'issue',
      status: 'todo',
      planned_start: '2026-01-12',
      planned_end: '2026-01-18',
      blocked: true,
      at_risk: true,
    })
    expect(blockedIssue?.blocker_ids).toContain(issue1Id)

    const blockerIssue = rows.find(row => row.id === issue1Id)
    expect(blockerIssue?.blocks_ids).toContain(issue2Id)

    expect(response.body.dependencies).toEqual([
      expect.objectContaining({
        source_id: issue2Id,
        target_id: issue1Id,
        relationship_type: 'depends_on',
        source_in_scope: true,
        target_in_scope: true,
        is_blocking: true,
      }),
    ])
    expect(response.body.summary).toMatchObject({
      total_rows: 5,
      dependency_count: 1,
      blocked_count: 1,
      at_risk_count: expect.any(Number),
    })
  })

  it('returns program timeline including project, weeks, issues, and dependencies', async () => {
    const response = await request(app)
      .get(`/api/programs/${programId}/timeline`)
      .set('Cookie', sessionCookie)

    expect(response.status).toBe(200)
    expect(response.body.scope).toMatchObject({
      id: programId,
      type: 'program',
      title: 'Timeline Program',
    })

    const rowIds = response.body.rows.map((row: { id: string }) => row.id)
    expect(rowIds).toEqual(expect.arrayContaining([programId, projectId, sprint1Id, sprint2Id, issue1Id, issue2Id]))
    expect(response.body.dependencies).toHaveLength(1)
  })

  it('returns 404 when the scope document type does not match the endpoint', async () => {
    const response = await request(app)
      .get(`/api/projects/${programId}/timeline`)
      .set('Cookie', sessionCookie)

    expect(response.status).toBe(404)
    expect(response.body.error).toBe('Project not found')
  })
})
