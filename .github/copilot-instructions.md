# GitHub Copilot Instructions for LWILL AI BUILDER

## Project purpose
- LWILL AI BUILDER is a reusable multi-tenant SaaS platform and AI application builder.
- The platform is the primary product.
- Client applications such as X Nail must be built on the platform, not as unrelated standalone systems.
- X Nail is the first production tenant/MVP.

## Source of truth and development process
- Use the repository code as the primary source of truth.
- Use git history and project documentation as supporting sources of truth.
- Inspect the repository before making changes.
- Follow the existing architecture and approved ADRs.
- Do not invent requirements where the SRS or ADR says they are NOT SPECIFIED.
- Implement the smallest production-safe change required for the current phase.
- Do not redesign existing architecture without evidence.
- Do not claim a feature is implemented unless source code and tests verify it.

## Architecture and boundaries
- Preserve the existing multi-tenant platform architecture.
- Keep tenant-specific implementation portable and isolated.
- Tenant-specific implementation must reside in a separate tenant repository where required by the approved architecture.
- Do not mix tenant-specific business logic into the reusable platform repository where the architecture says it belongs in a separate tenant repository.
- Preserve the existing auth, tenant-context, and Prisma boundaries.
- Do not modify migration 0_init unless an explicitly approved architectural decision requires it.

## Development environment and deployment boundaries
- Local development happens on Windows in VS Code with GitHub Copilot.
- GitHub is the source-control authority.
- The VPS is remote deployment/runtime infrastructure only.
- Do not use the VPS as the primary coding environment or source-code repository.
- Deployment flow is GitHub → Coolify → Docker → remote KVM VPS → builder.lwill.in.

## Security and operational rules
- Never expose secrets, credentials, tokens, database passwords, or API keys.
- Do not commit .env files containing secrets.
- Do not modify production databases manually.
- Do not use the VPS as a substitute for the GitHub source repository.

## Verification requirements
- Before claiming success, run the appropriate tests, build, and validation steps.
- For database changes, validate Prisma schema and migrations appropriately.
- Report work with:
  - files changed
  - requirements addressed
  - tests executed
  - build/validation results
  - remaining NOT SPECIFIED requirements
  - git status/diff summary

## Commit and deployment policy
- Do not commit, push, or deploy automatically unless explicitly instructed.
