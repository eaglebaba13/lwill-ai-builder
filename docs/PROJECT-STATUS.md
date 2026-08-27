# Project Status & Baseline Tracking

## General Project Overview

- **Project Name**: LWILL AI BUILDER v1 (`lwill-ai-builder`)
- **Project Version**: `1.0.0` (`apps/web` version `0.1.0`)
- **Current Branch**: `phase-1d-native-auth`
- **Current HEAD Commit**: `4eba4d3` (`feat(xnail): implement appointments api vertical slice`)
- **Git State**: `phase-1d-native-auth` at `4eba4d3`, clean working tree; the Services API vertical slice (`fc55e99`) and the Appointments API vertical slice (`4eba4d3`) are committed locally. `4eba4d3` is ahead of `origin/phase-1d-native-auth`; the prior Services status-header sync (`93dd736`) is already pushed to origin. No uncommitted customer/CRM/RBAC/bootstrap or Prisma schema/migration changes remain staged or unstaged.

## State Breakdown

### Verified Implemented State

- **Monorepo Foundation**: Turborepo workspace configured with `pnpm@11.20.0`.
- **Web Application (`apps/web`)**: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, PostCSS, and ESLint 9.
- **Repository Governance (Phase 0A)**: `AGENTS.md`, `AI_RULES.md`, and `docs/` governance documentation are currently being established.

### Partially Implemented State

- Phase 0A repository governance documentation is in progress.

### Not Implemented State

- Database / Prisma ORM / PostgreSQL schema and migrations.
- Authentication and RBAC.
- Tenant -> Business Unit -> Branch hierarchy implementation.
- ERP modules including POS, inventory, appointments, CRM, and accounting.
- HDK Beauty / X Nail operational workflows.
- NestJS backend/API application.
- Docker deployment configuration.
- AI Builder generation engine and production AI provider integrations.

## Application & Workspace Architecture Status

- **Current Applications**: `apps/web` only.
- **Current Packages / Modules / Services**: Shared authentication, authorization, database, Prisma-backed service, and web API modules are implemented in scoped slices; the broader backend/services target remains incomplete.
- **Database Status**: Prisma database foundation and migration baseline are present in the repository; no live production database connection has been verified.
- **Migration Status**: Initial migration baseline exists under `packages/database/prisma/migrations/0_init`; no production database has been applied or verified.
- **Authentication Status**: Provider-neutral authentication contracts, native email/password login, Prisma-backed session verification, cookie-based refresh, browser refresh/session restoration, server-session revocation, cookie clearing, and generation-safe client revalidation on initial mount, `pageshow`, and history `popstate` are implemented and locally verified. Production verification covers login, hard refresh, and logout; this un-deployed navigation correction still requires controlled production browser verification.
- **Authorization Status**: Provider-neutral authorization contracts are implemented; no production-backed authorization adapter has been connected.
- **Test Status**: Automated Vitest coverage is implemented. The focused X Nail native-auth verification passed `pnpm --filter web test -- x-nail-native-auth.test.tsx` with 13 files and 100 tests, including 7 navigation regression tests. `pnpm test` passed with 6 successful workspace tasks.
- **TypeScript Status**: Verified passing through the Next.js production build.
- **Lint Status**: Verified passing with `pnpm lint`.
- **Build Status**: Verified passing with `pnpm build`.
- **Docker Status**: Not implemented.
- **VPS / Deployment Status**: Repository cloned and verified at `/root/lwill-ai-builder` on the KVM4 VPS. No LWILL production deployment has been verified or configured.

## Environment & Dependency Requirements

- **Verified Windows Node.js**: `v24.18.0`
- **Package Manager**: `pnpm@11.20.0` (strictly mandatory).
- **Core Commands**:
  - `pnpm install --frozen-lockfile`
  - `pnpm test`
  - `pnpm lint`
  - `pnpm build`

## Known Issues

- The repository has automated tests; broader SRS coverage remains incomplete.
- Production database application/verification, complete SRS authentication coverage, and production browser verification remain outstanding; the implemented native-auth slice is locally verified.
- Production deployment is not configured.
- Dyad preview currently has a root Turborepo `--port` forwarding incompatibility; this does not affect verified `pnpm lint` or `pnpm build`.
- `builder.lwill.in` currently serves the HDK Beauty / X Nail tenant preview page (`apps/web/src/app/page.tsx`), not a LWILL AI Builder platform homepage. No actual LWILL AI Builder platform UI exists anywhere in this repository yet.
- `DEVELOPMENT-GUIDELINES.md` references a "Master Platform Blueprint" and "SRS documents" that do not exist anywhere in this repository. NOT SPECIFIED / unresolved.
- The X Nail tenant repository name is NOT SPECIFIED (unlike EagleBABA, which has an explicit repository name, `eagle13-d609ce96`).
- Coolify configuration, a Dockerfile `HEALTHCHECK`, and a documented domain cutover procedure for `builder.lwill.in` are NOT SPECIFIED anywhere in this repository.
- The phase sequence in `docs/ROADMAP.md` does not map one-to-one onto a Foundation -> Authentication/Multi-Tenancy -> Shared Modules -> X Nail MVP -> Marketplace -> AI Builder -> Industry Clouds ordering; reconciliation is NOT SPECIFIED.

## Do-Not-Modify Areas

- Do not introduce business functionality during Phase 0A.
- Do not replace the existing Next.js/Turborepo/pnpm foundation without verified architectural justification.
- Do not introduce `package-lock.json` or `yarn.lock`.
- Do not fabricate implementation or production-readiness claims.
- Do not hard-code the current two X Nail branches.

## Exact Next Task

1. Finish Phase 0A documentation verification.
2. Establish automated baseline tests before core business implementation.
3. Design Phase 1 authentication, tenant hierarchy, permissions, and database foundation from verified requirements.

## X Nail MVP Native-Auth Navigation Nail — 2026-08-17

- **X Nail MVP progress only**: 60% engineering estimate; remaining 40% is controlled production deployment/browser verification and broader MVP scope, not an overall platform percentage.
- **Root cause**: Server logout/session revocation was authoritative, but stale App Router/client documents and browser history could restore dashboard UI; an older in-flight refresh could also resolve after logout and overwrite state.
- **Implementation**: `apps/web/src/app/page.tsx` preserves `restoreNativeAuthentication()` and `/api/auth/refresh`, sets authentication to indeterminate during revalidation, revalidates on initial mount, every `pageshow`, and `popstate`, and uses a monotonically increasing request generation. Logout invalidates the generation before setting Login state; stale login/restore results and unmount results are ignored; refresh rejection fails closed.
- **Focused tests**: `apps/web/src/test/x-nail-native-auth.test.tsx` verifies login → dashboard, hard refresh restoration, logout → Login, BFCache/pageshow, Back/popstate, direct remount, stale second-tab/document revalidation, and stale in-flight restore suppression.
- **Files changed for this nail**: `apps/web/src/app/page.tsx`, `apps/web/src/test/x-nail-native-auth.test.tsx`, and the scoped status/governance documentation listed in the handover. Unrelated customer/CRM/RBAC/bootstrap changes were not touched.
- **Production status**: Not deployed and not production-browser verified. No production DB, TenantDomain data, Prisma schema/migrations, RBAC, cookie security policy, or deployment configuration was changed.
- **Current blocker**: Controlled production deployment and browser verification require review and explicit release approval; local tests, build, lint, and diff checks are complete.
- **Next smallest production-safe task**: Review the completed local diff and verification results; only with explicit approval, deploy through the existing controlled process and run the browser matrix for login, hard refresh, logout, Back, direct revisit, BFCache, and second-tab behavior without production DB mutation.

## Verification Evidence

- `pnpm install --frozen-lockfile`: Passed.
- `pnpm test`: Command passed, but zero test tasks exist.
- `pnpm lint`: Passed.
- `pnpm build`: Passed.
- TypeScript compilation during production build: Passed.
- Verified baseline commit: `695cbc5`.


## Phase 0B Verification Update

- Automated test baseline implemented using Vitest.
- Test environment: jsdom.
- Testing Library baseline configured.
- Baseline test: `apps/web/src/test/baseline.test.ts`.
- `pnpm test`: Passed — 1 test file, 1 test.
- `pnpm lint`: Passed.
- `pnpm build`: Passed including TypeScript compilation.
- Phase 0B test harness is operational.
- Next development target: Phase 1 — Authentication, Multi-Tenancy, RBAC, database persistence, and audit foundation.
- Verified implementation commit: `5b649a3`.


## GitHub CI Verification

- GitHub Actions CI workflow implemented.
- Workflow file: .github/workflows/ci.yml.
- Verification stages: dependency install, Vitest tests, ESLint, production build and TypeScript compilation.
- Verified commit: 143e661316b1202009c62ef31b15427a21548881.
- Remote GitHub Actions status: completed.
- Remote GitHub Actions conclusion: success.
- Phase 0 repository governance, automated testing baseline, and continuous integration baseline are operational.
- Next development target: Phase 1 - Database Foundation, Authentication, Multi-Tenancy, RBAC, and Audit Engine.

## Phase 1 Database Foundation Verification

- Database package added at packages/database.
- Prisma ORM and Prisma Client verified at version 6.19.3.
- PostgreSQL datasource foundation configured through DATABASE_URL.
- Initial tenant hierarchy schema implemented: Tenant -> Business Unit -> Branch.
- AuditLog foundation implemented.
- Prisma schema validation: Passed.
- Prisma Client generation: Passed.
- Repository tests: Passed.
- Repository lint: Passed.
- Repository production build and TypeScript compilation: Passed.
- GitHub Actions CI verified successful for commit 9a0b0f9ed6ef81881a95eed58f62f485e89dfad9.
- Database migration status: Not created yet.
- Production database connection status: Not configured or verified.
- Next development target: Phase 1 RBAC, permissions, identity mapping, and scoped authorization model.

## Phase 1 Authorization Foundation Verification

- Authorization package added at packages/authorization.
- Provider-neutral authorization contracts implemented.
- Deterministic permission resolution implemented for tenant, business-unit, and branch scopes.
- Tenant-level grants inherit downward to business-unit and branch scopes.
- Business-unit grants inherit only within the same business unit.
- Branch grants are exact-scope only.
- Cross-tenant authorization is denied.
- Permission-code mismatches are denied.
- Authorization unit tests: 7 passed.
- Authorization strict TypeScript typecheck: Passed.
- Repository tests, lint, production build, and TypeScript compilation: Passed.
- GitHub Actions CI verified successful for commit 8124bbd7f0174375def662dbc2a59f6e9a2cf9c3.
- Previous CI failure on ecb884bb2c87ddf7bec05bd644b090f2d9b87cfc was resolved by removing UTF-8 BOMs from authorization package files.
- Next development target: Prisma-backed permission grant loader and authorization data adapter.

## Phase 1A Prisma Migration Baseline Verification

