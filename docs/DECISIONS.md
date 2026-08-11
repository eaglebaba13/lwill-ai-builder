# Architectural Decision Records (ADR)

This file records key architectural decisions made for **LWILL AI BUILDER v1**.

---

## ADR 001: Existing Repository as Single Source of Truth
- **Status**: Accepted
- **Context**: Discrepancies may arise between high-level SRS requirements, AI chat histories, and actual repository code.
- **Decision**: The existing code repository and explicit git commits are the sole source of truth. Features are considered implemented ONLY when verified in source code with passing builds and tests.
- **Consequences**: No documentation or AI prompt may claim a feature exists without source code evidence.

---

## ADR 002: Monorepo Architecture with Turborepo and pnpm Workspace
- **Status**: Accepted
- **Context**: The platform will encompass multiple applications (web app, future admin portals, AI engine) and shared modules.
- **Decision**: Use a single monorepo structured with `pnpm` workspace and orchestrated by Turborepo (`turbo`).
- **Consequences**: Code reusability is maximized across packages; builds are cached and accelerated.

---

## ADR 003: Client-First Strategy (HDK Beauty / X Nail)
- **Status**: Accepted — Amended by ADR 010
- **Context**: Designing an abstract ERP engine in isolation risks building over-generalized or impractical abstractions.
- **Decision**: Validate initial ERP domains (booking, POS, inventory, customer management) against real operational requirements from HDK Beauty and X Nail salons before generalization.
- **Consequences**: Domain models remain practical, realistic, and instantly useful.

---

## ADR 004: Dynamic Tenant Hierarchy (No Hard-Coded Branch Models)
- **Status**: Accepted
- **Context**: Many legacy systems hard-code a fixed 1-to-2 branch model or flat single-location structure.
- **Decision**: Implement a dynamic 3-tier hierarchy (`Tenant` → `Business Unit` → `Branch`) supporting arbitrary branch scaling.
- **Consequences**: Supports multi-store chains, franchise models, and enterprise org structures seamlessly.

---

## ADR 005: Web-First ERP Architecture
- **Status**: Accepted
- **Context**: ERP users operate across desktop workstations, tablets, and web interfaces.
- **Decision**: Build the web interface (`apps/web` with Next.js App Router) as the primary platform interface before building native mobile apps.
- **Consequences**: Fast deployment iteration, cross-platform accessibility via modern browsers.

---

## ADR 006: Provider-Neutral Integrations Architecture
- **Status**: Accepted
- **Context**: Vendor lock-in with specific auth, payment, or storage providers creates rigid deployment constraints.
- **Decision**: Design integration interfaces with abstraction layers so underlying providers (e.g., auth, payment gateways, file storage) can be swapped without rewriting business logic.
- **Consequences**: High flexibility across cloud environments and self-hosted deployments.

---

## ADR 007: Lean Initial Infrastructure (No Unnecessary Caching/Queue Overhead)
- **Status**: Accepted
- **Context**: Adding Redis, BullMQ, or MinIO prematurely adds operational complexity to early development.
- **Decision**: Avoid introducing Redis, background worker queues, or object storage clusters until load or feature requirements explicitly mandate them.
- **Consequences**: Simplifies local setup, lowers resource overhead, speeds up early development iteration.

---

## ADR 008: AI Provider Independence
- **Status**: Accepted
- **Context**: AI models evolve rapidly; reliance on a single provider creates single-point-of-failure risks.
- **Decision**: Build an AI provider wrapper interface capable of supporting multiple LLM backends (OpenAI, Anthropic, local models).
- **Consequences**: Prevents vendor lock-in and allows dynamic fallback between providers.

---

## ADR 009: Mandatory Usage of `pnpm` Package Manager
- **Status**: Accepted
- **Context**: Mixing package managers (`npm`, `yarn`, `pnpm`) causes lockfile conflicts and non-deterministic dependency resolution.
- **Decision**: Enforce `pnpm` (`pnpm@11.20.0`) across all development environments and CI pipelines. Lockfiles other than `pnpm-lock.yaml` (such as `package-lock.json` or `yarn.lock`) are strictly prohibited.
- **Consequences**: Deterministic, fast, space-efficient dependency management.

---

