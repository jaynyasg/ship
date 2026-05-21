# Ship Security Audit Report

- Run ID: `2ba2b9bf-c4bc-4c06-8d12-065d0aa51525`
- Mode: `local`
- Web URL: `http://localhost:5173`
- API URL: `http://localhost:3000`
- Started: `2026-05-21T22:41:18.958Z`
- Finished: `2026-05-21T22:41:22.873Z`
- Non-interactive: `true`

## Audit Deliverable Matrix

| Metric | Your Baseline | Source |
| --- | --- | --- |
| Security probe tool | Runnable (Yes) | Probe command and report metadata |
| Auth/session vulnerabilities found | No verified vulnerabilities found | Auth/session probes plus manual review |
| WebSocket validation failures | MEDIUM: Collaboration WebSocket malformed binary handling was not handled safely | WebSocket probes |
| Input sanitization failures | No verified vulnerabilities found | Input probes plus browser/security test evidence when relevant |
| High/Critical CVEs in dependencies | No verified vulnerabilities found | Parsed dependency audit |
| CORS/CSP misconfiguration | No verified vulnerabilities found | Header probes plus manual review |
| Secrets exposure risk | No verified vulnerabilities found | Common-path/client-bundle checks plus manual review |
| Rate limiting absent on endpoints | No verified vulnerabilities found | Live bounded probes plus route/middleware review |
| Verbose error leakage | MEDIUM: Verbose error details leaked | Error probes plus error-handler review |

## Summary

- Verified findings: 2
- Status counts: `{"pass":32,"finding":2,"inconclusive":0,"error":0,"not_run_credentials_required":0,"not_run_secondary_credentials_required":1,"not_run_target_unavailable":0,"not_run_safety_limit":0}`
- Severity counts: `{"critical":0,"high":0,"medium":2,"low":0,"info":33}`

## Findings

### tool-runnable: Security probe command executed

- Metric: `security_probe_tool`
- Surface: `tool`
- Status: `pass`
- Severity: `info`

The Category 8 security probe CLI started and produced a report artifact.

**Reproduction Steps**

1. Run the documented security audit command from the repository root.
2. Confirm JSON and Markdown reports are written to the configured output directory.

**Evidence**

  - mode: `"local"`
  - webUrl: `"http://localhost:5173"`
  - apiUrl: `"http://localhost:3000"`
  - reportName: `"security-audit-baseline"`

### auth-unauth-documents-list: Unauthenticated GET /api/documents denied unauthenticated access

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The protected route did not return protected data without authentication.

**Reproduction Steps**

1. Request http://localhost:3000/api/documents without a session cookie or bearer token.

**Evidence**

  - status: `401`
  - body: `"{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"No session found\"}}"`

### auth-unauth-documents-create: Unauthenticated POST /api/documents denied unauthenticated access

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The protected route did not return protected data without authentication.

**Reproduction Steps**

1. Request http://localhost:3000/api/documents without a session cookie or bearer token.

**Evidence**

  - status: `403`
  - body: `"{\"error\":{\"code\":\"REQUEST_ERROR\",\"message\":\"invalid csrf token\"}}"`

### auth-unauth-auth-me: Unauthenticated GET /api/auth/me denied unauthenticated access

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The protected route did not return protected data without authentication.

**Reproduction Steps**

1. Request http://localhost:3000/api/auth/me without a session cookie or bearer token.

**Evidence**

  - status: `401`
  - body: `"{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"No session found\"}}"`

### auth-unauth-admin-workspaces: Unauthenticated GET /api/admin/workspaces denied unauthenticated access

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The protected route did not return protected data without authentication.

**Reproduction Steps**

1. Request http://localhost:3000/api/admin/workspaces without a session cookie or bearer token.

**Evidence**

  - status: `401`
  - body: `"{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"No session found\"}}"`

### auth-malformed-session: Malformed session cookie denied unauthenticated access

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The protected route did not return protected data without authentication.

**Reproduction Steps**

1. Request http://localhost:3000/api/auth/me without a session cookie or bearer token.

**Evidence**

  - status: `401`
  - body: `"{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Invalid session\"}}"`

### auth-malformed-bearer: Malformed bearer token denied unauthenticated access

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The protected route did not return protected data without authentication.

**Reproduction Steps**

1. Request http://localhost:3000/api/auth/me without a session cookie or bearer token.

**Evidence**

  - status: `401`
  - body: `"{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Invalid or expired API token\"}}"`

### auth-login-primary: Primary credentials authenticated

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The probe attempted the primary credential pair to unlock authenticated checks.