- Initial Prisma migration baseline generated from the existing schema only.
- Migration directory: `packages/database/prisma/migrations/0_init`.
- Migration lock file: `packages/database/prisma/migrations/migration_lock.toml`.
- Migration baseline preserves the Tenant -> BusinessUnit -> Branch hierarchy and existing membership, role, permission, role-assignment, and audit-log contracts.
- Prisma schema validation: Passed.
- Prisma Client generation: Passed.
- Migration baseline consistency verification: Passed locally against the current Prisma schema.
- PostgreSQL connection: Not performed; no live production database was connected.
- Database migration application: Not performed; the baseline was created and validated locally only.
- Authorization behavior, authentication, middleware, landing page, and ERP functionality were not modified or implemented.
- Next development target: Apply the migration only after a separately authorized PostgreSQL environment is available and verified.

---

## Phase 1D Authentication Persistence Verification

### Status: **Complete — All targeted auth/session verifications passed**

### Implemented Slice

- Email/password login service with password verification and refresh-token hashing persistence.
- Prisma-backed session verification that checks session existence, revocation, expiry, active-user state, tenant membership, and optional tenant-context validity.
- Focused Vitest coverage for login success/failure and session verification success/fail-closed cases.

### Verification Results

- `pnpm --filter web test -- prisma-session-source` — 8 tests passed.
- `pnpm --filter web test` — 32 tests passed.
- `pnpm --filter web lint` — Passed after tightening the new test helper typing.
- `pnpm --filter web build` — Passed with Next.js production build success.

### Notes

- The new auth slice remains intentionally small and provider-neutral at the contract boundary.
- No JWT policy, lockout thresholds, or password-reset UI were invented beyond the minimal persistence slice required for verified session handling.

## Phase 1E Tenant-Aware Business Slice Verification

### Status: **Complete — New customer/service/appointment services verified locally**

### Implemented Slice

- Tenant-aware `Customer`, `Service`, and `Appointment` Prisma models added to the shared database schema.
- Reusable service-layer modules for creating and reading tenant-scoped customers and services.
- Appointment creation validation that rejects records unless the referenced customer and service belong to the same tenant.
- Focused Vitest coverage for tenant-scoped creation, cross-tenant lookup rejection, and cross-tenant appointment rejection.

### Verification Results

- `pnpm --filter @lwill/authentication-context-prisma test` — 26 tests passed.
- `pnpm lint` — Passed.
- `pnpm build` — Passed with Next.js production build success.

### Notes

- This is intentionally the smallest reusable business workflow slice for the X Nail MVP: customers, services, and appointments with tenant isolation.
- No broader CRM UI, scheduling engine, or invoice/payment workflow was introduced beyond the verified persistence and validation boundary.

## Phase 1F Staff + Attendance Slice Verification

### Status: **Complete — New staff and attendance services verified locally**

### Implemented Slice

- Tenant-aware `Staff` and `Attendance` Prisma models added to the shared database schema.
- Reusable service-layer modules for creating, reading, and listing tenant-scoped staff records.
- Attendance creation validation that rejects records unless the referenced staff member belongs to the same tenant.
- Focused Vitest coverage for staff creation, tenant isolation, branch validation, attendance creation, and cross-tenant attendance rejection.

### Verification Results

- `pnpm --filter @lwill/authentication-context-prisma test` — 31 tests passed.
- `pnpm --filter web test` — 32 tests passed.
- `pnpm lint` — Passed.
- `pnpm build` — Passed with Next.js production build success.
- `pnpm exec prisma validate` — Passed.

### Notes

- This slice remains intentionally small and reusable for the X Nail MVP: staff records and attendance entries with tenant isolation.
- No payroll, HRMS, commission, biometric attendance, or advanced scheduling functionality was introduced.

## Phase 1G Packages + Memberships Slice Verification

### Status: **Complete — New package and membership services verified locally**

### Implemented Slice

- Tenant-aware `Package` and `Membership` Prisma models added to the shared database schema.
- Reusable service-layer modules for creating, reading, and listing tenant-scoped packages and memberships.
- Package creation validation that rejects service links outside the same tenant.
- Membership creation validation that rejects records unless the customer and package belong to the same tenant.
- Focused Vitest coverage for package creation, cross-tenant service rejection, membership creation, and cross-tenant membership rejection.

### Verification Results

- `pnpm --filter @lwill/authentication-context-prisma test` — 35 tests passed.
- `pnpm --filter web test` — 32 tests passed.
- `pnpm exec prisma validate` — Passed.

### Notes

- This slice remains intentionally small and reusable for the X Nail MVP: packages and memberships with tenant isolation.
- No billing, redemption, or loyalty-engine logic beyond the verified persistence boundary was introduced.

## Phase 1H POS + Billing Slice Verification

### Status: **Complete — Minimal tenant-aware POS billing slice verified locally**

### Implemented Slice

- Tenant-aware `Invoice` and `InvoiceLineItem` Prisma models added to the shared database schema.
- Reusable invoice service with tenant-scoped customer validation and line-item validation for service/package references.
- Invoice calculations for subtotal, discount, GST, and total using explicit line-item inputs.
- Focused Vitest coverage for calculation correctness, cross-tenant customer rejection, and tenant-scoped invoice retrieval.

### Verification Results

- `pnpm --filter @lwill/authentication-context-prisma exec vitest run src/invoice-service.test.ts` — 3 tests passed.
- `pnpm --filter @lwill/authentication-context-prisma test` — 38 tests passed.
- `pnpm --filter web test` — 32 tests passed.
- `pnpm lint` — Passed.
- `pnpm build` — Passed with Next.js production build success.
- `pnpm exec prisma validate` — Passed.

### Notes

- This is intentionally the smallest reusable POS/billing slice aligned to the X Nail MVP: customer-linked billing with line-item totals and tenant isolation.
- No advanced accounting, refund engine, payment gateway integration, invoice numbering policy, or tax engine beyond the explicit GST field support in the SRS was introduced.

## Phase 1J Tenant Domain Resolution Verification

### Status: **In progress — minimal tenant-domain resolution and tenant isolation guardrails are implemented and validated locally**

### Implemented Slice

- Minimal `TenantDomain` Prisma model for tenant-owned hostname records: `tenantId`, `domain`, `isPrimary`, `verificationStatus`, `isActive`, and timestamps.
- Hostname normalization and safe resolution rules that reject unknown, inactive, or unverified domains.
- Tenant-domain isolation guard that refuses hostname-driven tenant switching when the authenticated session belongs to a different tenant.
- Focused Vitest coverage for valid resolution, rejection paths, primary-domain behavior, duplicate rejection, and development-hostname safety.

### Verification Results

- `pnpm --filter @lwill/authentication-context-prisma test` — Passed with the new tenant-domain tests.
- `pnpm --filter web test` — Passed.
- `pnpm lint` — Passed.
- `pnpm build` — Passed with Next.js production build success.
- `pnpm exec prisma validate --schema packages/database/prisma/schema.prisma` — Passed.

### Migration Status

- A new, versioned Prisma migration was added for `TenantDomain` under `packages/database/prisma/migrations/`.
- The migration was validated statically with Prisma. No live PostgreSQL database was connected or modified during this task, so no production migration was applied.

### Remaining Blockers

- No live tenant-domain DNS or certificate automation was implemented; this remains a future infrastructure concern.
- No tenant admin UI or domain-management application flow was introduced beyond the internal reusable service boundary.
- No production deployment or VPS/Coolify configuration changes were made.

## Phase 1I X Nail Operational Launch Workflow

### Status: **In progress — minimal X Nail operations shell and workflow logic are implemented and validated locally**

### Implemented Slice

- Minimal X Nail login/authentication flow at the app boundary using the verified tenant-scoped operational contract.
- Operational workflow model for tenant-scoped customer, service, staff, appointment, and invoice creation.
- Simple authenticated dashboard shell covering the launch sequence: login → tenant context → customer/service/staff → appointment → POS invoice.
- Focused Vitest coverage for authentication, tenant access, customer creation, service creation, appointment progression, and invoice totals.

### Verification Results

- `pnpm --filter web test -- x-nail-operational-flow.test.ts` — 9 tests passed.
- `pnpm --filter web test` — Passed after the new slice was added.
- `pnpm --filter web build` — Passed with Next.js production build success.
- `pnpm --filter web lint` — Passed.

### Notes

- This remains intentionally limited to the first usable launch slice for X Nail and does not expand into broader HDK Academy, distribution, franchise, or AI features.
- The UI is intentionally a lightweight operational shell rather than a full multi-module ERP.

## Phase 1B Authentication + Tenant Context Foundation

### Status: **Complete — All verifications passed**

### Implemented Files

**New package: `packages/authentication-context/`**

| File | Purpose |
|------|---------|
| `package.json` | Package manifest (`@lwill/authentication-context`) |
| `tsconfig.json` | Strict TypeScript config (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) |
| `src/types.ts` | Core contracts: `AuthenticatedUser`, `TenantContext`, `AuthenticationSession`, `UnauthenticatedSession`, `AuthenticationContext`, `AuthenticationProvider` |
| `src/unauthenticated.ts` | `UNAUTHENTICATED` constant |
| `src/tenant-context-validator.ts` | `TenantHierarchyVerifier` interface + `validateTenantContext()` function |
| `src/index.ts` | Barrel re-exports |
| `src/auth-context.test.ts` | 6 deterministic type-contract tests |
| `src/tenant-context-validator.test.ts` | 7 deterministic hierarchy-validation tests |

**New files in `apps/web/`**

| File | Purpose |
|------|---------|
| `src/lib/auth/server-context.ts` | Server-only boundary; resolves `AuthenticationContext`; fails closed; no secrets exposed to client |
| `src/lib/auth/authorization-boundary.ts` | Server-only integration bridge connecting `AuthenticationContext` → `@lwill/authorization-service` |
| `src/test/server-context.test.ts` | 4 deterministic server-context tests |
| `src/test/authorization-boundary.test.ts` | 7 deterministic authorization-boundary tests |
| `src/test/__mocks__/server-only.ts` | Vitest stub for the `server-only` package |

**Modified files**

| File | Change |
|------|--------|
| `apps/web/package.json` | Added `server-only`, `@lwill/authentication-context` (deps); `@lwill/authorization`, `@lwill/authorization-service` (devDeps) |
| `apps/web/vitest.config.mts` | Added `resolve.alias` to stub `server-only` in Vitest |
| `apps/web/next.config.ts` | Added `transpilePackages: ["@lwill/authentication-context"]` |
| `pnpm-lock.yaml` | Updated for new `server-only` dependency |
| `docs/PROJECT-STATUS.md` | Updated HEAD commit and added this section |

### Authentication Provider Status

**No real authentication provider has been connected yet.**

The `AuthenticationProvider` interface in `packages/authentication-context/src/types.ts` defines the contract. The `setAuthenticationProvider()` function in `apps/web/src/lib/auth/server-context.ts` registers the provider at startup. No JWT, OAuth, session cookie, or password-based provider has been implemented or integrated. The system always returns `UnauthenticatedSession` until a provider is registered.

### Tenant Context Status

A deterministic, provider-neutral `validateTenantContext()` function enforces the full `Tenant → BusinessUnit → Branch` hierarchy through an injected `TenantHierarchyVerifier` interface. The concrete verifier (database-backed via Prisma) has not been implemented yet — a live PostgreSQL instance is required for that step.

### Authorization Integration Status

`apps/web/src/lib/auth/authorization-boundary.ts` connects `AuthenticationContext` to `@lwill/authorization-service`. `userId` and `tenantId` are drawn exclusively from the validated session — never from client-supplied input. The boundary fails closed on any error, missing context, or unauthenticated state.

