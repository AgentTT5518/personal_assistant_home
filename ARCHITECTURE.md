# Architecture — Personal Assistant Home

> Last updated: 2026-03-18 | Updated by: Claude Code

## System Overview
Personal Assistant Home is an AI-powered personal assistant that helps users organise their personal life. It leverages Claude API for intelligent task management, scheduling, and personal productivity. The system is designed to be a private, self-hosted assistant.

## Architecture Diagram
```mermaid
graph TB
    subgraph Client
        UI[Frontend]
    end

    subgraph Server
        API[API Routes]
        BL[Business Logic]
    end

    subgraph External
        DB[(Database)]
        AI[AI Service]
    end

    UI -->|HTTP| API
    API --> BL
    BL --> DB
    BL --> AI
```
> Update this diagram whenever system topology changes.

## Component Map

| Component | Location | Responsibility | Dependencies |
|-----------|----------|----------------|--------------|
| _Example_ | `src/features/auth/` | _Login, signup, sessions_ | _Firebase Auth_ |

> Add a row for every new component, service, or module.

## Data Model

### Core Entities

| Entity | Storage | Key Fields | Relationships |
|--------|---------|------------|---------------|
| _Example: User_ | _`users` table_ | _id, email, name_ | _Has many Projects_ |

### Schema Notes
<!-- Non-obvious schema decisions, indexing, migrations -->

## API Endpoints

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| GET | `/api/health` | Health check | No | -- |

> Add every new endpoint. Include auth requirements.

## External Integrations

| Service | Purpose | Config | Rate Limits | Error Handling |
|---------|---------|--------|-------------|----------------|
| _Example_ | _AI responses_ | _`API_KEY` in .env.local_ | _1000/min_ | _Retry 3x backoff_ |

## Error Handling Strategy

### Error Flow
```
Client Error  -> Error Boundary -> Logger -> User-friendly message
API Error     -> try-catch -> Logger -> Consistent JSON error response
Service Error -> try-catch -> Logger -> Retry (if applicable) -> Propagate
```

### API Error Response Format
```json
{ "error": { "code": "RESOURCE_NOT_FOUND", "message": "Human-readable description" } }
```

## Security

### Secret Management
- All secrets in `.env.local` (never committed)
- `.env.example` maintained with placeholders
- Server-side only — never in client bundle
- Pre-commit scan (CLAUDE.md Rule 1)

### Input Validation
<!-- Describe: zod, sanitization, parameterized queries, etc. -->

### Deployment Security
- CI runs on every PR: `typecheck` + `lint` + `test` + secret scan — blocks merge on failure
- CD runs on merge to `main`: build + deploy
- Branch protection on `main`: merges require CI to pass (GitHub → Settings → Branches)
- Deploy secrets stored in GitHub Settings → Secrets and variables → Actions — never in code
- All env vars set in hosting platform — never in build output or logs

## Feature Log

| Feature | Date | Key Decisions | Files Changed |
|---------|------|---------------|---------------|
| Project Scaffolding | 2026-03-18 | Initial setup from Claude_BestPractise template; npm as package manager; Claude API as AI provider | All initial files |

> Add a row after completing each feature. Link to `docs/decisions/` for details.

---
_Maintained by Claude Code per CLAUDE.md Rule 4._