**Reproduction Steps**

1. Fetch CSRF token.
2. POST /api/auth/login as dev@ship.local.

**Evidence**

  - status: `200`
  - success: `true`
  - credentialSource: `"default"`
  - userId: `"3b389183-8329-448b-8e6f-f277af89539e"`
  - workspaceId: `"9b2c119e-ae83-46af-96ff-178e28c47ddf"`

### auth-cookie-httponly: Session cookie HttpOnly flag present

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The session cookie includes the expected hardening attribute.

**Reproduction Steps**

1. Log in with valid credentials.
2. Inspect the Set-Cookie attributes for session_id.

**Evidence**

  - expected: `true`
  - actual: `true`

### auth-cookie-samesite: Session cookie SameSite=Strict flag present

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The session cookie includes the expected hardening attribute.

**Reproduction Steps**

1. Log in with valid credentials.
2. Inspect the Set-Cookie attributes for session_id.

**Evidence**

  - expected: `"Strict"`
  - actual: `"Strict"`

### auth-cookie-secure: Session cookie Secure flag on HTTPS targets present

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The session cookie includes the expected hardening attribute.

**Reproduction Steps**

1. Log in with valid credentials.
2. Inspect the Set-Cookie attributes for session_id.

**Evidence**

  - required: `false`
  - actual: `undefined`

### auth-missing-csrf: State-changing request without CSRF token rejected

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `pass`
- Severity: `info`

The API did not accept an authenticated state-changing request without a CSRF token.

**Reproduction Steps**

1. Log in and POST /api/documents without x-csrf-token.

**Evidence**

  - status: `403`
  - body: `"{\"error\":{\"code\":\"REQUEST_ERROR\",\"message\":\"invalid csrf token\"}}"`

### auth-role-boundary-secondary: Role-boundary probe requires secondary credentials

- Metric: `auth_session_vulnerabilities`
- Surface: `auth_session`
- Status: `not_run_secondary_credentials_required`
- Severity: `info`

No secondary credential pair was provided for privilege-escalation checks.

**Reproduction Steps**

1. Provide SHIP_SECURITY_ALT_EMAIL and SHIP_SECURITY_ALT_PASSWORD, or --alt-email and --alt-password.

**Evidence**

  - secondaryProvided: `false`

### input-login-payloads: Login rejects XSS and SQLi-like payloads safely

- Metric: `input_sanitization_failures`
- Surface: `input_sanitization`
- Status: `pass`
- Severity: `info`

The adversarial input was rejected or not reflected in an executable response context.

**Reproduction Steps**

1. POST /api/auth/login with XSS marker email and SQLi-like password.

**Evidence**

  - status: `401`
  - contentType: `"application/json; charset=utf-8"`
  - reflectedPayloads: `[]`
  - body: `"{\"success\":false,\"error\":{\"code\":\"INVALID_CREDENTIALS\",\"message\":\"Invalid email or password\"}}"`

### input-public-feedback-program-id: Public feedback program lookup handles malformed ID safely

- Metric: `input_sanitization_failures`
- Surface: `input_sanitization`
- Status: `pass`
- Severity: `info`

The adversarial input was rejected or not reflected in an executable response context.

**Reproduction Steps**

1. GET /api/feedback/program/<event-handler-payload>.

**Evidence**

  - status: `404`
  - contentType: `"application/json; charset=utf-8"`
  - reflectedPayloads: `[]`
  - body: `"{\"error\":\"Program not found\"}"`

### input-document-title-xss: Document title stores XSS marker as data

- Metric: `input_sanitization_failures`
- Surface: `input_sanitization`
- Status: `pass`
- Severity: `info`

The payload was handled as API data rather than executable HTML.

**Reproduction Steps**

1. Create a document with a script-tag title.
2. GET /api/documents/:id.

**Evidence**

  - status: `200`
  - contentType: `"application/json; charset=utf-8"`
  - reflectedPayloads: `["<script>window.__shipSecurityProbeXss=1</script>"]`
  - body: `"{\"id\":\"31e01de4-ae0b-428d-abcc-580256f48cca\",\"workspace_id\":\"9b2c119e-ae83-46af-96ff-178e28c47ddf\",\"document_type\":\"wiki\",\"title\":\"<script>window.__shipSecurityProbeXss=1</script> ship-security-probe-2ba2b9bf-c4bc-4c06-8d12-065d0aa51525\",\"content\":{\"type\":\"doc\",\"content\":[]},\"yjs_state\":null,\"parent_id\":null,\"position\":0,\"properties\":{},\"ticket_number\":null,\"archived_at\":null,\"deleted_at\":null,\"started_at\":null,\"completed_at\":null,\"cancelled_at\":null,\"reopened_at\":null,\"converted_to_id\":null,\"co..."`

