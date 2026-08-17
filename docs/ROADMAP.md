# Platform Execution Roadmap

This roadmap outlines the phased development sequence for **LWILL AI BUILDER v1**. Progression through phases requires meeting all verification criteria for prior phases.

---

## Phase 0: Monorepo & Governance Foundation

### Phase 0A: Repository Governance & Continuity Documentation [CURRENT PHASE]
- Establish repository guidelines (`AI_RULES.md`, `AGENTS.md`, `DEVELOPMENT-GUIDELINES.md`).
- Document current baseline status in `docs/PROJECT-STATUS.md`.
- Define verified vs. target architecture in `docs/ARCHITECTURE.md`.
- Document architectural decision records in `docs/DECISIONS.md`.
- Set environment expectations in `docs/ENVIRONMENT.md`.
- Maintain strict baseline checks (`pnpm lint`, `pnpm build`).

### Phase 0B: Baseline Testing & Shared Workspace Conventions
- Set up unit/integration test harness configuration across workspace.
- Define shared TypeScript configurations and package templates under `packages/`.

---

## Phase 1: Authentication & Multi-Tenancy Engine [PARTIALLY IMPLEMENTED]
- **Data Persistence**: Initialize Prisma ORM / PostgreSQL schema.
- **Tenant Context**: Implement Tenant → Business Unit → Branch hierarchy.
- **Authentication**: Provider-neutral identity management and session handling.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions per tenant and branch.
- **Audit Engine**: Immutable audit log recorder for data mutations.

### X Nail MVP native-auth nail [LOCALLY VERIFIED]

- Login, hard-refresh restoration, logout, BFCache/pageshow, history Back/popstate, direct remount, and stale-document revalidation are covered by focused tests.
- Remaining work is controlled production browser verification after an approved deployment; this task does not deploy.

---

## Phase 2: X Nail Release 1 Core Operations [TARGET / NOT YET IMPLEMENTED]
- **Service & Product Catalog**: Category hierarchy, service duration, pricing.
- **Appointment & Scheduling Engine**: Calendar view, booking workflow, technician roster.
- **POS & Checkout**: Transaction processing, receipt generation, payment recording.
- **Inventory Management**: Stock tracking, salon supply consumption tracking.
- **Customer CRM**: Client profiles, appointment history, preference records.

---

## Phase 3: Production Hardening [TARGET / NOT YET IMPLEMENTED]
- **Performance Optimization**: SSR/ISR strategies, query indexing, bundle size reduction.
- **Security Audit**: OWASP compliance, RBAC enforcement tests, secret handling verification.
- **CI/CD Pipeline**: Automated verification workflows, containerization.
- **Backup & Disaster Recovery**: Database snapshot and recovery automation.

---

## Later Phases [TARGET / NOT YET IMPLEMENTED]
- **Phase 4**: Academy & Training Module (Staff certification and skill tracking).
- **Phase 5**: Retail & E-Commerce Integration.
- **Phase 6**: Distribution & Supply Chain Management.
- **Phase 7**: B2B / Multi-Salon Marketplace.
- **Phase 8**: AI Builder Generation Engine (Natural language app & schema generator).
- **Phase 9**: Native Mobile Applications (iOS / Android).
