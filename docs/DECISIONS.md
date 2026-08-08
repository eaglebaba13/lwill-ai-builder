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
- **Status**: Accepted
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
