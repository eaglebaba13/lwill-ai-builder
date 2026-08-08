# Developer & Agent Handover Guide

This guide provides step-by-step instructions for any developer or AI assistant resuming work on **LWILL AI BUILDER v1**.

---

## 1. Environment Startup & Inspection Procedure

1. **Verify Workspace Prerequisites**:
   - Node.js (v18+ or v20+ recommended).
   - `pnpm` version 11.20.0 (`pnpm --version`).

2. **Inspect Repository State**:
   ```bash
   git status
   git branch
   git log -n 5
   ```

3. **Read Mandatory Governance Files**:
   1. `AGENTS.md` - Operating guidelines.
   2. `docs/PROJECT-STATUS.md` - Current status and verified baseline state.
   3. `docs/ARCHITECTURE.md` - Verified architecture vs. target designs.
   4. `docs/DECISIONS.md` - Architectural Decision Records (ADRs).

---

## 2. Baseline Verification Commands

Before writing any code or starting a new phase, verify that the existing codebase builds and passes all checks:

```bash
# 1. Install dependencies deterministically
pnpm install --frozen-lockfile

# 2. Run workspace linting
pnpm lint

# 3. Build all workspace applications
pnpm build
```

All commands MUST complete cleanly without errors before proceeding.

---

## 3. Safe Workflow Rules

1. **Smallest Safe Changes**: Make surgical, incremental modifications.
2. **Never Claim Without Code**: Do not report a feature as "implemented" unless source code exists, builds cleanly, and passes tests.
3. **No Lockfile Polluting**: Never execute `npm install` or `yarn install`. Never commit `package-lock.json` or `yarn.lock`.
4. **Update Continuity Records**: Whenever you finish a task or phase, update `docs/PROJECT-STATUS.md` with:
   - Updated HEAD commit / status.
   - List of verified changes.
   - Exact verification evidence.
