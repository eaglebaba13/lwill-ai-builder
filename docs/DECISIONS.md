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

  ---

  ## ADR 013: Phase 1D Native Authentication Integration Policy
  - **Status**: Accepted
  - **Scope**: First native-authentication integration slice for `AUTH-001`, `AUTH-003`, and the core session/revocation portion of `AUTH-005`.
  - **Context**: DOC-015 requires secure login, JWT access tokens with refresh tokens, and session timeout/logout capability, but does not specify a JWT algorithm, token claims, token lifetimes, transport, cookie policy, key configuration, or refresh-token lifecycle. The repository already contains provider-neutral authentication contracts, a Prisma-backed session verifier, email/password login persistence, hashed refresh-token persistence, and tenant membership/context validation. The missing piece is application integration that obtains and verifies the request token, connects it to the existing session source, and exposes login/refresh/logout behavior. This ADR does not redesign those existing boundaries.
  - **Existing architecture**:
    - `AuthenticationProvider` is the provider-neutral contract consumed by server authorization callers.
    - `VerifiedSessionSource` is the concrete integration boundary. It returns an already verified session record or `null`; `createSessionAuthenticationProvider` only maps that record and fails closed.
    - `createPrismaVerifiedSessionSource` validates the session ID against Prisma, including existence, revocation, expiry, active user state, active tenant membership, and optional tenant hierarchy context.
    - `loginWithEmailPassword` verifies the persisted password hash, creates an `AuthenticationSession`, creates a hashed refresh token, and records login audit events.
    - The Prisma schema already contains `User`, `PasswordCredential`, `AuthenticationSession`, `RefreshToken`, `PasswordResetToken`, `TenantMembership`, and `AuditLog`. Migration `0_init` is the unchanged baseline.
    - Authorization derives identity and tenant scope from the authenticated context; JWTs must not become a replacement authorization boundary.
  - **Current implementation boundary**:
    - The login and database session persistence slice is implemented and tested.
    - Session verification is implemented behind `VerifiedSessionSource` and is fail-closed.
    - No application request resolver currently verifies a native JWT or reads a native session cookie, and no application login, refresh, or logout route is wired to the provider.
    - No JWT policy is currently implemented. The values below are proposed implementation decisions, not DOC-015 requirements.
  - **Decision — approved implementation policy**:
    - **JWT signing algorithm**: RS256 (`RSASSA-PKCS1-v1_5` with SHA-256). Access tokens are signed with a private key and verified with the corresponding public key. The JWT header includes `alg: RS256`, `typ: JWT`, and a configured `kid` to support key rotation.
    - **Issuer**: A required configured value, `LWILL_AUTH_JWT_ISSUER`, representing the deployed LWILL authentication authority. It is not inferred from the request host.
    - **Audience**: A required configured value, `LWILL_AUTH_JWT_AUDIENCE`, representing the LWILL web application/API resource boundary. It is not accepted from client input.
    - **Claims**: The access JWT contains only `iss`, `aud`, `sub` (the `User.id`), `sid` (the `AuthenticationSession.id`), `iat`, `exp`, and `jti`. `jti` is unique per issued access token. Roles, permissions, tenant hierarchy context, and mutable profile fields are intentionally excluded; those remain server-side and are resolved through the existing session, membership, tenant-context, and authorization boundaries.
    - **Access-token lifetime**: 15 minutes from issuance. The verifier rejects expired tokens and still requires the referenced server session to be active, so JWT validity alone cannot bypass revocation.
    - **Refresh-token lifetime**: 30 days maximum, bounded by the server session `expiresAt`. The session absolute lifetime is 30 days. No sliding extension is performed merely by presenting an access token.
    - **Refresh-token format and rotation**: Refresh tokens are opaque, cryptographically random values. Only their SHA-256 hashes are persisted. Each successful refresh atomically revokes the presented token and creates one replacement token linked to the same session. A previously revoked or otherwise invalid refresh token is rejected; suspected reuse revokes the associated session and its active refresh tokens. The existing `revokedAt` fields are used; no replacement-token or family columns are added by this ADR.
    - **Access-token transport**: The web integration transports the access JWT in an `HttpOnly`, `Secure` cookie named `lwill_access`. It is not placed in local storage, session storage, URLs, or response bodies for browser use. External bearer-token transport is deferred with API authentication.
    - **Session-cookie strategy**: The refresh token is carried separately in an `HttpOnly`, `Secure` cookie named `lwill_refresh`, with `Path=/`, no configured `Domain`, and `SameSite=Lax`. Both cookies are cleared on logout. Cookie `Max-Age`/expiry follows the token expiry. Because authentication is cookie-based, state-changing authentication endpoints require HTTPS and same-origin/CSRF defenses appropriate to the route; cookie attributes alone are not treated as complete CSRF protection.
    - **Signing-key configuration and secret handling**: The private key, public verification key, active `kid`, issuer, and audience are deployment configuration supplied through the platform secret manager or protected environment configuration. They must never be committed, logged, sent to the client, or placed in `.env` files containing real secrets. Production startup fails closed when required key configuration is absent or invalid. Verification accepts only explicitly configured public keys, and rotation keeps the previous public key available until all tokens signed with it have expired.
    - **Session revocation**: Logout revokes the current `AuthenticationSession` and its refresh tokens. Logout-all-devices revokes all active sessions and their refresh tokens for the user. Every request still performs the existing server-side session checks through `createPrismaVerifiedSessionSource`.
  - **SRS requirements versus implementation decisions**:
    - DOC-015 requirements for this slice are secure email/password login (`AUTH-001`), JWT access and refresh tokens (`AUTH-003`), and session timeout/revocation/logout capability from `AUTH-005`.
    - DOC-015 security controls also name password hashing, HTTPS, JWT signing keys, device/session tracking, and audit logs. Existing code provides password hashing, session metadata, and login audit persistence; the native integration must preserve those controls.
    - RS256, issuer, audience, claims, 15-minute/30-day lifetimes, cookie names and attributes, key variable names, rotation behavior, and the server-side session checks are implementation decisions proposed by this ADR. They are not requirements stated by DOC-015.
  - **Security implications**:
    - Short-lived access tokens limit exposure, while the database session and refresh-token records provide revocation that a self-contained JWT cannot provide.
    - Keeping authorization data out of JWTs avoids stale roles/permissions and preserves the existing authorization boundary, at the cost of server-side session and membership reads.
    - Cookie transport reduces browser token exfiltration through script access but creates CSRF risk; HTTPS, `Secure`, `SameSite`, origin checks, and route-appropriate CSRF protection are required.
    - Refresh-token rotation and reuse-triggered session revocation reduce replay risk. Refresh and revocation updates must be transactional and fail closed.
    - Key rotation requires overlapping verification keys and careful access to private key material. A compromised private key requires an operational key replacement and token/session revocation procedure.
  - **Still NOT SPECIFIED**:
    - DOC-015 does not specify any of the concrete JWT or refresh-token values chosen above.
    - Password policy, failed-login lockout thresholds, rate-limit algorithms/thresholds, email verification and password-reset delivery/provider, MFA enrollment/challenge policy, API-key format/lifecycle, audit retention, and operational key-rotation cadence remain NOT SPECIFIED.
    - Browser UI behavior and the production secret-manager product remain NOT SPECIFIED.
    - DOC-015 does not specify whether a tenant context may be selected after login or how a selected context is transported; the existing resolver and tenant hierarchy remain authoritative.
  - **Explicitly deferred**:
    - Password reset via verified email (`AUTH-002`), MFA (`AUTH-007`), external API authentication (`AUTH-008`), Google/Microsoft/OTP login, lockout and rate limiting, and complete authentication-event coverage beyond the existing login events.
    - Authorization/RBAC implementation changes, tenant hierarchy changes, database-per-tenant work, RLS policy work, schema changes, new migrations, and any modification to migration `0_init`.
    - Browser UI redesign and tenant-specific application functionality.
  - **Smallest next coding slice after approval**:
    - Add the native JWT issue/verify adapter and cookie resolver in `apps/web/src/lib/auth`, using the approved configuration and existing `VerifiedSessionSource` boundary.
    - Wire the existing email/password login service to issue the access cookie and refresh cookie, then add narrowly scoped refresh, single-session logout, and logout-all-devices handlers using transactional persistence and audit events.
    - Register the resulting source through the existing `AuthenticationProvider` path and add focused tests for valid/invalid signature, issuer/audience rejection, expiry, missing/revoked session, refresh rotation/reuse, and logout revocation. This slice must not add a migration or modify migration `0_init`.
  - **Consequences**:
    - The first native integration can proceed without changing provider-neutral contracts, tenant hierarchy, authorization boundaries, Prisma schema, or migration `0_init`.
    - Native browser authentication becomes a server-validated, revocable session flow rather than a JWT-only authorization mechanism.
    - Deployment still requires valid runtime key provisioning; private keys and real environment values remain outside source control.

  - **Approved application integration decisions**:
    - Native browser authentication uses `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, and `POST /api/auth/logout-all`.
    - State-changing authentication requests require an `Origin` exactly matching `LWILL_AUTH_ALLOWED_ORIGIN`; missing, null, malformed, or mismatched origins fail with `403`. When present, `Sec-Fetch-Site` must be `same-origin`.
    - Login accepts only email and password. Tenant identity is resolved server-side from an active, verified `TenantDomain` for the request hostname and is revalidated through active tenant membership.
    - Runtime configuration uses `LWILL_AUTH_JWT_ISSUER`, `LWILL_AUTH_JWT_AUDIENCE`, `LWILL_AUTH_JWT_ACTIVE_KID`, `LWILL_AUTH_JWT_PRIVATE_KEY_PEM_B64`, and `LWILL_AUTH_JWT_VERIFICATION_KEYS_JSON`.
    - Next.js Node instrumentation registers the provider once per server process through `setAuthenticationProvider()`. Cookie resolution remains request-scoped and is never cached across requests.
    - Current-session logout derives identity from a verified access token or, when access is unavailable, a valid persisted refresh token. Logout-all requires a verified access token and active server session. Client-supplied session and user identifiers are never accepted.
    - Required audit actions for this slice are `auth.login.succeeded`, `auth.login.failed`, `auth.refresh.succeeded`, `auth.refresh.failed`, `auth.refresh.reuse_detected`, `auth.logout.succeeded`, and `auth.logout_all.succeeded`. Secrets and raw tokens must never be recorded.
    - No Prisma schema change or migration is required for this application-integration slice. Migration `0_init` remains unchanged.

  ---

  ## ADR 014: X Nail Bar FOCO Operating Model

  - **Status**: Accepted for architecture and domain-foundation planning
  - **Scope**: Organization, tenancy, ownership, operation, billing, data ownership, and authorization boundaries for X Nail Bar company-owned and FOCO outlets.

  ### Context

  Lwill Shivansh Corporation operates the LWILL AI BUILDER technology platform. HDK Beauty I Pvt. Ltd. is the client and legal entity operating the X Nail Bar business unit/brand. X Nail Bar requires both company-owned outlets and FOCO (Franchise-Owned, Company-Operated) outlets.

  ADR 004 established the reusable `Tenant -> BusinessUnit -> Branch` hierarchy. ADR 006 requires provider-neutral integration boundaries. ADR 010 requires tenant-specific application code and configuration to remain physically separated from the reusable platform repository. DOC-017 requires X Nail branch and franchise management, GST-capable billing, inventory, staff, commission, and reporting. DOC-025 requires reusable franchise partner, agreement, territory, outlet, royalty, revenue-sharing, compliance, support, and performance capabilities.

  The current hierarchy can locate and authorize an outlet, but it does not by itself express outlet ownership, FOCO operation, franchise counterparties, agreements, territories, legal invoice ownership, or commercial settlement rules. This ADR establishes the operating semantics needed before a schema or implementation proposal may be approved.

  ### Decision

  1. **Platform owner**: Lwill Shivansh Corporation is the owner and operator of the LWILL AI BUILDER platform. Platform ownership does not make Lwill the owner of HDK operational data or the issuer of X Nail customer invoices.
  2. **Client and legal entity**: HDK Beauty I Pvt. Ltd. is the LWILL client organization and legal entity for the X Nail Bar operating model.
  3. **Business unit and brand**: X Nail Bar is a business unit/brand operated within the HDK Beauty I Pvt. Ltd. tenant. It is not modeled as a separate LWILL tenant solely because it is a distinct brand.
  4. **Outlet models**: X Nail Bar outlets may be classified as either company-owned or FOCO. Every outlet remains a branch under the X Nail Bar business unit for tenancy and authorization purposes.
  5. **FOCO ownership and operation**: For a FOCO outlet, the franchise partner owns the franchise assets and business investment only to the extent defined by an explicitly approved franchise agreement. HDK Beauty I Pvt. Ltd. operates the outlet, controls operational execution, and owns the operational data held within its LWILL tenant.
  6. **Billing ownership**: Customer invoices for company-owned and FOCO X Nail Bar outlets are legally issued by HDK Beauty I Pvt. Ltd. The franchise partner is not the customer invoice issuer under this operating model.
  7. **Counterparty boundary**: A franchise partner is a commercial counterparty linked to one or more approved franchise arrangements. A franchise partner is not a separate LWILL tenant merely because it owns franchise assets or investment.
  8. **Commercial-policy gate**: Royalty, revenue/profit sharing, and franchise settlement implementation must not begin until the applicable commercial rules listed as `NOT SPECIFIED` in this ADR are explicitly approved.

  ### Organization Mapping

  ```text
  Lwill Shivansh Corporation                         Platform owner
  └── HDK Beauty I Pvt. Ltd.                        LWILL tenant / client / legal entity
    └── X Nail Bar                                Business unit / brand
      └── Branch / outlet                       Company-owned or FOCO location
        └── FOCO outlet profile               FOCO classification and operating context
          ├── Franchise partner             Commercial counterparty
          ├── Franchise agreement           Approved ownership and operating terms
          └── Territory                     Approved location and operating rights
  ```

  The `Tenant -> BusinessUnit -> Branch` portion preserves ADR 004. The FOCO outlet profile, partner, agreement, and territory are required domain concepts associated with a branch; they do not add tenancy levels or replace the existing hierarchy.

  ### FOCO Semantics

  - The franchise partner's ownership is limited to the assets, investment, and rights explicitly established by the approved agreement.
  - HDK Beauty I Pvt. Ltd. is the outlet operator and controls staffing, service delivery, customer operations, billing execution, and other operational activity within approved policies.
  - Operational records created for the outlet remain owned and controlled by HDK Beauty I Pvt. Ltd. within its LWILL tenant, subject to applicable law and approved agreements.
  - Customer billing must retain branch attribution while identifying HDK Beauty I Pvt. Ltd. and its applicable tax registration as the legal issuer.
  - Company-owned and FOCO outlets share the same tenant and business-unit boundaries. Ownership classification must not weaken tenant isolation or authorization checks.
  - Partner visibility into outlet information is permission-based and does not confer ownership of the tenant, platform account, source code, or unrestricted operational data.

  ### Authorization Model

  - Preserve the existing tenant, business-unit, and branch authorization scopes and their current inheritance rules.
  - HDK tenant-level administrators may receive tenant-scoped permissions only through existing membership and role grants.
  - X Nail Bar management roles may receive business-unit-scoped permissions only through explicit grants.
  - Outlet managers, company-operated staff, and approved franchise users may receive branch-scoped permissions only through explicit grants.
  - Franchise users must never receive access to another branch, another business unit, the wider HDK tenant, or another tenant unless a separate explicit role grant authorizes that exact scope.
  - Franchise ownership or agreement participation must never imply an authorization grant. Commercial relationships and access-control grants remain separate concerns.
  - Role names and permission codes for FOCO operations require separate approval; this ADR does not invent or automatically assign them.

  ### Required Domain Foundation

  The following concepts are required before a complete FOCO implementation can be built:

  - **Legal entity**: identifies HDK Beauty I Pvt. Ltd. as the legal operator and invoice issuer.
  - **Tax/GST registration**: identifies the applicable registration and tax identity used for legally compliant branch billing.
  - **Franchise partner**: represents the commercial counterparty and approved contacts.
  - **Franchise outlet profile**: associates a branch with its company-owned or FOCO operating model without changing tenancy levels.
  - **Franchise agreement**: records the approved relationship, effective status, and governing documents or terms.
  - **Territory**: records approved location or operating rights and provides a future basis for conflict validation.
  - **Ownership/operating model**: distinguishes asset/investment ownership from operational control.
  - **Branch attribution**: associates operational, billing, inventory, expense, audit, and reporting records with the responsible outlet where required.
  - **Franchise roles and permissions**: defines explicit branch-scoped capabilities for partner and outlet users without bypassing existing RBAC.

  These are approved domain requirements, not approved database designs. Potential schema entities, relations, enums, columns, identifiers, or field names remain **proposed implementation concepts** until separately reviewed and approved.

  ### NOT SPECIFIED Commercial Rules

  The following items are `NOT SPECIFIED`. No implementation, schema default, calculation, workflow, test expectation, or operational configuration may assume a value or rule for them:

  - Royalty percentage
  - Royalty calculation basis, exclusions, minimums, or adjustments
  - Revenue-sharing or profit-sharing formula
  - Settlement period, process, approval, payment, reconciliation, or dispute handling
  - Expense responsibility between HDK Beauty I Pvt. Ltd. and the franchise partner
  - Inventory funding, legal ownership, loss, wastage, replenishment, and transfer responsibility
  - Tax treatment of royalty, sharing, reimbursements, and settlement transactions
  - Territory exclusivity, overlap, transfer, and conflict rules
  - Agreement renewal, termination, default, cure, and exit rules
  - Franchise performance targets, scoring, and consequences
  - Support service levels, response targets, escalation, and remedies

  Royalty, sharing, and settlement implementation is explicitly blocked until the relevant commercial rules are documented and approved through a subsequent decision.

  ### Consequences

  - HDK Beauty I Pvt. Ltd. remains one tenant and X Nail Bar remains one business unit, avoiding tenant proliferation for individual franchise partners or outlets.
  - Company-owned and FOCO locations can share reusable branch operations and authorization while retaining an explicit ownership/operating distinction.
  - Franchise counterparties do not gain implicit tenant membership or access from commercial ownership.
  - Billing and operational-data ownership remain anchored to HDK Beauty I Pvt. Ltd.
  - The existing hierarchy remains necessary but is insufficient alone; FOCO requires additional reusable domain concepts.
  - Future billing, inventory, expense, compliance, and reporting work must carry sufficient branch attribution to support outlet-level authorization and accountability.
  - ADR 010 continues to govern code placement: reusable FOCO capabilities belong in platform modules, while HDK/X Nail-specific UI, configuration, and business customization belong in the future tenant repository.
  - This ADR authorizes no application code, schema change, migration, database mutation, production configuration, or deployment.

  ### Implementation Sequence

  1. Approve the remaining open legal, tax, territory, agreement, access, and commercial decisions.
  2. Produce a reusable domain and schema proposal for legal entity, tax registration, franchise partner, outlet profile, agreement, territory, operating model, and branch attribution.
  3. Review the proposal against ADR 004 hierarchy rules, existing tenant isolation, and ADR 010 repository separation before authorizing database work.
  4. Define FOCO roles and permission codes, then verify tenant-, business-unit-, and branch-scope behavior with deny-by-default tests.
  5. Implement the minimum partner, agreement, territory, and FOCO outlet foundation through separately approved versioned migrations and reusable services.
  6. Add branch attribution to operational domains only where required and approved, preserving existing tenant boundaries.
  7. Implement compliance, support, and performance foundations from DOC-025 after their detailed workflows are approved.
  8. Implement inventory and expense ownership/control only after responsibility rules are approved.
  9. Implement royalty, sharing, and settlement only after all applicable commercial formulas and processes are explicitly approved.

  ### Open Decisions

  - Legal-entity master-data requirements and authoritative source
  - Applicable GST registrations and branch-to-registration assignment
  - Exact company-owned and FOCO classification lifecycle
  - Franchise partner identity, contacts, verification, and lifecycle
  - Agreement document storage, approval, effective dates, and status lifecycle
  - Territory representation and conflict-validation method
  - Required branch attribution for appointments, invoices, inventory, expenses, staff, and reports
  - Franchise user roles, permission codes, approval process, and access-review policy
  - Compliance evidence, audit frequency, findings, remediation, and renewal workflow
  - Performance metric definitions and reporting cadence
  - Support ticket ownership, categories, workflow, and escalation policy
  - All commercial rules identified as `NOT SPECIFIED` above

  ### References

  - ADR 004: Dynamic Tenant Hierarchy (No Hard-Coded Branch Models)
  - ADR 006: Provider-Neutral Integrations Architecture
  - ADR 010: Tenant Code Physical Separation
  - `LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.docx`
  - `LWILL-DOC-025-Franchise-Management-SRS-v1.0.docx`
  - Supporting requirements: DOC-014 Multi-Tenant Engine, DOC-015 Authentication/RBAC, DOC-023 Finance/Accounting, DOC-024 Inventory/Warehouse, and DOC-030 Super Admin Control Center

---

## ADR 015: Controlled Tenant-Domain Verification

- **Status**: Accepted for the initial `builder.lwill.in` verification workflow
- **Context**: ADR 013 requires login tenancy to resolve only from active, verified `TenantDomain` records. The repository provides pending domain registration and fail-closed hostname resolution, but no ownership challenge, verification transition, or privileged domain-management UI/API. Production has an approved active pending `builder.lwill.in` mapping owned by the HDK tenant. DNS and HTTPS routing alone do not establish application-level tenant ownership.
- **Decision**:
  - Initial verification is a manual operator attestation performed only through a deployment CLI with access to the protected application runtime and production `DATABASE_URL`; no public HTTP verification route is introduced.
  - The operator must explicitly confirm `builder.lwill.in` and identify an existing active HDK administrator by email through protected runtime input.
  - The identified actor must be active and have an active HDK tenant membership with an active tenant-scoped role granting the existing `tenant.manage` permission. Business-unit and branch grants do not authorize domain verification.
  - Verification fails closed unless the canonical HDK tenant is uniquely resolved and active, the exact active domain mapping exists, and that mapping belongs to the HDK tenant.
  - Only `pending` may transition to `verified`. An already verified mapping is an authorized idempotent success; unknown states are rejected.
  - The first successful transition and its actor are recorded in `AuditLog` as `tenant-domain.verified`. No secret or credential is recorded.
  - Existing native-auth hostname resolution remains unchanged: only active, verified domain records belonging to active tenants resolve. Pending and inactive records remain rejected.
- **Security boundary**:
  - Runtime/database access is the operator boundary; tenant RBAC validation and exact hostname confirmation provide application-level authorization and attribution.
  - Administrator email is an actor selector, not a credential and not a standalone authorization mechanism. Possession of an email address cannot invoke verification without protected runtime access.
  - DNS resolution, TLS availability, request hostname, and public HTTP access do not authorize or automatically trigger verification.
- **Consequences**:
  - The initial approved hostname can be verified without schema or migration changes and without weakening login resolution.
  - Future self-service domain verification still requires a separate approved ownership-challenge design and authenticated management boundary.
  - The CLI must be run manually in the deployed application environment; it is not wired into startup, deployment, or a public endpoint.
