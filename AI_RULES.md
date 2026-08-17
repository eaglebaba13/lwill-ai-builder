# AI Rules & Repository Conventions

## Tech Stack Overview
- **Monorepo Architecture**: Turborepo (`turbo ^2.5.6`) with `pnpm` workspace package management (`pnpm@11.20.0`).
- **Web Application Framework**: Next.js 16 (App Router) located at `apps/web`.
- **Language**: TypeScript 5.x with strict type definitions and type safety.
- **UI & Styling**: React 19, Tailwind CSS v4, PostCSS (`@tailwindcss/postcss`).
- **Code Quality & Linting**: ESLint 9 with `eslint-config-next`.
- **Package Management**: `pnpm` is strictly mandatory; `pnpm-lock.yaml` is the single source of truth for dependencies.
- **Domain Focus**: Open-source AI Builder & Multi-Tenant ERP platform baseline, initialized with client-first strategy for HDK Beauty / X Nail.

## Library & Tooling Usage Rules
- **Framework & Routing**: Use Next.js App Router inside `apps/web` for client/server components and API routing. Do not introduce alternative router libraries.
- **Styling**: Use Tailwind CSS v4 utility classes. Do not introduce inline CSS libraries or competing CSS-in-JS frameworks.
- **Monorepo Task Runner**: Use Turborepo (`turbo run <task>`) for orchestrating builds, linting, testing, and formatting across workspace apps/packages.
- **Package Manager**: Use `pnpm` exclusively. Never run `npm` or `yarn` and never generate or commit `package-lock.json` or `yarn.lock`.
- **Database & Persistence [Target / Not Yet Implemented]**: Prisma / PostgreSQL will be used when database persistence is introduced in Phase 1. Do not add mock database ORMs or premature database drivers.
- **Authentication & RBAC**: Provider-neutral native authentication/session validation and tenant-aware RBAC foundations exist in verified scoped slices; do not weaken server session validation or introduce client token storage.
- **Third-Party Dependencies**: Keep dependencies minimal. Validate against `package.json` before adding external packages.

## X Nail MVP status note

The current X Nail auth-navigation implementation is local-only and does not authorize deployment. Client restoration uses the existing server refresh endpoint, keeps authentication indeterminate until resolution, and rejects stale asynchronous results by request generation.