## ADR 010: Tenant Code Physical Separation (Amends ADR 003)
- **Status**: Accepted
- **Context**: ADR 003 established that HDK Beauty / X Nail operational requirements should validate initial ERP domain models before generalization, but did not specify where the resulting implementation code should physically reside. In practice, tenant-branded implementation (`apps/web/src/app/page.tsx`, and the metadata in `apps/web/src/app/layout.tsx`) was committed directly inside this platform repository. The later "Multi-Tenant Repository Isolation & Client Portability" rules (`docs/PROJECT-STATUS.md`) mandate that every tenant/client must have its own independent repository and that tenant-specific implementation must never enter `lwill-ai-builder`. These two positions conflict on code placement.
- **Decision**: ADR 003's domain-validation strategy remains valid and is not overturned — HDK Beauty / X Nail requirements may continue to inform platform design. However, tenant-specific implementation code (UI, business logic, configuration, assets) must not be committed into `lwill-ai-builder`; it must reside only in that tenant's own dedicated repository, per the Multi-Tenant Repository Isolation rules in `docs/PROJECT-STATUS.md`.
- **Consequences**: The HDK Beauty / X Nail content currently present in `apps/web/src/app/page.tsx` and `apps/web/src/app/layout.tsx` is scheduled for migration out of this repository. The migration plan, its execution status, and open items (target tenant repository name, interim `builder.lwill.in` content, verification, deployment cutover, rollback) are tracked in the "HDK/X Nail Migration Plan (Not Yet Executed)" subsection of `docs/PROJECT-STATUS.md` and are NOT SPECIFIED where not yet decided. This ADR does not itself perform, authorize execution timing for, or modify any application code.

---

## ADR 011: Phase 1D Authentication Architecture Decision
- **Status**: Accepted for Phase 1D implementation scope
- **Context**: Phase 1D must implement a concrete authentication slice without redesigning the existing authentication context boundary, authorization boundary, tenant hierarchy, or migration baseline. The repository already defines provider-neutral authentication contracts in `packages/authentication-context/src/types.ts` and a server-side session adapter in `apps/web/src/lib/auth/session-provider.ts`; the Prisma schema already models `User`, `TenantMembership`, `AuditLog`, and the tenant/business-unit/branch hierarchy.
- **Decision**:
  - **SRS requirement**: Email + Password login is in scope for Phase 1D.
  - **SRS requirement**: Password reset via verified email is in scope for Phase 1D.
  - **SRS requirement**: JWT access tokens are required by DOC-015 and are in scope for Phase 1D.
  - **SRS requirement**: Refresh tokens are required by DOC-015 and are in scope for Phase 1D.
  - **SRS requirement**: Session timeout is in scope for Phase 1D.
  - **SRS requirement**: Single-session revocation is in scope for Phase 1D.
  - **SRS requirement**: Logout-all-devices is in scope for Phase 1D.
  - **SRS requirement**: Device/session tracking is in scope for Phase 1D.
  - **SRS requirement**: Authentication-event audit logging is in scope for Phase 1D.
  - **SRS requirement**: Failed-login lockout is in scope for Phase 1D.
  - **SRS requirement**: Rate limiting is in scope for Phase 1D.
  - **SRS requirement**: Existing tenant membership and tenant-context enforcement remain in scope for Phase 1D.
  - **SRS requirement**: Existing RBAC authorization boundary enforcement remains in scope for Phase 1D.
  - **Existing repository decision**: The existing `AuthenticationProvider` and `VerifiedSessionSource` boundaries remain unchanged and provider-neutral. The concrete authentication implementation must still be adapted through `VerifiedSessionSource` into the existing `AuthenticationContext` contract.
  - **Existing repository decision**: Tenant context continues to derive from authenticated identity plus a valid tenant membership and the existing tenant/business-unit/branch hierarchy; the implementation must not redesign the tenant hierarchy or authorization boundary.
  - **New proposed implementation decision**: Password credentials require dedicated server-side persistence. Passwords must never be stored in plaintext.
  - **New proposed implementation decision**: Argon2id is the proposed password hashing algorithm for Phase 1D. This is explicitly marked as an implementation decision because DOC-015 does not specify the algorithm.
  - **NOT SPECIFIED**: JWT signing algorithm, issuer, audience, claims, token TTL, key-rotation policy, lockout thresholds, rate-limit thresholds, and refresh-token rotation policy are not specified by DOC-015 and must not be invented in this ADR.
  - **DOC-015 baseline, deferred to a subsequent Phase 1 implementation slice**: MFA remains a DOC-015 requirement but is deferred to a subsequent Phase 1 implementation slice.
  - **DOC-015 baseline, deferred to a subsequent Phase 1 implementation slice**: API-key authentication remains a DOC-015 requirement but is deferred to a subsequent Phase 1 implementation slice.
  - **DOC-015 baseline, future methods**: Google Sign-In, Microsoft Sign-In, and OTP remain future methods exactly as stated by DOC-015.
  - **Constraint**: Migration `0_init` must not be modified as part of this phase.
