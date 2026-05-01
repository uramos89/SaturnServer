# Constraints — ContextP v2

**Scope:** project + global  
**Mutability:** semi-mutable  
**Last Updated:** 2026-05-01

---

## Hard Constraints (must never be violated)
- No external API calls in unit tests
- No production database access in development
- No direct commits to main/master branch
- No storing SSH keys or passwords in plaintext
- No exposing API keys in source code

## Soft Constraints (prefer to avoid)
- Avoid introducing new dependencies without team discussion
- Avoid changing public API contracts without versioning
- Avoid mixing frontend and backend logic in same file

## Resource Limits
- Max file size: 500 lines (preferred)
- Max function length: 50 lines (preferred)
- Max cyclomatic complexity: 10 (preferred)
