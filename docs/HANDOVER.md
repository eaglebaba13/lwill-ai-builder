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

### Current Auth Navigation Handover (2026-08-17)

- The logout/session investigation is complete locally. Root cause was stale client-document restoration after logout, not an active server session: the logout route revokes the persisted session and refresh tokens and clears both native cookies, while the client had no `pageshow` revalidation guard.
- `apps/web/src/app/page.tsx` now revalidates persisted browser restorations through the existing refresh route and returns to the login state when the revoked session is rejected.
- `apps/web/src/test/x-nail-native-auth.test.tsx` covers the persisted-document restoration regression.
- Native server implementation was inspected and not changed: the existing logout handler derives the session only from verified access/refresh credentials, revokes the server session, and clears `lwill_access`/`lwill_refresh`; the existing session verifier and refresh path continue to reject revoked sessions.
- Verified: `pnpm --filter web test` — 13 files / 97 tests; full `pnpm test` — 6 successful workspace tasks; `pnpm build` — passed; `pnpm lint` — passed; `git diff --check` — passed.
- Production status: the earlier login, hard-refresh, and logout checks passed on `xnail.makemeartist.com`; this un-deployed navigation-restoration fix still requires controlled production browser verification.
- Progress estimates (engineering estimates, not formal completion metrics): LWILL AI BUILDER overall 35%; X Nail MVP 55%; Phase 1D native-auth/session slice 90%.
- Remaining blockers: controlled deployment and browser-matrix verification of Back/BFCache/direct revisit/second-tab restoration; broader Phase 1D SRS items remain deferred, including password reset, MFA, API keys, lockout/rate limiting, and complete audit coverage.
- Exact next task: after review and an explicit release decision, deploy the auth-navigation fix through the controlled release process, then verify login → dashboard → logout → Back/direct revisit/hard refresh/second-tab behavior on `xnail.makemeartist.com`, without production DB mutation.
- Current Git state: branch `phase-1d-native-auth`, HEAD `ffcef3c`, pushed to `origin`; no commit or push has been performed for this latest auth-navigation fix, and unrelated customer/CRM/RBAC changes remain unstaged.
- Do not modify the unrelated uncommitted customer/CRM/RBAC files, Prisma schema/migrations, TenantDomain production data, RBAC roles/permissions, or production database state.

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