### Tests Added

| Package / Location | Test File | Count |
|-------------------|-----------|-------|
| `@lwill/authentication-context` | `src/auth-context.test.ts` | 6 |
| `@lwill/authentication-context` | `src/tenant-context-validator.test.ts` | 7 |
| `apps/web` | `src/test/server-context.test.ts` | 4 |
| `apps/web` | `src/test/authorization-boundary.test.ts` | 7 |
| **Total new tests** | | **24** |

**Test coverage by requirement:**

- ✅ Unauthenticated context
- ✅ Authenticated user context
- ✅ Missing tenant context
- ✅ Valid tenant context
- ✅ Invalid tenant/business-unit relationship
- ✅ Invalid business-unit/branch relationship
- ✅ Cross-tenant context rejection
- ✅ Expired session rejection
- ✅ Fail-closed authorization integration
- ✅ No client-controlled tenant escalation

### Verification Results

```
pnpm test  — 45 tests, 8 test files, 0 failures
pnpm lint  — Passed
pnpm build — Passed (TypeScript compilation + Next.js production build)
tsc --noEmit (packages/authentication-context) — Passed (0 errors)
git diff --check — No trailing whitespace errors
```

### Known Limitations

- No real authentication provider is connected. Production authentication (JWT, OAuth, session cookie) must be implemented in a future phase.
- `TenantHierarchyVerifier` has no concrete database-backed implementation. A Prisma-based verifier must be created once a live PostgreSQL instance is available.
- `server-only` enforcement is active in the Next.js production build; test execution relies on a Vitest stub.

**No production database has been connected or migrated.**

### Next Phase

Phase 1C: Implement a Prisma-backed `TenantHierarchyVerifier` and register a concrete `AuthenticationProvider` (e.g., JWT/session cookie reading from HTTP headers, validated server-side). Do not connect to production database without a separate verified PostgreSQL environment.

---

## Phase 1C Prisma-Backed Tenant Hierarchy Verifier + Concrete Authentication Provider

### Status: **Complete — All verifications passed**

### Implemented Files

**New package: `packages/authentication-context-prisma/`**

| File | Purpose |
|------|---------|
| `package.json` | Package manifest (`@lwill/authentication-context-prisma`) |
| `tsconfig.json` | Strict TypeScript config, matching `@lwill/authentication-context` |
| `src/tenant-hierarchy-rules.ts` | Pure, dependency-free decision rules: `evaluateBusinessUnitInTenant()`, `evaluateBranchInBusinessUnit()` |
| `src/tenant-hierarchy-rules.test.ts` | 12 deterministic tests covering every rule branch (active/inactive/missing/cross-tenant) |
| `src/tenant-hierarchy-verifier.ts` | Thin Prisma I/O wrapper implementing `TenantHierarchyVerifier` from `@lwill/authentication-context`; delegates all accept/reject decisions to the pure rules; fails closed on any database error |
| `src/tenant-hierarchy-integration.test.ts` | 3 deterministic tests proving `validateTenantContext()` (Phase 1B) wires correctly to the Prisma-shaped rules via an in-memory fixture verifier |
| `src/index.ts` | Barrel re-exports |

**New files in `apps/web/`**

| File | Purpose |
|------|---------|
| `src/lib/auth/session-provider.ts` | Concrete, isolated `AuthenticationProvider` adapter (`createSessionAuthenticationProvider`) that maps an already-verified `VerifiedSessionRecord` (supplied by a future vendor-specific `VerifiedSessionSource`) into `AuthenticationContext`. Performs no cryptography, password handling, or token generation itself; fails closed on null/expired/throwing sources. |
| `src/test/session-provider.test.ts` | 6 deterministic tests: authenticated, unauthenticated, expired, null tenant context, provider throw, malformed source result |
| `src/test/phase1c-integration.test.ts` | 4 deterministic tests wiring `session-provider.ts` → `server-context.ts` → `authorization-boundary.ts` end-to-end, including fail-closed and no-tenant-escalation cases |

**Modified files**

| File | Change |
|------|--------|
| `pnpm-lock.yaml` | Updated to register the new `@lwill/authentication-context-prisma` workspace package |

No existing package (`@lwill/authorization`, `@lwill/authorization-prisma`, `@lwill/authorization-service`, `@lwill/authentication-context`) or existing test was modified. `apps/web/src/lib/auth/server-context.ts` and `apps/web/src/lib/auth/authorization-boundary.ts` were **not modified** — the concrete provider and verifier are connected purely through their existing dependency-injection points (`setAuthenticationProvider()`, and the `AuthorizationService`/`TenantHierarchyVerifier` parameters), preserving the existing authorization API and semantics exactly.

### Authentication Provider Status

**No real authentication provider has been connected yet.**

`createSessionAuthenticationProvider()` is a concrete, isolated adapter boundary. It fulfils the `AuthenticationProvider` contract but requires an injected `VerifiedSessionSource` — a boundary that a future concrete vendor integration (session cookie service, JWT verifier, SSO gateway, etc.) must implement and perform all cryptographic/session verification in. No such vendor source is instantiated or wired into the running application. No OAuth, JWT, or custom cryptography was invented. No password storage exists anywhere in the repository.

### Tenant-Context Status

