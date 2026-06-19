---
name: R2 Mock Setup
description: How Cloudflare R2 is mocked locally in the Node.js backend server
---

# R2 Mock in Local Node.js Server

## The Rule
`backend/src/server.ts` has `createR2Mock()` that provides a filesystem-backed R2 implementation.
Files are stored in `backend/public/r2-mock/` directory.
The `/api/upload/view?key=...` endpoint reads from this mock.

**Why:** Cloudflare R2 is a Workers binding, not available in local Node.js dev mode. The mock allows testing image uploads without real R2 credentials.

**How to apply:**
- Upload routes check `c.env.MANDOUBAK_R2` — in server.ts this is set to the mock object
- Uploaded files go to `backend/public/r2-mock/` (flattened path)
- URLs returned as `/api/upload/view?key=...` work correctly via the mock
- In production (Cloudflare Workers), real R2 binding replaces the mock automatically
