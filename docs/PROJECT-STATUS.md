# Project Status & Baseline Tracking

## General Project Overview

- **Project Name**: LWILL AI BUILDER v1 (`lwill-ai-builder`)
- **Project Version**: `1.0.0` (`apps/web` version `0.1.0`)
- **Current Branch**: `main`
- **Current HEAD Commit**: `dea96b3`
- **Last Stable Commit**: `dea96b3`

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
- **Current Packages / Modules / Services**: No shared `packages`, business `modules`, or backend `services` are currently implemented.
- **Database Status**: Not implemented; no database connection verified.
- **Migration Status**: Not implemented; no migration system verified.
- **Authentication Status**: Not implemented.
- **Authorization Status**: Not implemented.
- **Test Status**: `pnpm test` verified, but no test tasks are currently defined. Turborepo reports `0 successful, 0 total`. Automated test coverage is not yet implemented.
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

- No automated test suite currently exists.
- Database, migrations, authentication, and authorization are not implemented.
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
