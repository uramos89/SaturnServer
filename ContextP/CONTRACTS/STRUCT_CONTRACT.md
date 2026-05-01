# STRUCT CONTRACT — ContextP v2
## Architectural Pattern Rules

**Priority:** 4  
**Mutability:** MUTABLE (architectural evolution is expected)  
**Version:** 1.0.0

---

## GENERAL RULES

### SC-01 — Architectural Consistency
- ALWAYS follow the established folder/module structure of the project
- NEVER create files in locations that contradict existing conventions
- When a new structural pattern is introduced, document it in STRUCT/

### SC-02 — Separation of Concerns
- ALWAYS separate business logic from transport layer (HTTP, CLI, etc.)
- ALWAYS separate data access from business logic
- NEVER put business rules in view/controller layer

### SC-03 — Dependency Direction
- Dependencies must flow inward (domain ← application ← infrastructure)
- NEVER create circular dependencies
- Document dependency graph when introducing new modules

### SC-04 — Pattern Evolution
- ALWAYS version architectural patterns (v1.0, v1.1, v2.0)
- NEVER remove a pattern — deprecate and replace
- Document migration paths when upgrading patterns

---

## PATTERN REGISTRY
> Populated during OBSERVE, INGEST CODEBASE, and CONSOLIDATE phases.

| ID | Pattern | Category | Confidence | Applied In | Version |
|----|---------|----------|-----------|-----------|---------|
| P-01 | Repository | Data Access | 90% | SSH Connections | v1.0 |
| P-02 | Observer | Monitoring | 85% | Server Metrics | v1.0 |
| P-03 | Strategy | AI Analysis | 80% | OBPA Cycle | v1.0 |
| P-04 | State Machine | Workflow | 85% | Incident Management | v1.0 |
| P-05 | Publisher-Subscriber | Notifications | 80% | Notification System | v1.0 |
| P-06 | Middleware Chain | HTTP | 90% | Express Routes | v1.0 |
| P-07 | File System Store | Knowledge | 75% | ContextP | v1.0 |
