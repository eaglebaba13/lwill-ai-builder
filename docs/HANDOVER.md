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

### Current Auth Navigation Handover (2026-08-19)

- The authentication redirect root cause is fixed. `apps/web/src/lib/crm/customer-runtime.ts` `authorize()` was returning `"unauthenticated"` (401) for authenticated sessions with `tenantContext === null`, which caused the client to redirect to login even though a valid session existed. The fix splits the `||` condition: `!context.authenticated` → `"unauthenticated"` (401); `context.tenantContext === null` → `"forbidden"` (403).
- `apps/web/src/instrumentation.ts` is hardened with try/catch around `registerNativeAuthenticationProvider()`, logging success/failure with `[auth]` prefix, and fail-closed rethrow.
- `apps/web/src/lib/auth/native-auth.ts` was inspected and confirmed correct at `298ceab`: null/empty refresh tokens return null without clearing cookies, and the catch block correctly clears cookies for non-null token exceptions.
- `apps/web/src/test/customer-route-handlers.test.ts` — 3 new integration tests verify `authorize()` returns `"unauthenticated"` for unauthenticated sessions, `"forbidden"` for authenticated + null tenant context, and `"forbidden"` for authenticated + valid tenant context.
- `apps/web/src/test/x-nail-native-auth.test.tsx` — 2 new tests verify that 401 from `/api/customers` redirects to login and 403 keeps the user on the dashboard with an error message.
- Customer API remains 403 for all authenticated sessions until an approved customer permission/grant catalog is supplied through the existing authorization mechanism.
- Verification: pending `pnpm test`, `pnpm build`, `pnpm lint`.
- Current Git state: branch `phase-1d-native-auth`, HEAD `298ceab`; local changes not committed or pushed.
- Do not modify Prisma schema/migrations, TenantDomain production data, RBAC roles/permissions, or production database state.

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
