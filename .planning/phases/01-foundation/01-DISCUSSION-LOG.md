# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-foundation
**Areas discussed:** Supabase Setup, Auth Providers, Project Structure, Routing

---

## Gray Areas Presented

### 1. Supabase Setup
| Option | Description | Selected |
|--------|-------------|----------|
| Local Docker dev (recommended) | npx supabase init + Docker — free, fast, no account needed | ✓ |
| Existing cloud project | Use existing Supabase project — skip schema setup | |

**Decision:** Local Docker dev

### 2. Auth Providers
| Option | Description | Selected |
|--------|-------------|----------|
| Email/password only (recommended) | Simple email/password signup — scope control for Phase 1 | ✓ |
| Email + Google OAuth | Both methods — more convenient but more scope | |

**Decision:** Email/password only

### 3. Project Structure
| Option | Description | Selected |
|--------|-------------|----------|
| Feature-based structure (recommended) | src/components/, pages/, lib/, hooks/ | ✓ |
| Keep as single file | Flat structure, keep autonomo-tax-prep.jsx as-is | |

**Decision:** Feature-based structure

### 4. Routing
| Option | Description | Selected |
|--------|-------------|----------|
| Single-page tabs (recommended) | Tab nav, no React Router in Phase 1 | ✓ |
| React Router | Multi-page routing | |

**Decision:** Single-page with tab navigation

---

## Deferred Ideas

- Google OAuth — deferred to Phase 2 (scope control)
- React Router — deferred (Phase 1 simplicity)
- File deletion — deferred (Phase 1 upload only)
