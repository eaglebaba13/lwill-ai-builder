# Local Development Environment Specification

This document details the verified baseline environment requirements for developing **LWILL AI BUILDER v1**.

---

## Currently Verified Local Requirements

These requirements are tested and verified for the current repository baseline state.

### 1. Runtime & Package Manager
- **Node.js**: v18+ / v20+ (LTS recommended).
- **pnpm**: Version `11.20.0` strictly enforced via `package.json` (`packageManager: pnpm@11.20.0`).

### 2. Core Execution Commands
- **Dependency Installation**:
  ```bash
  pnpm install --frozen-lockfile
  ```
- **Linting Verification**:
  ```bash
  pnpm lint
  ```
- **Build Verification**:
  ```bash
  pnpm build
  ```
- **Development Server Execution**:
  ```bash
  pnpm dev
  ```

---

## Unverified / Target Infrastructure Requirements [TARGET / NOT YET IMPLEMENTED]

> **Important**: The following infrastructure services are targets for future phases and are **NOT** required or configured for the current repository baseline.

- **PostgreSQL Database**: Target persistence store for multi-tenancy and core ERP data (Phase 1).
- **Prisma ORM**: Target migration and database access tool (Phase 1).
- **Redis / BullMQ**: Target caching and background queue system (Future phases when load demands).
- **Docker / Containerization**: Target deployment container specifications (Phase 3).
- **Object Storage (S3 / MinIO)**: Target document and asset media storage (Future phases).
