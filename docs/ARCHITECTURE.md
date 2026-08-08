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
- **Packages Boundary (`packages/*`) [TARGET / NOT YET IMPLEMENTED]**:
  - Reserved for future shared libraries (e.g., UI primitives, database access layer, shared types, core business logic).

---

## 3. Current `apps/web` State

- **Framework**: Next.js 16 (App Router).
- **Styling**: Tailwind CSS v4 configured via `@tailwindcss/postcss`.
- **Routes**: Basic landing baseline (`src/app/page.tsx` and `src/app/layout.tsx`).
- **State**: Verified build and lint clean; no backend ORM or database connections attached.

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
