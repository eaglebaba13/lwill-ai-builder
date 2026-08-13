LWILL AI BUILDER — MASTER DEVELOPMENT CONTEXT

PROJECT PURPOSE

We are building LWILL AI BUILDER, a reusable multi-tenant SaaS platform and AI application builder.

The platform is the primary product.

Client applications such as:
- X Nail
- HDK Beauty
- TryCare360
- NUTROCK
- Ruvi Fashion
- Remedy Store
- MakeMeArtist
- MallofSalon
- EagleBABA

must be built ON the platform, not as unrelated standalone systems.

PRIMARY BUSINESS OBJECTIVE

Reach a production-ready X Nail ERP MVP as quickly as safely possible while building reusable platform capabilities that will support future tenants.

Do NOT attempt to implement the entire SRS before X Nail can launch.

Use the smallest production-safe implementation required for the current phase and X Nail MVP.

ARCHITECTURE

Repository:
eaglebaba13/lwill-ai-builder

Development:
Windows PC + VS Code + GitHub Copilot

Source control:
GitHub

Deployment:
GitHub → Coolify → Docker → KVM VPS → builder.lwill.in

IMPORTANT:
Coolify, Docker and the KVM VPS are REMOTE PRODUCTION/DEPLOYMENT INFRASTRUCTURE.
They are NOT the local development environment.

Local development happens on the Windows PC in VS Code.

The VPS must never become the primary coding environment.

SOURCE OF TRUTH

Use this order:

1. Actual repository code
2. Git history
3. Project documentation
4. SRS documents
5. Explicit architectural decisions
6. Deployment/runtime evidence

Never assume a documented feature is implemented.

Classify functionality as:

IMPLEMENTED
PARTIAL
PLACEHOLDER
MOCK
NOT IMPLEMENTED
BROKEN

CURRENT DEVELOPMENT PHASE

Current branch:
phase-1d-native-auth

Current work:
Phase 1D Authentication Persistence

Existing architecture already includes:

- authentication-context
- provider-neutral AuthenticationProvider
- VerifiedSessionSource boundary
- tenant-context validation
- Tenant → BusinessUnit → Branch hierarchy
- Prisma database package
- existing 0_init migration baseline

Do not redesign these boundaries.

CURRENT PHASE 1D SCOPE

DOC-015 requires:

- Email/password authentication
- Password reset
- JWT access token
- Refresh token
- Session timeout
- Single-session revocation
- Logout all devices
- Device/session tracking
- Authentication-event audit logging
- Failed-login lockout
- Rate limiting

The following remain deferred:

- MFA
- API-key authentication
- Google Sign-In
- Microsoft Sign-In
- OTP

The following are NOT SPECIFIED and must not be invented:

- JWT signing algorithm
- JWT issuer
- JWT audience
- JWT TTL
- signing-key rotation
- refresh-token rotation policy
- session timeout duration
- lockout thresholds
- rate-limit thresholds

CURRENT AUTHENTICATION PERSISTENCE WORK

Approved direction:

- PasswordCredential
- AuthenticationSession
- RefreshToken
- PasswordResetToken
- Argon2id password hashing
- hashed token persistence
- versioned migration
- 0_init must remain unchanged

Current correction being verified:

AuthenticationSession.expiresAt must be required because the existing authentication contract requires:

expiresAt: Date

Do NOT add businessUnitId or branchId to AuthenticationSession unless an explicit architectural decision later requires it.

Tenant context remains governed by the existing Tenant → BusinessUnit → Branch validation architecture.

DATABASE RULES

- Prisma
- PostgreSQL
- versioned migrations
- preserve migration history
- never modify 0_init
- never manually alter production tables
- never use destructive production schema changes without explicit verification
- maintain tenant isolation
- maintain referential integrity
- maintain suitable indexes
- do not invent database requirements not supported by the SRS/ADR

X NAIL TARGET

X Nail is the first production tenant/MVP.

Required areas eventually include:

Dashboard
CRM
Appointments
Customers
Services
Packages
Memberships
POS/Billing
Inventory
Purchases
Staff
Attendance
Commission
Branches
Franchise
Reports
Settings
AI Assistant

However, do not implement all of these at once.

Prioritize the minimum production path required to launch X Nail.

Reusable platform functionality must be extracted into reusable modules where appropriate.

Do not hard-code X Nail-specific business logic into reusable platform modules.

TENANCY

The platform uses:

Tenant
→ Business Unit
→ Branch

Multi-tenancy is foundational.

Tenant-specific implementation must remain portable and isolated.

The platform repository is NOT a tenant-specific repository.

SECURITY / SOURCE CODE OWNERSHIP

The source code must remain under the project's GitHub authority.

The VPS is deployment/runtime infrastructure only.

Do NOT create the canonical source repository on the VPS.

Do NOT use the VPS as the development repository.

Do NOT store GitHub personal credentials, PATs, OAuth secrets or unrelated credentials on the VPS.

Do NOT expose secrets in code, logs, commits or Docker images.

Do NOT commit .env files containing secrets.

Production secrets must remain in the deployment/secret-management layer.

IMPORTANT INFRASTRUCTURE SECURITY PRINCIPLE:

The VPS is currently controlled through a partner-owned infrastructure account.

Therefore infrastructure ownership is considered a business/control-plane risk.

Do not assume VPS ownership equals source-code ownership.

GitHub remains the source-code authority.

Deployment credentials should use minimum required permissions and should not provide unnecessary write access to the source repository.

Do not introduce architecture that requires the VPS to contain the Git repository as the source of truth.

Do not make production depend on a developer manually editing files on the VPS.

DEPLOYMENT

Working production architecture:

GitHub
→ Coolify
→ Docker
→ Container
→ Port 8080
→ Healthcheck
→ builder.lwill.in

This Docker deployment approach is the approved deployment architecture.

Do not replace it without evidence.

Previous Nixpacks deployment failed with:
ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING

Do not revert to Nixpacks without investigation.

DEVELOPMENT PROCESS

For every task:

Requirement
→ Inspect repository
→ Identify relevant files
→ Read relevant SRS
→ Check existing implementation
→ Check database/schema/migrations
→ Check existing APIs/components
→ Implement smallest required change
→ Test locally
→ Review git diff
→ Report result
→ Commit only when explicitly instructed
→ Push only when explicitly instructed
→ Deploy only after verification

Never:

- blindly generate large implementations
- duplicate existing functionality
- redesign architecture without evidence
- create random files
- create random production directories
- modify production manually
- claim success without command output
- claim a feature is implemented without source-code evidence

COPILOT WORK REPORT

At the end of every implementation task report:

1. Requirement addressed
2. Repository files inspected
3. Files changed
4. Why each file changed
5. Database/schema changes
6. Migration changes
7. Tests added
8. Commands executed
9. Test results
10. Build results
11. Prisma validation/generation results
12. Security implications
13. Requirements still NOT SPECIFIED
14. Known limitations
15. Git status
16. Git diff summary
17. Whether the task is ready for commit

Do not commit or push unless explicitly instructed.

CURRENT PRIORITY

The immediate priority is to complete Phase 1D authentication persistence correctly.

After Phase 1D is verified, determine the next development task based on:

1. actual repository state
2. implementation status
3. SRS
4. architectural dependencies
5. X Nail production requirements
6. testing status
7. deployment readiness

The objective is NOT to maximize code written.

The objective is to reach a secure, reusable, production-ready X Nail MVP as quickly as possible without damaging the platform architecture.