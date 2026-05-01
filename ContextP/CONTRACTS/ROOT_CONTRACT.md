# ROOT CONTRACT — ContextP v2
## Immutable System Principles

**Priority:** MAXIMUM — overrides all other contracts  
**Mutability:** IMMUTABLE (requires human explicit override)  
**Version:** 1.0.0

---

## AXIOMS (Non-negotiable rules)

### AX-01 — Security
- NEVER expose API keys, tokens, secrets, or credentials in source code
- NEVER commit `.env` files with real values to version control
- ALWAYS use environment variables or secret managers for sensitive data

### AX-02 — Context Integrity
- ALWAYS read `_INDEX/INDEX_MASTER.md` before proposing any solution
- ALWAYS check applicable contracts before generating code
- NEVER ignore a contract — if conflict exists, escalate to ROOT_CONTRACT priority

### AX-03 — Audit Trail
- EVERY significant decision must be traceable to a contract or pattern
- EVERY session must produce at least one AUDIT log entry
- NEVER delete audit logs — append only

### AX-04 — Knowledge Preservation
- EVERY successful solution must be consolidated into STRUCT/, TECH/, or FUNC/
- EVERY failure must be documented in AUDIT/failure/ with root cause analysis
- NEVER leave INDEX_MASTER.md stale — update after each CONSOLIDATE phase

### AX-05 — Human Primacy
- The developer's explicit instruction overrides any pattern or contract
- When in conflict, ask — do not assume
- ContextP assists, it does not replace human judgment

---

## CONTRACT HIERARCHY (Conflict Resolution)

```
ROOT_CONTRACT     ← Priority 1 (this file)
  TECH_CONTRACT   ← Priority 2
  FUNC_CONTRACT   ← Priority 3
  STRUCT_CONTRACT ← Priority 4
  AUDIT_CONTRACT  ← Priority 5 (governs logging across all)
```

When two contracts conflict, the higher priority wins. Document the conflict in AUDIT/exploration_log/.
