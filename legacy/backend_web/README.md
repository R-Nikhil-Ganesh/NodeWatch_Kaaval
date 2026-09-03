# backend_web

Express-based in-memory API that mirrors the mock data used by the `frontend_web` app. It exposes simple REST endpoints for authentication, cases, evidence, users, documents, and logs.

## Quickstart

1) Install dependencies

```
npm install
```

2) Run the API (defaults to port 4000 and allows CORS from http://localhost:5173)

```
npm run dev
```

Environment variables:
- `PORT` (default: `4000`)
- `FRONTEND_ORIGIN` (default: `http://localhost:5173`)

## Key endpoints

- `GET /health` – service status
- `POST /api/auth/login` – { username, password }
- `POST /api/auth/logout` – { userId }
- `GET /api/users`
- `PATCH /api/users/:id`
- `GET /api/cases`
- `POST /api/cases`
- `PATCH /api/cases/:caseId/status`
- `POST /api/cases/:caseId/transfer-custody`
- `GET /api/evidence`
- `POST /api/evidence`
- `PATCH /api/evidence/:id/verify`
- `PATCH /api/evidence/:id/approve`
- `PATCH /api/evidence/:id/visibility`
- `POST /api/evidence/:id/section63`
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/logs?limit=200`
- `POST /api/logs`
- `GET /api/designations`

All data is kept in memory (see `src/data.js`) and will reset on restart. Logs are appended automatically for most write operations.
