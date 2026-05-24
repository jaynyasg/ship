# Ask Ship Assistant

Ask Ship is the in-app assistant surfaced from the left icon rail below Teams. It answers questions from the current workspace using Ship documents, projects, issues, weeks, timelines, and indexed documentation uploads. Responses include citations back to Ship records or uploaded documentation context.

## Server Configuration

Configure these variables on the API/web service:

| Variable | Required | Notes |
|---|---:|---|
| `OPENAI_API_KEY` | Yes for OpenAI | Server-side only. Never expose it through `VITE_*` variables. |
| `SHIP_ASSISTANT_ENABLED` | No | Defaults to enabled unless set to `false`. |
| `SHIP_ASSISTANT_PROVIDER` | No | `openai`, `bedrock`, or `mock`. Defaults to `openai` when `OPENAI_API_KEY` is present. |
| `SHIP_ASSISTANT_MODEL` | No | Defaults to `gpt-4o-mini` for OpenAI. |
| `SHIP_ASSISTANT_EMBEDDINGS_ENABLED` | No | Set to `true` to generate embeddings with the configured OpenAI key, or `mock` for deterministic local/eval vectors. Defaults to disabled. |
| `SHIP_ASSISTANT_EMBEDDING_MODEL` | No | Defaults to `text-embedding-3-small`. |
| `SHIP_ASSISTANT_EMBEDDING_DIMENSIONS` | No | Defaults to `1536`; smaller values are accepted for mock/local evals. |
| `SHIP_ASSISTANT_TRACING_ENABLED` | No | Defaults to enabled unless set to `false`. Records assistant run/tool/retrieval/model/extraction metadata without storing full prompts. |
| `SHIP_ASSISTANT_UPLOAD_INDEXING` | No | Defaults to enabled unless set to `false`. |
| `SHIP_UPLOAD_STORAGE` | No | Set to `local` for the Render demo path without S3. Use S3/object storage for durable production uploads. |
| `SHIP_UPLOADS_DIR` | No | Optional local upload directory override. |

The assistant status endpoint is authenticated:

```bash
GET /api/assistant/status
```

It reports whether the assistant is available, which provider/model is selected, missing server configuration, supported upload types, and message/context limits.

## Hybrid Retrieval, Traces, and Evals

Ask Ship uses a bounded retrieval loop: gather Ship context, blend lexical/structured/semantic signals, rerank the candidate sources, then send the final context pack to the model. Semantic retrieval is additive; if embeddings are disabled or unavailable, Ask Ship continues to use PostgreSQL full-text search and structured project/timeline context.

Assistant runs are recorded in `assistant_runs`, with supporting events in `assistant_trace_events`. These rows capture request IDs, retrieval/tool/model/extraction timings, source counts, embedding failures, and indexing metadata. They intentionally avoid storing raw prompts, full extracted content, provider secrets, or model output.

The eval harness in `api/src/services/assistant/eval-harness.ts` scores deterministic cases for expected citations and required answer terms. Use it for local regression tests and future CI artifacts before changing retrieval or prompt behavior.

## Indexed Uploads

The Ask Ship panel shows **Upload Doc** when it is opened from a document route. Uploads are associated with that current document and indexed after upload completion.

Supported MVP formats:

- `.txt`
- `.md`
- `.csv`
- `.pdf`
- `.docx`

Other allowed file uploads still succeed, but assistant indexing marks them `unsupported`. Extraction is capped separately from upload size by `ASSISTANT_LIMITS.maxExtractionBytes` in `api/src/services/assistant/config.ts`.

Indexed files move through these statuses:

- `not_indexed`
- `indexing`
- `indexed`
- `unsupported`
- `failed`

Useful file indexing endpoints:

```bash
GET /api/files/:fileId/assistant-index
POST /api/files/:fileId/reindex
```

## Render Notes

`render.yaml` declares non-secret assistant defaults and `OPENAI_API_KEY` with `sync: false`. For existing Blueprint deployments, add `OPENAI_API_KEY` manually to the `ship` web service in Render because newly added `sync: false` values are not automatically created on existing services.

The current Render demo path uses `SHIP_UPLOAD_STORAGE=local`. That is enough to demonstrate upload-backed answers, but files are not durable across instance rebuilds unless a persistent disk or object storage is configured. For durable production uploads, configure S3/object storage and CDN settings instead.

## Demo Flow

1. Open a project, timeline, issue, or wiki document.
2. Click the Ask Ship rail button below Teams.
3. Ask a workspace question such as `what is blocked?`.
4. Open a wiki document, upload a small `.md`, `.txt`, `.pdf`, or `.docx` file with **Upload Doc**.
5. Ask a question answered by that uploaded file.
6. Open the cited source link to confirm the answer is grounded in Ship context.
