# System Architecture Overview

## 1. Current Verified Architecture

The repository currently exists as a clean, lightweight monorepo workspace.

```
lwill-ai-builder/
├── apps/
│   └── web/                   # Next.js 16 App Router application
├── docs/                      # Governance & architectural documentation
├── .gitignore
├── DEVELOPMENT-GUIDELINES.md
├── AGENTS.md
├── AI_RULES.md
├── package.json               # pnpm workspace root config
└── turbo.json                 # Turborepo task runner configuration
```

### Verified Components:
- **Package Manager**: `pnpm` (version 11.20.0).
- **Monorepo Task Orchestrator**: Turborepo (`turbo ^2.5.6`).
- **Application (`apps/web`)**: Next.js 16 with React 19, TypeScript 5, Tailwind CSS v4, and ESLint 9.

---

## 2. Workspace Boundaries & Package Management

- **Root Workspace (`/`)**:
  - Defines global scripts (`dev`, `build`, `lint`, `test`, `format`, `clean`).
  - Manages Turborepo pipelines in `turbo.json`.
  - Configures `packageManager` enforcement (`pnpm@11.20.0`).
- **Applications Boundary (`apps/*`)**:
  - Houses runnable applications (`apps/web`).
- **Packages Boundary (`packages/*`)**:
  - Contains implemented shared authentication-context, authorization, database, and Prisma-backed service packages; additional target modules remain future work.

---

## 3. Current `apps/web` State

- **Framework**: Next.js 16 (App Router). **[VERIFIED]**
- **Styling**: Tailwind CSS v4 configured via `@tailwindcss/postcss`. **[VERIFIED]**
- **Routes**: `/` (`src/app/page.tsx` and `src/app/layout.tsx`) currently renders a full HDK Beauty / X Nail tenant preview page (navigation, hero, franchise-dashboard demo panel, module grid, footer), not a platform landing page. **[VERIFIED]** — see "Current Production State" in `docs/PROJECT-STATUS.md` for the production-serving implication and the "HDK/X Nail Migration Plan" subsection for its planned relocation per ADR 010 (`docs/DECISIONS.md`).
- **State**: Verified build and lint clean; Prisma/database and native authentication integrations exist in the repository, while no production database connection is verified. **[VERIFIED]**
- **Actual LWILL AI Builder platform UI**: **NOT IMPLEMENTED** — no route, page, or component in this repository renders platform-branded (as opposed to tenant-branded) UI.

### Native-auth navigation boundary [VERIFIED]

The client page keeps authentication indeterminate until `restoreNativeAuthentication()` resolves, revalidates on initial mount, `pageshow`, and `popstate`, and uses a monotonically increasing request generation. Logout invalidates that generation before changing client state, so an older refresh response cannot restore the dashboard. The server logout/session revocation and `/api/auth/refresh` contract remain authoritative.

---

## 4. Intended Target Architecture [TARGET / NOT YET IMPLEMENTED]

> **Note**: The following sections describe the intended target architecture for future phases and do NOT represent currently implemented code.

### A. Tenant Hierarchy Design Target [TARGET / NOT YET IMPLEMENTED]
To support flexible enterprise, salon chain, and multi-location business structures, the multi-tenancy model will implement a 3-tier hierarchy:

```
Tenant (Organization level, isolated data scope)
  └── Business Unit (Legal entity, brand, or regional operation)
        └── Branch / Location (Physical outlet, salon store, or warehouse)
```

- **Flexible Branch Scope**: Eliminates hard-coded two-branch restrictions, allowing arbitrary branch expansion per tenant/business unit.
- **Context Isolation**: Every API request and database query will be scoped by `tenant_id`, `business_unit_id`, and `branch_id`.

### B. Client-First HDK Beauty / X Nail Strategy [TARGET / NOT YET IMPLEMENTED]
- Grounding initial ERP workflows (booking, appointment scheduling, inventory consumption, technician service POS) in actual operating models of HDK Beauty and X Nail salons.
- Ensures domain logic is validated against real business operations before generalization into the broader AI builder engine.

### C. Reusable Core Module Direction [TARGET / NOT YET IMPLEMENTED]
The platform design aims for decoupled, reusable ERP domain modules:
- **Core Platform**: Multi-tenant authorization, audit logging, system settings.
- **Appointment & Service Scheduling**: Service catalog, calendar management, technician assignments.
- **Inventory & Catalog**: Product management, stock movements, consumption tracking.
- **Point of Sale (POS)**: Checkout, payment handling, receipting.
- **Customer CRM**: Member profiles, loyalty, history.
- **Financial & Accounting**: Basic ledger, transaction tracking, reporting.
