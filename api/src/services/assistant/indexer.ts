import { createHash } from 'crypto';
import { pool } from '../../db/client.js';
import { ASSISTANT_LIMITS } from './config.js';
import { extractTextFromFile, isSupportedAssistantFile } from './extractors.js';

interface FileRow {
  id: string;
  workspace_id: string;
  document_id: string | null;
  filename: string;
  mime_type: string;
  size_bytes: string | number;
}

export async function indexUploadedFileForAssistant(input: {
  fileId: string;
  workspaceId: string;
  buffer: Buffer;
}): Promise<void> {
  const file = await getFile(input.fileId, input.workspaceId);
  if (!file) return;

  try {
    await deleteFileChunks(file.id, file.workspace_id);

    if (!isSupportedAssistantFile(file.filename, file.mime_type)) {
      await updateIndexStatus(file.id, file.workspace_id, 'unsupported', 'File type is not supported for Ask Ship indexing');
      return;
    }

    if (input.buffer.byteLength > ASSISTANT_LIMITS.maxExtractionBytes) {
      await updateIndexStatus(file.id, file.workspace_id, 'failed', `File exceeds Ask Ship extraction limit of ${ASSISTANT_LIMITS.maxExtractionBytes} bytes`);
      return;
    }

    await updateIndexStatus(file.id, file.workspace_id, 'indexing', null);
    const extracted = await extractTextFromFile({
      buffer: input.buffer,
      mimeType: file.mime_type,
      filename: file.filename,
    });

    if (!extracted.supported) {
      await updateIndexStatus(file.id, file.workspace_id, 'unsupported', extracted.reason ?? 'Unsupported file type');
      return;
    }

    const text = normalizeText(extracted.text);
    if (!text) {
      await updateIndexStatus(file.id, file.workspace_id, 'failed', 'No indexable text was extracted');
      return;
    }

    const chunks = chunkText(text);
    for (const [index, chunk] of chunks.entries()) {
      await pool.query(
        `INSERT INTO assistant_search_chunks
          (workspace_id, source_type, source_id, document_id, file_id, chunk_index, title, text, metadata)
         VALUES ($1, 'file', $2, $3, $2, $4, $5, $6, $7)
         ON CONFLICT (workspace_id, source_type, source_id, chunk_index)
         DO UPDATE SET
           document_id = EXCLUDED.document_id,
           file_id = EXCLUDED.file_id,
           title = EXCLUDED.title,
           text = EXCLUDED.text,
           metadata = EXCLUDED.metadata,
           updated_at = now()`,
        [
          file.workspace_id,
          file.id,
          file.document_id,
          index,
          file.filename,
          chunk,
          JSON.stringify({
            mime_type: file.mime_type,
            filename: file.filename,
            content_hash: createHash('sha256').update(text).digest('hex'),
          }),
        ],
      );
    }

    await updateIndexStatus(file.id, file.workspace_id, 'indexed', null);
  } catch (error) {
    await updateIndexStatus(
      file.id,
      file.workspace_id,
      'failed',
      error instanceof Error ? error.message.slice(0, 500) : 'File indexing failed',
    );
  }
}

export async function markFileAssistantIndexFailed(
  fileId: string,
  workspaceId: string,
  error: unknown,
): Promise<void> {
  await updateIndexStatus(
    fileId,
    workspaceId,
    'failed',
    error instanceof Error ? error.message.slice(0, 500) : 'File indexing failed',
  );
}

export async function getFileAssistantIndexStatus(fileId: string, workspaceId: string) {
  const result = await pool.query(
    `SELECT id,
            assistant_indexing_status,
            assistant_indexed_at,
            assistant_index_error,
            document_id
     FROM files
     WHERE id = $1 AND workspace_id = $2`,
    [fileId, workspaceId],
  );

  return result.rows[0] ?? null;
}

async function getFile(fileId: string, workspaceId: string): Promise<FileRow | null> {
  const result = await pool.query<FileRow>(
    `SELECT id, workspace_id, document_id, filename, mime_type, size_bytes
     FROM files
     WHERE id = $1 AND workspace_id = $2`,
    [fileId, workspaceId],
  );

  return result.rows[0] ?? null;
}

async function deleteFileChunks(fileId: string, workspaceId: string): Promise<void> {
  await pool.query(
    `DELETE FROM assistant_search_chunks
     WHERE workspace_id = $1 AND source_type = 'file' AND source_id = $2`,
    [workspaceId, fileId],
  );
}

async function updateIndexStatus(
  fileId: string,
  workspaceId: string,
  status: 'not_indexed' | 'indexing' | 'indexed' | 'unsupported' | 'failed',
  error: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE files
     SET assistant_indexing_status = $1,
         assistant_indexed_at = CASE WHEN $1 = 'indexed' THEN now() ELSE assistant_indexed_at END,
         assistant_index_error = $2,
         updated_at = now()
     WHERE id = $3 AND workspace_id = $4`,
    [status, error, fileId, workspaceId],
  );
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function chunkText(text: string): string[] {
  const maxChunkChars = 1400;
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= maxChunkChars) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);
    if (paragraph.length <= maxChunkChars) {
      current = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += maxChunkChars) {
      chunks.push(paragraph.slice(index, index + maxChunkChars));
    }
    current = '';
  }

  if (current) chunks.push(current);
  return chunks.slice(0, ASSISTANT_LIMITS.maxContextChunks * 4);
}