### input-comment-content-xss: Comment content stores event-handler marker as data

- Metric: `input_sanitization_failures`
- Surface: `input_sanitization`
- Status: `pass`
- Severity: `info`

The payload was handled as API data rather than executable HTML.

**Reproduction Steps**

1. Create a comment with an event-handler payload.
2. Inspect the API response JSON.

**Evidence**

  - status: `201`
  - contentType: `"application/json; charset=utf-8"`
  - reflectedPayloads: `[]`
  - body: `"{\"id\":\"239c17da-4777-4f7e-9ce7-c24ec270d1a9\",\"document_id\":\"31e01de4-ae0b-428d-abcc-580256f48cca\",\"comment_id\":\"2e76266d-eeb3-4635-ac3b-088c126427d5\",\"parent_id\":null,\"content\":\"<img src=x onerror=\\\"window.__shipSecurityProbeXss=1\\\">\",\"resolved_at\":null,\"author\":{\"id\":\"3b389183-8329-448b-8e6f-f277af89539e\",\"name\":\"Dev User\",\"email\":\"dev@ship.local\"},\"created_at\":\"2026-05-21T22:41:19.361Z\",\"updated_at\":\"2026-05-21T22:41:19.361Z\"}"`

### input-document-title-long: Document title rejects overlong input

- Metric: `input_sanitization_failures`
- Surface: `input_sanitization`
- Status: `pass`
- Severity: `info`

The route rejected the overlong input.

**Reproduction Steps**

1. POST an input longer than 255 characters.

**Evidence**

  - status: `400`
  - contentType: `"application/json; charset=utf-8"`
  - reflectedPayloads: `[]`
  - body: `"{\"error\":\"Invalid input\",\"details\":[{\"code\":\"too_big\",\"maximum\":255,\"type\":\"string\",\"inclusive\":true,\"exact\":false,\"message\":\"String must contain at most 255 character(s)\",\"path\":[\"title\"]}]}"`

### input-issue-title-sqli: Issue title SQLi-like payload handled as inert data

- Metric: `input_sanitization_failures`
- Surface: `input_sanitization`
- Status: `pass`
- Severity: `info`

The SQL injection-like string did not produce an authentication bypass or server error.

**Reproduction Steps**

1. POST /api/issues with a SQLi-like title string.

**Evidence**

  - status: `201`
  - contentType: `"application/json; charset=utf-8"`
  - reflectedPayloads: `["' OR '1'='1"]`
  - body: `"{\"id\":\"b3f4ddaa-b14a-4642-9f9d-a02c0ec3b214\",\"title\":\"ship-security-probe-2ba2b9bf-c4bc-4c06-8d12-065d0aa51525-' OR '1'='1\",\"state\":\"backlog\",\"priority\":\"medium\",\"assignee_id\":null,\"estimate\":null,\"source\":\"internal\",\"rejection_reason\":null,\"due_date\":null,\"is_system_generated\":false,\"accountability_target_id\":null,\"accountability_type\":null,\"ticket_number\":38,\"created_at\":\"2026-05-21T22:41:19.374Z\",\"updated_at\":\"2026-05-21T22:41:19.374Z\",\"created_by\":\"3b389183-8329-448b-8e6f-f277af89539e\",\"star..."`

### dependency-high-critical-cves: No high or critical dependency CVEs found

- Metric: `high_critical_cves`
- Surface: `dependency_cve`
- Status: `pass`
- Severity: `info`

The probe parsed pnpm audit JSON and counted high/critical advisories.

**Reproduction Steps**

1. Run pnpm audit --json from the repository root.

**Evidence**

  - counts: `{"critical":0,"high":0}`
  - advisories: `[]`
  - rawExitStatus: `0`

### cors-csp-cors: CORS did not allow untrusted credentialed origin

- Metric: `cors_csp_misconfiguration`
- Surface: `cors_csp`
- Status: `pass`
- Severity: `info`

The probe sent an untrusted Origin preflight and inspected CORS response headers.

**Reproduction Steps**

1. Send OPTIONS /api/auth/me with Origin: https://ship-security-probe.invalid.
2. Inspect Access-Control-Allow-Origin and Access-Control-Allow-Credentials.