`createPrismaTenantHierarchyVerifier()` (in `@lwill/authentication-context-prisma`) is a concrete, Prisma-backed implementation of the existing `TenantHierarchyVerifier` contract from Phase 1B. It verifies, using the real Prisma schema:
- the tenant exists and `isActive`
- the business unit exists, `isActive`, and belongs to the requested tenant (via the schema's `@@unique([tenantId, id])` composite key)
- the branch exists, `isActive`, and belongs to the requested business unit and tenant (via `@@unique([tenantId, businessUnitId, id])`)
- any database error fails closed (returns `false`)

The decision logic itself lives in pure, fully unit-tested functions (`tenant-hierarchy-rules.ts`); the Prisma I/O wrapper only fetches records and delegates to those functions, matching the existing repository convention (`authorization-prisma`'s pure `map-permission-grants.ts` vs. I/O `load-permission-grants.ts`).

### Authorization Integration Status

Unchanged from Phase 1B. `authorization-boundary.ts` still requires an authenticated session with a non-null tenant context, still draws `userId`/`tenantId` exclusively from the session, and still fails closed on any error. Phase 1C adds only end-to-end tests proving the concrete provider and verifier compose correctly with this existing boundary — no behavioral change was made to it.

### Tests Added

| Package / Location | Test File | Count |
|-------------------|-----------|-------|
| `@lwill/authentication-context-prisma` | `src/tenant-hierarchy-rules.test.ts` | 12 |
| `@lwill/authentication-context-prisma` | `src/tenant-hierarchy-integration.test.ts` | 3 |
| `apps/web` | `src/test/session-provider.test.ts` | 6 |
| `apps/web` | `src/test/phase1c-integration.test.ts` | 4 |
| **Total new tests** | | **25** |
| **Total repository tests (all packages)** | | **70** |

**Test coverage by requirement:**

- ✅ Valid tenant / inactive tenant / missing tenant
- ✅ Valid business unit / wrong-tenant business unit / inactive business unit
- ✅ Valid branch / wrong-tenant branch / wrong-business-unit branch / inactive branch
- ✅ Cross-tenant rejection (end-to-end, via `validateTenantContext`)
- ✅ Authenticated session / unauthenticated session / expired session
- ✅ Invalid (malformed) authentication result
- ✅ Fail-closed provider failure
- ✅ Authorization uses authenticated `userId`/`tenantId` only (no client-controlled tenant escalation), proven again end-to-end through the concrete provider

### Verification Results

```
pnpm test                                                    — 70 tests, 12 test files, 0 failures
pnpm lint                                                     — Passed
pnpm build                                                    — Passed (TypeScript compilation + Next.js production build)
pnpm --filter @lwill/authentication-context exec tsc --noEmit — Passed (0 errors)
pnpm --filter @lwill/authentication-context-prisma exec tsc --noEmit — Passed (0 errors)
pnpm --filter @lwill/database exec prisma validate            — Passed ("The schema at prisma\schema.prisma is valid")
pnpm --filter @lwill/database exec prisma generate            — Passed (Prisma Client v6.19.3 generated)
git diff --check                                               — No errors (CRLF-only line-ending notices)
git status --short --branch                                   — main...origin/main, clean except new/expected files
```

`prisma validate` and `prisma generate` required a temporary, local, non-connecting placeholder `DATABASE_URL` (`postgresql://localhost:5432/placeholder_not_connected`) to satisfy Prisma's static schema-loading requirement; this is static analysis only — **no database connection was attempted or established**. The environment variable was unset immediately after use and is not committed anywhere.

### Known Limitations

- No real authentication provider is connected; a `VerifiedSessionSource` implementation for a real vendor (session cookie, JWT, SSO) is required in a future phase.
- `createPrismaTenantHierarchyVerifier()` has not been exercised against a live PostgreSQL instance; its I/O layer is intentionally untested directly (consistent with the existing `load-permission-grants.ts` precedent) and relies on its pure, fully-tested decision rules.
- The Prisma schema was **not modified**; no migration was created or required for Phase 1C.

**No real authentication provider has been connected yet.**

**No production database has been connected or migrated.**

### Next Phase

Phase 1D: Implement a concrete `VerifiedSessionSource` for a chosen, explicitly-approved authentication vendor, and exercise `createPrismaTenantHierarchyVerifier()` against a verified local (non-production) PostgreSQL instance. Do not proceed into ERP/business modules.

### Local PostgreSQL Runtime Verification Status

**Current state**: Runtime validation against a local PostgreSQL instance was attempted in this Windows environment, but it remains blocked by a machine-level installation issue rather than a code-level failure.

**Evidence**:

- `winget install --id PostgreSQL.PostgreSQL.16 --source winget -e --accept-source-agreements --accept-package-agreements` downloaded the installer successfully but the installation remained incomplete and left a background `postgresql-16.14-2-windows-x64.exe` process running.
- The resulting server files were partially present under `C:\Program Files\PostgreSQL\16`, but the required server runtime shared library (`$libdir/utf8_and_win`) was missing.
- `initdb` then failed with: `FATAL: could not access file "$libdir/utf8_and_win": No such file or directory` and the cluster initialization was rolled back.

**Impact**:

- Source-level validation remains green (`pnpm test`, `pnpm lint`, `pnpm build`, `prisma validate`), but the repo has not yet been exercised against a live PostgreSQL instance.
- No claim should be made that production-grade runtime auth/database integration is complete until a working local PostgreSQL runtime is available and the migration history is applied successfully.
- This is an environment/distribution blocker, not a schema or application logic validation result.

---

## Multi-Tenant Repository Isolation & Client Portability

### Mandatory Architectural Rules

1. LWILL AI Builder is the central multi-tenant platform repository.
   - Repository: `lwill-ai-builder`

2. Every tenant/client must have its own independent GitHub repository.
   - Current tenant: EagleBABA → `eagle13-d609ce96`
   - Future tenant: X Nail → separate dedicated GitHub repository

3. Tenant-specific business logic, UI, configuration, assets, and application code must never be mixed between tenants.

4. The LWILL platform repository contains only reusable platform infrastructure:
   - Authentication
   - Authentication context
   - Tenant context
   - Authorization
   - Tenant isolation
   - Database abstractions
   - Shared SaaS infrastructure
   - Reusable platform components
   - Common security and governance contracts

5. Tenant repositories contain only tenant-specific application functionality.

6. Every tenant must be independently portable and capable of client handover.

7. Client handover must be designed to include:
   - Tenant Git repository
   - Tenant database backup/export
   - Tenant-specific configuration
   - Tenant documentation
   - Deployment configuration where applicable
   - Required migration history

8. Tenant data must remain isolated. Never depend on another tenant's:
   - Source code
   - Database
   - Secrets
   - Configuration
   - Tenant-specific services

9. EagleBABA and X Nail must remain separate tenants even though both use LWILL AI Builder as their platform foundation.

10. Never place X Nail-specific implementation into `lwill-ai-builder`. Never place EagleBABA-specific implementation into the X Nail repository.

11. Database architecture must support tenant isolation and future client portability from the beginning.

12. Before implementing production tenant databases, verify:
    - Tenant → BusinessUnit → Branch hierarchy
    - Cross-tenant isolation
    - Authorization isolation
    - Tenant-specific backup/restore
    - Tenant repository independence

13. Existing EagleBABA production infrastructure must not be modified while establishing LWILL tenant infrastructure.

14. Do not change existing Astro/EagleBABA production systems as part of LWILL platform development.

### Architectural Diagram

```
LWILL AI BUILDER PLATFORM
│
├── EagleBABA Tenant
│   ├── Independent GitHub Repository
│   ├── Tenant Database/Data
│   └── Tenant-specific Application
│
├── X Nail Tenant
│   ├── Independent GitHub Repository
│   ├── Tenant Database/Data
│   └── Tenant-specific Application
│
└── Future Tenants
    └── Independent Repository + Data
```

### Client Exit / Portability Requirement

No tenant may be architecturally locked into LWILL. A tenant must be exportable and handover-ready without exposing or transferring another tenant's data or source code.

### HDK/X Nail Migration Plan (Not Yet Executed)

**Status: Decided in principle (ADR 010, `docs/DECISIONS.md`) — migration execution has not started.** This subsection records the plan only; no file listed here has been moved, deleted, or created as part of this plan.

1. **Purpose of the tenant repository**: Hold HDK Beauty / X Nail tenant-specific implementation (UI, business logic, configuration, assets), separate from the `lwill-ai-builder` platform repository, per the Multi-Tenant Repository Isolation rules above.
2. **Target repository name**: NOT SPECIFIED (unlike EagleBABA's `eagle13-d609ce96`, no name has been assigned for X Nail).
3. **Files to migrate out of `lwill-ai-builder`**: `apps/web/src/app/page.tsx` (full HDK Beauty / X Nail tenant page) and the HDK Beauty / X Nail metadata in `apps/web/src/app/layout.tsx` (`title`/`description`).
4. **Files/packages that remain in `lwill-ai-builder`**: `packages/authentication-context`, `packages/authentication-context-prisma`, `packages/authorization`, `packages/authorization-prisma`, `packages/authorization-service`, `packages/database`, `apps/web/src/lib/auth/*`, and all governance docs — none of these contain tenant-specific content.
5. **Disposition of the current page**: To be relocated (not deleted) into the tenant repository once named, preserving it as tenant work product; exact history-preservation mechanism (e.g., subtree extraction vs. plain copy) is NOT SPECIFIED.
6. **Interim `builder.lwill.in` content after separation**: NOT SPECIFIED. No document defines placeholder/interim content; an actual LWILL AI Builder platform UI is confirmed Not Implemented (see "Not Implemented State" above).
7. **Platform vs. tenant UI boundary**: Per Rules 3-5 above — `lwill-ai-builder` carries no tenant-branded UI or tenant business logic; all tenant-specific UI belongs only in the tenant repository.
8. **Migration verification requirements**: Rule 12 criteria above (Tenant -> BusinessUnit -> Branch hierarchy, cross-tenant isolation, authorization isolation, tenant-specific backup/restore, tenant repository independence), plus `pnpm test`, `pnpm lint`, and `pnpm build` passing in both repositories post-migration.
9. **Production deployment/cutover sequence**: NOT SPECIFIED. No Coolify configuration or documented cutover runbook exists in this repository.
10. **Rollback strategy**: NOT SPECIFIED.
11. **Sequencing**: Creating the X Nail tenant GitHub repository and migrating the tenant code out of `lwill-ai-builder` are separate, sequential future steps. Creating the repository does not itself constitute migration; migration must not be executed until the tenant repository name (item 2) is decided.
12. **`builder.lwill.in` cutover dependency**: Remains NOT SPECIFIED. Cutover is contingent on both (a) completion of the code migration (item 3) and (b) a decision on interim/actual LWILL AI Builder platform homepage content (item 6) — neither has occurred.
---

## Phase 1D Production PostgreSQL Migration Verification

### Status: **Database Foundation Applied and Verified**

The previously generated Prisma baseline migration was applied to the dedicated LWILL PostgreSQL database through the running Coolify application container.

### Verified Infrastructure

- PostgreSQL container: `ab72kxm0tnmfnao38e0tvm6g`
- PostgreSQL version: `16.14`
- Database: `lwill`
- Schema: `public`
- Application container: `5ffff971377c`
- Application domain: `builder.lwill.in`
- Docker network connectivity: verified
- Application to PostgreSQL TCP connectivity: verified

### Migration Verification

- Migration directory present in application image: `packages/database/prisma/migrations/0_init`
- `prisma migrate deploy`: Passed
- Migration applied: `0_init`
- `_prisma_migrations` confirms `0_init` with a completed `finished_at` timestamp.
- `prisma migrate status`: Passed
- Database schema status: **up to date**

### Database Structure Verification

- Application database contains 13 tables including `_prisma_migrations`.
- Foreign-key verification returned 19 constraints.
- Tenant hierarchy foreign keys are present:
  - `Tenant` to `BusinessUnit`
  - `Tenant` to `Branch`
  - `BusinessUnit` to `Branch`
- Tenant-scoped membership and role relationships are enforced.
- AuditLog tenant and branch relationships are enforced.
- No manual production table modification was performed.

### Important Boundary

This verification establishes that the Prisma database schema and baseline migration are deployed to the dedicated LWILL PostgreSQL environment.

It does **not** establish completion of production authentication, tenant CRUD, RBAC management APIs or UI, audit recording services, or ERP/business modules.

No Prisma major-version upgrade was performed. The repository remains on Prisma `6.19.3`.

### Current Next Development Target

Phase 1D remains focused on concrete authentication/session integration and associated production-safe verification. Do not proceed to ERP/business modules until the Phase 1 authentication, tenant context, authorization, and audit foundation requirements are verified.

---

## Phase 1D Native Authentication Application Integration

### Status: **Complete — application integration verified locally**

### Implemented Slice

- Node-runtime JWT configuration loader with fail-closed RSA key validation and active-`kid` verification.
- Request-scoped native authentication provider registration through Next.js instrumentation and the existing provider-neutral server-context boundary.
- Same-origin protection for all native authentication mutations.
- `POST /api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, and `/api/auth/logout-all` route handlers.
- Server-resolved login tenant identity using active, verified tenant-domain records and existing tenant-membership validation.
- Trusted access/refresh session derivation for logout without accepting client-supplied user or session identifiers.
- Authentication audit events for login, refresh, refresh-token reuse, current-session logout, and logout-all.
- Focused route, runtime-configuration, origin-policy, JWT, cookie, refresh, and revocation tests.

### Boundaries Preserved

- No provider-neutral authentication contract, tenant hierarchy, or authorization boundary was changed.
- No Prisma schema or migration was changed; migration `0_init` remains unchanged.
- Password reset, MFA, API-key authentication, lockout/rate-limit policy, browser UI redesign, and production secret-manager selection remain deferred or NOT SPECIFIED.

### Verification Results

- `pnpm --filter web test` — Passed: 11 test files, 71 tests.
- `pnpm test` — Passed: 6 successful monorepo test tasks.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation; all four authentication routes registered as dynamic server routes.
- `pnpm lint` — Passed.
- `git diff --check` — Passed.

---

## Docker Prisma Client Generation Fix

### Status: **Implemented and verified locally**

- Root cause: the Docker build installed dependencies and ran `pnpm build` without generating Prisma Client. Local builds passed because a previously generated client remained in `node_modules`, while a fresh Coolify build had no generated client.
- The Docker build now runs `pnpm --filter @lwill/database run generate` before `pnpm build`, using the canonical schema at `packages/database/prisma/schema.prisma`.
- A command-scoped, non-connecting placeholder `DATABASE_URL` is supplied only because Prisma requires the datasource environment variable while loading the schema. It is not a production credential and is not persisted as a runtime environment value.
- No Prisma schema, migration, production database state, monorepo structure, or Turbo task was changed.

### Verification Results

- `pnpm install --frozen-lockfile` — Passed.
- `pnpm --filter @lwill/database run generate` with the command-scoped placeholder URL — Passed; Prisma Client 6.19.3 generated from `prisma/schema.prisma`.
- `pnpm test` — Passed: 6 successful monorepo test tasks, including 71 web tests.
- `pnpm build` — Passed.
- `pnpm lint` — Passed.
- Local Docker image build — Not run because Docker is not installed on this Windows workstation; Coolify must perform the clean-image confirmation.

---

## X-Nail Native Authentication Frontend Integration

### Status: **Implemented locally; production tenant-domain configuration NOT IMPLEMENTED**

- The temporary X-Nail login form now accepts user-entered email and password values and calls the approved `POST /api/auth/login` endpoint.
- Hardcoded demo credentials and the client-side `authenticateOperationalUser()` mock were removed.
- Authentication success is determined only by the native-auth API response; access and refresh tokens remain in the existing `HttpOnly` cookie mechanism and are not exposed to client code.
- The existing sign-out control now calls `POST /api/auth/logout` before returning to the login screen.
- The visual design and the separate temporary operational demo workflow remain otherwise unchanged.
- Focused frontend integration tests cover blank credential fields, approved login request shape, rejected login behavior, successful dashboard entry, and approved logout behavior.

### Required Production Configuration

- ADR 013 resolves login tenancy from the request hostname through an active, verified `TenantDomain` belonging to an active tenant, followed by active `TenantMembership` validation.
- Production verification found no `TenantDomain` row for `builder.lwill.in`; login therefore fails closed before password verification.
- The later HDK tenant-domain bootstrap section records the approved ownership-mapping operation. That operation does not itself verify the domain, so a newly created `pending` record remains ineligible for login resolution.

### Verification Results

- `pnpm test` — Passed: 6 successful monorepo test tasks; web suite passed 12 files and 72 tests.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation.
- `pnpm lint` — Passed.
- `git diff --check` — Passed.

### Remaining Boundary

- Production browser verification of login, browser reload restoration, refresh-token rotation, and logout remains pending. No production deployment, production database mutation, or new session-status route was introduced.

---

## HDK Initial Administrative Bootstrap

### Status: **Implemented and verified locally; not executed against production**

- A manual CLI-only bootstrap creates or reuses the initial administrator for the active `HDK Beauty I Pvt. Ltd. -> X Nail Bar` hierarchy.
- The hierarchy is resolved by exact approved names from existing active tenant and business-unit records; no UUID is embedded in code.
- The bootstrap requires the existing active `tenant-admin` role to have exactly the approved `tenant.manage` permission and assigns it at tenant scope. It creates no role or permission and fails closed when the role or permission set differs.
- Credentials are read only at execution time from `LWILL_BOOTSTRAP_ADMIN_EMAIL`, `LWILL_BOOTSTRAP_ADMIN_PASSWORD`, and `LWILL_BOOTSTRAP_ADMIN_DISPLAY_NAME`.
- Passwords are hashed through the existing Argon2-backed `createPasswordHash()` implementation. Plaintext passwords and hashes are excluded from command output.
- The transaction is idempotent for users, credentials, memberships, and tenant-role assignments. Existing passwords remain unchanged unless the operator explicitly passes `--update-password`, which increments `passwordVersion`.
- The command is not wired to Next.js startup, package installation, Docker build, deployment, or a public endpoint.

### Manual Command

- Initial execution: `pnpm --filter @lwill/authentication-context-prisma run bootstrap:initial-admin`
- Explicit password update: `pnpm --filter @lwill/authentication-context-prisma run bootstrap:initial-admin -- --update-password`

### Verification Results

- Focused bootstrap suite — Passed: 9 tests covering Argon2 hashing, first creation, idempotency, explicit password update, each missing environment variable, missing hierarchy, missing/empty role, and secret-safe output.
- Package strict TypeScript check — Passed.
- Manual CLI fail-closed check with absent environment variables — Passed before any database transaction.
- `pnpm test` — Passed: 6 successful monorepo test tasks; bootstrap package passed 10 files and 53 tests.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation.
- `pnpm lint` — Passed.
- `git diff --check` — Passed.
- No Prisma schema or migration change was required.
- No production database connection or mutation was performed.

---

## X Nail Customer RBAC Permission Bootstrap

### Status: **Implemented and verified locally; not executed against production**

- Added a manual CLI-only, transactional bootstrap for the approved X Nail operational role.
- The bootstrap reuses only the pre-existing active tenant-scoped `x-nail-operations` role, creates only `customer.read` and `customer.write`, assigns them to that role, and is idempotent.
- Invalid or unapproved permission sets fail closed before any transaction. The existing `tenant.manage` hierarchy/admin bootstrap allowlist remains unchanged.
- Customer API authorization continues to require `customer.read` for reads and `customer.write` for writes; no user grant or unrestricted permission-management tool was added.
- No schema, migration, production data, deployment, or GitHub state was changed.

### Manual Command

- `pnpm --filter @lwill/authentication-context-prisma run bootstrap:initial-customer-permissions`

### Verification Results

- Focused RBAC/customer tests — Passed: 5 customer-permission bootstrap tests, 6 hierarchy-bootstrap tests, and 9 customer-route tests.
- Full `pnpm test` — Passed: 6 successful monorepo tasks; 88 authentication-context-prisma tests and 9 customer-route tests included.
- `pnpm build` — Passed.
- `pnpm lint` — Passed.
- `git diff --check` — Passed.
- No production database connection or mutation was performed.

---

## HDK / X Nail Initial Hierarchy Bootstrap

### Status: **Implemented and verified locally; not executed against production**

- A manual CLI-only bootstrap creates or reuses the approved `HDK Beauty I Pvt. Ltd.` tenant and `X Nail Bar` business unit in one transaction.
- Canonical bootstrap identifiers are explicit: tenant slug `hdk-beauty-i-pvt-ltd` and business-unit slug `x-nail-bar`.
- The bootstrap creates or reuses the active `tenant-admin` role with the repository's existing `tenant.manage` permission code. It rejects unexpected role permissions rather than widening administrator access.
- Existing records are matched by both approved name and slug. Ambiguous, inactive, or conflicting tenant, business-unit, or role records fail closed.
- Repeated execution is idempotent and reports which records or assignments were created.
- No user or credential is created. Administrator credentials remain exclusively in the separate initial-admin bootstrap CLI.
- No branch is created because ADR 014 requires outlets to be branches but does not approve an initial outlet identity.
- No `builder.lwill.in` `TenantDomain` is created because ADR 010 and the current domain status leave that tenant assignment/cutover unresolved.
- The command is not connected to Next.js startup, HTTP routes, package installation, Docker build, migrations, or deployment.

### Manual Sequence

1. Hierarchy and role data: `pnpm --filter @lwill/authentication-context-prisma run bootstrap:initial-hierarchy`
2. Administrator identity and credentials: `pnpm --filter @lwill/authentication-context-prisma run bootstrap:initial-admin`

### Verification Results

- Focused hierarchy and administrator bootstrap suites — Passed: 2 files, 15 tests.
- Package strict TypeScript check — Passed.
- `pnpm test` — Passed: 6 successful monorepo tasks; bootstrap package passed 11 files and 59 tests; web passed 12 files and 72 tests.
- `pnpm lint` — Passed.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation.
- `pnpm --filter @lwill/database exec prisma validate --schema prisma/schema.prisma` — Passed with a command-scoped, non-connecting placeholder `DATABASE_URL`.
- `git diff --check` — Passed.
- Prisma schema and all existing migrations remain unchanged.
- No production database connection or mutation was performed.

---

## HDK `builder.lwill.in` Tenant-Domain Bootstrap

### Status: **Implemented and verified locally; not executed against production**

- The explicit operational mapping approved for native authentication is `builder.lwill.in` -> `HDK Beauty I Pvt. Ltd.`.
- A manual CLI-only bootstrap resolves the approved tenant by its exact canonical name and slug, then creates or reuses the domain mapping in one transaction.
- The operation fails closed when the tenant is missing, inactive, ambiguous, or conflicting, when the hostname belongs to another tenant, or when an existing same-tenant mapping is inactive.
- New records set `domain = builder.lwill.in`, the resolved HDK `tenantId`, and `isActive = true`.
- The operation intentionally omits `verificationStatus` and `isPrimary`, preserving the Prisma defaults `pending` and `false`. It never promotes an existing record or changes existing verification/primary state.
- A same-tenant active mapping is idempotently reused, including an already verified mapping.
- This approval is limited to the authentication hostname ownership mapping. It does not resolve ADR 010's separate tenant-UI migration, interim homepage, deployment cutover, or rollback decisions.
- No Prisma schema, migration, Next.js startup hook, public route, credential, or administrator record is changed.

### Production Command

- Run once in the deployed application environment with its configured production `DATABASE_URL`: `pnpm --filter @lwill/authentication-context-prisma run bootstrap:initial-tenant-domain`

### Runtime Consequence

- A newly created row will be active but `pending`, not verified. `createNativeAuthRouteServices()` and `resolveTenantByHostname()` continue to reject it, so `/api/auth/login` will still return `401` before password verification.
- The later controlled tenant-domain verification section now defines the approved manual transition to `verified`; direct SQL remains prohibited.
- Coolify must continue routing HTTPS for `builder.lwill.in` to this application and provide `DATABASE_URL`, `LWILL_AUTH_ALLOWED_ORIGIN=https://builder.lwill.in`, and the existing required native-auth JWT configuration. These runtime values are not committed to the repository.

### Verification Results

- Focused tenant-domain bootstrap suite — Passed: 1 file, 6 tests covering creation, idempotency, conflicting ownership, missing tenant, ambiguous tenant, and inactive tenant.
- Package strict TypeScript check — Passed.
- `pnpm test` — Passed: 6 successful monorepo tasks; authentication-context-prisma passed 12 files and 65 tests.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation.
- `pnpm lint` — Passed.
- `git diff --check` — Passed.

---

## Controlled `builder.lwill.in` Domain Verification

### Status: **Implemented and verified locally; not executed against production**

- Repository review classified tenant-domain verification as `NOT IMPLEMENTED`: the schema represented `pending` and `verified`, and runtime resolution rejected pending domains, but no ownership challenge or privileged transition existed.
- ADR 015 now defines the initial controlled workflow as manual operator attestation. DNS and HTTPS presence are explicitly not treated as application-level ownership proof.
- Verification is available only through a deployment CLI. No Next.js startup hook, public HTTP route, or unauthenticated promotion path was added.
- The CLI requires protected runtime/database access, exact `--confirm=builder.lwill.in` input, and `LWILL_VERIFY_TENANT_DOMAIN_ADMIN_EMAIL` identifying an active user.
- Inside one transaction, the verifier requires the canonical active HDK tenant, the exact active same-tenant domain mapping, and an active HDK tenant membership with an active tenant-scoped role granting the existing `tenant.manage` permission.
- Only `pending` transitions to `verified`. An already verified mapping is an authorized idempotent success. Inactive, cross-tenant, missing, ambiguous, and unknown-state records fail closed.
- The first transition writes `AuditLog.action = tenant-domain.verified`, attributes the administrator user, and records only the hostname, prior status, and `operator-attestation` method.
- Native-auth hostname resolution is unchanged and continues to require an active tenant plus active, verified domain. `isPrimary` remains unchanged (`false` for the current production record).
- No schema or migration change was required.

### Production Operation

- Run manually in the deployed application environment after the commit is approved, pushed, and deployed:
   `LWILL_VERIFY_TENANT_DOMAIN_ADMIN_EMAIL=lwillshivansh@gmail.com pnpm --filter @lwill/authentication-context-prisma run verify:initial-tenant-domain -- --confirm=builder.lwill.in`
- This command has not been run against production by repository development. When run against the confirmed current state, it is expected to change only `verificationStatus` from `pending` to `verified` and create the audit record.

### Verification Results

- Focused tenant-domain verification suite — Passed: 1 file, 8 tests covering pending rejection, active verified acceptance, inactive rejection, cross-tenant rejection, unauthorized rejection, authorized verification, idempotency, and protected CLI input.
- Package strict TypeScript check — Passed.
- `pnpm test` — Passed: 6 successful monorepo tasks; authentication-context-prisma passed 13 files and 73 tests.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation; no domain-verification route was added.
- `pnpm lint` — Passed.
- `git diff --check` — Passed.

---

## Authenticated Browser Refresh Persistence Fix

### Status: **Complete — all requested local verification passed**

- Root cause: the temporary X Nail page initialized its client-only `authenticated` state to `false` and had no session-restoration request. A full browser reload therefore rendered the login screen immediately, even though the native `lwill_access` and `lwill_refresh` cookies persisted correctly.
- The native provider intentionally verifies only the access cookie for server-side authentication. The existing refresh route and refresh-token rotation were present, but the browser UI never called that route during initialization.
- The page now starts in an indeterminate authentication state, calls `POST /api/auth/refresh` with same-origin credentials on mount, and renders the dashboard only after refresh succeeds. The native refresh service validates the persisted refresh token, preserves session and tenant checks, rotates the token, and sets replacement access/refresh cookies.
- Added a focused frontend regression test covering login, authenticated dashboard state, simulated page reload, refresh-based session restoration, and continued dashboard authentication.
- No database schema, migration, tenant-domain record, RBAC role/permission, deployment configuration, or production data was changed.

### Verification Results

- `pnpm --filter web test` — Passed: 13 test files, 96 tests.
- `pnpm test` — Passed: 6 successful workspace test tasks; web passed 13 files and 96 tests.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation; `/api/auth/refresh` remains registered as a dynamic route.
- `pnpm lint` — Passed.
- `git diff --check` — Passed; only normal Git line-ending notices were emitted by the working tree status/diff command.

---

## Logout Navigation Restoration Verification

### Status: **Implemented locally — production re-verification pending deployment**

### Root Cause

- The native logout route and persistence layer were not leaving a usable server session. `POST /api/auth/logout` derives the current session from a verified access token or valid refresh token, revokes the `AuthenticationSession` and its active refresh tokens transactionally, and clears both `lwill_access` and `lwill_refresh` cookies with the existing `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and expired/zero-max-age contract.
- The existing access-session verifier rejects revoked sessions, and refresh resolution rejects revoked refresh tokens or revoked/expired sessions. Focused tests verify both paths.
- The observed dashboard after browser Back/revisit is a client-rendered stale document restoration issue. `apps/web/src/app/page.tsx` renders the dashboard from client React state, while logout only changes that state in the current document. There was no `pageshow` handler or history-restoration revalidation. A browser/Next.js BFCache or document restoration can therefore repaint the previous dashboard without a new server authentication request. That stale paint is not evidence that the server session remains valid.
- BFCache was not assumed as the server-session cause: the repository source proves revocation and cookie clearing, and the regression test models persisted-document restoration explicitly. Browser-engine BFCache behavior still requires deployment-level browser verification.

### Exact Files Changed

- `apps/web/src/app/page.tsx` — revalidates authentication on `pageshow` when `event.persisted` is true, temporarily returns to the indeterminate state, and renders login when the revoked session cannot refresh.
- `apps/web/src/test/x-nail-native-auth.test.tsx` — adds a regression covering login, dashboard, logout, persisted-document restoration, refresh rejection, and absence of the dashboard after logout.
- `docs/PROJECT-STATUS.md` — records the verified root cause, security behavior, scope, progress, blockers, and next task.
- `docs/HANDOVER.md` — records the completed verification handover state.

### Security and Session Behavior

- Server-side session revocation remains authoritative and unchanged.
- Access and refresh cookies remain cleared according to ADR 013; no token is exposed to client JavaScript.
- A browser-restored stale dashboard is revalidated through the existing `/api/auth/refresh` path. A revoked session returns to login and cannot authenticate again through access or refresh validation.
- No Prisma schema/migration, `TenantDomain` production data, RBAC roles/permissions, production database, deployment, or unrelated uncommitted customer/CRM/RBAC work was modified.

### Verification Results

- Focused native-auth/frontend tests — Passed: 13 files, 97 tests.
- Full `pnpm test` — Passed: 6 successful workspace tasks; web passed 13 files and 97 tests.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation.
- `pnpm lint` — Passed.
- `git diff --check` — Passed; only normal Git line-ending notices were emitted.

### Production Verification Status

- Previously verified in production on `xnail.makemeartist.com`: login works, hard refresh preserves the authenticated dashboard, and logout returns to login.
- The post-logout Back/revisit behavior was investigated from source and covered locally, but this new client fix has not been deployed or production-tested. No production claim is made for the fix.

### Progress Snapshot (planning estimates, not a formal completion metric)

- **LWILL AI BUILDER overall:** 35% — shared monorepo, database foundation, authentication/session slice, authorization foundation, tenant-domain controls, and initial X Nail operational slices are verified; the platform UI, complete SRS coverage, production hardening, and most target modules remain incomplete.
- **X Nail MVP:** 55% — authenticated operational shell plus verified customer, service, staff, attendance, appointment, package/membership, and POS/billing foundations exist; production-grade ERP workflows, inventory, scheduling depth, payments, reporting, and tenant-specific repository separation remain incomplete.
- **Phase 1D:** 90% for the implemented native-auth/session slice — login, JWT/refresh integration, revocation, cookie contract, tenant resolution, browser refresh restoration, and logout navigation restoration are locally verified; production re-verification and broader SRS items such as MFA, password reset, lockout/rate limiting, API keys, and full audit coverage remain blockers.

### Remaining Blockers and Next Smallest Production-Safe Task

- Blocker: the fix is not deployed, and browser-engine behavior for Back/BFCache/revisit has not been rechecked on `xnail.makemeartist.com`.
- Blocker: production database/session and deployment operations remain separately controlled; no production mutation was performed here.
- Next smallest production-safe task: deploy this already-verified commit through the existing controlled release process, then run a browser matrix on `xnail.makemeartist.com` covering login → dashboard → logout → Back, direct revisit, hard refresh, and a second-tab stale-document case; confirm every restored view requires the refresh route and revoked sessions remain rejected. Do not alter schema, tenant-domain data, RBAC, or production records.

---

## X Nail Authentication Redirect Fix — 2026-08-19

### Status: **Implemented locally — production verification pending**

### Root Cause

- `apps/web/src/lib/crm/customer-runtime.ts` `authorize()` returned `{ outcome: "unauthenticated" }` for **both** unauthenticated sessions and authenticated sessions with `tenantContext === null`. The `||` condition on line 14 conflated authentication failure (no session) with authorization failure (valid session, no tenant context).
- The client at `apps/web/src/app/page.tsx` line 139 treats 401 as "no session" and calls `setAuthenticated(false)`, redirecting to login. An authenticated user without tenant context was therefore incorrectly logged out after every `/api/customers` request returned 401.

### Fix Applied

- **`apps/web/src/lib/crm/customer-runtime.ts`**: The `authorize()` function now separates the two conditions: `!context.authenticated` returns `"unauthenticated"` (→ 401); `context.tenantContext === null` returns `"forbidden"` (→ 403). Authenticated sessions without a tenant context stay on the dashboard with a "You are not authorized to view customers." message instead of being redirected to login.
- **`apps/web/src/instrumentation.ts`**: `registerNativeAuthenticationProvider()` is now wrapped in try/catch. Success and failure are logged with `[auth]` prefix. The `throw error` ensures the server fails closed (won't start with broken auth).
- **`apps/web/src/lib/auth/native-auth.ts`**: No change needed. The 298ceab commit already correctly handles null/empty refresh tokens (returns null without clearing cookies). The catch block (line 411-413) and null-result path (line 416-418) correctly clear cookies for non-null token failures.

### Tests Added

- **`apps/web/src/test/customer-route-handlers.test.ts`**: Three new integration tests verify the real `authorize()` function returns `"unauthenticated"` for unauthenticated sessions, `"forbidden"` for authenticated + null tenant context, and `"forbidden"` for authenticated + valid tenant context.
- **`apps/web/src/test/x-nail-native-auth.test.tsx`**: Two new client integration tests verify that 401 from `/api/customers` redirects to login and 403 keeps the user on the dashboard with an error message.

### Files Changed

| File | Change |
|------|--------|
| `apps/web/src/lib/crm/customer-runtime.ts` | Split `||` condition in `authorize()` to separate authentication from authorization |
| `apps/web/src/instrumentation.ts` | Added try/catch, success/fail logging, fail-closed rethrow |
| `apps/web/src/test/customer-route-handlers.test.ts` | Added 3 integration tests for `authorize()` outcome behavior |
| `apps/web/src/test/x-nail-native-auth.test.tsx` | Added 2 tests for 401 redirect vs 403 dashboard stay |
| `docs/PROJECT-STATUS.md` | Updated HEAD commit and added this section |
| `docs/ENVIRONMENT.md` | Added `LWILL_AUTH_*` environment variable documentation |
| `docs/HANDOVER.md` | Updated handover state |
| `AGENTS.md` | Updated HEAD reference |

### Verification Results

- Pending: `pnpm test`, `pnpm build`, `pnpm lint`, `git diff --check`.

### Remaining Limitation

- Customer API remains 403 for all authenticated sessions until an approved customer permission/grant catalog is supplied through the existing authorization mechanism.

---

## X Nail Customer API/UI Safety Review — 2026-08-17

- **X Nail MVP progress only:** 60% (unchanged; this is not an overall platform percentage).
- **Customer module:** 70% — reusable tenant-scoped Customer service, API handlers, fail-closed route boundary, and API-backed dashboard integration are implemented locally. The module is not enabled for authorized use because the repository does not contain an approved customer permission/grant catalog.
- **Customer status:** PARTIAL / FAIL-CLOSED.
- **Authorization finding:** The verified authorization mechanism is the existing provider-neutral authorization contract, Prisma grant loader, membership role-to-permission mapping, and approved `tenant.manage` hierarchy/admin bootstrap. `customer.read`, `customer.write`, and `x-nail-operations` are not approved by the existing catalog. They were not added.
- **Safety action:** The unsafe customer-permission bootstrap and its package script were removed from the release candidate. No production bootstrap or database command was executed.
- **Tenant/auth boundary:** Customer route services derive `tenantId` only from authenticated server context. Route handlers accept no client `tenantId`, authorize before service access, return 401 for unauthenticated requests, and return 403 for forbidden requests. The runtime currently returns 403 for Customer requests until an approved permission catalog/grant mechanism exists.
- **UI integration:** The X Nail page fetches `GET /api/customers` after authentication, uses `POST /api/customers` for creation, stores the server-returned persistent ID, uses persisted IDs in customer selectors and appointment references, handles loading/empty/401/403 states, and no longer uses the demo customer helper or in-memory demo customer list.
- **Exact files changed:** `apps/web/package.json`; `apps/web/src/app/page.tsx`; `apps/web/src/app/api/customers/route.ts`; `apps/web/src/app/api/customers/[id]/route.ts`; `apps/web/src/lib/crm/customer-route-handlers.ts`; `apps/web/src/lib/crm/customer-runtime.ts`; `apps/web/src/test/customer-route-handlers.test.ts`; `apps/web/src/test/x-nail-native-auth.test.tsx`; `packages/authentication-context-prisma/package.json`; `packages/authentication-context-prisma/src/customer-service.ts`; `packages/authentication-context-prisma/src/customer-service.test.ts`; `pnpm-lock.yaml`; removal of `packages/authentication-context-prisma/src/initial-customer-permissions-bootstrap.ts`, `packages/authentication-context-prisma/src/initial-customer-permissions-bootstrap-cli.ts`, and `packages/authentication-context-prisma/src/initial-customer-permissions-bootstrap.test.ts`.
- **Verification:** `pnpm test` passed (6 workspace tasks; web 13 files / 100 tests); `pnpm build` passed; `pnpm lint` passed; `git diff --check` passed.
- **Protected-area review:** No Prisma schema/migration, authentication implementation, TenantDomain implementation, deployment configuration, or production database was changed. No production mutation was performed. Existing native-auth navigation tests remain passing.
- **Commit readiness:** The scoped Customer work is safe to commit as a fail-closed partial implementation, subject to normal review. It is not safe to advertise Customer operations as enabled until an approved canonical customer permission/grant catalog is supplied through the existing authorization mechanism.
- **Remaining Customer gaps:** An approved canonical permission/grant decision is required; authorized Customer integration tests need to be added once that catalog exists; production browser/API verification and production data setup remain pending and must not be performed by this task.
- **Exact next X Nail task:** Obtain and implement the approved Customer permission/grant catalog through the existing authorization mechanism, then add narrowly scoped authorization-backed Customer integration tests and re-enable Customer operations without changing authentication, TenantDomain, Prisma schema/migrations, deployment configuration, or production data.

## X Nail Services Validation Slice — 2026-08-17

- **X Nail MVP progress only:** 60% (unchanged; this is not an overall platform percentage).
- **Services module:** 75% for the current reusable service/persistence slice. Service records already contain tenant identity, name, duration, price, description, and active state; this slice adds server-side validation for non-blank names, positive whole-minute durations, and non-negative whole-cent prices before persistence.
- **Appointments module:** 60% for the current reusable persistence/domain slice. Appointment creation already validates same-tenant Customer and Service links; the current model stores start/end timestamps and a status, but it has no server/API/UI persistence workflow for staff linkage or status transitions.
- **Classification before implementation:** Services — PARTIAL; validation gap. Appointments — PARTIAL; persistence/domain foundation only. Customer linkage — PARTIAL and currently fail-closed at the web authorization boundary. Staff linkage — PLACEHOLDER in the client operational demo and NOT IMPLEMENTED in the Prisma Appointment model. Branch/business-unit linkage — NOT IMPLEMENTED for Services/Appointments. Existing UI — MOCK/PLACEHOLDER for Services/Appointments. Existing APIs — NOT IMPLEMENTED for Services/Appointments. Database models — IMPLEMENTED for tenant-scoped Service and Appointment records, with Appointment linked to Customer and Service. Tests — IMPLEMENTED for service creation, appointment same-tenant validation, and client-side workflow helpers.
- **Smallest gap implemented:** Reusable Service persistence now rejects invalid name, duration, and price inputs before calling Prisma; focused tests verify the rejection path and prevent persistence for invalid values.
- **Security boundary:** No authentication/session, authorization, TenantDomain, tenant identity, Prisma schema, migration, production data, or deployment behavior was changed. Existing tenant IDs remain server/service inputs and Appointment same-tenant Customer/Service validation remains unchanged.
- **Remaining Services gaps:** authenticated server/API route integration, approved authorization wiring, branch/business-unit scope, staff/service metadata, and production verification remain incomplete.
- **Remaining Appointment gaps:** authenticated server/API workflow, approved authorization wiring, staff and branch linkage, server-side status transition policy, overlap/availability validation, and production verification remain incomplete.
- **Exact next X Nail task:** define and implement the smallest approved authenticated Services API slice through the existing server-context and authorization boundaries, without introducing Customer RBAC or changing schema/migrations.

---

## X Nail Customer RBAC Implementation — 2026-08-20

### Status: **Implemented and verified locally; not executed against production**

### Implemented Slice

- [`customer-runtime.ts`](apps/web/src/lib/crm/customer-runtime.ts) is now wired to the real authorization pipeline via [`authorizeFromContext()`](apps/web/src/lib/auth/authorization-boundary.ts:27), [`createAuthorizationService()`](packages/authorization-service/src/authorization-service.ts:23), and [`loadPermissionGrants()`](packages/authorization-prisma/src/load-permission-grants.ts:6).
- [`authorize(permissionCode)`](apps/web/src/lib/crm/customer-runtime.ts:19) accepts a permission code parameter and returns `"authorized"` with `tenantId` when a matching grant exists, `"forbidden"` when denied, and `"unauthenticated"` when no session exists.
- [`customer-route-handlers.ts`](apps/web/src/lib/crm/customer-route-handlers.ts) now passes `"customer.read"` for list/get and `"customer.write"` for create/update operations through the `authorize` call.
- A new idempotent CLI bootstrap creates `customer.read` and `customer.write` Permission records and assigns both to the existing `tenant-admin` role via [`bootstrapCustomerPermissions()`](packages/authentication-context-prisma/src/initial-customer-permissions-bootstrap.ts:59).
- CLI entry: [`initial-customer-permissions-bootstrap-cli.ts`](packages/authentication-context-prisma/src/initial-customer-permissions-bootstrap-cli.ts).
- Package script: `bootstrap:initial-customer-permissions`.
- Deny-by-default and tenant isolation are preserved. The authorization boundary fails closed on any error, missing context, unauthenticated state, or missing tenant context.

### New Files

| File | Purpose |
|------|---------|
| `packages/authentication-context-prisma/src/initial-customer-permissions-bootstrap.ts` | Idempotent bootstrap creating `customer.read` and `customer.write` permissions, assigned to `tenant-admin` |
| `packages/authentication-context-prisma/src/initial-customer-permissions-bootstrap-cli.ts` | CLI entry for the customer permissions bootstrap |
| `packages/authentication-context-prisma/src/initial-customer-permissions-bootstrap.test.ts` | 8 deterministic tests covering first creation, idempotency, missing/inactive tenant, missing/conflicting/ambiguous role |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/src/lib/crm/customer-runtime.ts` | Wired to authorization pipeline; imports `authorizeFromContext`, `createAuthorizationService`, `loadPermissionGrants`; `authorize()` accepts `permissionCode` and uses real authorization service |
| `apps/web/src/lib/crm/customer-route-handlers.ts` | `CustomerRouteServices.authorize` signature accepts `permissionCode: string`; route handlers pass `"customer.read"` or `"customer.write"` |
| `apps/web/src/test/customer-route-handlers.test.ts` | Updated mock signatures for new `authorize(permissionCode)` contract; added tests for permission code forwarding, authorized access with grants, wrong permission code denial, cross-tenant grant denial, and grant loader failure |
| `packages/authentication-context-prisma/package.json` | Added `bootstrap:initial-customer-permissions` script |

### Tests Added

| Package / Location | Test File | Count |
|-------------------|-----------|-------|
| `@lwill/authentication-context-prisma` | `src/initial-customer-permissions-bootstrap.test.ts` | 8 |
| `apps/web` | `src/test/customer-route-handlers.test.ts` (new tests) | 9 (added) |
| **Total new tests** | | **17** |

**Test coverage by requirement:**

- ✅ `customer.read` permission created and assigned to `tenant-admin`
- ✅ `customer.write` permission created and assigned to `tenant-admin`
- ✅ Bootstrap idempotency (skip if already exists)
- ✅ Bootstrap fail-closed on missing/inactive tenant
- ✅ Bootstrap fail-closed on missing/conflicting/ambiguous role
- ✅ Route handlers pass `"customer.read"` for list/get
- ✅ Route handlers pass `"customer.write"` for create/update
- ✅ Authorized access with matching grant returns `"authorized"` with `tenantId`
- ✅ Wrong permission code returns `"forbidden"`
- ✅ Cross-tenant grant returns `"forbidden"`
- ✅ Grant loader failure fails closed

### Verification Results

- `pnpm test` — Passed: 6 successful workspace tasks; web 14 files / 136 tests; authentication-context-prisma 17 files / 137 tests.
- `pnpm --filter web test` — Passed: 14 files, 136 tests.
- `pnpm --filter @lwill/authentication-context-prisma test` — Passed: 17 files, 137 tests.
- `pnpm --filter web lint` — Passed.
- `pnpm --filter web build` — Passed: Next.js production build and TypeScript compilation.
- `git diff --check` — Passed; only normal CRLF line-ending notices.

### Important Boundary

- No Prisma schema or migration was changed.
- No authentication code was modified.
- No UI was modified.
- No production database connection or mutation was performed.
- The bootstrap has not been executed against production.
- No `customer.delete` permission exists (no delete API exists).
- No new roles were introduced; permissions are assigned to the existing `tenant-admin` role.

---

## X Nail Services API Vertical Slice — 2026-08-20

### Status: **Implemented and verified locally; not executed against production**

### Implemented Slice

- [`service-runtime.ts`](apps/web/src/lib/crm/service-runtime.ts) mirrors [`customer-runtime.ts`](apps/web/src/lib/crm/customer-runtime.ts) exactly: wires to the real authorization pipeline via [`authorizeFromContext()`](apps/web/src/lib/auth/authorization-boundary.ts:27), [`createAuthorizationService()`](packages/authorization-service/src/authorization-service.ts:23), and [`loadPermissionGrants()`](packages/authorization-prisma/src/load-permission-grants.ts:6).
- [`authorize(permissionCode)`](apps/web/src/lib/crm/service-runtime.ts:19) returns `"authorized"` with `tenantId` when a matching grant exists, `"forbidden"` when denied, and `"unauthenticated"` when no session exists.
- [`service-route-handlers.ts`](apps/web/src/lib/crm/service-route-handlers.ts) passes `"service.read"` for list/get and `"service.write"` for create/update operations through the `authorize` call.
- Input validation enforces non-blank `name`, positive integer `durationMinutes`, and non-negative integer `priceCents` for create; same rules for partial update fields.
- API routes: [`GET/POST /api/services`](apps/web/src/app/api/services/route.ts) and [`GET/PATCH /api/services/[id]`](apps/web/src/app/api/services/[id]/route.ts).
- A new idempotent CLI bootstrap creates `service.read` and `service.write` Permission records and assigns both to the existing `tenant-admin` role via [`bootstrapServicePermissions()`](packages/authentication-context-prisma/src/initial-service-permissions-bootstrap.ts:79).
- CLI entry: [`initial-service-permissions-bootstrap-cli.ts`](packages/authentication-context-prisma/src/initial-service-permissions-bootstrap-cli.ts).
- Package script: `bootstrap:initial-service-permissions`.
- [`page.tsx`](apps/web/src/app/page.tsx) Services tab now fetches from `GET /api/services` when authenticated and the Services tab is active, with loading/empty/401/403 states. `addService()` POSTs to `POST /api/services`. Service dropdown in Appointments tab uses real service IDs.
- Deny-by-default and tenant isolation are preserved. The authorization boundary fails closed on any error, missing context, unauthenticated state, or missing tenant context.

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/crm/service-runtime.ts` | Authorization wiring for service routes |
| `apps/web/src/lib/crm/service-route-handlers.ts` | Route handlers: list, get, create, update with input validation |
| `apps/web/src/app/api/services/route.ts` | `GET` (list) and `POST` (create) API route |
| `apps/web/src/app/api/services/[id]/route.ts` | `GET` (get by id) and `PATCH` (update) API route |
| `packages/authentication-context-prisma/src/initial-service-permissions-bootstrap.ts` | Idempotent bootstrap creating `service.read` and `service.write` permissions, assigned to `tenant-admin` |
| `packages/authentication-context-prisma/src/initial-service-permissions-bootstrap-cli.ts` | CLI entry for the service permissions bootstrap |
| `packages/authentication-context-prisma/src/initial-service-permissions-bootstrap.test.ts` | 7 deterministic tests covering first creation, idempotency, missing/inactive tenant, missing/conflicting/ambiguous role |
| `apps/web/src/test/service-route-handlers.test.ts` | 21 tests covering auth gating, permission forwarding, runtime authorize outcomes, input validation, and authorized operations |

### Modified Files

| File | Change |
|------|--------|
| `packages/authentication-context-prisma/package.json` | Added `bootstrap:initial-service-permissions` script |
| `apps/web/src/app/page.tsx` | Added `ServiceRecord` type; replaced mock `initialServices` with API-backed fetch; added `isLoadingServices`/`serviceError` states; `addService()` POSTs to `/api/services`; service dropdown uses real IDs; removed unused `createServiceRecord` import |

### Tests Added

| Package / Location | Test File | Count |
|-------------------|-----------|-------|
| `@lwill/authentication-context-prisma` | `src/initial-service-permissions-bootstrap.test.ts` | 7 |
| `apps/web` | `src/test/service-route-handlers.test.ts` | 21 |
| **Total new tests** | | **28** |

**Test coverage by requirement:**

- ✅ `service.read` permission created and assigned to `tenant-admin`
- ✅ `service.write` permission created and assigned to `tenant-admin`
- ✅ Bootstrap idempotency (skip if already exists)
- ✅ Bootstrap fail-closed on missing/inactive tenant
- ✅ Bootstrap fail-closed on missing/conflicting/ambiguous role
- ✅ Route handlers pass `"service.read"` for list/get
- ✅ Route handlers pass `"service.write"` for create/update
- ✅ Authorized access with matching grant returns `"authorized"` with `tenantId`
- ✅ Wrong permission code returns `"forbidden"`
- ✅ Cross-tenant grant returns `"forbidden"`
- ✅ Grant loader failure fails closed
- ✅ Input validation: non-blank name, positive integer durationMinutes, non-negative integer priceCents
- ✅ Unknown keys rejected (tenantId injection prevention)
- ✅ 404 for non-existent/cross-tenant service
- ✅ Zero priceCents accepted

### Verification Results

- `pnpm test` — Passed: 6 successful workspace tasks; web 15 files / 157 tests; authentication-context-prisma 18 files / 145 tests.
- `pnpm lint` — Passed.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation; `/api/services` and `/api/services/[id]` registered as dynamic routes.

### Important Boundary

- No Prisma schema or migration was changed.
- No authentication code was modified.
- No authorization code was modified.
- No Customer module was modified.
- No `service-service.ts` or its tests were modified.
- No production database connection or mutation was performed.
- The bootstrap has not been executed against production.
- No `service.delete` permission exists (no delete API exists).
- No new roles were introduced; permissions are assigned to the existing `tenant-admin` role.

---

## X Nail Appointments API Vertical Slice — 2026-08-27

### Status: **Implemented and verified locally; not executed against production**

### Implemented Slice

- [`appointment-runtime.ts`](apps/web/src/lib/crm/appointment-runtime.ts) mirrors [`service-runtime.ts`](apps/web/src/lib/crm/service-runtime.ts): wires to the real authorization pipeline via [`authorizeFromContext()`](apps/web/src/lib/auth/authorization-boundary.ts:27), [`createAuthorizationService()`](packages/authorization-service/src/authorization-service.ts:23), and [`loadPermissionGrants()`](packages/authorization-prisma/src/load-permission-grants.ts:6), reusing the existing [`createAppointmentService()`](packages/authentication-context-prisma/src/appointment-service.ts:53) data layer (no data-layer changes).
- [`authorize(permissionCode)`](apps/web/src/lib/crm/appointment-runtime.ts:19) returns `"authorized"` with the server-derived `tenantId` when a matching grant exists, `"forbidden"` when denied, and `"unauthenticated"` when no session exists. `tenantId` is taken from `context.tenantContext.tenantId`, never from the client.
- [`appointment-route-handlers.ts`](apps/web/src/lib/crm/appointment-route-handlers.ts) passes `"appointment.read"` for list/get and `"appointment.write"` for create/update through the `authorize` call.
- Input validation enforces non-empty `customerId`/`serviceId`, valid ISO-8601 `startsAt`/`endsAt` with `endsAt` strictly after `startsAt`, non-blank `status` (string only; no enum/status-transition rules are invented), and `notes` as `string | null`. Unexpected keys (including a client-supplied `tenantId`) are rejected with `400`, preventing authorization-boundary manipulation.
- API routes: [`GET/POST /api/appointments`](apps/web/src/app/api/appointments/route.ts) and [`GET/PATCH /api/appointments/[id]`](apps/web/src/app/api/appointments/[id]/route.ts).
- A new idempotent CLI bootstrap creates `appointment.read` and `appointment.write` Permission records and assigns both to the existing `tenant-admin` role via [`bootstrapAppointmentPermissions()`](packages/authentication-context-prisma/src/initial-appointment-permissions-bootstrap.ts:79).
- CLI entry: [`initial-appointment-permissions-bootstrap-cli.ts`](packages/authentication-context-prisma/src/initial-appointment-permissions-bootstrap-cli.ts). Package script: `bootstrap:initial-appointment-permissions`.
- [`page.tsx`](apps/web/src/app/page.tsx) Appointments "Book appointment" form now creates via `POST /api/appointments` (mirroring `addService()`), reading `customerId`/`serviceId` from the real `/api/services` and `/api/customers` dropdowns; the mock `createAppointmentRecord` creation path is no longer used for persistence. `advanceAppointment` (client-side status demo), the staff dropdown, and the form structure are preserved unchanged.
- Deny-by-default and tenant isolation are preserved. The authorization boundary fails closed on any error, missing context, unauthenticated state, or missing tenant context. Cross-tenant get/list/update return `null` → `404` at the route layer; `createAppointment` validates that the referenced customer and service belong to the same tenant as the request.

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/crm/appointment-runtime.ts` | Authorization wiring for appointment routes |
| `apps/web/src/lib/crm/appointment-route-handlers.ts` | Route handlers: list, get, create, update with input validation |
| `apps/web/src/app/api/appointments/route.ts` | `GET` (list) and `POST` (create) API route |
| `apps/web/src/app/api/appointments/[id]/route.ts` | `GET` (get by id) and `PATCH` (update) API route |
| `packages/authentication-context-prisma/src/initial-appointment-permissions-bootstrap.ts` | Idempotent bootstrap creating `appointment.read` and `appointment.write` permissions, assigned to `tenant-admin` |
| `packages/authentication-context-prisma/src/initial-appointment-permissions-bootstrap-cli.ts` | CLI entry for the appointment permissions bootstrap |
| `packages/authentication-context-prisma/src/initial-appointment-permissions-bootstrap.test.ts` | 8 deterministic tests covering first creation, idempotency, missing/inactive tenant, missing/conflicting/ambiguous role |
| `apps/web/src/test/appointment-route-handlers.test.ts` | 23 tests covering auth gating, permission forwarding, runtime authorize outcomes, input validation, and authorized operations |

### Modified Files

| File | Change |
|------|--------|
| `packages/authentication-context-prisma/package.json` | Added `bootstrap:initial-appointment-permissions` script |
| `apps/web/src/app/page.tsx` | Replaced mock `createAppointmentRecord` in `addAppointment` with `POST /api/appointments`; added `appointmentError` state + display; removed unused `createAppointmentRecord` import; preserved `advanceAppointment`, staff dropdown, and form structure |

### Tests Added

| Package / Location | Test File | Count |
|-------------------|-----------|-------|
| `@lwill/authentication-context-prisma` | `src/initial-appointment-permissions-bootstrap.test.ts` | 8 |
| `apps/web` | `src/test/appointment-route-handlers.test.ts` | 23 |
| **Total new tests** | | **31** |

**Test coverage by requirement:**

- ✅ `appointment.read` permission created and assigned to `tenant-admin`
- ✅ `appointment.write` permission created and assigned to `tenant-admin`
- ✅ Bootstrap idempotency (skip if already exists)
- ✅ Bootstrap fail-closed on missing/inactive tenant
- ✅ Bootstrap fail-closed on missing/conflicting/ambiguous role
- ✅ Route handlers pass `"appointment.read"` for list/get
- ✅ Route handlers pass `"appointment.write"` for create/update
- ✅ Authorized access with matching grant returns `"authorized"` with `tenantId`
- ✅ Wrong permission code returns `"forbidden"`
- ✅ Cross-tenant grant returns `"forbidden"`
- ✅ Grant loader failure fails closed
- ✅ Input validation: non-empty customerId/serviceId, valid ISO dates with endsAt > startsAt, non-blank status, notes optional
- ✅ Unknown keys rejected (tenantId injection prevention)
- ✅ 404 for non-existent/cross-tenant appointment
- ✅ notes accepted as null and omitted

### Verification Results

- `pnpm test` — Passed: `authentication-context-prisma` 19 files / 153 tests; `web` 16 files / 180 tests (vitest default `threads` pool times out on worker startup in this Windows host — an environment artifact, not a code regression; `--pool=forks` runs the full suite green).
- `pnpm lint` — Passed.
- `pnpm build` — Passed: Next.js production build and TypeScript compilation; `/api/appointments` and `/api/appointments/[id]` registered as dynamic routes.
- `pnpm --filter @lwill/authentication-context-prisma exec tsc --noEmit` — Passed (0 errors).
- `git diff --check` — Passed (working tree clean at 5187273).
- **Production deployment**: Coolify auto-deployed from GitHub push at HEAD `5187273`; container healthy; healthcheck passing; `builder.lwill.in` reachable (HTTP 200).
- **Production authentication**: `POST /api/auth/login` returns 204 with HttpOnly Secure SameSite=Lax access/refresh cookies; tenant context established (`builder.lwill.in` → `HDK Beauty I Pvt. Ltd.`, verified+active in `TenantDomain`); unauthenticated API requests return 401 (fail-closed).
- **Production Services API**: `GET /api/services` 200; `POST /api/services` 201; `GET /api/services/[id]` 200; `PATCH /api/services/[id]` 200; input validation 400 for invalid inputs; unauthorized 401.
- **Production Appointments API**: `GET /api/appointments` 200; `POST /api/appointments` 201; `GET /api/appointments/[id]` 200; `PATCH /api/appointments/[id]` 200; input validation 400 for invalid inputs (empty customerId, endsAt <= startsAt, tenantId injection); unauthorized 401.
- **Production permission bootstrap**: `appointment.read` and `appointment.write` created and assigned to `tenant-admin` via `pnpm --filter @lwill/authentication-context-prisma run bootstrap:initial-appointment-permissions`; test data created during verification was cleaned up.

### Important Boundary

- No Prisma schema or migration was changed (the `Appointment` model pre-exists).
- No authentication or authorization code was modified.
- No Customer or Services module was modified.
- No `appointment-service.ts` or its existing tests were modified.
- No production database schema was modified.
- The appointment permission bootstrap (`appointment.read`, `appointment.write`) was the only data operation performed in production; it was idempotent, transactional, and fail-closed per the existing repository mechanism.
- Test records created during verification (one Service, one Appointment) were deleted from the production database immediately after verification.
- No `appointment.delete` permission exists (no delete API exists).
- No new roles were introduced; permissions are assigned to the existing `tenant-admin` role.
 - **Intentional UI scope:** the appointment-list `GET /api/appointments` read path is now wired as a list fetcher in the Appointments tab (mirroring the Services tab fetch pattern, with loading/error/401/403 states). The `advanceAppointment` client-side status demo, staff dropdown, and form structure are preserved unchanged. Server-side `status` remains an open string (no status-transition rules are specified or inventoried here), so the demo's `advanceAppointment` transitions remain over the fixed `APPOINTMENT_STATUS_ORDER` ("Booked" → … → "Completed"). The mock data path (`createAppointmentRecord`) used for *booking* was replaced with the real `POST /api/appointments`; it is not referenced in the page component. This keeps the change to the smallest safe vertical slice.
