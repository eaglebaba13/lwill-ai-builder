# LWILL AI Builder Development Guidelines

## Development Rules

1. Every major implementation must be committed to GitHub.
2. Before starting the next module, review the current repository structure.
3. Verify architecture against the Master Platform Blueprint and all SRS documents.
4. Avoid unnecessary third-party dependencies.
5. Never copy code from other open-source projects.
6. External repositories may be studied only for ideas and architecture, never as production dependencies.
7. Maintain a modular, reusable, multi-tenant architecture.
8. Every feature must include:
   - Database Schema
   - API
   - Validation
   - RBAC
   - Audit Logs
   - Documentation
   - Unit Tests
9. Every commit must keep the project buildable.
10. Production-first development only.

## Current X Nail verification note

The current X Nail MVP priority is native-auth navigation hardening. Changes remain limited to the existing client page and focused tests, preserve the `/api/auth/refresh` contract, and must be verified with `pnpm --filter web test`, `pnpm test`, `pnpm build`, `pnpm lint`, and `git diff --check`. Production verification remains a separate controlled task.

## Repository Review Checklist

- Folder Structure
- Module Boundaries
- Coding Standards
- Dependency Review
- Security
- Performance
- Scalability
- Multi-Tenancy Compliance
- AI Builder Compliance
- Blueprint Compliance