**Evidence**

  - status: `204`
  - allowOrigin: `"http://localhost:5173"`
  - allowCredentials: `"true"`

### cors-csp-api-csp: API Content Security Policy header present

- Metric: `cors_csp_misconfiguration`
- Surface: `cors_csp`
- Status: `pass`
- Severity: `info`

The target response included a Content-Security-Policy header.

**Reproduction Steps**

1. GET http://localhost:3000/health.
2. Inspect the Content-Security-Policy response header.

**Evidence**

  - status: `200`
  - csp: `"default-src 'self';script-src 'self' 'unsafe-inline';style-src 'self' 'unsafe-inline';img-src 'self' data: blob: https:;connect-src 'self' wss: ws:;font-src 'self' data:;object-src 'none';frame-src 'none';base-uri 'self';form-action 'self';frame-ancestors 'self';script-src-attr 'none';upgrade-insecure-requests"`
  - hasUnsafeInline: `true`
  - localDevTolerated: `false`
  - error: `undefined`

### cors-csp-web-csp: Web Content Security Policy header missing on local dev target (tolerated)

- Metric: `cors_csp_misconfiguration`
- Surface: `cors_csp`
- Status: `pass`
- Severity: `info`

The local Vite development target did not include a Content-Security-Policy header; deployed targets are still treated as findings.

**Reproduction Steps**

1. GET http://localhost:5173.
2. Inspect the Content-Security-Policy response header.

**Evidence**

  - status: `200`
  - csp: `undefined`
  - hasUnsafeInline: `false`
  - localDevTolerated: `true`
  - error: `undefined`

### secrets-common-paths: No secret-like values on common paths

- Metric: `secrets_exposure_risk`
- Surface: `secrets`
- Status: `pass`
- Severity: `info`

The probe requested common accidental exposure paths and searched for secret-like values.

**Reproduction Steps**

1. GET http://localhost:5173/.env.
2. GET http://localhost:3000/.env.
3. GET http://localhost:3000/api/.env.
4. GET http://localhost:5173/config.json.

**Evidence**

  - checked: `[{"url":"http://localhost:5173/.env","status":403},{"url":"http://localhost:3000/.env","status":404},{"url":"http://localhost:3000/api/.env","status":404},{"url":"http://localhost:5173/config.json","status":200}]`
  - exposures: `[]`

### rate-limit-coverage-review: API and WebSocket rate limiting coverage present by code review

- Metric: `rate_limiting_absent`
- Surface: `rate_limiting`
- Status: `pass`
- Severity: `info`

Manual review found global API, login, WebSocket connection, and WebSocket message limiters wired in application code.

**Reproduction Steps**

1. Review api/src/app.ts for loginLimiter and apiLimiter.
2. Review api/src/collaboration/index.ts for connection and message rate limits.

**Evidence**

  - apiLimiter: `"api/src/app.ts app.use(/api/, apiLimiter)"`
  - loginLimiter: `"api/src/app.ts app.use(/api/auth/login, loginLimiter)"`
  - websocketLimits: `"api/src/collaboration/index.ts RATE_LIMIT"`
  - absentEndpoints: `[]`

### verbose-error-malformed-json: Verbose error details leaked

- Metric: `verbose_error_leakage`
- Surface: `verbose_errors`
- Status: `finding`
- Severity: `medium`

The probe sent malformed JSON and inspected the response for stack traces, SQL, paths, or secret names.

**Reproduction Steps**

1. POST malformed JSON to /api/auth/login.

**Evidence**

  - status: `400`
  - leaks: `["JSON\\s+at\\s+position\\s+\\d+","line\\s+\\d+\\s+column\\s+\\d+"]`
  - body: `"{\"error\":{\"code\":\"REQUEST_ERROR\",\"message\":\"Expected ':' after property name in JSON at position 11 (line 1 column 12)\"}}"`

**Recommendation**

Return generic parse errors and log internal details server-side only.

### ws-unauth-events: Unauthenticated /events WebSocket upgrade rejected

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `pass`
- Severity: `info`

The WebSocket endpoint rejected an unauthenticated upgrade request.

**Reproduction Steps**

1. Open ws://localhost:3000/events without a session cookie.

**Evidence**

  - url: `"ws://localhost:3000/events"`
  - opened: `false`
  - httpStatus: `401`
  - closeCode: `undefined`
  - closeReason: `undefined`
  - error: `undefined`
  - messages: `[]`

### ws-unauth-collaboration: Unauthenticated collaboration WebSocket upgrade rejected

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `pass`
- Severity: `info`

