# Agent & Developer Operating Instructions

Welcome to the **LWILL AI BUILDER v1** repository. All AI assistants and human developers working on this codebase MUST follow these mandatory operating rules.

---

## 1. Context Acquisition Protocol (Mandatory First Steps)

Before writing code or making architectural changes, every developer and AI agent MUST:

1. **Read `docs/PROJECT-STATUS.md` FIRST**: Inspect the current verified baseline state, implemented features, and active blockers.
2. **Read `docs/ARCHITECTURE.md`**: Understand verified architecture boundaries vs. target/unimplemented design goals.
3. **Read `docs/DECISIONS.md`**: Review mandatory Architectural Decision Records (ADRs).
4. **Inspect Git Context**: Run `git status`, `git branch`, and check recent commits (`git log -n 5`) to confirm working tree state.
5. **Verify Claims Against Source**: Never assume a feature exists because it is mentioned in SRS documents, prompt history, or AI chat logs. Source code and passing tests are the ONLY implementation evidence.

---

## 2. Core Operating Principles

- **Single Source of Truth**: The existing codebase and explicit git commits are the source of truth. SRS documents represent requirements, not existing implementations.
- **Smallest Safe Changes**: Make incremental, scoped, surgical changes. Avoid broad refactoring unless explicitly instructed.
- **Strict Verification Protocol**: Run relevant verification commands (`pnpm lint`, `pnpm build`) after any code modifications.
- **Update Status Continuity**: Always update `docs/PROJECT-STATUS.md` after completing a meaningful phase or architectural change.
- **Security First**: NEVER commit API keys, secrets, credentials, or `.env` files containing real secrets.
- **Package Manager Rules**:
  - `pnpm` is strictly mandatory (`packageManager`: `pnpm@11.20.0`).
  - NEVER introduce `package-lock.json` or `yarn.lock`.
  - Always run `pnpm install --frozen-lockfile` in CI or clean verification environments.
- **Backward Compatibility**: Preserve existing working architecture and API contracts where practical.

---

## 3. Mandatory Handover Checklist for Agents

Upon finishing your assigned task:
1. Ensure all new or modified code passes type checks, linting (`pnpm lint`), and builds (`pnpm build`).
2. Update `docs/PROJECT-STATUS.md` with accurate details of what was verified, changed, or left pending.
3. Provide exact verification commands and git diff summary in your handover note.

## Current X Nail handover constraint

The X Nail native-auth navigation nail is locally implemented on `phase-1d-native-auth` at `c66bbb8` with uncommitted changes. Review only the scoped auth page/test/documentation changes; do not touch unrelated customer/CRM/RBAC/bootstrap work, Prisma schema/migrations, TenantDomain production data, production DB state, or deployment configuration.