- **Consequences**:
  - Phase 1D can proceed through the existing provider-neutral architecture without changing the current authentication-context contracts or tenant hierarchy model.
  - Password persistence, hashing, JWT policy details, lockout thresholds, rate-limit thresholds, and refresh-token lifecycle details require explicit approval before implementation because DOC-015 does not fully specify them.
  - MFA and API-key authentication remain part of the SRS baseline but are deferred to a later implementation slice; they are not introduced in Phase 1D.
  - No migration or schema change is performed in this ADR; any new persistence model must be introduced later through a separately approved change.

---

## ADR 012: Phase 1D Database Boundary between Platform Control Plane and Tenant Databases
- **Status**: Proposed
- **Context**: DOC-004, DOC-005, DOC-008, DOC-010, DOC-014, DOC-015, and DOC-031 define a multi-tenant SaaS platform with a preferred database-per-tenant model, identity and access requirements, tenant isolation, audit logging, and RLS expectations. The repository already contains a Prisma schema and migration baseline for a shared tenant hierarchy and platform identity constructs, alongside provider-neutral authentication and authorization contracts. Phase 1D must define the database boundary without redesigning the existing architecture or changing the existing Prisma schema or migration baseline.
- **Decision**:
  - **Existing repository decision**: Preserve the existing provider-neutral authentication architecture and the existing `AuthenticationProvider` / `VerifiedSessionSource` boundaries.
  - **Existing repository decision**: Preserve the existing `Tenant → BusinessUnit → Branch` hierarchy.
  - **Existing repository decision**: Preserve the current Prisma schema and migration `0_init` unchanged.
  - **Classification**: Based on the current repository evidence, the existing Prisma schema is the control-plane / platform database foundation unless repository evidence proves otherwise. No repository evidence currently shows a live database-per-tenant provisioning implementation or a separate physical tenant database deployment.
  - **Control-plane / platform database responsibilities**: Identity and authentication entities belong to the control plane, including the platform identity model (`User`), tenant membership and authorization constructs (`TenantMembership`, `Role`, `Permission`, `RolePermission`, `MembershipRole`, `BusinessUnitMembershipRole`, `BranchMembershipRole`), tenant hierarchy metadata (`Tenant`, `BusinessUnit`, `Branch`), and platform audit records (`AuditLog`). These records are the basis for authentication, authorization, tenant-context resolution, and audit trail generation.
  - **Tenant-database responsibilities**: Tenant-specific business data belongs to tenant databases in the intended architecture, including domain data for CRM, Finance, Inventory, HRMS, Workflow, Commerce, Healthcare, Salon, and other tenant business modules described by DOC-005 and DOC-031. The exact table-level ownership for each domain is NOT SPECIFIED by the supplied documents and remains future work.
  - **Authenticated identity resolution**: Authenticated `User` identity resolves to a valid `TenantMembership` in the control plane, and tenant context is then derived from the selected `Tenant` / `BusinessUnit` / `Branch` context. If the user has no valid active membership for the selected tenant, the tenant context is invalid and access is denied. This follows the existing authentication-context and authorization-boundary pattern already present in the repository.
  - **Relationship to the current Prisma schema**: The current `tenantId`-based Prisma schema is treated as the platform’s logical tenant scoping model for Phase 1D. A future database-per-tenant deployment would use the same logical tenant identity as the tenant boundary for routing and isolation, but the detailed mapping from logical `tenantId` values to physical tenant databases is NOT SPECIFIED.
  - **RLS**: DOC-031 requires Row Level Security as an engineering standard, but the supplied documents do not define concrete RLS policies, policy roles, role-binding rules, or the exact control-plane versus tenant-database policy split for each table. Those details are NOT SPECIFIED and must not be invented in this ADR.
  - **Out of scope for this ADR**: No database-per-tenant provisioning, no schema change, no migration change, no password/JWT/session/refresh-token implementation, and no tenant-database deployment mechanism are introduced in this ADR.
- **Consequences**:
  - The control-plane boundary remains anchored in the existing Prisma schema and the existing authentication/authorization contracts.
  - Tenant business data remains logically separated from platform identity and authorization in the intended architecture, but the exact physical database provisioning model and RLS policy implementation remain future work and require explicit approval.
  - This ADR preserves the existing repository architecture and does not create a new tenant database or modify the existing schema or migration baseline.
