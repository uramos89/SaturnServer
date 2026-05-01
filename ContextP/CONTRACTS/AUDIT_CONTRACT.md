# AUDIT CONTRACT — ContextP v2
## Logging and Traceability Rules

**Priority:** 5 (governs ALL phases)  
**Mutability:** SEMI-MUTABLE (format is fixed, fields can be extended)  
**Version:** 1.0.0

---

## GENERAL RULES

### AC-01 — Log Format
- EVERY audit log must follow the standard template (see below)
- EVERY log must have a unique ID: `[DOMAIN]-[SEQUENCE]-[YYYYMMDD]`
- NEVER use free-form text without structure

### AC-02 — Mandatory Log Events
Log MUST be created for:
- Every INGEST CODEBASE execution
- Every new pattern consolidated
- Every contract violation detected
- Every feature completed (success or failure)
- Every architectural decision made

### AC-03 — Metrics Update
- After every success/failure log, update AUDIT/metrics/METRICS_MASTER.md
- Recalculate pattern confidence after each application
- Track velocity and error trends weekly

---

## STANDARD LOG TEMPLATE

```markdown
## [DOMAIN]-[SEQ]-[YYYYMMDD] | [Title]

**Date:** YYYY-MM-DD  
**Type:** success | failure | exploration | ingest  
**Domain:** TECH | FUNC | STRUCT | AUDIT | INGEST  
**Technologies:** [list]  
**Pattern Applied:** [ID or "new"]  
**Contracts Referenced:** [list]  

### Context
[What was the situation or task?]

### Action Taken
[What was done?]

### Result
[What happened?]

### Metrics
- Time to complete: [X]
- Lines of code: [Y]
- Tests written: [Z]
- Confidence delta: [±%]

### Lessons Learned
[What should ContextP remember?]

### Confidence Updates
- Pattern [ID]: [X]% → [Y]%
```