The WebSocket endpoint rejected an unauthenticated upgrade request.

**Reproduction Steps**

1. Open ws://localhost:3000/collaboration/wiki:00000000-0000-4000-8000-000000000000 without a session cookie.

**Evidence**

  - url: `"ws://localhost:3000/collaboration/wiki:00000000-0000-4000-8000-000000000000"`
  - opened: `false`
  - httpStatus: `401`
  - closeCode: `undefined`
  - closeReason: `undefined`
  - error: `undefined`
  - messages: `[]`

### ws-auth-events-open: Authenticated /events WebSocket opens

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `pass`
- Severity: `info`

The authenticated WebSocket opened so validation messages can be tested.

**Reproduction Steps**

1. Open ws://localhost:3000/events with a valid session cookie.

**Evidence**

  - url: `"ws://localhost:3000/events"`
  - opened: `true`
  - httpStatus: `undefined`
  - closeCode: `undefined`
  - closeReason: `undefined`
  - error: `undefined`
  - messages: `[]`

### ws-events-ping: Events WebSocket ping returned pong

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `pass`
- Severity: `info`

The probe sent a valid ping message to establish baseline event socket behavior.

**Reproduction Steps**

1. Open /events with a valid session cookie.
2. Send {"type":"ping"}.

**Evidence**

  - sentBytes: `15`
  - stillOpen: `true`
  - closeCode: `undefined`
  - closeReason: `undefined`
  - error: `undefined`
  - messages: `["{\"type\":\"connected\",\"data\":{}}","{\"type\":\"pong\"}"]`

### ws-events-malformed-json: Events WebSocket malformed JSON handling handled safely

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `pass`
- Severity: `info`

The WebSocket stayed open or closed with a controlled policy/validation code.

**Reproduction Steps**

1. Open the authenticated WebSocket.
2. Send 9 bytes of malformed or unexpected data.

**Evidence**

  - sentBytes: `9`
  - stillOpen: `true`
  - closeCode: `undefined`
  - closeReason: `undefined`
  - error: `undefined`
  - messages: `[]`

### ws-auth-collaboration-open: Authenticated collaboration WebSocket opens

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `pass`
- Severity: `info`

The authenticated WebSocket opened so validation messages can be tested.

**Reproduction Steps**

1. Open ws://localhost:3000/collaboration/wiki:f64ec752-2a02-4106-9c57-ca7302249865 with a valid session cookie.

**Evidence**

  - url: `"ws://localhost:3000/collaboration/wiki:f64ec752-2a02-4106-9c57-ca7302249865"`
  - opened: `true`
  - httpStatus: `undefined`
  - closeCode: `undefined`
  - closeReason: `undefined`
  - error: `undefined`
  - messages: `[]`

### ws-collaboration-unexpected-type: Collaboration WebSocket unexpected message type handling handled safely

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `pass`
- Severity: `info`

The WebSocket stayed open or closed with a controlled policy/validation code.

**Reproduction Steps**

1. Open the authenticated WebSocket.
2. Send 1 bytes of malformed or unexpected data.

**Evidence**

  - sentBytes: `1`
  - stillOpen: `true`
  - closeCode: `undefined`
  - closeReason: `undefined`
  - error: `undefined`
  - messages: `["\u0003","\u0000\u0000\u0001\u0000","\u0001\n\u0001���\b\u0000\u0002{}"]`

### ws-collaboration-malformed-binary: Collaboration WebSocket malformed binary handling was not handled safely

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `finding`
- Severity: `medium`

The WebSocket closed unexpectedly after a malformed or unexpected message.

**Reproduction Steps**

1. Open the authenticated WebSocket.
2. Send 1 bytes of malformed or unexpected data.

**Evidence**

  - sentBytes: `1`
  - stillOpen: `false`
  - closeCode: `1006`
  - closeReason: `""`
  - error: `undefined`
  - messages: `[]`

**Recommendation**

Catch malformed WebSocket protocol messages and close with a controlled code.

### ws-collaboration-oversized-payload: Oversized WebSocket payload rejected

- Metric: `websocket_validation_failures`
- Surface: `websocket`
- Status: `pass`
- Severity: `info`

The probe sent one payload above the documented WebSocket max payload size.

**Reproduction Steps**

1. Open an authenticated collaboration WebSocket.
2. Send 10485761 bytes.

**Evidence**

  - sentBytes: `10485761`
  - stillOpen: `false`
  - closeCode: `undefined`
  - closeReason: `undefined`
  - error: `undefined`
  - messages: `[]`

