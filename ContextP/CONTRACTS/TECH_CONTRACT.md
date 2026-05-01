# TECH CONTRACT — ContextP v2
## Technical Stack Rules

**Priority:** 2  
**Mutability:** MUTABLE (update when stack evolves)  
**Version:** 1.1.0

---

## GENERAL RULES

### TC-01 — Stack Consistency
- ALWAYS use the technologies already established in the project
- NEVER introduce a new dependency without documenting it in TECH/
- PREFER libraries already present in the project over new ones

### TC-02 — Code Quality
- ALWAYS write code that passes the project's existing linter/formatter
- ALWAYS add types/interfaces where the language supports them
- NEVER use `any` type in TypeScript unless explicitly justified

### TC-03 — Testing
- ALWAYS write tests for new logic (unit minimum, integration where applicable)
- NEVER ship code that breaks existing tests
- Document test strategy in FUNC/ for each domain

### TC-04 — Documentation
- ALWAYS add inline comments for non-obvious logic
- ALWAYS update README or docs when public API changes
- Document technology decisions in TECH/[technology]/overview.md

---

## SECURITY RULES (Best Practices)

### TS-01 — API Security
- ALWAYS use appropriate HTTP methods (GET for read, POST for create, etc.)
- ALWAYS return generic error messages to clients (log details only on server)
- NEVER use auto-incremental IDs for sensitive public resources; PREFER UUIDs
- ALWAYS implement Rate Limiting (Throttling) on public endpoints

### TS-02 — Data Protection
- ALWAYS use environment variables for secrets; NEVER commit them
- ALWAYS encrypt sensitive data at rest (e.g., SSH keys)
- ALWAYS validate and sanitize all user inputs to prevent SQLi and XSS

---

## STACK REGISTRY
> Auto-populated during OBSERVE phase and INGEST CODEBASE command.

| Technology | Version | Confidence | Last Verified |
|-----------|---------|-----------|---------------|
| TypeScript | 5.x | 95% | 2026-05-01 |
| Node.js | 20+ | 95% | 2026-05-01 |
| Express | 4.x | 90% | 2026-05-01 |
| Vite | 6.x | 90% | 2026-05-01 |
| React | 19.x | 90% | 2026-05-01 |
| better-sqlite3 | — | 85% | 2026-05-01 |
| Google GenAI | — | 80% | 2026-05-01 |
| PM2 | — | 85% | 2026-05-01 |
| ssh2 | — | 80% | 2026-05-01 |

---

## ANTI-PATTERNS
> Things explicitly NOT to do in this project.

| ID | Anti-Pattern | Reason | Detected On |
|----|-------------|--------|-------------|
| AP-01 | Direct DB access from frontend | Security violation | 2026-05-01 |
| AP-02 | Storing SSH keys in plaintext | Security violation | 2026-05-01 |
| AP-03 | Hardcoded credentials | Violates AX-01 | 2026-05-01 |
